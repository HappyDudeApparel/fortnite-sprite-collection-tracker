#!/usr/bin/env node
// Property tests for the 3D fairness rules: knockback never throws the player off an island, and a monster at any point
// of its patrol area can never touch a player standing in the landing pocket.
import { LEVELS } from '../3d/js/levels.js';
import { ENEMIES } from '../3d/js/roster.js';
import { safeKnockback, enemyBounds, ARRIVAL_DEPTH, onIsland } from '../3d/js/rules.js';

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let failed = 0, checks = 0;
const fail = (m) => { failed += 1; if (failed <= 8) console.log('  FAIL', m); };

// 1. Knockback stays on the island. Player anywhere on the island (kept 0.6 wu in from the rim), source anywhere within 3 wu.
for (const level of LEVELS) {
  level.islands.forEach((q, idx) => {
    for (let n = 0; n < 400; n += 1) {
      const px = q.x + (rnd() * 2 - 1) * (q.w - 0.6), pz = q.z + (rnd() * 2 - 1) * (q.d - 0.6);
      const a = rnd() * Math.PI * 2, r = 0.3 + rnd() * 3;
      const kb = safeKnockback({ x: px, z: pz }, { x: px + Math.cos(a) * r, z: pz + Math.sin(a) * r }, q);
      // Where the push carries the player over its 0.55 s of travel (air control may add a little; 0.5 wu margin).
      const lx = px + kb.vx * 0.55, lz = pz + kb.vz * 0.55;
      checks += 1;
      if (!onIsland(q, lx, lz, -0.5 + 0.9)) fail(`${level.id} island ${idx}: player (${px.toFixed(1)},${pz.toFixed(1)}) pushed to (${lx.toFixed(1)},${lz.toFixed(1)})`);
    }
  });
}

// 2. Landing pocket is untouchable: corners of every patrol area stay ARRIVAL_DEPTH away (after reach) from the landing edge.
for (const level of LEVELS) {
  for (const e of level.enemies) {
    const q = level.islands[e.isl]; if (!q || !q.arrive) continue;
    const def = ENEMIES[e.type], b = enemyBounds(q, def), reach = def.radius + 0.5;
    const nearest = q.arrive[0] > 0 ? b.x0 - (q.x - q.w) : q.arrive[0] < 0 ? (q.x + q.w) - b.x1 : q.arrive[1] > 0 ? b.z0 - (q.z - q.d) : (q.z + q.d) - b.z1;
    checks += 1;
    if (nearest - reach < ARRIVAL_DEPTH - 0.01) fail(`${level.id}: ${e.type} on island ${e.isl} can reach ${(nearest - reach).toFixed(2)} wu from the landing edge`);
  }
}
console.log(`${failed ? 'FAIL' : 'PASS'} 3D fairness properties: ${checks} checks, ${failed} failures`);
process.exit(failed ? 1 : 0);
