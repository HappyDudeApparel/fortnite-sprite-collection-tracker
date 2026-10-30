// Additional fully three-dimensional character bodies, designed from the canonical
// Locker C7S3/C7S4 base portraits. No planes or collectible image billboards.
// Klombo finishes share a geometry grammar; material and live animated hologram vary.
import * as THREE from 'three';
const mat=(color,rough=.42,metal=0,glow=0)=>new THREE.MeshPhysicalMaterial({
 color,roughness:rough,metalness:metal,clearcoat:.48,
 emissive:color,emissiveIntensity:glow,clearcoatRoughness:.23
});
const mats={
 eye:mat('#06152d',.12),shine:mat('#ffffff',.09),mouth:mat('#3b163d'),
 aqua:mat('#27c8dc',.27),aquaLight:mat('#7ff0ff',.19,.04,.25),
 waterShine:mat('#d0ffff',.14,0,.4), waterDark:mat('#1588b7',.32),
 fire:mat('#ff8b16',.29),flame:mat('#ff4d1b',.21,.02,.2),
 flameYellow:mat('#ffd329',.2,.01,.25),fireShade:mat('#cd3e16',.25),
 jonesy:mat('#cb2467',.3),coat:mat('#c2a26d',.65),
 coatLight:mat('#e7c692',.52),coatDark:mat('#6c482b',.78),
 hair:mat('#f6a02b',.44),glasses:mat('#121a29',.11,.25),
 glassesRed:mat('#f25437',.28,.15),
 base:mat('#f42abd',.23,0,.12),baseLight:mat('#f881e0',.28),
 cream:mat('#fff5dc',.47),horn:mat('#ba69f3',.27),
 claw:mat('#9c4ac7',.32),blue:mat('#038dbd',.16,.1,.2),
 green:mat('#157338',.25,.05,.22),greenLight:mat('#40ec6b',.16,.04,.65),
 greenDark:mat('#073421',.31),cyan:mat('#40eaff',.12,.05,.52),
 lilac:mat('#a46dff',.13,.12,.55),purple:mat('#3d4de0',.22,.05,.38)
};
const geom={sphere:new THREE.SphereGeometry(1,16,12),box:new THREE.BoxGeometry(1,1,1)};
function mesh(parent,g,m,x,y,z,sx=1,sy=1,sz=1){
 const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
 o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function orb(g,m,x,y,z,w,h,d){return mesh(g,geom.sphere,m,x,y,z,w,h,d)}
function cube(g,m,x,y,z,w,h,d){return mesh(g,geom.box,m,x,y,z,w,h,d)}
function cone(g,m,x,y,z,r=.14,height=.35){
 return mesh(g,new THREE.ConeGeometry(r,height,7),m,x,y,z);
}
function face(g,y,z,sep=.32){
 for(const sign of [-1,1]){
   orb(g,mats.eye,sign*sep,y,z,.16,.17,.07);
   orb(g,mats.shine,sign*sep-.05,y+.052,z+.067,.045,.054,.023);
 }
}
function creatureCore(g,body,eyeY,faceZ,bodyScale){
 const root=new THREE.Group();g.add(root);
 orb(root,body,0,bodyScale.y+.42,0,bodyScale.x,bodyScale.y,bodyScale.z);
 face(root,eyeY,faceZ,.31);
 return root;
}
export function makeWater(root){
 const core=new THREE.Group();root.add(core);
 const body=creatureCore(core,mats.aqua,1.62,.52,{x:.71,y:.76,z:.59});
 const highlight=orb(core,mats.aquaLight,-.22,1.4,.49,.38,.35,.12);highlight.material.transparent=true;highlight.material.opacity=.48;
 orb(core,mats.waterDark,0,1.16,.59,.11,.10,.05);
 for(let s of [-1,1]){
  orb(core,mats.aqua,s*.78,1.22,0,.2,.32,.22);
  orb(core,mats.aqua,s*.4,.27,.08,.27,.35,.25);
 }
 const bubbles=[];
 for(let i=0;i<5;i++){
  const b=orb(core,i%2?mats.waterShine:mats.aquaLight,Math.sin(i*1.8)*.29,2.37+i*.09,Math.cos(i*.9)*.19,.10+(i%3)*.026,.10+(i%3)*.026,.10+(i%3)*.026);
  bubbles.push(b);
 }
 return {root,animate(t,attack){
   core.position.y=.06*Math.sin(t*2.6);core.rotation.z=.045*Math.sin(t*1.7);
   bubbles.forEach((b,i)=>{b.position.y=2.38+i*.10+Math.sin(t*2.2+i*1.4)*.12; b.scale.setScalar((.09+(i%3)*.025)*(1+attack*.45));});
 }};
}
export function makeFire(root){
 const core=new THREE.Group();root.add(core);
 orb(core,mats.fire,0,1.55,0,.67,.83,.57);
 orb(core,mats.flameYellow,0,.92,.23,.43,.31,.41);
 for(let s of [-1,1]){
  orb(core,mats.fire,s*.71,1.32,0,.18,.26,.20);
  orb(core,mats.fire,s*.39,.25,.10,.24,.26,.23);
  // confident angular face / fierce expression from reference
  orb(core,mats.eye,s*.29,1.64,.55,.08,.075,.04);
  let brow=cube(core,mats.fireShade,s*.29,1.80,.59,.26,.045,.035);brow.rotation.z=-s*.28;
 }
 let mouth=orb(core,mats.fireShade,0,1.34,.56,.18,.037,.038);
 const flames=[];
 for(let i=0;i<7;i++){
  let x=(i-3)*.21,sz=.31+Math.sin(i)*.18;
  let f=cone(core,i%2===0?mats.flame:mats.flameYellow,x,2.27+.11*Math.cos(i),sz,.21,.62+(i%3)*.16);
  f.rotation.z=(i-3)*-.14;flames.push(f);
 }
 return {root,animate(t,attack){
   core.position.y=.04*Math.sin(t*3);
   flames.forEach((f,i)=>{f.rotation.z=(i-3)*-.13+Math.sin(t*5.4+i)*.18;f.scale.y=1+attack*.45+.11*Math.sin(t*7+i);});
 }};
}
export function makeJonesy(root){
 const core=new THREE.Group();root.add(core);
 // pink-red block face with red-orange swept hair and theatrical sunglasses
 orb(core,mats.jonesy,0,1.73,0,.67,.68,.55);
 const coat=cube(core,mats.coat,0,.95,0,1.14,1.12,.72);
 const lapels=[];
 for(let s of [-1,1]){
   const lap=cube(core,mats.coatLight,s*.29,1.17,.41,.36,.69,.13);
   lap.rotation.z=-s*.18;lapels.push(lap);
   orb(core,mats.coatDark,s*.74,1.06,0,.24,.39,.27);
   orb(core,mats.jonesy,s*.82,.72,.21,.21,.20,.21);
   cube(core,mats.coatDark,s*.39,.33,.03,.34,.54,.36);
   orb(core,mats.coatDark,s*.39,.12,.2,.23,.13,.28);
 }
 cube(core,mats.coatDark,0,.62,.42,.68,.15,.10);
 cube(core,mats.glassesRed,0,1.87,.56,1.15,.12,.14);
 for(let s of [-1,1]){
   let lens=cube(core,mats.glasses,s*.33,1.86,.64,.47,.29,.11);
   lens.rotation.z=-s*.045;
   let gleam=cube(core,mats.shine,s*.44,1.93,.70,.12,.023,.014);gleam.material.transparent=true;gleam.material.opacity=.7;
 }
 orb(core,mats.jonesy,0,1.54,.58,.13,.12,.1);
 const hairs=[];
 for(let i=0;i<6;i++){
   let f=cone(core,mats.hair,(i-2.5)*.24,2.38+.06*Math.cos(i),-.05,.17,.50+(i%2)*.12);
   f.rotation.z=-.28+(i*.06);hairs.push(f);
 }
 return {root,animate(t,attack){
   core.position.y=Math.sin(t*2.8)*.035;core.rotation.z=Math.sin(t*1.6)*.025;
   lapels.forEach((l,i)=>{l.rotation.z=(i?-.18:.18)+Math.sin(t*4+i)*.015*attack;});
   hairs.forEach((h,i)=>{h.rotation.z=-.28+i*.06+Math.sin(t*4+i)*.035;});
 }};
}
function klomboPalette(variant){
 const p={
  base:{head:mats.base,back:mats.baseLight,belly:mats.cream,spike:mats.horn,foot:mats.claw,glow:'#ff4de3'},
  cheat:{head:mats.green,back:mats.greenDark,belly:mats.green,spike:mats.greenLight,foot:mats.greenDark,glow:'#5fff4e'},
  loot:{head:mats.cyan,back:mats.purple,belly:mats.lilac,spike:mats.cyan,foot:mats.purple,glow:'#56eaff'}
 };return p[variant]||p.base;
}
function glowMat(color){
 return new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});
}
export function makeKlombo(root,variant='base'){
 const p=klomboPalette(variant),core=new THREE.Group();root.add(core);
 // One common species with identical silhouette and animation, irrespective of skin.
 // Long rectangular rounded snout, oversize baby-blue side eyes, distinct horns, teeth, belly.
 const head=cube(core,p.head,0,1.88,0,1.80,.86,.91);
 orb(core,p.head,-.72,1.90,.02,.22,.38,.45);orb(core,p.head,.72,1.90,.02,.22,.38,.45);
 cube(core,p.back,0,1.17,0,1.25,.70,.75);
 cube(core,p.belly,0,.97,.42,1.05,.52,.12);
 orb(core,p.belly,0,.77,.32,.45,.27,.22);
 for(let s of [-1,1]){
   orb(core,p.foot,s*.44,.34,.03,.25,.24,.28);
   orb(core,p.foot,s*.73,1.11,0,.24,.23,.26);
   orb(core,mats.blue,s*.65,2.0,.50,.29,.30,.12);
   orb(core,mats.eye,s*.65,2.0,.594,.18,.21,.049);
   orb(core,mats.shine,s*.65-.056,2.084,.634,.059,.063,.021);
 }
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.43;
  const h=cone(core,p.spike,x,2.47,-.13,.21,.62+(i===1||i===2?.12:0));
  h.rotation.z=(i-1.5)*-.18;
 }
 for(let i=0;i<5;i++){
  const tooth=cone(core,p.belly,(i-2)*.28,1.43,.501,.074,.17);
  tooth.rotation.z=Math.PI;
 }
 // Small dorsal plates (3D silhouette visible in the side view)
 for(let i=0;i<3;i++)cone(core,p.spike,(i-1)*.42,1.36,.45,.13,.25);
 const overlays=[], pixels=[];
 if(variant!=='base'){
  const gm=glowMat(p.glow),material=(color)=>glowMat(color);
  // GLB-safe cyber decoration (no bitmap billboards): scrolling low-profile
  // 3D grille lines and glowing squares on all visible front/side surfaces.
  for(let i=0;i<9;i++){
    let y=.76+i*.19;
    const line=cube(core,gm,0,y,.484,1.3,.013,.014);line.castShadow=false;overlays.push(line);
  }
  for(let i=0;i<10;i++){
    let x=-.72+i*.16;
    const line=cube(core,gm,x,1.89,.498,.012,.82,.017);line.castShadow=false;overlays.push(line);
  }
  for(let i=0;i<24;i++){
    const x=Math.sin(i*3.67)*.73,y=.83+(i%9)*.18;
    const s=cube(core,material(i%2?variant==='loot'?'#ca6cff':'#73ffae':p.glow),x,y,.52,.035+(i%3)*.013,.035+(i%3)*.013,.014);
    s.castShadow=false;pixels.push(s);
  }
 }
 const aura=[];
 if(variant!=='base')for(let i=0;i<8;i++){
   let dot=orb(core,variant==='cheat'?mats.greenLight:mats.lilac,0,1.45,0,.045,.045,.045);
   dot.castShadow=false;aura.push(dot);
 }
 const outline=variant!=='base'?new THREE.Group():null;
 if(outline){
  // Emissive wireframe only where it follows the mesh faces, not a flat portrait.
  let wire=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.81,.88,.93)),
    new THREE.LineBasicMaterial({color:p.glow,transparent:true,opacity:.75,blending:THREE.AdditiveBlending}));
  wire.position.set(0,1.88,0);outline.add(wire);core.add(outline);
 }
 return {root,animate(t,attack){
  core.position.y=.06*Math.sin(t*3.6);core.rotation.z=.05*Math.sin(t*2.1);
  head.rotation.z=attack*.035*Math.sin(t*8);
  for(let i=0;i<overlays.length;i++){
    const o=overlays[i];
    if(i<9)o.position.y=.76+((i*.19+t*(variant==='cheat'?.43:.70))%1.64);
    o.material.opacity=variant==='cheat'?.20+.45*(.5+.5*Math.sin(t*7+i)):.14+.55*(.5+.5*Math.sin(t*9+i));
  }
  for(let i=0;i<pixels.length;i++)pixels[i].material.opacity=.18+.8*(.5+.5*Math.sin(t*(variant==='cheat'?5.2:7.6)+i*2));
  for(let i=0;i<aura.length;i++){let a=i*Math.PI/4+t*(variant==='cheat'?.8:1.4);
    aura[i].position.set(Math.cos(a)*1.05,1.22+Math.sin(t*3+i)*.45,Math.sin(a)*.7);
  }
  if(outline)outline.rotation.y=.012*Math.sin(t*3);
 }};
}

