import {
    useInfiniteQuery,
} from "@tanstack/react-query";

import {
    getAllHotEvents,
} from "../api/hot.api";

export const hotKeys = {
    all: ["hot"],

    lists: (
        filters = {}
    ) => [
            "hot",
            "list",
            filters,
        ],

};


export const useInfiniteHotEvents =
    (
        preferences = {}
    ) =>
        useInfiniteQuery({
            queryKey:
                hotKeys.lists(
                    preferences
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllHotEvents({
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