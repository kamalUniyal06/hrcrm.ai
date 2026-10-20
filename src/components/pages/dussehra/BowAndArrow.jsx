import { forwardRef, useImperativeHandle, useRef } from "react";
import { BOW, aimVector, bezierPoint, clamp } from "./dussehraScene";

// The bow (in bow units: grip at the origin, aiming along -y) and the arrow (in
// arrow units: nock at the origin, tip at -BOW.arrowLength). React renders the
// static parts; while aiming and in flight DussehraExperience moves them through
// the imperative handle, so dragging never re-renders React.

const GUIDE_DOTS = 12;
const RING = 2 * Math.PI * 30;
const degrees = (radians) => (radians * 180) / Math.PI;

// Where the string meets each limb, for a draw of `flex` (0 rest, 1 full).
const stringTips = (flex) => {
  const x = 150 - 18 * flex;
  const y = 50 + 14 * flex;
  return [-x, y, x, y];
};

// Both limbs as one path; they bend back and in as the bow is drawn, and the
// tips curl forward past the string (a recurve).
function limbsPath(flex) {
  const limb = (side) => {
    const tipX = side * (150 - 18 * flex);
    const tipY = 50 + 14 * flex;
    return (
      `M${side * 12} -6 C${side * 52} ${-22 - 6 * flex} ${side * (118 - 10 * flex)} ${-14 + 8 * flex} ${tipX} ${tipY}` +
      ` Q${side * (166 - 18 * flex)} ${56 + 14 * flex} ${side * (168 - 18 * flex)} ${36 + 14 * flex}`
    );
  };
  return `${limb(-1)} ${limb(1)}`;
}

const REST_LIMBS = limbsPath(0);
const REST_STRING = (() => {
  const [lx, ly, rx, ry] = stringTips(0);
  return `M${lx} ${ly} L0 ${BOW.restNock} L${rx} ${ry}`;
})();

const BowAndArrow = forwardRef(function BowAndArrow({ cue }, ref) {
  const bowRef = useRef(null);
  const tremorRef = useRef(null);
  const limbRefs = useRef([]);
  const stringRef = useRef(null);
  const stringGlowRef = useRef(null);
  const ringRef = useRef(null);
  const ringArcRef = useRef(null);
  const guideRef = useRef(null);
  const dotRefs = useRef([]);
  const arrowRef = useRef(null);
  const headGlowRef = useRef(null);

  useImperativeHandle(ref, () => {
    const drawBow = (layout, pose) => {
      const { bow } = layout;
      const flex = clamp(pose.pull / BOW.maxPull, -0.12, 1);
      const pull = flex * BOW.maxPull;
      bowRef.current?.setAttribute("transform", `translate(${bow.x} ${bow.y}) rotate(${degrees(pose.angle)}) scale(${bow.scale})`);
      const limbs = limbsPath(flex);
      for (const limb of limbRefs.current) limb?.setAttribute("d", limbs);
      const [lx, ly, rx, ry] = stringTips(flex);
      const nockY = BOW.restNock + pull;
      const string = `M${lx} ${ly} L0 ${nockY} L${rx} ${ry}`;
      stringRef.current?.setAttribute("d", string);
      stringGlowRef.current?.setAttribute("d", string);
      stringGlowRef.current?.setAttribute("opacity", String(clamp(flex, 0, 1) * 0.85));
      ringRef.current?.setAttribute("transform", `translate(0 ${nockY})`);
      ringRef.current?.setAttribute("opacity", flex > 0.01 ? "1" : "0");
      ringArcRef.current?.setAttribute("stroke-dasharray", `${RING * clamp(flex, 0, 1)} ${RING}`);
      tremorRef.current?.classList.toggle("dussehra-tremor", flex > 0.92);
    };

    // Places the arrow by its nock, in scene pixels. `depth` shrinks it as it
    // flies away from the viewer; `glow` (0–1) lights the arrowhead.
    const drawArrow = (layout, nock, angle, depth, glow) => {
      arrowRef.current?.setAttribute(
        "transform",
        `translate(${nock.x} ${nock.y}) rotate(${degrees(angle)}) scale(${layout.bow.scale * depth})`,
      );
      headGlowRef.current?.setAttribute("opacity", String(glow));
    };

    return {
      drawBow,
      drawArrow,

      // The bow with the arrow nocked on its string.
      drawLoaded(layout, pose) {
        drawBow(layout, pose);
        const aim = aimVector(pose.angle);
        const back = (BOW.restNock + Math.max(0, pose.pull)) * layout.bow.scale;
        drawArrow(layout, { x: layout.bow.x - aim.x * back, y: layout.bow.y - aim.y * back }, pose.angle, 1, 0.3 + 0.7 * clamp(pose.power, 0, 1));
      },

      // Free flight: `tip` in scene pixels.
      drawFlying(layout, tip, angle, depth) {
        const aim = aimVector(angle);
        const length = BOW.arrowLength * layout.bow.scale * depth;
        drawArrow(layout, { x: tip.x - aim.x * length, y: tip.y - aim.y * length }, angle, depth, 1);
      },

      // Dotted preview of the first part of the flight.
      drawGuide(layout, path, power) {
        const size = Math.max(0.6, layout.bow.scale);
        dotRefs.current.forEach((dot, i) => {
          if (!dot) return;
          const point = bezierPoint(path, 0.06 + i * 0.055);
          dot.setAttribute("cx", point.x.toFixed(1));
          dot.setAttribute("cy", point.y.toFixed(1));
          dot.setAttribute("r", ((4.2 - i * 0.2) * size).toFixed(2));
          dot.setAttribute("opacity", ((1 - i / GUIDE_DOTS) * (0.4 + 0.6 * power)).toFixed(3));
        });
        guideRef.current?.setAttribute("opacity", "1");
      },

      hideGuide() {
        guideRef.current?.setAttribute("opacity", "0");
      },
    };
  }, []);

  return (
    <>
      <defs>
        <linearGradient id="bw-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8693a" />
          <stop offset="1" stopColor="#5a2e12" />
        </linearGradient>
        <linearGradient id="bw-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c8" />
          <stop offset="0.45" stopColor="#f5c04a" />
          <stop offset="1" stopColor="#a8701a" />
        </linearGradient>
        <linearGradient id="bw-shaft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b3a18" />
          <stop offset="0.5" stopColor="#d8a066" />
          <stop offset="1" stopColor="#6b3a18" />
        </linearGradient>
        <linearGradient id="bw-feather" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset="0.5" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#c2401a" />
        </linearGradient>
        <linearGradient id="bw-grip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5c1020" />
          <stop offset="0.5" stopColor="#a3202a" />
          <stop offset="1" stopColor="#5c1020" />
        </linearGradient>
        <radialGradient id="bw-aura">
          <stop offset="0" stopColor="#ffc86a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffc86a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bw-head-glow">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="1" />
          <stop offset="0.3" stopColor="#ffd56a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff9a2a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g ref={bowRef}>
        <circle r={150} fill="url(#bw-aura)" />
        <g ref={tremorRef}>
          <path ref={stringGlowRef} d={REST_STRING} fill="none" stroke="#ffcf6a" strokeWidth={7} strokeLinejoin="round" opacity={0} />
          <path ref={stringRef} d={REST_STRING} fill="none" stroke="#fff1d0" strokeWidth={2.2} strokeLinejoin="round" />
          <path ref={(node) => (limbRefs.current[0] = node)} d={REST_LIMBS} fill="none" stroke="#2a1306" strokeWidth={15} strokeLinecap="round" />
          <path ref={(node) => (limbRefs.current[1] = node)} d={REST_LIMBS} fill="none" stroke="url(#bw-wood)" strokeWidth={10} strokeLinecap="round" />
          <path ref={(node) => (limbRefs.current[2] = node)} d={REST_LIMBS} fill="none" stroke="url(#bw-gold)" strokeWidth={11} strokeDasharray="3 24" />
          <path ref={(node) => (limbRefs.current[3] = node)} d={REST_LIMBS} fill="none" stroke="#f0c487" strokeWidth={2.2} opacity={0.5} />
          {/* Wrapped grip */}
          <rect x={-13} y={-20} width={26} height={32} rx={7} fill="url(#bw-grip)" stroke="url(#bw-gold)" strokeWidth={2} />
          <path d="M-13 -13 H13 M-13 -7 H13 M-13 -1 H13 M-13 5 H13" stroke="#f5c04a" strokeWidth={1.4} opacity={0.75} />
          <circle cy={-24} r={4.5} fill="#d4202a" stroke="#f5c04a" strokeWidth={1.5} />
          {/* Draw strength around the nock: a filling ring, not just colour */}
          <g ref={ringRef} opacity={0}>
            <circle r={30} fill="none" stroke="#fff3dc" strokeWidth={3} opacity={0.18} />
            <circle ref={ringArcRef} r={30} fill="none" stroke="#f5c04a" strokeWidth={4} strokeLinecap="round" transform="rotate(-90)" strokeDasharray={`0 ${RING}`} />
          </g>
          {cue && (
            <g transform={`translate(0 ${BOW.restNock})`}>
              <circle className="dussehra-cue-pulse" r={34} fill="none" stroke="#ffd27a" strokeWidth={3} />
              <g className="dussehra-cue-chevron" fill="none" stroke="#fff3dc" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M-14 46 L0 60 L14 46" />
                <path d="M-14 66 L0 80 L14 66" opacity={0.6} />
              </g>
            </g>
          )}
        </g>
      </g>

      <g ref={guideRef} opacity={0} fill="#ffe7a8">
        {Array.from({ length: GUIDE_DOTS }, (_, i) => (
          <circle key={i} ref={(node) => (dotRefs.current[i] = node)} r={0} />
        ))}
      </g>

      <g className="dussehra-arrow">
        <g ref={arrowRef}>
          <circle ref={headGlowRef} cy={-250} r={38} fill="url(#bw-head-glow)" opacity={0.3} />
          {/* Fletching */}
          <path d="M0 -4 C-15 -10 -21 -32 -16 -60 L-2 -52 Z" fill="url(#bw-feather)" />
          <path d="M0 -4 C15 -10 21 -32 16 -60 L2 -52 Z" fill="url(#bw-feather)" />
          {/* Shaft */}
          <rect x={-3} y={-236} width={6} height={236} rx={3} fill="url(#bw-shaft)" />
          <path d="M0 -2 L-3 -54 L0 -62 L3 -54 Z" fill="#8f1d1d" />
          <rect x={-4} y={-74} width={8} height={5} rx={1.5} fill="url(#bw-gold)" />
          <rect x={-4} y={-224} width={8} height={6} rx={1.5} fill="url(#bw-gold)" />
          <path d="M-4.5 3 L0 -5 L4.5 3" fill="none" stroke="#3a1a08" strokeWidth={2.5} />
          {/* Golden arrowhead */}
          <path d="M0 -268 C9 -254 12 -242 8 -230 L0 -224 L-8 -230 C-12 -242 -9 -254 0 -268 Z" fill="url(#bw-gold)" stroke="#8a5a12" strokeWidth={1.2} />
          <path d="M0 -264 L0 -228" stroke="#fffbe6" strokeWidth={1.2} opacity={0.85} />
        </g>
      </g>
    </>
  );
});

export default BowAndArrow;
