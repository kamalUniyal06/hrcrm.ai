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

    return (
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Working History</h2>
                <button type="button" onClick={() => navigate("/attendance")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    See all <ChevronRight size={14} />
                </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-green-500" />9 hours or more</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-yellow-500" />6–9 hours or still working</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Less than 6 hours</span>
            </div>

            <div className="mt-4 w-full overflow-x-auto">
                <table className="w-full min-w-[570px] border-separate border-spacing-y-1 text-left">
                    <thead><tr>
                        {['Date', 'Arrival', 'Departure', 'Effective time'].map((label, index) => <th key={label} className={`${index === 0 ? 'rounded-l-lg' : index === 3 ? 'rounded-r-lg' : ''} bg-muted px-3 py-2.5 text-[10px] font-medium text-muted-foreground`}>{label}</th>)}
                        <th className="w-12" />
                    </tr></thead>
                    <tbody>
                        {records.map((record) => {
                            const dateKey = getDateKey(record.login || record.date_entered);
                            const minutes = workedMinutes(record);
                            return <tr key={record.id || `${dateKey}-${record.login}`}>
                                <td className="border-b border-border px-3 py-2"><div className="flex items-center gap-2 whitespace-nowrap"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs text-muted-foreground">{dateKey?.slice(-2)}</span><span className={dateKey === today ? "font-semibold text-primary" : "text-foreground"}>{formatDate(dateKey, today)}</span></div></td>
                                <td className="whitespace-nowrap border-b border-border px-3 py-2 text-xs text-foreground">{formatTime(record.login)}</td>
                                <td className="whitespace-nowrap border-b border-border px-3 py-2 text-xs text-foreground">{record.logout ? formatTime(record.logout) : "Still working"}</td>
                                <td className="border-b border-border px-3 py-2"><span className="block whitespace-nowrap text-xs text-foreground">{formatDuration(minutes)}</span><span className="block text-[9px] text-muted-foreground">/ 9 hours</span></td>
                                <td className="border-b border-border px-3 py-2"><span className={`relative block h-6 w-6 rounded-full ${statusColor(minutes, Boolean(record.logout))}`}><span className="absolute inset-[3px] rounded-full bg-card" /></span></td>
                            </tr>;
                        })}
                    </tbody>
                </table>
                {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading working history…</p>}
                {isError && <p className="py-8 text-center text-sm text-destructive">Could not load working history.</p>}
                {!isLoading && !isError && records.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No working history found for the last 7 days.</p>}
            </div>
        </section>
    );
}
