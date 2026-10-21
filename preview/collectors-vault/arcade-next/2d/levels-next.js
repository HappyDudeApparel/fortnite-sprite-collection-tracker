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


  // Steam Works. Two fields interact: the water level and the furnace.
  //   The geyser on the left bank only works while the furnace is LIT and the boiler holds water (level 1-2).
  //   HEAT route  (Fire / Demon / Zero Point): light the furnace, ride the geyser onto the ledges.
  //   FLOOD route (Water / Fishy): fill the basin to 3 (this douses the furnace), ride the dock up to the ledges.
  //   DRAIN route (any Sprite): open the valve and walk the dry bed.
  const steamWorks = {
    id: 'steam-works-demo',
    name: 'Steam Works',
    tagline: 'Fire needs water to make steam. Water puts fire out.',
    worldW: 2400,
    theme: LEVELS[0].theme,
    tide: {
      basins: [{ id: 'a', x: 620, w: 660, bed: 535, surfaces: [null, 470, 430, 380], start: 1 }],
      switches: [{ id: 'f', start: 0 }],
      rules: [{ if: { basin: 'a', min: 3 }, set: { f: 0 } }],   // a flooded boiler puts the furnace out
    },
    platforms: [
      { x: 0, y: GROUND, w: 620, h: H - GROUND, type: 'ground' },
      { x: 1280, y: GROUND, w: 1120, h: H - GROUND, type: 'ground' },
      { x: 620, y: 535, w: 660, h: 5, type: 'stone-ground', when: when(undefined, 0) },
      { x: 600, y: 250, w: 140, h: 26, type: 'rock' },                          // ledge A
      { x: 960, y: 270, w: 160, h: 26, type: 'rock' },                          // ledge B
      { x: 760, y: 470, w: 140, h: 24, type: 'log', float: { basin: 'a' } },    // dock
    ],
    objects: [
      { type: 'device', device: 'valve', basin: 'a', x: 40, y: 400, w: 44, h: 70, hp: 1 },
      { type: 'device', device: 'brazier', var: 'f', x: 470, y: 400, w: 44, h: 70, hp: 1 },
      { type: 'device', device: 'inlet', basin: 'a', x: 330, y: 400, w: 44, h: 70, hp: 1 },
    ],
    hazards: [{ x: 700, y: 515, w: 50, h: 20, type: 'spikes', when: when(undefined, 0) }],
    pads: [{ x: 540, y: GROUND - 14, w: 52, h: 14, power: 900, steam: true, when: [{ basin: 'f', min: 1 }, { basin: 'a', min: 1, max: 2 }] }],
    gems: [
      ...line(180, 420, 3, 44),
      ...line(610, 205, 3, 44),             // ledge A
      ...line(980, 225, 4, 40),             // ledge B
    ],
    checkpoints: [{ x: 200, y: GROUND - 58 }, { x: 1500, y: GROUND - 58 }],
    enemies: [{ x: 1750, y: GROUND - 58, min: 1550, max: 1950 }],
    spawn: { x: 200, y: 410 },
    tube: { x: 2250, y: GROUND - 105 },
  };

  LEVELS.push(tideWorks, steamWorks);
}(typeof window !== 'undefined' ? window : globalThis));
