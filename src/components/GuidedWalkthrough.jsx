import { useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { PageContext } from "../context/pageContext";
import { useIsDesktop } from "../hooks/useMediaQuery";

const TOUR_STEPS = [
  {
    selector: "[data-tour='top-nav']",
    title: "Top Navigation",
    body: "Search contacts, switch timelines, open alerts, manage credits, and reach your profile from here.",
  },
  {
    selector: "[data-tour='welcome-header']",
    title: "Workspace Header",
    body: "This area shows your CRM, business email, recent activity, onboarding status, and performance summary.",
  },
  {
    selector: "[data-tour='sidebar']",
    title: "Main Sections",
    body: "Use the sidebar to move between inboxes, contacts, offers, deals, orders, invoices, reminders, reports, and more.",
    needsSidebar: true,
  },
  {
    selector: "[data-tour='sidebar-live']",
    title: "Live Timeline",
    body: "Jump back to the live timeline whenever you want to review current communication history.",
    route: "/",
    needsSidebar: true,
  },
  {
    selector: "[data-tour='main-workspace']",
    title: "Timeline And Work Area",
    body: "The main workspace changes based on the section you open. This is where records, timelines, replies, and reports appear.",
    route: "/",
  },
  {
    selector: "[data-tour='sidebar-settings']",
    title: "Settings",
    body: "Settings contains templates, websites, users, automation controls, debugging, self-test, and data modelling tools.",
    needsSidebar: true,
  },
];

const getTooltipPosition = (rect) => {
  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const width = 360;
  const gap = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const placeBelow = rect.bottom + 210 < viewportHeight;
  const top = placeBelow
    ? rect.bottom + gap
    : Math.max(16, rect.top - 230);
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - width / 2),
    viewportWidth - width - 16,
  );

  return {
    left,
    top,
    transform: "none",
  };
};

export default function GuidedWalkthrough({ open, onClose, navigate }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  /* Below `lg` the sidebar is an off-canvas drawer — open it for the
     steps that point at sidebar elements so they are actually on screen. */
  const isDesktop = useIsDesktop();
  const { setMobileSidebarOpen } = useContext(PageContext);

  useEffect(() => {
    if (!open || isDesktop) return;
    setMobileSidebarOpen(Boolean(step?.needsSidebar));
  }, [open, isDesktop, step, setMobileSidebarOpen]);

  useEffect(() => {
    if (open) return;
    setMobileSidebarOpen(false);
  }, [open, setMobileSidebarOpen]);

  const tooltipStyle = useMemo(
    () => getTooltipPosition(targetRect),
    [targetRect],
  );

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;

    if (step.route && window.location.pathname !== step.route) {
      navigate(step.route);
    }

    let frameId = 0;

    const measure = () => {
      const target = document.querySelector(step.selector);
      if (!target) {
        setTargetRect(null);
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      frameId = window.requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect({
          top: Math.max(8, rect.top - 6),
          left: Math.max(8, rect.left - 6),
          width: rect.width + 12,
          height: rect.height + 12,
          bottom: rect.bottom + 6,
        });
      });
    };

    /* Wait out route transitions and the mobile drawer slide-in
       before measuring the target. */
    const measureDelay = step.route
      ? 250
      : !isDesktop && step.needsSidebar
        ? 320
        : 40;

    const timeoutId = window.setTimeout(measure, measureDelay);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [navigate, open, step, isDesktop]);

  if (!open) return null;

  const goNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-slate- backdrop-blur-[0px]" />

{targetRect && (
  <>
    {/* Dark overlay */}
    <div
      className="absolute inset-0 bg-black/20"
      style={{
        clipPath: `polygon(
          0% 0%,
          0% 100%,
          ${targetRect.left}px 100%,
          ${targetRect.left}px ${targetRect.top}px,
          ${targetRect.left + targetRect.width}px ${targetRect.top}px,
          ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
          ${targetRect.left}px ${targetRect.top + targetRect.height}px,
          ${targetRect.left}px 100%,
          100% 100%,
          100% 0%
        )`,
      }}
    />

    {/* Highlight border */}
    <div
      className="pointer-events-none absolute rounded-2xl border-2 border-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.7)]"
      style={{
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
      }}
    />
  </>
)}

      <div
        className="absolute w-[min(360px,calc(100vw-32px))] rounded-2xl border border-white/20 bg-white p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Skip walkthrough"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-100 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="pr-8">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-600">
            Guided Walkthrough {stepIndex + 1}/{TOUR_STEPS.length}
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {step.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {step.body}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={15} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-cyan-700"
            >
              {isLast ? (
                <>
                  Done
                  <CheckCircle2 size={15} />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
