import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import { store } from "@/store/store";
import {
    applyForLeave,
} from "../api/leaves.api";
import toast from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export const leavesKey = {
    all: ["leaves"],

    lists: (
        filters = {}
    ) => [
            "dailyActivity",
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

