import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion as Motion } from "framer-motion";
import { Check, FileText, Sparkles } from "lucide-react";
import OnboardingBackdrop from "./OnboardingBackdrop";
import ResumeProcessingIllustration from "./ResumeProcessingIllustration";
import { EASE, marker, rise, stagger, usePointerField } from "./onboardingMotion";

export default function ResumeLoading({
  filename,
  phase = "processing",
  fillViewport = false,
}) {
  const [seconds, setSeconds] = useState(0);
  const backdropRef = useRef(null);
  const pointer = usePointerField(backdropRef);
  const ready = phase === "fetching";

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <Motion.section
        aria-busy="true"
        aria-labelledby="resume-processing-title"
        initial="hidden"
        animate="show"
        variants={stagger(0.05, 0.1)}
        className={cn(
          "mx-auto max-w-2xl py-8 text-center sm:py-12 lg:py-[clamp(1.5rem,6vh,4rem)]",
          fillViewport && "lg:flex lg:min-h-dvh lg:flex-col lg:justify-center",
        )}
      >
        <OnboardingBackdrop containerRef={backdropRef} pointer={pointer} pattern="aurora" />

        <Motion.div variants={rise}>
          <ResumeProcessingIllustration ready={ready} />
        </Motion.div>

        <Motion.div variants={rise} className="mt-4">
          <p className={styles.eyebrowPill}>
            <span className={styles.eyebrowBadge}>
              {ready ? (
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              ) : (
                <Motion.span
                  aria-hidden="true"
                  className="inline-flex"
                  animate={{ rotate: [0, 18, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                >
                  <Sparkles size={12} />
                </Motion.span>
              )}
            </span>
            {ready ? "Ready for the next step" : "Turning your resume into your profile"}
          </p>
        </Motion.div>

        <Motion.h1
          id="resume-processing-title"
          variants={rise}
          className="mt-5 text-[28px] leading-[1.12] font-semibold tracking-[-0.035em] sm:text-4xl [&>span]:text-primary"
        >
          {ready ? "Loading your " : "Processing your "}
          <span key={String(ready)} className="relative isolate inline-block">
            {ready ? "profile" : "resume"}
            <Motion.span aria-hidden="true" variants={marker} initial="hidden" animate="show" className={styles.marker} />
          </span>
        </Motion.h1>

        <p role="status" aria-atomic="true" className="text-muted-foreground mx-auto mt-4 max-w-md text-[15px] leading-7">
          {ready
            ? "Your resume has been processed. We are loading the details for your review."
            : seconds >= 45
              ? "Your resume is taking a little longer to process. We are still working on it. Your details will appear here when ready."
              : "We are organizing your contact details, skills, experience, and education. You can review everything next."}
        </p>

        <Motion.div
          variants={rise}
          className={cn(styles.surface, "mx-auto mt-7 w-full max-w-md overflow-hidden bg-card/85 text-left backdrop-blur-xl")}
        >
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <FileText size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">{filename || "Your resume"}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {ready ? "Processed" : "Reading and organizing your details"}
              </p>
            </div>
            <span
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
              aria-label={`${seconds} seconds elapsed`}
            >
              {seconds}s
            </span>
          </div>
          <div className="relative h-1 overflow-hidden bg-muted" aria-hidden="true">
            {ready ? (
              <Motion.div
                className="absolute inset-0 origin-left bg-[var(--employee-green)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            ) : (
              <Motion.div
                className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-primary to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </Motion.div>
      </Motion.section>
    </MotionConfig>
  );
}
