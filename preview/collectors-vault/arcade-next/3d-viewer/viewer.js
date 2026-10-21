// Sprite Character Viewer — inspect any registered character from every angle, play its clips, and see how it
// scores against the pipeline rules. Staging only; reads the known-good game's models, never modifies them.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readGlbJson, inspect, check, verdict, TIERS } from './pipeline-rules.mjs';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const V = window.VIEWER = { ready: false, model: null, record: null, stats: null, results: null, errors: [] };

let renderer, scene, camera, mixer, action, clips = [], root = null, skeletonHelper = null, registry = null, catalog = null, lookUniforms = null;
const orbit = { theta: 0.6, phi: Math.PI / 2.15, radius: 4, target: new THREE.Vector3(0, 1, 0), min: 0.8, max: 14 };
const state = { turntable: false, playing: true, wire: false, skeleton: false, gameLook: false };
const PRESETS = { front: [0, Math.PI / 2.1], three: [0.62, Math.PI / 2.25], side: [Math.PI / 2, Math.PI / 2.1], back: [Math.PI, Math.PI / 2.1], top: [0.4, 0.12] };

function fail(message) {
  V.errors.push(message);
  const el = $('err'); el.style.display = 'grid'; el.textContent = message;
}
window.addEventListener('error', (e) => V.errors.push(String(e.message)));

function init() {
  const canvas = $('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#16405f');
  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight('#dff3ff', '#3a4f3f', 1.4));
  const key = new THREE.DirectionalLight('#fff3dd', 2.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.2); rim.position.set(-4, 3, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshStandardMaterial({ color: '#1d5a7a', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
  const grid = new THREE.GridHelper(4.8, 24, '#4fb4d8', '#2a6f93'); grid.position.y = 0.001; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
  addInput(canvas);
  new ResizeObserver(resize).observe($('view'));
  resize();
  renderer.setAnimationLoop(frame);
}

function resize() {
  const r = $('view').getBoundingClientRect();
  if (!r.width || !r.height) return;
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}

function addInput(canvas) {
  const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); pinch = 0; state.turntableHold = true; });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { orbit.theta -= (e.clientX - prev[0]) * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.05, orbit.phi - (e.clientY - prev[1]) * 0.008)); }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) orbit.radius = Math.min(orbit.max, Math.max(orbit.min, orbit.radius * (pinch / d)));
      pinch = d;
    }
  });
  const up = (e) => { pts.delete(e.pointerId); pinch = 0; state.turntableHold = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.radius = Math.min(orbit.max, Math.max(orbit.min, orbit.radius * Math.exp(e.deltaY * 0.001))); }, { passive: false });
}

function setView(name) { const p = PRESETS[name]; if (!p) return; orbit.theta = p[0]; orbit.phi = p[1]; V.view = name; }

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.turntable && !state.turntableHold) orbit.theta += dt * 0.6;
  if (mixer) {
    if (state.playing) mixer.update(dt);
    if (action) {
      const d = action.getClip().duration || 1;
      $('scrub').value = Math.round(((action.time % d) / d) * 1000);
      $('time').textContent = `${(action.time % d).toFixed(2)} / ${d.toFixed(2)} s`;
    }
  }
  if (lookUniforms) { lookUniforms.uTime.value += dt; lookUniforms.uMove.value = 0.5; }
  const { theta, phi, radius, target } = orbit;
  camera.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(target);
  renderer.render(scene, camera);
}

async function loadCharacter(id) {
  const record = registry.characters.find((c) => c.id === id) || registry.characters[0];
  V.ready = false; V.record = record;
  $('err').style.display = 'none';
  const url = registry.basePath + record.file;
  let buf, gltf;
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`${url}: ${resp.status}`);
    buf = await resp.arrayBuffer();
    gltf = await new GLTFLoader().parseAsync(buf.slice(0), url.replace(/[^/]*$/, ''));
  } catch (e) { fail(`Could not load ${record.file}: ${e.message}`); return; }

  if (root) { scene.remove(root); root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper = null; }
  lookUniforms = null;
  root = gltf.scene; scene.add(root);
  root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const height = Math.max(0.01, box.max.y - box.min.y);
  V.natural = { height, footOffset: -box.min.y }; // unscaled, as the game's look.js expects
  const scale = 1.7 / height; // normalise display height so every model fills the view the same way
  root.scale.setScalar(scale); root.position.y = -box.min.y * scale; root.position.x = 0; root.position.z = 0;
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  orbit.target.set(c.x, c.y, c.z);
  orbit.radius = Math.max(2.6, (box.max.y - box.min.y) * 2.1);
  V.model = root;

  // clips
  mixer = new THREE.AnimationMixer(root); clips = gltf.animations; action = null;
  const sel = $('clipSel'); sel.innerHTML = '';
  clips.forEach((cl) => { const o = document.createElement('option'); o.value = cl.name; o.textContent = `${cl.name} (${cl.duration.toFixed(2)}s)`; sel.appendChild(o); });
  const prefer = record.clips && record.clips.idle; if (prefer && clips.some((cl) => cl.name === prefer)) sel.value = prefer;
  playClip(sel.value);

  // rules
  const json = readGlbJson(buf);
  const stats = inspect(json, buf.byteLength);
  const sha = await sha256(buf);
  const results = check(stats, record, sha);
  V.stats = stats; V.results = results; V.sha = sha;
  renderPanel(record, stats, results, sha);

  const lookBtn = $('look');
  lookBtn.hidden = !record.gameLook;
  state.gameLook = false; lookBtn.setAttribute('aria-pressed', 'false');
  applyWire(); applySkeleton();
  V.ready = true;
}

function playClip(name) {
  if (!mixer) return;
  if (action) action.stop();
  const clip = clips.find((c) => c.name === name);
  if (!clip) { action = null; return; }
  action = mixer.clipAction(clip); action.reset().play();
  action.paused = false;
}

async function sha256(buf) {
  if (!crypto.subtle) return '';
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function renderPanel(record, stats, results, sha) {
  const v = verdict(results);
  $('verdict').innerHTML = `<span class="badge ${v}">${v}</span> <span style="color:var(--mute);font-size:12px">${TIERS[record.tier].label}</span>`;
  const rows = [['Triangles', stats.triangles.toLocaleString('en-US')], ['Joints', stats.joints.length], ['Clips', stats.clips.length], ['Materials', stats.materials.length],
    ['File size', `${(stats.bytes / 1024).toFixed(0)} KB`], ['Exporter', stats.exporter.replace('Khronos glTF Blender I/O ', 'Blender I/O ') || '—']];
  $('stats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
  $('rules').innerHTML = results.map((r) => `<div class="rule ${r.level}"><b>${r.level} · ${r.rule}</b>${escapeHtml(r.message)}</div>`).join('');
  const p = record.provenance || {};
  $('prov').innerHTML = `<div><b>Status:</b> ${escapeHtml(p.status || 'unrecorded')} · <b>Licence:</b> ${escapeHtml(p.licence || '—')}</div><div><b>Source:</b> ${escapeHtml(p.source || '—')}</div><div style="word-break:break-all"><b>SHA-256:</b> ${sha ? sha : 'n/a'}</div>`;
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function applyWire() { if (!root) return; root.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.wireframe = state.wire; }); }); }
function applySkeleton() {
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper = null; }
  if (!root || !state.skeleton) return;
  skeletonHelper = new THREE.SkeletonHelper(root); skeletonHelper.material.linewidth = 2; scene.add(skeletonHelper);
}

async function toggleLook() {
  if (!V.record || !V.record.gameLook) return;
  const want = !state.gameLook; // loadCharacter resets the flag, so remember the request
  const keepClip = $('clipSel').value;
  await loadCharacter(V.record.id);
  $('clipSel').value = keepClip; playClip(keepClip);
  if (!want) return;
  // Apply the same styling the 3D game uses (procedural; reads the known-good game's look.js).
  const look = await import('../../arcade/3d/js/look.js');
  const env = look.initLook(renderer);
  lookUniforms = look.styleCitrus(root, V.natural, env);
  state.gameLook = true; $('look').setAttribute('aria-pressed', 'true');
}

async function showRef(id) {
  const pane = $('refPane');
  const entry = catalog && catalog.entries.find((e) => e.id === Number(id));
  if (!entry) { pane.style.display = 'none'; resize(); return; }
  $('refImg').src = entry.image; $('refName').textContent = `#${entry.id} ${entry.name}${entry.variant ? ' · ' + entry.variant : ''}`;
  pane.style.display = 'block'; resize();
}

async function main() {
  try {
    init();
    registry = await (await fetch('registry.json', { cache: 'no-store' })).json();
    try { catalog = await (await fetch('../../arcade/catalog.json', { cache: 'no-store' })).json(); } catch (_) { catalog = null; }
  } catch (e) { fail(`Viewer failed to start: ${e.message}`); return; }
  const sel = $('charSel');
  registry.characters.forEach((c) => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.name}${c.provenance.status === 'cleared' ? '' : ' (rights not cleared)'}`; sel.appendChild(o); });
  const want = params.get('char'); if (want && registry.characters.some((c) => c.id === want)) sel.value = want;
  sel.addEventListener('change', () => { loadCharacter(sel.value); const u = new URL(location.href); u.searchParams.set('char', sel.value); history.replaceState(null, '', u); });
  $('presets').addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });
  const toggle = (id, key, after) => $(id).addEventListener('click', () => { state[key] = !state[key]; $(id).setAttribute('aria-pressed', String(state[key])); if (after) after(); });
  toggle('turn', 'turntable'); toggle('wire', 'wire', applyWire); toggle('skel', 'skeleton', applySkeleton);
  $('look').addEventListener('click', toggleLook);
  $('play').addEventListener('click', () => { state.playing = !state.playing; $('play').setAttribute('aria-pressed', String(state.playing)); $('play').textContent = state.playing ? 'Pause' : 'Play'; });
  $('clipSel').addEventListener('change', (e) => playClip(e.target.value));
  $('scrub').addEventListener('input', (e) => {
    if (!action) return;
    state.playing = false; $('play').setAttribute('aria-pressed', 'false'); $('play').textContent = 'Play';
    action.time = (Number(e.target.value) / 1000) * action.getClip().duration; mixer.update(0);
  });
  $('refId').addEventListener('input', (e) => showRef(e.target.value));
  const v = params.get('view'); if (v) setView(v);
  if (params.get('turn') === '1') { state.turntable = true; $('turn').setAttribute('aria-pressed', 'true'); }
  await loadCharacter(sel.value);
  const ref = params.get('ref'); if (ref) { $('refId').value = ref; showRef(ref); }
  V.setView = setView; V.orbit = orbit; V.playClip = playClip; V.getAction = () => action; V.state = state;
}
main();
