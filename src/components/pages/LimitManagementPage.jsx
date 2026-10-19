import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Loader2,
  LogIn,
  Pencil,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Timer,
  Utensils,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchAllRecords } from "./candidates/candidatesApi";
import PageAccessGuard from "../routing/PageAccessGuard";
import { smartGateway } from "../../services/api";
import { pageGutter } from "../employement/components/home/homeUi";
import {
  attendanceLimitsKey,
  fetchAttendanceLimits,
  timeToMinutes,
} from "../employement/attendanceLimits";

const LIST_KEY = ["limit-management", "list"];
const clean = (value) => String(value ?? "").trim();
const DURATION_FIELDS = [
  ["year", "Years", "y"],
  ["month", "Months", "mo"],
  ["day", "Days", "d"],
  ["hour", "Hours", "h"],
  ["minutes", "Minutes", "min"],
];
const editableFields = ["name", "status", ...DURATION_FIELDS.map(([field]) => field), "actual_time", "description"];
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";
const inputBase =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const inputClass = `mt-1.5 w-full ${inputBase}`;

// "1 h 30 min" from the record's year/month/day/hour/minutes parts.
const durationLabel = (record) =>
  DURATION_FIELDS
    .filter(([field]) => Number(record[field]) > 0)
    .map(([field, , unit]) => `${Number(record[field])} ${unit}`)
    .join(" ") || "No duration";

const clockLabel = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

// "9:30 AM" <-> "09:30" for the native time picker.
const toTimeInput = (value) => {
  const minutes = timeToMinutes(value);
  return minutes === null ? "" : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};
const fromTimeInput = (value) => {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? clockLabel(hour * 60 + minute) : "";
};

// Icon and a plain-language explanation for the limits attendance relies on.
function limitMeaning(record) {
  const name = clean(record.name).toLowerCase();
  const start = timeToMinutes(record.actual_time);
  const minutes = Number(record.minutes) || 0;
  if (name.includes("login")) {
    return {
      Icon: LogIn,
      color: "bg-indigo-50 text-indigo-600",
      text: start === null
        ? `Check-ins get ${minutes} min of grace before they count as late.`
        : `Shift starts at ${clockLabel(start)}. Check-ins after ${clockLabel(start + minutes)} are marked late.`,
    };
  }
  if (name.includes("lunch")) {
    return {
      Icon: Utensils,
      color: "bg-emerald-50 text-emerald-700",
      text: `Lunch breaks longer than ${durationLabel(record)} are flagged on the attendance board.`,
    };
  }
  return { Icon: Timer, color: "bg-sky-50 text-sky-600", text: clean(record.description) };
}

function StatusBadge({ status }) {
  const value = clean(status);
  if (!value) return null;
  const tone = /^(active|enabled?|yes|on)$/i.test(value)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : /^(inactive|disabled?|no|off)$/i.test(value)
      ? "bg-slate-100 text-slate-500 ring-slate-200"
      : "bg-indigo-50 text-indigo-700 ring-indigo-200";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>{value}</span>;
}

export default function LimitManagementPage() {
  return (
    <PageAccessGuard>
      <LimitManagementRecords />
    </PageAccessGuard>
  );
}

function LimitManagementRecords() {
  const { recordId } = useParams();
  const query = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => fetchAllRecords("hrc_limit_management"),
  });
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const records = (query.data || []).filter((record) =>
    [...editableFields, "created_by_name", "assigned_user_name"].some((field) =>
      clean(record[field]).toLowerCase().includes(term),
    ),
  );
  const editing = recordId ? query.data?.find((item) => String(item.id) === String(recordId)) : null;

  return (
    <main className={`min-h-full space-y-6 rounded-2xl bg-slate-50 ${pageGutter}`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            People workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Limit management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Time and workflow limits used across attendance and HR workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className={buttonClass}
        >
          <RefreshCw size={15} className={query.isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <section aria-label="Limit records" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 sm:max-w-sm">
            <Search size={16} className="text-slate-400" />
            <input
              type="search"
              aria-label="Search limit records"
              placeholder="Search limits"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          <p className="text-xs text-slate-500">
            {query.isPending ? "Loading…" : `${records.length} of ${query.data?.length ?? 0} limits`}
          </p>
        </div>

        {query.isError ? (
          <div role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
            {query.error.message}
            <button type="button" onClick={() => query.refetch()} className="ml-2 font-semibold underline">
              Retry
            </button>
          </div>
        ) : query.isPending ? (
          <p role="status" className="flex justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading limit records…
          </p>
        ) : !records.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <SlidersHorizontal size={30} className="mx-auto text-slate-300" />
            <p className="mt-4 font-medium text-slate-700">
              {search ? "No matching limits" : "No limits configured"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search ? "Try another search." : "Limits added in the CRM will appear here."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {records.map((record, index) => {
              const { Icon, color, text } = limitMeaning(record);
              const created = clean(record.date_entered_uni_format || record.date_entered);
              return (
                <li key={record.id || index} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`rounded-xl p-2.5 ${color}`}>
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">{clean(record.name) || "Untitled limit"}</h2>
                        {created && <p className="text-[11px] text-slate-400">Created {created}</p>}
                      </div>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Timer size={12} />Limit</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{durationLabel(record)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 size={12} />Reference time</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{clean(record.actual_time) || "—"}</p>
                    </div>
                  </div>

                  {text && <p className="mt-4 text-sm leading-6 text-slate-600">{text}</p>}

                  <div className="mt-auto flex justify-end pt-5">
                    <Link
                      aria-label={`Edit ${clean(record.name) || "limit record"}`}
                      to={`/limit-management/${encodeURIComponent(record.id)}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Pencil size={14} />
                      Edit limit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recordId && (
        <LimitEditor
          key={recordId}
          record={editing}
          loading={query.isPending}
          statuses={[...new Set((query.data || []).map((item) => clean(item.status)).filter(Boolean))]}
        />
      )}
    </main>
  );
}

function LimitEditor({ record, loading, statuses }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const original = record ? Object.fromEntries(editableFields.map((field) => [field, clean(record[field])])) : {};
  const values = form || original;
  const changed = editableFields.filter((field) => clean(values[field]) !== original[field]);
  const preview = record ? limitMeaning({ ...record, ...values }) : null;

  function update(field, value) {
    setForm({ ...values, [field]: value });
    setConfirmClose(false);
  }
  function close() {
    if (saving) return;
    if (changed.length) setConfirmClose(true);
    else navigate("/limit-management");
  }
  async function save(event) {
    event.preventDefault();
    if (!changed.length) return;
    setSaving(true);
    setError("");
    try {
      const response = await smartGateway({
        method: "POST",
        body: {
          action: "update",
          module: "hrc_limit_management",
          id: record.id,
          data: Object.fromEntries(changed.map((field) => [field, clean(values[field])])),
        },
      });
      if (response?.success !== true)
        throw new Error(response?.message || response?.error || "Could not save this limit record.");
      await client.invalidateQueries({ queryKey: LIST_KEY });
      // Attendance reads these limits from its own cached query, so refresh it straight away.
      void client.fetchQuery({ queryKey: attendanceLimitsKey, queryFn: fetchAttendanceLimits }).catch(() => {});
      toast.success("Limit updated");
      navigate("/limit-management");
    } catch (saveError) {
      setError(saveError.message || "Could not save this limit record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-slate-950/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-xl flex-col bg-slate-50 shadow-2xl outline-none sm:rounded-l-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:rounded-tl-2xl">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Edit limit</p>
              <Dialog.Title className="mt-1 truncate text-xl font-semibold text-slate-900">
                {clean(values.name) || "Limit record"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-slate-500">
                Changes apply to attendance as soon as they are saved.
              </Dialog.Description>
            </div>
            <button
              type="button"
              aria-label="Close limit editor"
              disabled={saving}
              onClick={close}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </header>

          {confirmClose && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
              <span className="flex items-center gap-2"><AlertTriangle size={16} />You have unsaved changes.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmClose(false)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">Keep editing</button>
                <button type="button" onClick={() => navigate("/limit-management")} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Discard and close</button>
              </div>
            </div>
          )}

          {loading ? (
            <p role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading record…
            </p>
          ) : !record ? (
            <p role="alert" className="m-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              This limit record could not be found. It may have been removed.
            </p>
          ) : (
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {preview?.text && (
                  <div className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <span className={`h-fit rounded-xl p-2 ${preview.color}`}><preview.Icon size={18} /></span>
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">Preview</p>
                      <p className="mt-0.5 text-sm leading-6 text-slate-700">{preview.text}</p>
                    </div>
                  </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Details</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600">
                      Name
                      <input value={values.name} onChange={(event) => update("name", event.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Status
                      <input list="limit-statuses" value={values.status} onChange={(event) => update("status", event.target.value)} className={inputClass} />
                      <datalist id="limit-statuses">
                        {statuses.map((status) => <option key={status} value={status} />)}
                      </datalist>
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Timer size={15} className="text-indigo-600" />Limit duration</h2>
                  <p className="mt-1 text-xs text-slate-500">Leave a part at 0 when it isn&apos;t used.</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {DURATION_FIELDS.map(([field, label]) => (
                      <label key={field} className="text-xs font-medium text-slate-600">
                        {label}
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={values[field]}
                          onChange={(event) => update(field, event.target.value)}
                          className={`${inputClass} text-center tabular-nums`}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarClock size={15} className="text-indigo-600" />Reference time</h2>
                  <p className="mt-1 text-xs text-slate-500">The time the limit counts from, such as the shift start for login delay.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <input
                      type="time"
                      aria-label="Reference time"
                      value={toTimeInput(values.actual_time)}
                      onChange={(event) => update("actual_time", fromTimeInput(event.target.value))}
                      className={`${inputBase} w-40`}
                    />
                    {values.actual_time && (
                      <button type="button" onClick={() => update("actual_time", "")} className="text-xs font-medium text-slate-500 hover:text-rose-600">
                        Clear time
                      </button>
                    )}
                    {values.actual_time && timeToMinutes(values.actual_time) === null && (
                      <p className="w-full text-xs text-amber-700">Stored as “{values.actual_time}”, which isn&apos;t a valid time. Pick a new one.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <label className="text-sm font-semibold text-slate-900">
                    Description
                    <textarea
                      rows={4}
                      value={values.description}
                      onChange={(event) => update("description", event.target.value)}
                      placeholder="Explain what this limit controls"
                      className={`${inputClass} font-normal`}
                    />
                  </label>
                </section>

                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <p className="text-xs text-slate-400">
                  {changed.length ? `${changed.length} unsaved change${changed.length > 1 ? "s" : ""}` : "No changes yet"}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={close} disabled={saving} className={buttonClass}>Cancel</button>
                  <button
                    type="submit"
                    disabled={saving || !changed.length}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save changes
                  </button>
                </div>
              </footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
