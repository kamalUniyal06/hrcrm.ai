import { Editor } from "@tinymce/tinymce-react";
import { motion as Motion } from "framer-motion";
import { BotIcon, Loader2, Save, X } from "lucide-react";
import { TINY_INIT } from "./profileUtils";

function TemplateEditorModal({
  tinyKey,
  name,
  setName,
  stage,
  setStage,
  description,
  setDescription,
  content,
  setContent,
  saving,
  generating,
  onGenerateWithAi,
  onClose,
  onSave,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 24 }}
        className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-linear-to-r from-violet-600 to-cyan-600 px-6 py-4 text-white">
          <h2 className="text-xl font-black">Edit Onboarding Template</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || generating}
            className="rounded-xl p-2 transition hover:bg-white/15 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid-cols-[1fr_220px_1fr]">
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Template Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Stage
            </span>
            <input
              type="text"
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Description
            </span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            value={content}
            onEditorChange={setContent}
            init={TINY_INIT}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <p className="text-sm font-semibold text-slate-500">
            Saving stores this template with onboarding value 1.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGenerateWithAi}
              disabled={saving || generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BotIcon size={16} />
              )}
              {generating ? "Generating..." : "Generate with AI"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || generating}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}

export default TemplateEditorModal;
