import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAttendanceCalendar,
    getAttendanceDay,
    applyAttendanceRequest,
    getWorkingHistory,
} from "../api/attendance.api";
export const attendanceKeys = {
    all: ["attendance"],

    calendar: (email, month) => [
        ...attendanceKeys.all,
        "calendar",
        email,
        month,
    ],

    day: (email, date) => [
        ...attendanceKeys.all,
        "day",
        email,
        date,
    ],

    history: (email, dateFrom, dateTo) => [
        ...attendanceKeys.all,
        "history",
        email,
        dateFrom,
        dateTo,
    ],
};

export const useWorkingHistory = ({ email, dateFrom, dateTo }) => {
    return useQuery({
        queryKey: attendanceKeys.history(email, dateFrom, dateTo),
        queryFn: () => getWorkingHistory({ email, dateFrom, dateTo }),
        enabled: Boolean(email && dateFrom && dateTo),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};
export const useAttendanceCalendar = ({ email, month }) => {
    return useQuery({
        queryKey: attendanceKeys.calendar(email, month),

        queryFn: () =>
            getAttendanceCalendar({
                email,
                month,
            }),

        enabled: Boolean(email && month),

        staleTime: 5 * 60 * 1000,

        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

export const useAttendanceDay = ({ email, date }) => {
    return useQuery({
        queryKey: attendanceKeys.day(email, date),

        queryFn: () =>
            getAttendanceDay({
                email,
                date,
            }),

        enabled: Boolean(email && date),

        staleTime: 5 * 60 * 1000,

        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

export const useApplyAttendanceRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: applyAttendanceRequest,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: attendanceKeys.all,
            });
        },
    });
};
