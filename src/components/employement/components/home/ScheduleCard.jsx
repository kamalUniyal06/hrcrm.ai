import { createElement, useMemo, useState } from "react";
import he from "he";
import { Award, Cake, ChevronLeft, ChevronRight, Megaphone, Palmtree, PartyPopper } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { dateKey, parseActivityTime } from "../attendance/adminAttendanceUtils";
import { scheduleEventsForDay, shortDate } from "./homeDashboardUtils";

const EVENT_META = {
  holiday: { icon: PartyPopper, label: "Holiday", color: "var(--attendance-late)" },
  birthday: { icon: Cake, label: "Birthday", color: "var(--attendance-absent)" },
  anniversary: { icon: Award, label: "Anniversary", color: "var(--attendance-present)" },
  leave: { icon: Palmtree, label: "Leave", color: "var(--attendance-leave)" },
};
const STRIP = 5;
const UPCOMING_DAYS = 45;
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const decode = (value) => he.decode(String(value ?? ""));

function EventRow({ event, date }) {
  const meta = EVENT_META[event.type];
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ color: meta.color, backgroundColor: `color-mix(in oklab, ${meta.color} 12%, transparent)` }}
      >
        {createElement(meta.icon, { size: 15 })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
        <span className="block truncate text-sm font-semibold text-foreground">{decode(event.title)}</span>
        {event.type !== "birthday" && event.type !== "holiday" && (
          <span className="block truncate text-[11px] font-medium text-primary">{decode(event.detail)}</span>
        )}
      </span>
      {date && <span className="shrink-0 text-[11px] text-muted-foreground">{shortDate(date)}</span>}
    </li>
  );
}

/** Day strip with the events and company announcements around it. */
export default function ScheduleCard({ sources, announcements = [], loading, announcementsLoading }) {
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(today);
  const [tab, setTab] = useState("events");
  const selectedKey = dateKey(selected);
  const days = Array.from({ length: STRIP }, (_, index) => addDays(selected, index - Math.floor(STRIP / 2)));

  const eventsFor = useMemo(() => {
    const cache = new Map();
    return (key) => {
      if (!cache.has(key)) cache.set(key, scheduleEventsForDay(key, sources));
      return cache.get(key);
    };
  }, [sources]);

  const dayEvents = eventsFor(selectedKey);
  const upcoming = useMemo(() => {
    if (dayEvents.length) return [];
    const items = [];
    for (let offset = 1; offset <= UPCOMING_DAYS && items.length < 4; offset += 1) {
      const key = dateKey(addDays(selected, offset));
      for (const event of eventsFor(key)) items.push({ event, key });
    }
    return items.slice(0, 4);
  }, [dayEvents.length, eventsFor, selected]);

  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => (parseActivityTime(b.date_entered)?.stamp ?? 0) - (parseActivityTime(a.date_entered)?.stamp ?? 0)),
    [announcements],
  );

  const navButton = "flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Schedule</h2>
        {selectedKey !== dateKey(today) && (
          <button type="button" onClick={() => setSelected(today)} className="text-xs font-semibold text-primary hover:underline">
            Today
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2">
        <span className="text-sm font-semibold text-foreground">
          {selected.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
        <span className="flex gap-1">
          <button type="button" aria-label="Previous days" onClick={() => setSelected(addDays(selected, -STRIP))} className={navButton}><ChevronLeft size={14} /></button>
          <button type="button" aria-label="Next days" onClick={() => setSelected(addDays(selected, STRIP))} className={navButton}><ChevronRight size={14} /></button>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {days.map((day) => {
          const key = dateKey(day);
          const isSelected = key === selectedKey;
          const hasEvents = !loading && eventsFor(key).length > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(day)}
              aria-pressed={isSelected}
              aria-label={day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              className={`relative flex flex-col items-center rounded-xl py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"}`}
            >
              <span className="text-base font-semibold tabular-nums">{String(day.getDate()).padStart(2, "0")}</span>
              <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {day.toLocaleDateString("en-IN", { weekday: "short" })}
              </span>
              {hasEvents && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />}
            </button>
          );
        })}
      </div>

      <div role="tablist" className="mt-3 grid grid-cols-2 border-b border-border">
        {[["events", "Events"], ["announcements", "Announcements"]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 pb-2 text-xs font-semibold transition ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {value === "announcements" && announcements.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{announcements.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {tab === "events" ? (
          loading ? (
            <div className="space-y-2">{[0, 1, 2].map((index) => <Skeleton key={index} height={56} borderRadius={12} />)}</div>
          ) : dayEvents.length ? (
            <ul className="space-y-2">{dayEvents.map((event) => <EventRow key={event.id} event={event} />)}</ul>
          ) : (
            <>
              <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                Nothing scheduled for {shortDate(selectedKey)}.
              </p>
              {upcoming.length > 0 && (
                <>
                  <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coming up</p>
                  <ul className="space-y-2">{upcoming.map(({ event, key }) => <EventRow key={`${key}:${event.id}`} event={event} date={key} />)}</ul>
                </>
              )}
            </>
          )
        ) : announcementsLoading ? (
          <div className="space-y-2">{[0, 1].map((index) => <Skeleton key={index} height={64} borderRadius={12} />)}</div>
        ) : sortedAnnouncements.length ? (
          <ul className="space-y-2">
            {sortedAnnouncements.map((alert) => {
              const posted = parseActivityTime(alert.date_entered)?.date;
              return (
                <li key={alert.id} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Megaphone size={14} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{decode(alert.name)}</p>
                      {alert.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{decode(alert.description)}</p>}
                    </div>
                    {posted && <span className="shrink-0 text-[11px] text-muted-foreground">{shortDate(posted)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">No announcements right now.</p>
        )}
      </div>
    </section>
  );
}
