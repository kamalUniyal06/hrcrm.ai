import { CheckCircle2, CircleAlert, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { assessmentLabel, assessmentScore } from "./assessmentPresentation";

const outcomes = {
  passed: { label: "Passed", Icon: CheckCircle2, style: "bg-chart-2/10 text-foreground", copy: "The candidate met the assessment requirements." },
  failed: { label: "Failed", Icon: XCircle, style: "bg-destructive/10 text-destructive", copy: "The candidate did not meet the assessment requirements." },
  review_required: { label: "Review required", Icon: CircleAlert, style: "bg-chart-4/15 text-foreground", copy: "Review the assessment and integrity warnings before deciding." },
};

export default function AssessmentResult({ detail }) {
  const candidate = detail.candidate;
  const score = assessmentScore(candidate.score, candidate.question_count);
  const outcome = outcomes[candidate.result] || {
    label: "Awaiting result", Icon: Clock3, style: "bg-muted text-muted-foreground",
    copy: "The candidate has registered. Results will appear after submission.",
  };
  const Icon = outcome.Icon;
  return <section aria-label="Assessment result" className="space-y-6">
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Assessment result</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${outcome.style}`}><Icon size={15} aria-hidden="true" />{outcome.label}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{outcome.copy}</p>
    </div>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-5 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:mt-1.5 [&_dd]:text-sm [&_dd]:font-medium [&_dd]:capitalize">
      <div><dt>Total score</dt><dd className="tabular-nums">{score ? `${score.earned} / ${score.total} (${score.percentage}%)` : "Awaiting submission"}</dd></div>
      <div><dt>Test status</dt><dd>{assessmentLabel(candidate.status, "Registered")}</dd></div>
      <div><dt>Hiring decision</dt><dd>{assessmentLabel(candidate.decision)}</dd></div>
      <div><dt>Integrity warnings</dt><dd className="flex items-center gap-1.5 tabular-nums">{Number(candidate.warning_count) > 0 ? <CircleAlert size={15} className="text-destructive" aria-hidden="true" /> : <ShieldCheck size={15} className="text-muted-foreground" aria-hidden="true" />}{candidate.warning_count ?? 0}</dd></div>
    </dl>
    {detail.rounds?.length > 0 ? <div>
      <h4 className="mb-1 text-sm font-semibold">Round breakdown</h4>
      <ul className="divide-y divide-border">{detail.rounds.map((round) => {
        const roundScore = assessmentScore(round.score, round.question_count);
        const passed = round.is_passed === true || round.is_passed === 1 || round.is_passed === "1";
        const hasOutcome = passed || round.is_passed === false || round.is_passed === 0 || round.is_passed === "0";
        return <li key={round.round} className="py-4">
          <div className="flex items-center justify-between gap-3"><h5 className="text-sm font-medium">Round {round.round}</h5><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${hasOutcome && !passed ? "text-destructive" : "text-foreground"}`}>{hasOutcome ? passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{hasOutcome ? passed ? "Passed" : "Failed" : "Pending"}</span></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="tabular-nums">{roundScore ? `${roundScore.earned} / ${roundScore.total} correct (${roundScore.percentage}%)` : "Score unavailable"}</span><span>Pass threshold: {round.pass_percentage == null ? "Unavailable" : `${round.pass_percentage}%`}</span></div>
          {roundScore && <div role="meter" aria-label={`Round ${round.round} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundScore.percentage} aria-valuetext={`${roundScore.earned} of ${roundScore.total} correct`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${hasOutcome && !passed ? "bg-destructive/70" : "bg-primary/70"}`} style={{ width: `${roundScore.percentage}%` }} /></div>}
        </li>;
      })}</ul>
    </div> : <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Clock3 size={17} className="mt-1 shrink-0" aria-hidden="true" />No rounds submitted yet. Refresh status to check for new results.</p>}
  </section>;
}
