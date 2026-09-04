import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import * as api from "../api/entity.api";
import { useCrmUsers } from "@/queries/users.queries";
import { store } from "@/store/store";
export const entityKeys = {
    allByEntity: (entity) => ["entity", entity],

    lists: (filters = {}, email = '', entity) => [
        "entity",
        entity,
        "list",
        email,
        filters,
    ],

    stats: ({ filters = {}, entity, email = '' }) => [
        "entity",
        entity,
        "stats",
        filters,
        email,
    ],

    byId: (id) => [
        "entity",
        "id",
        id,
    ],
    byEmail: (email) => [
        "entity",
        "email",
        email,
    ],
    byMessageId: ({ email, message_id }) => [
        "entity",
        "message_id",
        message_id,
        "email",
        email,
    ],
};
// LIST
export function useEntityList(entity, params) {
    return useQuery({
        queryKey: ["entity", entity, "list", params],
        queryFn: () => api.fetchList(entity, params),
    });
}
export function useEntityStats({ filters, email, entity, stats, module }) {
    return useQuery({
        queryKey: entityKeys.stats({ filters, entity, email }),
        queryFn: () => api.getEntityStats({ filters, email, stats, module }),
        enabled: !!stats?.length
    });
}
export const useInfiniteEntity = ({
    preferences = {},
    email = "",
    entity,
    module,
    layout = {},
    dataFilters = {},
}) => {
    const { data: users = [] } = useCrmUsers();

    const currentEmail =
        store.getState().user.user.email;

    const currentGpcUser = users.find(
        (user) =>
            user.description === currentEmail
    );

    const assignedUserId =
        currentGpcUser?.id;

    // Entity requires assigned user filtering
    const isAssigned =
        layout?.moduleKey === "assigned";

    // Entity requires email filtering
    const filterByEmail =
        layout?.filter_by_email === 1;

    // Add assigned user ID only for assigned entities
    const finalDataFilters = {
        ...dataFilters,
        ...(isAssigned && assignedUserId
            ? {
                gpc_assigned_to:
                    assignedUserId,
            }
            : {}),
    };

    // Assigned entities wait for assignedUserId
    const queryEnabled =
        !!module &&
        (!isAssigned || !!assignedUserId);

    return useInfiniteQuery({
        queryKey: entityKeys.lists(
            preferences,
            filterByEmail ? email : "",
            entity,
            finalDataFilters
        ),

        queryFn: ({
            pageParam = 1,
        }) =>
            api.fetchInfiniteList({
                module,
                preferences,
                page: pageParam,

                // Only pass email when filter_by_email = 1
                email: filterByEmail
                    ? email
                    : "",

                dataFilters:
                    finalDataFilters,
            }),

        initialPageParam: 1,

        getNextPageParam: (
            lastPage
        ) => {
            if (
                lastPage.page <
                lastPage.total_pages
            ) {
                return lastPage.page + 1;
            }

            return undefined;
        },

        enabled: queryEnabled,

        staleTime:
            5 * 60 * 1000,
    });
};

// SINGLE RECORD
export function useEntityRecord({ request, entity, recordInfo }) {
    return useQuery({
        queryKey: ["entity", entity, "detail", recordInfo],
        queryFn: () => api.fetchOne({ request, entity, recordInfo }),
        enabled: !!recordInfo && !!request,
    });
}

// CREATE
export function useCreateEntity(entity) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => api.createOne(entity, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["entity", entity, "list"] }),
    });
}

// UPDATE
export function useUpdateEntity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ entity, id, payload }) =>
            api.updateOne(entity, id, payload),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: ["entity", vars.entity, "list"] });
            qc.invalidateQueries({ queryKey: ["entity", vars.entity, "detail", vars.id] });
        },
    });
}

// DELETE
export function useDeleteEntity(entity) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ module, id }) => api.deleteOne(module, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["entity", entity, "list"] }),
    });
}