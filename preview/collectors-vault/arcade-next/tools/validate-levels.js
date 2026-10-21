#!/usr/bin/env node
/* Level validator for the Sprite Arcade 2D level pack — NEXT edition (adds element-field state search).
 *
 * Everything below the "state search" banner is new; the rest is the known-good validator, unchanged.
 * Levels with a `tide` block are solved over (water level, Sprite class): each class may use only the devices its
 * powers can trigger, and a device counts as usable when a reached standing spot is within its range.
 * Static ground reached in one water state is carried into the next (the player keeps standing there).
 *   node validate-levels.js [levelNumber] [--struct] [--mutate]
 *
 *
 *   node preview/collectors-vault/arcade/tools/validate-levels.js [levelNumber] [--struct]
 *   --struct skips the (slow) reachability search and only runs the structural checks.
 *
 * 1. Structural checks: enemies, checkpoints, tube, pads and hazards sit on real ground; gems are in free space.
 * 2. Reachability: the game's own physics constants and collision rules are replayed headlessly. From every
 *    standing spot we try walking, jumping, double jumping, and every pad, with moving platforms sampled at
 *    random phases. The tube and every gem must be reachable from the spawn point, otherwise this exits non-zero.
 *
 * Brick walls, boulders and crystals are treated as passable because every Sprite power destroys them.
 */
'use strict';
const path = require('path');
const LEVELS = require(path.join(__dirname, '..', '2d', 'levels.js'));
const Fields = require(path.join(__dirname, '..', '2d', 'fields.js'));
require(path.join(__dirname, '..', '2d', 'levels-next.js')); // appends the preview levels to the same array

// ---- constants mirrored from 2d/index.html -------------------------------------------------
const H = 540, GRAVITY = 1420, MAX_FALL = 780, DT = 1 / 60;
const PW = 34, PH = 50, JUMP_V = -510, RUN = 225, PAD_BOOST_TIME = 0.35;
const ACCEL_GROUND = 1850, ACCEL_AIR = 1080, ACCEL_SLICK = 520;
const COYOTE = 0.12, GEM_RADIUS = 34;

const rects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const moveToward = (v, t, a) => (v < t ? Math.min(v + a, t) : Math.max(v - a, t));

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function problems(level, index) {
  const out = [];
  const top = (x, ys) => level.platforms.filter((p) => !p.mover && x >= p.x && x <= p.x + p.w).map((p) => p.y).filter((y) => ys === undefined || Math.abs(y - ys) < 1.5);
  const need = (label, x, y) => { if (!top(x, y).length) out.push(`${label} at x=${x} is not standing on a platform top at y=${y}`); };
  level.checkpoints.forEach((c, i) => need(`checkpoint ${i}`, c.x, c.y + 58));
  level.enemies.forEach((e, i) => {
    for (let x = e.min; x <= e.max; x += 20) need(`enemy ${i} patrol`, x, e.y + 58);
    if (e.x < e.min || e.x > e.max) out.push(`enemy ${i} starts outside its patrol range`);
  });
  need('tube base', level.tube.x, level.tube.y + 105);
  level.pads.forEach((p, i) => { need(`pad ${i} left`, p.x, p.y + 14); need(`pad ${i} right`, p.x + p.w, p.y + 14); });
  level.hazards.forEach((h, i) => {
    if (level.platforms.some((p) => !p.mover && h.x + 2 < p.x + p.w && h.x + h.w - 2 > p.x && h.y + h.h - 2 > p.y + 4 && h.y + 2 < p.y + p.h)) out.push(`hazard ${i} at x=${h.x} is buried inside a platform`);
  });
  level.gems.forEach((g, i) => {
    if (level.platforms.some((p) => g.x > p.x - 6 && g.x < p.x + p.w + 6 && g.y > p.y - 6 && g.y < p.y + p.h + 6)) out.push(`gem ${i} (${g.x},${g.y}) is inside a platform`);
    if (g.x < 0 || g.x > level.worldW) out.push(`gem ${i} is outside the world`);
  });
  // Props must not overlap each other: bricks/boulders/crystals vs pads, hazards, the tube and enemy patrols.
  const ox = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x;
  level.objects.forEach((o, i) => {
    level.pads.forEach((pd, j) => { if (ox(o, pd) && o.y + o.h > pd.y - 4 && o.y < pd.y + pd.h) out.push(`object ${i} (${o.type} x=${o.x}) overlaps pad ${j}`); });
    level.hazards.forEach((hz, j) => { if (hz.type !== 'lava' && ox(o, hz) && o.y + o.h > hz.y && o.y < hz.y + hz.h) out.push(`object ${i} (${o.type} x=${o.x}) overlaps hazard ${j}`); });
    level.enemies.forEach((e, j) => { if (o.x < e.max + 24 && o.x + o.w > e.min - 24 && o.y < e.y + 26 && o.y + o.h > e.y - 26) out.push(`object ${i} (${o.type} x=${o.x}) is inside enemy ${j}'s patrol ${e.min}-${e.max}`); });
    if (o.x < level.tube.x + 70 && o.x + o.w > level.tube.x - 70) out.push(`object ${i} (${o.type} x=${o.x}) is blocking the tube`);
  });
  level.pads.forEach((pd, i) => level.hazards.forEach((hz, j) => { if (hz.type !== 'lava' && ox(pd, hz) && pd.y + pd.h > hz.y && pd.y < hz.y + hz.h) out.push(`pad ${i} overlaps hazard ${j}`); }));
  if (level.tube.x > level.worldW - 90) out.push('tube too close to world edge');
  const spawn = level.spawn;
  if (!top(spawn.x).length) out.push('spawn is not above a platform');
  return out.map((m) => `L${index + 1} ${level.name}: ${m}`);
}

// ---- physics replay -----------------------------------------------------------------------
function buildWorld(level, rng) {
  // Fresh platform list; each mover is placed at a random phase of its cycle.
  return level.platforms.map((p, id) => {
    if (p.active === false) return { id, x: -1e6, y: -1e6, w: 0, h: 0, slick: false, mover: false, off: true };
    const q = { id, x: p.x, y: p.y, w: p.w, h: p.h, slick: !!p.slick, mover: !!p.mover };
    if (p.mover) {
      const off = Math.sin(rng() * Math.PI * 2) * p.mover.range;
      if (p.mover.axis === 'x') q.x = p.x + off; else q.y = p.y + off;
    }
    return q;
  });
}

function resolveH(e, oldX, solids) {
  const body = { x: e.x - PW / 2, y: e.y - PH / 2, w: PW, h: PH };
  for (const s of solids) {
    if (!rects(body, s)) continue;
    if (e.vx > 0 && oldX + PW / 2 <= s.x + 8) { e.x = s.x - PW / 2; e.vx = 0; }
    else if (e.vx < 0 && oldX - PW / 2 >= s.x + s.w - 8) { e.x = s.x + s.w + PW / 2; e.vx = 0; }
    body.x = e.x - PW / 2;
  }
}

function resolveV(e, oldY, solids) {
  e.grounded = false; e.standing = null;
  const body = { x: e.x - PW / 2, y: e.y - PH / 2, w: PW, h: PH };
  for (const s of solids) {
    if (!rects(body, s)) continue;
    if (e.vy >= 0 && oldY + PH / 2 <= s.y + 12) { e.y = s.y - PH / 2; e.vy = 0; e.grounded = true; e.standing = s; }
    else if (e.vy < 0 && oldY - PH / 2 >= s.y + s.h - 10) { e.y = s.y + s.h + PH / 2; e.vy = 0; }
    body.y = e.y - PH / 2;
  }
}

/**
 * Replay one scripted attempt from a standing start.
 * plan = { dir, run, hold, dj, dir2 }: hold direction `dir`, press jump after `run` frames, keep it held for `hold`
 * frames, press jump again `dj` frames later (or never if -1), then steer `dir2`.
 * Returns the landing {surf, x} (or null if it died / never landed). Touched gems/tube are recorded in `acc`.
 */
function attempt(level, world, start, plan, acc, tubeZone) {
  const e = { x: start.x, y: start.y, vx: 0, vy: 0, grounded: true, standing: start.surf, coyote: COYOTE, airJumps: 1, padTime: 0 };
  let jumpedAt = -1, doubled = false, wasAir = false;
  for (let frame = 0; frame < 220; frame += 1) {
    const dir = doubled ? plan.dir2 : plan.dir;
    const jumpHeld = jumpedAt >= 0 && frame - jumpedAt < plan.hold;
    const press = (jumpedAt < 0 && frame === plan.run) || (plan.dj >= 0 && jumpedAt >= 0 && !doubled && frame === jumpedAt + plan.dj);
    e.coyote = e.grounded ? COYOTE : Math.max(0, e.coyote - DT);
    e.padTime = Math.max(0, e.padTime - DT);
    const slick = e.grounded && e.standing && e.standing.slick;
    e.vx = moveToward(e.vx, dir * RUN, (e.grounded ? (slick ? ACCEL_SLICK : ACCEL_GROUND) : ACCEL_AIR) * DT);
    if (press && (e.coyote > 0 || e.airJumps > 0)) {
      if (e.coyote <= 0) { e.airJumps -= 1; doubled = true; }
      e.vy = JUMP_V; e.grounded = false; e.coyote = 0;
      if (jumpedAt < 0) jumpedAt = frame;
    }
    if (!jumpHeld && e.padTime <= 0 && e.vy < -160) e.vy += GRAVITY * 1.4 * DT;
    e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * DT);
    const oldX = e.x;
    e.x = Math.max(PW / 2, Math.min(level.worldW - PW / 2, e.x + e.vx * DT));
    resolveH(e, oldX, world);
    const oldY = e.y;
    e.y += e.vy * DT;
    resolveV(e, oldY, world);
    if (e.grounded) e.airJumps = 1;
    let body = { x: e.x - PW / 2, y: e.y - PH / 2, w: PW, h: PH };
    for (const pd of level.pads) {
      if (e.vy >= 0 && rects(body, { x: pd.x, y: pd.y - 4, w: pd.w, h: pd.h + 4 })) {
        e.vy = -pd.power; e.grounded = false; e.standing = null; e.airJumps = 1; e.padTime = PAD_BOOST_TIME;
        if (jumpedAt < 0) jumpedAt = frame;
      }
    }
    body = { x: e.x - PW / 2, y: e.y - PH / 2, w: PW, h: PH };
    if (e.y > H + 110) return null;
    for (const hz of level.hazards) if (rects(body, hz)) return null;
    for (let i = 0; i < level.gems.length; i += 1) {
      if (Math.hypot(e.x - level.gems[i].x, e.y - level.gems[i].y) < GEM_RADIUS) acc.gems.add(i);
    }
    if (rects(body, tubeZone)) acc.tube = true;
    if (!e.grounded) wasAir = true;
    else if (wasAir) return { surf: e.standing, x: e.x };
  }
  return null;
}

function reachability(level, rng, extraSeeds = []) {
  const tubeZone = { x: level.tube.x - 48, y: level.tube.y - 84, w: 96, h: 168 };
  const acc = { gems: new Set(), tube: false };
  const seen = new Set();
  const reachedSurfaces = new Set();
  const queue = [];
  const nodeList = [];
  const hasMovers = level.platforms.some((p) => p.mover);
  const staticWorld = buildWorld(level, makeRng(1));

  const push = (id, relX) => {
    const k = `${id}:${Math.round(relX / 16)}`;
    if (seen.has(k)) return;
    seen.add(k); queue.push({ id, relX }); nodeList.push({ id, relX });
  };
  const reach = (surf, x) => {
    push(surf.id, x - surf.x);
    if (reachedSurfaces.has(surf.id)) return;
    reachedSurfaces.add(surf.id);
    // The whole surface is walkable: seed standing spots along it and at both edges.
    const w = staticWorld[surf.id].w;
    for (let r = 8; r < w; r += 48) push(surf.id, r);
    push(surf.id, w - 8);
  };

  // Spawn: drop onto whatever is below.
  const dropWorld = buildWorld(level, makeRng(7));
  const drop = { x: level.spawn.x, y: level.spawn.y, vx: 0, vy: 0, grounded: false };
  for (let i = 0; i < 160 && !drop.grounded; i += 1) {
    drop.vy = Math.min(MAX_FALL, drop.vy + GRAVITY * DT);
    const oy = drop.y; drop.y += drop.vy * DT; resolveV(drop, oy, dropWorld);
  }
  if (!drop.grounded) return { error: 'spawn never lands on a platform' };
  reach(drop.standing, drop.x);
  for (const s of extraSeeds) { const surf = staticWorld[s.id]; if (surf && surf.w > 0) reach(surf, surf.x + s.relX); }

  const plans = [];
  for (const dir of [1, -1, 0]) {
    for (const run of [0, 12, 40]) {
      for (const hold of [8, 60]) {
        for (const dj of [-1, 10, 20, 30, 42]) {
          for (const dir2 of dir === 0 ? [1, -1] : [dir, 0]) plans.push({ dir, run, hold, dj, dir2 });
        }
      }
    }
  }

  while (queue.length) {
    const node = queue.shift();
    const configs = hasMovers ? 6 : 1;
    for (let c = 0; c < configs; c += 1) {
      const world = hasMovers ? buildWorld(level, rng) : staticWorld;
      const surf = world[node.id];
      const start = { x: surf.x + node.relX, y: surf.y - PH / 2, surf };
      for (const plan of plans) {
        const landed = attempt(level, world, start, plan, acc, tubeZone);
        if (landed && landed.surf) reach(landed.surf, landed.x);
      }
    }
  }
  return { tubeReached: acc.tube, gemsHit: acc.gems, nodes: seen.size, nodeList, staticWorld };
}


// ---- state search (element fields) ----------------------------------------------------------
const DEVICE_RANGE_X = 340, DEVICE_RANGE_Y = 120;

/** The level as it stands in one water state: gated platforms/hazards switched, floaters moved. */
function deriveLevel(level, levels) {
  return Object.assign({}, level, { platforms: Fields.platformsAt(level, levels), hazards: Fields.hazardsAt(level, levels) });
}

function deviceUsable(world, nodes, device) {
  const cx = device.x + device.w / 2, cy = device.y + device.h / 2;
  return nodes.some((n) => {
    const s = world[n.id];
    return s && s.w > 0 && Math.abs(s.x + n.relX - cx) <= DEVICE_RANGE_X && Math.abs((s.y - PH / 2) - cy) <= DEVICE_RANGE_Y;
  });
}

function solveTide(level, cls, seed) {
  const sample = Fields.CLASS_SAMPLE[cls];
  const keyOf = (lv) => JSON.stringify(lv);
  const start = Fields.initialLevels(level);
  const states = new Map([[keyOf(start), { levels: start, seeds: new Map(), runs: 0 }]]);
  const work = [keyOf(start)];
  const out = { cls, tube: false, gems: new Set(), states: [], reachedStates: new Set() };
  let guard = 0;
  while (work.length && guard++ < 200) {
    const k = work.shift();
    const st = states.get(k);
    st.runs += 1;
    const lv = deriveLevel(level, st.levels);
    const res = reachability(lv, makeRng(seed + st.runs), [...st.seeds.values()]);
    if (res.error) { out.error = res.error; return out; }
    out.reachedStates.add(k);
    if (res.tubeReached) out.tube = true;
    res.gemsHit.forEach((g) => out.gems.add(g));
    out.states.push(`${k}:${res.tubeReached ? 'tube' : '-'}`);
    const carry = res.nodeList.filter((n) => { const p = level.platforms[n.id]; return p && !p.float && !p.when && !p.mover; });
    for (const device of Fields.devicesOf(level)) {
      if (!Fields.accepts(device, sample)) continue;
      if (!deviceUsable(res.staticWorld, res.nodeList, device)) continue;
      const next = Fields.applyDevice(level, st.levels, device, sample);
      if (next === st.levels) continue;
      const nk = keyOf(next);
      let target = states.get(nk);
      let grew = false;
      if (!target) { target = { levels: next, seeds: new Map(), runs: 0 }; states.set(nk, target); grew = true; }
      for (const n of carry) { const sk = `${n.id}:${Math.round(n.relX / 16)}`; if (!target.seeds.has(sk)) { target.seeds.set(sk, n); grew = true; } }
      if (grew && !work.includes(nk)) work.push(nk);
    }
  }
  return out;
}

function checkTideLevel(level, index, quiet) {
  const results = {};
  let ok = true;
  const allGems = new Set();
  for (const cls of Object.keys(Fields.CLASSES)) {
    const r = solveTide(level, cls, 9000 + index);
    results[cls] = r;
    r.gems.forEach((g) => allGems.add(g));
    if (r.error || !r.tube) ok = false;
  }
  const missing = level.gems.map((g, i) => (allGems.has(i) ? null : i)).filter((v) => v !== null);
  if (missing.length) ok = false;
  if (!quiet) {
    for (const cls of Object.keys(results)) {
      const r = results[cls];
      console.log(`   class ${cls.padEnd(6)} (${Fields.CLASS_SAMPLE[cls]}): tube ${r.tube ? 'reachable' : 'UNREACHABLE'}, gems ${r.gems.size}/${level.gems.length}, water states ${r.reachedStates.size}`);
    }
    if (missing.length) console.log('   gems no class can reach:', missing.map((i) => `#${i}(${level.gems[i].x},${level.gems[i].y})`).join(' '));
  }
  return { ok, results, missing };
}

/** Break the room on purpose; the checker must notice. expect = which classes should still reach the tube. */
function mutationTests() {
  const base = LEVELS.find((l) => l.tide);
  const clone = () => JSON.parse(JSON.stringify(base));
  const tests = [
    ['intact room', (l) => l, { raiser: true, other: true }],
    ['no drain valve (other Sprites lose their route)', (l) => { l.objects = l.objects.filter((o) => o.device !== 'valve'); return l; }, { raiser: true, other: false }],
    ['no inlet (flood route gone, drain route remains)', (l) => { l.objects = l.objects.filter((o) => o.device !== 'inlet'); return l; }, { raiser: true, other: true }],
    ['no devices at all', (l) => { l.objects = []; return l; }, { raiser: false, other: false }],
    ['valve moved out of reach', (l) => { l.objects.find((o) => o.device === 'valve').x = 2100; return l; }, { raiser: true, other: false }],
    ['dam raised beyond the flooded dock', (l) => { const d = l.platforms.find((p) => p.x === 1000 && p.w === 200); d.y = 60; d.h = 410; return l; }, { raiser: true, other: true }],
    ['dry bed removed (no tunnel) and dam too tall to flood', (l) => { l.platforms = l.platforms.filter((p) => !(p.when && p.when.max === 0)); const d = l.platforms.find((p) => p.x === 1000 && p.w === 200); d.y = 60; d.h = 410; return l; }, { raiser: false, other: false }],
    ['dock removed (flood route gone, gems on the dam unreachable)', (l) => { l.platforms = l.platforms.filter((p) => !p.float); return l; }, { raiser: true, other: true, gemsOnDam: false }],
  ];
  let failed = false;
  tests.forEach(([name, fn, expect], i) => {
    const level = fn(clone());
    const r = checkTideLevel(level, 100 + i, true);
    let good = true;
    for (const cls of Object.keys(expect).filter((k) => k !== 'gemsOnDam')) if (!!r.results[cls].tube !== expect[cls]) good = false;
    if (expect.gemsOnDam === false) {
      const damGems = level.gems.map((g, gi) => (g.y < 200 ? gi : -1)).filter((gi) => gi >= 0);
      const reached = new Set([...r.results.raiser.gems, ...r.results.other.gems]);
      if (damGems.some((gi) => reached.has(gi))) good = false;
    }
    console.log(`${good ? 'PASS' : 'FAIL'} mutation: ${name}`);
    if (!good) failed = true;
  });
  return !failed;
}

function main() {
  const args = process.argv.slice(2);
  const structOnly = args.includes('--struct');
  if (args.includes('--mutate')) process.exit(mutationTests() ? 0 : 1);
  const numeric = args.find((a) => /^\d+$/.test(a));
  const only = numeric ? Number(numeric) - 1 : null;
  let failed = false;
  LEVELS.forEach((level, index) => {
    if (only !== null && index !== only) return;
    const issues = problems(level, index);
    issues.forEach((m) => console.log('  STRUCT', m));
    if (issues.length) failed = true;
    if (structOnly) { console.log(`${issues.length ? 'FAIL' : 'PASS'} L${index + 1} ${level.name}: structure (${issues.length} issues)`); return; }
    const t0 = Date.now();
    if (level.tide) {
      const t = checkTideLevel(level, index);
      console.log(`${t.ok && !issues.length ? 'PASS' : 'FAIL'} L${index + 1} ${level.name}: ${t.ok ? 'every Sprite class can finish' : 'NOT solvable for every class'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      if (!t.ok) failed = true;
      return;
    }
    const r = reachability(level, makeRng(1234 + index));
    if (r.error) { console.log(`L${index + 1} ${level.name}: ${r.error}`); failed = true; return; }
    const missing = level.gems.map((g, i) => (r.gemsHit.has(i) ? null : i)).filter((v) => v !== null);
    const ok = r.tubeReached && missing.length === 0 && !issues.length;
    console.log(`${ok ? 'PASS' : 'FAIL'} L${index + 1} ${level.name}: tube ${r.tubeReached ? 'reachable' : 'UNREACHABLE'}, gems ${level.gems.length - missing.length}/${level.gems.length}, ${r.nodes} standing spots, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (missing.length) console.log('   unreachable gems:', missing.map((i) => `#${i}(${level.gems[i].x},${level.gems[i].y})`).join(' '));
    if (!ok) failed = true;
  });
  process.exit(failed ? 1 : 0);
}
main();
