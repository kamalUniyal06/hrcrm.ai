import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    getOrderStats,
    getOrdersByEmail,
    getOrdersByMessageId,
} from "../api/orders.api";

import toast from "react-hot-toast";
import { useTablePreference } from "../hooks/useTablePreference";

/**
 * Query Keys
 */
export const orderKeys = {
    all: ["orders"],

    lists: (filters = {}, email = '') => [
        "orders",
        "list",
        email,
        filters,
    ],

    stats: ({ filters = {}, email = '' }) => [
        "orders",
        "stats",
        filters,
        email,
    ],

    byId: (id) => [
        "orders",
        "id",
        id,
    ],
    byEmail: (email) => [
        "orders",
        "email",
        email,
    ],
    byMessageId: ({ email, message_id }) => [
        "orders",
        "message_id",
        message_id,
        "email",
        email,
    ],
};

/**
 * Get Single Order
 */
export const useOrder = (id) => {
    return useQuery({
        queryKey: orderKeys.byId(id),

        queryFn: () =>
            getOrderById(id),

        enabled: Boolean(id),

        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Order Stats
 */
export const useOrderStats = (
    { email = '' }
) => {
    const preferences = useTablePreference("orders");

    return useQuery({
        queryKey:
            orderKeys.stats({ filters: preferences, email }),

        queryFn: () =>
            getOrderStats({ filters: preferences, email }),

        staleTime:
            5 * 60 * 1000,
    });
};

/**
 * Infinite Orders List
 */
export const useInfiniteOrders = (
    { preferences = {},
        email = "" }
) => {

    return useInfiniteQuery({
        queryKey:
            orderKeys.lists(
                preferences,
                email
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getAllOrders({
                preferences,
                page: pageParam,
                email
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

export const useFetchOrderByMessage = () =>
    useMutation({
        mutationFn: ({ email, message_id }) =>
            getOrdersByMessageId({ email, message_id }),
    });
/**
 * Create Order
 */
export const useCreateOrder = () => {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            createOrder,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:
                    orderKeys.all,
            });

            toast.success(
                "Order Created Successfully!"
            );
        },

        onError: () => {
            toast.error(
                "Failed To Create Order!"
            );
        },
    });
};

/**
 * Update Order
 */
export const useUpdateOrder = () => {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            updateOrder,

        onSuccess: (
            _,
            variables
        ) => {
            queryClient.invalidateQueries({
                queryKey:
                    orderKeys.all,
            });

            if (
                variables?.id
            ) {
                queryClient.invalidateQueries({
                    queryKey:
                        orderKeys.byId(
                            variables.id
                        ),
                });
            }

            toast.success(
                "Order Updated Successfully!"
            );
        },

        onError: () => {
            toast.error(
                "Failed To Update Order!"
            );
        },
    });
};
export const useOrdersByEmail = (
    email = ""
) =>
    useQuery({
        queryKey:
            orderKeys.byEmail(
                email
            ),

        queryFn: () =>
            getOrdersByEmail(
                email
            ),

        enabled: !!email,

        staleTime:
            5 * 60 * 1000,
    });