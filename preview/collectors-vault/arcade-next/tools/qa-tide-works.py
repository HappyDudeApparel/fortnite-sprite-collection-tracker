"""Browser QA for the Tide Works preview room (Sprite Arcade Next, staging only).

Test A  Water Sprite, real Aqua Lance bolts: the FILL inlet raises the tide step by step, the dock rises, the
        player rides it, the DRAIN valve lowers it again, and gated platforms/hazards switch with the level.
Test B  Earth Sprite (cannot fill), a small input bot: opens the DRAIN valve with a real power, then walks the dry
        bed and tunnel to the Collection Tube. This is the end-to-end proof for the drain route.
The two original-game checks: World 1 level 1 still loads and plays in this build, and the preview's save key
is separate from the real game's.
"""
import os, sys, threading, http.server, functools, json
from playwright.sync_api import sync_playwright

ROOT = os.environ.get('SERVE_ROOT', '.')
BASE = '/preview/collectors-vault/arcade-next/2d/'
CHROME = os.environ.get('CHROMIUM_PATH')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(port):
    handler = functools.partial(Quiet, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def start(browser, sprite, level, size=None):
    ctx = browser.new_context(viewport=size or {'width': 1100, 'height': 640})
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(f'http://127.0.0.1:8897{BASE}?autostart={sprite}&level={level}', wait_until='load', timeout=60000)
    page.wait_for_function("typeof mode!=='undefined'&&mode==='game'&&game", timeout=60000)
    return ctx, page, errs


def state(page):
    return page.evaluate("""() => ({
      tide: game.fields && game.fields.levels.a,
      surface: game.fields && Math.round(game.fields.surface.a),
      bed: game.platforms.find(p => p.when && p.when.max === 0).active,
      spikes: game.hazards[0].active !== false,
      dockY: Math.round(game.platforms.find(p => p.float).y),
      px: Math.round(game.player.x), py: Math.round(game.player.y), hp: game.player.hp,
    })""")


def press(page, key, ms=60):
    page.keyboard.down(key); page.wait_for_timeout(ms); page.keyboard.up(key)


def face(page, key):
    press(page, key, 80)


def fire(page):
    press(page, 'KeyX', 60)


def main():
    serve(8897)
    ok = True
    def check(cond, msg):
        nonlocal ok
        print(('PASS ' if cond else 'FAIL ') + msg, flush=True)
        if not cond:
            ok = False
    with sync_playwright() as p:
        kw = {'headless': True, 'args': ['--no-sandbox']}
        if CHROME:
            kw['executable_path'] = CHROME
        browser = p.chromium.launch(**kw)

        # ---------------- Test A: Water Sprite --------------------------------------------------------
        ctx, page, errs = start(browser, 'water', 6)
        check(page.evaluate("game.level.id") == 'tide-works-demo', 'level 6 is the Tide Works room')
        s = state(page)
        check(s['tide'] == 1 and not s['bed'] and not s['spikes'] and s['dockY'] == 470, f'start state: tide 1, bed hidden, spikes hidden, dock flush with the bank {s}')
        page.evaluate("game.player.invuln = 1e6")
        page.evaluate("game.player.x = 300; game.player.y = 410; game.player.vy = 0")
        face(page, 'ArrowRight')
        page.evaluate("game.player.x = 300")
        fire(page); page.wait_for_timeout(900)
        check(state(page)['tide'] == 2, 'one Aqua Lance volley at the inlet raises the tide to 2 (three bolts count once)')
        page.wait_for_timeout(700); fire(page); page.wait_for_timeout(900)
        s = state(page)
        check(s['tide'] == 3, 'second volley raises the tide to 3')
        page.wait_for_timeout(2600)
        s = state(page)
        check(s['surface'] == 380 and s['dockY'] == 380, f'water surface and dock settle at y=380 {s}')
        # ride the dock
        page.evaluate("const d = game.platforms.find(p => p.float); game.player.x = d.x + 60; game.player.y = d.y - 25; game.player.vy = 0")
        page.wait_for_timeout(300)
        check(page.evaluate("game.player.standing && game.player.standing.float ? true : false"), 'player stands on the floating dock')
        page.screenshot(path='preview/collectors-vault/arcade-next/qa-tide-flooded.png')
        # drain: face left from the bank and shoot the valve
        page.evaluate("game.player.x = 220; game.player.y = 410; game.player.vy = 0")
        face(page, 'ArrowLeft')
        page.evaluate("game.player.x = 220")
        for _ in range(3):
            fire(page); page.wait_for_timeout(1000)
        s = state(page)
        check(s['tide'] == 0 and s['bed'] and s['spikes'], f'three valve hits drain the basin; the dry bed and spikes appear {s}')
        page.wait_for_timeout(2200)
        s = state(page)
        check(s['surface'] == 535 and s['dockY'] == 511, f'water settles on the bed and the dock rests on it {s}')
        page.screenshot(path='preview/collectors-vault/arcade-next/qa-tide-drained.png')
        check(not errs, f'no page errors {errs[:3]}')
        ctx.close()

        # ---------------- Test B: Earth Sprite, drain route end to end ------------------------------
        ctx, page, errs = start(browser, 'earth', 6)
        check(state(page)['tide'] == 1, 'earth Sprite starts at tide 1')
        # try to fill: Earth's power must NOT raise the tide
        face(page, 'ArrowRight'); page.evaluate("game.player.x = 300")
        fire(page); page.wait_for_timeout(1200)
        check(state(page)['tide'] == 1, 'Earth power cannot fill the inlet (only Water/Fishy can)')
        # drain with a real power
        page.evaluate("game.player.x = 220; game.player.y = 410; game.player.vy = 0")
        face(page, 'ArrowLeft'); page.evaluate("game.player.x = 220")
        page.wait_for_timeout(500)
        for _ in range(3):
            fire(page); page.wait_for_timeout(800)
            if state(page)['tide'] == 0:
                break
        check(state(page)['tide'] == 0, 'Earth power opens the drain valve')
        page.wait_for_timeout(2000)
        # input bot: run right, jump when blocked or when a spike is just ahead
        page.evaluate("""() => {
          window.__bot = setInterval(() => {
            const p = game.player; input.right = true; input.left = false;
            const spikeAhead = game.hazards.some(h => h.active !== false && h.x - p.x > 0 && h.x - p.x < 95 && Math.abs(h.y - p.y) < 90);
            const blocked = p.grounded && Math.abs(p.vx) < 25;
            if ((p.grounded && (spikeAhead || blocked))) { input.jumpPressed = true; input.jumpHeld = true; }
            else if (p.vy < -60) input.jumpHeld = true; else input.jumpHeld = false;
          }, 16);
        }""")
        done = False
        for _ in range(120):
            page.wait_for_timeout(250)
            if page.evaluate("!!game.finish"):
                done = True
                break
        page.evaluate("clearInterval(window.__bot); input.right = false")
        s = state(page)
        check(done, f'Earth Sprite reaches the Collection Tube through the drained tunnel {s}')
        check(page.evaluate("game.fields.levels.a") == 0, 'tide stayed drained for the whole run')
        check(not errs, f'no page errors {errs[:3]}')
        ctx.close()

        # ---------------- Test C: World 1 untouched + separate save --------------------------------
        ctx, page, errs = start(browser, 'water', 1)
        check(page.evaluate("game.level.id") == 'sunflower-run' and page.evaluate("game.fields") is None, 'level 1 loads with no field system')
        check(page.evaluate("typeof PROGRESS_KEY!=='undefined' && PROGRESS_KEY") == 'spriteArcade.next.2d.progress.v1', 'preview save key is separate from the real game')
        start_x = page.evaluate("game.player.x")
        page.keyboard.down('ArrowRight'); page.wait_for_timeout(500); page.keyboard.up('ArrowRight')
        check(page.evaluate("game.player.x") > start_x + 20, 'level 1 still plays')
        check(not errs, f'no page errors {errs[:3]}')
        ctx.close()
        browser.close()
    sys.exit(0 if ok else 1)


main()
