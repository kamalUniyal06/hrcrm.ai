import { Globe2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import WebsiteCsvImport from "./WebsiteCsvImport";

function WebsiteStepSection({
  websiteForms,
  websiteSaving,
  onWebsiteSave,
  onWebsiteImportSuccess,
  onUpdateWebsiteField,
  onAddWebsiteRow,
  onRemoveWebsiteRow,
}) {
  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Globe2 size={20} />
            <p className="text-sm font-black uppercase tracking-widest">
              Add Website
            </p>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            Add your first website to continue setup
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Add website names and price ranges here, or import them from a CSV.
            Saving this moves your profile from 50% to 70% and unlocks the
            onboarding template step.
          </p>
        </div>

        <form onSubmit={onWebsiteSave} className="space-y-4">
          <div className="space-y-3">
            {websiteForms.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 lg:grid-cols-[1.3fr_0.85fr_0.85fr_auto] lg:items-end"
              >
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Website Name
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      onUpdateWebsiteField(index, "name", event.target.value)
                    }
                    placeholder="example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Min Price
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={item.minimum_price}
                    onChange={(event) =>
                      onUpdateWebsiteField(
                        index,
                        "minimum_price",
                        event.target.value,
                      )
                    }
                    placeholder="50"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Max Price
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={item.amount}
                    onChange={(event) =>
                      onUpdateWebsiteField(index, "amount", event.target.value)
                    }
                    placeholder="150"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onRemoveWebsiteRow(index)}
                  disabled={websiteSaving}
                  title="Remove row"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onAddWebsiteRow}
              disabled={websiteSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add Another
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <WebsiteCsvImport
                disabled={websiteSaving}
                onImportSuccess={onWebsiteImportSuccess}
              />
              <button
                type="submit"
                disabled={websiteSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {websiteSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {websiteSaving ? "Saving..." : "Save Websites"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default WebsiteStepSection;
