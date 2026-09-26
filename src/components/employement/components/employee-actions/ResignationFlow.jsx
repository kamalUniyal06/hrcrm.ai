import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  LoaderCircle,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ensureResignationRecord,
  updateResignationRecord,
} from "../../api/resignation.api";

const APPROVALS = [
  {
    key: "tl",
    title: "Team lead",
    question: "Have you notified your team lead?",
    tokenField: "tl_token",
    notifyField: "notify_tl",
  },
  {
    key: "manager",
    title: "Manager",
    question: "Have you notified your manager?",
    tokenField: "manager_token",
    notifyField: "notify_manager",
  },
  {
    key: "hr",
    title: "HR",
    question: "Have you notified HR?",
    tokenField: "hr_token",
    notifyField: "notify_hr",
  },
];

const isComplete = (value) => value === true || value === 1 || value === "1";

export default function ResignationFlow({
  open,
  onOpenChange,
  email,
  onAskIncrement,
}) {
  const [stage, setStage] = useState("confirm");
  const [approvalIndex, setApprovalIndex] = useState(0);
  const [record, setRecord] = useState(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStage("confirm");
      setApprovalIndex(0);
      setRecord(null);
      setToken("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const beginProcess = async () => {
    if (!email) {
      setError(
        "Your account email is unavailable. Please refresh and try again.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const resignation = await ensureResignationRecord(email);
      setRecord(resignation);

      const firstPending = APPROVALS.findIndex(
        (approval) => !isComplete(resignation?.[approval.notifyField]),
      );

      if (firstPending === -1) {
        setStage("complete");
      } else {
        setApprovalIndex(firstPending);
        setStage("notify");
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Could not start the resignation process.",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    const approval = APPROVALS[approvalIndex];
    const expectedToken = String(record?.[approval.tokenField] ?? "").trim();

    if (!token.trim()) {
      setError(
        `Enter the token provided by your ${approval.title.toLowerCase()}.`,
      );
      return;
    }

    if (!expectedToken || token.trim() !== expectedToken) {
      setError("That token is not valid. Check it and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isFinalApproval = approvalIndex === APPROVALS.length - 1;
      const update = {
        [approval.notifyField]: "1",
        ...(isFinalApproval ? { status: "Resignation initiated" } : {}),
      };

      await updateResignationRecord(record.id, update);
      setRecord((current) => ({ ...current, ...update }));
      setToken("");

      if (isFinalApproval) {
        setStage("complete");
        toast.success("Resignation process completed successfully.");
      } else {
        setApprovalIndex((index) => index + 1);
        setStage("notify");
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Token was valid, but the approval could not be saved.",
      );
    } finally {
      setLoading(false);
    }
  };

  const approval = APPROVALS[approvalIndex];
  const progress =
    stage === "confirm"
      ? 0
      : stage === "complete"
        ? 100
        : ((approvalIndex + (stage === "token" ? 0.65 : 0.2)) /
          APPROVALS.length) *
        100;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}
    >
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-foreground/55 backdrop-blur-sm"
          />
        </Dialog.Overlay>

        <Dialog.Content asChild aria-describedby="resignation-flow-description">
          <Motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 330, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[9999] flex max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
          >
            <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary via-primary to-[var(--topbtn-secondary)] px-6 py-6 text-primary-foreground">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary-foreground/10 blur-2xl" />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close resignation process"
                className="absolute right-4 top-4 rounded-xl p-2 text-primary-foreground/80 transition hover:bg-primary-foreground/15 hover:text-primary-foreground disabled:opacity-50"
              >
                <X size={20} />
              </button>
              <div className="relative flex items-start gap-4 pr-10">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                  <ShieldCheck size={24} />
                </span>
                <div>
                  <Dialog.Title className="text-xl font-bold">
                    Resignation assistance
                  </Dialog.Title>
                  <Dialog.Description
                    id="resignation-flow-description"
                    className="mt-1 text-sm leading-6 text-primary-foreground/75"
                  >
                    A private, guided process with confirmation at every step.
                  </Dialog.Description>
                </div>
              </div>
              <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <Motion.div
                  className="h-full rounded-full bg-primary-foreground"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <Motion.div
                  key={`${stage}-${approvalIndex}`}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                >
                  {stage === "confirm" && (
                    <div>
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                        <AlertTriangle size={23} />
                      </span>
                      <h3 className="mt-4 text-xl font-bold">
                        Are you sure you want to resign?
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Before beginning the formal process, consider whether a
                        compensation discussion could address your concerns.
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={onAskIncrement}
                          className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <Sparkles size={17} /> Ask for an increment
                        </button>
                        <button
                          type="button"
                          onClick={beginProcess}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
                        >
                          {loading ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <ArrowRight size={17} />
                          )}
                          Yes, continue
                        </button>
                      </div>
                    </div>
                  )}

                  {stage === "notify" && (
                    <div>
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <MessageCircleMore size={23} />
                      </span>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        Step {approvalIndex + 1} of {APPROVALS.length}
                      </p>
                      <h3 className="mt-1 text-xl font-bold">
                        {approval.question}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Speak with your {approval.title.toLowerCase()} first.
                        They will provide the private token required for the
                        next step.
                      </p>
                      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setError(
                              `Please notify your ${approval.title.toLowerCase()} before continuing.`,
                            )
                          }
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                        >
                          Not yet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setStage("token");
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                        >
                          Yes, I notified them <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {stage === "token" && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        verifyToken();
                      }}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <KeyRound size={23} />
                      </span>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        {approval.title} verification
                      </p>
                      <h3 className="mt-1 text-xl font-bold">
                        Enter your approval token
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Enter the token exactly as it was shared with you. It is
                        verified before you can continue.
                      </p>
                      <input
                        autoFocus
                        value={token}
                        onChange={(event) => {
                          setToken(event.target.value);
                          setError("");
                        }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter token"
                        className="mt-5 w-full rounded-2xl border border-border bg-input-background px-4 py-3.5 text-center text-lg font-bold tracking-[0.22em] text-foreground outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setToken("");
                            setError("");
                            setStage("notify");
                          }}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                        >
                          <ArrowLeft size={16} /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !token.trim()}
                          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={17} />
                          )}{" "}
                          Verify token
                        </button>
                      </div>
                    </form>
                  )}

                  {stage === "complete" && (
                    <div className="text-center">
                      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--employee-green-soft)] text-[var(--employee-green)] ring-8 ring-[var(--employee-green-soft)]/50">
                        <Check size={30} />
                      </span>
                      <h3 className="mt-5 text-xl font-bold">
                        Process completed
                      </h3>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        All three tokens have been verified. HR can now continue
                        with your formal resignation request.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </Motion.div>
              </AnimatePresence>

              {error && (
                <Motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </Motion.div>
              )}
            </div>
          </Motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
