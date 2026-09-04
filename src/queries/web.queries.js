import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getWebsites,
    getWebsiteById,
    createWebsite,
    updateWebsite,
    deleteWebsite,
} from "../api/web.api";

import toast from "react-hot-toast";
export const webKeys = {
    all: ["web"],

    lists: [
        "web",
        "list",
    ],

    byId: (id) => [
        "web",
        "id",
        id,
    ],
};
export const useWebsites = () =>
    useQuery({
        queryKey: webKeys.lists,
        queryFn: () => getWebsites(),
    });
export const useCreateWebsite =
    () => {

        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                createWebsite,

            onSuccess: () => {

                queryClient.invalidateQueries({
                    queryKey:
                        webKeys.all,
                });

                toast.success(
                    "Website Created Successfully"
                );
            },

            onError: () => {

                toast.error(
                    "Failed To Create Website"
                );
            },
        });
    };
export const useUpdateWebsite =
    () => {

        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                updateWebsite,

            onSuccess: (
                _,
                variables
            ) => {

                queryClient.invalidateQueries({
                    queryKey:
                        webKeys.all,
                });

                if (
                    variables?.id
                ) {
                    queryClient.invalidateQueries({
                        queryKey:
                            webKeys.byId(
                                variables.id
                            ),
                    });
                }

                toast.success(
                    "Website Updated Successfully"
                );
            },

            onError: () => {

                toast.error(
                    "Failed To Update Website"
                );
            },
        });
    };
export const useDeleteWebsite =
    () => {

        const queryClient =
            useQueryClient();

        return useMutation({
            mutationFn:
                deleteWebsite,

            onSuccess: () => {

                queryClient.invalidateQueries({
                    queryKey:
                        webKeys.all,
                });

                toast.success(
                    "Website Deleted Successfully"
                );
            },

            onError: () => {

                toast.error(
                    "Failed To Delete Website"
                );
            },
        });
    };