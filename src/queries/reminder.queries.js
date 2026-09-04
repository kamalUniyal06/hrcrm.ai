import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { getAllReminders, getReminderStats, getTodayPaymentReminderStats } from "../api/reminders.api";
import { useTablePreference } from "../hooks/useTablePreference";



export const reminderKeys = {
    all: ["reminders"],

    lists: (
        filters = {},
        email = ""
    ) => [
            "reminders",
            "list",
            email,
            filters,
        ],

    stats: (filters = {}, email = '') => [
        "reminders",
        "stats",
        filters,
        email
    ],

    todayPaymentStats: () => ["reminders", "today-payment-stats"],


};

/**
 * Offer Stats
 */
export const useReminderStats = (
    { filters, email = '' }
) => {
    const preferences = filters ?? useTablePreference("reminders");
    return useQuery({
        queryKey: reminderKeys.stats(filters, email),

        queryFn: () => getReminderStats({ filters: preferences, email }),


    });


}


/**
 * Infinite Offers
 */
export const useInfiniteReminders = (
    { preferences = {},
        email = "" }
) =>
    useInfiniteQuery({
        queryKey:
            reminderKeys.lists(
                preferences,
                email
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getAllReminders({
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

export const useTodayPaymentReminderStats = () =>
    useQuery({
        queryKey: reminderKeys.todayPaymentStats(),
        queryFn: getTodayPaymentReminderStats,
        staleTime: 2 * 60 * 1000,
    });

