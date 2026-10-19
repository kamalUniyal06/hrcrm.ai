import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useWorkingHistory } from "../hooks/useAttendance";

const INDIA_TIME_ZONE = "Asia/Kolkata";

const dateKeyInIndia = (date) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: INDIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

const getDateKey = (value) => {
    const text = String(value || "");
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
    return text.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || null;
};

const parseTime = (value) => {
    const text = String(value || "").trim();
    const crm = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!crm && !iso) return null;
    const [year, month, day, hour, minute] = crm
        ? [crm[3], crm[1], crm[2], crm[4], crm[5]].map(Number)
        : iso.slice(1).map(Number);
    const stamp = Date.UTC(year, month - 1, day, hour, minute);
    return { hour, minute, stamp };
};

const formatTime = (value) => {
    const minutes = parseTime(value);
    if (minutes === null) return "—";
    return `${String(minutes.hour % 12 || 12).padStart(2, "0")}:${String(minutes.minute).padStart(2, "0")} ${minutes.hour >= 12 ? "PM" : "AM"}`;
};

const workedMinutes = (record) => {
    const login = parseTime(record?.login);
    const logout = parseTime(record?.logout);
    if (!login || !logout || logout.stamp < login.stamp) return null;
    return (logout.stamp - login.stamp) / 60000;
};

const formatDuration = (minutes) => {
    if (minutes === null) return "In progress";
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

const formatDate = (dateKey, today) => {
    if (!dateKey) return "Unknown date";
    if (dateKey === today) return "Today";
    const [year, month, day] = dateKey.split("-");
    return `${day}/${month}/${year}`;
};

const statusColor = (minutes, hasLogout) => {
    if (!hasLogout) return "bg-yellow-500";
    if (minutes >= 9 * 60) return "bg-green-500";
    if (minutes >= 6 * 60) return "bg-yellow-500";
    return "bg-red-500";
};

export default function WorkingHistory({ email }) {
    const navigate = useNavigate();
    const dates = useMemo(() => {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 6);
        return { dateFrom: dateKeyInIndia(from), dateTo: dateKeyInIndia(now) };
    }, []);
    const { data, isLoading, isError } = useWorkingHistory({ email, ...dates });
    const today = dateKeyInIndia(new Date());
    const records = useMemo(() => {
        const rows = data?.data?.records || data?.records || [];
        return Array.isArray(rows)
            ? [...rows]
                .filter((record) => {
                    const key = getDateKey(record?.login || record?.date_entered);
                    return key >= dates.dateFrom && key <= dates.dateTo;
                })
                .sort((a, b) => String(b?.login || b?.date_entered).localeCompare(String(a?.login || a?.date_entered)))
                .slice(0, 7)
            : [];
    }, [data, dates]);
}
