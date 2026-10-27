import { useMemo, useState } from "react";
import { AlarmClock, CalendarCheck2, ChevronRight, LogIn, Users } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";

import TodayAttendanceCard from "../components/TodayAttendanceCard";
import PendingAlertsBanner from "../components/alerts/PendingAlertsBanner";
import { isAlertLive } from "../components/alerts/systemAlertUtils";
import HomeHeader from "../components/home/HomeHeader";
import StatTile from "../components/home/StatTile";
import OffboardingCard from "../components/home/OffboardingCard";
import IncrementRequestsCard from "../components/home/IncrementRequestsCard";
import HiringPipelineCard from "../components/home/HiringPipelineCard";
import ScheduleCard from "../components/home/ScheduleCard";
import TasksFeedCard from "../components/home/TasksFeedCard";
import QuotationAlertsCard from "../components/home/QuotationAlertsCard";
import HomeAlertsCarousel from "../components/home/HomeAlertsCarousel";
import { LEAVE_WAITING_DAYS, QUOTATION_OVERDUE_DAYS } from "../components/home/generalAlerts";
import { headerAction, pageGutter } from "../components/home/homeUi";
import {
    buildAttendanceRows,
    buildLeaveDays,
    calendarDateKey,
    dateKey,
    daySummary,
    isHalfDayLeave,
    isRowOnLeave,
} from "../components/attendance/adminAttendanceUtils";
import { adminDayStats, buildFeed, formatClock } from "../components/home/homeDashboardUtils";
import { countByLabel, openOffboardingCases } from "../components/home/adminInsights";
import { requestOverview } from "../api/incrementAdminData";
import { candidateName, workflowValue } from "../../pages/candidates/candidatesApi";
import { hasOutcome, interviewDate, roundName, uniqueInterviews } from "../../pages/interviews/interviewUtils";
import {
    useAllLeaves,
    useAnnouncements,
    useCandidatesForRange,
    useEmployeesDirectory,
    useIncrementQuestions,
    useIncrementRequests,
    useInterviews,
    useLeavesOnDay,
    useOrgActivityForDay,
    useResignations,
    monthRange,
} from "../components/home/homeDashboard.queries";
import { dateKey as recordDateKey, employeeDisplayName, employeeFor } from "../components/leave/admin/leaveAdminUtils";
import { usePublicHolidays } from "../queries/leaves.queries";
import { useQuotations } from "../../../queries/quotations.queries";
import { daysOutstanding, isPaid, quotationSummary } from "../../pages/quotations/quotationUtils";
import { timeToMinutes, useAttendanceLimits } from "../attendanceLimits";

// Tab values double as /attendance?filter= values for "View all".
const PEOPLE_TABS = [["late", "Late"], ["missing", "Not checked in"], ["leave", "On leave"], ["halfDay", "Half day"]];

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
            <div role="tablist" className="hide-scrollbar mt-3 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
                {PEOPLE_TABS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
    const isEmployee = userInfo?.phase === "Employment";
    const limits = useAttendanceLimits();
    const lateAfter = (timeToMinutes(limits.actualLoginTime) ?? 570) + limits.loginDelayMinutes;
    const today = dateKey(new Date());

    const employees = useEmployeesDirectory();
    const activity = useOrgActivityForDay({ day: today });
    // Today's leave status uses date-filtered leaves; the full list still feeds pending requests, the feed and the schedule.
    const todayLeaves = useLeavesOnDay({ day: today });
    const leaves = useAllLeaves();
    const holidays = usePublicHolidays();
    const announcements = useAnnouncements();
    // HR reads every alert; only live ones (active, not expired) are announcements.
    const liveAnnouncements = useMemo(
        () => (announcements.data || []).filter((alert) => isAlertLive(alert)),
        [announcements.data],
    );
    const resignations = useResignations();
    const incrementRequests = useIncrementRequests();
    const incrementQuestions = useIncrementQuestions();
    const [month] = useState(() => monthRange());
    const candidates = useCandidatesForRange(month);
    const interviews = useInterviews();
    const quotations = useQuotations();
    const quotationTotals = useMemo(() => quotationSummary(quotations.data || []), [quotations.data]);

    const rows = useMemo(() => buildAttendanceRows(employees.data || [], activity.data || []), [employees.data, activity.data]);
    const leaveDays = useMemo(() => buildLeaveDays(todayLeaves.data || []), [todayLeaves.data]);
    const halfDayLeaveDays = useMemo(() => buildLeaveDays((todayLeaves.data || []).filter(isHalfDayLeave)), [todayLeaves.data]);
    const stats = useMemo(() => adminDayStats({ rows, leaveDays, day: today, today, lateAfter }), [rows, leaveDays, today, lateAfter]);

    const groups = useMemo(() => {
        const result = { late: [], missing: [], leave: [], halfDay: [] };
        for (const row of rows) {
            if (!row.matched) continue;
            const records = row.days[today] || [];
            const onLeave = isRowOnLeave(leaveDays, row, today);
            const summary = daySummary(records, today, today, onLeave, lateAfter);
            if (summary.status === "late") result.late.push({ ...row, time: summary.first.time, at: summary.first.minutes });
            // Someone on leave who still logged in is listed under their leave tab and under "Late" if they were late.
            // As on the attendance page, "On leave" is full days only; half-day leave has its own tab.
            if (onLeave && isRowOnLeave(halfDayLeaveDays, row, today)) result.halfDay.push(row);
            else if (onLeave) result.leave.push(row);
            else if (!records.some((record) => String(record.login ?? "").trim())) result.missing.push(row);
        }
        result.late.sort((a, b) => b.at - a.at);
        return result;
    }, [rows, leaveDays, halfDayLeaveDays, today, lateAfter]);

    const employeeMap = useMemo(() => new Map((employees.data || []).map((employee) => [employee.id, employee])), [employees.data]);
    const nameByEmail = useMemo(() => new Map(rows.filter((row) => row.email).map((row) => [row.email, row.name])), [rows]);
    const pendingLeaves = (leaves.data || []).filter((leave) => String(leave.status).toLowerCase() === "applied").length;

    // Inputs for the general alerts. Each list is empty until its data has loaded, so no alert shows half-counted.
    const holidayKeys = useMemo(
        () => new Set((holidays.data?.records || []).filter((holiday) => String(holiday.deleted) !== "1").map((holiday) => calendarDateKey(holiday.holiday_date)).filter(Boolean)),
        [holidays.data],
    );
    const attendanceReady = Boolean(employees.data && activity.data && todayLeaves.data);
    const notCheckedIn = useMemo(
        () => (attendanceReady ? groups.missing.map((row) => ({ key: row.key, name: row.name })) : []),
        [attendanceReady, groups.missing],
    );
    const waitingLeaves = useMemo(() => {
        const appliedBy = dateKey(new Date(Date.now() - LEAVE_WAITING_DAYS * 24 * 60 * 60 * 1000));
        return (leaves.data || [])
            .filter((leave) => String(leave.status).toLowerCase() === "applied")
            .filter((leave) => { const applied = recordDateKey(leave.date_entered); return applied && applied <= appliedBy; })
            .map((leave) => ({ key: `leave:${leave.id}`, name: employeeDisplayName(leave, employeeFor(leave, employeeMap)) }));
    }, [leaves.data, employeeMap]);
    const overdueQuotations = useMemo(
        () => (quotations.data || [])
            .filter((quotation) => !isPaid(quotation) && (daysOutstanding(quotation) ?? 0) > QUOTATION_OVERDUE_DAYS)
            .map((quotation) => ({ key: `quotation:${quotation.id}`, name: [quotation.name, quotation.worker_name].filter(Boolean).join(" · ") })),
        [quotations.data],
    );

    const feed = useMemo(() => buildFeed({
        activity: activity.data || [],
        leaves: leaves.data || [],
        alerts: liveAnnouncements,
        personLabel: (record) => nameByEmail.get(String(record.name || "").trim().toLowerCase()) || record.hrc_employees_hrc_daily_activity_1_name || record.name,
        leaveLabel: (leave) => `${employeeDisplayName(leave, employeeFor(leave, employeeMap))}'s`,
        limit: 15,
    }), [activity.data, liveAnnouncements, leaves.data, nameByEmail, employeeMap]);

    const scheduleSources = useMemo(() => ({
        employees: employees.data || [],
        holidays: holidays.data?.records || [],
        leaves: leaves.data || [],
        leaveLabel: (leave) => `${employeeDisplayName(leave, employeeFor(leave, employeeMap))} on leave`,
    }), [employees.data, holidays.data, leaves.data, employeeMap]);

    const offboarding = useMemo(() => openOffboardingCases(resignations.data || [], employees.data || []), [resignations.data, employees.data]);
    const incrementOverview = useMemo(
        () => requestOverview(incrementRequests.data?.records || [], incrementQuestions.data || [], incrementRequests.data?.replies || []),
        [incrementRequests.data, incrementQuestions.data],
    );

    const hiring = useMemo(() => {
        const records = (candidates.data || [])
            .map((record) => ({ record, stage: workflowValue(record, "stage"), at: Date.parse(record.date_entered_uni_format || record.date_entered) || 0 }))
            .sort((a, b) => b.at - a.at);
        return {
            total: records.length,
            shortlisted: records.filter((item) => /shortlist/i.test(item.stage)).length,
            stages: countByLabel(records, (item) => item.stage),
            recent: records.slice(0, 4).map(({ record, stage }) => ({
                id: record.id,
                name: candidateName(record),
                designation: record.current_designation || record.department,
                stage,
                record,
            })),
        };
    }, [candidates.data]);

    const upcomingInterviews = useMemo(() => {
        const now = Date.now();
        return uniqueInterviews(interviews.data || [])
            .filter((record) => !hasOutcome(record))
            .map((record) => ({ id: record.id, name: record.name || record.email || "Candidate", round: roundName(record), date: interviewDate(record.interview_datetime) }))
            .filter((item) => item.date && item.date.getTime() >= now)
            .sort((a, b) => a.date - b.date);
    }, [interviews.data]);

    const loading = employees.isPending || activity.isPending || todayLeaves.isPending;
    const failed = employees.isError || activity.isError || todayLeaves.isError;
    const openAttendance = (filter) => navigate(`/attendance?filter=${filter}`);

    return (
        <main className={`min-h-full w-full bg-background ${pageGutter}`}>
            <div className="w-full space-y-4">
                <HomeHeader
                    subtitle="Attendance, hiring and people changes across the team, at a glance."
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

                <PendingAlertsBanner />
                <HomeAlertsCarousel
                    day={today}
                    holidays={holidayKeys}
                    notCheckedIn={notCheckedIn}
                    waitingLeaves={waitingLeaves}
                    overdueQuotations={overdueQuotations}
                />

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <aside className="order-first min-w-0 space-y-4 lg:sticky lg:top-4 lg:order-0 lg:col-start-2 lg:row-start-1">
                        {isEmployee && <TodayAttendanceCard />}
                        <ScheduleCard
                            sources={scheduleSources}
                            loading={holidays.isPending || leaves.isPending}
                            announcements={liveAnnouncements}
                            announcementsLoading={announcements.isPending}
                        />
                        <QuotationAlertsCard
                            records={quotations.data}
                            summary={quotationTotals}
                            loading={quotations.isPending}
                            error={quotations.isError}
                            onRetry={() => quotations.refetch()}
                            onViewAll={() => navigate("/quotations")}
                            onFilter={(status) => navigate(`/quotations?status=${status}`)}
                            onOpen={(record) => navigate(`/quotations?quotation=${record.id}`)}
                            onCreate={() => navigate("/quotations?view=create")}
                        />
                    </aside>

                    <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
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

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <OffboardingCard
                                cases={offboarding}
                                loading={resignations.isPending || employees.isPending}
                                error={resignations.isError}
                                onRetry={() => resignations.refetch()}
                                onOpen={(item) => navigate(item.email ? `/exit?email=${encodeURIComponent(item.email)}` : "/exit")}
                                onViewAll={() => navigate("/exit")}
                                onFilter={(status) => navigate(`/exit?status=${status}`)}
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

                        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                            <HiringPipelineCard
                                total={hiring.total}
                                shortlisted={hiring.shortlisted}
                                stages={hiring.stages}
                                recent={hiring.recent}
                                upcoming={upcomingInterviews}
                                loading={candidates.isPending}
                                error={candidates.isError}
                                interviewsLoading={interviews.isPending}
                                onRetry={() => candidates.refetch()}
                                onOpenCandidate={(candidate) => navigate(`/candidates?candidate=${candidate.id}`)}
                                onViewAll={() => navigate("/candidates")}
                                onViewShortlisted={() => navigate("/candidates?view=shortlisted")}
                                onViewInterviews={() => navigate("/candidates?view=interviews")}
                            />
                            <IncrementRequestsCard
                                overview={incrementOverview}
                                loading={incrementRequests.isPending || incrementQuestions.isPending}
                                error={incrementRequests.isError || incrementQuestions.isError}
                                onRetry={() => { incrementRequests.refetch(); incrementQuestions.refetch(); }}
                                onViewAll={() => navigate("/increment-management")}
                                onFilter={(filter) => navigate(`/increment-management?filter=${filter}`)}
                                onOpen={(identity) => navigate(identity.email ? `/increment-management?email=${encodeURIComponent(identity.email)}` : "/increment-management")}
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
