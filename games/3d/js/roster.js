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
};

export const ENEMIES = {
  'ghost-sprite': {file:null,procedural:'ghost-sprite',scale:.89,hp:2,speed:2.2,chase:3.2,clips:{},radius:.75,height:2.6,floats:.18},
  'earth-sprite': {file:null,procedural:'earth-sprite',scale:.86,hp:3,speed:1.4,chase:2.8,clips:{},radius:.95,height:2.55,branchReach:3.5},
  ghost:   { file: 'ghost',   scale: 1.30, hp: 1, speed: 2.2, chase: 3.6, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.7, height: 1.9 },
  yeti:    { file: 'yeti',    scale: 1.15, hp: 1, speed: 2.0, chase: 3.8, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.8, height: 1.95 },
  stump:   { file: 'stump',   scale: 0.82, hp: 2, speed: 1.6, chase: 3.0, clips: { idle: 'Idle', walk: 'Walk', death: null,    hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.95, height: 2.3 },
  cthulhu: { file: 'cthulhu', scale: 1.25, hp: 1, speed: 2.4, chase: 4.0, clips: { idle: 'Flying', walk: 'Flying', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.95, floats: 0.35 },
  alien:   { file: 'alien',   scale: 0.92, hp: 1, speed: 2.6, chase: 4.2, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.9 },
};
