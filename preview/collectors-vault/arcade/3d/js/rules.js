// Sprite Arena — fairness rules shared by the game (actors.js, main.js) and the validator
// (tools/validate-3d-levels.mjs). Pure functions: no THREE, no DOM.
//
// Why these exist: playtests found landings that were too small, monsters that filled the whole island, and
// knockback that threw the player off the edge before they could act. Every rule below has a validator check.

/** Safe pocket at the edge where the player arrives: no hazard and no monster may reach into it. */
export const ARRIVAL_DEPTH = 2.5;
/** Seconds after the player lands on a new island before its monsters start chasing. */
export const NOTICE_DELAY = 1.1;
/** Smallest island half-extent (wu) anywhere, and for islands that host monsters. */
export const MIN_HALF = 3;
export const ENEMY_MIN_HALF = 4;
export const CROWD_MIN_HALF = 5;      // three monsters, or a monster plus a saw
export const AREA_PER_ENEMY = 14;     // wu² of free floor each monster needs, arrival pocket excluded

/** Smallest half-extent along the direction of travel for an island reached across `gap` wu. */
export function minAlong(gap) { return Math.max(MIN_HALF, Math.ceil(1.5 + 0.25 * gap)); }

/** Half-extent an island needs for what it hosts. */
export function minHalfFor(enemyCount, hasSaw) {
  if (enemyCount >= 3 || (enemyCount >= 1 && hasSaw)) return CROWD_MIN_HALF;
  if (enemyCount >= 1) return ENEMY_MIN_HALF;
  return MIN_HALF;
}

/** Free floor (wu²) once the arrival pocket is taken out. */
export function freeArea(island) {
  const depthAlong = island.arrive ? (island.arrive[0] !== 0 ? island.w : island.d) * 2 : 0;
  const across = island.arrive ? (island.arrive[0] !== 0 ? island.d : island.w) * 2 : 0;
  return 4 * island.w * island.d - (island.arrive ? Math.min(ARRIVAL_DEPTH, depthAlong) * across : 0);
}

/**
 * Where a monster may walk on its island: a margin from every edge, and a deeper margin on the side the
 * player arrives from, so a landing is never contested. `type` supplies the monster's radius.
 */
export function enemyBounds(island, type, playerRadius = 0.5) {
  const edge = 1.0;
  const b = { x0: island.x - island.w + edge, x1: island.x + island.w - edge, z0: island.z - island.d + edge, z1: island.z + island.d - edge };
  if (island.arrive) {
    const [dx, dz] = island.arrive; // direction of travel; the arrival edge is the opposite side
    const deep = ARRIVAL_DEPTH + type.radius + playerRadius;
    if (dx > 0) b.x0 = Math.max(b.x0, island.x - island.w + deep);
    if (dx < 0) b.x1 = Math.min(b.x1, island.x + island.w - deep);
    if (dz > 0) b.z0 = Math.max(b.z0, island.z - island.d + deep);
    if (dz < 0) b.z1 = Math.min(b.z1, island.z + island.d - deep);
  }
  if (b.x0 > b.x1) b.x0 = b.x1 = (b.x0 + b.x1) / 2;
  if (b.z0 > b.z1) b.z0 = b.z1 = (b.z0 + b.z1) / 2;
  return b;
}

export function onIsland(island, x, z, slack = 0) {
  return Math.abs(x - island.x) <= island.w + slack && Math.abs(z - island.z) <= island.d + slack;
}

/**
 * Knockback after a hit: away from the source, but never off the island the player is standing on. If the push
 * would carry the player past an edge the direction bends toward the island centre.
 * Returns { vx, vz, vy }.
 */
export function safeKnockback(player, source, island, power = 6, lift = 8, travel = 0.55) {
  let dx = player.x - source.x, dz = player.z - source.z;
  let l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  if (island) {
    const lx = player.x + dx * power * travel, lz = player.z + dz * power * travel;
    const margin = 0.9;
    const outside = Math.abs(lx - island.x) > island.w - margin || Math.abs(lz - island.z) > island.d - margin;
    if (outside) {
      const cx = island.x - player.x, cz = island.z - player.z, cl = Math.hypot(cx, cz);
      if (cl > 0.3) { dx = cx / cl; dz = cz / cl; } else { dx = 0; dz = 0; }
    }
  }
  return { vx: dx * power, vz: dz * power, vy: lift };
}

/**
 * Grow an island (half-extents w, d; `alongX` = travel is along x) until it satisfies every size rule for what it
 * hosts. Used by the level builder so no authored level can ship a landing that is too small.
 */
export function fitIsland(size, alongX, gap, enemyCount, hasSaw, arrive) {
  let { w, d } = size;
  const need = minHalfFor(enemyCount, hasSaw);
  const along = Math.max(minAlong(gap), need);
  if (alongX) { w = Math.max(w, along); d = Math.max(d, need); } else { d = Math.max(d, along); w = Math.max(w, need); }
  w = Math.max(w, MIN_HALF); d = Math.max(d, MIN_HALF);
  for (let i = 0; enemyCount > 0 && freeArea({ w, d, arrive }) < AREA_PER_ENEMY * enemyCount && i < 8; i += 1) { w += 1; d += 1; }
  return { w, d };
}
