import { useId } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";

export default function ResumeProcessingIllustration({ ready = false }) {
  const reducedMotion = useReducedMotion();
  const clipId = `resume-page-${useId().replaceAll(":", "")}`;
  const float = (delay = 0) => reducedMotion ? undefined : {
    y: [0, -7, 0],
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay },
  };

  return (
    <svg
      viewBox="0 0 480 330"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="mx-auto w-full max-w-[420px] overflow-visible"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="160" height="190" rx="8" />
        </clipPath>
      </defs>

      {/* Quiet ground lines anchor the floating document in an isometric space. */}
      <path d="m25 210 213 123 217-125M67 253l174-101 172 99" stroke="var(--border)" strokeDasharray="3 7" opacity=".55" />
      <ellipse cx="238" cy="271" rx="128" ry="29" fill="var(--border)" opacity=".22" />
      <path d="m70 188 165 96v15L70 203z" fill="var(--border)" stroke="var(--border)" strokeLinejoin="round" />
      <path d="m235 284 174-100v15L235 299z" fill="var(--accent)" stroke="var(--border)" strokeLinejoin="round" />
      <path d="m244 88 165 96-174 100-165-96z" fill="var(--accent)" stroke="var(--border)" strokeLinejoin="round" />
      <path d="m244 108 131 76-140 81-131-77z" stroke="var(--primary)" strokeDasharray="3 5" opacity=".18" />
      <path d="m111 211 26 15m10 6 7 4m173-4 34-20" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity=".35" />

      <Motion.g animate={float()}>
        <g transform="translate(0 14)">
          <g transform="matrix(.866 .5 -.866 .5 244 44)">
            <rect width="160" height="190" rx="8" fill="var(--border)" stroke="var(--border)" />
          </g>
        </g>
        <g transform="translate(0 7)">
          <g transform="matrix(.866 .5 -.866 .5 244 44)">
            <rect width="160" height="190" rx="8" fill="var(--card)" stroke="var(--border)" />
          </g>
        </g>
        <g transform="matrix(.866 .5 -.866 .5 244 44)">
          <rect width="160" height="190" rx="8" fill="var(--card)" stroke="var(--primary)" strokeOpacity=".4" />
          <rect x="18" y="19" width="32" height="34" rx="7" fill="var(--accent)" />
          <circle cx="34" cy="30" r="5" fill="var(--primary)" opacity=".8" />
          <path d="M24 46c0-11 20-11 20 0" fill="var(--primary)" opacity=".55" />
          <path d="M62 26h62" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
          <path d="M62 39h42M62 50h53" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" />
          <path d="M20 72h120" stroke="var(--border)" />
          <path d="M21 88h60M21 101h117M21 113h98" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
          <rect x="18" y="132" width="49" height="15" rx="5" fill="var(--accent)" />
          <rect x="75" y="132" width="65" height="15" rx="5" fill="var(--accent)" />
          <path d="M25 139h35M82 139h49" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" opacity=".45" />
          <path d="M21 164h88M21 176h117" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" />

          <g clipPath={`url(#${clipId})`}>
            <Motion.g
              initial={false}
              animate={reducedMotion || ready ? { y: 100, opacity: ready ? 0 : .65 } : { y: [60, 163, 60], opacity: [.35, 1, .35] }}
              transition={reducedMotion || ready ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <rect y="-22" width="160" height="23" fill="var(--primary)" fillOpacity=".08" />
              <path d="M0 0h160" stroke="var(--primary)" strokeWidth="2" strokeOpacity=".75" />
              <circle cx="13" r="3" fill="var(--primary)" />
              <circle cx="147" r="3" fill="var(--primary)" />
            </Motion.g>
          </g>
        </g>
      </Motion.g>

      {/* Extracted details float beside the page, with no simulated progress. */}
      <Motion.g animate={float(.65)}>
        <g transform="matrix(.866 .5 -.866 .5 365 65)">
          <rect y="5" width="84" height="66" rx="8" fill="var(--border)" />
          <rect width="84" height="66" rx="8" fill="var(--card)" stroke="var(--border)" />
          <circle cx="21" cy="23" r="9" fill="var(--accent)" />
          <circle cx="21" cy="21" r="3" fill="var(--primary)" />
          <path d="M16 28c0-6 10-6 10 0" fill="var(--primary)" />
          <path d="M39 19h28M39 28h18M15 44h52M15 53h38" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeOpacity=".4" />
        </g>
      </Motion.g>
      <Motion.g animate={float(1.3)}>
        <g transform="matrix(.866 .5 -.866 .5 84 166)">
          <rect y="5" width="63" height="51" rx="8" fill="var(--border)" />
          <rect width="63" height="51" rx="8" fill="var(--primary)" />
          <Motion.path
            d="m19 25 9 9 17-18"
            stroke="var(--card)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={reducedMotion || ready ? { opacity: 1 } : { opacity: [.65, 1, .65] }}
            transition={reducedMotion || ready ? { duration: 0 } : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      </Motion.g>
      <Motion.circle
        cx="404" cy="225" r="4" fill="var(--primary)"
        animate={reducedMotion ? undefined : { opacity: [.2, .7, .2], y: [0, -5, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="126" cy="76" r="3" fill="var(--primary)" opacity=".25" />
    </svg>
  );
}
