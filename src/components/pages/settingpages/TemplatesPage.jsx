import useModule from "../../../hooks/useModule";
import {
  CREATE_DEAL_API_KEY,
  FETCH_GPC_X_API_KEY,
} from "../../../store/constants";
import { motion } from "framer-motion";
import { Eye, X, Save, Plus, BotIcon } from "lucide-react";
import { useState, useEffect, useContext, useCallback } from "react";
import Loading from "../../Loading";
import Header from "./Header";
import ErrorBox from "./ErrorBox";
import { Editor } from "@tinymce/tinymce-react";
import { useSelector } from "react-redux";
import { PageContext } from "../../../context/pageContext";
import { useLocation, useNavigate } from "react-router-dom";
import { getDomain } from "../../../assets/assets";
import TinyEditor from "../../TinyEditor";
import { apiRequest, fetchGpc } from "../../../services/api";
import { queryClient } from "../../../lib/queryClient";
import { setupEmailBackgroundHandling } from "../../../lib/tinyEmailBackground";
import { useCrmUsers } from "../../../queries/users.queries";
import { useTemplate, useTemplatesByStage, useTemplateStages } from "../../../queries/template.queries";

// ─── Utility ────────────────────────────────────────────────────────────────
const decodeHtmlEntities = (str) => {
  if (!str) return str;
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

const TINY_INIT = {
  license_key: "gpl",

  height: "100%",
  menubar: false,
  branding: false,
  statusbar: false,

  plugins: `
    lists
    link
    image
    table
    quickbars
    code
  `,

  toolbar: `
    undo redo |
    bold italic underline |
    alignleft aligncenter alignright |
    bullist numlist |
    link image table |
    emoticons |
    code
  `,

  toolbar_mode: "sliding",

  quickbars_selection_toolbar:
    "bold italic underline | quicklink",

  image_advtab: true,
  image_caption: true,

  link_assume_external_targets: true,
  link_context_toolbar: true,

  resize: true,

  browser_spellcheck: true,
  setup: setupEmailBackgroundHandling,
extended_valid_elements: `
    *[style|class|id|title|data-email-background-url],
    div[style|class|id],
    p[style|class|id],
    span[style|class|id],
    table[style|class|id|role|border|width|height|cellpadding|cellspacing|background|data-email-background-url],
    tr[style|class],
    td[style|class|id|align|valign|width|height|colspan|rowspan|bgcolor|background|data-email-background-url],
    th[style|class|id|align|valign|width|height|colspan|rowspan|bgcolor|background|data-email-background-url],
    img[src|alt|width|height|style|class]
  `,

  valid_styles: {
  "*": [
    "background",
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "color",
    "border",
    "border-color",
    "border-style",
    "border-width",
    "border-radius",
    "padding",
    "margin",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "text-align",
    "font-size",
    "font-family",
    "font-weight",
    "line-height",
    "display"
  ].join(","),
},

  content_style: `
    body {
      font-family: -apple-system, BlinkMacSystemFont,
      'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #333;
    }
  `,
};

// ─── AI Generate Modal — defined OUTSIDE main component to prevent remount ──
// Defining inside the component body causes React to recreate the component
// on every parent render, which unmounts/remounts the inputs and loses focus.
function AiGenerateModal({
  isOpen,
  onClose,
  context,
  aiName,
  setAiName,
  aiStage,
  setAiStage,
  aiMotive,
  setAiMotive,
  aiDetails,
  setAiDetails,
  aiIncludeHtml,
  setAiIncludeHtml,
  stages,
  motiveList,
  motiveListLoading,
  onGenerate,
  isGenerating,
}) {
  if (!isOpen) return null;

  const handleMotiveSelect = (e) => {
    const selected = e.target.value;
    setAiMotive(selected);
    // Auto-fill description from the selected motive; stays editable
    const found = (motiveList || []).find((m) => m.motive === selected);
    if (found) setAiDetails(found.description || "");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={() => !isGenerating && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
          <div className="flex items-center gap-3">
            <BotIcon size={24} />
            <h2 className="text-xl font-bold">
              {context === "edit"
                ? "Rebuild Template with AI"
                : "Generate Template with AI"}
            </h2>
          </div>
          <button
            onClick={() => !isGenerating && onClose()}
            className="p-1 hover:bg-white/20 rounded-full transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="e.g. Welcome Email"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-sm"
            />
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              value={aiStage}
              onChange={(e) => setAiStage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-sm"
            >
              <option value="">Select Stage</option>
              {Object.keys(stages || {}).map((key) => (
                <option key={key} value={key}>
                  {stages[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Motive — dropdown from API */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motive
            </label>
            {motiveListLoading ? (
              <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400">
                Loading motives…
              </div>
            ) : (
              <select
                value={aiMotive}
                onChange={handleMotiveSelect}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-sm"
              >
                <option value="">Select Motive</option>
                {(motiveList || []).map((m, i) => (
                  <option key={i} value={m.motive}>
                    {m.motive}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Details — auto-filled from motive, fully editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Details / Description
              <span className="ml-1 text-xs text-gray-400 font-normal">
                (auto-filled · editable)
              </span>
            </label>
            <textarea
              rows={4}
              value={aiDetails}
              onChange={(e) => setAiDetails(e.target.value)}
              placeholder="Details will auto-fill when you pick a motive, or type your own…"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition text-sm resize-none"
            />
          </div>

          {/* Include existing HTML toggle */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <input
              type="checkbox"
              id="aiIncludeHtml"
              checked={aiIncludeHtml}
              onChange={(e) => setAiIncludeHtml(e.target.checked)}
              className="w-4 h-4 accent-violet-600 cursor-pointer"
            />
            <label
              htmlFor="aiIncludeHtml"
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              {context === "edit"
                ? "Include current HTML (refine existing template)"
                : "Include current editor content as base HTML"}
            </label>
          </div>
          <p className="text-xs text-gray-400 -mt-2 pl-1">
            {aiIncludeHtml
              ? context === "edit"
                ? "The existing template HTML will be sent to AI for refinement."
                : "The current editor content will be used as a base."
              : "A brand-new template will be generated from scratch."}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition ${isGenerating
              ? "bg-gray-300 cursor-not-allowed text-gray-500"
              : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90"
              }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <BotIcon size={16} /> Generate
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function TemplatesPage() {
  const TINY_EDITOR_API_KEY = queryClient.getQueryData(['tiny-key'])

  const [viewItem, setViewItem] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isChanged, setIsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isLoading: stagesLoading, data: stages } = useTemplateStages();
  const [stageType, setStageType] = useState(Object.keys(stages ?? {})[0] ?? '');
  const [editingStage, setEditingStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");

  const { crmEndpoint } = useSelector((state) => state.user);
  const { data: users } = useCrmUsers();
  const { showConsole } = useContext(PageContext);
  const { state } = useLocation();
  const navigate = useNavigate();

  // Create modal
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStageType, setNewStageType] = useState("others");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [templateId, setTemplateId] = useState(false);

  // Motive list
  const [motiveList, setMotiveList] = useState([]);
  const [motiveListLoading, setMotiveListLoading] = useState(false);

  // AI modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalContext, setAiModalContext] = useState("edit");
  const [aiMotive, setAiMotive] = useState("");
  const [aiDetails, setAiDetails] = useState("");
  const [aiName, setAiName] = useState("");
  const [aiStage, setAiStage] = useState("");
  const [aiIncludeHtml, setAiIncludeHtml] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── useModule hooks ──────────────────────────────────────────────────────
  const { isLoading: loading, data, isError: error, refetch } = useTemplatesByStage(stageType);

  const { isLoading: tempLoading, data: temp, isError: getTempError } = useTemplate(templateId);


  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsChanged(editorContent !== originalContent);
  }, [editorContent, originalContent]);



  useEffect(() => {
    const fetchMotives = async () => {
      setMotiveListLoading(true);

      try {
        const res = await fetchGpc({
          params: { type: "motive_list" },
        });

        console.log("Motives Response:", res);

        if (Array.isArray(res)) {
          setMotiveList(res);
        } else {
          console.error("Response is not an array:", res);
        }
      } catch (err) {
        console.error("Failed to fetch motive list", err);
      } finally {
        setMotiveListLoading(false);
      }
    };

    fetchMotives();
  }, [crmEndpoint]);

  useEffect(() => {
    if (stageType) refetch();
  }, [stageType]);
  useEffect(() => {
    if (state?.templateId) setTemplateId(state.templateId);
  }, [state?.templateId]);
  useEffect(() => {
    if (temp) setViewItem(temp[0]);
  }, [getTempError, temp]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openViewer = (item) => {
    setViewItem(item);
    setEditorContent(item.body_html || "");
    setOriginalContent(item.body_html || "");
    setIsChanged(false);
    setSelectedStage(item.stage || item.stage_type || "");
  };

  const openAiModal = useCallback(
    (context) => {
      setAiModalContext(context);
      if (context === "edit") {
        setAiName(viewItem?.name || "");
        setAiStage(viewItem?.stage || viewItem?.stage_type || stageType || "");
        setAiMotive("");
        setAiDetails(viewItem?.description || "");
        setAiIncludeHtml(true);
      } else {
        setAiName(newTemplateName || "");
        setAiStage(newStageType || "");
        setAiMotive("");
        setAiDetails("");
        setAiIncludeHtml(false);
      }
      setShowAiModal(true);
    },
    [viewItem, stageType, newTemplateName, newStageType],
  );

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("motive", aiMotive);
      formData.append("details", aiDetails);
      formData.append("current_name", aiName);
      formData.append("stage", aiStage);

      const currentHtml =
        aiModalContext === "edit" ? editorContent : newTemplateContent;
      if (aiIncludeHtml && currentHtml) {
        formData.append("html", decodeHtmlEntities(currentHtml));
      }

      const baseUrl = crmEndpoint.split("?")[0];
      const res = await fetch(
        `${baseUrl}?entryPoint=fetch_gpc&type=generate_template`,
        {
          method: "POST",
          headers: {
            "X-Api-Key": FETCH_GPC_X_API_KEY,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res?.status}: ${res.statusText}`);
      }

      const result = await res.json();
      showConsole && console.log("AI generate result:", result);

      if (result?.success && result?.data?.html) {

        const unwrapHtml = (raw) => {
          let html = raw;

          // Step 1: Keep JSON-parsing until we can't anymore
          let maxDepth = 5;
          while (typeof html === "string" && maxDepth-- > 0) {
            const trimmed = html.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith('"')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === "object" && parsed.html) {
                  html = parsed.html;
                } else if (typeof parsed === "string") {
                  html = parsed;
                } else {
                  break;
                }
              } catch {
                // JSON.parse failed — string is malformed/truncated.
                // Manually extract whatever is after "html":"
                const match = trimmed.match(/["']?html["']?\s*:\s*["']?([\s\S]*)/i);
                if (match) {
                  html = match[1]
                    .replace(/^"/, "")   // strip leading quote if present
                    .replace(/"?\s*}?\s*$/, ""); // strip trailing quote/brace
                }
                break;
              }
            } else {
              break;
            }
          }

          // Step 2: Unescape all JS/JSON escape sequences
          if (typeof html === "string") {
            html = html
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\r/g, "")
              .replace(/\\t/g, "\t")
              .replace(/\\\//g, "/")
              .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
                String.fromCharCode(parseInt(code, 16))
              );
          }

          // Step 3: Strip any leftover wrapper artifacts that survived
          if (typeof html === "string") {
            html = html
              .trim()
              .replace(/^\{"?html"?\s*:\s*"?/i, "")  // remove leading {"html":"
              .replace(/"?\s*\}$/i, "")               // remove trailing "}
              .trim();
          }

          return html;
        };

        const cleanHtml = unwrapHtml(result.data.html);

        if (aiModalContext === "edit") {
          setEditorContent(cleanHtml);
          setIsChanged(cleanHtml !== originalContent);
        } else {
          setNewTemplateContent(cleanHtml);
          if (aiName) setNewTemplateName(aiName);
          if (aiStage) setNewStageType(aiStage);
        }

        setShowAiModal(false);
        alert("✅ Template generated successfully!");

      } else {
        alert(
          `❌ Generation failed: ${result?.message || result?.error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Generate error:", err);
      alert(`❌ Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!viewItem || !isChanged) return;
    setIsSaving(true);
    try {
      const requestBody = {
        parent_bean: {
          module: "EmailTemplates",
          id: viewItem.id,
          body_html: editorContent,
          name: viewItem.name,
          stage_type: stageType,
          description: viewItem.description || "",
          subject: viewItem.subject || "",
          type: viewItem.type || "",
          date_modified: new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
        },
      };
      const data = await apiRequest({
        method: "POST",
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: { action_type: "post_data" },
      });
      if (data.parent_updated === true || data.parent_id) {
        setOriginalContent(editorContent);
        setIsChanged(false);
        alert("✅ Template saved successfully!");
        setTimeout(() => {
          refetch();
        }, 1000);
      } else {
        alert(
          `❌ Save failed: ${data.error || data.message || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(`❌ Save failed: ${err.message}`);
      setOriginalContent(editorContent);
      setIsChanged(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageUpdate = async () => {
    if (!viewItem) return;
    try {
      const result = await apiRequest({
        method: "POST",
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent_bean: {
            module: "EmailTemplates",
            id: viewItem.id,
            stage: selectedStage,
          },
        }),
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: { action_type: "post_data" },
      });
      if (result.parent_updated) {
        alert("✅ Stage updated successfully");
        setEditingStage(false);
        refetch();
      } else {
        alert("❌ Failed to update stage");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error updating stage");
    }
  };

  const handleCreateNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert("Please enter template name");
      return;
    }

    setIsCreating(true);

    try {
      const requestBody = {
        parent_bean: {
          module: "EmailTemplates",
          name: newTemplateName,
          description: newDescription || "",
          body_html: newTemplateContent || "<p>New template content</p>",
          subject: "",
          type: "",
          stage: newStageType || "",
          assigned_user_id: "",
          published: "off",
          text_only: "0",
          date_entered: new Date().toISOString().slice(0, 19).replace("T", " "),
          date_modified: new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
        },
      };

      const data = await apiRequest({
        method: "POST",
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: { action_type: "post_data" },
      });

      showConsole && console.log("Create response:", data);

      if (data.parent_updated === true || data.parent_id || data.id) {
        alert("✅ New template created successfully!");

        setNewTemplateName("");
        setNewDescription("");
        setNewTemplateContent("");

        setShowNewTemplateModal(false);

        setTimeout(() => {
          refetch();
        }, 1000);
      } else {
        alert(
          `❌ Failed to create template: ${data.error || data.message || "Unknown error"
          }`,
        );
      }
    } catch (err) {
      console.error("Create error:", err);
      alert(`❌ Failed to create template: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setEditorContent(originalContent);
    setIsChanged(false);
  };

  const handleClose = () => {
    setViewItem(null);
    if (state?.templateId) navigate(-1);
  };

  const handleCloseNewTemplateModal = () => {
    if (newTemplateName.trim() || newTemplateContent.trim()) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to close?",
        )
      )
        return;
    }
    setShowNewTemplateModal(false);
  };

  // ── Shared AI modal props object ─────────────────────────────────────────
  const aiModalProps = {
    isOpen: showAiModal,
    onClose: () => setShowAiModal(false),
    context: aiModalContext,
    aiName,
    setAiName,
    aiStage,
    setAiStage,
    aiMotive,
    setAiMotive,
    aiDetails,
    setAiDetails,
    aiIncludeHtml,
    setAiIncludeHtml,
    stages,
    motiveList,
    motiveListLoading,
    onGenerate: handleGenerateTemplate,
    isGenerating,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE MODAL — AI-first
  // ══════════════════════════════════════════════════════════════════════════
  if (showNewTemplateModal) {
    return (
      <>
        <AiGenerateModal {...aiModalProps} />
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={handleCloseNewTemplateModal}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <h2 className="text-2xl font-bold">Create New Template</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openAiModal("create")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-semibold"
                >
                  <BotIcon size={18} />
                  Generate with AI
                </button>
                <button
                  onClick={handleCloseNewTemplateModal}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* AI-generated content banner */}
            {newTemplateContent && (
              <div className="flex items-center justify-between px-6 py-2 bg-violet-50 border-b border-violet-200 text-violet-700 text-sm">
                <span>
                  ✨ AI-generated content loaded — review and edit below, then
                  fill in the details to save.
                </span>
                <button
                  onClick={() => openAiModal("create")}
                  className="flex items-center gap-1 text-xs font-medium underline hover:text-violet-900"
                >
                  <BotIcon size={13} /> Regenerate
                </button>
              </div>
            )}

            {/* Meta fields */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User
                  </label>
                  <select
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  >
                    <option value="">Select User</option>
                    {(users || []).map((user, index) => (
                      <option
                        key={user.id || index}
                        value={user.description || ""}
                      >
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage
                  </label>
                  <select
                    value={newStageType}
                    onChange={(e) => setNewStageType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  >
                    <option value="">Select Stage</option>
                    {Object.keys(stages || {}).map((key) => (
                      <option key={key} value={key}>
                        {stages[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Editor area — empty state prompts AI generation */}
            <div className="flex-1 overflow-hidden relative">
              {!newTemplateContent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 gap-4 pointer-events-auto">
                  <BotIcon size={52} className="text-violet-400" />
                  <p className="text-gray-600 text-lg font-semibold">
                    Start by generating a template with AI
                  </p>
                  <p className="text-gray-400 text-sm">
                    Pick a motive, add details and let AI build the HTML for you
                  </p>
                  <button
                    onClick={() => openAiModal("create")}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:opacity-90 transition shadow-lg"
                  >
                    <BotIcon size={20} />
                    Generate with AI
                  </button>
                  <button
                    onClick={() =>
                      setNewTemplateContent("<p>Start writing here…</p>")
                    }
                    className="text-sm text-gray-400 underline hover:text-gray-600"
                  >
                    Skip — write manually
                  </button>
                </div>
              )}

              <TinyEditor
                editorContent={newTemplateContent}
                setEditorContent={setNewTemplateContent}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-t">
              <p className="text-sm text-gray-500">
                ✨ Use <strong>Generate with AI</strong> to create content, then
                save.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseNewTemplateModal}
                  className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewTemplate}
                  disabled={isCreating}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition text-white ${isCreating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                      Creating…
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EDIT / VIEW MODAL
  // ══════════════════════════════════════════════════════════════════════════
  if (viewItem) {
    return (
      <>
        <AiGenerateModal {...aiModalProps} />
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <h2 className="text-2xl font-bold">{viewItem.name}</h2>
              <div className="flex items-center gap-3">
                {editingStage ? (
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded">
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      className="px-2 py-1 border rounded text-black text-sm"
                    >
                      {Object.keys(stages || {}).map((key) => (
                        <option key={key} value={key}>
                          {stages[key]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleStageUpdate}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingStage(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    Edit Stage
                  </button>
                )}

                {isChanged && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 active:scale-95"
                      }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                        Saving…
                      </>
                    ) : (
                      <>Save</>
                    )}
                  </button>
                )}

                {isChanged && (
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium text-sm transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={() => openAiModal("edit")}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                  title="Regenerate with AI"
                >
                  <BotIcon size={26} />
                </button>

                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={26} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Editor
                value={editorContent}
                onEditorChange={setEditorContent}
                initialValue={viewItem.body_html}
                init={TINY_INIT}
              />
            </div>

            <div className="flex justify-center items-center px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
              ✨ Use <strong className="mx-1">Preview</strong> to see final
              email • Use <strong className="mx-1">&lt;&gt; Source code</strong>{" "}
              to edit HTML
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  if (tempLoading) return <Loading text="template" />;

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LIST
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-3 sm:p-6 lg:p-8 min-h-screen bg-gray-50">
      <Header
        text="Template Manager"
        handleCreate={() => setShowNewTemplateModal(true)}
        showCreateButton={true}
      />

      {stagesLoading ? (
        <div className="mt-6 text-gray-500">Loading stages…</div>
      ) : (
        <div className="flex flex-wrap gap-3 mt-6">
          {Object.entries(stages).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStageType(key)}
              className={`px-5 py-2 rounded-xl font-medium transition-all ${stageType === key
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading && <Loading text="templates" />}
      {error && <ErrorBox message={error.message} onRetry={refetch} />}

      {!loading && !error && (!data || data.length === 0) && (
        <div className="mt-12 text-center p-16 bg-white border-2 border-dashed border-gray-300 rounded-2xl">
          <p className="text-xl text-gray-600">No email templates found.</p>
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="mt-6 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg active:scale-98 transition-all mx-auto"
          >
            <Plus size={20} />
            Create Your First Template
          </button>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {data.map?.((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 overflow-hidden transition-all group cursor-pointer"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition">
                  {item.name}
                </h3>
                <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                  {item.description || "No description available"}
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  {item.date_modified || item.date_entered}
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={() => openViewer(item)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg active:scale-98 transition-all"
                >
                  <Eye size={19} />
                  Open Editor
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
