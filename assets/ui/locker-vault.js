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
  search.addEventListener('input',()=>{state.query=search.value.trim().toLowerCase();update()});
  const select=toolbar.querySelector('#vaultLockerFilter');
  select.addEventListener('change',()=>{state.filter=select.value;update()});
  for(const kind of ['grid','list']){
    toolbar.querySelector(kind==='grid'?'#vaultGridButton':'#vaultListButton').addEventListener('click',()=>{
      state.layout=kind;
      for(const v of ['grid','list']){
        const b=toolbar.querySelector(v==='grid'?'#vaultGridButton':'#vaultListButton');
        b.classList.toggle('active',v===kind);
        b.setAttribute('aria-pressed',String(v===kind));
      }
      update();
    });
  }
  // Observing only childList preserves all native dynamically rendered handlers,
  // including variant changes and animated background selection.
  const observer=new MutationObserver(()=>update());
  observer.observe(baseGrid,{childList:true});
  update();
})();
