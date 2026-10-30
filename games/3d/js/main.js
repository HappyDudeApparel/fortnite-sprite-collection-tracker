// Sprite Arena (3D) — game orchestration: boot, menus, fixed-step simulation, combat, collectibles, finish.
import * as THREE from 'three';
import { createRenderer, Quality, Input, CameraRig, IS_MOBILE } from './engine.js';
import { LEVELS as CLASSIC_LEVELS } from './levels.js';
import { VALLEY } from './adventure-level.js';
const LEVELS=[VALLEY,...CLASSIC_LEVELS];
import { buildWorld, KIT } from './world.js';
import { preloadKenney } from './assets.js';
import { Player, createEnemies, BlobShadows } from './actors.js';
import { PLAYABLE } from './roster.js';
import { PowerBurst } from './powers.js';
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
const unlocked = (i) => i===0 || i===1 || progress.unlockAll || !!progress.levels[LEVELS[i-1].id];
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ------------------------------------------------------------------------------------------------ core objects
const canvas = $('game');
let renderer, scene, camera, quality, input, rig;
const fx = {};
const state = {
  mode: 'boot', levelIndex: 0, world: null, player: null, enemies: [], sim: null, simT: 0, acc: 0, time: 0,
  stats: null, checkpoint: null, introT: 0, finishT: 0, camMode: 'follow', choice: { kind: 'model', id: 'citrus' }, choiceName: 'Dash',
  inp: { mx: 0, my: 0, jump: false, jumpHeld: false, attack: false, pause: false, camYaw: 0, camPitch: 0 },
  jumpPending: false, loading: false, activeAbility: null, lastHurt: -999, lastJonesyHeal: 0,
  attackQueue:0,attackCombo:0,lastAttackAt:-999,lastSpecialAt:-999,nextAttackAt:0,questIndex:0,
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
  if(s.world.level.adventure){
    const q=s.world.level.quests[s.questIndex],el=$('questHint');
    el.hidden=false;
    let label='',target=q;
    if(s.questIndex===1){
      const remaining=s.world.runes.filter(r=>!r.lit);
      if(remaining.length){
        target=remaining.reduce((a,b)=>
          Math.hypot(a.x-s.sim.x,a.z-s.sim.z)<Math.hypot(b.x-s.sim.x,b.z-s.sim.z)?a:b);
      }
      const count=2-remaining.length;
      label='CHAPTER 2/3 · Cave runes '+count+'/2 · TAP ACTION';
      if(!remaining.length){label='CHAPTER 2/3 · Return to the crystal heart';target=q;}
    }else if(s.questIndex===2){
      const guard=s.enemies.find(e=>e.spec.guardian&&e.alive);
      if(guard){target=guard;label='CHAPTER 3/3 · Defeat castle guardian ('+guard.hp+' HP)';}
      else label='CHAPTER 3/3 · Raise the upper ward';
    }else if(s.questIndex===0)label='CHAPTER 1/3 · Restore the village beacon';
    else label='FINAL CHAPTER · Reach the summit portal';
    if(!target)target=s.world.goal;
    const dx=target.x-s.sim.x,dz=target.z-s.sim.z;
    const distance=Math.round(Math.hypot(dx,dz));
    const directions=['↑','↗','→','↘','↓','↙','←','↖'];
    const radians=Math.atan2(dx,-dz)+(rig?.yaw||0);
    const dir=directions[((Math.round(radians/(Math.PI/4))%8)+8)%8];
    const current=label+' · '+dir+' '+distance+'m';
    if(el.textContent!==current)el.textContent=current;
  }else $('questHint').hidden=true;
}

// ------------------------------------------------------------------------------------------------ roster (catalog)
// Only genuine 3D selections. Flat collection billboards are intentionally hidden.
let roster = Object.values(PLAYABLE)
  .filter((d) => d.id !== 'klombo-cheat' && d.id !== 'klombo-loot')
  .map((d) => ({kind:'model',id:d.id,name:d.name,image:d.image||null,icon:d.icon||'🍊'}));
async function loadCatalog() {
  const ids = {1:'water-sprite',8:'earth-sprite',15:'fire-sprite',29:'ghost-sprite',207:'bush-sprite',219:'klombo-base',220:'klombo-cheat',222:'jonesy-sprite',228:'crown-sprite',247:'klombo-loot'};
  const requested = ids[Number(params.get('sprite'))] || params.get('character');
  if(requested && PLAYABLE[requested]) {
    state.choice={kind:'model',id:requested};
    state.choiceName=PLAYABLE[requested].name;
  }
}

function buildStrip() {
  const strip = $('strip'); strip.textContent = '';
  const selectedKey = state.choice.id.startsWith('klombo-') ? 'klombo-base' : state.choice.id;
  roster.forEach((r) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.title = r.name;
    b.setAttribute('aria-pressed', String(r.id === selectedKey));
    if (r.image) { const img = document.createElement('img'); img.src = r.image; img.alt = r.name; b.append(img); } else { b.textContent = r.icon; b.style.fontSize = '30px'; }
    if (r.kind === 'model') { const t = document.createElement('span'); t.className = 't3'; t.textContent = '3D'; b.append(t); }
    b.addEventListener('click', async () => {
      sfx.click();
      state.choice = { kind: 'model', id: r.id };
      state.choiceName = r.name;
      await state.player.setSprite(state.choice);
      buildStrip();
    });
    strip.append(b);
  });
  $('pickName').textContent = state.choiceName + ' · full 3D · ' + (PLAYABLE[state.choice.id]?.power || 'STAR BURST');
  $('btnBite').textContent = PLAYABLE[state.choice.id]?.power || 'PRISM BURST';
  const skins=$('skinChoices');
  skins.hidden=!state.choice.id.startsWith('klombo-');
  skins.textContent='';
  if(!skins.hidden){
    const choices=[['klombo-base','BASE'],['klombo-cheat','CHEAT MASTER'],['klombo-loot','LOOT HACKER']];
    for(const [id,label] of choices){
      const b=document.createElement('button');b.type='button';b.textContent=label;
      b.setAttribute('aria-pressed',String(state.choice.id===id));
      b.setAttribute('aria-label','Klombo skin '+label);
      b.addEventListener('click',async()=>{
        if(state.choice.id===id)return;
        sfx.click();state.choice={kind:'model',id};
        state.choiceName=PLAYABLE[id].name;
        await state.player.setSprite(state.choice);
        buildStrip();
      });
      skins.append(b);
    }
  }
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
    state.enemies = await createEnemies(scene, level, state.blobs, state.choice.id);
  }
  // sim
  state.sim = makePlayer(level.spawn.x, level.spawn.y + 0.05, level.spawn.z);
  state.simT = 0; state.acc = 0; state.time = 0; state.finishT = 0; state.activeAbility = null; state.lastHurt = -999; state.lastJonesyHeal = 0; if(fx.power)fx.power.active=false;
  state.stats = { gems: 0, kills: 0, hits: 0, falls: 0 };
  state.questIndex=0;state.attackQueue=0;state.attackCombo=0;state.lastAttackAt=-999;state.lastSpecialAt=-999;state.nextAttackAt=0;
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
    const th = L.adventure ? ['#154c48','#308967','#ecd596'] : L.theme === 'frost' ? ['#07163a', '#2a56a0', '#bfe0ff'] : L.theme === 'cinder' ? ['#12050c', '#8a2a1c', '#ff8a2a'] : ['#2f86ff', '#8fd3ff', '#ffe3b4'];
    b.innerHTML = `<div class="art" style="background:linear-gradient(180deg,${th[0]},${th[1]} 55%,${th[2]})"></div><div class="body"><div class="n">WORLD ${i + 1}</div><h3></h3><p></p><div class="st"><span class="s"></span><span class="g"></span></div></div>`;
    b.querySelector('h3').textContent = L.adventure ? '★ '+L.name+' · STORY MODE' : L.name+' · CLASSIC'; b.querySelector('p').textContent = L.tagline;
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
  p.hp -= 1; p.invuln = 1.4; p.hurtT = 0.45; state.stats.hits += 1; state.lastHurt = state.time;
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

const POWERS = {
  citrus:{name:'Prismatic Starburst',range:[3.3,5.1],cooldown:3.6,invuln:0},
  'earth-sprite':{name:'Branch Lash',range:[3.8,4.4],cooldown:2.6,invuln:0},
  'ghost-sprite':{name:'Phase Pulse',range:[3.2,4.4],cooldown:4.2,invuln:1.4},
  'bush-sprite':{name:'Bramble Burst',range:[3.0,4.1],cooldown:3.4,invuln:.65},
  'crown-sprite':{name:'Royal Verdict',range:[3.6,5.3],cooldown:4.8,invuln:1.1},
  'water-sprite':{name:'Tidal Shield',range:[3.5,4.8],cooldown:4.1,invuln:1.0},
  'fire-sprite':{name:'Firestorm',range:[3.3,4.8],cooldown:3.6,invuln:0},
  'jonesy-sprite':{name:'Rally Shield',range:[3.5,4.5],cooldown:7.5,invuln:1.7},
  'klombo-base':{name:'Munch & Reward',range:[3.5,4.5],cooldown:4.6,invuln:.5},
  'klombo-cheat':{name:'Cheat Matrix',range:[3.8,5.2],cooldown:5.5,invuln:.7},
  'klombo-loot':{name:'Loot Scanner',range:[4.1,5.7],cooldown:5.1,invuln:.6},
};
// Responsive action: every tap connects, taps during recovery are queued.
function attack(){
 const p=state.player;
 const stamp=performance.now()/1000;
 if(stamp<state.nextAttackAt||state.mode!=='play')return;
 if(state.attackQueue>0)state.attackQueue--;
 const id=state.choice.id in POWERS?state.choice.id:'citrus',spec=POWERS[id],s=state.sim;
 state.attackCombo=stamp-state.lastAttackAt<1.1?(state.attackCombo%3)+1:1;
 state.lastAttackAt=stamp;
 const combo=state.attackCombo,finisher=combo===3;
 const empowered=finisher&&stamp-state.lastSpecialAt>spec.cooldown;
 if(empowered)state.lastSpecialAt=stamp;
 p.attackT=.38;p.attackCd=.20;p.attackHit=false;state.nextAttackAt=stamp+.20;
 const radius=finisher?5.25:3.8;
 const damage=finisher?2:1;
 if(empowered){
   p.invuln=Math.max(p.invuln,Math.min(.85,spec.invuln));
   if((id==='jonesy-sprite'||id==='water-sprite')&&p.hp<p.maxHp)p.hp++;
   if(id==='klombo-base'&&p.hp<p.maxHp&&state.stats.kills>0)p.hp++;
 }
 state.activeAbility={id,spec,t:0,next:combo};
 // Crystal dungeons use the same action button as combat.
 if(state.world.level.adventure&&state.questIndex===1){
   for(let i=0;i<state.world.runes.length;i++){
     const r=state.world.runes[i];
     if(!r.lit&&Math.hypot(r.x-s.x,r.z-s.z)<3.0&&Math.abs(s.y-r.y)<2.3){
       if(state.world.activateRune(i)){
         sfx.gem();toast('CAVE RUNE '+(i+1)+' POWERED!',1350);
         fx.spark.burst(r.x,-3.7,r.z,40,7,.85,.5,.6,1,.7,3);
       }
     }
   }
 }
 fx.power.start(id,s.x,s.y,s.z);
 if(finisher)fx.power.emit(1);
 sfx.bite();
 for(const e of state.enemies){
  if(!e.alive)continue;
  const dx=e.x-s.x,dz=e.z-s.z,dist=Math.hypot(dx,dz);
  if(dist>radius+e.type.radius*.35||Math.abs(e.y-s.y)>3.0)continue;
  const dmg=damage+(empowered&&id==='klombo-cheat'?1:0);
  if(e.damage(dmg,fx,sfx))state.stats.kills++;
  e.hitT=.37;
  const l=dist||1,kb=finisher?.42:.20;
  e.x+=dx/l*kb;e.z+=dz/l*kb;
  rig.shake=Math.max(rig.shake,finisher?.34:.12);
 }
 if(id.startsWith('klombo-')&&(finisher||id==='klombo-loot')){
  for(const g of state.world.gems){
    if(!g.got&&Math.hypot(g.x-s.x,g.z-s.z)<(id==='klombo-loot'?7:4.4)&&Math.abs(g.y-s.y)<3.8){
      g.got=true;state.stats.gems++;sfx.gem();
    }
  }
 }
 if(finisher)toast(empowered?spec.name+' · COMBO!':'3-HIT COMBO!',750);
}
function resolveAttack(){
 if(state.activeAbility){
  state.activeAbility.t+=STEP;
  if(state.activeAbility.t>.8)state.activeAbility=null;
 }
}
function enemyContacts() {
  const s = state.sim, p = state.player;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = s.x - e.x, dz = s.z - e.z;
    const dist2=dx*dx+dz*dz;
    // Earth uses a telegraphed extending-branch strike, not an invisible contact aura.
    if(e.type.branchReach && e.attackT>.19 && e.attackT<.48 && !e.branchHit && dist2<e.type.branchReach*e.type.branchReach && Math.abs(s.y-e.y)<2.7) {
      e.branchHit=true;hurt(e.x,e.z);
    }
    const reach=e.type.radius+P.radius;
    if(dist2>reach*reach)continue;
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

  // Jonesy's passive delayed recovery; taking another hit resets its timer.
  if(state.choice.id==='jonesy-sprite' && state.player.hp<state.player.maxHp
     && state.time-state.lastHurt>4.5 && state.time-state.lastJonesyHeal>6.5){
    state.player.hp=Math.min(state.player.maxHp,state.player.hp+1);
    state.lastJonesyHeal=state.time;
    fx.spark.burst(s.x,s.y+1.2,s.z,14,3.3,.5,.35,.7,1,.55,0);
    toast('Jonesy recovered a heart');
  }
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
  // Story objectives: village beacon, cavern heart, castle ward, summit portal.
  if(LEVELS[state.levelIndex].adventure){
    const quests=LEVELS[state.levelIndex].quests,q=quests[state.questIndex];
    const caveReady=state.questIndex!==1||w.runes.every(r=>r.lit);
    const guardReady=state.questIndex!==2||state.enemies.every(e=>!e.spec.guardian||!e.alive);
    if(q&&caveReady&&guardReady&&Math.hypot(s.x-q.x,s.z-q.z)<q.range&&Math.abs(s.y-q.y)<2.2){
      state.questIndex++;w.questIndex=state.questIndex;
      if(w.completeQuest)w.completeQuest(state.questIndex-1);
      sfx.flag();fx.spark.burst(q.x,q.y+1.2,q.z,36,9,.9,.5,.8,1,.75,1);
      const next=quests[state.questIndex];
      toast(next?'Quest complete! '+next.name:'The summit portal is ready!',2900);
    }
    // Unlock an optional fast route from the cave to the castle, saving backtracking.
    if(state.questIndex>=2&&Math.hypot(s.x+23,s.z+28)<2.0&&s.y<-3){
      s.x=22;s.y=.12;s.z=-13;s.vx=s.vy=s.vz=0;s.standing=null;
      rig.snap(s.x,s.y,s.z);toast('Ancient passage → Castle',1800);
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
  if ((!LEVELS[state.levelIndex].adventure||state.questIndex===3)&&Math.hypot(s.x-g.x,s.z-g.z)<1.9&&s.y>g.y-.6&&s.y<g.y+3)beginFinish();
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
      if(inp.attackCount>0)state.attackQueue=Math.min(8,state.attackQueue+inp.attackCount);
      if(state.mode==='play'&&state.attackQueue>0&&performance.now()/1000>=state.nextAttackAt)attack();
      state.time += dt;
    }
    state.acc += dt;
    let n = 0;
    while (state.acc >= STEP && n < 6) { physicsStep(); state.acc -= STEP; n += 1; }
    if (n === 6) state.acc = 0;
    if (state.mode === 'finish') updateFinish(dt);
    for (const e of state.enemies) e.update(dt, state.sim, state.world.solids);
    state.player.update(dt, state.sim, rig.yaw, state.world.solids, fx);
    if(state.mode==='play'&&state.attackQueue>0&&performance.now()/1000>=state.nextAttackAt)attack();
    updateHud(false);
  } else if (mode === 'title' || mode === 'levels') {
    // attract: slow orbit around the start island
    state.time += dt;
    // Character showroom: keep the entire 3D Sprite visible at all times.
    // Previous full-world orbit regularly placed a tree between the camera
    // and small characters, hiding the important Cheat/Loot animations.
    state.player.yaw = Math.sin(state.time * .68) * .38;
    state.player.update(dt, state.sim, rig.yaw, state.world.solids, fx);
    const s = state.sim;
    camera.position.set(s.x + Math.sin(state.time*.36)*.55,s.y+3.55,s.z+7.65);
    camera.lookAt(s.x,s.y+1.42,s.z);
    rig.target.set(s.x,s.y+1.5,s.z);
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
    // Underground is genuinely below the surface: keep the third-person camera
    // inside the cavern instead of clipping above ground through road/floor meshes.
    if(state.world.level.adventure){
      rig.dist=state.sim.y < -1.5 ? 5.4 : (IS_MOBILE?10.8:9.6);
      if(state.sim.y < -1.5)rig.pitch=Math.min(rig.pitch,.20);
    }
    rig.update(dt, state.sim.x, Math.max(state.sim.y, state.world.minY - 6), state.sim.z, sp, state.inp);
  } else if (state.mode === 'pause') { /* hold */ }

  // fx + world
  if (state.mode !== 'pause') {
    fx.dust.update(dt); fx.spark.update(dt); fx.power.update(dt);
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
    fx.power = new PowerBurst(scene,fx.spark);
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
