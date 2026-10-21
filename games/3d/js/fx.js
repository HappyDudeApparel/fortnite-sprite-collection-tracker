// Particles: one preallocated Points object per blend mode, ring-buffer allocated, zero per-frame allocation.
import * as THREE from 'three';

const VERT = `
attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vColor;
void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv; gl_PointSize = max(0.0, aSize * uScale / max(0.1, -mv.z)); }`;
const FRAG = `
varying vec4 vColor;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vColor.a;
  if (a < 0.01) discard; gl_FragColor = vec4(vColor.rgb, a); }`;

export class Particles {
  constructor(max, additive) {
    this.max = max;
    this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.alive = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 600 } },
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    for (let i = 0; i < max; i += 1) this.pos[i * 3 + 1] = -9999;
  }

  setScale(viewportHeight, fov) { this.material.uniforms.uScale.value = viewportHeight * 0.5 / Math.tan(THREE.MathUtils.degToRad(fov) * 0.5); }

  emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav = 0, drag = 0) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const p = i * 3;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.vel[p] = vx; this.vel[p + 1] = vy; this.vel[p + 2] = vz;
    const c = i * 4;
    this.col[c] = r; this.col[c + 1] = g; this.col[c + 2] = b; this.col[c + 3] = a;
    this.life[i] = life; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.grav[i] = grav; this.drag[i] = drag; this.size[i] = s0;
  }

  /** Radial burst helper. */
  burst(x, y, z, n, speed, life, size, r, g, b, grav = 6, up = 0) {
    for (let k = 0; k < n; k += 1) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.6;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.emit(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + up, Math.sin(a) * Math.cos(e) * s, life * (0.6 + Math.random() * 0.4), size, 0, r, g, b, 1, grav, 1.2);
    }
  }

  update(dt) {
    let alive = 0;
    for (let i = 0; i < this.max; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const p = i * 3;
      if (this.life[i] <= 0) { this.pos[p + 1] = -9999; this.size[i] = 0; continue; }
      alive += 1;
      const damp = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[p] *= damp; this.vel[p + 2] *= damp; this.vel[p + 1] = this.vel[p + 1] * damp - this.grav[i] * dt;
      this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.col[i * 4 + 3] = Math.min(1, (1 - t) * 1.6);
    }
    this.alive = alive;
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aSize.needsUpdate = true;
  }
}

/** Ambient weather around the camera (pollen, snow, embers…). Wraps inside a box so it never needs spawning. */
export class Ambient {
  constructor(kind, count, color) {
    this.kind = kind; this.count = count; this.box = 46;
    this.col = new THREE.Color(color);
    this.sys = new Particles(count, kind !== 'snow');
    this.seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) { this.seed[i * 3] = Math.random(); this.seed[i * 3 + 1] = Math.random(); this.seed[i * 3 + 2] = Math.random(); }
    this.t = 0;
    for (let i = 0; i < count; i += 1) this.sys.life[i] = 1e9;
  }

  update(dt, cam) {
    this.t += dt;
    const s = this.sys, b = this.box, k = this.kind;
    for (let i = 0; i < this.count; i += 1) {
      const sx = this.seed[i * 3], sy = this.seed[i * 3 + 1], sz = this.seed[i * 3 + 2];
      let fall = k === 'snow' ? -2.6 : k === 'ember' ? 3.2 : 0.35;
      const drift = Math.sin(this.t * (0.4 + sz) + sx * 20) * (k === 'ember' ? 1.2 : 0.8);
      // position inside the camera-centred box, wrapped
      let x = ((sx * b * 2 + this.t * drift * 1.2) % (b * 2) + b * 2) % (b * 2) - b;
      let y = (((sy * 30 + this.t * fall) % 30) + 30) % 30 - 6;
      let z = ((sz * b * 2 - this.t * 0.6 * drift) % (b * 2) + b * 2) % (b * 2) - b;
      const p = i * 3;
      s.pos[p] = cam.x + x; s.pos[p + 1] = cam.y + y - 2; s.pos[p + 2] = cam.z + z;
      const size = (k === 'snow' ? 0.16 : k === 'ember' ? 0.14 : 0.12) * (0.6 + sx);
      s.size[i] = size;
      const tw = 0.55 + Math.sin(this.t * (k === 'ember' ? 9 : 2.4) + sy * 40) * 0.4;
      s.col[i * 4] = this.col.r; s.col[i * 4 + 1] = this.col.g; s.col[i * 4 + 2] = this.col.b; s.col[i * 4 + 3] = tw * (k === 'snow' ? 0.9 : 0.7);
    }
    const a = s.points.geometry.attributes;
    a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aSize.needsUpdate = true;
  }
}
