import { createElement, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Flag,
  GraduationCap,
  Hourglass,
  Laptop,
  Linkedin,
  Loader2,
  Mail,
  Palmtree,
  Pencil,
  Phone,
  PhoneOff,
  PartyPopper,
  TrendingUp,
  UserRound,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { AttendanceProvider } from "../../employement/context/AttendanceContext";
import EmployeeAttendanceCalendar from "../../employement/components/attendance/EmployeeAttendanceCalendar";
import StatTile from "../../employement/components/home/StatTile";
import { pageGutter } from "../../employement/components/home/homeUi";
import { useEmployeeLeaves } from "../../employement/queries/leaves.queries";
import { dateKey, formatDate, statusOf } from "../../employement/components/leave/admin/leaveAdminUtils";
import EmployeeDetails, { EmployeeAvatar, FieldValue } from "./EmployeeDetails";
import { groups } from "./employeeFields";
import { employeeName, fetchEmployee, formatJoinDate, tenure } from "./employeesApi";
import { employeeTimeline } from "./employeeTimeline";

const clean = (value) => String(value ?? "").trim();
const linkButton =
  "inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TIMELINE_STYLES = {
  join: [Flag, "var(--primary)"],
  setup: [Laptop, "var(--employee-blue)"],
  onboarding: [ClipboardCheck, "var(--employee-green)"],
  review: [BadgeCheck, "var(--employee-blue)"],
  training: [GraduationCap, "var(--employee-orange)"],
  award: [Award, "var(--employee-orange)"],
  anniversary: [PartyPopper, "var(--primary)"],
  increment: [TrendingUp, "var(--employee-green)"],
  leave: [Palmtree, "var(--employee-blue)"],
  today: [Clock3, "var(--primary)"],
};

// Profile tabs: [id, label, icon, field group titles shown in that tab].
const TABS = [
  ["personal", "Personal details", UserRound, ["Personal & contact", "Location"]],
  ["employment", "Employment", Briefcase, ["Employment", "Additional information"]],
  ["attendance", "Attendance", CalendarCheck, []],
  ["leave", "Leave", Palmtree, []],
  ["timeline", "Timeline", CalendarClock, []],
];
// Same underline tabs as the Jobs page.
const tabTrigger =
  "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-0.5 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-foreground motion-reduce:transition-none";

const LEAVE_STATUS = {
  Applied: ["Awaiting review", "var(--employee-orange)"],
  Accepted: ["Approved", "var(--employee-green)"],
  Rejected: ["Rejected", "var(--employee-red)"],
};

function Card({ title, icon, action, className = "", children }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">{createElement(icon, { size: 15 })}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Timeline({ record }) {
  const { events, estimatedStart } = useMemo(
    () => employeeTimeline({ joiningDate: record.joining_date, designation: clean(record.current_designation) || clean(record.title), department: clean(record.department) }),
    [record.joining_date, record.current_designation, record.title, record.department],
  );
  return (
    <Card
      title="Employee timeline"
      icon={CalendarClock}
      action={<span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Sample data</span>}
    >
      <p className="mt-2 text-xs text-muted-foreground">
        From the first day to today. {estimatedStart ? "No joining date is saved, so the dates are estimated." : "Events are placeholders until employee history is recorded."}
      </p>
      <ol className="mt-5">
        {events.map((event, index) => {
          const [Icon, color] = TIMELINE_STYLES[event.kind] || TIMELINE_STYLES.review;
          const last = index === events.length - 1;
          return (
            <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && <span aria-hidden="true" className="absolute left-[17px] top-9 bottom-0 w-px bg-border" />}
              <span
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${event.kind === "today" ? "ring-2 ring-primary/30" : ""}`}
                style={{ color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-[11px] font-medium text-muted-foreground"><time dateTime={event.date}>{formatDate(event.date)}</time></p>
                <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function RecentLeave({ leaves }) {
  const records = (leaves.data?.records || []).filter((record) => String(record.deleted) !== "1");
  return (
    <Card title="Leave requests" icon={Palmtree} action={<span className="text-xs text-muted-foreground">Newest first</span>}>
      {leaves.isPending ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading leave…</p>
      ) : leaves.isError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Leave requests could not be loaded.{" "}
          <button type="button" onClick={() => leaves.refetch()} className="font-semibold underline">Retry</button>
        </p>
      ) : !records.length ? (
        <p className="mt-4 text-sm text-muted-foreground">No leave requests yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {records.map((record) => {
            const [label, color] = LEAVE_STATUS[statusOf(record)];
            return (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{clean(record.type_of_leave) || "Leave"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(record.leave_from)}{record.leave_to && record.leave_to !== record.leave_from ? ` – ${formatDate(record.leave_to)}` : ""} · {clean(record.leave_days) || "—"} day{String(record.leave_days) === "1" ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color, backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)` }}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get("tab")) ? params.get("tab") : TABS[0][0];
  const openTab = (id) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (id === TABS[0][0]) next.delete("tab");
    else next.set("tab", id);
    return next;
  }, { replace: true });
  const query = useQuery({
    queryKey: ["employees", "detail", employeeId],
    queryFn: () => fetchEmployee(employeeId),
    enabled: Boolean(employeeId),
  });
  const leaves = useEmployeeLeaves({ employeeId });
  const record = query.data;

  const leaveStats = useMemo(() => {
    const year = String(new Date().getFullYear());
    const records = (leaves.data?.records || []).filter((item) => String(item.deleted) !== "1");
    return {
      takenThisYear: records
        .filter((item) => statusOf(item) === "Accepted" && dateKey(item.leave_from).startsWith(year))
        .reduce((total, item) => total + (Number(item.leave_days) || 0), 0),
      pending: records.filter((item) => statusOf(item) === "Applied").length,
    };
  }, [leaves.data]);

  if (query.isPending) {
    return (
      <main className={`flex min-h-full flex-1 items-center justify-center ${pageGutter}`}>
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Loading employee…</p>
      </main>
    );
  }
  if (query.isError) {
    return (
      <main className={`min-h-full space-y-4 ${pageGutter}`}>
        <Link to="/employees" className={linkButton}><ArrowLeft size={14} />Employees</Link>
        <div role="alert" className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <button type="button" onClick={() => query.refetch()} className="mt-3 text-sm font-semibold text-primary">Try again</button>
        </div>
      </main>
    );
  }

  const name = employeeName(record);
  const designation = clean(record.current_designation) || clean(record.title);
  const department = clean(record.department) || clean(record.hrc_departments_hrc_employees_1_name);
  const phone = clean(record.phone_mobile) || clean(record.phone_work);
  const doNotCall = clean(record.do_not_call) === "1";
  const linkedin = clean(record.linkedin_url);
  const time = tenure(record.joining_date);
  const departments = [...new Set((client.getQueryData(["employees", "list"]) || []).map((item) => clean(item.department)).filter(Boolean))].sort();

  return (
    <main className={`min-h-full space-y-5 ${pageGutter}`}>
      <Link to="/employees" className={linkButton}><ArrowLeft size={14} />Employees</Link>

      <header data-tour="employee-header" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <EmployeeAvatar name={name} size="xl" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Employee profile</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{name}</h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{designation || "No designation"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {department && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary"><Building2 size={12} />{department}</span>}
                {record.joining_date && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground"><CalendarDays size={12} />Joined {formatJoinDate(record.joining_date)}</span>}
                {doNotCall && <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive"><PhoneOff size={12} />Do not call</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {record.email1 && <a href={`mailto:${record.email1}`} className={linkButton}><Mail size={14} />Email</a>}
            {phone && !doNotCall && <a href={`tel:${phone}`} className={linkButton}><Phone size={14} />Call</a>}
            {linkedin && <a href={/^https?:\/\//.test(linkedin) ? linkedin : `https://${linkedin}`} target="_blank" rel="noreferrer" className={linkButton}><Linkedin size={14} />LinkedIn</a>}
            <button type="button" onClick={() => openTab("attendance")} className={linkButton}><CalendarCheck size={14} />Attendance</button>
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil size={14} />Edit profile</button>
          </div>
        </div>
      </header>

      <section aria-label="Employee summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Hourglass} label="Time with the company" value={time || "—"} hint={record.joining_date ? `Since ${formatJoinDate(record.joining_date)}` : "Joining date not set"} />
        <StatTile icon={Briefcase} label="Role" value={designation || "—"} hint={department || "No department"} color="var(--employee-blue)" />
        <StatTile icon={Palmtree} label="Leave taken this year" value={`${leaveStats.takenThisYear} day${leaveStats.takenThisYear === 1 ? "" : "s"}`} hint="Approved requests" color="var(--employee-green)" loading={leaves.isPending} />
        <StatTile icon={Clock3} label="Leave awaiting review" value={leaveStats.pending} hint="Pending requests" color="var(--employee-orange)" loading={leaves.isPending} onClick={() => navigate("/leave-approvals")} />
      </section>

      <Tabs.Root value={tab} onValueChange={openTab} className="space-y-5">
        <Tabs.List data-tour="employee-tabs" aria-label="Employee profile sections" className="hide-scrollbar flex gap-x-6 overflow-x-auto border-b border-border">
          {TABS.map(([id, label, icon]) => (
            <Tabs.Trigger key={id} value={id} className={tabTrigger}>
              {createElement(icon, { size: 15, "aria-hidden": true })}
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.filter(([, , , titles]) => titles.length).map(([id, , , titles]) => (
          <Tabs.Content key={id} value={id} className="grid grid-cols-1 items-start gap-5 outline-none md:grid-cols-2">
            {groups.filter(([title]) => titles.includes(title)).map(([title, icon, entries]) => (
              <Card key={title} title={title} icon={icon} className={entries.some(([, , type]) => type === "textarea") ? "md:col-span-2" : ""}>
                <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {entries.map(([key, label, type]) => (
                    <div key={key} className={type === "textarea" || key === "primary_address_street" ? "sm:col-span-2" : ""}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-sm font-medium text-foreground"><FieldValue field={key} value={clean(record[key])} /></dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </Tabs.Content>
        ))}
        <Tabs.Content value="attendance" className="outline-none">
          {record.email1 ? (
            <AttendanceProvider>
              <EmployeeAttendanceCalendar email={clean(record.email1)} employeeId={employeeId} />
            </AttendanceProvider>
          ) : (
            <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Add an email to this employee to see their attendance.</p>
          )}
        </Tabs.Content>
        <Tabs.Content value="leave" className="outline-none"><RecentLeave leaves={leaves} /></Tabs.Content>
        <Tabs.Content value="timeline" className="outline-none"><Timeline record={record} /></Tabs.Content>
      </Tabs.Root>

      {editing && (
        <EmployeeDetails
          key={`edit-${employeeId}`}
          selection={{ id: employeeId, edit: true }}
          departments={departments}
          onClose={() => setEditing(false)}
        />
      )}
    </main>
  );
}
