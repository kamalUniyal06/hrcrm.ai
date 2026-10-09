import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectIsAdmin } from "../../../utils/pageAccess";
import { Link } from "react-router-dom";
import { keepPreviousData, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookmarkCheck,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import ScheduleInterviewDialog from "./ScheduleInterviewDialog";
import CandidateInterviewsDialog from "../interviews/CandidateInterviewsDialog";
import CandidateDetails from "./CandidateDetails";
import CandidateAvatar from "./CandidateAvatar";
import { DateRangeFilter } from "../../DateRangeFilter";
import RecruitmentPanel from "../recruitment/RecruitmentPanel";
import {
  candidateName,
  fetchAllRecords,
  fetchCandidatePage,
  fetchShortlistSource,
  shortlistedCandidatesKey,
  workflowFields,
  workflowModules,
  workflowValue,
  workflowUpdate,
  updateCandidateRecord,
} from "./candidatesApi";

const kinds = Object.keys(workflowModules);
const columnLabels = { date_entered: "Date", name: "Name", email: "Email", stage: "Stage", phase: "Phase", status: "Status" };

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { fromDate: `${year}-${month}-01`, fromTime: "00:00", toDate: `${year}-${month}-${lastDay}`, toTime: "23:59" };
}

export default function CandidatesPage({ shortlistedOnly = false }) {
  const isAdmin = useSelector(selectIsAdmin);
  const client = useQueryClient();
  const [scheduling, setScheduling] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ stage: "", phase: "", status: "" });
  const [defaultRange] = useState(currentMonthRange);
  const [dateRange, setDateRange] = useState(defaultRange);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState(() => shortlistedOnly
    ? { key: "name", direction: 1 }
    : { key: "date_entered", direction: -1 });

  const request = {
    page,
    orderBy: sort.key === "name" ? "first_name"
      : sort.key === "email" ? "email1"
        : workflowFields[sort.key] || sort.key,
    orderDir: sort.direction === 1 ? "ASC" : "DESC",
    dateRange,
  };
  // Date-filtered pages use separate cache entries from assessment selectors.
  const candidatesKey = shortlistedOnly
    ? [...shortlistedCandidatesKey, { dateRange }]
    : ["candidates", "list", "page", "assigned-workflow", request];
  const candidates = useQuery({
    queryKey: candidatesKey,
    queryFn: shortlistedOnly ? () => fetchShortlistSource({ dateRange }) : () => fetchCandidatePage(request),
    placeholderData: shortlistedOnly ? undefined : keepPreviousData,
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
  const allRecords = shortlistedOnly
    ? (Array.isArray(candidates.data) ? candidates.data : [])
    : candidates.data?.records || [];
  const records = allRecords;

  function openAssessment(record = {}) {
    setAssessment(record);
  }
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
      client.setQueryData(candidatesKey, (previous) =>
        previous && { ...previous, records: previous.records.map((item) =>
          item.id === record.id ? { ...item, ...data } : item,
        ) },
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
        : key === "date_entered"
          ? record.date_entered || ""
        : workflowValue(record, key, lookups[key].data);
  const searchTerm = search.trim().toLowerCase();
  const visible = records.filter((record) =>
    [candidateName(record), record.email1, record.phone_mobile].some((item) =>
      String(item || "").toLowerCase().includes(searchTerm),
    ) && kinds.every((kind) => !filters[kind] || value(record, kind) === filters[kind]),
  );
  if (shortlistedOnly) {
    visible.sort((left, right) => sort.key === "date_entered"
      ? ((Date.parse(left.date_entered_uni_format || left.date_entered) || 0)
        - (Date.parse(right.date_entered_uni_format || right.date_entered) || 0)) * sort.direction
      : String(value(left, sort.key)).localeCompare(
      String(value(right, sort.key)), undefined, { numeric: true, sensitivity: "base" },
    ) * sort.direction);
  }
  const pageSize = shortlistedOnly ? 20 : candidates.data?.perPage ?? 20;
  const total = shortlistedOnly ? records.length : candidates.data?.total ?? 0;
  const paginationTotal = shortlistedOnly ? visible.length : total;
  const pages = shortlistedOnly
    ? Math.max(1, Math.ceil(visible.length / pageSize))
    : candidates.data?.pages ?? 1;
  const currentPage = shortlistedOnly ? Math.min(page, pages) : candidates.data?.page ?? page;
  const rows = shortlistedOnly
    ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : visible;
  const workflowFilterActive = kinds.some((kind) => filters[kind]);
  const filterActive = searchTerm || workflowFilterActive;

  function applyDateRange(range) {
    if (!range.fromDate || !range.toDate ||
      `${range.fromDate} ${range.fromTime || "00:00"}` > `${range.toDate} ${range.toTime || "23:59"}`) {
      toast.error("Choose a valid date range with the start before the end.");
      return;
    }
    setDateRange(range);
    setPage(1);
  }

  useEffect(() => {
    if (candidates.isSuccess && !candidates.isPlaceholderData && page > pages) setPage(pages);
  }, [candidates.isSuccess, candidates.isPlaceholderData, page, pages]);
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
                {candidates.isPending || candidates.isError || (shortlistedOnly && lookups.stage.isPending) ? "—" : total.toLocaleString()}
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
      {isAdmin && assessment && <RecruitmentPanel key={assessment.id || "select-candidate"} initialCandidate={assessment.id ? assessment : null} onClose={() => setAssessment(null)} />}
      <section
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Candidate directory"
        aria-busy={candidates.isFetching}
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
          <div className="flex flex-wrap gap-2">
          {isAdmin && <button onClick={() => openAssessment()} disabled={!candidates.isSuccess} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"><Link2 size={15} />View assessments</button>}
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
        </div>
        <div className="relative z-20 flex flex-wrap items-center gap-3 p-5">
          <div className="w-full">
            <p className="mb-2 text-xs font-medium text-slate-500">Created date</p>
            <div className="w-fit max-w-full">
              <DateRangeFilter
                {...dateRange}
                filterActive
                onApply={applyDateRange}
                onReset={() => applyDateRange(defaultRange)}
              />
            </div>
          </div>
          <label className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-indigo-500">
            <Search size={17} className="text-slate-400" />
            <input
              type="search"
              aria-label={shortlistedOnly ? "Search shortlisted candidates" : "Search candidates on this page"}
              placeholder={shortlistedOnly ? "Search name, email or phone" : "Search this page by name, email or phone"}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (shortlistedOnly) setPage(1);
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
                  ...(shortlistedOnly ? ["Unassigned"] : []),
                ]),
              ]
                .filter((name) => shortlistedOnly || (name.trim() && name.trim().toLowerCase() !== "unassigned"))
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
                if (workflowFilterActive) {
                  setFilters({ stage: "", phase: "", status: "" });
                  setPage(1);
                }
                if (shortlistedOnly) setPage(1);
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
        {candidates.isPending ? (
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
                    : "No assigned candidates"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {filterActive
                ? "Try a different search or clear your filters."
                : shortlistedOnly
                  ? "Use the shortlist icon in Candidates to add talent here."
                  : "Candidates appear here once their stage, phase and status are assigned."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs tracking-wide text-slate-500">
                <tr>
                  {["date_entered", "name", "email", ...kinds].map((key) => (
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
                        onClick={() => {
                          setSort((previous) => ({
                            key,
                            direction:
                              previous.key === key ? -previous.direction : 1,
                          }));
                          setPage(1);
                        }}
                        className="font-semibold"
                      >
                        {columnLabels[key]}
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
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {record.date_entered_uni_format || record.date_entered || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        disabled={!record.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(record.id);
                        }}
                        className="flex items-center gap-3 text-left font-semibold text-slate-900 focus-visible:outline-indigo-500"
                      >
                        <CandidateAvatar
                          record={record}
                          className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600"
                        />
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
                      {isAdmin && <button disabled={!record.id} onClick={() => {
                        openAssessment(record);
                      }} className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-2.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"><Link2 size={14} />View assessment</button>}
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
            {!shortlistedOnly && filterActive
              ? `${rows.length} ${rows.length === 1 ? "match" : "matches"} on this page (${total} total candidates)`
              : `${rows.length ? `${(currentPage - 1) * pageSize + 1}–${(currentPage - 1) * pageSize + rows.length}` : "0"} of ${paginationTotal} candidates`}
          </p>
          <div className="flex items-center gap-3">
            <button
              aria-label="Previous page"
              disabled={candidates.isFetching || candidates.isError || currentPage <= 1}
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
              disabled={candidates.isFetching || candidates.isError || currentPage >= pages}
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
