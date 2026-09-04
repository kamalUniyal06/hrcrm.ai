import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAllDeals,
    getDealStats,
    deleteDeal,
    getDealById,
    getDealsByEmail,
    getDealsByMessageId,
} from "../api/deals.api";

import toast from "react-hot-toast";
import { useTablePreference } from "../hooks/useTablePreference";

export const dealKeys = {
    all: ["deals"],

    lists: (
        filters = {}, email = ""
    ) => [
            "deals",
            "list",
            email,
            filters,
        ],

    stats: (email = '', filters = {}) => [
        "deals",
        "stats",
        email,
        filters
    ],

    byId: (id) => [
        "deals",
        "id",
        id,
    ],
    byEmail: (email) => [
        "deals",
        "email",
        email,
    ],
    byMessageId: ({ email, message_id }) => [
        "deals",
        "message_id",
        message_id,
        "email",
        email,
    ],
};

export const useDealStats =
    ({ email }) => {
        const preferences =
            useTablePreference(
                "deals"
            ); return useQuery({
                queryKey: dealKeys.stats(email, preferences),

                queryFn: () => getDealStats({ email, filters: preferences }),

                staleTime:
                    5 * 60 * 1000,
            });
    }
export const useInfiniteDeals =
    (
        { preferences = {},
            email = "" }
    ) =>
        useInfiniteQuery({
            queryKey:
                dealKeys.lists(
                    preferences,
                    email
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllDeals({
                    preferences,
                    page: pageParam,
                    email,
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
export const useDealsByEmail = (email = "") =>
    useQuery({
        queryKey: dealKeys.byEmail(email),
        queryFn: () => getDealsByEmail(email),
    });

export const useFetchDealByMessage = () => {
    return useMutation({
        mutationFn: ({ email, message_id }) =>
            getDealsByMessageId({ email, message_id }),
    });
};

export const useDeleteDeal =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                deleteDeal,

            onSuccess: () => {
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            dealKeys.all,
                    }
                );

                toast.success(
                    "Deal Deleted Successfully"
                );
            },

            onError: () => {
                toast.error(
                    "Failed To Delete Deal"
                );
            },
        });
    };