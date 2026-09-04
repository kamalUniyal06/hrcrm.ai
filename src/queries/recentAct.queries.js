import {
    useInfiniteQuery,
} from "@tanstack/react-query";

import {
    getAllRecentEvents,
} from "../api/recentAct.api";

export const recentKeys = {
    all: ["recent"],

    lists: (
        filters = {}
    ) => [
            "recent",
            "list",
            filters,
        ],

};


export const useInfiniteRecentEvents =
    (
        preferences = {}
    ) =>
        useInfiniteQuery({
            queryKey:
                recentKeys.lists(
                    preferences
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllRecentEvents({
                    preferences,
                    page: pageParam,
                }),

            initialPageParam: 1,

            getNextPageParam: (
                lastPage
            ) =>
                lastPage.page <
                    lastPage.total_pages
                    ? lastPage.page +
                    1
                    : undefined,

            staleTime:
                5 * 60 * 1000,
        });