import { useId } from "react";
import { CalendarCheck, CalendarDays, ChevronDown, Clock3, Search } from "lucide-react";
import { DateRangeFilter } from "../../../../DateRangeFilter";

const DATE_MODES = [
  { id: "applied", label: "Applied date", icon: Clock3 },
  { id: "leave", label: "Leave dates", icon: CalendarDays },
  { id: "approved", label: "Approval date", icon: CalendarCheck },
];

export default function AdminLeaveFilters({ dateMode, onDateModeChange, range, defaultRange, onRangeChange, search, onSearchChange }) {
  const dateModeId = useId();
  const DateModeIcon = (DATE_MODES.find(({ id }) => id === dateMode) || DATE_MODES[0]).icon;
  return (
    <section className="relative z-20 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="font-semibold">Filter leave records</h2><p className="mt-0.5 text-xs text-muted-foreground">Dates apply to approved and rejected requests. Pending requests are always shown.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label htmlFor={dateModeId} className="sr-only">Filter dates by</label>
          <div className="relative">
            <DateModeIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <select id={dateModeId} value={dateMode} onChange={(event) => onDateModeChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-border bg-background pl-9 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-primary sm:w-48">
              {DATE_MODES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
          <DateRangeFilter fromDate={range.fromDate} fromTime={range.fromTime} toDate={range.toDate} toTime={range.toTime} filterActive onApply={onRangeChange} onReset={() => onRangeChange(defaultRange)} />
          <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search leave requests</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search employee or leave type" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary sm:w-64" /></label>
        </div>
      </div>
    </section>
  );
}
