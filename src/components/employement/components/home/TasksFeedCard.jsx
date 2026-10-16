import { createElement, useState } from "react";
import { Check, Coffee, LogIn, LogOut, Megaphone, Palmtree, X } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { feedDayLabel } from "./homeDashboardUtils";

// Placeholder tasks until the task module is connected.
const SAMPLE_TASKS = [
  { id: 1, owner: "Riya Sharma", email: "riya.sharma@outrightcrm.com", task: "Add components to design system update", priority: "Medium", date: "Oct 16, 2026", status: "To Do" },
  { id: 2, owner: "Aman Verma", email: "aman.verma@outrightcrm.com", task: "HR management dashboard — new add flow", priority: "High", date: "Oct 17, 2026", status: "In Progress" },
  { id: 3, owner: "Neha Gupta", email: "neha.gupta@outrightcrm.com", task: "Fix Figma comments on shared post designs", priority: "Low", date: "Oct 20, 2026", status: "To Do" },
  { id: 4, owner: "Kunal Mehta", email: "kunal.mehta@outrightcrm.com", task: "Review onboarding checklist for new joiners", priority: "High", date: "Oct 22, 2026", status: "Done" },
];

const PRIORITY_COLOR = { High: "var(--attendance-absent)", Medium: "var(--attendance-late)", Low: "var(--attendance-leave)" };
const STATUS_COLOR = { "To Do": "var(--muted-foreground)", "In Progress": "var(--attendance-present)", Done: "var(--primary)" };

const FEED_META = {
  checkin: { icon: LogIn, color: "var(--attendance-present)" },
  lunch: { icon: Coffee, color: "var(--attendance-late)" },
  checkout: { icon: LogOut, color: "var(--primary)" },
  leave: { icon: Palmtree, color: "var(--attendance-leave)" },
  leaveApproved: { icon: Check, color: "var(--attendance-present)" },
  leaveRejected: { icon: X, color: "var(--attendance-absent)" },
  announcement: { icon: Megaphone, color: "var(--primary)" },
};

const initials = (name) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function TaskTable() {
  const [done, setDone] = useState(() => new Set(SAMPLE_TASKS.filter((task) => task.status === "Done").map((task) => task.id)));
  const toggle = (id) => setDone((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-[11px] font-medium text-muted-foreground">
            <th className="w-8 rounded-l-lg bg-muted px-3 py-2" aria-label="Completed" />
            <th className="bg-muted px-3 py-2 font-medium">Name</th>
            <th className="bg-muted px-3 py-2 font-medium">Task</th>
            <th className="bg-muted px-3 py-2 font-medium">Priority</th>
            <th className="bg-muted px-3 py-2 font-medium">Date</th>
            <th className="rounded-r-lg bg-muted px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_TASKS.map((task) => {
            const isDone = done.has(task.id);
            const status = isDone ? "Done" : task.status === "Done" ? "To Do" : task.status;
            return (
              <tr key={task.id} className="border-b border-border last:border-0">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={isDone} onChange={() => toggle(task.id)} aria-label={`Mark "${task.task}" as done`} className="h-4 w-4 rounded accent-[var(--primary)]" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{initials(task.owner)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">{task.owner}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{task.email}</span>
                    </span>
                  </div>
                </td>
                <td className={`max-w-[240px] px-3 py-3 text-xs ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.task}</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold" style={{ color: PRIORITY_COLOR[task.priority] }}>{task.priority}</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{task.date}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Feed({ items, loading, error, today }) {
  if (loading) return <div className="space-y-2">{[0, 1, 2, 3].map((index) => <Skeleton key={index} height={44} borderRadius={12} />)}</div>;
  if (error) return <p className="py-6 text-center text-sm text-destructive">Couldn&apos;t load your feed.</p>;
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">No recent activity yet.</p>;
  return (
    <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-border">
      {items.map((item) => {
        const meta = FEED_META[item.type] || FEED_META.announcement;
        return (
          <li key={item.id} className="relative flex items-center gap-3 rounded-xl px-0 py-1.5">
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card"
              style={{ color: meta.color, backgroundColor: `color-mix(in oklab, ${meta.color} 14%, var(--card))` }}
            >
              {createElement(meta.icon, { size: 14 })}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
              {item.detail && <span className="block truncate text-[11px] text-muted-foreground">{item.detail}</span>}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{feedDayLabel(item.at, today)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TasksFeedCard({ feed = [], feedLoading, feedError, today }) {
  const [tab, setTab] = useState("tasks");
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-xl bg-muted p-1">
          {[["tasks", "Upcoming Tasks"], ["feed", "Feed"]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "tasks" && (
          <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sample data
          </span>
        )}
      </div>
      <div className="mt-4">
        {tab === "tasks" ? <TaskTable /> : <Feed items={feed} loading={feedLoading} error={feedError} today={today} />}
      </div>
    </section>
  );
}
