/* Phase 2 — cohesive Locker / Featured Sprite / Background Selector.
 * Works solely on the existing canonical DOM; never mutates SPRITES,
 * BACKGROUNDS, localStorage, native handlers or the export engine.
 * Separate file makes later Claude/Astra/GPT review straightforward.
 */
(() => {
  'use strict';
  const root=document.getElementById('lockerView');
  if(!root || !root.querySelector('.vaultFeaturedComposition') ||
     root.dataset.vaultPhase2==='ready') return;
  root.dataset.vaultPhase2='ready';

  const redesign=root.querySelector('.lockerRedesign');
  const layout=root.querySelector('.lockerRedesignLayout');
  const selection=root.querySelector('.lockerSelectionColumn');
  const variants=selection.querySelector('.lockerVariantPanel');
  const footer=root.querySelector('.lockerVaultFooter');
  const feature=root.querySelector('.lockerFeaturePanel');
  const bgPanel=feature.querySelector('.lockerBackgroundPanelBelow');
  const bgGrid=bgPanel.querySelector('#lockerBackgroundGrid');
  if(!redesign || !layout || !selection || !variants || !footer ||
     !feature || !bgPanel || !bgGrid) return;

  // The three sections share the same frame and luminous centreline.
  // Relocating the EXISTING footer gives the real "owned / base families"
  // tally a natural position beneath the scrolling gallery.
  const gallery=selection.querySelector('.lockerBasePanel');
  selection.insertBefore(footer,variants);
  gallery.classList.add('vaultGallerySection');
  variants.classList.add('vaultCompactVariantSection');
  layout.classList.add('vaultPhase2Layout');
  feature.classList.add('vaultPhase2Feature');

  // The approved Featured Sprite artwork has a centred enamel/gold heading.
  // This heading adds decoration only, while #lockerSelectedName remains live.
  const featureBanner=document.createElement('div');
  featureBanner.className='vaultPhase2FeatureBanner';
  featureBanner.setAttribute('aria-hidden','true');
  featureBanner.innerHTML='<span>✦</span><strong>FEATURED SPRITE</strong><span>✦</span>';
  feature.insertBefore(featureBanner,feature.firstChild);

  const scene=feature.querySelector('.vaultLiveScene');
  if(scene)scene.setAttribute('aria-label','Authentic selected Sprite on its selected in-app background');

  // The approved selector is a real scrollable carousel, not one flattened
  // image of six fictional demo background names.
  bgPanel.classList.add('vaultPhase2Background');
  const head=bgPanel.querySelector('.lockerPanelHead');
  const heading=head?.querySelector('h2');
  if(heading) heading.textContent='BACKGROUND SELECTOR';
  const rail=document.createElement('div');
  rail.className='vaultPhase2BackgroundRail';
  rail.setAttribute('role','group');
  rail.setAttribute('aria-label','Browse background options');
  const makeArrow=(direction)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='vaultPhase2BgArrow';
    btn.textContent=direction<0?'‹':'›';
    btn.setAttribute('aria-label',direction<0?'Scroll to previous backgrounds':'Scroll to next backgrounds');
    btn.dataset.direction=String(direction);
    return btn;
  };
  const prev=makeArrow(-1),next=makeArrow(1);
  const mask=document.createElement('div');
  mask.className='vaultPhase2BackgroundViewport';
  bgGrid.parentNode.insertBefore(rail,bgGrid);
  rail.append(prev,mask,next);
  mask.append(bgGrid);

  const hint=document.createElement('span');
  hint.className='vaultPhase2BgHint';
  hint.textContent='Swipe to explore more backgrounds';
  bgPanel.append(hint);

  let lastScroll=0;
  let selectedBackground=bgGrid.querySelector('.lockerBgCard[aria-current="true"]')?.dataset.lockerBg || '0';
  const maxScroll=()=>Math.max(0,bgGrid.scrollWidth-bgGrid.clientWidth);
  const reflectArrows=()=>{
    const max=maxScroll();
    const x=bgGrid.scrollLeft;
    prev.disabled=x<=1;
    next.disabled=x>=max-1;
    prev.setAttribute('aria-disabled',String(prev.disabled));
    next.setAttribute('aria-disabled',String(next.disabled));
  };
  for(const b of [prev,next]){
    b.addEventListener('click',()=>{
      const direction=Number(b.dataset.direction);
      const first=bgGrid.querySelector('.lockerBgCard');
      const span=first?first.getBoundingClientRect().width+9:112;
      const step=Math.max(span,Math.floor(bgGrid.clientWidth/span)*span);
      bgGrid.scrollBy({left:direction*step,behavior:'smooth'});
    });
  }
  bgGrid.addEventListener('scroll',()=>{
    lastScroll=bgGrid.scrollLeft;
    reflectArrows();
  },{passive:true});
  // Native renderLockerRedesign() replaces the buttons, not bgGrid itself.
  // Restoring the offset keeps the carousel at the user's chosen position
  // even after selecting a new background.
  const observer=new MutationObserver(()=>{
    const desired=Math.max(0,Math.min(lastScroll,maxScroll()));
    if(Math.abs(bgGrid.scrollLeft-desired)>3)bgGrid.scrollLeft=desired;
    // A background change should bring that actual selected card into view.
    // A Sprite-only re-render should retain the user's current browsing offset.
    const current=bgGrid.querySelector('.lockerBgCard[aria-current="true"]');
    if(current && current.dataset.lockerBg!==selectedBackground){
      selectedBackground=current.dataset.lockerBg;
      const viewport=bgGrid.getBoundingClientRect();
      const selected=current.getBoundingClientRect();
      if(selected.left<viewport.left+5){
        bgGrid.scrollLeft-=viewport.left+7-selected.left;
      } else if(selected.right>viewport.right-5){
        bgGrid.scrollLeft+=selected.right-viewport.right+7;
      }
    }
    lastScroll=bgGrid.scrollLeft;
    reflectArrows();
  });
  observer.observe(bgGrid,{childList:true});
  reflectArrows();

  // Improve discoverability of the native export operation without changing it.
  const nativeShare=feature.querySelector('#lockerShareBtn');
  if(nativeShare){
    nativeShare.setAttribute('aria-label','Save or share featured Sprite using the original export options');
    nativeShare.title='Save or share your featured Sprite';
  }
})();
