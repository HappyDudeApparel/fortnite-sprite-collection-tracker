"""Browser QA: the 3D game is fair at landings. Staging arcade only."""
import os, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright

ROOT = os.environ.get('SERVE_ROOT', '.')
CHROME = os.environ.get('CHROMIUM_PATH')
BASE = 'http://127.0.0.1:8896/preview/collectors-vault/arcade/3d/'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8896), functools.partial(Quiet, directory=ROOT))
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
        for level in (1, 2, 3):
            ctx = browser.new_context(viewport={'width': 1000, 'height': 640}); page = ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(BASE + f'?autostart=1&level={level}&q=2&nointro=1', wait_until='load', timeout=60000)
            page.wait_for_function("window.ARENA&&ARENA.mode==='play'&&ARENA.enemies.length>0", timeout=120000)
            info = page.evaluate("""async () => {
              const { LEVELS } = await import('./js/levels.js');
              const L = LEVELS[ARENA.levelIndex];
              return { name: L.name, enemies: L.enemies.map(e => ({ isl: e.isl, type: e.type })), islands: L.islands.map(q => ({ x: q.x, y: q.y, z: q.z, w: q.w, d: q.d, arrive: q.arrive })) };
            }""")
            check(page.evaluate("document.title") != '' and info['name'], f'level {level} ({info["name"]}) loads with {len(info["enemies"])} monsters')
            # Stand in the landing pocket of every monster island for a while: nothing may touch the player.
            hits0 = page.evaluate("ARENA.stats.hits")
            seen = set()
            for e in info['enemies']:
                if e['isl'] in seen:
                    continue
                seen.add(e['isl'])
                q = info['islands'][e['isl']]
                a = q['arrive']
                along = q['w'] if a[0] != 0 else q['d']
                # 1.2 wu in from the landing edge
                px = q['x'] - a[0] * (along - 1.2) if a[0] != 0 else q['x']
                pz = q['z'] - a[1] * (along - 1.2) if a[1] != 0 else q['z']
                page.evaluate("([x,y,z]) => { const s = ARENA.sim; s.x = x; s.y = y + 0.05; s.z = z; s.vx = s.vy = s.vz = 0; s.grounded = false; ARENA.player.invuln = 0; }", [px, q['y'], pz])
                page.wait_for_timeout(3600)  # monsters notice after ~1.1 s, then chase for 2.5 s
            hits = page.evaluate("ARENA.stats.hits") - hits0
            check(hits == 0, f'level {level}: standing in the landing pocket of {len(seen)} monster island(s) for ~{len(seen)*3.6:.0f} s causes 0 hits (got {hits})')
            # Knockback never carries the player off the island: hit the player at the rim from the island's middle.
            worst = 0
            for idx in sorted(seen):
                q = info['islands'][idx]
                for corner in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
                    px, pz = q['x'] + corner[0] * (q['w'] - 0.8), q['z'] + corner[1] * (q['d'] - 0.8)
                    page.evaluate("([x,y,z]) => { const s = ARENA.sim; s.x = x; s.y = y + 0.05; s.z = z; s.vx = s.vy = s.vz = 0; s.grounded = false; ARENA.player.invuln = 0; ARENA.player.hp = 3; }", [px, q['y'], pz])
                    page.wait_for_timeout(250)
                    # the hit comes from the side that would push the player straight off the rim
                    page.evaluate("([x,z]) => ARENA.hurt(x, z)", [px + corner[0] * -1.5, pz + corner[1] * -1.5])
                    page.wait_for_timeout(1100)
                    on = page.evaluate("([i]) => { const s = ARENA.sim; return s.y > -5 }", [0])
                    st = page.evaluate("({x: ARENA.sim.x, y: ARENA.sim.y, z: ARENA.sim.z})")
                    inside = abs(st['x'] - q['x']) <= q['w'] + 0.2 and abs(st['z'] - q['z']) <= q['d'] + 0.2 and st['y'] > q['y'] - 0.5
                    worst += 0 if (inside and on) else 1
            check(worst == 0, f'level {level}: knockback from every rim corner of the monster islands keeps the player on the island ({worst} escapes)')
            check(not errs, f'level {level}: no page errors {errs[:3]}')
            ctx.close()
        # Dash is the character's name
        ctx = browser.new_context(viewport={'width': 1000, 'height': 640}); page = ctx.new_page()
        page.goto(BASE, wait_until='load', timeout=60000)
        page.wait_for_timeout(2500)
        txt = page.evaluate("document.body.innerText")
        check('Dash' in txt and 'Citrus' not in txt, 'the 3D game calls the character Dash')
        ctx.close(); browser.close()
    sys.exit(0 if ok else 1)


main()
