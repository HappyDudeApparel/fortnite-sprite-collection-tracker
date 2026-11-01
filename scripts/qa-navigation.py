#!/usr/bin/env python3
"""Exercise shared collection navigation and verify its responsive hit targets.

Run with Python Playwright and Chromium installed:
  CHROMIUM_PATH=/usr/bin/chromium python scripts/qa-navigation.py --output /tmp/navigation-qa
Use --base-url to validate an existing local server or the deployed app.
"""
import argparse
import functools
import http.server
import json
import hashlib
import re
import os
from pathlib import Path
import shutil
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = ((320, 640, 'small'), (360, 800, 'phone'), (390, 844, 'portrait'), (844, 390, 'landscape'),
             (768, 1024, 'tablet'), (1024, 768, 'tablet-landscape'), (1440, 900, 'desktop'))
ORDER = ['C7S3', 'C7S4', 'C7S5', 'Locker']


def preserved_sources():
    html = (ROOT / 'index.html').read_text()
    core = max(re.findall(r'<script[^>]*>([\s\S]*?)</script>', html), key=len)
    core = re.sub(r"const APP_VERSION='[^']+'", "const APP_VERSION='<release>'", core)
    assert hashlib.sha256(core.encode()).hexdigest() == '9fa290c7a17fd3f190a5aa7542e9a2a9666b5c3ec793a0b42bf3fffac5f05797', 'Collection, storage, background or export core changed'
    from PIL import Image
    canonical = ['505c05734453dd299488','b0ed851efd06db1bc414','f3c4f6b56045e47ff41a',
                 'e520a67f91ba05c20d7b','051f5b32fe99053ef8fd','f5ea396dcc4c63cee5ae',
                 '958aa09e5fe1b4a1cc9f','920c203ef000da39b332']
    for stem in canonical:
        path = ROOT / f'assets/embedded/{stem}.webp'
        assert hashlib.sha256(path.read_bytes()).hexdigest().startswith(stem)
        with Image.open(path) as im:
            assert im.mode == 'RGBA' and im.getextrema()[3][0] == 0, ('Canonical transparency lost',path)
    provenance = json.loads((ROOT / 'assets/ui/seasons/provenance.json').read_text())
    assert provenance['sources']['runners']['sha256'] == 'b18e317f9dd7e4cf08eb4ed0a11af0fe1322413557a5d95970ef40051d41d221'
    assert provenance['sources']['override']['sha256'] == '7654ab6d4f5971b529c50978a0c5bb96277b969c26008a99bd018049ca5061bc'
    for path, item in provenance['derivatives'].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == item['sha256']
    print('PASS: frozen production application core, exact canonical RGBA portraits and approved scenery provenance',flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def loaded(page):
    page.wait_for_selector('#familyRows .familyRow')
    page.evaluate('''async () => {
      await document.fonts.ready;
      await document.querySelector('.brand-logo').decode();
      const image = document.querySelector('.c7s5Artwork[data-art-theme="' + document.body.dataset.c7s5Theme + '"] img');
      if (image) await image.decode();
    }''')


def geometry(page):
    return page.evaluate('''() => {
      const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const rect = e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
      const nav = document.querySelector('.tabs');
      const tabs = [...nav.querySelectorAll('.tab')].map(e => {
        const r = e.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {name:e.dataset.season || 'Locker',label:e.innerText.trim(),box:rect(e),visible:visible(e),hit:!!hit && (hit===e || e.contains(hit)),active:e.classList.contains('active'),current:e.getAttribute('aria-current')};
      });
      const lanes = [...document.querySelectorAll('.topbar > .brand,.topbar > .search,.topbar > .top-actions,.topbar > .tabs,.topbar > .playGamesBtn')].filter(visible).map(e=>({name:e.className,box:rect(e)}));
      const overlaps = [];
      for (let i=0;i<lanes.length;i++) for (let j=i+1;j<lanes.length;j++) {
        const a=lanes[i].box,b=lanes[j].box;
        if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1) overlaps.push([lanes[i].name,lanes[j].name]);
      }
      return {viewport:innerWidth,bodyWidth:document.documentElement.scrollWidth,header:rect(document.querySelector('.topbar')),nav:rect(nav),navClient:nav.clientWidth,navScroll:nav.scrollWidth,tabs,lanes,overlaps};
    }''')


def assert_geometry(page, label):
    result = geometry(page)
    assert [t['name'] for t in result['tabs']] == ORDER, (label, 'Navigation order', result)
    assert result['bodyWidth'] <= result['viewport'], (label, 'Page overflow', result)
    assert result['navScroll'] <= result['navClient'] + 1, (label, 'Navigation clips a button', result)
    assert not result['overlaps'], (label, 'Header lanes overlap', result)
    for tab in result['tabs']:
        r = tab['box']
        assert tab['visible'] and tab['hit'], (label, 'Button is hidden or obscured', tab)
        assert r['width'] >= 44 and r['height'] >= 44, (label, 'Button hit target too small', tab)
        assert r['x'] >= -0.5 and r['right'] <= result['viewport'] + 0.5, (label, 'Button outside viewport', tab)
        assert r['y'] >= -0.5 and r['bottom'] <= result['header']['bottom'] + 0.5, (label, 'Button outside header', tab)
    return result


def browser_checks(base_url, output):
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),
                                    headless=True, args=['--no-sandbox'])
        try:
            for width, height, name in VIEWPORTS:
                page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce', service_workers='block')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base_url, wait_until='domcontentloaded')
                loaded(page)
                assert page.locator('.topbar .tabs').count() == 1
                assert page.locator('#brandHome').count() == 1
                assert page.locator('#editGamertag').count() == 1
                assert page.locator('#installBtn').count() == 1
                assert page.locator('.topbar a[href="/games/"]:visible').count() == 1
                assert page.evaluate('SPRITES.length') == 314
                initial_collection = page.evaluate('''()=>({favorites:[...favorites],levels:{...levels},bg:bgIndex})''')
                checks = {}
                for season, count in [('C7S3',117), ('C7S4',162), ('C7S5',33)]:
                    page.locator(f'.tabs .tab[data-season="{season}"]').click()
                    assert page.evaluate('currentSeason') == season
                    assert page.evaluate('activeTab') == 'main'
                    assert page.evaluate('countable().length') == count
                    assert page.locator(f'.tabs .tab.active[data-season="{season}"]').count() == 1
                    assert page.evaluate('(s)=>document.body.classList.contains("season-"+s.toLowerCase())', season)
                    if season in ('C7S3','C7S4'):
                        hero = page.locator('.archiveRunners' if season == 'C7S3' else '.archiveOverride')
                        assert hero.is_visible()
                        hero.locator('img').evaluate_all('async els=>Promise.all(els.map(i=>i.decode()))')
                        assert page.locator('#mainLegend .legendItem').count() == (8 if season == 'C7S3' else 7)
                        assert page.locator('#mainLegend .v-Fortune').count() == 0
                        assert page.locator('#mainLegend .v-Cursed').count() == 0
                    else:
                        assert not page.locator('.archiveRunners').is_visible()
                        assert not page.locator('.archiveOverride').is_visible()
                    checks[season] = assert_geometry(page, f'{name}/{season}')
                    page.evaluate('document.fonts.ready')
                    page.screenshot(path=str(output / f'{name}-{season}.png'))
                    # Open a real detail view, then use its native return control.
                    page.locator('#familyRows .familyHero').first.click()
                    assert page.locator('#detailView').is_visible()
                    assert page.evaluate('currentSeason') == season
                    assert_geometry(page, f'{name}/{season}/detail')
                    assert page.locator(f'.tab[data-season="{season}"]').get_attribute('aria-current') == 'page'
                    page.locator('#backDetail').click()
                    assert page.evaluate('activeTab') == 'main'
                    assert page.evaluate('currentSeason') == season
                # Theme changes must not hide or displace the shared navigation.
                for theme in ('map','sea','tavern'):
                    for _ in range(3):
                        if page.evaluate('document.body.dataset.c7s5Theme') == theme:
                            break
                        page.locator('#c7s5ThemeToggle').click()
                    assert page.evaluate('document.body.dataset.c7s5Theme') == theme
                    checks['theme-'+theme] = assert_geometry(page, f'{name}/{theme}')
                page.locator('#searchInput').fill('Chester')
                assert page.locator('#familyRows .familyRow').count() == 1
                page.locator('#clearSearch').click()
                assert page.locator('#familyRows .familyRow').count() == 11
                page.locator('.tabs .tab[data-tab="locker"]').click()
                assert page.locator('#lockerView').is_visible()
                assert page.locator('#lockerBaseGrid .lockerBaseCard').count() == 65
                assert page.locator('.tabs .tab.active[data-tab="locker"]').count() == 1
                checks['Locker'] = assert_geometry(page, f'{name}/Locker')
                page.screenshot(path=str(output / f'{name}-Locker.png'))
                # Existing edit-name utility still opens its original dialog.
                page.locator('#editGamertag').click()
                assert page.locator('#exportOverlay').is_visible()
                page.locator('#closeExport').click()
                # Brand is still a home button and the season controls retain keyboard behavior.
                page.locator('#brandHome').click()
                assert page.evaluate('activeTab') == 'main'
                assert page.evaluate('currentSeason') == 'C7S5'
                page.locator('.tabs .tab[data-season="C7S4"]').focus()
                page.locator('.tabs .tab[data-season="C7S4"]').press('Enter')
                assert page.evaluate('currentSeason') == 'C7S4'
                assert page.evaluate('countable().length') == 162
                assert page.evaluate('''()=>({favorites:[...favorites],levels:{...levels},bg:bgIndex})''') == initial_collection, 'Navigation changed collection/mastery/background state'
                # New season styling must also preserve actual independent edits, not just empty state.
                ids = {}
                for season in ('C7S3','C7S4','C7S5'):
                    page.locator(f'.tab[data-season="{season}"]').click()
                    assert page.evaluate('countable().filter(isAcquired).length') == 0
                    cell = page.locator('#familyRows .spriteCell[data-variant="Base"]').first
                    sid = cell.get_attribute('data-small'); ids[season] = sid
                    cell.click()
                    page.locator(f'[data-level-id="{sid}"][data-level="5"]').click()
                    assert page.evaluate('(id)=>isMastered(byId(id))',sid)
                    assert page.locator('.sumTile[data-mode="found"] .sumNum').inner_text() == '1'
                page.reload(wait_until='domcontentloaded');loaded(page)
                assert page.evaluate('currentSeason') == 'C7S5', 'C7S5 must remain the opening season'
                for season, sid in ids.items():
                    page.locator(f'.tab[data-season="{season}"]').click()
                    assert page.evaluate('(id)=>isMastered(byId(id))',sid)
                    assert page.evaluate('countable().filter(isAcquired).length') == 1
                    assert page.locator('.sumTile[data-mode="mastered"] .sumNum').inner_text() == '1'
                assert not errors, errors
                report[name] = {'viewport':[width,height], 'checks':checks, 'javascript_errors':errors}
                print(f'PASS {name}: all four navigation controls fit; seasons/detail/Locker/search/utility/keyboard behavior; no collection changes', flush=True)
                page.close()
        finally:
            browser.close()
    (output / 'navigation-results.json').write_text(json.dumps(report, indent=2))


def main():
    preserved_sources()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--output', type=Path, default=Path('/tmp/navigation-qa'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    server = None
    try:
        base_url = args.base_url
        if not base_url:
            server = http.server.ThreadingHTTPServer(('127.0.0.1',0), functools.partial(QuietHandler, directory=str(ROOT)))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            base_url = f'http://127.0.0.1:{server.server_port}/'
        browser_checks(base_url, args.output)
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
