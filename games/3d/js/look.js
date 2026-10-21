// Visual styling for the Citrus Sprite model, matched to the "Sprite Hero" reference sheet:
// gummy/toy orange skin with soft bubble bumps and a glossy clear-coat, glowing white eyes in a glossy blue
// mask, and a matte blue cape that lifts and ripples with movement. Everything is procedural (no extra files).
import * as THREE from 'three';

function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 2;
  return t;
}

/** Height map of random soft bubbles (tileable). */
function bubbleTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    let seed = 7; const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 46; i += 1) {
      const x = r() * s, y = r() * s, rad = 9 + r() * 26, hi = 0.5 + r() * 0.5;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, `rgba(255,255,255,${hi})`); gr.addColorStop(0.7, `rgba(255,255,255,${hi * 0.35})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  });
}

function glowTexture() {
  return canvasTex(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(210,235,255,0.75)'); gr.addColorStop(1, 'rgba(160,210,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, false);
}

/** Small studio-style environment so the clear-coat has something to reflect (built once, shared). */
let sharedEnv = null;
export function initLook(renderer) { if (!sharedEnv) sharedEnv = makeEnvTexture(renderer); return sharedEnv; }
export function getEnv() { return sharedEnv; }

export function makeEnvTexture(renderer) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.55,0.42,0.32), vec3(0.62,0.78,1.0), smoothstep(-0.4, 0.8, h)); gl_FragColor = vec4(c, 1.0); }',
    }),
  );
  scene.add(sky);
  const box = (x, y, z, w, h, col, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); scene.add(m);
  };
  box(5, 6, 4, 6, 4, '#ffffff', 6); box(-6, 3, 3, 3, 6, '#cfe6ff', 3); box(0, 7, -6, 8, 3, '#fff3dd', 4);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.03).texture;
  pm.dispose();
  sky.geometry.dispose(); sky.material.dispose();
  return tex;
}

const BUBBLE_FRAG = `
uniform sampler2D uBubbleTex; uniform float uBubbleScale; uniform float uBubbleStrength; uniform vec3 uRimColor;
varying vec3 vOPos; varying vec3 vONrm;
vec3 spritePerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection){
  vec3 vSigmaX = normalize(dFdx(surf_pos)); vec3 vSigmaY = normalize(dFdy(surf_pos)); vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`;

/**
 * Style the Citrus model in place. Returns shared uniforms the caller animates:
 *   { uTime, uMove }  (cape wave).
 */
/** Remove the tiny stud-sphere components (<= maxTris triangles) from a skinned mesh, once per shared geometry. */
function stripStuds(mesh, maxTris = 70) {
  const g = mesh.geometry;
  if (!g.index || g.userData.studsRemoved) return;
  const idx = g.index, n = g.attributes.position.count, tri = idx.count / 3;
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < tri; t += 1) {
    const a = find(idx.getX(t * 3)), b = find(idx.getX(t * 3 + 1)), c = find(idx.getX(t * 3 + 2));
    parent[a] = c; parent[b] = c;
  }
  const count = new Map();
  for (let t = 0; t < tri; t += 1) { const r = find(idx.getX(t * 3)); count.set(r, (count.get(r) || 0) + 1); }
  const keep = [];
  for (let t = 0; t < tri; t += 1) {
    if (count.get(find(idx.getX(t * 3))) > maxTris) keep.push(idx.getX(t * 3), idx.getX(t * 3 + 1), idx.getX(t * 3 + 2));
  }
  g.setIndex(keep);
  g.userData.studsRemoved = true;
}

export function styleCitrus(root, info, envTex) {
  const uTime = { value: 0 }, uMove = { value: 0 };
  const bubble = bubbleTexture();
  const glow = glowTexture();
  const bones = {};
  root.traverse((o) => { if (o.isBone) bones[o.name] = o; });

  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const m = o.material, name = m.name;
    m.envMap = envTex || null;
    if (name === 'SpriteBody') {
      stripStuds(o);
      m.color.set('#ff6a08'); m.roughness = 0.4; m.metalness = 0;
      m.clearcoat = 0.6; m.clearcoatRoughness = 0.25; m.envMapIntensity = 0.5;
      m.emissive.set('#ff4a00'); m.emissiveIntensity = 0.16;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uBubbleTex = { value: bubble }; sh.uniforms.uBubbleScale = { value: 1.5 };
        sh.uniforms.uBubbleStrength = { value: 0.2 }; sh.uniforms.uRimColor = { value: new THREE.Color('#ffd27a') };
        sh.uniforms.uBase = { value: info.footOffset }; sh.uniforms.uHeight = { value: info.height };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vOPos; varying vec3 vONrm;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvOPos = transformed; vONrm = objectNormal;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>\n${BUBBLE_FRAG}\nuniform float uBase; uniform float uHeight;`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            {
              vec3 bw = pow(abs(normalize(vONrm)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
              vec3 bp = vOPos * uBubbleScale;
              float bh = texture2D(uBubbleTex, bp.yz).r * bw.x + texture2D(uBubbleTex, bp.xz).r * bw.y + texture2D(uBubbleTex, bp.xy).r * bw.z;
              normal = spritePerturb(-vViewPosition, normal, vec2(dFdx(bh), dFdy(bh)) * uBubbleStrength * 14.0, faceDirection);
            }`)
          .replace('#include <opaque_fragment>', `
            float fres = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
            outgoingLight += uRimColor * fres * 0.4;
            outgoingLight *= mix(0.72, 1.0, smoothstep(0.0, 0.75, (vOPos.y + uBase) / uHeight));
            #include <opaque_fragment>`);
      };
    } else if (name === 'SpriteCape') {
      m.color.set('#2c63c4'); m.roughness = 0.82; m.metalness = 0; m.envMapIntensity = 0.25;
      m.sheen = 0.6; m.sheenColor = new THREE.Color('#8fb8ff'); m.sheenRoughness = 0.6; m.side = THREE.DoubleSide;
      o.geometry.computeBoundingBox();
      const top = o.geometry.boundingBox.max.y, len = Math.max(0.2, top - o.geometry.boundingBox.min.y);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = uTime; sh.uniforms.uMove = uMove; sh.uniforms.uTop = { value: top }; sh.uniforms.uLen = { value: len };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uMove; uniform float uTop; uniform float uLen;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            transformed.y = uTop - (uTop - transformed.y) * 1.4;
            transformed.x *= 1.18;
            float ch = clamp((uTop - transformed.y) / (uLen * 1.4), 0.0, 1.0);
            transformed.z -= ch * ch * (0.05 + uMove * 0.34);
            transformed.x += sin(transformed.y * 9.0 + uTime * 6.0) * 0.03 * ch * (0.3 + uMove);
            transformed.z += sin(transformed.x * 8.0 - uTime * 4.0) * 0.025 * ch * (0.4 + uMove);`);
      };
    } else if (name === 'SpriteEye') {
      m.color.set('#ffffff'); m.emissive.set('#ffffff'); m.emissiveIntensity = 2.6; m.roughness = 0.2; m.toneMapped = false;
    } else if (name === 'SpriteMask') {
      m.color.set('#2a5fb8'); m.roughness = 0.4; m.clearcoat = 0.45; m.clearcoatRoughness = 0.25; m.envMapIntensity = 0.7;
    } else if (name === 'SpriteTeeth') {
      m.color.set('#ffffff'); m.roughness = 0.3; m.emissive.set('#ffffff'); m.emissiveIntensity = 0.25; m.clearcoat = 0.4;
    } else if (name === 'SpriteMouth') {
      m.color.set('#7a2a1c'); m.roughness = 0.5;
    } else if (name === 'SpriteEmblem') {
      m.color.set('#ffb12e'); m.emissive.set('#ff9a00'); m.emissiveIntensity = 0.35; m.roughness = 0.4; m.clearcoat = 0.4; m.envMapIntensity = 0.7;
    }
    m.needsUpdate = true;
  });

  // Soft glow halos on the eyes (follow the eye bones through every animation).
  const glowMat = new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  ['eye_L', 'eye_R'].forEach((n) => {
    if (!bones[n]) return;
    bones[n].scale.multiplyScalar(1.3);
    const s = new THREE.Sprite(glowMat);
    s.scale.setScalar(0.4); s.position.set(0, 0, 0.05); s.renderOrder = 5;
    bones[n].add(s);
  });
  return { uTime, uMove };
}
