"""Draw a schematic overview of each 2D level (platforms, props, hazards, pads, gems, enemies, checkpoints, tube).
Usage: python level-map.py <levels.js> <out-dir> [more levels.js files to load first]
Design aid only; not part of CI."""
import json, subprocess, sys, os
from PIL import Image, ImageDraw

levels_js, out = sys.argv[1], sys.argv[2]
extra = sys.argv[3:]
js = "const L=require(%s);%s console.log(JSON.stringify(L));" % (json.dumps(os.path.abspath(levels_js)), ''.join("require(%s);" % json.dumps(os.path.abspath(e)) for e in extra))
levels = json.loads(subprocess.check_output(['node', '-e', js]))
os.makedirs(out, exist_ok=True)
S = 0.34  # px per world px
for i, lv in enumerate(levels):
    W = int(lv['worldW'] * S) + 20; H = int(540 * S) + 40
    im = Image.new('RGB', (W, H), (14, 28, 44)); d = ImageDraw.Draw(im)
    X = lambda x: 10 + x * S
    Y = lambda y: 20 + y * S
    for p in lv['platforms']:
        col = (150, 110, 60) if p['type'].endswith('ground') else (120, 180, 220)
        if p.get('mover'): col = (240, 200, 70)
        if p.get('crumble'): col = (230, 140, 80)
        if p.get('slick'): col = (170, 230, 255)
        d.rectangle([X(p['x']), Y(p['y']), X(p['x'] + p['w']), Y(p['y'] + p['h'])], fill=col)
    for o in lv['objects']:
        col = (160, 90, 50) if o['type'] == 'brick' else (120, 120, 120) if o['type'] == 'boulder' else (120, 90, 220)
        if o['type'] == 'device': col = (60, 200, 220)
        d.rectangle([X(o['x']), Y(o['y']), X(o['x'] + o['w']), Y(o['y'] + o['h'])], fill=col)
    for h in lv['hazards']:
        d.rectangle([X(h['x']), Y(h['y']), X(h['x'] + h['w']), Y(h['y'] + h['h'])], fill=(230, 60, 60) if h['type'] != 'lava' else (255, 120, 30))
    for pd in lv['pads']:
        d.rectangle([X(pd['x']), Y(pd['y']), X(pd['x'] + pd['w']), Y(pd['y'] + pd['h'])], fill=(80, 255, 120))
    for g in lv['gems']:
        d.ellipse([X(g['x']) - 2, Y(g['y']) - 2, X(g['x']) + 2, Y(g['y']) + 2], fill=(255, 235, 90))
    for e in lv['enemies']:
        d.line([X(e['min']), Y(e['y'] + 55), X(e['max']), Y(e['y'] + 55)], fill=(255, 90, 200), width=2)
        d.ellipse([X(e['x']) - 4, Y(e['y']) - 4, X(e['x']) + 4, Y(e['y']) + 4], fill=(255, 90, 200))
    for c in lv['checkpoints']:
        d.line([X(c['x']), Y(c['y']), X(c['x']), Y(c['y'] + 58)], fill=(120, 255, 255), width=2)
    t = lv['tube']; d.rectangle([X(t['x'] - 30), Y(t['y']), X(t['x'] + 30), Y(t['y'] + 105)], outline=(255, 255, 255))
    d.rectangle([X(lv['spawn']['x']) - 3, Y(lv['spawn']['y']) - 3, X(lv['spawn']['x']) + 3, Y(lv['spawn']['y']) + 3], fill=(0, 255, 0))
    d.text((12, 4), f"{i+1} {lv['name']}  w={lv['worldW']}  gems={len(lv['gems'])} enemies={len(lv['enemies'])} objects={len(lv['objects'])} hazards={len(lv['hazards'])} pads={len(lv['pads'])}", fill=(255, 255, 255))
    im.save(os.path.join(out, f"level{i+1}.png"))
    print(i + 1, lv['name'], im.size)
