import { useRef } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";

// The "Happy Dussehra" reveal at the end of the scene, with the replay button.
// Mounted by DussehraExperience only once the fire reaches its climax.

const EASE = [0.22, 1, 0.36, 1];

const SPARKLES = [
  { left: "-4%", top: "8%", delay: 0, size: 14 },
  { left: "102%", top: "16%", delay: 0.6, size: 12 },
  { left: "8%", top: "86%", delay: 1.1, size: 10 },
  { left: "94%", top: "78%", delay: 0.3, size: 16 },
  { left: "88%", top: "-10%", delay: 1.5, size: 11 },
  { left: "-10%", top: "52%", delay: 1.9, size: 9 },
  { left: "108%", top: "48%", delay: 0.9, size: 10 },
];

function Diya() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
      <path d="M17 1 C21 6 21 10 17 13 C13 10 13 6 17 1 Z" fill="var(--dussehra-saffron)" />
      <path d="M17 5 C19 8 19 10 17 12 C15 10 15 8 17 5 Z" fill="var(--dussehra-ivory)" />
      <path d="M2 14 H32 C30 21 24 25 17 25 C10 25 4 21 2 14 Z" fill="var(--dussehra-gold)" />
      <path d="M6 17 H28" stroke="var(--dussehra-maroon)" strokeWidth="1.5" strokeDasharray="2 3" />
    </svg>
  );
}

export default function CelebrationMessage({ name, onReplay, portrait }) {
  const reduceMotion = useReducedMotion();
  const replayRef = useRef(null);

  const fade = (delay, distance = 14) => ({
    hidden: { opacity: 0, y: reduceMotion ? 0 : distance },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay } },
  });
  // The heading settles in: from wide, soft and slightly small to crisp.
  const word = (delay) => ({
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.84, letterSpacing: "0.42em", filter: "blur(12px)" },
    show: {
      opacity: 1,
      scale: 1,
      letterSpacing: "0.08em",
      filter: "blur(0px)",
      transition: { duration: reduceMotion ? 0.5 : 0.9, ease: EASE, delay },
    },
  });

  return (
    <Motion.section
      aria-labelledby="dussehra-greeting"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className={`pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center px-4 text-center ${portrait ? "top-[10%]" : "top-[7%]"}`}
    >
      <Motion.div variants={fade(0, 0)} className="dussehra-scrim absolute -inset-x-6 -top-24 -bottom-16 -z-10" aria-hidden="true" />
      {/* No letter-spacing here: it breaks Devanagari conjuncts and the headline stroke. */}
      <Motion.p
        lang="hi"
        variants={fade(0.05)}
        className="text-lg font-semibold tracking-normal text-[var(--dussehra-saffron)] sm:text-xl [@media(max-height:520px)]:text-base"
      >
        शुभ विजयादशमी
      </Motion.p>
      <h2
        id="dussehra-greeting"
        className="relative mt-2 text-[44px] font-bold uppercase leading-[0.95] min-[400px]:text-[54px] sm:text-7xl lg:text-8xl [@media(max-height:520px)]:text-[40px]"
      >
        <Motion.span variants={word(0.1)} className="block">
          <span className="dussehra-title">Happy</span>
        </Motion.span>
        <Motion.span variants={word(0.28)} className="block">
          <span className="dussehra-title">Dussehra</span>
        </Motion.span>
        {name && (
          <Motion.span
            variants={fade(0.6)}
            className="mt-2 block break-words text-2xl font-semibold normal-case leading-tight tracking-normal text-[var(--dussehra-ivory)] [text-shadow:0_0_18px_color-mix(in_srgb,var(--dussehra-saffron)_60%,transparent)] min-[400px]:text-3xl sm:text-4xl [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-xl"
          >
            <span className="sr-only">, </span>
            {name}
          </Motion.span>
        )}
        {SPARKLES.map((sparkle) => (
          <svg
            key={`${sparkle.left}${sparkle.top}`}
            className="dussehra-sparkle absolute"
            style={{ left: sparkle.left, top: sparkle.top, width: sparkle.size, height: sparkle.size, animationDelay: `${0.8 + sparkle.delay}s` }}
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="var(--dussehra-ivory)" />
          </svg>
        ))}
      </h2>
      <Motion.div variants={fade(0.75, 0)} className="mt-4 flex items-center gap-3 [@media(max-height:520px)]:mt-2" aria-hidden="true">
        <span className="h-px w-14 bg-gradient-to-r from-transparent to-[var(--dussehra-gold)] sm:w-24" />
        <Diya />
        <span className="h-px w-14 bg-gradient-to-l from-transparent to-[var(--dussehra-gold)] sm:w-24" />
      </Motion.div>
      <Motion.p
        variants={fade(0.9)}
        className="mt-3 max-w-md text-lg italic leading-snug text-[var(--dussehra-ivory)] sm:text-2xl [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-base"
      >
        May good always triumph over evil.
      </Motion.p>
      <Motion.button
        ref={replayRef}
        type="button"
        variants={fade(1.3)}
        onAnimationComplete={(definition) => {
          if (definition === "show") replayRef.current?.focus({ preventScroll: true });
        }}
        onClick={onReplay}
        className="pointer-events-auto mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--dussehra-gold)] px-6 py-3 text-sm font-semibold text-[var(--dussehra-ink)] shadow-[0_0_32px_color-mix(in_srgb,var(--dussehra-saffron)_45%,transparent)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--dussehra-ivory)] motion-reduce:transition-none sm:text-base [@media(max-height:520px)]:mt-3"
      >
        <RotateCcw size={18} aria-hidden="true" />
        Celebrate Again
      </Motion.button>
    </Motion.section>
  );
}
