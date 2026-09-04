import {
    useInfiniteQuery,
} from "@tanstack/react-query";

import {
    getLedger,
    getBrandLedger,
    getChildLedger,
} from "../api/ledger.api";
export const ledgerKeys = {
    all: ["ledger"],

    lists: (
        email,
    ) => [
            "ledger",
            "list",
            email,
        ],
    childLists: (
        parentId,
    ) => [
            "ledger",
            "list",
            "child",
            parentId,
        ],

    brandLists: (
        email,
    ) => [
            "ledger",
            "brand",
            email,
        ],
};
export const useInfiniteLedger = (
    email,
) => {
    return useInfiniteQuery({
        queryKey:
            ledgerKeys.lists(email),

        queryFn: ({
            pageParam = 1,
        }) =>
            getLedger({
                email,
                page: pageParam,
            }),

        enabled: !!email,

        initialPageParam: 1,

        getNextPageParam: (
            lastPage
        ) => {
            if (
                lastPage.current_page <
                lastPage.total_pages
            ) {
                return (
                    lastPage.current_page +
                    1
                );
            }

            return undefined;
        },
    });
};
export const useInfiniteChildLedger = (parentId) => useInfiniteQuery({
    queryKey: ledgerKeys.childLists(parentId),
    queryFn: ({ pageParam = 1 }) => getChildLedger({ parentId, page: pageParam }),
    enabled: !!parentId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
        if (lastPage.current_page < lastPage.total_pages) { return (lastPage.current_page + 1) }
        return undefined;
    },
});
export const useInfiniteBrandLedger =
    (
        email,
    ) => {
        return useInfiniteQuery({
            queryKey:
                ledgerKeys.brandLists(email),

            queryFn: ({
                pageParam = 1,
            }) =>
                getBrandLedger({ email, page: pageParam, }),

            enabled: !!email,

            initialPageParam: 1,

            getNextPageParam: (
                lastPage
            ) => {
                if (
                    lastPage.page <
                    lastPage.total_pages
                ) {
                    return (lastPage.page + 1)
                }

                return undefined;
            },
        });
    };