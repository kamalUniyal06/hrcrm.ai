import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { useHrList } from "../../../queries/hr.queries";
import { normalizeHrList } from "../../../utils/hrRecords";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { QueryState } from "../org/orgUi";
import BookHr from "./BookHr";
import HrDesk from "./HrDesk";
import HrHours from "./HrHours";
import MyAppointments from "./MyAppointments";

/**
 * Book time with HR and manage your own bookings. HR people also get their desk (bookings with them)
 * and their hours; admins and roles with "all" on HR appointments see everyone's bookings.
 */
export default function HrAppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const access = useHrAccess();
  const hrQuery = useHrList();
  const hr = useMemo(() => normalizeHrList(hrQuery.data), [hrQuery.data]);
  const selfId = String(access.me.data?.employee?.id ?? "");
  // HR = takes bookings already, or has been given the HR availability area to set their hours.
  const isHr = Boolean(selfId) && (hr.people.some((person) => person.id === selfId) || access.hasArea("hrc_hr_availability"));
  const canPickHr = access.isAdmin || access.areaScope("hrc_hr_availability", "write") === "all";
  const seesAll = access.isAdmin || access.areaScope("hrc_hr_appointments") === "all";
  const tabs = [
    ["book", "Book HR"],
    ["mine", "My appointments"],
    ...(isHr ? [["desk", "As HR"]] : []),
    ...(seesAll ? [["all", "All bookings"]] : []),
    ...(isHr || canPickHr ? [["hours", isHr ? "My hours" : "HR hours"]] : []),
  ];
  const tab = tabs.some(([key]) => key === params.get("tab")) ? params.get("tab") : "book";
  const show = (next) => setParams(next === "book" ? {} : { tab: next }, { replace: true });

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={CalendarCheck}
        eyebrow="HR desk"
        title="HR appointments"
        description="Pick a topic and a time to talk to HR in person, on video or by phone."
      />

      <div role="tablist" aria-label="HR appointments" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1" data-tour="hr-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`hr-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`hr-panel-${key}`}
            onClick={() => show(key)}
            className={cn("min-h-10 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none", tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>

      <section role="tabpanel" id={`hr-panel-${tab}`} aria-labelledby={`hr-tab-${tab}`}>
        <QueryState query={hrQuery}>
          {tab === "desk" ? (
            <HrDesk view="as_hr" timeZone={hr.timeZone} />
          ) : tab === "all" ? (
            <HrDesk view="all" timeZone={hr.timeZone} />
          ) : tab === "hours" ? (
            <HrHours selfId={isHr ? selfId : ""} canPickHr={canPickHr} timeZone={hr.timeZone} />
          ) : tab === "mine" ? (
            <MyAppointments timeZone={hr.timeZone} />
          ) : (
            <BookHr hr={hr} onBooked={() => show("mine")} />
          )}
        </QueryState>
      </section>
    </main>
  );
}
