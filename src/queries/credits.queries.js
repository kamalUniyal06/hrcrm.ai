import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";


import { getAllCredits, getCreditStats } from "../api/credits.api";

export const creditsKeys = {
    all: ["credits"],

    lists: (
        filters = {},
    ) => [
            "credits",
            "list",
            filters,
        ],

    stats: (filters = {}) => [
        "credits",
        "stats",
        filters,
    ]
};

/**
 * Offer Stats
 */
export const useCreditStats = (
    filters = {}
) =>
    useQuery({
        queryKey: creditsKeys.stats(filters),
        queryFn: () => getCreditStats(filters),
    });

export const useInfiniteCredits = (
    preferences = {}
) =>
    useInfiniteQuery({
        queryKey: creditsKeys.lists(preferences),
        queryFn: ({ pageParam = 1 }) => getAllCredits({ preferences, page: pageParam }),

        initialPageParam: 1,

        getNextPageParam: (
            lastPage
        ) =>
            lastPage.page <
                lastPage.total_pages
                ? lastPage.page +
                1
                : undefined,

    });

