import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, BadgeIndianRupee, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, ClipboardList, Clock3, FileQuestion, Hourglass, Inbox, ListChecks, Loader2, MessageSquareText,
  Pencil, Plus, RefreshCw, Search, Sparkles, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  fetchAdminQuestions, fetchAdminReplies, fetchAdminRequest, fetchAdminRequests,
  fetchIncrementSchema, saveAdminQuestion,
} from "../api/incrementAdmin.api";
import {
  answerProgress, clean, filterRequestRows, gatewayError, groupAnswers, questionText,
  requestIdentity, requestOverview, requestedAnnualSalary,
} from "../api/incrementAdminData";

const ROOT_KEY = ["increment-admin"];
const PAGE_SIZE = 20;
const inputClass = "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:opacity-60";
const amountFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const money = (value) => value === null ? "Not recorded" : amountFormat.format(value);

const AVATAR_PALETTES = [
  "from-sky-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-600",
];

function dateText(value) {
  const text = clean(value);
  if (!text) return "Not recorded";
  // Full gateway records are already formatted in the CRM user's timezone.
  return text;
}

function initialsOf(identity) {
  const source = identity.name.includes("@") ? identity.name.split("@")[0] : identity.name;
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

function paletteOf(seed) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function Avatar({ identity, size = "md" }) {
  const sizing = size === "lg" ? "size-16 rounded-2xl text-xl" : "size-10 rounded-xl text-sm";
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-linear-to-br font-semibold tracking-wide text-white shadow-md shadow-black/10 ring-2 ring-card ${paletteOf(identity.email || identity.name)} ${sizing}`}>{initialsOf(identity)}</span>;
}

function ErrorMessage({ error, onRetry }) {
  return <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10"><CircleAlert size={17} aria-hidden="true" /></span>
    <div className="min-w-0 flex-1 pt-1"><p className="break-words">{gatewayError(error)}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Try again</button>}</div>
  </div>;
}

function Skeleton({ rows = 5 }) {
  return <div role="status" className="space-y-3 p-5 motion-safe:animate-pulse sm:p-6">
    <span className="sr-only">Loading increment records</span>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
      <div className="size-10 shrink-0 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2"><div className="h-3.5 w-2/5 rounded-full bg-muted" /><div className="h-3 w-1/4 rounded-full bg-muted/70" /></div>
      <div className="hidden h-6 w-24 rounded-full bg-muted sm:block" />
      <div className="h-8 w-20 rounded-lg bg-muted/70" />
    </div>)}
  </div>;
}

function EmptyState({ icon, title, children, action }) {
  const Icon = icon;
  return <div className="flex flex-col items-center px-6 py-16 text-center">
    <div className="relative mb-5">
      <div aria-hidden="true" className="absolute inset-0 -m-3 rounded-full bg-primary/5" />
      <div className="relative grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"><Icon size={26} aria-hidden="true" /></div>
    </div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

function ProgressBadge({ progress }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${progress.complete ? "bg-(--employee-green-soft) text-(--employee-green) ring-(--employee-green)/20" : progress.answered ? "bg-primary/8 text-primary ring-primary/15" : "bg-muted text-muted-foreground ring-border"}`}>
    {progress.complete ? <CheckCircle2 size={13} aria-hidden="true" /> : <MessageSquareText size={13} aria-hidden="true" />}
    {progress.total ? `${progress.answered}/${progress.total} answered` : "No questions"}
  </span>;
}

function ProgressMeter({ progress }) {
  const percent = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0;
  return <div className="flex items-center gap-3">
    <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className={`block h-full rounded-full transition-[width] duration-500 ${progress.complete ? "bg-(--employee-green)" : "bg-primary"}`} style={{ width: `${percent}%` }} /></span>
    <ProgressBadge progress={progress} />
  </div>;
}

function ProgressRing({ progress }) {
  const percent = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0;
  const color = progress.complete ? "var(--employee-green)" : "var(--primary)";
  return <div className="flex items-center gap-3">
    <span role="img" aria-label={`${percent}% of the questionnaire answered`} className="grid size-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${percent}%, var(--muted) 0)` }}>
      <span className="grid size-11 place-items-center rounded-full bg-card text-xs font-semibold tabular-nums text-foreground">{percent}%</span>
    </span>
    <div><p className="text-sm font-medium text-foreground">{progress.total ? `${progress.answered} of ${progress.total} answered` : "No questions configured"}</p><p className="mt-0.5 text-xs text-muted-foreground">{progress.complete ? "Questionnaire complete" : progress.answered ? "Partially answered" : "Awaiting responses"}</p></div>
  </div>;
}

const STAT_TONES = {
  primary: "bg-primary/10 text-primary",
  green: "bg-(--employee-green-soft) text-(--employee-green)",
  orange: "bg-(--employee-orange)/10 text-(--employee-orange)",
  neutral: "bg-muted text-muted-foreground",
};

function StatTile({ icon, label, value, hint, tone = "neutral", onClick, selected, disabled }) {
  const Icon = icon;
  return <button type="button" onClick={onClick} aria-pressed={selected} disabled={disabled} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left shadow-xs transition-[border-color,background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/15" : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"}`}>
    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${STAT_TONES[tone]}`}><Icon size={20} aria-hidden="true" /></span>
    <div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>{hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}</div>
  </button>;
}

function SectionCard({ children, label, className = "" }) {
  return <section aria-label={label} className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.03] ${className}`}>{children}</section>;
}

function RequestList({ questions, onSelect, onQuestions }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [completion, setCompletion] = useState("all");
  const invalidRange = from && to && from > to;

  useEffect(() => {
    const timeout = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useQuery({
    queryKey: [...ROOT_KEY, "request-collection", { search: debouncedSearch, from, to }],
    queryFn: () => fetchAdminRequests({ search: debouncedSearch, from, to }),
    enabled: !invalidRange,
  });
  const overview = useMemo(() => requestOverview(query.data?.records || [], questions, query.data?.replies || []), [query.data, questions]);
  const visibleRows = filterRequestRows(overview.rows, completion);
  const total = visibleRows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasSearchFilters = Boolean(search || from || to);
  const hasFilters = hasSearchFilters || completion !== "all";
  const hasData = Boolean(query.data) && !invalidRange && !query.isError;
  const clearFilters = () => { setSearch(""); setDebouncedSearch(""); setFrom(""); setTo(""); setCompletion("all"); setPage(1); };
  const selectCompletion = (value) => { setCompletion((current) => current === value ? "all" : value); setPage(1); };
  const countHint = hasSearchFilters ? "Matching email and dates" : "Across all requests";

  return <div className="space-y-5">
    <div role="group" aria-label="Filter requests by questionnaire completion" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile icon={Inbox} tone="primary" label={hasSearchFilters ? "Matching Requests" : "Total Requests"} value={hasData ? overview.total.toLocaleString() : "—"} hint={countHint} selected={completion === "all"} disabled={!hasData} onClick={() => selectCompletion("all")} />
      <StatTile icon={CheckCircle2} tone="green" label="Fully Answered" value={hasData ? overview.complete : "—"} hint={countHint} selected={completion === "complete"} disabled={!hasData} onClick={() => selectCompletion("complete")} />
      <StatTile icon={Hourglass} tone="orange" label="Awaiting Answers" value={hasData ? overview.awaiting : "—"} hint={countHint} selected={completion === "awaiting"} disabled={!hasData} onClick={() => selectCompletion("awaiting")} />
      <StatTile icon={ListChecks} label="Questionnaire" value={questions.length} hint="View and edit questions" onClick={onQuestions} />
    </div>

    <SectionCard label="Increment requests">
      <h2 className="sr-only">Increment requests</h2>
      <div className="border-b border-border bg-muted/20 p-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-0 basis-full sm:min-w-56 sm:flex-1 sm:basis-auto"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Employee Email</span><span className="relative block"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by email…" className={`${inputClass} pl-10`} /></span></label>
          <label className="block min-w-0 flex-1 sm:w-40 sm:flex-none"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Submitted From</span><input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className={inputClass} /></label>
          <label className="block min-w-0 flex-1 sm:w-40 sm:flex-none"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Submitted To</span><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} className={inputClass} /></label>
          <Button variant="outline" className="h-11 shrink-0 rounded-xl bg-card px-4" disabled={query.isFetching || Boolean(invalidRange)} onClick={() => query.refetch()}><RefreshCw size={15} className={query.isFetching ? "motion-safe:animate-spin" : ""} aria-hidden="true" />Refresh</Button>
          {completion !== "all" && <Button variant="secondary" className="h-11 rounded-xl" aria-label="Remove questionnaire completion filter" onClick={() => selectCompletion(completion)}>{completion === "complete" ? "Fully Answered" : "Awaiting Answers"}<X size={14} aria-hidden="true" /></Button>}
          {hasFilters && <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground" onClick={clearFilters}><X size={15} aria-hidden="true" />Clear</Button>}
        </div>
      </div>

      {invalidRange && <div className="p-5"><ErrorMessage error={new Error("The end date must be on or after the start date.")} /></div>}
      {query.isError && <div className="p-5"><ErrorMessage error={query.error} onRetry={() => query.refetch()} /></div>}
      {!invalidRange && !query.isError && <>
        {query.isPending ? <Skeleton /> : rows.length ? <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Employee increment requests with annual salary expectations and questionnaire completion.</caption>
              <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-foreground"><tr>{["Employee", "Requested Annual Salary", "Questionnaire", "Submitted", "Action"].map((label, index) => <th key={index} scope="col" className="whitespace-nowrap px-5 py-4 first:pl-6 last:pr-6 last:text-right">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border/70">{rows.map(({ record, progress }) => {
                const identity = requestIdentity(record);
                const salary = requestedAnnualSalary(record);
                return <tr key={record.id} className="group transition-colors even:bg-muted/15 hover:bg-primary/5 focus-within:bg-primary/5">
                  <td className="max-w-80 py-4 pl-6 pr-5">
                    <div className="flex items-center gap-3">
                      <Avatar identity={identity} />
                      <div className="min-w-0">
                        <button type="button" onClick={() => onSelect(record.id)} className="rounded text-left font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><span className="block truncate">{identity.name}</span></button>
                        {identity.email && identity.email !== identity.name && <p className="mt-0.5 truncate text-xs text-muted-foreground">{identity.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums">{salary === null ? <span className="text-xs text-muted-foreground">Not recorded</span> : <><span className="text-base font-semibold tracking-tight text-foreground">{money(salary)}</span><span className="ml-1.5 text-[11px] text-muted-foreground">/ year</span></>}</td>
                  <td className="whitespace-nowrap px-5 py-4"><ProgressMeter progress={progress} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-muted-foreground/70" aria-hidden="true" />{dateText(record.date_entered)}</span></td>
                  <td className="py-4 pl-5 pr-6 text-right"><Button variant="ghost" className="h-10 rounded-lg px-3.5 text-primary hover:bg-primary/10" onClick={() => onSelect(record.id)} aria-label={`Review increment request for ${identity.name}`}>Review<ArrowRight size={14} aria-hidden="true" /></Button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </> : <EmptyState icon={ClipboardList} title={hasFilters ? "No matching requests" : "No increment requests yet"} action={hasFilters && <Button variant="outline" className="h-10 rounded-xl" onClick={clearFilters}>Clear filters</Button>}>{completion !== "all" ? `No ${completion === "complete" ? "fully answered requests" : "requests awaiting answers"} match the current email and dates. Select Total Requests to view every matching request.` : hasFilters ? "Try a different email or widen the submission dates." : "Employee increment requests will appear here when submitted. You can prepare the questionnaire in the Questions tab."}</EmptyState>}
        {!query.isPending && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3.5 text-xs text-muted-foreground sm:px-6">
          <span aria-live="polite">{total ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, total)} of {total.toLocaleString()} requests</span>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="size-10 rounded-lg bg-card" disabled={currentPage <= 1 || query.isFetching} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Button><span className="min-w-20 text-center font-medium text-foreground">Page {currentPage} of {pages}</span><Button variant="outline" size="icon" className="size-10 rounded-lg bg-card" disabled={currentPage >= pages || query.isFetching} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={16} /></Button></div>
        </footer>}
      </>}
    </SectionCard>
  </div>;
}

function RequestDetail({ id, questions, onBack }) {
  const heading = useRef(null);
  const recordQuery = useQuery({ queryKey: [...ROOT_KEY, "request", id], queryFn: () => fetchAdminRequest(id) });
  const repliesQuery = useQuery({ queryKey: [...ROOT_KEY, "replies", id], queryFn: () => fetchAdminReplies(id) });
  useEffect(() => { heading.current?.focus(); }, []);
  const record = recordQuery.data;
  const replies = repliesQuery.data || [];
  const identity = record ? requestIdentity(record) : null;
  const salary = record ? requestedAnnualSalary(record) : null;
  const groups = groupAnswers(questions, replies, id);
  const progress = answerProgress(questions, replies, id);
  const repliesReady = !repliesQuery.isError && !repliesQuery.isPending;

  return <section>
    <Button variant="ghost" className="mb-4 h-10 -ml-2 rounded-xl text-muted-foreground" onClick={onBack}><ArrowLeft size={16} />All requests</Button>
    <h2 ref={heading} tabIndex={-1} className="sr-only">Request review</h2>
    {recordQuery.isError ? <ErrorMessage error={recordQuery.error} onRetry={() => recordQuery.refetch()} /> : recordQuery.isPending ? <SectionCard label="Loading request"><Skeleton rows={4} /></SectionCard> : <div className="space-y-5">
      <SectionCard label="Employee summary" className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-primary/10 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-6 p-5 pt-10 sm:p-6 sm:pt-12">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar identity={identity} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Increment request</p>
              <h3 className="mt-1 break-all text-xl font-semibold tracking-tight text-foreground">{identity.name}</h3>
              {identity.email && identity.email !== identity.name && <p className="mt-0.5 break-all text-sm text-muted-foreground">{identity.email}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"><CalendarDays size={13} aria-hidden="true" />Submitted {dateText(record.date_entered)}</span>
                {repliesReady && <ProgressBadge progress={progress} />}
              </div>
            </div>
          </div>
          <div className="flex min-w-60 items-center gap-4 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25"><BadgeIndianRupee size={22} aria-hidden="true" /></span>
            <div><p className="text-xs font-medium text-muted-foreground">Requested annual salary</p><p className={`mt-0.5 tabular-nums tracking-tight ${salary === null ? "text-sm text-muted-foreground" : "text-2xl font-semibold text-foreground"}`}>{money(salary)}</p></div>
          </div>
        </div>
      </SectionCard>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard label="Employee answers" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><MessageSquareText size={19} aria-hidden="true" /></span><div><h3 className="font-semibold">Questionnaire</h3><p className="mt-0.5 text-sm text-muted-foreground">Employee responses, shown as submitted.</p></div></div>
            {repliesReady && <ProgressRing progress={progress} />}
          </div>
          {repliesQuery.isError ? <div className="p-5"><ErrorMessage error={repliesQuery.error} onRetry={() => repliesQuery.refetch()} /></div> : repliesQuery.isPending ? <Skeleton rows={3} /> : groups.length ? <ol className="divide-y divide-border">{groups.map((group, index) => {
            const answered = group.replies.some((reply) => clean(reply.description));
            return <li key={group.id} className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums ${answered ? "bg-(--employee-green-soft) text-(--employee-green)" : "bg-muted text-muted-foreground"}`}>{answered ? <Check size={15} aria-hidden="true" /> : index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Question {index + 1}</p>
                  <h4 className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-6">{group.missing ? "Archived or unavailable question" : questionText(group.question)}</h4>
                  {group.missing && <p className="mt-1 text-xs text-muted-foreground">The original question is unavailable. Its saved responses are preserved below.</p>}
                  {group.replies.length ? <div className="mt-4 space-y-3">{group.replies.map((reply) => <div key={reply.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{clean(reply.description) || <span className="italic text-muted-foreground">Empty response</span>}</p>
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{reply.date_entered && <span className="inline-flex items-center gap-1.5"><Clock3 size={12} aria-hidden="true" />{dateText(reply.date_entered)}</span>}{clean(reply.name).includes("@") && <span>{reply.name}</span>}</p>
                  </div>)}</div> : <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs italic text-muted-foreground"><Hourglass size={13} aria-hidden="true" />Not answered yet</p>}
                </div>
              </div>
            </li>;
          })}</ol> : <EmptyState icon={FileQuestion} title="No questionnaire responses">This request has no saved responses and there are no questions configured.</EmptyState>}
        </SectionCard>

        <SectionCard label="Request details" className="xl:sticky xl:top-4">
          <div className="border-b border-border px-5 py-4"><h3 className="text-sm font-semibold">Request details</h3></div>
          <dl className="divide-y divide-border">
            {[
              { icon: BadgeIndianRupee, label: "Requested annual salary", value: money(salary), hint: "INR" },
              { icon: CalendarDays, label: "Submitted", value: dateText(record.date_entered) },
              { icon: Clock3, label: "Last updated", value: dateText(record.date_modified) },
              { icon: ListChecks, label: "Questionnaire", value: repliesReady ? (progress.total ? `${progress.answered} of ${progress.total} answered` : "No questions") : "Loading…" },
            ].map((detail) => {
              const Icon = detail.icon;
              return <div key={detail.label} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon size={15} aria-hidden="true" /></span>
                <div className="min-w-0"><dt className="text-xs text-muted-foreground">{detail.label}{detail.hint && <span className="ml-1 text-muted-foreground/70">· {detail.hint}</span>}</dt><dd className="mt-0.5 break-words text-sm font-medium tabular-nums text-foreground">{detail.value}</dd></div>
              </div>;
            })}
          </dl>
          {salary === null && clean(record.description) && <div className="border-t border-border bg-muted/30 px-5 py-4"><h4 className="text-xs font-medium text-muted-foreground">Request notes</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{record.description}</p></div>}
        </SectionCard>
      </div>
    </div>}
  </section>;
}

function QuestionForm({ question, onClose }) {
  const [name, setName] = useState(clean(question?.name));
  const [description, setDescription] = useState(clean(question?.description));
  const titleInput = useRef(null);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => saveAdminQuestion(question?.id, { name, description }),
    onSuccess: async () => { toast.success(question?.id ? "Question updated." : "Question added."); await client.invalidateQueries({ queryKey: ROOT_KEY }); onClose(); },
    onError: () => client.invalidateQueries({ queryKey: ROOT_KEY }),
    retry: false,
  });
  useEffect(() => { titleInput.current?.focus(); }, []);
  const changed = clean(name) !== clean(question?.name) || clean(description) !== clean(question?.description);
  return <form onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending && name.trim() && description.trim()) mutation.mutate(); }} className="border-b border-border border-l-4 border-l-primary bg-primary/[0.04] p-5 sm:p-6" aria-label={question?.id ? "Edit question" : "Add question"}>
    <div className="max-w-3xl">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">{question?.id ? <Pencil size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}</span><div><h3 className="text-base font-semibold">{question?.id ? "Edit question" : "New question"}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Employees answer the question text. Updates also change how the question appears beside existing responses.</p></div></div>
      <label className="mt-5 block"><span className="mb-1.5 block text-sm font-medium">Title <span className="font-normal text-muted-foreground">(required)</span></span><input ref={titleInput} required maxLength={255} value={name} disabled={mutation.isPending} onChange={(event) => { setName(event.target.value); mutation.reset(); }} placeholder="e.g. Contributions and impact" className={inputClass} /></label>
      <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Question text <span className="font-normal text-muted-foreground">(required)</span></span><textarea required rows={4} value={description} disabled={mutation.isPending} onChange={(event) => { setDescription(event.target.value); mutation.reset(); }} placeholder="What contributions have had the greatest impact since your last salary review?" className={`${inputClass} resize-y leading-6`} /></label>
      {mutation.isError && <div className="mt-4"><ErrorMessage error={mutation.error} /></div>}
      <div className="mt-5 flex items-center gap-2"><Button type="submit" className="h-10 rounded-xl px-4 shadow-md shadow-primary/20" disabled={!name.trim() || !description.trim() || !changed || mutation.isPending}>{mutation.isPending ? <Loader2 size={15} className="motion-safe:animate-spin" /> : <Check size={15} />}{question?.id ? "Save changes" : "Add question"}</Button><Button type="button" variant="ghost" className="h-10 rounded-xl" disabled={mutation.isPending} onClick={onClose}>Cancel</Button></div>
    </div>
  </form>;
}

function QuestionList({ questions, schema }) {
  const [editing, setEditing] = useState(null);
  const heading = useRef(null);
  const canEdit = ["name", "description"].every((name) => schema.questions.some((field) => field.name === name));
  const closeEditor = () => { setEditing(null); heading.current?.focus(); };
  return <SectionCard label="Increment questionnaire">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileQuestion size={19} aria-hidden="true" /></span>
        <div><h2 ref={heading} tabIndex={-1} className="font-semibold outline-none">Review questionnaire <span className="ml-1.5 inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{questions.length}</span></h2><p className="mt-0.5 max-w-2xl text-sm leading-6 text-muted-foreground">Questions employees answer to support their increment request.</p></div>
      </div>
      <Button className="h-10 rounded-xl px-4 shadow-md shadow-primary/20" disabled={editing !== null || !canEdit} onClick={() => setEditing({})}><Plus size={16} />Add question</Button>
    </div>
    {!canEdit && <div className="p-5"><ErrorMessage error={new Error("Question editing is unavailable: the module must expose name and description fields.")} /></div>}
    {editing !== null && <QuestionForm key={editing.id || "new"} question={editing} onClose={closeEditor} />}
    {questions.length ? <ol className="divide-y divide-border">{questions.map((question, index) => <li key={question.id} className={`group flex items-start gap-4 p-5 transition-colors hover:bg-primary/[0.03] sm:gap-5 sm:p-6 ${editing?.id === question.id ? "bg-primary/[0.04]" : ""}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-xs font-semibold tabular-nums text-primary ring-1 ring-inset ring-primary/10">{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold leading-6">{clean(question.name) || "Untitled question"}</h3><p className="mt-1 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{clean(question.description) || questionText(question)}</p></div>
      <Button variant="outline" className="h-9 shrink-0 rounded-full bg-card px-3.5 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary" disabled={editing !== null || !canEdit} onClick={() => setEditing(question)} aria-label={`Edit question ${index + 1}`}><Pencil size={14} /><span className="hidden sm:inline">Edit</span></Button>
    </li>)}</ol> : editing === null && <EmptyState icon={FileQuestion} title="Build your review questionnaire">Add questions about contributions, responsibilities, and salary expectations to give reviewers useful context.</EmptyState>}
    {questions.length > 0 && <p className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-4 text-xs leading-5 text-muted-foreground sm:px-6"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />All configured questions are part of the employee questionnaire. Adding a question may change the completion count for earlier requests.</p>}
  </SectionCard>;
}

const TABS = [
  { key: "requests", label: "Requests", icon: ClipboardList },
  { key: "questions", label: "Questions", icon: FileQuestion },
];

export default function IncrementManagementPage() {
  const [tab, setTab] = useState("requests");
  const [selectedId, setSelectedId] = useState(null);
  const requestsButton = useRef(null);
  const questionsButton = useRef(null);
  const schema = useQuery({ queryKey: [...ROOT_KEY, "schema"], queryFn: fetchIncrementSchema, staleTime: 5 * 60 * 1000 });
  const questions = useQuery({ queryKey: [...ROOT_KEY, "questions"], queryFn: fetchAdminQuestions, enabled: schema.isSuccess });
  const error = schema.error || questions.error;
  const loading = schema.isPending || questions.isPending;

  return <div className="mx-auto w-full max-w-[1600px] px-1 py-3 text-foreground sm:px-3 sm:py-5">
    <header className="relative mb-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/[0.03] sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-56 size-60 rounded-full bg-(--employee-green)/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">People operations<span aria-hidden="true" className="text-muted-foreground/50">/</span>Compensation</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Increment management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A clear view of employee requests, their expectations, and their contributions.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur"><span className="size-1.5 rounded-full bg-(--employee-green)" aria-hidden="true" />Admin workspace</span>
      </div>
      <nav aria-label="Increment management views" className="relative mt-6 inline-flex rounded-xl border border-border bg-muted/60 p-1">
        {TABS.map(({ key, label, icon }) => {
          const Icon = icon;
          const active = tab === key;
          return <button ref={key === "requests" ? requestsButton : questionsButton} key={key} type="button" aria-pressed={active} onClick={() => { setTab(key); setSelectedId(null); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon size={16} className={active ? "text-primary" : ""} aria-hidden="true" />{label}
            {key === "questions" && questions.data && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${active ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}>{questions.data.length}</span>}
          </button>;
        })}
      </nav>
    </header>
    {error ? <ErrorMessage error={error} onRetry={() => { schema.refetch(); questions.refetch(); }} /> : loading ? <SectionCard label="Loading"><Skeleton /></SectionCard> : <>
      <div hidden={tab !== "questions"}><QuestionList questions={questions.data} schema={schema.data} /></div>
      <div hidden={tab !== "requests" || Boolean(selectedId)}><RequestList questions={questions.data} onSelect={setSelectedId} onQuestions={() => { setTab("questions"); setSelectedId(null); questionsButton.current?.focus(); }} /></div>
      {tab === "requests" && selectedId && <RequestDetail key={selectedId} id={selectedId} questions={questions.data} onBack={() => { setSelectedId(null); requestsButton.current?.focus(); }} />}
    </>}
  </div>;
}
