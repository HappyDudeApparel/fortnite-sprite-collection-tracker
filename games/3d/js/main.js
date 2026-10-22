// Sprite Arena (3D) — game orchestration: boot, menus, fixed-step simulation, combat, collectibles, finish.
import * as THREE from 'three';
import { createRenderer, Quality, Input, CameraRig, IS_MOBILE } from './engine.js';
import { LEVELS } from './levels.js';
import { buildWorld, KIT } from './world.js';
import { preloadKenney } from './assets.js';
import { Player, createEnemies, BlobShadows } from './actors.js';
import { Particles } from './fx.js';
import { sfx, initAudio, setMuted, isMuted } from './audio.js';
import { P, makePlayer, stepPlayer, applySprings, hazardHit } from './sim.js';
import { initLook } from './look.js';
import { onIsland, safeKnockback } from './rules.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const STEP = 1 / 60;
const PROGRESS_KEY = 'spriteArcade.3d.progress.v1';

// ------------------------------------------------------------------------------------------------ progress
function readProgress() {
  try { const v = JSON.parse(localStorage.getItem(PROGRESS_KEY)); if (v && typeof v === 'object') return { levels: v.levels || {}, unlockAll: !!v.unlockAll }; } catch (_) { /* storage unavailable */ }
  return { levels: {}, unlockAll: false };
}
const progress = readProgress();
const saveProgress = () => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (_) { /* no-op */ } };
const unlocked = (i) => i === 0 || progress.unlockAll || !!progress.levels[LEVELS[i - 1].id];
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ------------------------------------------------------------------------------------------------ core objects
const canvas = $('game');
let renderer, scene, camera, quality, input, rig;
const fx = {};
const state = {
  mode: 'boot', levelIndex: 0, world: null, player: null, enemies: [], sim: null, simT: 0, acc: 0, time: 0,
  stats: null, checkpoint: null, introT: 0, finishT: 0, camMode: 'follow', choice: { kind: 'model', id: 'citrus' }, choiceName: 'Dash',
  inp: { mx: 0, my: 0, jump: false, jumpHeld: false, attack: false, pause: false, camYaw: 0, camPitch: 0 },
  jumpPending: false, loading: false,
};
window.ARENA = state; // test/debug hook

function showFailure(err) {
  console.error(err);
  $('failText').textContent = String(err && err.stack ? err.stack : err).slice(0, 900);
  $('failure').hidden = false; $('loading').hidden = true;
}

function setLoading(on, title, text, frac) {
  $('loading').hidden = !on;
  if (title) $('loadTitle').textContent = title;
  if (text) $('loadText').textContent = text;
  if (frac !== undefined) $('loadBar').style.width = `${Math.round(frac * 100)}%`;
}

let toastTimer = 0;
function toast(text, ms = 1500) {
  const el = $('toast'); el.textContent = text; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

const hud = { hp: -1, gems: -1 };
function updateHud(force) {
  const s = state;
  if (!s.player || !s.stats) return;
  if (force || hud.hp !== s.player.hp || hud.gems !== s.stats.gems) {
    hud.hp = s.player.hp; hud.gems = s.stats.gems;
    $('hearts').textContent = '♥'.repeat(Math.max(0, s.player.hp)) + '♡'.repeat(Math.max(0, s.player.maxHp - s.player.hp));
    $('gems').textContent = `✦ ${s.stats.gems}/${s.world.gems.length}`;
  }
}

// ------------------------------------------------------------------------------------------------ roster (catalog)
let roster = [{ kind: 'model', id: 'citrus', name: 'Dash', image: null }];
async function loadCatalog() {
  try {
    const r = await fetch('../catalog.json', { cache: 'no-store' });
    if (!r.ok) return;
    const cat = await r.json();
    const seen = new Set();
    for (const e of cat.entries) {
      if (!e.player2d || e.variant !== 'Base' || seen.has(e.family)) continue;
      seen.add(e.family);
      roster.push({ kind: 'billboard', id: e.id, name: e.name, image: e.image });
    }
    const want = Number(params.get('sprite'));
    if (want) {
      const e = cat.entries.find((x) => x.id === want);
      if (e) { roster = roster.filter((x) => x.id !== e.id); roster.splice(1, 0, { kind: 'billboard', id: e.id, name: e.name, image: e.image }); state.choice = { kind: 'billboard', image: e.image, id: e.id }; state.choiceName = e.name; }
    }
  } catch (_) { /* roster stays Dash-only */ }
}

function buildStrip() {
  const strip = $('strip'); strip.textContent = '';
  const selectedKey = state.choice.kind === 'model' ? 'citrus' : state.choice.id;
  roster.forEach((r) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.title = r.name;
    b.setAttribute('aria-pressed', String((r.kind === 'model' ? 'citrus' : r.id) === selectedKey));
    if (r.image) { const img = document.createElement('img'); img.src = r.image; img.alt = r.name; b.append(img); } else { b.textContent = '🍊'; b.style.fontSize = '30px'; }
    if (r.kind === 'model') { const t = document.createElement('span'); t.className = 't3'; t.textContent = '3D'; b.append(t); }
    b.addEventListener('click', async () => {
      sfx.click();
      state.choice = r.kind === 'model' ? { kind: 'model', id: r.id } : { kind: 'billboard', image: r.image, id: r.id };
      state.choiceName = r.name;
      await state.player.setSprite(state.choice);
      buildStrip();
    });
    strip.append(b);
  });
  $('pickName').textContent = state.choiceName + (state.choice.kind === 'model' ? ' · full 3D model' : ' · 2.5D collection art');
}

// ------------------------------------------------------------------------------------------------ level loading
async function loadLevel(index, attract = false) {
  if (state.loading) return;
  state.loading = true;
  const level = LEVELS[index];
  setLoading(true, level.name.toUpperCase(), 'Building world…', 0.15);
  await new Promise((r) => setTimeout(r, 30));
  // tear down
  if (state.world) state.world.dispose();
  state.enemies.forEach((e) => e.dispose());
  if (state.player) state.player.dispose();
  if (state.blobs) state.blobs.dispose();
  state.enemies = [];

  state.levelIndex = index;
  quality.apply();
  state.world = await buildWorld(scene, level, quality.level, { renderer });
  setLoading(true, null, 'Waking up your Sprite…', 0.5);
  state.blobs = new BlobShadows(scene, 24);
  state.player = new Player(scene, state.blobs);
  await state.player.setSprite(state.choice);
  if (!attract) {
    setLoading(true, null, 'Meeting the locals…', 0.75);
    state.enemies = await createEnemies(scene, level, state.blobs);
  }
  // sim
  state.sim = makePlayer(level.spawn.x, level.spawn.y + 0.05, level.spawn.z);
  state.simT = 0; state.acc = 0; state.time = 0; state.finishT = 0;
  state.stats = { gems: 0, kills: 0, hits: 0, falls: 0 };
  state.checkpoint = { x: level.spawn.x, y: level.spawn.y, z: level.spawn.z };
  state.jumpPending = false;
  state.player.hp = state.player.maxHp; state.player.win = false;
  rig.yaw = 0; rig.snap(level.spawn.x, level.spawn.y, level.spawn.z);
  state.world.render(0, 0, camera.position, state.sim);
  // compile shaders now so there is no stall on the first frame of play
  renderer.compile(scene, camera);
  setLoading(false);
  state.loading = false;
  hud.hp = -1; hud.gems = -1;
  if (attract) { state.mode = 'title'; $('title').hidden = false; $('hud').hidden = true; $('touch').hidden = true; state.player.play('win', 0.1); }
}

function startPlay(index) {
  closeMenus();
  $('hud').hidden = false;
  $('touch').hidden = !IS_MOBILE;
  $('lvl').textContent = `WORLD ${index + 1} · ${LEVELS[index].name.toUpperCase()}`;
  updateHud(true);
  state.mode = 'intro'; state.introT = 0;
  const b = $('banner'); b.hidden = false; b.querySelector('h2').textContent = LEVELS[index].name.toUpperCase(); b.querySelector('p').textContent = LEVELS[index].tagline;
  if (params.get('nointro')) { state.introT = 99; }
}

async function launch(index) {
  initAudio();
  closeMenus();
  $('title').hidden = true;
  try {
    await loadLevel(index, false);
    startPlay(index);
  } catch (e) { showFailure(e); }
}

function closeMenus() { ['levels', 'pause', 'complete'].forEach((id) => { $(id).hidden = true; }); }

function showLevels() {
  state.mode = 'levels';
  $('title').hidden = true; $('pause').hidden = true; $('complete').hidden = true; $('hud').hidden = true; $('touch').hidden = true; $('banner').hidden = true;
  const cards = $('cards'); cards.textContent = '';
  LEVELS.forEach((L, i) => {
    const best = progress.levels[L.id];
    const open = unlocked(i);
    const b = document.createElement('button'); b.className = 'card'; b.type = 'button'; b.disabled = !open;
    const th = L.theme === 'frost' ? ['#07163a', '#2a56a0', '#bfe0ff'] : L.theme === 'cinder' ? ['#12050c', '#8a2a1c', '#ff8a2a'] : ['#2f86ff', '#8fd3ff', '#ffe3b4'];
    b.innerHTML = `<div class="art" style="background:linear-gradient(180deg,${th[0]},${th[1]} 55%,${th[2]})"></div><div class="body"><div class="n">WORLD ${i + 1}</div><h3></h3><p></p><div class="st"><span class="s"></span><span class="g"></span></div></div>`;
    b.querySelector('h3').textContent = L.name; b.querySelector('p').textContent = L.tagline;
    b.querySelector('.s').textContent = starText(best ? best.stars : 0); b.querySelector('.g').textContent = `✦ ${best ? best.gems : 0}/${L.gemCount}`;
    if (!open) { const lk = document.createElement('div'); lk.className = 'lock'; lk.textContent = '🔒 Clear the previous world'; b.append(lk); }
    b.addEventListener('click', () => { sfx.click(); launch(i); });
    cards.append(b);
  });
  $('unlockAll').setAttribute('aria-pressed', String(progress.unlockAll));
  $('levels').hidden = false;
}

// ------------------------------------------------------------------------------------------------ gameplay
function respawn() {
  const s = state.sim, c = state.checkpoint;
  s.x = c.x; s.y = c.y + 0.05; s.z = c.z; s.vx = s.vy = s.vz = 0; s.grounded = false; s.standing = null;
  state.player.respawn(s.x, s.y, s.z);
  rig.snap(s.x, s.y, s.z);
}

function hurt(fromX, fromZ) {
  const p = state.player, s = state.sim;
  if (p.invuln > 0 || state.mode !== 'play') return;
  p.hp -= 1; p.invuln = 1.4; p.hurtT = 0.45; state.stats.hits += 1;
  // Knock back away from the hit, but never off the island the player stands on.
  const islands = LEVELS[state.levelIndex].islands;
  const here = s.standing && s.standing.kind === 'island' ? islands[s.standing.idx] : islands.find((q) => onIsland(q, s.x, s.z, 0.6) && Math.abs(q.y - s.y) < 1.5);
  const kb = safeKnockback(s, { x: fromX, z: fromZ }, here);
  s.vx = kb.vx; s.vz = kb.vz; s.vy = kb.vy; s.grounded = false;
  rig.shake = 0.8; sfx.hit();
  const fl = $('flash'); fl.style.transition = 'none'; fl.style.opacity = '1'; requestAnimationFrame(() => { fl.style.transition = 'opacity .45s'; fl.style.opacity = '0'; });
  fx.spark.burst(s.x, s.y + 1, s.z, 14, 6, 0.5, 0.45, 1, 0.4, 0.4, 6);
  if (p.hp <= 0) { toast('Oops! Back to the last flag'); p.hp = p.maxHp; respawn(); }
}

state.hurt = hurt; // test hook

function attack() {
  const p = state.player;
  if (p.attackCd > 0 || state.mode !== 'play') return;
  // Star Burst: a ring of golden stars around Dash that hits every monster in reach (no need to aim).
  p.attackT = 0.38; p.attackCd = 0.6; p.attackHit = false;
  const s = state.sim;
  sfx.bite();
  for (let i = 0; i < 3; i += 1) fx.spark.burst(s.x, s.y + 1 + i * 0.25, s.z, 10, 4 + i * 2, 0.35 + i * 0.1, 1, 0.85, 0.25, 0);
}

function resolveAttack() {
  const p = state.player, s = state.sim;
  if (p.attackT <= 0 || p.attackHit || p.attackT > 0.28) return;
  p.attackHit = true;
  const REACH = 3.8; // wu, all around
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const vx = e.x - s.x, vz = e.z - s.z, dist = Math.hypot(vx, vz);
    if (dist < REACH + e.type.radius * 0.5 && Math.abs(e.y - s.y) < 2.6) {
      if (e.damage(1, fx, sfx)) state.stats.kills += 1;
      e.hitT = 0.4;
      const l = dist || 1;
      e.x += (vx / l) * 0.8; e.z += (vz / l) * 0.8;
      rig.shake = Math.max(rig.shake, 0.35);
    }
  }
}

function enemyContacts() {
  const s = state.sim, p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = s.x - e.x, dz = s.z - e.z;
    const reach = e.type.radius + P.radius;
    if (dx * dx + dz * dz > reach * reach) continue;
    const top = e.y + e.type.height;
    if (s.y > e.y + 0.5 && s.y < top + 0.6 && s.vy < -1 && s.y > top - 1.2) {
      // stomp
      s.vy = 13; s.airJumps = 1;
      if (e.damage(2, fx, sfx)) state.stats.kills += 1;
      e.hitT = 0.4;
      rig.shake = Math.max(rig.shake, 0.4);
    } else if (s.y < top && s.y + P.height > e.y && p.invuln <= 0) {
      hurt(e.x, e.z);
    }
  }
}

const simInp = { mx: 0, mz: 0, jump: false, jumpHeld: false };
function physicsStep() {
  const s = state.sim, w = state.world, inp = state.inp;
  // camera-relative direction
  const sy = Math.sin(rig.yaw), cy = Math.cos(rig.yaw);
  const mx = cy * inp.mx - sy * inp.my;
  const mz = -sy * inp.mx - cy * inp.my;
  const locked = state.mode !== 'play';
  w.stepMovers(state.simT);
  simInp.mx = locked ? 0 : mx; simInp.mz = locked ? 0 : mz; simInp.jump = state.jumpPending && !locked; simInp.jumpHeld = inp.jumpHeld && !locked;
  stepPlayer(s, simInp, w.solids, STEP);
  state.jumpPending = false;
  state.simT += STEP;
  if (state.mode !== 'play') return;

  if (s.justJumped) { sfx.jump(); fx.dust.burst(s.x, s.y + 0.1, s.z, 5, 2, 0.4, 0.5, 0.9, 0.9, 0.9, -1); }
  if (s.justDoubled) { sfx.jump2(); fx.spark.burst(s.x, s.y + 0.4, s.z, 12, 4.5, 0.45, 0.4, 0.6, 0.9, 1, 3); }
  if (s.justLanded) { sfx.land(); fx.dust.burst(s.x, s.y + 0.1, s.z, 6, 2.6, 0.45, 0.6, 0.9, 0.9, 0.9, -1); }
  if (applySprings(s, w.springs)) { sfx.spring(); rig.shake = Math.max(rig.shake, 0.25); fx.spark.burst(s.x, s.y + 0.3, s.z, 14, 5, 0.5, 0.5, 1, 0.95, 0.4, 2); }

  // collectibles
  const cy0 = s.y + P.height * 0.5;
  for (let i = 0; i < w.gems.length; i += 1) {
    const g = w.gems[i]; if (g.got) continue;
    const dx = s.x - g.x, dy = cy0 - g.y, dz = s.z - g.z;
    if (dx * dx + dy * dy + dz * dz < 2.56) { g.got = true; state.stats.gems += 1; sfx.gem(); fx.spark.burst(g.x, g.y, g.z, 10, 4, 0.5, 0.42, 1, 0.9, 0.35, 2); }
  }
  for (const h of w.hearts) {
    if (h.got) continue;
    const dx = s.x - h.x, dy = cy0 - h.y, dz = s.z - h.z;
    if (dx * dx + dy * dy + dz * dz < 3.2 && state.player.hp < state.player.maxHp) { h.got = true; state.player.hp += 1; sfx.heart(); fx.spark.burst(h.x, h.y, h.z, 14, 4, 0.6, 0.5, 1, 0.4, 0.55, 2); toast('♥ +1'); }
  }
  // checkpoints
  for (const f of w.flags) {
    if (f.active) continue;
    if (Math.hypot(s.x - f.x, s.z - f.z) < 2.6 && Math.abs(s.y - f.y) < 3) {
      f.active = true; state.checkpoint = { x: f.x + 1.2, y: f.y, z: f.z };
      sfx.flag(); toast('Checkpoint!'); fx.spark.burst(f.x, f.y + 1.2, f.z, 24, 6, 0.9, 0.5, 0.5, 0.95, 1, -1, 3);
    }
  }
  // hazards
  for (const sp of w.spikes) if (hazardHit(s, sp)) { hurt(sp.x, sp.z); break; }
  for (const sw of w.saws) if (hazardHit(s, sw)) { hurt(sw.x, sw.z); break; }
  resolveAttack();
  enemyContacts();
  if (s.y < LEVELS[state.levelIndex].killY) { state.stats.falls += 1; sfx.fall(); toast('Whoops! Back to the last flag'); respawn(); }
  // goal
  const g = w.goal;
  if (Math.hypot(s.x - g.x, s.z - g.z) < 1.9 && s.y > g.y - 0.6 && s.y < g.y + 3) beginFinish();
}

function beginFinish() {
  if (state.mode !== 'play') return;
  state.mode = 'finish'; state.finishT = 0;
  state.player.win = true;
  sfx.win();
  toast('Collection Tube!', 2200);
}

function updateFinish(dt) {
  const t = state.finishT += dt, w = state.world, s = state.sim, g = w.goal;
  w.tubePower = Math.min(1, t / 1.4);
  const k = Math.min(1, t / 0.8);
  s.x += (g.x - s.x) * k * 0.12; s.z += (g.z - s.z) * k * 0.12;
  if (t > 0.6) s.y += (g.y + 1.2 + Math.min(2.2, (t - 0.6) * 1.8) - s.y) * 0.08;
  for (let i = 0; i < 3; i += 1) {
    const a = Math.random() * Math.PI * 2;
    fx.spark.emit(g.x + Math.cos(a) * 1.6, g.y + 0.5, g.z + Math.sin(a) * 1.6, -Math.cos(a) * 1.6, 3 + Math.random() * 3, -Math.sin(a) * 1.6, 1.1, 0.5, 0, 0.5 + Math.random() * 0.4, 0.9, 1, 1, -1, 0.3);
  }
  rig.yaw += dt * 0.5; rig.dist = Math.min(15, rig.dist + dt * 2);
  if (t > 2.8) completeLevel();
}

function completeLevel() {
  const L = LEVELS[state.levelIndex], total = state.world.gems.length, got = state.stats.gems;
  const stars = 1 + (got >= Math.ceil(total * 0.7) ? 1 : 0) + (got >= total ? 1 : 0);
  const prev = progress.levels[L.id] || {};
  progress.levels[L.id] = { stars: Math.max(prev.stars || 0, stars), gems: Math.max(prev.gems || 0, got), time: prev.time ? Math.min(prev.time, state.time) : state.time };
  saveProgress();
  state.mode = 'complete';
  $('hud').hidden = true; $('touch').hidden = true;
  const last = state.levelIndex >= LEVELS.length - 1;
  $('cTitle').textContent = last ? 'ALL WORLDS CLEARED!' : 'WORLD COMPLETE';
  $('cStars').textContent = starText(stars);
  const m = Math.floor(state.time / 60), sec = String(Math.floor(state.time % 60)).padStart(2, '0');
  $('cStats').textContent = `${L.name}\n✦ ${got}/${total} shards · rivals beaten ${state.stats.kills} · time ${m}:${sec}${stars < 3 ? '\nCollect every shard for ★★★' : '\nPerfect run!'}`;
  $('cNext').hidden = last;
  $('complete').hidden = false;
}

// ------------------------------------------------------------------------------------------------ main loop
const camLook = new THREE.Vector3();
const introFrom = new THREE.Vector3();
let last = performance.now(), fpsAcc = 0, fpsN = 0, dbgT = 0, updMs = 0, rndMs = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(0.1, (now - last) / 1000);
  last = now;
  const dt = Math.min(0.05, raw);
  quality.sample(raw);
  const t0 = performance.now();
  renderer.info.reset();

  input.poll(dt, state.inp);
  const inp = state.inp;
  if (inp.pause && (state.mode === 'play' || state.mode === 'pause')) togglePause();
  if (inp.jump) state.jumpPending = true;

  const mode = state.loading ? 'boot' : state.mode;
  if (mode === 'play' || mode === 'finish' || mode === 'intro') {
    if (mode === 'intro') {
      state.introT += dt;
      if (inp.jump || inp.attack) state.introT = Math.max(state.introT, 3.4);
      if (state.introT >= 3.5) { state.mode = 'play'; $('banner').hidden = true; rig.snap(state.sim.x, state.sim.y, state.sim.z); }
    }
    if (state.mode !== 'intro') {
      if (inp.attack) attack();
      state.time += dt;
    }
    state.acc += dt;
    let n = 0;
    while (state.acc >= STEP && n < 6) { physicsStep(); state.acc -= STEP; n += 1; }
    if (n === 6) state.acc = 0;
    if (state.mode === 'finish') updateFinish(dt);
    for (const e of state.enemies) e.update(dt, state.sim, state.world.solids);
    state.player.update(dt, state.sim, rig.yaw, state.world.solids, fx);
    updateHud(false);
  } else if (mode === 'title' || mode === 'levels') {
    // attract: slow orbit around the start island
    state.time += dt;
    state.player.update(dt, state.sim, rig.yaw, state.world.solids, fx);
    const a = state.time * 0.22;
    camera.position.set(Math.sin(a) * 9, 4.2, Math.cos(a) * 9 + 2.6);
    camera.lookAt(0, 2.3, 2.6);
    rig.target.set(0, 3, 0);
  }

  // camera
  if (state.mode === 'intro') {
    const k = Math.min(1, state.introT / 3.4), e = k * k * (3 - 2 * k);
    const g = state.world.goal, s = state.sim;
    introFrom.set(g.x + 11, g.y + 10, g.z + 16);
    camera.position.set(
      introFrom.x + (s.x + Math.sin(rig.yaw) * 11 - introFrom.x) * e,
      introFrom.y + (s.y + 7 - introFrom.y) * e,
      introFrom.z + (s.z + Math.cos(rig.yaw) * 11 - introFrom.z) * e,
    );
    camLook.set(g.x + (s.x - g.x) * e, g.y + 3 + (s.y + 1.5 - g.y - 3) * e, g.z + (s.z - g.z) * e);
    camera.lookAt(camLook);
    rig.target.set(s.x, s.y + 1.5, s.z);
  } else if (state.mode === 'play' || state.mode === 'finish') {
    const sp = Math.hypot(state.sim.vx, state.sim.vz);
    rig.update(dt, state.sim.x, Math.max(state.sim.y, state.world.minY - 6), state.sim.z, sp, state.inp);
  } else if (state.mode === 'pause') { /* hold */ }

  // fx + world
  if (state.mode !== 'pause') {
    fx.dust.update(dt); fx.spark.update(dt);
    if (state.world && state.sim && !state.loading) state.world.render(dt, performance.now() / 1000, camera.position, state.sim);
  }
  fx.dust.setScale(renderer.domElement.height, camera.fov); fx.spark.setScale(renderer.domElement.height, camera.fov);
  const t1 = performance.now();
  renderer.render(scene, camera);
  const t2 = performance.now();

  // debug
  updMs += t1 - t0; rndMs += t2 - t1; fpsAcc += raw; fpsN += 1;
  if (params.get('debug') && (dbgT += raw) > 0.5) {
    const i = renderer.info;
    $('dbg').hidden = false;
    $('dbg').textContent = `fps ${(fpsN / fpsAcc).toFixed(0)}  js ${(updMs / fpsN).toFixed(1)}ms  render-submit ${(rndMs / fpsN).toFixed(1)}ms\ncalls ${i.render.calls}  tris ${(i.render.triangles / 1000).toFixed(0)}k  quality ${quality.index}  dpr ${renderer.getPixelRatio().toFixed(2)}`;
    dbgT = 0; updMs = rndMs = fpsAcc = 0; fpsN = 0;
  }
}

function togglePause() {
  if (state.mode === 'play') { state.mode = 'pause'; $('pause').hidden = false; $('qNote').textContent = `Graphics adapt automatically · level ${quality.index + 1}/6`; }
  else if (state.mode === 'pause') { state.mode = 'play'; $('pause').hidden = true; last = performance.now(); }
}

// ------------------------------------------------------------------------------------------------ boot
async function boot() {
  try {
    renderer = createRenderer(canvas);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 900);
    const forced = params.get('q') !== null ? Number(params.get('q')) : null;
    quality = new Quality(renderer, forced);
    quality.onChange((q) => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (state.world) state.world.applyQuality(q); });
    input = new Input(canvas);
    input.bindTouch({ stick: $('stick'), knob: $('knob'), jump: $('btnJump'), attack: $('btnBite'), camZone: $('camZone') });
    rig = new CameraRig(camera); state.rig = rig;
    fx.dust = new Particles(260, false); fx.spark = new Particles(420, true);
    scene.add(fx.dust.points, fx.spark.points);
    initLook(renderer);
    quality.apply();
    addEventListener('resize', () => quality.apply());
    addEventListener('pointerdown', initAudio, { once: true });
    addEventListener('keydown', initAudio, { once: true });

    setLoading(true, 'SPRITE ARENA', 'Loading world pieces…', 0.05);
    await preloadKenney(KIT, (d, n) => setLoading(true, null, 'Loading world pieces…', 0.05 + 0.4 * (d / n)));
    await loadCatalog();

    // wire UI
    $('playBtn').addEventListener('click', () => { initAudio(); sfx.click(); showLevels(); });
    $('lvBack').addEventListener('click', () => { sfx.click(); $('levels').hidden = true; $('title').hidden = false; state.mode = 'title'; });
    $('unlockAll').addEventListener('click', () => { progress.unlockAll = !progress.unlockAll; saveProgress(); showLevels(); });
    $('pauseBtn').addEventListener('click', () => { sfx.click(); togglePause(); });
    $('resumeBtn').addEventListener('click', () => { sfx.click(); togglePause(); });
    $('restartBtn').addEventListener('click', () => { sfx.click(); launch(state.levelIndex); });
    $('levelsBtn').addEventListener('click', () => { sfx.click(); showLevels(); });
    $('cNext').addEventListener('click', () => { sfx.click(); launch(state.levelIndex + 1); });
    $('cReplay').addEventListener('click', () => { sfx.click(); launch(state.levelIndex); });
    $('cLevels').addEventListener('click', () => { sfx.click(); showLevels(); });
    const mute = () => { setMuted(!isMuted()); $('muteBtn').textContent = isMuted() ? '🔇 Muted' : '🔊 Sound'; $('pMute').textContent = isMuted() ? '🔇 Sound off' : '🔊 Sound on'; };
    $('muteBtn').addEventListener('click', mute); $('pMute').addEventListener('click', mute);

    const auto = params.get('autostart');
    const wantLevel = Math.max(0, Math.min(LEVELS.length - 1, (Number(params.get('level')) || 1) - 1));
    state.levelIndex = wantLevel;
    requestAnimationFrame(frame);
    if (auto) {
      await loadLevel(wantLevel, false);
      startPlay(wantLevel);
    } else {
      await loadLevel(0, true);
      buildStrip();
    }
  } catch (e) { showFailure(e); }
}

boot();
