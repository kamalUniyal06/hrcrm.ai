import { useMemo, useState } from "react";
import { CalendarDays, Info, Palmtree, Search, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeavesBetween } from "../../employement/queries/leaves.queries";
import { formatDate } from "../../employement/components/leave/admin/leaveAdminUtils";
import { dateKey } from "../../employement/components/attendance/adminAttendanceUtils";
import { SCOPE_LABELS, SCOPE_RANK } from "../../../utils/hrAccess";
import { personName, personTitle } from "../../../utils/hrOrg";
import { LEAVE_STATUS_LABELS, teamLeaves } from "../../../utils/teamLeaves";
import { candidateStyles } from "../candidate/candidateStyles";
import { EmptyState, PersonAvatar, QueryState, Segmented } from "../org/orgUi";
import TeamBalancesTable from "./TeamBalancesTable";
import useMyTeams from "./useMyTeams";

// History goes back a year; upcoming leaves are looked for up to a year ahead.
const shift = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
};

// Theme tokens; the status text always carries the meaning.
const STATUS_COLORS = { Applied: "var(--attendance-late)", Accepted: "var(--attendance-present)", Rejected: "var(--attendance-absent)" };

// The scope chosen on a list, kept only while it is still one of the options.
const pick = (wanted, options) => (options.some((option) => option.id === wanted) ? wanted : options.at(-1)?.id);

const dayCount = (days) => (days === null ? "" : `${days} ${days === 1 ? "day" : "days"}`);

function dates(row) {
  if (row.from === row.to) return formatDate(row.from);
  const sameYear = row.from.slice(0, 4) === row.to.slice(0, 4);
  return `${formatDate(row.from, sameYear ? { day: "numeric", month: "short" } : undefined)} – ${formatDate(row.to)}`;
}

function LeaveRow({ row, onOpenPerson }) {
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 px-3 py-3 sm:flex-nowrap">
      <button
        type="button"
        onClick={() => onOpenPerson(row.person)}
        className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-56 sm:shrink-0"
      >
        <PersonAvatar person={row.person} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{personName(row.person)}</span>
          {personTitle(row.person) && <span className="block truncate text-xs text-muted-foreground">{personTitle(row.person)}</span>}
        </span>
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-foreground">
          {dates(row)}
          {row.current && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 align-middle text-[11px] font-semibold text-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--attendance-leave)" }} aria-hidden="true" />
              On leave now
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{[row.type, dayCount(row.days), row.appliedOn && `Applied ${formatDate(row.appliedOn)}`].filter(Boolean).join(" · ")}</p>
        {row.reason && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.reason}</p>}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] }} aria-hidden="true" />
        {LEAVE_STATUS_LABELS[row.status]}
      </span>
    </li>
  );
}

/**
 * Leaves of the people on the user's team cards: upcoming (applied or approved) and the past year,
 * with a switch to everyone's leave balances.
 */
export default function TeamLeavesPanel({ me, directReports, hasReports, leaveScope, balanceScopes, startOnBalances = false, onOpenPerson }) {
  const [showBalances, setShowBalances] = useState(startOnBalances);
  const [wantedScope, setWantedScope] = useState(null);
  const [view, setView] = useState("upcoming");
  const [search, setSearch] = useState("");
  const teams = useMyTeams({ me, directReports, hasReports });
  const today = dateKey(new Date());
  const leaves = useLeavesBetween({ from: shift(-365), to: shift(366), enabled: !showBalances });
  const lists = useMemo(() => teamLeaves(leaves.data ?? [], teams.people, today), [leaves.data, teams.people, today]);
  const term = search.trim().toLowerCase();
  const rows = lists[view].filter((row) => !term || `${personName(row.person)} ${personTitle(row.person)} ${row.type}`.toLowerCase().includes(term));
  const waiting = lists.upcoming.filter((row) => row.status === "Applied").length;
  const query = { ...leaves, isPending: leaves.isPending || teams.query.isPending, isError: leaves.isError || teams.query.isError, error: leaves.error || teams.query.error, refetch: () => (leaves.isError ? leaves.refetch() : teams.query.refetch()) };
  const scope = pick(wantedScope, balanceScopes);
  // Leaves come back only for people inside the role's leave read scope. Below "My reportees" that
  // leaves out the people under a manager who aren't in a team with them, so say so instead of
  // letting an empty list read as "nobody is on leave".
  const hidden = SCOPE_RANK[leaveScope] < SCOPE_RANK.reports && teams.teams.some((team) => team.role === "under" || team.role === "unplaced");

  const toggle = (
    <button type="button" onClick={() => setShowBalances((value) => !value)} className={cn(candidateStyles.ghost, "min-h-11")}>
      {showBalances ? <CalendarDays size={16} aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />}
      {showBalances ? "Show leaves" : "Show balances"}
    </button>
  );

  if (showBalances) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {toggle}
          {balanceScopes.length > 1 && (
            <Segmented label="Whose balances" options={balanceScopes.map((option) => [option.id, option.label])} value={scope} onChange={setWantedScope} />
          )}
        </div>
        <TeamBalancesTable scope={scope} onOpenPerson={onOpenPerson} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Which leaves"
          options={[["upcoming", `Upcoming (${lists.upcoming.length})`], ["history", `History (${lists.history.length})`]]}
          value={view}
          onChange={setView}
        />
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search leaves</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or leave type"
            className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
        <div className="sm:ml-auto">{toggle}</div>
      </div>

      {hidden && (
        <p role="note" className={cn(candidateStyles.card, "flex items-start gap-3 px-4 py-3 text-sm text-muted-foreground")}>
          <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Your access role reads leave for &quot;{SCOPE_LABELS[leaveScope]}&quot; only, so leave of people under you who aren&apos;t in a team with you isn&apos;t listed. HR can change your role&apos;s Leaves access to &quot;{SCOPE_LABELS.reports}&quot;.
          </span>
        </p>
      )}

      <QueryState query={query} rows={5}>
        {view === "upcoming" && waiting > 0 && (
          <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
            <span className="font-semibold tabular-nums text-foreground">{waiting}</span> {waiting === 1 ? "request is" : "requests are"} waiting for approval.
          </p>
        )}
        {rows.length ? (
          <ul className={cn(candidateStyles.card, "divide-y divide-border")} data-tour="team-leaves">
            {rows.map((row) => <LeaveRow key={row.id} row={row} onOpenPerson={onOpenPerson} />)}
          </ul>
        ) : (
          <EmptyState icon={Palmtree} title={term ? "Nothing matches that search" : view === "upcoming" ? "No upcoming leave" : "No leave in the past year"}>
            {term ? "Try a different name or leave type." : view === "upcoming" ? "When someone in your teams applies for leave, or it's approved, it shows here." : "Leave your teams took or were refused in the last 12 months shows here."}
          </EmptyState>
        )}
      </QueryState>
    </div>
  );
}
