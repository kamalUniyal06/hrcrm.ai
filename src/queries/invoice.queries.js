import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { getAllInvoice, getInvoiceStats, updateInvoice } from "../api/invoice.api";
import { useTablePreference } from "../hooks/useTablePreference";

export const invoiceKeys = {
    all: ["invoices"],

    lists: (
        filters = {}, email = ""
    ) => [
            "invoices",
            "list",
            email,
            filters,
        ],

    stats: (filters = {}, email = '') => [
        "invoices",
        "stats",
        filters,
        email
    ],

    byId: (id) => [
        "invoices",
        "id",
        id,
    ],

    byEmail: (email) => [
        "invoices",
        "email",
        email,
    ],
};

export const useInvoiceStats =
    ({ email = '' }) => {
        const preferences = useTablePreference("invoices");
        return useQuery({
            queryKey:
                invoiceKeys.stats(preferences, email),

            queryFn: () => getInvoiceStats({ filters: preferences, email }),
        });
    }


export const useInfiniteInvoices =
    (
        { preferences = {},
            email = '' }
    ) =>
        useInfiniteQuery({
            queryKey: invoiceKeys.lists(preferences, email),

            queryFn: ({
                pageParam = 1,
            }) =>
                getAllInvoice({
                    preferences,
                    page: pageParam,
                    email
                }),

            initialPageParam: 1,

            getNextPageParam: (
                lastPage
            ) =>
                lastPage.page <
                    lastPage.total_pages
                    ? lastPage.page +
                    1
                    : undefined,

        });
export const useEmailInvoices =
    (
        email = ''
    ) =>
        useQuery({
            queryKey: invoiceKeys.byEmail(email),

            queryFn: () =>
                getAllInvoice({
                    preferences: {},
                    email
                }),

        });
export const useUpdateInvoice = () => {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: updateInvoice,

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey:
                    invoiceKeys.all,
            });
        },
    });
};