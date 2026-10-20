// Pooled canvas particles for the Dussehra scene: fire, embers, smoke, sparks,
// the arrow's trail and fireworks. Particles live in typed arrays packed at the
// front (a dead particle is swapped with the last live one), so nothing is
// allocated per frame and the count can never pass the pool's capacity.

export const KIND = { FIRE: 0, EMBER: 1, SPARK: 2, SMOKE: 3, GLOW: 4, ROCKET: 5, STAR: 6 };

// Firework variants.
export const BURST = { PEONY: 0, RING: 1, WILLOW: 2 };

// Colours for sparks, glows and firework stars, by tint index.
const TINTS = [
  [255, 206, 92], // gold
  [255, 140, 40], // saffron
  [255, 248, 230], // white
  [255, 96, 150], // rose
  [110, 235, 170], // emerald
  [180, 140, 255], // violet
];
export const TINT = { GOLD: 0, SAFFRON: 1, WHITE: 2, ROSE: 3, EMERALD: 4, VIOLET: 5 };
const TINT_CSS = TINTS.map(([r, g, b]) => `rgb(${r},${g},${b})`);

const FLOAT_FIELDS = ["x", "y", "vx", "vy", "age", "ttl", "size", "endSize", "gravity", "drag", "seed"];
const BYTE_FIELDS = ["kind", "tint", "variant"];

export function createParticlePool(capacity) {
  const pool = { capacity, count: 0 };
  for (const field of FLOAT_FIELDS) pool[field] = new Float32Array(capacity);
  for (const field of BYTE_FIELDS) pool[field] = new Uint8Array(capacity);
  pool.arrays = [...FLOAT_FIELDS, ...BYTE_FIELDS].map((field) => pool[field]);
  return pool;
}

// Returns the new particle's index, or -1 when the pool is full.
export function spawnParticle(pool, kind, tint, x, y, vx, vy, ttl, size, endSize, gravity, drag) {
  if (pool.count >= pool.capacity) return -1;
  const i = pool.count;
  pool.count += 1;
  pool.kind[i] = kind;
  pool.tint[i] = tint;
  pool.variant[i] = 0;
  pool.x[i] = x;
  pool.y[i] = y;
  pool.vx[i] = vx;
  pool.vy[i] = vy;
  pool.age[i] = 0;
  pool.ttl[i] = ttl;
  pool.size[i] = size;
  pool.endSize[i] = endSize;
  pool.gravity[i] = gravity;
  pool.drag[i] = drag;
  pool.seed[i] = (x * 0.37 + y * 0.61 + i * 1.7) % 6.283;
  return i;
}

function removeParticle(pool, i) {
  pool.count -= 1;
  const last = pool.count;
  if (i === last) return;
  for (const array of pool.arrays) array[i] = array[last];
}

// Ages and moves every particle by dt seconds. `onExpire(i)` runs just before a
// particle is removed and may spawn new ones (a rocket bursting).
export function stepParticles(pool, dt, onExpire) {
  let i = 0;
  while (i < pool.count) {
    pool.age[i] += dt;
    if (pool.age[i] >= pool.ttl[i]) {
      onExpire?.(i);
      removeParticle(pool, i);
      continue;
    }
    const damping = pool.drag[i] > 0 ? Math.exp(-pool.drag[i] * dt) : 1;
    pool.vx[i] *= damping;
    pool.vy[i] = pool.vy[i] * damping + pool.gravity[i] * dt;
    pool.x[i] += pool.vx[i] * dt;
    pool.y[i] += pool.vy[i] * dt;
    i += 1;
  }
}

// --- Rendering ------------------------------------------------------------------

let spriteCache = null;

// Soft radial sprites, drawn once and stamped with drawImage.
function sprites() {
  if (spriteCache) return spriteCache;
  const make = (stops, size = 64) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  };
  spriteCache = {
    fireCore: make([[0, "rgba(255,255,235,1)"], [0.25, "rgba(255,226,130,0.9)"], [0.6, "rgba(255,150,40,0.35)"], [1, "rgba(255,90,0,0)"]]),
    fire: make([[0, "rgba(255,206,100,0.95)"], [0.35, "rgba(255,130,30,0.65)"], [1, "rgba(200,40,0,0)"]]),
    fireOuter: make([[0, "rgba(255,110,30,0.7)"], [0.45, "rgba(180,36,10,0.32)"], [1, "rgba(80,10,0,0)"]]),
    ember: make([[0, "rgba(255,250,210,1)"], [0.18, "rgba(255,190,70,1)"], [0.45, "rgba(255,110,20,0.35)"], [1, "rgba(255,80,0,0)"]], 32),
    // Lit from below by the fire, so a warm grey that still shows against the night sky.
    smoke: make([[0, "rgba(104,84,88,0.85)"], [0.5, "rgba(78,62,72,0.42)"], [1, "rgba(52,42,54,0)"]], 96),
    tints: TINTS.map(([r, g, b]) =>
      make([[0, "rgba(255,255,255,1)"], [0.18, `rgba(${r},${g},${b},0.95)`], [0.45, `rgba(${r},${g},${b},0.32)`], [1, `rgba(${r},${g},${b},0)`]], 48),
    ),
  };
  return spriteCache;
}

// One canvas of particles. `trails` fades the previous frame instead of clearing
// it, which draws the streaks behind fireworks without storing any history.
// Without a 2D context (or a canvas) the layer still runs, it just draws nothing.
export function createParticleLayer(canvas, { capacity, trails = false, random = Math.random }) {
  const ctx = canvas?.getContext?.("2d") ?? null;
  const pool = createParticlePool(capacity);
  const art = ctx ? sprites() : null;
  const settings = { unit: 1, quality: 1, onBurst: null };
  let width = 0;
  let height = 0;
  let ratio = 1;
  // Seconds of fading left after the last trail particle dies, then one full clear
  // (fading alone leaves faint 8-bit leftovers behind).
  let residue = 0;
  let needsClear = false;

  const add = (...args) => spawnParticle(pool, ...args);

  function burst(x, y, tint, variant) {
    const { unit, quality } = settings;
    const willow = variant === BURST.WILLOW;
    const count = Math.round((willow ? 80 : 110) * quality);
    const speed = (willow ? 150 : 210) * unit * (0.85 + random() * 0.3);
    for (let k = 0; k < count; k += 1) {
      const angle = (k / count) * Math.PI * 2 + random() * 0.15;
      const velocity = variant === BURST.RING ? speed : speed * (0.4 + random() * 0.6);
      add(
        KIND.STAR,
        willow ? TINT.GOLD : tint,
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        willow ? 2.2 + random() * 0.8 : 1.4 + random() * 0.8,
        (willow ? 9 : 13) * unit,
        3 * unit,
        (willow ? 85 : 60) * unit,
        willow ? 1.7 : 1.15,
      );
    }
    add(KIND.GLOW, TINT.WHITE, x, y, 0, 0, 0.32, 150 * unit, 60 * unit, 0, 0);
    settings.onBurst?.();
  }

  const expire = (i) => {
    if (pool.kind[i] === KIND.ROCKET) burst(pool.x[i], pool.y[i], pool.tint[i], pool.variant[i]);
  };

  return {
    pool,
    settings,
    get busy() {
      return pool.count > 0 || residue > 0 || needsClear;
    },

    resize(nextWidth, nextHeight, pixelRatio) {
      width = nextWidth;
      height = nextHeight;
      ratio = pixelRatio;
      if (!canvas) return;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      residue = 0;
      needsClear = false;
    },

    clear() {
      pool.count = 0;
      residue = 0;
      needsClear = false;
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },

    step(dt) {
      stepParticles(pool, dt, expire);
      if (!trails) return;
      if (pool.count > 0) {
        residue = 0.8;
      } else if (residue > 0) {
        residue = Math.max(0, residue - dt);
        if (residue === 0) needsClear = true;
      }
    },

    draw() {
      if (!ctx) {
        needsClear = false;
        return;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (trails && (pool.count > 0 || residue > 0)) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(0,0,0,0.14)";
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
        needsClear = false;
      }
      if (pool.count === 0) return;

      // Smoke sits under the flames, with normal blending.
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < pool.count; i += 1) {
        if (pool.kind[i] !== KIND.SMOKE) continue;
        const t = pool.age[i] / pool.ttl[i];
        const size = pool.size[i] + (pool.endSize[i] - pool.size[i]) * t;
        ctx.globalAlpha = Math.sin(Math.PI * t) * 0.3;
        ctx.drawImage(art.smoke, pool.x[i] - size / 2, pool.y[i] - size / 2, size, size);
      }

      // Everything that glows adds light.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 0; i < pool.count; i += 1) {
        const kind = pool.kind[i];
        if (kind === KIND.SMOKE) continue;
        const t = pool.age[i] / pool.ttl[i];
        const x = pool.x[i];
        const y = pool.y[i];
        const size = pool.size[i] + (pool.endSize[i] - pool.size[i]) * t;
        const flicker = Math.sin(pool.seed[i] + pool.age[i] * 24);
        let sprite;
        if (kind === KIND.FIRE) {
          // Stretched upwards into a tongue rather than a round puff.
          ctx.globalAlpha = (1 - t) * 0.75 * (0.82 + 0.18 * flicker);
          ctx.drawImage(t < 0.12 ? art.fireCore : t < 0.5 ? art.fire : art.fireOuter, x - size / 2, y - size * 0.8, size, size * 1.6);
          continue;
        } else if (kind === KIND.EMBER) {
          sprite = art.ember;
          ctx.globalAlpha = Math.pow(1 - t, 0.7) * (0.6 + 0.4 * Math.sin(pool.seed[i] + pool.age[i] * 16));
        } else if (kind === KIND.SPARK) {
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = TINT_CSS[pool.tint[i]];
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - pool.vx[i] * 0.035, y - pool.vy[i] * 0.035);
          ctx.stroke();
          continue;
        } else if (kind === KIND.STAR) {
          sprite = art.tints[pool.tint[i]];
          ctx.globalAlpha = Math.pow(1 - t, 1.4) * (pool.tint[i] === TINT.GOLD ? 1 : 0.7 + 0.3 * flicker);
        } else {
          // GLOW and ROCKET
          sprite = art.tints[pool.tint[i]];
          ctx.globalAlpha = kind === KIND.ROCKET ? 1 : Math.pow(1 - t, 1.6);
        }
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },

    // --- Emitters (sizes in CSS pixels) ---

    flame(x, y, size, strength) {
      add(
        KIND.FIRE,
        0,
        x + (random() - 0.5) * size * 0.8,
        y + (random() - 0.5) * size * 0.3,
        (random() - 0.5) * size * 0.5,
        -(1.6 + random() * 1.4) * size * (0.8 + strength * 0.4),
        0.38 + random() * 0.4,
        size * (0.45 + random() * 0.3),
        size * 0.12,
        -size * 1.4,
        0.8,
      );
    },

    ember(x, y, size) {
      add(
        KIND.EMBER,
        TINT.SAFFRON,
        x + (random() - 0.5) * size,
        y,
        (random() - 0.5) * size * 1.4,
        -(1.5 + random() * 2.5) * size,
        1.4 + random() * 1.8,
        size * (0.14 + random() * 0.1),
        size * 0.06,
        -size * 0.3,
        0.4,
      );
    },

    smoke(x, y, size) {
      add(
        KIND.SMOKE,
        0,
        x + (random() - 0.5) * size,
        y,
        (random() - 0.3) * size * 0.5,
        -(0.6 + random() * 0.6) * size,
        2.6 + random() * 1.8,
        size * 1.2,
        size * 3.6,
        -size * 0.05,
        0.25,
      );
    },

    sparks(x, y, count, speed, size) {
      for (let k = 0; k < count; k += 1) {
        const angle = random() * Math.PI * 2;
        const velocity = speed * (0.35 + random() * 0.65);
        add(
          KIND.SPARK,
          random() < 0.5 ? TINT.GOLD : random() < 0.5 ? TINT.SAFFRON : TINT.WHITE,
          x,
          y,
          Math.cos(angle) * velocity,
          Math.sin(angle) * velocity,
          0.35 + random() * 0.55,
          size * (1 + random()),
          size * 0.3,
          speed * 1.3,
          1.2,
        );
      }
    },

    glow(x, y, size, ttl, tint = TINT.GOLD) {
      add(KIND.GLOW, tint, x, y, 0, 0, ttl, size, size * 0.6, 0, 0);
    },

    // A luminous streak from (x0, y0) to (x1, y1) with a white-hot core, and a few falling sparks.
    trail(x0, y0, x1, y1, size) {
      const length = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.min(32, Math.ceil(length / Math.max(2, size * 0.12)));
      for (let k = 1; k <= steps; k += 1) {
        const t = k / steps;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        add(
          KIND.GLOW,
          random() < 0.75 ? TINT.GOLD : TINT.SAFFRON,
          x,
          y,
          (random() - 0.5) * size * 0.4,
          (random() - 0.5) * size * 0.4,
          0.3 + random() * 0.25,
          size * (0.7 + random() * 0.3),
          size * 0.15,
          0,
          0,
        );
        if (k % 2 === 0) add(KIND.GLOW, TINT.WHITE, x, y, 0, 0, 0.16, size * 0.38, size * 0.1, 0, 0);
      }
      if (random() < 0.6) {
        add(KIND.SPARK, TINT.GOLD, x1, y1, (random() - 0.5) * size * 3, random() * size * 2, 0.35 + random() * 0.3, size * 0.09, size * 0.03, size * 9, 1);
      }
    },

    // A rocket that climbs from fromY to toY and bursts there.
    firework(x, fromY, toY, tint, variant) {
      const gravity = 300 * settings.unit;
      const climb = Math.max(20, fromY - toY);
      const speed = Math.sqrt(2 * gravity * climb);
      const i = add(KIND.ROCKET, TINT.GOLD, x, fromY, (random() - 0.5) * 20 * settings.unit, -speed, speed / gravity, 7 * settings.unit, 4 * settings.unit, gravity, 0);
      if (i < 0) return;
      // The burst reads the rocket's tint and variant when it expires.
      pool.tint[i] = tint;
      pool.variant[i] = variant;
    },
  };
}
