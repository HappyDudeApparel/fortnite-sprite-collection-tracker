#!/usr/bin/env python3
"""Release checks for C7S5 art, archived rosters and real collection workflows.
Run from any directory: python scripts/qa-c7s5-premium.py --output /tmp/c7s5-qa
Requires: pip install playwright pillow; playwright install chromium (or CHROMIUM_PATH).
"""
import argparse
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import shutil
import threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
THEMES = ('map', 'sea', 'tavern')
VIEWPORTS = ((320, 640, 'small'), (390, 844, 'portrait'), (844, 390, 'landscape'), (768, 1024, 'tablet'), (1440, 900, 'desktop'))
# Frozen v2.0.50 records: visual work must not change names, IDs, artwork or saved progress semantics.
ROSTER_HASHES = {
    'C7S3': '5c368302ab277cc7ce89af3742d5f479c3959b7d771d86f93ac651c929e243d2',
    'C7S4': '1484e8a334c313e3e0c71be91a2af4976e3776b4bc8454e03aefbeb8325663d4',
    'C7S5': 'e219d002808309d176e2f9b55f61b67329de15de1a7d403594f724f0ec7b55bb',
}
ICON_HASHES = {
    'fortune-charm': '63234520fa2bddc3010a55a91187c00076a96a2f68ae1613254cc6a9b66008b2',
    'cursed-relic': 'a99d0ec221865921bff3c8d36a625ecf035a0bde900e0f77811addb0354d457f',
}


def static_checks():
    html = (ROOT / 'index.html').read_text()
    start = html.index('const SPRITES=') + len('const SPRITES=')
    roster = json.loads(html[start:html.index('];', start) + 1])
    assert len(roster) == len({x['id'] for x in roster}) == 314
    for season, expected in ROSTER_HASHES.items():
        records = [x for x in roster if x['season'] == season]
        digest = hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        assert digest == expected, f'{season} records changed'
    for name, expected in ICON_HASHES.items():
        assert hashlib.sha256((ROOT / f'assets/ui/c7s5-{name}.svg').read_bytes()).hexdigest() == expected
    version = json.loads((ROOT / 'version.json').read_text())['version']
    assert f"const APP_VERSION='{version}'" in html
    assert f"const APP_VERSION = '{version}'" in (ROOT / 'service-worker.js').read_text()
    assert json.loads((ROOT / 'asset-manifest.json').read_text())['version'] == version
    assert json.loads((ROOT / 'manifest.webmanifest').read_text())['start_url'] == './index.html?v=' + version
    assert 'assets/ui/c7s5-premium.css' in html
    css = (ROOT / 'assets/ui/c7s5-premium.css').read_text()
    assert 'prefers-reduced-motion' in css
    for theme in THEMES:
        for shape in ('wide', 'mobile'):
            art = ROOT / f'assets/ui/c7s5-{theme}-{shape}.webp'
            with Image.open(art) as im:
                im.verify()
            with Image.open(art) as im:
                assert im.width >= (1400 if shape == 'wide' else 700), (art, im.size)
    print('PASS static: all 314 records unchanged, approved icons unchanged, artwork decoded, release metadata consistent')
    return version


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def loaded(page):
    page.wait_for_selector('.familyRow[data-family="Chester"]')
    page.evaluate('''async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));
    }''')


def storage_state(page):
    return page.evaluate('''()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='scl_c7s5_theme_v1'))''')


def set_theme(page, theme):
    for _ in range(3):
        if page.evaluate('document.body.dataset.c7s5Theme') == theme:
            return
        page.locator('#c7s5ThemeToggle').click()
    raise AssertionError('Theme cycle did not reach ' + theme)


def geometry(page):
    return page.evaluate('''()=>({
      legend:getComputedStyle(document.querySelector('#mainLegend')).gridTemplateColumns,
      row:getComputedStyle(document.querySelector('.familyRow')).gridTemplateColumns,
      rowHeight:document.querySelector('.familyRow').offsetHeight,
      tableWidth:document.querySelector('#variantTable').clientWidth,
      pageWidth:document.documentElement.scrollWidth,
      viewport:innerWidth,
      minControlWidth:Math.min(...[...document.querySelector('.familyRow').querySelectorAll('.spriteCell')].map(e=>e.getBoundingClientRect().width)),
      allColumnsVisible:[...document.querySelectorAll('#mainLegend .legendItem')].every(e=>{let r=e.getBoundingClientRect(),t=document.querySelector('.variantTable').getBoundingClientRect();return r.left>=t.left&&r.right<=t.right}),
      headerOverlap:(()=>{let a=document.querySelector('.brand').getBoundingClientRect(),b=document.querySelector('.search').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top})()
    })''')


def browser_checks(base_url, output, version):
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
        report = {}
        for width, height, name in VIEWPORTS:
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1,
                                    reduced_motion='reduce', service_workers='block', accept_downloads=True)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base_url, wait_until='domcontentloaded')
            loaded(page)
            assert page.evaluate('currentSeason') == 'C7S5'
            assert page.evaluate('countable().length') == 33
            assert page.locator('.familyRow').count() == 11
            assert page.locator('#mainLegend .legendItem').count() == 4
            assert page.locator('.familyRow .spriteCell').count() == 33
            assert page.locator('.familyRow .c7s5Await').count() == 11
            initial_storage = storage_state(page)
            theme_geometry = []
            for theme in THEMES:
                set_theme(page, theme)
                page.wait_for_timeout(500)
                assert page.locator('.c7s5Banner h1').is_visible(), 'Season title is inaccessible'
                art = page.locator(f'.c7s5Artwork[data-art-theme="{theme}"] img')
                assert art.count() == 1
                art.evaluate('(i)=>i.decode()')
                assert art.evaluate('(i)=>i.naturalWidth>0 && i.complete')
                assert f'c7s5-{theme}-' in art.evaluate('(i)=>i.currentSrc')
                assert page.locator(f'.c7s5Artwork[data-art-theme="{theme}"]').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
                for other in THEMES:
                    if other != theme:
                        assert page.locator(f'.c7s5Artwork[data-art-theme="{other}"]').evaluate('(e)=>getComputedStyle(e).opacity') == '0'
                for variant, suffix in [('Fortune', 'fortune-charm'), ('Cursed', 'cursed-relic')]:
                    assert f'c7s5-{suffix}.svg' in page.locator(f'#mainLegend .v-{variant}').evaluate('(e)=>getComputedStyle(e).backgroundImage')
                dims = geometry(page)
                assert dims['row'] == dims['legend'], (name, theme, dims)
                assert dims['pageWidth'] <= dims['viewport'], (name, 'body overflows', dims)
                assert dims['minControlWidth'] >= 44, (name, 'touch controls too narrow', dims)
                assert dims['allColumnsVisible'], (name, 'a variant column is clipped', dims)
                assert not dims['headerOverlap'], (name, 'brand and search overlap', dims)
                assert page.locator('#mainLegend .legendFamily').is_visible()
                theme_geometry.append(dims)
                assert storage_state(page) == initial_storage, 'A theme changed collection storage'
                page.screenshot(path=str(output / f'{name}-{theme}.png'))
                page.locator('.variantTable').evaluate('(e)=>e.scrollLeft=e.scrollWidth')
                gold = page.locator('#mainLegend .v-Gold').bounding_box()
                assert gold and 0 <= gold['x'] < width, 'Gold column cannot be reached'
                page.locator('.variantTable').evaluate('(e)=>e.scrollLeft=0')
            assert theme_geometry[0] == theme_geometry[1] == theme_geometry[2], 'Theme switch changed layout'
            set_theme(page, 'sea')
            page.reload(wait_until='domcontentloaded')
            loaded(page)
            assert page.evaluate('document.body.dataset.c7s5Theme') == 'sea'
            assert storage_state(page) == initial_storage
            # Collect and master through actual grid controls, then persist through reload and theme changes.
            cell = page.locator('.familyRow[data-family="Chester"] .spriteCell[data-variant="Base"]')
            sprite_id = cell.get_attribute('data-small')
            cell.click()
            assert page.evaluate('(id)=>favorites.has(Number(id))', sprite_id)
            page.locator(f'[data-level-id="{sprite_id}"][data-level="5"]').click()
            assert page.evaluate('(id)=>isMastered(byId(id))', sprite_id)
            set_theme(page, 'tavern')
            page.reload(wait_until='domcontentloaded')
            loaded(page)
            assert page.evaluate('(id)=>isMastered(byId(id))', sprite_id)
            assert page.evaluate('countable().filter(isAcquired).length') == 1
            assert page.locator('[data-mode="mastered"] .sumNum').inner_text() == '1'
            # Search and summary filters keep their existing handlers.
            page.locator('#searchInput').fill('Chester')
            assert page.locator('.familyRow').count() == 1
            page.locator('#clearSearch').click()
            assert page.locator('.familyRow').count() == 11
            page.locator('.sumTile[data-mode="found"]').click()
            assert page.locator('.familyRow').count() == 1
            page.locator('.sumTile[data-mode="all"]').first.click()
            # Detail and Locker remain real app views, independent of overview skins.
            page.locator('.familyRow[data-family="Chester"] .familyHero').click()
            assert page.locator('#detailView').is_visible()
            assert 'chester' in page.locator('#detailName').inner_text().lower()
            page.locator('#variantList [data-variant="Fortune"]').click()
            page.wait_for_function("byId(selectedId).variantKey === 'Fortune'")
            assert page.locator('#sceneStage canvas.featuredCardCanvas').count() == 1
            page.locator('.tab[data-tab="locker"]').click()
            assert page.locator('#lockerView').is_visible()
            assert page.locator('#lockerBaseGrid .lockerBaseCard').count() == 65
            assert page.locator('#lockerVariantGrid .lockerVariantCard').count() == 3
            page.locator('[data-locker-bg="1"]').click()
            assert page.evaluate('bgIndex') == 1
            assert page.locator('[data-locker-bg="1"]').get_attribute('aria-current') == 'true'
            page.locator('#lockerShareBtn').click()
            assert page.locator('#exportOverlay').is_visible()
            page.locator('#exportNameInput').fill('QA Captain')
            page.locator('#exportNameInput').press('Enter')
            page.wait_for_function('''()=>!document.querySelector('#downloadExport').disabled''')
            assert page.locator('#exportCanvas').evaluate('(c)=>c.width===1600 && c.height===1200')
            png = page.evaluate('''async()=>{const b=await canvasBlob();return {size:b.size,type:b.type}}''')
            assert png['type'] == 'image/png' and png['size'] > 10000, png
            with page.expect_download() as download:
                page.locator('#downloadExport').click()
            artifact = output / f'{name}-featured-export.png'
            download.value.save_as(artifact)
            with Image.open(artifact) as im:
                assert im.size == (1600, 1200)
            page.locator('#closeExport').click()
            # Archive rosters, column sets and ownership remain independent.
            for season, count, columns in [('C7S4', 162, 7), ('C7S3', 117, 8)]:
                page.locator(f'button[data-season="{season}"]').click()
                assert page.evaluate('countable().length') == count
                assert page.locator('#mainLegend .legendItem').count() == columns
                assert not page.evaluate('document.body.classList.contains("season-c7s5")')
                assert not page.locator('.c7s5Banner').is_visible()
                assert page.evaluate('countable().filter(isAcquired).length') == 0
                page.screenshot(path=str(output / f'{name}-{season}.png'))
            page.locator('button[data-season="C7S5"]').click()
            assert page.evaluate('(id)=>isMastered(byId(id))', sprite_id)
            assert page.evaluate('bgIndex') == 1
            # Reduced-motion should stop every ambient animation scoped to the premium artwork.
            animations = page.locator('.c7s5Banner').evaluate('''e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>a.animationName)''')
            assert not animations, ('Motion runs despite reduced-motion preference', animations)
            assert not errors, errors
            report[name] = {'themes': 3, 'geometry': theme_geometry[0], 'export': png, 'errors': errors}
            print('PASS', name, '3 themes; 33 sprites / 4 columns; persisted mastery; detail; Locker; background; PNG export; archived seasons; reduced motion')
            page.close()
        # Also check the default motion mode, distinct from reduced-motion screenshot tests.
        page = browser.new_page(viewport={'width':1440,'height':900}, service_workers='block')
        page.goto(base_url, wait_until='domcontentloaded')
        loaded(page)
        report['motion'] = {}
        for theme in THEMES:
            set_theme(page, theme)
            page.wait_for_timeout(500)
            count = page.locator('.c7s5Banner').evaluate("e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length")
            assert count > 0, f'{theme}: expected ambient animation did not run'
            report['motion'][theme] = count
        print('PASS motion: all three themes animate with default preferences')
        browser.close()
    (output / 'results.json').write_text(json.dumps({'version':version, 'checks':report}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/tmp/c7s5-premium-qa'))
    parser.add_argument('--base-url', help='Use an existing server; otherwise start a temporary local server')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    version = static_checks()
    server = None
    try:
        url = args.base_url
        if not url:
            server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            url = f'http://127.0.0.1:{server.server_port}/'
        browser_checks(url, args.output, version)
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
