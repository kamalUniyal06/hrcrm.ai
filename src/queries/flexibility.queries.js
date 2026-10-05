
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createTableField,
  fetchModuleFields,
  fetchViewContract,
  sendUiMutation,
} from "../api/flexibility.api";

import { fetchTableViewRegistry } from "../api/tableViewRegistry.api";

import { entityLayoutKey } from "./layouts.queries";

export const flexibilityKeys = {
  all: ["flexibility"],

  registry: () => ["flexibility", "registry", "table-view-catalog"],

  contract: (moduleKey, viewKey) => [
    "flexibility",
    "contract",
    moduleKey ?? null,
    viewKey ?? null,
  ],

  moduleFields: (module) => ["flexibility", "module-fields", module ?? null],
};

/* =========================================================================
   REGISTRY
   ========================================================================= */

/** The picker reads only Table records; the selected view loads separately. */
export function useTableViewRegistry() {
  return useQuery({
    queryKey: flexibilityKeys.registry(),
    queryFn: fetchTableViewRegistry,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/* =========================================================================
   CONTRACT
   ========================================================================= */

/**
 * Read one published contract.
 *
 * `staleTime: 0` and no window refocus refetch: the editor decides when to
 * read, because every read replaces the mutation payloads it is about to
 * send. A background refetch landing mid-edit would swap them underneath the
 * user.
 *
 * A 404 means the module has no published view under that key. It is a real
 * answer, not a transient failure, so it is not retried.
 */
export function useViewContract(moduleKey, viewKey) {
  return useQuery({
    queryKey: flexibilityKeys.contract(moduleKey, viewKey),
    queryFn: () => fetchViewContract({ moduleKey, viewKey }),
    enabled: Boolean(moduleKey && viewKey),

    /*
     * Always stale, so a remount or an explicit refetch reads again. The
     * cache entry itself is kept for the default gc window: `useRefetchContract`
     * writes the post-write payload into this same entry, and a zero gcTime
     * risks that entry being dropped before the mounted observer sees it.
     */
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = error?.response?.status;

      if (status === 404 || status === 401 || status === 403) {
        return false;
      }

      return failureCount < 1;
    },
  });
}


/* =========================================================================
   MODULE FIELD CATALOG
   ========================================================================= */

/**
 * The vardefs of the module a view reads from, for the field library.
 *
 * Cached hard, unlike the contract: vardefs only change when someone adds a
 * field in Studio, and this list never carries a mutation or a config version,
 * so a slightly old copy cannot cause a stale write. The worst case is a
 * brand new Studio field missing from the library until the cache expires,
 * and the panel has a refresh for that.
 *
 * `module` is the bean name from `contract.module` - not `moduleKey`, which is
 * the view catalog key and is not what SuiteCRM's bean registry is keyed by.
 */
export function useModuleFields(module) {
  return useQuery({
    queryKey: flexibilityKeys.moduleFields(module),
    queryFn: () => fetchModuleFields(module),
    enabled: Boolean(module),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useRefetchContract() {
  const queryClient = useQueryClient();

  return ({ moduleKey, viewKey }) =>
    queryClient.fetchQuery({
      queryKey: flexibilityKeys.contract(moduleKey, viewKey),
      queryFn: () => fetchViewContract({ moduleKey, viewKey }),
      staleTime: 0,
    });
}

/* =========================================================================
   WRITES
   ========================================================================= */

/**
 * Send one presentation mutation, then read the contract back.
 *
 * The mutation object must be the one Flexibility returned beside the value
 * being edited, deep-cloned, with only its typed `value_*` field changed.
 * Building it is src/utils/tableLayout.js's job; this hook only posts it.
 *
 * The refetch is part of the mutation rather than an `onSuccess` invalidation
 * so that `mutateAsync` does not resolve until the authoritative state is in
 * the cache. Callers can then re-enable the UI knowing what they are showing
 * is real.
 */
export function useUiPropertyWrite() {
  const refetchContract = useRefetchContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mutation, moduleKey, viewKey }) => {
      const response = await sendUiMutation(mutation);

      /*
       * Refetch even though the write succeeded, and let a failure here
       * surface: the editor is holding mutation payloads that are now stale,
       * and continuing to send them would produce duplicate writes.
       */
      const contract = await refetchContract({ moduleKey, viewKey });

      /*
       * The settings editor and live table use separate cache entries. Mark
       * the live one stale after every editor write so a mounted table
       * refetches immediately and a later navigation cannot reuse old stats.
       */
      await queryClient.invalidateQueries({
        queryKey: entityLayoutKey(moduleKey, viewKey),
        exact: true,
      });

      return { response, contract };
    },

    onError: (error, variables) => {
      console.error(
        "[ui-metadata] presentation write rejected",
        {
          moduleKey: variables?.moduleKey,
          viewKey: variables?.viewKey,
          action: variables?.mutation?.action,
          module: variables?.mutation?.module,
          propertyPath: variables?.mutation?.data?.property_path,
          recordId: variables?.mutation?.id,
        },
        error,
      );
    },
  });
}

/**
 * Send a presentation mutation from the LIVE table, then re-read the layout
 * that table renders from.
 *
 * Same write contract as `useUiPropertyWrite`; the difference is which cache
 * entry gets re-read afterwards. The editor reads
 * `flexibilityKeys.contract(...)`, while the live table reads
 * `entityLayoutKey(...)`. Refetching only the editor's entry would store the
 * value correctly and still leave the table showing the old one.
 *
 * Both entries are settled here, so whichever is mounted is consistent and the
 * editor cannot be left holding record ids and expected values that the table
 * has already moved past.
 */
export function useLivePresentationWrite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mutation, moduleKey, viewKey }) => {
      const response = await sendUiMutation(mutation);

      /*
       * Awaited, so the caller does not drop its saving indicator before the
       * authoritative value is actually on screen.
       */
      await queryClient.refetchQueries({
        queryKey: entityLayoutKey(moduleKey, viewKey),
        exact: true,
      });

      /* Editor copy, if it is mounted. Stale ids there cause duplicate writes. */
      await queryClient.invalidateQueries({
        queryKey: flexibilityKeys.contract(moduleKey, viewKey),
      });

      return response;
    },

    retry: false,

    onError: (error, variables) => {
      console.error(
        "[ui-metadata] live presentation write rejected",
        {
          moduleKey: variables?.moduleKey,
          viewKey: variables?.viewKey,
          propertyPath: variables?.mutation?.data?.property_path,
          recordId: variables?.mutation?.id,
        },
        error,
      );
    },
  });
}

/**
 * Create and publish a new table column, then read the contract back.
 *
 * `expected_config_version` inside the payload has to come from the read that
 * is on screen right now. The backend rejects a stale one, which is the whole
 * point of it, so nothing is retried automatically - the editor refetches and
 * the user resubmits against the new version.
 */
export function useCreateTableField() {
  const refetchContract = useRefetchContract();

  return useMutation({
    mutationFn: async ({ payload, moduleKey, viewKey }) => {
      const response = await createTableField(payload);

      const contract = await refetchContract({ moduleKey, viewKey });

      return { response, contract };
    },

    retry: false,

    onError: (error, variables) => {
      console.error(
        "[ui-metadata] field publish rejected",
        {
          moduleKey: variables?.moduleKey,
          viewKey: variables?.viewKey,
          sourceModule: variables?.payload?.data?.source_module,
          sourceField: variables?.payload?.data?.source_field,
          expectedConfigVersion:
            variables?.payload?.data?.expected_config_version,
        },
        error,
      );
    },
  });
}
