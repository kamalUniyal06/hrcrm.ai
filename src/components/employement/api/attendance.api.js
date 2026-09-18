// attendance.api.js

import { http } from "../../../services/api";

const dummyAttendance = {
    "2026-09-01": {
        status: "present",
        check_in: "08:02",
        check_out: "17:31",
        overtime: "00:01",
    },

    "2026-09-02": {
        status: "present",
        check_in: "08:00",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-03": {
        status: "late",
        check_in: "08:24",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-04": {
        status: "present",
        check_in: "07:58",
        check_out: "17:42",
        overtime: "00:12",
    },

    "2026-09-05": {
        status: "holiday",
        label: "HOLIDAY",
    },

    "2026-09-06": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-07": {
        status: "present",
        check_in: "08:05",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-08": {
        status: "present",
        check_in: "08:01",
        check_out: "18:05",
        overtime: "00:35",
    },

    "2026-09-09": {
        status: "leave",
        leave_type: "ANNUAL LEAVE",
    },

    "2026-09-10": {
        status: "present",
        check_in: "08:03",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-11": {
        status: "late",
        check_in: "08:17",
        check_out: "17:40",
        overtime: "00:10",
    },

    "2026-09-12": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-13": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-14": {
        status: "present",
        check_in: "08:00",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-15": {
        status: "present",
        check_in: "08:04",
        check_out: "17:55",
        overtime: "00:25",
    },

    "2026-09-16": {
        status: "absent",
    },

    "2026-09-17": {
        status: "present",
        check_in: "08:06",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-18": {
        status: "present",
        check_in: "08:00",
        check_out: "17:45",
        overtime: "00:15",
    },

    "2026-09-19": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-20": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-21": {
        status: "present",
        check_in: "08:02",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-22": {
        status: "present",
        check_in: "08:08",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-23": {
        status: "late",
        check_in: "08:32",
        check_out: "17:45",
        overtime: "00:15",
    },

    "2026-09-24": {
        status: "present",
        check_in: "07:55",
        check_out: "18:10",
        overtime: "00:40",
    },

    "2026-09-25": {
        status: "present",
        check_in: "08:00",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-26": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-27": {
        status: "day_off",
        label: "DAY-OFF",
    },

    "2026-09-28": {
        status: "present",
        check_in: "08:03",
        check_out: "17:30",
        overtime: "00:00",
    },

    "2026-09-29": {
        status: "leave",
        leave_type: "SICK LEAVE",
    },

    "2026-09-30": {
        status: "present",
        check_in: "08:01",
        check_out: "17:50",
        overtime: "00:20",
    },
};


/**
 * Get attendance calendar
 *
 * Temporary dummy implementation.
 * Replace the function body with apiRequest()
 * when the backend endpoint is ready.
 */
export const getAttendanceCalendar = async ({
    email,
    month,
}) => {
    const year = month.split("-")[0];
    const monthNumber = month.split("-")[1];
    return http({
        method: "POST",
        body: {
            action: "fetch",
            module: "hrc_daily_activity",
            filters: {
                name: email
            },
            date_field: "date_entered",
            date_from: `${year}-01-${monthNumber}`,
            date_to: `${year}-31-${monthNumber}`,
            page: 1,
            per_page: 31
        }
    })
};


/**
 * Get attendance for a specific day
 */
export const getAttendanceDay = async ({
    email,
    date,
}) => {
    console.log(
        "Dummy attendance day request:",
        {
            email,
            date,
        }
    );

    await new Promise((resolve) =>
        setTimeout(resolve, 300)
    );

    return {
        success: true,
        data: dummyAttendance[date] || null,
    };
};


/**
 * Apply attendance request
 */
export const applyAttendanceRequest = async (
    data
) => {
    console.log(
        "Dummy attendance request submitted:",
        data
    );

    await new Promise((resolve) =>
        setTimeout(resolve, 500)
    );

    return {
        success: true,
        message:
            "Attendance request submitted successfully.",
        data,
    };
};