#!/usr/bin/env python3
"""Check real C7S5 atmosphere timelines, motion controls and responsive lighting.

Uses installed Playwright + Chromium. Starts an isolated local server by default.
No source, application data, release metadata or deployment state is modified.
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
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = ((320,640,'small'),(360,800,'phone'),(390,844,'portrait'),(844,390,'landscape'),(768,1024,'tablet'),(1024,768,'tablet-landscape'),(1440,900,'desktop'))
# Exact production v2.0.51 bubble definitions. Changes to map/tavern must preserve the sea effect.
BUBBLE_RULE_HASHES = {
    '.c7s5Bubbles{': '2a7d0a942eb62a4034aaa310943c1e5a07059bc69c7b4a6d7f8dd2dc3eac03b8',
    'body[data-c7s5-theme=sea] .c7s5Bubbles{': '36cf43b813e508509228c942f111d2475a05b7d5ce61e68acf4f363134752208',
    '.c7s5Bubbles i{': '7ef1f6d5161f6bf1d25ec77f3cd67c9ada0ce84de60b15c81024ce65b5b0f891',
    '@keyframes s5-bubble{': '586ca754aba1b72aba9a6ff1366709a67501fb4e9d15b6c99c23e439e440293d',
}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def css_rule(source, selector):
    start = source.index(selector)
    opening = source.index('{', start)
    depth, end = 1, opening + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


def set_theme(page, theme):
    for _ in range(3):
        if page.evaluate('document.body.dataset.c7s5Theme') == theme:
            return
        page.locator('#c7s5ThemeToggle').click()
    raise AssertionError('Theme cycling failed')


def settle(page):
    page.evaluate('''async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.c7s5Artwork img')].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}''')
    page.wait_for_timeout(100)


def sample_route(page, fraction):
    return page.evaluate('''async f=>{
      const a=document.querySelector('.c7s5Atmosphere').getAnimations({subtree:true});
      for(const item of a.filter(a=>['s5-route','s5-x'].includes(a.animationName))){item.pause();item.currentTime=item.effect.getTiming().duration*f;}
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return {fraction:f,offset:parseFloat(getComputedStyle(document.querySelector('.s5RouteDraw')).strokeDashoffset),xOpacity:parseFloat(getComputedStyle(document.querySelector('.s5TreasureX')).opacity),stroke:getComputedStyle(document.querySelector('.s5RouteDots')).stroke,dashes:getComputedStyle(document.querySelector('.s5RouteDots')).strokeDasharray,xStroke:getComputedStyle(document.querySelector('.s5TreasureX path')).stroke};
    }''', fraction)


def active_animations(page):
    return page.evaluate('''()=>document.querySelector('.c7s5Atmosphere').getAnimations({subtree:true}).map(a=>({name:a.animationName,time:a.currentTime,state:a.playState}))''')


def assert_frozen(before, after):
    assert [a['name'] for a in before] == [a['name'] for a in after]
    for a, b in zip(before, after):
        assert abs((a['time'] or 0) - (b['time'] or 0)) < 1, (a, b)
        assert b['state'] == 'paused', b


def lighting_positions(page):
    # Measure the rendered object-fit image and glow centers rather than trusting stored CSS variables.
    return page.evaluate('''()=>{
      const img=document.querySelector('[data-art-theme="tavern"] img'),r=img.getBoundingClientRect(),s=getComputedStyle(img);
      const scale=Math.max(r.width/img.naturalWidth,r.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
      const [px,py]=s.objectPosition.split(' ').map(v=>parseFloat(v)/100);
      const origin={x:r.left+(r.width-w)*px,y:r.top+(r.height-h)*py};
      return Object.fromEntries([['lantern','.c7s5LanternGlow',.15,.29],['chest','.c7s5ChestGlow',.88,.64]].map(([name,selector,x,y])=>{
        const e=document.querySelector(selector),b=e.getBoundingClientRect();
        return [name,{expected:[origin.x+w*x,origin.y+h*y],actual:[b.left+b.width/2,b.top+b.height/2],size:[b.width,b.height],opacity:parseFloat(getComputedStyle(e).opacity),display:getComputedStyle(e).display}];
      }));
    }''')


def check_lighting(positions):
    for name, item in positions.items():
        assert item['display'] != 'none' and min(item['size']) > 0, (name, item)
        assert all(abs(a - e) <= 1 for a,e in zip(item['actual'], item['expected'])), (name, item)
        assert 0 < item['opacity'] <= 1, (name, item)


def run(base_url, output):
    css = (ROOT/'assets/ui/c7s5-premium.css').read_text()
    for selector, expected in BUBBLE_RULE_HASHES.items():
        assert hashlib.sha256(css_rule(css, selector).encode()).hexdigest() == expected, ('Sea bubbles changed', selector)
    print('PASS static: exact production sea bubble CSS/keyframes preserved', flush=True)
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
        try:
            for width,height,name in VIEWPORTS:
                page=browser.new_page(viewport={'width':width,'height':height},service_workers='block')
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base_url,wait_until='domcontentloaded')
                page.wait_for_selector('.familyRow[data-family="Chester"]')
                settle(page)
                collection=page.evaluate('''()=>({favorites:[...favorites],levels:{...levels},bg:bgIndex})''')
                set_theme(page,'map')
                page.locator('.c7s5Banner').scroll_into_view_if_needed()
                page.wait_for_function('!document.body.classList.contains("s5-atmosphere-offscreen")')
                geometry=page.evaluate('''()=>{
                  const path=document.querySelector('.s5RouteDots'),svg=document.querySelector('.c7s5Route');
                  const copy=document.querySelector('.c7s5BannerCopy').getBoundingClientRect(),notice=document.querySelector('.c7s5Notice').getBoundingClientRect();
                  const blockers=[copy,notice];const hit=(p,r,pad)=>p.x>=r.left-pad&&p.x<=r.right+pad&&p.y>=r.top-pad&&p.y<=r.bottom+pad;
                  const m=path.getScreenCTM(),length=path.getTotalLength(),collisions=[];
                  for(let i=0;i<=300;i++){const p=path.getPointAtLength(length*i/300).matrixTransform(m);if(blockers.some(r=>hit(p,r,2)))collisions.push({x:p.x,y:p.y});}
                  const x=document.querySelector('.s5TreasureX path').getBoundingClientRect();
                  const intersects=(a,b)=>a.left-2<b.right&&a.right+2>b.left&&a.top-2<b.bottom&&a.bottom+2>b.top;
                  return {route:svg.getBoundingClientRect().toJSON(),copy:copy.toJSON(),notice:notice.toJSON(),pathCollisions:collisions,xCollides:blockers.some(r=>intersects(x,r))};
                }''')
                assert not geometry['pathCollisions'], ('Painted route overlaps live text',name,geometry)
                assert not geometry['xCollides'], ('Treasure X overlaps live text',name,geometry)
                samples=[]
                assert page.locator('.s5RouteDraw').evaluate('(e)=>e.getAnimations()[0].effect.getTiming().iterations')==1, 'Route must settle rather than loop'
                for fraction,tag in [(0,'start'),(.36,'partial'),(.639,'before-complete'),(.64,'complete-hidden'),(.74,'revealed'),(1.5,'settled')]:
                    sample=sample_route(page,fraction);samples.append(sample)
                    assert sample['stroke']=='rgb(0, 0, 0)',sample
                    assert [float(v.strip().removesuffix('px')) for v in sample['dashes'].split(',')]==[6,9],sample
                    assert sample['xStroke']=='rgb(178, 46, 37)',sample
                    if fraction <= .64:assert sample['xOpacity'] <= .001, ('X appeared before completion',name,sample)
                    if fraction == 0:assert sample['offset'] >= .999,sample
                    if fraction == .36:assert .1 < sample['offset'] < .9,sample
                    if fraction >= .64:assert abs(sample['offset']) <= .001,sample
                    if fraction >= .74:assert sample['xOpacity'] >= .999,sample
                    if tag!='before-complete':page.locator('.c7s5Banner').screenshot(path=str(output/f'{name}-map-{tag}.png'))
                # Timeline inspection uses explicit WAAPI pause overrides. A fresh load
                # restores native CSS ownership before testing the real pause control.
                page.reload(wait_until='domcontentloaded');settle(page)
                page.locator('.c7s5Banner').scroll_into_view_if_needed()
                page.wait_for_function('!document.body.classList.contains("s5-atmosphere-offscreen")')
                # Real pause control persists its own setting and freezes the animation clock.
                page.locator('#c7s5MotionToggle').click()
                page.wait_for_timeout(50)
                assert page.locator('#c7s5MotionToggle').get_attribute('aria-pressed')=='true'
                before=active_animations(page);page.wait_for_timeout(200);assert_frozen(before,active_animations(page))
                page.reload(wait_until='domcontentloaded');settle(page)
                assert page.locator('#c7s5MotionToggle').get_attribute('aria-pressed')=='true'
                page.locator('#c7s5MotionToggle').click()
                page.wait_for_timeout(50)
                assert any(a['state']=='running' for a in active_animations(page))
                set_theme(page,'sea');settle(page)
                bubbles=page.locator('.c7s5Bubbles i')
                assert bubbles.count()==8
                bubble_styles=bubbles.evaluate_all('''els=>els.map(e=>{const s=getComputedStyle(e);return {index:e.style.getPropertyValue('--i'),name:s.animationName,duration:s.animationDuration,delay:s.animationDelay,width:s.width,border:s.borderTopColor}})''')
                for i,item in enumerate(bubble_styles):
                    assert item['index']==str(i) and item['name']=='s5-bubble',item
                    assert abs(float(item['duration'].removesuffix('s'))-(12+i*1.8))<.01,item
                    assert float(item['delay'].removesuffix('s')) == i*-3,item
                    assert float(item['width'].removesuffix('px')) == 3+i,item
                page.locator('.c7s5Banner').screenshot(path=str(output/f'{name}-sea.png'))
                set_theme(page,'tavern');settle(page)
                positions=lighting_positions(page);check_lighting(positions)
                # Resize within the same page exercises the actual ResizeObserver, not just initial setup.
                page.set_viewport_size({'width':width+37,'height':height+19});settle(page)
                resized=lighting_positions(page);check_lighting(resized)
                page.set_viewport_size({'width':width,'height':height});settle(page)
                page.locator('.c7s5Banner').screenshot(path=str(output/f'{name}-tavern.png'))
                # Offscreen, alternate app views and hidden documents stop all atmosphere animation clocks.
                page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)')
                page.wait_for_function('document.body.classList.contains("s5-atmosphere-offscreen")')
                page.wait_for_timeout(50);before=active_animations(page);page.wait_for_timeout(200);assert_frozen(before,active_animations(page))
                page.locator('.c7s5Banner').scroll_into_view_if_needed()
                page.wait_for_function('!document.body.classList.contains("s5-atmosphere-offscreen")')
                page.locator('.tab[data-tab="locker"]').click()
                page.wait_for_function('document.body.classList.contains("s5-atmosphere-offscreen")')
                assert all(a['state']=='paused' for a in active_animations(page))
                page.locator('.tab[data-season="C7S5"]').click();settle(page)
                page.evaluate('''()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))}''')
                assert page.evaluate('document.body.classList.contains("s5-atmosphere-offscreen")')
                assert all(a['state']=='paused' for a in active_animations(page))
                page.evaluate('''()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))}''')
                page.emulate_media(reduced_motion='reduce')
                for theme in ['map','sea','tavern']:
                    set_theme(page,theme);settle(page)
                    assert not active_animations(page), ('Reduced motion retained animation',theme)
                set_theme(page,'map')
                assert page.locator('.s5TreasureX').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
                assert page.locator('.s5RouteDraw').evaluate('(e)=>parseFloat(getComputedStyle(e).strokeDashoffset)')==0
                assert not page.locator('#c7s5MotionToggle').is_visible()
                assert page.evaluate('''()=>({favorites:[...favorites],levels:{...levels},bg:bgIndex})''')==collection
                assert not errors,errors
                report[name]={'route_geometry':geometry,'route_timeline':samples,'bubbles':bubble_styles,'lighting':positions,'resized_lighting':resized,'pause_reload_offscreen_hidden_reduce':True,'javascript_errors':errors}
                print('PASS',name,'black dashed route; X hidden until complete; original8bubbles; resize lighting; pause/reload/offscreen/hidden/reduced motion; collection unchanged',flush=True)
                page.close()
        finally:browser.close()
    (output/'atmosphere-results.json').write_text(json.dumps(report,indent=2))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url')
    parser.add_argument('--output',type=Path,default=Path('/tmp/c7s5-atmosphere-qa'))
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    server=None
    try:
        url=args.base_url
        if not url:
            server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
            threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/'
        run(url,args.output)
    finally:
        if server:server.shutdown()


if __name__=='__main__':
    try:
        main()
    except Exception:
        # Surface useful geometry/timing evidence in the public Actions annotation,
        # where a failed step's full log may require a separate GitHub web login.
        if os.environ.get('GITHUB_ACTIONS') == 'true':
            import traceback
            message = traceback.format_exc()[-10000:]
            message = message.replace('%','%25').replace('\r','%0D').replace('\n','%0A')
            print('::error title=Atmosphere verification::' + message, flush=True)
        raise
