
/* Sprite Arcade staging launcher — no production writes, independent games. */
(function(){
 'use strict';
 const hub=document.getElementById('arcadeHub');
 if(!hub)return;
 const catalog=(typeof SPRITES!=='undefined'?SPRITES:[]).filter(x=>x.releaseState==='released'&&x.image);
 const sprite=id=>catalog.find(x=>x.id===Number(id));
 const playable2d=new Map(Object.entries({
  Water:'water',Earth:'earth',Fire:'fire',Duck:'duck',Ghost:'ghost',Dream:'dream',Demon:'demon',
  Punk:'punk',King:'king','Burnt Peanut':'burnt-peanut','Zero Point':'zero-point',Fishy:'fishy',
  Striker:'striker',Aura:'aura',Boss:'boss',Grim:'grim',Seven:'seven',Air:'air'
 }));
 const image=s=>s&&s.image?new URL(s.image,document.baseURI).href:'';
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let chosenId=null;
 function chosen(){
  return sprite(chosenId)||sprite(selectedId)||catalog.find(x=>x.family==='Water'&&x.variantKey==='Base')||catalog[0];
 }
 function img(fam){return image(catalog.find(x=>x.family===fam&&x.variantKey==='Base'))}
 function gameHref(kind,x){
  const root=kind==='2d'?'./arcade/2d/':'./arcade/3d/';
  const path=new URL(root,location.href);
  if(x)path.searchParams.set('sprite',String(x.id));
  if(kind==='2d'&&x&&playable2d.has(x.family))path.searchParams.set('autostart',playable2d.get(x.family));
  return path.pathname+path.search;
 }
 function renderArcade(){
  const x=chosen();if(!x)return;
  chosenId=x.id;
  const ok2=playable2d.has(x.family),owned=favorites.has(x.id);
  const opts=catalog.map(sp=>'<option value="'+sp.id+'"'+(sp.id===x.id?' selected':'')+'>'+
   escape(sp.family)+' — '+escape(sp.variantKey)+' ['+sp.season+']</option>').join('');
  hub.innerHTML='<header class="arcade-banner"><div><div class="vault-overline">SPRITE ARCADE • EARLY PLAYABLE TESTS</div>'+
  '<h1>Your Sprites.<br>Now Playable.</h1><p>Two recovered Fortnite Sprite fan-game prototypes, now playable directly from the Collector’s Vault staging site. Choose a Sprite from your Locker, then enter the 2D platformer or 3D arena.</p>'+
  '</div><div class="arcade-banner-arts"><img src="'+escape(img('Water'))+'" alt="Water Sprite"><img src="'+escape(img('Fire'))+'" alt="Fire Sprite"></div></header>'+
  '<section class="arcade-current" aria-label="Choose your playable Sprite"><img src="'+escape(image(x))+'" alt="'+escape(x.name)+'">'+
  '<div><div class="vault-overline">SELECTED FROM YOUR LOCKER</div><h2>'+escape(x.name)+'</h2>'+
  '<small>'+x.season+' • '+escape(x.variantKey)+' • '+(owned?'Tracked as owned':'Not marked owned')+'</small></div>'+
  '<label for="arcade-select" class="sr-only">Choose playable Sprite</label><select id="arcade-select" aria-label="Choose any Sprite in your collection">'+opts+'</select>'+
  '<span class="arcade-chip">'+(ok2?'2D & 3D':'3D artwork available')+'</span></section>'+
  '<div class="arcade-tiles"><article class="arcade-tile two"><div class="arcade-tile-cover">'+
  '<span class="arcade-tile-label">2D • CANVAS PLATFORMER</span>'+
  '<img src="'+escape(img('Water'))+'" alt=""><img src="'+escape(img('Earth'))+'" alt=""></div>'+
  '<div class="arcade-tile-text"><div class="vault-overline">18 ORIGINAL PLAYABLE SPRITES</div><h2>Sprite Platformer</h2>'+
  '<p>Side-scrolling gameplay with destructible bricks, hazards, enemies and unique prototype powers. New experimental arm-and-leg animation is enabled; switch it off to compare the untouched artwork.</p>'+
  (ok2?'<p><strong>✓ '+escape(x.name)+'</strong> is ready to play using the '+escape(x.family)+' family prototype move.</p>':
   '<p><strong>'+escape(x.name)+'</strong> is not one of the 18 original playable families yet. The game opens its original character-select screen instead.</p>')+
  '</div><footer><span class="arcade-play-meta">Touch + keyboard<br>Landscape recommended</span><a class="arcade-play" id="arcade2dLink" href="'+escape(gameHref('2d',x))+'">▶ '+(ok2?'PLAY 2D':'CHOOSE 2D SPRITE')+'</a></footer></article>'+
  '<article class="arcade-tile three"><div class="arcade-tile-cover">'+
  '<span class="arcade-tile-label">3D • WEBGL ARENA</span><img src="'+escape(img('Boss'))+'" alt=""><img src="'+escape(img('Zero Point'))+'" alt=""></div>'+
  '<div class="arcade-tile-text"><div class="vault-overline">ORIGINAL PLAYABLE 3D VERTICAL SLICE</div><h2>Sprite 3D Arena</h2>'+
  '<p>Explore the old arena, destroy the wall, face enemies and reach the collection tube. Real catalogued Sprite artwork is rendered onto camera-facing 2.5D characters while faithful 3D models are developed.</p>'+
  '<p><strong>'+escape(x.name)+'</strong> launches with its authentic Sprite artwork. The original prototype shockwave is still a placeholder move, not an official Fortnite ability.</p>'+
  '</div><footer><span class="arcade-play-meta">Touch + keyboard<br>Graphics settings available</span><a class="arcade-play" id="arcade3dLink" href="'+escape(gameHref('3d',x))+'">▶ PLAY 3D</a></footer></article></div>'+
  '<div class="arcade-future"><h3>What happens next?</h3><p>Both games are preserved separately so gameplay can be improved without changing the Sprite Collection Tracker. We can progressively add better faithful 3D characters, purposeful Fortnite-inspired levels and more playable collection variants. No Gamer Bros™ Adventure Mountain™ characters, enemies, weapons or canonical locations are imported into these games.</p></div>'+
  '<p class="arcade-caution">Fan-made experimental games, not official Fortnite experiences. Played-game progress is separate from your collection tracker; testing the Arcade cannot award or modify recorded Fortnite collectibles. Staging-only — production remains unchanged.</p>';
  const select=document.getElementById('arcade-select');
  select.addEventListener('change',()=>{chosenId=Number(select.value);renderArcade()});
 }
 const previous=setTab;
 setTab=function(tab){previous(tab);if(tab==='arcade')renderArcade()};
 const lockerBtn=document.getElementById('lockerPlaySelected');
 if(lockerBtn)lockerBtn.addEventListener('click',()=>{
  chosenId=selectedId;
  setTab('arcade');
 });
 if(location.hash==='#arcade'){setTimeout(()=>setTab('arcade'),0)}
 window.SpriteArcadeStage={render:renderArcade,open:(id)=>{chosenId=id||selectedId;setTab('arcade')},
  urls:(id)=>{const x=sprite(id)||chosen();return {two:gameHref('2d',x),three:gameHref('3d',x)}},
  selected:()=>chosen()};
})();
