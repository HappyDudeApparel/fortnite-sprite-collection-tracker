// Playable and enemy character definitions. Add new rigged GLBs here.
export const PLAYABLE = {
  citrus: {
    id: 'citrus', name: 'Dash', file: 'citrus', scale: 0.86,
    clips: { idle: 'Idle', walk: 'Walk', jump: 'Jump', attack: 'Bite_InPlace', hit: 'HitRecieve', win: 'Dance' },
    jelly: true, power: 'PRISM BURST',
  },
  'ghost-sprite': {id:'ghost-sprite',name:'Ghost Sprite',procedural:true,scale:.88,clips:{},power:'PHASE PULSE', icon:'👻'},
  'earth-sprite': {id:'earth-sprite',name:'Earth Sprite',procedural:true,scale:.82,clips:{},power:'BRANCH LASH',icon:'🌳'},
  'bush-sprite': {id:'bush-sprite',name:'Bush Sprite',procedural:true,scale:.88,clips:{},power:'BRAMBLE BURST',image:'../../assets/embedded/a14014ae0e379b3e18f4.webp'},
  'crown-sprite': {id:'crown-sprite',name:'Crown Sprite',procedural:true,scale:.86,clips:{},power:'ROYAL VERDICT',image:'../../assets/embedded/bed6f6237880ecac58e3.webp'},
  'water-sprite': {id:'water-sprite',name:'Water Sprite',procedural:true,scale:.92,clips:{},power:'TIDAL SHIELD',image:'../../assets/embedded/505c05734453dd299488.webp'},
  'fire-sprite': {id:'fire-sprite',name:'Fire Sprite',procedural:true,scale:.94,clips:{},power:'FIRESTORM',image:'../../assets/embedded/f3c4f6b56045e47ff41a.webp'},
  'jonesy-sprite': {id:'jonesy-sprite',name:'Jonesy Sprite',procedural:true,scale:.86,clips:{},power:'RALLY SHIELD',image:'../../assets/embedded/19762a0e3eaa2c3d8094.webp'},
  'klombo-base': {id:'klombo-base',name:'Klombo Sprite',procedural:true,scale:.90,clips:{},power:'MUNCH & REWARD',image:'../../assets/embedded/958aa09e5fe1b4a1cc9f.webp',family:'klombo'},
  'klombo-cheat': {id:'klombo-cheat',name:'Klombo · Cheat Master',procedural:true,scale:.90,clips:{},power:'CHEAT MATRIX',image:'../../assets/embedded/464c44f5e90d4cc02f5c.webp',family:'klombo'},
  'klombo-loot': {id:'klombo-loot',name:'Klombo · Loot Hacker',procedural:true,scale:.90,clips:{},power:'LOOT SCANNER',image:'../../assets/embedded/c44378170ba8c72a2ebb.webp',family:'klombo'},
};

export const ENEMIES = {
  'ghost-sprite': {file:null,procedural:'ghost-sprite',scale:.89,hp:2,speed:2.2,chase:3.2,clips:{},radius:.75,height:2.6,floats:.18},
  'earth-sprite': {file:null,procedural:'earth-sprite',scale:.86,hp:3,speed:1.4,chase:2.8,clips:{},radius:.95,height:2.55,branchReach:3.5},
  'water-sprite':{file:null,procedural:'water-sprite',scale:.88,hp:2,speed:2.2,chase:3.4,clips:{},radius:.72,height:2.4},
  'fire-sprite':{file:null,procedural:'fire-sprite',scale:.87,hp:2,speed:2.6,chase:3.8,clips:{},radius:.70,height:2.5},
  ghost:   { file: 'ghost',   scale: 1.30, hp: 1, speed: 2.2, chase: 3.6, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.7, height: 1.9 },
  yeti:    { file: 'yeti',    scale: 1.15, hp: 1, speed: 2.0, chase: 3.8, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.8, height: 1.95 },
  stump:   { file: 'stump',   scale: 0.82, hp: 2, speed: 1.6, chase: 3.0, clips: { idle: 'Idle', walk: 'Walk', death: null,    hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.95, height: 2.3 },
  cthulhu: { file: 'cthulhu', scale: 1.25, hp: 1, speed: 2.4, chase: 4.0, clips: { idle: 'Flying', walk: 'Flying', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.95, floats: 0.35 },
  alien:   { file: 'alien',   scale: 0.92, hp: 1, speed: 2.6, chase: 4.2, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.9 },
};
