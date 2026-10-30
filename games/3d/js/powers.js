// Camera-facing 3D power effects — a double expanding rainbow wave for Dash,
// and individual palettes for the recovered and C7S4 Sprite models.
import * as THREE from 'three';
const PALETTES={
 citrus:['#ff4558','#ffa634','#ffe65c','#72ee88','#42d9ff','#7a7cff','#d273ff','#ff72c4'],
 'earth-sprite':['#a5ee77','#4ccf77','#d6aa5c','#60cf8f'],
 'ghost-sprite':['#b4f7ff','#7bd9ff','#c19cff','#eefcff'],
 'bush-sprite':['#b5ed63','#60ca76','#dbb578','#8deaa3'],
 'crown-sprite':['#fff1ab','#ffce35','#ff891a','#ff5362']
};
function stars(n,mat){
 const sh=new THREE.Shape(),outer=.23,inner=.115;
 for(let i=0;i<n*2;i++){let a=-Math.PI/2+i*Math.PI/n,r=i%2===0?outer:inner;
 let x=Math.cos(a)*r,y=Math.sin(a)*r;
 if(i===0)sh.moveTo(x,y);else sh.lineTo(x,y);
 }sh.closePath();return new THREE.Mesh(new THREE.ShapeGeometry(sh),mat);
}
export class PowerBurst {
 constructor(scene,sparks){
  this.scene=scene;this.sparks=sparks;this.root=new THREE.Group();scene.add(this.root);
  this.waves=[];this.beacons=[];this.active=false;
  for(let wave=0;wave<2;wave++){
   const group=new THREE.Group();this.root.add(group);
   const mats=[];
   for(let i=0;i<8;i++){
    const m=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.83,1.09,7,1,i*Math.PI/4+.025,Math.PI/4-.05),m);
    ring.rotation.x=-Math.PI/2;group.add(ring);mats.push(m);
   }
   this.waves.push({group,mats,delay:wave*.32});
  }
  for(let i=0;i<16;i++){
   const m=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
   const star=stars(5,m);star.rotation.x=-Math.PI/2;
   this.root.add(star);this.beacons.push(star);
  }
  this.root.visible=false;this.t=0;this.id='citrus';
 }
 start(id,x,y,z){
  this.id=id;this.t=0;this.active=true;this.root.visible=true;
  this.root.position.set(x,y+.25,z);
  const palette=PALETTES[id]||PALETTES.citrus;
  for(const wave of this.waves)wave.mats.forEach((m,i)=>m.color.set(palette[i%palette.length]));
  for(let i=0;i<this.beacons.length;i++)this.beacons[i].material.color.set(palette[i%palette.length]);
  this.emit(0);
 }
 emit(wave){
  if(!this.active)return;
  const palette=PALETTES[this.id]||PALETTES.citrus;
  for(let i=0;i<(this.id==='citrus'?72:38);i++){
   const c=new THREE.Color(palette[i%palette.length]);
   const a=(i/(this.id==='citrus'?72:38))*Math.PI*2+Math.random()*.18;
   const speed=4.5+Math.random()*5;
   this.sparks.emit(this.root.position.x,this.root.position.y+1+Math.random()*.7,this.root.position.z,
    Math.cos(a)*speed,(Math.random()-.25)*3.4,Math.sin(a)*speed,.55+Math.random()*.4,
    .3+Math.random()*.36,.025,c.r,c.g,c.b,1,1.0,1.1);
  }
 }
 update(dt){
  if(!this.active)return;
  this.t+=dt;
  for(const wave of this.waves){
   const k=Math.max(0,(this.t-wave.delay)/.65),visible=k<=1&&this.t>=wave.delay;
   wave.group.visible=visible;
   if(visible){wave.group.scale.setScalar(.12+5.0*k);wave.group.position.y=.14+.6*k;
      for(const m of wave.mats)m.opacity=.74*Math.sin(Math.PI*Math.min(1,k))*.78;
   }
  }
  for(let i=0;i<this.beacons.length;i++){
    const star=this.beacons[i],k=this.t/.98,theta=i*Math.PI*2/this.beacons.length;
    star.visible=k<1;
    star.position.set(Math.cos(theta)*(.15+4.8*k),.38+(i%3)*.12+Math.sin(k*Math.PI)*.36,Math.sin(theta)*(.15+4.8*k));
    star.rotation.z=this.t*6+i;star.scale.setScalar(Math.max(.05,1.3-k));
    star.material.opacity=.8*Math.max(0,1-k);
  }
  if(this.t>1.04){this.active=false;this.root.visible=false;}
 }
 dispose(){this.scene.remove(this.root);this.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}})}
}

