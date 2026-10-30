import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, CalendarX2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeleteHoliday, useHolidays, useSaveHoliday } from "../../../queries/holidays.queries";
import { dateKey, todayInIndia } from "../../employement/components/leave/leaveCalendarUtils";
import { CandidatePageHeader } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, EmptyState, QueryState, Segmented, fieldClass, primaryButton } from "../org/orgUi";
import { formatHolidayDate, holidayProblems, holidayYears } from "./holidayUtils";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const isWeekend = (key) => [0, 6].includes(new Date(`${key}T00:00:00`).getDay());

/** Adds a holiday (`holiday` without an id) or edits one. */
function HolidayForm({ holiday, holidays, onClose }) {
  const save = useSaveHoliday();
  const [values, setValues] = useState({ id: holiday.id, name: holiday.name ?? "", date: holiday.date ?? "", description: holiday.description ?? "" });
  const [submitted, setSubmitted] = useState(false);
  const problems = holidayProblems(values, holidays);
  const show = (field) => submitted && problems[field];
  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(problems).length) return;
    save.mutate(values, {
      onSuccess: () => {
        toast.success(values.id ? `${values.name.trim()} updated` : `${values.name.trim()} added`);
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <ActionDialog
      open
      onClose={onClose}
      title={values.id ? "Edit holiday" : "Add a holiday"}
      description="Everyone sees public holidays on their leave and attendance calendars, and leave isn't counted on them."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="holiday-name" className="text-sm font-semibold text-foreground">Name</label>
          <input id="holiday-name" value={values.name} onChange={set("name")} maxLength={255} placeholder="e.g. Diwali" aria-invalid={Boolean(show("name"))} aria-describedby={show("name") ? "holiday-name-error" : undefined} className={fieldClass} />
          {show("name") && <p id="holiday-name-error" className="mt-1 text-xs font-medium text-destructive">{problems.name}</p>}
        </div>
        <div>
          <label htmlFor="holiday-date" className="text-sm font-semibold text-foreground">Date</label>
          <input id="holiday-date" type="date" value={values.date} onChange={set("date")} aria-invalid={Boolean(show("date"))} aria-describedby={show("date") ? "holiday-date-error" : undefined} className={fieldClass} />
          {show("date") ? (
            <p id="holiday-date-error" className="mt-1 text-xs font-medium text-destructive">{problems.date}</p>
          ) : values.date && (
            <p className="mt-1 text-xs text-muted-foreground">{formatHolidayDate(values.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{isWeekend(values.date) ? " · falls on a weekend" : ""}</p>
          )}
        </div>
        <div>
          <label htmlFor="holiday-description" className="text-sm font-semibold text-foreground">Note <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="holiday-description" rows={3} value={values.description} onChange={set("description")} placeholder="e.g. Estimated date, confirm closer to the day." className={cn(fieldClass, "py-2")} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
          <button type="submit" disabled={save.isPending} className={primaryButton}>{save.isPending ? "Saving…" : values.id ? "Save changes" : "Add holiday"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}

function DeleteHoliday({ holiday, onClose }) {
  const remove = useDeleteHoliday();
  const name = holiday.name || "this holiday";
  const confirm = () =>
    remove.mutate(holiday.id, {
      onSuccess: () => {
        toast.success(`${name} deleted`);
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  return (
    <ActionDialog open onClose={onClose} title={`Delete ${name}?`} description="It comes off everyone's leave and attendance calendars. This can't be undone here.">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={candidateStyles.ghost}>Cancel</button>
        <button type="button" onClick={confirm} disabled={remove.isPending} className={cn(primaryButton, "bg-destructive text-white")}>
          <Trash2 size={15} aria-hidden="true" /> {remove.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </ActionDialog>
  );
}

function HolidayRow({ holiday, today, onEdit, onDelete }) {
  const past = holiday.date && holiday.date < today;
  const day = holiday.date ? Number(holiday.date.slice(8, 10)) : null;
  return (
    <li className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", past && "opacity-60")}>
      {holiday.date ? (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-center text-primary" aria-hidden="true">
          <span className="leading-none">
            <span className="block text-lg font-semibold tabular-nums">{day}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide">{formatHolidayDate(holiday.date, { month: "short" })}</span>
          </span>
        </span>
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive" aria-hidden="true"><CalendarX2 size={20} /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{holiday.name || <span className="text-muted-foreground">Unnamed holiday</span>}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{holiday.date ? formatHolidayDate(holiday.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "No date set"}</span>
          {holiday.date === today && <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">Today</span>}
          {past && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Past</span>}
          {holiday.date && isWeekend(holiday.date) && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Weekend</span>}
        </p>
        {holiday.description && <p className="mt-1 line-clamp-2 text-xs text-foreground/80">{holiday.description}</p>}
      </div>
      <div className="flex shrink-0 items-center">
        <button type="button" onClick={() => onEdit(holiday)} aria-label={`Edit ${holiday.name || "unnamed holiday"}`} className={candidateStyles.iconButton}><Pencil size={16} aria-hidden="true" /></button>
        <button type="button" onClick={() => onDelete(holiday)} aria-label={`Delete ${holiday.name || "unnamed holiday"}`} className={cn(candidateStyles.iconButton, "hover:text-destructive")}><Trash2 size={16} aria-hidden="true" /></button>
      </div>
    </li>
  );
}

/** Admins: add, edit and delete the public holidays everyone's leave and attendance calendars use. */
export default function HolidaysPage() {
  const query = useHolidays();
  const holidays = useMemo(() => query.data ?? [], [query.data]);
  const today = dateKey(todayInIndia());
  const thisYear = today.slice(0, 4);
  const years = useMemo(() => holidayYears(holidays), [holidays]);
  const [wantedYear, setYear] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const year = wantedYear ?? (years.includes(thisYear) ? thisYear : "all");

  const term = search.trim().toLowerCase();
  const undated = holidays.filter((holiday) => !holiday.date);
  const shown = holidays.filter((holiday) =>
    holiday.date && (year === "all" || holiday.date.startsWith(year)) && (!term || `${holiday.name} ${holiday.description}`.toLowerCase().includes(term)));
  const months = useMemo(() => {
    const groups = new Map();
    for (const holiday of shown) {
      const key = holiday.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(holiday);
    }
    return [...groups.entries()];
  }, [shown]);

  const upcoming = holidays.filter((holiday) => holiday.date && holiday.date >= today);
  const next = upcoming[0];
  const stats = [
    [`Holidays in ${thisYear}`, holidays.filter((holiday) => holiday.date.startsWith(thisYear)).length.toLocaleString()],
    ["Still to come", upcoming.length.toLocaleString()],
    ["Next holiday", next ? `${next.name || "Unnamed"} · ${formatHolidayDate(next.date, { day: "numeric", month: "short" })}` : "None scheduled"],
  ];

  return (
    <main className={candidateStyles.page}>
      <CandidatePageHeader
        icon={CalendarDays}
        eyebrow="Leave & attendance"
        title="Public holidays"
        description="The days off everyone gets. They show on every leave and attendance calendar, and leave isn't counted on them."
      >
        <button type="button" onClick={() => setEditing({})} className={primaryButton} data-tour="holiday-add">
          <Plus size={16} aria-hidden="true" /> Add holiday
        </button>
      </CandidatePageHeader>

      <QueryState query={query} rows={6}>
        <dl className="grid gap-3 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className={cn(candidateStyles.card, "min-w-0 px-4 py-3")}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        {undated.length > 0 && (
          <section aria-labelledby="holidays-undated" className={cn(candidateStyles.card, "border-destructive/30")}>
            <div className="px-4 pt-3">
              <h2 id="holidays-undated" className="text-sm font-semibold text-destructive">{plural(undated.length, "holiday")} without a date</h2>
              <p className="text-xs text-muted-foreground">They don't show on any calendar. Add a date or delete them.</p>
            </div>
            <ul className="divide-y divide-border">
              {undated.map((holiday) => <HolidayRow key={holiday.id} holiday={holiday} today={today} onEdit={setEditing} onDelete={setDeleting} />)}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Year" options={[...years.map((item) => [item, item]), ["all", "All years"]]} value={year} onChange={setYear} />
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Search holidays</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or note"
              className="min-h-11 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>
        </div>

        {months.length ? (
          <div className="space-y-4" data-tour="holiday-list">
            <p className="text-xs text-muted-foreground" aria-live="polite">{plural(shown.length, "holiday")}</p>
            {months.map(([month, items]) => (
              <section key={month} aria-label={formatHolidayDate(`${month}-01`, { month: "long", year: "numeric" })} className={candidateStyles.card}>
                <h2 className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {formatHolidayDate(`${month}-01`, { month: "long", year: "numeric" })}
                </h2>
                <ul className="divide-y divide-border">
                  {items.map((holiday) => <HolidayRow key={holiday.id} holiday={holiday} today={today} onEdit={setEditing} onDelete={setDeleting} />)}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title={term ? "No holiday matches that search" : year === "all" ? "No holidays yet" : `No holidays in ${year} yet`}>
            {term ? "Try a different name." : "Add the public holidays for the year so they show on everyone's calendar."}
          </EmptyState>
        )}
      </QueryState>

      {editing && <HolidayForm holiday={editing} holidays={holidays} onClose={() => setEditing(null)} />}
      {deleting && <DeleteHoliday holiday={deleting} onClose={() => setDeleting(null)} />}
    </main>
  );
}
