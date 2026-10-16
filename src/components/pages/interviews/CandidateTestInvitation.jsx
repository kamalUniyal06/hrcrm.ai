import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { recruitmentDate } from "../../../services/recruitmentUtils";
import { CandidateChip } from "../candidate/candidateUi";
import { candidateStyles } from "../candidate/candidateStyles";
import { onboardingStyles } from "../profile/onboardingStyles";

const statusMessages = {
  not_created: "Your test link will appear here once HR creates it.",
  unavailable: "Please ask HR to reissue your test link.",
  expired: "Your test link has expired. Please contact HR for a new link.",
  revoked: "HR has withdrawn this test link. Please contact HR.",
  accepted: "Your test invitation has already been used. Continue in the test window you opened.",
};

/** The Round 1 test as a to-do item: what to do, by when, and the button to do it. */
export default function CandidateTestInvitation({ query, roundLabel = "Round 1", jobTitle = "" }) {
  const invitation = query.data;
  const expired = invitation?.status === "pending" && Date.parse(invitation.expiresAt) <= Date.now();
  const canOpen = invitation?.status === "pending" && invitation.url && !expired;
  const due = canOpen ? recruitmentDate(invitation.expiresAt) : "";
  return (
    <article
      className={cn(candidateStyles.card, "flex flex-wrap items-center gap-4 p-4 sm:p-5")}
      aria-label={`${roundLabel} test`}
      aria-busy={query.isFetching}
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-[14px] border", canOpen ? cn(candidateStyles.attentionBox, candidateStyles.attentionText) : "border-border bg-muted text-muted-foreground")}>
        <Link2 size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">Complete the {roundLabel} test</h3>
          {canOpen && <CandidateChip tone="attention">Due {due}</CandidateChip>}
        </div>
        {query.isPending ? (
          <p role="status" className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading your test link…
          </p>
        ) : query.isError ? (
          <div role="alert" className="mt-1 text-[13px]">
            <p className="text-destructive">{query.error.message}</p>
            <button type="button" onClick={() => { void query.refetch(); }} disabled={query.isFetching} className="mt-1 rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
              Retry test link
            </button>
          </div>
        ) : canOpen ? (
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {jobTitle ? `${jobTitle} · ` : ""}Open until <span className="font-semibold text-foreground">{due}</span>. Finish it before your {roundLabel} interview.
          </p>
        ) : (
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {statusMessages[expired ? "expired" : invitation?.status] || "Your test link is unavailable. Please refresh or contact HR."}
          </p>
        )}
      </div>
      {canOpen && (
        <a href={invitation.url} target="_blank" rel="noopener noreferrer" className={cn(onboardingStyles.primary, "w-full sm:w-auto")}>
          Open test
          <ExternalLink size={15} aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
