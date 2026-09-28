import {
  BriefcaseBusiness,
  CalendarPlus,
  FileText,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import ResignationFlow from "./ResignationFlow";

export default function EmployeeOptions() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  const [resignationOpen, setResignationOpen] = useState(false);

  const askForIncrement = () => {
    setResignationOpen(false);
    toast("Increment requests will be available here soon.", { icon: "💬" });
  };

  return (
    <>
      <section
        aria-labelledby="employee-services-title"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
          <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <BriefcaseBusiness size={17} />
          </span>
          <div>
            <h2 id="employee-services-title" className="text-sm font-semibold text-slate-900">
              Employee services
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Workplace requests</p>
          </div>
        </div>

        <div className="space-y-1 p-2">
          <button
            type="button"
            onClick={() => setResignationOpen(true)}
            className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-red-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <FileText size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-700">I want to resign</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">Start approval process</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/leaves")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-indigo-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarPlus size={15} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-slate-700">Apply for leave</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">Request time away</span>
            </span>
          </button>

          <button
            type="button"
            onClick={askForIncrement}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--employee-green-soft)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--employee-green-soft)] text-[var(--employee-green)]">
              <TrendingUp size={15} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-slate-700">Ask for increment</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">Discuss compensation</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] text-slate-400">
          <Lightbulb size={13} className="shrink-0 text-indigo-500" />
          More employee services are coming soon.
        </div>
      </section>

      <ResignationFlow
        open={resignationOpen}
        onOpenChange={setResignationOpen}
        email={user?.email?.trim()}
        onAskIncrement={askForIncrement}
      />
    </>
  );
}
