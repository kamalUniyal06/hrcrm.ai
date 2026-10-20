import test from "node:test";
import assert from "node:assert/strict";
import {
  BOW,
  RAVANA,
  SCENE,
  TIMELINE,
  aimVector,
  arrowDepthScale,
  arrowTipPoint,
  bezierPoint,
  bezierTangent,
  computeLayout,
  effigyContains,
  effigyContainsLocal,
  fireIntensity,
  firePhaseAt,
  flightEase,
  flightHits,
  ignitionDelays,
  mulberry32,
  nextSceneState,
  nockPoint,
  planShot,
  poseFromNock,
  restPose,
  shotPath,
  toScene,
} from "./dussehraScene.js";

const VIEWPORTS = [
  [360, 640],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [844, 390],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
];

const inside = (point, layout, margin = 0) =>
  point.x >= -margin && point.x <= layout.width + margin && point.y >= -margin && point.y <= layout.height + margin;

// Steps a planned flight the way DussehraExperience does and returns where it hits.
function fly(layout, shot) {
  const path = shotPath(layout, shot);
  for (let frame = 0; frame <= 120; frame += 1) {
    const u = frame / 120;
    const tip = bezierPoint(path, flightEase(u));
    if (flightHits(layout, tip, u)) return { tip, u };
  }
  return null;
}

test("the scene only moves forward through its states, and a flying arrow can't be fired again", () => {
  let state = SCENE.READY;
  for (const [event, expected] of [
    ["grab", SCENE.DRAGGING],
    ["release", SCENE.SHOOTING],
    ["release", SCENE.SHOOTING],
    ["grab", SCENE.SHOOTING],
    ["hit", SCENE.IMPACT],
    ["ignite", SCENE.BURNING],
    ["grab", SCENE.BURNING],
    ["reset", SCENE.BURNING],
    ["climax", SCENE.CELEBRATING],
    ["reset", SCENE.READY],
  ]) {
    state = nextSceneState(state, event);
    assert.equal(state, expected, `after ${event}`);
  }
  assert.equal(nextSceneState(SCENE.DRAGGING, "cancel"), SCENE.READY);
  assert.equal(nextSceneState(SCENE.READY, "cancel"), SCENE.READY);
  assert.equal(nextSceneState("unknown", "grab"), "unknown");
});

test("the layout keeps Ravana and a fully drawn bow on screen at every viewport", () => {
  for (const [width, height] of VIEWPORTS) {
    const layout = computeLayout(width, height);
    const { ravana, bow } = layout;
    const label = `${width}x${height}`;
    assert.ok(ravana.x - RAVANA.halfWidth * ravana.scale >= 0, `${label} effigy left edge`);
    assert.ok(ravana.x + RAVANA.halfWidth * ravana.scale <= width, `${label} effigy right edge`);
    assert.ok(ravana.y - RAVANA.height * ravana.scale >= 0, `${label} effigy top`);
    assert.ok(ravana.y <= height, `${label} effigy base`);
    assert.ok(ravana.y - RAVANA.height * ravana.scale >= layout.top - 1, `${label} effigy clears the top bar`);
    for (const offset of [-BOW.range, 0, BOW.range]) {
      const pose = { angle: bow.restAngle + offset, pull: BOW.maxPull, power: 1 };
      assert.ok(inside(nockPoint(layout, pose), layout), `${label} drawn nock at ${offset}`);
      // The loaded arrow never starts inside the effigy, which would be an instant hit.
      assert.equal(effigyContains(layout, arrowTipPoint(layout, { ...pose, pull: 0 })), false, `${label} arrow tip at ${offset}`);
    }
  }
});

test("dragging the nock aims away from the pull, within range, and clamps the draw", () => {
  const layout = computeLayout(1440, 900);
  const { bow } = layout;
  const behind = (angle, distance) => {
    const aim = aimVector(angle);
    return { x: bow.x - aim.x * distance * bow.scale, y: bow.y - aim.y * distance * bow.scale };
  };

  const half = poseFromNock(layout, behind(bow.restAngle + 0.2, BOW.restNock + 75));
  assert.ok(Math.abs(half.angle - (bow.restAngle + 0.2)) < 1e-9);
  assert.ok(Math.abs(half.power - 0.5) < 1e-9);

  const far = poseFromNock(layout, behind(bow.restAngle + 2, BOW.restNock + 900));
  assert.ok(Math.abs(far.angle - (bow.restAngle + BOW.range)) < 1e-9);
  assert.equal(far.pull, BOW.maxPull);
  assert.equal(far.power, 1);

  // Pushing the nock forward doesn't draw the bow or flip the aim.
  const previous = { angle: bow.restAngle - 0.1, pull: 40, power: 40 / BOW.maxPull };
  const pushed = poseFromNock(layout, behind(bow.restAngle, 10), previous);
  assert.equal(pushed.pull, 0);
  assert.equal(pushed.angle, previous.angle);
  assert.deepEqual(poseFromNock(layout, nockPoint(layout, restPose(layout))), restPose(layout));
});

test("every shot the bow allows lands on Ravana, at every viewport", () => {
  for (const [width, height] of VIEWPORTS) {
    const layout = computeLayout(width, height);
    for (let step = -4; step <= 4; step += 1) {
      for (const power of [BOW.minPower, 0.5, 1]) {
        const pose = { angle: layout.bow.restAngle + (step / 4) * BOW.range, pull: power * BOW.maxPull, power };
        const shot = planShot(layout, pose);
        const label = `${width}x${height} step ${step} power ${power}`;
        assert.ok(effigyContainsLocal(shot.target), `${label} target`);
        assert.ok(shot.duration >= 420 && shot.duration <= 1100, `${label} duration ${shot.duration}`);
        const hit = fly(layout, shot);
        assert.ok(hit, `${label} hits`);
        assert.ok(inside(hit.tip, layout), `${label} hit is on screen`);
      }
    }
  }
});

test("the arrow leaves along the aim and the aim decides where it lands", () => {
  const layout = computeLayout(1440, 900);
  const pose = { angle: layout.bow.restAngle, pull: BOW.maxPull, power: 1 };
  const path = shotPath(layout, planShot(layout, pose));
  const tangent = bezierTangent(path, 0);
  const aim = aimVector(pose.angle);
  assert.ok(Math.abs(Math.atan2(tangent.x, -tangent.y) - Math.atan2(aim.x, -aim.y)) < 1e-9);
  assert.deepEqual(path.p0, arrowTipPoint(layout, pose));

  // On a portrait phone the bow is below Ravana, so aiming left or right moves the hit sideways.
  const phone = computeLayout(390, 844);
  const aimAt = (offset) => planShot(phone, { angle: phone.bow.restAngle + offset, pull: BOW.maxPull, power: 1 }).target;
  assert.ok(aimAt(-0.3).x < aimAt(0).x);
  assert.ok(aimAt(0.3).x > aimAt(0).x);
  // A weak shot lands lower than a full draw along the same aim.
  const weak = planShot(phone, { angle: phone.bow.restAngle, pull: BOW.maxPull * 0.25, power: 0.25 }).target;
  assert.ok(weak.y > aimAt(0).y);

  // On a wide screen the bow is beside him, so aiming higher hits higher.
  const wide = computeLayout(1440, 900);
  const wideAt = (offset) => planShot(wide, { angle: wide.bow.restAngle + offset, pull: BOW.maxPull, power: 1 }).target;
  assert.ok(wideAt(-0.25).y < wideAt(0.25).y);

  // A hit is only registered once the arrow has arrived, not while it crosses him on screen.
  const target = toScene(phone, planShot(phone, pose).target);
  assert.equal(flightHits(phone, target, 0.9), false);
  assert.equal(flightHits(phone, target, 1), true);
  assert.ok(arrowDepthScale(phone) < 1 && arrowDepthScale(phone) >= 0.45);
});

test("a resize mid-flight keeps the flight ending on the effigy", () => {
  const before = computeLayout(1440, 900);
  const shot = planShot(before, { angle: before.bow.restAngle + 0.1, pull: 120, power: 0.8 });
  const after = computeLayout(390, 844);
  const end = shotPath(after, shot).p2;
  assert.deepEqual(end, toScene(after, shot.target));
  assert.ok(effigyContains(after, end));
});

test("fire spreads outwards from the hit and builds to a climax before burning out", () => {
  const delays = ignitionDelays({ x: 0, y: -402 });
  const chestSpot = delays[13];
  assert.equal(Math.min(...delays), chestSpot);
  assert.ok(Math.min(...delays) >= TIMELINE.ignite);
  assert.ok(Math.max(...delays) < 2.6);

  assert.equal(fireIntensity(0), 0);
  assert.ok(fireIntensity(1) > 0);
  assert.ok(fireIntensity(4) > 1);
  assert.ok(fireIntensity(16) < fireIntensity(4));
  assert.equal(fireIntensity(TIMELINE.fireOut), 0);
  assert.deepEqual(
    [null, 0.1, 1, 5, 15, 26].map(firePhaseAt),
    ["none", "none", "lit", "roaring", "dying", "out"],
  );
  assert.ok(TIMELINE.climax > TIMELINE.ignite && TIMELINE.climax < TIMELINE.fireworksUntil);
});

test("seeded randomness repeats and stays within 0–1", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const values = Array.from({ length: 50 }, () => a());
  assert.deepEqual(values, Array.from({ length: 50 }, () => b()));
  assert.ok(values.every((value) => value >= 0 && value < 1));
  assert.notDeepEqual(values, Array.from({ length: 50 }, mulberry32(7)));
});
