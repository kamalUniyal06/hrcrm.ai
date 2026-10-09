import { BriefcaseBusiness, GraduationCap, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { relatedFields } from "../profile/candidateApi";

const sections = {
  skills: { title: "Skills", singular: "Skill", icon: Sparkles, description: "Technical skills, tools and areas of expertise." },
  experiences: { title: "Experience", singular: "Experience", icon: BriefcaseBusiness, description: "Previous roles, employers and responsibilities." },
  education: { title: "Education", singular: "Education", icon: GraduationCap, description: "Qualifications, institutions and academic background." },
};
const labels = {
  ctc: "CTC", total_years_total_months: "Experience", last_used: "Last used",
  from_time: "From", to_time: "To", joining_date: "Joining date", leaving_date: "Leaving date",
};
const clean = (value) => String(value ?? "").trim();

export default function CandidateRelatedSection({ section, query }) {
  const { title, singular, icon: Icon, description } = sections[section];
  const records = query.data || [];
  return (
    <section aria-label={title} className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button type="button" disabled={query.isFetching} onClick={() => query.refetch()} aria-label={`Refresh ${title.toLowerCase()}`} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
          <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      {query.isPending ? (
        <p role="status" className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading {title.toLowerCase()}…</p>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>Could not load {title.toLowerCase()}. {query.error.message}</p>
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="mt-2 font-medium underline disabled:opacity-40">Retry</button>
        </div>
      ) : !records.length ? (
        <div className="py-12 text-center">
          <Icon size={32} className="mx-auto text-slate-300" />
          <h4 className="mt-4 font-medium text-slate-800">No {title.toLowerCase()} added</h4>
          <p className="mt-2 text-sm text-slate-500">This candidate has no {title.toLowerCase()} records yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {records.map((record, index) => {
            const titleKeys = section === "skills" ? ["skill_name", "skill", "name"]
              : section === "experiences" ? ["position", "designation", "name"]
                : ["qualification", "name"];
            const titleKey = titleKeys.find((key) => clean(record[key]));
            const subtitleKeys = section === "experiences" ? ["company_name", "company"]
              : section === "education" ? ["institution", "university", "school"] : [];
            const subtitleKey = subtitleKeys.find((key) => clean(record[key]));
            const fields = relatedFields[section].filter((key) => key !== titleKey && key !== subtitleKey && clean(record[key]));
            return (
              <article key={record.id || index} className="py-6 first:pt-0">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon size={20} aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h4 className="break-words font-semibold text-slate-900">{titleKey ? record[titleKey] : `${singular} ${index + 1}`}</h4>
                    {subtitleKey && <p className="mt-1 break-words text-sm text-slate-500">{record[subtitleKey]}</p>}
                  </div>
                </div>
                {!!fields.length && <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {fields.map((key) => (
                    <div key={key} className={/description|responsibilities/.test(key) ? "sm:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-slate-500">{labels[key] || key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{record[key]}</dd>
                    </div>
                  ))}
                </dl>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
