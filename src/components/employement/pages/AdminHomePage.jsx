import { useMemo, useState } from "react";
import { AlarmClock, CalendarCheck2, ChevronRight, LogIn, Users } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";

import TodayAttendanceCard from "../components/TodayAttendanceCard";
import SystemAlertCarousel from "../components/SystemAlertCarousel";
import HomeHeader from "../components/home/HomeHeader";
import StatTile from "../components/home/StatTile";
import AttendanceGauge from "../components/home/AttendanceGauge";
import ScheduleCard from "../components/home/ScheduleCard";
import TasksFeedCard from "../components/home/TasksFeedCard";
import { headerAction } from "../components/home/homeUi";
import {
    buildAttendanceRows,
    buildLeaveDays,
    dateKey,
    daySummary,
    isRowOnLeave,
} from "../components/attendance/adminAttendanceUtils";
import { adminDayStats, buildFeed, formatClock } from "../components/home/homeDashboardUtils";
import {
    useAllLeaves,
    useAnnouncements,
    useEmployeesDirectory,
    useOrgActivityForDay,
} from "../components/home/homeDashboard.queries";
import { employeeDisplayName, employeeFor } from "../components/leave/admin/leaveAdminUtils";
import { usePublicHolidays } from "../queries/leaves.queries";
import { timeToMinutes, useAttendanceLimits } from "../attendanceLimits";

// Gauge segment -> overview filter understood by the admin attendance page.
const ATTENDANCE_FILTER = { present: "onTime", late: "late", leave: "leave", absent: "missing" };
const PEOPLE_TABS = [["late", "Late"], ["missing", "Not checked in"], ["leave", "On leave"]];

function TodayPeopleCard({ groups, loading, onOpen, onViewAll }) {
    const [tab, setTab] = useState("late");
    const people = groups[tab] || [];
    return (
        <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Needs attention today</h2>
                <button type="button" onClick={() => onViewAll(tab)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    View all <ChevronRight size={13} />
                </button>
            </div>
            <div role="tablist" className="mt-3 flex gap-1 rounded-xl bg-muted p-1">
                {PEOPLE_TABS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {label} <span className="tabular-nums text-muted-foreground">{loading ? "" : groups[value]?.length || 0}</span>
                    </button>
                ))}
            </div>
            <ul className="mt-3 max-h-[300px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                {loading
                    ? [0, 1, 2, 3].map((index) => <li key={index}><Skeleton height={44} borderRadius={12} /></li>)
                    : people.length === 0
                        ? <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Nobody here right now.</li>
                        : people.map((person) => (
                            <li key={person.key}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(person)}
                                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                                        {person.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-foreground">{person.name}</span>
                                        <span className="block truncate text-[11px] text-muted-foreground">{person.designation || person.email}</span>
                                    </span>
                                    {person.time && <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--attendance-late)]">{person.time}</span>}
                                    <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                                </button>
                            </li>
                        ))}
            </ul>
        </section>
    );
}

export default function AdminHomePage() {
    const navigate = useNavigate();
    const userInfo = useSelector((state) => state.user.userInfo);
    const email = useSelector((state) => state.user.user?.email);
    const isEmployee = userInfo?.phase === "Employment";
    const limits = useAttendanceLimits();
    const lateAfter = (timeToMinutes(limits.actualLoginTime) ?? 570) + limits.loginDelayMinutes;
    const today = dateKey(new Date());

    const employees = useEmployeesDirectory();
    const activity = useOrgActivityForDay({ day: today });
    const leaves = useAllLeaves();
    const holidays = usePublicHolidays();
    const announcements = useAnnouncements();

    const rows = useMemo(() => buildAttendanceRows(employees.data || [], activity.data || []), [employees.data, activity.data]);
    const leaveDays = useMemo(() => buildLeaveDays(leaves.data || []), [leaves.data]);
    const stats = useMemo(() => adminDayStats({ rows, leaveDays, day: today, today, lateAfter }), [rows, leaveDays, today, lateAfter]);

    const groups = useMemo(() => {
        const result = { late: [], missing: [], leave: [] };
        for (const row of rows) {
            if (!row.matched) continue;
            const records = row.days[today] || [];
            const onLeave = isRowOnLeave(leaveDays, row, today);
            const summary = daySummary(records, today, today, onLeave, lateAfter);
            if (summary.status === "late") result.late.push({ ...row, time: summary.first.time, at: summary.first.minutes });
            else if (summary.status === "leave") result.leave.push(row);
            else if (!onLeave && !records.some((record) => String(record.login ?? "").trim())) result.missing.push(row);
        }
        result.late.sort((a, b) => b.at - a.at);
        return result;
    }, [rows, leaveDays, today, lateAfter]);

    const employeeMap = useMemo(() => new Map((employees.data || []).map((employee) => [employee.id, employee])), [employees.data]);
    const nameByEmail = useMemo(() => new Map(rows.filter((row) => row.email).map((row) => [row.email, row.name])), [rows]);
    const pendingLeaves = (leaves.data || []).filter((leave) => String(leave.status).toLowerCase() === "applied").length;

    const feed = useMemo(() => buildFeed({
        activity: activity.data || [],
        leaves: leaves.data || [],
        alerts: announcements.data || [],
        personLabel: (record) => nameByEmail.get(String(record.name || "").trim().toLowerCase()) || record.hrc_employees_hrc_daily_activity_1_name || record.name,
        leaveLabel: (leave) => `${employeeDisplayName(leave, employeeFor(leave, employeeMap))}'s`,
        limit: 15,
    }), [activity.data, announcements.data, leaves.data, nameByEmail, employeeMap]);

    const scheduleSources = useMemo(() => ({
        employees: employees.data || [],
        holidays: holidays.data?.records || [],
        leaves: leaves.data || [],
        leaveLabel: (leave) => `${employeeDisplayName(leave, employeeFor(leave, employeeMap))} on leave`,
    }), [employees.data, holidays.data, leaves.data, employeeMap]);

    const loading = employees.isPending || activity.isPending || leaves.isPending;
    const failed = employees.isError || activity.isError || leaves.isError;
    const openAttendance = (filter) => navigate(`/attendance?filter=${filter}`);

    return (
        <main className="min-h-full w-full bg-background px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1600px] space-y-4">
                <HomeHeader
                    subtitle="Today's attendance across the team, at a glance."
                    actions={
                        <>
                            <button type="button" onClick={() => navigate("/attendance")} className={headerAction}>
                                <CalendarCheck2 size={14} /> Attendance
                            </button>
                            <button type="button" onClick={() => navigate("/leave-approvals")} className={headerAction}>
                                Leave approvals
                                {pendingLeaves > 0 && <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-white">{pendingLeaves}</span>}
                            </button>
                        </>
                    }
                />

                {isEmployee && <SystemAlertCarousel employeeId={userInfo?.id} email={email} />}

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <aside className="order-first min-w-0 space-y-4 xl:sticky xl:top-4 xl:order-0 xl:col-start-2 xl:row-start-1">
                        {isEmployee && <TodayAttendanceCard />}
                        <ScheduleCard
                            sources={scheduleSources}
                            loading={holidays.isPending || leaves.isPending}
                            announcements={announcements.data || []}
                            announcementsLoading={announcements.isPending}
                        />
                    </aside>

                    <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            <StatTile icon={Users} label="Active employees" value={failed ? "—" : stats.employees} hint="View directory" loading={loading} onClick={() => navigate("/employees")} />
                            <StatTile icon={LogIn} label="Average check-in" value={formatClock(stats.avgCheckIn)} hint={`Shift starts ${limits.actualLoginTime}`} color="var(--attendance-present)" loading={loading} onClick={() => openAttendance("checkedIn")} />
                            <StatTile
                                icon={AlarmClock}
                                label="On-time arrival"
                                value={stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
                                hint={`Late after ${formatClock(lateAfter)}`}
                                color="var(--attendance-late)"
                                loading={loading}
                                onClick={() => openAttendance("onTime")}
                            />
                            <StatTile icon={CalendarCheck2} label="Pending leave requests" value={leaves.isError ? "—" : pendingLeaves} hint="Awaiting approval" color="var(--attendance-leave)" loading={leaves.isPending} onClick={() => navigate("/leave-approvals")} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <AttendanceGauge
                                title="Today's Attendance"
                                subtitle="Select a status to open those records"
                                counts={stats.counts}
                                labels={{ present: "On time", absent: "Not checked in" }}
                                loading={loading}
                                error={failed}
                                onSelect={(key) => openAttendance(ATTENDANCE_FILTER[key])}
                            />
                            <TodayPeopleCard
                                groups={groups}
                                loading={loading}
                                onOpen={(person) => person.key.startsWith("employee:")
                                    ? navigate(`/attendance/${person.key.slice("employee:".length)}`)
                                    : openAttendance("all")}
                                onViewAll={openAttendance}
                            />
                        </div>

                        <TasksFeedCard
                            feed={feed}
                            feedLoading={activity.isPending || leaves.isPending}
                            feedError={activity.isError}
                            today={today}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
