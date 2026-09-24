import { useEffect, useState } from "react";
import { FileText, Sparkles, ArrowRight, X, UserRound, BriefcaseBusiness, WandSparkles, Loader2 } from "lucide-react";

export default function ResumeLoading({ filename, onCancel, phase = "processing" }) {
  const [seconds, setSeconds] = useState(0);
  const takingLonger = seconds >= 45;
  const tips = ["You can edit every detail before saving.", "Next, we’ll show just the essentials first.", "Your skills and experience will be easy to review."];
  useEffect(() => {
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return <section aria-busy="true" className="mx-auto flex min-h-[75dvh] max-w-3xl flex-col items-center justify-center px-3 py-12 text-center sm:py-16">
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white px-3 py-1.5 text-[10px] font-semibold tracking-widest text-violet-600"><span className="size-1.5 animate-pulse rounded-full bg-violet-500 motion-reduce:animate-none" /> A LITTLE MAGIC, A LOT OF YOU</span>
    <div aria-hidden="true" className="relative my-10 flex h-64 w-full max-w-[480px] items-center justify-center sm:my-12">
      <div className="absolute size-56 rounded-full bg-violet-200/40 blur-3xl" /><div className="absolute size-64 animate-spin rounded-full border border-violet-100 border-t-violet-500 border-r-violet-300 [animation-duration:3s] motion-reduce:animate-none"><span className="absolute left-8 top-8 size-2 rounded-full bg-violet-500 shadow-md shadow-violet-300" /></div><div className="absolute size-48 animate-spin rounded-full border border-dashed border-violet-200/60 border-b-violet-400 [animation-direction:reverse] [animation-duration:6s] motion-reduce:animate-none" />
      <div className="absolute left-2 top-10 animate-bounce [animation-duration:3s] motion-reduce:animate-none -rotate-12 rounded-2xl border border-violet-100 bg-white p-5 shadow-lg shadow-violet-100/50 sm:left-8"><FileText size={32} className="text-violet-300" /><div className="mt-3 h-1.5 w-12 rounded bg-slate-100" /><div className="mt-2 h-1.5 w-9 rounded bg-slate-100" /></div>
      <div className="relative z-10 grid size-24 place-items-center rounded-[28px] bg-[#211936] text-violet-200 shadow-[0_16px_50px_-10px_#7c3aed66]"><WandSparkles size={38} strokeWidth={1.3} className="animate-pulse motion-reduce:animate-none" /><span className="absolute -inset-2 animate-pulse rounded-[34px] border border-violet-300/40 motion-reduce:animate-none" /></div>
      <div className="absolute right-0 bottom-5 animate-bounce [animation-duration:3.8s] [animation-delay:0.6s] motion-reduce:animate-none rotate-6 rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-lg shadow-violet-100/50 sm:right-5"><div className="flex items-center gap-2"><span className="rounded-full bg-violet-100 p-2 text-violet-500"><UserRound size={16} /></span><div className="space-y-1.5"><div className="h-1.5 w-16 rounded bg-violet-100" /><div className="h-1 w-10 rounded bg-slate-100" /></div></div><div className="mt-4 flex gap-1.5"><span className="rounded bg-violet-50 px-2 py-1 text-[8px] text-violet-500">Your skills</span><span className="rounded bg-lime-50 px-2 py-1 text-[8px] text-lime-700">Your story</span></div></div>
      <Sparkles size={21} className="absolute right-12 top-3 text-violet-400" /><BriefcaseBusiness size={16} className="absolute bottom-0 left-24 text-violet-300" />
    </div>
    <h2 className="text-3xl font-medium leading-tight tracking-[-1.2px] text-slate-900 sm:text-4xl">Good experience deserves<br /><span className="font-serif font-normal italic text-violet-500">a great introduction.</span></h2>
    <div className="mt-3 flex items-center gap-1.5" aria-hidden="true"><span className="size-1.5 animate-bounce rounded-full bg-violet-500 motion-reduce:animate-none" /><span className="size-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms] motion-reduce:animate-none" /><span className="size-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:300ms] motion-reduce:animate-none" /></div>
    <p role="status" className="mt-5 max-w-md text-sm leading-7 text-slate-500">{phase === "fetching" ? "Your resume has been parsed. We’re loading your details for review." : takingLonger ? "Your resume is still processing. Some documents take a little longer. We’ll open your details as soon as they’re ready." : "We’re turning your resume into your personal career profile. Sit tight — your story is taking shape."}</p>
    <div className="mt-7 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3.5 text-left"><FileText size={19} className="shrink-0 text-violet-400" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{filename}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] text-violet-500"><Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> {phase === "fetching" ? "Opening your profile" : "Processing your resume"}</p></div><span aria-hidden="true" className="shrink-0 text-[10px] tabular-nums text-slate-400">{seconds}s</span></div>
    <p aria-live="polite" className="mt-4 min-h-5 text-xs text-violet-500">{tips[Math.floor(seconds / 8) % tips.length]}</p>
    <p className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">Up next <ArrowRight size={12} /> Review, personalise, and make it yours.</p>
    <button type="button" onClick={onCancel} className="mt-8 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-violet-400"><X size={12} /> Cancel and go back</button>
  </section>;
}
