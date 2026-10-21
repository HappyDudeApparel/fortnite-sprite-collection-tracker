/* Sprite Arcade Next — element fields (spike: the WATER field).
 *
 * Pure data + pure functions (no DOM, no canvas), so the game and tools/validate-levels.js use the exact same
 * rules. The game adds a thin layer on top (update/draw/hit hooks at the bottom, browser only).
 *
 * Level data (optional; levels without `tide` behave exactly as in the known-good game):
 *   level.tide = { basins: [{ id, x, w, bed, surfaces: [null, y1, y2, y3], start }],
 *                  switches: [{ id, start }],                       // 0/1 variables (e.g. a furnace)
 *                  rules: [{ if: { basin, min?, max? }, set: { id: value } }] }   // cause and effect
 *   - A basin holds an integer water level 0..N. surfaces[L] is the y of the water surface at level L.
 *   - platform/hazard/pad .when = { basin, min?, max? } or an array of them (all must hold): it exists/works only then
 *     (a switch is addressed the same way: { basin: 'f', min: 1 })
 *   - platform.float = { basin }              platform top rides the water surface (rests on the bed at level 0)
 *   - level.objects entry { type:'device', device:'inlet'|'valve', basin, ... } is hit by Sprite powers:
 *       inlet  raises the basin by 1, but only for the powers listed in RAISERS (Water, Fishy)
 *       valve  lowers the basin by 1 for ANY power
 *       brazier lights its switch (var) for the powers in HEATERS (Fire, Demon, Zero Point)
 *   - rules run after every change, so one field can switch another off (a flooded boiler goes out)
 */
(function (root) {
  'use strict';

  const RAISERS = ['water', 'fishy'];
const HEATERS = ['fire', 'demon', 'zero-point'];
  const COOLDOWN = 0.7; // a Water volley is three bolts; one volley must change the level by one step only

  const basinOf = (level, id) => ((level.tide && level.tide.basins) || []).find((b) => b.id === id);
  const maxLevel = (basin) => basin.surfaces.length - 1;
  const clampLevel = (basin, v) => Math.max(0, Math.min(maxLevel(basin), v));

  function initialLevels(level) {
    const out = {};
    ((level.tide && level.tide.basins) || []).forEach((b) => { out[b.id] = clampLevel(b, b.start || 0); });
    ((level.tide && level.tide.switches) || []).forEach((s) => { out[s.id] = s.start ? 1 : 0; });
    return normalize(level, out);
  }

  /** Cause and effect: apply every rule whose condition holds, until nothing changes. */
  function normalize(level, levels) {
    const rules = (level.tide && level.tide.rules) || [];
    let cur = levels;
    for (let pass = 0; pass < 4; pass += 1) {
      let changed = false;
      for (const r of rules) {
        if (!holds(r.if, cur)) continue;
        for (const [k, v] of Object.entries(r.set)) if (cur[k] !== v) { cur = Object.assign({}, cur, { [k]: v }); changed = true; }
      }
      if (!changed) break;
    }
    return cur;
  }

  function surfaceY(basin, lvl) { return lvl <= 0 ? basin.bed : basin.surfaces[lvl]; }

  function holds(c, levels) {
    const v = levels[c.basin] || 0;
    return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
  }
  function isActive(item, levels) {
    if (!item.when) return true;
    return [].concat(item.when).every((c) => holds(c, levels));
  }

  /** Top y of a floating platform at a given surface height (it rests on the bed when the basin is dry). */
  function floatTopAt(basin, platform, surface) { return Math.min(surface, basin.bed - platform.h); }
  function floatTop(level, platform, levels) {
    const b = basinOf(level, platform.float.basin);
    return b ? floatTopAt(b, platform, surfaceY(b, levels[b.id] || 0)) : platform.y;
  }

  function accepts(device, abilityId) {
    if (device.device === 'inlet') return RAISERS.includes(abilityId);
    if (device.device === 'brazier') return HEATERS.includes(abilityId);
    return true; // valve: every power
  }

  /** The one rule for a device being hit. Returns the new levels map (same object if nothing changed). */
  function applyDevice(level, levels, device, abilityId) {
    if (!accepts(device, abilityId)) return levels;
    let next = levels;
    if (device.device === 'brazier') {
      if (levels[device.var]) return levels;
      next = Object.assign({}, levels, { [device.var]: 1 });
    } else {
      const b = basinOf(level, device.basin);
      if (!b) return levels;
      const lvl = clampLevel(b, (levels[b.id] || 0) + (device.device === 'inlet' ? 1 : -1));
      if (lvl === levels[b.id]) return levels;
      next = Object.assign({}, levels, { [b.id]: lvl });
    }
    const settled = normalize(level, next);
    return settled === levels ? levels : settled;
  }

  /** Sprite classes for validation. Every class must be able to finish a level. */
  const CLASSES = {
    raiser: (id) => RAISERS.includes(id),
    heater: (id) => HEATERS.includes(id),
    other: (id) => !RAISERS.includes(id) && !HEATERS.includes(id),
  };
  const CLASS_SAMPLE = { raiser: 'water', heater: 'fire', other: 'earth' };

  /** Platforms as they stand at this water state (inactive ones are kept, flagged, so ids stay stable). */
  function platformsAt(level, levels) {
    return level.platforms.map((p) => {
      const q = Object.assign({}, p);
      q.active = isActive(p, levels);
      if (p.float) q.y = floatTop(level, p, levels);
      return q;
    });
  }
  function hazardsAt(level, levels) { return level.hazards.filter((h) => isActive(h, levels)); }
  function padsAt(level, levels) { return level.pads.filter((p) => isActive(p, levels)); }
  function devicesOf(level) { return level.objects.filter((o) => o.device); }

  const api = { RAISERS, HEATERS, COOLDOWN, CLASSES, CLASS_SAMPLE, basinOf, maxLevel, initialLevels, normalize, surfaceY, isActive, floatTop,
    accepts, applyDevice, platformsAt, hazardsAt, padsAt, devicesOf };

  // ---------------------------------------------------------------------------------------------------------
  // Browser layer: runtime state, per-frame update, drawing. Not used by the validator.
  // ---------------------------------------------------------------------------------------------------------
  api.create = function create(level) {
    const levels = initialLevels(level);
    const surface = {};
    ((level.tide && level.tide.basins) || []).forEach((b) => { surface[b.id] = surfaceY(b, levels[b.id]); });
    return { levels, surface, cooldown: {}, events: [] };
  };

  /** Called once per frame before platform movement. `game.platforms/hazards` are the live clones. */
  api.update = function update(game, dt) {
    const f = game.fields;
    if (!f) return;
    const level = game.level;
    for (const b of level.tide.basins) {
      const target = surfaceY(b, f.levels[b.id]);
      const cur = f.surface[b.id];
      const step = 70 * dt; // surface speed in px/s
      f.surface[b.id] = Math.abs(target - cur) <= step ? target : cur + Math.sign(target - cur) * step;
    }
    for (const k of Object.keys(f.cooldown)) f.cooldown[k] = Math.max(0, f.cooldown[k] - dt);
    const player = game.player;
    for (const p of game.platforms) {
      if (p.when) p.active = isActive(p, f.levels);
      if (p.float) {
        const b = basinOf(level, p.float.basin);
        const top = floatTopAt(b, p, f.surface[b.id]);
        const dy = top - p.y;
        p.y = top;
        if (player.standing === p && player.grounded && !game.finish) player.y += dy;
      }
    }
    for (const h of game.hazards) if (h.when) h.active = isActive(h, f.levels);
    for (const pd of game.pads) if (pd.when) pd.active = isActive(pd, f.levels);
  };

  api.hitDevice = function hitDevice(game, object, abilityId, team) {
    const f = game.fields;
    if (!f || team !== 'player') return;
    if (!accepts(object, abilityId)) { object.flash = 0.2; return; }
    if ((f.cooldown[object.id] || 0) > 0) return;
    const next = applyDevice(game.level, f.levels, object, abilityId);
    f.cooldown[object.id] = COOLDOWN;
    object.flash = 0.25;
    if (next !== f.levels) {
      f.levels = next;
      f.events.push({ t: game.time, device: object.device, basin: object.basin || object.var, level: next[object.basin || object.var] });
    }
  };

  api.drawWater = function drawWater(ctx, game, cameraX, H, time) {
    const f = game.fields;
    if (!f) return;
    for (const b of game.level.tide.basins) {
      const x = b.x - cameraX;
      if (x + b.w < -20 || x > 1000) continue;
      const rim = b.rim || 470;
      // The cavity itself, so a drained basin reads as a basin and not as a gap in the scenery.
      const cavity = ctx.createLinearGradient(0, rim, 0, b.bed + 6);
      cavity.addColorStop(0, '#46566a');
      cavity.addColorStop(1, '#1f2a38');
      ctx.fillStyle = cavity;
      ctx.fillRect(x, rim, b.w, b.bed + 6 - rim);
      const top = f.surface[b.id];
      if (f.levels[b.id] <= 0 && top >= b.bed - 0.5) continue;
      const y = Math.min(top, b.bed);
      const grad = ctx.createLinearGradient(0, y, 0, b.bed);
      grad.addColorStop(0, 'rgba(98,221,255,.66)');
      grad.addColorStop(1, 'rgba(24,96,170,.86)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, b.bed + 6);
      ctx.lineTo(x, y);
      for (let px = 0; px <= b.w; px += 12) ctx.lineTo(x + px, y + Math.sin(time * 2.4 + (b.x + px) * 0.045) * 3);
      ctx.lineTo(x + b.w, b.bed + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,251,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px <= b.w; px += 12) {
        const yy = y + Math.sin(time * 2.4 + (b.x + px) * 0.045) * 3;
        if (px === 0) ctx.moveTo(x + px, yy); else ctx.lineTo(x + px, yy);
      }
      ctx.stroke();
      // Glass lock walls where the water stands above the rims.
      if (y < rim) {
        ctx.strokeStyle = 'rgba(200,240,255,.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x, rim);
        ctx.moveTo(x + b.w, y); ctx.lineTo(x + b.w, rim);
        ctx.stroke();
      }
    }
  };

  api.drawDevice = function drawDevice(ctx, game, object, cameraX, time) {
    const x = object.x - cameraX;
    const lit = object.flash > 0;
    ctx.save();
    ctx.translate(x, object.y);
    if (object.device === 'inlet') {
      ctx.fillStyle = '#35618c'; ctx.fillRect(object.w * 0.35, 0, object.w * 0.3, object.h);
      ctx.fillStyle = lit ? '#e6fbff' : '#62ddff';
      ctx.beginPath(); ctx.arc(object.w / 2, 14, object.w * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d2c4a'; ctx.beginPath(); ctx.arc(object.w / 2, 14, object.w * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '800 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('FILL', object.w / 2, -6);
    } else if (object.device === 'brazier') {
      const lit = game.fields && game.fields.levels[object.var];
      ctx.fillStyle = '#4a3b33'; ctx.fillRect(object.w * 0.3, 26, object.w * 0.4, object.h - 26);
      ctx.fillStyle = '#6b5448'; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(object.w, 20); ctx.lineTo(object.w * 0.8, 38); ctx.lineTo(object.w * 0.2, 38); ctx.closePath(); ctx.fill();
      if (lit) {
        const f1 = 10 + Math.sin(time * 9) * 3;
        ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(object.w / 2, 14, 11, 12 + f1 * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd35a'; ctx.beginPath(); ctx.ellipse(object.w / 2, 18, 6, 8 + f1 * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#2b2420'; ctx.beginPath(); ctx.ellipse(object.w / 2, 19, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '800 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(lit ? 'LIT' : 'LIGHT', object.w / 2, -6);
    } else {
      ctx.fillStyle = '#6a5a3e'; ctx.fillRect(object.w * 0.4, 8, object.w * 0.2, object.h - 8);
      ctx.strokeStyle = lit ? '#fff0b8' : '#ffc94d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(object.w / 2, 14, object.w * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(object.w / 2 - object.w * 0.5, 14); ctx.lineTo(object.w / 2 + object.w * 0.5, 14);
      ctx.moveTo(object.w / 2, 14 - object.w * 0.5); ctx.lineTo(object.w / 2, 14 + object.w * 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '800 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('DRAIN', object.w / 2, -6);
    }
    ctx.restore();
    void game; void time;
  };

  /** Steam plumes over every pad flagged `steam` while it is active. */
  api.drawSteam = function drawSteam(ctx, game, cameraX, time) {
    for (const pad of game.pads) {
      if (!pad.steam) continue;
      const x = pad.x - cameraX + pad.w / 2;
      if (x < -60 || x > 1000) continue;
      if (pad.active === false) {
        ctx.fillStyle = 'rgba(40,52,66,.9)'; ctx.fillRect(x - pad.w / 2, pad.y + pad.h - 6, pad.w, 6); // cold vent
        continue;
      }
      for (let i = 0; i < 9; i += 1) {
        const ph = (time * 0.9 + i / 9) % 1;
        const r = 7 + ph * 18;
        ctx.fillStyle = `rgba(240,250,255,${0.55 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1 + time * 3) * 8 * ph, pad.y - ph * 190, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  api.drawHud = function drawHud(ctx, game, W) {
    const f = game.fields;
    if (!f) return;
    ctx.save();
    ctx.font = '800 11px system-ui';
    ctx.textAlign = 'center';
    let y = 74;
    for (const b of game.level.tide.basins) {
      const lvl = f.levels[b.id], max = maxLevel(b);
      ctx.fillStyle = 'rgba(8,24,35,.72)';
      ctx.fillRect(W / 2 - 52, y - 12, 104, 22);
      ctx.fillStyle = '#b9f6ff';
      ctx.fillText('TIDE', W / 2 - 34, y + 3);
      for (let i = 1; i <= max; i += 1) {
        ctx.fillStyle = i <= lvl ? '#62ddff' : 'rgba(255,255,255,.22)';
        ctx.fillRect(W / 2 - 10 + (i - 1) * 20, y - 6, 16, 12);
      }
      y += 26;
    }
    for (const s of game.level.tide.switches || []) {
      const on = f.levels[s.id];
      ctx.fillStyle = 'rgba(8,24,35,.72)'; ctx.fillRect(W / 2 - 52, y - 12, 104, 22);
      ctx.fillStyle = '#ffd9a8'; ctx.textAlign = 'center'; ctx.fillText(on ? 'FURNACE LIT' : 'FURNACE COLD', W / 2, y + 3);
      y += 26;
    }
    ctx.restore();
  };

  root.SPRITE_FIELDS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
