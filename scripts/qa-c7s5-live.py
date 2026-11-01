#!/usr/bin/env python3
"""Verify publication bytes and smoke-test the deployed C7S5 themes.

The HTTPS client uses Python's default certificate verification. For local testing:
  python scripts/qa-c7s5-live.py --base-url http://127.0.0.1:8000/ --output /tmp/live-qa
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import time
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
THEMES = ('map', 'sea', 'tavern')
ASSETS = [
    'assets/ui/c7s5-premium.css',
    'assets/ui/c7s5-atmosphere.js',
    'assets/ui/c7s5-grain.svg',
    'assets/ui/fonts/cinzel-latin-600-normal.woff2',
    'assets/ui/fonts/cormorant-garamond-latin-700-italic.woff2',
] + [f'assets/ui/c7s5-{theme}-{shape}.webp' for theme in THEMES for shape in ('wide', 'mobile')]


def fetch(base_url, path, version, deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError('Publication verification deadline reached')
    url = base_url + path + f'?release-qa={version}&nonce={time.time_ns()}'
    request = urllib.request.Request(url, headers={
        'User-Agent': 'Sprite Collection Locker release QA',
        'Cache-Control': 'no-cache',
    })
    with urllib.request.urlopen(request, timeout=min(15, remaining)) as response:
        assert response.status == 200, (path, response.status)
        return response.read()


def wait_for_publication(base_url, version, timeout):
    expected = {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in ASSETS}
    deadline = time.monotonic() + timeout
    last_error = 'No response received'
    while time.monotonic() < deadline:
        try:
            metadata = json.loads(fetch(base_url, 'version.json', version, deadline))
            assert metadata.get('version') == version, f"Version is {metadata.get('version')}, expected {version}"
            html = fetch(base_url, 'index.html', version, deadline).decode('utf-8')
            assert f"const APP_VERSION='{version}'" in html, 'Live HTML has the wrong APP_VERSION'
            for path, expected_hash in expected.items():
                actual = hashlib.sha256(fetch(base_url, path, version, deadline)).hexdigest()
                assert actual == expected_hash, f'Published asset differs: {path}'
            print(f'PASS publication: {version}, matching HTML version and all {len(expected)} artwork/font/CSS/JS asset hashes', flush=True)
            return expected
        except Exception as error:
            last_error = f'{type(error).__name__}: {error}'
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            print(f'Waiting for Pages publication: {last_error}', flush=True)
            time.sleep(min(10, remaining))
    raise RuntimeError(f'Publication did not verify within {timeout}s: {last_error}')


def browser_smoke(base_url, version, output):
    report = {}
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
        try:
            for width, height, name in [(390, 844, 'portrait'), (1440, 900, 'desktop')]:
                page = browser.new_page(viewport={'width': width, 'height': height},
                                        reduced_motion='reduce', service_workers='block')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                response = page.goto(base_url + f'index.html?release-qa={version}', wait_until='domcontentloaded', timeout=60000)
                assert response and response.ok, 'Live app request failed'
                page.wait_for_selector('.familyRow[data-family="Chester"]', timeout=45000)
                assert page.evaluate('APP_VERSION') == version
                assert page.evaluate('currentSeason') == 'C7S5'
                assert page.evaluate('countable().length') == 33
                assert page.locator('.familyRow').count() == 11
                assert page.locator('#mainLegend .legendItem').count() == 4
                initial_progress = page.evaluate('''()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='scl_c7s5_theme_v1'))''')
                for theme in THEMES:
                    for _ in range(3):
                        if page.evaluate('document.body.dataset.c7s5Theme') == theme:
                            break
                        page.locator('#c7s5ThemeToggle').click()
                    assert page.evaluate('document.body.dataset.c7s5Theme') == theme
                    artwork = page.locator(f'.c7s5Artwork[data-art-theme="{theme}"]')
                    artwork.locator('img').evaluate('(i)=>i.decode()')
                    assert artwork.locator('img').evaluate('(i)=>i.complete && i.naturalWidth>0')
                    assert f'c7s5-{theme}-' in artwork.locator('img').evaluate('(i)=>i.currentSrc')
                    assert artwork.evaluate('(e)=>getComputedStyle(e).opacity') == '1'
                    assert page.locator('.c7s5Banner h1').is_visible()
                    assert page.locator('#mainLegend .legendFamily').is_visible()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Page overflows horizontally'
                    assert page.evaluate('''()=>getComputedStyle(document.querySelector('#mainLegend')).gridTemplateColumns===getComputedStyle(document.querySelector('.familyRow')).gridTemplateColumns''')
                    assert page.evaluate('''()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='scl_c7s5_theme_v1'))''') == initial_progress
                    page.evaluate('document.fonts.ready')
                    page.screenshot(path=str(output / f'live-{name}-{theme}.png'))
                assert not errors, errors
                report[name] = {'themes': list(THEMES), 'sprites': 33, 'families': 11, 'columns': 4, 'javascript_errors': errors}
                print(f'PASS live browser: {name}, all three themes, responsive grid, local art, no JavaScript errors', flush=True)
                page.close()
        finally:
            browser.close()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='https://sprites.happydude.ca/')
    parser.add_argument('--output', type=Path, default=Path('/tmp/c7s5-premium-qa'))
    parser.add_argument('--timeout', type=int, default=180, help='Maximum publication polling duration in seconds')
    args = parser.parse_args()
    assert args.timeout > 0
    args.output.mkdir(parents=True, exist_ok=True)
    base_url = args.base_url.rstrip('/') + '/'
    version = json.loads((ROOT / 'version.json').read_text())['version']
    hashes = wait_for_publication(base_url, version, args.timeout)
    checks = browser_smoke(base_url, version, args.output)
    (args.output / 'live-results.json').write_text(json.dumps({'version': version, 'base_url': base_url, 'asset_sha256': hashes, 'browser_checks': checks}, indent=2))


if __name__ == '__main__':
    main()
