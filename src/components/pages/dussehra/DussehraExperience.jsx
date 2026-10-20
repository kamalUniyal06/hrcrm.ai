import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion as Motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import BowAndArrow from "./BowAndArrow";
import CelebrationMessage from "./CelebrationMessage";
import { FestivalCrowd, FestivalLand, FestivalSky } from "./FestivalBackground";
import { RavanaEffigy, RavanaFlames } from "./RavanaEffigy";
import SceneLayer from "./SceneLayer";
import { BURST, TINT, createParticleLayer } from "./festivalParticles";
import { createFestivalSound } from "./festivalSound";
import {
  BOW,
  FIRE_SPOTS,
  RAVANA,
  SCENE,
  TIMELINE,
  arrowDepthScale,
  arrowTipPoint,
  bezierPoint,
  bezierTangent,
  clamp,
  collapseAt,
  computeLayout,
  fireIntensity,
  firePhaseAt,
  flightEase,
  flightHits,
  ignitionDelays,
  lerp,
  nextSceneState,
  nockPoint,
  planShot,
  poseFromNock,
  restPose,
  shotPath,
  toLocal,
  toScene,
} from "./dussehraScene";
import "./dussehra.css";

// Interactive Dussehra celebration (/dussehra): draw the bow, loose the arrow,
// and Ravana's effigy burns into fireworks and a greeting.
//
// React state holds only the story beats (scene, fire phase). Everything that
// moves every frame (bow, arrow, firelight, particles) is drawn imperatively
// from one requestAnimationFrame loop that runs only while something moves.

const SOUND_KEY = "dussehra-sound";
const FIREWORK_TINTS = [TINT.GOLD, TINT.SAFFRON, TINT.ROSE, TINT.WHITE, TINT.EMERALD, TINT.VIOLET];

const ANNOUNCEMENTS = {
  [SCENE.SHOOTING]: "Arrow released.",
  [SCENE.IMPACT]: "A direct hit on Ravana!",
  [SCENE.BURNING]: "Ravana's effigy is burning.",
  [SCENE.CELEBRATING]: "Happy Dussehra! May good always triumph over evil.",
};

function readSoundOff() {
  try {
    return localStorage.getItem(SOUND_KEY) === "off";
  } catch {
    return false;
  }
}

// 1 on capable devices; less on low-power ones or with reduced motion.
function detectQuality() {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0.35;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  return cores <= 4 || memory <= 2 ? 0.6 : 1;
}

// Canvas resolution: sharp on capable screens, capped so each canvas stays cheap.
function canvasRatio(layout, quality) {
  const budget = Math.sqrt(4.2e6 / (layout.width * layout.height));
  return Math.max(0.75, Math.min(window.devicePixelRatio || 1, quality < 0.7 ? 1 : 1.75, budget));
}

const sceneUnit = (layout) => clamp(Math.min(layout.width, layout.height) / 800, 0.45, 1.4);

function useStageSize(ref) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setSize((previous) => (previous?.width === width && previous?.height === height ? previous : { width, height }));
    };
    measure();
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(element);
    window.addEventListener("resize", schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
  return size;
}

export default function DussehraExperience() {
  const reduceMotion = Boolean(useReducedMotion());
  const name = useSelector((state) => state.user.user?.name);
  const stageRef = useRef(null);
  const size = useStageSize(stageRef);
  const layout = useMemo(() => (size ? computeLayout(size.width, size.height) : null), [size]);

  const [scene, setScene] = useState(SCENE.READY);
  const [firePhase, setFirePhase] = useState("none");
  const [impact, setImpact] = useState(null);
  const [powerStep, setPowerStep] = useState(0);
  const [hint, setHint] = useState(false);
  const [soundOff, setSoundOff] = useState(readSoundOff);
  const [baseQuality] = useState(detectQuality);

  // Elements drawn imperatively.
  const shakeRef = useRef(null);
  const flashRef = useRef(null);
  const skyCanvasRef = useRef(null);
  const fireCanvasRef = useRef(null);
  const ravanaGroupRef = useRef(null);
  const aimLayerRef = useRef(null);
  const skyGlowRef = useRef(null);
  const groundGlowRef = useRef(null);
  const crowdRimRefs = useRef([]);
  const grabRef = useRef(null);
  const bowApi = useRef(null);

  // Mutable scene state read by the loop and the handlers.
  const layoutRef = useRef(layout);
  const sceneRef = useRef(SCENE.READY);
  const poseRef = useRef({ angle: 0, pull: 0, power: 0 });
  const dragRef = useRef(null);
  const relaxRef = useRef(null);
  const flightRef = useRef(null);
  const burnRef = useRef(null);
  const stuckRef = useRef(null);
  const engineRef = useRef(null);
  const soundRef = useRef(null);
  const qualityRef = useRef(baseQuality);
  const reduceRef = useRef(reduceMotion);
  const soundOffRef = useRef(soundOff);
  const timersRef = useRef(new Set());

  useEffect(() => {
    reduceRef.current = reduceMotion;
  }, [reduceMotion]);

  const send = useCallback((event) => {
    const next = nextSceneState(sceneRef.current, event);
    if (next === sceneRef.current) return false;
    sceneRef.current = next;
    setScene(next);
    return true;
  }, []);

  const later = useCallback((callback, ms) => {
    const timers = timersRef.current;
    const id = setTimeout(() => {
      timers.delete(id);
      callback();
    }, ms);
    timers.add(id);
  }, []);

  // --- The loop ------------------------------------------------------------------

  useLayoutEffect(() => {
    const sky = createParticleLayer(skyCanvasRef.current, { capacity: 900, trails: true });
    const fire = createParticleLayer(fireCanvasRef.current, { capacity: 1100 });
    const sound = createFestivalSound();
    sound.setMuted(soundOffRef.current);
    sky.settings.onBurst = () => sound.firework();
    soundRef.current = sound;

    // Mostly to the sides, so the bursts frame the greeting instead of sitting behind it.
    const launchFirework = (current) => {
      const variantRoll = Math.random();
      const side = Math.random();
      const x = side < 0.7 ? (side < 0.35 ? 0.05 + Math.random() * 0.28 : 0.67 + Math.random() * 0.28) : 0.2 + Math.random() * 0.6;
      sky.firework(
        current.width * x,
        current.horizonY,
        current.height * (0.08 + Math.random() * 0.3),
        FIREWORK_TINTS[Math.floor(Math.random() * FIREWORK_TINTS.length)],
        variantRoll < 0.2 ? BURST.WILLOW : variantRoll < 0.45 ? BURST.RING : BURST.PEONY,
      );
    };

    const setLight = (value) => {
      if (groundGlowRef.current) groundGlowRef.current.style.opacity = Math.min(1, value).toFixed(3);
      if (skyGlowRef.current) skyGlowRef.current.style.opacity = Math.min(1, value * 0.85).toFixed(3);
      for (const rim of crowdRimRefs.current) if (rim) rim.style.opacity = Math.min(1, value * 0.9).toFixed(3);
    };

    const flash = (point, current) => {
      const element = flashRef.current;
      if (element?.animate) {
        element.style.setProperty("--flash-x", `${point.x}px`);
        element.style.setProperty("--flash-y", `${point.y}px`);
        element.animate([{ opacity: 0 }, { opacity: reduceRef.current ? 0.35 : 0.85, offset: 0.12 }, { opacity: 0 }], {
          duration: 700,
          easing: "ease-out",
        });
      }
      const shake = shakeRef.current;
      if (reduceRef.current || !shake?.animate) return;
      const a = clamp(Math.min(current.width, current.height) / 90, 4, 10);
      shake.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: `translate(${-a}px, ${a * 0.6}px)` },
          { transform: `translate(${a * 0.9}px, ${-a * 0.7}px)` },
          { transform: `translate(${-a * 0.6}px, ${-a * 0.3}px)` },
          { transform: `translate(${a * 0.4}px, ${a * 0.4}px)` },
          { transform: `translate(${-a * 0.2}px, ${a * 0.1}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 450, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" },
      );
    };

    const hit = (current, tip, angle, depth) => {
      flightRef.current = null;
      if (!send("hit")) return;
      const local = toLocal(current, tip);
      stuckRef.current = { local, angle, depth };
      burnRef.current = {
        t: 0,
        delays: ignitionDelays(local),
        acc: new Float32Array(FIRE_SPOTS.length),
        phase: "none",
        collapse: 0,
        salvo: false,
        nextFirework: 0,
        active: true,
      };
      setImpact(local);
      const unit = current.ravana.scale;
      const quality = qualityRef.current;
      fire.glow(tip.x, tip.y, 340 * unit, 0.55, TINT.WHITE);
      fire.sparks(tip.x, tip.y, Math.round(90 * quality), 640 * unit, 3.2 * Math.max(0.6, unit));
      for (let k = 0; k < 18 * quality; k += 1) fire.ember(tip.x, tip.y, 60 * unit);
      flash(tip, current);
      sound.impact();
    };

    const stepBurn = (current, burn, dt) => {
      burn.t += dt;
      const { t } = burn;
      const { ravana } = current;

      // Story beats.
      if (sceneRef.current === SCENE.IMPACT && t >= TIMELINE.ignite && send("ignite")) sound.fireStart();
      if (sceneRef.current === SCENE.BURNING && t >= TIMELINE.climax) send("climax");
      const phase = firePhaseAt(t);
      if (phase !== burn.phase) {
        burn.phase = phase;
        setFirePhase(phase);
        if (phase === "dying") sound.fireStop(13);
      }

      // The burnt effigy slumps behind the crowd after the climax.
      const collapse = reduceRef.current ? 0 : collapseAt(t);
      const sink = collapse * 0.12 * RAVANA.height * ravana.scale;
      const group = ravanaGroupRef.current;
      if (collapse !== burn.collapse && group) {
        burn.collapse = collapse;
        group.style.transition = "none";
        group.style.transform = `translateY(${sink.toFixed(1)}px)`;
        group.style.opacity = (1 - 0.4 * collapse).toFixed(3);
      }

      // Flames, embers and smoke from every spot that has caught.
      const level = fireIntensity(t);
      const quality = qualityRef.current;
      const flameSize = 62 * ravana.scale;
      if (level > 0) {
        for (let i = 0; i < FIRE_SPOTS.length; i += 1) {
          const ramp = clamp((t - burn.delays[i]) / 0.9, 0, 1);
          if (ramp <= 0) continue;
          const spot = FIRE_SPOTS[i];
          const strength = ramp * level * spot.w;
          const x = ravana.x + spot.x * ravana.scale;
          const y = ravana.y + spot.y * ravana.scale + sink;
          burn.acc[i] += strength * 40 * quality * dt;
          while (burn.acc[i] >= 1) {
            burn.acc[i] -= 1;
            fire.flame(x, y, flameSize * (0.7 + 0.5 * spot.w), strength);
          }
          if (Math.random() < strength * 3.2 * quality * dt) fire.ember(x, y, flameSize);
          if (spot.y < -360 && Math.random() < strength * 1.4 * quality * dt) fire.smoke(x, y - flameSize, flameSize);
        }
      }

      // Firelight flickering on the sky, the ground and the crowd.
      const flicker = 0.84 + 0.16 * Math.sin(t * 13.3) * Math.sin(t * 7.1 + 1.3);
      setLight(level * flicker);

      // Fireworks from the climax on: an opening salvo, then a steady show.
      if (t >= TIMELINE.climax && t < TIMELINE.fireworksUntil) {
        const calm = reduceRef.current ? 2.5 : 1;
        if (!burn.salvo) {
          burn.salvo = true;
          for (let k = 0; k < (reduceRef.current ? 2 : 3); k += 1) launchFirework(current);
          burn.nextFirework = t + 0.7 * calm;
        } else if (t >= burn.nextFirework) {
          launchFirework(current);
          burn.nextFirework = t + (t < 12 ? 0.55 + Math.random() * 0.6 : 1.6 + Math.random() * 1.2) * calm;
        }
      }

      if (t >= TIMELINE.fireOut + 1) {
        burn.active = false;
        setLight(0);
      }
    };

    const tick = (dt) => {
      const current = layoutRef.current;
      const api = bowApi.current;
      if (!current) return;

      // The string settling after a release or a cancelled draw.
      const relax = relaxRef.current;
      if (relax) {
        relax.elapsed += dt;
        const settle = Math.min(1, relax.elapsed / 0.6);
        const pull = relax.from * Math.exp(-relax.elapsed * 11) * Math.cos(relax.elapsed * 38);
        const pose = { angle: lerp(relax.angle, current.bow.restAngle, 1 - Math.pow(1 - settle, 3)), pull, power: Math.max(0, pull) / BOW.maxPull };
        if (settle >= 1) {
          relaxRef.current = null;
          pose.pull = 0;
          pose.power = 0;
          if (relax.withArrow) poseRef.current = pose;
        }
        if (relax.withArrow) api?.drawLoaded(current, pose);
        else api?.drawBow(current, pose);
      }

      // The arrow in flight.
      const flight = flightRef.current;
      if (flight) {
        flight.elapsed += dt * 1000;
        const u = Math.min(1, flight.elapsed / flight.shot.duration);
        const path = shotPath(current, flight.shot);
        const t = flightEase(u);
        const tip = bezierPoint(path, t);
        const tangent = bezierTangent(path, t);
        const angle = Math.atan2(tangent.x, -tangent.y);
        const depth = lerp(1, arrowDepthScale(current), t);
        api?.drawFlying(current, tip, angle, depth);
        fire.trail(flight.lastTip.x, flight.lastTip.y, tip.x, tip.y, 30 * Math.max(0.5, current.bow.scale * depth));
        flight.lastTip = tip;
        if (flightHits(current, tip, u)) hit(current, tip, angle, depth);
        else if (u >= 1) hit(current, toScene(current, flight.shot.target), angle, depth);
      }

      const burn = burnRef.current;
      if (burn?.active) stepBurn(current, burn, dt);
    };

    let frame = 0;
    let last = 0;
    let average = 1 / 60;
    let frames = 0;
    const loop = (now) => {
      frame = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      tick(dt);
      sky.step(dt);
      fire.step(dt);
      sky.draw();
      fire.draw();

      // Shed particles if frames run long; recover slowly when there's headroom.
      average = average * 0.94 + dt * 0.06;
      frames += 1;
      if (frames % 30 === 0) {
        if (average > 0.026) qualityRef.current = Math.max(0.3, qualityRef.current * 0.85);
        else if (average < 0.018) qualityRef.current = Math.min(baseQuality, qualityRef.current * 1.05);
        sky.settings.quality = qualityRef.current;
      }

      if (relaxRef.current || flightRef.current || burnRef.current?.active || sky.busy || fire.busy) {
        frame = requestAnimationFrame(loop);
      }
    };
    const kick = () => {
      if (frame || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        kick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    engineRef.current = { sky, fire, kick };

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      sound.dispose();
      engineRef.current = null;
      soundRef.current = null;
    };
  }, [send, baseQuality]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
  }, []);

  // --- Aiming --------------------------------------------------------------------

  const drawAim = useCallback((pose) => {
    const current = layoutRef.current;
    const previous = poseRef.current;
    poseRef.current = pose;
    bowApi.current?.drawLoaded(current, pose);
    if (pose.power >= BOW.minPower) bowApi.current?.drawGuide(current, shotPath(current, planShot(current, pose)), pose.power);
    else bowApi.current?.hideGuide();
    if (Math.floor(pose.power * 5) > Math.floor(previous.power * 5)) soundRef.current?.creak(pose.power);
    setPowerStep(Math.round(pose.power * 10));
  }, []);

  const cancelDraw = useCallback(() => {
    dragRef.current = null;
    if (!send("cancel")) return;
    const pose = poseRef.current;
    relaxRef.current = { from: pose.pull, angle: pose.angle, elapsed: 0, withArrow: true };
    bowApi.current?.hideGuide();
    setPowerStep(0);
    engineRef.current?.kick();
  }, [send]);

  const release = useCallback(() => {
    const current = layoutRef.current;
    const pose = poseRef.current;
    if (sceneRef.current !== SCENE.DRAGGING || !current) return;
    if (pose.power < BOW.minPower) {
      cancelDraw();
      setHint(true);
      later(() => setHint(false), 2400);
      return;
    }
    const shot = planShot(current, pose);
    if (!send("release")) return;
    flightRef.current = { shot, elapsed: 0, lastTip: arrowTipPoint(current, pose) };
    relaxRef.current = { from: pose.pull, angle: pose.angle, elapsed: 0, withArrow: false };
    bowApi.current?.hideGuide();
    soundRef.current?.release(pose.power);
    soundRef.current?.whoosh(shot.duration / 1000);
    engineRef.current?.kick();
  }, [cancelDraw, later, send]);

  // Pointer input, in stage coordinates via the aiming layer's screen matrix
  // (taken once per drag, so moving the pointer never measures the DOM).
  const toStage = (event, inverse) => {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
    return { x: point.x, y: point.y };
  };

  const onPointerDown = (event) => {
    const current = layoutRef.current;
    if (sceneRef.current !== SCENE.READY || !current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const matrix = aimLayerRef.current?.getScreenCTM();
    if (!matrix) return;
    event.preventDefault();
    const inverse = matrix.inverse();
    const point = toStage(event, inverse);
    const nock = nockPoint(current, poseRef.current);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone; the drag simply won't start.
      return;
    }
    dragRef.current = { id: event.pointerId, inverse, offset: { x: nock.x - point.x, y: nock.y - point.y } };
    relaxRef.current = null;
    soundRef.current?.unlock();
    setHint(false);
    send("grab");
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const point = toStage(event, drag.inverse);
    drawAim(poseFromNock(layoutRef.current, { x: point.x + drag.offset.x, y: point.y + drag.offset.y }, poseRef.current));
  };

  const onPointerUp = (event) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    release();
  };

  const onPointerCancel = (event) => {
    if (dragRef.current?.id !== event.pointerId) return;
    cancelDraw();
  };

  // Keyboard: arrows aim and draw, Enter or Space shoots (drawing first if needed).
  const onKeyDown = (event) => {
    const state = sceneRef.current;
    const current = layoutRef.current;
    if ((state !== SCENE.READY && state !== SCENE.DRAGGING) || !current) return;
    const pose = poseRef.current;
    const withPull = (pull) => {
      const clamped = clamp(pull, 0, BOW.maxPull);
      return { ...pose, pull: clamped, power: clamped / BOW.maxPull };
    };
    const withAngle = (angle) => ({
      ...pose,
      angle: clamp(angle, current.bow.restAngle - BOW.range, current.bow.restAngle + BOW.range),
    });
    let next;
    if (event.key === "ArrowDown") next = withPull(pose.pull + 15);
    else if (event.key === "ArrowUp") next = withPull(pose.pull - 15);
    else if (event.key === "ArrowLeft") next = withAngle(pose.angle - 0.05);
    else if (event.key === "ArrowRight") next = withAngle(pose.angle + 0.05);
    else if (event.key === "Escape" && state === SCENE.DRAGGING) {
      event.preventDefault();
      cancelDraw();
      return;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (event.repeat) return;
      soundRef.current?.unlock();
      relaxRef.current = null;
      send("grab");
      if (pose.power >= BOW.minPower) {
        release();
      } else {
        drawAim(withPull(BOW.maxPull * 0.85));
        later(release, 280);
      }
      return;
    } else {
      return;
    }
    event.preventDefault();
    soundRef.current?.unlock();
    relaxRef.current = null;
    send("grab");
    drawAim(next);
  };

  // Losing the window mid-draw (alt-tab, a notification) lets the string go slack.
  useEffect(() => {
    const onBlur = () => {
      if (sceneRef.current === SCENE.DRAGGING) cancelDraw();
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [cancelDraw]);

  // --- Layout changes ----------------------------------------------------------------

  useLayoutEffect(() => {
    layoutRef.current = layout;
    const engine = engineRef.current;
    if (!layout || !engine) return;
    const ratio = canvasRatio(layout, baseQuality);
    engine.sky.resize(layout.width, layout.height, ratio);
    engine.fire.resize(layout.width, layout.height, ratio);
    engine.sky.settings.unit = sceneUnit(layout);

    // Redraw the bow and arrow for the new geometry. A draw in progress is let go.
    if (sceneRef.current === SCENE.DRAGGING) {
      dragRef.current = null;
      send("cancel");
      setPowerStep(0);
    }
    const api = bowApi.current;
    if (sceneRef.current === SCENE.READY) {
      relaxRef.current = null;
      poseRef.current = restPose(layout);
      api?.drawLoaded(layout, poseRef.current);
      api?.hideGuide();
    } else {
      api?.drawBow(layout, restPose(layout));
      const stuck = stuckRef.current;
      if (stuck) api?.drawFlying(layout, toScene(layout, stuck.local), stuck.angle, stuck.depth);
    }
    engine.kick();
  }, [layout, baseQuality, send]);

  // --- Replay ------------------------------------------------------------------------

  const replay = () => {
    if (!send("reset")) return;
    const current = layoutRef.current;
    const engine = engineRef.current;
    engine?.sky.clear();
    engine?.fire.clear();
    flightRef.current = null;
    burnRef.current = null;
    stuckRef.current = null;
    relaxRef.current = null;
    soundRef.current?.fireStop(0.4);
    // The effigy stands back up.
    const group = ravanaGroupRef.current;
    if (group) {
      group.style.transition = "transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.9s ease-out";
      group.style.transform = "";
      group.style.opacity = "";
    }
    for (const element of [groundGlowRef.current, skyGlowRef.current, ...crowdRimRefs.current]) {
      if (element) element.style.opacity = "0";
    }
    setImpact(null);
    setFirePhase("none");
    setPowerStep(0);
    if (current) {
      poseRef.current = restPose(current);
      bowApi.current?.drawLoaded(current, poseRef.current);
    }
    later(() => grabRef.current?.focus({ preventScroll: true }), 0);
  };

  const toggleSound = () => {
    const next = !soundOff;
    soundRef.current?.unlock();
    soundRef.current?.setMuted(next);
    soundOffRef.current = next;
    setSoundOff(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "off" : "on");
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  };

  // --- Render ----------------------------------------------------------------------

  const canAim = scene === SCENE.READY || scene === SCENE.DRAGGING;
  const restNock = layout ? nockPoint(layout, restPose(layout)) : null;
  const burning = firePhase !== "none" && firePhase !== "out";
  const instruction =
    scene === SCENE.DRAGGING
      ? powerStep >= Math.ceil(BOW.minPower * 10)
        ? `Release to shoot · ${powerStep * 10}% power`
        : "Pull back further…"
      : hint
        ? "Pull back a little further, then let go."
        : "Pull back the arrow and release to defeat Ravana!";

  return (
    <MotionConfig reducedMotion="user">
      <main
        className="dussehra-scene fixed inset-0 overflow-hidden bg-[var(--dussehra-night)] text-[var(--dussehra-ivory)]"
        data-state={scene}
        data-fire={firePhase}
      >
        <h1 className="sr-only">Dussehra celebration</h1>

        <div ref={stageRef} className="absolute inset-0 touch-none select-none">
          <div ref={shakeRef} className="absolute inset-0">
            {layout && <FestivalSky layout={layout} glowRef={skyGlowRef} />}
            <canvas ref={skyCanvasRef} className="dussehra-layer" aria-hidden="true" />
            {layout && (
              <>
                <FestivalLand layout={layout} glowRef={groundGlowRef} />
                {/* The effigy's layers slump together after the climax (one composited transform). */}
                <div ref={ravanaGroupRef} className="absolute inset-0 will-change-transform">
                  <RavanaEffigy layout={layout} />
                  <RavanaFlames layout={layout} impact={impact} burning={burning} sparse={baseQuality < 0.7} />
                </div>
              </>
            )}
            <canvas ref={fireCanvasRef} className="dussehra-layer" aria-hidden="true" />
            {layout && (
              <>
                <FestivalCrowd layout={layout} rimRefs={crowdRimRefs} />
                <SceneLayer ref={aimLayerRef} layout={layout}>
                  <BowAndArrow ref={bowApi} cue={scene === SCENE.READY} />
                </SceneLayer>
              </>
            )}
          </div>
          <div ref={flashRef} className="dussehra-flash pointer-events-none absolute inset-0 opacity-0" aria-hidden="true" />
        </div>

        {restNock && (
          <button
            ref={grabRef}
            type="button"
            aria-label="Bow and arrow. Drag the arrow back and let go to shoot, or use the arrow keys to aim and draw and press Enter."
            aria-disabled={!canAim}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}
            onKeyDown={onKeyDown}
            className={cn(
              "absolute z-20 size-[88px] -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-full outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--dussehra-gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
              canAim ? "cursor-grab" : "pointer-events-none",
              scene === SCENE.DRAGGING && "cursor-grabbing",
            )}
            style={{ left: restNock.x, top: restNock.y }}
          />
        )}

        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 sm:p-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--dussehra-gold)]/25 bg-[var(--dussehra-panel)] px-4 text-sm font-semibold text-[var(--dussehra-ivory)] backdrop-blur-md transition hover:border-[var(--dussehra-gold)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dussehra-gold)] motion-reduce:transition-none"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>
              Back<span className="hidden sm:inline"> to HRCRM</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!soundOff}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--dussehra-gold)]/25 bg-[var(--dussehra-panel)] px-3 text-sm font-semibold text-[var(--dussehra-ivory)] backdrop-blur-md transition hover:border-[var(--dussehra-gold)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dussehra-gold)] motion-reduce:transition-none sm:px-4"
          >
            {soundOff ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            <span className="sr-only sm:not-sr-only">Sound</span>
          </button>
        </header>

        <AnimatePresence>
          {layout && canAim && (
            <div
              key="instruction"
              className="pointer-events-none absolute z-20 w-max max-w-[calc(100%-32px)] -translate-x-1/2"
              style={layout.portrait ? { left: "50%", top: 66 } : { left: layout.ravana.x, bottom: layout.pad + 4 }}
            >
              <Motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center text-center"
              >
                <p className="rounded-full border border-[var(--dussehra-gold)]/30 bg-[var(--dussehra-panel)] px-4 py-2 text-[13px] font-semibold text-[var(--dussehra-ivory)] shadow-lg backdrop-blur-md sm:text-sm">
                  {instruction}
                </p>
                {scene === SCENE.READY && !hint && (
                  <p className="mt-1.5 hidden text-xs text-[var(--dussehra-ivory)]/70 sm:block">
                    Drag the glowing arrow, or use the arrow keys and press Enter
                  </p>
                )}
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {scene === SCENE.CELEBRATING && <CelebrationMessage key="greeting" name={name} onReplay={replay} portrait={layout?.portrait} />}
        </AnimatePresence>

        <p className="sr-only" aria-live="polite">
          {ANNOUNCEMENTS[scene] ?? ""}
        </p>
      </main>
    </MotionConfig>
  );
}
