/* Sprite Arcade Next — preview levels. Loaded AFTER levels.js; the five original levels are untouched.
 *
 * Tide Works (demo room). One basin, three water levels, two routes:
 *   FLOOD  (Water / Fishy only): fill the basin to level 3 so the floating dock lifts you onto the dam.
 *   DRAIN  (any Sprite):         open the drain valve; the dry bed opens a tunnel under the dam.
 * The validator proves every Sprite class can reach the tube, and which gems each route unlocks.
 */
(function (root) {
  'use strict';
  const LEVELS = root.SPRITE_LEVELS;
  const GROUND = 470, H = 540;
  const when = (min, max) => { const w = { basin: 'a' }; if (min !== undefined) w.min = min; if (max !== undefined) w.max = max; return w; };
  const line = (x, y, n, dx = 40) => Array.from({ length: n }, (_, i) => ({ x: x + i * dx, y }));

  const tideWorks = {
    id: 'tide-works-demo',
    name: 'Tide Works',
    tagline: 'Flood it or drain it. Your Sprite decides the route.',
    worldW: 2400,
    theme: LEVELS[0].theme,
    tide: {
      basins: [{ id: 'a', x: 560, w: 740, bed: 535, surfaces: [null, 470, 430, 380], start: 1 }],
    },
    platforms: [
      { x: 0, y: GROUND, w: 560, h: H - GROUND, type: 'ground' },
      { x: 1300, y: GROUND, w: 1100, h: H - GROUND, type: 'ground' },
      { x: 560, y: 535, w: 740, h: 5, type: 'stone-ground', when: when(undefined, 0) },       // dry bed (exists only when drained)
      { x: 1000, y: 220, w: 200, h: 250, type: 'stone-ground' },                               // the dam: top at y=220, tunnel beneath
      { x: 800, y: 470, w: 150, h: 24, type: 'log', float: { basin: 'a' } },                   // floating dock
    ],
    objects: [
      { type: 'device', device: 'valve', basin: 'a', x: 60, y: 400, w: 44, h: 70, hp: 1 },
      { type: 'device', device: 'inlet', basin: 'a', x: 480, y: 400, w: 44, h: 70, hp: 1 },
    ],
    hazards: [{ x: 660, y: 515, w: 50, h: 20, type: 'spikes', when: when(undefined, 0) }],
    pads: [],
    gems: [
      ...line(300, 420, 3, 44),             // teaches the walk-up
      ...line(1020, 175, 5, 40),            // on top of the dam: flood route only
      ...line(1030, 497, 5, 40),            // inside the tunnel: drain route only
    ],
    checkpoints: [{ x: 200, y: GROUND - 58 }, { x: 1500, y: GROUND - 58 }],
    enemies: [{ x: 1750, y: GROUND - 58, min: 1550, max: 1950 }],
    spawn: { x: 200, y: 410 },
    tube: { x: 2250, y: GROUND - 105 },
  };

  LEVELS.push(tideWorks);
}(typeof window !== 'undefined' ? window : globalThis));
