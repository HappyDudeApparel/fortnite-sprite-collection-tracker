/* Sprite Arcade 2D level pack — pure data (no DOM), so tools/validate-levels.js can load it in Node.
 *
 * Physics envelope the layouts are built against (from the game constants):
 *   single jump  ≈ 92 px high, ≈ 160 px across      double jump ≈ 183 px high, ≈ 275 px across
 *   bounce pad   ≈ 225 px high (+ a double jump)
 * Required routes stay well inside that envelope; the validator proves every tube and gem is reachable.
 *
 * Fan-game design: all level names, layouts and hazards here are original to Sprite Arcade.
 * Nothing is taken from GB GAMER BROS / Adventure Mountain.
 */
(function (root) {
  'use strict';

  const H = 540;
  const GROUND = 470;

  // ---- authoring helpers -------------------------------------------------------------------
  const ground = (x, w, type = 'ground', y = GROUND, h = H - y) => ({ x, y, w, h, type });
  const ledge = (x, y, w, type = 'rock', extra = {}) => Object.assign({ x, y, w, h: 26, type }, extra);
  const mover = (x, y, w, type, axis, range, speed, phase = 0) =>
    ({ x, y, w, h: 26, type, mover: { axis, range, speed, phase } });
  const crumble = (x, y, w, type) => ledge(x, y, w, type, { crumble: true });

  const bricks = (x, bottom, cols, rows) => {
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) out.push({ type: 'brick', x: x + c * 46, y: bottom - (r + 1) * 42, w: 44, h: 40, hp: 1 });
    }
    return out;
  };
  const boulder = (x, top) => ({ type: 'boulder', x, y: top - 56, w: 76, h: 56, hp: 3, special: 'heavy' });
  const crystal = (x, top) => ({ type: 'crystal', x, y: top - 48, w: 46, h: 48, hp: 2, special: 'energy' });

  const spikes = (x, top, w, type = 'spikes') => ({ x, y: top - 20, w, h: 20, type });
  const lava = (x, w) => ({ x, y: 498, w, h: 42, type: 'lava' });

  const pad = (x, top, power = 800) => ({ x, y: top - 14, w: 52, h: 14, power });

  const line = (x, y, n, dx = 40, dy = 0) => Array.from({ length: n }, (_, i) => ({ x: x + i * dx, y: y + i * dy }));
  // Semicircular arc of gems over a gap, centred on (cx, cy).
  const arc = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => {
    const a = Math.PI * (1 - i / (n - 1));
    return { x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy - Math.sin(a) * r * 0.55) };
  });

  const cp = (x, top = GROUND) => ({ x, y: top - 58 });
  const foe = (x, min, max, top = GROUND) => ({ x, y: top - 58, min, max });
  const tubeOn = (x, top = GROUND) => ({ x, y: top - 105 });

  const flat = (...lists) => [].concat(...lists);

  // ======================================================================================
  // 1 — SUNFLOWER RUN: the original July level, kept as it was, plus gems and star ratings.
  // ======================================================================================
  const level1 = {
    id: 'sunflower-run',
    name: 'Sunflower Run',
    tagline: 'Meadow, river gorge and the collection tube.',
    worldW: 4096,
    theme: { legacy: true, preview: ['#55baff', '#bcecff', '#8fca63'], ridge: ['#7cb57c', '#407f64'], ambient: null, fogBottom: null },
    banner: 'BREAK THE BROWN BRICKS • REACH THE COLLECTION TUBE',
    platforms: [
      ground(0, 630), ground(680, 500), ground(1230, 540),
      ground(1830, 560, 'stone-ground'), ground(2450, 540, 'stone-ground'),
      ground(3050, 500, 'facility-ground'), ground(3600, 496, 'facility-ground'),
      ledge(310, 370, 190, 'log'), ledge(820, 342, 210, 'rock'), ledge(1100, 402, 120, 'rock'),
      ledge(1390, 360, 190, 'log'), ledge(1600, 286, 160, 'rock'), ledge(1950, 365, 190, 'rock'),
      ledge(2190, 300, 140, 'rock'), ledge(2520, 350, 180, 'rock'), ledge(2785, 282, 145, 'ruin'),
      ledge(3140, 370, 190, 'facility'), ledge(3380, 310, 150, 'facility'), ledge(3640, 385, 155, 'facility'),
    ],
    objects: flat(
      bricks(535, 470, 2, 2), bricks(1030, 470, 3, 1), bricks(1510, 360, 2, 2),
      bricks(2290, 470, 2, 3), bricks(2830, 470, 3, 2), bricks(3450, 470, 2, 2),
      [
        { type: 'boulder', x: 1270, y: 414, w: 74, h: 56, hp: 3, special: 'heavy' },
        { type: 'boulder', x: 2610, y: 414, w: 78, h: 58, hp: 3, special: 'heavy' },
        { type: 'crystal', x: 2050, y: 318, w: 46, h: 48, hp: 2, special: 'energy' },
        { type: 'crystal', x: 3310, y: 422, w: 46, h: 48, hp: 2, special: 'energy' },
      ],
    ),
    hazards: [spikes(630, 470, 50), spikes(1180, 470, 50), spikes(1770, 470, 60), spikes(2390, 470, 60), spikes(2990, 470, 60), spikes(3550, 470, 50, 'energy')],
    pads: [],
    gems: flat(
      line(230, 430, 4, 44), line(360, 340, 3, 45), line(880, 312, 3, 45), [{ x: 1160, y: 372 }],
      line(1440, 330, 3, 45), line(1660, 256, 2, 40), line(2000, 335, 3, 45), [{ x: 2260, y: 270 }],
      line(2580, 320, 2, 50), [{ x: 2840, y: 252 }], line(3200, 340, 2, 60), [{ x: 3455, y: 280 }], [{ x: 3715, y: 355 }],
      arc(655, 440, 70, 5), [{ x: 1205, y: 350 }], arc(1800, 440, 70, 5),
    ),
    checkpoints: [cp(110), cp(1180), cp(2450), cp(3450)],
    enemies: [foe(880, 735, 1010), foe(1330, 1245, 1480), foe(2000, 1860, 2200), foe(2680, 2490, 2890), foe(3220, 3070, 3450), foe(3710, 3620, 3870)],
    spawn: { x: 120, y: 410 },
    tube: { x: 3992, y: 365 },
  };

  // ======================================================================================
  // 2 — LUMEN CAVERNS: crystal cave. Pits, a ferry platform, crumbling crystal steps, bounce pads.
  // ======================================================================================
  const level2 = {
    id: 'lumen-caverns',
    name: 'Lumen Caverns',
    tagline: 'Glowing crystal tunnels. Mind the pits.',
    worldW: 5400,
    theme: {
      palette: 'cave', preview: ['#0b0a24', '#2b2a72', '#36d6c6'], ridge: ['#3a2f7a', '#1b8f9a'],
      ambient: { kind: 'mote', count: 46, color: '#8ff7ff' }, fogBottom: '#35d9ff', vignette: 0.55,
    },
    banner: 'CRYSTAL CAVERNS • FOLLOW THE GLOW TO THE COLLECTION TUBE',
    platforms: [
      ground(0, 760, 'cave-ground'), ground(880, 520, 'cave-ground'),
      ledge(1000, 380, 120, 'crystal'),
      ledge(1480, 420, 100, 'crystal'),
      ground(1650, 400, 'cave-ground'),
      ground(2050, 250, 'cave-ground'),
      ledge(2330, 250, 150, 'crystal'),
      mover(2330, 450, 100, 'crystal', 'x', 60, 1.0),
      ground(2560, 520, 'cave-ground'),
      ledge(2900, 380, 110, 'crystal'), ledge(3040, 300, 100, 'crystal'),
      crumble(3120, 430, 90, 'crystal'), crumble(3250, 430, 90, 'crystal'),
      ground(3380, 720, 'cave-ground'),
      ledge(3560, 360, 130, 'crystal'), ledge(3760, 290, 130, 'crystal'),
      mover(4150, 440, 100, 'crystal', 'x', 70, 1.1, 1.6),
      ledge(4200, 250, 120, 'crystal'),
      ground(4400, 1000, 'cave-ground'),
    ],
    objects: flat(
      bricks(560, 470, 2, 2), [crystal(1100, 470)], bricks(1850, 470, 2, 3),
      [boulder(3600, 470)], bricks(3850, 470, 2, 2), [crystal(3990, 470)],
      bricks(4950, 470, 2, 2), [boulder(5100, 470)],
    ),
    hazards: [spikes(1250, 470, 60, 'crystal'), spikes(2800, 470, 60, 'crystal'), spikes(4650, 470, 60, 'crystal'), spikes(4880, 470, 50, 'crystal')],
    pads: [pad(2236, 470), pad(4040, 470)],
    gems: flat(
      line(200, 430, 5, 44), line(1030, 350, 3, 40), line(1500, 390, 2, 40), line(1700, 430, 3, 44),
      arc(1960, 330, 80, 5), line(2350, 215, 3, 44), arc(2440, 400, 90, 5), line(2600, 430, 3, 44),
      line(2920, 350, 2, 40), line(3060, 270, 2, 40), line(3130, 400, 2, 130),
      line(3580, 330, 3, 44), line(3780, 260, 3, 44), arc(4020, 330, 90, 5), line(4220, 215, 3, 44),
      line(4450, 430, 3, 44), line(5000, 430, 4, 44),
    ),
    checkpoints: [cp(110), cp(1660), cp(2570), cp(3400), cp(4420)],
    enemies: [foe(640, 600, 740), foe(1180, 960, 1360), foe(1900, 1680, 2020), foe(2780, 2600, 3020), foe(3600, 3400, 3820), foe(4600, 4430, 4780), foe(5150, 4950, 5300)],
    spawn: { x: 120, y: 410 },
    tube: tubeOn(5260),
  };

  // ======================================================================================
  // 3 — CLOUDSPIRE CLIMB: sky islands. No ground to fall back on: moving and crumbling clouds, pads.
  // ======================================================================================
  const level3 = {
    id: 'cloudspire-climb',
    name: 'Cloudspire Climb',
    tagline: 'Hop between sky islands to the top.',
    worldW: 5200,
    theme: {
      palette: 'sky', preview: ['#3aa0ff', '#b7e4ff', '#ffe2b8'], ridge: ['#a9c8ee', '#ffffff'],
      ambient: { kind: 'wisp', count: 22, color: '#ffffff' }, fogBottom: '#ffffff', vignette: 0.12,
    },
    banner: 'SKY ISLANDS • CLIMB TO THE COLLECTION TUBE',
    platforms: [
      ground(0, 620, 'cloud-ground', GROUND, 70),
      ledge(690, 430, 90, 'cloud'),
      ground(800, 420, 'cloud-ground', 450, 70),
      crumble(1290, 410, 110, 'cloud'), crumble(1460, 360, 110, 'cloud'), crumble(1630, 310, 110, 'cloud'),
      ledge(1000, 220, 130, 'cloud'),
      ground(1960, 400, 'cloud-ground', 300, 70),
      mover(2410, 330, 110, 'cloud', 'x', 70, 1.0),
      mover(2590, 290, 110, 'cloud', 'x', 70, 1.0, Math.PI),
      ground(2790, 380, 'cloud-ground', 340, 70),
      mover(3240, 270, 110, 'cloud', 'y', 100, 0.8),
      ground(3440, 380, 'cloud-ground', 200, 70),
      ledge(3880, 260, 100, 'cloud'), ledge(4010, 330, 100, 'cloud'),
      crumble(4140, 400, 100, 'cloud'),
      ground(4310, 890, 'cloud-ground', 430, 100),
    ],
    objects: flat(
      bricks(380, 470, 2, 2), bricks(3600, 200, 2, 2), bricks(4600, 430, 2, 2), [boulder(4800, 430)],
    ),
    hazards: [],
    pads: [pad(560, 470), pad(1150, 450), pad(3700, 200)],
    gems: flat(
      line(200, 430, 4, 44), arc(655, 400, 60, 4), line(850, 410, 3, 44), line(1020, 190, 3, 44),
      line(1310, 380, 2, 40), line(1480, 330, 2, 40), line(1650, 280, 2, 40),
      line(2000, 270, 4, 50), arc(2500, 270, 120, 6), line(2830, 310, 4, 50),
      line(3260, 190, 1), line(3260, 120, 1), line(3470, 170, 3, 44), line(3900, 230, 2, 40), line(4030, 300, 2, 40),
      line(4350, 400, 4, 50), line(4850, 400, 4, 50),
    ),
    checkpoints: [cp(110), cp(820, 450), cp(1990, 300), cp(2810, 340), cp(3460, 200), cp(4330, 430)],
    enemies: [foe(380, 240, 540), foe(980, 830, 1180, 450), foe(2150, 1990, 2320, 300), foe(2960, 2810, 3130, 340), foe(3610, 3470, 3800, 200), foe(4700, 4520, 4900, 430), foe(5000, 4900, 5100, 430)],
    spawn: { x: 120, y: 410 },
    tube: tubeOn(5050, 430),
  };

  // ======================================================================================
  // 4 — CINDER WORKS: lava-floor foundry. Girders over lava, ferry platforms, a lift shaft, crumbling grates.
  // ======================================================================================
  const level4 = {
    id: 'cinder-works',
    name: 'Cinder Works',
    tagline: 'The floor is lava. Literally.',
    worldW: 5600,
    theme: {
      palette: 'foundry', preview: ['#1a0b14', '#8a2a1c', '#ff8a2a'], ridge: ['#3b1620', '#6a2a1e'],
      ambient: { kind: 'ember', count: 54, color: '#ffb35a' }, fogBottom: '#ff6a1a', vignette: 0.5,
    },
    banner: 'MOLTEN FOUNDRY • DON’T TOUCH THE LAVA',
    platforms: [
      ground(0, 700, 'basalt'),
      mover(750, 440, 100, 'metal', 'x', 50, 1.0),
      ground(920, 500, 'basalt'),
      ledge(1470, 420, 90, 'metal'), ledge(1590, 380, 90, 'metal'),
      ground(1720, 600, 'basalt'),
      mover(2360, 380, 100, 'metal', 'y', 90, 0.9),
      ledge(2540, 260, 520, 'metal'),
      ground(3140, 640, 'basalt'),
      crumble(3830, 430, 90, 'metal'), crumble(3980, 420, 90, 'metal'), crumble(4130, 430, 90, 'metal'),
      ground(4230, 1370, 'basalt'),
      ledge(4700, 270, 130, 'metal'),
    ],
    objects: flat(
      bricks(500, 470, 2, 2), [boulder(1100, 470)], bricks(1870, 470, 2, 3), [boulder(2150, 470)],
      bricks(3400, 470, 2, 2), [boulder(3600, 470)], bricks(4450, 470, 2, 2), [crystal(4800, 470)], bricks(5000, 470, 2, 3),
    ),
    hazards: [
      lava(700, 220), lava(1420, 300), lava(2320, 800), lava(3780, 450),
      spikes(1300, 470, 60, 'ember'), spikes(3350, 470, 50, 'ember'), spikes(4650, 470, 60, 'ember'), spikes(5200, 470, 60, 'ember'),
    ],
    pads: [pad(4580, 470)],
    gems: flat(
      line(200, 430, 5, 44), arc(810, 400, 60, 4), line(960, 430, 3, 44), arc(1560, 340, 100, 5),
      line(1760, 430, 3, 44), line(2020, 430, 3, 44), line(2380, 340, 1), line(2400, 230, 1),
      line(2580, 225, 6, 70), [{ x: 3100, y: 320 }], line(3180, 430, 4, 44),
      line(3850, 400, 1), line(4000, 390, 1), line(4150, 400, 1),
      line(4300, 430, 3, 44), line(4720, 235, 3, 44), line(4950, 430, 2, 44), line(5350, 430, 3, 44),
    ),
    checkpoints: [cp(110), cp(930), cp(1730), cp(3150), cp(4240)],
    enemies: [foe(620, 500, 690), foe(1150, 940, 1380), foe(1960, 1740, 2300), foe(2800, 2560, 3040, 260), foe(3500, 3160, 3760), foe(4560, 4260, 4800), foe(5150, 4950, 5300), foe(5400, 5300, 5520)],
    spawn: { x: 120, y: 410 },
    tube: tubeOn(5420),
  };

  // ======================================================================================
  // 5 — FROSTLINE PASS: final level. Slippery ice, icicle hazards, ferry ice floes, a pad shortcut, a gauntlet.
  // ======================================================================================
  const level5 = {
    id: 'frostline-pass',
    name: 'Frostline Pass',
    tagline: 'Slippery ice, long drops, one big finale.',
    worldW: 6000,
    theme: {
      palette: 'frost', preview: ['#0a1d3f', '#4a86d0', '#e4f6ff'], ridge: ['#b7d4f0', '#7aa6d8'],
      ambient: { kind: 'snow', count: 90, color: '#ffffff' }, fogBottom: '#bfe6ff', vignette: 0.3,
    },
    banner: 'FROZEN PASS • ICE IS SLIPPERY — PLAN YOUR STOPS',
    platforms: [
      ground(0, 800, 'snow-ground'),
      ground(960, 480, 'ice-ground', GROUND, 70),
      ledge(1000, 380, 110, 'ice-ledge'),
      ground(1580, 420, 'snow-ground', 430),
      ground(2150, 360, 'ice-ground', 390, 150),
      mover(2560, 400, 100, 'ice-ledge', 'x', 60, 1.0),
      ground(2780, 480, 'snow-ground'),
      ledge(2980, 360, 110, 'ice-ledge'),
      ledge(3340, 410, 90, 'ice-ledge', { slick: true }), ledge(3480, 360, 90, 'ice-ledge', { slick: true }),
      ledge(3620, 310, 90, 'ice-ledge', { slick: true }),
      ground(3780, 500, 'ice-ground'),
      crumble(4400, 430, 100, 'ice-ledge'), crumble(4540, 420, 100, 'ice-ledge'),
      ground(4700, 1300, 'snow-ground'),
      ledge(5000, 330, 140, 'ice-ledge', { slick: true }),
      ledge(5300, 270, 150, 'ice-ledge'),
    ],
    objects: flat(
      bricks(500, 470, 2, 2), bricks(1100, 470, 2, 1), [boulder(1750, 430)], bricks(2300, 390, 2, 2),
      bricks(2950, 470, 2, 2), [crystal(3130, 470)], bricks(3900, 470, 2, 2), [boulder(4150, 470)],
      bricks(4850, 470, 2, 2), bricks(5250, 470, 2, 3), [boulder(5500, 470)], bricks(5600, 470, 2, 2),
    ),
    hazards: [
      spikes(860, 470, 60, 'ice'), spikes(1200, 470, 60, 'ice'), spikes(1880, 430, 60, 'ice'), spikes(2420, 390, 50, 'ice'),
      spikes(3050, 470, 60, 'ice'), spikes(4080, 470, 60, 'ice'), spikes(4980, 470, 60, 'ice'), spikes(5750, 470, 60, 'ice'),
    ],
    pads: [pad(3200, 470), pad(5120, 470)],
    gems: flat(
      line(220, 430, 4, 44), arc(880, 410, 70, 5), line(1020, 350, 3, 40), line(1300, 430, 3, 44),
      arc(1500, 380, 70, 5), line(1620, 390, 3, 44), line(1860, 390, 2, 50), line(2200, 350, 4, 50),
      line(2570, 360, 1), line(2820, 430, 4, 44), line(3000, 330, 3, 40), line(3226, 220, 1), line(3370, 380, 1),
      line(3500, 330, 1), line(3640, 280, 1), line(3820, 430, 4, 44),
      line(4410, 400, 1), line(4560, 390, 1), line(4760, 430, 3, 44), line(5030, 300, 3, 44), line(5320, 240, 3, 44),
      line(5420, 430, 3, 44),
    ),
    checkpoints: [cp(110), cp(980), cp(1600, 430), cp(2800), cp(3800), cp(4720)],
    enemies: [foe(620, 480, 740), foe(1200, 980, 1400), foe(1750, 1600, 1950, 430), foe(2320, 2170, 2480, 390), foe(2950, 2800, 3200), foe(3980, 3800, 4240), foe(4900, 4720, 5100), foe(5400, 5200, 5600), foe(5700, 5600, 5850)],
    spawn: { x: 120, y: 410 },
    tube: tubeOn(5880),
  };

  // ======================================================================================
  // TUNING LAYERS — added on top of the original routes (ids, names, spawn, checkpoints order and the
  // original gems all stay). Every level now offers: a high road (pad launch) with its own gem trail and a
  // sniper, a gated vault (bricks = any power, boulders = heavy powers, crystals = energy powers) holding a gem
  // cache, and a final stand before the tube. The validator still proves every gem and the tube reachable.
  // ======================================================================================
  const layer = (level, add) => {
    ['platforms', 'objects', 'hazards', 'pads', 'gems', 'enemies', 'checkpoints'].forEach((k) => { if (add[k]) level[k].push(...add[k]); });
    level.checkpoints.sort((a, b) => a.x - b.x);
    if (add.tagline) level.tagline = add.tagline;
    if (add.banner) level.banner = add.banner;
  };
  const trail = (ledges, dy = 34, n = 3, dx = 40) => flat(...ledges.map(([x, y, w]) => line(x + (w - (n - 1) * dx) / 2, y - dy, n, dx)));

  // 1 — SUNFLOWER RUN: Skyway (pad at x=700), Brick-and-Boulder Vault above the facility, a final stand.
  const sky1 = [[770, 215, 130], [1000, 180, 130], [1250, 150, 140], [1500, 170, 130], [1740, 200, 130], [1990, 165, 130], [2300, 195, 130]];
  layer(level1, {
    tagline: 'Meadow, river gorge, a sunny skyway and a vault. Pick your road.',
    platforms: [
      ...sky1.map(([x, y, w], i) => ledge(x, y, w, i % 2 ? 'log' : 'rock')),
      ledge(3150, 240, 300, 'facility'),            // vault floor
      ledge(3850, 330, 130, 'facility'),            // sniper perch before the tube
    ],
    objects: [boulder(3150, 240), ...bricks(3406, 240, 1, 2)],   // vault walls: boulder (heavy powers) and bricks (any power)
    pads: [pad(700, 470)],
    gems: [...trail(sky1), ...line(3260, 205, 4, 42)],
    enemies: [foe(1320, 1270, 1370, 150), foe(3910, 3860, 3960, 330)],
  });

  // 2 — LUMEN CAVERNS: Crystal Vault (energy powers), Crystal Skyway (pad at x=2580), a sniper-guarded final stand.
  const sky2 = [[2700, 190, 120], [2930, 160, 120], [3160, 150, 120], [3390, 175, 120], [3620, 150, 120], [3860, 180, 120], [4100, 150, 120]];
  layer(level2, {
    tagline: 'Glowing crystal tunnels. Mind the pits; a crystal skyway waits above.',
    platforms: [
      ...sky2.map(([x, y, w]) => ledge(x, y, w, 'crystal')),
      ledge(1150, 290, 230, 'crystal'),            // vault floor
      ledge(4760, 390, 100, 'crystal'),            // step up to the perch
      ledge(4900, 300, 150, 'crystal'),            // sniper perch
    ],
    objects: [crystal(1150, 290), crystal(1334, 290)],
    pads: [pad(2580, 470)],
    gems: [...trail(sky2), ...line(1215, 255, 3, 45), ...line(4930, 265, 3, 40)],
    enemies: [foe(3220, 3170, 3270, 150), foe(4980, 4910, 5040, 300)],
    checkpoints: [cp(4820)],
  });

  // 3 — CLOUDSPIRE CLIMB: Cloud Express (high road from the pad at x=1150), a boulder-and-brick vault, a crowded summit.
  const sky3 = [[1280, 160, 120], [1530, 130, 120], [1790, 150, 120], [2060, 120, 120], [2330, 140, 120], [2620, 110, 120]];
  layer(level3, {
    tagline: 'Hop between sky islands to the top, or ride the Cloud Express above.',
    platforms: [
      ...sky3.map(([x, y, w]) => ledge(x, y, w, 'cloud')),
      ledge(4440, 320, 130, 'cloud'),              // step up to the vault
      ledge(4720, 250, 260, 'cloud'),              // vault floor
    ],
    objects: [boulder(4720, 250), ...bricks(4936, 250, 1, 2)],
    gems: [...trail(sky3), ...line(4820, 215, 3, 45)],
    enemies: [foe(1850, 1800, 1900, 150), foe(4450, 4350, 4560, 430)],
  });

  // 4 — CINDER WORKS: Foundry Skyway (pad at x=1780), a heavy-power vault, a sniper perch above the last spikes.
  const sky4 = [[1900, 200, 120], [2150, 170, 120], [2400, 150, 120], [2650, 130, 120], [2900, 150, 120], [3150, 170, 120]];
  layer(level4, {
    tagline: 'The floor is lava. Literally. Take the catwalks or the skyway.',
    platforms: [
      ...sky4.map(([x, y, w]) => ledge(x, y, w, 'metal')),
      ledge(3290, 380, 100, 'metal'),              // step up to the vault
      ledge(3450, 300, 230, 'metal'),              // vault floor
      ledge(5100, 300, 140, 'metal'),              // sniper perch
    ],
    objects: [...bricks(3450, 300, 1, 2), boulder(3604, 300)],
    pads: [pad(1780, 470)],
    gems: [...trail(sky4), ...line(3510, 265, 3, 40), ...line(5130, 265, 3, 40)],
    enemies: [foe(2700, 2660, 2750, 130), foe(5170, 5110, 5230, 300)],
    checkpoints: [cp(5340)],
  });

  // 5 — FROSTLINE PASS: Ice Skyway (pad at x=1660), a crystal vault, a perch beside the tube.
  const sky5 = [[1760, 230, 120], [2000, 200, 120], [2250, 170, 120], [2500, 200, 120], [2760, 170, 120], [3040, 150, 120]];
  layer(level5, {
    tagline: 'Slippery ice, long drops, a skyway and one big finale.',
    platforms: [
      ...sky5.map(([x, y, w]) => ledge(x, y, w, 'ice-ledge')),
      ledge(4100, 380, 90, 'ice-ledge'),           // step up to the vault
      ledge(3960, 290, 240, 'ice-ledge'),          // vault floor
      ledge(5600, 320, 140, 'ice-ledge'),          // perch beside the tube
    ],
    objects: [crystal(3960, 290), crystal(4154, 290)],
    pads: [pad(1660, 430)],
    gems: [...trail(sky5), ...line(4040, 255, 3, 45), ...line(5630, 285, 3, 40)],
    enemies: [foe(2310, 2260, 2360, 170), foe(5670, 5610, 5730, 320)],
    checkpoints: [cp(5420)],
  });

  const LEVELS = [level1, level2, level3, level4, level5];

  // Enemies walk through props (they don't collide), so shrink every patrol to the widest gap between
  // bricks, boulders and crystals. Keeps authoring simple: patrols are drawn generously, then fitted.
  LEVELS.forEach((level) => {
    level.enemies.forEach((e) => {
      const blocks = level.objects
        .filter((o) => o.y < e.y + 26 && o.y + o.h > e.y - 26)
        .map((o) => [o.x - 24, o.x + o.w + 24]);
      let free = [[e.min, e.max]];
      blocks.forEach(([a, b]) => {
        free = free.flatMap(([l, r]) => (b <= l || a >= r ? [[l, r]] : [[l, Math.min(a, r)], [Math.max(b, l), r]].filter(([x, y]) => y > x)));
      });
      if (!free.length) return;
      const [l, r] = free.reduce((m, f) => (f[1] - f[0] > m[1] - m[0] ? f : m));
      e.min = Math.round(l);
      e.max = Math.round(r);
      if (e.x < e.min || e.x > e.max) e.x = Math.round((e.min + e.max) / 2);
    });
  });
  // Ice is slippery by type, so the game and the validator read the same flag.
  LEVELS.forEach((l) => l.platforms.forEach((p) => { if (/^ice-/.test(p.type)) p.slick = true; }));
  root.SPRITE_LEVELS = LEVELS;
  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
}(typeof window !== 'undefined' ? window : globalThis));
