#!/usr/bin/env python3
"""Browser QA of approved Locker vault. No user storage or roster writes."""
import pathlib,threading,http.server,time,json
from playwright.sync_api import sync_playwright
server=http.server.ThreadingHTTPServer(('127.0.0.1',8799),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
pathlib.Path('qa-screenshots').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(args=['--no-sandbox'])
 for width,height in [(320,760),(360,800),(390,844),(430,932),(768,1024),(1024,768),(1440,900)]:
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
  viewport=page.locator('#lockerView .vaultGridViewport')
  assert viewport.count()==1
  assert viewport.evaluate('(e)=>getComputedStyle(e).overflowY')=='auto'
  assert viewport.evaluate('(e)=>e.scrollHeight>e.clientHeight+40'), 'All collection rows should scroll'
  assert viewport.evaluate('(e)=>e.clientHeight<=595'), 'Viewport should not show every Sprite at once'
  assert page.locator('#lockerFeatureStage').evaluate("(e)=>!document.querySelector('.vaultGridViewport').contains(e)")
  assert page.locator('#lockerBackgroundGrid').evaluate("(e)=>!document.querySelector('.vaultGridViewport').contains(e)")
  # Featured and background section is a continuation below the whole collection,
  # not a desktop sidebar alongside it.
  assert page.evaluate("""() => {
    const selection=document.querySelector('#lockerView .lockerSelectionColumn').getBoundingClientRect();
    const feature=document.querySelector('#lockerView .lockerFeaturePanel').getBoundingClientRect();
    return feature.top>=selection.bottom-4;
  }"""), 'Featured section must follow the central collection on every viewport'
  assert page.evaluate('document.documentElement.scrollHeight')>page.evaluate('innerHeight')+150
  assert page.locator('#lockerView .lockerBaseCard').last.is_visible()
  assert page.locator('#lockerView .lockerBaseCard img').first.evaluate('(e)=>e.naturalWidth>0')
  overflow_names=page.evaluate("""() => Array.from(document.querySelectorAll('#lockerBaseGrid .lockerBaseCard span'))
      .filter(el => el.scrollWidth > el.clientWidth+2).map(el => el.textContent)""")
  assert not overflow_names, (width,'Sprite names must not overflow',overflow_names)
  nums=page.evaluate("""() => ({
    displayed: document.querySelector('#vaultOwned').textContent.trim(),
    actualOwned: lockerFamilyEntries().filter(e=>isAcquired(e.sprite)).length,
    familyCount: lockerFamilyEntries().length,
    title: document.querySelector('#lockerView .lockerBrandBlock h1').textContent,
    theme:getComputedStyle(document.querySelector('#lockerView .lockerBaseCard')).borderColor,
    lastScroll:document.querySelector('#lockerBaseGrid .lockerBaseCard:last-child').getBoundingClientRect().top,
  })""")
  assert nums['displayed']==f"{nums['actualOwned']} / {nums['familyCount']}",nums
  # Approved art direction is Locker-only. Real nav remains functional;
  # the mobile bar is compact to leave room for the actual scrollable grid.
  if width<=760:
   assert page.locator('#sclHeader>.brand').evaluate('(e)=>getComputedStyle(e).display')=='none', 'Avoid redundant header over the Locker art'
   assert page.locator('#sclHeader>.tabs').is_visible()
   assert page.locator('#sclHeader>.top-actions>.playGamesBtn').is_visible(), 'Games link must remain usable in compact Locker header'
   assert page.locator('#sclHeader>.top-actions').is_visible()
   assert page.evaluate("""() => {
       const nav=document.querySelector('#sclHeader>.tabs');
       const controls=['#installBtn','#editGamertag','#sclHeader .top-actions .playGamesBtn']
         .map(sel=>document.querySelector(sel)).filter(el=>el && getComputedStyle(el).display!=='none');
       const box=nav.getBoundingClientRect();
       return controls.every(el=>{
         const b=el.getBoundingClientRect();
         return b.top>=box.bottom-1 && b.right<=innerWidth+1 && b.left>=-1;
       });
   }"""), 'Mobile nav must not overlap install/edit/games controls or clip them'
  assert page.locator('#lockerView .vaultVitrine').count()==2
  assert page.locator('#lockerView .vaultLaurelPair svg').count()==2
  # Phase 2 must retain live native sections in one vertical reading order.
  assert page.locator('#lockerView[data-vault-phase2="ready"]').count()==1
  assert page.locator('#lockerView .vaultPhase2Layout').count()==1
  assert page.locator('#lockerView .vaultPhase2FeatureBanner').count()==1
  assert page.locator('#lockerView .vaultPhase2BackgroundRail').count()==1
  assert page.locator('#lockerView .vaultPhase2BgArrow').count()==2
  assert page.locator('#lockerView .vaultCompactVariantSection').count()==1
  assert page.evaluate("""() => {
    const root=document.querySelector('#lockerView');
    const frame=root.querySelector('.vaultGridViewport').getBoundingClientRect();
    const footer=root.querySelector('.lockerVaultFooter').getBoundingClientRect();
    const variant=root.querySelector('.vaultCompactVariantSection').getBoundingClientRect();
    const feature=root.querySelector('.vaultPhase2Feature').getBoundingClientRect();
    const bg=root.querySelector('.vaultPhase2Background').getBoundingClientRect();
    return footer.top>=frame.bottom-4 && variant.top>=footer.bottom-4 &&
           feature.top>=variant.bottom-4 && bg.top>=feature.top && bg.bottom<=feature.bottom+2;
  }"""), 'Gallery, collection footer, variants, featured scene and backgrounds must follow the approved vertical order'
  assert page.evaluate("""() => {
    const g=document.querySelector('#lockerVariantGrid');
    return getComputedStyle(g).overflowX==='auto' && g.querySelectorAll('.lockerVariantCard').length>0;
  }"""), 'Every authentic variant stays accessible in its compact horizontal ribbon'

  # The authentic Llama portrait is the only silhouette driving holo art.
  assert page.evaluate("""() => {
    const p=document.querySelector('#lockerView .vaultProjectionSubject');
    const bg=getComputedStyle(p,'::after');
    return p.querySelector('img').naturalWidth>0 &&
           p.style.getPropertyValue('--vault-authentic-llama').includes(p.querySelector('img').getAttribute('src')) &&
           bg.maskImage!=='none' && bg.maskImage.includes(p.querySelector('img').src);
  }"""), 'Real Llama portrait must drive the holographic grid mask'
  if width<=679:
   assert page.evaluate("""() => {
      const items=[...document.querySelectorAll('#lockerView .lockerVaultSummary>:is(.vaultSummaryTitle,.vaultProgressCircle,.vaultSummaryItem)')];
      const rects=items.map(x=>x.getBoundingClientRect());
      return rects.length===4 &&
        rects.every((r,i)=>i===0 || Math.abs((r.top+r.bottom)/2-(rects[0].top+rects[0].bottom)/2)<23) &&
        rects[3].left>rects[2].left+15;
   }"""), 'All four progress elements must share one readable row on phones'

  assert page.evaluate("""() => getComputedStyle(document.querySelector('#lockerView .vaultArchitecture')).backgroundImage.includes(innerWidth>=1200 ? 'locker-hall-wide-approved.webp' : 'locker-hall-mobile-approved.webp')"""), 'Approved high-resolution architectural artwork must load at this viewport'
  art_sources=[
     'locker-hall-mobile-approved.webp','locker-hall-wide-approved.webp',
     'locker-card-approved-cyan.png','locker-card-approved-gold.png',
     'locker-card-approved-violet.png','locker-card-approved-teal.png',
     'locker-summary-panel-frame.png','locker-feature-panel-frame.png',
     'locker-background-panel-frame.png','locker-floor-approved.webp']
  assert page.evaluate("""async paths=>{
     const loaded=await Promise.all(paths.map(path=>new Promise(resolve=>{
       const im=new Image(); im.onload=()=>resolve(im.naturalWidth>0 && im.naturalHeight>0);
       im.onerror=()=>resolve(false);
       im.src='assets/ui/locker-art/'+path;
     })));
     return loaded.every(Boolean);
  }""",art_sources), 'All approved art layers must load as real local images'
  actual_columns=page.evaluate("""() => getComputedStyle(document.querySelector('#lockerView .lockerBaseGrid')).gridTemplateColumns.split(' ').length""")
  expected_columns=6 if width<360 else 8
  assert actual_columns==expected_columns,(width,'gallery column count must match approved compact concept',actual_columns,expected_columns)
  assert page.evaluate("""() => {
    const a=document.querySelector('#lockerView .lockerBaseCard');
    return getComputedStyle(a,'::before').backgroundImage.includes('locker-card-approved-cyan.png');
  }"""), 'Exact-approved transparent ornamental card frames must be active'

  assert page.locator('#lockerView .vaultFeaturedComposition').count()==1
  live_img=page.locator('#lockerView .vaultLiveSprite')
  assert live_img.count()==1
  assert live_img.evaluate('(e)=>e.complete && e.naturalWidth>0'), 'Real featured Sprite art must load'
  assert page.evaluate("""() => {
     const featured=document.querySelector('#lockerView .vaultLiveSprite');
     const sprite=byId(selectedId);
     return featured.getAttribute('src')===sprite.image;
  }"""), 'Featured stage must use canonical selected Sprite portrait'
  assert page.evaluate("""() => {
     const bg=document.querySelector('#lockerView .vaultLiveBackdrop');
     return bg.getAttribute('src')===BACKGROUNDS[bgIndex].file && bg.naturalWidth>0;
  }"""), 'Featured backdrop must use selected official app background'
  page.screenshot(path=f'qa-screenshots/locker-top-{width}.png')
  last=page.locator('#lockerBaseGrid .lockerBaseCard').last
  viewport.evaluate('(e)=>e.scrollTop=0')
  last.scroll_into_view_if_needed()
  assert last.is_visible()
  assert viewport.evaluate('(e)=>e.scrollTop>150'), 'Last Sprite must be reachable within grid frame'
  page.screenshot(path=f'qa-screenshots/locker-last-{width}.png')
  name=last.locator('span').inner_text().strip()
  assert name
  # Search and filter are generated live without reducing collection source.
  q=page.locator('#vaultLockerSearch')
  q.fill('WATER')
  assert viewport.evaluate('(e)=>e.scrollTop')==0
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()>=1
  q.fill('NONEXISTENT-LOCKER-FAMILY')
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==0
  q.fill('')
  assert page.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==actual
  page.locator('#vaultListButton').click()
  assert 'vaultListMode' in page.locator('#lockerBaseGrid').get_attribute('class')
  page.locator('#vaultGridButton').click()
  page.locator('#lockerBaseGrid .lockerBaseCard').last.scroll_into_view_if_needed()
  previous_grid_scroll=viewport.evaluate('(e)=>e.scrollTop')
  page.locator('#lockerBaseGrid .lockerBaseCard').last.click()
  assert viewport.evaluate('(e,previous)=>e.scrollTop>=previous-30', previous_grid_scroll), 'Selecting a Sprite must preserve scroll'
  page.wait_for_timeout(800)
  # Any selected Sprite must still have its native variant and feature controls.
  assert page.locator('#lockerVariantGrid .lockerVariantCard').count()>=1
  assert page.locator('#lockerFeatureStage').is_visible()
  page.locator('#lockerFeatureStage').scroll_into_view_if_needed()
  page.screenshot(path=f'qa-screenshots/locker-feature-{width}.png')
  bg=page.locator('#lockerBackgroundGrid .lockerBgCard')
  # Test the actual carousel controls, not only native background selection.
  carousel=page.locator('#lockerView #lockerBackgroundGrid')
  back=page.locator('#lockerView .vaultPhase2BgArrow[data-direction="-1"]')
  forward=page.locator('#lockerView .vaultPhase2BgArrow[data-direction="1"]')
  assert carousel.evaluate('(e)=>e.scrollWidth>e.clientWidth+60'), 'Backgrounds must not all be displayed at once'
  carousel.evaluate('(e)=>e.scrollLeft=0')
  page.wait_for_timeout(160)
  assert back.is_disabled(), 'Back arrow disables at first background'
  assert not forward.is_disabled(), 'Next arrow moves a real carousel'
  forward.click()
  page.wait_for_timeout(700)
  scroll_advanced=carousel.evaluate('(e)=>e.scrollLeft')
  assert scroll_advanced>25, 'Carousel next arrow must move'
  assert not back.is_disabled()
  bg.last.click()
  assert bg.last.get_attribute('aria-current')=='true'
  assert carousel.evaluate('(e)=>e.scrollLeft')>=scroll_advanced-10, 'Selecting last background must preserve its scroll position'
  assert page.evaluate("""() => document.querySelector('#lockerView .vaultLiveBackdrop').getAttribute('src')===BACKGROUNDS[bgIndex].file"""), 'Selecting last background changes real featured backdrop'
  page.locator('#lockerView .vaultPhase2Background').scroll_into_view_if_needed()
  page.screenshot(path=f'qa-screenshots/locker-backgrounds-{width}.png')
  page.screenshot(path=f'qa-screenshots/locker-full-{width}.png',full_page=True)

  assert page.evaluate("""() => document.querySelector('#lockerView .vaultLiveBackdrop').getAttribute('src')===BACKGROUNDS[bgIndex].file"""), 'Changing background should update live featured stage'
  page.locator('#lockerShareBtn').click()
  assert 'open' in page.locator('#exportOverlay').get_attribute('class')
  page.locator('#closeExport').click()
  assert 'open' not in page.locator('#exportOverlay').get_attribute('class')
  # Pre-existing season pages are still reachable and their proper data active.
  page.locator('button[data-season="C7S3"]').click()
  assert page.evaluate('currentSeason')=='C7S3', 'C7S3 restored navigation'
  page.locator('button[data-season="C7S4"]').click()
  assert page.evaluate('currentSeason')=='C7S4', 'C7S4 restored navigation'
  page.locator('button[data-season="C7S5"]').click()
  assert page.evaluate('currentSeason')=='C7S5'
  page.locator('button[data-tab="locker"]').click()
  assert page.locator('#lockerView .lockerVaultHero').count()==1
  assert not errors,(width,errors[:5])
  print('PASS LOCKER',width,'base=',actual,'selected=',name,'liveowned=',nums['actualOwned'],flush=True)
  page.close()
 browser.close()
server.shutdown()
