// Actors: the player (rigged model or billboarded collection Sprite) and enemy monsters.
import * as THREE from 'three';
import { instantiateCharacter } from './assets.js';
import { PLAYABLE, ENEMIES } from './roster.js';
import { groundY, P } from './sim.js';
import { styleCitrus, getEnv } from './look.js';

const TAU = Math.PI * 2;
function dampAngle(a, b, lambda, dt) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * (1 - Math.exp(-lambda * dt));
}

const blobDummy = new THREE.Object3D();
/** All contact shadows in one InstancedMesh (one draw call, however many actors). */
export class BlobShadows {
  constructor(scene, max = 24) {
    this.max = max; this.next = 0;
    this.mesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, fog: false }),
      max,
    );
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    blobDummy.scale.setScalar(0); blobDummy.updateMatrix();
    for (let i = 0; i < max; i += 1) this.mesh.setMatrixAt(i, blobDummy.matrix);
    scene.add(this.mesh); this.scene = scene;
  }
  alloc() { return this.next < this.max ? this.next++ : this.max - 1; }
  set(i, x, y, z, s) { blobDummy.position.set(x, y, z); blobDummy.scale.setScalar(s); blobDummy.updateMatrix(); this.mesh.setMatrixAt(i, blobDummy.matrix); this.mesh.instanceMatrix.needsUpdate = true; }
  hide(i) { this.set(i, 0, -999, 0, 0); }
  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.dispose(); }
}

export class Player {
  constructor(scene, blobs) {
    this.scene = scene; this.blobs = blobs; this.blob = blobs.alloc();
    this.group = new THREE.Group();
    this.model = null;           // rigged model wrapper
    this.billboard = null;
    this.mixer = null;
    this.actions = {};
    this.current = null;
    scene.add(this.group);
    this.yaw = 0;
    this.hp = 5; this.maxHp = 5;
    this.invuln = 0; this.hurtT = 0; this.attackT = 0; this.attackCd = 0; this.attackHit = false;
    this.win = false; this.dustT = 0; this.squash = 0;
    this.def = null; this.look = null;
  }

  async setSprite(choice) {
    // choice: { kind:'model', id:'citrus' } or { kind:'billboard', image, name }
    if (this.model) { this.group.remove(this.model.root); this.model = null; this.mixer = null; this.actions = {}; this.current = null; }
    if (this.billboard) { this.group.remove(this.billboard); this.billboard.geometry.dispose(); this.billboard.material.map && this.billboard.material.map.dispose(); this.billboard.material.dispose(); this.billboard = null; }
    if (choice.kind === 'model') {
      const def = PLAYABLE[choice.id];
      this.def = def;
      const m = await instantiateCharacter(def.file);
      m.root.scale.setScalar(def.scale);
      m.root.position.y = 0;
      this.look = def.jelly ? styleCitrus(m.root, m, getEnv()) : null;
      m.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
      this.group.add(m.root);
      this.model = m; this.mixer = m.mixer; this.actions = m.actions;
      this.play('idle', 0);
    } else {
      this.def = null;
      const tex = await new Promise((res, rej) => new THREE.TextureLoader().load(choice.image, res, undefined, rej));
      tex.colorSpace = THREE.SRGBColorSpace;
      const aspect = tex.image.height / tex.image.width;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3 * aspect).translate(0, 1.15 * aspect, 0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, fog: true }));
      mesh.castShadow = true;
      // depth-only caster so the billboard throws a shadow
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.35 });
      this.group.add(mesh); this.billboard = mesh;
    }
  }

  play(key, fade = 0.18, once = false) {
    if (!this.def) return;
    const name = this.def.clips[key];
    const next = this.actions[name];
    if (!next || this.current === next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
    this.currentKey = key;
  }

  respawn(x, y, z) {
    this.hp = this.maxHp; this.invuln = 1.5; this.hurtT = 0; this.attackT = 0; this.win = false;
    this.group.position.set(x, y, z);
  }

  /** Visual update. s = sim state, camYaw for billboards. */
  update(dt, s, camYaw, solids, fx) {
    const speed = Math.hypot(s.vx, s.vz);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt);

    this.group.position.set(s.x, s.y, s.z);
    if (speed > 0.9 && this.attackT <= 0) this.yaw = dampAngle(this.yaw, Math.atan2(s.vx, s.vz), 14, dt);

    // squash & stretch
    this.squash += ((s.grounded ? 0 : Math.max(-0.18, Math.min(0.22, s.vy * 0.012))) - this.squash) * (1 - Math.exp(-dt * 14));
    if (s.justLanded) this.squash = -0.22;
    const sy = 1 + this.squash, sxz = 1 - this.squash * 0.5;

    if (this.model) {
      this.model.root.rotation.y = this.yaw + (this.def.yawOffset || 0);
      this.model.root.scale.set(this.def.scale * sxz, this.def.scale * sy, this.def.scale * sxz);
      // animation selection
      if (this.win) this.play('win', 0.25);
      else if (this.hurtT > 0) this.play('hit', 0.08, true);
      else if (this.attackT > 0) this.play('attack', 0.06, true);
      else if (!s.grounded) this.play('jump', 0.1, true);
      else if (speed > 0.7) { this.play('walk', 0.12); if (this.current) this.current.timeScale = Math.max(0.7, speed / 4.4); }
      else this.play('idle', 0.2);
      if (this.mixer) this.mixer.update(dt);
      if (this.look) { this.look.uTime.value = performance.now() / 1000; this.look.uMove.value += (Math.min(1, speed / 8.5) - this.look.uMove.value) * (1 - Math.exp(-6 * dt)); }
      this.model.root.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    } else if (this.billboard) {
      this.billboard.rotation.y = camYaw;
      this.billboard.scale.set(sxz, sy, 1);
      this.billboard.rotation.z = -s.vx * 0.012 * Math.cos(camYaw) - s.vz * 0.012 * Math.sin(camYaw);
      if (s.grounded && speed > 1) this.billboard.position.y = Math.abs(Math.sin(performance.now() * 0.014)) * 0.14; else this.billboard.position.y = 0;
      this.billboard.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    }

    // blob shadow on whatever is below
    const gy = groundY(solids, s.x, s.z, s.y);
    if (isFinite(gy)) this.blobs.set(this.blob, s.x, gy + 0.03, s.z, 0.85 * Math.max(0.35, 1 - Math.max(0, s.y - gy) * 0.08));
    else this.blobs.hide(this.blob);

    // footstep dust
    if (s.grounded && speed > 3) {
      this.dustT -= dt;
      if (this.dustT <= 0) { this.dustT = 0.16; fx.dust.emit(s.x - Math.sin(this.yaw) * 0.3, s.y + 0.1, s.z - Math.cos(this.yaw) * 0.3, (Math.random() - 0.5) * 1.2, 0.8, (Math.random() - 0.5) * 1.2, 0.45, 0.35, 0.9, 0.9, 0.9, 0.85, 0.5, -0.5, 2); }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.blobs.hide(this.blob);
  }
}

export class Enemy {
  constructor(scene, def, spec, island, blobs) {
    this.scene = scene; this.type = def; this.spec = spec; this.blobs = blobs; this.blob = blobs.alloc();
    this.x = spec.x; this.z = spec.z; this.y = spec.y; this.homeX = spec.x; this.homeZ = spec.z; this.r = spec.r;
    this.bounds = { x0: island.x - island.w + 1.0, x1: island.x + island.w - 1.0, z0: island.z - island.d + 1.0, z1: island.z + island.d - 1.0 };
    this.hp = def.hp; this.state = 'patrol'; this.yaw = Math.random() * TAU; this.t = Math.random() * 5;
    this.tx = this.x; this.tz = this.z; this.pause = 0; this.hitT = 0; this.deadT = 0; this.removed = false; this.attackT = 0;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mixer = null; this.actions = {}; this.current = null;
  }

  async load() {
    const m = await instantiateCharacter(this.type.file);
    m.root.scale.setScalar(this.type.scale);
    m.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
    this.group.add(m.root);
    this.model = m; this.mixer = m.mixer; this.actions = m.actions;
    this.play('idle', 0);
    this.mixer.update(Math.random());
  }

  play(key, fade = 0.2, once = false) {
    const name = this.type.clips[key];
    const next = name && this.actions[name];
    if (!next || this.current === next) return;
    next.reset(); next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); next.clampWhenFinished = once; next.enabled = true; next.play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  get alive() { return this.state !== 'dying' && !this.removed; }

  damage(n, fx, sfx) {
    if (!this.alive) return false;
    this.hp -= n; this.hitT = 0.35;
    if (this.hp <= 0) {
      this.state = 'dying'; this.deadT = 0.9;
      this.play('death', 0.08, true);
      fx.spark.burst(this.x, this.y + 1, this.z, 22, 7, 0.7, 0.5, 1, 0.85, 0.3, 8);
      sfx.defeat();
      return true;
    }
    this.play('hit', 0.05, true);
    sfx.hit();
    return false;
  }

  update(dt, player, solids) {
    if (this.removed) return;
    this.t += dt;
    if (this.state === 'dying') {
      this.deadT -= dt;
      if (this.mixer) this.mixer.update(dt);
      const k = Math.max(0, this.deadT / 0.9);
      if (this.deadT < 0.35) this.group.scale.setScalar(Math.max(0.001, k / 0.39));
      if (this.deadT <= 0) { this.removed = true; this.scene.remove(this.group); this.blobs.hide(this.blob); }
      this.sync(solids);
      return;
    }
    this.hitT = Math.max(0, this.hitT - dt);
    this.attackT = Math.max(0, this.attackT - dt);
    const dx = player.x - this.x, dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);
    const sameLevel = Math.abs(player.y - this.y) < 3.2;
    const wantsChase = sameLevel && dist < 11 && this.hitT <= 0;
    this.attackCd = Math.max(0, (this.attackCd || 0) - dt);
    let speed = 0;

    if (this.hitT > 0) {
      speed = 0;
    } else if (wantsChase) {
      this.state = 'chase';
      this.yaw = Math.atan2(dx, dz);
      speed = dist > 1.4 ? this.type.chase : 0;
      if (dist < 2.2 && this.attackT <= 0 && this.attackCd <= 0) { this.attackT = 0.7; this.attackCd = 1.8; this.play('attack', 0.08, true); }
    } else {
      this.state = 'patrol';
      if (this.pause > 0) {
        this.pause -= dt;
      } else {
        const tdx = this.tx - this.x, tdz = this.tz - this.z;
        if (Math.hypot(tdx, tdz) < 0.5) {
          this.pause = 0.8 + Math.random() * 1.4;
          const a = Math.random() * TAU, rr = Math.random() * this.r;
          this.tx = Math.min(this.bounds.x1, Math.max(this.bounds.x0, this.homeX + Math.cos(a) * rr));
          this.tz = Math.min(this.bounds.z1, Math.max(this.bounds.z0, this.homeZ + Math.sin(a) * rr));
        } else {
          this.yaw = Math.atan2(tdx, tdz);
          speed = this.type.speed;
        }
      }
    }

    if (this.attackT > 0.3 && this.hitT <= 0) speed = this.type.chase * 1.7; // lunge so the bite actually reaches
    if (speed > 0) {
      this.x = Math.min(this.bounds.x1, Math.max(this.bounds.x0, this.x + Math.sin(this.yaw) * speed * dt));
      this.z = Math.min(this.bounds.z1, Math.max(this.bounds.z0, this.z + Math.cos(this.yaw) * speed * dt));
    }
    if (this.attackT <= 0 && this.hitT <= 0) this.play(speed > 0 ? 'walk' : 'idle', 0.2);
    if (this.mixer) this.mixer.update(dt);
    this.sync(solids);
  }

  sync(solids) {
    const float = this.type.floats ? Math.sin(this.t * 2.4) * this.type.floats + this.type.floats : 0;
    this.group.position.set(this.x, this.y + float, this.z);
    this.group.rotation.y = this.yaw;
    this.blobs.set(this.blob, this.x, this.y + 0.03, this.z, this.type.radius * (this.state === 'dying' ? this.group.scale.x : 1.15));
  }

  dispose() { this.scene.remove(this.group); this.blobs.hide(this.blob); }
}

export async function createEnemies(scene, level, blobs) {
  const list = level.enemies.map((e) => new Enemy(scene, ENEMIES[e.type], e, level.islands[e.isl], blobs));
  await Promise.all(list.map((e) => e.load()));
  return list;
}
