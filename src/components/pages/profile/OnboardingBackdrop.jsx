import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  animate,
  MotionConfig,
  motion as Motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

// Decorative page background for the onboarding screens. It fills the nearest
// positioned ancestor (Profile's <main>, which is `relative isolate` while an
// onboarding welcome screen is shown) and sits behind the content at -z-10.
//
// pattern="dots": dot grid with breathing ripple waves (OnboardingWelcome)
// pattern="grid": line grid with light beams gliding along it (CandidateWelcome)
// pattern="aurora": no pattern; shifting color fields, a slow rotating sheen
//                   and silky flowing ribbons (ResumeUpload)

const CELL = 48;
const primaryMix = (strength) => `color-mix(in srgb, var(--primary) ${strength}%, transparent)`;
const dotsImage = (strength) =>
  `radial-gradient(circle, ${primaryMix(strength)} 1.2px, transparent 1.7px)`;
const gridImage = (strength) =>
  `linear-gradient(to right, ${primaryMix(strength)} 1px, transparent 1px), linear-gradient(to bottom, ${primaryMix(strength)} 1px, transparent 1px)`;

const PATTERNS = {
  dots: {
    image: dotsImage,
    size: "22px 22px",
    base: 16,
    reveal: 75,
    revealRadius: 200,
    fade: "radial-gradient(ellipse 110% 85% at 50% 0%, #000 45%, transparent 100%)",
    blobs: [
      { className: "-top-48 right-[-12%] size-[680px]", color: "var(--highlight)", strength: 40, drift: { x: [0, -70, 30, 0], y: [0, 50, -20, 0] }, duration: 24 },
      { className: "top-[28%] -left-56 size-[600px]", color: "var(--primary)", strength: 14, drift: { x: [0, 60, -20, 0], y: [0, -40, 30, 0] }, duration: 28 },
      { className: "-bottom-56 right-[18%] size-[560px]", color: "var(--employee-green)", strength: 18, drift: { x: [0, -40, 50, 0], y: [0, -30, 10, 0] }, duration: 26 },
    ],
  },
  grid: {
    image: gridImage,
    size: `${CELL}px ${CELL}px`,
    base: 8,
    reveal: 38,
    revealRadius: 240,
    fade: "radial-gradient(ellipse 90% 80% at 50% 30%, #000 35%, transparent 100%)",
    blobs: [
      { className: "-top-56 -left-40 size-[680px]", color: "var(--highlight)", strength: 38, drift: { x: [0, 60, -20, 0], y: [0, 40, -10, 0] }, duration: 26 },
      { className: "top-[18%] -right-56 size-[620px]", color: "var(--employee-green)", strength: 16, drift: { x: [0, -50, 20, 0], y: [0, 30, -30, 0] }, duration: 30 },
      { className: "-bottom-64 left-[30%] size-[600px]", color: "var(--primary)", strength: 12, drift: { x: [0, 40, -40, 0], y: [0, -30, 10, 0] }, duration: 24 },
    ],
  },
  aurora: {
    blobs: [
      { className: "-top-64 right-[-8%] size-[820px]", color: "var(--highlight)", strength: 44, drift: { x: [0, -90, 40, 0], y: [0, 60, -30, 0], scale: [1, 1.12, 0.94, 1] }, duration: 22 },
      { className: "top-[22%] -left-72 size-[760px]", color: "var(--primary)", strength: 16, drift: { x: [0, 80, -30, 0], y: [0, -50, 40, 0], scale: [1, 0.92, 1.1, 1] }, duration: 26 },
      { className: "-bottom-72 right-[12%] size-[720px]", color: "var(--employee-green)", strength: 24, drift: { x: [0, -60, 70, 0], y: [0, -40, 20, 0], scale: [1, 1.08, 0.96, 1] }, duration: 24 },
      { className: "top-[38%] left-[34%] size-[520px]", color: "var(--highlight)", strength: 16, drift: { x: [0, 70, -50, 0], y: [0, 40, -40, 0], scale: [1, 1.2, 0.9, 1] }, duration: 30 },
    ],
  },
};

// The pattern itself at a given strength. Masks for fading, spotlights and
// animation go on a wrapper.
function PatternFill({ config, strength }) {
  return (
    <div
      className="absolute inset-0"
      style={{ backgroundImage: config.image(strength), backgroundSize: config.size }}
    />
  );
}

const randomBetween = (min, max) => min + Math.random() * (max - min);

// --- Dots: breathing ripple waves ------------------------------------------

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

const pickOrigin = () =>
  Math.random() < 0.65
    ? CORNERS[Math.floor(Math.random() * CORNERS.length)]
    : [randomBetween(5, 95), randomBetween(5, 95)];

// A soft ring of brighter dots that expands from an origin while fading in
// and out, rests, then starts again from a new origin.
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
        backgroundImage: dotsImage(60),
        backgroundSize: PATTERNS.dots.size,
        maskImage: ring,
        WebkitMaskImage: ring,
        opacity: strength,
      }}
    />
  );
}

// --- Grid: light beams ------------------------------------------------------

// The streak occupies the last 22% of a full-length strip; translating the
// strip slides it across the line from one end to the other.
const beamGradient = (angle) =>
  `linear-gradient(${angle}deg, transparent 78%, ${primaryMix(60)} 95%, var(--highlight) 99.4%, transparent 100%)`;

const BEAM_PATHS = {
  right: { axis: "x", from: "-100%", to: "22%", angle: 90 },
  left: { axis: "x", from: "100%", to: "-22%", angle: 270 },
  down: { axis: "y", from: "-100%", to: "22%", angle: 180 },
  up: { axis: "y", from: "100%", to: "-22%", angle: 0 },
};

function nextBeam(containerRef) {
  const rect = containerRef.current?.getBoundingClientRect();
  const width = rect?.width || window.innerWidth;
  const height = rect?.height || window.innerHeight;
  const horizontal = Math.random() < 0.55;
  const lines = Math.floor((horizontal ? height : width) / CELL);
  // Stay on lines inside the visible middle of the grid, where the fade is clear.
  const index = Math.round(randomBetween(lines * 0.12, lines * 0.85));
  const direction = horizontal
    ? (Math.random() < 0.5 ? "right" : "left")
    : (Math.random() < 0.5 ? "down" : "up");
  return {
    id: `${direction}-${index}-${Date.now()}`,
    horizontal,
    offset: Math.max(1, index) * CELL,
    path: BEAM_PATHS[direction],
    duration: randomBetween(3, 5.2),
  };
}

function GridBeam({ containerRef, startDelay }) {
  const [beam, setBeam] = useState(null);
  const timer = useRef();

  useEffect(() => {
    timer.current = setTimeout(() => setBeam(nextBeam(containerRef)), startDelay * 1000);
    return () => clearTimeout(timer.current);
  }, [containerRef, startDelay]);

  if (!beam) return null;
  const { axis, from, to, angle } = beam.path;
  const scheduleNext = () => {
    timer.current = setTimeout(() => setBeam(nextBeam(containerRef)), randomBetween(0.6, 3) * 1000);
  };

  return (
    <div
      key={beam.id}
      className={beam.horizontal ? "absolute inset-x-0 h-px overflow-hidden" : "absolute inset-y-0 w-px overflow-hidden"}
      style={beam.horizontal ? { top: beam.offset } : { left: beam.offset }}
    >
      <Motion.div
        className="size-full"
        style={{ backgroundImage: beamGradient(angle) }}
        initial={{ [axis]: from }}
        animate={{ [axis]: to }}
        transition={{ duration: beam.duration, ease: [0.45, 0, 0.55, 1] }}
        onAnimationComplete={scheduleNext}
      />
    </div>
  );
}

const BEAM_DELAYS = [0.4, 1.3, 2.4, 3.5, 4.7];

// --- Aurora: sheen and flowing ribbons -------------------------------------

const SHEEN = "conic-gradient(from 90deg at 50% 50%, transparent 0deg, color-mix(in srgb, var(--highlight) 20%, transparent) 70deg, transparent 150deg, color-mix(in srgb, var(--primary) 9%, transparent) 230deg, transparent 310deg)";
const SHEEN_MASK = "radial-gradient(circle at 50% 50%, transparent 8%, #000 32%, #000 52%, transparent 70%)";

// Each ribbon is a bundle of thin parallel curves. Every line morphs between
// two shapes with the same commands, so the bundle flows like silk.
const ribbonPath = ({ y, lift, tilt }, offset, phase) => {
  const base = y + offset;
  return `M -200 ${base} C 320 ${base - lift + phase}, 720 ${base + lift - phase}, 1100 ${base + tilt} S 1820 ${base - lift + tilt + phase}, 2200 ${base + tilt * 2}`;
};

const RIBBONS = [
  { y: 700, lift: 170, tilt: -70, lines: 9, gap: 11, swing: 90, duration: 18 },
  { y: 220, lift: 110, tilt: 40, lines: 6, gap: 9, swing: 60, duration: 22 },
];

// `still` freezes the ribbons; MotionConfig's reducedMotion does not cover `d`.
function AuroraRibbons({ still }) {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="0 0 2000 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="onboarding-ribbon-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
          <stop offset="0.4" style={{ stopColor: "var(--primary)", stopOpacity: 0.55 }} />
          <stop offset="0.75" style={{ stopColor: "var(--highlight)", stopOpacity: 0.9 }} />
          <stop offset="1" style={{ stopColor: "var(--highlight)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {RIBBONS.map((ribbon, ribbonIndex) => {
        const middle = (ribbon.lines - 1) / 2;
        return Array.from({ length: ribbon.lines }, (_, line) => {
          const offset = (line - middle) * ribbon.gap;
          const from = ribbonPath(ribbon, offset, line * 6);
          const to = ribbonPath(ribbon, offset, ribbon.swing - line * 4);
          return (
            <Motion.path
              key={`${ribbonIndex}-${line}`}
              d={from}
              stroke="url(#onboarding-ribbon-stroke)"
              strokeWidth={1.1}
              opacity={0.16 + 0.3 * (1 - Math.abs(line - middle) / (middle || 1))}
              animate={still ? undefined : { d: [from, to, from] }}
              transition={{ duration: ribbon.duration, repeat: Infinity, ease: "easeInOut", delay: line * 0.12 }}
            />
          );
        });
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function OnboardingBackdrop({ containerRef, pointer, pattern = "dots", pinned = false }) {
  const reduceMotion = useReducedMotion();
  const config = PATTERNS[pattern] || PATTERNS.dots;
  const glow = useMotionTemplate`radial-gradient(520px circle at ${pointer.x}px ${pointer.y}px, color-mix(in srgb, var(--highlight) 22%, transparent), transparent 65%)`;
  const reveal = useMotionTemplate`radial-gradient(${config.revealRadius || 200}px circle at ${pointer.x}px ${pointer.y}px, #000 0%, transparent 75%)`;
  const hasPattern = Boolean(config.image);

  const layers = (
    <>
      {config.blobs.map(({ className, color, strength, drift, duration }) => (
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

      {hasPattern && (
        <Motion.div
          className="absolute inset-0"
          style={{ maskImage: config.fade, WebkitMaskImage: config.fade }}
          animate={reduceMotion ? undefined : { opacity: [1, 0.72, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <PatternFill config={config} strength={config.base} />
        </Motion.div>
      )}

      {pattern === "aurora" && (
        <>
          <Motion.div
            className="absolute top-1/2 left-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2"
            style={{ background: SHEEN, maskImage: SHEEN_MASK, WebkitMaskImage: SHEEN_MASK }}
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          />
          <AuroraRibbons still={reduceMotion} />
        </>
      )}

      {!reduceMotion && pattern === "dots" && (
        <>
          <DotWave startDelay={0.6} />
          <DotWave startDelay={5.5} />
        </>
      )}

      {!reduceMotion && pattern === "grid" && (
        <div className="absolute inset-0" style={{ maskImage: config.fade, WebkitMaskImage: config.fade }}>
          {BEAM_DELAYS.map((delay) => (
            <GridBeam key={delay} containerRef={containerRef} startDelay={delay} />
          ))}
        </div>
      )}

      {pointer.enabled && (
        <>
          <Motion.div className="absolute inset-0" style={{ backgroundImage: glow }} />
          {hasPattern && (
            <Motion.div className="absolute inset-0" style={{ maskImage: reveal, WebkitMaskImage: reveal }}>
              <PatternFill config={config} strength={config.reveal} />
            </Motion.div>
          )}
        </>
      )}
    </>
  );

  // `pinned` keeps the scene viewport-sized and in place while a long page
  // scrolls over it. `overflow-clip` (unlike `hidden`) still lets the inner
  // layer stick, because it does not create a scroll container.
  return (
    <MotionConfig reducedMotion="user">
      <Motion.div
        ref={pinned ? undefined : containerRef}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className={cn("pointer-events-none absolute inset-0 -z-10", pinned ? "overflow-clip" : "overflow-hidden")}
      >
        {pinned ? (
          <div ref={containerRef} className="sticky top-0 h-dvh overflow-hidden">{layers}</div>
        ) : layers}
      </Motion.div>
    </MotionConfig>
  );
}
