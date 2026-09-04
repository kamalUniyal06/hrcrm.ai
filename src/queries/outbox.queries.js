import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAllOutboxEmails,
    deleteOutboxEmail,
    getOutboxStats,
} from "../api/outbox.api";

import toast from "react-hot-toast";

export const outboxKeys = {
    all: ["outbox"],

    lists: (
        filters = {}
    ) => [
            "outbox",
            "list",
            filters,
        ],
    stats: () => ['outbox', 'stats']
};

export const useInfiniteOutboxEmails =
    (
        preferences = {}
    ) =>
        useInfiniteQuery({
            queryKey:
                outboxKeys.lists(
                    preferences
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllOutboxEmails({
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

export const useDeleteOutboxEmail =
    () => {
        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                deleteOutboxEmail,

            onSuccess: () => {
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            outboxKeys.all,
                    }
                );

                toast.success(
                    "Email Deleted Successfully"
                );
            },

            onError: () => {
                toast.error(
                    "Failed To Delete Email"
                );
            },
        });
    };
export const useOutboxStats = () =>
    useQuery({
        queryKey:
            outboxKeys.stats(),

        queryFn: () =>
            getOutboxStats(),

        staleTime:
            2 * 60 * 1000,
    });