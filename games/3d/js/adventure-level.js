// Connected multi-tier adventure. Kept separate from the original Classic physics/data.
export const VALLEY = {
 id:'whispering-valley', name:'Whispering Valley',
 tagline:'Explore the village, descend into crystal caves, storm the castle and unlock the summit portal.',
 theme:'meadow', adventure:true, killY:-45,
 spawn:{x:0,y:0,z:47},
 // One broad surface, separate cavern deck, upper castle gallery. Enemy patrol bands are isolated by height.
 islands:[
  {x:0,z:0,w:63,d:66,y:0,low:false,arrive:null},
  {x:-36,z:-20,w:15,d:19,y:-5,low:false,arrive:null},
  {x:25,z:-51,w:20,d:13,y:6.3,low:false,arrive:null},
 ],
 gems:[
  ...[[0,47],[4,35],[-11,29],[-20,23],[-25,15],[-34,8],[-35,-2],[-35,-15],[-35,-28],[-22,-31],[0,-26],[18,-16],[24,-28],[36,-36],[37,-44],[36,-53],[26,-53],[12,-53]].map(([x,z],i)=>({x,z,y:i>=14?7.5:i>=6&&i<=9?-3.7:1.2})),
  ...[[17,39],[-41,26],[-52,-5],[47,22],[45,-14],[-8,-19],[-34,-36],[5,-56],[37,5]].map(([x,z])=>({x,z,y:1.25})),
 ],
 hearts:[{x:-20,y:1.4,z:19},{x:-36,y:-3.5,z:-23},{x:27,y:1.4,z:-26}],
 flags:[{x:-19,y:0,z:24},{x:-34,y:-5,z:-28},{x:24,y:0,z:-19},{x:36,y:6.3,z:-53}],
 enemies:[
  {type:'ghost',x:-10,y:0,z:25,r:7,isl:0},{type:'stump',x:-37,y:0,z:22,r:6,isl:0},
  {type:'alien',x:37,y:0,z:10,r:8,isl:0},{type:'cthulhu',x:11,y:0,z:-11,r:7,isl:0},
  {type:'stump',x:-38,y:-5,z:-19,r:8,isl:1},{type:'ghost',x:-31,y:-5,z:-31,r:6,isl:1},
  {type:'alien',x:26,y:0,z:-34,r:6,isl:0},
  {type:'yeti',x:31,y:6.3,z:-53,r:7,isl:2,guardian:true},
 ],
 springs:[], movers:[], saws:[],
 spikes:[{x:-17,y:0.9,z:-4,r:0.8},{x:7,y:.9,z:-12,r:.8},{x:42,y:.9,z:-39,r:.8}],
 goal:{x:12,y:6.3,z:-53},
 quests:[
  {id:'village',name:'Restore the village beacon',x:-20,y:0,z:23,range:2.6,require:0},
  {id:'cave',name:'Awaken the crystal heart',x:-34,y:-5,z:-28,range:2.7,require:1},
  {id:'castle',name:'Raise the castle ward',x:36,y:6.3,z:-53,range:2.7,require:2},
 ],
 gemCount:27,
};

