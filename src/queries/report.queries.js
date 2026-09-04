import { useInfiniteQuery } from "@tanstack/react-query";
import { getReports } from "../api/report.api";
export const reportKeys = {
    all: ["reports"],

    lists: (
        filters = {}
    ) => [
            "reports",
            "list",
            filters,
        ],
};
export const useInfiniteReports =
    (preference = {}) =>
        useInfiniteQuery({
            queryKey:
                reportKeys.lists(
                    preference
                ),

            queryFn: ({
                pageParam = 1,
            }) =>
                getReports({
                    preference,
                    page: pageParam,
                }),

            initialPageParam: 1,

            getNextPageParam: (
                lastPage
            ) => {
                if (
                    lastPage.pagination.page <
                    lastPage.pagination.totalPages
                ) {
                    return (
                        lastPage.pagination.page +
                        1
                    );
                }

                return undefined;
            },

            staleTime:
                5 * 60 * 1000,
        });