import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAttendanceCalendar,
    getAttendanceDay,
    applyAttendanceRequest,
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