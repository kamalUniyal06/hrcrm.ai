// Pure scene logic for the Dussehra celebration (DussehraExperience).
//
// Scene space is the stage's CSS pixel space: every SVG layer uses the viewBox
// `0 0 width height` and both canvases draw in it, so pointer input, drawing,
// arrow flight and collision all share one set of numbers. The effigy and the
// bow are drawn in their own units and placed by `computeLayout`.

export const SCENE = {
  READY: "ready",
  DRAGGING: "dragging",
  SHOOTING: "shooting",
  IMPACT: "impact",
  BURNING: "burning",
  CELEBRATING: "celebrating",
};

const TRANSITIONS = {
  [SCENE.READY]: { grab: SCENE.DRAGGING },
  [SCENE.DRAGGING]: { cancel: SCENE.READY, release: SCENE.SHOOTING },
  [SCENE.SHOOTING]: { hit: SCENE.IMPACT },
  [SCENE.IMPACT]: { ignite: SCENE.BURNING },
  [SCENE.BURNING]: { climax: SCENE.CELEBRATING },
  [SCENE.CELEBRATING]: { reset: SCENE.READY },
};

// Events that don't apply to the current state are ignored, so a second
// release while the arrow is in the air can never fire a second shot.
export const nextSceneState = (state, event) => TRANSITIONS[state]?.[event] ?? state;

// Seconds after the arrow hits.
export const TIMELINE = { ignite: 0.35, climax: 2.8, fireworksUntil: 22, fireOut: 27 };

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

// Small seeded PRNG, so decorative scatter (stars, skyline, crowd) is stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Effigy -----------------------------------------------------------------

// Ravana, in his own units: origin at the centre of the base, y negative upwards.
export const RAVANA = { halfWidth: 350, height: 790, chest: { x: 0, y: -430 } };

// Ten heads: the crowned main head with five to its left and four to its right,
// listed back to front (outermost first, main head last) for drawing.
export const RAVANA_HEADS = [
  { x: -272, y: -660, s: 0.54, mood: 1 },
  { x: 229, y: -648, s: 0.59, mood: 2 },
  { x: -229, y: -648, s: 0.59, mood: 2 },
  { x: 182, y: -636, s: 0.65, mood: 0 },
  { x: -182, y: -636, s: 0.65, mood: 0 },
  { x: 130, y: -624, s: 0.72, mood: 1 },
  { x: -130, y: -624, s: 0.72, mood: 1 },
  { x: 72, y: -614, s: 0.8, mood: 2 },
  { x: -72, y: -614, s: 0.8, mood: 0 },
  { x: 0, y: -606, s: 1.1, mood: 0, main: true },
];

// Where the arrow can land, kept inside the painted shapes so an arrow never
// stops in mid-air. Ellipses have rx/ry; rectangles have hw/hh (half sizes).
export const RAVANA_HIT_SHAPES = [
  ...RAVANA_HEADS.map((head) => ({ x: head.x, y: head.y - 16 * head.s, rx: 34 * head.s, ry: 58 * head.s })),
  { x: 0, y: -538, hw: 22, hh: 16 },
  { x: 0, y: -425, hw: 112, hh: 92 },
  { x: 0, y: -226, rx: 146, ry: 106 },
  { x: 0, y: -88, hw: 58, hh: 32 },
  { x: -262, y: -372, rx: 54, ry: 54 },
];

// Points the fire burns from, with a relative strength.
export const FIRE_SPOTS = [
  { x: -40, y: -66, w: 0.7 },
  { x: 40, y: -66, w: 0.7 },
  { x: -130, y: -140, w: 0.9 },
  { x: -60, y: -150, w: 1 },
  { x: 10, y: -160, w: 1 },
  { x: 80, y: -150, w: 1 },
  { x: 135, y: -140, w: 0.9 },
  { x: -95, y: -232, w: 1 },
  { x: -20, y: -242, w: 1 },
  { x: 60, y: -236, w: 1 },
  { x: -50, y: -302, w: 0.9 },
  { x: 45, y: -302, w: 0.9 },
  { x: -85, y: -382, w: 1 },
  { x: 0, y: -402, w: 1 },
  { x: 85, y: -382, w: 1 },
  { x: -70, y: -472, w: 0.9 },
  { x: 70, y: -472, w: 0.9 },
  { x: -196, y: -444, w: 0.6 },
  { x: 196, y: -444, w: 0.6 },
  { x: -262, y: -372, w: 0.8 },
  { x: 244, y: -384, w: 0.5 },
  ...RAVANA_HEADS.map((head) => ({ x: head.x, y: head.y + 12 * head.s, w: 0.4 + 0.4 * head.s })),
];

// --- Bow ----------------------------------------------------------------------

// The bow, in its own units: grip at the origin, aiming along -y. `reach` is how
// far behind the grip a full draw goes; `range` is how far (radians) the aim may
// swing either side of Ravana's chest.
export const BOW = {
  width: 330,
  restNock: 52,
  arrowLength: 268,
  maxPull: 150,
  reach: 214,
  range: 0.62,
  minPower: 0.22,
};

// --- Layout -------------------------------------------------------------------

export const toScene = (layout, point) => toSceneWith(layout.ravana, point);
export const toLocal = (layout, point) => ({
  x: (point.x - layout.ravana.x) / layout.ravana.scale,
  y: (point.y - layout.ravana.y) / layout.ravana.scale,
});
const toSceneWith = (ravana, point) => ({ x: ravana.x + point.x * ravana.scale, y: ravana.y + point.y * ravana.scale });

export function computeLayout(width, height) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const portrait = h >= w;
  const pad = clamp(Math.min(w, h) * 0.04, 12, 28);

  // The bow goes first: it needs room behind the grip for a full draw.
  const bowWidth = portrait
    ? clamp(Math.min(w * 0.58, h * 0.3), 170, 300)
    : clamp(Math.min(h * 0.4, w * 0.24), 150, 330);
  const bowScale = bowWidth / BOW.width;
  const reach = BOW.reach * bowScale;
  const bowX = portrait ? w / 2 : Math.max(w * 0.2, reach + pad, bowWidth / 2 + pad);
  const bowY = h - pad - reach * (portrait ? 1 : 0.92);

  // Ravana fills the space between the top bar and his ground line, clear of the bow.
  const top = portrait ? clamp(h * 0.14, 96, 132) : clamp(h * 0.09, 60, 84);
  const arrowTipY = bowY - (BOW.arrowLength - BOW.restNock) * bowScale;
  const base = portrait ? Math.min(h * 0.64, arrowTipY - pad) : h * 0.76;
  const left = portrait ? pad : bowX + bowWidth * 0.35;
  const right = w - pad;
  const scale = Math.max(0.05, Math.min((base - top) / RAVANA.height, (right - left) / (2 * RAVANA.halfWidth)));
  const span = RAVANA.halfWidth * scale;
  const x = portrait ? w / 2 : clamp(w * 0.56, left + span, Math.max(left + span, right - span));
  const ravana = { x, y: base, scale };

  const chest = toSceneWith(ravana, RAVANA.chest);
  const restAngle = Math.atan2(chest.x - bowX, bowY - chest.y);

  return {
    width: w,
    height: h,
    portrait,
    pad,
    top,
    horizonY: base - h * (portrait ? 0.03 : 0.045),
    ravana,
    bow: { x: bowX, y: bowY, scale: bowScale, width: bowWidth, restAngle },
    moon: { x: x + 235 * scale, y: base - 690 * scale, r: clamp(165 * scale, 44, 170) },
  };
}

// --- Aiming -------------------------------------------------------------------

// Angle 0 aims straight up; positive angles turn clockwise (SVG rotate()).
export const aimVector = (angle) => ({ x: Math.sin(angle), y: -Math.cos(angle) });

const clampAngle = (angle, center, range) => {
  const diff = Math.atan2(Math.sin(angle - center), Math.cos(angle - center));
  return center + clamp(diff, -range, range);
};

export const restPose = (layout) => ({ angle: layout.bow.restAngle, pull: 0, power: 0 });

export function nockPoint(layout, pose) {
  const aim = aimVector(pose.angle);
  const distance = (BOW.restNock + pose.pull) * layout.bow.scale;
  return { x: layout.bow.x - aim.x * distance, y: layout.bow.y - aim.y * distance };
}

export function arrowTipPoint(layout, pose) {
  const aim = aimVector(pose.angle);
  const nock = nockPoint(layout, pose);
  const length = BOW.arrowLength * layout.bow.scale;
  return { x: nock.x + aim.x * length, y: nock.y + aim.y * length };
}

// Turns the point the nock is dragged to into an aim and a draw. Pulling back
// along the line away from Ravana draws the bow; the aim swings within `range`.
export function poseFromNock(layout, nock, previous) {
  const { bow } = layout;
  const dx = nock.x - bow.x;
  const dy = nock.y - bow.y;
  const distance = Math.hypot(dx, dy) / bow.scale;
  const pull = clamp(distance - BOW.restNock, 0, BOW.maxPull);
  // With no draw the direction is meaningless (and flips), so keep the last aim.
  const angle = distance < BOW.restNock + 4
    ? previous?.angle ?? bow.restAngle
    : clampAngle(Math.atan2(-dx, dy), bow.restAngle, BOW.range);
  return { angle, pull, power: pull / BOW.maxPull };
}

// --- Hit testing ----------------------------------------------------------------

const normalizedDistance = (shape, point) => {
  const dx = point.x - shape.x;
  const dy = point.y - shape.y;
  if (shape.hw) return Math.max(Math.abs(dx) / shape.hw, Math.abs(dy) / shape.hh);
  return Math.hypot(dx / shape.rx, dy / shape.ry);
};

export const effigyContainsLocal = (point) => RAVANA_HIT_SHAPES.some((shape) => normalizedDistance(shape, point) <= 1);
export const effigyContains = (layout, point) => effigyContainsLocal(toLocal(layout, point));

// Moves a local point that misses the effigy towards the chest until it lands on it.
function settleOnEffigy(point) {
  if (effigyContainsLocal(point)) return point;
  for (let step = 1; step <= 32; step += 1) {
    const candidate = {
      x: lerp(point.x, RAVANA.chest.x, step / 32),
      y: lerp(point.y, RAVANA.chest.y, step / 32),
    };
    if (effigyContainsLocal(candidate)) return candidate;
  }
  return { ...RAVANA.chest };
}

// Where the shot lands along the aim line. The scene is seen from behind the
// archer, so the arrow flies *into* the picture: the stretch of the line that
// crosses the effigy runs from near parts to far ones (feet to heads when the
// bow is below him), and a stronger draw carries the arrow further along it.
// If the line passes beside him, the arrow is steered into the closest part.
function aimedPoint(layout, origin, dir, power) {
  const maxLength = Math.hypot(layout.width, layout.height) * 1.5;
  const step = Math.max(2, 6 * layout.ravana.scale);
  const crossings = [];
  let closest = null;
  for (let travelled = 0; travelled <= maxLength; travelled += step) {
    const local = toLocal(layout, { x: origin.x + dir.x * travelled, y: origin.y + dir.y * travelled });
    for (const shape of RAVANA_HIT_SHAPES) {
      const distance = normalizedDistance(shape, local);
      if (distance <= 1) {
        crossings.push(travelled);
        break;
      }
      if (!closest || distance < closest.distance) closest = { distance, shape, local };
    }
  }
  if (crossings.length) {
    const travelled = crossings[Math.round(lerp(0.2, 0.7, power) * (crossings.length - 1))];
    return toLocal(layout, { x: origin.x + dir.x * travelled, y: origin.y + dir.y * travelled });
  }
  const { shape, local, distance } = closest;
  const k = 0.7 / distance;
  return { x: shape.x + (local.x - shape.x) * k, y: shape.y + (local.y - shape.y) * k };
}

// --- Flight ---------------------------------------------------------------------

// Plans a shot from the drawn pose. The target is stored in effigy units, so the
// flight still ends on Ravana if the stage is resized while the arrow is flying.
export function planShot(layout, pose) {
  const start = arrowTipPoint(layout, pose);
  const aimed = toScene(layout, aimedPoint(layout, start, aimVector(pose.angle), pose.power));
  const aimedDistance = Math.hypot(aimed.x - start.x, aimed.y - start.y);
  // Weaker shots sag below the point they were aimed at.
  const sagged = { x: aimed.x, y: aimed.y + (1 - pose.power) * 0.2 * aimedDistance };
  const target = settleOnEffigy(toLocal(layout, sagged));
  const end = toScene(layout, target);
  const travel = Math.hypot(end.x - start.x, end.y - start.y);
  const duration = clamp(lerp(860, 540, pose.power) * clamp(travel / 520, 0.75, 1.3), 420, 1100);
  return { angle: pose.angle, pull: pose.pull, power: pose.power, target, duration };
}

// A quadratic Bézier that leaves the bow along the aim and bends onto the target:
// for a sagging shot the bend points down, like gravity.
export function shotPath(layout, shot) {
  const aim = aimVector(shot.angle);
  const p0 = arrowTipPoint(layout, shot);
  const p2 = toScene(layout, shot.target);
  const half = Math.hypot(p2.x - p0.x, p2.y - p0.y) * 0.5;
  return { p0, p1: { x: p0.x + aim.x * half, y: p0.y + aim.y * half }, p2 };
}

export function bezierPoint({ p0, p1, p2 }, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

export function bezierTangent({ p0, p1, p2 }, t) {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

// Leaves the string fast and loses a little speed on the way.
export const flightEase = (u) => u * (1.3 - 0.3 * u);

// How much smaller the arrow looks when it reaches Ravana, who stands further away.
export const arrowDepthScale = (layout) => clamp((0.85 * layout.ravana.scale) / layout.bow.scale, 0.45, 0.9);

// The arrow is in front of the effigy until it arrives (it may cross his legs on
// screen on the way), so the hit is checked where the flight ends.
export const flightHits = (layout, tip, u) => u >= 1 && effigyContains(layout, tip);

// --- Fire -----------------------------------------------------------------------

// Seconds after impact at which each fire spot catches, spreading from the hit.
export const ignitionDelays = (impact) =>
  FIRE_SPOTS.map((spot) => TIMELINE.ignite + Math.hypot(spot.x - impact.x, spot.y - impact.y) / 480);

// Overall fire strength t seconds after impact: builds to a climax, then burns down.
export function fireIntensity(t) {
  if (t < TIMELINE.ignite || t >= TIMELINE.fireOut) return 0;
  const surge = 1 + 0.3 * smoothstep(2.2, 3.8, t) - 0.3 * smoothstep(6, 10, t);
  const fading = 1 - 0.7 * smoothstep(11, 22, t) - 0.3 * smoothstep(22, TIMELINE.fireOut, t);
  return Math.max(0, surge * fading);
}

// Named stages for the CSS-driven parts of the fire (flame shapes, glow, char).
export function firePhaseAt(t) {
  if (t === null || t < TIMELINE.ignite) return "none";
  if (t < 2.6) return "lit";
  if (t < 12) return "roaring";
  if (t < 25) return "dying";
  return "out";
}

// 0 → 1 as the burnt effigy slumps after the climax.
export const collapseAt = (t) => smoothstep(TIMELINE.climax + 1.5, TIMELINE.climax + 7, t);
