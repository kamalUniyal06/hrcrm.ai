import { memo } from "react";
import SceneLayer from "./SceneLayer";
import { FIRE_SPOTS, RAVANA_HEADS, ignitionDelays } from "./dussehraScene";

// The Ravana effigy, drawn in its own units (see RAVANA in dussehraScene.js):
// origin at the centre of the base, y negative upwards. Placed with one
// transform, so the same art serves every screen size.

const GOLD = "url(#rv-gold)";
const GOLD_EDGE = "#7a4a0c";
const OUTLINE = "#3d0815";
const SKIN_EDGE = "#5a2410";
const INK = "#140a06";

const placed = (ravana) => `translate(${ravana.x} ${ravana.y}) scale(${ravana.scale})`;

function RavanaDefs() {
  return (
    <defs>
      <linearGradient id="rv-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff2b8" />
        <stop offset="0.35" stopColor="#f2c14e" />
        <stop offset="0.72" stopColor="#c8891f" />
        <stop offset="1" stopColor="#8a5512" />
      </linearGradient>
      <radialGradient id="rv-skin" cx="0.42" cy="0.38" r="0.75">
        <stop offset="0" stopColor="#f0ab74" />
        <stop offset="0.6" stopColor="#d1824f" />
        <stop offset="1" stopColor="#a8592f" />
      </radialGradient>
      <linearGradient id="rv-tunic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b3242c" />
        <stop offset="1" stopColor="#6b0f1f" />
      </linearGradient>
      <linearGradient id="rv-armor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0c45a" />
        <stop offset="0.6" stopColor="#c58a26" />
        <stop offset="1" stopColor="#8f5a14" />
      </linearGradient>
      <linearGradient id="rv-dhoti" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb04a" />
        <stop offset="0.55" stopColor="#ef7a22" />
        <stop offset="1" stopColor="#c2501a" />
      </linearGradient>
      <linearGradient id="rv-sleeve" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f08a32" />
        <stop offset="1" stopColor="#b5481a" />
      </linearGradient>
      <linearGradient id="rv-maroon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a1630" />
        <stop offset="1" stopColor="#3d0815" />
      </linearGradient>
      <linearGradient id="rv-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5d6878" />
        <stop offset="0.45" stopColor="#eef3f8" />
        <stop offset="1" stopColor="#8a96a8" />
      </linearGradient>
      <linearGradient id="rv-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a4a28" />
        <stop offset="1" stopColor="#3d2212" />
      </linearGradient>
      <linearGradient id="rv-bamboo" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8a6a30" />
        <stop offset="0.5" stopColor="#d4b066" />
        <stop offset="1" stopColor="#8a6a30" />
      </linearGradient>
      <radialGradient id="rv-shield" cx="0.45" cy="0.4" r="0.7">
        <stop offset="0" stopColor="#a5212c" />
        <stop offset="1" stopColor="#4a0a14" />
      </radialGradient>
      <radialGradient id="rv-ruby" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ff8a8a" />
        <stop offset="0.5" stopColor="#d4202a" />
        <stop offset="1" stopColor="#6a0610" />
      </radialGradient>
      <radialGradient id="rv-emerald" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#a8f5c8" />
        <stop offset="0.5" stopColor="#1f9a62" />
        <stop offset="1" stopColor="#0a4a2c" />
      </radialGradient>
      <pattern id="rv-lattice" width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M9 0 L18 9 L9 18 L0 9 Z" fill="none" stroke="#f2c14e" strokeWidth="1.2" opacity="0.55" />
      </pattern>
      <pattern id="rv-mirror" width="34" height="30" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="8" r="3.2" fill="#fff6dc" stroke="#c8891f" strokeWidth="1.2" />
        <circle cx="25" cy="23" r="3.2" fill="#fff6dc" stroke="#c8891f" strokeWidth="1.2" />
        <path d="M25 4 l3 4 l-3 4 l-3 -4 Z" fill="#c2501a" opacity="0.7" />
      </pattern>
      <pattern id="rv-zigzag" width="16" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 15 L4 7 L8 15 L12 7 L16 15" fill="none" stroke="#f2c14e" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

// --- Heads --------------------------------------------------------------------------

const BROWS = {
  // Fierce: inner ends pulled down.
  0: ["M-31 -19 Q-19 -15 -6 -8", "M31 -19 Q19 -15 6 -8"],
  // Haughty: high arches.
  1: ["M-31 -13 Q-19 -24 -6 -15", "M31 -13 Q19 -24 6 -15"],
  // Scornful: one raised.
  2: ["M-31 -18 Q-19 -15 -6 -9", "M31 -14 Q19 -25 6 -16"],
};

function Mouth({ mood, main }) {
  if (mood === 1) return <path d="M-11 31 Q2 37 12 28" fill="none" stroke="#7a1414" strokeWidth={3.2} strokeLinecap="round" />;
  if (mood === 2) {
    return (
      <g>
        <path d="M-12 29 Q0 43 12 29 Z" fill="#3a0808" stroke="#7a1414" strokeWidth={2} />
        <path d="M-9 30 L9 30 L7 33 L-7 33 Z" fill="#fff6e6" />
      </g>
    );
  }
  return (
    <g>
      <path d="M-11 31 Q0 27 11 31 Q0 37 -11 31 Z" fill="#8f1d1d" />
      {main && <path d="M-7 31 L-5 37 L-3 31 M3 31 L5 37 L7 31" fill="#fff6e6" />}
    </g>
  );
}

function Crown({ main }) {
  return (
    <g>
      {/* Side flares, behind the crown body */}
      <path d="M-34 -54 C-50 -58 -60 -74 -58 -94 C-49 -82 -42 -74 -32 -72 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4} />
      <path d="M34 -54 C50 -58 60 -74 58 -94 C49 -82 42 -74 32 -72 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4} />
      {main && (
        <g fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4}>
          <path d="M-30 -84 L-52 -126 L-26 -100 Z" />
          <path d="M30 -84 L52 -126 L26 -100 Z" />
        </g>
      )}
      {/* Tapering mukut */}
      <path
        d="M-36 -50 C-40 -78 -30 -96 -16 -110 C-10 -118 -4 -128 0 -138 C4 -128 10 -118 16 -110 C30 -96 40 -78 36 -50 Z"
        fill={GOLD}
        stroke={GOLD_EDGE}
        strokeWidth={1.6}
      />
      <path d="M-34 -74 Q0 -86 34 -74 M-24 -100 Q0 -108 24 -100" fill="none" stroke="#8a5a12" strokeWidth={2} />
      <path d="M-28 -64 Q0 -74 28 -64" fill="none" stroke="#fff2b8" strokeWidth={1.4} opacity={0.7} />
      <circle cy={-86} r={8} fill="url(#rv-ruby)" stroke="#fff2b8" strokeWidth={2} />
      <circle cx={-20} cy={-90} r={3.4} fill="url(#rv-emerald)" />
      <circle cx={20} cy={-90} r={3.4} fill="url(#rv-emerald)" />
      <circle cy={-116} r={4} fill="url(#rv-emerald)" />
      {/* Finial */}
      <path d={main ? "M0 -136 L-8 -152 L0 -176 L8 -152 Z" : "M0 -136 L-5 -146 L0 -160 L5 -146 Z"} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      {/* Jewelled band across the forehead */}
      <path d="M-42 -40 Q0 -54 42 -40 L40 -54 Q0 -68 -40 -54 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.6} />
      {[-26, -9, 9, 26].map((x, i) => (
        <circle key={x} cx={x} cy={-50 + Math.abs(x) * 0.12} r={3.6} fill={i % 2 ? "url(#rv-emerald)" : "url(#rv-ruby)"} />
      ))}
    </g>
  );
}

function Head({ x, y, s, mood, main }) {
  const [browLeft, browRight] = BROWS[mood];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Ears and kundal earrings */}
      <ellipse cx={-41} cy={1} rx={7.5} ry={12} fill="#b4643a" stroke={SKIN_EDGE} strokeWidth={1.5} />
      <ellipse cx={41} cy={1} rx={7.5} ry={12} fill="#b4643a" stroke={SKIN_EDGE} strokeWidth={1.5} />
      <circle cx={-43} cy={21} r={8} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4} />
      <circle cx={43} cy={21} r={8} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4} />
      <circle cx={-43} cy={21} r={3.4} fill="url(#rv-ruby)" />
      <circle cx={43} cy={21} r={3.4} fill="url(#rv-ruby)" />
      {/* Face */}
      <path
        d="M0 -48 C27 -48 41 -30 41 -2 C41 26 25 52 0 52 C-25 52 -41 26 -41 -2 C-41 -30 -27 -48 0 -48 Z"
        fill="url(#rv-skin)"
        stroke={SKIN_EDGE}
        strokeWidth={1.8}
      />
      {/* Tripundra: three ash lines with a red dot */}
      <g fill="none" stroke="#f6efe2" strokeWidth={2.8} strokeLinecap="round">
        <path d="M-20 -33 Q0 -37 20 -33" />
        <path d="M-22 -27 Q0 -31 22 -27" />
        <path d="M-20 -21 Q0 -25 20 -21" />
      </g>
      <circle cy={-27} r={3.6} fill="#c81e1e" />
      {/* Brows */}
      <g fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round">
        <path d={browLeft} />
        <path d={browRight} />
      </g>
      {/* Kohl-lined eyes */}
      <g stroke={INK} strokeWidth={1.6}>
        <path d="M-27 -2 Q-17 -11 -7 -2 Q-17 4 -27 -2 Z" fill="#fffaf0" />
        <path d="M27 -2 Q17 -11 7 -2 Q17 4 27 -2 Z" fill="#fffaf0" />
        <path d="M-27 -2 L-33 -6 M27 -2 L33 -6" />
      </g>
      <circle cx={-16} cy={-2.5} r={3.8} fill={INK} />
      <circle cx={16} cy={-2.5} r={3.8} fill={INK} />
      <circle cx={-14.8} cy={-3.8} r={1.1} fill="#fffaf0" />
      <circle cx={17.2} cy={-3.8} r={1.1} fill="#fffaf0" />
      {/* Nose */}
      <path d="M-1 -4 C-3 8 -8 13 -6 17 C-3 20 3 20 6 17 C8 13 3 8 1 -4" fill="#a85a32" opacity={0.55} />
      {/* Curled handlebar mustache */}
      <path
        d="M0 22 C-8 18 -18 18 -26 24 C-32 28 -38 26 -40 18 C-41 13 -36 10 -33 14 C-35 16 -34 20 -30 19 C-22 14 -10 14 0 19 C10 14 22 14 30 19 C34 20 35 16 33 14 C36 10 41 13 40 18 C38 26 32 28 26 24 C18 18 8 18 0 22 Z"
        fill={INK}
      />
      <Mouth mood={mood} main={main} />
      <Crown main={main} />
    </g>
  );
}

// --- Body ---------------------------------------------------------------------------

function Support() {
  return (
    <g>
      {/* Guy ropes to ground pegs */}
      <g fill="none" stroke="#2a1d14" strokeWidth={2} opacity={0.75}>
        <path d="M-128 -500 Q-236 -250 -330 -2" />
        <path d="M128 -500 Q236 -250 330 -2" />
      </g>
      <rect x={-336} y={-10} width={12} height={10} fill="#3d2212" />
      <rect x={324} y={-10} width={12} height={10} fill="#3d2212" />
      {/* Bamboo frame */}
      <g fill="none" strokeLinecap="round">
        <path d="M-200 0 L-118 -470 M200 0 L118 -470 M-254 -600 L212 -612" stroke="url(#rv-bamboo)" strokeWidth={10} />
        <path d="M-200 0 L-118 -470 M200 0 L118 -470 M-254 -600 L212 -612" stroke="#5a4218" strokeWidth={12} strokeDasharray="2 46" />
      </g>
    </g>
  );
}

function Platform() {
  return (
    <g>
      <rect x={-164} y={-44} width={328} height={10} rx={2} fill="#8a5a32" stroke="#2a160a" strokeWidth={1.5} />
      <path d="M-158 -36 L158 -36 L150 0 L-150 0 Z" fill="url(#rv-wood)" stroke="#2a160a" strokeWidth={2} />
      <path d="M-152 -24 H152 M-151 -12 H151" stroke="#2a160a" strokeWidth={1.5} opacity={0.5} />
      {/* Marigold garland */}
      <path
        d="M-150 -34 Q-100 -8 -50 -34 Q0 -8 50 -34 Q100 -8 150 -34"
        fill="none"
        stroke="#ff9a1f"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray="0 9"
      />
      <path
        d="M-150 -34 Q-100 -8 -50 -34 Q0 -8 50 -34 Q100 -8 150 -34"
        fill="none"
        stroke="#ffd23f"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray="0 18"
        strokeDashoffset={4.5}
      />
    </g>
  );
}

function Legs() {
  return (
    <g>
      <rect x={-58} y={-124} width={40} height={72} rx={10} fill="url(#rv-maroon)" stroke={OUTLINE} strokeWidth={1.5} />
      <rect x={18} y={-124} width={40} height={72} rx={10} fill="url(#rv-maroon)" stroke={OUTLINE} strokeWidth={1.5} />
      <rect x={-60} y={-70} width={44} height={8} rx={4} fill={GOLD} />
      <rect x={16} y={-70} width={44} height={8} rx={4} fill={GOLD} />
      {/* Juttis with curled toes */}
      <path d="M-62 -56 L-14 -56 Q-10 -40 -28 -38 L-60 -38 Q-82 -40 -86 -56 Q-74 -50 -62 -56 Z" fill="url(#rv-maroon)" stroke={GOLD} strokeWidth={2} />
      <path d="M62 -56 L14 -56 Q10 -40 28 -38 L60 -38 Q82 -40 86 -56 Q74 -50 62 -56 Z" fill="url(#rv-maroon)" stroke={GOLD} strokeWidth={2} />
    </g>
  );
}

const SKIRT = "M-106 -332 C-124 -270 -146 -196 -170 -118 Q0 -96 170 -118 C146 -196 124 -270 106 -332 Z";
// Points along the hem (a quadratic from x -170 to 170 that dips by 22 in the middle).
const hemY = (x) => {
  const t = (x + 170) / 340;
  return -118 + 44 * t * (1 - t);
};
const TASSELS = Array.from({ length: 28 }, (_, i) => -162 + i * 12);

function Skirt() {
  return (
    <g>
      <path d={SKIRT} fill="url(#rv-dhoti)" stroke="#7a2a0a" strokeWidth={2} />
      <path d={SKIRT} fill="url(#rv-mirror)" opacity={0.75} />
      <g fill="none" stroke="#a8400f" strokeWidth={2.5} opacity={0.55}>
        {[-3, -2, -1, 1, 2, 3].map((k) => (
          <path key={k} d={`M${k * 24} -328 Q${k * 30} -230 ${k * 44} ${hemY(k * 44) - 22}`} />
        ))}
      </g>
      {/* Border band at the hem */}
      <path d="M-162 -148 Q0 -126 162 -148 L170 -118 Q0 -96 -170 -118 Z" fill="url(#rv-maroon)" stroke={GOLD} strokeWidth={2} />
      <path d="M-162 -148 Q0 -126 162 -148 L170 -118 Q0 -96 -170 -118 Z" fill="url(#rv-zigzag)" />
      {/* Paper tassels */}
      {TASSELS.map((x, i) => (
        <path key={x} d={`M${x - 5} ${hemY(x)} L${x + 5} ${hemY(x)} L${x} ${hemY(x) + 13} Z`} fill={i % 2 ? "#d4202a" : "#f2c14e"} />
      ))}
      {/* Front panel (patka) */}
      <path d="M-30 -322 L30 -322 L38 -152 Q0 -140 -38 -152 Z" fill="url(#rv-tunic)" stroke={GOLD} strokeWidth={2} />
      {[-292, -248, -204].map((y) => (
        <g key={y}>
          <circle cy={y} r={8} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
          <circle cy={y} r={3} fill="url(#rv-emerald)" />
          <path d={`M-16 ${y + 14} Q0 ${y + 6} 16 ${y + 14}`} fill="none" stroke={GOLD} strokeWidth={1.6} />
        </g>
      ))}
      <path d="M-38 -152 L-31 -138 L-24 -150 L-17 -136 L-10 -148 L-3 -134 L4 -148 L11 -136 L18 -150 L25 -138 L32 -150 L38 -152" fill="none" stroke={GOLD} strokeWidth={2} />
    </g>
  );
}

function Arms() {
  return (
    <g>
      {/* Left arm with the shield */}
      <path d="M-120 -512 C-150 -502 -184 -476 -208 -448 L-184 -424 C-164 -446 -138 -466 -114 -478 Z" fill="url(#rv-sleeve)" stroke="#7a2a0a" strokeWidth={1.6} />
      <path d="M-208 -448 C-222 -430 -238 -406 -250 -386 L-228 -374 C-218 -392 -202 -414 -186 -428 Z" fill="url(#rv-skin)" stroke={SKIN_EDGE} strokeWidth={1.6} />
      <rect x={-178} y={-486} width={22} height={32} rx={4} transform="rotate(48 -167 -470)" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      <rect x={-244} y={-408} width={18} height={26} rx={4} transform="rotate(32 -235 -395)" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      <g transform="translate(-262 -372)">
        <circle r={56} fill="url(#rv-shield)" stroke={GOLD} strokeWidth={7} />
        <circle r={42} fill="none" stroke="#f2c14e" strokeWidth={2} strokeDasharray="4 5" />
        <g stroke="#f2c14e" strokeWidth={2} opacity={0.8}>
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            return <line key={i} x1={Math.cos(angle) * 15} y1={Math.sin(angle) * 15} x2={Math.cos(angle) * 34} y2={Math.sin(angle) * 34} />;
          })}
        </g>
        {[[-22, -22], [22, -22], [-22, 22], [22, 22]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={6} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1} />
        ))}
        <circle r={12} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.4} />
        <circle r={5} fill="url(#rv-ruby)" />
      </g>

      {/* Right arm raising a curved talwar */}
      <path d="M120 -512 C150 -502 184 -476 208 -448 L184 -424 C164 -446 138 -466 114 -478 Z" fill="url(#rv-sleeve)" stroke="#7a2a0a" strokeWidth={1.6} />
      <path d="M208 -448 C220 -430 234 -410 246 -392 L224 -378 C214 -396 200 -414 186 -428 Z" fill="url(#rv-skin)" stroke={SKIN_EDGE} strokeWidth={1.6} />
      <rect x={156} y={-486} width={22} height={32} rx={4} transform="rotate(-48 167 -470)" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      <path d="M244 -398 C262 -452 290 -522 336 -594 C320 -526 298 -466 262 -398 Z" fill="url(#rv-steel)" stroke="#3e4652" strokeWidth={1.4} />
      <path d="M252 -404 C272 -460 298 -522 330 -584" fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.6} />
      <rect x={226} y={-405} width={40} height={8} rx={4} transform="rotate(-24 246 -401)" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
      <circle cx={240} cy={-382} r={15} fill="url(#rv-skin)" stroke={SKIN_EDGE} strokeWidth={1.6} />
      <path d="M229 -388 Q240 -384 251 -390 M228 -380 Q240 -376 252 -382" fill="none" stroke={SKIN_EDGE} strokeWidth={1.2} />
      <circle cx={230} cy={-362} r={7} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
    </g>
  );
}

const TUNIC = "M-134 -508 C-112 -526 -60 -532 0 -532 C60 -532 112 -526 134 -508 L120 -430 C114 -392 108 -360 104 -334 L-104 -334 C-108 -360 -114 -392 -120 -430 Z";

function Torso() {
  return (
    <g>
      <path d="M-24 -558 L-26 -516 L26 -516 L24 -558 Z" fill="url(#rv-skin)" stroke={SKIN_EDGE} strokeWidth={1.5} />
      <path d={TUNIC} fill="url(#rv-tunic)" stroke={OUTLINE} strokeWidth={2} />
      <path d={TUNIC} fill="url(#rv-lattice)" opacity={0.6} />
      {/* Breastplate with a sun boss */}
      <path d="M-96 -500 Q0 -470 96 -500 L88 -420 Q80 -380 0 -362 Q-80 -380 -88 -420 Z" fill="url(#rv-armor)" stroke={GOLD_EDGE} strokeWidth={2} />
      <path
        d="M-78 -462 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 q9.75 9 19.5 0 M-70 -440 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0 q8.75 9 17.5 0"
        fill="none"
        stroke="#8f5a14"
        strokeWidth={1.5}
        opacity={0.7}
      />
      <g stroke="#f2c14e" strokeWidth={2.4} strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return <line key={i} x1={Math.cos(angle) * 30} y1={-410 + Math.sin(angle) * 30} x2={Math.cos(angle) * 38} y2={-410 + Math.sin(angle) * 38} />;
        })}
      </g>
      <circle cy={-410} r={25} fill="url(#rv-maroon)" stroke={GOLD} strokeWidth={4} />
      <circle cy={-410} r={9} fill="url(#rv-ruby)" stroke="#ffe7a0" strokeWidth={2} />
      {/* Layered necklaces */}
      <g fill="none" strokeLinecap="round">
        <path d="M-62 -528 Q0 -472 62 -528" stroke={GOLD} strokeWidth={7} strokeDasharray="0 10" />
        <path d="M-78 -524 Q0 -446 78 -524" stroke={GOLD} strokeWidth={8} strokeDasharray="0 12" />
        <path d="M-92 -518 Q0 -424 92 -518" stroke="#d4202a" strokeWidth={5} strokeDasharray="0 13" />
      </g>
      <path d="M0 -488 C10 -476 10 -462 0 -452 C-10 -462 -10 -476 0 -488 Z" fill="url(#rv-emerald)" stroke={GOLD} strokeWidth={2} />
      {/* Belt with a medallion */}
      <path d="M-112 -354 Q0 -342 112 -354 L110 -322 Q0 -310 -110 -322 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={2} />
      {[-84, -56, 56, 84].map((x) => (
        <circle key={x} cx={x} cy={-338} r={4.5} fill={Math.abs(x) > 60 ? "url(#rv-emerald)" : "url(#rv-ruby)"} />
      ))}
      <circle cy={-336} r={19} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={2} />
      <circle cy={-336} r={11} fill="url(#rv-maroon)" stroke="#fff2b8" strokeWidth={1.5} />
      <circle cy={-336} r={4.5} fill="url(#rv-ruby)" />
      {/* Scalloped shoulder guards */}
      <path d="M-152 -500 C-152 -532 -122 -544 -98 -532 L-94 -500 Q-108 -488 -122 -496 Q-138 -486 -152 -500 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.8} />
      <path d="M152 -500 C152 -532 122 -544 98 -532 L94 -500 Q108 -488 122 -496 Q138 -486 152 -500 Z" fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.8} />
      <circle cx={-124} cy={-516} r={5} fill="url(#rv-ruby)" />
      <circle cx={124} cy={-516} r={5} fill="url(#rv-ruby)" />
    </g>
  );
}

// The effigy, plus firelight and charring masked to its silhouette. Each overlay
// is its own layer whose opacity follows data-fire on the scene (dussehra.css),
// so fading them never repaints the artwork.
export const RavanaEffigy = memo(function RavanaEffigy({ layout }) {
  const transform = placed(layout.ravana);
  return (
    <>
      <SceneLayer layout={layout} label="An effigy of ten-headed Ravana">
        <RavanaDefs />
        <g transform={transform}>
          <g id="rv-art">
            <Support />
            <Platform />
            <Legs />
            <Skirt />
            <Arms />
            <Torso />
            {RAVANA_HEADS.map((head) => (
              <Head key={`${head.x}`} {...head} />
            ))}
          </g>
        </g>
      </SceneLayer>
      <SceneLayer layout={layout} className="dussehra-ravana-glow">
        <defs>
          <mask id="rv-silhouette" maskUnits="userSpaceOnUse" x="-380" y="-810" width="760" height="830" style={{ maskType: "alpha" }}>
            <use href="#rv-art" />
          </mask>
          <radialGradient id="rv-fireglow" cx="0.5" cy="0.92" r="0.95">
            <stop offset="0" stopColor="#ffd27a" />
            <stop offset="0.4" stopColor="#ff8a2a" />
            <stop offset="1" stopColor="#a8280a" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <g transform={transform}>
          <rect x={-380} y={-810} width={760} height={830} fill="url(#rv-fireglow)" mask="url(#rv-silhouette)" />
        </g>
      </SceneLayer>
      <SceneLayer layout={layout} className="dussehra-ravana-char">
        <g transform={transform}>
          <rect x={-380} y={-810} width={760} height={830} fill="#170805" mask="url(#rv-silhouette)" />
        </g>
      </SceneLayer>
    </>
  );
});

// Flames in flame units: base at the origin, about 124 tall, with three tongues.
const FLAME_OUTER =
  "M0 0 C-22 0 -32 -14 -30 -34 C-28 -52 -18 -60 -20 -82 C-12 -70 -8 -64 -6 -76 C-4 -92 2 -102 0 -124 C10 -104 16 -92 14 -74 C18 -80 22 -88 22 -100 C32 -80 34 -58 30 -38 C28 -14 18 0 0 0 Z";
const FLAME_INNER =
  "M0 -2 C-12 -2 -18 -12 -16 -26 C-14 -40 -6 -46 -6 -62 C0 -52 6 -44 8 -34 C10 -42 12 -48 12 -56 C20 -40 18 -18 14 -10 C10 -4 6 -2 0 -2 Z";

// The fuller spots get a flame shape; the canvas fire fills in around them.
const FLAME_SPOTS = FIRE_SPOTS.map((spot, index) => ({ ...spot, index })).filter(
  (spot) => spot.w >= 1 || (spot.y < -560 && spot.w >= 0.68),
);

// Flame shapes over the effigy. They catch one by one, spreading from where the
// arrow struck (transition delays), then grow and die back with data-fire.
// On low-power devices every other one is skipped.
export const RavanaFlames = memo(function RavanaFlames({ layout, impact, burning, sparse }) {
  const delays = impact ? ignitionDelays(impact) : null;
  return (
    <SceneLayer layout={layout} className="will-change-transform">
      <defs>
        <linearGradient id="rv-flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff4a10" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#ff8a1f" stopOpacity="0.9" />
          <stop offset="0.8" stopColor="#ffb03a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rv-flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.4" stopColor="#ffe27a" />
          <stop offset="0.8" stopColor="#ffb347" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={placed(layout.ravana)}>
        {FLAME_SPOTS.map((spot, i) =>
          sparse && i % 2 ? null : (
            <g
              key={spot.index}
              // A little size and lean variation per spot, so the flames don't line up in rows.
              transform={`translate(${spot.x} ${spot.y + 18}) rotate(${((spot.index * 53) % 17) - 8}) scale(${(0.95 + spot.w * 0.85) * (0.85 + ((spot.index * 37) % 10) / 28)})`}
            >
              <g className="dussehra-flame" style={{ transitionDelay: delays ? `${Math.round(delays[spot.index] * 1000)}ms` : "0ms" }}>
                <g
                  className={burning ? "dussehra-flicker" : undefined}
                  style={{ animationDelay: `${(-(i * 0.137) % 0.7).toFixed(2)}s`, "--flicker-speed": `${0.45 + (i % 5) * 0.07}s` }}
                >
                  <path d={FLAME_OUTER} fill="url(#rv-flame-outer)" />
                  <path d={FLAME_INNER} fill="url(#rv-flame-inner)" />
                </g>
              </g>
            </g>
          ),
        )}
      </g>
    </SceneLayer>
  );
});
