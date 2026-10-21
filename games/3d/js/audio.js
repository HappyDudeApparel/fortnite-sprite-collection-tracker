// Tiny synthesized sound effects (no files). Starts after the first user gesture.
let ctx = null, master = null, muted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch (_) { ctx = null; }
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.35; }
export function isMuted() { return muted; }

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.4, lp = 2200, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

export const sfx = {
  jump: () => tone(300, 0.16, 'square', 0.18, 620),
  jump2: () => tone(420, 0.18, 'square', 0.18, 900),
  land: () => noise(0.08, 0.18, 900),
  gem: () => { tone(880, 0.1, 'triangle', 0.35); tone(1320, 0.16, 'triangle', 0.3, null, 0.07); },
  heart: () => { tone(520, 0.12, 'sine', 0.4); tone(780, 0.2, 'sine', 0.4, null, 0.1); },
  bite: () => { noise(0.12, 0.35, 3000); tone(160, 0.12, 'sawtooth', 0.25, 70); },
  hit: () => { tone(220, 0.25, 'sawtooth', 0.35, 70); noise(0.15, 0.3, 1200); },
  defeat: () => { tone(500, 0.2, 'square', 0.25, 120); noise(0.2, 0.3, 2500); },
  spring: () => tone(180, 0.35, 'sine', 0.5, 900),
  flag: () => { tone(660, 0.12, 'triangle', 0.35); tone(990, 0.12, 'triangle', 0.35, null, 0.1); tone(1320, 0.25, 'triangle', 0.35, null, 0.2); },
  fall: () => tone(400, 0.5, 'sine', 0.4, 60),
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.4, null, i * 0.11)); },
  click: () => tone(700, 0.06, 'square', 0.15),
};
