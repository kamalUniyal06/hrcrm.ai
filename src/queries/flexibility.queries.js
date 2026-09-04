/**
 * Query layer for the UI metadata editor.
 *
 * The rule the whole file is built around: refetch after every successful
 * write. The client never synthesizes the final canonical contract. A write
 * confirms that something was stored; only the next read tells you what.
 *
 * That is what turns a `create` mutation into an `update` mutation - the
 * server hands back the new record id and the matching update payload. The
 * editor must never rewrite one into the other itself, so the write path here
 * always ends in a real read.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createTableField,
  fetchViewContract,
  sendUiMutation,
} from "../api/flexibility.api";

import { fetchLayout } from "../api/prefrences.api";

import { collectTableViews } from "../utils/tableViewRegistry";

import { entityLayoutKey } from "./layouts.queries";

export const flexibilityKeys = {
  all: ["flexibility"],

  registry: () => ["flexibility", "registry"],

  contract: (moduleKey, viewKey) => [
    "flexibility",
    "contract",
    moduleKey ?? null,
    viewKey ?? null,
  ],
};

/* =========================================================================
   REGISTRY
   ========================================================================= */

/**
 * Every module/view pair the editor can open, derived from the sidebar
 * payload.
 *
 * This reads the same cache entry as the live sidebar would if it used
 * `preferenceKeys.layout()`, but under its own key so a metadata write here
 * cannot invalidate the navigation the user is looking at.
 */
export function useTableViewRegistry() {
  return useQuery({
    queryKey: flexibilityKeys.registry(),
    queryFn: async () => collectTableViews(await fetchLayout()),
    staleTime: 5 * 60 * 1000,
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

/**
 * Read the contract straight back from the server and put it in the cache.
 *
 * `fetchQuery` rather than `invalidateQueries` because the caller needs to
 * await the new payload: the next edit builds on the record ids and expected
 * values it carries.
 */
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
