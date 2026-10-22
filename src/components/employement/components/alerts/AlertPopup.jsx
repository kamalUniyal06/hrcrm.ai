import { createElement } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Clock3, Loader2, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import AlertHtml from "./AlertHtml";
import { typeMeta } from "./alertUi";
import { alertTitle, answerButtonLabel, answerLabel, formatUtcTime } from "./systemAlertUtils";

// Yes is the main action, so it sits on the right; any other single answer is the main action.
const orderAnswers = (answers) => (answers.includes("yes") ? [...answers.filter((answer) => answer !== "yes"), "yes"] : answers);

/**
 * One alert at a time. Buttons come from the alert's allowed answers.
 * `required` = opened by the logout check, which only lists alerts that hold up logout.
 */
export default function AlertPopup({ alert, remaining = 0, required = false, answering = null, onAnswer, onRemindLater, onDismiss }) {
  const open = Boolean(alert);
  const meta = typeMeta(alert?.response_type);
  const busy = Boolean(answering);
  const title = alertTitle(alert);
  const posted = formatUtcTime(alert?.date_entered);
  const canSnooze = alert && !alert.responded && alert.response_type !== "none";
  const answers = orderAnswers(alert?.allowed_answers || []);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onDismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[1002] flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl focus:outline-none"
        >
          {required && (
            <p role="status" className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive sm:px-6">
              <LogOut size={16} aria-hidden="true" />
              Please respond before logging out.
            </p>
          )}

          <header className="flex items-start gap-3 border-b border-border py-4 pl-5 pr-4 sm:gap-4 sm:pl-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              {createElement(meta.icon, { size: 20, "aria-hidden": true })}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {alert?.responded ? "Answered" : meta.chip}
                </span>
                {remaining > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">{remaining} more waiting</span>
                )}
              </div>
              <Dialog.Title className="mt-1.5 text-lg font-semibold leading-snug text-foreground sm:text-xl">{title}</Dialog.Title>
              {posted && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 size={12} aria-hidden="true" /> Posted {posted}
                </p>
              )}
            </div>
            <Dialog.Close
              aria-label="Close alert"
              disabled={busy}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X size={18} />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {alert && <AlertHtml description={alert.description} title={`${title} details`} emptyText="No details were added to this alert." />}
          </div>

          <footer className="border-t border-border bg-muted/40 px-5 py-4 sm:px-6">
            {alert?.responded ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 size={17} className="text-[var(--attendance-present)]" aria-hidden="true" />
                  You answered {answerLabel(alert.answer)}
                  {alert.answered_at && <span className="font-normal text-muted-foreground">· {formatUtcTime(alert.answered_at)}</span>}
                </p>
                <Dialog.Close className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Close
                </Dialog.Close>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{meta.prompt}</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canSnooze && (
                    <button
                      type="button"
                      onClick={onRemindLater}
                      disabled={busy}
                      className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      Remind me later
                    </button>
                  )}
                  {answers.map((answer, index) => {
                    const primary = index === answers.length - 1;
                    return (
                      <button
                        key={answer}
                        type="button"
                        onClick={() => onAnswer(answer)}
                        disabled={busy}
                        className={cn(
                          "inline-flex min-w-24 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                          primary
                            ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                            : "border border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {answering === answer && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                        {answerButtonLabel(answer)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
