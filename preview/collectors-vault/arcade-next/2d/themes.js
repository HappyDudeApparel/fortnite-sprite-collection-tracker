/* Sprite Arcade 2D — visual themes for the level pack (canvas painters, no external assets).
 *
 * build(level) returns { sky, layers:[{ img, speed }], vignette }:
 *   sky      static 960×540 backdrop
 *   layers   seamlessly tiling parallax strips (TILE px wide), far → near
 *   vignette 960×540 edge-darkening overlay
 * Everything is procedural so the staging build stays a few KB and needs no licensed artwork.
 */
(function (root) {
  'use strict';

  const W = 960, H = 540, TILE = 1920, TAU = Math.PI * 2;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  // Draw `fn(offset)` three times so shapes that cross the tile seam wrap around.
  function wrap(fn) { fn(0); fn(-TILE); fn(TILE); }

  // Periodic ridge: integer harmonics guarantee the strip tiles without a seam.
  function ridge(g, color, base, amps, seed, bottom = H) {
    const r = rng(seed);
    const ks = amps.map((a, i) => ({ a, k: [1, 3, 5, 9, 14][i % 5], p: r() * TAU }));
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, bottom);
    for (let x = 0; x <= TILE; x += 16) {
      let y = base;
      for (const { a, k, p } of ks) y -= Math.sin((x / TILE) * TAU * k + p) * a;
      g.lineTo(x, y);
    }
    g.lineTo(TILE, bottom);
    g.closePath();
    g.fill();
  }

  function glow(g, x, y, r, color, alpha) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color.replace('A', alpha));
    gr.addColorStop(1, color.replace('A', 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function skyGradient(stops) {
    const c = canvas(W, H), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, H);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return { c, g };
  }

  function stars(g, n, seed, maxY, alpha = 0.8) {
    const r = rng(seed);
    for (let i = 0; i < n; i += 1) {
      g.fillStyle = `rgba(255,255,255,${(0.25 + r() * alpha).toFixed(2)})`;
      const s = r() < 0.12 ? 2 : 1;
      g.fillRect(Math.floor(r() * W), Math.floor(r() * maxY), s, s);
    }
  }

  function strip(fn) {
    const c = canvas(TILE, H);
    fn(c.getContext('2d'));
    return c;
  }

  // ------------------------------------------------------------------ LUMEN CAVERNS
  function caveSky() {
    const { c, g } = skyGradient([[0, '#07061c'], [0.5, '#17155a'], [1, '#0d3b58']]);
    glow(g, 180, 430, 360, 'rgba(60,235,255,A)', 0.28);
    glow(g, 790, 380, 330, 'rgba(210,90,255,A)', 0.22);
    stars(g, 70, 11, 300, 0.5);
    return c;
  }
  function caveFar() {
    return strip((g) => {
      const r = rng(21);
      ridge(g, '#1c1858', 420, [38, 20, 9], 3);
      g.fillStyle = '#17124a';
      wrap((off) => {
        for (let i = 0; i < 16; i += 1) {
          const x = (i / 16) * TILE + r() * 40 + off, w = 60 + r() * 70, h = 90 + r() * 170;
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 0.5, h); g.closePath(); g.fill();
        }
      });
      ridge(g, '#120f3c', 480, [26, 14], 8);
    });
  }
  function caveMid() {
    return strip((g) => {
      const r = rng(33);
      const cols = [['#38f0e4', '#0c8a9a'], ['#c068ff', '#5b2a9e'], ['#4aa8ff', '#1b4a9e']];
      for (let n = 0; n < 11; n += 1) {
        const baseX = (n / 11) * TILE + r() * 60;
        const fromTop = r() < 0.4;
        const [light, dark] = cols[Math.floor(r() * cols.length)];
        wrap((off) => {
          const bx = baseX + off, by = fromTop ? 0 : 478;
          glow(g, bx, fromTop ? 70 : 430, 120, `rgba(${light === '#38f0e4' ? '56,240,228' : light === '#c068ff' ? '192,104,255' : '74,168,255'},A)`, 0.3);
          for (let k = 0; k < 4; k += 1) {
            const sx = bx + (k - 1.5) * 26 + (r() - 0.5) * 12, h = 54 + r() * 100, w = 18 + r() * 14, dir = fromTop ? 1 : -1;
            const tip = by + dir * h;
            g.fillStyle = dark;
            g.beginPath(); g.moveTo(sx - w / 2, by); g.lineTo(sx, tip); g.lineTo(sx + w / 2, by); g.closePath(); g.fill();
            g.fillStyle = light;
            g.beginPath(); g.moveTo(sx - w / 2, by); g.lineTo(sx, tip); g.lineTo(sx, by); g.closePath(); g.fill();
          }
        });
      }
    });
  }
  function caveNear() {
    return strip((g) => {
      const r = rng(47);
      g.fillStyle = '#080620';
      wrap((off) => {
        for (let i = 0; i < 9; i += 1) {
          const x = (i / 9) * TILE + r() * 80 + off, w = 40 + r() * 60, h = 40 + r() * 110;
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 0.45, h); g.closePath(); g.fill();
        }
      });
    });
  }

  // ------------------------------------------------------------------ CLOUDSPIRE CLIMB
  function skySky() {
    const { c, g } = skyGradient([[0, '#2f8cf5'], [0.45, '#8fd2ff'], [0.8, '#ffe7c2'], [1, '#ffd0d8']]);
    glow(g, 760, 360, 420, 'rgba(255,244,200,A)', 0.8);
    glow(g, 760, 360, 130, 'rgba(255,255,235,A)', 0.9);
    return c;
  }
  function skyFar() {
    return strip((g) => {
      const r = rng(5);
      wrap((off) => {
        for (let i = 0; i < 6; i += 1) {
          const x = (i / 6) * TILE + 80 + r() * 90 + off, y = 200 + r() * 170, w = 150 + r() * 120;
          g.fillStyle = 'rgba(150,176,226,.55)';
          g.beginPath(); g.ellipse(x, y, w / 2, 16, 0, Math.PI, 0); g.fill();
          g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y + 90 + r() * 40, x + w / 2, y); g.closePath(); g.fill();
          g.fillStyle = 'rgba(190,222,200,.6)';
          g.beginPath(); g.ellipse(x, y - 1, w / 2, 8, 0, Math.PI, 0); g.fill();
          if (r() < 0.6) { g.fillStyle = 'rgba(160,190,235,.6)'; g.fillRect(x - 6, y - 70 - r() * 40, 12, 70); g.beginPath(); g.moveTo(x - 10, y - 70); g.lineTo(x, y - 110 - r() * 30); g.lineTo(x + 10, y - 70); g.fill(); }
        }
      });
    });
  }
  function puffy(g, x, y, s, a, tint) {
    g.save(); g.globalAlpha = a;
    const gr = g.createLinearGradient(0, y - 40 * s, 0, y + 30 * s);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, tint);
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, 80 * s, 26 * s, 0, 0, TAU);
    g.ellipse(x - 50 * s, y + 6 * s, 52 * s, 22 * s, 0, 0, TAU);
    g.ellipse(x + 55 * s, y + 8 * s, 58 * s, 22 * s, 0, 0, TAU);
    g.ellipse(x + 6 * s, y - 20 * s, 52 * s, 32 * s, 0, 0, TAU);
    g.fill(); g.restore();
  }
  function skyMid() {
    return strip((g) => {
      const r = rng(9);
      wrap((off) => {
        for (let i = 0; i < 9; i += 1) puffy(g, (i / 9) * TILE + r() * 100 + off, 90 + r() * 330, 0.8 + r() * 0.9, 0.28 + r() * 0.2, '#c9dcff');
      });
    });
  }
  function skyNear() {
    return strip((g) => {
      const r = rng(15);
      wrap((off) => {
        for (let i = 0; i < 6; i += 1) puffy(g, (i / 6) * TILE + r() * 120 + off, 440 + r() * 90, 1.4 + r() * 0.8, 0.28, '#ffd9e6');
      });
    });
  }

  // ------------------------------------------------------------------ CINDER WORKS
  function foundrySky() {
    const { c, g } = skyGradient([[0, '#12060f'], [0.45, '#4a1318'], [0.8, '#c4421a'], [1, '#ff9a3a']]);
    glow(g, 500, 470, 520, 'rgba(255,150,50,A)', 0.55);
    stars(g, 30, 4, 160, 0.4);
    return c;
  }
  function foundryFar() {
    return strip((g) => {
      const r = rng(31);
      ridge(g, '#2a0f16', 400, [46, 22, 10], 14);
      wrap((off) => {
        for (let i = 0; i < 3; i += 1) {
          const x = (i / 3) * TILE + 220 + off, h = 170 + r() * 60;
          g.fillStyle = '#220b12';
          g.beginPath(); g.moveTo(x - 190, 500); g.lineTo(x - 36, 480 - h); g.lineTo(x + 36, 480 - h); g.lineTo(x + 190, 500); g.closePath(); g.fill();
          glow(g, x, 480 - h, 110, 'rgba(255,120,40,A)', 0.7);
          g.strokeStyle = '#ff7a2a'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(x - 20, 480 - h); g.quadraticCurveTo(x - 50, 480 - h / 2, x - 110, 495); g.stroke();
          g.beginPath(); g.moveTo(x + 14, 480 - h); g.quadraticCurveTo(x + 40, 480 - h / 2, x + 96, 495); g.stroke();
        }
      });
      ridge(g, '#1a0910', 490, [18, 9], 20);
    });
  }
  function foundryMid() {
    return strip((g) => {
      const r = rng(41);
      g.fillStyle = '#1d0c12';
      wrap((off) => {
        for (let i = 0; i < 10; i += 1) {
          const x = (i / 10) * TILE + r() * 60 + off, w = 70 + r() * 70, h = 90 + r() * 150;
          g.fillStyle = '#1d0c12';
          g.fillRect(x, 490 - h, w, h);
          if (r() < 0.6) { g.fillRect(x + w * 0.2, 490 - h - 60 - r() * 60, 20, 80); g.fillStyle = 'rgba(70,40,40,.5)'; g.beginPath(); g.arc(x + w * 0.2 + 10, 490 - h - 90, 22, 0, TAU); g.arc(x + w * 0.2 + 26, 490 - h - 120, 30, 0, TAU); g.fill(); }
          g.fillStyle = '#ff9a3a';
          for (let wy = 490 - h + 14; wy < 470; wy += 24) for (let wx = x + 10; wx < x + w - 14; wx += 20) if (r() < 0.35) g.fillRect(wx, wy, 8, 10);
        }
        g.strokeStyle = '#1d0c12'; g.lineWidth = 8;
        for (let i = 0; i < 4; i += 1) { const x = (i / 4) * TILE + 100 + off; g.beginPath(); g.moveTo(x, 490); g.lineTo(x, 300); g.lineTo(x + 120, 300); g.stroke(); }
      });
    });
  }
  function foundryNear() {
    return strip((g) => {
      const r = rng(59);
      wrap((off) => {
        for (let i = 0; i < 10; i += 1) {
          const x = (i / 10) * TILE + r() * 60 + off, w = 26 + r() * 40, h = 50 + r() * 140;
          g.fillStyle = '#10060a';
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 0.5, h); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,110,40,.5)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x + w * 0.5, 4); g.lineTo(x + w * 0.5, h * 0.8); g.stroke();
        }
      });
    });
  }

  // ------------------------------------------------------------------ FROSTLINE PASS
  function frostSky() {
    const { c, g } = skyGradient([[0, '#07163a'], [0.4, '#2a56a0'], [0.8, '#a9d8ff'], [1, '#eaf8ff']]);
    stars(g, 90, 2, 260, 0.9);
    const bands = [['rgba(80,255,190,A)', 0.34, 130], ['rgba(150,120,255,A)', 0.26, 190], ['rgba(70,230,255,A)', 0.2, 90]];
    bands.forEach(([col, a, y0], i) => {
      const gr = g.createLinearGradient(0, y0 - 80, 0, y0 + 90);
      gr.addColorStop(0, col.replace('A', 0)); gr.addColorStop(0.5, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, y0);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + Math.sin(x * 0.011 + i * 2) * 36 + Math.sin(x * 0.027 + i) * 14);
      for (let x = W; x >= 0; x -= 20) g.lineTo(x, y0 + 100 + Math.sin(x * 0.013 + i * 2) * 30);
      g.closePath(); g.fill();
    });
    return c;
  }
  function frostFar() {
    return strip((g) => {
      ridge(g, '#c9e3fa', 380, [70, 34, 16, 7], 6);
      ridge(g, '#92b9e6', 430, [40, 22, 9], 12);
    });
  }
  function pine(g, x, base, h, shade, snow) {
    g.fillStyle = shade;
    for (let t = 0; t < 4; t += 1) {
      const y = base - h + (t * h) / 4.4, w = (h * 0.18) * (1 + t * 0.55);
      g.beginPath(); g.moveTo(x - w, y + h / 3.6); g.lineTo(x, y); g.lineTo(x + w, y + h / 3.6); g.closePath(); g.fill();
    }
    g.fillStyle = snow;
    for (let t = 0; t < 4; t += 1) {
      const y = base - h + (t * h) / 4.4, w = (h * 0.18) * (1 + t * 0.55);
      g.beginPath(); g.moveTo(x - w * 0.55, y + h / 8); g.lineTo(x, y); g.lineTo(x + w * 0.55, y + h / 8); g.closePath(); g.fill();
    }
  }
  function frostMid() {
    return strip((g) => {
      const r = rng(63);
      ridge(g, '#3a5f96', 470, [14, 7], 18);
      wrap((off) => { for (let i = 0; i < 26; i += 1) pine(g, (i / 26) * TILE + r() * 40 + off, 496, 110 + r() * 90, '#17375f', 'rgba(235,248,255,.9)'); });
    });
  }
  function frostNear() {
    return strip((g) => {
      const r = rng(71);
      wrap((off) => {
        for (let i = 0; i < 7; i += 1) {
          const x = (i / 7) * TILE + r() * 100 + off, h = 60 + r() * 100;
          g.fillStyle = 'rgba(190,240,255,.55)';
          g.beginPath(); g.moveTo(x - 12, 540); g.lineTo(x - 4, 540 - h); g.lineTo(x + 4, 540 - h - 14); g.lineTo(x + 12, 540); g.closePath(); g.fill();
        }
      });
      ridge(g, 'rgba(243,251,255,.96)', 520, [16, 8], 25);
    });
  }

  const BUILDERS = {
    cave: () => ({ sky: caveSky(), layers: [{ img: caveFar(), speed: 0.18 }, { img: caveMid(), speed: 0.42 }, { img: caveNear(), speed: 0.78 }] }),
    sky: () => ({ sky: skySky(), layers: [{ img: skyFar(), speed: 0.1 }, { img: skyMid(), speed: 0.26 }, { img: skyNear(), speed: 0.58 }] }),
    foundry: () => ({ sky: foundrySky(), layers: [{ img: foundryFar(), speed: 0.12 }, { img: foundryMid(), speed: 0.34 }, { img: foundryNear(), speed: 0.72 }] }),
    frost: () => ({ sky: frostSky(), layers: [{ img: frostFar(), speed: 0.1 }, { img: frostMid(), speed: 0.32 }, { img: frostNear(), speed: 0.66 }] }),
  };

  function vignette(strength) {
    if (!strength) return null;
    const c = canvas(W, H), g = c.getContext('2d');
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.02);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }

  // Platform skins. kind: ground (dirt block), ledge (floating slab) or cloud (puffy).
  const STYLES = {
    'cave-ground': { kind: 'ground', dirt: ['#3d3170', '#17123a'], top: '#2fe0c8', topHi: '#9ffff1', speck: 'rgba(0,0,0,.3)', glow: '#35e0ff' },
    crystal: { kind: 'ledge', body: '#5b4aa8', hi: '#b69bff', glow: '#7be8ff', shards: true },
    'cloud-ground': { kind: 'cloud' },
    cloud: { kind: 'cloud', small: true },
    basalt: { kind: 'ground', dirt: ['#3d2b30', '#160d10'], top: '#ff7a2a', topHi: '#ffd08a', speck: 'rgba(0,0,0,.4)', glow: '#ff7a2a' },
    metal: { kind: 'ledge', body: '#4f5864', hi: '#a3afbe', glow: '#ff9a4a', rivets: true },
    'snow-ground': { kind: 'ground', dirt: ['#7385b0', '#3b4774'], top: '#f4fbff', topHi: '#ffffff', speck: 'rgba(20,30,70,.2)' },
    'ice-ground': { kind: 'ground', dirt: ['#5fc9ee', '#2b6fb2'], top: '#d9f7ff', topHi: '#ffffff', speck: 'rgba(255,255,255,.2)', shine: true },
    'ice-ledge': { kind: 'ledge', body: '#86d8fb', hi: '#ecfcff', glow: '#bff4ff', shine: true },
  };

  const HAZARD_STYLES = {
    spikes: { fill: '#8a939a' },
    energy: { fill: '#6ee9ff', stroke: 'rgba(206,255,255,.75)', pulse: true },
    crystal: { fill: '#c068ff', stroke: 'rgba(255,220,255,.8)', glow: '#c068ff' },
    ember: { fill: '#3a2226', stroke: '#ff7a2a', glow: '#ff7a2a' },
    ice: { fill: '#aee9ff', stroke: '#ffffff', glow: '#9fe3ff' },
  };

  function paintPreview(c, level) {
    const g = c.getContext('2d'), p = level.theme.preview, r = level.theme.ridge || ['#000', '#000'];
    const gr = g.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, p[0]); gr.addColorStop(0.6, p[1]); gr.addColorStop(1, p[2]);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    [[r[0], 0.62, 22], [r[1], 0.8, 14]].forEach(([col, base, amp], i) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, c.height);
      for (let x = 0; x <= c.width; x += 6) g.lineTo(x, c.height * base - Math.sin(x * 0.03 + i * 2) * amp - Math.sin(x * 0.011 + i) * amp * 0.6);
      g.lineTo(c.width, c.height); g.closePath(); g.fill();
    });
  }

  root.SPRITE_THEMES = {
    build(level) {
      const b = BUILDERS[level.theme.palette];
      if (!b) return null;
      const out = b();
      out.vignette = vignette(level.theme.vignette);
      return out;
    },
    style: (type) => STYLES[type] || null,
    hazardStyle: (type) => HAZARD_STYLES[type] || HAZARD_STYLES.spikes,
    paintPreview,
  };
}(window));
