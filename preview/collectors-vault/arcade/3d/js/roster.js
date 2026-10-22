// Playable and enemy character definitions. Add new rigged GLBs here.
export const PLAYABLE = {
  citrus: {
    id: 'citrus', name: 'Dash', file: 'citrus', scale: 0.86,
    clips: { idle: 'Idle', walk: 'Walk', jump: 'Jump', attack: 'Bite_InPlace', hit: 'HitRecieve', win: 'Dance' },
    jelly: true,
  },
};

export const ENEMIES = {
  ghost:   { file: 'ghost',   scale: 1.30, hp: 1, speed: 2.2, chase: 3.6, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.7, height: 1.9 },
  yeti:    { file: 'yeti',    scale: 1.15, hp: 1, speed: 2.0, chase: 3.8, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.8, height: 1.95 },
  stump:   { file: 'stump',   scale: 0.82, hp: 2, speed: 1.6, chase: 3.0, clips: { idle: 'Idle', walk: 'Walk', death: null,    hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.95, height: 2.3 },
  cthulhu: { file: 'cthulhu', scale: 1.25, hp: 1, speed: 2.4, chase: 4.0, clips: { idle: 'Flying', walk: 'Flying', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.95, floats: 0.35 },
  alien:   { file: 'alien',   scale: 0.92, hp: 1, speed: 2.6, chase: 4.2, clips: { idle: 'Idle', walk: 'Walk', death: 'Death', hit: 'HitRecieve', attack: 'Bite_Front' }, radius: 0.75, height: 1.9 },
};
