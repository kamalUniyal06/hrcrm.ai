import {
    useInfiniteQuery,
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import { store } from "@/store/store";
import {
    applyForLeave,
    getLeavesHistory,
} from "../api/leaves.api";
import toast from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export const leavesKey = {
    all: ["leaves"],

    lists: (
        filters = {}
    ) => [
            "leaves",
            "list",
            filters,
        ],

};


export const useApplyForLeave = () =>
    useMutation({
        mutationFn: (data) => applyForLeave(data),
        onSuccess: () => {
            toast.success("Leave applied successfully");
            queryClient.invalidateQueries(leavesKey.all);
        },
        onError: () => {
            toast.error("Failed to apply for leave");
        }
    });
export const useLeavesHistory = (
    { preferences = {} }
) => {

    return useInfiniteQuery({
        queryKey:
            leavesKey.lists(
                preferences,
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getLeavesHistory({
                preferences,
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

        staleTime:
            5 * 60 * 1000,
    });
};
