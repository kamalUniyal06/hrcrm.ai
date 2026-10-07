import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, CheckCircle2, ClipboardList, Clock3, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import { useRecruitment } from "../../../context/recruitmentContext";
import { findInterviewCandidate, invitationPayload, recruitmentDate, recruitmentEmail, recruitmentName, safeInvitationUrl } from "../../../services/recruitmentUtils";
import { candidateId, isFirstRound } from "../interviews/interviewUtils";
import { fetchAllRecords, fetchCandidateRecord, fetchShortlistSource, shortlistedCandidatesKey } from "../candidates/candidatesApi";
import AssessmentResult from "./AssessmentResult";
import { assessmentLabel, invitationStatus } from "./assessmentPresentation";
import { loadInterviewAssessmentCandidate } from "./interviewAssessmentCandidate";

const buttonClass = "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = `${buttonClass} border-transparent bg-primary text-primary-foreground hover:bg-primary/90`;
const inputClass = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted";

export default function RecruitmentPanel({ initialCandidate, interview, onClose }) {
  const recruitment = useRecruitment();
  const boundToCandidate = Boolean(interview || initialCandidate?.id);
  const matchedCandidate = interview
    ? (initialCandidate?.id ? findInterviewCandidate(interview, [initialCandidate]) : null)
    : initialCandidate;
  const cardCandidate = useQuery({
    queryKey: ["candidates", "assessment-profile", interview?.id, interview ? candidateId(interview) : "", recruitmentEmail(interview)],
    queryFn: () => loadInterviewAssessmentCandidate(interview, initialCandidate, {
      loadById: fetchCandidateRecord,
      loadByEmail: (email) => fetchAllRecords("hrc_candidates", null, { email1: email }),
    }),
    enabled: Boolean(recruitment.isAdmin && interview && !matchedCandidate),
    retry: false,
  });
  const shortlist = useQuery({
    queryKey: shortlistedCandidatesKey,
    queryFn: fetchShortlistSource,
    enabled: recruitment.isAdmin && !boundToCandidate,
    retry: false,
  });
  const candidates = shortlist.isSuccess ? shortlist.data || [] : [];
  const [selectedId, setSelectedId] = useState(String(initialCandidate?.id || ""));
  const [changingCandidate, setChangingCandidate] = useState(!initialCandidate?.id);
  const [busy, setBusy] = useState(false);
  const [returnFocus] = useState(() => document.activeElement);
  const canGenerate = isFirstRound(interview);
  const selectedCandidate = candidates.find((item) => String(item.id) === selectedId) || null;
  // A card's profile is independent of the shortlist and cannot be switched here.
  const candidate = boundToCandidate ? matchedCandidate || cardCandidate.data : selectedCandidate;
  const displayedCandidate = candidate || (boundToCandidate ? interview : null);
  if (!recruitment.isAdmin) return null;
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose?.(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[999] bg-foreground/35 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
    <Dialog.Content
      className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-[560px] flex-col border-l border-border bg-card text-card-foreground shadow-xl shadow-foreground/10 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 [--tw-ease:cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
      onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
      onInteractOutside={(event) => { if (busy) event.preventDefault(); }}
      onCloseAutoFocus={(event) => { if (returnFocus?.isConnected) { event.preventDefault(); returnFocus.focus(); } }}
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">{canGenerate ? <Link2 size={20} /> : <ClipboardList size={20} />}</div>
        <div className="min-w-0 flex-1"><Dialog.Title className="text-lg font-semibold tracking-tight">{canGenerate ? "Round 1 assessment" : "Candidate assessment"}</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-5 text-muted-foreground">{canGenerate ? "Create a personal test link and follow the results." : "Review results and invitation activity."}</Dialog.Description></div>
        <Dialog.Close disabled={busy} className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" aria-label="Close assessment drawer"><X size={20} aria-hidden="true" /></Dialog.Close>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {!recruitment.user && <RecruitmentConnection />}
      <section className="border-b border-border px-5 py-5 sm:px-7" aria-label="Assessment candidate">
      {displayedCandidate && <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium" aria-hidden="true">{recruitmentName(displayedCandidate).split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold [overflow-wrap:anywhere]">{recruitmentName(displayedCandidate)}</p><p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{recruitmentEmail(displayedCandidate) || "No email on this profile"}</p></div>
        {!boundToCandidate && <button type="button" disabled={busy} onClick={() => setChangingCandidate((value) => !value)} aria-expanded={changingCandidate} aria-controls="assessment-candidate-selector" className="min-h-11 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{changingCandidate ? "Done" : "Change"}</button>}
      </div>}
      {!boundToCandidate && (changingCandidate || !candidate) && <div id="assessment-candidate-selector" className={candidate ? "mt-4" : ""}>
      <label htmlFor="assessment-candidate" className="text-xs font-medium">CRM candidate</label>
      <select id="assessment-candidate" value={candidate ? selectedId : ""} onChange={(event) => { setSelectedId(event.target.value); setChangingCandidate(false); }} disabled={!shortlist.isSuccess || busy} className={`${inputClass} mt-2`}>
        <option value="">Select a candidate</option>
        {candidates.map((item) => <option key={item.id} value={item.id}>{recruitmentName(item)}{recruitmentEmail(item) ? ` (${recruitmentEmail(item)})` : " (no email)"}</option>)}
      </select>
      {shortlist.isPending && <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">Loading shortlisted candidates…</p>}
      {shortlist.isError && <p role="alert" className="mt-2 text-xs leading-relaxed text-destructive">{shortlist.error.message} <button type="button" onClick={() => { void shortlist.refetch(); }} disabled={shortlist.isFetching} className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry candidates</button></p>}
      {shortlist.isSuccess && !candidates.length && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">No shortlisted candidates are available.</p>}
      </div>}
      </section>
      {candidate ? <CandidateAssessment key={candidate.id} candidate={candidate} canGenerate={canGenerate} onBusyChange={setBusy} /> : boundToCandidate ? <div className="px-5 py-6 sm:px-7">
        {cardCandidate.isError ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive">{cardCandidate.error.message} <button type="button" onClick={() => { void cardCandidate.refetch(); }} disabled={cardCandidate.isFetching} className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry candidate details</button></p> : <div role="status" className="space-y-4"><div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="h-20 rounded-lg bg-muted motion-safe:animate-pulse" /><p className="text-sm text-muted-foreground">Loading this candidate's details...</p></div>}
      </div> : <div className="px-7 py-12 text-center"><UserRound size={28} strokeWidth={1.5} className="mx-auto text-muted-foreground" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold">Choose a candidate to begin</h3><p className="mx-auto mt-2 max-w-72 text-sm leading-6 text-muted-foreground">Select their CRM profile above to review assessment results.</p></div>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/25 px-5 py-3 sm:px-7"><span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} aria-hidden="true" />{recruitment.user ? "Connected through HRCRM" : "HRCRM assessment access"}</span><Dialog.Close disabled={busy} className={buttonClass}>Done</Dialog.Close></footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function RecruitmentConnection() {
  const recruitment = useRecruitment();
  if (recruitment.session.isFetching) return <p role="status" className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-4 py-3 text-xs text-secondary-foreground sm:px-6"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" />Authorizing assessment access through HRCRM...</p>;
  return <div className="border-b border-border bg-muted/30 p-4 sm:px-6"><p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive [overflow-wrap:anywhere]">{recruitment.session.error?.message || "Assessment access could not be authorized."} <button onClick={() => recruitment.session.refetch()} className="cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">Retry connection</button></p></div>;
}

function CandidateAssessment({ candidate, canGenerate, onBusyChange }) {
  const { user, canInvite, request, owner, links, rememberLink } = useRecruitment();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const reference = String(candidate.id).trim();
  const email = recruitmentEmail(candidate);
  const queryKey = ["recruitment", owner, "candidate", reference, email];
  const query = useQuery({
    queryKey,
    enabled: Boolean(user), retry: false, staleTime: 15000,
    queryFn: async ({ signal }) => {
      const history = await request("/invitations", { params: { external_reference: reference }, signal });
      if (!Array.isArray(history.invitations)) throw new Error("The recruitment service returned an invalid invitation history.");
      if (history.invitations.some((item) => String(item.external_reference) !== reference))
        throw new Error("The recruitment backend needs the candidate-bound invitation update before HRCRM can generate personal links.");
      // Follow the bound registration, never a fuzzy email match.
      const accepted = history.invitations.find((item) => String(item.external_reference) === reference && item.status === "accepted" && item.candidate_id);
      let registeredId = accepted?.candidate_id;
      if (!registeredId && email) {
        let page = 1;
        let pages = 1;
        do {
          const matches = await request("/candidates", { params: { search: email, page, page_size: 100 }, signal });
          if (!Array.isArray(matches.candidates)) throw new Error("The recruitment service returned an invalid candidate list.");
          registeredId = matches.candidates.find((item) => recruitmentEmail(item) === email)?.id;
          pages = Number(matches.pagination?.total_pages) || 1;
          page += 1;
        } while (!registeredId && page <= pages);
      }
      const detail = registeredId ? await request(`/candidates/${encodeURIComponent(registeredId)}`, { signal }) : null;
      return { invitations: history.invitations, detail };
    },
  });
  let validation = "";
  try { invitationPayload(candidate); } catch (err) { validation = err.message; }
  const active = query.data?.invitations.find((item) => invitationStatus(item) === "pending");
  const registered = query.data?.detail?.candidate;
  const issued = links[reference];
  const issuedActive = issued && recruitmentDate(issued.invitation.expires_at) && invitationStatus(issued.invitation) === "pending" && query.data?.invitations.some((item) => String(item.id) === String(issued.invitation.id) && invitationStatus(item) === "pending");
  const link = issuedActive ? safeInvitationUrl(issued.invitation_url) : "";
  async function create() {
    if (lock.current || !canGenerate || !canInvite || !query.isSuccess || registered) return;
    lock.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setCopied(false);
    try {
      const data = await request("/invitations", { method: "POST", body: invitationPayload(candidate) });
      if (!safeInvitationUrl(data.invitation_url) || !data.invitation?.id || String(data.invitation.external_reference) !== reference || data.invitation.intended_email?.toLowerCase() !== email)
        throw new Error("The recruitment service did not return a candidate-bound invitation. Deploy its HRCRM integration update, then refresh status before retrying.");
      rememberLink(reference, data);
      client.setQueryData(queryKey, (previous) => ({
        ...previous,
        invitations: [data.invitation, ...(previous?.invitations || []).map((item) => item.status === "pending" ? { ...item, status: "revoked" } : item)],
      }));
      setConfirmReplace(false);
      setUncertain(false);
      void client.invalidateQueries({ queryKey });
    } catch (err) { setError(err.message); setUncertain(true); setConfirmReplace(false); }
    finally { setBusy(false); onBusyChange(false); lock.current = false; }
  }
  async function refresh() {
    const result = await query.refetch();
    if (result.isSuccess) { setUncertain(false); setError(""); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setError("");
    } catch { setError("Clipboard access is unavailable. Select the link below and copy it manually."); }
  }
  return <div className="px-5 py-5 sm:px-7">
    {validation && <p role="alert" className="mb-4 rounded-lg border border-border bg-secondary p-3 text-sm leading-6 text-secondary-foreground">{validation}</p>}
    {user && <>
      {query.isPending ? <div role="status" className="space-y-4"><div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="h-5 w-48 rounded bg-muted motion-safe:animate-pulse" /><div className="h-20 rounded-lg bg-muted motion-safe:animate-pulse" /><span className="sr-only">Loading invitation and assessment status...</span></div> : query.isError ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive [overflow-wrap:anywhere]">{query.error.message} <button onClick={refresh} disabled={query.isFetching} className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry</button></p> : <>
        <Tabs.Root defaultValue={registered || !canGenerate ? "results" : "invitation"}>
          <Tabs.List aria-label="Assessment views" className="mb-6 flex gap-1 border-b border-border">
            {[{ value: "invitation", label: "Test link", Icon: Link2 }, { value: "results", label: "Results", Icon: ClipboardList }].map(({ value, label, Icon }) => { const TabIcon = Icon; return <Tabs.Trigger key={value} value={value} className="-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-4 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:text-primary"><TabIcon size={16} aria-hidden="true" />{label}</Tabs.Trigger>; })}
          </Tabs.List>
          <Tabs.Content value="invitation" className="space-y-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {registered ? <div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><div><h3 className="text-base font-semibold">Invitation accepted</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">The candidate has registered. Open Results to follow their assessment.</p></div></div> : <>
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground"><Clock3 size={15} aria-hidden="true" />Round 1<span aria-hidden="true">&middot;</span>One-time access<span aria-hidden="true">&middot;</span>Valid for 7 days</div>
                <h3 className="text-base font-semibold">{link ? "Your test link is ready" : active ? "Test link already created" : "Invite to the assessment"}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{active ? `Awaiting registration. Expires ${recruitmentDate(active.expires_at)}.` : "Create a personal link for this candidate. Only their email address can use it."}</p>
              </div>
              {link && <section aria-label="Generated test link" className="space-y-3">
                <p role="status" className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={17} className="text-primary" aria-hidden="true" />Test link generated</p>
                <label htmlFor="generated-assessment-link" className="sr-only">Personal test link</label>
                <input id="generated-assessment-link" className={`${inputClass} text-xs`} value={link} readOnly onFocus={(event) => event.target.select()} />
                <div className="flex flex-wrap gap-2"><button onClick={copy} className={`${primaryClass} flex-1`}><span aria-hidden="true">{copied ? <Check size={16} /> : <Copy size={16} />}</span>{copied ? "Copied" : "Copy test link"}</button><a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open<ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> test invitation (opens in a new tab)</span></a></div>
                <p className="text-xs leading-5 text-muted-foreground">{issued.candidate_link_available ? "Share the link with the candidate. It is also available in My interviews." : "Copy this link before reloading HRCRM. It cannot be retrieved later."}</p>
              </section>}
              {!link && active && <p className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">The existing URL is unavailable in this session. Create a replacement if you need to share it again.</p>}
              {canGenerate ? canInvite ? <>
                {!confirmReplace && <button className={active ? `${buttonClass} w-full` : `${primaryClass} w-full`} disabled={busy || !!validation || uncertain || query.isFetching} onClick={() => active ? setConfirmReplace(true) : void create()}>{busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}{busy ? "Generating..." : active ? "Replace test link" : "Generate test link"}</button>}
                {confirmReplace && <div className="rounded-lg border border-border bg-secondary p-4" role="alert"><h4 className="text-sm font-semibold">Replace the existing link?</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">The previous unused link will stop working. Share the new link with the candidate.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || query.isFetching || !!validation || uncertain} className={primaryClass} onClick={create}>{busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{busy ? "Replacing..." : "Replace link"}</button><button disabled={busy} className={buttonClass} onClick={() => setConfirmReplace(false)}>Keep existing link</button></div></div>}
              </> : <p className="text-sm leading-6 text-muted-foreground">An owner, admin or recruiter can generate links. Your role can view assessments.</p> : <p className="text-sm leading-6 text-muted-foreground">To create a test link, open this candidate's Round 1 card on the Interviews board.</p>}
            </>}
          </Tabs.Content>
          <Tabs.Content value="results" className="outline-none focus-visible:ring-2 focus-visible:ring-ring">{registered ? <AssessmentResult detail={query.data.detail} /> : <div className="py-6 text-center"><ClipboardList size={28} strokeWidth={1.5} className="mx-auto text-muted-foreground" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold">No results yet</h3><p className="mx-auto mt-2 max-w-80 text-sm leading-6 text-muted-foreground">{active ? "The candidate has not registered yet. Results will appear once they submit their assessment." : "Results will appear here after the candidate registers and submits their assessment."}</p></div>}</Tabs.Content>
        </Tabs.Root>
        <InvitationHistory invitations={query.data.invitations} />
      </>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive [overflow-wrap:anywhere]">{error}{uncertain && <> The request may have reached the server. <button disabled={query.isFetching || busy} className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" onClick={refresh}>Refresh status</button> before trying again.</>}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4"><p className="max-w-64 text-xs leading-5 text-muted-foreground">Assessment results are separate from CRM interview decisions.</p><button onClick={refresh} disabled={query.isFetching || busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw size={14} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{query.isFetching ? "Refreshing..." : "Refresh status"}</button></div>
    </>}
  </div>;
}

function InvitationHistory({ invitations }) {
  if (!invitations.length) return null;
  return <details className="mt-6 border-t border-border pt-4 text-xs [&>summary]:min-h-11 [&>summary]:cursor-pointer [&>summary]:font-medium [&>summary]:outline-none [&>summary]:focus-visible:ring-2 [&>summary]:focus-visible:ring-ring [&_li]:flex [&_li]:flex-wrap [&_li]:items-center [&_li]:justify-between [&_li]:gap-3 [&_li]:border-b [&_li]:border-border [&_li]:py-3 [&_li]:text-muted-foreground [&_li]:[overflow-wrap:anywhere] [&_li>div]:flex [&_li>div]:flex-wrap [&_li>div]:items-center [&_li>div]:gap-3"><summary>Invitation history <span className="text-xs leading-relaxed text-muted-foreground">({invitations.length})</span></summary><ul>{invitations.map((item) => {
    const status = invitationStatus(item);
    return <li key={item.id}><div><span className={`inline-flex w-fit shrink-0 items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground capitalize ${status === "accepted" ? "bg-primary/10 text-primary" : ""}`}>{status === "pending" ? "Awaiting registration" : assessmentLabel(status)}</span><span>{recruitmentDate(item.created_at)}</span></div><span>{item.intended_email || item.candidate_email}</span></li>;
  })}</ul></details>;
}
