import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import * as api from "../api/entity.api";

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

}) => {


    return useInfiniteQuery({
        queryKey: entityKeys.lists(
            preferences,

            entity,

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