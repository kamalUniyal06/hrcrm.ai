import { BotIcon, Edit3, Eye, Loader2 } from "lucide-react";
import { getTemplateKey } from "./profileUtils";

function TemplateStepSection({
  templates,
  templatesLoading,
  savedTemplateIds,
  skippedTemplateIds,
  handledTemplateCount,
  onPreviewTemplate,
  onOpenTemplateEditor,
  onSkipTemplate,
  onSkipRemainingTemplates,
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-600">
              <BotIcon size={20} />
              <p className="text-sm font-black uppercase tracking-widest">
                Template Generation
              </p>
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Review every onboarding template
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Save templates you want to update, or skip the ones you do not
              need. First sync unlocks only after every onboarding template is
              saved or skipped.
            </p>
            {templates.length > 0 && (
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-violet-500">
                {handledTemplateCount} of {templates.length} handled
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onSkipRemainingTemplates}
            disabled={!templates.length}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip Remaining
          </button>
        </div>

        {templatesLoading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
            <Loader2
              size={26}
              className="mx-auto mb-3 animate-spin text-violet-600"
            />
            <p className="text-sm font-black text-slate-700">
              Loading onboarding templates...
            </p>
          </div>
        ) : templates.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => {
              const key = getTemplateKey(template);
              const saved = savedTemplateIds.has(key);
              const skipped = skippedTemplateIds.has(key);
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950">
                        {template.name || "Untitled template"}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                        {template.description || template.stage || "No description"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                        saved
                          ? "bg-emerald-100 text-emerald-700"
                          : skipped
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {saved ? "Saved" : skipped ? "Skipped" : "Ready"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewTemplate(template)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTemplateEditor(template)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-700"
                    >
                      <Edit3 size={14} />
                      Edit & Save
                    </button>
                    {!saved && (
                      <button
                        type="button"
                        onClick={() => onSkipTemplate(template)}
                        disabled={skipped}
                        className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {skipped ? "Skipped" : "Skip"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-black text-slate-700">
              No onboarding templates were found.
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Templates with onboarding value 1 will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default TemplateStepSection;
