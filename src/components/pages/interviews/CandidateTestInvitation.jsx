import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { recruitmentDate } from "../../../services/recruitmentUtils";

const statusMessages = {
  not_created: "Your test link will appear here once HR creates it.",
  unavailable: "Please ask HR to reissue your test link.",
  expired: "Your test link has expired. Please contact HR for a new link.",
  revoked: "HR has withdrawn this test link. Please contact HR.",
  accepted: "Your test invitation has already been used. Continue in the test window you opened.",
};

export default function CandidateTestInvitation({ query }) {
  const invitation = query.data;
  const expired = invitation?.status === "pending" && Date.parse(invitation.expiresAt) <= Date.now();
  const canOpen = invitation?.status === "pending" && invitation.url && !expired;
  return (
    <section className="mt-5 border-t border-border pt-4" aria-label="Round 1 test" aria-busy={query.isFetching}>
      <h4 className="flex items-center gap-2 text-sm font-medium"><Link2 size={17} className="text-muted-foreground" aria-hidden="true" />Round 1 test</h4>
      {query.isPending ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading your test link…</p>
      ) : query.isError ? (
        <div role="alert" className="mt-3 text-sm">
          <p className="text-destructive">{query.error.message}</p>
          <button type="button" onClick={() => { void query.refetch(); }} disabled={query.isFetching} className="mt-2 rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">Retry test link</button>
        </div>
      ) : canOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={invitation.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Open test<ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="text-xs text-muted-foreground">Available until {recruitmentDate(invitation.expiresAt)}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{statusMessages[expired ? "expired" : invitation?.status] || "Your test link is unavailable. Please refresh or contact HR."}</p>
      )}
    </section>
  );
}
