// contact.query.js

import {
    useInfiniteQuery,
    useQuery,
} from "@tanstack/react-query";

import {
    getAllContacts,
    getContactStats,
} from "../api/contact.api";
import { useTablePreference } from "../hooks/useTablePreference";

/**
 * Query Keys
 */
export const exchangeKeys = {
    all: ["exchange"],

    lists: (filters = {}) => [
        "exchange",
        "list",
        filters,
    ],

    stats: (filters = {}) => [
        "exchange",
        "stats",
        filters,
    ],
};


export const useExchangeStats = () => {
    const preferences =
        useTablePreference(
            "exchange"
        );
    return useQuery({
        queryKey:
            exchangeKeys.stats(
                preferences
            ),

        queryFn: () =>
            getContactStats(
                preferences
            ),

        staleTime:
            5 * 60 * 1000,
    });
};

export const useInfiniteExchange = (
    preferences = {}
) => {
    return useInfiniteQuery({
        queryKey:
            exchangeKeys.lists(preferences),

        queryFn: ({ pageParam = 1 }) =>
            getAllContacts({
                preferences,
                page: pageParam,
                defaults: { exchange: "1" }
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