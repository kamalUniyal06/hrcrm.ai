import { useEffect, useState } from "react";
import { FileText, Loader2, ScanLine, Sparkles } from "lucide-react";

const tips = [
  "You can correct every detail before saving your profile.",
  "Your education and experience will have their own sections.",
  "Once your profile is saved, you can add a profile photo.",
];

export default function ResumeLoading({ filename, onCancel }) {
  const [tip, setTip] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    const rotation = setInterval(() => setTip(value => (value + 1) % tips.length), 6000);
    return () => { clearInterval(timer); clearInterval(rotation); };
  }, []);
  return <section aria-busy="true" className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center sm:py-16">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-indigo-50 to-transparent" />
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-indigo-100" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500 motion-reduce:animate-none" />
      <div className="flex h-20 w-16 rotate-6 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-lg shadow-indigo-100"><FileText size={34} /></div>
      <span className="absolute -right-1 bottom-1 rounded-xl bg-indigo-600 p-2 text-white"><ScanLine size={20} className="animate-pulse motion-reduce:animate-none" /></span>
    </div>
    <p className="relative mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">A little less typing. A little more you.</p>
    <h2 className="relative mt-3 text-2xl font-semibold tracking-tight text-slate-900">Your story is taking shape</h2>
    <p role="status" className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{seconds >= 45 ? "Still working on your resume. Longer documents can take a little more time." : "Reading your resume and organizing your professional details. This can take a moment."}</p>
    <div className="relative mx-auto mt-7 flex max-w-sm items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left"><Loader2 size={18} className="shrink-0 animate-spin text-indigo-500 motion-reduce:animate-none" /><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{filename}</span><span className="text-xs tabular-nums text-slate-400">{seconds}s</span></div>
    <p className="relative mx-auto mt-6 flex min-h-12 max-w-md items-center justify-center gap-2 text-sm text-slate-500"><Sparkles size={16} className="shrink-0 text-indigo-400" />{tips[tip]}</p>
    <button type="button" onClick={onCancel} className="relative mt-5 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">Cancel parsing</button>
  </section>;
}
