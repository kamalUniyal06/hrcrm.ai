import { PRESENCE_COLORS } from "../../employement/components/attendance/teamsPresenceUtils";
import { DAY_STATES, countDayStates } from "../../../utils/teamDay";

// Theme tokens, so the colours follow the selected theme. The label always carries the meaning.
const STATE_COLORS = {
  working: "var(--attendance-present)",
  lunch: "var(--attendance-late)",
  left: "var(--muted-foreground)",
  leave: "var(--attendance-leave)",
  notIn: "var(--attendance-absent)",
};

const SUMMARY = [
  ["working", "working"],
  ["lunch", "on lunch"],
  ["left", "left"],
  ["leave", "on leave"],
  ["notIn", "not in"],
];

/** One person's status today, for the right side of their row. */
export function DayStatus({ status }) {
  if (!status) return null;
  const extra = [status.detail, status.teams && `Teams: ${status.teams.label}${status.teams.since ? ` since ${status.teams.since}` : ""}`].filter(Boolean);
  return (
    <span className="flex max-w-[55%] shrink-0 flex-col items-end gap-0.5 text-right">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STATE_COLORS[status.state] }} aria-hidden="true" />
        {status.label}
        {status.late && <span className="font-medium text-muted-foreground">· Late</span>}
      </span>
      {extra.length > 0 && (
        <span className="flex max-w-full items-center gap-1 text-[11px] text-muted-foreground">
          {status.teams && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PRESENCE_COLORS[status.teams.bucket] }} aria-hidden="true" />}
          <span className="truncate">{extra.join(" · ")}</span>
        </span>
      )}
      {status.longLunch && <span className="text-[11px] font-medium text-foreground">Long lunch</span>}
    </span>
  );
}

/** "3 working · 1 on lunch · 1 not in · 2 late" for a group of people; nothing before the day loads. */
export function DaySummary({ people, statusOf, className }) {
  if (!statusOf) return null;
  const counts = countDayStates(people, statusOf);
  const parts = SUMMARY.filter(([key]) => counts[key]);
  if (!parts.length) return null;
  return (
    <ul className={className} aria-label="Today">
      {parts.map(([key, words]) => (
        <li key={key} className="inline-flex items-center gap-1.5" title={DAY_STATES[key]}>
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STATE_COLORS[key] }} aria-hidden="true" />
          <span><span className="font-semibold tabular-nums text-foreground">{counts[key]}</span> {words}</span>
        </li>
      ))}
      {counts.late > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <span><span className="font-semibold tabular-nums text-foreground">{counts.late}</span> came in late</span>
        </li>
      )}
    </ul>
  );
}
