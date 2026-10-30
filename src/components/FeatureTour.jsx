import { useEffect, useId, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { selectIsAdmin } from "../utils/pageAccess";
import { TOURS_ENABLED, readSeenTours, rememberTourSeen, tourForPage } from "../utils/featureTours";

// Seen tours fall back to memory when the browser blocks storage.
const memory = new Map();
function storage() {
  try {
    window.localStorage.getItem("feature-tours:probe");
    return window.localStorage;
  } catch {
    return { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  }
}

/** Viewport box of the `data-tour` element, followed while the page scrolls, resizes or loads. */
function useTargetRect(target) {
  const [state, setState] = useState({ target: null, rect: null });
  useEffect(() => {
    if (!target) return undefined;
    let scrolled = false;
    const update = () => {
      const element = document.querySelector(`[data-tour="${target}"]`);
      if (element && !scrolled) {
        scrolled = true;
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      const box = element?.getBoundingClientRect();
      setState({ target, rect: box && box.width && box.height ? { top: box.top, left: box.left, width: box.width, height: box.height } : null });
    };
    update();
    // The page may still be loading the element, so keep checking while the step is open.
    const timer = setInterval(update, 250);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  return target && state.target === target ? state.rect : null;
}

/**
 * Shows the "what's new" tour for the current page once per user. It is saved as seen when it
 * opens, so leaving the page or closing it never brings it back.
 */
export default function FeatureTour() {
  const { pathname } = useLocation();
  const userId = useSelector((state) => state.user.userInfo?.id);
  const isAdmin = useSelector(selectIsAdmin);
  const isCandidate = useSelector((state) => state.user.userInfo?.subject_type === "candidate");
  const [active, setActive] = useState(null);
  const cardRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!TOURS_ENABLED || !userId) return undefined;
    // Let the page render first, so the tour points at what is on screen.
    const timer = setTimeout(() => {
      const tour = tourForPage(pathname, { isAdmin, isCandidate }, readSeenTours(storage(), userId));
      if (!tour) return;
      try { rememberTourSeen(storage(), userId, tour.id); } catch { /* Shown once this session at least. */ }
      setActive({ tour, step: 0, pathname });
    }, 800);
    return () => clearTimeout(timer);
  }, [pathname, userId, isAdmin, isCandidate]);

  // A tour belongs to the page it opened on.
  const open = active && active.pathname === pathname ? active : null;
  const step = open?.tour.steps[open.step];
  const rect = useTargetRect(step?.target);

  useEffect(() => {
    if (!open) return undefined;
    cardRef.current?.focus({ preventScroll: true });
    const onKey = (event) => { if (event.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const { tour } = open;
  const last = open.step === tour.steps.length - 1;
  const go = (index) => setActive({ ...open, step: index });
  const close = () => setActive(null);

  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[115] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300 motion-reduce:transition-none"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 28%, transparent)" }}
        />
      )}
      <section
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={titleId}
        className="fixed bottom-4 left-4 right-4 z-[120] rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none sm:left-auto sm:w-96 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles size={13} aria-hidden="true" />
            What&apos;s new
          </p>
          <button type="button" onClick={close} aria-label="Close tour" className="-mr-1.5 -mt-1.5 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <h2 id={titleId} className="mt-3 text-base font-semibold text-foreground">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          {tour.steps.length > 1 ? (
            <div className="flex items-center gap-1.5" aria-label={`Step ${open.step + 1} of ${tour.steps.length}`}>
              {tour.steps.map((item, index) => (
                <span key={item.title} className={`h-1.5 rounded-full transition-all ${index === open.step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
              ))}
            </div>
          ) : <span />}
          <div className="flex items-center gap-2">
            {open.step > 0 ? (
              <button type="button" onClick={() => go(open.step - 1)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ArrowLeft size={15} aria-hidden="true" />Back
              </button>
            ) : tour.steps.length > 1 && (
              <button type="button" onClick={close} className="min-h-9 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">Skip</button>
            )}
            <button type="button" onClick={() => (last ? close() : go(open.step + 1))} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
              {last ? "Got it" : <>Next<ArrowRight size={15} aria-hidden="true" /></>}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
