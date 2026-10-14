import { useEffect, useState } from "react";
import { useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";

// Shared motion vocabulary for the onboarding screens (OnboardingWelcome,
// CandidateWelcome). Wrap screens in <MotionConfig reducedMotion="user">.

export const EASE = [0.22, 1, 0.36, 1];

export const stagger = (delayChildren, staggerChildren) => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

export const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const slideIn = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

// Highlighter stroke drawn under a headline phrase.
export const marker = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { delay: 0.55, duration: 0.7, ease: EASE } },
};

// Tracks the pointer across the page for backdrop spotlights and parallax.
// Off for touch devices and reduced-motion users.
export function usePointerField(containerRef) {
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

// Soft highlight glow that follows the pointer inside a card. Spread
// `handlers` on the card and render `backgroundImage` on an overlay that
// fades in with `group-hover:opacity-100`.
export function useCardSpotlight(strength = 26, size = 380) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const backgroundImage = useMotionTemplate`radial-gradient(${size}px circle at ${x}px ${y}px, color-mix(in srgb, var(--highlight) ${strength}%, transparent), transparent 70%)`;
  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };
  return { handlers: { onPointerMove }, backgroundImage };
}
