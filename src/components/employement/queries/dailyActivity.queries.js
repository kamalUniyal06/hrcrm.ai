import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import { store } from "@/store/store";
import {
    getDailyActivity,
    markActivity,
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
        mutationFn: () => markActivity('login'),
        onSuccess: () => {
            toast.success("Present marked successfully");
            queryClient.invalidateQueries(dailyActivityKey.all);
        },
        onError: () => {
            toast.error("Failed to mark present");
        }
    });
export const useLogOut = () =>
    useMutation({
        mutationFn: () => markActivity('logout'),
        onSuccess: () => {
            toast.success("Logout successfully");
            queryClient.invalidateQueries(dailyActivityKey.all);
        },
        onError: () => {
            toast.error("Failed to logout");
        }
    });
export const useLunchIn = () =>
    useMutation({
        mutationFn: () => markActivity('lunch_in'),
        onSuccess: () => {
            toast.success("Lunch in successfully");
            queryClient.invalidateQueries(dailyActivityKey.all);
        },
        onError: () => {
            toast.error("Failed to lunch in");
        }
    });
export const useLunchOut = () =>
    useMutation({
        mutationFn: () => markActivity('lunch_out'),
        onSuccess: () => {
            toast.success("Lunch out successfully");
            queryClient.invalidateQueries(dailyActivityKey.all);
        },
        onError: () => {
            toast.error("Failed to lunch out");
        }
    });
