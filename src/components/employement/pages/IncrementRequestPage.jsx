import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  IndianRupee,
  Loader2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import growthIllustration from "../../../assets/employement/increment-growth.png";
import {
  clearRememberedIncrement,
  createIncrement,
  createIncrementReply,
  fetchCurrentSalary,
  fetchIncrementQuestions,
  getPendingIncrement,
  getRememberedIncrementId,
  rememberIncrementId,
} from "../api/increment.api";

const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

export default function IncrementRequestPage() {
  const navigate = useNavigate();
  const email = useSelector((state) => state.user.user?.email)?.trim() || "";
  const employeeId = useSelector((state) => state.user.userInfo?.id);
  const [stage, setStage] = useState("loading");
  const [incrementId, setIncrementId] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [salaryIsFallback, setSalaryIsFallback] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(true);
  const [expectedSalary, setExpectedSalary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const validSalary =
    Number(currentSalary) > 0 && Number(expectedSalary) > Number(currentSalary);
  const expectedMonthlySalary = Number(expectedSalary) / 12;
  const increasePercentage =
    Number(monthlySalary) > 0
      ? ((expectedMonthlySalary - Number(monthlySalary)) /
          Number(monthlySalary)) *
        100
      : 0;
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.trim()).length,
    [answers, questions],
  );

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const rememberedId = getRememberedIncrementId(email);
      if (!rememberedId) {
        if (active) setStage("salary");
        return;
      }
      try {
        const pending = await getPendingIncrement(rememberedId);
        if (!active) return;
        if (pending?.pendingQuestions.length) {
          setIncrementId(rememberedId);
          setQuestions(pending.pendingQuestions);
          setStage("questions");
        } else {
          clearRememberedIncrement(email);
          setStage("salary");
        }
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message || "Could not restore your request.");
        setStage("salary");
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [email]);

  useEffect(() => {
    let active = true;
    setSalaryLoading(true);
    fetchCurrentSalary(employeeId)
      .then(({ amount, monthlyAmount, isFallback }) => {
        if (!active) return;
        setCurrentSalary(String(amount));
        setMonthlySalary(String(monthlyAmount));
        setSalaryIsFallback(isFallback);
      })
      .finally(() => {
        if (active) setSalaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId]);

  const submitSalary = async (event) => {
    event.preventDefault();
    if (!validSalary) {
      setError("Expected salary must be greater than your current salary.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await createIncrement({ email, expectedSalary });
      rememberIncrementId(email, created.id);
      setIncrementId(created.id);
      const loadedQuestions = await fetchIncrementQuestions();
      setQuestions(loadedQuestions);
      if (loadedQuestions.length) {
        setStage("questions");
        toast.success("Request created. Please complete a few questions.");
      } else {
        clearRememberedIncrement(email);
        setStage("complete");
      }
    } catch (requestError) {
      setError(requestError?.message || "Could not create your request.");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswers = async (event) => {
    event.preventDefault();
    if (answeredCount !== questions.length) {
      setError("Please answer every question before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        questions.map((question) =>
          createIncrementReply({
            incrementId,
            questionId: question.id,
            answer: answers[question.id],
          }),
        ),
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed) {
        const pending = await getPendingIncrement(incrementId);
        if (pending?.pendingQuestions.length) {
          setQuestions(pending.pendingQuestions);
          setAnswers((current) =>
            Object.fromEntries(
              pending.pendingQuestions.map((question) => [
                question.id,
                current[question.id] || "",
              ]),
            ),
          );
          throw failed.reason;
        }
      }
      clearRememberedIncrement(email);
      setStage("complete");
      toast.success("Your increment request is complete.");
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Some answers could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (stage === "loading") {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="animate-pulse rounded-2xl bg-white p-8">
          <div className="h-5 w-28 rounded bg-slate-100" />
          <div className="mt-5 h-10 w-3/5 rounded bg-slate-100" />
          <div className="mt-12 h-28 rounded-xl bg-slate-100" />
        </div>
        <div className="min-h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl py-2 sm:py-5">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 active:translate-y-px"
      >
        <ArrowLeft size={17} /> Back to profile
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(30,64,175,0.08)]">
        <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <section className="order-2 p-6 sm:p-9 lg:order-1 lg:p-12">
            <div className="mb-8 flex items-center gap-3" aria-label="Request progress">
              {["Details", "Questions", "Complete"].map((label, index) => {
                const activeIndex = stage === "salary" ? 0 : stage === "questions" ? 1 : 2;
                const done = index < activeIndex;
                const active = index === activeIndex;
                return (
                  <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${done || active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className={`hidden text-xs font-semibold sm:block ${active ? "text-slate-900" : "text-slate-400"}`}>
                      {label}
                    </span>
                    {index < 2 && <span className="ml-auto h-px flex-1 bg-slate-200" />}
                  </div>
                );
              })}
            </div>

            {stage === "salary" && (
              <form onSubmit={submitSalary} noValidate>
                <p className="text-sm font-semibold text-blue-700">Compensation review</p>
                <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                  Start an honest salary conversation.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                  Share where you are today and what you expect next. Your details will be sent securely to the review team.
                </p>

                <div className="mt-9 grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Current CTC
                    <span className="relative block">
                      <IndianRupee className="pointer-events-none absolute left-4 top-[22px] text-slate-400" size={17} />
                      <input
                        className={`${inputClass} pl-10`}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={currentSalary}
                        readOnly
                        placeholder="Current annual CTC"
                        disabled
                        required
                      />
                    </span>
                    <span className="mt-2 block text-xs font-normal text-slate-500">
                      {salaryLoading
                        ? "Loading from salary records..."
                        : salaryIsFallback
                          ? "No salary record found. Calculated from the ₹15,000 monthly fallback."
                          : `Calculated from ₹${money.format(Number(monthlySalary))} monthly salary.`}
                    </span>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Expected CTC
                    <span className="relative block">
                      <IndianRupee className="pointer-events-none absolute left-4 top-[22px] text-slate-400" size={17} />
                      <input
                        className={`${inputClass} pl-10`}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={expectedSalary}
                        onChange={(event) => setExpectedSalary(event.target.value)}
                        placeholder="Expected annual CTC"
                        disabled={busy}
                        required
                      />
                    </span>
                    <span className="mt-2 block text-xs font-normal text-slate-500">Annual amount in INR</span>
                  </label>
                </div>

                {currentSalary && expectedSalary && validSalary && (
                  <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    You are requesting a {increasePercentage.toFixed(1)}% increase,
                    from ₹{money.format(Number(monthlySalary))} to ₹
                    {money.format(expectedMonthlySalary)} per month.
                  </div>
                )}

                {error && (
                  <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-red-600">
                    <CircleAlert size={17} className="mt-0.5 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !validSalary}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <>Continue <ArrowRight size={17} /></>}
                </button>
              </form>
            )}

            {stage === "questions" && (
              <form onSubmit={submitAnswers} noValidate>
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <MessageSquareText size={21} />
                  </span>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Tell us about your growth</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Thoughtful answers help your manager prepare for a useful review conversation.
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  {questions.map((question, index) => (
                    <label key={question.id} className="block text-sm font-semibold leading-6 text-slate-800">
                      <span className="mr-2 text-blue-700">{index + 1}.</span>
                      {question.description || question.name || "Please share your response."}
                      <textarea
                        className={`${inputClass} min-h-28 resize-y font-normal leading-6`}
                        value={answers[question.id] || ""}
                        onChange={(event) =>
                          setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                        placeholder="Write a clear, specific answer"
                        disabled={busy}
                        required
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span>{answeredCount} of {questions.length} answered</span>
                  <span>Your answers save when submitted</span>
                </div>
                {error && (
                  <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-red-600">
                    <CircleAlert size={17} className="mt-0.5 shrink-0" /> {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || answeredCount !== questions.length}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <>Submit answers <ArrowRight size={17} /></>}
                </button>
              </form>
            )}

            {stage === "complete" && (
              <div className="py-8">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={28} />
                </span>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Your request is ready for review.</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
                  Your salary details and responses have been saved. The review team can now continue the conversation with you.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px"
                >
                  Return to profile <ArrowRight size={17} />
                </button>
              </div>
            )}
          </section>

          <aside className="relative order-1 min-h-64 overflow-hidden bg-[#eef3f8] lg:order-2 lg:min-h-[650px]">
            <img
              src={growthIllustration}
              alt="Abstract steps representing professional growth"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/70 bg-white/90 p-4 shadow-[0_12px_36px_rgba(30,64,175,0.12)] backdrop-blur-sm sm:inset-x-7 sm:bottom-7">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={20} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">A private conversation</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Your responses are shared only with the people responsible for your compensation review.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
