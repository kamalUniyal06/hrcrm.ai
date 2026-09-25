import { AnimatePresence, motion as Motion } from "framer-motion";
import { BriefcaseBusiness, CalendarPlus, ChevronDown, FileText, Lightbulb, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import ResignationFlow from "./ResignationFlow";

export default function EmployeeOptions() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resignationOpen, setResignationOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const openResignation = () => {
    setMenuOpen(false);
    setResignationOpen(true);
  };

  const askForIncrement = () => {
    setResignationOpen(false);
    setMenuOpen(false);
    toast("Increment requests will be available here soon.", { icon: "💬" });
  };

  return (
    <>
      <div ref={containerRef} className="relative ml-auto">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-9 items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition hover:bg-primary-foreground/15 active:scale-[0.98]"
        >
          <BriefcaseBusiness size={17} />
          <span className="hidden sm:inline">Employee options</span>
          <ChevronDown size={15} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <Motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              role="menu"
              className="absolute right-0 top-full z-[1100] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-2xl"
            >
              <div className="px-3 pb-2 pt-2">
                <p className="text-sm font-bold">How can we help?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Choose an employee service to continue.</p>
              </div>

              <button type="button" role="menuitem" onClick={openResignation} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-destructive/10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><FileText size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">I want to resign</span><span className="mt-0.5 block text-xs text-muted-foreground">Start the secure approval process</span></span>
              </button>

              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate("/leaves"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-primary/10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarPlus size={18} /></span>
                <span><span className="block text-sm font-semibold">Apply for leave</span><span className="mt-0.5 block text-xs text-muted-foreground">Request planned time away</span></span>
              </button>

              <button type="button" role="menuitem" onClick={askForIncrement} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--employee-green-soft)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--employee-green-soft)] text-[var(--employee-green)]"><TrendingUp size={18} /></span>
                <span><span className="block text-sm font-semibold">Ask for an increment</span><span className="mt-0.5 block text-xs text-muted-foreground">Begin a compensation discussion</span></span>
              </button>

              <div className="mt-1 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground"><Lightbulb size={15} className="shrink-0 text-primary" />More employee services are coming soon.</div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <ResignationFlow open={resignationOpen} onOpenChange={setResignationOpen} email={user?.email?.trim()} onAskIncrement={askForIncrement} />
    </>
  );
}
