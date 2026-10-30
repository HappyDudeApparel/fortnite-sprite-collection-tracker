// Sprite Arena — connected adventure region (no floating island traversal).
// Uses the same player collider and save mechanics as Classic; no new dependencies.
import * as THREE from 'three';
import { makeSolid } from './sim.js';

const TAU=Math.PI*2;
const rnd=(seed)=>()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const C={
 turf:'#69b95d',turfDark:'#4a944a',grassLight:'#8cc77c',earth:'#805b42',
 road:'#c1ac85',road2:'#a9a18a',village:'#c7a877',plaster:'#efdbb2',
 timber:'#65442e',timberLight:'#8b6240',roof:'#c15440',roof2:'#805444',
 wall:'#a2a59b',wallShade:'#767f80',stone:'#b8bdad',stoneDark:'#657379',
 crystal:'#39bcee',crystal2:'#bd9bff',caveFloor:'#536e71',cave:'#364d58',
 forest:'#326443',leaf:'#4d9853',leaf2:'#87ba50',ice:'#a6f2ff',
 magic:'#4bf0fa',gold:'#f9d76d',amber:'#ffb55f',dark:'#111c30'
};
const material=(c,rough=.78,metal=0,emissive=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal,emissive:c,emissiveIntensity:emissive});
export async function buildAdventureWorld(scene,level,quality,gfx){
 const group=new THREE.Group();scene.add(group);
 const owned=new Set(),mats={};
 function mat(c,rough,metal,glow){const key=[c,rough,metal,glow].join('/');if(!mats[key]){mats[key]=material(c,rough,metal,glow);owned.add(mats[key]);}return mats[key]}
 const geos=new Map();function geo(type,...args){
  const key=[type,...args].join(':');
  if(!geos.has(key)){let g=type==='box'?new THREE.BoxGeometry(...args):
    type==='cone'?new THREE.ConeGeometry(...args):type==='torus'?new THREE.TorusGeometry(...args):
    type==='sphere'?new THREE.IcosahedronGeometry(...args):type==='cylinder'?new THREE.CylinderGeometry(...args):
    new THREE.OctahedronGeometry(...args);
    geos.set(key,g);owned.add(g);}
  return geos.get(key);
 }
 function put(type,name,m,x,y,z,sx=1,sy=1,sz=1,opts={}){
  const o=new THREE.Mesh(geo(type,...(opts.geom||[1,1,1])),m);
  o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);
  if(opts.rotation)o.rotation.set(...opts.rotation);
  o.castShadow=!!opts.shadow;o.receiveShadow=!!opts.receive;
  group.add(o);return o;
 }
 const solids=[];
 function slab(name,x0,x1,z0,z1,top,depth,shade,solid=true){
  put('box',name,mat(shade), (x0+x1)/2,top-depth/2,(z0+z1)/2,x1-x0,depth,z1-z0,{shadow:false,receive:true});
  if(solid)solids.push(makeSolid(x0,x1,top-depth,top,z0,z1,{kind:'terrain',id:name}));
 }
 function buildingBox(name,x,y,z,sx,sy,sz,col,collision=false,opts={}){
  const o=put('box',name,mat(col,opts.rough||.78),x,y,z,sx,sy,sz,{shadow:!!opts.shadow,receive:true});
  if(collision)solids.push(makeSolid(x-sx/2,x+sx/2,y-sy/2,y+sy/2,z-sz/2,z+sz/2,{kind:'wall',id:name}));
  return o;
 }
 scene.background=new THREE.Color('#b9ddec');
 scene.fog=new THREE.Fog('#b6dce8',90,210);
 gfx.renderer.setClearColor('#b6dce8');
 const sky=new THREE.HemisphereLight(0xe4f4ff,0x678a5a,1.45);
 const sun=new THREE.DirectionalLight(0xffe8c1,2.35);
 sun.position.set(-38,64,25);sun.castShadow=quality.shadow>0;
 sun.shadow.mapSize.set(Math.max(256,quality.shadow||512),Math.max(256,quality.shadow||512));
 sun.shadow.camera.left=-92;sun.shadow.camera.right=92;sun.shadow.camera.top=92;sun.shadow.camera.bottom=-92;
 sun.shadow.normalBias=.04;group.add(sky,sun);
 // Four continuous ground quadrants around an accessible cave cut.
 slab('Valley western meadow',-64,-52,-68,65,0,3,C.turfDark);
 slab('Valley eastern meadow',-20,64,-68,65,0,3,C.turf);
 slab('Village and forest meadow',-52,-20,8,65,0,3,C.turf);
 slab('Western cliffs beyond cave',-52,-20,-68,-40,0,3,C.turfDark);
 // Cave is 5 world units BELOW ground, with true access via a stepped path.
 slab('Walkable underground cavern',-52,-20,-40,8,-5,2.0,C.caveFloor);
 // Base under dirt, invisible except at the edges of the cave excavation.
 for(let i=0;i<15;i++){
   const top=-(i+1)*5/15;
   const z=7.5-i*1.15;
   buildingBox('Descending cavern stair '+i,-35,top-0.35,z,6,0.7,1.17,C.stone,true);
 }
 // Cave rims are mostly fenced; entrance at x -35,z 8 is open.
 for(const x of [-52.4,-19.6]){
  for(let z=-38;z<=7;z+=4) {
   buildingBox('Cave rail post '+x+z,x,.60,z,.5,1.2,.5,C.timber,true);
   buildingBox('Cave rail beam '+x+z,x,1.12,z,.37,.19,4.1,C.timber,true);
  }
 }
 // Cave mouth arch, walkable with ample space under the rock.
 for(const x of [-39,-31])buildingBox('Cave arch column '+x,x,1.7,8,.85,3.4,.9,C.cave,true);
 buildingBox('Cave arch crown',-35,3.5,8,8,.9,.85,C.cave);
 // Cavern ceiling is a semi-transparent shell rather than a camera-obstructing roof.
 const caveRoof=buildingBox('Cavern roof above the playable dungeon',-36,2.9,-17,31,.75,47,C.stoneDark,false);
 caveRoof.material=new THREE.MeshStandardMaterial({color:C.cave,roughness:.86,side:THREE.DoubleSide});
 owned.add(caveRoof.material);
 // The sides and rear are true underground enclosure, leaving the entrance open.
 for(const [n,x,z,w,d] of [['west',-51,-17,2,47],['east',-21,-17,2,47],['rear',-36,-40,31,1.3]]){
   buildingBox('Cavern enclosing rock wall '+n,x,-1.2,z,w,8.0,d,C.cave,true);
 }
 // Jagged overhead vaulting, cave alcoves and lanterns provide a recognizably
 // underground silhouette rather than a flat green terrain cut.
 for(let i=0;i<12;i++){
   const a=i*2.4,x=-36+Math.sin(a)*12,z=-17+Math.cos(a)*18;
   put('sphere','Subterranean rock vault '+i,mat(i%2?C.stoneDark:C.cave),x,2.0,z,
     2.5+(i%3),1.0+(i%2)*.5,2.5+(i%3),{geom:[1,0]});
 }
 const caveLights=[];
 for(const [x,z] of [[-45,-8],[-28,-9],[-44,-28],[-27,-32]]){
   buildingBox('Ancient dungeon torch holder',x,-2.65,z,.36,.65,.36,C.timber);
   put('cone','Crystal cave lamp',mat(C.crystal,.2,.1,.75),x,-1.8,z,.48,.75,.48,{geom:[1,1,6]});
   const light=new THREE.PointLight(0x59dfff,2.7,15,1.4);light.position.set(x,-1.6,z);
   group.add(light);caveLights.push(light);
 }
 // Walkable overworld roads (visual only, no collision side walls).
 slab('Village approach trail',-3,3,-65,55,.018,.037,C.road,false);
 for(const [x0,x1,z0,z1] of [
  [-25,6,20,25],[-36,-29,7,25],[0,26,-16,-10],[19,27,-24,-12],
  [22,29,-48,-24],[31,40,-50,-24],
 ])slab('Golden cobblestone path',x0,x1,z0,z1,.035,.055,C.road2,false);
 // Village cluster with open doorways and visible furnished interiors.
 const hamlet=[
  {x:-26,z:33,roof:C.roof,w:9,d:8},
  {x:14,z:35,roof:C.roof2,w:10,d:9},
  {x:29,z:23,roof:C.roof,w:9,d:8},
  {x:-7,z:20,roof:C.roof2,w:9,d:8},
 ];
 for(let h=0;h<hamlet.length;h++){
  const v=hamlet[h],w=v.w,d=v.d,x=v.x,z=v.z;
  slab('Cottage timber floor '+h,x-w/2,x+w/2,z-d/2,z+d/2,.14,.22,C.timber);
  for(let side of [-1,1])buildingBox('Cottage side plaster '+h+side,x+side*(w/2-.19),1.95,z,.38,3.9,d,C.plaster,true);
  buildingBox('Cottage back plaster '+h,x,1.95,z-d/2,.38+w-.38,3.9,.35,C.plaster,true);
  // South face: two side sections with an unblocked door (interior playable).
  for(let side of [-1,1])buildingBox('Cottage open door pillar '+h+side,x+side*(w/2-.85),1.70,z+d/2,w/2-1.55,3.4,.28,C.plaster,true);
  buildingBox('Cottage wooden door header '+h,x,3.65,z+d/2,2.05,.43,.35,C.timber);
  for(let side of [-1,1])buildingBox('Cottage beam '+h+side,x+side*(w/2-.3),2.3,z+d/2,.3,4.6,.31,C.timber);
  // roof overhead; open transparent cutaway instead of concealing the interior.
  const roof=buildingBox('Cottage roof cutaway '+h,x,4.18,z,w+1.0,.42,d+1.3,v.roof);
  roof.material=new THREE.MeshStandardMaterial({color:v.roof,roughness:.85,transparent:true,opacity:.38,depthWrite:false});owned.add(roof.material);
  buildingBox('Cottage table '+h,x,1,z-.6,2.0,.27,1.1,C.timberLight);
  for(let side of [-1,1])buildingBox('Cottage stool '+h+side,x+side*1.7,.4,z-.6,.75,.8,.75,C.timber);
  buildingBox('Cottage bed '+h,x-1.7,.42,z+1.3,1.7,.72,1.6,C.roof2);
  // chimney projected above cutaway roof
  buildingBox('Cottage chimney '+h,x-2.4,4.9,z-1.65,.9,1.8,.9,C.wallShade);
 }
 // Village square monument and fountain with jewel effects.
 put('cylinder','Village circular fountain',mat('#b8c9d2'),-20,.20,23,3.5,.45,3.5,{geom:[1,1,1,16]});
 put('cylinder','Fountain water',mat('#3ebde8',.19,.17,.2),-20,.47,23,2.25,.13,2.25,{geom:[1,1,1,20]});
 const random=rnd(101);
 // Forest treeline: broad low-poly canopy, mostly away from authored paths.
 const treeMat=mat(C.forest),trunkMat=mat(C.timber),leafMat=mat(C.leaf);
 const leaf2Mat=mat(C.leaf2);
 const trunkGeo=geo('cylinder',.24,.34,3.4,7),canopyGeo=geo('cone',1.6,3.8,7);
 const treeTrunks=new THREE.InstancedMesh(trunkGeo,trunkMat,89);
 const trees=new THREE.InstancedMesh(canopyGeo,leafMat,89);
 treeTrunks.castShadow=false;trees.castShadow=true;
 const instDummy=new THREE.Object3D();let treeCount=0;
 for(let i=0;i<360&&treeCount<89;i++){
  let x=-60+random()*120,z=-63+random()*118;
  if(x>-52&&x<-20&&z>-40&&z<8)continue;
  if(z<-20&&x>0&&x<53)continue; // castle
  if(z>15&&z<44&&x>-32&&x<40)continue; // village
  if(Math.abs(x)<7||Math.abs(x+34)<6&&z>-5&&z<24)continue;
  const sc=.65+random()*.65;
  instDummy.position.set(x,1.7*sc,z);instDummy.scale.setScalar(sc);instDummy.rotation.set(0,0,0);instDummy.updateMatrix();
  treeTrunks.setMatrixAt(treeCount,instDummy.matrix);
  instDummy.position.y=4.05*sc;instDummy.updateMatrix();trees.setMatrixAt(treeCount,instDummy.matrix);
  treeCount++;
 }
 treeTrunks.count=treeCount;trees.count=treeCount;group.add(treeTrunks,trees);
 // Colored mushroom groves and boulders ground visitors can route around.
 for(let i=0;i<35;i++){
  const x=-53+random()*108,z=8+random()*52;
  if(Math.abs(x)<5||x>-32&&x<42&&z<44)continue;
  put('sphere','Meadow rock '+i,mat(i%2?C.stone:C.earth),x,.26,z,.45+random()*.6,.4,.65+random()*.7,{geom:[1,0]});
  if(i%3===0){
   put('cylinder','Mushroom stem '+i,mat(C.plaster),x+1,.27,z+1,.13,.45,.13,{geom:[.2,.28,1,6]});
   put('cone','Mushroom cap '+i,mat(C.roof),x+1,.65,z+1,.50,.45,.50,{geom:[1,1,7]});
  }
 }
 // True 3D dungeon: two chambers, rock pillars, crystalline underground forest.
 for(let i=0;i<18;i++){
  const x=-49+random()*26,z=-35+random()*37;
  if(Math.abs(x+35)<4 || Math.abs(z+28)<3)continue;
  const h=1.1+random()*3;
  put('cone','Stalagmite '+i,mat(i%2?C.stoneDark:C.cave),x,-5+h/2,z,.5,h/2,.55,{geom:[1,2,6]});
 }
 // Tunnel dividers with broad route openings and recognizable entrance portals.
 buildingBox('Cave inner wall west',-45,-2.8,-14,7,4.4,.95,C.cave,true);
 buildingBox('Cave inner wall east',-27,-2.8,-14,6,4.4,.95,C.cave,true);
 for(const [x,z] of [[-47,-29],[-24,-26],[-29,-4],[-44,-4]]){
  put('cylinder','Cavern supporting stone pillar',mat(C.stoneDark),x,-2.7,z,.52,2.3,.52,{geom:[1,.9,1,8]});
  put('oct','Cavern radiant crystal cluster',mat(C.crystal,.24,.2,.6),x,-.3,z,.6,1.1,.65,{geom:[1,0]});
 }
 const runeMeshes=[[-45,-29],[-25,-27]].map(([x,z],i)=>{
   put('cylinder','Dungeon rune pedestal '+i,mat(C.stone),x,-4.53,z,.95,.5,.95,{geom:[1,1,1,8]});
   const crystal=put('oct','Dungeon rune to activate '+i,mat(C.crystal2,.12,.1,.68),
     x,-3.43,z,.65,1.03,.65,{geom:[1,0]});
   return {x,y:-5,z,mesh:crystal,lit:false};
 });
 const questCrystals=[];
 for(const [x,y,z,color] of [[-34,-3,-28,C.crystal2],[-20,1.2,23,C.gold],[36,7.7,-53,C.magic]]){
  const m=put('oct','Animated quest beacon',mat(color,.12,.19,.7),x,y,z,.65,.93,.65,{geom:[1,0]});
  questCrystals.push(m);
 }
 // Secret crystal cache behind the dungeon columns.
 for(let i=0;i<9;i++){
  const x=-48+random()*8,z=-35+random()*9;
  put('oct','Secret crystal growth '+i,mat(i%2?C.crystal:C.crystal2,.23,.15,.35),x,-4.4,z,.32,.8,.34,{geom:[1,0]});
 }
 // Castle main facade and courtyard. The door is a genuine colliding lock.
 // The overland courtyard is within the same broad ground plane.
 const walls=[
  ['North fortress wall',26,3.2,-62,55,6.4,1.3],
  ['East fortress wall',52,3.2,-42,1.6,6.4,40],
  ['West fortress wall',0,3.2,-42,1.6,6.4,40],
  ['Castle entry left wall',9,3.2,-23,18,6.4,1.5],
  ['Castle entry right wall',41,3.2,-23,22,6.4,1.5],
 ];
 walls.forEach(([n,x,y,z,sx,sy,sz])=>buildingBox(n,x,y,z,sx,sy,sz,C.wall,true));
 // Battlements: actual silhouette broken into crenels, atop wall segments.
 for(let x=1;x<53;x+=3.4){
  buildingBox('Castle back crenellation',x,7,-62,.95,1.2,1.6,C.stone);
  if(x<16||x>29)buildingBox('Castle gate crenellation',x,7,-23,1.2,1.1,1.8,C.stone);
 }
 for(let z=-60;z<-23;z+=3.4)for(const x of [0,52]){
  buildingBox('Castle side battlement',x,7,z,1.8,1.2,.95,C.stone);
 }
 for(const [x,z] of [[0,-62],[52,-62],[0,-23],[52,-23]]){
  put('cylinder','Masonry lookout tower',mat(C.wall),x,4.0,z,4.0,4.1,4.0,{geom:[1,1,1,10],shadow:true});
  put('cone','Copper lookout roof',mat(C.roof2),x,9.5,z,4.8,2.3,4.8,{geom:[1,1,8],shadow:true});
 }
 // Accessible stairwell leading to the second tier.
 for(let i=0;i<18;i++){
  const y=(i+1)*.35,z=-25.8-i*1.10;
  buildingBox('Playable castle stair '+i,37,y/2,z,5,y,1.25,C.stone,true);
 }
 slab('East upper gallery',31,43,-61,-43,6.3,.75,C.stone);
 slab('Upper castle crosswalk',10,43,-58,-49,6.3,.75,C.stone);
 // Upper-tier railings prevent falling from the castle. Only a few safe openings.
 for(const z of [-60,-49])for(let x=11;x<43;x+=3){
  // Leave the last stair landing open at x=34..41 on the south edge.
  if(z===-49 && x>=32)continue;
  buildingBox('Upper walkway safety wall',x,6.8,z,2.95,.96,.4,C.wallShade,true);
 }
 for(const x of [10.0,43.0])buildingBox('Upper parapet',x,6.8,-53.8,.4,.96,9.3,C.wallShade,true);
 // Walkable castle interior: separate rooms with open south entrance, stairs and balcony.
 for(let i=0;i<5;i++){
  const x=7+i*7;
  put('cylinder','Castle main hall stone column '+i,mat(C.wallShade),x,1.9,-40,.44,2.0,.44,{geom:[1,1,1,8],shadow:true});
  put('cylinder','Castle main hall stone plinth '+i,mat(C.stone),x,.25,-40,.76,.25,.76,{geom:[1,1,1,9]});
 }
 for(const [x,z] of [[12,-35],[27,-37],[47,-49]]){
  buildingBox('Castle golden treasure pedestal',x,.46,z,1.6,.92,1.6,C.timber);
  put('oct','Treasure gem on pedestal',mat(C.gold,.18,.2,.35),x,1.6,z,.53,.68,.48,{geom:[1,0]});
 }
 // Door shield blocks movement until cavern crystal quest is done.
 const gate=buildingBox('Sealed castle entry energy gate',23,2.8,-23.0,12,5.6,.55,C.magic,true);
 const gateMat=new THREE.MeshBasicMaterial({color:0x41efff,transparent:true,opacity:.41,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 owned.add(gateMat);gate.material=gateMat;
 const gateCollider=solids[solids.length-1];
 // Castle beacon is accessible on the upper crosswalk.
 const portalRings=[];
 for(let i=0;i<3;i++){
  const r=put('torus','Summit exit portal glowing ring '+i,mat(i%2?C.gold:C.magic,.16,.18,.7),12,7.9,-53,1.5+i*.16,1.5+i*.16,1.5+i*.16,{geom:[1, .09, 7, 24],rotation:[0,0,Math.PI/2]});
  portalRings.push(r);
 }
 // Distinct quest hub: cave to castle shortcut, but optional.
 const short=put('torus','Cave ancient teleport arch',mat(C.crystal,.1,.1,.55),-23,-3.1,-28,1.1,1.3,1.1,{geom:[1,.09,6,18],rotation:[0,Math.PI/2,0]});
 const gemMat=mat('#7ffaff',.22,.2,.4);
 const gems=level.gems.map((g,i)=>{
  const mesh=put('oct','Collectible shard '+i,gemMat,g.x,g.y,g.z,.42,.55,.42,{geom:[1,0]});
  return {...g,got:false,phase:i*.75,mesh};
 });
 const heartMat=mat('#ff5792',.33,.04,.25);
 const hearts=level.hearts.map((h,i)=>{
  const mesh=put('sphere','Health heart '+i,heartMat,h.x,h.y,h.z,.55,.48,.45,{geom:[1,1]});
  return {...h,got:false,mesh};
 });
 const flags=level.flags.map((f,i)=>{
  const mesh=put('cylinder','Checkpoint obelisk '+i,mat(C.gold,.23,.22,.45),f.x,f.y+1.55,f.z,.22,1.4,.22,{geom:[1,1,1,8]});
  return {...f,active:false,mesh};
 });
 const spikes=level.spikes.map((s,i)=>{
  const o=put('cone','Visible ground obstacle '+i,mat(i%2?C.stoneDark:C.crystal2),s.x,s.y-.2,s.z,1.0,1.1,1.0,{geom:[1,1,5]});
  return {...s,mesh:o};
 });
 // Guided trail stones; milestones mark the path without cluttering movement.
 for(const [x,z,label] of [[-20,26,'VILLAGE'],[-34,10,'CAVES'],[23,-18,'CASTLE']]){
  buildingBox('Quest wayfinder '+label,x,1.2,z,1.5,2.4,.5,C.timberLight);
  put('cone','Quest direction indicator '+label,mat(C.gold,.25,.15,.2),x,2.5,z,.62,.72,.62,{geom:[1,1,4]});
 }
 function openCastle(){
   if(!gate.visible)return;
   gate.visible=false;const i=solids.indexOf(gateCollider);if(i>=0)solids.splice(i,1);
 }
 function applyQuality(q){
  sun.castShadow=q.shadow>0;
  trees.visible=q.far;treeTrunks.visible=true;
  if(q.shadow>0&&sun.shadow.mapSize.x!==q.shadow){
   sun.shadow.mapSize.set(q.shadow,q.shadow);
   if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
  }
 }
 const world={
  level,theme:{name:'valley'},group,minY:-7,solids,movers:[],gems,hearts,
  springs:[],flags,saws:[],spikes,goal:level.goal,castMeshes:[],tube:null,
  tubePower:0,castleOpen:false,questIndex:0,runes:runeMeshes,shadowSize:108,
  activateRune(i){const r=this.runes[i];if(!r||r.lit)return false;
    r.lit=true;r.mesh.material=mat(C.gold,.13,.23,.9);r.mesh.scale.setScalar(1.24);return true;},
  stepMovers(){},
  completeQuest(i){if(i===1){this.castleOpen=true;openCastle()}},
  applyQuality,render(dt,t,camPos,playerPos){
   for(const g of gems){
    g.mesh.visible=!g.got;
    if(!g.got){g.mesh.position.y=g.y+Math.sin(t*2.3+g.phase)*.17;g.mesh.rotation.y=t*1.2+g.phase;}
   }
   for(const h of hearts)h.mesh.visible=!h.got;
   for(const [i,r] of runeMeshes.entries()){
     r.mesh.rotation.y=t*(r.lit?1.6:.7);
     r.mesh.position.y=-3.43+Math.sin(t*2.2+i*1.2)*.15;
   }
   for(const [i,p] of questCrystals.entries()){
    p.visible=this.questIndex<=i;
    p.position.y=([-3,1.2,7.7][i])+Math.sin(t*2+i)*.18;
    p.rotation.y=t*(.65+i*.26);
   }
   portalRings.forEach((r,i)=>{r.rotation.y=t*(i%2?-.5:.6);r.material.emissiveIntensity=this.questIndex>=3?.8:.16});
   short.rotation.z=t*.16;
   gateMat.opacity=.22+.16*Math.sin(t*2.8);
   // Don't obstruct the camera in the low underground rooms.
   const underground=!!(playerPos&&playerPos.y<-1.5);
   scene.background.set(underground?'#102338':'#b9ddec');
   scene.fog.color.set(underground?'#26394a':'#b6dce8');
   scene.fog.near=underground?10:90;scene.fog.far=underground?72:210;
   sun.intensity=underground?.52:2.35;
   sky.intensity=underground?.58:1.45;
   for(let i=0;i<caveLights.length;i++)
     caveLights[i].intensity=underground?2.7:.10;
  },
  dispose(){
    scene.remove(group);scene.fog=null;
    group.traverse(o=>{if(o.isMesh){if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material)}});
    for(const resource of owned){if(resource&&resource.dispose)resource.dispose();}
  }
 };
 applyQuality(quality);
 return world;
}

