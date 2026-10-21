// Sprite Arena — deterministic player physics. Pure functions, no THREE and no DOM, so the exact same code
// runs in the browser and in tools/validate-3d-levels.js (which proves every level is completable).
//
// Units are metres-ish "wu". One level cell is 2 wu. The player is an upright box (radius × height).

export const P = {
  radius: 0.5, height: 1.7,
  run: 8.6, accGround: 74, accAir: 34,
  jumpV: 13.6, jump2V: 12.4, gravity: 36, maxFall: 32,
  coyote: 0.1, buffer: 0.12, step: 0.42,
  springV: 27, padTime: 0.32,
  killY: -26,
};

const E = 0.001;

export function makePlayer(x = 0, y = 0, z = 0) {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0,
    grounded: false, standing: null,
    coyote: 0, jumpBuf: 0, airJumps: 1, padTime: 0,
    justJumped: 0, justDoubled: 0, justLanded: 0,
  };
}

function approach(v, target, delta) {
  if (v < target) return Math.min(v + delta, target);
  return Math.max(v - delta, target);
}

/** Axis-aligned solid. Movers carry dx/dy/dz (this step's motion) so riders move with them. */
export function makeSolid(x0, x1, y0, y1, z0, z1, extra) {
  return Object.assign({ x0, x1, y0, y1, z0, z1, dx: 0, dy: 0, dz: 0, mover: false }, extra);
}

function overlaps(s, c) {
  return s.x - P.radius < c.x1 - E && s.x + P.radius > c.x0 + E &&
    s.y < c.y1 - E && s.y + P.height > c.y0 + E &&
    s.z - P.radius < c.z1 - E && s.z + P.radius > c.z0 + E;
}

/**
 * Advance one fixed step.
 * inp: { mx, mz (desired world direction, |m| <= 1), jump (pressed this step), jumpHeld }
 */
export function stepPlayer(s, inp, solids, dt) {
  s.justJumped = 0; s.justDoubled = 0; s.justLanded = 0;
  s.coyote = s.grounded ? P.coyote : Math.max(0, s.coyote - dt);
  s.jumpBuf = inp.jump ? P.buffer : Math.max(0, s.jumpBuf - dt);
  s.padTime = Math.max(0, s.padTime - dt);

  const acc = (s.grounded ? P.accGround : P.accAir) * dt;
  s.vx = approach(s.vx, inp.mx * P.run, acc);
  s.vz = approach(s.vz, inp.mz * P.run, acc);

  if (s.jumpBuf > 0) {
    if (s.coyote > 0) {
      s.vy = P.jumpV; s.grounded = false; s.coyote = 0; s.jumpBuf = 0; s.justJumped = 1; s.standing = null;
    } else if (s.airJumps > 0) {
      s.vy = P.jump2V; s.airJumps -= 1; s.jumpBuf = 0; s.justDoubled = 1;
    }
  }
  if (!inp.jumpHeld && s.vy > 4.5 && s.padTime <= 0) s.vy -= P.gravity * 1.1 * dt;
  s.vy = Math.max(-P.maxFall, s.vy - P.gravity * dt);

  // Ride a moving platform.
  if (s.standing && s.standing.mover) { s.x += s.standing.dx; s.y += s.standing.dy; s.z += s.standing.dz; }

  // X
  s.x += s.vx * dt;
  for (let i = 0; i < solids.length; i += 1) {
    const c = solids[i];
    if (!overlaps(s, c)) continue;
    if (s.grounded && c.y1 > s.y && c.y1 - s.y <= P.step) { s.y = c.y1; continue; }
    if (s.vx > 0) s.x = c.x0 - P.radius - E; else if (s.vx < 0) s.x = c.x1 + P.radius + E;
    s.vx = 0;
  }
  // Z
  s.z += s.vz * dt;
  for (let i = 0; i < solids.length; i += 1) {
    const c = solids[i];
    if (!overlaps(s, c)) continue;
    if (s.grounded && c.y1 > s.y && c.y1 - s.y <= P.step) { s.y = c.y1; continue; }
    if (s.vz > 0) s.z = c.z0 - P.radius - E; else if (s.vz < 0) s.z = c.z1 + P.radius + E;
    s.vz = 0;
  }
  // Y
  const wasGrounded = s.grounded;
  s.y += s.vy * dt;
  s.grounded = false; s.standing = null;
  for (let i = 0; i < solids.length; i += 1) {
    const c = solids[i];
    if (!overlaps(s, c)) continue;
    if (s.vy <= 0) { s.y = c.y1; s.vy = 0; s.grounded = true; s.standing = c; }
    else { s.y = c.y0 - P.height - E; s.vy = 0; }
  }
  if (s.grounded) { s.airJumps = 1; if (!wasGrounded) s.justLanded = 1; }
}

/** Spring trigger: call after stepPlayer. Returns true when the player was launched. */
export function applySprings(s, springs) {
  if (s.vy > 2) return false;
  for (let i = 0; i < springs.length; i += 1) {
    const p = springs[i];
    const dx = s.x - p.x, dz = s.z - p.z;
    if (dx * dx + dz * dz < 1.3 * 1.3 && s.y < p.y + 0.9 && s.y > p.y - 0.5) {
      s.vy = P.springV; s.grounded = false; s.standing = null; s.airJumps = 1; s.padTime = P.padTime; p.fired = 0.35;
      return true;
    }
  }
  return false;
}

/** Moving-platform pose at time t (pure). */
export function moverOffset(m, t) {
  const o = Math.sin(t * m.speed + m.phase) * m.range;
  return m.axis === 'x' ? [o, 0, 0] : m.axis === 'y' ? [0, o, 0] : [0, 0, o];
}

export function hazardHit(s, hz) {
  // Saws are discs (radius ~0.95), spikes are blocks; both treated as a sphere against the player's body centre.
  const cy = s.y + P.height * 0.5;
  const dx = s.x - hz.x, dy = cy - hz.y, dz = s.z - hz.z;
  const r = hz.r + P.radius * 0.7;
  return dx * dx + dy * dy + dz * dz < r * r;
}

/** Highest solid top below (x,z) at or under fromY (+small slack). -Infinity when nothing is there. */
export function groundY(solids, x, z, fromY) {
  let best = -Infinity;
  for (let i = 0; i < solids.length; i += 1) {
    const c = solids[i];
    if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1 && c.y1 <= fromY + 0.6 && c.y1 > best) best = c.y1;
  }
  return best;
}
