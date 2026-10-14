import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion as Motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import OnboardingBackdrop from "./OnboardingBackdrop";
import OnboardingJourneyPreview from "./OnboardingJourneyPreview";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Presentation,
  Sparkles,
  UserRound,
} from "lucide-react";

const workspaceTones = {
  blue: "bg-linear-to-r from-card to-[var(--employee-blue-soft)] [&>span]:border-[var(--employee-blue)]/20 [&>span]:bg-[var(--employee-blue-soft)] [&>span]:text-[var(--employee-blue)]",
  green: "bg-linear-to-r from-card to-[var(--employee-green-soft)] [&>span]:border-[var(--employee-green)]/20 [&>span]:bg-[var(--employee-green-soft)] [&>span]:text-[var(--employee-green)]",
  amber: "bg-linear-to-r from-card to-[var(--leave-yellow-soft)] [&>span]:border-[var(--employee-orange)]/20 [&>span]:bg-[var(--leave-yellow-soft)] [&>span]:text-[var(--employee-orange)]",
};

const onboardingOptions = [
  {
    title: "Organization",
    description: "Bring your team together and manage hiring in one place.",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "College",
    description: "Connect students with employers and campus placements.",
    icon: GraduationCap,
    tone: "green",
  },
  {
    title: "Demo Organization",
    description: "Explore a sample workspace before setting up your own.",
    icon: Presentation,
    tone: "amber",
  },
];

const candidatePerks = [
  "Start with your resume or build from scratch",
  "Review your details before you finish",
];

const EASE = [0.22, 1, 0.36, 1];
const stagger = (delayChildren, staggerChildren) => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const slideIn = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};
const marker = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { delay: 0.55, duration: 0.7, ease: EASE } },
};

// Tracks the pointer across the page for the backdrop spotlight and the
// preview parallax. Off for touch devices and reduced-motion users.
function usePointerField(containerRef) {
  const reduceMotion = useReducedMotion();
  const [finePointer] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches),
  );
  const enabled = finePointer && !reduceMotion;
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const onMove = (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
      }
      nx.set(event.clientX / window.innerWidth - 0.5);
      ny.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, containerRef, x, y, nx, ny]);

  return { x, y, nx, ny, enabled };
}

function CandidateCard({ onCandidate }) {
  const spotX = useMotionValue(0);
  const spotY = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(380px circle at ${spotX}px ${spotY}px, color-mix(in srgb, var(--highlight) 26%, transparent), transparent 70%)`;
  const trackSpotlight = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    spotX.set(event.clientX - rect.left);
    spotY.set(event.clientY - rect.top);
  };

  return (
    <Motion.article
      variants={rise}
      onPointerMove={trackSpotlight}
      className="group relative isolate flex flex-col overflow-hidden lg:flex-1 rounded-3xl border border-primary/25 bg-linear-to-br from-card to-accent p-5 shadow-sm transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_28px_60px_-28px_color-mix(in_srgb,var(--primary)_55%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[400px]:p-6 md:p-[30px] lg:p-[26px]"
    >
      <Motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundImage: spotlight }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 -z-10 size-56 rounded-full bg-highlight/30 blur-3xl transition-transform duration-700 group-hover:scale-125 motion-reduce:transition-none"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="relative">
          <span className={cn(styles.icon, "size-14 border-transparent bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transition-none")}>
            <UserRound size={27} aria-hidden="true" />
          </span>
          <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-highlight text-highlight-foreground">
            <Sparkles size={11} />
          </span>
        </span>
        <span className={cn(styles.status, "border-[var(--employee-green)]/25 bg-[var(--employee-green-soft)] text-[var(--employee-green)] max-[399px]:text-[10px]")}>
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--employee-green)] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--employee-green)]" />
          </span>
          Ready to get started
        </span>
      </div>

      <div className="mt-7 lg:mt-5 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:leading-tight [&>h2]:tracking-tight lg:[&>h2]:text-[26px]">
        <p className="mb-2 text-xs font-medium text-primary lg:mb-1.5">For your next career move</p>
        <h2>Here as a candidate?</h2>
        <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6 lg:mt-2">
          Create a profile that brings your skills, experience, and ambitions together. Let our recruitment team get to know you.
        </p>
      </div>

      <Motion.ul variants={stagger(0.35, 0.1)} className="my-6 grid gap-2.5 text-[13px] leading-normal text-muted-foreground lg:my-5 lg:gap-2">
        {candidatePerks.map((perk) => (
          <Motion.li key={perk} variants={slideIn} className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-highlight/45 text-primary">
              <Check size={12} strokeWidth={3} />
            </span>
            {perk}
          </Motion.li>
        ))}
      </Motion.ul>

      <Motion.button
        type="button"
        onClick={onCandidate}
        whileTap={{ scale: 0.98 }}
        className={cn(styles.primary, "group/cta relative mt-auto min-h-12 w-full overflow-hidden shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--primary)_80%,transparent)] [&>svg]:ml-auto")}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[500%] motion-reduce:hidden"
        />
        Continue as a candidate
        <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none" />
      </Motion.button>
    </Motion.article>
  );
}

// On laptop screens and up the whole screen fits in one viewport: two columns
// (headline + candidate card | preview + workspaces) with vertical spacing that
// scales with the viewport height. Below lg the wrappers use `contents`, so the
// header spans the grid and the cards sit side by side (md) or stack (mobile).
const columnGap = "lg:gap-[clamp(1rem,3.5vh,2.25rem)]";

export default function OnboardingWelcome({ onCandidate, fillViewport = false }) {
  const backdropRef = useRef(null);
  const pointer = usePointerField(backdropRef);

  return (
    <MotionConfig reducedMotion="user">
      <Motion.section
        aria-labelledby="onboarding-welcome-title"
        initial="hidden"
        animate="show"
        variants={stagger(0.05, 0.1)}
        className={cn(
          "mx-auto grid max-w-[1160px] grid-cols-1 gap-7 pt-8 pb-4 md:grid-cols-[1.05fr_1fr] md:gap-x-6 md:gap-y-9 lg:gap-x-12 lg:py-[clamp(1.5rem,5vh,4rem)] xl:gap-x-16",
          fillViewport && "lg:min-h-dvh lg:content-center",
        )}
      >
        <OnboardingBackdrop containerRef={backdropRef} pointer={pointer} />

        <div className={cn("contents lg:flex lg:flex-col", columnGap)}>
          <header className="md:col-span-2">
            <Motion.p
              variants={rise}
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/80 py-1 pr-3.5 pl-1 text-[13px] font-semibold text-primary shadow-sm backdrop-blur-sm"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 text-[11px] font-bold text-highlight-foreground">
                <Motion.span
                  aria-hidden="true"
                  className="inline-flex"
                  animate={{ rotate: [0, 18, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
                >
                  <Sparkles size={12} />
                </Motion.span>
                AI
              </span>
              Welcome to HRCRM
            </Motion.p>
            <Motion.h1
              id="onboarding-welcome-title"
              variants={rise}
              className={cn(styles.display, "lg:text-[length:clamp(2.25rem,5.6vh,3.25rem)]")}
            >
              How would you like<br className="hidden sm:block" /> to{" "}
              <span className="relative isolate inline-block">
                get started?
                <Motion.span
                  aria-hidden="true"
                  variants={marker}
                  className="absolute inset-x-[-0.06em] bottom-[0.08em] -z-10 h-[0.32em] origin-left rounded-[0.12em] bg-highlight/55"
                />
              </span>
            </Motion.h1>
            <Motion.p variants={rise} className="text-muted-foreground mt-4 max-w-xl text-base leading-7 lg:mt-3">
              Your next opportunity, your team, your campus. Find your place and make your next move.
            </Motion.p>
          </header>
          <CandidateCard onCandidate={onCandidate} />
        </div>

        <div className={cn("contents lg:flex lg:flex-col", columnGap)}>
          <OnboardingJourneyPreview pointer={pointer} />
          <Motion.div variants={stagger(0.15, 0.1)} className="flex flex-col gap-3 lg:flex-1 lg:gap-2.5">
            <Motion.h2 variants={rise} className="mt-0.5 mb-0.5 ml-0.5 text-[13px] font-semibold text-muted-foreground">
              A space for every journey
            </Motion.h2>
            {onboardingOptions.map(({ title, description, icon, tone }) => {
              const Icon = icon;
              return (
                <Motion.article
                  key={title}
                  variants={slideIn}
                  className={`group flex flex-1 items-start gap-3 rounded-[20px] border border-border p-4 transition-colors duration-300 hover:border-primary/25 min-[400px]:gap-4 min-[400px]:p-[18px] md:p-[21px] lg:items-center lg:py-3.5 ${workspaceTones[tone]}`}
                >
                  <span className={cn(styles.icon, "transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none")}>
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap [&>h3]:text-base [&>h3]:font-semibold [&>h3]:leading-normal">
                      <h3>{title}</h3>
                      <span className={styles.status}>Coming soon</span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm leading-6 lg:mt-1">{description}</p>
                  </div>
                </Motion.article>
              );
            })}
          </Motion.div>
        </div>
      </Motion.section>
    </MotionConfig>
  );
}
