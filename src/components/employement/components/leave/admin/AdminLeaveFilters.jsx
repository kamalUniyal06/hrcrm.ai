import { CalendarCheck, CalendarDays, Clock3, Search } from "lucide-react";
import { DateRangeFilter } from "../../../../DateRangeFilter";

const DATE_MODES = [
  { id: "leave", label: "Leave dates" },
  { id: "applied", label: "Applied date" },
  { id: "approved", label: "Approval date" },
];

export default function AdminLeaveFilters({ dateMode, onDateModeChange, range, defaultRange, onRangeChange, search, onSearchChange }) {
  return (
    <section className="relative z-20 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="font-semibold">Filter leave records</h2><p className="mt-0.5 text-xs text-muted-foreground">Select the date meaning, then choose any exact range.</p></div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1">{DATE_MODES.map(({ id, label }) => <button key={id} type="button" onClick={() => onDateModeChange(id)} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${dateMode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{id === "leave" ? <CalendarDays size={14} /> : id === "applied" ? <Clock3 size={14} /> : <CalendarCheck size={14} />}<span className="hidden sm:inline">{label}</span></button>)}</div>
          <DateRangeFilter fromDate={range.fromDate} fromTime={range.fromTime} toDate={range.toDate} toTime={range.toTime} filterActive onApply={onRangeChange} onReset={() => onRangeChange(defaultRange)} />
          <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search leave requests</span><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search employee or leave type" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary sm:w-64" /></label>
        </div>
      </div>
    </section>
  );
}
