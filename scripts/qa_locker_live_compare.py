#!/usr/bin/env python3
"""Read-only LIVE-production vs candidate Locker visual comparison.

Unlike earlier QA that inspected only a local branch and matched CSS strings,
this opens the real public deployment with a fresh browser context, captures
its rendered cards/panels and compares with the unmerged source candidate.
"""
import http.server,threading,json,pathlib,urllib.request,datetime
from playwright.sync_api import sync_playwright

LIVE='https://sprites.happydude.ca/'
CANDIDATE='http://127.0.0.1:8798/'
OUT=pathlib.Path('qa-screenshots/live-compare')
OUT.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',8798),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
def capture(browser,label,url,width,height):
    context=browser.new_context(viewport={'width':width,'height':height},
       device_scale_factor=1,service_workers='block')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url+'?audit='+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S'),wait_until='domcontentloaded',timeout=45000)
    page.locator('button[data-tab="locker"]').click()
    page.locator('#lockerView .lockerVaultSummary').wait_for(timeout=30000)
    page.wait_for_timeout(600)
    desc=page.evaluate("""() => {
      const root=document.querySelector('#lockerView');
      const summary=root.querySelector('.lockerVaultSummary');
      const ring=summary.querySelector('.vaultProgressCircle');
      const frame=root.querySelector('.vaultPhase2Feature');
      const background=root.querySelector('.vaultPhase2Background');
      const gallery=root.querySelector('.vaultGridViewport');
      const layout=root.querySelector('.vaultPhase2Layout');
      const cs=e=>getComputedStyle(e);
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
      return {version:APP_VERSION,
       baseCards:root.querySelectorAll('.lockerBaseCard').length,
       summary:{box:rect(summary),image:cs(summary).backgroundImage,
         border:cs(summary).borderWidth,panelBackground:cs(summary).backgroundColor,
         connecting:cs(summary,'::before').backgroundImage,
         corner:cs(summary,'::after').backgroundImage},
       ring:rect(ring),
       feature:{box:rect(frame),border:cs(frame).borderWidth,shadow:cs(frame).boxShadow,
         image:cs(frame).backgroundImage},
       backgrounds:{box:rect(background),separate:!frame.contains(background),
         border:cs(background).borderWidth,image:cs(background).backgroundImage},
       gallery:{box:rect(gallery),border:cs(gallery).borderWidth,
         shadow:cs(gallery).boxShadow,background:cs(gallery).backgroundImage},
       layout:{border:cs(layout).borderWidth,background:cs(layout).backgroundImage},
       horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
    }""")
    page.locator('#lockerView .lockerVaultSummary').screenshot(path=str(OUT/f'{label}-summary-{width}.png'))
    page.screenshot(path=str(OUT/f'{label}-top-{width}.png'))
    page.locator('#lockerView .vaultPhase2Feature').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/f'{label}-feature-{width}.png'))
    page.locator('#lockerView .vaultPhase2Background').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/f'{label}-background-{width}.png'))
    desc['browserErrors']=errors
    print('LIVE_COMPARE',label,width,json.dumps(desc,sort_keys=True),flush=True)
    context.close()
    return desc
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    rows={}
    for width,height in [(390,844),(1440,900)]:
       rows[f'live_{width}']=capture(browser,'published_v2061',LIVE,width,height)
       rows[f'candidate_{width}']=capture(browser,'unmerged_candidate_v2062',CANDIDATE,width,height)
    browser.close()
server.shutdown()
(OUT/'visual-audit.json').write_text(json.dumps(rows,indent=2))
for width in (390,1440):
    actual=rows[f'live_{width}']; candidate=rows[f'candidate_{width}']
    assert actual['version']=='2.0.61',(width,'Unexpected live baseline; re-audit before merge',actual['version'])
    assert candidate['version']=='2.0.62',(width,'Candidate version mismatch',candidate['version'])
    assert candidate['baseCards']==actual['baseCards']==67
    assert candidate['horizontalOverflow']<=1,(width,'horizontal overflow')
    assert candidate['backgrounds']['separate'] and candidate['feature']['border']=='0px'
    assert 'locker-summary-panel-frame.png' in candidate['summary']['image']
    assert 'linear-gradient' in candidate['summary']['connecting']
    assert 'locker-summary-panel-frame.png' in candidate['summary']['corner']
    assert candidate['gallery']['shadow']=='none'
    assert not candidate['browserErrors'],(width,candidate['browserErrors'])
print('PASS: live public v2.0.61 compared with v2.0.62 candidate at 390/1440; geometry and source images checked',flush=True)
