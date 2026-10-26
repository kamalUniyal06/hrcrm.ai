import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import { BookOpenCheck, FileText, Library, Loader2, Pencil, Plus, Search } from "lucide-react";
import { selectIsAdmin } from "../../../utils/pageAccess";
import { pageGutter } from "../../employement/components/home/homeUi";
import { formatDate } from "../../employement/components/leave/admin/leaveAdminUtils";
import { usePolicies, useSavePolicy } from "../../../queries/policies.queries";
import { groupPolicies } from "./policyUtils";
import PolicyEditor from "./PolicyEditor";

const proseClass =
  "text-sm leading-7 text-foreground/85 [&_a]:text-primary [&_a]:underline [&_h2]:mt-9 [&_h2]:scroll-mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5";
const secondaryButton =
  "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary disabled:opacity-50";
const primaryButton =
  "inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50";

/** Sanitised body with an id on every section heading, and the headings for "On this page". */
function usePolicyBody(html) {
  return useMemo(() => {
    const clean = DOMPurify.sanitize(String(html || ""), { USE_PROFILES: { html: true } });
    const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
    const sections = [...doc.querySelectorAll("h2")].map((heading, index) => {
      heading.id = `policy-section-${index + 1}`;
      return { id: heading.id, title: heading.textContent.trim() };
    });
    return { html: doc.body.firstElementChild.innerHTML, sections };
  }, [html]);
}

function PolicyArticle({ policy, isAdmin, onEdit }) {
  const body = usePolicyBody(policy.description);
  const updated = formatDate(policy.date_modified);
  return (
    <article className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{policy.category || "General"}</span>
            {policy.status !== "published" && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Draft · only admins can see this</span>}
          </div>
          {isAdmin && <button type="button" onClick={onEdit} className={secondaryButton}><Pencil size={15} aria-hidden="true" />Edit policy</button>}
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{policy.name}</h2>
        {policy.summary && <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{policy.summary}</p>}
        <dl data-tour="policy-meta" className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div><dt className="text-muted-foreground">Effective from</dt><dd className="mt-0.5 font-semibold text-foreground">{policy.effective_date ? formatDate(policy.effective_date) : "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Version</dt><dd className="mt-0.5 font-semibold text-foreground">{policy.version || "—"}</dd></div>
          {updated !== "Not available" && <div><dt className="text-muted-foreground">Last updated</dt><dd className="mt-0.5 font-semibold text-foreground">{updated}</dd></div>}
        </dl>
      </header>

      <div className="grid gap-8 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_200px]">
        <div className={proseClass} dangerouslySetInnerHTML={{ __html: body.html }} />
        {body.sections.length > 1 && (
          <nav aria-label="On this page" className="order-first xl:order-last">
            <div className="rounded-xl bg-muted/50 p-4 xl:sticky xl:top-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">On this page</p>
              <ul className="mt-3 space-y-1">
                {body.sections.map((section) => (
                  <li key={section.id}>
                    <button type="button" onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="w-full rounded-md py-1 text-left text-sm text-muted-foreground transition hover:text-primary">
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>

      <footer className="border-t border-border px-5 py-4 text-xs leading-5 text-muted-foreground sm:px-8">
        This policy applies to everyone it covers from its effective date. When it changes, the new version appears here with a new version number.
      </footer>
    </article>
  );
}

export default function PoliciesPage() {
  const isAdmin = useSelector(selectIsAdmin);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  // null while reading; "new" or a policy record while an admin is editing.
  const [editing, setEditing] = useState(null);
  const policies = usePolicies({ includeDrafts: isAdmin });
  const savePolicy = useSavePolicy();

  const records = useMemo(() => policies.data || [], [policies.data]);
  const groups = useMemo(() => groupPolicies(records, { includeDrafts: isAdmin, search }), [records, isAdmin, search]);
  const visible = groups.flatMap((group) => group.items);
  const selected = visible.find((record) => record.id === params.get("policy")) || visible[0];
  const categories = [...new Set(records.map((record) => record.category).filter(Boolean))];

  const select = (id) => {
    setEditing(null);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("policy", id);
      return next;
    }, { replace: true });
  };
  const startEditing = (policy) => {
    savePolicy.reset();
    setEditing(policy);
  };
  const save = (values) => savePolicy.mutate(values, {
    onSuccess: (id) => {
      toast.success(values.id ? "Policy updated" : "Policy created");
      select(id);
    },
  });

  return (
    <main className={`min-h-full space-y-5 ${pageGutter}`}>
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Company handbook</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Terms &amp; policies</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The terms of using this portal and the policies that apply to everyone at work. {isAdmin ? "You can add and update them; employees can read published ones." : "Check back when they change; each update shows a new version and date."}
          </p>
        </div>
        {isAdmin && (
          <div data-tour="policy-admin-actions" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => startEditing("new")} className={primaryButton}><Plus size={16} aria-hidden="true" />New policy</button>
          </div>
        )}
      </header>

      {policies.isPending ? (
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Loading policies…</p>
      ) : policies.isError ? (
        <div role="alert" className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-destructive">{policies.error.message || "Could not load policies."}</p>
          <button type="button" onClick={() => policies.refetch()} className="mt-3 text-sm font-semibold text-primary">Try again</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside data-tour="policy-nav" className="space-y-3 lg:sticky lg:top-0">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
              <Search size={15} className="shrink-0" aria-hidden="true" />
              <span className="sr-only">Search policies</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search policies" className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </label>

            {visible.length > 0 && (
              <label className="block lg:hidden">
                <span className="sr-only">Choose a policy</span>
                <select value={selected?.id || ""} onChange={(event) => select(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary">
                  {groups.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.items.map((record) => <option key={record.id} value={record.id}>{record.name}{record.status !== "published" ? " (draft)" : ""}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}

            <nav aria-label="Policies" className="hidden rounded-2xl border border-border bg-card p-3 shadow-sm lg:block">
              {groups.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">{search ? "No policies match your search." : "No policies yet."}</p>
              ) : groups.map((group) => (
                <div key={group.category} className="mb-3 last:mb-0">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.category}</p>
                  <ul>
                    {group.items.map((record) => {
                      const active = record.id === selected?.id && editing === null;
                      return (
                        <li key={record.id}>
                          <button
                            type="button"
                            onClick={() => select(record.id)}
                            aria-current={active ? "page" : undefined}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${active ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted"}`}
                          >
                            <FileText size={15} className="shrink-0 opacity-70" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{record.name}</span>
                            {record.status !== "published" && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Draft</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {editing !== null ? (
            <PolicyEditor
              key={editing === "new" ? "new" : editing.id}
              policy={editing === "new" ? null : editing}
              categories={categories}
              saving={savePolicy.isPending}
              error={savePolicy.error?.message || ""}
              onSave={save}
              onCancel={() => setEditing(null)}
            />
          ) : selected ? (
            <PolicyArticle key={selected.id} policy={selected} isAdmin={isAdmin} onEdit={() => startEditing(selected)} />
          ) : (
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{search ? <BookOpenCheck size={26} /> : <Library size={26} />}</span>
              <h2 className="mt-4 font-semibold text-foreground">{search ? "No matching policies" : "No policies published yet"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{search ? "Try a different search." : isAdmin ? "Write the first one with New policy." : "Published policies will appear here."}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
