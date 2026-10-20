// Synthesised sound effects for the Dussehra scene, built with Web Audio, so there
// are no audio files to download or go missing. Nothing is created until
// `unlock()` runs inside a user gesture, and every call is a no-op when audio
// isn't available, so the scene plays exactly the same in silence.

const VOLUME = 0.75;

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Sparse pops and snaps, looped under the fire's roar.
function crackleBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const pops = Math.round(seconds * 34);
  for (let k = 0; k < pops; k += 1) {
    const start = Math.floor(Math.random() * (data.length - 2000));
    const length = Math.floor(ctx.sampleRate * (0.002 + Math.random() * 0.012));
    const amplitude = 0.25 + Math.random() * 0.75;
    for (let i = 0; i < length; i += 1) data[start + i] += (Math.random() * 2 - 1) * amplitude * (1 - i / length);
  }
  return buffer;
}

export function createFestivalSound() {
  let ctx = null;
  let master = null;
  let noise = null;
  let crackle = null;
  let fire = null;
  let muted = false;

  const live = () => Boolean(ctx) && ctx.state !== "closed";
  const audible = () => live() && !muted;

  function gainEnvelope(at, peak, attack, release) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
    gain.connect(master);
    return gain;
  }

  function burstOfNoise({ delay = 0, type, frequency, frequencyEnd = frequency, q = 1, peak, attack = 0.005, release, buffer = noise }) {
    const at = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, at);
    filter.frequency.exponentialRampToValueAtTime(frequencyEnd, at + attack + release);
    source.connect(filter).connect(gainEnvelope(at, peak, attack, release));
    source.start(at, Math.random() * Math.max(0, buffer.duration - attack - release - 0.05));
    source.stop(at + attack + release + 0.05);
  }

  function tone({ delay = 0, type, from, to, peak, attack = 0.004, release }) {
    const at = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + attack + release);
    oscillator.connect(gainEnvelope(at, peak, attack, release));
    oscillator.start(at);
    oscillator.stop(at + attack + release + 0.05);
  }

  // Each effect is fire-and-forget; a failure in Web Audio must never break the scene.
  const play = (effect) => (...args) => {
    if (!audible()) return;
    try {
      effect(...args);
    } catch {
      // Ignore: sound is optional.
    }
  };

  function stopFire(fadeSeconds) {
    if (!fire) return;
    const { gain, sources } = fire;
    fire = null;
    try {
      const at = ctx.currentTime;
      gain.gain.cancelScheduledValues(at);
      gain.gain.setValueAtTime(gain.gain.value, at);
      gain.gain.linearRampToValueAtTime(0, at + fadeSeconds);
      for (const source of sources) source.stop(at + fadeSeconds + 0.05);
    } catch {
      // Already stopped.
    }
  }

  return {
    // Call from a user gesture (pointerdown, keydown, a click).
    unlock() {
      if (!ctx) {
        const AudioContextClass = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!AudioContextClass) return;
        try {
          ctx = new AudioContextClass();
          master = ctx.createGain();
          master.gain.value = muted ? 0 : VOLUME;
          master.connect(ctx.destination);
          noise = noiseBuffer(ctx, 2);
          crackle = crackleBuffer(ctx, 3);
        } catch {
          ctx = null;
          return;
        }
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    },

    setMuted(value) {
      muted = value;
      if (!live()) return;
      master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.05);
    },

    // The bow creaking as it bends (level 0–1).
    creak: play((level) => {
      burstOfNoise({ type: "bandpass", frequency: 240 + level * 520, frequencyEnd: 200 + level * 420, q: 8, peak: 0.08 + level * 0.08, release: 0.07 });
      tone({ type: "triangle", from: 70 + level * 60, to: 55 + level * 40, peak: 0.05, release: 0.09 });
    }),

    // The string twang on release (power 0–1).
    release: play((power) => {
      tone({ type: "triangle", from: 230, to: 105, peak: 0.18 + power * 0.22, release: 0.42 });
      tone({ type: "sine", from: 470, to: 300, peak: 0.07, release: 0.22 });
      burstOfNoise({ type: "highpass", frequency: 2600, q: 0.7, peak: 0.16, release: 0.04 });
    }),

    // The arrow cutting the air for `seconds`.
    whoosh: play((seconds) => {
      burstOfNoise({ type: "bandpass", frequency: 500, frequencyEnd: 2200, q: 1.3, peak: 0.24, attack: seconds * 0.35, release: seconds * 0.65 });
    }),

    impact: play(() => {
      tone({ type: "sine", from: 120, to: 36, peak: 0.7, release: 0.55 });
      burstOfNoise({ type: "lowpass", frequency: 1400, frequencyEnd: 300, peak: 0.5, release: 0.45 });
      burstOfNoise({ type: "highpass", frequency: 3200, peak: 0.25, release: 0.06 });
    }),

    // A roar plus crackle that runs until fireStop().
    fireStart: play(() => {
      if (fire) return;
      const at = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + 1.4);
      gain.connect(master);
      const roar = ctx.createBufferSource();
      roar.buffer = noise;
      roar.loop = true;
      const roarFilter = ctx.createBiquadFilter();
      roarFilter.type = "lowpass";
      roarFilter.frequency.value = 650;
      const roarGain = ctx.createGain();
      roarGain.gain.value = 0.22;
      roar.connect(roarFilter).connect(roarGain).connect(gain);
      const pops = ctx.createBufferSource();
      pops.buffer = crackle;
      pops.loop = true;
      const popsFilter = ctx.createBiquadFilter();
      popsFilter.type = "highpass";
      popsFilter.frequency.value = 900;
      const popsGain = ctx.createGain();
      popsGain.gain.value = 0.35;
      pops.connect(popsFilter).connect(popsGain).connect(gain);
      roar.start(at);
      pops.start(at, Math.random() * 2);
      fire = { gain, sources: [roar, pops] };
    }),

    fireStop(fadeSeconds = 2.5) {
      if (live()) stopFire(fadeSeconds);
    },

    firework: play(() => {
      tone({ type: "sine", from: 95, to: 38, peak: 0.3, release: 0.7 });
      burstOfNoise({ type: "lowpass", frequency: 700, frequencyEnd: 160, peak: 0.32, release: 0.8 });
      burstOfNoise({ delay: 0.12, type: "highpass", frequency: 3200, q: 0.6, peak: 0.16, attack: 0.02, release: 0.7, buffer: crackle });
    }),

    dispose() {
      if (!ctx) return;
      stopFire(0.05);
      const closing = ctx;
      ctx = null;
      closing.close().catch(() => {});
    },
  };
}
