"""Browser QA for the Sprite Character Viewer (Sprite Arcade Next, staging only)."""
import os, sys, threading, http.server, functools, io, hashlib, json
from playwright.sync_api import sync_playwright
try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = os.environ.get('SERVE_ROOT', '.')
CHROME = os.environ.get('CHROMIUM_PATH')
BASE = 'http://127.0.0.1:8898/preview/collectors-vault/arcade-next/3d-viewer/'
EXPECT = {'citrus': (13460, 'warn'), 'ghost': (1000, 'pass'), 'yeti': (1292, 'pass'), 'stump': (1368, 'pass'), 'cthulhu': (1576, 'pass'), 'alien': (1720, 'pass')}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def shot(page):
    return page.locator('#view').screenshot()


def spread(png):
    """Number of distinct colours in a coarse sample: a blank canvas has very few."""
    if Image is None:
        return 999
    im = Image.open(io.BytesIO(png)).convert('RGB').resize((64, 64))
    return len(set(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()))


def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8898), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    ok = True

    def check(cond, msg):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + msg, flush=True)
        if not cond:
            ok = False
    with sync_playwright() as p:
        kw = {'headless': True, 'args': ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}
        if CHROME:
            kw['executable_path'] = CHROME
        browser = p.chromium.launch(**kw)
        registry = json.load(open(os.path.join(ROOT, 'preview/collectors-vault/arcade-next/3d-viewer/registry.json')))
        sha = {c['id']: c['provenance']['sha256'] for c in registry['characters']}
        ctx = browser.new_context(viewport={'width': 1200, 'height': 760})
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        for cid, (tris, want) in EXPECT.items():
            page.goto(BASE + f'?char={cid}', wait_until='load', timeout=60000)
            page.wait_for_function('window.VIEWER && VIEWER.ready', timeout=60000)
            page.wait_for_timeout(400)
            got = page.evaluate('({t: VIEWER.stats.triangles, v: document.querySelector(".badge").className, sha: VIEWER.sha})')
            check(got['t'] == tris and want in got['v'] and got['sha'] == sha[cid], f'{cid}: {got["t"]} tris, verdict {want}, SHA-256 matches the registry')
            check(spread(shot(page)) > 40, f'{cid}: the 3D view is drawn (not blank)')
        # views
        page.goto(BASE + '?char=citrus', wait_until='load'); page.wait_for_function('VIEWER.ready'); page.wait_for_timeout(500)
        shots = {}
        for v in ['front', 'side', 'back', 'top']:
            page.click(f'button[data-view="{v}"]'); page.wait_for_timeout(250)
            shots[v] = hashlib.md5(shot(page)).hexdigest()
        check(len(set(shots.values())) == 4, 'front, side, back and top views are all different images')
        # animation
        page.select_option('#clipSel', 'Walk'); page.click('#view'); page.wait_for_timeout(200)
        t1 = page.evaluate('VIEWER.getAction().time'); page.wait_for_timeout(400); t2 = page.evaluate('VIEWER.getAction().time')
        check(t2 != t1, 'the selected clip plays')
        page.click('#play'); page.wait_for_timeout(100)
        page.evaluate("const s=document.getElementById('scrub'); s.value=500; s.dispatchEvent(new Event('input'))")
        half = page.evaluate('VIEWER.getAction().time / VIEWER.getAction().getClip().duration')
        check(0.45 < half < 0.55, f'the scrubber seeks to mid-clip ({half:.2f})')
        # toggles
        page.click('#wire'); page.wait_for_timeout(200)
        check(page.evaluate('VIEWER.model.children.length') > 0 and page.evaluate("document.getElementById('wire').getAttribute('aria-pressed')") == 'true', 'wireframe toggles')
        page.click('#wire'); page.click('#skel'); page.wait_for_timeout(200); page.click('#skel')
        # game look
        base_img = hashlib.md5(shot(page)).hexdigest()
        page.click('#look'); page.wait_for_timeout(1500)
        check(page.evaluate("document.getElementById('look').getAttribute('aria-pressed')") == 'true', 'Game look applies the 3D game styling to Citrus')
        check(hashlib.md5(shot(page)).hexdigest() != base_img, 'Game look changes the rendered model')
        # reference art: Dash shows his own Legacy-tab art by default; the box can show any other Locker sprite
        page.goto(BASE + '?char=citrus', wait_until='load'); page.wait_for_function('VIEWER.ready'); page.wait_for_timeout(800)
        ref = page.evaluate("({d: document.getElementById('refPane').style.display, n: document.getElementById('refImg').naturalWidth, t: document.getElementById('refName').textContent, v: document.getElementById('charSel').selectedOptions[0].textContent})")
        check(ref['d'] == 'block' and ref['n'] > 50 and 'Dash Sprite' in ref['t'] and ref['t'].startswith('#127'), f'Dash shows his own reference art (Locker Legacy tab #127) {ref["t"]}')
        check(ref['v'].startswith('Dash'), f'the character is listed as Dash ({ref["v"]})')
        page.goto(BASE + '?char=ghost&ref=29', wait_until='load'); page.wait_for_function('VIEWER.ready'); page.wait_for_timeout(600)
        check('Ghost Sprite' in page.evaluate("document.getElementById('refName').textContent"), 'any catalogue sprite can be shown as the reference (Art ref #)')
        # turntable
        page.goto(BASE + '?char=ghost&turn=1', wait_until='load'); page.wait_for_function('VIEWER.ready')
        a = page.evaluate('VIEWER.orbit.theta'); page.wait_for_timeout(500); b = page.evaluate('VIEWER.orbit.theta')
        check(b > a, 'turntable rotates the camera')
        check(not errs, f'no page errors {errs[:3]}')
        ctx.close()
        # phone
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
        page = ctx.new_page(); perr = []
        page.on('pageerror', lambda e: perr.append(str(e)))
        page.goto(BASE + '?char=yeti', wait_until='load'); page.wait_for_function('VIEWER.ready')
        page.wait_for_timeout(500)
        dims = page.evaluate('({w: document.documentElement.scrollWidth, iw: innerWidth, h: document.getElementById("view").getBoundingClientRect().height})')
        check(dims['w'] <= dims['iw'] + 1 and dims['h'] > 200, f'phone layout has no sideways scroll and a usable view {dims}')
        page.screenshot(path='preview/collectors-vault/arcade-next/qa-viewer-phone.png')
        check(not perr, f'no page errors on phone {perr[:3]}')
        ctx.close()
        ctx = browser.new_context(viewport={'width': 1200, 'height': 760}); page = ctx.new_page()
        page.goto(BASE + '?char=citrus&view=three', wait_until='load'); page.wait_for_function('VIEWER.ready'); page.wait_for_timeout(900)
        page.screenshot(path='preview/collectors-vault/arcade-next/qa-viewer-desktop.png')
        ctx.close(); browser.close()
    sys.exit(0 if ok else 1)


main()
