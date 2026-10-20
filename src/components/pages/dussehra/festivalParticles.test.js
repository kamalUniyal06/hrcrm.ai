import test from "node:test";
import assert from "node:assert/strict";
import { BURST, KIND, TINT, createParticleLayer, createParticlePool, spawnParticle, stepParticles } from "./festivalParticles.js";
import { mulberry32 } from "./dussehraScene.js";

test("the pool caps live particles and recycles expired ones in place", () => {
  const pool = createParticlePool(3);
  assert.equal(spawnParticle(pool, KIND.FIRE, 0, 0, 0, 0, 0, 1, 10, 5, 0, 0), 0);
  assert.equal(spawnParticle(pool, KIND.EMBER, 0, 1, 0, 0, 0, 0.5, 10, 5, 0, 0), 1);
  assert.equal(spawnParticle(pool, KIND.SMOKE, 0, 2, 0, 0, 0, 2, 10, 5, 0, 0), 2);
  assert.equal(spawnParticle(pool, KIND.SPARK, 0, 3, 0, 0, 0, 1, 10, 5, 0, 0), -1);
  assert.equal(pool.count, 3);

  stepParticles(pool, 0.6);
  // The ember expired; the smoke from the end of the pool took its slot.
  assert.equal(pool.count, 2);
  assert.deepEqual([...pool.kind.slice(0, 2)], [KIND.FIRE, KIND.SMOKE]);
  assert.deepEqual([...pool.x.slice(0, 2)], [0, 2]);
  assert.equal(spawnParticle(pool, KIND.SPARK, 0, 9, 0, 0, 0, 1, 10, 5, 0, 0), 2);

  stepParticles(pool, 5);
  assert.equal(pool.count, 0);
});

test("particles move with velocity, gravity and drag", () => {
  const pool = createParticlePool(2);
  spawnParticle(pool, KIND.SPARK, 0, 0, 0, 10, -20, 5, 1, 1, 40, 0);
  stepParticles(pool, 0.5);
  assert.equal(pool.vx[0], 10);
  assert.equal(pool.vy[0], 0);
  assert.equal(pool.x[0], 5);
  assert.equal(pool.y[0], 0);

  spawnParticle(pool, KIND.SMOKE, 0, 0, 0, 10, 0, 5, 1, 1, 0, 2);
  stepParticles(pool, 0.5);
  assert.ok(Math.abs(pool.vx[1] - 10 * Math.exp(-1)) < 1e-5);
});

test("a firework rocket bursts into a capped shower and reports it", () => {
  let bursts = 0;
  const layer = createParticleLayer(null, { capacity: 50, trails: true, random: mulberry32(3) });
  layer.settings.onBurst = () => {
    bursts += 1;
  };
  layer.firework(100, 500, 100, TINT.ROSE, BURST.PEONY);
  assert.equal(layer.pool.count, 1);
  assert.equal(layer.pool.kind[0], KIND.ROCKET);

  for (let frame = 0; frame < 120 && bursts === 0; frame += 1) layer.step(1 / 60);
  assert.equal(bursts, 1);
  // The rocket still holds its slot while it bursts, so the shower fills the rest.
  assert.equal(layer.pool.count, 49);
  assert.ok([...layer.pool.kind.slice(0, 49)].every((kind) => kind === KIND.STAR));
  assert.ok(layer.busy);

  // Without a canvas the layer still runs and drains, so the scene works anyway.
  assert.doesNotThrow(() => layer.draw());
  for (let frame = 0; frame < 300; frame += 1) layer.step(1 / 60);
  assert.equal(layer.pool.count, 0);
  layer.step(1);
  assert.equal(layer.busy, true, "one more frame clears the faded trails");
  layer.draw();
  assert.equal(layer.busy, false);
});
