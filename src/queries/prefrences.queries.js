import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    fetchCrmModules,
    fetchLayout,
    updateLayout,
} from "../api/prefrences.api";


export const preferenceKeys = {
    all: ["preferences"],

    layout: () => [
        "preferences",
        "layout"
    ],

    crmModules: () => [
        "preferences",
        "crm-modules"
    ],

};


export const useLayoutPreferences = () =>
    useQuery({
        queryKey: preferenceKeys.layout(),
        queryFn: fetchLayout,
        staleTime:
            5 * 60 * 1000,
    });

export const useCrmModules = () =>
    useQuery({
        queryKey: preferenceKeys.crmModules(),
        queryFn: fetchCrmModules,
        staleTime: 30 * 60 * 1000,
    });

export function useUpdateLayout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            action,
            module,
            id,
            payload,
        }) => {
            return updateLayout(
                {
                    action,
                    module,
                    id,
                    payload
                }
            );
        },

        onSuccess: () => {
            // Refresh entity queries
            queryClient.invalidateQueries({
                queryKey: preferenceKeys.all,
            });
        },

        onError: (error, variables) => {
            /**
             * Log the module and id, because a failure here is
             * usually specific to one module's save path rather
             * than to the layout editor.
             */
            console.error(
                "[layout] update rejected",
                {
                    action: variables?.action ?? "update",
                    module: variables?.module,
                    id: variables?.id,
                    payload: variables?.payload,
                },
                error,
            );

            toast.error(
                `Could not save layout change to ${variables?.module ?? "the server"}`,
            );

            /**
             * Pull the truth back from the server so the editor
             * stops showing a change that was never stored.
             */
            queryClient.invalidateQueries({
                queryKey: preferenceKeys.all,
            });
        },
    });
}
