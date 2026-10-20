import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { motion as Motion, useAnimate, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { dussehraInviteDue, rememberDussehraInvite } from "../../../pages/dussehra/dussehraSeason";

// The seasonal "Celebrate Dussehra" link in the home header, highlighted, plus a
// one-time invite. Skipping the invite flies it into the link, so people see
// where to find the celebration later.

const EASE = [0.22, 1, 0.36, 1];
const FLIGHT = 0.8;
const LINK_RADIUS = 14;
const festiveFill = "bg-linear-to-r from-[var(--dussehra-saffron)] to-[var(--dussehra-gold)]";

// Ravana's silhouette against the moon, with an arrow on its way.
function InviteArt() {
  const left = [1, 2, 3, 4, 5];
  const right = [1, 2, 3, 4];
  const head = (x, y, r) => (
    <g key={`${x}`}>
      <circle cx={x} cy={y} r={r} />
      <path d={`M${x - r} ${y - r * 0.7} L${x} ${y - r * 2.4} L${x + r} ${y - r * 0.7} Z`} />
    </g>
  );
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="dci-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#090a26" />
          <stop offset="0.6" stopColor="#2b1748" />
          <stop offset="1" stopColor="#7a2c3a" />
        </linearGradient>
        <radialGradient id="dci-moon" cx="0.42" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#fffbef" />
          <stop offset="0.6" stopColor="#f8e7b8" />
          <stop offset="1" stopColor="#e3b96c" />
        </radialGradient>
        <radialGradient id="dci-halo">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dci-trail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="dci-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#07071a" stopOpacity="0" />
          <stop offset="1" stopColor="#07071a" />
        </linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#dci-sky)" />
      <g fill="#fff6e0">
        {[[30, 22], [88, 40], [140, 14], [190, 34], [338, 20], [372, 48], [62, 64], [118, 72]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={1.1} opacity={0.8} />
        ))}
      </g>
      <circle cx="262" cy="62" r="78" fill="url(#dci-halo)" />
      <circle cx="262" cy="62" r="40" fill="url(#dci-moon)" />
      {/* Ten-headed effigy, backlit */}
      <g fill="#1c0812" stroke="#1c0812">
        {left.map((k) => head(262 - 10 * k, 67 - 0.8 * k, 5 - 0.3 * k))}
        {right.map((k) => head(262 + 10 * k, 67 - 0.8 * k, 5 - 0.3 * k))}
        {head(262, 68, 6.5)}
        <rect x="259" y="73" width="6" height="7" stroke="none" />
        <path d="M245 80 L279 80 L275 106 L249 106 Z" stroke="none" />
        <path d="M249 106 L275 106 L286 136 L238 136 Z" stroke="none" />
        <path d="M247 82 L232 98 L229 106 M277 82 L292 98 L298 92" fill="none" strokeWidth="5" strokeLinecap="round" />
        <circle cx="226" cy="106" r="7" stroke="none" />
        <path d="M298 92 L310 68" fill="none" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="252" y="136" width="6" height="10" stroke="none" />
        <rect x="266" y="136" width="6" height="10" stroke="none" />
      </g>
      {/* Temples and the crowd */}
      <g fill="#140a22">
        <path d="M20 150 L20 128 L28 128 C28 112 34 100 40 92 C46 100 52 112 52 128 L60 128 L60 150 Z" />
        <path d="M352 150 L352 132 L358 132 C358 118 363 108 368 102 C373 108 378 118 378 132 L384 132 L384 150 Z" />
      </g>
      <g fill="#0b0510">
        <rect y="144" width="400" height="6" />
        {Array.from({ length: 41 }, (_, i) => (
          <circle key={i} cx={i * 10} cy={145 - (i % 3)} r={4 + (i % 2)} />
        ))}
      </g>
      {/* Arrow in flight towards the effigy */}
      <path d="M24 134 L118 112" stroke="url(#dci-trail)" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(118 112) rotate(-13)">
        <circle cx="38" r="9" fill="#ffd27a" opacity="0.35" />
        <rect x="0" y="-1" width="36" height="2" rx="1" fill="#d8a066" />
        <path d="M36 -4 L46 0 L36 4 Z" fill="#f5c04a" />
        <path d="M0 0 L-8 -4 L-4 0 L-8 4 Z" fill="#ff9a3c" />
      </g>
      <rect width="400" height="150" fill="url(#dci-fade)" />
    </svg>
  );
}

export default function DussehraCelebrate({ name }) {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [scope, animate] = useAnimate();
  const linkRef = useRef(null);
  const cardRef = useRef(null);
  const celebrateRef = useRef(null);
  // closed → open → (skipping →) closed
  const [phase, setPhase] = useState("closed");
  const [flight, setFlight] = useState(null);
  const [catches, setCatches] = useState(0);

  useEffect(() => {
    if (!dussehraInviteDue()) return undefined;
    const timer = setTimeout(() => setPhase("open"), 700);
    return () => clearTimeout(timer);
  }, []);

  // The invite has landed in the link: it bounces and rings to catch it.
  const land = () => {
    setPhase("closed");
    setFlight(null);
    if (reduceMotion || !scope.current) return;
    setCatches((count) => count + 1);
    animate(scope.current, { scale: [1, 1.16, 0.96, 1] }, { duration: 0.55, ease: "easeOut" });
  };

  const skip = () => {
    if (phase !== "open") return;
    rememberDussehraInvite();
    const card = cardRef.current?.getBoundingClientRect();
    const target = linkRef.current?.getBoundingClientRect();
    if (reduceMotion || !card?.width || !target?.width) {
      land();
      return;
    }
    // Scale the card down onto the link; the radius is pre-divided by the
    // (uneven) scale so the corners land as the link's corners.
    const scaleX = target.width / card.width;
    const scaleY = target.height / card.height;
    setFlight({
      x: target.left + target.width / 2 - (card.left + card.width / 2),
      y: target.top + target.height / 2 - (card.top + card.height / 2),
      scaleX,
      scaleY,
      borderRadius: `${LINK_RADIUS / scaleX}px / ${LINK_RADIUS / scaleY}px`,
    });
    setPhase("skipping");
  };

  const celebrate = () => {
    rememberDussehraInvite();
    setPhase("closed");
    navigate("/dussehra");
  };

  const skipping = phase === "skipping" && flight;
  const curve = (ease) => ({ duration: FLIGHT, ease });

  return (
    <>
      <Motion.span ref={scope} className="relative inline-flex">
        {!reduceMotion && (
          <Motion.span
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-1 rounded-2xl ${festiveFill} blur-md`}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {catches > 0 && (
          <Motion.span
            key={catches}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[var(--dussehra-gold)]"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        )}
        <Link
          ref={linkRef}
          to="/dussehra"
          className={`relative inline-flex items-center gap-2 rounded-xl ${festiveFill} px-3 py-2 text-xs font-semibold text-[var(--dussehra-ink)] shadow-sm ring-1 ring-[var(--dussehra-gold-deep)]/40 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none`}
        >
          <Sparkles size={14} aria-hidden="true" /> Celebrate Dussehra
        </Link>
      </Motion.span>

      <Dialog.Root
        open={phase !== "closed"}
        onOpenChange={(open) => {
          if (!open) skip();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <Motion.div
              className="fixed inset-0 z-50 bg-[var(--dussehra-night)]/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: skipping ? 0 : 1 }}
              transition={{ duration: skipping ? FLIGHT * 0.6 : 0.35 }}
            />
          </Dialog.Overlay>
          <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
            <Dialog.Content
              asChild
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                celebrateRef.current?.focus({ preventScroll: true });
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                linkRef.current?.focus({ preventScroll: true });
              }}
            >
              <Motion.div
                ref={cardRef}
                className={`relative w-full max-w-md overflow-hidden border border-[var(--dussehra-gold)]/30 bg-[var(--dussehra-night)] text-[var(--dussehra-ivory)] shadow-2xl ${skipping ? "pointer-events-none" : "pointer-events-auto"}`}
                initial={{ opacity: 0, y: 28, scaleX: 0.94, scaleY: 0.94, borderRadius: "22px / 22px" }}
                animate={skipping ? { ...flight, opacity: [1, 1, 0] } : { opacity: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: "22px / 22px" }}
                transition={
                  skipping
                    ? {
                        // Rises quickly, slides across late and shrinks as it goes: a curved swoop into the link.
                        x: curve([0.45, 0, 0.75, 0.55]),
                        y: curve([0.15, 0.75, 0.4, 1]),
                        scaleX: curve([0.5, 0, 0.75, 0.6]),
                        scaleY: curve([0.5, 0, 0.75, 0.6]),
                        borderRadius: curve([0.5, 0, 0.75, 0.6]),
                        opacity: { duration: FLIGHT, times: [0, 0.85, 1] },
                      }
                    : { duration: 0.45, ease: EASE }
                }
                onAnimationComplete={() => {
                  if (phase === "skipping") land();
                }}
              >
                <Motion.div animate={{ opacity: skipping ? 0 : 1 }} transition={{ duration: 0.2 }}>
                  <div className="relative h-36 sm:h-40">
                    <InviteArt />
                  </div>
                  <div className="relative px-6 pb-6 text-center sm:px-8">
                    <p lang="hi" className="text-base font-semibold text-[var(--dussehra-saffron)]">
                      शुभ विजयादशमी
                    </p>
                    <Dialog.Title className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                      <span className="bg-linear-to-r from-[var(--dussehra-gold)] via-[var(--dussehra-ivory)] to-[var(--dussehra-gold)] bg-clip-text text-transparent">
                        Happy Dussehra{name ? `, ${name}` : ""}!
                      </span>
                    </Dialog.Title>
                    <Dialog.Description className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--dussehra-ivory)]/80">
                      Draw the bow and send Ravana&apos;s effigy up in flames. A one-minute celebration of good over evil.
                    </Dialog.Description>
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={skip}
                        className="min-h-11 rounded-full border border-[var(--dussehra-ivory)]/25 px-6 text-sm font-semibold text-[var(--dussehra-ivory)] transition hover:bg-[var(--dussehra-ivory)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dussehra-gold)] motion-reduce:transition-none"
                      >
                        Skip
                      </button>
                      <button
                        ref={celebrateRef}
                        type="button"
                        onClick={celebrate}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full ${festiveFill} px-6 text-sm font-semibold text-[var(--dussehra-ink)] shadow-[0_0_28px_color-mix(in_srgb,var(--dussehra-saffron)_40%,transparent)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dussehra-ivory)] motion-reduce:transition-none`}
                      >
                        Celebrate <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-4 text-xs text-[var(--dussehra-ivory)]/60">
                      You can open it any time from <span className="font-semibold text-[var(--dussehra-ivory)]/80">Celebrate Dussehra</span> on your home page.
                    </p>
                  </div>
                </Motion.div>
                {/* Takes on the link's colours as it flies in */}
                <Motion.div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 ${festiveFill}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: skipping ? 1 : 0 }}
                  transition={{ duration: 0.35, delay: skipping ? 0.12 : 0 }}
                />
              </Motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
