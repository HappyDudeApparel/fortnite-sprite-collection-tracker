import { buildAdventureWorld } from './adventure-world.js';
// World builder: turns a level definition into a THREE scene graph + the solids/hazards the sim needs.
// Performance rules: everything repeated is instanced, one Lambert material for the whole Kenney kit, one shadow
// light that follows the player, no per-frame allocation (scratch objects are module-level).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kenneyGeometry, kenneyMaterial } from './assets.js';
import { THEMES } from './levels.js';
import { makeSolid, moverOffset } from './sim.js';
import { Ambient } from './fx.js';

const S = 2; // Kenney unit -> world scale
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export const KIT = [
  'block-grass', 'block-grass-large', 'block-grass-long', 'block-grass-low', 'block-grass-low-large',
  'block-snow', 'block-snow-large', 'block-snow-long', 'block-snow-low', 'block-snow-low-large',
  'block-moving', 'spring', 'jewel', 'flag', 'heart', 'saw', 'spike-block',
  'tree', 'tree-pine-snow', 'tree-snow', 'rocks', 'stones', 'flowers', 'flowers-tall', 'mushrooms', 'grass',
];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ------------------------------------------------------------------------------------------------ shaders
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`;
const SKY_FRAG = `
varying vec3 vDir; uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot; uniform vec3 sunDir; uniform vec3 sunCol;
void main(){
  float h = vDir.y;
  vec3 c = mix(cBot, cMid, smoothstep(-0.12, 0.28, h));
  c = mix(c, cTop, smoothstep(0.22, 0.85, h));
  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 28.0) * 0.28 + pow(s, 6.0) * 0.12);
  gl_FragColor = vec4(c, 1.0);
}`;

const WATER_VERT = `
#include <common>
#include <fog_pars_vertex>
uniform float uTime; varying vec3 vW; varying float vH;
void main(){
  vec3 p = position;
  float w = sin(p.x * 0.09 + uTime * 0.9) * 0.55 + sin(p.z * 0.07 - uTime * 0.7) * 0.5 + sin((p.x + p.z) * 0.21 + uTime * 1.6) * 0.18;
  p.y += w; vH = w; vW = (modelMatrix * vec4(p, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FRAG = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 cDeep; uniform vec3 cShallow; uniform float uTime; uniform float uLava; varying vec3 vW; varying float vH;
void main(){
  float v = 0.5 + 0.22 * sin(vW.x * 0.09 + vW.z * 0.05 + uTime * 0.35) + 0.2 * sin(vW.z * 0.075 - vW.x * 0.04 - uTime * 0.28) + 0.08 * sin((vW.x + vW.z) * 0.23 + uTime * 0.9);
  float streak = smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(vW.x * 0.11 + vW.z * 0.09 + uTime * 0.5 + vH * 2.0)) * smoothstep(0.35, 0.8, v);
  vec3 c = mix(cDeep, cShallow, v * 0.7 + vH * 0.2);
  c += vec3(1.0, 0.95, 0.8) * streak * (uLava > 0.5 ? 0.55 : 0.07);
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

const AURORA_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const AURORA_FRAG = `
varying vec2 vUv; uniform float uTime; uniform vec3 cA; uniform vec3 cB; uniform float uPhase;
void main(){
  float wave = sin(vUv.x * 9.0 + uTime * 0.35 + uPhase) * 0.5 + 0.5;
  float cur = sin(vUv.x * 22.0 - uTime * 0.6 + uPhase * 2.0) * 0.5 + 0.5;
  float v = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
  float a = v * (0.25 + 0.5 * wave) * (0.6 + 0.4 * cur) * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  gl_FragColor = vec4(mix(cA, cB, vUv.y + wave * 0.3) * a, a);
}`;

const TUBE_FRAG = `
varying vec2 vUv; uniform float uTime; uniform float uPower;
void main(){
  float swirl = 0.5 + 0.5 * sin(vUv.x * 18.0 + vUv.y * 9.0 - uTime * 3.0);
  float swirl2 = 0.5 + 0.5 * sin(vUv.x * 11.0 - vUv.y * 14.0 + uTime * 2.2);
  float rise = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
  float a = (0.18 + 0.5 * swirl * swirl2) * (0.55 + rise) * (0.65 + uPower);
  vec3 c = mix(vec3(0.2, 0.85, 1.0), vec3(0.8, 0.5, 1.0), vUv.y * 0.8 + swirl2 * 0.3);
  gl_FragColor = vec4(c * (1.0 + uPower), a);
}`;

function makeCanvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------------------------------------ terrain
function rockGeometry(level, theme) {
  const r = rng(77);
  const pieces = [];
  const c0 = new THREE.Color(theme.rock[0]), c1 = new THREE.Color(theme.rock[1]);
  const paint = (g, c) => {
    const n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) { tmpColor.copy(c).multiplyScalar(0.9 + r() * 0.2); arr[i * 3] = tmpColor.r; arr[i * 3 + 1] = tmpColor.g; arr[i * 3 + 2] = tmpColor.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  };
  for (const isl of level.islands) {
    const topY = isl.y - (isl.low ? 1 : 2);
    let y = topY;
    const layers = 3;
    for (let k = 0; k < layers; k += 1) {
      const f = 1 - 0.2 * (k + 1);
      const h = 1.6 + r() * 0.8;
      const g = new THREE.BoxGeometry(isl.w * 2 * f + (r() - 0.5) * 0.6, h, isl.d * 2 * f + (r() - 0.5) * 0.6);
      g.translate(isl.x + (r() - 0.5) * 0.6, y - h / 2, isl.z + (r() - 0.5) * 0.6);
      tmpColor.copy(c0).lerp(c1, k / layers);
      paint(g, tmpColor);
      pieces.push(g);
      y -= h * 0.9;
    }
    const spike = new THREE.CylinderGeometry(Math.min(isl.w, isl.d) * 0.55, 0.15, 3 + r() * 3, 5, 1);
    spike.translate(isl.x + (r() - 0.5), y - 1.2, isl.z + (r() - 0.5));
    tmpColor.copy(c1).multiplyScalar(0.8);
    paint(spike, tmpColor);
    pieces.push(spike);
  }
  const merged = mergeGeometries(pieces.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  pieces.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function farIslandsGeometry(theme, seed) {
  const r = rng(seed);
  const parts = [];
  const top = new THREE.Color(theme.farTop), r0 = new THREE.Color(theme.rock[0]), r1 = new THREE.Color(theme.rock[1]);
  const paint = (g, c) => {
    const n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  };
  for (let i = 0; i < 22; i += 1) {
    const a = r() * Math.PI * 2, dist = 130 + r() * 170;
    const w = 14 + r() * 40, y = -30 + r() * 80;
    const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
    const t = new THREE.BoxGeometry(w, 3, w * (0.6 + r() * 0.5)); t.translate(x, y, z); paint(t, top); parts.push(t);
    const c = new THREE.CylinderGeometry(w * 0.46, w * 0.05, w * (0.5 + r() * 0.5), 6, 1); c.translate(x, y - 1.5 - w * 0.3, z); paint(c, r0.clone().lerp(r1, r())); parts.push(c);
    if (r() < 0.7) { const p = new THREE.ConeGeometry(w * 0.12, 6 + r() * 12, 5); p.translate(x + (r() - 0.5) * w * 0.4, y + 3 + 3, z + (r() - 0.5) * w * 0.3); paint(p, top.clone().multiplyScalar(0.7)); parts.push(p); }
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

// Greedy pack of an island's top into Kenney blocks (2x2 > 2x1 > 1x1). Returns [{kind, x, z}] in world coords.
function packTop(isl) {
  const nx = Math.max(1, Math.round(isl.w)), nz = Math.max(1, Math.round(isl.d));
  const x0 = isl.x - nx, z0 = isl.z - nz;
  const used = new Uint8Array(nx * nz);
  const out = [];
  for (let j = 0; j < nz; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      if (used[j * nx + i]) continue;
      const canX = i + 1 < nx && !used[j * nx + i + 1];
      const canZ = j + 1 < nz && !used[(j + 1) * nx + i];
      if (canX && canZ && !used[(j + 1) * nx + i + 1]) {
        used[j * nx + i] = used[j * nx + i + 1] = used[(j + 1) * nx + i] = used[(j + 1) * nx + i + 1] = 1;
        out.push({ kind: 'large', x: x0 + (i + 1) * 2, z: z0 + (j + 1) * 2 });
      } else if (canX) {
        used[j * nx + i] = used[j * nx + i + 1] = 1;
        out.push({ kind: 'long', x: x0 + (i + 1) * 2, z: z0 + (j + 0.5) * 2 });
      } else {
        used[j * nx + i] = 1;
        out.push({ kind: 'single', x: x0 + (i + 0.5) * 2, z: z0 + (j + 0.5) * 2 });
      }
    }
  }
  return out;
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// ------------------------------------------------------------------------------------------------ build
export async function buildWorld(scene, level, quality, gfx) {
  if (level.adventure) return buildAdventureWorld(scene,level,quality,gfx);
  const theme = THEMES[level.theme];
  const group = new THREE.Group();
  scene.add(group);
  const disposables = [];
  const own = (o) => { disposables.push(o); return o; };

  // geometry from the kit
  const names = new Set(KIT);
  const geo = {};
  await Promise.all([...names].map(async (n) => { geo[n] = await kenneyGeometry(n); }));
  const kitMat = own(kenneyMaterial(theme.tint));
  const gemMat = own(new THREE.MeshLambertMaterial({ map: kitMat.map, emissive: 0xffffff, emissiveMap: kitMat.map, emissiveIntensity: 0.55 }));

  // fog + clear colour + lights
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
  gfx.renderer.setClearColor(theme.fog);
  const hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]);
  group.add(hemi);
  const sunDir = new THREE.Vector3(...theme.sun[2]).normalize();
  const sun = new THREE.DirectionalLight(theme.sun[0], theme.sun[1]);
  sun.castShadow = true;
  const SH = 26;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 150 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  sun.shadow.mapSize.set(1024, 1024);
  group.add(sun, sun.target);

  // ---- sky dome
  const skyMat = own(new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cTop: { value: new THREE.Color(theme.sky[0]) }, cMid: { value: new THREE.Color(theme.sky[1]) }, cBot: { value: new THREE.Color(theme.sky[2]) },
      sunDir: { value: sunDir.clone() }, sunCol: { value: new THREE.Color(theme.sun[0]) },
    },
  }));
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(520, 28, 14)), skyMat);
  sky.renderOrder = -10; sky.frustumCulled = false;
  group.add(sky);

  const extras = { aurora: [], stars: null, clouds: [] };
  if (theme.stars) {
    const n = 520, pos = new Float32Array(n * 3), r = rng(3);
    for (let i = 0; i < n; i += 1) {
      const a = r() * Math.PI * 2, e = Math.acos(1 - r() * 0.95);
      pos[i * 3] = Math.sin(e) * Math.cos(a) * 480; pos[i * 3 + 1] = Math.cos(e) * 480; pos[i * 3 + 2] = Math.sin(e) * Math.sin(a) * 480;
    }
    const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, own(new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false })));
    stars.frustumCulled = false; stars.renderOrder = -9; group.add(stars); extras.stars = stars;
  }
  if (theme.aurora) {
    const cols = [[0x3dffb0, 0x4aa8ff], [0x8a6cff, 0x3dffd0], [0x4affd8, 0xa070ff]];
    cols.forEach((c, i) => {
      const g = own(new THREE.PlaneGeometry(420, 70, 48, 1));
      const m = own(new THREE.ShaderMaterial({
        vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        uniforms: { uTime: { value: 0 }, cA: { value: new THREE.Color(c[0]) }, cB: { value: new THREE.Color(c[1]) }, uPhase: { value: i * 1.7 } },
      }));
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(-30 + i * 45, 62 + i * 14, -230 + i * 40);
      mesh.rotation.set(-0.12, 0.15 * (i - 1), 0);
      mesh.renderOrder = -8; mesh.frustumCulled = false;
      group.add(mesh); extras.aurora.push(m);
    });
  }
  if (theme.clouds) {
    const tex = own(makeCanvasTexture(128, (g, s) => {
      for (let i = 0; i < 9; i += 1) {
        const x = s * (0.2 + 0.6 * ((i * 37) % 10) / 10), y = s * (0.4 + 0.2 * (((i * 53) % 10) / 10 - 0.5)), r = s * (0.18 + 0.08 * ((i * 17) % 5) / 5);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }
    }));
    const r = rng(11);
    const mat = own(new THREE.SpriteMaterial({ map: tex, fog: false, transparent: true, opacity: 0.85, depthWrite: false, color: 0xffffff }));
    for (let i = 0; i < 14; i += 1) {
      const sp = new THREE.Sprite(mat);
      const a = r() * Math.PI * 2, d = 110 + r() * 200;
      sp.position.set(Math.cos(a) * d, 35 + r() * 60, Math.sin(a) * d);
      const sc = 70 + r() * 90; sp.scale.set(sc, sc * 0.5, 1);
      sp.userData.drift = 0.4 + r() * 0.8; sp.userData.ang = a; sp.userData.d = d;
      group.add(sp); extras.clouds.push(sp);
    }
  }

  // ---- sea / lava
  const waterMat = own(new THREE.ShaderMaterial({
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, cDeep: { value: new THREE.Color(theme.water[0]) }, cShallow: { value: new THREE.Color(theme.water[1]) }, uLava: { value: theme.lava ? 1 : 0 } }]),
  }));
  const water = new THREE.Mesh(own(new THREE.PlaneGeometry(1100, 1100, 56, 56).rotateX(-Math.PI / 2)), waterMat);
  water.position.y = -21;
  group.add(water);

  // ---- terrain: instanced top blocks + merged rock undersides
  const blockKey = (kind, low) => `block-${theme.blocks}${kind === 'large' ? (low ? '-low-large' : '-large') : kind === 'long' ? '-long' : (low ? '-low' : '')}`;
  const tiles = {};
  level.islands.forEach((isl) => {
    packTop(isl).forEach((t) => {
      const name = blockKey(t.kind, isl.low);
      // 'long' blocks are 2 along x by default; the pack emits them along x only.
      (tiles[name] = tiles[name] || []).push({ x: t.x, y: isl.y - (isl.low ? 1 : 2), z: t.z });
    });
  });
  const blockMeshes = [];
  for (const [name, list] of Object.entries(tiles)) {
    const g = geo[name] || geo['block-grass'];
    const im = new THREE.InstancedMesh(g, kitMat, list.length);
    list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(S); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.receiveShadow = true;
    group.add(im); blockMeshes.push(im);
  }
  const rockGeo = own(rockGeometry(level, theme));
  const rocks = new THREE.Mesh(rockGeo, own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  rocks.frustumCulled = false; rocks.receiveShadow = true;
  group.add(rocks);

  const far = new THREE.Mesh(own(farIslandsGeometry(theme, 91)), own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  far.frustumCulled = false;
  group.add(far);

  // ---- props (non-colliding scenery) kept off the walking lines
  const path = [];
  for (let i = 0; i + 1 < level.islands.length; i += 1) path.push([level.islands[i].x, level.islands[i].z, level.islands[i + 1].x, level.islands[i + 1].z]);
  const keepClear = [...level.flags, ...level.springs, ...level.enemies, ...(level.goal ? [level.goal] : []), ...level.saws];
  const clearOf = (x, z, band, radius) => {
    for (const s of path) if (distToSegment(x, z, s[0], s[1], s[2], s[3]) < band) return false;
    for (const k of keepClear) if (Math.hypot(k.x - x, k.z - z) < radius) return false;
    return true;
  };
  const treeKinds = theme.blocks === 'snow' ? ['tree-pine-snow', 'tree-snow', 'tree-pine-snow'] : ['tree'];
  const smallKinds = theme.blocks === 'snow' ? ['rocks', 'stones'] : theme.lava ? ['rocks', 'stones', 'mushrooms'] : ['flowers', 'flowers-tall', 'grass', 'rocks', 'mushrooms', 'flowers'];
  const props = {};
  const addProp = (kind, x, y, z, s, ry) => { (props[kind] = props[kind] || []).push({ x, y, z, s, ry }); };
  const rp = rng(2024);
  level.islands.forEach((isl, idx) => {
    const area = isl.w * isl.d * 4;
    const edgePoint = (inset) => {
      const side = Math.floor(rp() * 4), u = rp() * 2 - 1;
      if (side === 0) return [isl.x + u * (isl.w - inset), isl.z - (isl.d - inset)];
      if (side === 1) return [isl.x + u * (isl.w - inset), isl.z + (isl.d - inset)];
      if (side === 2) return [isl.x - (isl.w - inset), isl.z + u * (isl.d - inset)];
      return [isl.x + (isl.w - inset), isl.z + u * (isl.d - inset)];
    };
    const trees = idx === 0 ? 1 : Math.min(2, Math.floor(area / 36));
    for (let t = 0; t < trees; t += 1) {
      for (let tryN = 0; tryN < 10; tryN += 1) {
        const [x, z] = edgePoint(0.9 + rp() * 0.6);
        if (!clearOf(x, z, 3.4, 3.2)) continue;
        addProp(treeKinds[Math.floor(rp() * treeKinds.length)], x, isl.y, z, 1.35 + rp() * 0.55, rp() * 6.28);
        break;
      }
    }
    const smalls = Math.min(9, Math.floor(area / 11));
    for (let t = 0; t < smalls; t += 1) {
      for (let tryN = 0; tryN < 8; tryN += 1) {
        const [x, z] = rp() < 0.7 ? edgePoint(0.6 + rp() * 1.6) : [isl.x + (rp() * 2 - 1) * (isl.w - 1), isl.z + (rp() * 2 - 1) * (isl.d - 1)];
        if (!clearOf(x, z, 1.7, 1.8)) continue;
        addProp(smallKinds[Math.floor(rp() * smallKinds.length)], x, isl.y, z, 1.6 + rp() * 1.0, rp() * 6.28);
        break;
      }
    }
  });
  const propMeshes = [];
  for (const [kind, list] of Object.entries(props)) {
    const im = new THREE.InstancedMesh(geo[kind], kitMat, list.length);
    list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
    im.castShadow = kind.startsWith('tree'); im.receiveShadow = true;
    group.add(im); propMeshes.push(im);
  }

  // ---- solids
  const solids = [];
  level.islands.forEach((i, idx) => solids.push(makeSolid(i.x - i.w, i.x + i.w, i.y - (i.low ? 1 : 2), i.y, i.z - i.d, i.z + i.d, { id: 'i' + idx, kind: 'island', idx })));
  const movers = level.movers.map((m, idx) => {
    const solid = makeSolid(m.x - m.w, m.x + m.w, m.y - 0.6, m.y, m.z - m.d, m.z + m.d, { id: 'm' + idx, kind: 'mover', mover: true });
    solids.push(solid);
    const mesh = new THREE.Mesh(geo['block-moving'], kitMat);
    mesh.scale.set(m.w * 2, 2, m.d * 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    return { def: m, solid, mesh, px: m.x, py: m.y, pz: m.z };
  });

  // ---- collectibles
  const gems = level.gems.map((g, i) => ({ x: g.x, y: g.y, z: g.z, got: false, phase: i * 0.6 }));
  const gemMesh = new THREE.InstancedMesh(geo['jewel'], gemMat, Math.max(1, gems.length));
  gemMesh.frustumCulled = false;
  group.add(gemMesh);
  const hearts = level.hearts.map((h) => {
    const mesh = new THREE.Mesh(geo['heart'], gemMat);
    mesh.scale.setScalar(2.6); mesh.position.set(h.x, h.y, h.z); group.add(mesh);
    return { x: h.x, y: h.y, z: h.z, got: false, mesh };
  });
  const springs = level.springs.map((s) => {
    const mesh = new THREE.Mesh(geo['spring'], kitMat);
    mesh.scale.setScalar(2.4); mesh.position.set(s.x, s.y, s.z); mesh.castShadow = true; group.add(mesh);
    return Object.assign(s, { mesh, fired: 0 });
  });
  const flags = level.flags.map((f) => ({ x: f.x, y: f.y, z: f.z, active: false }));
  const nFlags = Math.max(1, flags.length);
  const flagMesh = new THREE.InstancedMesh(geo['flag'], kitMat, nFlags);
  flagMesh.frustumCulled = false; flagMesh.castShadow = true; group.add(flagMesh);
  const flagRingMat = own(new THREE.MeshBasicMaterial({ color: 0x7cf0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const ringMesh = new THREE.InstancedMesh(own(new THREE.RingGeometry(1.2, 1.7, 28).rotateX(-Math.PI / 2)), flagRingMat, nFlags);
  ringMesh.frustumCulled = false; group.add(ringMesh);
  const saws = level.saws.map((s) => {
    const mesh = new THREE.Mesh(geo['saw'], kitMat);
    mesh.scale.setScalar(2.1); mesh.castShadow = true;
    if (s.axis === 'z') mesh.rotation.y = Math.PI / 2;
    group.add(mesh);
    return { def: s, mesh, x: s.x, y: s.y, z: s.z, r: s.r, spin: 0 };
  });
  const spikes = level.spikes.map((s) => ({ x: s.x, y: s.y, z: s.z, r: s.r }));
  if (spikes.length) {
    const sm = new THREE.InstancedMesh(geo['spike-block'], kitMat, spikes.length);
    spikes.forEach((s, i) => { dummy.position.set(s.x, s.y - 0.9, s.z); dummy.rotation.set(0, i * 0.9, 0); dummy.scale.setScalar(2); dummy.updateMatrix(); sm.setMatrixAt(i, dummy.matrix); });
    sm.instanceMatrix.needsUpdate = true; sm.frustumCulled = false; sm.castShadow = true; group.add(sm);
  }

  // ---- goal tube
  const goal = level.goal;
  const tube = new THREE.Group();
  tube.position.set(goal.x, goal.y, goal.z);
  const glass = new THREE.Mesh(own(new THREE.CylinderGeometry(1.6, 1.6, 6.4, 28, 1, true)), own(new THREE.MeshBasicMaterial({ color: 0x9deaff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
  glass.position.y = 3.4;
  const tubeUniforms = { uTime: { value: 0 }, uPower: { value: 0 } };
  const energy = new THREE.Mesh(own(new THREE.CylinderGeometry(1.35, 1.35, 6.0, 28, 8, true)), own(new THREE.ShaderMaterial({
    vertexShader: AURORA_VERT, fragmentShader: TUBE_FRAG, uniforms: tubeUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  })));
  energy.position.y = 3.4;
  const baseMat = own(new THREE.MeshLambertMaterial({ color: 0x2c4a5c, emissive: 0x1d6a88, emissiveIntensity: 0.8 }));
  const base = new THREE.Mesh(own(new THREE.CylinderGeometry(2.4, 2.7, 0.7, 28)), baseMat); base.position.y = 0.35;
  const cap = new THREE.Mesh(own(new THREE.CylinderGeometry(2.1, 2.3, 0.6, 28)), baseMat); cap.position.y = 6.8;
  const ringMat = own(new THREE.MeshBasicMaterial({ color: 0x8ff6ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const rings = [0, 1, 2].map((i) => { const m = new THREE.Mesh(own(new THREE.TorusGeometry(2.05, 0.07, 8, 40).rotateX(Math.PI / 2)), ringMat); m.userData.i = i; tube.add(m); return m; });
  const beam = new THREE.Mesh(own(new THREE.CylinderGeometry(0.9, 1.5, 120, 20, 1, true)), own(new THREE.MeshBasicMaterial({ color: 0x7cf0ff, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  beam.position.y = 66;
  tube.add(glass, energy, base, cap, beam);
  group.add(tube);

  // ---- ambient weather
  let ambient = null;
  if (theme.ambient) {
    ambient = new Ambient(theme.ambient.kind, theme.ambient.count, theme.ambient.color);
    group.add(ambient.sys.points);
  }

  // ---- quality hooks
  function applyQuality(q) {
    sun.castShadow = q.shadow > 0;
    if (q.shadow > 0 && sun.shadow.mapSize.x !== q.shadow) {
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    far.visible = q.far;
    extras.clouds.forEach((c, i) => { c.visible = q.far || i < 5; });
    if (ambient) ambient.sys.points.geometry.setDrawRange(0, Math.floor(ambient.count * q.ambient));
  }
  applyQuality(quality);

  const world = {
    minY: Math.min(...level.islands.map((i) => i.y)), level, theme, group, solids, movers, gems, hearts, springs, flags, saws, spikes, goal, ambient, tube, gemMesh, sun, sunDir, applyQuality,
    castMeshes: [],
    tubePower: 0,
    shadowSize: SH,

    stepMovers(t) {
      for (let i = 0; i < movers.length; i += 1) {
        const m = movers[i], d = m.def, s = m.solid;
        const o = moverOffset(d, t);
        const nx = d.x + o[0], ny = d.y + o[1], nz = d.z + o[2];
        s.dx = nx - m.px; s.dy = ny - m.py; s.dz = nz - m.pz;
        m.px = nx; m.py = ny; m.pz = nz;
        s.x0 = nx - d.w; s.x1 = nx + d.w; s.y0 = ny - 0.6; s.y1 = ny; s.z0 = nz - d.d; s.z1 = nz + d.d;
      }
      for (let i = 0; i < saws.length; i += 1) {
        const s = saws[i], d = s.def, o = moverOffset(d, t);
        s.x = d.x + (d.axis === 'x' ? o[0] : 0); s.z = d.z + (d.axis === 'z' ? o[2] : 0); s.y = d.y;
      }
    },

    /** Visual update, once per rendered frame. */
    render(dt, t, camPos, playerPos) {
      for (let i = 0; i < movers.length; i += 1) movers[i].mesh.position.set(movers[i].px, movers[i].py - 0.0, movers[i].pz);
      for (let i = 0; i < saws.length; i += 1) { const s = saws[i]; s.spin += dt * 9; s.mesh.position.set(s.x, s.y, s.z); s.mesh.rotation.z = s.spin; }
      for (let i = 0; i < gems.length; i += 1) {
        const g = gems[i];
        if (g.got) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
        else { dummy.position.set(g.x, g.y + Math.sin(t * 2.6 + g.phase) * 0.18, g.z); dummy.rotation.set(0, t * 1.9 + g.phase, 0); dummy.scale.setScalar(1.9); }
        dummy.updateMatrix(); gemMesh.setMatrixAt(i, dummy.matrix);
      }
      gemMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < hearts.length; i += 1) {
        const h = hearts[i]; h.mesh.visible = !h.got;
        h.mesh.position.y = h.y + Math.sin(t * 2.2 + i) * 0.2; h.mesh.rotation.y = t * 1.6;
      }
      for (let i = 0; i < springs.length; i += 1) {
        const s = springs[i]; s.fired = Math.max(0, s.fired - dt);
        const k = s.fired > 0 ? Math.sin((s.fired / 0.35) * Math.PI) : 0;
        s.mesh.scale.set(2.4 * (1 + k * 0.25), 2.4 * (1 - k * 0.45), 2.4 * (1 + k * 0.25));
      }
      for (let i = 0; i < flags.length; i += 1) {
        const f = flags[i];
        dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(0, f.active ? Math.sin(t * 2 + i) * 0.15 : 0, 0); dummy.scale.setScalar(3.2); dummy.updateMatrix(); flagMesh.setMatrixAt(i, dummy.matrix);
        dummy.position.set(f.x, f.y + 0.05, f.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(f.active ? 1 + Math.sin(t * 2 + i) * 0.06 : 0); dummy.updateMatrix(); ringMesh.setMatrixAt(i, dummy.matrix);
      }
      flagMesh.instanceMatrix.needsUpdate = true; ringMesh.instanceMatrix.needsUpdate = true;
      flagRingMat.opacity = 0.5 + Math.sin(t * 3) * 0.18;
      tubeUniforms.uTime.value = t; tubeUniforms.uPower.value = this.tubePower;
      for (const r of rings) {
        const k = (t * 0.45 + r.userData.i / 3) % 1;
        r.position.y = 0.8 + k * 6; r.scale.setScalar(1 + this.tubePower * 0.4); r.material.opacity = 0.8 * Math.sin(k * Math.PI);
      }
      waterMat.uniforms.uTime.value = t;
      for (const a of extras.aurora) a.uniforms.uTime.value = t;
      for (const c of extras.clouds) { c.userData.ang += dt * 0.004 * c.userData.drift; c.position.x = Math.cos(c.userData.ang) * c.userData.d; c.position.z = Math.sin(c.userData.ang) * c.userData.d; }
      sky.position.copy(camPos);
      if (extras.stars) extras.stars.position.copy(camPos);
      for (const a of extras.aurora) { /* fixed in world: parallax feels right */ }
      water.position.x = Math.round(camPos.x / 20) * 20; water.position.z = Math.round(camPos.z / 20) * 20;
      if (ambient) ambient.update(dt, camPos);
      // follow-shadow light, texel snapped to avoid shimmer
      const texel = (SH * 2) / (sun.shadow.mapSize.x || 1024);
      const tx = Math.round(playerPos.x / texel) * texel, tz = Math.round(playerPos.z / texel) * texel, ty = Math.round(playerPos.y / texel) * texel;
      sun.target.position.set(tx, ty, tz);
      sun.position.set(tx + sunDir.x * 70, ty + sunDir.y * 70, tz + sunDir.z * 70);
    },

    dispose() {
      scene.remove(group);
      scene.fog = null;
      disposables.forEach((d) => d.dispose && d.dispose());
      group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      if (sun.shadow.map) sun.shadow.map.dispose();
    },
  };
  return world;
}
