import { useEffect } from "react";
import {
  animate,
  motion as Motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

// Decorative page background for the onboarding welcome screen. It fills the
// nearest positioned ancestor (Profile's <main>, which is `relative isolate`
// while this screen is shown) and sits behind the content at -z-10.

const DOT_SIZE = "22px 22px";
const dots = (strength) =>
  `radial-gradient(circle, color-mix(in srgb, var(--primary) ${strength}%, transparent) 1.2px, transparent 1.7px)`;
const FADE = "radial-gradient(ellipse 110% 85% at 50% 0%, #000 45%, transparent 100%)";

const BLOBS = [
  {
    className: "-top-48 right-[-12%] size-[680px]",
    color: "var(--highlight)",
    strength: 40,
    drift: { x: [0, -70, 30, 0], y: [0, 50, -20, 0] },
    duration: 24,
  },
  {
    className: "top-[28%] -left-56 size-[600px]",
    color: "var(--primary)",
    strength: 14,
    drift: { x: [0, 60, -20, 0], y: [0, -40, 30, 0] },
    duration: 28,
  },
  {
    className: "-bottom-56 right-[18%] size-[560px]",
    color: "var(--employee-green)",
    strength: 18,
    drift: { x: [0, -40, 50, 0], y: [0, -30, 10, 0] },
    duration: 26,
  },
];

// Wave origins, as % of the backdrop. Corners are favoured; otherwise a random
// point is used so consecutive waves never feel repetitive.
const CORNERS = [
  [0, 0],
  [100, 0],
  [0, 100],
  [100, 100],
];
const WAVE_BAND = 150;
const WAVE_REACH = 2600;

const randomBetween = (min, max) => min + Math.random() * (max - min);
const pickOrigin = () =>
  Math.random() < 0.65
    ? CORNERS[Math.floor(Math.random() * CORNERS.length)]
    : [randomBetween(5, 95), randomBetween(5, 95)];

// One "breathing" ripple: a soft ring of brighter dots that expands from an
// origin while fading in and out, rests, then starts again from a new origin.
function DotWave({ startDelay }) {
  const radius = useMotionValue(0);
  const strength = useMotionValue(0);
  const originX = useMotionValue(0);
  const originY = useMotionValue(0);
  const inner = useTransform(radius, (value) => Math.max(0, value - WAVE_BAND));
  const outer = useTransform(radius, (value) => value + WAVE_BAND);
  const ring = useMotionTemplate`radial-gradient(circle at ${originX}% ${originY}%, transparent ${inner}px, #000 ${radius}px, transparent ${outer}px)`;

  useEffect(() => {
    let cancelled = false;
    let timer;
    const running = [];
    const rest = (seconds) => new Promise((resolve) => {
      timer = setTimeout(resolve, seconds * 1000);
    });

    const loop = async () => {
      await rest(startDelay);
      while (!cancelled) {
        const [x, y] = pickOrigin();
        const duration = randomBetween(8, 11);
        originX.set(x);
        originY.set(y);
        radius.set(0);
        running.length = 0;
        running.push(
          animate(radius, WAVE_REACH, { duration, ease: [0.25, 0.1, 0.25, 1] }),
          animate(strength, [0, 1, 0.85, 0], { duration, times: [0, 0.2, 0.55, 1], ease: "easeInOut" }),
        );
        await Promise.all(running);
        if (!cancelled) await rest(randomBetween(0.8, 2.6));
      }
    };
    loop();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      running.forEach((controls) => controls.stop());
    };
  }, [startDelay, radius, strength, originX, originY]);

  return (
    <Motion.div
      className="absolute inset-0"
      style={{
        backgroundImage: dots(60),
        backgroundSize: DOT_SIZE,
        maskImage: ring,
        WebkitMaskImage: ring,
        opacity: strength,
      }}
    />
  );
}

export default function OnboardingBackdrop({ containerRef, pointer }) {
  const reduceMotion = useReducedMotion();
  const glow = useMotionTemplate`radial-gradient(520px circle at ${pointer.x}px ${pointer.y}px, color-mix(in srgb, var(--highlight) 22%, transparent), transparent 65%)`;
  const reveal = useMotionTemplate`radial-gradient(200px circle at ${pointer.x}px ${pointer.y}px, #000 0%, transparent 75%)`;

  return (
    <Motion.div
      ref={containerRef}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {BLOBS.map(({ className, color, strength, drift, duration }) => (
        <Motion.div
          key={className}
          className={`absolute rounded-full will-change-transform ${className}`}
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${color} ${strength}%, transparent) 0%, transparent 68%)`,
          }}
          animate={drift}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <Motion.div
        className="absolute inset-0"
        style={{ backgroundImage: dots(16), backgroundSize: DOT_SIZE, maskImage: FADE, WebkitMaskImage: FADE }}
        animate={reduceMotion ? undefined : { opacity: [1, 0.72, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {!reduceMotion && (
        <>
          <DotWave startDelay={0.6} />
          <DotWave startDelay={5.5} />
        </>
      )}

      {pointer.enabled && (
        <>
          <Motion.div className="absolute inset-0" style={{ backgroundImage: glow }} />
          <Motion.div
            className="absolute inset-0"
            style={{ backgroundImage: dots(75), backgroundSize: DOT_SIZE, maskImage: reveal, WebkitMaskImage: reveal }}
          />
        </>
      )}
    </Motion.div>
  );
}
