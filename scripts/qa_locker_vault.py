#!/usr/bin/env python3
"""Browser QA of approved Locker vault. No user storage or roster writes."""
import pathlib,threading,http.server,time,json,base64,io
from PIL import Image
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
  expected_columns=3 if width<=480 else (4 if width<768 else (6 if width<1024 else 8))
  assert actual_columns==expected_columns,(width,'gallery column count must match approved compact concept',actual_columns,expected_columns)
  assert page.evaluate("""() => {
     const root=document.querySelector('#lockerView');
     const panel=root.querySelector('.vaultGallerySection');
     return getComputedStyle(panel,'::before').backgroundImage.includes('locker-gallery-border-polish.svg') &&
            getComputedStyle(root.querySelector('.lockerVaultFooter')).backgroundImage.includes('locker-gallery-plinth-approved.webp');
  }"""), 'Approved ornate gallery surround and real crystal floor must be active'
  if width<=430:
    cardWidth=page.locator('#lockerView .lockerBaseCard').first.evaluate("(e)=>e.getBoundingClientRect().width")
    assert cardWidth>=72, (width,'Phone Sprite artwork must be significantly larger than eight-across layout',cardWidth)
    cardImage=page.locator('#lockerView .lockerBaseCard img').first.evaluate("(e)=>e.getBoundingClientRect().width")
    assert cardImage>=56,(width,'Portrait must fill most of each upgraded card',cardImage)

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
  state=page.evaluate("""() => {
    const grid=document.querySelector('#lockerBackgroundGrid');
    const prev=document.querySelector('.vaultPhase2BgArrow[data-direction="-1"]');
    const next=document.querySelector('.vaultPhase2BgArrow[data-direction="1"]');
    return {left:grid.scrollLeft, max:grid.scrollWidth-grid.clientWidth,prevDisabled:prev.disabled,nextDisabled:next.disabled,html:document.documentElement.clientWidth};
  }""")
  print('BG CAROUSEL INITIAL',width,state,flush=True)
  assert back.is_disabled()==(state['left']<=1), 'Back arrow disabled state must reflect actual scroller position'
  assert not forward.is_disabled(), 'Next arrow moves a real carousel'
  forward.click()
  page.wait_for_timeout(700)
  scroll_advanced=carousel.evaluate('(e)=>e.scrollLeft')
  assert scroll_advanced>25, 'Carousel next arrow must move'
  assert not back.is_disabled()
  bg.last.click()
  assert bg.last.get_attribute('aria-current')=='true'
  assert carousel.evaluate('(e)=>e.scrollLeft')>=scroll_advanced-10, 'Selecting last background must preserve its scroll position'
  assert page.evaluate("""() => {
      const selected=document.querySelector('#lockerBackgroundGrid .lockerBgCard[aria-current="true"]');
      const view=document.querySelector('#lockerBackgroundGrid').getBoundingClientRect();
      const rect=selected.getBoundingClientRect();
      return rect.left>=view.left-3 && rect.right<=view.right+3;
  }"""), 'Actual selected background must remain visible after re-render'
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
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(width,'horizontal page overflow')
  assert not errors,(width,errors[:5])
  print('PASS LOCKER',width,'base=',actual,'selected=',name,'liveowned=',nums['actualOwned'],flush=True)
  page.close()

 # PHASE3 END TO END: native ownership/mastery, reload, background and export.
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,
                             accept_downloads=True,service_workers='block',reduced_motion='reduce')
 p3=context.new_page()
 phase_errors=[]
 p3.on('pageerror',lambda e:phase_errors.append(str(e)))
 p3.on('console',lambda msg:print('PHASE3 BROWSER CONSOLE',msg.type,msg.text,flush=True) if msg.type=='error' else None)
 p3.on('dialog',lambda d:(print('PHASE3 BROWSER DIALOG',d.type,d.message,flush=True),d.dismiss()))

 p3.goto('http://127.0.0.1:8799/',wait_until='domcontentloaded')
 p3.locator('button[data-tab="locker"]').click()
 p3.locator('#lockerBaseGrid [data-locker-family="Water"]').click()
 p3.wait_for_function("() => byId(selectedId).family==='Water' && byId(selectedId).variantKey==='Base'",timeout=20000)
 assert p3.evaluate('selectedId')==1
 var=p3.locator('#lockerVariantGrid .lockerVariantCard')
 assert var.count()>=2
 var.nth(1).click()
 p3.wait_for_function("() => selectedId!==1 && byId(selectedId).family==='Water'",timeout=20000)
 selected=p3.evaluate('selectedId')
 assert p3.evaluate("""() => document.querySelector('.vaultLiveSprite').getAttribute('src')===byId(selectedId).image""")
 bg=p3.locator('#lockerBackgroundGrid .lockerBgCard')
 assert bg.count()==58
 bg.last.click()
 assert bg.last.get_attribute('aria-current')=='true'
 assert p3.evaluate('bgIndex')==57
 assert p3.evaluate("""() => {
   let card=document.querySelector('#lockerBackgroundGrid .lockerBgCard[aria-current="true"]').getBoundingClientRect();
   let view=document.querySelector('#lockerBackgroundGrid').getBoundingClientRect();
   return card.left>=view.left-3 && card.right<=view.right+3;
 }"""), 'Selected background clipped'
 assert p3.evaluate("""() => document.querySelector('.vaultLiveBackdrop').getAttribute('src')===BACKGROUNDS[bgIndex].file""")
 p3.reload(wait_until='domcontentloaded')
 p3.locator('button[data-tab="locker"]').click()
 assert p3.evaluate('selectedId')==selected
 assert p3.evaluate('bgIndex')==57
 assert p3.locator('#lockerBackgroundGrid .lockerBgCard[aria-current="true"]').get_attribute('data-locker-bg')=='57'
 assert p3.evaluate("""() => {
   let card=document.querySelector('#lockerBackgroundGrid .lockerBgCard[aria-current="true"]').getBoundingClientRect();
   let view=document.querySelector('#lockerBackgroundGrid').getBoundingClientRect();
   return card.left>=view.left-3 && card.right<=view.right+3;
 }"""), 'Selected background clipped after reload'
 p3.locator('button[data-season="C7S3"]').click()
 p3.locator('[data-small="1"]').click()
 assert p3.evaluate('isAcquired(byId(1))')
 assert p3.evaluate('JSON.parse(localStorage.getItem(STORE.favorites)).includes(1)')
 p3.locator('button[data-tab="locker"]').click()
 assert p3.locator('#vaultOwned').inner_text().strip()=='1 / 67'
 p3.locator('#vaultLockerFilter').select_option('owned')
 assert p3.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==1
 p3.locator('#vaultLockerFilter').select_option('missing')
 assert p3.locator('#lockerBaseGrid .lockerBaseCard:visible').count()==66
 p3.locator('#vaultLockerFilter').select_option('all')
 p3.locator('button[data-season="C7S3"]').click()
 p3.locator('[data-level-id="1"][data-level="5"]').first.click()
 assert p3.evaluate('isMastered(byId(1))')
 p3.reload(wait_until='domcontentloaded')
 p3.locator('button[data-tab="locker"]').click()
 assert p3.evaluate('isAcquired(byId(1)) && isMastered(byId(1))')
 assert p3.locator('#vaultOwned').inner_text().strip()=='1 / 67'
 p3.locator('#lockerShareBtn').click()
 assert 'open' in p3.locator('#exportOverlay').get_attribute('class')
 p3.wait_for_function("""() => {
    let c=document.querySelector('#exportCanvas');
    return c && c.width>=700 && c.height>=500;
 }""",timeout=30000)

 p3.wait_for_function("""() => document.querySelector('#exportDims').textContent.includes('PNG') &&
                                !document.querySelector('#downloadExport').disabled""",timeout=30000)
 size=p3.evaluate("""async () => {
   try{
     const b=await canvasBlob();
     return {size:b.size,type:b.type};
   }catch(e){return {error:String(e),message:e.message};}
 }""")
 print('PHASE3 EXPORT BLOB',size,'render',p3.locator('#exportDims').inner_text(),flush=True)
 assert size.get('size',0)>10000,'Export Blob must be non-empty PNG'

 # Phase 3 export: headless CI does not expose the platform download
 # event reliably. Verify the actual bound onclick handler and the genuine
 # 1600x1200 PNG bytes that Save uses. Device-level download/share is Phase 4.
 assert p3.evaluate("""() => typeof document.querySelector('#downloadExport').onclick==='function'"""), 'Save button must have native onclick'
 png=pathlib.Path('qa-screenshots/phase3-actual-saved-image.png')
 pngb64=p3.evaluate("""async () => {
   const b=await canvasBlob();
   return await new Promise((res,rej)=>{
     const reader=new FileReader();
     reader.onload=()=>res(reader.result.split(',')[1]);
     reader.onerror=rej; reader.readAsDataURL(b);
   });
 }""")
 png.write_bytes(base64.b64decode(pngb64))
 with Image.open(png) as im:
    im.load()
    assert im.width>=700 and im.height>=500
    assert im.getbbox() is not None
 p3.locator('#closeExport').click()
 for season,total in [('C7S3',119),('C7S4',162),('C7S5',35)]:
    p3.locator('button[data-season="'+season+'"]').click()
    assert p3.evaluate('ACTIVE.length')==total,(season,total)
 assert p3.evaluate("""() => ['John Wick','Ironmouse','Pollo','Vini Jr'].every(n=>
    SPRITES.some(s=>s.name.includes(n))) && SPRITES.some(s=>s.name==='Gem Llama Sprite')""")
 assert not phase_errors,phase_errors[:6]
 print('PASS PHASE3 native ownership/mastery, reload, variants, background, PNG, 3 seasons',flush=True)
 p3.close()
 context.close()
 browser.close()
server.shutdown()
