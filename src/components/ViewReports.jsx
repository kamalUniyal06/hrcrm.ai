import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Loader2,
  MessageSquare,
  Activity,
  Layers,
  ArrowUpRight,
  DatabaseZap,
  Gauge,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { memo } from "react";
import { fetchGpc } from "../services/api.js";
import {
  setStagesLoading, setStagesData,
  setCategoriesLoading, setCategoriesData,
  toggleStage,
  setError, clearError, resetReport,
  selectStages, selectCategories, selectDetails,
  selectReportStats,
  selectStagesLoading, selectCatsLoading, selectDetsLoading,
  selectReportError,
} from "../store/Slices/reportSlice.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DateRangeFilter } from "./DateRangeFilter.jsx";
import { useCrmUsers } from "../queries/users.queries.js";
import CustomDropdown from "./ui/CustomDropdown.jsx";
import { preferencesAction } from "../store/Slices/preferencesSlice.js";
// ─── Config ───────────────────────────────────────────────────────────────────

const PHASES = [
  {
    key: "filtration",
    label: "Filtration",
    sublabel: "Spam · Duplicates · Defaulters",
    icon: Filter,
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "conversations",
    label: "Conversations",
    sublabel: "Workflow · Stages · Outcomes",
    icon: MessageSquare,
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
];

const PAGE_SIZE = 20;
const DETAIL_PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getDateRange = (preset) => {
  const now = new Date();
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const s = fmtDate(y);
    return { from: s, from_time: "00:00:00", to: s, to_time: "23:59:59" };
  }
  const start = new Date(now);
  if (preset === "7days") start.setDate(now.getDate() - 7);
  if (preset === "30days") start.setDate(now.getDate() - 30);
  return { from: fmtDate(start), from_time: "00:00:00", to: fmtDate(now), to_time: "23:59:59" };
};

const getCount = (row) => Number(row?.total_count ?? row?.total ?? row?.count ?? 0);

const getStoredReportFilter = () => {
  try {
    const preferences = JSON.parse(localStorage.getItem("preferences") || "{}");
    const reportPreference = preferences?.tables?.report || {};
    const filters = reportPreference?.filters || {};
    const dateFilter = reportPreference?.date_filter || {};

    return {
      ...filters,
      from: dateFilter.date_from?.split(" ")[0] || "",
      from_time: dateFilter.date_from?.split(" ")[1] || "00:00:00",
      to: dateFilter.date_to?.split(" ")[0] || "",
      to_time: dateFilter.date_to?.split(" ")[1] || "23:59:59",
    };
  } catch {
    return {};
  }
};

const getInitialDateFilter = () => {
  const storedFilter = getStoredReportFilter();
  const hasStoredRange = storedFilter.from || storedFilter.to;

  return {
    filterActive: Boolean(hasStoredRange),
    fromDate: storedFilter.from || "",
    fromTime: storedFilter.from_time || "00:00:00",
    toDate: storedFilter.to || "",
    toTime: storedFilter.to_time || "23:59:59",
  };
};

const getUserOptions = (users = []) => [
  { value: "", label: "All users" },
  ...users.map((user) => ({
    value: user.id,
    label: user.name,
  })),
];

// ─── Pagination ───────────────────────────────────────────────────────────────

const ReportPagination = memo(({ pageIndex, pageCount, onChange, compact = false }) => {
  const [gotoValue, setGotoValue] = useState("");
  if (!pageCount || pageCount <= 1) return null;

  const handlePrev = () => { if (pageIndex > 1) onChange(pageIndex - 1); };
  const handleNext = () => { if (pageIndex < pageCount) onChange(pageIndex + 1); };

  const pagesToShow = [];
  const start = Number(pageIndex);
  const end = Math.min(Number(pageIndex) + 2, pageCount);
  for (let i = start; i <= end; i++) pagesToShow.push(i);
  if (end < pageCount - 1) { pagesToShow.push("ellipsis"); pagesToShow.push(pageCount); }

  const handleGoto = (e) => {
    if (e.key === "Enter") {
      const p = Number(gotoValue);
      if (p >= 1 && p <= pageCount) { onChange(p); setGotoValue(""); }
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-white/60 sm:px-5">
        <span className="text-xs text-slate-400 font-medium tabular-nums whitespace-nowrap">
          Page {pageIndex} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={pageIndex === 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={13} />
          </button>
          {pagesToShow.map((p, idx) =>
            p === "ellipsis" ? (
              <span key={idx} className="w-7 text-center text-xs text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all
                  ${p === pageIndex
                    ? "bg-slate-800 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={handleNext}
            disabled={pageIndex === pageCount}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-t border-slate-100 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={pageIndex === 1}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <div className="flex items-center gap-1">
          {pagesToShow?.map((p, idx) =>
            p === "ellipsis" ? (
              <span key={idx} className="w-9 text-center text-sm text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all
                  ${p === pageIndex
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {p}
              </button>
            )
          )}
        </div>
        <button
          onClick={handleNext}
          disabled={pageIndex === pageCount}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-slate-400 sm:inline">Jump to</span>
        <input
          type="number"
          min="1"
          max={pageCount}
          value={gotoValue}
          onChange={(e) => setGotoValue(e.target.value)}
          onKeyDown={handleGoto}
          className="w-16 h-9 px-3 text-sm border border-slate-200 rounded-xl text-slate-700 bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all"
          placeholder="—"
        />
      </div>
    </div>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="p-6 flex justify-between items-center animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-7 h-7 bg-slate-100 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 w-28 bg-slate-100 rounded-lg" />
        <div className="h-3 w-16 bg-slate-100 rounded-lg" />
      </div>
    </div>
    <div className="h-7 w-24 bg-slate-100 rounded-xl" />
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <BarChart3 size={20} className="text-slate-400" />
    </div>
    <p className="font-semibold text-slate-700 text-sm">{title}</p>
    <p className="text-xs text-slate-400 mt-1.5 max-w-xs text-center leading-relaxed">{subtitle}</p>
  </div>
);

const PhaseToggle = ({ activeSection, onChange }) => (
  <div className="mx-auto flex w-full max-w-2xl rounded-2xl border border-border bg-card p-1.5 shadow-sm">
    {PHASES.map((phase) => {
      const Icon = phase.icon;
      const isActive = activeSection === phase.key;
      return (
        <button
          type="button"
          key={phase.key}
          onClick={() => onChange(phase.key)}
          className={`group flex-1 rounded-xl px-4 py-3 text-left transition-all duration-200 ${isActive ? "bg-gradient-to-b from-sidebar-primary from-0% via-sidebar-primary via-2% to-sidebar-secondary to-100% text-white shadow-md" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${isActive ? "bg-white/15" : "bg-muted group-hover:bg-background"}`}><Icon size={16} /></div>
              <div>
                <p className="text-sm font-semibold">{phase.label}</p>
                <p className={`mt-0.5 hidden text-xs sm:block ${isActive ? "text-white/60" : "text-muted-foreground"}`}>{phase.sublabel}</p>
              </div>
            </div>
            <div className={`h-2 w-2 rounded-full transition-all ${isActive ? "bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" : "bg-border"}`} />
          </div>
        </button>
      );
    })}
  </div>
);

const ReportOverview = memo(({
  rows, stats, total, loading, phaseLabel, categories, onStageClick, onCategoryClick,
}) => {
  const chartRows = rows.slice(0, 8);
  const values = chartRows.map(getCount);
  const maxValue = Math.max(...values, 1);
  const chartPoints = values.length > 1
    ? values.map((value, index) => {
      const x = 8 + (index * 84) / (values.length - 1);
      const y = 88 - (value / maxValue) * 65;
      return `${x},${y}`;
    }).join(" ")
    : "8,78 92,78";
  const topStage = chartRows.reduce(
    (best, row) => getCount(row) > getCount(best) ? row : best,
    chartRows[0] || {},
  );
  const findMetric = (names) => Object.entries(stats).find(([key]) => {
    const normalizedKey = key.toLowerCase().replace(/[_-]+/g, " ");
    return names.some((name) => normalizedKey.includes(name));
  });
  const overviewMetrics = [
    { label: "Email Received", entry: findMetric(["email received", "emails received", "received email"]) },
    { label: "Email Reply Sent", entry: findMetric(["email reply sent", "reply sent", "replies sent"]) },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sidebar-primary from-0% via-sidebar-primary via-2% to-sidebar-secondary to-100% p-6 text-white shadow-xl shadow-sidebar-primary/15 lg:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
      <div className="relative grid gap-7 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                <Activity className="h-3.5 w-3.5" /> Live report overview
              </div>
              <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">{phaseLabel} performance</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">A real-time summary of the records returned by your current report filters.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" /> Live data
            </span>
          </div>
          <div className="mt-8 h-44 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
            {loading ? (
              <div className="h-full animate-pulse rounded-xl bg-white/10" />
            ) : chartRows.length ? (
              <div className="flex h-full flex-col">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="min-h-0 flex-1 overflow-visible" aria-label="Stage volume chart">
                  <defs><linearGradient id="reportAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0.3" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient></defs>
                  {[25, 50, 75].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="white" strokeOpacity="0.1" strokeDasharray="2 3" />)}
                  <polygon points={`8,94 ${chartPoints} 92,94`} fill="url(#reportAreaGradient)" />
                  <polyline points={chartPoints} fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {chartPoints.split(" ").map((point, index) => { const [cx, cy] = point.split(","); return <circle key={index} cx={cx} cy={cy} r="1.5" fill="white" />; })}
                </svg>
                <div className="mt-2 grid grid-flow-col auto-cols-fr gap-2">
                  {chartRows.map((row) => (
                    <button
                      type="button"
                      key={row.stage}
                      onClick={() => onStageClick(row.stage)}
                      className={`truncate rounded-md px-1 py-1 text-center text-[10px] capitalize transition-colors ${categories.openStage === row.stage ? "bg-white text-sidebar-primary" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
                      title={`Explore ${row.stage}`}
                    >
                      {row.stage}
                    </button>
                  ))}
                </div>
              </div>
            ) : <div className="flex h-full items-center justify-center text-sm text-white/55">No report activity for this selection</div>}
          </div>
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-white/60"><span className="text-xs font-semibold uppercase tracking-wider">Total records</span><DatabaseZap className="h-4 w-4" /></div>
            <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{loading ? "—" : total.toLocaleString()}</p>
            <p className="mt-2 text-xs text-white/55">Across {rows.length} visible stage{rows.length === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-white/60"><span className="text-xs font-semibold uppercase tracking-wider">Highest volume</span><ArrowUpRight className="h-4 w-4" /></div>
            <p className="mt-4 truncate text-xl font-semibold capitalize">{topStage?.stage || "No stage data"}</p>
            <p className="mt-2 text-xs text-white/55">{getCount(topStage).toLocaleString()} records in this stage</p>
          </div>
          {overviewMetrics.map(({ label, entry }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between text-white/60"><span className="truncate text-xs font-semibold uppercase tracking-wider">{label}</span><Gauge className="h-4 w-4" /></div>
              <p className="mt-4 text-2xl font-semibold tabular-nums">{loading ? "—" : Number(entry?.[1] || 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {categories.openStage && (
        <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Subgroups in</p>
              <p className="mt-1 text-sm font-semibold capitalize">{categories.openStage}</p>
            </div>
            <p className="text-xs text-white/45">Select a subgroup to open its records</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.loading ? (
              <span className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white/60">Loading subgroups...</span>
            ) : categories.rows.length ? categories.rows.map((row) => {
              const categoryName = row.category;
              return (
                <button
                  type="button"
                  key={categoryName}
                  onClick={() => onCategoryClick(categories.openStage, categoryName)}
                  className="group inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:text-sidebar-primary hover:shadow-lg"
                >
                  <span className="max-w-48 truncate text-xs font-medium capitalize">{categoryName}</span>
                  <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums group-hover:bg-sidebar-primary/10">{getCount(row).toLocaleString()}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              );
            }) : <span className="text-xs text-white/55">No subgroups found for this stage.</span>}
          </div>
        </div>
      )}
    </section>
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ViewReports() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email");
  console.log(email)
  const { data: users } = useCrmUsers();
  const storedReportFilter = useMemo(() => getStoredReportFilter(), []);
  const [dateFilter, setDateFilter] = useState(() => getInitialDateFilter());
  const stages = useSelector(selectStages);
  const categories = useSelector(selectCategories);
  const details = useSelector(selectDetails);
  const stats = useSelector(selectReportStats);
  const stagesLoading = useSelector(selectStagesLoading);
  const catsLoading = useSelector(selectCatsLoading);
  const detsLoading = useSelector(selectDetsLoading);
  const error = useSelector(selectReportError);

  const [selectedUser, setSelectedUser] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    user: '',
    date: "today",
  });
  useEffect(() => {
    if (!users?.length) return;

    if (email) {
      const user = users.find(
        (u) => u.description?.toLowerCase() === email.toLowerCase()
      );

      const userId = user?.id || "";

      setSelectedUser(userId);
      setAppliedFilters(prev => ({
        ...prev,
        user: userId,
      }));
    }
  }, [email, users]);
  const [activeSection, setActiveSection] = useState(storedReportFilter.phase || "conversations");

  const phaseConfig = useMemo(
    () => PHASES.find((p) => p.key === activeSection) || PHASES[0],
    [activeSection],
  );

  const buildBody = useCallback(
    (overrides = {}) => ({
      phase: activeSection, stage: "", category: "",
      page: "", size: String(PAGE_SIZE),
      ...(appliedFilters.user ? { report_user_id: appliedFilters.user } : {}),
      ...(dateFilter.filterActive
        ? {
          from:
            dateFilter.fromDate,
          from_time:
            dateFilter.fromTime,

          to:
            dateFilter.toDate,
          to_time:
            dateFilter.toTime,
        }
        : getDateRange(
          appliedFilters.date
        )
      ),
      ...overrides,
    }),
    [activeSection, appliedFilters, dateFilter],
  );

  const callReport = useCallback(
    (overrides = {}) =>
      fetchGpc({ method: "POST", params: { type: "newReport" }, body: buildBody(overrides) }),
    [buildBody],
  );

  const loadStages = useCallback(async (page = 1) => {
    dispatch(setStagesLoading(true));
    dispatch(clearError());
    try {
      const data = await callReport({ page, size: String(PAGE_SIZE) });
      dispatch(setStagesData({
        records: data?.records || [], pagination: data?.pagination || {},
        stats: data?.stats || {}, total_records: data?.total_records ?? 0,
      }));
    } catch {
      dispatch(setError("Unable to fetch report stages."));
    } finally {
      dispatch(setStagesLoading(false));
    }
  }, [callReport, dispatch]);

  const loadCategories = useCallback(async (stageName, page = 1) => {
    if (categories.openStage === stageName && page === categories.pageIndex) {
      dispatch(toggleStage(stageName)); return;
    }
    dispatch(setCategoriesLoading(true));
    dispatch(clearError());
    try {
      const data = await callReport({ stage: stageName, category: "", page, size: String(PAGE_SIZE) });
      dispatch(setCategoriesData({
        stageName, records: data?.records || [],
        pagination: data?.pagination || {}, total_records: data?.total_records ?? 0,
      }));
    } catch {
      dispatch(setError("Unable to fetch categories."));
    } finally {
      dispatch(setCategoriesLoading(false));
    }
  }, [callReport, dispatch, categories.openStage, categories.pageIndex]);

  const loadDetails = (
    stage,
    category
  ) => {

    const reportFilter = {
      filters: {
        phase:
          activeSection,

        stage,

        category,


      },
      date_filter: {
        date_range: 'custom',
        date_from: `${dateFilter.fromDate} ${dateFilter.fromTime}`,
        date_to: `${dateFilter.toDate} ${dateFilter.toTime}`,
        date_field: 'date_entered'
      }
    };

    if (appliedFilters.user) {
      reportFilter.filters.report_user_id = appliedFilters.user;
    }

    dispatch(preferencesAction.updateMultipleTablePreferences({
      table: 'report',
      data: reportFilter
    }))

    navigate(`/view-reports/${category}`);
  };


  const navigate = useNavigate();

  const restoredStageRef = useRef(false);

  useEffect(() => {
    dispatch(resetReport());

    loadStages(1).then(() => {
      if (
        !restoredStageRef.current &&
        storedReportFilter.stage &&
        storedReportFilter.phase === activeSection
      ) {
        restoredStageRef.current = true;
        loadCategories(storedReportFilter.stage, 1);
      }
    });
  }, [activeSection, appliedFilters, dateFilter]);

  const grandTotal = stages.rows.reduce((s, r) => s + getCount(r), 0);
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">

      {/* ── Sticky top nav ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-secondary shadow-sm">
              <Activity size={15} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Analytics &amp; Reports</span>
          </div>



          <div className="flex items-center gap-2 flex-1 justify-end mr-30">
            <DateRangeFilter
              fromDate={
                dateFilter.fromDate
              }
              fromTime={
                dateFilter.fromTime
              }
              toDate={
                dateFilter.toDate
              }
              toTime={
                dateFilter.toTime
              }
              filterActive={
                dateFilter.filterActive
              }
              onApply={({ fromDate, fromTime, toDate, toTime }) => {
                setDateFilter({
                  filterActive: true,
                  fromDate,
                  fromTime,
                  toDate,
                  toTime,
                });

                dispatch(
                  preferencesAction.updateMultipleTablePreferences({
                    table: "report",
                    data: {
                      date_filter: {
                        date_range: "custom",
                        date_field: "date_entered",
                        date_from: `${fromDate} ${fromTime}`,
                        date_to: `${toDate} ${toTime}`,
                      },
                    },
                  })
                );
              }}
              onReset={() => {
                setDateFilter({
                  filterActive: false,

                  fromDate: "",
                  fromTime:
                    "00:00:00",

                  toDate: "",
                  toTime:
                    "23:59:59",
                });
                dispatch(
                  preferencesAction.updateMultipleTablePreferences({
                    table: "report",
                    data: {
                      date_filter: {
                        date_range: "",
                        date_field: "",
                        date_from: "",
                        date_to: "",
                      },
                    },
                  })
                );
              }}
            />

            <CustomDropdown
              value={selectedUser}
              options={getUserOptions(users ?? [])}
              onChange={(user) => {
                setSelectedUser(user);
                setAppliedFilters((prev) => ({ ...prev, user }));
              }}
              placeholder="Select User"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-7 space-y-5">

        <PhaseToggle
          activeSection={activeSection}
          onChange={(phase) => { if (phase !== activeSection) setActiveSection(phase); }}
        />

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span><ChevronRight size={12} /><span className="text-foreground">Analytics</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Analytics &amp; Reports</h1>
          <p className="text-sm text-muted-foreground">Track real performance, compare stages, and explore every subgroup.</p>
        </div>

        <ReportOverview
          rows={stages.rows}
          stats={stats}
          total={grandTotal}
          loading={stagesLoading}
          phaseLabel={phaseConfig.label}
          categories={{ ...categories, loading: catsLoading }}
          onStageClick={(stageName) => loadCategories(stageName, 1)}
          onCategoryClick={loadDetails}
        />

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-medium text-red-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Section header ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight">
              Stage &amp; subgroup breakdown
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {stages.totalRecords > 0
                ? `${stages.totalRecords.toLocaleString()} total records · ${stages.rows.length} stage${stages.rows.length !== 1 ? "s" : ""}`
                : "Records grouped by stage and subgroup"
              }
            </p>
          </div>
          {!stagesLoading && stages.rows.length > 0 && (
            <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${phaseConfig.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${phaseConfig.dot}`} />
              {phaseConfig.label}
            </span>
          )}
        </div>

        {/* ── Main table card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {stagesLoading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : stages.rows.length === 0 ? (
            <EmptyState
              title="No stages found"
              subtitle="Try adjusting the date range or user filter."
            />
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-slate-100 bg-slate-50/80">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Report group</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Records</span>
              </div>

              <div className="divide-y divide-slate-100">
                {stages.rows.map((stageRow, idx) => {
                  const stageName = stageRow.stage;
                  const isStageOpen = categories.openStage === stageName;
                  const count = getCount(stageRow);

                  return (
                    <div key={stageName}>

                      {/* ── Stage row ── */}
                      <div
                        onClick={() => loadCategories(stageName, 1)}
                        className={`group flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors sm:px-6 sm:py-4 ${isStageOpen ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                          }`}
                      >
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 text-sm capitalize">{stageName}</p>
                            <p className="truncate text-xs text-slate-400 mt-0.5">{phaseConfig.label} stage</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                          <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border tabular-nums sm:px-3 ${phaseConfig.badge}`}>
                            {count.toLocaleString()}
                          </span>
                          <span className={`w-8 h-8 shrink-0 rounded-xl border flex items-center justify-center transition-all ${isStageOpen
                            ? "bg-slate-100 border-slate-200"
                            : "bg-white border-slate-200 group-hover:border-slate-300"
                            }`}>
                            {isStageOpen
                              ? <ChevronUp size={13} className="text-slate-500" />
                              : <ChevronDown size={13} className="text-slate-400" />
                            }
                          </span>
                        </div>
                      </div>

                      {/* ── Category accordion ── */}
                      {isStageOpen && (
                        <div className="bg-[#fafafa] border-t border-slate-100">
                          {catsLoading ? (
                            <div className="px-6 py-4 flex items-center gap-2 text-xs text-slate-400">
                              <Loader2 size={13} className="animate-spin" /> Loading categories…
                            </div>
                          ) : categories.rows.length === 0 ? (
                            <p className="px-6 py-4 text-xs text-slate-400">No categories found for this stage.</p>
                          ) : (
                            <>
                              {/* Category sub-header */}
                              <div className="grid grid-cols-[1fr_auto] px-6 py-2.5 border-b border-slate-100">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-[calc(1rem+1px)]">Subgroup</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Records</span>
                              </div>

                              {categories.rows.map((catRow) => {
                                const catName = catRow.category;
                                const isCatOpen = details.openCategory === catName;
                                const catCount = getCount(catRow);

                                return (
                                  <div key={catName} className="border-b border-slate-100 last:border-b-0">

                                    {/* ── Category row ── */}
                                    <div
                                      onClick={() => loadDetails(stageName, catName)}
                                      className={`flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors sm:px-6 ${isCatOpen ? "bg-white" : "hover:bg-white/70"
                                        }`}
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${phaseConfig.dot} opacity-50`} />
                                        <span className="truncate text-sm font-medium text-slate-700">{catName}</span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2.5">
                                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                                          {catCount.toLocaleString()}
                                        </span>
                                        {isCatOpen
                                          ? <ChevronUp size={13} className="text-slate-400" />
                                          : <ChevronDown size={13} className="text-slate-300" />
                                        }
                                      </div>
                                    </div>

                                    {/* ── Detail table ── */}
                                    {isCatOpen && (
                                      <div className="bg-white border-t border-slate-100">
                                        {detsLoading ? (
                                          <div className="px-8 py-4 flex items-center gap-2 text-xs text-slate-400">
                                            <Loader2 size={13} className="animate-spin" /> Loading records…
                                          </div>
                                        ) : details.rows.length === 0 ? (
                                          <p className="px-8 py-4 text-xs text-slate-400">No records found.</p>
                                        ) : (
                                          <>
                                            <div className="overflow-x-auto">
                                              <table className="w-full min-w-[640px] text-xs">
                                                <thead>
                                                  <tr className="border-b border-slate-100 bg-slate-50/60">
                                                    <th className="text-left px-6 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Sender</th>
                                                    <th className="text-left px-6 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                                                    <th className="text-left px-6 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                                                    <th className="text-left px-6 py-2.5 font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                  {details.rows.map((record, rIdx) => (
                                                    <tr key={record.id || record.message_id || rIdx} className="hover:bg-slate-50/60 transition-colors">
                                                      <td className="px-6 py-3 text-slate-700 font-medium">{record.sender_email || "—"}</td>
                                                      <td className="px-6 py-3">
                                                        {record.action
                                                          ? <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium">{record.action}</span>
                                                          : <span className="text-slate-300">—</span>
                                                        }
                                                      </td>
                                                      <td className="px-6 py-3 text-slate-500 max-w-[220px] truncate">{record.description || "—"}</td>
                                                      <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-mono">{record.date_entered || "—"}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                            <ReportPagination
                                              compact
                                              pageIndex={details.pageIndex}
                                              pageCount={details.pageCount}
                                              onChange={(p) => loadDetails(stageName, catName, p)}
                                            />
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Category-level pagination */}
                              <ReportPagination
                                compact
                                pageIndex={categories.pageIndex}
                                pageCount={categories.pageCount}
                                onChange={(p) => loadCategories(stageName, p)}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stage-level pagination */}
              <ReportPagination
                pageIndex={stages.pageIndex}
                pageCount={stages.pageCount}
                onChange={(p) => loadStages(p)}
              />
            </>
          )}
        </div>

        {/* ── Grand total ── */}
        {!stagesLoading && stages.rows.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-b from-sidebar-primary from-0% via-sidebar-primary via-2% to-sidebar-secondary to-100% px-7 py-5 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Layers size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Grand Total</p>
                <p className="truncate text-xs text-slate-400 mt-0.5">{phaseConfig.label} · all stages</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white tracking-tight tabular-nums leading-none sm:text-4xl">
                {grandTotal.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {stages.rows.length} stage{stages.rows.length !== 1 ? "s" : ""}
                {stages.pageCount > 1 && ` · page ${stages.pageIndex}/${stages.pageCount}`}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
