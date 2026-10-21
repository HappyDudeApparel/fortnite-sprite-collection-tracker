// Asset loading: Kenney CC0 pieces merged into one geometry each (so they can be instanced), and rigged
// character models that can be cloned any number of times with independent animation.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();
const gltfCache = new Map();
const geoCache = new Map();
let colormap = null;

export function loadGLTF(url) {
  if (!gltfCache.has(url)) gltfCache.set(url, loader.loadAsync(url));
  return gltfCache.get(url);
}

/** Merge every mesh of a Kenney model into a single BufferGeometry (world transforms baked in). */
export async function kenneyGeometry(name) {
  if (geoCache.has(name)) return geoCache.get(name);
  const promise = (async () => {
    const gltf = await loadGLTF(`assets/kenney/${name}.glb`);
    gltf.scene.updateMatrixWorld(true);
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      for (const attr of Object.keys(g.attributes)) if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') g.deleteAttribute(attr);
      if (!colormap && o.material.map) {
        colormap = o.material.map;
        colormap.colorSpace = THREE.SRGBColorSpace;
        colormap.magFilter = THREE.NearestFilter;
        colormap.minFilter = THREE.NearestFilter;
        colormap.generateMipmaps = false;
        colormap.anisotropy = 1;
      }
      parts.push(g.index ? g.toNonIndexed() : g);
    });
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  })();
  geoCache.set(name, promise);
  return promise;
}

/** One cheap Lambert material for the whole Kenney kit (single palette texture). */
export function kenneyMaterial(tint = '#ffffff') {
  return new THREE.MeshLambertMaterial({ map: colormap, color: new THREE.Color(tint) });
}

// ---- skinned model cloning (same algorithm as three's SkeletonUtils.clone) ----
function parallelTraverse(a, b, cb) {
  cb(a, b);
  for (let i = 0; i < a.children.length; i += 1) parallelTraverse(a.children[i], b.children[i], cb);
}

export function cloneSkinned(source) {
  const clone = source.clone(true);
  const srcLookup = new Map();
  const cloneLookup = new Map();
  parallelTraverse(source, clone, (s, c) => { cloneLookup.set(s, c); srcLookup.set(c, s); });
  clone.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const src = srcLookup.get(node);
    const bones = src.skeleton.bones.map((b) => cloneLookup.get(b));
    node.skeleton = new THREE.Skeleton(bones, src.skeleton.boneInverses);
    node.bindMatrix.copy(src.bindMatrix);
    node.bind(node.skeleton, node.bindMatrix);
  });
  return clone;
}

/**
 * Instantiate a rigged character. Returns { root, mixer, actions, height }.
 * `height` is the model's natural height before scaling; the caller scales `root`.
 */
export async function instantiateCharacter(file) {
  const gltf = await loadGLTF(`assets/characters/${file}.glb`);
  const root = cloneSkinned(gltf.scene);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y;
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { o.frustumCulled = false; } });
  return { root, mixer, actions, height, footOffset: -box.min.y };
}

export function preloadKenney(names, onProgress) {
  let done = 0;
  return Promise.all(names.map((n) => kenneyGeometry(n).then((g) => { done += 1; if (onProgress) onProgress(done, names.length); return g; })));
}
