import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getBillingHistory, getPlans } from "../api/billings.api";
import { store } from "../store/store";

export const billingKeys = {
    all: ["billing"],

    lists: (
        filters = {},
    ) => [
            "billing",
            "list",
            filters,
        ],



};


export const useBillingHistory = (
    { preferences = {} }
) =>
    useInfiniteQuery({
        queryKey:
            billingKeys.lists(
                preferences,
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getBillingHistory({
                preferences: { ...preferences, filters: { bussiness_email: store.getState()?.user?.businessEmail } },
                page: pageParam,
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

        staleTime:
            5 * 60 * 1000,
    });

export const usePlans = () => {
    return useQuery({
        queryKey: ["plans"],
        queryFn: getPlans,
        staleTime: 5 * 60 * 1000,
    });
}