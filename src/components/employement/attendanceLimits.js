import { useQuery } from "@tanstack/react-query";
import { http } from "../../services/api";

export const ATTENDANCE_LIMITS_STORAGE_KEY = "hrcrm-attendance-limits";
export const attendanceLimitsKey = ["limit-management", "attendance-limits"];

export const DEFAULT_ATTENDANCE_LIMITS = Object.freeze({
    actualLoginTime: "9:30 AM",
    loginDelayMinutes: 30,
    lunchOutMinutes: 40,
});

const positiveNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const normalizeTime = (value, fallback) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return fallback;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 1 || hour > 12 || minute > 59) return fallback;
    return `${hour}:${String(minute).padStart(2, "0")} ${match[3].toUpperCase()}`;
};

export const readCachedAttendanceLimits = () => {
    if (typeof localStorage === "undefined") return DEFAULT_ATTENDANCE_LIMITS;

    try {
        const cached = JSON.parse(localStorage.getItem(ATTENDANCE_LIMITS_STORAGE_KEY));
        return {
            actualLoginTime: normalizeTime(cached?.actualLoginTime, DEFAULT_ATTENDANCE_LIMITS.actualLoginTime),
            loginDelayMinutes: positiveNumber(cached?.loginDelayMinutes, DEFAULT_ATTENDANCE_LIMITS.loginDelayMinutes),
            lunchOutMinutes: positiveNumber(cached?.lunchOutMinutes, DEFAULT_ATTENDANCE_LIMITS.lunchOutMinutes),
        };
    } catch {
        return DEFAULT_ATTENDANCE_LIMITS;
    }
};

export const fetchAttendanceLimits = async () => {
    const response = await http({
        method: "POST",
        body: {
            action: "fetch",
            module: "hrc_limit_management",
            page: 1,
            per_page: 100,
        },
    });

    if (response?.success !== true || !Array.isArray(response.records)) {
        throw new Error(response?.message || response?.error || "Could not load attendance limits.");
    }

    const current = readCachedAttendanceLimits();
    const byName = new Map(
        response.records
            .filter((record) => String(record.deleted) !== "1")
            .map((record) => [String(record.name || "").trim().toLowerCase(), record]),
    );
    const loginDelay = byName.get("login delay");
    const lunchOut = byName.get("lunch out");
    const limits = {
        actualLoginTime: normalizeTime(loginDelay?.actual_time, current.actualLoginTime),
        loginDelayMinutes: positiveNumber(loginDelay?.minutes, current.loginDelayMinutes),
        lunchOutMinutes: positiveNumber(lunchOut?.minutes, current.lunchOutMinutes),
    };

    try {
        localStorage.setItem(ATTENDANCE_LIMITS_STORAGE_KEY, JSON.stringify(limits));
    } catch {
        // The in-memory query value still keeps the current session updated.
    }
    return limits;
};

export const timeToMinutes = (value) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(match[2]);
};

export const useAttendanceLimits = () => {
    const query = useQuery({
        queryKey: attendanceLimitsKey,
        queryFn: fetchAttendanceLimits,
        initialData: readCachedAttendanceLimits,
        enabled: false,
        staleTime: Infinity,
    });

    return query.data || DEFAULT_ATTENDANCE_LIMITS;
};
