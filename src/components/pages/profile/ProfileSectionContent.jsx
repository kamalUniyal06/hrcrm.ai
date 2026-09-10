import { BriefcaseBusiness, GraduationCap, Sparkles } from "lucide-react";
import { candidateFields, relatedFields } from "./candidateApi";

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 read-only:text-slate-500";
const personalGroups = [
  { title: "The essentials", keys: ["first_name", "last_name", "email1", "phone_mobile", "dob", "gender"] },
  { title: "Where you're based", keys: ["primary_address_street", "primary_address_city", "primary_address_state", "primary_address_postalcode", "primary_address_country"] },
  { title: "Your professional introduction", keys: ["title", "current_designation", "department", "linkedin_url", "github_url", "description"] },
];
const labelFor = key => key.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());

export default function ProfileSectionContent({ section, draft, setDraft, editing }) {
  if (section === "personal") return <div className="space-y-8">{personalGroups.map(group => <section key={group.title}>
    <h3 className="mb-4 text-sm font-semibold text-slate-900">{group.title}</h3>
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">{group.keys.filter(key => editing || draft[key]).map(key => <div key={key} className={key === "description" || key === "primary_address_street" ? "sm:col-span-2" : ""}>
      <label htmlFor={`profile-${key}`} className="mb-2 block text-xs font-medium text-slate-500">{candidateFields[key]}{editing && key === "last_name" && <span className="text-indigo-500"> *</span>}</label>
      {editing ? key === "description" ? <textarea id={`profile-${key}`} rows={4} placeholder="A few words about your experience, strengths and ambitions." value={draft[key]} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className={inputClass} /> : <input id={`profile-${key}`} type={key === "dob" ? "date" : key.endsWith("_url") ? "url" : key === "email1" ? "email" : key === "phone_mobile" ? "tel" : "text"} required={key === "last_name" || key === "email1"} readOnly={key === "email1"} value={draft[key]} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))} className={inputClass} /> : <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{draft[key] || <span className="text-slate-400">Not added</span>}</p>}
    </div>)}</div>
  </section>)}</div>;

  const items = draft.resumeSections?.[section] || [];
  const Icon = section === "education" ? GraduationCap : section === "experiences" ? BriefcaseBusiness : Sparkles;
  const singular = section === "education" ? "education" : section === "experiences" ? "experience" : "skill";
  const update = (index, key, value) => setDraft(prev => ({ ...prev, resumeSections: { ...prev.resumeSections, [section]: prev.resumeSections[section].map((item, i) => i === index ? { ...item, [key]: value } : item) } }));
  return <div className="space-y-4">
    {!items.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><Icon className="mx-auto mb-4 text-indigo-400" size={32} /><h3 className="font-medium text-slate-800">Room for your {singular}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{editing ? `No ${singular} records are available yet.` : `Your ${singular} details will appear here once you add them.`}</p></div>}
    {items.map((item, index) => {
      const title = item.institution || item.university || item.school || item.company || item.company_name || item.skill || item.skill_name || item.name || `${labelFor(singular)} ${index + 1}`;
      return <article key={`${section}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon size={20} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{singular} / {String(index + 1).padStart(2, "0")}</p><h3 className="mt-1 break-words font-semibold text-slate-900">{title}</h3></div></div>
        <div className="grid gap-4 sm:grid-cols-2">{Object.entries(item).filter(([key]) => relatedFields[section]?.includes(key)).map(([key, value]) => <div key={key} className={/description|details|summary|responsibilit/i.test(key) ? "sm:col-span-2" : ""}>
          <label htmlFor={`${section}-${index}-${key}`} className="mb-2 block text-xs font-medium text-slate-500">{labelFor(key)}</label>
          {editing ? <textarea id={`${section}-${index}-${key}`} rows={/description|details|summary|responsibilit/i.test(key) ? 3 : 1} value={value} onChange={event => update(index, key, event.target.value)} className={`${inputClass} resize-y`} /> : <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{value || <span className="text-slate-400">Not added</span>}</p>}
        </div>)}</div>
      </article>;
    })}
  </div>;
}
