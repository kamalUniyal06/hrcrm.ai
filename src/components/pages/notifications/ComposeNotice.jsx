import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookups, useMe, usePeople, useSendNotification } from "../../../queries/hr.queries";
import { useHrAccess } from "../../../hooks/useHrAccess";
import { noticeAudiences, noticeTargets } from "../../../utils/hrRecords";
import { candidateStyles } from "../candidate/candidateStyles";
import { ActionDialog, fieldClass, primaryButton } from "../org/orgUi";

const EMPTY = { audience: "", targetId: "", title: "", body: "", hot: false, linkUrl: "", expiresOn: "" };

/** Send a notice to the people the sender's role can reach: a team, a department, a role, one person or everyone. */
export default function ComposeNotice({ open, onClose }) {
  const access = useHrAccess();
  const scope = access.scopeOf("notifications", "create");
  const audiences = useMemo(() => noticeAudiences(scope), [scope]);
  const [form, setForm] = useState(EMPTY);
  const audience = form.audience || audiences[0]?.[0] || "";
  const me = useMe();
  const lookups = useLookups();
  const people = usePeople(undefined, { enabled: open && audience === "employee" });
  const send = useSendNotification();
  const targets = useMemo(
    () => noticeTargets(audience, { scope, me: me.data, lookups: lookups.data, people: people.data?.people }),
    [audience, scope, me.data, lookups.data, people.data],
  );
  const targetId = targets.some((target) => target.id === form.targetId) ? form.targetId : targets[0]?.id || "";
  const needsTarget = audience !== "all";
  const loadingTargets = needsTarget && !targets.length && (lookups.isPending || (audience === "employee" && people.isPending));

  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value, ...(key === "audience" ? { targetId: "" } : {}) }));
  };
  const close = () => {
    setForm(EMPTY);
    onClose();
  };
  const submit = (event) => {
    event.preventDefault();
    send.mutate(
      {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.hot ? "hot" : "general",
        forNotification: audience,
        targetId,
        linkUrl: form.linkUrl.trim(),
        expiresOn: form.expiresOn,
      },
      {
        onSuccess: (result) => {
          const count = Number(result?.notification?.recipient_count) || 0;
          toast.success(count ? `Sent to ${count} ${count === 1 ? "person" : "people"}` : "Notice sent");
          close();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ActionDialog open={open} onClose={close} title="Send a notice" description="It shows up in each person's notifications. You can see who has read it under Sent.">
      {audiences.length ? (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notice-audience" className="text-sm font-semibold text-foreground">Send to</label>
              <select id="notice-audience" value={audience} onChange={update("audience")} className={fieldClass}>
                {audiences.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            {needsTarget && (
              <div>
                <label htmlFor="notice-target" className="text-sm font-semibold text-foreground">
                  {{ team: "Team", department: "Department", role: "Role", employee: "Person" }[audience]}
                </label>
                <select id="notice-target" required value={targetId} onChange={update("targetId")} disabled={!targets.length} className={fieldClass}>
                  {!targets.length && <option value="">{loadingTargets ? "Loading…" : "Nothing you can send to"}</option>}
                  {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="notice-title" className="text-sm font-semibold text-foreground">Title</label>
            <input id="notice-title" required maxLength={255} value={form.title} onChange={update("title")} placeholder="e.g. Stand-up moves to 11:00 tomorrow" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="notice-body" className="text-sm font-semibold text-foreground">Message <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea id="notice-body" rows={4} value={form.body} onChange={update("body")} className={cn(fieldClass, "py-2")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notice-link" className="text-sm font-semibold text-foreground">Link <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="notice-link" value={form.linkUrl} onChange={update("linkUrl")} placeholder="/my-leaves or https://…" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="notice-expires" className="text-sm font-semibold text-foreground">Hide after <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="notice-expires" type="date" value={form.expiresOn} onChange={update("expiresOn")} className={fieldClass} />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <input type="checkbox" checked={form.hot} onChange={update("hot")} className="mt-0.5 size-4 accent-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Mark as important</span>
              <span className="block text-xs text-muted-foreground">Shows a red dot on their bell until they read it.</span>
            </span>
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className={candidateStyles.ghost}>Cancel</button>
            <button type="submit" disabled={send.isPending || (needsTarget && !targetId)} className={primaryButton}>
              <Send size={15} aria-hidden="true" /> {send.isPending ? "Sending…" : "Send notice"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Your role can't send notices to anyone yet. Ask HR or your admin for "My team" access on Notifications.</p>
      )}
    </ActionDialog>
  );
}
