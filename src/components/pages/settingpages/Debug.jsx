import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { http } from "../../../services/api.js";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import PromptViewer from "../../PromptViewer.jsx";
import PromptSectionsViewer from "../../PromptViewer.jsx";
import Header from "./Header.jsx";
import PromptExplorer from "./PromptExplorer.jsx";

const getToday = () => new Date().toISOString().split("T")[0];

const TABS = [
  { key: "error", label: "Error Logs", module: "outr_error_logs" },

  {
    key: "gpc",
    label: "GPC Request / Response",
    module: "outr_request_and_response",
  },

  {
    key: "api",
    label: "API Request / Response",
    module: "outr_request_and_response",
  },

  { key: "prompt", label: "Prompt Ledger", module: "outr_prompt_ledger" },

  { key: "logger", label: "Logger", module: "outr_global_logger" },

  {
    key: "prompt_testing",
    label: "Prompt Testing",
    module: "outr_prompt_testing",
    disabled: false,
  },

  {
    key: "process_audit",
    label: "Process Audit",
    module: "outr_el_process_audit",
    disabled: false,
  },

  {
    key: "ml",
    label: "Machine Learning",
    module: "outr_machine_learning",
    disabled: false,
  },
  {
    key: "self_test",
    label: "Self Test",
    module: "outr_self_test",
    disabled: false,
  },
  {
    key: "data_modelling",
    label: "Data Modelling",
    disabled: false,
  },
  {
    key: "prompt_explorer",
    label: "Prompt Explorer",
    disabled: false,
  },
];

const IMPORTANT_COLUMNS = {
  error: ["name", "log_level", "description", "error_status"],
  api: ["date_entered", "request", "response"],
  gpc: ["date_entered", "request", "response"],
  prompt: ["date_entered", "response", "full_prompt"],
  logger: ["date_entered", "name", "description"],
  process_audit: [
    "date_entered",
    "from_email_c",
    "name",
    "message_id",
    "history_id",
  ],
};

const HIDDEN_FIELDS = [
  "id",
  "modified_user_id",
  "created_by",
  "deleted",
  "parent_type",
  "assigned_user_id",
  "date_modified",
  "static_prompt",
  "name",
  "date_entered",
  "prompt_id",
  "parent_id",
  "system_prompt",
  "user_prompt",
];

const TIME_FILTERS = [
  { label: "All", value: "all" },
  { label: "Last 1 Min", value: 1 },
  { label: "Last 5 Min", value: 5 },
  { label: "Last 10 Min", value: 10 },
];

const Debug = () => {
  const handleRowClick = (row) => {
    const messageId = row.message_id;
    const recordId = row.id;

    const url = `https://testcrm.guestpostcrm.com/index.php?entryPoint=handle_push_notification&message_id=${messageId}&test_now=${recordId}`;

    window.open(url, "_blank");

    setSelectedRecord(row);
  };
  const { state } = useLocation();
  const navigateTo = useNavigate();

  const getInitialTab = () => {
    if (!state?.prompt) return TABS[0];

    return TABS[3];
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [timeline, setTimeline] = useState("all");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [emailSearch, setEmailSearch] = useState("");
  const getPromptStats = (text) => {
    if (!text) return { words: 0, lines: 0 };

    const cleaned = text.trim();

    const words = cleaned.split(/\s+/).filter(Boolean).length;
    const lines = cleaned.split(/\n/).length;

    return { words, lines };
  };

  const modalRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [data, setData] = useState([]);
  const [dropdownLists, setDropdownLists] = useState({});
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    perPage: 200,
    totalPages: 1,
  });

  const columns = useMemo(() => {
    return IMPORTANT_COLUMNS[activeTab.key] || [];
  }, [activeTab]);

  const refetch = useCallback(async () => {
    if (!activeTab.module) return;

    setLoading(true);
    setError(null);

    try {
      const response = await http({
        method: "POST",
        body: {
          action: "fetch",
          module: activeTab.module,
          search: emailSearch.trim() || undefined,
          search_fields: columns,
          order_by: "date_entered",
          order_dir: "DESC",
          page: 1,
          per_page: 200,
        },
      });

      setData(Array.isArray(response?.records) ? response.records : []);
      setDropdownLists(response?.dropdown_lists || {});
      setPagination({
        total: response?.total || 0,
        page: response?.page || 1,
        perPage: response?.per_page || 200,
        totalPages: response?.total_pages || 1,
      });
    } catch (err) {
      setError(err);
      setData([]);
      setDropdownLists({});
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [activeTab.module, columns, emailSearch]);

  const updateErrorStatus = async (row, nextStatus) => {
    if (!row?.id || !nextStatus || nextStatus === row.error_status) return;

    const previousData = data;
    const previousSelectedRecord = selectedRecord;

    setUpdatingStatusId(row.id);
    setError(null);
    setData((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, error_status: nextStatus } : item,
      ),
    );
    if (selectedRecord?.id === row.id) {
      setSelectedRecord((prev) =>
        prev ? { ...prev, error_status: nextStatus } : prev,
      );
    }

    try {
      await http({
        method: "POST",
        body: {
          action: "update",
          module: "outr_error_logs",
          id: row.id,
          data: {
            error_status: nextStatus,
          },
        },
      });
    } catch (err) {
      setError(err);
      setData(previousData);
      setSelectedRecord(previousSelectedRecord);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  useEffect(() => {
    if (activeTab.key !== "prompt") return;
    if (state?.prompt)
      setSelectedRecord(data?.find((p) => p.id == state?.prompt));
  }, [loading, data, state?.prompt, activeTab]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /* CLICK OUTSIDE MODAL */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (state?.prompt) navigateTo(-1);
        setSelectedRecord(null);
      }
    };

    if (selectedRecord) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRecord]);

  /* ESC CLOSE */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (state?.prompt) navigateTo(-1);
        setSelectedRecord(null);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const truncate = (text, limit = 80) => {
    if (!text) return "-";
    return text.length > limit ? text.substring(0, limit) + "..." : text;
  };
  const splitPrompt = (fullPrompt) => {
    if (!fullPrompt) return { system: "", user: "" };

    const separator =
      "----------------------------------------------------------------------";

    if (fullPrompt.includes(separator)) {
      const parts = fullPrompt
        .split(separator)
        .map((p) => p.trim())
        .filter(Boolean);

      const system = parts[0] || "";
      // All remaining sections joined back with separator
      const user = parts.slice(1).join(`\n\n${separator}\n\n`) || "";

      return { system, user };
    }

    return { system: fullPrompt.trim(), user: "" };
  };

  const isLargeField = (key) => {
    return ["request", "response", "full_prompt", "description"].includes(key);
  };

  /* FILTERING LOGIC */
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data?.filter((row) => {
      const searchTerm = emailSearch.trim().toLowerCase();

      /* SEARCH */
      if (
        searchTerm &&
        !columns.some((column) =>
          String(row[column] ?? "")
            .toLowerCase()
            .includes(searchTerm),
        )
      ) {
        return false;
      }

      if (!row.date_entered) return true;

      const parsed = row.date_entered.replace(" ", "T");
      const rowDate = new Date(parsed);

      if (isNaN(rowDate)) return true;

      const now = new Date();

      /* TIMELINE FILTER */
      if (timeline !== "all") {
        const diffMinutes = (now - rowDate) / 60000;
        if (diffMinutes > timeline) return false;
      }

      /* DATE FILTER */
      if (selectedDate) {
        const selected = new Date(selectedDate);

        if (
          rowDate.getFullYear() !== selected.getFullYear() ||
          rowDate.getMonth() !== selected.getMonth() ||
          rowDate.getDate() !== selected.getDate()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, timeline, selectedDate, emailSearch, columns]);

  const parseAndDecode = (val) => {
    let parsed = val;

    // STEP 1: Parse JSON safely (even double encoded)
    try {
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {}

    let content = parsed?.reply || parsed;

    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }

    // STEP 2: Remove all escape junk
    content = content
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
      .replace(/\\\\/g, "")
      .replace(/\s*\\\s*/g, ""); // removes \ \ garbage

    // STEP 3: REMOVE ALL BROKEN HTML TAGS
    content = content.replace(/<\/?[^>]+(>|$)/g, "");

    // STEP 4: Clean structure manually
    content = content
      .replace(/Hi\s+/i, "Hi ")
      .replace(/Please share:/i, "\n\nPlease share:\n")
      .replace(/Best regards,/i, "\n\nBest regards,\n")
      .replace(/Admin/i, "Admin\n")
      .replace(/OutrightCRM/i, "OutrightCRM");

    // STEP 5: Fix bullet points
    content = content
      .replace(/3–5 topic ideas/g, "\n• 3–5 topic ideas")
      .replace(/Your preferred target URL/g, "\n• Your preferred target URL")
      .replace(/Any key requirements/g, "\n• Any key requirements");

    return content.trim();
  };

  const decodeHTML = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const formatJSON = (val) => {
    try {
      return typeof val === "string"
        ? JSON.stringify(JSON.parse(val), null, 2)
        : JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  const formatColumnLabel = (column) => column.replace(/_/g, " ").toUpperCase();

  const controlClass =
    "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const totalRecords = pagination.total || data?.length || 0;
  const errorStatusOptions =
    dropdownLists?.error_status || {
      none: "--None--",
      not_fixed: "Not Fixed",
      in_progress: "In Progress",
      resolved: "Resolved",
      ignored: "Ignored",
    };

  return (
    <>
      <div className="min-h-[calc(100vh-1rem)] bg-slate-50/70 px-4 py-5 sm:px-6">
        <Header text={"QA Playground"} />
        <div className="space-y-5">
          {/* Filters */}
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                  Debug Console
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredData.length} of {totalRecords} records shown
                </p>
              </div>

              <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {activeTab.label}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_0.7fr_1fr]">
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  Log Type
                </span>

                <div>
                  <select
                    value={activeTab.key}
                    onChange={(e) => {
                      const selected = TABS.find(
                        (t) => t.key === e.target.value,
                      );

                      if (!selected) return;

                      // Navigation-only pages.
                      if (selected.key === "prompt_testing") {
                        navigateTo("/settings/prompt-testing");
                        return;
                      }

                      if (selected.key === "ml") {
                        navigateTo("/settings/machine-learning");
                        return;
                      }

                      if (selected.key === "self_test") {
                        navigateTo("/settings/self-test");
                        return;
                      }
                      if (selected.key === "data_modelling") {
                        navigateTo("/settings/data-modelling");
                        return;
                      }
                      if (selected.key === "prompt_explorer") {
                        navigateTo("/settings/prompt-explorer");
                        return;
                      }

                      if (selected?.disabled) return;

                      setActiveTab(selected);
                    }}
                    className={controlClass}
                  >
                    {TABS.map((tab) => (
                      <option
                        key={tab.key}
                        value={tab.key}
                        disabled={tab.disabled}
                      >
                        {tab.label} {tab.disabled ? " (Coming Soon)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Timeline
                </span>

                <select
                  value={timeline}
                  onChange={(e) => {
                    const value =
                      e.target.value === "all" ? "all" : Number(e.target.value);
                    setTimeline(value);
                  }}
                  className={controlClass}
                >
                  {TIME_FILTERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date
                </span>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={controlClass}
                />
              </div>

              <div className="space-y-1">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </span>

                <input
                  type="search"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="Search records..."
                  className={controlClass}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {activeTab.label}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Click any row to inspect the complete record payload.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading && (
                <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Loading {activeTab.label}...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 px-5 py-8 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Failed to load data
                </div>
              )}

              {!loading && !error && filteredData.length > 0 && (
                <table className="min-w-[760px] text-sm lg:min-w-full">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {formatColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, index) => (
                      <tr
                        key={row.id || index}
                        onClick={() => setSelectedRecord(row)}
                        className="cursor-pointer transition hover:bg-blue-50/50"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className={`max-w-xs px-5 py-3 text-slate-700 ${
                              activeTab.key === "process_audit" &&
                              col === "message_id"
                                ? "font-medium text-blue-600 hover:underline"
                                : ""
                            }`}
                            onClick={(e) => {
                              if (
                                activeTab.key === "process_audit" &&
                                col === "message_id"
                              ) {
                                e.stopPropagation();
                                handleRowClick(row);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {activeTab.module === "outr_error_logs" &&
                              col === "error_status" ? (
                                <select
                                  value={row.error_status || "none"}
                                  disabled={updatingStatusId === row.id}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateErrorStatus(row, e.target.value);
                                  }}
                                  className="h-9 min-w-36 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {Object.entries(errorStatusOptions).map(
                                    ([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              ) : (
                                <span className="truncate">
                                  {truncate(row[col])}
                                </span>
                              )}
                              {activeTab.key === "process_audit" &&
                                col === "message_id" && (
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!loading && !error && filteredData.length === 0 && (
                <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-3 rounded-md bg-slate-100 p-3 text-slate-500">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    No records found
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    Try changing the log type, timeline, date, or email search.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal */}
          {selectedRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <div
                ref={modalRef}
                className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Record Details
                      </h2>
                      <p className="text-xs text-slate-500">
                        {activeTab.label}
                      </p>
                    </div>

                    {state?.prompt && (
                      <button
                        onClick={() => {
                          console.log("prompt id", state?.prompt);
                          navigateTo("/settings/machine-learning", {
                            state: {
                              promptId: selectedRecord.prompt_id,
                              promptStatus: selectedRecord.prompt_stage,
                            },
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (state?.prompt) navigateTo(-1);
                      setSelectedRecord(null);
                    }}
                    className="rounded-md p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid max-h-[calc(90vh-73px)] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
                  {Object.entries(selectedRecord)
                    .filter(([key]) => {
                      // hide global fields
                      if (HIDDEN_FIELDS.includes(key)) return false;

                      // hide description ONLY in prompt tab
                      if (activeTab.key === "prompt" && key === "description")
                        return false;

                      return true;
                    })
                    .sort(([a], [b]) => {
                      if (a === "response") return -1;
                      if (b === "response") return 1;
                      if (a === "full_prompt") return 1;
                      if (b === "full_prompt") return -1;
                      return 0;
                    })
                    .map(([key, value]) => {
                      const large = isLargeField(key);

                      return (
                        <div
                          key={key}
                          className={`rounded-md border bg-gray-50 p-3 ${
                            large ? "md:col-span-2" : ""
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {key.replace(/_/g, " ").toUpperCase()}
                          </div>

                          {key === "full_prompt" ? (
                            (() => {
                              const stats = getPromptStats(value);

                              return (
                                <div className="space-y-2">
                                  {/* Stats */}
                                  <div className="flex gap-4 text-xs text-gray-600 bg-gray-200 px-3 py-1 rounded-md w-fit">
                                    <span>Words: {stats.words}</span>
                                    <span>Lines: {stats.lines}</span>
                                  </div>

                                  {/* Viewer */}
                                  {value?.includes(
                                    "----------------------------------------------------------------------",
                                  ) ? (
                                    <PromptSectionsViewer
                                      prompt={value}
                                      onExplore={() => {
                                        const sys =
                                          selectedRecord?.system_prompt?.trim();
                                        const usr =
                                          selectedRecord?.user_prompt?.trim();
                                        if (sys || usr) {
                                          navigateTo(
                                            "/settings/prompt-explorer",
                                            {
                                              state: {
                                                system: sys || "",
                                                user: usr || "",
                                              },
                                            },
                                          );
                                        } else {
                                          // Split the stored prompt when the structured fields are empty.
                                          const { system, user } =
                                            splitPrompt(value);
                                          navigateTo(
                                            "/settings/prompt-explorer",
                                            { state: { system, user } },
                                          );
                                        }
                                      }}
                                    />
                                  ) : (
                                    <PromptViewer
                                      prompt={value}
                                      onExplore={() => {
                                        const sys =
                                          selectedRecord?.system_prompt?.trim();
                                        const usr =
                                          selectedRecord?.user_prompt?.trim();
                                        if (sys || usr) {
                                          navigateTo(
                                            "/settings/prompt-explorer",
                                            {
                                              state: {
                                                system: sys || "",
                                                user: usr || "",
                                              },
                                            },
                                          );
                                        } else {
                                          // Split the stored prompt when the structured fields are empty.
                                          const { system, user } =
                                            splitPrompt(value);
                                          navigateTo(
                                            "/settings/prompt-explorer",
                                            { state: { system, user } },
                                          );
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })()
                          ) : large ? (
                            key === "response" ? (
                              <div
                                className="max-h-[400px] w-full overflow-auto rounded-md bg-black p-4 text-sm text-green-400"
                                dangerouslySetInnerHTML={{
                                  __html: parseAndDecode(value),
                                }}
                              />
                            ) : (
                              <textarea
                                readOnly
                                value={formatJSON(value)}
                                className="h-40 w-full rounded-md bg-black p-3 font-mono text-xs text-green-400"
                              />
                            )
                          ) : (
                            <div className="text-sm break-words">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Debug;
