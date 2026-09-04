import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import toast from "react-hot-toast";

import {
    getAllTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
    getTagStats,
} from "../api/tag.api";

export const tagKeys = {
    all: ["tags"],

    lists: (
        filters = {}
    ) => [
            "tags",
            "list",
            filters,
        ],

    stats: (
        filters = {}
    ) => [
            "tags",
            "stats",
            filters,
        ],

    byId: (id) => [
        "tags",
        "id",
        id,
    ],
};

/**
 * Stats
 */
export const useTagStats = (
    filters = {}
) =>
    useQuery({
        queryKey:
            tagKeys.stats(
                filters
            ),

        queryFn: () =>
            getTagStats(
                filters
            ),

        staleTime:
            5 * 60 * 1000,
    });

/**
 * Single Tag
 */
export const useTag = (
    id
) =>
    useQuery({
        queryKey:
            tagKeys.byId(id),

        queryFn: () =>
            getTagById(id),

        enabled:
            Boolean(id),

        staleTime:
            5 * 60 * 1000,
    });

/**
 * Infinite Tags
 */
export const useInfiniteTags = (
    preferences = {}
) =>
    useInfiniteQuery({
        queryKey:
            tagKeys.lists(
                preferences
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getAllTags({
                preferences,
                page: pageParam,
            }),

        initialPageParam: 1,

        getNextPageParam: (
            lastPage
        ) =>
            lastPage.page <
                lastPage.total_pages
                ? lastPage.page + 1
                : undefined,

        staleTime:
            5 * 60 * 1000,
    });

/**
 * Create
 */
export const useCreateTag =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                createTag,

            onSuccess: () => {
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            tagKeys.all,
                    }
                );

                toast.success(
                    "Tag Created Successfully"
                );
            },

            onError: () => {
                toast.error(
                    "Failed To Create Tag"
                );
            },
        });
    };

/**
 * Update
 */
export const useUpdateTag =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                updateTag,

            onSuccess: (
                response,
                variables
            ) => {
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            tagKeys.all,
                    }
                );

                if (
                    variables?.id
                ) {
                    queryClient.invalidateQueries(
                        {
                            queryKey:
                                tagKeys.byId(
                                    variables.id
                                ),
                        }
                    );
                }

                toast.success(
                    "Tag Updated Successfully"
                );
            },

            onError: () => {
                toast.error(
                    "Failed To Update Tag"
                );
            },
        });
    };

/**
 * Delete
 */
export const useDeleteTag =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                deleteTag,

            onSuccess: () => {
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            tagKeys.all,
                    }
                );

                toast.success(
                    "Tag Deleted Successfully"
                );
            },

            onError: () => {
                toast.error(
                    "Failed To Delete Tag"
                );
            },
        });
    };