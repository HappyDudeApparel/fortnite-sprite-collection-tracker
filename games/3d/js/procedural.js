// Sprite Arena 3D — light, fully three-dimensional procedural Sprite prototypes.
// C7S4 Bush/Crown proportions and colors sampled from the Locker's base artwork.
// Ghost/Earth are recoverable stand-ins pending their historical Blender source.
import * as THREE from 'three';

const mat=(hex,rough=.48,metal=0)=>new THREE.MeshPhysicalMaterial({color:hex,roughness:rough,metalness:metal,clearcoat:.24,clearcoatRoughness:.2});
const M={
 tan:mat('#d6b18b'), earth:mat('#6b4938'), earth2:mat('#986743'),
 bark:mat('#69442d'), barkLight:mat('#b47b52'),
 green:mat('#3a9d62'), lime:mat('#87db73'), forest:mat('#23764c'),
 red:mat('#dc1029',.21), redDark:mat('#9d1022',.28),
 gold:mat('#efad21',.22,.58), shine:mat('#ffe36d',.22,.28),
 eye:mat('#141524',.13), white:mat('#f9fdff',.12), pink:mat('#cc7d74',.6),
 ghost:new THREE.MeshPhysicalMaterial({color:'#c7edff',transparent:true,opacity:.86,roughness:.13,metalness:.03,clearcoat:1,depthWrite:true}),
 ghostDark:mat('#263776',.14), ghostBlue:mat('#84bdf9',.3)
};
function add(g,geo,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){
 const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
function ball(g,m,x,y,z,sx,sy,sz){return add(g,new THREE.SphereGeometry(1,14,10),m,x,y,z,sx,sy,sz)}
function box(g,m,x,y,z,sx,sy,sz){return add(g,new THREE.BoxGeometry(1,1,1),m,x,y,z,sx,sy,sz)}
function cylinder(g,m,x,y,z,r1,r2,len,segments=9){return add(g,new THREE.CylinderGeometry(r1,r2,len,segments),m,x,y,z)}
function leaf(g,x,y,z,angle=0,material=M.green,scale=.26){
 const p=ball(g,material,x,y,z,scale*.65,scale*1.3,scale*.4);
 p.rotation.z=angle;p.rotation.y=angle*.32;return p;
}
function face(g,y=1.7,z=.52,eyeDist=.32,eyeY=.07){
 for(const side of [-1,1]){
   ball(g,M.eye,side*eyeDist,y+eyeY,z,.115,.132,.067);
   ball(g,M.white,side*eyeDist-.033,y+eyeY+.042,z+.065,.033,.044,.022);
 }
 ball(g,M.eye,0,y-.26,z+.004,.075,.036,.038);
}
function roundedBody(g,material,w,h,d,y){
 const s=new THREE.Shape(),r=.26, x=-w/2,z=-h/2;
 s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);
 s.lineTo(x+w,z+h-r);s.quadraticCurveTo(x+w,z+h,x+w-r,z+h);
 s.lineTo(x+r,z+h);s.quadraticCurveTo(x,z+h,x,z+h-r);
 s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
 const geometry=new THREE.ExtrudeGeometry(s,{depth:Math.max(.1,d-.16),steps:1,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:2,curveSegments:5});
 geometry.translate(0,0,-(d-.16)/2);
 return add(g,geometry,material,0,y,0);
}
function spriteBush(root){
 const core=new THREE.Group();root.add(core);
 roundedBody(core,M.tan,1.55,1.45,.78,1.56);
 // Bark-coloured sides, layered forearms and blocky boots.
 box(core,M.earth,0,.98,-.35,1.42,.37,.29);
 for (const side of [-1,1]){
   box(core,M.forest,side*.44,.30,-.10,.25,.68,.31);
   ball(core,M.earth2,side*.76,1.02,.39,.36,.32,.37);
   ball(core,M.earth,side*.83,1.00,.66,.30,.30,.28);
   for(let j=0;j<3;j++)ball(core,M.bark,side*(.73+(j-1)*.17),.86,.79,.14,.15,.18);
 }
 for(let i=0;i<17;i++){
  const a=i*2.399,xx=Math.sin(a)*(.15+Math.sqrt(i/17)*.74),zz=Math.cos(a)*(.15+Math.sqrt(i/17)*.35);
  const color=i%4===0?M.lime:i%3===0?M.forest:M.green;
  leaf(core,xx,2.38+((i*7)%5)*.037,zz,Math.sin(a)*.6,color,.27+(i%3)*.026);
 }
 face(core,1.83,.52,.31,.025);
 for(let i=0;i<6;i++)ball(core,M.earth2,(-2.5+i)*.19,1.48,.53,.035,.03,.024);
 return {root,animate(t,attack){core.position.y=.035*Math.sin(t*3);core.rotation.z=.018*Math.sin(t*2);root.rotation.z=0;core.scale.setScalar(1+attack*.04)}};
}
function spriteCrown(root){
 const core=new THREE.Group();root.add(core);
 roundedBody(core,M.red,1.36,1.62,.78,1.27);
 for(const side of [-1,1]){
  ball(core,M.gold,side*.78,1.26,0,.22,.19,.22);
  cylinder(core,M.gold,side*.46,.27,0,.125,.14,.25);
  ball(core,M.shine,side*.46,.10,.13,.13,.09,.12);
 }
 // Gilded crown brim, five golden irregular prongs and ruby sockets.
 cylinder(core,M.gold,0,2.18,0,.84,.78,.23,12);
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,xx=Math.sin(a)*.68,zz=Math.cos(a)*.48;
  const sp=add(core,new THREE.ConeGeometry(.175,.62+(i%2)*.09,6),M.gold,xx,2.58,zz);
  sp.rotation.z=-xx*.23;
  ball(core,M.shine,xx,2.91+(i%2)*.04,zz,.075,.07,.075);
 }
 face(core,1.56,.53,.33,.045);
 // Lifted golden moustache curls and little beard crest.
 for(const side of [-1,1]){
  const st=ball(core,M.gold,side*.16,1.23,.61,.24,.08,.07);st.rotation.z=side*.34;
  ball(core,M.gold,side*.37,1.29,.61,.072,.09,.045);
 }
 add(core,new THREE.ConeGeometry(.095,.19,6),M.gold,0,1.01,.61).rotation.z=Math.PI;
 return {root,animate(t,attack){core.position.y=.04*Math.sin(t*3.2);core.rotation.z=.022*Math.sin(t*1.7);core.scale.set(1+attack*.04,1+attack*.05,1+attack*.04)}};
}
function spriteGhost(root){
 const core=new THREE.Group();root.add(core);
 ball(core,M.ghost,0,1.55,0,.77,.94,.66);
 const taper=add(core,new THREE.ConeGeometry(.69,1.22,9),M.ghost,0,.62,0);
 taper.rotation.z=Math.PI;
 for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5;ball(core,M.ghostBlue,Math.cos(a)*.43,.20,Math.sin(a)*.30,.17,.45,.18);
 }
 for(const side of [-1,1]){
  ball(core,M.ghost,side*.77,1.42,0,.23,.37,.23);
  ball(core,M.ghostDark,side*.29,1.73,.592,.16,.22,.065);
  ball(core,M.white,side*.32-.035,1.82,.646,.04,.065,.025);
 }
 ball(core,M.ghostDark,0,1.35,.60,.13,.09,.047);
 return {root,animate(t,attack){core.position.y=.20+Math.sin(t*2.9)*.10;core.rotation.z=.065*Math.sin(t*1.8);core.scale.setScalar(1+attack*.08)}};
}
function spriteEarth(root){
 const core=new THREE.Group();root.add(core);
 ball(core,M.earth2,0,1.57,0,.71,.82,.66);
 ball(core,M.bark,0,.88,-.08,.54,.54,.46);
 for(let i=0;i<7;i++){
  const a=i*2.39;ball(core,i%2?M.earth:M.earth2,Math.sin(a)*.46,1.07+Math.cos(a)*.24,Math.cos(a)*.4,.23,.25,.23);
 }
 // Thin trunk and canopy; foliage is a crown extension, not another head.
 cylinder(core,M.bark,0,2.35,0,.12,.20,.65);
 for(let i=0;i<8;i++){const a=i*Math.PI*2/8;leaf(core,Math.cos(a)*.31,2.65+Math.sin(a*3)*.08,Math.sin(a)*.26,a*.18,i%3===0?M.lime:M.green,.25);}
 face(core,1.83,.595,.28,0);
 for(const s of [-1,1]){
  cylinder(core,M.bark,s*.40,.27,0,.21,.23,.55);
  ball(core,M.earth,s*.46,.15,.08,.25,.15,.27);
 }
 const arms=[];
 for(const side of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(side*.61,1.65,0);core.add(pivot);
  const stem=cylinder(pivot,M.bark,side*.62,-.10,0,.14,.22,1.33);stem.rotation.z=-side*Math.PI/2;
  for(let k=0;k<3;k++){
    const twig=cylinder(pivot,k%2?M.barkLight:M.bark,side*(.66+k*.19),.16+(k%2)*.16,0,.055,.09,.53);
    twig.rotation.z=side*(.55+k*.23);
    leaf(pivot,side*(.80+k*.20),.44+(k%2)*.10,0,side*.5,k%2?M.lime:M.green,.13);
  }
  ball(pivot,M.barkLight,side*1.29,-.10,0,.22,.22,.23);
  arms.push({pivot,side});
 }
 return{root,animate(t,attack){
   core.position.y=.025*Math.sin(t*2);
   for(const{pivot,side}of arms){
     pivot.scale.x=1+attack*1.05; // extends branch reach beyond ordinary arm span
     pivot.rotation.z=side*(.14*Math.sin(t*2.2)-attack*.24);
     pivot.rotation.y=side*(attack*.34+Math.sin(t*1.1)*.07);
   }
 }};
}
export const PROCEDURAL = new Set(['ghost-sprite','earth-sprite','bush-sprite','crown-sprite']);
export function makeProceduralSprite(id){
 const root=new THREE.Group();
 const visual=id==='bush-sprite'?spriteBush(root):id==='crown-sprite'?spriteCrown(root):id==='earth-sprite'?spriteEarth(root):spriteGhost(root);
 root.userData.spriteId=id;
 return {root,visual,mixer:null,actions:{},height:3};
}

