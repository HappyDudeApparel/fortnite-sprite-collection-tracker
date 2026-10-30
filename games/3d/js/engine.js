// Engine core: renderer + adaptive quality governor, input (keyboard / touch / gamepad), camera rig.
import * as THREE from 'three';

export const IS_MOBILE = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || Math.min(innerWidth, innerHeight) < 560;

// Quality ladder: the governor walks up/down this list. Index 0 is the prettiest.
export const LADDER = [
  { dpr: 2.0,  shadow: 2048, scale: 1.0,  ambient: 1.0, far: true },
  { dpr: 1.5,  shadow: 1024, scale: 0.9,  ambient: 0.8, far: true },
  { dpr: 1.25, shadow: 1024, scale: 1.0,  ambient: 0.6, far: true },
  { dpr: 1.0,  shadow: 1024, scale: 0.85, ambient: 0.5, far: false },
  { dpr: 1.0,  shadow: 0,    scale: 0.8,  ambient: 0.35, far: false },
  { dpr: 0.9,  shadow: 0,    scale: 0.65, ambient: 0.2, far: false },
];

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOBILE, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  return renderer;
}

export class Quality {
  constructor(renderer, forced) {
    this.renderer = renderer;
    this.forced = Number.isInteger(forced) ? forced : null;
    const weak = (navigator.hardwareConcurrency || 4) <= 4;
    this.index = this.forced !== null ? this.forced : IS_MOBILE ? (weak ? 3 : 2) : 0;
    this.listeners = [];
    this.acc = 0; this.frames = 0; this.cool = 3; this.good = 0;
    this.stepsUp = 0;
  }

  get level() { return LADDER[this.index]; }

  apply() {
    const q = this.level;
    const dpr = Math.min(window.devicePixelRatio || 1, q.dpr) * q.scale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.listeners.forEach((fn) => fn(q, this.index));
  }

  onChange(fn) { this.listeners.push(fn); }

  /** Call once per rendered frame with the raw frame time in seconds. */
  sample(dt) {
    if (this.forced !== null) return;
    this.acc += dt; this.frames += 1; this.cool -= dt;
    if (this.frames < 40) return;
    const avg = this.acc / this.frames;
    this.acc = 0; this.frames = 0;
    if (avg > 0.024 && this.index < LADDER.length - 1 && this.cool <= 0) {
      this.index += 1; this.cool = 2.5; this.good = 0; this.apply();
    } else if (avg < 0.0145 && this.index > 0) {
      this.good += 1;
      if (this.good >= 8 && this.cool <= 0 && this.stepsUp < 2) { this.index -= 1; this.stepsUp += 1; this.cool = 6; this.good = 0; this.apply(); }
    } else this.good = 0;
  }
}

// ------------------------------------------------------------------------------------------------ input
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mx = 0; this.my = 0;
    this.touchMove = { x: 0, y: 0, active: false };
    this.jumpHeld = false; this._jumpEdge = false; this._attackTaps = 0; this._pauseEdge = false;
    this.camYaw = 0; this.camPitch = 0;
    this.padPrev = { a: false, b: false, start: false };
    this.dragging = false;
    this.lastActive = 0;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space') { this._jumpEdge = true; this.jumpHeld = true; }
      if (['KeyJ', 'KeyK', 'KeyX', 'Enter', 'ShiftLeft', 'ShiftRight'].includes(e.code)) this._attackTaps += 1;
      if (e.code === 'Escape' || e.code === 'KeyP') this._pauseEdge = true;
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'Space') this.jumpHeld = false; });
    addEventListener('blur', () => { this.keys.clear(); this.jumpHeld = false; });

    canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { this.dragging = true; canvas.setPointerCapture(e.pointerId); } });
    canvas.addEventListener('pointermove', (e) => { if (this.dragging) { this.camYaw -= e.movementX * 0.006; this.camPitch += e.movementY * 0.004; } });
    canvas.addEventListener('pointerup', () => { this.dragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Wire touch controls (all optional elements). */
  bindTouch({ stick, knob, jump, attack, camZone }) {
    if (stick) {
      let id = null, cx = 0, cy = 0;
      const R = 52;
      stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; this.touchMove.active = true; move(e); e.preventDefault(); });
      const move = (e) => {
        let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
        if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
        this.touchMove.x = dx / R; this.touchMove.y = -dy / R;
        if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
      const end = (e) => { if (e.pointerId !== id) return; id = null; this.touchMove.x = 0; this.touchMove.y = 0; this.touchMove.active = false; if (knob) knob.style.transform = 'translate(0,0)'; };
      stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    }
    if (jump) {
      jump.addEventListener('pointerdown', (e) => { this._jumpEdge = true; this.jumpHeld = true; jump.setPointerCapture(e.pointerId); e.preventDefault(); });
      const up = () => { this.jumpHeld = false; };
      jump.addEventListener('pointerup', up); jump.addEventListener('pointercancel', up);
    }
    if (attack) attack.addEventListener('pointerdown', (e) => { this._attackTaps += 1; e.preventDefault(); });
    if (camZone) {
      let id = null, lx = 0, ly = 0;
      camZone.addEventListener('pointerdown', (e) => { id = e.pointerId; camZone.setPointerCapture(id); lx = e.clientX; ly = e.clientY; });
      camZone.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; this.camYaw -= (e.clientX - lx) * 0.008; this.camPitch += (e.clientY - ly) * 0.005; lx = e.clientX; ly = e.clientY; });
      const end = (e) => { if (e.pointerId === id) id = null; };
      camZone.addEventListener('pointerup', end); camZone.addEventListener('pointercancel', end);
    }
  }

  /** Per-frame poll. Returns edges and consumes them. */
  poll(dt, out) {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyQ')) this.camYaw += 2.2 * dt;
    if (k.has('KeyE')) this.camYaw -= 2.2 * dt;
    if (this.touchMove.active) { x = this.touchMove.x; y = this.touchMove.y; }

    const pad = (navigator.getGamepads && navigator.getGamepads()[0]) || null;
    if (pad) {
      const ax = pad.axes[0] || 0, ay = -(pad.axes[1] || 0);
      if (Math.hypot(ax, ay) > 0.18) { x = ax; y = ay; }
      const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
      if (Math.abs(rx) > 0.15) this.camYaw -= rx * 2.6 * dt;
      if (Math.abs(ry) > 0.15) this.camPitch += ry * 1.6 * dt;
      const a = !!(pad.buttons[0] && pad.buttons[0].pressed), b = !!((pad.buttons[2] && pad.buttons[2].pressed) || (pad.buttons[1] && pad.buttons[1].pressed));
      const st = !!(pad.buttons[9] && pad.buttons[9].pressed);
      if (a && !this.padPrev.a) this._jumpEdge = true;
      this.jumpHeld = this.jumpHeld || a;
      if (!a && this.padPrev.a) this.jumpHeld = false;
      if (b && !this.padPrev.b) this._attackTaps += 1;
      if (st && !this.padPrev.start) this._pauseEdge = true;
      this.padPrev.a = a; this.padPrev.b = b; this.padPrev.start = st;
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    out.mx = x; out.my = y;
    out.jump = this._jumpEdge; out.jumpHeld = this.jumpHeld; out.attackCount = this._attackTaps; out.attack = this._attackTaps>0; out.pause = this._pauseEdge;
    out.camYaw = this.camYaw; out.camPitch = this.camPitch;
    this.camYaw = 0; this.camPitch = 0;
    this._jumpEdge = false; this._attackTaps = 0; this._pauseEdge = false;
    return out;
  }
}

// ------------------------------------------------------------------------------------------------ camera
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0; this.pitch = 0.42; this.dist = IS_MOBILE ? 10.8 : 9.6;
    this.target = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.shake = 0;
    this.fovBase = 58;
    this.fov = 58;
    this.first = true;
  }

  snap(x, y, z) { this.target.set(x, y + 1.5, z); this.look.copy(this.target); this.first = true; }

  update(dt, px, py, pz, speed, input) {
    this.yaw += input.camYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.camPitch, 0.12, 1.2);
    const k = 1 - Math.exp(-dt * 7);
    const ky = 1 - Math.exp(-dt * 3.2);          // vertical follow is lazier so jumps feel grounded
    this.target.x += (px - this.target.x) * k;
    this.target.z += (pz - this.target.z) * k;
    this.target.y += (py + 1.5 - this.target.y) * ky;
    const cp = Math.cos(this.pitch);
    const dist = this.dist + Math.min(speed, 9) * 0.12;
    this.pos.set(
      this.target.x + Math.sin(this.yaw) * cp * dist,
      this.target.y + Math.sin(this.pitch) * dist,
      this.target.z + Math.cos(this.yaw) * cp * dist,
    );
    this.shake = Math.max(0, this.shake - dt * 2.4);
    if (this.shake > 0) { this.pos.x += (Math.random() - 0.5) * this.shake * 0.5; this.pos.y += (Math.random() - 0.5) * this.shake * 0.5; }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target.x, this.target.y + 0.4, this.target.z);
    const targetFov = this.fovBase + Math.min(speed, 9) * 0.5;
    this.fov += (targetFov - this.fov) * (1 - Math.exp(-dt * 4));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
}
