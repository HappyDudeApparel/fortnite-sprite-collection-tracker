#!/usr/bin/env node
/* Sprite Arena (3D) level validator.
 *
 *   node preview/collectors-vault/arcade/tools/validate-3d-levels.mjs [levelNumber] [--struct]
 *
 * Replays the game's own player physics (3d/js/sim.js — the same file the browser runs) from every standing spot,
 * trying jumps, double jumps, springs and moving platforms at random phases. It fails unless the goal tube and every
 * gem are reachable from the spawn point. Saws are not simulated (they are timing hazards); spike blocks are avoided.
 * Monsters are ignored (they can be bitten or stomped).
 */
import { LEVELS } from '../3d/js/levels.js';
import { ENEMIES } from '../3d/js/roster.js';
import { ARRIVAL_DEPTH, MIN_HALF, AREA_PER_ENEMY, minAlong, minHalfFor, freeArea, enemyBounds, onIsland as onIslandRule } from '../3d/js/rules.js';
import { P, makePlayer, makeSolid, stepPlayer, applySprings, moverOffset, hazardHit } from '../3d/js/sim.js';

const DT = 1 / 60, GEM_R = 1.5;
const args = process.argv.slice(2);
const structOnly = args.includes('--struct');
const only = args.find((a) => /^\d+$/.test(a));

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildSolids(level, rand) {
  const solids = [];
  level.islands.forEach((i, idx) => solids.push(makeSolid(i.x - i.w, i.x + i.w, i.y - (i.low ? 1 : 2), i.y, i.z - i.d, i.z + i.d, { id: 'i' + idx, kind: 'island', idx })));
  level.movers.forEach((m, idx) => {
    const o = moverOffset(m, rand() * 100);
    const x = m.x + o[0], y = m.y + o[1], z = m.z + o[2];
    solids.push(makeSolid(x - m.w, x + m.w, y - 0.6, y, z - m.d, z + m.d, { id: 'm' + idx, kind: 'mover', idx }));
  });
  return solids;
}

/** Fairness rules (see 3d/js/rules.js): landings big enough, monsters and hazards out of the landing pocket. */
export function fairness(level) {
  const out = [];
  const depthFromArrival = (q, x, z) => {
    if (!q.arrive) return Infinity;
    const along = q.arrive[0] !== 0 ? q.w : q.d;
    return (x - q.x) * q.arrive[0] + (z - q.z) * q.arrive[1] + along;
  };
  level.islands.forEach((q, a) => {
    const tag = `island ${a}`;
    if (q.w < MIN_HALF || q.d < MIN_HALF) out.push(`${tag} is ${2 * q.w}x${2 * q.d} wu: landings must be at least ${2 * MIN_HALF}x${2 * MIN_HALF}`);
    if (q.arrive) {
      const along = q.arrive[0] !== 0 ? q.w : q.d;
      if (along < minAlong(q.gap)) out.push(`${tag} is only ${2 * along} wu deep for a ${q.gap} wu jump (needs ${2 * minAlong(q.gap)})`);
    }
    const mons = level.enemies.filter((e) => e.isl === a);
    const saws = level.saws.filter((s) => onIslandRule(q, s.x, s.z, 0.5));
    const need = minHalfFor(mons.length, saws.length > 0);
    if ((mons.length || saws.length) && (q.w < need || q.d < need)) out.push(`${tag} hosts ${mons.length} monster(s)${saws.length ? ' and a saw' : ''} but is ${2 * q.w}x${2 * q.d} (needs ${2 * need}x${2 * need})`);
    if (mons.length && freeArea(q) < AREA_PER_ENEMY * mons.length) out.push(`${tag} has ${Math.round(freeArea(q))} wu² free for ${mons.length} monster(s) (needs ${AREA_PER_ENEMY * mons.length})`);
    for (const e of mons) {
      const b = enemyBounds(q, ENEMIES[e.type]);
      if (b.x1 - b.x0 < 1.5 || b.z1 - b.z0 < 1.5) out.push(`${tag}: ${e.type} has almost no room to patrol (${(b.x1 - b.x0).toFixed(1)}x${(b.z1 - b.z0).toFixed(1)})`);
      if (e.x < b.x0 - 0.01 || e.x > b.x1 + 0.01 || e.z < b.z0 - 0.01 || e.z > b.z1 + 0.01) out.push(`${tag}: ${e.type} starts outside its patrol area`);
      if (q.arrive) {
        const reach = ENEMIES[e.type].radius + P.radius;
        const depth = depthFromArrival(q, b.x0 + (q.arrive[0] > 0 ? 0 : (b.x1 - b.x0)), b.z0);
        void depth;
        // Closest the monster can ever be to the landing edge, minus its reach, must clear the pocket.
        const nearest = q.arrive[0] > 0 ? b.x0 - (q.x - q.w) : q.arrive[0] < 0 ? (q.x + q.w) - b.x1 : q.arrive[1] > 0 ? b.z0 - (q.z - q.d) : (q.z + q.d) - b.z1;
        if (nearest - reach < ARRIVAL_DEPTH - 0.01) out.push(`${tag}: ${e.type} can get within ${(nearest - reach).toFixed(1)} wu of the landing edge (pocket is ${ARRIVAL_DEPTH})`);
      }
    }
    for (const sp of level.spikes) if (onIslandRule(q, sp.x, sp.z, 0.3) && depthFromArrival(q, sp.x, sp.z) - sp.r < ARRIVAL_DEPTH) out.push(`${tag}: a spike block sits inside the landing pocket`);
    for (const sw of saws) if (depthFromArrival(q, sw.x, sw.z) - sw.r < ARRIVAL_DEPTH) out.push(`${tag}: a saw sits inside the landing pocket`);
  });
  return out;
}

function structure(level, n) {
  const out = [];
  const isl = level.islands;
  for (let a = 0; a < isl.length; a += 1) {
    for (let b = a + 1; b < isl.length; b += 1) {
      const A = isl[a], B = isl[b];
      if (Math.abs(A.x - B.x) < A.w + B.w + 0.8 && Math.abs(A.z - B.z) < A.d + B.d + 0.8 && Math.abs(A.y - B.y) < 3) out.push(`islands ${a} and ${b} overlap/touch`);
    }
  }
  const onIsland = (p, slack = 0.01) => isl.some((i) => Math.abs(p.x - i.x) <= i.w + slack && Math.abs(p.z - i.z) <= i.d + slack && Math.abs(p.y - i.y) < 0.8);
  level.flags.forEach((f, i) => { if (!onIsland(f)) out.push(`flag ${i} is not on an island`); });
  level.enemies.forEach((e, i) => { if (!onIsland(e)) out.push(`enemy ${i} (${e.type}) is not on an island`); });
  level.springs.forEach((s, i) => { if (!onIsland(s, 0.2)) out.push(`spring ${i} is not on an island`); });
  if (!level.goal) out.push('no goal');
  out.push(...fairness(level));
  level.gems.forEach((g, i) => {
    if (isl.some((q) => Math.abs(g.x - q.x) < q.w && Math.abs(g.z - q.z) < q.d && g.y < q.y + 0.4 && g.y > q.y - 2)) out.push(`gem ${i} is inside an island`);
  });
  return out.map((m) => `L${n} ${level.name}: ${m}`);
}

function reachability(level, seed) {
  const rand = rng(seed);
  const gemsHit = new Set();
  let tube = false;
  const springsTpl = level.springs;
  const spikes = level.spikes;
  const hasMovers = level.movers.length > 0;
  const nearMover = (x, z) => level.movers.some((m) => Math.hypot(m.x - x, m.z - z) < m.range + 14);
  const goal = level.goal;
  const seen = new Set();
  const queue = [];

  const key = (id, x, z) => `${id}:${Math.round(x / 1.6)}:${Math.round(z / 1.6)}`;
  const push = (surface, x, z) => { const k = key(surface.id, x, z); if (!seen.has(k)) { seen.add(k); queue.push({ id: surface.id, x, z, relx: x - (surface.x0 + surface.x1) / 2, relz: z - (surface.z0 + surface.z1) / 2 }); } };

  const seeded = new Set();
  const seedSurface = (surface) => {
    if (seeded.has(surface.id)) return;
    seeded.add(surface.id);
    const x0 = surface.x0 + 0.2, x1 = surface.x1 - 0.2, z0 = surface.z0 + 0.2, z1 = surface.z1 - 0.2;
    const nx = Math.max(1, Math.round((x1 - x0) / 1.6)), nz = Math.max(1, Math.round((z1 - z0) / 1.6));
    for (let i = 0; i <= nx; i += 1) for (let j = 0; j <= nz; j += 1) push(surface, x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz);
  };

  // spawn drop
  {
    const solids = buildSolids(level, rng(5));
    const s = makePlayer(level.spawn.x, level.spawn.y + 6, level.spawn.z);
    for (let i = 0; i < 200 && !s.grounded; i += 1) stepPlayer(s, { mx: 0, mz: 0, jump: false, jumpHeld: false }, solids, DT);
    if (!s.grounded) return { error: 'spawn does not land' };
    seedSurface(s.standing); push(s.standing, s.x, s.z);
  }

  const dirs = [];
  for (let k = 0; k < 16; k += 1) dirs.push([Math.cos((k / 16) * Math.PI * 2), Math.sin((k / 16) * Math.PI * 2)]);
  const plans = [];
  for (const d of dirs) for (const run of [0, 8, 20]) for (const dj of [-1, 12, 22, 34]) for (const keep of [true, false]) {
    if (!keep && dj < 0) continue;
    plans.push({ d, run, dj, keep });
  }
  // also a straight-up / stationary jump family
  for (const run of [0]) for (const dj of [-1, 14, 28]) plans.push({ d: [0, 0], run, dj, keep: true });

  const attempt = (solids, springs, start, plan) => {
    const s = makePlayer(start.x, start.y, start.z);
    s.grounded = true; s.standing = start.surface;
    let jumpedAt = -1, doubled = false, wasAir = false;
    for (let f = 0; f < 240; f += 1) {
      const d = doubled && !plan.keep ? [0, 0] : plan.d;
      const press = (jumpedAt < 0 && f === plan.run) || (plan.dj >= 0 && jumpedAt >= 0 && !doubled && f === jumpedAt + plan.dj);
      stepPlayer(s, { mx: d[0], mz: d[1], jump: press, jumpHeld: jumpedAt >= 0 ? f - jumpedAt < 30 : true }, solids, DT);
      if (s.justJumped || (s.justDoubled && jumpedAt < 0)) { if (jumpedAt < 0) jumpedAt = f; }
      if (s.justDoubled) doubled = true;
      if (applySprings(s, springs) && jumpedAt < 0) jumpedAt = f;
      if (s.y < level.killY) return null;
      for (const sp of spikes) if (hazardHit(s, sp)) return null;
      const cy = s.y + P.height / 2;
      for (let g = 0; g < level.gems.length; g += 1) {
        const q = level.gems[g];
        if ((s.x - q.x) ** 2 + (cy - q.y) ** 2 + (s.z - q.z) ** 2 < GEM_R * GEM_R) gemsHit.add(g);
      }
      if (goal && Math.hypot(s.x - goal.x, s.z - goal.z) < 1.6 && s.y > goal.y - 0.6 && s.y < goal.y + 3) tube = true;
      if (!s.grounded) wasAir = true; else if (wasAir) return { surface: s.standing, x: s.x, z: s.z };
    }
    return null;
  };

  while (queue.length) {
    const node = queue.shift();
    const configs = hasMovers && nearMover(node.x, node.z) ? 5 : 1;
    for (let c = 0; c < configs; c += 1) {
      const solids = buildSolids(level, rand);
      const surface = solids.find((q) => q.id === node.id);
      // Movers keep their relative position when sampled in a different phase.
      const cx = (surface.x0 + surface.x1) / 2, cz = (surface.z0 + surface.z1) / 2;
      const start = { x: cx + node.relx, z: cz + node.relz, y: surface.y1, surface };
      const springs = springsTpl.map((q) => ({ x: q.x, y: q.y, z: q.z, fired: 0 }));
      for (const plan of plans) {
        const landed = attempt(solids, springs, start, plan);
        if (landed && landed.surface) { seedSurface(landed.surface); push(landed.surface, landed.x, landed.z); }
      }
    }
  }
  return { tube, gemsHit, nodes: seen.size };
}

/** Break levels on purpose; the fairness rules must flag each one. */
function mutationTests() {
  let ok = true;
  const base = () => JSON.parse(JSON.stringify(LEVELS[0]));
  const firstEnemyIsland = (l) => l.islands[l.enemies[0].isl];
  const cases = [
    ['intact level 1', (l) => l, (issues) => issues.length === 0],
    ['a landing shrunk to 4x4 wu', (l) => { const q = l.islands[3]; q.w = 2; q.d = 2; return l; }, (i) => i.some((m) => /landings must be at least/.test(m))],
    ['a long jump onto a shallow island', (l) => { const q = l.islands[5]; q.gap = 12; return l; }, (i) => i.some((m) => /deep for a/.test(m))],
    ['a monster island shrunk to 6x6', (l) => { const q = firstEnemyIsland(l); q.w = 3; q.d = 3; return l; }, (i) => i.some((m) => /hosts 1 monster/.test(m))],
    ['a monster moved into the landing pocket', (l) => { const q = firstEnemyIsland(l), e = l.enemies[0]; e.x = q.x - q.arrive[0] * (q.w - 0.8); e.z = q.z - q.arrive[1] * (q.d - 0.8); return l; }, (i) => i.some((m) => /starts outside its patrol area|can get within/.test(m))],
    ['a spike block in the landing pocket', (l) => { const q = l.islands[11]; l.spikes.push({ x: q.x - q.arrive[0] * (q.w - 1), y: q.y + 0.9, z: q.z - q.arrive[1] * (q.d - 1), r: 0.8 }); return l; }, (i) => i.some((m) => /spike block sits inside the landing pocket/.test(m))],
    ['three monsters crammed onto one island', (l) => { const e = l.enemies[0]; l.enemies.push({ ...e }, { ...e }); return l; }, (i) => i.some((m) => /hosts 3 monster|free for 3 monster/.test(m))],
  ];
  for (const [name, fn, expect] of cases) {
    const issues = fairness(fn(base()));
    const good = expect(issues);
    console.log(`${good ? 'PASS' : 'FAIL'} mutation: ${name}`);
    if (!good) { ok = false; console.log('   issues:', issues.slice(0, 4)); }
  }
  return ok;
}
if (args.includes('--mutate')) process.exit(mutationTests() ? 0 : 1);

let failed = false;
LEVELS.forEach((level, i) => {
  if (only && Number(only) !== i + 1) return;
  const issues = structure(level, i + 1);
  issues.forEach((m) => console.log('  STRUCT', m));
  if (issues.length) failed = true;
  if (structOnly) { console.log(`${issues.length ? 'FAIL' : 'PASS'} L${i + 1} ${level.name}: structure (${issues.length} issues)`); return; }
  const t0 = Date.now();
  const r = reachability(level, 900 + i);
  if (r.error) { console.log(`FAIL L${i + 1}: ${r.error}`); failed = true; return; }
  const missing = level.gems.map((g, k) => (r.gemsHit.has(k) ? null : k)).filter((v) => v !== null);
  const ok = r.tube && !missing.length && !issues.length;
  console.log(`${ok ? 'PASS' : 'FAIL'} L${i + 1} ${level.name}: tube ${r.tube ? 'reachable' : 'UNREACHABLE'}, gems ${level.gems.length - missing.length}/${level.gems.length}, ${r.nodes} standing spots, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (missing.length) console.log('   unreachable gems:', missing.map((k) => `#${k}(${level.gems[k].x.toFixed(1)},${level.gems[k].y.toFixed(1)},${level.gems[k].z.toFixed(1)})`).join(' '));
  if (!ok) failed = true;
});
process.exit(failed ? 1 : 0);
