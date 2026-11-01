#!/usr/bin/env python3
"""Derive decorative scenery from the supplied approved sources, never Sprite art.

Usage: python scripts/prepare-approved-season-art.py /path/to/extracted-two-part-handoff
Originals are retained outside the checkout. Canonical Sprite files are referenced
directly by the application and are never transformed here.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('handoff', type=Path)
    args = parser.parse_args()
    runners = next(args.handoff.rglob('C7S3-Runners-FINAL-Canonical-Water-Earth-Fire.png'))
    override = next(args.handoff.rglob('C7S4-Override-FINAL-Selected-Concept.png'))
    output = ROOT / 'assets/ui/seasons'
    output.mkdir(parents=True, exist_ok=True)
    sources = {'runners': runners, 'override': override}
    images = {name: Image.open(path).convert('RGB') for name, path in sources.items()}
    report = {'purpose': 'User-approved decorative illustration; no claim of canonical game geography',
              'sources': {name: {'name': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                          for name, path in sources.items()}, 'derivatives': {}}

    def save(name, image, source, boxes):
        path = output / name
        image.save(path, 'WEBP', quality=94, method=6)
        report['derivatives'][str(path.relative_to(ROOT))] = {
            'source': source, 'crop_boxes': boxes, 'size': list(image.size),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    # Both Runners scenery pieces avoid the phone frame, example UI and invented jar Sprite.
    left = (0, 65, 450, 465)
    right = (1222, 65, 1672, 465)
    a, b = images['runners'].crop(left), images['runners'].crop(right)
    overlap = 96
    panorama = Image.new('RGB', (a.width + b.width - overlap, a.height))
    panorama.paste(a, (0, 0))
    mask = Image.new('L', b.size, 255)
    for x in range(overlap):
        mask.paste(round(x / (overlap - 1) * 255), (x, 0, x + 1, b.height))
    panorama.paste(b, (a.width - overlap, 0), mask)
    save('runners-panorama.webp', panorama, 'runners', [left, right])
    for name, box in [('runners-left.webp', (0, 0, 450, 941)),
                      ('runners-right.webp', (1222, 0, 1672, 590))]:
        save(name, images['runners'].crop(box), 'runners', [box])

    # The supplied title is approved illustrative logotype artwork, without stats or controls.
    box = (560, 0, 1668, 296)
    save('override-title.webp', images['override'].crop(box), 'override', [box])
    # Unlabelled environment strips exclude generated character lineups and scene-name plaques.
    boxes = [(1000, 311, 1378, 421), (1000, 448, 1378, 558)]
    stage = Image.new('RGB', (756, 110))
    for i, box in enumerate(boxes):
        stage.paste(images['override'].crop(box), (i * 378, 0))
    save('override-stage.webp', stage, 'override', boxes)
    box = (1334, 0, 1672, 285)
    save('override-rift.webp', images['override'].crop(box), 'override', [box])
    (output / 'provenance.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Prepared', len(report['derivatives']), 'approved scenery derivatives; canonical Sprite files unchanged')


if __name__ == '__main__':
    main()
