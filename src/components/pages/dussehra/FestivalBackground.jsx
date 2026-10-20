import { memo, useEffect, useMemo } from "react";
import { motion as Motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import SceneLayer from "./SceneLayer";
import { clamp, mulberry32 } from "./dussehraScene";

// The festival night around the effigy: FestivalSky (behind the fireworks),
// FestivalLand (skyline and ground, in front of them) and FestivalCrowd (in front
// of the effigy's base). All in scene pixels; see dussehraScene.js.
//
// Static artwork is painted once. Anything that keeps moving (twinkling stars,
// chasing lights, motes, distant bursts, firelight) animates a whole small layer's
// opacity or transform, which the browser composites without repainting.

const sceneUnit = (layout) => clamp(Math.min(layout.width, layout.height) / 800, 0.45, 1.4);

const LIGHT_COLORS = ["#ffd27a", "#ff9a3c", "#ff6f91", "#fff1c4"];
const BURST_COLORS = ["#ffd27a", "#ff7aa8", "#7ff0b8"];
const TWINKLE_GROUPS = 3;

// Gentle depth for fine pointers: the sky drifts against the pointer.
function useParallax() {
  const reduceMotion = useReducedMotion();
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  useEffect(() => {
    if (reduceMotion || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return undefined;
    const onMove = (event) => {
      nx.set(event.clientX / window.innerWidth - 0.5);
      ny.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion, nx, ny]);
  return { nx, ny };
}

// A full-stage radial glow whose opacity the scene's loop sets every frame.
function Firelight({ glowRef, x, y, rx, ry, tone }) {
  return (
    <div
      ref={glowRef}
      className={`dussehra-firelight dussehra-firelight-${tone} absolute rounded-full`}
      style={{ left: x - rx, top: y - ry, width: rx * 2, height: ry * 2 }}
      aria-hidden="true"
    />
  );
}

// --- Sky ------------------------------------------------------------------------------

function makeStars(width, skyHeight) {
  const random = mulberry32(11);
  const count = Math.round(clamp((width * skyHeight) / 5200, 50, 240));
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: Math.pow(random(), 1.5) * skyHeight * 0.9,
    r: 0.4 + random() * 1.2,
    opacity: 0.35 + random() * 0.65,
    twinkle: random() < 0.22 ? Math.floor(random() * TWINKLE_GROUPS) : -1,
  }));
}

function makeMotes(width, horizonY, height, unit) {
  const random = mulberry32(23);
  return Array.from({ length: 16 }, () => ({
    x: random() * width,
    y: horizonY - random() * height * 0.3,
    size: (1.6 + random() * 2.6) * unit,
    speed: 7 + random() * 6,
    drift: (random() - 0.5) * 40,
    delay: -random() * 12,
  }));
}

export const FestivalSky = memo(function FestivalSky({ layout, glowRef }) {
  const { width: w, height: h, horizonY, moon, ravana, portrait } = layout;
  const unit = sceneUnit(layout);
  const stars = useMemo(() => makeStars(w, horizonY), [w, horizonY]);
  const motes = useMemo(() => makeMotes(w, horizonY, h, unit), [w, horizonY, h, unit]);
  const { nx, ny } = useParallax();
  const farX = useTransform(nx, (value) => value * -12);
  const farY = useTransform(ny, (value) => value * -7);
  const burstRadius = 24 * unit;
  const bursts = portrait
    ? [{ x: 0.14 * w, y: 0.12 * h }, { x: 0.86 * w, y: 0.09 * h }, { x: 0.5 * w, y: 0.05 * h }]
    : [{ x: 0.1 * w, y: 0.18 * h }, { x: 0.92 * w, y: 0.12 * h }, { x: 0.3 * w, y: 0.3 * h }];

  return (
    <>
      <SceneLayer layout={layout}>
        <defs>
          <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05061a" />
            <stop offset="0.4" stopColor="#120f38" />
            <stop offset="0.66" stopColor="#2b1748" />
            <stop offset="0.84" stopColor="#5e2144" />
            <stop offset="0.95" stopColor="#a53f2a" />
            <stop offset="1" stopColor="#e2702c" />
          </linearGradient>
          <radialGradient id="fs-horizon" cx="0.5" cy="1" r="1">
            <stop offset="0" stopColor="#ff8a3a" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#c2402a" stopOpacity="0.18" />
            <stop offset="1" stopColor="#c2402a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fs-haze">
            <stop offset="0" stopColor="#7a3a78" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7a3a78" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={w} height={horizonY + 2} fill="url(#fs-sky)" />
        <ellipse cx={w * 0.25} cy={horizonY - h * 0.2} rx={w * 0.4} ry={h * 0.05} fill="url(#fs-haze)" />
        <ellipse cx={w * 0.8} cy={horizonY - h * 0.32} rx={w * 0.35} ry={h * 0.04} fill="url(#fs-haze)" />
        <ellipse cx={ravana.x} cy={horizonY} rx={w * 0.75} ry={h * 0.28} fill="url(#fs-horizon)" />
      </SceneLayer>

      <Motion.div className="dussehra-layer" style={{ x: farX, y: farY }}>
        <SceneLayer layout={layout}>
          <defs>
            <radialGradient id="fs-moon" cx="0.42" cy="0.4" r="0.65">
              <stop offset="0" stopColor="#fffbef" />
              <stop offset="0.55" stopColor="#f8e7b8" />
              <stop offset="1" stopColor="#e3b96c" />
            </radialGradient>
            <radialGradient id="fs-halo">
              <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.5" />
              <stop offset="0.3" stopColor="#ffc878" stopOpacity="0.16" />
              <stop offset="1" stopColor="#ffc878" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g fill="#fff6e0">
            {stars.map((star, i) => (star.twinkle < 0 ? <circle key={i} cx={star.x} cy={star.y} r={star.r} opacity={star.opacity} /> : null))}
          </g>
          <circle cx={moon.x} cy={moon.y} r={moon.r * 3.2} fill="url(#fs-halo)" />
          <circle cx={moon.x} cy={moon.y} r={moon.r} fill="url(#fs-moon)" />
          <g fill="#c9a060" opacity={0.22}>
            <circle cx={moon.x - moon.r * 0.3} cy={moon.y - moon.r * 0.2} r={moon.r * 0.16} />
            <circle cx={moon.x + moon.r * 0.28} cy={moon.y + moon.r * 0.18} r={moon.r * 0.22} />
            <circle cx={moon.x - moon.r * 0.05} cy={moon.y + moon.r * 0.45} r={moon.r * 0.1} />
            <circle cx={moon.x + moon.r * 0.4} cy={moon.y - moon.r * 0.38} r={moon.r * 0.08} />
          </g>
        </SceneLayer>
        {Array.from({ length: TWINKLE_GROUPS }, (_, group) => (
          <SceneLayer key={group} layout={layout} className="dussehra-twinkle" style={{ animationDelay: `${(-group * 3.2) / TWINKLE_GROUPS}s` }}>
            <g fill="#fff6e0">
              {stars.map((star, i) => (star.twinkle === group ? <circle key={i} cx={star.x} cy={star.y} r={star.r * 1.3} /> : null))}
            </g>
          </SceneLayer>
        ))}
      </Motion.div>

      {bursts.map((burst, i) => (
        <svg
          key={i}
          className="dussehra-distant-burst pointer-events-none absolute"
          style={{ left: burst.x - burstRadius, top: burst.y - burstRadius, width: burstRadius * 2, height: burstRadius * 2, animationDelay: `${i * 2.1}s` }}
          viewBox={`${-burstRadius} ${-burstRadius} ${burstRadius * 2} ${burstRadius * 2}`}
          aria-hidden="true"
        >
          <g stroke={BURST_COLORS[i]} strokeWidth={1.6 * unit} strokeLinecap="round">
            {Array.from({ length: 16 }, (_, k) => {
              const angle = (k / 16) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1={Math.cos(angle) * 6 * unit}
                  y1={Math.sin(angle) * 6 * unit}
                  x2={Math.cos(angle) * 22 * unit}
                  y2={Math.sin(angle) * 22 * unit}
                />
              );
            })}
          </g>
        </svg>
      ))}

      <Firelight glowRef={glowRef} tone="sky" x={ravana.x} y={ravana.y - 360 * ravana.scale} rx={620 * ravana.scale} ry={560 * ravana.scale} />

      {motes.map((mote, i) => (
        <span
          key={i}
          className="dussehra-mote pointer-events-none absolute rounded-full bg-[var(--dussehra-gold)]"
          style={{
            left: mote.x,
            top: mote.y,
            width: mote.size,
            height: mote.size,
            animationDelay: `${mote.delay}s`,
            "--mote-speed": `${mote.speed}s`,
            "--mote-drift": `${mote.drift}px`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
});

// --- Land ------------------------------------------------------------------------------

// A hazy row of rooftops, chhatri domes and spires along the horizon.
function farSkyline(width, baseY, unit) {
  const random = mulberry32(31);
  let d = `M0 ${baseY + 2} L0 ${baseY}`;
  let x = 0;
  while (x < width) {
    const span = (26 + random() * 60) * unit;
    const top = baseY - (8 + random() * 30) * unit;
    const roll = random();
    d += ` L${x} ${top}`;
    if (roll < 0.18) {
      d += ` L${x + span * 0.2} ${top} A${span * 0.3} ${span * 0.3} 0 0 1 ${x + span * 0.8} ${top}`;
    } else if (roll < 0.3) {
      d += ` L${x + span * 0.32} ${top} L${x + span * 0.5} ${top - (baseY - top) * 1.2} L${x + span * 0.68} ${top}`;
    }
    d += ` L${x + span} ${top}`;
    x += span;
  }
  return `${d} L${x} ${baseY + 2} Z`;
}

// Nagara-style temple, base at the origin, about 320 tall.
const TEMPLE =
  "M-92 0 L-92 -58 L-74 -58 L-74 -84 Q-62 -118 -50 -84 L-44 -84 L-44 -112 C-48 -170 -30 -228 -8 -262 L8 -262 C30 -228 48 -170 44 -112 L44 -84 L50 -84 Q62 -118 74 -84 L74 -58 L92 -58 L92 0 Z";

function Temple({ x, y, scale }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={TEMPLE} />
      <ellipse cy={-266} rx={15} ry={6} />
      <circle cy={-279} r={6} />
      <path d="M-3 -284 L3 -284 L1 -292 L-1 -292 Z" />
      <line y1={-290} y2={-322} stroke="#150c26" strokeWidth={2.5} />
      <path d="M0 -322 L28 -313 L0 -304 Z" fill="#8a3a18" />
      <path d="M-36 -150 Q0 -158 36 -150 M-30 -190 Q0 -198 30 -190 M-22 -226 Q0 -232 22 -226" fill="none" stroke="#2c1d48" strokeWidth={2} />
    </g>
  );
}

const frond = (angleDeg, length) => {
  const angle = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const droop = length * 0.35;
  const tip = [dx * length, dy * length + droop];
  const mid = [dx * length * 0.5, dy * length * 0.5 + droop * 0.2];
  return `M0 0 Q${mid[0] - dy * 10} ${mid[1] + dx * 10} ${tip[0]} ${tip[1]} Q${mid[0] + dy * 3} ${mid[1] - dx * 3} 0 0 Z`;
};
const FRONDS = [-170, -140, -112, -86, -60, -32, -6].map((angle) => frond(angle, angle % 2 ? 84 : 72)).join(" ");

function Palm({ x, y, scale, flip }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M-5 0 C2 -60 2 -140 10 -222 L18 -222 C12 -140 12 -60 7 0 Z" />
      <g transform="translate(14 -222)">
        <path d={FRONDS} />
      </g>
    </g>
  );
}

function RoundTree({ x, y, scale }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-9} y={-70} width={18} height={70} />
      <circle cy={-130} r={58} />
      <circle cx={-52} cy={-98} r={44} />
      <circle cx={52} cy={-102} r={46} />
      <circle cx={-22} cy={-168} r={40} />
      <circle cx={30} cy={-160} r={38} />
    </g>
  );
}

function Stall({ x, y, scale, hue }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-40} y={-46} width={80} height={46} fill="#1d1230" />
      <path d="M-52 -44 L0 -82 L52 -44 Z" fill="#241538" />
      <path d="M-52 -44 L-40 -36 L-28 -44 L-16 -36 L-4 -44 L8 -36 L20 -44 L32 -36 L44 -44 L52 -44" fill="none" stroke={hue} strokeWidth={3} opacity={0.75} />
      <rect x={-14} y={-34} width={28} height={34} fill="#ffb55a" opacity={0.78} />
      <rect x={-14} y={-34} width={28} height={34} fill="url(#fs-lamp)" opacity={0.9} />
    </g>
  );
}

function stringLights(points, unit) {
  const [start, control, end] = points;
  const count = Math.max(6, Math.round(Math.hypot(end.x - start.x, end.y - start.y) / (24 * unit)));
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const u = 1 - t;
    return {
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
      color: LIGHT_COLORS[i % LIGHT_COLORS.length],
    };
  });
}

export const FestivalLand = memo(function FestivalLand({ layout, glowRef }) {
  const { width: w, height: h, horizonY, ravana, portrait } = layout;
  const unit = sceneUnit(layout);
  const far = useMemo(() => farSkyline(w, horizonY, unit), [w, horizonY, unit]);
  const strands = useMemo(() => {
    const y = horizonY - h * (portrait ? 0.13 : 0.19);
    const sag = h * 0.05;
    return [
      [{ x: w * 0.01, y }, { x: w * 0.17, y: y + sag * 2 }, { x: w * 0.33, y: y + h * 0.02 }],
      [{ x: w * 0.67, y: y + h * 0.02 }, { x: w * 0.83, y: y + sag * 2 }, { x: w * 0.99, y }],
    ];
  }, [w, h, horizonY, portrait]);
  const bulbs = useMemo(() => strands.flatMap((strand) => stringLights(strand, unit)), [strands, unit]);
  const temples = portrait
    ? [{ x: 0.08 * w, s: 0.7 * unit }, { x: 0.93 * w, s: 0.6 * unit }]
    : [{ x: 0.06 * w, s: 1.05 * unit }, { x: 0.94 * w, s: 0.95 * unit }, { x: 0.27 * w, s: 0.55 * unit }];
  const stalls = portrait
    ? [{ x: 0.24 * w, s: 0.55 * unit, hue: "#ff9a3c" }, { x: 0.78 * w, s: 0.5 * unit, hue: "#ff6f91" }]
    : [{ x: 0.16 * w, s: 0.8 * unit, hue: "#ff9a3c" }, { x: 0.36 * w, s: 0.6 * unit, hue: "#ffd27a" }, { x: 0.78 * w, s: 0.7 * unit, hue: "#ff6f91" }, { x: 0.86 * w, s: 0.85 * unit, hue: "#ff9a3c" }];

  return (
    <>
      <SceneLayer layout={layout}>
        <defs>
          <linearGradient id="fs-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1226" />
            <stop offset="0.35" stopColor="#170a18" />
            <stop offset="1" stopColor="#0a0610" />
          </linearGradient>
          <radialGradient id="fs-lamp">
            <stop offset="0" stopColor="#fff1c4" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={far} fill="#26184a" />
        {stalls.map((stall) => (
          <Stall key={stall.x} x={stall.x} y={horizonY + 2} scale={stall.s} hue={stall.hue} />
        ))}
        <g fill="#150c26">
          {temples.map((temple) => (
            <Temple key={temple.x} x={temple.x} y={horizonY + 2} scale={temple.s} />
          ))}
          <Palm x={w * (portrait ? 0.2 : 0.14)} y={horizonY + 2} scale={0.75 * unit} />
          <Palm x={w * (portrait ? 0.82 : 0.84)} y={horizonY + 2} scale={0.85 * unit} flip />
          {!portrait && <Palm x={w * 0.98} y={horizonY + 2} scale={0.7 * unit} flip />}
          {!portrait && <RoundTree x={w * 0.72} y={horizonY + 2} scale={0.55 * unit} />}
        </g>
        <g stroke="#1d1230" strokeWidth={2 * unit}>
          {strands.map(([start, , end], i) => (
            <g key={i}>
              <line x1={start.x} y1={start.y} x2={start.x} y2={horizonY} />
              <line x1={end.x} y1={end.y} x2={end.x} y2={horizonY} />
            </g>
          ))}
        </g>
        {strands.map(([start, control, end], i) => (
          <path key={i} d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} fill="none" stroke="#3a2440" strokeWidth={1.2 * unit} />
        ))}
        <rect x={0} y={horizonY} width={w} height={h - horizonY} fill="url(#fs-ground)" />
      </SceneLayer>

      {/* Chasing festival lights: alternate bulbs on two layers, out of phase */}
      {[0, 1].map((phase) => (
        <SceneLayer key={phase} layout={layout} className="dussehra-chase" style={{ animationDelay: phase ? "-1.2s" : "0s" }}>
          {bulbs.map((bulb, i) =>
            i % 2 === phase ? (
              <g key={i}>
                <circle cx={bulb.x} cy={bulb.y} r={6 * unit} fill="url(#fs-lamp)" />
                <circle cx={bulb.x} cy={bulb.y} r={1.8 * unit} fill={bulb.color} />
              </g>
            ) : null,
          )}
        </SceneLayer>
      ))}

      <Firelight glowRef={glowRef} tone="ground" x={ravana.x} y={ravana.y} rx={480 * ravana.scale} ry={150 * ravana.scale} />
    </>
  );
});

// --- Crowd -------------------------------------------------------------------------------

function makeCrowd(width, baseY, unit, seed, spacing = 1) {
  const random = mulberry32(seed);
  const people = [];
  let x = -20 * unit;
  while (x < width + 20 * unit) {
    const shoulders = (30 + random() * 12) * unit;
    const roll = random();
    people.push({
      unit,
      x: x + shoulders / 2,
      top: baseY - (26 + random() * 12) * unit,
      shoulders,
      head: (8.5 + random() * 2.5) * unit,
      arm: roll < 0.12 ? (random() < 0.5 ? -1 : 1) : 0,
      phone: roll < 0.06,
      child: roll > 0.95,
    });
    x += shoulders * (0.72 + random() * 0.2) * spacing;
  }
  return people;
}

function Person({ person, bottom }) {
  const { unit, x, top, shoulders, head, arm, child } = person;
  const half = shoulders / 2;
  const round = shoulders * 0.35;
  const headY = top - head * 0.85;
  const armX = x + arm * half * 0.7;
  return (
    <>
      <path d={`M${x - half} ${bottom} L${x - half} ${top + round} Q${x - half} ${top} ${x - half + round} ${top} L${x + half - round} ${top} Q${x + half} ${top} ${x + half} ${top + round} L${x + half} ${bottom} Z`} />
      <circle cx={x} cy={headY} r={head} />
      {arm !== 0 && (
        <>
          <rect x={armX - 2.6 * unit} y={top - 36 * unit} width={5.2 * unit} height={40 * unit} rx={2.6 * unit} transform={`rotate(${arm * 12} ${armX} ${top})`} />
          <circle cx={armX + arm * 7.5 * unit} cy={top - 36 * unit} r={3.6 * unit} />
        </>
      )}
      {child && (
        <>
          <path d={`M${x - half * 0.55} ${headY} L${x - half * 0.55} ${headY - 14 * unit} Q${x} ${headY - 22 * unit} ${x + half * 0.55} ${headY - 14 * unit} L${x + half * 0.55} ${headY} Z`} />
          <circle cx={x} cy={headY - 26 * unit} r={head * 0.7} />
        </>
      )}
    </>
  );
}

// `rimRefs.current` collects the two firelight rim layers; the loop sets their opacity.
export const FestivalCrowd = memo(function FestivalCrowd({ layout, rimRefs }) {
  const { width: w, height: h, ravana } = layout;
  const unit = clamp(ravana.scale * 1.25, 0.42, 1.2);
  const backBase = ravana.y + 6 * unit;
  const frontBase = ravana.y + 38 * unit;
  const back = useMemo(() => makeCrowd(w, backBase, unit * 0.82, 5), [w, backBase, unit]);
  const front = useMemo(() => makeCrowd(w, frontBase, unit, 9), [w, frontBase, unit]);
  // Big, close heads along the bottom edge, as if standing in the crowd.
  const near = useMemo(() => makeCrowd(w, h + 6 * unit * 2.4, unit * 2.4, 13, 1.35), [w, h, unit]);
  const phones = [...back, ...front].filter((person) => person.phone && person.arm);

  return (
    <>
      {/* Firelight catching the tops of heads and shoulders */}
      <SceneLayer ref={(node) => (rimRefs.current[0] = node)} layout={layout} className="dussehra-crowd-rim">
        <use href="#fs-crowd" fill="#ff8a3a" transform="translate(0 -2.5)" />
      </SceneLayer>
      <SceneLayer layout={layout}>
        <defs>
          <g id="fs-crowd">
            {back.map((person, i) => (
              <Person key={`b${i}`} person={person} bottom={frontBase} />
            ))}
            {front.map((person, i) => (
              <Person key={`f${i}`} person={person} bottom={h} />
            ))}
            <rect x={0} y={frontBase - 1} width={w} height={h - frontBase + 1} />
          </g>
          <g id="fs-crowd-near">
            {near.map((person, i) => (
              <Person key={i} person={{ ...person, arm: 0, child: false }} bottom={h + 40} />
            ))}
          </g>
          {/* Faint ambient light on the crowd, so the nearest heads stand out against it */}
          <linearGradient id="fs-crowd-shade" gradientUnits="userSpaceOnUse" x1="0" y1={backBase - 50 * unit} x2="0" y2={h}>
            <stop offset="0" stopColor="#0a0510" />
            <stop offset="1" stopColor="#1e1230" />
          </linearGradient>
        </defs>
        <use href="#fs-crowd" fill="url(#fs-crowd-shade)" />
        {phones.map((person, i) => {
          const size = person.unit;
          const handX = person.x + person.arm * (person.shoulders / 2) * 0.7 + person.arm * 7.5 * size;
          return (
            <g key={i}>
              <circle cx={handX} cy={person.top - 40 * size} r={10 * size} fill="#bfe0ff" opacity={0.18} />
              <rect x={handX - 3 * size} y={person.top - 46 * size} width={6 * size} height={10 * size} rx={1.2 * size} fill="#dff0ff" />
            </g>
          );
        })}
      </SceneLayer>
      <SceneLayer ref={(node) => (rimRefs.current[1] = node)} layout={layout} className="dussehra-crowd-rim">
        <use href="#fs-crowd-near" fill="#ff8a3a" transform="translate(0 -3)" />
      </SceneLayer>
      <SceneLayer layout={layout}>
        <use href="#fs-crowd-near" fill="#030106" />
      </SceneLayer>
    </>
  );
});
