// contact.query.js

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAllContacts,
    getContactStats,
} from "../api/contact.api";

/**
 * Query Keys
 */
export const linkExchangeKeys = {
    all: ["linkExchanges"],

    lists: (filters = {}) => [
        "linkExchanges",
        "list",
        filters,
    ],

    stats: (filters = {}) => [
        "linkExchanges",
        "stats",
        filters,
    ],

};


/**
 * Link Exchange Stats
 */
export const useLinkExchangeStats = (
    filters = {}
) => {
    return useQuery({
        queryKey:
            linkExchangeKeys.stats(
                filters
            ),

        queryFn: () =>
            getLinkExchangeStats(
                filters
            ),

        staleTime:
            5 * 60 * 1000,
    });
};
/**
 * Infinite Link Exchange List
 */
export const useInfiniteLinkExchanges = (
    preferences = {}
) => {
    return useInfiniteQuery({
        queryKey:
            linkExchangeKeys.lists(preferences),

        queryFn: ({ pageParam = 1 }) =>
            getAllContacts({
                preferences,
                page: pageParam,
                defaults: {filters: {
                    "exchange": "1",
                }},
            }),

        initialPageParam: 1,

        getNextPageParam: (
            lastPage
        ) => {
            if (
                lastPage.page <
                lastPage.total_pages
            ) {
                return (
                    lastPage.page + 1
                );
            }

            return undefined;
        },

        staleTime: 5 * 60 * 1000,
    });
};

