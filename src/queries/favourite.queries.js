// contact.query.js

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    getAllContacts,
    getContactStats,
    toggleFav,
} from "../api/contact.api";
import { queryClient } from "../lib/queryClient";
import { contactKeys } from "./contact.queries";
import { updateActivity } from "../services/utils";
import toast from "react-hot-toast";
import { useTablePreference } from "../hooks/useTablePreference";

/**
 * Query Keys
 */
export const favoriteKeys = {
    all: ["favorite"],

    lists: (filters = {}) => [
        "favorite",
        "list",
        filters,
    ],

    stats: (filters = {}) => [
        "favorite",
        "stats",
        filters,
    ],
};


export const useFavoriteStats = () => {
    const preferences =
        useTablePreference(
            "favorite"
        );
    return useQuery({
        queryKey:
            favoriteKeys.stats(
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

export const useInfiniteFavorite = (
    preferences = {}
) => {
    return useInfiniteQuery({
        queryKey:
            favoriteKeys.lists(preferences),

        queryFn: ({ pageParam = 1 }) =>
            getAllContacts({
                preferences,
                page: pageParam,
                defaults: { favorite: "1" }
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
export const useToggleFav = (email) => {
    return useMutation({
        mutationFn: toggleFav,
        onSuccess: async (data) => {
            console.log("dat", data)
            const isFavorite = Number(data?.new_value) === 1;
            toast.success(
                isFavorite
                    ? "❤️ Email Favorited Successfully"
                    : "🤍 Email Unfavorited Successfully"
            );
            updateActivity(email, isFavorite ? "Email Favorited " : "Email Unfavorited ");
            queryClient.invalidateQueries({ queryKey: contactKeys.all })
            queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
        }
    })
}