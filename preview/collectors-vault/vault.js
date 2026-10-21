
/* Collector's Vault staging controller. Uses the original, unmodified Sprite dataset and stage-only storage. */
(function(){
'use strict';
const PREFIX='vault-stage-v1-';
const PREFS=PREFIX+'preferences',SHELVES=PREFIX+'shelves',SCHEMA='sprite-collection-locker-vault-backup',BUILD='2.1.0-STAGING';
const liveKeys={favorites:'sprite-mobile-v33-favorites',levels:'sprite-mobile-v33-levels',selected:'sprite-mobile-v33-selected',bg:'sprite-mobile-v33-bg',title:'sprite-mobile-v33-title',viewMode:'scl-clean-view-mode',exportName:'sprite-mobile-v34-export-name'};
const stageKeys={favorites:PREFIX+'favorites',levels:PREFIX+'levels',selected:PREFIX+'selected',bg:PREFIX+'bg',title:PREFIX+'title',viewMode:PREFIX+'viewMode',exportName:PREFIX+'export-name'};
const DEFAULT={theme:'aurora',classic:false,reducedMotion:false,sound:false,featured:null,shareSprite:null,shareFormat:'portrait',density:'comfy'};
const QUACKS=[{id:363,need:40},{id:365,need:45},{id:364,need:50},{id:367,need:55},{id:366,need:60}];
const ACHIEVEMENTS=[{id:'first',icon:'✦',name:'First Discovery',hint:'Collect your first Sprite',check:(p)=>p.found>=1},
{id:'ten',icon:'◆',name:'Rising Collector',hint:'Collect 10 Sprites',check:(p)=>p.found>=10},
{id:'quarter',icon:'◈',name:'Quarter Vault',hint:'25% of the current season',check:(p)=>p.total>0&&p.found/p.total>=.25},
{id:'half',icon:'✧',name:'Halfway Hero',hint:'50% of the current season',check:(p)=>p.total>0&&p.found/p.total>=.5},
{id:'threequarters',icon:'♛',name:'Vault Guardian',hint:'75% of the current season',check:(p)=>p.total>0&&p.found/p.total>=.75},
{id:'complete',icon:'★',name:'Complete Collection',hint:'Own the complete current season',check:(p)=>p.total>0&&p.found===p.total},
{id:'fiveMastered',icon:'⬡',name:'Master of Five',hint:'Five mastered Sprites in C7S4',check:(p)=>p.s4Mastered>=5},
{id:'quack',icon:'♕',name:'Mastery Rewards',hint:'Acquire your first Quack Sprite',check:()=>QUACKS.some(q=>favorites.has(q.id))}];
let prefs=readJSON(PREFS,DEFAULT),shelves=readJSON(SHELVES,null),renderQueued=false,lastMastered=-1,shareRenderToken=0,stageReady=false;
const validThemes=['aurora','museum','arcade'],formats=['portrait','square','landscape','certificate'];
const qs=s=>document.querySelector(s),qsa=s=>Array.from(document.querySelectorAll(s));
const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n};
const safe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readJSON(key,fallback){try{const val=JSON.parse(localStorage.getItem(key));return val==null?JSON.parse(JSON.stringify(fallback)):val}catch(_){return fallback==null?null:JSON.parse(JSON.stringify(fallback))}}
const writeJSON=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch(err){toast('Storage full: export a backup before making more changes.');return false}};
const sprite=id=>SPRITES.find(s=>s.id===Number(id));
const art=s=>s&&s.image?new URL(s.image,document.baseURI).href:'';
const pad=(a,b)=>Math.round(a*100/b)||0;
const found=s=>favorites.has(s.id),mastered=s=>isMastered(s);
const allCurrent=()=>ACTIVE.filter(isCollectible),s4=()=>SPRITES.filter(s=>s.season==='C7S4'&&isCollectible(s));
const currentStats=()=>{const a=allCurrent(),f=a.filter(found),m=a.filter(mastered);return{total:a.length,found:f.length,mastered:m.length,missing:a.length-f.length,pct:pad(f.length,a.length),s4Mastered:s4().filter(mastered).length}};
function toast(msg){let e=qs('.vault-stage-toast');if(!e){e=el('div','vault-stage-toast');e.setAttribute('role','status');document.body.appendChild(e)}e.textContent=msg;e.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.remove(),3200)}
function savePrefs(){writeJSON(PREFS,prefs)}
function saveShelves(){writeJSON(SHELVES,shelves)}
function chosenHero(){
 let x=sprite(prefs.featured);
 if(!x||x.season!==currentSeason)x=ACTIVE.find(x=>found(x)&&x.variantKey==='Base')||ACTIVE.find(x=>found(x))||ACTIVE.find(x=>x.variantKey==='Base')||ACTIVE[0];
 return x||SPRITES[0];
}
function setDisplay(){
 if(!validThemes.includes(prefs.theme))prefs.theme='aurora';
 document.body.dataset.vaultTheme=prefs.theme;
 document.body.classList.toggle('vault-classic',!!prefs.classic);
 document.body.classList.toggle('vault-motion-off',!!prefs.reducedMotion);
 if(!validThemes.includes(prefs.theme))prefs.theme='aurora';
}
function renderHome(){
 if(!stageReady)return;
 setDisplay();
 const p=currentStats(),hero=chosenHero(),bg=BACKGROUNDS[bgIndex]||BACKGROUNDS[0];
 const next=QUACKS.find(q=>p.s4Mastered<q.need),unlock=QUACKS.filter(q=>p.s4Mastered>=q.need).length;
 const dash=qs('#vault-dashboard');
 if(dash){
 dash.innerHTML='<section class="vault-hero vault-panel" style="--vault-hero-bg:url(&quot;'+safe(art({image:bg.file}))+'&quot;)">'+
 '<div class="vault-hero-copy"><div class="vault-overline">COLLECTOR’S VAULT • '+safe(currentSeason)+'</div><h1>Your Sprites.<br>Your Legacy.</h1>'+
 '<p>Collect every variant, celebrate your mastery and build a showcase you can keep.</p>'+
 '<div class="vault-dashboard-actions"><button class="vault-button primary" data-vault-act="open-museum">Explore the Museum →</button>'+
 '<button class="vault-button" data-vault-act="open-backup">Back Up Collection</button></div></div>'+
 '<div class="vault-hero-art"><img src="'+safe(art(hero))+'" alt="'+safe(hero.name)+'" loading="eager"><span class="vault-hero-stamp">'+safe(hero.family)+' • '+safe(hero.variantKey)+'</span></div></section>'+
 '<section class="vault-overview vault-panel"><div><div class="vault-overline">YOUR COLLECTION</div><h2 class="vault-title">'+safe(currentSeason)+' Progress</h2></div>'+
 '<div class="vault-overview-top"><div class="vault-ring" style="--progress:'+p.pct+'%"><div class="vault-ring-inner"><div>'+p.pct+'%<small>FOUND</small></div></div></div>'+
 '<div><b style="font-size:21px">'+p.found+' / '+p.total+'</b><p class="vault-intro">'+p.missing+' still to collect. '+p.mastered+' mastered this season.</p></div></div>'+
 '<div class="vault-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+p.total+'" aria-valuenow="'+p.found+'"><span style="width:'+p.pct+'%"></span></div>'+
 '<div class="vault-stats"><div class="vault-stat"><b>'+p.found+'</b><span>Collected</span></div><div class="vault-stat"><b>'+p.missing+'</b><span>Missing</span></div><div class="vault-stat"><b>'+p.mastered+'</b><span>Mastered</span></div></div>'+
 '<p class="vault-intro" style="font-size:12px">'+(next?'Next Quack milestone: <b>'+safe(sprite(next.id).family)+'</b> in <b>'+(next.need-p.s4Mastered)+'</b> more mastered Sprites.':'All five Quack mastery thresholds reached!')+
 ' <span style="color:var(--vault-warm)">('+unlock+'/5 eligible)</span></p></section>';
 }
 let controls=qs('#vault-view-controls');
 if(controls){
 controls.innerHTML='<span class="vault-main-stats">Browse as</span><div class="vault-pills" role="group" aria-label="Collection display mode">'+
 '<button data-vault-act="cards" aria-pressed="'+(!prefs.classic)+'">Collector Cards</button>'+
 '<button data-vault-act="classic" aria-pressed="'+(!!prefs.classic)+'">Classic Grid</button></div>'+
 '<span class="vault-main-stats">'+allCurrent().length+' collectibles · '+(prefs.classic?'Detailed table':'Family cards')+'</span>';
 }
 const cardHost=qs('#vault-cards');if(cardHost&&!prefs.classic)renderCards(cardHost);
}
function renderCards(host){
 const families=filteredFamilies().filter(f=>familyVisibleInMode(f));let html='';
 for(const family of families){
  const list=familySprites(family);const records=list.filter(isCollectible);
  const shown=records.length?records:list; if(!shown.length)continue;
  const base=list.find(s=>s.variantKey==='Base')||list[0],got=records.filter(found).length,met=records.filter(mastered).length;
  const pct=records.length?pad(got,records.length):0;
  html+='<article class="vault-card '+(met===records.length&&met>0?'mastered':'')+'" data-vault-family="'+safe(family)+'">'+
   '<div class="vault-card-header"><img class="vault-card-hero" src="'+safe(art(base))+'" alt="'+safe(base.name)+'" loading="lazy">'+
   '<div class="vault-card-info"><h3>'+safe(family)+'</h3><p>'+got+' / '+records.length+' collected · '+met+' mastered</p></div>'+
   '<button class="vault-mini-button" data-vault-act="family-detail" data-id="'+base.id+'" aria-label="Open '+safe(family)+' details">Details ↗</button></div>'+
   '<div class="vault-card-progress"><span style="width:'+pct+'%"></span></div><div class="vault-card-variants">';
  for(const r of shown){
    const state=found(r)?mastered(r)?'mastered':'found':'missing';
    html+='<button class="vault-chip '+(found(r)?'found ':'')+(mastered(r)?'mastered':'')+'" data-vault-act="variant-detail" data-id="'+r.id+'" title="View '+safe(r.name)+'">'+
    '<span class="dot v-'+safe(r.variantKey)+'" aria-hidden="true"></span>'+
    '<img src="'+safe(art(r))+'" alt="" loading="lazy">'+
    '<span class="vault-chip-label">'+safe(r.variantKey==='Cheat'?'Cheat Master':r.variantKey==='Hacker'?'Loot Hacker':r.variantKey==='Bounty'?'Bounty Hunter':r.variantKey==='Trick'?'Trick or Treat':r.variantKey)+'</span>'+
    '<span class="vault-chip-status">'+(found(r)?'Lv '+levelOf(r):state==='missing'?'Not owned':state)+'</span></button>';
  }
  html+='</div><div class="vault-card-actions"><span class="vault-main-stats">'+pct+'% complete</span>'+
     '<button class="vault-mini-button" data-vault-act="expand-family" data-family="'+safe(family)+'" aria-expanded="'+(expandedFamilies.has(family)?'true':'false')+'">'+(expandedFamilies.has(family)?'Hide levels':'Manage levels')+' ↓</button></div>';
  html+='<div class="vault-card-detail" '+(expandedFamilies.has(family)?'':'hidden')+'>';
  for(const r of records){
   const levelsHtml=[1,2,3,4,5].map(i=>'<option value="'+i+'"'+(i===levelOf(r)?' selected':'')+'>'+i+'</option>').join('');
   html+='<div class="vault-detail-line"><img src="'+safe(art(r))+'" alt="" loading="lazy"><div><b>'+safe(r.name)+'</b><small>'+(found(r)?mastered(r)?'Mastered (self-tracked)':'Collected':'Not collected')+'</small></div>'+
       '<select aria-label="'+safe(r.name)+' level" data-vault-level="'+r.id+'" '+(!found(r)?'disabled':'')+'>'+levelsHtml+'</select>'+
       '<button class="vault-mini-button" data-vault-act="toggle-owned" data-id="'+r.id+'">'+(found(r)?'Remove':'Add')+'</button></div>';
  }
  html+='</div></article>';
 }
 host.innerHTML=html||'<div class="vault-panel" style="grid-column:1/-1;padding:26px;color:#aebfdb">No families match your current search or collection filter.</div>';
}
let expandedFamilies=new Set();
function toggleOwned(id){
 const x=sprite(id);if(!x||!isCollectible(x))return;
 const was=mastered(x);
 if(found(x)){favorites.delete(x.id);delete levels[x.id]}
 else{favorites.add(x.id);levels[x.id]=1;}
 saveState();renderMain();if(activeTab==='locker')renderLocker();if(!was&&mastered(x))celebrate();
 toast(found(x)?x.name+' added to the staging collection':x.name+' removed from staging');
}
function setLevel(id,value){
 const x=sprite(id);if(!x||!isCollectible(x))return;
 const was=mastered(x);const lvl=Math.min(5,Math.max(1,Number(value)||1));
 favorites.add(x.id);levels[x.id]=lvl;
 saveState();renderMain();if(!was&&mastered(x))celebrate();
 toast(x.name+' · Level '+lvl);
}
function celebrate(){
 if(prefs.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 rift();
 for(let i=0;i<24;i++){
  const d=el('span','vault-confetti');d.style.left=(46+Math.random()*8)+'vw';d.style.top=(40+Math.random()*14)+'vh';
  d.style.setProperty('--x',(Math.random()*580-290)+'px');d.style.setProperty('--y',(Math.random()*450-220)+'px');
  d.style.background=i%3===0?'var(--vault-warm)':i%3===1?'var(--vault-aqua)':'var(--vault-accent)';
  document.body.appendChild(d);setTimeout(()=>d.remove(),1000);
 }
 if(prefs.sound){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const c=new Audio();for(const [i,n] of [660,880,1100].entries()){let o=c.createOscillator(),g=c.createGain();o.frequency.value=n;o.type='sine';g.gain.setValueAtTime(.0001,c.currentTime+i*.09);g.gain.exponentialRampToValueAtTime(.10,c.currentTime+i*.09+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+i*.09+.18);o.connect(g).connect(c.destination);o.start(c.currentTime+i*.09);o.stop(c.currentTime+i*.09+.19)}setTimeout(()=>c.close().catch(()=>{}),700)}catch(_){ }}
}
function rift(){
 if(prefs.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches){toast('Rift preview disabled in reduced-motion mode.');return}
 const d=el('span','vault-rift');d.setAttribute('aria-hidden','true');document.body.appendChild(d);setTimeout(()=>d.remove(),730);
}
function createDefaultShelves(){
 const f=SPRITES.filter(s=>s.season==='C7S4'&&s.variantKey==='Base'&&isCollectible(s));
 const own=f.filter(s=>found(s)),src=own.length?own:f;
 const first=src.slice(0,6).map(s=>s.id);
 return [
  {id:'shelf-favorites',name:'The Headliners',background:0,slots:first,sample:own.length===0},
  {id:'shelf-mastery',name:'Mastery Hall',background:Math.min(2,BACKGROUNDS.length-1),slots:[],sample:false},
  {id:'shelf-rare',name:'Rare & Legendary',background:Math.min(5,BACKGROUNDS.length-1),slots:[],sample:false}
 ];
}
function normalizeShelves(input){
 if(!Array.isArray(input))return createDefaultShelves();
 return input.slice(0,6).map((s,i)=>({
  id:String(s.id||'shelf-'+i).slice(0,65),
  name:String(s.name||'Display '+(i+1)).slice(0,50),
  background:Math.max(0,Math.min(BACKGROUNDS.length-1,Number(s.background)||0)),
  slots:Array.isArray(s.slots)?s.slots.slice(0,6).map(x=>sprite(x)?Number(x):null).filter(Boolean):[],
  sample:!!s.sample
 }));
}
function masteryHTML(){
 const progress=s4().filter(mastered).length;
 return '<div class="vault-section-heading"><div><div class="vault-overline">SPRITE MASTERY</div><h2>Quack Reward Journey</h2><p>In-game extraction must be completed to claim a reward. This app tracks your reported mastery.</p></div>'+
 '<span class="vault-main-stats">'+progress+' mastered in C7S4</span></div>'+
 '<div class="vault-milestones">'+QUACKS.map(q=>{
  const x=sprite(q.id),eligible=progress>=q.need,claimed=found(x),pct=Math.min(100,pad(progress,q.need));
  return '<div class="vault-milestone '+(eligible?'unlocked':'')+'"><img src="'+safe(art(x))+'" alt="" loading="lazy">'+
  '<b>'+safe(x.name.replace(' Sprite',''))+'</b><small>'+q.need+' mastered needed</small>'+
  '<div class="vault-milestone-bar"><span style="width:'+pct+'%"></span></div>'+
  '<small>'+ (claimed?'✓ Tracked as owned':eligible?'✓ Threshold reached':(q.need-progress)+' to go')+'</small></div>';
 }).join('')+'</div>';
}
function achievementsHTML(){
 const p=currentStats(),earned=ACHIEVEMENTS.filter(a=>a.check(p)).length;
 return '<div class="vault-section-heading"><div><div class="vault-overline">COLLECTOR AWARDS</div><h2>Achievement Cabinet</h2><p>Decorative site achievements based on your own collection entries.</p></div>'+
 '<span class="vault-main-stats">'+earned+' / '+ACHIEVEMENTS.length+' achieved</span></div>'+
 '<div class="vault-achievements">'+ACHIEVEMENTS.map(a=>{
  const yes=a.check(p);return '<div class="vault-achievement '+(yes?'unlocked':'locked')+'"><span class="vault-medal">'+a.icon+'</span><div><b>'+safe(a.name)+'</b><small>'+safe(a.hint)+'</small></div></div>';
 }).join('')+'</div>';
}
function renderMuseum(){
 const host=qs('#vault-museum-content');if(!host)return;
 setDisplay();
 shelves=normalizeShelves(shelves);const choices=SPRITES.filter(s=>s.season==='C7S4'||s.season==='C7S3').filter(s=>s.image).sort((a,b)=>a.family.localeCompare(b.family)||a.variantOrder-b.variantOrder);
 const options=choices.map(s=>'<option value="'+s.id+'">'+safe(s.name)+' ['+safe(s.season)+']</option>').join('');
 const bgOpts=BACKGROUNDS.map((bg,i)=>'<option value="'+i+'">'+safe(bg.title)+'</option>').join('');
 let html='<section class="vault-museum-intro vault-panel"><div><div class="vault-overline">YOUR PERSONAL MUSEUM</div><h1>Build Your Forever Locker.</h1><p class="vault-intro">Curate up to six display shelves, select your favourite authentic Sprites, and decorate with the original collection backgrounds. These displays are editable drafts, not proof of in-game ownership.</p></div>'+
 '<div class="vault-pills"><button class="vault-button primary" data-vault-act="new-shelf">+ New Display</button><button class="vault-button" data-vault-act="open-backup">Backup & Restore</button></div></section>'+
 '<div class="vault-section-heading"><div><div class="vault-overline">GALLERY DISPLAYS</div><h2>My Showcase Shelves</h2></div><span class="vault-main-stats">'+shelves.length+' / 6 display shelves</span></div><div class="vault-shelf-list">';
 shelves.forEach((sh,idx)=>{
  const bg=BACKGROUNDS[sh.background]||BACKGROUNDS[0];
  html+='<section class="vault-panel vault-shelf" data-shelf="'+idx+'"><div class="vault-shelf-top"><div><span class="vault-overline">DISPLAY 0'+(idx+1)+(sh.sample?' · EXAMPLE ARTWORK':'')+'</span>'+
   '<input aria-label="Shelf name" class="vault-shelf-title" maxlength="50" data-vault-shelf-name="'+idx+'" value="'+safe(sh.name)+'"></div>'+
   '<div class="vault-controls"><label>Backdrop <select class="vault-select" data-vault-bg="'+idx+'">'+bgOpts.replace('value="'+sh.background+'"','value="'+sh.background+'" selected')+'</select></label>'+
   '<button class="vault-mini-button" data-vault-act="clear-shelf" data-shelf="'+idx+'">Clear</button>'+
   '<button class="vault-mini-button" data-vault-act="remove-shelf" data-shelf="'+idx+'">Remove</button></div></div>'+
   '<div class="vault-shelf-scene" style="--shelf-bg:url(&quot;'+safe(art({image:bg.file}))+'&quot;)">';
  for(let i=0;i<6;i++){const x=sprite(sh.slots[i]);html+='<div class="vault-shelf-slot">'+(x?'<img src="'+safe(art(x))+'" title="'+safe(x.name)+'" alt="'+safe(x.name)+'" loading="lazy">':'')+'</div>';}
  html+='</div><div class="vault-shelf-edit">';
  for(let i=0;i<6;i++){
    const id=sh.slots[i]||'';
    html+='<label>Slot '+(i+1)+'<select class="vault-select" data-vault-slot="'+idx+':'+i+'"><option value="">Empty display</option>'+
     (id?options.replace('value="'+id+'"','value="'+id+'" selected'):options)+'</select></label>';
  }
  html+='</div></section>';
 });
 html+='</div><section id="vault-mastery"></section><section id="vault-awards"></section>'+
 '<section class="vault-panel vault-settings" id="vault-settings"><div class="vault-section-heading" style="margin-top:0"><div><div class="vault-overline">PERSONALIZATION & PRESERVATION</div><h2>Studio Settings</h2></div><span class="vault-main-stats">Staging settings only</span></div>'+
 '<div class="vault-settings-grid"><div class="vault-settings-card"><h3>Visual Themes</h3><p>Compare three design concepts instantly. Themes never affect production.</p>'+
 '<div class="vault-pills"><button data-vault-act="theme" data-theme="aurora" aria-pressed="'+(prefs.theme==='aurora')+'">Aurora</button>'+
 '<button data-vault-act="theme" data-theme="museum" aria-pressed="'+(prefs.theme==='museum')+'">Museum</button>'+
 '<button data-vault-act="theme" data-theme="arcade" aria-pressed="'+(prefs.theme==='arcade')+'">Arcade</button></div></div>'+
 '<div class="vault-settings-card"><h3>Motion & Sound</h3><p>Choose gentler animation or turn effects off entirely. Audio is always opt-in.</p>'+
 '<label><input type="checkbox" data-vault-check="motion" '+(prefs.reducedMotion?'checked':'')+'> Reduce motion</label><br>'+
 '<label><input type="checkbox" data-vault-check="sound" '+(prefs.sound?'checked':'')+'> Enable achievement sounds</label><br><button class="vault-mini-button" data-vault-act="rift">Preview rift transition</button></div>'+
 '<div class="vault-settings-card"><h3>Backup & Restore</h3><p>Download your personal collection data as JSON or import it again. Stage backups do not overwrite your live progress.</p>'+
 '<div class="vault-pills"><button class="vault-button slim primary" data-vault-act="backup">Download Backup</button><button class="vault-button slim" data-vault-act="restore">Restore Backup</button></div></div></div></section>'+
 '<section class="vault-panel vault-settings" id="vault-share"><div class="vault-section-heading" style="margin-top:0"><div><div class="vault-overline">SHARE YOUR LEGACY</div><h2>Collector Cards & Certificates</h2><p>Generate downloadable portrait, square, landscape and season-completion designs using authentic local artwork.</p></div></div>'+
 '<div class="vault-share-controls"><label>Sprite <select class="vault-select" id="vault-share-sprite"></select></label>'+
 '<label>Layout <select class="vault-select" id="vault-share-format"><option value="portrait">Portrait 1080 × 1350</option><option value="square">Square 1080 × 1080</option><option value="landscape">Landscape 1600 × 900</option><option value="certificate">Season Certificate 1600 × 1000</option></select></label>'+
 '<button class="vault-button primary" data-vault-act="save-card">Save PNG</button>'+
 '<button class="vault-button" data-vault-act="share-card">Share</button></div>'+
 '<canvas id="vault-share-canvas" class="vault-share-preview" width="1080" height="1350" role="img" aria-label="Preview of your collectible card design"></canvas></section>';
 host.innerHTML=html;
 qs('#vault-mastery').innerHTML=masteryHTML();qs('#vault-awards').innerHTML=achievementsHTML();
 const select=qs('#vault-share-sprite');
 select.innerHTML=choices.map(s=>'<option value="'+s.id+'">'+safe(s.name)+' ('+safe(s.season)+')</option>').join('');
 const candidate=sprite(prefs.shareSprite),hero=candidate||chosenHero();
 if(hero)select.value=String(hero.id);
 qs('#vault-share-format').value=formats.includes(prefs.shareFormat)?prefs.shareFormat:'portrait';
 drawCard().catch(e=>toast('Card preview unavailable: '+e.message));
}
function newShelf(){
 if(shelves.length>=6){toast('The museum supports up to six display shelves.');return}
 shelves.push({id:'shelf-'+Date.now(),name:'New Display',background:0,slots:[],sample:false});
 saveShelves();renderMuseum();toast('New display added.');
}
function slotChange(id,v){
 const parts=id.split(':'),n=Number(parts[0]),i=Number(parts[1]);if(!shelves[n]||i<0||i>=6)return;
 shelves[n].slots[i]=v?Number(v):null;shelves[n].sample=false;saveShelves();renderMuseum();
}
function removeShelf(idx){
 if(!shelves[idx])return;
 if(!confirm('Remove this staging shelf and its six display choices?'))return;
 shelves.splice(idx,1);saveShelves();renderMuseum();
}
function backup(){
 const ids=new Set(SPRITES.map(x=>x.id));
 const f=[...favorites].filter(id=>ids.has(id));
 const savedLevels={};for(const [id,val] of Object.entries(levels))if(ids.has(Number(id))&&Number(val)>=1&&Number(val)<=5)savedLevels[id]=Number(val);
 const data={kind:SCHEMA,schema:1,exportedAt:new Date().toISOString(),appVersion:APP_VERSION,source:'staging',favorites:f,levels:savedLevels,selectedId:selectedId,bgIndex:bgIndex,gamertag:storage.getItem(STORE.title)||'',shelves:normalizeShelves(shelves),preferences:prefs};
 const text=JSON.stringify(data,null,2);
 downloadBlob(new Blob([text],{type:'application/json'}),'sprite-collection-backup-'+new Date().toISOString().slice(0,10)+'.json');
 toast('Backup downloaded. Keep a copy somewhere safe.');
}
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function restore(file){
 if(!file||file.size>2_000_000){toast('Choose a valid JSON backup under 2 MB.');return}
 let data;try{data=JSON.parse(await file.text())}catch(_){toast('The backup file is not valid JSON.');return}
 if(!data||data.kind!==SCHEMA||data.schema!==1||!Array.isArray(data.favorites)||!data.levels||typeof data.levels!=='object'){
  toast('Unsupported backup. Your staging collection was not changed.');return;
 }
 const allowed=new Set(SPRITES.map(s=>s.id));
 const own=[...new Set(data.favorites.map(Number).filter(n=>Number.isInteger(n)&&allowed.has(n)))];
 const importedLevels={};
 for(const [id,v]of Object.entries(data.levels))if(allowed.has(Number(id))&&Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=5)importedLevels[id]=Number(v);
 if(!confirm('Import '+own.length+' owned Sprites and their saved levels into STAGING? Your live collection will not change.'))return;
 const newShelves=normalizeShelves(data.shelves);const newPrefs=Object.assign({},DEFAULT,data.preferences||{});
 for(const k of Object.keys(DEFAULT))if(!Object.hasOwn(newPrefs,k))newPrefs[k]=DEFAULT[k];
 // Stage keys are distinct from the published app's storage namespace.
 favorites=new Set(own);levels=importedLevels;
 if(allowed.has(Number(data.selectedId)))selectedId=Number(data.selectedId);
 bgIndex=Math.max(0,Math.min(BACKGROUNDS.length-1,Number(data.bgIndex)||0));
 shelves=newShelves;prefs=newPrefs;
 saveState();savePrefs();saveShelves();
 if(typeof data.gamertag==='string')storage.setItem(STORE.title,data.gamertag.slice(0,70));
 refreshSeasonData(currentSeason);renderMain();renderMuseum();toast('Backup restored to staging. Production was not modified.');
}
function openRestore(){
 const input=qs('#vault-restore-file');input.value='';input.click();
}
function image(src){
 return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load '+src));img.src=src});
}
function contain(ctx,img,x,y,w,h){
 const k=Math.min(w/img.width,h/img.height),iw=img.width*k,ih=img.height*k;
 ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}
function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath()}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){
 const words=String(text||'').split(/\s+/),lines=[];let line='';
 for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}
 if(line)lines.push(line);
 for(let i=0;i<Math.min(lines.length,maxLines);i++)ctx.fillText(lines[i],x,y+i*lineHeight);
 return Math.min(lines.length,maxLines)*lineHeight;
}
function themeAccent(){return prefs.theme==='museum'?'#d9b583':prefs.theme==='arcade'?'#fa67c8':'#9e89ff'}
function stageName(){return String(storage.getItem(STORE.title)||storage.getItem(EXPORT_NAME_KEY)||'MY COLLECTION').slice(0,45)}
async function drawCard(){
 const canvas=qs('#vault-share-canvas');if(!canvas)return;
 const format=formats.includes(prefs.shareFormat)?prefs.shareFormat:'portrait';
 const dims=format==='portrait'?[1080,1350]:format==='square'?[1080,1080]:format==='landscape'?[1600,900]:[1600,1000];
 const token=++shareRenderToken,ctx=canvas.getContext('2d');canvas.width=dims[0];canvas.height=dims[1];
 const [w,h]=dims,sp=sprite(prefs.shareSprite)||chosenHero(),a=themeAccent(),name=stageName();
 const backdrop=BACKGROUNDS[bgIndex]||BACKGROUNDS[0],progress=currentStats();
 ctx.fillStyle='#080e21';ctx.fillRect(0,0,w,h);
 try{
  const bg=await image(art({image:backdrop.file}));if(token!==shareRenderToken)return;
  const ratio=Math.max(w/bg.width,h/bg.height),dw=bg.width*ratio,dh=bg.height*ratio;
  ctx.save();ctx.globalAlpha=.28;ctx.drawImage(bg,(w-dw)/2,(h-dh)/2,dw,dh);ctx.restore();
 }catch(_){ }
 let g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#101e39e8');g.addColorStop(.55,'#090f29c9');g.addColorStop(1,'#1b1140ef');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle=a;ctx.lineWidth=6;round(ctx,26,26,w-52,h-52,34);ctx.stroke();
 const margin=Math.round(Math.min(w,h)*.066);
 ctx.fillStyle=a;ctx.font='900 '+Math.round(w*.026)+'px system-ui';ctx.fillText('SPRITE COLLECTION LOCKER • COLLECTOR’S VAULT',margin,margin+15);
 ctx.textAlign='right';ctx.fillStyle='#c7d7f0';ctx.font='800 '+Math.round(w*.023)+'px system-ui';ctx.fillText(currentSeason,w-margin,margin+15);ctx.textAlign='left';
 if(format==='certificate'){
   ctx.textAlign='center';ctx.fillStyle='#fff2d0';ctx.font='1000 76px system-ui';ctx.fillText('COLLECTION CERTIFICATE',w/2,210);
   ctx.fillStyle='#d1e1fc';ctx.font='800 36px system-ui';ctx.fillText('Awarded to',w/2,295);
   ctx.fillStyle='#fff';ctx.font='1000 68px system-ui';ctx.fillText(name.toUpperCase(),w/2,375);
   ctx.strokeStyle=a;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.24,414);ctx.lineTo(w*.76,414);ctx.stroke();
   ctx.fillStyle='#9ee8d7';ctx.font='1000 60px system-ui';ctx.fillText(progress.found+' / '+progress.total+' SPRITES COLLECTED',w/2,555);
   ctx.fillStyle='#d9e4f7';ctx.font='800 37px system-ui';ctx.fillText(progress.pct+'% COMPLETE  •  '+progress.mastered+' MASTERED',w/2,625);
   ctx.font='700 24px system-ui';ctx.fillStyle='#d1dae8';ctx.fillText('A personal fan-made collection record • '+new Date().toLocaleDateString(),w/2,750);
   ctx.fillStyle=a;ctx.font='900 34px system-ui';ctx.fillText('KEEP YOUR SPRITES FOREVER',w/2,h-110);
   ctx.textAlign='left';return;
 }
 const horizontal=format==='landscape',imageX=horizontal?w*.52:margin,imageY=horizontal?h*.13:h*.18,imageW=horizontal?w*.38:w-2*margin,imageH=horizontal?h*.73:h*.46;
 try{
  const im=await image(art(sp));if(token!==shareRenderToken)return;
  ctx.save();ctx.shadowColor=a;ctx.shadowBlur=44;contain(ctx,im,imageX,imageY,imageW,imageH);ctx.restore();
 }catch(err){ctx.fillStyle='#9caed0';ctx.font='700 25px system-ui';ctx.fillText('Art temporarily unavailable',imageX,imageY+100)}
 const textX=horizontal?margin:margin,textY=horizontal?h*.33:h*.73;
 ctx.fillStyle='#99fbdf';ctx.font='900 '+(horizontal?27:25)+'px system-ui';ctx.fillText(sp.variantKey.toUpperCase()+' VARIANT',textX,textY-58);
 ctx.fillStyle='#fff';ctx.font='1000 '+(horizontal?60:62)+'px system-ui';
 const height=wrap(ctx,sp.family.toUpperCase(),textX,textY+10,horizontal?w*.43:w-margin*2,horizontal?69:70,3);
 ctx.fillStyle='#a8bbde';ctx.font='800 '+(horizontal?25:26)+'px system-ui';ctx.fillText((sp.rarity||'COLLECTIBLE')+' • '+sp.season,textX,textY+40+height);
 ctx.fillStyle='#b6c7e0';ctx.font='800 '+(horizontal?23:23)+'px system-ui';ctx.fillText(found(sp)?mastered(sp)?'MASTERED • LEVEL 5':'COLLECTED • LEVEL '+levelOf(sp):'NOT YET COLLECTED',textX,textY+92+height);
 ctx.fillStyle=a;ctx.fillRect(margin,h-182,w-2*margin,3);
 ctx.fillStyle='#fff';ctx.font='900 '+(horizontal?36:30)+'px system-ui';ctx.fillText(name.toUpperCase(),margin,h-111);
 ctx.fillStyle='#c4d4e8';ctx.font='800 '+(horizontal?24:20)+'px system-ui';ctx.fillText(progress.found+' / '+progress.total+' '+currentSeason+' SPRITES',margin,h-72);
 ctx.fillStyle='#9cadc5';ctx.font='700 '+(horizontal?20:18)+'px system-ui';ctx.fillText('sprites.happydude.ca',margin,h-42);
}
async function shareCard(nativeShare){
 const canvas=qs('#vault-share-canvas');if(!canvas)return;
 await drawCard();
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG creation unavailable')),'image/png'));
 const filename='sprite-vault-'+(prefs.shareFormat||'portrait')+'-'+new Date().toISOString().slice(0,10)+'.png';
 if(nativeShare&&navigator.share&&typeof File!=='undefined'){
  const file=new File([blob],filename,{type:'image/png'});
  try{
   if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My Sprite Collection Locker',text:'My Collector’s Vault showcase'});return}
  }catch(err){if(err.name==='AbortError')return}
 }
 downloadBlob(blob,filename);toast('Collector card saved as a PNG.');
}
function navigate(t,section){
 setTab(t);
 if(t==='vault'&&section)setTimeout(()=>qs(section)?.scrollIntoView({behavior:prefs.reducedMotion?'auto':'smooth',block:'start'}),35);
}
function actions(event){
 const button=event.target.closest('[data-vault-act]');if(!button)return;
 event.preventDefault();event.stopPropagation();
 const act=button.dataset.vaultAct,id=Number(button.dataset.id);
 if(act==='cards'||act==='classic'){prefs.classic=act==='classic';savePrefs();renderHome();return}
 if(act==='open-museum'){navigate('vault');return}
 if(act==='open-backup'){navigate('vault','#vault-settings');return}
 if(act==='quick-mastery'){navigate('vault','#vault-mastery');return}
 if(act==='family-detail'||act==='variant-detail'){if(sprite(id))openDetail(id);return}
 if(act==='expand-family'){const fam=button.dataset.family;if(expandedFamilies.has(fam))expandedFamilies.delete(fam);else expandedFamilies.add(fam);renderHome();return}
 if(act==='toggle-owned'){toggleOwned(id);return}
 if(act==='theme'){prefs.theme=button.dataset.theme;savePrefs();setDisplay();renderMuseum();renderHome();return}
 if(act==='new-shelf'){newShelf();return}
 if(act==='clear-shelf'){const i=Number(button.dataset.shelf);if(shelves[i]&&confirm('Clear all six slots on this shelf?')){shelves[i].slots=[];shelves[i].sample=false;saveShelves();renderMuseum()}return}
 if(act==='remove-shelf'){removeShelf(Number(button.dataset.shelf));return}
 if(act==='backup'){backup();return}
 if(act==='restore'){openRestore();return}
 if(act==='rift'){rift();return}
 if(act==='save-card'){shareCard(false).catch(err=>toast('Export failed: '+err.message));return}
 if(act==='share-card'){shareCard(true).catch(err=>toast('Share failed: '+err.message));return}
}
function changed(event){
 const e=event.target;
 if(e.dataset.vaultLevel){setLevel(Number(e.dataset.vaultLevel),e.value);return}
 if(e.dataset.vaultBg!==undefined){const i=Number(e.dataset.vaultBg);if(shelves[i]){shelves[i].background=Math.max(0,Math.min(BACKGROUNDS.length-1,Number(e.value)));saveShelves();renderMuseum()}return}
 if(e.dataset.vaultSlot){slotChange(e.dataset.vaultSlot,e.value);return}
 if(e.dataset.vaultShelfName!==undefined){const i=Number(e.dataset.vaultShelfName);if(shelves[i]){shelves[i].name=String(e.value||'Display').slice(0,50);saveShelves()}return}
 if(e.dataset.vaultCheck==='motion'){prefs.reducedMotion=e.checked;savePrefs();setDisplay();return}
 if(e.dataset.vaultCheck==='sound'){prefs.sound=e.checked;savePrefs();return}
 if(e.id==='vault-share-sprite'){prefs.shareSprite=Number(e.value);savePrefs();drawCard().catch(err=>toast(err.message));return}
 if(e.id==='vault-share-format'){prefs.shareFormat=e.value;savePrefs();drawCard().catch(err=>toast(err.message));return}
 if(e.id==='vault-restore-file'){restore(e.files[0]).catch(err=>toast('Import failed: '+err.message));return}
}
function init(){
 if(typeof SPRITES==='undefined'||typeof renderMain!=='function')throw Error('Original Sprite Locker source must load before Vault Stage controller');
 document.body.classList.add('vault-preview');
 prefs=Object.assign({},DEFAULT,prefs);
 shelves=normalizeShelves(shelves);
 setDisplay();
 const origMain=renderMain,origSetTab=setTab;
 renderMain=function(){origMain();if(stageReady)renderHome()};
 setTab=function(tab){origSetTab(tab);if(tab==='vault'){renderMuseum()}else if(tab==='main'){renderHome()}};
 document.addEventListener('click',actions,true);
 document.addEventListener('change',changed,true);
 document.addEventListener('input',e=>{if(e.target.dataset.vaultShelfName!==undefined)changed(e)});
 stageReady=true;
 renderHome();
 document.body.dataset.vaultReady='true';
 window.VaultStage={build:BUILD,render:renderHome,renderMuseum:renderMuseum,backup:backup,stats:currentStats,openMuseum:()=>navigate('vault'),setTheme:(theme)=>{prefs.theme=theme;savePrefs();setDisplay();renderHome();if(activeTab==='vault')renderMuseum()}};
 const file=el('input');file.type='file';file.accept='.json,application/json';file.id='vault-restore-file';file.hidden=true;document.body.appendChild(file);
 if(window.location.hash==='#museum'){navigate('vault')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
