import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAllBacklinks,
    getBacklinkStats,
    updateBacklink,
    getBacklinkById,
    getExtractedBlogLinks,
    getLinkRemovalCount,
} from "../api/backlinks.api";

import { useTablePreference } from "../hooks/useTablePreference";

export const backlinkKeys = {
    all: ["backlinks"],

    lists: (
        filters = {}
    ) => [
            "backlinks",
            "list",
            filters,
        ],

    stats: (
        filters = {}
    ) => [
            "backlinks",
            "stats",
            filters,
        ],

    byId: (id) => [
        "backlinks",
        "id",
        id,
    ],

    extractedLinks: (sourceUrl) => ["backlinks", "extracted-links", sourceUrl],
    linkRemovalCount: ["backlinks", "link-removal-count"],
};

export const useLinkRemovalCount = () =>
    useQuery({
        queryKey: backlinkKeys.linkRemovalCount,
        queryFn: getLinkRemovalCount,
        refetchInterval: 30 * 1000,
        staleTime: 15 * 1000,
    });

export const useBacklinkStats = () => {
    const preferences =
        useTablePreference(
            "backlinks"
        );
    return useQuery({
        queryKey:
            backlinkKeys.stats(
                preferences
            ),

        queryFn: () =>
            getBacklinkStats(
                preferences
            ),

        staleTime:
            5 *
            60 *
            1000,
    });

}

export const useInfiniteBacklinks =
    (
        preferences = {}
    ) =>
        useInfiniteQuery({
            queryKey:
                backlinkKeys.lists(
                    preferences
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllBacklinks({
                    preferences,
                    page: pageParam,
                }),

            initialPageParam: 1,

            getNextPageParam:
                (
                    lastPage
                ) =>
                    lastPage.page <
                        lastPage.total_pages
                        ? lastPage.page +
                        1
                        : undefined,

            staleTime:
                5 *
                60 *
                1000,
        });

export const useUpdateBacklink =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn: updateBacklink,

            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey:
                        backlinkKeys.all,
                });

            },
        });
    };

export const useBacklink =
    (id) =>
        useQuery({
            queryKey:
                backlinkKeys.byId(
                    id
                ),

            queryFn: () =>
                getBacklinkById(
                    id
                ),

            enabled:
                Boolean(id),
        });

export const useExtractedBlogLinks = (sourceUrl) =>{
    console.log("useExtractedBlogLinks", sourceUrl);
    return  useQuery({
        queryKey: backlinkKeys.extractedLinks(sourceUrl),
        queryFn: () => getExtractedBlogLinks(sourceUrl),
        enabled: Boolean(sourceUrl),
    });
    
}

     
