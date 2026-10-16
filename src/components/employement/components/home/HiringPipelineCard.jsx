import { CalendarClock, ChevronRight, UserRoundPlus, UserSearch } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import InsightCard, { InsightAvatar, InsightEmpty, InsightError, MiniMetric } from "./InsightCard";
import { appliedDate, friendlyDateTime, workflowTone } from "../../../pages/candidates/candidateView";
import { tint } from "./adminInsights";

// Distinct colours for the stage bar; "Other" and "Unassigned" use the muted tone.
const STAGE_COLORS = ["var(--primary)", "var(--attendance-present)", "var(--attendance-leave)", "var(--attendance-late)", "var(--attendance-absent)"];
const stageColor = (label, index) => (/^(other|unassigned)$/i.test(label) ? "var(--muted-foreground)" : STAGE_COLORS[index % STAGE_COLORS.length]);

/**
 * Hiring overview: candidates added this month by stage, newest candidates, and upcoming interviews.
 * `recent` items are { id, name, designation, stage, record }; `upcoming` items are { id, name, round, date }.
 */
export default function HiringPipelineCard({ total, shortlisted, stages = [], recent = [], upcoming = [], loading, error, interviewsLoading, onRetry, onOpenCandidate, onViewAll, onViewShortlisted, onViewInterviews }) {
  const blank = loading || error;

  return (
    <InsightCard
      icon={UserSearch}
      color="var(--primary)"
      title="Hiring pipeline"
      subtitle="Candidates added this month"
      onViewAll={onViewAll}
    >
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="New candidates" value={blank ? "—" : total} color="var(--primary)" onClick={onViewAll} />
        <MiniMetric label="Shortlisted" value={blank ? "—" : shortlisted} color="var(--attendance-present)" onClick={onViewShortlisted} />
        <MiniMetric label="Upcoming interviews" value={interviewsLoading ? "—" : upcoming.length} color="var(--attendance-leave)" onClick={onViewInterviews} />
      </div>

      {error ? (
        <div className="mt-3"><InsightError message="Candidates could not be loaded." onRetry={onRetry} /></div>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">By stage</p>
            {loading ? (
              <Skeleton height={10} borderRadius={999} className="mt-2" />
            ) : total === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No candidates added this month yet.</p>
            ) : (
              <>
                <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  {stages.map((stage, index) => (
                    <span key={stage.label} className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-700" style={{ width: `${(stage.count / total) * 100}%`, backgroundColor: stageColor(stage.label, index) }} />
                  ))}
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Candidates by stage">
                  {stages.map((stage, index) => (
                    <li key={stage.label} className="flex items-center gap-1.5 text-xs">
                      <span className="size-2 rounded-full" style={{ backgroundColor: stageColor(stage.label, index) }} aria-hidden="true" />
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="font-semibold tabular-nums text-foreground">{stage.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Newest candidates</p>
              {loading ? (
                <ul className="mt-2 space-y-2">{[0, 1, 2].map((index) => <li key={index}><Skeleton height={44} borderRadius={12} /></li>)}</ul>
              ) : recent.length === 0 ? (
                <div className="mt-2"><InsightEmpty icon={UserRoundPlus} title="No new candidates">Applications added this month will appear here.</InsightEmpty></div>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {recent.map((candidate) => {
                    const tone = workflowTone(candidate.stage);
                    return (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => onOpenCandidate(candidate)}
                          className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <InsightAvatar name={candidate.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{candidate.name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">{candidate.designation || appliedDate(candidate.record)}</span>
                          </span>
                          <span className="max-w-[45%] shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: tone, backgroundColor: tint(tone, 12) }}>{candidate.stage}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next interviews</p>
              {interviewsLoading ? (
                <ul className="mt-2 space-y-2">{[0, 1, 2].map((index) => <li key={index}><Skeleton height={44} borderRadius={12} /></li>)}</ul>
              ) : upcoming.length === 0 ? (
                <div className="mt-2"><InsightEmpty icon={CalendarClock} title="Nothing scheduled">Upcoming interviews will appear here.</InsightEmpty></div>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {upcoming.slice(0, recent.length || 4).map((interview) => (
                    <li key={interview.id}>
                      <button
                        type="button"
                        onClick={onViewInterviews}
                        className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ color: "var(--attendance-leave)", backgroundColor: tint("var(--attendance-leave)", 12) }}>
                          <CalendarClock size={15} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{interview.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{interview.round} · {friendlyDateTime(interview.date)}</span>
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </InsightCard>
  );
}
