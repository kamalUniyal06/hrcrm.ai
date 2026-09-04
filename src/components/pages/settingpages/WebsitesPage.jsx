import { motion as Motion, AnimatePresence } from "framer-motion";
import { createElement } from "react";
import {
  Edit3,
  Trash2,
  ExternalLink,
  Globe,
  Tag,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Activity,
  FileText,
  Link2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BadgeInfo,
  Layers3,
  Sparkles,
  MapPin,
  Upload,
  X,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loading from "../../Loading";
import Header from "./Header";
import ErrorBox from "./ErrorBox";
import EditWebSite from "./EditWebSite";
import { useSelector, useDispatch } from "react-redux";
import {
  createWebsite,
  deleteWebsite,
  getManageWeb,
  updateWebsite,
  webManagerAction,
} from "../../../store/Slices/webManager.js";
import { toast } from "react-toastify";
import { fetchGpc } from "../../../services/api";
import {
  ONBOARDING_STEP,
  getOnboardingRecordName,
  upsertOnboardingProgress,
} from "../../../utils/onboardingCompletion.js";

/* ─── helpers ───────────────────────────────────────────────── */
const getDomain = (raw) => {
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const { hostname } = new URL(withProtocol);
    return hostname.replace(/^www\./i, "");
  } catch {
    return String(raw)
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0];
  }
};
const getFullUrl = (raw) =>
  !raw ? "" : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
const getFavicon = (domain) =>
  domain
    ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`
    : "";
const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num)
    ? null
    : num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v.trim());
const cleanValue = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const spamColor = (score) => {
  if (score === null)
    return { bg: "#f1f5f9", text: "#94a3b8", border: "#e2e8f0" };
  const n = Number(score);
  if (Number.isNaN(n))
    return { bg: "#f1f5f9", text: "#94a3b8", border: "#e2e8f0" };
  if (n <= 5) return { bg: "#ecfdf5", text: "#059669", border: "#6ee7b7" };
  if (n <= 30) return { bg: "#fffbeb", text: "#d97706", border: "#fcd34d" };
  return { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" };
};

/* ─── Stat pill ─────────────────────────────────────────────── */
const Pill = ({ label, value, accent = "#6366f1" }) => (
  <div
    style={{ borderColor: `${accent}25`, background: `${accent}08` }}
    className="rounded-xl border p-2.5 text-center"
  >
    <div
      className="text-[9px] uppercase tracking-widest font-bold mb-1"
      style={{ color: accent }}
    >
      {label}
    </div>
    <div className="text-base font-black text-gray-900 leading-none">
      {value ?? "—"}
    </div>
  </div>
);

/* ─── Row detail for the expanded drawer ───────────────────── */
const DrawerRow = ({ icon, label, value }) => {
  const cleaned = cleanValue(value);
  const linked = cleaned && isUrl(cleaned);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        {createElement(icon, { size: 12 })}
        {label}
      </div>
      {cleaned ? (
        linked ? (
          <a
            href={cleaned}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1"
          >
            Open <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-xs font-semibold text-gray-800 text-right max-w-[55%] break-all">
            {cleaned}
          </span>
        )
      ) : (
        <span className="text-xs text-gray-300">—</span>
      )}
    </div>
  );
};

/* ─── Import CSV Component ──────────────────────────────────── */
/* ─── Import CSV Component ──────────────────────────────────── */
function ImportCSV({ onImportSuccess }) {
  const [step, setStep] = useState("idle");
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const fileRef = useRef(null);

  /* Fields to hide — system/internal only */
  const SKIP_FIELDS = new Set([
    "id",
    "date_entered",
    "date_modified",
    "modified_user_id",
    "modified_by_name",
    "created_by",
    "created_by_name",
    "deleted",
    "created_by_link",
    "modified_user_link",
    "assigned_user_id",
    "assigned_user_name",
    "assigned_user_link",
    "description",
    "li_count",
    "gp_count",
  ]);

  /* Derive the mappable fields from available_fields in the API response */
  const getMappableFields = (availableFields = {}) =>
    Object.entries(availableFields)
      .filter(([key]) => !SKIP_FIELDS.has(key))
      .map(([key, meta]) => ({
        key,
        label: meta.label
          /* Convert LBL_NON_BRAND_MINIMUM_AMOUNT → Non Brand Minimum Amount */
          .replace(/^LBL_/, "")
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        required: meta.required,
        type: meta.type,
      }));

  const reset = () => {
    setStep("idle");
    setFile(null);
    setPreviewData(null);
    setMapping({});
    setImportResult(null);
    setError(null);
    fileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Step 1: upload CSV, get column headers + available_fields ── */
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are allowed.");
      setStep("error");
      return;
    }
    setError(null);
    setFile(selected);
    fileRef.current = selected;
    setStep("previewing");

    try {
      const formData = new FormData();
      formData.append("file", selected, selected.name);

      const json = await fetchGpc({
        method: "POST",
        params: { type: "get_json" },
        body: formData,
      });
      if (!json.success) throw new Error(json.message || json.error || "Preview failed");

      setPreviewData(json);

      /* Auto-map: if a CSV column name exactly matches a field label, pre-select it */
      const fields = getMappableFields(json.available_fields);
      const autoMap = {};
      fields.forEach((f) => {
        if (json.data?.includes(f.label)) autoMap[f.key] = f.label;
        else if (json.data?.includes(f.key)) autoMap[f.key] = f.key;
      });
      setMapping(autoMap);

      setStep("mapping");
    } catch (err) {
      setError(err.message || "Failed to read CSV. Please try again.");
      setStep("error");
    }
  };

  /* ── Step 2: post file + mapping ── */
  const handleImport = async () => {
    const currentFile = fileRef.current;
    if (!currentFile) return;
    setStep("importing");
    setError(null);

    try {
      const freshFile = new File([currentFile], currentFile.name, {
        type: "text/csv",
      });

      const formData = new FormData();
      formData.append("file", freshFile, freshFile.name);
      formData.append(
        "data",
        new Blob([JSON.stringify(mapping)], { type: "text/plain" }),
      );

      const json = await fetchGpc({
        method: "POST",
        params: { type: "get_json", upload: 1 },
        body: formData,
      });
      if (!json.success) throw new Error(json.message || json.error || "Import failed");

      setImportResult(json);
      setStep("done");
      onImportSuccess?.();
    } catch (err) {
      setError(err.message || "Import failed. Please try again.");
      setStep("mapping");
    }
  };

  const updateMapping = (fieldKey, csvCol) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (csvCol) next[fieldKey] = csvCol;
      else delete next[fieldKey];
      return next;
    });
  };

  const showModal = step !== "idle";
  const mappableFields = previewData ? getMappableFields(previewData.available_fields) : [];
  const csvColumns = previewData?.data ?? [];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={step === "mapping" || step === "importing"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 transition-all disabled:opacity-50"
      >
        <Upload size={14} />
        Import CSV
      </button>

      <AnimatePresence>
        {showModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />

              {/* Modal header */}
              <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Upload size={13} className="text-indigo-500" />
                  </div>
                  <span className="text-sm font-black text-gray-900">
                    {step === "mapping" ? "Map CSV Columns" : "Import Websites"}
                  </span>
                  {step === "mapping" && previewData && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
                      {previewData.total_rows} rows
                    </span>
                  )}
                </div>
                <button
                  onClick={reset}
                  disabled={step === "importing"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-30"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5">
                {error && (
                  <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-semibold">
                    <ShieldAlert size={13} className="mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* ── Loading preview ── */}
                {step === "previewing" && (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <RefreshCw size={20} className="text-indigo-500 animate-spin" />
                    </div>
                    <p className="text-sm font-black text-gray-800">Reading CSV…</p>
                    <p className="text-xs text-gray-400 mt-1">Fetching column info</p>
                  </div>
                )}

                {/* ── Mapping step ── */}
                {step === "mapping" && previewData && (
                  <>
                    {/* file chip */}
                    {file && (
                      <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                        <FileText size={16} className="text-indigo-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-indigo-700 truncate">{file.name}</div>
                          <div className="text-[10px] text-indigo-400 font-medium">
                            {(file.size / 1024).toFixed(1)} KB · {previewData.total_rows} rows · {mappableFields.length} mappable fields
                          </div>
                        </div>
                      </div>
                    )}

                    {/* column headers row */}
                    <div className="grid grid-cols-[1fr_16px_1fr] gap-2 px-1 mb-1.5">
                      <div className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Field</div>
                      <div />
                      <div className="text-[9px] uppercase tracking-widest font-bold text-gray-400">CSV Column</div>
                    </div>

                    {/* scrollable field list */}
                    <div className="space-y-1.5 mb-4 max-h-72 overflow-y-auto pr-1">
                      {mappableFields.map((f) => (
                        <div
                          key={f.key}
                          className={`grid grid-cols-[1fr_16px_1fr] items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                            mapping[f.key]
                              ? "border-indigo-200 bg-indigo-50/60"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          {/* field info */}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                              {f.label}
                              {f.required && (
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-wide">*req</span>
                              )}
                            </div>
                            <div className="text-[9px] text-gray-400 font-mono truncate">{f.key}</div>
                          </div>

                          {/* arrow */}
                          <ChevronDown size={10} className="text-gray-300 mx-auto" />

                          {/* csv column selector */}
                          <select
                            value={mapping[f.key] ?? ""}
                            onChange={(e) => updateMapping(f.key, e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent truncate"
                          >
                            <option value="">— skip —</option>
                            {csvColumns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* mapped count */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">
                        {Object.keys(mapping).length} of {mappableFields.length} fields mapped
                      </span>
                      {Object.keys(mapping).length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Ready to import
                        </span>
                      )}
                    </div>

                    {/* mapping JSON preview (collapsible) */}
                    <details className="mb-4 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                      <summary className="text-[9px] uppercase tracking-widest font-bold text-gray-400 px-3 py-2 cursor-pointer select-none hover:text-gray-600">
                        Preview mapping JSON
                      </summary>
                      <pre className="text-[10px] font-mono text-gray-600 px-3 pb-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(mapping, null, 2)}
                      </pre>
                    </details>

                    <div className="flex gap-2">
                      <button
                        onClick={reset}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={Object.keys(mapping).length === 0}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
                      >
                        Import {previewData.total_rows} Websites
                      </button>
                    </div>
                  </>
                )}

                {/* ── Importing ── */}
                {step === "importing" && (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <RefreshCw size={20} className="text-indigo-500 animate-spin" />
                    </div>
                    <p className="text-sm font-black text-gray-800">Importing websites…</p>
                    <p className="text-xs text-gray-400 mt-1">Please wait a moment</p>
                  </div>
                )}

                {/* ── Error ── */}
                {step === "error" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
                      Close
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 active:scale-95 transition-all">
                      Try Again
                    </button>
                  </div>
                )}

                {/* ── Done ── */}
                {step === "done" && importResult && (
                  <div className="py-4 text-center">
                    <Motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3"
                    >
                      <CheckCircle size={26} className="text-emerald-500" />
                    </Motion.div>
                    <p className="text-sm font-black text-gray-800">Import Successful!</p>
                    <p className="text-xs text-gray-400 mt-1 mb-5">
                      {importResult.count} website{importResult.count !== 1 ? "s" : ""} imported successfully
                    </p>
                    <button onClick={reset} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 active:scale-95 transition-all">
                      Done
                    </button>
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Main Card ─────────────────────────────────────────────── */
function WebCard({
  item,
  onEdit,
  onDelete,
  onRefresh,
  refreshingId,
  updating,
  deleting,
  deleteWebsiteId,
}) {
  const [expanded, setExpanded] = useState(false);

  const rawName = item.name || item.website || "";
  const domain = getDomain(rawName);
  const fullUrl = getFullUrl(rawName);
  const favicon = getFavicon(domain);

  const minRaw = item.minAmount ?? item.minimum_price;
  const maxRaw = item.maxAmount ?? item.amount;
  const nonBrandMinRaw = item.non_brand_minimum_amount;
  const nonBrandMaxRaw = item.non_brand_maximum_amount;
  const minStr = formatMoney(minRaw);
  const avgRaw = item.average_amount;
  const avgNonBrandRaw = item.non_brand_average_amount;
  const nonBrandAvgRaw = item.non_brand_average_amount;
  const avgStr = formatMoney(avgRaw);
  const maxStr = formatMoney(maxRaw);
  const minNum = Number(minRaw);
  const maxNum = Number(maxRaw);
  const hasRange =
    !Number.isNaN(minNum) &&
    !Number.isNaN(maxNum) &&
    maxNum > 0 &&
    maxNum >= minNum;
  const avg = hasRange ? (minNum + maxNum) / 2 : null;

  const da = cleanValue(item.da);
  const pa = cleanValue(item.pa);
  const drRaw = cleanValue(item.dr);
  const drIsLink = drRaw && isUrl(drRaw);
  const spam = cleanValue(item.spam_score);
  const traffic = cleanValue(item.traffic);
  const gpCount = cleanValue(item.gp_count);
  const liCount = cleanValue(item.li_count);
  const spamC = spamColor(spam);
  const isDeleted = item.deleted === "1";

  return (
    <Motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 flex flex-col overflow-hidden transition-all duration-300 group"
    >
      {/* accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: isDeleted
            ? "linear-gradient(90deg,#f43f5e,#fb923c)"
            : "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)",
        }}
      />

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* favicon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
          {favicon ? (
            <>
              <img
                src={favicon}
                alt=""
                className="w-6 h-6"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling &&
                    (e.currentTarget.nextSibling.style.display = "flex");
                }}
              />
              <Globe
                size={16}
                className="text-indigo-400"
                style={{ display: "none" }}
              />
            </>
          ) : (
            <Globe size={16} className="text-indigo-400" />
          )}
        </div>

        {/* title + url */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className="text-sm font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors leading-tight"
              title={domain || rawName}
            >
              {domain || rawName || "Untitled"}
            </h2>
            {/* status badge */}
            <span
              className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                isDeleted
                  ? "bg-red-50 text-red-500 border-red-200"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
              }`}
            >
              {isDeleted ? "Deleted" : "Active"}
            </span>
          </div>

          {/* slug + spam inline */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              <Tag size={9} />
              {item.slug || "no-slug"}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{
                background: spamC.bg,
                color: spamC.text,
                borderColor: spamC.border,
              }}
            >
              <ShieldAlert size={9} />
              Spam {spam !== null ? `${spam}%` : "—"}
            </span>
            {fullUrl && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors"
              >
                <ExternalLink size={9} />
                Visit
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── DA / PA / DR ── */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-3">
        <Pill label="DA" value={da} accent="#6366f1" />
        <Pill label="PA" value={pa} accent="#8b5cf6" />
        <div
          style={{ borderColor: "#06b6d415", background: "#06b6d408" }}
          className="rounded-xl border p-2.5 text-center"
        >
          <div className="text-[9px] uppercase tracking-widest font-bold mb-1 text-cyan-500">
            DR
          </div>
          {drIsLink ? (
            <a
              href={drRaw}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black text-cyan-500 hover:underline flex items-center justify-center gap-1"
            >
              Check <ExternalLink size={9} />
            </a>
          ) : (
            <div className="text-base font-black text-gray-900 leading-none">
              {drRaw ?? "—"}
            </div>
          )}
        </div>
      </div>

      {/* ── Traffic / GP / LI ── */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-3">
        {[
          { icon: Activity, label: "Traffic", value: traffic },
          { icon: FileText, label: "GP", value: gpCount },
          { icon: Link2, label: "LI", value: liCount },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-1">
              {createElement(icon, { size: 9 })}
              {label}
            </div>
            <div className="text-sm font-black text-gray-800">
              {value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Price Range ── */}
      <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50 to-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
            Price Range (Brand)
          </span>
          {avg !== null && (
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5">
              <DollarSign size={9} />
              avg ${formatMoney(avg)}
            </span>
          )}
        </div>
  <div className="grid grid-cols-3 gap-4 text-center">
  {/* Min */}
  <div>
    <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-wide">
      <TrendingDown size={9} />
      Final
    </div>
    <div className="text-lg font-black text-gray-900">
      {minStr !== null ? `$${minStr}` : "—"}
    </div>
  </div>

  {/* Mid */}
  <div className="border-x border-gray-200 px-2">
    <div className="flex items-center justify-center gap-1 text-[9px] text-cyan-600 font-bold uppercase tracking-wide">
      <DollarSign size={9} />
      Closure
    </div>
    <div className="text-lg font-black text-gray-900">
      {avgStr !== null ? `$${avgStr}` : "—"}
    </div>
  </div>

  {/* Max */}
  <div>
    <div className="flex items-center justify-center gap-1 text-[9px] text-indigo-600 font-bold uppercase tracking-wide">
      Start
      <TrendingUp size={9} />
    </div>
    <div className="text-lg font-black text-gray-900">
      {maxStr !== null ? `$${maxStr}` : "—"}
    </div>
  </div>
</div>
      </div>

            {/* ──Non-Brand Price Range ── */}
      <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gradient-to-br from-slate-50 to-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
            Price Range (Non-Brand)
          </span>
          {nonBrandAvgRaw !== null && (
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5">
              <DollarSign size={9} />
              avg ${formatMoney(nonBrandAvgRaw)}
            </span>
          )}
        </div>
  <div className="grid grid-cols-3 gap-4 text-center">
  {/* Min */}
  <div>
    <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-wide">
      <TrendingDown size={9} />
      Final
    </div>
    <div className="text-lg font-black text-gray-900">
      {nonBrandMinRaw !== null ? `$${formatMoney(nonBrandMinRaw)}` : "—"}
    </div>
  </div>

  {/* Mid */}
  <div className="border-x border-gray-200 px-2">
    <div className="flex items-center justify-center gap-1 text-[9px] text-cyan-600 font-bold uppercase tracking-wide">
      <DollarSign size={9} />
      Closure
    </div>
    <div className="text-lg font-black text-gray-900">
      {nonBrandAvgRaw !== null ? `$${formatMoney(nonBrandAvgRaw)}` : "—"}
    </div>
  </div>

  {/* Max */}
  <div>
    <div className="flex items-center justify-center gap-1 text-[9px] text-indigo-600 font-bold uppercase tracking-wide">
      Start
      <TrendingUp size={9} />
    </div>
    <div className="text-lg font-black text-gray-900">
      {nonBrandMaxRaw !== null ? `$${formatMoney(nonBrandMaxRaw)}` : "—"}
    </div>
  </div>
</div>
      </div>

      {/* ── Expandable Details ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mx-4 mb-3 flex items-center justify-between w-[calc(100%-2rem)] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-500 transition-colors py-1"
      >
        <span className="flex items-center gap-1.5 text-gray-900">
          <Sparkles size={11} />
          Additional Details
        </span>
        {expanded ? (
          <ChevronUp className="text-gray-900" size={13} />
        ) : (
          <ChevronDown className="text-gray-900" size={13} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <Motion.div
            key="drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden px-4 pb-2"
          >
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-1">
              <DrawerRow
                icon={BadgeInfo}
                label="Categories"
                value={item.category}
              />
              <DrawerRow icon={MapPin} label="Country" value={item.country} />
              <DrawerRow icon={Layers3} label="Premium" value={item.premium} />
              <DrawerRow
                icon={Activity}
                label="Google Traffic"
                value={item.google_traffic}
              />
              <DrawerRow
                icon={Activity}
                label="Ahrefs Traffic"
                value={item.ahref_traffic}
              />
              <DrawerRow
                icon={Activity}
                label="Semrush Traffic"
                value={item.semrush_traffic}
              />
              <DrawerRow
                icon={DollarSign}
                label="Non-Brand Min"
                value={item.non_brand_minimum_amount}
              />
              <DrawerRow
                icon={DollarSign}
                label="Non-Brand Max"
                value={item.non_brand_maximum_amount}
              />
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ── */}
      <div className="mt-auto px-4 py-3 border-t border-gray-50 bg-gray-50/60 flex items-center justify-end gap-2">
        {/* Refresh */}
        <button
          onClick={() => onRefresh(item)}
          disabled={
            refreshingId === item.id ||
            (updating && refreshingId !== item.id) ||
            deleting
          }
          title="Refresh"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 active:scale-95 transition-all disabled:opacity-40"
        >
          <RefreshCw
            size={13}
            className={refreshingId === item.id ? "animate-spin" : ""}
          />
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(item)}
          disabled={updating || deleting}
          title="Edit"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-all disabled:opacity-40"
        >
          <Edit3 size={13} />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(item)}
          disabled={deleteWebsiteId === item.id || deleting}
          title="Delete"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 active:scale-95 transition-all disabled:opacity-40"
        >
          {deleteWebsiteId === item.id ? (
            <span className="text-[10px] font-bold text-red-400">...</span>
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </div>
    </Motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function WebsitesPage() {
  const [editItem, setEditItem] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const openedOnboardingCreate = useRef(false);
  const onboardingCreateSubmitted = useRef(false);
  const isOnboardingStep3 = searchParams.get("onboarding") === "step3";

  const {
    websites,
    loading,
    error,
    message,
    creating,
    updating,
    deleting,
    deleteWebsiteId,
  } = useSelector((state) => state.webManager);
  const { user, businessEmail, crmEndpoint } = useSelector(
    (state) => state.user,
  );
  const onboardingRecordName = getOnboardingRecordName({
    user,
    businessEmail,
  });
  const dispatch = useDispatch();

  const handleCreate = (updatedItem) => {
    if (isOnboardingStep3) {
      onboardingCreateSubmitted.current = true;
    }
    dispatch(createWebsite(updatedItem));
  };
  const handleUpdate = (updatedItem) => dispatch(updateWebsite(updatedItem));

  const handleDelete = (item) => {
    const websiteName = item.website_name || item.name || item.website;
    if (!window.confirm(`Are you sure you want to delete ${websiteName}?`))
      return;
    dispatch(deleteWebsite(item));
  };

  const handleRefresh = (item) => {
    if (refreshingId) return;
    setRefreshingId(item.id);
    dispatch(
      updateWebsite(item, {
        idOnly: true,
        successMessage: "Website refreshed successfully",
        failureMessage: "Website refresh failed",
      }),
    );
  };

  useEffect(() => {
    if (!updating && refreshingId) setRefreshingId(null);
  }, [updating, refreshingId]);

  useEffect(() => {
    dispatch(getManageWeb());
  }, [dispatch]);

  useEffect(() => {
    if (
      isOnboardingStep3 &&
      searchParams.get("create") === "website" &&
      !openedOnboardingCreate.current
    ) {
      openedOnboardingCreate.current = true;
      setEditItem({ type: "new" });
    }
  }, [isOnboardingStep3, searchParams]);

  useEffect(() => {
    if (!message) return;
    toast.success(message);
    if (onboardingCreateSubmitted.current) {
      onboardingCreateSubmitted.current = false;
      upsertOnboardingProgress({
        crmEndpoint,
        name: onboardingRecordName,
        step: ONBOARDING_STEP.WEBSITE_ADDED,
      }).catch((err) => {
        console.error("Failed to update onboarding website step:", err);
      });
      window.dispatchEvent(
        new CustomEvent("guestpostcrm:first-sync", {
          detail: {
            websiteDone: true,
            onboardingStep: ONBOARDING_STEP.WEBSITE_ADDED,
          },
        }),
      );
      navigate("/profile?step=5");
    }
    dispatch(webManagerAction.clearAllMessages());
  }, [
    crmEndpoint,
    dispatch,
    message,
    navigate,
    onboardingRecordName,
  ]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    dispatch(webManagerAction.clearAllErrors());
  }, [dispatch, error]);

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      {/* ── Page Header Row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Header
          text="Website Manager"
          handleCreate={() => setEditItem({ type: "new" })}
        />
        <ImportCSV onImportSuccess={() => dispatch(getManageWeb())} />
      </div>

      {loading && <Loading text="Websites" />}

      {error && (
        <ErrorBox message={error} onRetry={() => dispatch(getManageWeb())} />
      )}

      {!loading && !error && websites.length === 0 && (
        <div className="mt-8 text-center py-16 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
          <Globe size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">No websites yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your first website to get started.
          </p>
        </div>
      )}

      {!loading && websites.length > 0 && (
        <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {websites.map((item, i) => (
            <Motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.04,
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <WebCard
                item={item}
                onEdit={setEditItem}
                onDelete={handleDelete}
                onRefresh={handleRefresh}
                refreshingId={refreshingId}
                updating={updating}
                deleting={deleting}
                deleteWebsiteId={deleteWebsiteId}
              />
            </Motion.div>
          ))}
        </div>
      )}

      <EditWebSite
        item={editItem}
        onClose={() => setEditItem(null)}
        handleUpdate={handleUpdate}
        handleCreate={handleCreate}
        saving={creating || updating}
      />
    </div>
  );
}
