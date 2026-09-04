// contact.query.js

import {
    useInfiniteQuery,
    useQuery,
} from "@tanstack/react-query";

import {
    getAllContacts,
    getContactStats,
} from "../api/contact.api";
import { getForwardStats } from "../api/forward.api";

import { useCrmUsers } from "./users.queries";
import { store } from "../store/store";
import { useTablePreference } from "../hooks/useTablePreference";

/**
 * Query Keys
 */
export const forwardedKeys = {
    all: ["forwarded"],

    lists: (filters = {}) => [
        "forwarded",
        "list",
        filters,
    ],

    stats: (filters = {}, userId) => [
        "forwarded",
        "stats",
        filters,
        userId
    ],
};


export const useForwardedStats = (userId) => {
    const preferences =
        useTablePreference(
            "forwarded"
        );
    return useQuery({
        queryKey:
            forwardedKeys.stats(
                preferences, userId
            ),

        queryFn: () =>
            getForwardStats(
                preferences, userId
            ),

        staleTime:
            5 * 60 * 1000,
    });
};

export const useInfiniteForwarded = (
    preferences = {}
) => {
    const { data: users = [] } = useCrmUsers();

    const currentEmail =
        store.getState().user.user.email;

    const currentGpcUser =
        users.find(
            (user) =>
                user.description === currentEmail
        );

    const assignedUserId =
        currentGpcUser?.id;

    return useInfiniteQuery({
        queryKey:
            forwardedKeys.lists({
                preferences,
                assignedUserId,
            }),

        queryFn: ({ pageParam = 1 }) =>
            getAllContacts({
                preferences,
                page: pageParam,
                defaults: {
                    gpc_assigned_to: assignedUserId,
                }
            }),

        enabled: Boolean(assignedUserId),

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