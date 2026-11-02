import {
    useInfiniteQuery,
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import {
    applyForLeave,
    getLeaveApplications,
    getLeavesHistory,
    getPublicHolidays,
    getEmployeeLeaves,
    getAllLeaves,
} from "../api/leaves.api";
import toast from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export const leavesKey = {
    all: ["leaves"],

    leavesHistory: (
        filters = {}
    ) => ["leaves",
            "leaves-history",
            "list",
            filters,
        ],
    leaveApplications: (
        filters = {}
    ) => ["leaves",
            "leave-applications",
            "list",
            filters,
        ],
    publicHolidays: () => ["leaves",
        "public-holidays",
    ],
    employeeLeaves: (employeeId, email) => ["leaves", "employee", employeeId || email],

};

export const useEmployeeLeaves = ({ employeeId, email }) => useQuery({
    queryKey: leavesKey.employeeLeaves(employeeId, email),
    queryFn: () => getEmployeeLeaves({ employeeId, email }),
    enabled: Boolean(employeeId || email),
    staleTime: 5 * 60 * 1000,
});


// Leaves in the caller's leave read scope that end between `from` and `to` (YYYY-MM-DD), plus
// those starting in that range saved without an end date. The gateway filters on one date field
// per request, so this takes two.
export const useLeavesBetween = ({ from, to, enabled = true }) => useQuery({
    queryKey: ["leaves", "between", from, to],
    queryFn: async () => {
        const range = { from: `${from} 00:00:00`, to: `${to} 23:59:59` };
        const [ending, starting] = await Promise.all([
            getAllLeaves({ ...range, dateField: "leave_to" }),
            getAllLeaves({ ...range, dateField: "leave_from" }),
        ]);
        return [...ending.records, ...starting.records];
    },
    enabled: Boolean(enabled && from && to),
    staleTime: 60 * 1000,
});

export const useApplyForLeave = () =>
    useMutation({
        mutationFn: (data) => applyForLeave(data),
        onSuccess: () => {
            toast.success("Leave applied successfully");
            queryClient.invalidateQueries(leavesKey.all);
            // The leave code is used up.
            queryClient.invalidateQueries({ queryKey: ["hr", "leave-tokens"] });
        },
        onError: (error) => {
            // e.g. "Leave token: K7P2QX was given for 10 Nov to 12 Nov, not for these dates."
            toast.error(error?.message || "Failed to apply for leave");
        }
    });
export const useLeaveApplications = (
    { preferences = {} }
) => {

    return useInfiniteQuery({
        queryKey:
            leavesKey.leaveApplications(
                preferences,
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getLeaveApplications({
                preferences,
                page: pageParam,
            }),

        initialPageParam: 1,
        getNextPageParam: (
            lastPage
        ) => {
            const currentPage = Number(lastPage.page);
            const totalPages = Number(lastPage.total_pages);

            if (
                Number.isFinite(currentPage) &&
                Number.isFinite(totalPages) &&
                currentPage < totalPages
            ) {
                return currentPage + 1;
            }

            return undefined;
        },

        staleTime:
            5 * 60 * 1000,
    });
};
export const useLeavesHistory = (
    { preferences = {} }
) => {

    return useInfiniteQuery({
        queryKey:
            leavesKey.leavesHistory(
                preferences,
            ),

        queryFn: ({
            pageParam = 1,
        }) =>
            getLeavesHistory({
                preferences,
                page: pageParam,
            }),

        initialPageParam: 1,
        getNextPageParam: (
            lastPage
        ) => {
            const currentPage = Number(lastPage.page);
            const totalPages = Number(lastPage.total_pages);

            if (
                Number.isFinite(currentPage) &&
                Number.isFinite(totalPages) &&
                currentPage < totalPages
            ) {
                return currentPage + 1;
            }

            return undefined;
        },

        staleTime:
            5 * 60 * 1000,
    });
};
export const usePublicHolidays = () => {

    return useQuery({
        queryKey:
            leavesKey.publicHolidays(),

        queryFn: () =>
            getPublicHolidays(),


        staleTime:
            5 * 60 * 1000,
    });
};
