// Sprite Arena — level data. Pure data + a tiny builder; no THREE, no DOM (the validator loads this in Node).
//
// Authoring model: levels are CHAINS of islands. Each step says which way to go, how wide the gap is, how
// much higher/lower, and what lives on the island. The builder turns that into absolute positions, so gap sizes
// are always deliberate. Jump budget (see sim.js): single jump ≈ 6 wu across / 2.5 up, double jump ≈ 10 wu / 4.6 up.
//   Gap sizes used:  3–5 = easy hop · 6–8 = needs a double jump · spring = big vertical launches.
//
// 1 cell = 2 wu. An island of w×d cells covers [x-w, x+w] × [z-d, z+d] (w,d are also its half-extents in wu).

const DIRS = { f: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] };

export const THEMES = {
  meadow: {
    sky: ['#2f86ff', '#8fd3ff', '#ffe3b4'], fog: '#bfe3ff', fogNear: 55, fogFar: 230,
    hemi: ['#d6ecff', '#7c9a58', 1.25], sun: ['#fff0cf', 3.0, [0.55, 0.62, 0.35]],
    water: ['#1672b8', '#58cde8'], tint: '#ffffff', blocks: 'grass',
    rock: ['#8a6a4a', '#5a4332'], farTop: '#6fbf5a',
    ambient: { kind: 'pollen', count: 90, color: '#ffe98a' }, clouds: true, stars: false,
  },
  frost: {
    sky: ['#071536', '#2a5599', '#bfe0ff'], fog: '#6f93c9', fogNear: 45, fogFar: 200,
    hemi: ['#b5d2ff', '#556a9c', 1.15], sun: ['#c6dcff', 2.1, [-0.4, 0.55, 0.45]],
    water: ['#0a2552', '#2b6fb8'], tint: '#ffffff', blocks: 'snow',
    rock: ['#7d8db0', '#4b5878'], farTop: '#e6f3ff',
    ambient: { kind: 'snow', count: 160, color: '#ffffff' }, clouds: false, stars: true, aurora: true,
  },
  cinder: {
    sky: ['#12050c', '#52161a', '#d4521e'], fog: '#5a2018', fogNear: 35, fogFar: 170,
    hemi: ['#ffb08a', '#7a3020', 1.55], sun: ['#ffa070', 2.6, [0.3, 0.5, 0.6]],
    water: ['#a01a06', '#ff8a2a'], tint: '#e0b8a8', blocks: 'grass',
    rock: ['#3a2a2c', '#1c1214'], farTop: '#5a3a34', lava: true,
    ambient: { kind: 'ember', count: 120, color: '#ffb35a' }, clouds: false, stars: false,
  },
};

function build(meta, def) {
  const L = Object.assign({}, meta, {
    islands: [], movers: [], springs: [], gems: [], hearts: [], enemies: [], saws: [], spikes: [], flags: [],
    goal: null, spawn: null, killY: -26,
  });

  const place = (isl, f, dirKey, index) => {
    L.islands.push({ x: isl.x, z: isl.z, w: isl.w, d: isl.d, y: isl.y, low: !!f.low });
    const top = isl.y;
    const dir = DIRS[dirKey] || DIRS.f;
    if (f.flag) L.flags.push({ x: isl.x + (f.flagDx || 0), y: top, z: isl.z + (f.flagDz || 0) });
    if (f.heart) L.hearts.push({ x: isl.x, y: top + 1.5, z: isl.z });
    if (f.spring) {
      L.springs.push({ x: isl.x + dir[0] * (isl.w - 1.4), y: top, z: isl.z + dir[1] * (isl.d - 1.4), fired: 0 });
    }
    if (f.gems) {
      const along = dir[0] !== 0 ? isl.w : isl.d;
      for (let i = 0; i < f.gems; i += 1) {
        const t = f.gems === 1 ? 0 : (i / (f.gems - 1)) * 2 - 1;
        L.gems.push({ x: isl.x + dir[0] * t * (along - 1.2), y: top + 1.3, z: isl.z + dir[1] * t * (along - 1.2) });
      }
    }
    if (f.enemy) {
      const list = Array.isArray(f.enemy) ? f.enemy : [f.enemy];
      list.forEach((type, i) => {
        const a = (i / list.length) * Math.PI * 2 + 0.6;
        const off = list.length > 1 ? Math.min(isl.w, isl.d) * 0.4 : 0;
        L.enemies.push({ type, x: isl.x + Math.cos(a) * off, y: top, z: isl.z + Math.sin(a) * off, r: Math.max(1.5, Math.min(isl.w, isl.d) - 1.3), isl: index });
      });
    }
    if (f.saw) {
      const s = f.saw;
      const acrossX = dir[0] === 0; // sweep across the direction of travel
      L.saws.push({ x: isl.x, y: top + 0.6, z: isl.z, r: 0.8, axis: acrossX ? 'x' : 'z', range: s.range || (acrossX ? isl.w : isl.d) - 1.2, speed: s.speed || 1.3, phase: s.phase || 0 });
    }
    if (f.spikes) {
      for (let i = 0; i < f.spikes; i += 1) {
        const t = f.spikes === 1 ? 0 : (i / (f.spikes - 1)) * 2 - 1;
        const side = (i % 2 ? 1 : -1) * (f.spikeSide || (dir[0] === 0 ? isl.w - 1.1 : isl.d - 1.1));
        L.spikes.push({ x: isl.x + (dir[0] === 0 ? side : dir[0] * t * (isl.w - 1.4)), y: top + 0.9, z: isl.z + (dir[0] === 0 ? dir[1] * t * (isl.d - 1.4) : side), r: 0.8 });
      }
    }
    if (f.goal) L.goal = { x: isl.x, y: top, z: isl.z };
  };

  // Islands are made of whole 2 wu blocks, so sizes snap to whole cells (collision then matches what is drawn).
  const cells = (v) => Math.max(1, Math.round(v));
  let cur = { x: 0, z: 0, w: cells(def.start.w), d: cells(def.start.d), y: 0 };
  place(cur, def.start, 'f', 0);
  L.spawn = { x: 0, y: 0, z: def.start.spawnZ || 0 };

  def.steps.forEach((st) => {
    const dirKey = st.dir || 'f';
    const dir = DIRS[dirKey];
    const next = { w: cells(st.w || 3), d: cells(st.d || 3), y: cur.y + (st.dy || 0) };
    const alongCur = dir[0] !== 0 ? cur.w : cur.d;
    const alongNext = dir[0] !== 0 ? next.w : next.d;
    const total = alongCur + st.gap + alongNext;
    next.x = cur.x + dir[0] * total + (dir[0] === 0 ? (st.off || 0) : 0);
    next.z = cur.z + dir[1] * total + (dir[1] === 0 ? (st.off || 0) : 0);

    const edge = (isl, sign, along) => ({ x: isl.x + dir[0] * sign * along, z: isl.z + dir[1] * sign * along });
    const a = edge(cur, 1, alongCur);
    const b = edge(next, -1, alongNext);

    if (st.mover) {
      const m = st.mover;
      L.movers.push({
        x: (a.x + b.x) / 2, y: (cur.y + next.y) / 2, z: (a.z + b.z) / 2,
        w: m.w || 1.5, d: m.d || 1.5, axis: m.axis || (dir[0] !== 0 ? 'x' : 'z'),
        range: m.range, speed: m.speed || 0.9, phase: m.phase || 0,
      });
    }
    if (st.arc !== false && !st.mover) {
      const n = st.arc || 5;
      for (let i = 1; i <= n; i += 1) {
        const t = i / (n + 1);
        L.gems.push({
          x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
          y: cur.y + (next.y - cur.y) * t + 1.3 + 1.9 * Math.sin(Math.PI * t),
        });
      }
    }
    cur = next;
    place(cur, st, dirKey, L.islands.length);
  });

  L.gemCount = L.gems.length;
  return L;
}

// ---------------------------------------------------------------------------------------------------------
// 1 — SUNFLOWER ISLES: gentle tutorial. Hops, a spring, a ferry platform.
// ---------------------------------------------------------------------------------------------------------
const L1 = build(
  { id: 'sunflower-isles', name: 'Sunflower Isles', tagline: 'Sunny sky islands. Hop, bite and reach the tube.', theme: 'meadow' },
  {
    start: { w: 4, d: 4, spawnZ: 2.6, gems: 3 },
    steps: [
      { gap: 3.5, w: 3, d: 3 },
      { gap: 4, dy: 2, w: 3, d: 3, enemy: 'ghost' },
      { dir: 'r', gap: 4, w: 2.5, d: 3, flag: true },
      { dir: 'f', gap: 4.5, w: 3, d: 3, off: 3, gems: 3 },
      { gap: 4, w: 2.5, d: 2.5, spring: true },
      { gap: 3.5, dy: 7, w: 3, d: 3, heart: true, flag: true, enemy: 'stump' },
      { dir: 'l', gap: 5, dy: -2, w: 2.5, d: 2.5 },
      { dir: 'f', gap: 9, w: 4, d: 4, mover: { range: 2.4, speed: 0.9 }, enemy: ['ghost', 'ghost'], flag: true },
      { gap: 4, dy: 2, w: 2, d: 2 },
      { gap: 4, dy: 2, w: 2, d: 2, gems: 2 },
      { dir: 'r', gap: 4.5, dy: 0, w: 2, d: 2, spikes: 2 },
      { dir: 'f', gap: 4, dy: 1, w: 3, d: 3, flag: true, heart: true },
      { gap: 5, dy: 0, w: 5, d: 5, goal: true },
    ],
  },
);

// ---------------------------------------------------------------------------------------------------------
// 2 — FROSTLINE HEIGHTS: night aurora. Saws, wider gaps (double jump), a lift, spike fields.
// ---------------------------------------------------------------------------------------------------------
const L2 = build(
  { id: 'frostline-heights', name: 'Frostline Heights', tagline: 'Aurora night. Saws, lifts and long jumps.', theme: 'frost' },
  {
    start: { w: 4, d: 4, spawnZ: 2.6, gems: 3 },
    steps: [
      { gap: 4, w: 3, d: 3, enemy: 'yeti' },
      { gap: 6.5, dy: 0, w: 3, d: 3, gems: 2 },
      { gap: 4, dy: 2, w: 4, d: 3, saw: { speed: 1.2 }, flag: true },
      { dir: 'l', gap: 5, w: 2.5, d: 3 },
      { dir: 'f', gap: 12, dy: 0, w: 3, d: 3, mover: { range: 3.4, speed: 0.8 }, spikes: 2 },
      { gap: 4, dy: 2, w: 2, d: 2 },
      { gap: 7, dy: 2, w: 2.5, d: 2.5, heart: true },
      { dir: 'r', gap: 4.5, w: 4, d: 3, saw: { speed: 1.5, phase: 1.2 }, enemy: 'yeti', flag: true },
      { dir: 'f', gap: 6, dy: 0, w: 2.5, d: 2.5, off: 2 },
      { gap: 6.5, dy: 2, w: 2.5, d: 2.5, spring: true },
      { gap: 3, dy: 7, w: 3, d: 3, enemy: ['yeti', 'ghost'], gems: 3, flag: true },
      { dir: 'l', gap: 5, dy: -2, w: 3, d: 3, spikes: 3 },
      { gap: 7, dy: 0, w: 2, d: 2 },
      { gap: 6, dy: 2, w: 2, d: 2 },
      { dir: 'f', gap: 5, dy: 0, w: 4, d: 4, saw: { speed: 1.7 }, enemy: ['ghost', 'yeti'], flag: true, heart: true },
      { gap: 5, dy: 1, w: 5.5, d: 5.5, goal: true },
    ],
  },
);

// ---------------------------------------------------------------------------------------------------------
// 3 — CINDER ISLES: finale. Lava below, long double-jump gaps, vertical lift, gauntlets, arena at the tube.
// ---------------------------------------------------------------------------------------------------------
const L3 = build(
  { id: 'cinder-isles', name: 'Cinder Isles', tagline: 'Volcanic islands. Don’t look down.', theme: 'cinder' },
  {
    start: { w: 4, d: 4, spawnZ: 2.6, gems: 3 },
    steps: [
      { gap: 4, w: 3, d: 3, enemy: 'cthulhu' },
      { gap: 6, dy: 0, w: 2.5, d: 2.5 },
      { gap: 6, dy: 2, w: 2.5, d: 2.5, spikes: 2 },
      { dir: 'r', gap: 5, w: 4, d: 3, saw: { speed: 1.6 }, flag: true },
      { dir: 'f', gap: 7, dy: 0, w: 2, d: 2 },
      { gap: 8, dy: 1, w: 2, d: 2 },
      { gap: 10, dy: 0, w: 3.5, d: 3.5, mover: { range: 3, speed: 1 }, enemy: ['cthulhu', 'alien'], flag: true, heart: true },
      { dir: 'l', gap: 4.5, dy: 2, w: 2, d: 2, gems: 2 },
      { gap: 4.5, dy: 2, w: 2, d: 2, spring: true },
      { gap: 3, dy: 9, w: 3, d: 3, saw: { speed: 1.4 }, flag: true },
      { dir: 'f', gap: 5.5, dy: -2, w: 2, d: 2, off: -2, spikes: 2 },
      { gap: 8, dy: 0, w: 2, d: 2 },
      { gap: 8, dy: 0, w: 2, d: 2 },
      { dir: 'r', gap: 5, dy: 0, w: 4, d: 4, enemy: ['stump', 'cthulhu', 'alien'], saw: { speed: 1.9 }, flag: true, heart: true },
      { dir: 'f', gap: 5, dy: 2, w: 2.5, d: 2.5, spikes: 2 },
      { gap: 6, dy: 0, w: 2.5, d: 2.5 },
      { gap: 5, dy: 1, w: 6, d: 6, enemy: ['stump', 'alien', 'cthulhu'], goal: true, flag: true },
    ],
  },
);

export const LEVELS = [L1, L2, L3];
