import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";



import toast from "react-hot-toast";
import { getControllers, toggleController } from "../api/controller.api";

export const controllersKeys = {
    all: ["controllers"],

    lists: [
        "controllers",
        "list",
    ],

};



export const useGpcController = () =>
    useQuery({
        queryKey: controllersKeys.lists,
        queryFn: getControllers,
    });

export const useToggleControl =
    () => {
        const queryClient = useQueryClient();

        return useMutation({
            mutationFn: toggleController,
            onSuccess: () => { queryClient.invalidateQueries({ queryKey: controllersKeys.all, }) },
            onError: () => { toast.error("Failed To Toggle Feature") },
        });
    };
