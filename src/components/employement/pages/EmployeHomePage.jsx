import { useMemo, useState } from "react";
import { CalendarDays, Palmtree } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import TodayAttendanceCard from "../components/TodayAttendanceCard";
import WorkingHistory from "../components/WorkingHistory";
import PendingAlertsBanner from "../components/alerts/PendingAlertsBanner";
import { useSystemAlerts } from "../components/alerts/systemAlertsContext";
import { utcToLocalStamp } from "../components/alerts/systemAlertUtils";
import HomeHeader from "../components/home/HomeHeader";
import AttendanceGauge from "../components/home/AttendanceGauge";
import ScheduleCard from "../components/home/ScheduleCard";
import { FeedCard, TasksCard } from "../components/home/TasksFeedCard";
import { headerAction, pageGutter } from "../components/home/homeUi";
import { buildLeaveDays, calendarDateKey, dateKey } from "../components/attendance/adminAttendanceUtils";
import { buildFeed, employeeAttendanceStats } from "../components/home/homeDashboardUtils";
import {
    monthRange,
    useEmployeesDirectory,
    useMyActivityRange,
} from "../components/home/homeDashboard.queries";
import { useEmployeeLeaves, usePublicHolidays } from "../queries/leaves.queries";
import { timeToMinutes, useAttendanceLimits } from "../attendanceLimits";

const PERIODS = [["month", "This month"], ["30d", "Last 30 days"]];
const recordsOf = (data) => (Array.isArray(data) ? data : data?.records || data?.data?.records || []);

export default function EmployeHomePage() {
    const navigate = useNavigate();
    const employeeId = useSelector((state) => state.user.userInfo?.id);
    const email = useSelector((state) => state.user.user?.email);
    const limits = useAttendanceLimits();
    const loginMinutes = timeToMinutes(limits.actualLoginTime) ?? 570;
    const lateAfter = loginMinutes + limits.loginDelayMinutes;
    const [period, setPeriod] = useState("month");
    const today = dateKey(new Date());

    const range = useMemo(() => {
        if (period === "month") return monthRange();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { from: dateKey(start), to: today };
    }, [period, today]);

    const activity = useMyActivityRange({ email, ...range });
    const leaves = useEmployeeLeaves({ employeeId, email });
    const holidays = usePublicHolidays();
    const employees = useEmployeesDirectory();
    // Employees read alerts only through my_alerts; times there are UTC.
    const { alerts: myAlerts, loading: alertsLoading, openAlert } = useSystemAlerts();
    const announcements = useMemo(
        () => myAlerts.map((alert) => ({ ...alert, date_entered: utcToLocalStamp(alert.date_entered) })),
        [myAlerts],
    );

    const leaveRecords = useMemo(() => recordsOf(leaves.data), [leaves.data]);
    const holidayRecords = useMemo(() => recordsOf(holidays.data), [holidays.data]);

    const stats = useMemo(() => {
        // Every record here belongs to this employee, so keep only the date part of each key.
        const leaveDays = new Set([...buildLeaveDays(leaveRecords)].map((key) => key.split("|")[1]));
        const holidayDays = new Set(holidayRecords.map((holiday) => calendarDateKey(holiday.holiday_date)).filter(Boolean));
        return employeeAttendanceStats({ records: activity.data || [], ...range, today, lateAfter, leaveDays, holidays: holidayDays });
    }, [activity.data, holidayRecords, lateAfter, leaveRecords, range, today]);

    const feed = useMemo(
        () => buildFeed({ activity: activity.data || [], leaves: leaveRecords, alerts: announcements }),
        [activity.data, announcements, leaveRecords],
    );

    const scheduleSources = useMemo(() => ({
        employees: employees.data || [],
        holidays: holidayRecords,
        leaves: leaveRecords,
        leaveLabel: () => "You're on leave",
    }), [employees.data, holidayRecords, leaveRecords]);

    const loading = activity.isPending;
    const periodLabel = PERIODS.find(([value]) => value === period)[1].toLowerCase();

    return (
        <main className={`min-h-full w-full bg-background ${pageGutter}`}>
            <div className="w-full space-y-4">
                <HomeHeader
                    subtitle="Here's your attendance overview and what's coming up."
                    actions={
                        <>
                            <button type="button" onClick={() => navigate("/attendance")} className={headerAction}>
                                <CalendarDays size={14} /> My attendance
                            </button>
                            <button type="button" onClick={() => navigate("/my-leaves")} className={headerAction}>
                                <Palmtree size={14} /> Apply leave
                            </button>
                        </>
                    }
                />

                <PendingAlertsBanner />

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <aside className="order-first min-w-0 space-y-4 lg:sticky lg:top-4 lg:order-0 lg:col-start-2 lg:row-start-1">
                        <TodayAttendanceCard />
                        <ScheduleCard
                            sources={scheduleSources}
                            loading={holidays.isPending || leaves.isPending}
                            announcements={announcements}
                            announcementsLoading={alertsLoading}
                            onOpenAnnouncement={(alert) => openAlert(alert.id)}
                        />
                    </aside>

                    <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
                        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                            <TasksCard />
                            <FeedCard
                                feed={feed}
                                loading={activity.isPending || alertsLoading}
                                error={activity.isError}
                                today={today}
                            />
                        </div>

                        <WorkingHistory email={email} />

                        <AttendanceGauge
                            title="My Attendance"
                            subtitle={`Working days ${periodLabel}`}
                            counts={stats.counts}
                            labels={{ present: "On time" }}
                            loading={loading}
                            error={activity.isError}
                            onSelect={() => navigate("/attendance")}
                            action={
                                <select
                                    value={period}
                                    onChange={(event) => setPeriod(event.target.value)}
                                    aria-label="Attendance period"
                                    className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            }
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
