import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
import { useTeamsTimeline } from "../../../../queries/teamsPresence.queries";
import { formatMinutes } from "./adminAttendanceUtils";
import {
  PRESENCE_COLORS,
  istMinutes,
  presenceBucket,
  presenceStatus,
  teamsClock,
  timelineWindow,
} from "./teamsPresenceUtils";

const minutes = value => formatMinutes(Number(value) || 0);
const NO_ACCESS = "Teams activity is hidden for your role. An admin can grant read access to the Teams Activity module.";
const LEGEND = [
  ["available", "Available"],
  ["busy", "Busy"],
  ["away", "Away"],
  ["offline", "Offline"],
  ["untracked", "Not tracked"],
];

function Dot({ bucket }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRESENCE_COLORS[bucket] }} />;
}

// Offline is drawn faint and collector gaps hatched, so neither reads as a status the employee chose.
const periodStyle = bucket =>
  bucket === "untracked"
    ? { backgroundImage: "repeating-linear-gradient(45deg, var(--border) 0 4px, transparent 4px 8px)" }
    : bucket === "offline"
      ? { backgroundColor: "color-mix(in oklab, var(--muted-foreground) 22%, transparent)" }
      : { backgroundColor: PRESENCE_COLORS[bucket] };

/** One attendance row's Teams presence: live status today, online hours on past days. */
export function TeamsCell({ record, live, state }) {
  if (!record) {
    return (
      <span className="text-xs text-muted-foreground">
        {state === "loading" ? "Loading…" : state === "error" ? "—" : "Not on Teams"}
      </span>
    );
  }
  const since = teamsClock(record.status_since);
  return (
    <div className="min-w-44 text-xs">
      {live ? (
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Dot bucket={presenceBucket(record.availability)} />
          <span className="truncate">{presenceStatus(record)}</span>
          {since && <span className="shrink-0 font-normal text-muted-foreground">· since {since}</span>}
        </p>
      ) : (
        <p className="font-medium text-foreground">
          {record.first_online_at ? `${teamsClock(record.first_online_at)} – ${teamsClock(record.last_online_at)}` : "Not online"}
        </p>
      )}
      <p className="mt-1 text-muted-foreground">
        Active {minutes(record.active_minutes)} · Online {minutes(record.online_minutes)}
      </p>
    </div>
  );
}

/** Teams status line above the attendance table: who is on Teams now, data freshness and access. */
export function TeamsSummary({ query, live }) {
  if (query.isPending) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={13} className="animate-spin" />
        Loading Teams activity…
      </p>
    );
  }
  if (query.isError) {
    return (
      <p role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Info size={14} className="shrink-0" />
        {query.error?.status === 403 ? NO_ACCESS : `Couldn't load Teams activity. ${query.error?.message || ""}`}
        {query.error?.status !== 403 && (
          <button type="button" onClick={() => query.refetch()} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <RefreshCw size={12} />
            Retry
          </button>
        )}
      </p>
    );
  }
  const { counts, collector, employees = [] } = query.data;
  if (!live) {
    const active = employees.filter(record => Number(record.online_minutes) > 0).length;
    return (
      <p className="text-xs text-muted-foreground">
        Teams: <span className="font-semibold text-foreground">{active}</span> employees were online this day.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">Teams now</span>
      {LEGEND.slice(0, 4).map(([bucket, label]) => (
        <span key={bucket} className="inline-flex items-center gap-1.5">
          <Dot bucket={bucket} />
          <span className="font-semibold tabular-nums text-foreground">{counts?.[bucket] ?? 0}</span>
          {label.toLowerCase()}
        </span>
      ))}
      {collector && collector.employees_matched < collector.employees_total && (
        <span title="Employees whose email1 doesn't match a Microsoft account aren't tracked.">
          {collector.employees_matched} of {collector.employees_total} employees linked to Teams
        </span>
      )}
      {collector?.stale && (
        <span role="alert" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium" style={{ color: "var(--attendance-late)", backgroundColor: "color-mix(in oklab, var(--attendance-late) 12%, transparent)" }}>
          <AlertTriangle size={12} />
          Teams data delayed{collector.last_success_at ? ` · last update ${teamsClock(collector.last_success_at)}` : ""}
        </span>
      )}
    </div>
  );
}

/** Teams totals and a status bar for one employee's day, shown in the day report. */
export function TeamsActivityPanel({ employeeId, date, live }) {
  const query = useTeamsTimeline(employeeId, date, { live });
  const totals = query.data?.totals;
  const periods = query.data?.periods || [];
  const { start, end } = timelineWindow(periods, date);
  const span = end - start;
  const step = span > 12 * 60 ? 180 : 120;
  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, index) => start + index * step);
  const left = value => `${((Math.min(Math.max(value, start), end) - start) / span) * 100}%`;

  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground">Microsoft Teams</h3>
      <p className="text-xs text-muted-foreground">Presence for this day, updated every minute.</p>
      {query.isPending ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" />Loading Teams activity…</p>
      ) : query.isError ? (
        <p className="mt-3 text-xs text-muted-foreground">{query.error?.status === 403 ? NO_ACCESS : query.error?.message}</p>
      ) : !totals ? (
        <p className="mt-3 text-xs text-muted-foreground">No Teams activity recorded for this day.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Active", minutes(totals.active_minutes)],
              ["Online", minutes(totals.online_minutes)],
              ["Away", minutes(totals.away_minutes)],
              ["First – last online", totals.first_online_at ? `${teamsClock(totals.first_online_at)} – ${teamsClock(totals.last_online_at)}` : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {periods.length > 0 && (
            <div className="mt-4">
              <div className="relative h-4 text-[10px] text-muted-foreground" aria-hidden="true">
                {ticks.map(tick => (
                  <span key={tick} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: left(tick) }}>
                    {String(Math.floor(tick / 60) % 24).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              <div
                role="img"
                aria-label={`Teams status from ${teamsClock(periods[0].started_at)} to ${teamsClock(periods.at(-1).ended_at)}`}
                className="relative mt-1 h-5 overflow-hidden rounded-md bg-muted"
              >
                {periods.map((period, index) => {
                  const bucket = period.bucket || presenceBucket(period.availability);
                  const from = istMinutes(period.started_at, date);
                  const to = istMinutes(period.ended_at, date);
                  return (
                    <div
                      key={index}
                      title={`${presenceStatus(period)}: ${teamsClock(period.started_at)} – ${period.is_open ? "now" : teamsClock(period.ended_at)} (${minutes(period.minutes)})`}
                      className="absolute inset-y-0"
                      style={{ left: left(from), width: `calc(${left(to)} - ${left(from)})`, ...periodStyle(bucket) }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {LEGEND.map(([bucket, label]) => (
                  <span key={bucket} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm border border-border" style={periodStyle(bucket)} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
