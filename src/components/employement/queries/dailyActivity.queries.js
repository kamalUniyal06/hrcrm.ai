import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import { store } from "@/store/store";
import {
    getDailyActivity,
    markPresent,
} from "../api/dailyActivity.api";
import toast from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export const dailyActivityKey = {
    all: ["dailyActivity"],

    lists: (
        filters = {}
    ) => [
            "dailyActivity",
            "list",
            filters,
        ],

};


export const useDailyActivity = () =>
    useQuery({
        queryKey: dailyActivityKey.all,
        queryFn: () => getDailyActivity(),
        staleTime: 5 * 60 * 1000,
        enabled: !!store.getState().user?.isAuthenticated,
    });
export const useMarkPresent = () =>
    useMutation({
        mutationFn: () => markPresent(),
        onSuccess: () => {
            toast.success("Present marked successfully");
            queryClient.invalidateQueries(dailyActivityKey.all);
        },
        onError: () => {
            toast.error("Failed to mark present");
        }
    });