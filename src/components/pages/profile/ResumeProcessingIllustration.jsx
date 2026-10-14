import { useId } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";

// Isometric "resume → AI → profile" scene. While processing, each resume
// section lights up, lifts off as a data packet, arcs through the AI core and
// docks into a slot on the profile card. The loop is indeterminate on purpose:
// it shows work happening without simulating a percentage. When `ready`, the
// scene settles with every slot filled and the core turned into a check.

// Timed to the backend's ~7s average: the four packets land at about 1.8s,
// 3.3s, 4.8s and 6.3s, and the filled card holds until ~8.5s. A typical
// request therefore finishes while the card is full and flows straight into
// the `ready` state; slower requests simply start another pass.
const CYCLE = 9;
const RESET = 0.95;
const LEAD_IN = 0.2;
const STAGGER = 1.5;
const TRAVEL = 1.6;
const LIFT = 0.4;
const TO_CORE = 0.9;
const DOCK = 0.2;
const FILL = 0.5;

const RESUME = { x: 222, y: 122, w: 104, h: 132 };
const PROFILE = { x: 408, y: 144, w: 84, h: 104 };
const CORE = { x: 300, y: 92 };
const SHADOW = "translate(0 16)";

// Flat-on-the-floor isometric plane at an origin.
const iso = ({ x, y }) => `matrix(.866 .5 -.866 .5 ${x} ${y})`;
const toScreen = (origin, u, v) => ({ x: origin.x + 0.866 * (u - v), y: origin.y + 0.5 * (u + v) });

const FIELDS = [
  { key: "contact", color: "var(--primary)", ink: "var(--primary-foreground)", region: { y: 10, h: 28 }, slot: 40 },
  { key: "skills", color: "var(--employee-green)", ink: "#ffffff", region: { y: 60, h: 16 }, slot: 56 },
  { key: "experience", color: "var(--employee-blue)", ink: "#ffffff", region: { y: 84, h: 22 }, slot: 72 },
  { key: "education", color: "var(--highlight)", ink: "var(--highlight-foreground)", region: { y: 112, h: 14 }, slot: 88 },
].map((field, index) => {
  const seconds = LEAD_IN + index * STAGGER;
  // Keyframe times are fractions of the cycle.
  return {
    ...field,
    from: toScreen(RESUME, 52, field.region.y + field.region.h / 2),
    to: toScreen(PROFILE, 42, field.slot),
    start: seconds / CYCLE,
    lift: (seconds + LIFT) / CYCLE,
    core: (seconds + TO_CORE) / CYCLE,
    arrive: (seconds + TRAVEL) / CYCLE,
    gone: (seconds + TRAVEL + DOCK) / CYCLE,
    filled: (seconds + TRAVEL + FILL) / CYCLE,
  };
});

// Completion badge sits on the profile card's right corner.
const BADGE = toScreen(PROFILE, PROFILE.w, 0);

const loop = (times) => ({ duration: CYCLE, times, repeat: Infinity, ease: "easeInOut" });
const settle = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const SPARK = "M0-7C1-2 2-1 7 0 2 1 1 2 0 7-1 2-2 1-7 0-2-1-1-2 0-7Z";

function DataPacket({ field }) {
  const { from, to, start, lift, core, arrive, gone } = field;
  return (
    <Motion.g
      animate={{
        x: [from.x, from.x, from.x, CORE.x, to.x, to.x, to.x],
        y: [from.y, from.y, from.y - 14, CORE.y, to.y, to.y, to.y],
        opacity: [0, 0, 1, 1, 1, 0, 0],
        scale: [0.6, 0.6, 1, 0.8, 1, 0.7, 0.7],
      }}
      transition={loop([0, start, lift, core, arrive, gone, 1])}
    >
      <rect x="-16" y="-7.5" width="32" height="15" rx="7.5" fill={field.color} />
      <circle cx="-8" r="2.6" fill={field.ink} opacity=".9" />
      <path d="M-3 0h11" stroke={field.ink} strokeWidth="2.4" strokeLinecap="round" opacity=".75" />
    </Motion.g>
  );
}

export default function ResumeProcessingIllustration({ ready = false }) {
  const reducedMotion = useReducedMotion();
  const still = reducedMotion || ready;
  const id = useId().replaceAll(":", "");
  const clipId = `resume-page-${id}`;
  const coreGradient = `resume-core-${id}`;
  const flow = still
    ? { strokeDashoffset: 0 }
    : { strokeDashoffset: [0, -20] };
  const flowTransition = still ? { duration: 0 } : { duration: 1.3, repeat: Infinity, ease: "linear" };

  return (
    <svg
      viewBox="0 0 560 350"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="mx-auto w-full max-w-[460px] overflow-visible"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={RESUME.w} height={RESUME.h} rx="8" />
        </clipPath>
        <radialGradient id={coreGradient} cx="35%" cy="30%" r="75%">
          <stop offset="0" style={{ stopColor: "var(--highlight)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)" }} />
        </radialGradient>
      </defs>

      {/* Platform */}
      <ellipse cx="280" cy="318" rx="178" ry="28" fill="var(--primary)" opacity=".06" />
      <path d="M95 222 280 329v12L95 234z" fill="var(--border)" />
      <path d="M280 329 465 222v12L280 341z" fill="var(--accent)" stroke="var(--border)" strokeLinejoin="round" />
      <path d="M280 115 465 222 280 329 95 222z" fill="var(--card)" stroke="var(--border)" strokeLinejoin="round" />
      <path d="M280 136 428 222 280 308 132 222z" stroke="var(--primary)" strokeDasharray="3 6" opacity=".18" />

      {/* Resume page, resting above the platform with a soft shadow */}
      <g transform={SHADOW} opacity=".35">
        <g transform={iso(RESUME)}>
          <rect width={RESUME.w} height={RESUME.h} rx="8" fill="var(--border)" />
        </g>
      </g>
      <g transform={iso(RESUME)}>
        <rect width={RESUME.w} height={RESUME.h} rx="8" fill="var(--card)" stroke="var(--primary)" strokeOpacity=".35" />
        {FIELDS.map((field) => (
          <Motion.rect
            key={field.key}
            x="8" y={field.region.y - 3} width={RESUME.w - 16} height={field.region.h + 6} rx="5"
            fill={field.color}
            animate={still ? { opacity: ready ? 0.1 : 0.06 } : { opacity: [0, 0, 0.22, 0, 0] }}
            transition={still ? settle : loop([0, field.start, field.lift, field.core, 1])}
          />
        ))}
        <rect x="12" y="12" width="22" height="24" rx="6" fill="var(--accent)" />
        <circle cx="23" cy="21" r="4" fill="var(--primary)" opacity=".8" />
        <path d="M16 32c0-8 14-8 14 0" fill="var(--primary)" opacity=".55" />
        <path d="M42 18h46" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
        <path d="M42 29h30" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 48h80" stroke="var(--border)" />
        <rect x="12" y="62" width="30" height="12" rx="4" fill="var(--accent)" />
        <rect x="46" y="62" width="44" height="12" rx="4" fill="var(--accent)" />
        <path d="M17 68h20M51 68h34" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity=".45" />
        <path d="M12 88h44M12 97h78M12 105h62" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 116h70M12 124h50" stroke="var(--border)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Scan beam reading the page */}
        <g clipPath={`url(#${clipId})`}>
          <Motion.g
            animate={still ? { y: ready ? RESUME.h + 30 : 70, opacity: ready ? 0 : 0.6 } : { y: [6, RESUME.h - 6, 6], opacity: [0.5, 1, 0.5] }}
            transition={still ? settle : { duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect y="-18" width={RESUME.w} height="18" fill="var(--highlight)" fillOpacity=".22" />
            <path d={`M0 0h${RESUME.w}`} stroke="var(--primary)" strokeWidth="1.6" strokeOpacity=".8" />
          </Motion.g>
        </g>
      </g>

      {/* Profile card being filled */}
      <g transform={SHADOW} opacity=".35">
        <g transform={iso(PROFILE)}>
          <rect width={PROFILE.w} height={PROFILE.h} rx="8" fill="var(--border)" />
        </g>
      </g>
      <g transform={iso(PROFILE)}>
        <rect
          width={PROFILE.w} height={PROFILE.h} rx="8" fill="var(--card)"
          stroke={ready ? "var(--employee-green)" : "var(--border)"}
          className="transition-[stroke] duration-500"
        />
        <circle cx="20" cy="18" r="9" fill="var(--accent)" />
        <circle cx="20" cy="16" r="3.2" fill="var(--primary)" />
        <path d="M14.5 23.5c0-6 11-6 11 0" fill="var(--primary)" />
        <path d="M36 14h34" stroke="var(--primary)" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M36 23h20" stroke="var(--border)" strokeWidth="3.5" strokeLinecap="round" />
        {FIELDS.map((field) => (
          <g key={field.key}>
            <path d={`M14 ${field.slot}h56`} stroke="var(--muted)" strokeWidth="7" strokeLinecap="round" />
            <Motion.path
              d={`M14 ${field.slot}h56`}
              stroke={field.color}
              strokeWidth="7"
              strokeLinecap="round"
              animate={still
                ? { pathLength: ready ? 1 : 0.6, opacity: 1 }
                : { pathLength: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }}
              transition={still ? settle : loop([0, field.arrive, field.filled, RESET, 1])}
            />
          </g>
        ))}
      </g>

      {/* Data flowing into and out of the AI core */}
      <Motion.path
        d={`M262 ${RESUME.y + 22}C270 ${CORE.y + 20} 284 ${CORE.y + 4} ${CORE.x - 14} ${CORE.y + 2}`}
        stroke="var(--primary)" strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round" opacity=".45"
        animate={flow} transition={flowTransition}
      />
      <Motion.path
        d={`M${CORE.x + 14} ${CORE.y + 2}C336 ${CORE.y + 2} 364 ${CORE.y + 26} 386 ${PROFILE.y + 20}`}
        stroke="var(--primary)" strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round" opacity=".45"
        animate={flow} transition={flowTransition}
      />

      {!still && FIELDS.map((field) => <DataPacket key={field.key} field={field} />)}

      {/* AI core */}
      <g transform={`translate(${CORE.x} ${CORE.y})`}>
        <Motion.circle
          r="30" fill="var(--highlight)"
          animate={still ? { opacity: 0.22, scale: 1 } : { opacity: [0.15, 0.32, 0.15], scale: [0.9, 1.08, 0.9] }}
          transition={still ? settle : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <Motion.ellipse
          rx="25" ry="14" stroke="var(--primary)" strokeWidth="1.4" strokeDasharray="2 5" opacity=".55"
          animate={flow} transition={flowTransition}
        />
        <circle r="14" fill={`url(#${coreGradient})`} />
        {ready ? (
          <Motion.path
            d="m-5.5 0 4 4 7.5-8"
            stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}
          />
        ) : (
          <Motion.path
            d={SPARK}
            fill="var(--primary-foreground)"
            animate={reducedMotion ? { rotate: 0 } : { rotate: 360, scale: [1, 0.8, 1] }}
            transition={reducedMotion ? { duration: 0 } : { rotate: { duration: 6, repeat: Infinity, ease: "linear" }, scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
          />
        )}
      </g>

      {/* Completion badge on the profile card */}
      {ready && (
        <Motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.25 }}
        >
          <circle cx={BADGE.x} cy={BADGE.y} r="12" fill="var(--employee-green)" />
          <path d={`M${BADGE.x - 5.5} ${BADGE.y}l4 4 7-7.5`} stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </Motion.g>
      )}

      {/* Ambient sparks */}
      <Motion.circle
        cx="112" cy="128" r="3" fill="var(--primary)"
        animate={reducedMotion ? undefined : { opacity: [0.15, 0.5, 0.15], y: [0, -6, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <Motion.circle
        cx="482" cy="262" r="4" fill="var(--highlight)"
        animate={reducedMotion ? undefined : { opacity: [0.3, 0.8, 0.3], y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
    </svg>
  );
}
