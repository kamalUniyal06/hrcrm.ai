import { useEffect } from "react";
import {
  animate,
  motion as Motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { CalendarCheck, Check, PartyPopper, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// Decorative preview of the candidate journey shown beside the welcome headline.
// Hidden from assistive tech; the real content lives in OnboardingWelcome.

const EASE = [0.22, 1, 0.36, 1];
const SPRING = { stiffness: 70, damping: 20, mass: 0.6 };
const PROFILE_STRENGTH = 92;

const checklist = [
  { label: "Resume parsed", done: true },
  { label: "Skills matched", done: true },
  { label: "Documents verified", done: false },
];

function useParallax(sx, sy, depth) {
  return {
    x: useTransform(sx, (value) => value * depth),
    y: useTransform(sy, (value) => value * depth),
  };
}

function FloatingChip({ className, parallax, delay, floatDuration, children }) {
  return (
    <Motion.div className={cn("absolute", className)} style={parallax}>
      <Motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
        whileHover={{ scale: 1.05 }}
        transition={{
          opacity: { delay, duration: 0.4 },
          scale: { delay, type: "spring", stiffness: 260, damping: 18 },
          y: { delay: delay + 0.4, duration: floatDuration, repeat: Infinity, ease: "easeInOut" },
        }}
        className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/90 px-3 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md"
      >
        {children}
      </Motion.div>
    </Motion.div>
  );
}

export default function OnboardingJourneyPreview({ pointer }) {
  const reduceMotion = useReducedMotion();
  const sx = useSpring(pointer.nx, SPRING);
  const sy = useSpring(pointer.ny, SPRING);
  // Depths stay small so the chips never drift onto the card's content.
  const cardLayer = useParallax(sx, sy, 8);
  const aiLayer = useParallax(sx, sy, -14);
  const interviewLayer = useParallax(sx, sy, 12);
  const offerLayer = useParallax(sx, sy, -10);

  const strength = useMotionValue(0);
  const strengthLabel = useTransform(strength, (value) => `${Math.round(value)}%`);
  const strengthScale = useTransform(strength, [0, 100], [0, 1]);

  useEffect(() => {
    if (reduceMotion) {
      strength.set(PROFILE_STRENGTH);
      return undefined;
    }
    const controls = animate(strength, PROFILE_STRENGTH, { duration: 1.8, delay: 0.9, ease: EASE });
    return () => controls.stop();
  }, [reduceMotion, strength]);

  return (
    // Chips sit in the card's empty zones: above its top edge, beside the short
    // checklist labels, and below the last row. Short viewports zoom it down.
    <div
      aria-hidden="true"
      className="relative mx-auto hidden h-[292px] w-[400px] shrink-0 select-none lg:block lg:[@media(max-height:760px)]:[zoom:0.85]"
    >
      <Motion.div className="absolute top-[36px] left-[40px] w-[300px]" style={cardLayer}>
        <Motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
          className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--primary)_45%,transparent)] backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserRound size={20} />
            </span>
            <div className="flex-1 space-y-1.5">
              <span className="block h-2.5 w-28 rounded-full bg-foreground/75" />
              <span className="block h-2 w-20 rounded-full bg-muted-foreground/30" />
            </div>
            <span className="rounded-full bg-[var(--employee-green-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--employee-green)]">
              Open to work
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Profile strength</span>
              <Motion.span className="font-semibold text-foreground tabular-nums">{strengthLabel}</Motion.span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <Motion.div
                className="h-full origin-left rounded-full bg-linear-to-r from-primary to-highlight"
                style={{ scaleX: strengthScale }}
              />
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {checklist.map(({ label, done }, index) => (
              <Motion.li
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.25, duration: 0.4, ease: EASE }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {done ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-4 animate-spin rounded-full border-2 border-highlight border-t-transparent motion-reduce:animate-none" />
                )}
                {label}
              </Motion.li>
            ))}
          </ul>
        </Motion.div>
      </Motion.div>

      <FloatingChip className="top-0 left-0" parallax={aiLayer} delay={0.9} floatDuration={5.5}>
        <span className="flex size-7 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
          <Sparkles size={15} />
        </span>
        AI filled your details
      </FloatingChip>

      <FloatingChip className="top-[166px] -right-10" parallax={interviewLayer} delay={1.2} floatDuration={6.5}>
        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--employee-blue-soft)] text-[var(--employee-blue)]">
          <CalendarCheck size={15} />
        </span>
        <span className="leading-tight">
          Interview scheduled
          <span className="block text-[10px] font-medium text-muted-foreground">Thu · 11:00 AM</span>
        </span>
      </FloatingChip>

      <FloatingChip className="top-[248px] -left-3" parallax={offerLayer} delay={1.5} floatDuration={6}>
        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--employee-green-soft)] text-[var(--employee-green)]">
          <PartyPopper size={15} />
        </span>
        Offer accepted
      </FloatingChip>
    </div>
  );
}
