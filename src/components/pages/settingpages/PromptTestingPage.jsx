import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./Header";
import useModule from "../../../hooks/useModule";
import {
  ChevronDown,
  Check,
  Copy,
  CheckCheck,
  ArrowLeft,
  Mail,
  FileText,
  Search,
} from "lucide-react";
import { useSelector } from "react-redux";
import { fetchGpc } from "../../../services/api";
import { FETCH_GPC_X_API_KEY } from "../../../store/constants";
import CustomDropdown from "../../ui/CustomDropdown";

// ======================================================
// CUSTOM DROPDOWN
// ======================================================



// ======================================================
// DYNAMIC RESPONSE RENDERER
// ======================================================

const RenderValue = ({ label, value, copied, copyToClipboard }) => {
  if (value === null || value === undefined) return null;

  const isHtml =
    typeof value === "string" &&
    (value.includes("<div") ||
      value.includes("<p") ||
      value.includes("<br") ||
      value.includes("<ul") ||
      value.includes("<ol") ||
      value.includes("<li") ||
      value.includes("<strong") ||
      value.includes("<table"));

  const renderContent = () => {
    if (typeof value === "string") {
      if (isHtml) {
        return (
          <div
            className="
              prose prose-sm max-w-none
              prose-p:leading-relaxed
              prose-li:my-1
              prose-table:w-full
            "
            dangerouslySetInnerHTML={{ __html: value }}
          />
        );
      }
      return (
        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
          {value}
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <div className="text-slate-400 text-sm">Empty array</div>;
      }
      return (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-xl p-4 border border-slate-200"
            >
              {typeof item === "object" ? (
                <pre className="text-sm overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-700">{String(item)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <pre className="text-sm overflow-auto whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <div className="text-slate-700">{String(value)}</div>;
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-5 py-4 border-b">
        <h4 className="font-semibold text-slate-800 capitalize">
          {label.replaceAll("_", " ")}
        </h4>
        <button
          onClick={() =>
            copyToClipboard(
              typeof value === "string"
                ? value
                : JSON.stringify(value, null, 2),
              label,
            )
          }
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition"
        >
          {copied === label ? (
            <>
              <CheckCheck className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-5">{renderContent()}</div>
    </div>
  );
};

// ======================================================
// SEARCH MODE SELECTION SCREEN
// ======================================================

const SearchModeSelection = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
    <Header text="Prompt Testing" />
    <div className="mx-auto px-6 py-10">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl p-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          How would you like to test?
        </h2>
        <p className="text-slate-500 text-center text-sm mb-8">
          Choose how you want to provide the email content for prompt testing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Search by Body */}
          <button
            onClick={() => onSelect("body")}
            className="
              group flex flex-col items-center gap-4 p-8
              rounded-2xl border-2 border-slate-200
              hover:border-indigo-400 hover:bg-indigo-50/50
              transition-all duration-200 text-left
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-800 text-base mb-1">
                Search by Body
              </div>
              <div className="text-sm text-slate-500">
                Manually paste or type an email body to test the prompt against.
              </div>
            </div>
          </button>

          {/* Search by Email */}
          <button
            onClick={() => onSelect("email")}
            className="
              group flex flex-col items-center gap-4 p-8
              rounded-2xl border-2 border-slate-200
              hover:border-indigo-400 hover:bg-indigo-50/50
              transition-all duration-200 text-left
            "
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
              <Mail className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-800 text-base mb-1">
                Search by Email
              </div>
              <div className="text-sm text-slate-500">
                Look up an email address to fetch its threads and test against a
                specific one.
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ======================================================
// MAIN PAGE
// ======================================================

const PromptTestingPage = () => {
  // "select" | "body" | "email"
  const [searchMode, setSearchMode] = useState("select");

  const [formData, setFormData] = useState({
    stage: "new",
    body: "",
    prompt: "",
    email: "",
    thread_size: "1",
    thread_id: "",
  });

  const [stages, setStages] = useState({});
  const [stagePrompts, setStagePrompts] = useState([]);
  const [stagePromptsLoading, setStagePromptsLoading] = useState(false);
  const [promptCache, setPromptCache] = useState({});
  const [copied, setCopied] = useState("");

  // Email-mode thread fetching
  const [emailSearchValue, setEmailSearchValue] = useState("");
  const [threadIds, setThreadIds] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [useLatest, setUseLatest] = useState(true);

  const responseRef = useRef(null);

  const { crmEndpoint } = useSelector((state) => state.user);
  const baseUrl = crmEndpoint.split("?")[0];

  // ======================================================
  // REQUEST BODY — varies by mode
  // ======================================================
  const requestBody = useMemo(() => {
    const base = {
      prompt: formData.prompt,
      thread_size: formData.thread_size,
      email: emailSearchValue.trim() || formData.email,
    };

    if (searchMode === "body") {
      return { ...base, body: formData.body };
    }

    if (searchMode === "email") {
      if (useLatest) {
        return { ...base, latest: true };
      }
      return { ...base, thread_id: formData.thread_id };
    }

    return base;
  }, [formData, searchMode, useLatest, emailSearchValue]);

  // ======================================================
  // FETCH STAGES
  // ======================================================
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const data = await fetchGpc({
          params: { type: "machine_learning", stage_type: 1 },
        });
        setStages(data);
      } catch (err) {
        console.error("Failed to fetch stages:", err);
      }
    };
    fetchStages();
  }, [baseUrl]);

  useEffect(() => {
    if (!formData.stage) {
      setStagePrompts([]);
      return;
    }

    if (promptCache[formData.stage]) {
      setStagePrompts(promptCache[formData.stage]);
      return;
    }

    const fetchStagePrompts = async () => {
      try {
        setStagePromptsLoading(true);
        const data = await fetchGpc({
          params: { type: "machine_learning", stage_type: formData.stage },
        });
        const rows = Array.isArray(data) ? data : [];
        const filtered = rows
          .filter((item) => item?.name)
          .map((item) => ({
            value: item.name,
            label: item.name.replaceAll("_", " "),
          }));
        setStagePrompts(filtered);
        setPromptCache((prev) => ({ ...prev, [formData.stage]: filtered }));
      } catch (err) {
        console.error("Failed to fetch stage prompts:", err);
        setStagePrompts([]);
      } finally {
        setStagePromptsLoading(false);
      }
    };

    fetchStagePrompts();
    setFormData((prev) => ({ ...prev, prompt: "" }));
  }, [formData.stage]);

  // ======================================================
  // FETCH THREAD IDS BY EMAIL
  // ======================================================
  const handleEmailSearch = async () => {
    if (!emailSearchValue.trim()) return;
    try {
      setThreadLoading(true);
      setThreadError("");
      setThreadIds([]);
      setFormData((prev) => ({ ...prev, thread_id: "" }));

      const data = await fetchGpc({
        params: { type: 'prompt_testing' },
        method: "POST",
        body: { email: emailSearchValue.trim() },
      });

      const ids = data?.thread_ids || [];

      if (ids.length === 0) {
        setThreadError("No threads found for this email address.");
      } else {
        setThreadIds(ids.map((id) => ({ value: id, label: id })));
      }
    } catch (err) {
      console.error("Failed to fetch thread IDs:", err);
      setThreadError("Failed to fetch threads. Please try again.");
    } finally {
      setThreadLoading(false);
    }
  };

  // ======================================================
  // useModule hook
  // ======================================================
  const {
    loading: responseLoading,
    data: response,
    error: responseError,
    refetch,
  } = useModule({
    url: `${crmEndpoint}&type=prompt_testing`,
    method: "POST",
    name: "PROMPT TEST RESULT",
    body: requestBody,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": FETCH_GPC_X_API_KEY,
    },
    enabled: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [submittedKey, setSubmittedKey] = useState(null);

  const handleSubmit = () => {
    setSubmittedKey(responseKey);
    refetch();
  };

  const handleReset = () => {
    setFormData({
      stage: "",
      body: "",
      prompt: "",
      email: "",
      thread_size: "1",
      thread_id: "",
    });
    setStagePrompts([]);
    setThreadIds([]);
    setEmailSearchValue("");
    setThreadError("");
    setUseLatest(false);
  };

  const [responseKey, setResponseKey] = useState(0);

  const handleBack = () => {
    setSearchMode("select");
    handleReset();
    setResponseKey((k) => k + 1); // invalidate previous response
  };

  // ======================================================
  // AUTO SCROLL
  // ======================================================
  useEffect(() => {
    if (response && responseRef.current && !responseLoading) {
      responseRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [response, responseLoading]);

  // ======================================================
  // PARSE RESPONSE
  // ======================================================
  const parsedResponse = useMemo(() => {
    if (!response) return null;
    try {
      if (typeof response === "object") return response;
      if (typeof response === "string") return JSON.parse(response);
      return null;
    } catch (err) {
      console.error("JSON parse error:", err);
      return { raw_response: response };
    }
  }, [response]);

  const normalizedResponse = useMemo(() => {
    if (!parsedResponse) return {};
    return parsedResponse?.response || parsedResponse?.data || parsedResponse;
  }, [parsedResponse]);

  const promptText = parsedResponse?.prompt || "";

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => {
        setCopied("");
      }, 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // ======================================================
  // STEP 1 — MODE SELECTION SCREEN
  // ======================================================
  if (searchMode === "select") {
    return <SearchModeSelection onSelect={setSearchMode} />;
  }

  // ======================================================
  // STEP 2 — BODY OR EMAIL FORM
  // ======================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {responseLoading && (
        <div className="absolute inset-0 bg-white/20 z-20 rounded-3xl flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-700">
              Testing Prompt...
            </span>
          </div>
        </div>
      )}

      <Header text="Prompt Testing" />

      <div className="mx-auto px-6 py-10 space-y-10">
        {/* ====================================================== */}
        {/* FORM */}
        {/* ====================================================== */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl p-8">
          {/* Back Button + Title */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleBack}
              className="
                flex items-center gap-1.5 text-sm font-medium text-slate-500
                hover:text-indigo-600 transition px-3 py-1.5 rounded-lg
                border border-slate-200 hover:border-indigo-300 bg-white
              "
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {searchMode === "body" ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  <FileText className="w-3.5 h-3.5" /> Search by Body
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <Mail className="w-3.5 h-3.5" /> Search by Email
                </span>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Test Prompt Output
          </h2>

          <div className="space-y-6">
            {/* STAGE */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Stage
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stages)
                  .filter(([key]) => key)
                  .map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        handleChange({ target: { name: "stage", value: key } })
                      }
                      className={`
                        px-4 py-2 rounded-full text-sm font-medium transition border
                        ${formData.stage === key
                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                          : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                        }
                      `}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>

            {/* PROMPT */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Prompt
              </label>
              <CustomDropdown
                value={formData.prompt}
                placeholder={
                  !formData.stage
                    ? "Select a stage first"
                    : stagePromptsLoading
                      ? "Loading prompts..."
                      : "Select Prompt"
                }
                disabled={!formData.stage || stagePromptsLoading}
                onChange={(value) =>
                  handleChange({ target: { name: "prompt", value } })
                }
                options={stagePrompts}
              />
            </div>

            {/* THREAD SIZE */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Thread Size
              </label>
              <CustomDropdown
                value={formData.thread_size}
                placeholder="Select Thread Size"
                onChange={(value) =>
                  handleChange({ target: { name: "thread_size", value } })
                }
                options={[
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "5", label: "5" },
                  { value: "all", label: "All" },
                ]}
              />
            </div>

            {/* ============================================ */}
            {/* EMAIL MODE — email search + thread dropdown  */}
            {/* ============================================ */}
            {searchMode === "email" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailSearchValue}
                      onChange={(e) => setEmailSearchValue(e.target.value)}
                      onKeyDown={(e) =>
                        !useLatest && e.key === "Enter" && handleEmailSearch()
                      }
                      placeholder="example@email.com"
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {!useLatest && (
                      <button
                        type="button"
                        onClick={handleEmailSearch}
                        disabled={threadLoading || !emailSearchValue.trim()}
                        className="
                          flex items-center gap-2 px-5 py-3 rounded-xl
                          bg-emerald-600 text-white font-semibold text-sm
                          hover:bg-emerald-700 transition
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      >
                        {threadLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        {threadLoading ? "Searching..." : "Search"}
                      </button>
                    )}
                  </div>

                  {/* Latest checkbox */}
                  <label className="inline-flex items-center gap-2 mt-3 cursor-pointer select-none">
                    <div
                      onClick={() => {
                        setUseLatest((prev) => !prev);
                        setThreadIds([]);
                        setThreadError("");
                        setFormData((fd) => ({ ...fd, thread_id: "" }));
                      }}
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition
                        ${useLatest
                          ? "bg-emerald-600 border-emerald-600"
                          : "bg-white border-slate-300 hover:border-emerald-400"
                        }
                      `}
                    >
                      {useLatest && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      Use latest thread
                    </span>
                    <span className="text-xs text-slate-400">
                      (skips thread selection, sends{" "}
                      <code className="bg-slate-100 px-1 rounded">
                        latest: true
                      </code>
                      )
                    </span>
                  </label>

                  {threadError && (
                    <p className="mt-2 text-sm text-red-500">{threadError}</p>
                  )}
                </div>

                {/* Thread ID Dropdown — shown only after threads are fetched and not using latest */}
                {!useLatest && threadIds.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Thread ID
                    </label>
                    <CustomDropdown
                      value={formData.thread_id}
                      placeholder="Select a Thread ID"
                      onChange={(value) =>
                        handleChange({ target: { name: "thread_id", value } })
                      }
                      options={threadIds}
                    />
                  </div>
                )}
              </>
            )}

            {/* ============================================ */}
            {/* BODY MODE — email body textarea only         */}
            {/* ============================================ */}
            {searchMode === "body" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Body
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleChange}
                  placeholder="Paste or type email content here..."
                  rows={6}
                  className="
                    w-full rounded-xl border border-slate-300 px-4 py-3
                    focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none
                  "
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4 pt-6">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl border border-slate-300
               text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  responseLoading ||
                  (searchMode === "email" &&
                    !useLatest &&
                    !formData.thread_id) ||
                  (searchMode === "email" &&
                    useLatest &&
                    !emailSearchValue.trim())
                }
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600
               text-white font-semibold shadow-lg hover:opacity-90 transition
               disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {responseLoading ? "Testing..." : "Test Prompt"}
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* RESPONSE BOX (unchanged) */}
        {/* ====================================================== */}
        {response &&
          !responseLoading &&
          !responseError &&
          submittedKey === responseKey && (
            <div
              ref={responseRef}
              className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-8"
            >
              <h3 className="text-2xl font-bold text-slate-900">
                Prompt Test Result
              </h3>

              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">
                  Response
                </h4>

                {response && !responseError && (
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">
                      Prompt Test Result
                    </h3>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 mb-2">
                        Response
                      </h4>

                      {typeof response?.response === "object" &&
                        response?.response !== null ? (
                        <div className="bg-slate-100 rounded-xl p-4 text-sm space-y-4">
                          {Object.entries(response.response).map(
                            ([key, value]) => {
                              const stringValue =
                                typeof value === "string" ? value.trim() : "";
                              const isHTML =
                                typeof value === "string" &&
                                /<\/?[a-z][\s\S]*>/i.test(stringValue);

                              return (
                                <div
                                  key={key}
                                  className="border-b border-slate-200 pb-4 last:border-b-0"
                                >
                                  <div className="font-semibold text-slate-700 mb-2">
                                    {key}:
                                  </div>
                                  {isHTML ? (
                                    <div className="bg-white border rounded-xl overflow-hidden">
                                      <div
                                        className="p-4 prose max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html: value,
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-slate-600 whitespace-pre-wrap break-words">
                                      {typeof value === "object"
                                        ? JSON.stringify(value, null, 2)
                                        : String(value)}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                          {String(response?.response).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 mb-2">
                        Prompt
                      </h4>
                      <div className="bg-slate-100 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                        {response?.prompt}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PromptTestingPage;
