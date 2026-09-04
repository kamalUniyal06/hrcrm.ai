import { motion as Motion } from "framer-motion";
import { BotIcon, Loader2, X } from "lucide-react";

function AiGenerateModal({
  isOpen,
  onClose,
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

  const handleMotiveSelect = (event) => {
    const selected = event.target.value;
    setAiMotive(selected);
    const found = (motiveList || []).find((item) => item.motive === selected);
    if (found) setAiDetails(found.description || "");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <Motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 24 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-linear-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <BotIcon size={24} />
            <h2 className="text-xl font-black">Generate Template with AI</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl p-2 transition hover:bg-white/15 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <label className="block space-y-1">
            <span className="text-sm font-bold text-slate-700">
              Template Name
            </span>
            <input
              type="text"
              value={aiName}
              onChange={(event) => setAiName(event.target.value)}
              placeholder="Welcome Email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-bold text-slate-700">Stage</span>
            {Object.keys(stages || {}).length > 0 ? (
              <select
                value={aiStage}
                onChange={(event) => setAiStage(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
              >
                <option value="">Select Stage</option>
                {Object.keys(stages || {}).map((key) => (
                  <option key={key} value={key}>
                    {stages[key]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={aiStage}
                onChange={(event) => setAiStage(event.target.value)}
                placeholder="others"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
              />
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-bold text-slate-700">Motive</span>
            {motiveListLoading ? (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">
                Loading motives...
              </div>
            ) : (
              <select
                value={aiMotive}
                onChange={handleMotiveSelect}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
              >
                <option value="">Select Motive</option>
                {(motiveList || []).map((item, index) => (
                  <option key={`${item.motive || "motive"}-${index}`} value={item.motive}>
                    {item.motive}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-bold text-slate-700">
              Details / Description
            </span>
            <textarea
              rows={4}
              value={aiDetails}
              onChange={(event) => setAiDetails(event.target.value)}
              placeholder="Add details for the AI template..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={aiIncludeHtml}
              onChange={(event) => setAiIncludeHtml(event.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
            <span className="text-sm font-bold text-slate-700">
              Include current HTML as base content
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BotIcon size={16} />
            )}
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

export default AiGenerateModal;
