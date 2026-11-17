#!/usr/bin/env python3
"""Sprite Collection Locker v2.0.64 non-destructive source QA."""
from pathlib import Path
import json
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text(encoding="utf-8")
pattern = r'const SPRITES=(\[.*?\]);\s*const BACKGROUNDS='
match = re.search(pattern, html, re.S)
assert match, "inline SPRITES JSON missing"
records = json.loads(match.group(1))
assert len(records) == 340
assert len({r["id"] for r in records}) == 340
by_id = {r["id"]: r for r in records}

def collectible(r):
    return (r.get("releaseState") == "released" and r.get("countsTowardCollection", True) is not False
            and not r.get("preview", False) and r.get("status") != "Vaulted"
            and r.get("family") not in ("Dash", "Superman"))

def c(season):
    return sum(collectible(r) for r in records if r.get("season") == season)

assert (c("C7S3"), c("C7S4"), c("C7S5")) == (117, 162, 59)
assert sum(map(c, ("C7S3", "C7S4", "C7S5"))) == 338
c7 = [r for r in records if r.get("season") == "C7S5"]
assert len(c7) == 59 and all(collectible(r) for r in c7)
assert len({r["family"] for r in c7 if collectible(r)}) == 17
assert len([r for r in c7 if r["variantKey"] == "Gold"]) == 14
assert all(collectible(r) and not r["preview"] for r in c7 if r["variantKey"] == "Gold")
assert len([r for r in c7 if r["family"] == "Sir Oscar the Second"]) == 4
assert all(collectible(r) for r in c7 if r["family"] == "Sir Oscar the Second")
assert collectible(by_id[527]) and by_id[527]["family"] == "Kelper"
assert by_id[544]["secretRare"] and collectible(by_id[544])
assert [by_id[i]["variantKey"] for i in (538, 539, 540, 541, 542, 543, 544)] == ["Base", "Fortune", "Cursed", "Base", "Fortune", "Cursed", "Base"]
for i in range(538, 562):
    r = by_id[i]
    img = root / r["image"]
    assert img.is_file(), str(img)
    b = img.read_bytes()
    assert len(b) > 5000 and b[:4] == b"RIFF" and b[8:12] == b"WEBP", str(img)
    assert r["artworkSourcePage"].startswith("https://fortnite.gg/sprites/")
    print("PORTRAIT VERIFIED", i, img.relative_to(root), len(b))

for r in records:
    if r.get("season") == "C7S5" and collectible(r):
        assert r["image"] and (root / r["image"]).is_file(), (r["id"], r["image"])
    if r["id"] >= 538:
        assert r["variantKey"] in ("Base","Fortune","Cursed","Gold")
for token in ("function isSecretHidden(s)", "c7s5SecretCell", "isSecretHidden(s))continue", "59 released portraits", "const APP_VERSION='2.0.64'"):
    assert token in html, token
for key in ("sprite-mobile-v33-selected", "sprite-mobile-v33-levels", "sprite-mobile-v33-favorites", "sprite-mobile-v33-bg", "scl-clean-view-mode"):
    assert key in html, key

with tempfile.TemporaryDirectory() as tmp:
    scripts = re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>', html, re.I)
    for idx, (attrs, script) in enumerate(scripts):
        if "src=" in attrs or not script.strip():
            continue
        js_path = Path(tmp) / f"scl-inline-{idx}.js"
        js_path.write_text(script, encoding="utf-8")
        subprocess.run(["node", "--check", str(js_path)], check=True)
    print("INLINE JS SYNTAX PASS", len(scripts), "tags examined")

try:
    old = subprocess.check_output(["git","show","origin/main:index.html"], cwd=root, text=True)
except subprocess.CalledProcessError:
    old = ""
if old:
    o = re.search(pattern, old, re.S)
    assert o, "base roster missing"
    original = json.loads(o.group(1))
    orig_map = {r["id"]: r for r in original}
    assert len(original) == 316
    for r in original:
        candidate = by_id.get(r["id"])
        assert candidate, f"lost ID {r['id']}"
        if r["id"] == 527:
            assert {k:v for k,v in candidate.items() if k not in ("releaseState","status","preview","countsTowardCollection")} == {k:v for k,v in r.items() if k not in ("releaseState","status","preview","countsTowardCollection")}
        else:
            assert candidate == r, f"altered original {r['id']}"
    print("ALL ORIGINAL RECORDS PRESERVED; only Cursed Kelper release metadata changed")

version = json.loads((root/"version.json").read_text())
assets = json.loads((root/"asset-manifest.json").read_text())
pwa = json.loads((root/"manifest.webmanifest").read_text())
sw = (root/"service-worker.js").read_text()
assert version["version"] == assets["version"] == "2.0.64"
assert version["artwork"]["localC7S5PortraitCount"] == 59
assert pwa["start_url"] == "./index.html?v=2.0.64"
assert "sprites-tracker-${APP_VERSION}" in sw or "const APP_VERSION = '2.0.64'" in sw
assert len(set(assets["assets"])) == len(assets["assets"])
for i in range(538, 562):
    assert by_id[i]["image"] in assets["assets"]
print("PASS C7S5 v2.0.64 QA — 59 season, 338 combined, archives unchanged")
