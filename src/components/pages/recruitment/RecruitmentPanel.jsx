import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useRecruitment } from "../../../context/recruitmentContext";
import { invitationPayload, recruitmentDate, recruitmentEmail, recruitmentName, safeInvitationUrl } from "../../../services/recruitmentUtils";
import { isFirstRound } from "../interviews/interviewUtils";
import { fetchShortlistSource, shortlistedCandidatesKey } from "../candidates/candidatesApi";

export default function RecruitmentPanel({ initialCandidate, interview, onClose }) {
  const recruitment = useRecruitment();
  const shortlist = useQuery({
    queryKey: shortlistedCandidatesKey,
    queryFn: fetchShortlistSource,
    enabled: recruitment.isAdmin,
    retry: false,
  });
  const candidates = shortlist.isSuccess ? shortlist.data || [] : [];
  const [selectedId, setSelectedId] = useState(String(initialCandidate?.id || ""));
  const canGenerate = isFirstRound(interview);
  const selectedCandidate = candidates.find((item) => String(item.id) === selectedId) || null;
  // Direct assessment viewing can follow a profile that has moved beyond the shortlist.
  const viewedCandidate = !canGenerate && String(initialCandidate?.id || "") === selectedId ? initialCandidate : null;
  const candidate = selectedCandidate || viewedCandidate;
  if (!recruitment.isAdmin) return null;
  return <section className="mb-7 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm shadow-foreground/[.025]" aria-label="Assessment invitations" id="assessment-invitations">
    <header className="flex items-start gap-3 border-b border-border px-4 py-5 sm:items-center sm:px-6">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Link2 size={20} /></div>
      <div className="flex-1"><h2 className="text-base font-semibold tracking-tight">{canGenerate ? "Assessment invitation" : "Candidate assessment"}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{canGenerate ? "Create a Round 1 test link, then track the candidate's progress." : "View assessment invitations and the candidate's progress."}</p></div>
      {onClose && <button className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={onClose} aria-label="Close assessment invitations"><X size={19} /></button>}
    </header>
    {recruitment.user ? <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-4 py-3 text-xs text-secondary-foreground sm:px-6"><span className="inline-flex items-center gap-2"><ShieldCheck size={15} aria-hidden="true" />Assessment access is ready through your HRCRM session.</span></div> : <RecruitmentConnection />}
    <div className="max-w-2xl px-4 pt-5 sm:px-6 [&>label]:text-xs [&>label]:font-medium [&>select]:mt-2">
      <label htmlFor="assessment-candidate">CRM candidate</label>
      <select id="assessment-candidate" value={selectedCandidate ? selectedId : ""} onChange={(event) => setSelectedId(event.target.value)} disabled={!shortlist.isSuccess} className="min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:bg-muted">
        <option value="">Select a candidate</option>
        {candidates.map((item) => <option key={item.id} value={item.id}>{recruitmentName(item)}{recruitmentEmail(item) ? ` (${recruitmentEmail(item)})` : " (no email)"}</option>)}
      </select>
      {!candidate && canGenerate && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Select the CRM profile for {recruitmentName(interview)}{recruitmentEmail(interview) ? ` (${recruitmentEmail(interview)})` : ""} to create their test link.</p>}
      {shortlist.isPending && <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">Loading shortlisted candidates…</p>}
      {shortlist.isError && <p role="alert" className="mt-2 text-xs leading-relaxed text-destructive">{shortlist.error.message} <button type="button" onClick={() => { void shortlist.refetch(); }} disabled={shortlist.isFetching} className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry candidates</button></p>}
      {shortlist.isSuccess && !candidates.length && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">No shortlisted candidates are available.</p>}
      {!selectedCandidate && viewedCandidate && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Viewing {recruitmentName(viewedCandidate)}. Only shortlisted candidates are available in the selector.</p>}
    </div>
    {candidate ? <CandidateAssessment key={candidate.id} candidate={candidate} canGenerate={canGenerate} /> : <p className="px-4 pt-4 pb-6 text-xs text-muted-foreground sm:px-6">{canGenerate ? "Choose a candidate to generate a Round 1 test link or check their assessment." : "Choose a candidate to check their assessment."}</p>}
  </section>;
}

function RecruitmentConnection() {
  const recruitment = useRecruitment();
  if (recruitment.session.isFetching) return <p role="status" className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-4 py-3 text-xs text-secondary-foreground sm:px-6"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" />Authorizing assessment access through HRCRM...</p>;
  return <div className="border-b border-border bg-muted/30 p-4 sm:px-6"><p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive [overflow-wrap:anywhere]">{recruitment.session.error?.message || "Assessment access could not be authorized."} <button onClick={() => recruitment.session.refetch()} className="cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">Retry connection</button></p></div>;
}

function CandidateAssessment({ candidate, canGenerate }) {
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
  const active = query.data?.invitations.find((item) => item.status === "pending");
  const registered = query.data?.detail?.candidate;
  const issued = links[reference];
  const issuedActive = issued && query.data?.invitations.some((item) => String(item.id) === String(issued.invitation.id) && item.status === "pending") && Date.parse(issued.invitation.expires_at) > Date.now();
  const link = issuedActive ? safeInvitationUrl(issued.invitation_url) : "";
  async function create() {
    if (lock.current || !canGenerate || !canInvite || !query.isSuccess || registered) return;
    lock.current = true;
    setBusy(true);
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
    finally { setBusy(false); lock.current = false; }
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
  return <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3 [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground"><div><h3 className="text-sm font-semibold">{recruitmentName(candidate)}</h3><p className="break-all">{email || "No email on this profile"}</p></div><span className="inline-flex w-fit shrink-0 items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground capitalize">Personal, one-time link</span></div>
    {validation && <p role="alert" className="rounded-lg border border-border bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground [overflow-wrap:anywhere]">{validation}</p>}
    {user && <>
      {query.isPending ? <div role="status" className="space-y-3"><div className="rounded-md bg-muted motion-safe:animate-pulse h-5 w-48" /><div className="rounded-md bg-muted motion-safe:animate-pulse mt-3 h-10" /><span className="sr-only">Loading invitation and assessment status...</span></div> : query.isError ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive [overflow-wrap:anywhere]">{query.error.message} <button onClick={refresh} className="cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">Retry</button></p> : <>
        {registered ? <AssessmentResult detail={query.data.detail} /> : !canGenerate ? <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Test links can only be generated from Round 1 on the Interviews board.</p> : <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center [&_p]:mt-1.5 [&_p]:max-w-2xl [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-muted-foreground">
          <div><h4 className="text-sm font-semibold">{active ? "An unused invitation is active" : "Ready for an assessment"}</h4><p>{active ? `Expires ${recruitmentDate(active.expires_at)}. Creating a replacement disables the previous link.` : "The link is bound to this email address and expires after seven days."}</p></div>
          {canInvite ? <button className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 border-primary bg-primary text-primary-foreground hover:bg-primary/85" disabled={busy || !!validation || uncertain || confirmReplace} onClick={() => active ? setConfirmReplace(true) : void create()}>{busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <Link2 size={16} />}{busy ? "Generating..." : active ? "Replace test link" : "Generate test link"}</button> : <p className="text-xs leading-relaxed text-muted-foreground">Your recruitment role can view assessments. An owner, admin or recruiter can generate links.</p>}
        </div>}
        {canGenerate && confirmReplace && <div className="rounded-lg border border-border bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground [overflow-wrap:anywhere]" role="alert"><p>The previous unused link will stop working. Share the replacement with the candidate.</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 border-primary bg-primary text-primary-foreground hover:bg-primary/85" onClick={create}>Replace unused link</button><button disabled={busy} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setConfirmReplace(false)}>Keep existing link</button></div></div>}
        {link && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 [&>p]:mt-2 [&>p]:text-xs [&>p]:leading-relaxed [&>p]:text-muted-foreground" role="status">
          <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Check size={16} /> Test link generated</h4><p>{issued.candidate_link_available ? "Copy this link to share it. The candidate can also open it from Round 1 in My interviews." : "Copy this link now. It cannot be retrieved after reloading HRCRM."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:flex-nowrap [&>input]:min-w-0 [&>input]:flex-[1_1_100%] sm:[&>input]:flex-1"><input aria-label="Generated assessment invitation link" className="min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:bg-muted" value={link} readOnly onFocus={(event) => event.target.select()} /><button onClick={copy} className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy link"}</button><a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Open test invitation" title="Open test invitation"><ExternalLink size={17} /></a></div>
        </div>}
        <InvitationHistory invitations={query.data.invitations} />
      </>}
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive [overflow-wrap:anywhere]">{error}{uncertain && <> The request may have reached the server. <button className="cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={refresh}>Refresh status</button> before trying again.</>}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[11px] text-muted-foreground"><span>Assessment outcomes do not change CRM interview decisions.</span><button onClick={refresh} disabled={query.isFetching || busy} className="cursor-pointer rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2"><RefreshCw size={14} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />Refresh status</button></div>
    </>}
  </div>;
}

function AssessmentResult({ detail }) {
  const candidate = detail.candidate;
  return <section className="border-t border-border pt-5" aria-label="Assessment result">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Assessment progress</h4><span className={`inline-flex w-fit shrink-0 items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground capitalize ${candidate.result === "passed" ? "bg-secondary text-secondary-foreground" : candidate.result === "failed" || candidate.result === "review_required" ? "border border-border bg-secondary text-secondary-foreground" : ""}`}>{String(candidate.status || "Registered").replaceAll("_", " ")}</span></div>
    <dl className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4 [&_dt]:text-[11px] [&_dt]:text-muted-foreground [&_dd]:mt-1.5 [&_dd]:text-xs [&_dd]:font-semibold [&_dd]:capitalize"><div><dt>Score</dt><dd>{candidate.question_count ? `${candidate.score} / ${candidate.question_count}` : "Awaiting submission"}</dd></div><div><dt>Result</dt><dd>{String(candidate.result || "pending").replaceAll("_", " ")}</dd></div><div><dt>Hiring decision</dt><dd>{candidate.decision || "Pending"}</dd></div><div><dt>Integrity warnings</dt><dd>{candidate.warning_count ?? 0}</dd></div></dl>
    {detail.rounds?.length > 0 && <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[11px] [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-3 [&_td]:whitespace-nowrap"><caption className="sr-only">Submitted assessment rounds</caption><thead><tr><th scope="col">Round</th><th scope="col">Score</th><th scope="col">Pass threshold</th><th scope="col">Outcome</th></tr></thead><tbody>{detail.rounds.map((round) => <tr key={round.round}><td>Round {round.round}</td><td>{round.score} / {round.question_count}</td><td>{round.pass_percentage}%</td><td>{round.is_passed ? "Passed" : "Failed"}</td></tr>)}</tbody></table></div>}
    {!detail.rounds?.length && <p className="text-xs leading-relaxed text-muted-foreground">The candidate has registered. Submitted round scores will appear here.</p>}
  </section>;
}

function InvitationHistory({ invitations }) {
  if (!invitations.length) return null;
  return <details className="border-t border-border pt-4 text-xs [&>summary]:min-h-10 [&>summary]:cursor-pointer [&>summary]:font-medium [&>summary]:outline-none [&>summary]:focus-visible:ring-2 [&>summary]:focus-visible:ring-ring/50 [&_li]:flex [&_li]:flex-wrap [&_li]:items-center [&_li]:justify-between [&_li]:gap-3 [&_li]:border-b [&_li]:border-border [&_li]:py-3 [&_li]:text-muted-foreground [&_li]:[overflow-wrap:anywhere] [&_li>div]:flex [&_li>div]:flex-wrap [&_li>div]:items-center [&_li>div]:gap-3"><summary>Invitation history <span className="text-xs leading-relaxed text-muted-foreground">({invitations.length})</span></summary><ul>{invitations.map((item) => <li key={item.id}><div><span className={`inline-flex w-fit shrink-0 items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground capitalize ${item.status === "accepted" ? "bg-secondary text-secondary-foreground" : ""}`}>{item.status === "pending" ? "Awaiting registration" : item.status}</span><span>{recruitmentDate(item.created_at)}</span></div><span>{item.intended_email || item.candidate_email}</span></li>)}</ul></details>;
}
