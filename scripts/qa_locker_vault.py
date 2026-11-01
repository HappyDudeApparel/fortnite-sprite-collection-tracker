#!/usr/bin/env python3
"""Browser QA of approved Locker vault. No user storage or roster writes."""
import pathlib,threading,http.server,time,json
from playwright.sync_api import sync_playwright
server=http.server.ThreadingHTTPServer(('127.0.0.1',8799),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
pathlib.Path('qa-screenshots').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(args=['--no-sandbox'])
 for width,height in [(320,760),(360,800),(390,844),(768,1024),(1024,768),(1440,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda err: errors.append(str(err)))
  page.goto('http://127.0.0.1:8799/',wait_until='domcontentloaded',timeout=45000)
  page.locator('button[data-tab="locker"]').click()
  page.wait_for_selector('#lockerView.active .lockerVaultHero',timeout=22000)
  page.locator('#lockerBaseGrid .lockerBaseCard').first.wait_for()
  count=page.locator('#lockerBaseGrid .lockerBaseCard').count()
  actual=page.evaluate('lockerFamilyEntries().length')
  assert count==actual and count>=60,(width,count,actual)
  assert page.locator('#lockerView .lockerVaultSummary').count()==1
  assert page.locator('#lockerView .lockerFeatureStage canvas').count()>=1
  assert page.locator('#lockerView #lockerBackgroundGrid .lockerBgCard').count()>4
  assert page.locator('#lockerView .lockerBaseGrid').evaluate('(e)=>getComputedStyle(e).overflowY')!='hidden'
  assert page.evaluate('document.documentElement.scrollHeight')>page.evaluate('innerHeight')+150
  assert page.locator('#lockerView .lockerBaseCard').last.is_visible()
  assert page.locator('#lockerView .lockerBaseCard img').first.evaluate('(e)=>e.naturalWidth>0')
  nums=page.evaluate("""() => ({
    displayed: document.querySelector('#vaultOwned').textContent.trim(),
    actualOwned: lockerFamilyEntries().filter(e=>isAcquired(e.sprite)).length,
    familyCount: lockerFamilyEntries().length,
    title: document.querySelector('#lockerView .lockerBrandBlock h1').textContent,
    theme:getComputedStyle(document.querySelector('#lockerView .lockerBaseCard')).borderColor,
    lastScroll:document.querySelector('#lockerBaseGrid .lockerBaseCard:last-child').getBoundingClientRect().top,
  })""")
  assert nums['displayed']==f"{nums['actualOwned']} / {nums['familyCount']}",nums
  page.screenshot(path=f'qa-screenshots/locker-top-{width}.png')
  last=page.locator('#lockerBaseGrid .lockerBaseCard').last
  last.scroll_into_view_if_needed()
  assert last.is_visible()
  page.screenshot(path=f'qa-screenshots/locker-last-{width}.png')
  name=last.locator('span').inner_text().strip()
  assert name
  # Search and filter are generated live without reducing collection source.
  q=page.locator('#vaultLockerSearch')
  q.fill('WATER')
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()>=1
  q.fill('NONEXISTENT-LOCKER-FAMILY')
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==0
  q.fill('')
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==actual
  page.locator('#vaultListButton').click()
  assert 'vaultListMode' in page.locator('#lockerBaseGrid').get_attribute('class')
  page.locator('#vaultGridButton').click()
  page.locator('#lockerBaseGrid .lockerBaseCard').last.click()
  page.wait_for_timeout(800)
  # Any selected Sprite must still have its native variant and feature controls.
  assert page.locator('#lockerVariantGrid .lockerVariantCard').count()>=1
  assert page.locator('#lockerFeatureStage').is_visible()
  page.locator('#lockerFeatureStage').scroll_into_view_if_needed()
  page.screenshot(path=f'qa-screenshots/locker-feature-{width}.png')
  bg=page.locator('#lockerBackgroundGrid .lockerBgCard')
  bg.last.click()
  assert bg.last.get_attribute('aria-current')=='true'
  page.locator('#lockerShareBtn').click()
  assert 'open' in page.locator('#exportOverlay').get_attribute('class')
  page.locator('#closeExport').click()
  assert 'open' not in page.locator('#exportOverlay').get_attribute('class')
  page.locator('button[data-season="C7S5"]').click()
  assert page.evaluate('currentSeason')=='C7S5'
  page.locator('button[data-tab="locker"]').click()
  assert page.locator('#lockerView .lockerVaultHero').count()==1
  assert not errors,(width,errors[:5])
  print('PASS LOCKER',width,'base=',actual,'selected=',name,'liveowned=',nums['actualOwned'],flush=True)
  page.close()
 browser.close()
server.shutdown()
