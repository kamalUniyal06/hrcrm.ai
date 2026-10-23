import { createElement, useEffect, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { Bat, Bird, Candy, Ghost, Leaf, Lollipop, Owl, Pumpkin } from "./HalloweenArt";
import { useShowHalloween } from "./useShowHalloween";
import "./halloween.css";

const INTRO_MS = 3800;
// Edge pieces come in after the owl and birds have started to leave.
const EDGE_DELAY = 0.9;

// Things hanging from the top garland: left position (%), thread length (px), piece.
const TOP = [
  [4, 10, Pumpkin, { size: 20 }],
  [13, 18, Candy, { size: 10, color: "#a855f7" }],
  [22, 8, Bat, { size: 30 }],
  [31, 16, Ghost, { size: 18 }],
  [40, 10, Lollipop, { size: 22 }],
  [49, 20, Pumpkin, { size: 18 }],
  [58, 9, Candy, { size: 10, color: "#22c55e" }],
  [67, 16, Bat, { size: 28 }],
  [76, 11, Ghost, { size: 17 }],
  [85, 18, Candy, { size: 10, color: "#f97316" }],
  [94, 10, Pumpkin, { size: 20 }],
];
// Pieces on the side vines: top position (%), piece.
const SIDE = [
  [16, Ghost, { size: 26 }, "ho-float"],
  [34, Candy, { size: 12, color: "#f97316" }],
  [52, Pumpkin, { size: 26 }],
  [70, Bat, { size: 30 }],
  [86, Lollipop, { size: 26 }],
];
// Pumpkins and treats along the bottom: left position (%), piece, extra classes.
const BOTTOM = [
  [10, Candy, { size: 11, color: "#a855f7" }],
  [24, Pumpkin, { size: 26, glow: false }],
  [38, Ghost, { size: 22 }, "ho-float"],
  [52, Candy, { size: 11, color: "#22c55e" }],
  [64, Pumpkin, { size: 24, glow: false }],
  [78, Lollipop, { size: 26 }],
];
const BIRDS = [
  { from: ["8vw", "78vh"], to: ["112vw", "-12vh"], delay: 0.15, size: 30 },
  { from: ["2vw", "62vh"], to: ["108vw", "-18vh"], delay: 0.3, size: 24 },
  { from: ["18vw", "88vh"], to: ["118vw", "8vh"], delay: 0.45, size: 34 },
  { from: ["30vw", "70vh"], to: ["104vw", "-24vh"], delay: 0.6, size: 22 },
  { from: ["12vw", "48vh"], to: ["-14vw", "-16vh"], delay: 0.35, size: 26 },
  { from: ["40vw", "84vh"], to: ["-12vw", "6vh"], delay: 0.55, size: 28 },
  { from: ["60vw", "80vh"], to: ["116vw", "30vh"], delay: 0.25, size: 26 },
];


function Enter({ from, index, children, className, style }) {
  const reduce = useReducedMotion();
  const offset = { top: { y: -80 }, bottom: { y: 80 }, left: { x: -80 }, right: { x: 80 } }[from];
  return (
    <Motion.div
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={reduce
        ? { duration: 0.4, delay: EDGE_DELAY }
        : { type: "spring", stiffness: 110, damping: 16, delay: EDGE_DELAY + index * 0.07 }}
    >
      {children}
    </Motion.div>
  );
}

function Vine({ vertical }) {
  return (
    <svg
      className={vertical ? "absolute inset-y-0 w-4" : "absolute inset-x-0 top-0 h-4 w-full"}
      viewBox={vertical ? "0 0 16 400" : "0 0 400 16"}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={vertical ? "M8 0 Q2 25 8 50 T8 100 T8 150 T8 200 T8 250 T8 300 T8 350 T8 400" : "M0 4 Q25 14 50 4 T100 4 T150 4 T200 4 T250 4 T300 4 T350 4 T400 4"}
        fill="none"
        stroke="#4d7c0f"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        opacity=".75"
      />
    </svg>
  );
}

// The owl and a flock of birds fly out of the window when the app loads.
function FlyOut({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <Motion.div className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Motion.div
        className="absolute inset-0 bg-[#1e1b4b]"
        initial={{ opacity: 0.32 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
      />
      <Motion.div
        className="absolute left-0 top-0"
        initial={{ x: "44vw", y: "58vh", scale: 0.7, rotate: 0 }}
        animate={{ x: ["44vw", "58vw", "112vw"], y: ["58vh", "34vh", "-24vh"], scale: [0.7, 1, 0.8], rotate: [0, -8, -14] }}
        transition={{ duration: 2.8, ease: "easeIn", times: [0, 0.35, 1] }}
      >
        <Owl size={86} />
      </Motion.div>
      {BIRDS.map((bird, index) => (
        <Motion.div
          key={index}
          className="absolute left-0 top-0"
          initial={{ x: bird.from[0], y: bird.from[1], opacity: 0 }}
          animate={{ x: bird.to[0], y: bird.to[1], opacity: [0, 1, 1] }}
          transition={{ duration: 2.4, delay: bird.delay, ease: "easeIn" }}
        >
          <Bird size={bird.size} className={bird.to[0].startsWith("-") ? "-scale-x-100" : undefined} />
        </Motion.div>
      ))}
    </Motion.div>
  );
}

/** Pumpkins, treats, ghosts and bats around all four edges of the window. Never blocks clicks. */
export default function HalloweenDecor() {
  const reduce = useReducedMotion();
  const show = useShowHalloween();
  // The fly-out plays on every page load; moving between pages doesn't reload the shell.
  const [intro, setIntro] = useState(true);
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] overflow-hidden" aria-hidden="true">
      <AnimatePresence>{intro && !reduce && <FlyOut key="fly-out" onDone={() => setIntro(false)} />}</AnimatePresence>

      {/* Top: a garland with treats hanging from it. */}
      <Enter from="top" index={0} className="absolute inset-x-0 top-0 h-16"><Vine /></Enter>
      {TOP.map(([left, thread, piece, props], index) => (
        <Enter key={`top-${left}`} from="top" index={index} className="absolute top-0 -translate-x-1/2" style={{ left: `${left}%` }}>
          <div className="ho-sway flex flex-col items-center" style={{ animationDelay: `${index * -0.4}s` }}>
            <span className="w-px bg-[#4d7c0f]/70" style={{ height: thread + 6 }} />
            {createElement(piece, props)}
          </div>
        </Enter>
      ))}

      {/* Left and right: vines with ghosts, candy and bats. */}
      {["left", "right"].map((side) => (
        <div key={side} className={`absolute inset-y-0 w-10 ${side === "left" ? "left-0" : "right-0"}`}>
          <Enter from={side} index={0} className={`absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"}`}><Vine vertical /></Enter>
          {SIDE.map(([top, piece, props, motionClass], index) => (
            <Enter
              key={`${side}-${top}`}
              from={side}
              index={index + 1}
              className={`absolute ${side === "left" ? "-left-1.5" : "-right-1.5"}`}
              style={{ top: `${side === "left" ? top : 100 - top}%` }}
            >
              <div className={motionClass} style={{ animationDelay: `${index * -0.7}s` }}>
                {createElement(piece, props)}
              </div>
            </Enter>
          ))}
        </div>
      ))}

      {/* Bottom: a pumpkin patch, with big jack-o'-lanterns in the corners. */}
      {BOTTOM.map(([left, piece, props, motionClass], index) => (
        <Enter key={`bottom-${left}`} from="bottom" index={index + 2} className="absolute bottom-0 -translate-x-1/2 translate-y-1/4" style={{ left: `${left}%` }}>
          <div className={motionClass}>{createElement(piece, props)}</div>
        </Enter>
      ))}
      {["left", "right"].map((corner) => (
        <Enter key={corner} from="bottom" index={1} className={`absolute bottom-0 flex items-end ${corner === "left" ? "-left-2 translate-y-1/4" : "-right-2 translate-y-1/4 flex-row-reverse"}`}>
          <Pumpkin size={52} />
          <Pumpkin size={32} className="-ml-3 -mr-3" />
          <Leaf size={20} rotate={corner === "left" ? -20 : 110} className="-mb-1" />
        </Enter>
      ))}
    </div>
  );
}
