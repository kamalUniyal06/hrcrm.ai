import { store } from "../store/store";
import { useSidebarLayout } from "./sidebar.queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    fetchCrmModules,
    updateLayout,
} from "../api/prefrences.api";


export const preferenceKeys = {
    all: ["preferences"],

    layout: () => ["sidebar", "layout", store.getState().user.user?.email?.trim() || ""],

    crmModules: () => [
        "preferences",
        "crm-modules"
    ],

};


export const useLayoutPreferences = useSidebarLayout;

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
            queryClient.invalidateQueries({ queryKey: ["sidebar", "layout"] });
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
