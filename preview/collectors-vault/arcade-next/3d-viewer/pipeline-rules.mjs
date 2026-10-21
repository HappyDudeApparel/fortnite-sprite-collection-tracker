// Sprite character pipeline — pure inspection and rules (no DOM, no three.js), so Node and the browser viewer agree.
//
// A character is acceptable for the 3D game when it passes these checks. "fail" blocks it, "warn" needs a human
// decision (rights, naming), "pass" is fine. Budgets match the proposal in docs/proposals/sprite-games-expansion.md.

export const TIERS = {
  hero:  { label: 'Hero / playable', maxTris: 18000, maxJoints: 40, maxMaterials: 8, maxBytes: 1_000_000, requiredClips: ['idle', 'walk', 'jump', 'attack', 'hit', 'win'] },
  enemy: { label: 'Enemy / crowd',   maxTris: 6000,  maxJoints: 24, maxMaterials: 4, maxBytes: 600_000,   requiredClips: ['idle', 'walk', 'attack', 'hit'] },
};

/** Parse the JSON chunk of a .glb (ArrayBuffer or Node Buffer). */
export function readGlbJson(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB file');
  const len = dv.getUint32(12, true);
  const text = new TextDecoder().decode(u8.subarray(20, 20 + len));
  return JSON.parse(text);
}

/** Facts about a model, straight from its glTF JSON. */
export function inspect(json, bytes = 0) {
  let triangles = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) {
    for (const p of mesh.primitives || []) {
      if (p.indices !== undefined) triangles += json.accessors[p.indices].count / 3;
      else if (p.attributes && p.attributes.POSITION !== undefined) triangles += json.accessors[p.attributes.POSITION].count / 3;
      const a = p.attributes && json.accessors[p.attributes.POSITION];
      if (a && a.min && a.max) for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], a.min[i]); max[i] = Math.max(max[i], a.max[i]); }
    }
  }
  const skins = json.skins || [];
  const joints = skins.length ? skins[0].joints.map((i) => json.nodes[i].name || `node${i}`) : [];
  return {
    bytes,
    exporter: (json.asset && json.asset.generator) || '',
    triangles: Math.round(triangles),
    skins: skins.length,
    skinName: skins.length ? skins[0].name || '' : '',
    joints,
    clips: (json.animations || []).map((a) => a.name || ''),
    materials: (json.materials || []).map((m) => m.name || ''),
    images: (json.images || []).length,
    size: Number.isFinite(min[0]) ? [max[0] - min[0], max[1] - min[1], max[2] - min[2]] : null,
  };
}

/**
 * Run the rules for one registry record against inspected facts.
 * record = { tier, clips:{semantic:name}, provenance:{status, sha256}, expectSha256? }
 * Returns [{ level:'pass'|'warn'|'fail', rule, message }].
 */
export function check(stats, record, actualSha256) {
  const t = TIERS[record.tier];
  const out = [];
  const add = (level, rule, message) => out.push({ level, rule, message });
  if (!t) { add('fail', 'tier', `unknown tier "${record.tier}"`); return out; }

  add(stats.exporter ? 'pass' : 'warn', 'exporter', stats.exporter ? `exported by ${stats.exporter}` : 'no exporter recorded in the file');
  add(stats.triangles <= t.maxTris ? 'pass' : 'fail', 'triangles', `${stats.triangles.toLocaleString('en-US')} triangles (${t.label} budget ${t.maxTris.toLocaleString('en-US')})`);
  add(stats.bytes === 0 || stats.bytes <= t.maxBytes ? 'pass' : 'fail', 'file size', `${(stats.bytes / 1024).toFixed(0)} KB (budget ${(t.maxBytes / 1024).toFixed(0)} KB)`);
  add(stats.materials.length <= t.maxMaterials ? 'pass' : 'fail', 'materials', `${stats.materials.length} materials (budget ${t.maxMaterials})`);

  if (stats.skins !== 1) add('fail', 'skeleton', `${stats.skins} skins (need exactly one so clips are shared)`);
  else if (stats.joints.length > t.maxJoints) add('fail', 'skeleton', `${stats.joints.length} joints (budget ${t.maxJoints})`);
  else add('pass', 'skeleton', `${stats.joints.length} joints in "${stats.skinName}"`);

  const missing = [];
  for (const key of t.requiredClips) {
    const name = record.clips && record.clips[key];
    if (!name) missing.push(`${key} (not mapped)`);
    else if (!stats.clips.includes(name)) missing.push(`${key} -> "${name}" (not in file)`);
  }
  add(missing.length ? 'fail' : 'pass', 'clips', missing.length ? `missing: ${missing.join(', ')}` : `all ${t.requiredClips.length} required clips present: ${t.requiredClips.map((k) => `${k}=${record.clips[k]}`).join(', ')}`);

  if (stats.size) {
    const h = stats.size[1];
    add(h >= 0.3 && h <= 6 ? 'pass' : 'warn', 'scale', `model is ${h.toFixed(2)} units tall (expected 0.3-6 before game scaling)`);
  }

  const prov = record.provenance || {};
  if (actualSha256 && prov.sha256) add(actualSha256 === prov.sha256 ? 'pass' : 'fail', 'integrity', actualSha256 === prov.sha256 ? 'SHA-256 matches the provenance record' : `SHA-256 differs from the provenance record (${actualSha256.slice(0, 12)}... vs ${prov.sha256.slice(0, 12)}...)`);
  else add('warn', 'integrity', 'no SHA-256 recorded');
  if (prov.status === 'cleared') add('pass', 'rights', prov.summary || 'rights cleared');
  else add('warn', 'rights', `rights ${prov.status || 'unrecorded'}: ${prov.summary || 'no provenance record'}`);
  return out;
}

export const verdict = (results) => (results.some((r) => r.level === 'fail') ? 'fail' : results.some((r) => r.level === 'warn') ? 'warn' : 'pass');
