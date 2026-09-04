import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getWebsites } from "../api/web.api";
import { webKeys } from "../queries/web.queries";
import { getTinyKey } from "../api/tiny.api";
import { getAllUsers } from "../api/users.api";
import { userKeys } from "../queries/users.queries";
import { getControllers } from "../api/controller.api";
import { controllersKeys } from "../queries/controller.queries";
import { getUnreadCount } from "../api/contact.api";
import { preferenceKeys } from "../queries/prefrences.queries";
import { fetchLayout } from "../api/prefrences.api";

export const useAppInitialization =
    () => {

        const queryClient =
            useQueryClient();

        useEffect(() => {

            Promise.all([
                queryClient.prefetchQuery({
                    queryKey: webKeys.lists,
                    queryFn: getWebsites,
                }),
                queryClient.prefetchQuery({
                    queryKey: preferenceKeys.layout(),
                    queryFn: fetchLayout,
                }),
                queryClient.prefetchQuery({
                    queryKey: ["emails", "unread", "count"],
                    queryFn: getUnreadCount,
                }),
                queryClient.prefetchQuery({
                    queryKey: controllersKeys.lists,
                    queryFn: getControllers,
                }),
                queryClient.prefetchQuery({
                    queryKey: userKeys.lists,
                    queryFn: getAllUsers,
                }),
                queryClient.prefetchQuery({
                    queryKey: ['tiny-key'],
                    queryFn: async () => {
                        const data = await getTinyKey()
                        localStorage.setItem("tinyKey", data);
                        return data

                    },
                }),
            ]);

        }, []);
    };