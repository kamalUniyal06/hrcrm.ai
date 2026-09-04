// contact.query.js

import {
    useInfiniteQuery,
    useQuery,
} from "@tanstack/react-query";

import {
    getAllContacts,
    getAllUnreadEmails,
    getContactStats,
    getUnreadCount,
} from "../api/contact.api";
import { useTablePreference } from "../hooks/useTablePreference";


/**
 * Query Keys
 */
export const emailKeys = {
    all: ["emails"],

    lists: (filters = {}, unread = false) => [
        "emails",
        "list",
        filters,
        unread
    ],

    stats: (filters = {}) => [
        "emails",
        "stats",
        filters
    ],
};


export const useEmailStats = (
) => {
    const preferences = useTablePreference("emails");
    return useQuery({
        queryKey:
            emailKeys.stats(preferences),

        queryFn: () => getContactStats(preferences),

        staleTime:
            5 * 60 * 1000,
    });
};
export const useUnreadCount = (
) => {
    return useQuery({
        queryKey: ["emails", "unread", "count"],
        queryFn: () => getUnreadCount(),
    });
};
export const useInfiniteEmails = (
    preferences = {}
) => {
    const unread = preferences?.filters?.status == 'unread';
    const effectivePreferences = unread ? {} : preferences;
    return useInfiniteQuery({
        queryKey:
            emailKeys.lists(effectivePreferences, unread),

        queryFn: ({ pageParam = 1 }) =>
            unread ? getAllUnreadEmails({
                page: pageParam,
            }) : getAllContacts({
                preferences: effectivePreferences,
                page: pageParam,
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

