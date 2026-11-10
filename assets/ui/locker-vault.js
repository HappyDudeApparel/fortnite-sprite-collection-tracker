/* Approved Locker Vault, v2.0.55. Visual/interaction add-on only.
   Original Sprite, state, collection and export implementations remain canonical. */
(() => {
  'use strict';
  const root = document.getElementById('lockerView');
  if (!root || !root.querySelector('.lockerRedesign')) return;

  const state={query:'',filter:'all',layout:'grid'};
  const canRun=() => typeof lockerFamilyEntries === 'function'
    && typeof isAcquired === 'function' && typeof lockerSpritesForFamily === 'function';

  const hero=root.querySelector('.lockerRedesignHeader');
  const vault=document.createElement('section');
  vault.className='lockerVaultHero';
  vault.setAttribute('aria-label','Sprite Collection Locker holographic vault');
  hero.parentNode.insertBefore(vault,hero);
  vault.appendChild(hero);

  const atmosphere=document.createElement('div');
  atmosphere.className='lockerVaultAtmosphere';
  atmosphere.setAttribute('aria-hidden','true');
  atmosphere.innerHTML=`
    <div class="vaultArchitecture">
      <div class="vaultArch vaultArchOne"></div>
      <div class="vaultArch vaultArchTwo"></div>
      <div class="vaultCabinet vaultCabinetLeft"></div>
      <div class="vaultCabinet vaultCabinetRight"></div>
      <div class="vaultPillar vaultPillarLeft"></div>
      <div class="vaultPillar vaultPillarRight"></div>
      <div class="vaultCrystal vaultCrystalLeft"></div>
      <div class="vaultCrystal vaultCrystalRight"></div>
      <div class="vaultHalo"></div>
      <div class="vaultEqualizer vaultEqualizerLeft"></div>
      <div class="vaultEqualizer vaultEqualizerRight"></div>
      <div class="vaultProjectionRing"></div>
      <div class="vaultProjectionRing vaultProjectionRingTwo"></div>
      <div class="vaultProjectionSubject"></div>
      <div class="vaultFloor"></div>
    </div>`;
  vault.appendChild(atmosphere);
  const logo=atmosphere.querySelector('.vaultProjectionSubject');
  // A verified, real repository Sprite is used ONLY as decorative art, never
  // substituted for the user's selected image or a collectible.
  if(canRun()){
    const llama=lockerFamilyEntries().find(e=>String(e.family).toLowerCase()==='llama');
    if(llama && llama.sprite && llama.sprite.image){
      const img=document.createElement('img');
      img.alt='';img.loading='eager';img.decoding='async';img.src=llama.sprite.image;
      logo.append(img);
    }
  }

  const summary=document.createElement('section');
  summary.className='lockerVaultSummary';
  summary.setAttribute('aria-label','Your live Sprite collection progress');
  summary.innerHTML=`
    <div class="vaultSummaryTitle"><h2>My Collection</h2><span>ALL SPRITES</span></div>
    <div class="vaultProgressCircle" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div><b id="vaultPercent">0%</b><span>COMPLETE</span></div></div>
    <div class="vaultSummaryItem"><span class="vaultMetricIcon vaultOwnedIcon" aria-hidden="true">✧</span><span class="vaultMetricCaption">OWNED</span><strong id="vaultOwned">0 / 0</strong></div>
    <div class="vaultSummaryItem"><span class="vaultMetricIcon vaultCompleteIcon" aria-hidden="true">✦</span><span class="vaultMetricCaption">COMPLETED</span><strong id="vaultCompleted">0 / 0</strong></div>`;
  vault.after(summary);

  const baseGrid=root.querySelector('#lockerBaseGrid');
  const basePanel=root.querySelector('.lockerBasePanel');
  // Keep every real card in the DOM, but scroll the middle collection
  // independently of the featured Sprite and background controls.
  const scrollFrame=document.createElement('div');
  scrollFrame.className='vaultGridViewport';
  scrollFrame.tabIndex=0;
  scrollFrame.setAttribute('role','region');
  scrollFrame.setAttribute('aria-label','Base Sprite collection — scroll this frame to browse all Sprites');
  baseGrid.parentNode.insertBefore(scrollFrame,baseGrid);
  scrollFrame.appendChild(baseGrid);
  let rememberedScroll=0;
  scrollFrame.addEventListener('scroll',()=>{rememberedScroll=scrollFrame.scrollTop},{passive:true});
  const resetScroll=()=>{rememberedScroll=0;scrollFrame.scrollTop=0};
  const toolbar=document.createElement('div');
  toolbar.className='lockerVaultToolbar';
  toolbar.innerHTML=`
    <label class="vaultSearchWrap"><span aria-hidden="true">⌕</span><input id="vaultLockerSearch" type="search" placeholder="Search Sprites…" autocomplete="off" aria-label="Search base Sprite collection"/></label>
    <label class="vaultFilterWrap"><span class="sr-only">Filter collection</span><select id="vaultLockerFilter" aria-label="Filter base Sprites"><option value="all">All Sprites</option><option value="owned">Owned</option><option value="missing">Missing</option></select></label>
    <div class="vaultLayoutSwitch" role="group" aria-label="Collection layout"><button type="button" id="vaultGridButton" class="active" aria-label="Grid view" aria-pressed="true">▦</button><button type="button" id="vaultListButton" aria-label="List view" aria-pressed="false">☷</button></div>`;
  baseGrid.parentNode.insertBefore(toolbar,baseGrid);

  const footer=document.createElement('div');
  footer.className='lockerVaultFooter';
  footer.innerHTML='<span>✦</span><strong id="vaultFooterCount">0 / 0 SPRITES COLLECTED</strong><span>✦</span>';
  const layout=root.querySelector('.lockerRedesignLayout');
  layout.after(footer);


  // Premium vault fixtures: architectural accents, no fabricated Sprite art.
  const plantSVG='<svg class="vaultBotanical" viewBox="0 0 130 150" aria-hidden="true" preserveAspectRatio="xMidYMin meet"><path d="M63 2 Q38 46 45 143" fill="none" stroke="#977a3b" stroke-width="3"/><path d="M63 4 Q79 40 73 132" fill="none" stroke="#7c6736" stroke-width="2"/>'+
    Array.from({length:11},(_,i)=>{const y=16+i*11,side=i%2?1:-1,cx=side>0?78:43;return '<ellipse cx="'+cx+'" cy="'+y+'" rx="'+(16+i%3*3)+'" ry="9" fill="'+(i%3===0?'#668a25':i%3===1?'#295d34':'#b5ae40')+'" stroke="#c7b66b" stroke-width=".75" transform="rotate('+(side*29)+' '+cx+' '+y+')" />'}).join('')+'</svg>';
  const crystalSVG='<svg class="vaultJewel" viewBox="0 0 90 120" aria-hidden="true"><defs><linearGradient id="vaultJewelFacet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6baff"/><stop offset=".35" stop-color="#d665ff"/><stop offset=".72" stop-color="#592bb3"/><stop offset="1" stop-color="#53edff"/></linearGradient></defs><path d="M45 2 73 36 80 92 46 117 10 88 16 35Z" fill="url(#vaultJewelFacet)" stroke="#ffedff" stroke-width="2"/><path d="M45 2 41 43 46 117 16 35Z" fill="#eae0ff" opacity=".45"/><path d="M45 2 73 36 41 43 16 35M41 43 80 92 46 117" stroke="#fff9ff" opacity=".7" fill="none"/><path d="M41 43 73 36 80 92 46 117Z" fill="#811ce2" opacity=".45"/></svg>';
  const architecture=atmosphere.querySelector('.vaultArchitecture');
  architecture.insertAdjacentHTML('beforeend',
    '<div class="vaultIvy vaultIvyLeft">'+plantSVG+'</div><div class="vaultIvy vaultIvyRight">'+plantSVG+'</div>'+
    '<div class="vaultSconce vaultSconceLeft"><span></span></div><div class="vaultSconce vaultSconceRight"><span></span></div>'+
    '<div class="vaultVitrine vaultVitrineLeft"><div class="vaultVitrineGlass">'+crystalSVG+'</div><div class="vaultVitrinePlinth"></div></div>'+
    '<div class="vaultVitrine vaultVitrineRight"><div class="vaultVitrineGlass">'+crystalSVG+'</div><div class="vaultVitrinePlinth"></div></div>'+
    '<div class="vaultProjectionDeck" aria-hidden="true"></div>');

  // Keep the real underlying export poster and export engine untouched.
  // This is a separate visual composition of the current authentic background
  // and Sprite, laid out like the APPROVED second Locker image.
  const featurePanel=root.querySelector('.lockerFeaturePanel');
  const featureHead=featurePanel.querySelector('.lockerFeatureHead');
  const featureStage=featurePanel.querySelector('#lockerFeatureStage');
  const composition=document.createElement('div');
  composition.className='vaultFeaturedComposition';
  featureHead.before(composition);
  composition.append(featureStage,featureHead);
  const liveScene=document.createElement('div');
  liveScene.className='vaultLiveScene';
  liveScene.setAttribute('aria-label','Selected Sprite on its currently selected collection background');
  liveScene.innerHTML='<img class="vaultLiveBackdrop" alt=""/><div class="vaultLiveFloorGlow" aria-hidden="true"></div><img class="vaultLiveSprite" alt=""/><span class="vaultLiveSparkle" aria-hidden="true">✦</span>';
  featureStage.prepend(liveScene);
  featureHead.firstElementChild.insertAdjacentHTML('beforeend',
    '<div class="vaultSelectedDescription" id="vaultSelectedDescription"></div>'+
    '<div class="vaultSelectedStatus" id="vaultSelectedStatus" aria-live="polite"></div>');
  function paintFeatured(){
    if(!canRun()||typeof byId!=='function'||typeof BACKGROUNDS==='undefined')return;
    const entry=byId(selectedId);
    const background=BACKGROUNDS[bgIndex];
    if(!entry||!background)return;
    const backdrop=liveScene.querySelector('.vaultLiveBackdrop');
    const image=liveScene.querySelector('.vaultLiveSprite');
    if(backdrop.getAttribute('src')!==background.file)backdrop.src=background.file;
    if(image.getAttribute('src')!==entry.image)image.src=entry.image;
    image.alt=entry.name;
    backdrop.alt=background.title;
    const cfg=background.overrides||{};
    const bx=Number(background.width)||1448, by=Number(background.height)||1086;
    const anchorX=Number.isFinite(Number(cfg.anchorX))?Number(cfg.anchorX):bx/2;
    const anchorY=Number.isFinite(Number(cfg.anchorY))?Number(cfg.anchorY):by*.7;
    const hover=Number.isFinite(Number(cfg.hover))?Number(cfg.hover):0;
    const heroWidth=Number.isFinite(Number(cfg.heroWidth))?Number(cfg.heroWidth):244;
    image.style.left=Math.max(22,Math.min(78,100*anchorX/bx))+'%';
    image.style.top=Math.max(35,Math.min(78,100*(anchorY-hover)/by))+'%';
    image.style.width=Math.max(33,Math.min(56,100*heroWidth/bx*2.5))+'%';
    featureHead.querySelector('#vaultSelectedDescription').textContent=entry.description||entry.effect||'';
    const status=featureHead.querySelector('#vaultSelectedStatus');
    let stateText='NOT COLLECTED',type='missing';
    if(entry.preview || entry.releaseState==='unreleased'){stateText='UNRELEASED';type='preview';}
    else if(isMastered(entry)){stateText='✦ MASTERED';type='mastered';}
    else if(isAcquired(entry)){stateText='✓ OWNED';type='owned';}
    status.textContent=stateText;
    status.dataset.ownership=type;
  }
  const featureTitle=root.querySelector('#lockerSelectedName');
  const backgroundTitle=root.querySelector('#lockerBackgroundName');
  new MutationObserver(paintFeatured).observe(featureTitle,{childList:true,characterData:true,subtree:true});
  new MutationObserver(paintFeatured).observe(backgroundTitle,{childList:true,characterData:true,subtree:true});
  paintFeatured();

  const panelHead=basePanel.querySelector('.lockerPanelHead');
  if(panelHead)panelHead.classList.add('vaultBaseHeading');

  function update(){
    if(!canRun())return;
    const entries=lockerFamilyEntries();
    const owned=entries.filter(e=>isAcquired(e.sprite)).length;
    const total=entries.length;
    const completed=entries.filter(e=>{
      const live=lockerSpritesForFamily(e.family).filter(s=>typeof isCollectible==='function' && isCollectible(s));
      return live.length>0&&live.every(isMastered);
    }).length;
    const pct=total?Math.round(owned/total*100):0;
    summary.querySelector('#vaultPercent').textContent=pct+'%';
    summary.querySelector('#vaultOwned').textContent=owned+' / '+total;
    summary.querySelector('#vaultCompleted').textContent=completed+' / '+total;
    const ring=summary.querySelector('.vaultProgressCircle');
    ring.style.setProperty('--vault-pct',pct+'%');
    ring.setAttribute('aria-valuenow',String(pct));
    footer.querySelector('#vaultFooterCount').textContent=owned+' / '+total+' BASE SPRITES COLLECTED';
    baseGrid.classList.toggle('vaultListMode',state.layout==='list');
    for(const btn of baseGrid.querySelectorAll('.lockerBaseCard')){
      const e=entries.find(x=>x.family===btn.dataset.lockerFamily);
      if(!e)continue;
      const matchesText=String(e.label||e.family).toLowerCase().includes(state.query);
      const matchesState=state.filter==='all'||(state.filter==='owned'?isAcquired(e.sprite):!isAcquired(e.sprite));
      btn.hidden=!(matchesText&&matchesState);
      btn.classList.toggle('vaultOwned',isAcquired(e.sprite));
      btn.setAttribute('aria-pressed',btn.classList.contains('active')?'true':'false');
    }
  }
  const search=toolbar.querySelector('#vaultLockerSearch');
  search.addEventListener('input',()=>{state.query=search.value.trim().toLowerCase();resetScroll();update()});
  const select=toolbar.querySelector('#vaultLockerFilter');
  select.addEventListener('change',()=>{state.filter=select.value;resetScroll();update()});
  for(const kind of ['grid','list']){
    toolbar.querySelector(kind==='grid'?'#vaultGridButton':'#vaultListButton').addEventListener('click',()=>{
      state.layout=kind;
      for(const v of ['grid','list']){
        const b=toolbar.querySelector(v==='grid'?'#vaultGridButton':'#vaultListButton');
        b.classList.toggle('active',v===kind);
        b.setAttribute('aria-pressed',String(v===kind));
      }
      resetScroll();
      update();
    });
  }
  // Observing only childList preserves all native dynamically rendered handlers,
  // including variant changes and animated background selection.
  const observer=new MutationObserver(()=>{
    if(rememberedScroll>0 && scrollFrame.scrollTop===0){
      scrollFrame.scrollTop=Math.min(rememberedScroll,Math.max(0,scrollFrame.scrollHeight-scrollFrame.clientHeight));
    }
    update();
  });
  observer.observe(baseGrid,{childList:true});
  update();
})();
