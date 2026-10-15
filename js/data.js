'use strict';

// voice: tono del "blip" al escribir el texto.
// hairStyle: short | long | spiky | old
const CHARACTERS = {
  kael: {
    id: 'kael', name: 'Kael', voice: 1.0,
    skin: '#f3c9a0', hair: '#e0782e', hairStyle: 'spiky',
    shirt: '#3b6fc4', pants: '#4a3b2e', eyes: '#3a7bd5',
  },
  lira: {
    id: 'lira', name: 'Lira', voice: 1.35,
    skin: '#f6d3b3', hair: '#b8834f', hairStyle: 'long', elf: true,
    shirt: '#c23b3b', pants: '#6b4a2a', eyes: '#3fa9e0', trim: '#f2c14e',
  },
  tobias: {
    id: 'tobias', name: 'Tobías', voice: 0.7,
    skin: '#e3b08a', hair: '#e4e4e4', hairStyle: 'old',
    shirt: '#4f7a4a', pants: '#5a4632', eyes: '#5a4a3a',
  },
  pip: {
    id: 'pip', name: 'Pip', voice: 1.65,
    skin: '#f3c9a0', hair: '#4a3222', hairStyle: 'short', hat: '#d94c3a',
    shirt: '#e8b83a', pants: '#3a5a8a', eyes: '#7a4a2a',
  },
};

// El protagonista siempre sale a la derecha en los diálogos.
const PLAYER_CHAR = 'kael';

/*
 * Leyenda del mapa:
 *  .  hierba        ,  hierba con flores   =  camino    ~  agua
 *  T  árbol         b  arbusto             r  roca      f  valla
 *  s  cartel (su texto va en `signs`)
 * Las casas se definen aparte en `houses` (la puerta queda en el centro de su fila inferior).
 * Una casa con `enter` lleva a otro mapa al andar hacia su puerta.
 *
 * Interiores (`interior: true`):
 *  X  borde    W  pared    _  suelo    D  puerta (suelo con felpudo)
 * Los muebles van en `furniture` como { type, x, y }; tipos en Art (bed, desk, rug...).
 * `exits` lleva a otro mapa al pisar esa casilla. `signs` sirve para describir lo que se mira.
 */
const MAPS = {
  aldea: {
    name: 'Anthonys Bday',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'TT....,.......,....,..TT',
      'T......................T',
      'T.....................bT',
      'Tb.....................T',
      'T....................,.T',
      'T....=..s.........=....T',
      'T,...=............=..,.T',
      'T....==============....T',
      'T...........=..........T',
      'TT..~~~~....=...ffffff.T',
      'T..~~~~~~...=...f,,,,f.T',
      'T..~~~~~~...=...f,,,,f.T',
      'T...~~~~....=...ff..ff.T',
      'Tr...~~.....=..........T',
      'T,..........=.....b..r.T',
      'TTT.....,...=s.....,..TT',
      'TTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    houses: [
      { x: 3, y: 2, w: 5, h: 4, roof: '#c8553d', wall: '#d4a26a',
        enter: { to: 'casa', x: 6, y: 8, dir: 'up' } },
      { x: 15, y: 2, w: 6, h: 4, roof: '#4f7fbf', wall: '#e0b98a',
        locked: [{ text: 'La puerta de Lira está cerrada. Huele a infusión de hierbas.' }] },
    ],
    signs: {
      '8,6': [
        { text: '«Aldea Brisa»' },
        { text: 'Población: 4 habitantes y un número indeterminado de setas.' },
      ],
      '13,16': [
        { text: 'Camino al Bosque Susurrante.' },
        { text: 'CERRADO POR OBRAS (del destino). Vuelva en el próximo capítulo.' },
      ],
    },
    decor: [{ type: 'bobber', x: 7, y: 12 }],
    playerStart: { x: 5, y: 6, dir: 'down' },
    intro: [
      { text: 'Una mañana tranquila en Aldea Brisa...' },
      { text: 'El sol brilla, los pájaros cantan y alguien ha vuelto a perder su cesta de setas.' },
      { who: 'kael', mood: 'happy', text: '¡Buenos días, mundo! Vamos a ver qué se cuenta la gente hoy.' },
    ],
    npcs: [
      {
        char: 'lira', x: 20, y: 6, dir: 'down',
        talks: [
          [
            { who: 'lira', mood: 'angry', text: '¡Kael! ¿Has visto a Pip? ¡Se ha llevado mi cesta de setas otra vez!' },
            { who: 'kael', mood: 'surprised', text: '¿Otra vez? Esta semana ya van tres.' },
            { who: 'lira', mood: 'angry', text: 'Cuatro. Pero la del martes no cuenta porque eran setas venenosas.' },
            { who: 'kael', text: '...¿Y eso no es peor?' },
            { who: 'lira', mood: 'happy', text: 'Para él, sí. ¡Por eso no cuenta!' },
          ],
          [
            { who: 'lira', mood: 'happy', text: 'Dicen que si hablas con las plantas crecen más rápido.' },
            { who: 'lira', text: 'Llevo tres meses contándole mis problemas a este rosal.' },
            { who: 'kael', text: '¿Y ha funcionado?' },
            { who: 'lira', mood: 'angry', text: 'Se ha secado. Creo que le deprimí.' },
          ],
          [
            { who: 'lira', text: 'El viejo Tobías lleva cuarenta años pescando en ese estanque.' },
            { who: 'kael', text: '¿Y qué ha pescado en todo ese tiempo?' },
            { who: 'lira', mood: 'happy', text: 'Un resfriado. Dos veces.' },
          ],
        ],
      },
      {
        char: 'tobias', x: 9, y: 12, dir: 'left',
        talks: [
          [
            { who: 'tobias', text: 'Shhh... No hagas ruido, chaval. Hoy pican.' },
            { who: 'kael', text: 'Llevas ahí desde el amanecer.' },
            { who: 'tobias', mood: 'happy', text: 'Exacto. La paciencia es el cebo del sabio.' },
            { who: 'kael', text: '¿Y el cebo de verdad?' },
            { who: 'tobias', mood: 'surprised', text: '...Sabía que se me olvidaba algo.' },
          ],
          [
            { who: 'tobias', text: 'En mis tiempos pesqué un pez tan grande que hubo que ampliar el estanque.' },
            { who: 'kael', mood: 'surprised', text: 'Pero si el estanque es diminuto.' },
            { who: 'tobias', mood: 'happy', text: '¡Pues imagínate cómo era antes!' },
          ],
        ],
      },
      {
        char: 'pip', x: 14, y: 11, dir: 'down', wander: 2,
        talks: [
          [
            { who: 'pip', mood: 'happy', text: '¡Kael! ¡Kael! ¡Mira lo que he encontrado!' },
            { who: 'kael', mood: 'surprised', text: '¿Eso es... la cesta de Lira?' },
            { who: 'pip', mood: 'surprised', text: '¿Qué cesta? Yo no veo ninguna cesta.' },
            { who: 'pip', mood: 'happy', text: '¡Adióoos!' },
          ],
          [
            { who: 'pip', text: 'Cuando sea mayor voy a ser un héroe legendario.' },
            { who: 'kael', text: '¿Ah, sí? ¿Y qué harás?' },
            { who: 'pip', mood: 'happy', text: 'Ir por ahí hablando con todo el mundo pulsando ESPACIO.' },
            { who: 'kael', mood: 'surprised', text: 'Eso... me suena sospechosamente familiar.' },
          ],
        ],
      },
    ],
  },

  casa: {
    name: 'Mi habitación',
    interior: true,
    tiles: [
      'XXXXXXXXXXXXXX',
      'XWWWWWWWWWWWWX',
      'XWWWWWWWWWWWWX',
      'X____________X',
      'X____________X',
      'X____________X',
      'X____________X',
      'X____________X',
      'X____________X',
      'XXXXXXDXXXXXXX',
    ],
    furniture: [
      { type: 'calendar', x: 4, y: 1 },
      { type: 'window', x: 5, y: 1 },
      { type: 'rug', x: 5, y: 5 },
      { type: 'sunbeam', x: 5, y: 3 },
      { type: 'bed', x: 1, y: 3 },
      { type: 'nightstand', x: 3, y: 3 },
      { type: 'desk', x: 8, y: 3 },
      { type: 'chair', x: 8, y: 4 },
      { type: 'bookshelf', x: 10, y: 3 },
      { type: 'plant', x: 12, y: 3 },
      { type: 'plant', x: 12, y: 8 },
    ],
    exits: { '6,9': { to: 'aldea', x: 5, y: 6, dir: 'down' } },
    signs: {
      '1,4': [{ who: 'kael', text: 'Todavía está calentita... No. Fuerza de voluntad.' }],
      '2,4': [{ who: 'kael', text: 'Todavía está calentita... No. Fuerza de voluntad.' }],
      '3,3': [
        { text: 'El despertador marca las once y media.' },
        { who: 'kael', mood: 'surprised', text: '...Lo he vuelto a apagar sin despertarme.' },
      ],
      '4,2': [
        { text: 'Un calendario. Hay un día marcado con un círculo rojo enorme.' },
        { who: 'kael', text: 'Tengo la sensación de que se me olvida algo...' },
      ],
      '5,2': [{ text: 'Hace un día precioso ahí fuera.' }],
      '6,2': [{ text: 'Hace un día precioso ahí fuera.' }],
      '8,3': [{ text: 'Apuntes a medio hacer. Mejor ni mirarlos.' }],
      '9,3': [{ text: 'Apuntes a medio hacer. Mejor ni mirarlos.' }],
      '10,3': [{ text: '«Cómo despertarse a la primera», tomo I. Sin abrir.' }],
      '11,3': [{ text: '«Cómo despertarse a la primera», tomo I. Sin abrir.' }],
    },
  },
};

/*
 * Modo historia: cinemáticas como lista de pasos que se ejecutan en orden.
 *  { wait: n }                     espera n frames (60 = 1 s)
 *  { dark: 0..1 }                  pone la pantalla a ese nivel de negro al instante
 *  { fade: 0..1, frames: n }       funde el negro hasta ese nivel en n frames
 *  { sfx: 'nombre' }               efecto de sonido de Sfx
 *  { pose: 'sleep' | 'sit' | null } postura del protagonista en la cama (null = fuera de ella)
 *  { bubble: 'texto', hold: n }    bocadillo sobre la cama; se escribe solo y dura n frames
 *  { getUp: { x, y, dir } }        sale de la cama de un salto hasta esa casilla
 *  { say: [líneas] }               diálogo normal (se avanza con ESPACIO)
 *  { minigame: 'chase' }           batalla en coche (en el estilo elegido en el título); la cinemática sigue al ganarla
 * Al terminar, el jugador toma el control.
 */
const STORY = {
  opening: {
    map: 'casa',
    spawn: { x: 2, y: 4, dir: 'down' },
    steps: [
      { dark: 1 },
      { pose: 'sleep' },
      { wait: 20 },
      { sfx: 'snore' },
      { wait: 150 },
      { sfx: 'snore' },
      { wait: 150 },
      { bubble: 'Mar...', hold: 60 },
      { wait: 25 },
      { bubble: 'Mart...', hold: 75 },
      { wait: 20 },
      { fade: 0, frames: 180 },
      { wait: 110 },
      { pose: 'sit' },
      { sfx: 'rustle' },
      { wait: 50 },
      { getUp: { x: 3, y: 4, dir: 'down' } },
      { wait: 25 },
      { say: [{ who: 'kael', text: 'Ay, siempre me despierto en la mejor parte.' }] },
    ],
  },
};

// Batalla en coche contra el monstruo (js/battle.js; estilos en js/chasetop.js y js/chase3d.js).
const CHASE = {
  boss: 'EL MONSTRUO',
  hp: 30,            // balas que aguanta antes de explotar
  magazine: 10,      // balas por cargador
  reloadFrames: 120, // recarga al vaciar el cargador (60 = 1 s)
};

const CREDITS = [
  { h: 'ALDEA BRISA', big: true },
  { t: 'un pequeño prototipo RPG' },
  {},
  { h: 'Idea y dirección' },
  { t: 'Angel Quesada' },
  {},
  { h: 'Programación' },
  { t: 'Claude' },
  {},
  { h: 'Arte' },
  { t: 'Pixel art generado por código' },
  {},
  { h: 'Sonido' },
  { t: 'Sintetizado en tiempo real con Web Audio' },
  {},
  { h: 'Tipografía' },
  { t: 'Pixelify Sans' },
  {},
  { h: 'Reparto' },
  { t: 'Kael · Lira · Tobías · Pip' },
  { t: 'y un rosal deprimido' },
  {},
  {},
  { h: '¡Gracias por jugar!', big: true },
];
