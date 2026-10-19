import { useRef } from "react";
import { MotionConfig, motion as Motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { marker, rise, stagger, useCardSpotlight, usePointerField } from "./onboardingMotion";
import OnboardingBackdrop from "./OnboardingBackdrop";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  PencilLine,
  Sparkles,
} from "lucide-react";

const twinkle = {
  animate: { rotate: [0, 18, 0], scale: [1, 1.2, 1] },
  transition: { duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" },
};

// A whole-card choice button. `featured` gives the primary call to action,
// the highlight glow and the light sweep; the other card stays calmer.
function OptionCard({ featured = false, icon, badge, title, description, action, note, onClick }) {
  const Icon = icon;
  const spotlight = useCardSpotlight(featured ? 26 : 18);

  return (
    <Motion.button
      type="button"
      variants={rise}
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      {...spotlight.handlers}
      className={cn(
        styles.surface,
        "group group/cta relative isolate flex flex-col items-start overflow-hidden p-6 text-left transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-[30px] lg:p-[clamp(1.25rem,3.2vh,1.875rem)]",
        featured
          ? "border-primary/25 bg-linear-to-br from-card to-accent hover:border-primary/50 hover:shadow-[0_28px_60px_-28px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
          : "bg-linear-to-br from-card to-[var(--employee-green-soft)] hover:border-[var(--employee-green)]/45 hover:shadow-[0_28px_60px_-30px_color-mix(in_srgb,var(--employee-green)_55%,transparent)]",
      )}
    >
      <Motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundImage: spotlight.backgroundImage }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-20 -right-20 -z-10 size-56 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 motion-reduce:transition-none",
          featured ? "bg-highlight/30" : "bg-[var(--employee-green)]/15",
        )}
      />

      <span className="flex w-full items-center justify-between gap-3">
        <span className="relative">
          <span
            className={cn(
              styles.icon,
              "transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none",
              !featured && "border-[color:var(--employee-green)]/20 bg-[color:var(--employee-green-soft)] text-[color:var(--employee-green)]",
            )}
          >
            <Icon size={27} aria-hidden="true" />
          </span>
          {featured && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-highlight text-highlight-foreground">
              <Sparkles size={11} />
            </span>
          )}
        </span>
        {badge}
      </span>

      <span className="mt-6 text-xl font-semibold tracking-tight lg:mt-[clamp(0.875rem,2.4vh,1.5rem)]">{title}</span>
      <span className="text-muted-foreground mt-3 flex-1 text-sm leading-6 lg:mt-2">{description}</span>

      <span
        className={cn(
          featured ? styles.primary : styles.secondary,
          "relative mt-7 w-full overflow-hidden lg:mt-[clamp(1rem,3vh,1.75rem)]",
          featured
            ? "shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--primary)_80%,transparent)]"
            : "bg-card/70 group-hover:border-primary group-hover:bg-accent",
        )}
      >
        {featured && <span aria-hidden="true" className={styles.shine} />}
        {action}
        <ArrowRight size={17} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
      </span>
      <span className="text-muted-foreground mt-4 text-xs lg:mt-3">{note}</span>
    </Motion.button>
  );
}

export default function CandidateWelcome({ onUpload, onCreate, onBack, fillViewport = false }) {
  const backdropRef = useRef(null);
  const pointer = usePointerField(backdropRef);

  return (
    <MotionConfig reducedMotion="user">
      <Motion.section
        aria-labelledby="candidate-welcome-title"
        initial="hidden"
        animate="show"
        variants={stagger(0.05, 0.09)}
        className={cn(
          "mx-auto max-w-[1040px] py-6 lg:py-[clamp(1.25rem,4.5vh,3.5rem)]",
          fillViewport && "lg:flex lg:min-h-dvh lg:flex-col lg:justify-center",
        )}
      >
        <OnboardingBackdrop containerRef={backdropRef} pointer={pointer} pattern="grid" />

        {onBack && (
          <Motion.div variants={rise}>
            <button type="button" onClick={onBack} className={cn(styles.back, "group/back")}>
              <ArrowLeft size={16} aria-hidden="true" className="transition-transform duration-300 group-hover/back:-translate-x-1 motion-reduce:transition-none" />
              Back
            </button>
          </Motion.div>
        )}

        <header className="mt-5 mb-8 sm:mt-6 lg:mt-[clamp(0.75rem,2.5vh,1.5rem)] lg:mb-[clamp(1.25rem,4vh,2.25rem)]">
          <Motion.p variants={rise} className={styles.eyebrowPill}>
            <span className={styles.eyebrowBadge}>
              <PencilLine size={12} aria-hidden="true" />
            </span>
            Candidate profile
          </Motion.p>
          <Motion.h1
            id="candidate-welcome-title"
            variants={rise}
            className={cn(styles.display, "lg:text-[length:clamp(2.25rem,5.6vh,3.25rem)]")}
          >
            Create your{" "}
            <span className="relative isolate inline-block">
              profile
              <Motion.span aria-hidden="true" variants={marker} className={styles.marker} />
            </span>
          </Motion.h1>
          <Motion.p variants={rise} className="text-muted-foreground mt-4 max-w-xl text-base leading-7 lg:mt-3">
            Choose how to add your details.
          </Motion.p>
        </header>

        <Motion.div variants={stagger(0, 0.1)} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[22px]">
          <OptionCard
            featured
            icon={FileText}
            badge={(
              <span className={cn(styles.status, "border-primary/20 bg-accent text-primary")}>
                <Motion.span aria-hidden="true" className="inline-flex" {...twinkle}>
                  <Sparkles size={13} />
                </Motion.span>
                Recommended
              </span>
            )}
            title="Autofill with resume"
            description="Upload your resume. We fill in your profile, you review it."
            action="Upload resume"
            note="PDF, DOC, or DOCX · Max 10 MB"
            onClick={onUpload}
          />
          <OptionCard
            icon={PencilLine}
            title="Enter your details"
            description="Fill in your profile step by step."
            action="Start"
            note="No resume needed"
            onClick={onCreate}
          />
        </Motion.div>

        <Motion.p
          variants={rise}
          className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground lg:mt-[clamp(0.75rem,2.5vh,1.5rem)] [&>svg]:mt-0.5 [&>svg]:shrink-0 [&>svg]:text-[var(--employee-green)]"
        >
          <Check size={16} aria-hidden="true" /> You can review everything before you submit.
        </Motion.p>
      </Motion.section>
    </MotionConfig>
  );
}
