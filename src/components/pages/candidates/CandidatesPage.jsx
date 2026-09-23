import { useState } from "react";
import { useSelector } from "react-redux";
import { selectIsAdmin } from "../../../utils/pageAccess";
import { Link } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkCheck,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import ScheduleInterviewDialog from "./ScheduleInterviewDialog";
import CandidateInterviewsDialog from "../interviews/CandidateInterviewsDialog";
import CandidateDetails from "./CandidateDetails";
import {
  candidateName,
  fetchAllRecords,
  workflowModules,
  workflowValue,
  workflowUpdate,
  updateCandidateRecord,
} from "./candidatesApi";

const kinds = Object.keys(workflowModules);
const pageSize = 20;

export default function CandidatesPage({ shortlistedOnly = false }) {
  const isAdmin = useSelector(selectIsAdmin);
  const client = useQueryClient();
  const [scheduling, setScheduling] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const candidates = useQuery({
    queryKey: ["candidates", "list"],
    queryFn: () => fetchAllRecords("hrc_candidates"),
  });
  const results = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: ["candidate-workflow", kind],
      queryFn: async () =>
        (await fetchAllRecords(workflowModules[kind]))
          .filter((item) => item.id && item.name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      staleTime: 300000,
    })),
  });
  const lookups = Object.fromEntries(
    kinds.map((kind, index) => [kind, results[index]]),
  );
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ stage: "", phase: "", status: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState({ key: "name", direction: 1 });
  const allRecords = candidates.data || [];
  const records = shortlistedOnly
    ? allRecords.filter(
        (record) =>
          workflowValue(record, "stage", lookups.stage.data)
            .trim()
            .toLowerCase() === "shortlisted",
      )
    : allRecords;
  async function shortlist(record) {
    if (busyId) return;
    setBusyId(record.id);
    try {
      const data = workflowUpdate(
        record,
        "stage",
        "Shortlisted",
        lookups.stage.data,
      );
      await updateCandidateRecord(record.id, data);
      client.setQueryData(["candidates", "list"], (items) =>
        items?.map((item) =>
          item.id === record.id ? { ...item, ...data } : item,
        ),
      );
      void client.invalidateQueries({ queryKey: ["candidates"] });
      void client.invalidateQueries({ queryKey: ["candidate-profile"] });
      toast.success("Candidate shortlisted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  }
  const value = (record, key) =>
    key === "name"
      ? candidateName(record)
      : key === "email"
        ? record.email1 || ""
        : workflowValue(record, key, lookups[key].data);
  const visible = records
    .filter(
      (record) =>
        [candidateName(record), record.email1, record.phone_mobile].some(
          (item) =>
            String(item || "")
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        ) &&
        kinds.every(
          (kind) => !filters[kind] || value(record, kind) === filters[kind],
        ),
    )
    .sort(
      (a, b) =>
        String(value(a, sort.key)).localeCompare(
          String(value(b, sort.key)),
          undefined,
          { numeric: true, sensitivity: "base" },
        ) * sort.direction,
    );
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const filterActive = search || kinds.some((kind) => filters[kind]);
  function refresh() {
    void candidates.refetch();
    results.forEach((query) => {
      void query.refetch();
    });
  }
  return (
    <main className="min-h-full space-y-6 rounded-2xl bg-slate-50 p-3 sm:p-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary p-6 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[45px] border-white/5"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Talent workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {shortlistedOnly ? "Shortlisted candidates" : "Candidates"}
            </h1>
            {isAdmin && <Link to="/interviews" className="mt-3 inline-block text-sm font-semibold underline">View interviews</Link>}
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              {shortlistedOnly
                ? "Your next great hires. Schedule an interview and take the conversation forward."
                : "Get to know your talent. Review every profile and keep the next step moving."}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
            <Users className="text-indigo-300" size={28} />
            <div>
              <p className="text-3xl font-semibold">
                {candidates.isPending ? "—" : records.length.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {shortlistedOnly
                  ? "Shortlisted candidates"
                  : "Total candidates"}
              </p>
            </div>
          </div>
        </div>
      </header>
      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Candidate directory"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              {shortlistedOnly
                ? "Ready for the next step"
                : "Candidate directory"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a candidate to view and edit their profile.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={candidates.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={candidates.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap gap-3 p-5">
          <label className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-indigo-500">
            <Search size={17} className="text-slate-400" />
            <input
              type="search"
              aria-label="Search candidates"
              placeholder="Search name, email or phone"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          {kinds.map((kind) => (
            <select
              key={kind}
              aria-label={`Filter by ${kind}`}
              value={filters[kind]}
              onChange={(event) => {
                setFilters((previous) => ({
                  ...previous,
                  [kind]: event.target.value,
                }));
                setPage(1);
              }}
              className="max-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm capitalize text-slate-600"
            >
              <option value="">
                All {kind === "status" ? "statuses" : `${kind}s`}
              </option>
              {[
                ...new Set([
                  ...records.map((record) => value(record, kind)),
                  ...(lookups[kind].data || []).map((option) => option.name),
                ]),
              ]
                .sort()
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          ))}
          {filterActive && (
            <button
              onClick={() => {
                setSearch("");
                setFilters({ stage: "", phase: "", status: "" });
                setPage(1);
              }}
              className="px-2 text-sm font-medium text-indigo-600"
            >
              Clear filters
            </button>
          )}
        </div>
        {candidates.isError && (
          <div
            role="alert"
            className="mx-5 mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {candidates.error.message}
            <button
              className="ml-3 underline"
              onClick={() => candidates.refetch()}
            >
              Retry
            </button>
          </div>
        )}
        {results.some((query) => query.isError) && (
          <div
            role="alert"
            className="mx-5 mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            Some workflow names could not be loaded.{" "}
            <button onClick={refresh} className="underline">
              Retry loading options
            </button>
          </div>
        )}
        {candidates.isPending ||
        (shortlistedOnly && lookups.stage.isPending) ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500"
          >
            <Loader2 size={18} className="animate-spin" />
            Loading candidates…
          </p>
        ) : !rows.length ? (
          <div className="px-6 py-16 text-center">
            <Users size={32} className="mx-auto text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-800">
              {candidates.isError
                ? "Candidates unavailable"
                : filterActive
                  ? "No matching candidates"
                  : shortlistedOnly
                    ? "Your shortlist starts here"
                    : "No candidates yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {filterActive
                ? "Try a different search or clear your filters."
                : shortlistedOnly
                  ? "Use the shortlist icon in Candidates to add talent here."
                  : "Candidate records will appear here when available."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["name", "email", ...kinds].map((key) => (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={
                        sort.key === key
                          ? sort.direction === 1
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="px-5 py-3"
                    >
                      <button
                        onClick={() =>
                          setSort((previous) => ({
                            key,
                            direction:
                              previous.key === key ? -previous.direction : 1,
                          }))
                        }
                        className="font-semibold uppercase"
                      >
                        {key}
                        {sort.key === key
                          ? sort.direction === 1
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((record, index) => (
                  <tr
                    key={record.id || index}
                    onClick={() => record.id && setSelected(record.id)}
                    className="group cursor-pointer transition hover:bg-indigo-50/50"
                  >
                    <td className="px-5 py-4">
                      <button
                        disabled={!record.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(record.id);
                        }}
                        className="flex items-center gap-3 text-left font-semibold text-slate-900 focus-visible:outline-indigo-500"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          {candidateName(record).slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          {candidateName(record)}
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            {record.current_designation ||
                              record.title ||
                              "View profile"}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {record.email1 || "—"}
                    </td>
                    {kinds.map((kind, i) => (
                      <td key={kind} className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${["bg-indigo-50 text-indigo-700", "bg-sky-50 text-sky-700", "bg-emerald-50 text-emerald-700"][i]}`}
                        >
                          {value(record, kind)}
                        </span>
                      </td>
                    ))}
                    <td
                      className="px-5 py-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {shortlistedOnly ? (value(record, "status").trim().toLowerCase() !== "rejected" && <div className="flex flex-wrap gap-2">
                        <button
                          disabled={
                            !record.id ||
                            !lookups.status.isSuccess ||
                            value(record, "status").toLowerCase() ===
                              "scheduled"
                          }
                          onClick={() => setScheduling(record)}
                          className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
                        >
                          <CalendarPlus size={16} />
                          {value(record, "status").toLowerCase() === "scheduled"
                            ? "Scheduled"
                            : "Schedule interview"}
                        </button>
                        <button
                          disabled={!record.id || !lookups.status.isSuccess}
                          onClick={() => setRescheduling(record)}
                          className="inline-flex whitespace-nowrap items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          <CalendarPlus size={16} /> Reschedule interview
                        </button>
                      </div>) : (
                        <button
                          title={
                            value(record, "stage").toLowerCase() ===
                            "shortlisted"
                              ? "Already shortlisted"
                              : "Shortlist candidate"
                          }
                          aria-label={"Shortlist " + candidateName(record)}
                          disabled={
                            !record.id ||
                            !!busyId ||
                            !lookups.stage.isSuccess ||
                            value(record, "stage").toLowerCase() ===
                              "shortlisted"
                          }
                          onClick={() => shortlist(record)}
                          className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40"
                        >
                          {busyId === record.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <BookmarkCheck size={18} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <p>
            {visible.length
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, visible.length)}`
              : "0"}{" "}
            of {visible.length} candidates
          </p>
          <div className="flex items-center gap-3">
            <button
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              aria-label="Next page"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      {rescheduling && <CandidateInterviewsDialog candidate={rescheduling} statusOptions={lookups.status.data} onClose={() => setRescheduling(null)} />}
      {scheduling && (
        <ScheduleInterviewDialog
          record={scheduling}
          lookups={lookups}
          onClose={() => setScheduling(null)}
        />
      )}
      {selected && (
        <CandidateDetails
          key={selected}
          id={selected}
          lookups={lookups}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
