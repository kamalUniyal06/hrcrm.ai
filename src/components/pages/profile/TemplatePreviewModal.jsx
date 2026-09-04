import { Edit3, X } from "lucide-react";
import { getTemplateHtml } from "./profileUtils";

function TemplatePreviewModal({ template, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-950">
              {template?.name || "Template Preview"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {template?.stage || template?.stage_type || "Onboarding template"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-700"
            >
              <Edit3 size={15} />
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div
            className="mx-auto min-h-full max-w-3xl bg-white p-4 shadow-sm"
            dangerouslySetInnerHTML={{
              __html: getTemplateHtml(template) || "<p>No template content</p>",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TemplatePreviewModal;
