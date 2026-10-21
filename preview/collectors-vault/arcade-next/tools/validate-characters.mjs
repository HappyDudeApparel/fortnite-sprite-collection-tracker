#!/usr/bin/env node
// Validate every character in 3d-viewer/registry.json against the pipeline rules.
//   node validate-characters.mjs            report; exit 1 on any FAIL (WARN is allowed but printed)
//   node validate-characters.mjs --mutate   break models on purpose; the rules must catch each one
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readGlbJson, inspect, check, verdict, TIERS } from '../3d-viewer/pipeline-rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const viewer = path.join(here, '..', '3d-viewer');
const registry = JSON.parse(fs.readFileSync(path.join(viewer, 'registry.json'), 'utf8'));
const base = path.join(viewer, registry.basePath);

function run() {
  let failed = false;
  for (const rec of registry.characters) {
    const buf = fs.readFileSync(path.join(base, rec.file));
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const stats = inspect(readGlbJson(buf), buf.length);
    const results = check(stats, rec, sha);
    const v = verdict(results);
    console.log(`${v.toUpperCase().padEnd(4)} ${rec.id.padEnd(8)} ${TIERS[rec.tier].label.padEnd(16)} ${stats.triangles} tris, ${stats.joints.length} joints, ${stats.clips.length} clips`);
    for (const r of results.filter((x) => x.level !== 'pass')) console.log(`       ${r.level}: ${r.rule}: ${r.message}`);
    if (v === 'fail') failed = true;
  }
  return !failed;
}

function mutate() {
  const rec = registry.characters.find((c) => c.id === 'citrus');
  const buf = fs.readFileSync(path.join(base, rec.file));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const clone = () => JSON.parse(JSON.stringify(readGlbJson(buf)));
  const cases = [
    ['intact model', (j) => j, (r) => r.level !== 'fail', true],
    ['too many triangles', (j) => { for (const m of j.meshes) for (const p of m.primitives) j.accessors[p.indices].count *= 3; return j; }, (r) => r.rule === 'triangles' && r.level === 'fail'],
    ['a required clip is missing', (j) => { j.animations = j.animations.filter((a) => a.name !== 'Jump'); return j; }, (r) => r.rule === 'clips' && r.level === 'fail'],
    ['two skins', (j) => { j.skins.push(j.skins[0]); return j; }, (r) => r.rule === 'skeleton' && r.level === 'fail'],
    ['too many joints', (j) => { j.skins[0].joints = Array.from({ length: 60 }, () => j.skins[0].joints[0]); return j; }, (r) => r.rule === 'skeleton' && r.level === 'fail'],
    ['too many materials', (j) => { j.materials = Array.from({ length: 12 }, (_, i) => ({ name: `m${i}` })); return j; }, (r) => r.rule === 'materials' && r.level === 'fail'],
  ];
  let ok = true;
  for (const [name, fn, hit, wantNoFail] of cases) {
    const results = check(inspect(fn(clone()), buf.length), rec, sha);
    const good = wantNoFail ? !results.some((r) => r.level === 'fail') : results.some(hit);
    console.log(`${good ? 'PASS' : 'FAIL'} mutation: ${name}`);
    if (!good) ok = false;
  }
  // File integrity: a changed hash must fail.
  const bad = check(inspect(clone(), buf.length), rec, '0'.repeat(64));
  const caught = bad.some((r) => r.rule === 'integrity' && r.level === 'fail');
  console.log(`${caught ? 'PASS' : 'FAIL'} mutation: file bytes changed (SHA-256 mismatch)`);
  if (!caught) ok = false;
  // Rights: an uncleared model must never read as plain "pass".
  const rights = check(inspect(clone(), buf.length), rec, sha).find((r) => r.rule === 'rights');
  const rightsOk = rights && rights.level === 'warn';
  console.log(`${rightsOk ? 'PASS' : 'FAIL'} rule: uncleared rights are flagged, never silently passed`);
  if (!rightsOk) ok = false;
  return ok;
}

const ok = process.argv.includes('--mutate') ? mutate() : run();
process.exit(ok ? 0 : 1);
