"use strict";

// voice: tono del "blip" al escribir el texto.
// hairStyle: short | long | spiky | old
const CHARACTERS = {
  kael: {
    id: "kael",
    name: "Kael",
    voice: 1.0,
    skin: "#f3c9a0",
    hair: "#e0782e",
    hairStyle: "spiky",
    shirt: "#3b6fc4",
    pants: "#4a3b2e",
    eyes: "#3a7bd5",
  },
  lira: {
    id: "lira",
    name: "Lira",
    voice: 1.35,
    skin: "#f6d3b3",
    hair: "#b8834f",
    hairStyle: "long",
    elf: true,
    shirt: "#c23b3b",
    pants: "#6b4a2a",
    eyes: "#3fa9e0",
    trim: "#f2c14e",
  },
  tobias: {
    id: "tobias",
    name: "Tobías",
    voice: 0.7,
    skin: "#e3b08a",
    hair: "#e4e4e4",
    hairStyle: "old",
    shirt: "#4f7a4a",
    pants: "#5a4632",
    eyes: "#5a4a3a",
  },
  pip: {
    id: "pip",
    name: "Pip",
    voice: 1.65,
    skin: "#f3c9a0",
    hair: "#4a3222",
    hairStyle: "short",
    hat: "#d94c3a",
    shirt: "#e8b83a",
    pants: "#3a5a8a",
    eyes: "#7a4a2a",
  },
  nora: {
    id: "nora",
    name: "Nora",
    voice: 1.25,
    skin: "#e8b48c",
    hair: "#2a1a14",
    hairStyle: "long",
    shirt: "#e05a9a",
    pants: "#3a3a5a",
    eyes: "#5a3a22",
    trim: "#ffffff",
  },
  dani: {
    id: "dani",
    name: "Dani",
    voice: 0.9,
    skin: "#c98e62",
    hair: "#1e1410",
    hairStyle: "short",
    hat: "#2a2a2a",
    shirt: "#7a3fbf",
    pants: "#2a2a3a",
    eyes: "#3a2a1a",
  },
  leo: {
    id: "leo",
    name: "Leo",
    voice: 1.1,
    skin: "#f6d3b3",
    hair: "#f2d06a",
    hairStyle: "spiky",
    shirt: "#2fa8a0",
    pants: "#e07a3a",
    eyes: "#2a8a5a",
  },
};

// El protagonista siempre sale a la derecha en los diálogos.
const PLAYER_CHAR = "kael";

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
 *
 * Exteriores de la urbanización (además de lo de arriba):
 *  :  baldosas del patio    o  suelo de la piscina    P  agua de la piscina
 *  h  seto                  g  globo atado (pista)    n  nota clavada (pista)
 *  w  muro blanco de patio   a  asfalto                -  acera / calle de baldosa
 *  z  arena                  Y  palmera
 * Los globos y las notas se leen con `signs`, como los carteles. Los muebles también valen en exteriores.
 * `decor`: arrow { x, y, dir } (flecha de tiza), bunting { x0, x1, y } (banderines entre dos `pole`),
 *          confetti { area: [x0, y0, x1, y1] }, bobber { x, y }.
 * NPCs: `dance: true` baila en el sitio; `swim: true` nada dentro de la piscina (con `wander` se mueve por el agua).
 * `triggers`: [{ id, area: [x0, y0, x1, y1], steps }] lanza esa cinemática (pasos de STORY) la primera vez que pisas el área.
 */
// Fila de n adosados mediterráneos (blancos, de dos plantas) de 6 casillas de ancho desde (x, y).
// extra: propiedades para casas concretas, por su posición en la fila ({ 2: { enter: ... } }).
const NEIGHBOR_DOORS = [
  "Llamas. Nadie contesta. Qué raro, a estas horas siempre hay alguien en casa...",
  "Detrás de la puerta, un perro ladra como si le debieras dinero.",
  "En el felpudo pone «Bienvenidos». La puerta, en cambio, está cerrada.",
  "Huele a tortilla recién hecha. Pero no te abren.",
  "Hay una nota en la puerta: «Volvemos enseguida». Lleva ahí desde 2019.",
];
function adosados(x, y, n, extra = {}) {
  return Array.from({ length: n }, (_, i) => ({
    x: x + i * 6,
    y,
    w: 6,
    h: 4,
    style: "med",
    locked: [{ text: NEIGHBOR_DOORS[(x + y + i) % NEIGHBOR_DOORS.length] }],
    ...extra[i],
  }));
}

// Columna de n adosados (5x3) de arriba abajo desde (x, y), con la fachada mirando a un lado (face: 'left' | 'right').
function adosadosColumna(x, y, n, face) {
  return Array.from({ length: n }, (_, i) => ({
    x,
    y: y + i * 3,
    w: 5,
    h: 3,
    style: "med",
    face,
    locked: [{ text: NEIGHBOR_DOORS[(x + y + i) % NEIGHBOR_DOORS.length] }],
  }));
}

const MAPS = {
  aldea: {
    name: "Anthonys Bday",
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TT....,.......,....,..TT",
      "T......................T",
      "T.....................bT",
      "Tb.....................T",
      "T....................,.T",
      "T....=..s.........=....T",
      "T,...=............=..,.T",
      "T....==============....T",
      "T...........=..........T",
      "TT..~~~~....=...ffffff.T",
      "T..~~~~~~...=...f,,,,f.T",
      "T..~~~~~~...=...f,,,,f.T",
      "T...~~~~....=...ff..ff.T",
      "Tr...~~.....=..........T",
      "T,..........=.....b..r.T",
      "TTT.....,...=s.....,..TT",
      "TTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    houses: [
      {
        x: 3,
        y: 2,
        w: 5,
        h: 4,
        roof: "#c8553d",
        wall: "#d4a26a",
        enter: { to: "casa", x: 6, y: 8, dir: "up" },
      },
      {
        x: 15,
        y: 2,
        w: 6,
        h: 4,
        roof: "#4f7fbf",
        wall: "#e0b98a",
        locked: [
          {
            text: "La puerta de Lira está cerrada. Huele a infusión de hierbas.",
          },
        ],
      },
    ],
    signs: {
      "8,6": [
        { text: "«Aldea Brisa»" },
        { text: "Población: 4 habitantes y un número indeterminado de setas." },
      ],
      "13,16": [
        { text: "Camino al Bosque Susurrante." },
        {
          text: "CERRADO POR OBRAS (del destino). Vuelva en el próximo capítulo.",
        },
      ],
    },
    decor: [{ type: "bobber", x: 7, y: 12 }],
    playerStart: { x: 5, y: 6, dir: "down" },
    intro: [
      { text: "Una mañana tranquila en Aldea Brisa..." },
      {
        text: "El sol brilla, los pájaros cantan y alguien ha vuelto a perder su cesta de setas.",
      },
      {
        who: "kael",
        mood: "happy",
        text: "¡Buenos días, mundo! Vamos a ver qué se cuenta la gente hoy.",
      },
    ],
    npcs: [
      {
        char: "lira",
        x: 20,
        y: 6,
        dir: "down",
        talks: [
          [
            {
              who: "lira",
              mood: "angry",
              text: "¡Kael! ¿Has visto a Pip? ¡Se ha llevado mi cesta de setas otra vez!",
            },
            {
              who: "kael",
              mood: "surprised",
              text: "¿Otra vez? Esta semana ya van tres.",
            },
            {
              who: "lira",
              mood: "angry",
              text: "Cuatro. Pero la del martes no cuenta porque eran setas venenosas.",
            },
            { who: "kael", text: "...¿Y eso no es peor?" },
            {
              who: "lira",
              mood: "happy",
              text: "Para él, sí. ¡Por eso no cuenta!",
            },
          ],
          [
            {
              who: "lira",
              mood: "happy",
              text: "Dicen que si hablas con las plantas crecen más rápido.",
            },
            {
              who: "lira",
              text: "Llevo tres meses contándole mis problemas a este rosal.",
            },
            { who: "kael", text: "¿Y ha funcionado?" },
            {
              who: "lira",
              mood: "angry",
              text: "Se ha secado. Creo que le deprimí.",
            },
          ],
          [
            {
              who: "lira",
              text: "El viejo Tobías lleva cuarenta años pescando en ese estanque.",
            },
            { who: "kael", text: "¿Y qué ha pescado en todo ese tiempo?" },
            { who: "lira", mood: "happy", text: "Un resfriado. Dos veces." },
          ],
        ],
      },
      {
        char: "tobias",
        x: 9,
        y: 12,
        dir: "left",
        talks: [
          [
            {
              who: "tobias",
              text: "Shhh... No hagas ruido, chaval. Hoy pican.",
            },
            { who: "kael", text: "Llevas ahí desde el amanecer." },
            {
              who: "tobias",
              mood: "happy",
              text: "Exacto. La paciencia es el cebo del sabio.",
            },
            { who: "kael", text: "¿Y el cebo de verdad?" },
            {
              who: "tobias",
              mood: "surprised",
              text: "...Sabía que se me olvidaba algo.",
            },
          ],
          [
            {
              who: "tobias",
              text: "En mis tiempos pesqué un pez tan grande que hubo que ampliar el estanque.",
            },
            {
              who: "kael",
              mood: "surprised",
              text: "Pero si el estanque es diminuto.",
            },
            {
              who: "tobias",
              mood: "happy",
              text: "¡Pues imagínate cómo era antes!",
            },
          ],
        ],
      },
      {
        char: "pip",
        x: 14,
        y: 11,
        dir: "down",
        wander: 2,
        talks: [
          [
            {
              who: "pip",
              mood: "happy",
              text: "¡Kael! ¡Kael! ¡Mira lo que he encontrado!",
            },
            {
              who: "kael",
              mood: "surprised",
              text: "¿Eso es... la cesta de Lira?",
            },
            {
              who: "pip",
              mood: "surprised",
              text: "¿Qué cesta? Yo no veo ninguna cesta.",
            },
            { who: "pip", mood: "happy", text: "¡Adióoos!" },
          ],
          [
            {
              who: "pip",
              text: "Cuando sea mayor voy a ser un héroe legendario.",
            },
            { who: "kael", text: "¿Ah, sí? ¿Y qué harás?" },
            {
              who: "pip",
              mood: "happy",
              text: "Ir por ahí hablando con todo el mundo pulsando ESPACIO.",
            },
            {
              who: "kael",
              mood: "surprised",
              text: "Eso... me suena sospechosamente familiar.",
            },
          ],
        ],
      },
    ],
  },

  casa: {
    name: "Mi habitación",
    interior: true,
    tiles: [
      "XXXXXXXXXXXXXX",
      "XWWWWWWWWWWWWX",
      "XWWWWWWWWWWWWX",
      "X____________X",
      "X____________X",
      "X____________X",
      "X____________X",
      "X____________X",
      "X____________X",
      "XXXXXXDXXXXXXX",
    ],
    furniture: [
      { type: "calendar", x: 4, y: 1 },
      { type: "window", x: 5, y: 1 },
      { type: "rug", x: 5, y: 5 },
      { type: "sunbeam", x: 5, y: 3 },
      { type: "bed", x: 1, y: 3 },
      { type: "nightstand", x: 3, y: 3 },
      { type: "desk", x: 8, y: 3 },
      { type: "chair", x: 8, y: 4 },
      { type: "bookshelf", x: 10, y: 3 },
      { type: "plant", x: 12, y: 3 },
      { type: "plant", x: 12, y: 8 },
    ],
    exits: { "6,9": { to: "urba", x: 43, y: 8, dir: "down" } },
    signs: {
      "1,4": [
        {
          who: "kael",
          text: "Todavía está calentita... No. Fuerza de voluntad.",
        },
      ],
      "2,4": [
        {
          who: "kael",
          text: "Todavía está calentita... No. Fuerza de voluntad.",
        },
      ],
      "3,3": [
        { text: "El despertador marca las once y media." },
        {
          who: "kael",
          mood: "surprised",
          text: "...Lo he vuelto a apagar sin despertarme.",
        },
      ],
      "4,2": [
        {
          text: "Un calendario. Hay un día marcado con un círculo rojo enorme.",
        },
        { who: "kael", text: "Tengo la sensación de que se me olvida algo..." },
      ],
      "5,2": [{ text: "Hace un día precioso ahí fuera." }],
      "6,2": [{ text: "Hace un día precioso ahí fuera." }],
      "8,3": [{ text: "Apuntes a medio hacer. Mejor ni mirarlos." }],
      "9,3": [{ text: "Apuntes a medio hacer. Mejor ni mirarlos." }],
      "10,3": [{ text: "«Cómo despertarse a la primera», tomo I. Sin abrir." }],
      "11,3": [{ text: "«Cómo despertarse a la primera», tomo I. Sin abrir." }],
    },
  },

  // Escenario 2: la urbanización, en proporción a la foto aérea y girada para que el norte quede arriba.
  // Arriba la carretera de detrás de casa y nuestro bloque de tres adosadas (la nuestra, la de la derecha)
  // con un camino a cada lado. Debajo, el gran parque de palmeras con la piscina a dos tercios y la zona
  // de arena al fondo; a los lados, filas de adosados separadas del parque por una franja de césped.
  urba: {
    name: "La urbanización",
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaT',
      'TaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaT',
      'T------------------------------------------------------------------------T',
      'T..........................=..................=...............-.........-T',
      'T.Y........................=..................=...,..w:::.....-w:::.....-T',
      'T.....,.........T..........=..........,.......=......::::.....-::::.....-T',
      'T.,......T...,.........Y...=........,.........=......wwww.....-wwww.....-T',
      'T..........................=w....bw....bw::::w=.,....w:::.....-w:::.....-T',
      'T,........Y.Y...T..........=w.....w.....w::::w=..,...::::.....-::::.....-T',
      'T....T........,............=w.....w.....w::::w=...,..wwww.....-wwww.....-T',
      'T..........................=w.....w.....w::::w=..,...w:::.....-w:::.....-T',
      'T..........................=wb....wb....w::::w=......::::.....-::::.,...-T',
      'T.Y.....Y......Y...........=www.wwwww.wwwg:www=......wwww.....-wwww.....-T',
      'T.....,....Y.,.............=...............g..=......w:::.....-w:::.....-T',
      'T........Y.................=...........g......=......::::.....-::::.....-T',
      'T.....................======..................======.wwww.....-wwww.....-T',
      'T---------------------=........Y...................=---------------------T',
      'T-w::..........::::w..=.....Y...............Y......=.w:::.....-w:::.....-T',
      'T-:::........,.:::::..=..................T.........=.::::.....-::::.....-T',
      'T-www..........wwwww..=............................=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=..Y..Y.Y...........Y.....b..=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=...............g............=.::::.....-::::.....-T',
      'T-www..........wwwww..=..T.........................=.wwww.....-wwww.,...-T',
      'T-w::..........::::w..=......T..........,.Y..Y.....=.w:::.....-w:::...,.-T',
      'T-:::..........:::::..=..........T.................=.::::.....-::::.....-T',
      'T-www..........wwwww..=......Y............Y..Y.Y.b.=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=..b.....Y...................=.w:::.....-w:::.....-T',
      'T-:::.,.,......:::::..=....Y.............Y...Y..Y..=.::::.....-::::.....-T',
      'T-www..........wwwww..=............g.......Y.......=.wwww.....-wwww.....-T',
      'T---------------------=....,..Y..............T.....=---------------------T',
      'T-w::..........::::w..=..........Y......Y.Y........=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=.....................T......=.::::.....-::::.....-T',
      'T-www..........wwwww..=..................Y......T..=.wwww.....-wwww.,...-T',
      'T-w::..........::::w..=...Y..Y...............Y.....=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=..........Y.......Y.........=.::::...,.-::::.....-T',
      'T-www..,,......wwwww..=.....Y.Y.......g....Y.......=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=...Y........................=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=.....Y...b............T.....=.::::.....-::::.....-T',
      'T-www..........wwwww..=.........................Y..=.wwww.....-wwww..,..-T',
      'T-w::..........::::w..=.................Y..........=.w:::.,...-w:::.....-T',
      'T-:::..........:::::..=...................Y........=.::::.....-::::.....-T',
      'T-www..........wwwww..=........Y...g....Y....Y.....=.wwww.....-wwww.....-T',
      'T---------------------=.....b.............T........=---------------------T',
      'T-w::..........::::w..=.......Y.............,...Y.n=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=............g..g............=.::::...,.-::::.....-T',
      'T-www..........wwwww..=......hhhhhhh::hhhhhhh.,....=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=......h::::::::::::::h......=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=......h::::::::::::::h..Y...=.::::.....-::::.....-T',
      'T-www...,......wwwww..=..Y.Y.h:PPPPPPPPPP:::h......=.wwww.....-wwww.....-T',
      'T-w::.,.,,.....::::w..=......h:PPPPPPPPPP:::h......=.w:::.....-w:::.....-T',
      'T-:::....,.....:::::..=..Y...h:PPPPPPPPPP:::h......=.::::.....-::::.....-T',
      'T-www..........wwwww..=......h:PPPPPPPPPP:::h......=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=.T....h:PPPPPPPPPP:::h......=.w:::.....-w:::.....-T',
      'T-:::..,.......:::::..=......h:PPPPPPPPPP:::h......=.::::.....-::::...,.-T',
      'T-www..........wwwww..=......h:PPPPPPPPPP:::h....Y.=.wwww.....-wwww.....-T',
      'T---------------------=..b...h:PPPPPPP::::::h......=---------------------T',
      'T-w::..........::::w..=......h:PPPPPPP::::::h...Y..=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=..Y...h:PPPPPPP::::::h......=.::::...,.-::::.....-T',
      'T-www..........wwwww..=......h:PPPPPPP::::::h......=.wwww.....-wwww..,..-T',
      'T-w::..........::::w..=..Y...h:PPPPPPP::::::h......=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=......h:PPPPPPP::::::h......=.::::.....-::::.....-T',
      'T-www..........wwwww..=......h:PPPPPPP::::::h..b...=.wwww.....-wwww.....-T',
      'T-w::.....,....::::w..=......h:PPPPPPP::::::h......=.w:::.....-w:::.....-T',
      'T-:::........,.:::::..=......h:PPPPPPP::::::h......=.::::.....-::::.....-T',
      'T-www..........wwwww..=...b..h:PPPPPPP::::::h......=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=......h:PPPPPPP::::::h..b...=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=..Y.b.h:PPPPPPP::::::h......=.::::.....-::::...,.-T',
      'T-www..........wwwww..=......h::::::::::::::h....Y.=.wwww.....-wwww.....-T',
      'T---------------------=......hhhhhhhhhhhhhhhh......=---------------------T',
      'T-w::..........::::w..=............................=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=........,..........b.....Y..=.::::.....-::::.....-T',
      'T-www..........wwwww..=............................=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=....,.......................=.w:::.....-w:::.,.,.-T',
      'T-:::...,,.....:::::..=..Y............b....,.....Y.=.::::.....-::::...,.-T',
      'T-www..........wwwww..=.......b..........b.........=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=.......................,....=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=....Y.......T...T...........=.::::.....-::::.....-T',
      'T-www..........wwwww..=..Y....Y..T...,.....Y.....Y.=.wwww.....-wwww.....-T',
      'T-w::........,.::::w..=.....,............b...b.....=.w:::.....-w:::.....-T',
      'T-:::.......,..:::::..=................Y........Y..=.::::..,..-::::.....-T',
      'T-www..........wwwww..=.............n.......Y......=.wwww.....-wwww.....-T',
      'T---------------------=.Y...Y.zzzzzzzzzzzzz........=---------------------T',
      'T-w::..........::::w..=.......zzzzzzzzzzzzz......Y.=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=.......zzzzzzzzzzzzz..Y.....=.::::.....-::::.....-T',
      'T-www..........wwwww..=.......zzzzzzzzzzzzz.....b..=.wwww.....-wwww.....-T',
      'T-w::..........::::w..=.......zzzzzzzzzzzzz.,......=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=.......zzzzzzzzzzzzz........=.::::.....-::::...,.-T',
      'T-www..........wwwww..=.......zzzzzzzzzzzzz........=.wwww.....-wwww...,.-T',
      'T-w::..........::::w..=...Y..................T.....=.w:::.....-w:::.....-T',
      'T-:::..........:::::..=...................Y........=.::::.....-::::.....-T',
      'T-www..........wwwww..=.............b...........Y..=.wwww.....-wwww.....-T',
      'T-....................=............................=..........-.........-T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    houses: [
      ...adosados(28, 4, 3, {
        2: { enter: { to: "casa", x: 6, y: 8, dir: "up" } },
      }),
      // a la derecha de nuestro bloque, al otro lado del camino: las dos columnas de la derecha
      // siguen hasta la carretera, también mirando a la izquierda
      ...adosadosColumna(57, 5, 4, "left"),
      ...adosadosColumna(67, 5, 4, "left"),
      // bandas de los lados: a la izquierda, columnas espalda con espalda (la de dentro mira al parque);
      // a la derecha, las dos columnas miran a la izquierda
      ...[
        [18, 4],
        [31, 4],
        [44, 4],
        [57, 4],
        [70, 4],
        [83, 3],
      ].flatMap(([y, n]) => [
        ...adosadosColumna(5, y, n, "left"),
        ...adosadosColumna(10, y, n, "right"),
        ...adosadosColumna(57, y, n, "left"),
        ...adosadosColumna(67, y, n, "left"),
      ]),
      {
        x: 41,
        y: 65,
        w: 3,
        h: 2,
        style: "med",
        floors: 1,
        locked: [
          {
            text: "Vestuarios de la piscina. Dentro alguien canta en la ducha... desafinando.",
          },
        ],
      },
    ],
    furniture: [
      // coches aparcados en la carretera de detrás de casa
      { type: "carwhite", x: 6, y: 2 },
      { type: "car", x: 19, y: 1 },
      { type: "carblue", x: 35, y: 2 },
      { type: "carwhite", x: 50, y: 1 },
      { type: "car", x: 64, y: 2 },
      // patio: mesa con sillas a la derecha
      { type: "gardenchair", x: 43, y: 10 },
      { type: "gardenchair", x: 44, y: 10 },
      { type: "patiotable", x: 43, y: 11 },
      { type: "gardenchair", x: 43, y: 12 },
      { type: "gardenchair", x: 44, y: 12 },
      // parque: bancos y balizas junto a los dos caminos laterales (por dentro del parque no hay caminos)
      { type: "bench", x: 23, y: 25 },
      { type: "bench", x: 23, y: 45 },
      { type: "bench", x: 23, y: 65 },
      { type: "bench", x: 49, y: 35 },
      { type: "bench", x: 49, y: 65 },
      ...[20, 30, 40, 50, 60, 70, 80].flatMap((y) => [
        { type: "bollard", x: 23, y },
        { type: "bollard", x: 50, y },
      ]),
      // parque infantil
      { type: "swing", x: 31, y: 84 },
      { type: "slide", x: 39, y: 84 },
      // fiesta en la piscina (la tarta y las tumbonas en el solárium de abajo a la derecha)
      { type: "pole", x: 30, y: 47 },
      { type: "pole", x: 43, y: 47 },
      { type: "partytable", x: 39, y: 57 },
      { type: "gift", x: 43, y: 57 },
      { type: "gift", x: 43, y: 58 },
      { type: "speaker", x: 30, y: 51 },
      { type: "speaker", x: 30, y: 60 },
      { type: "lounger", x: 39, y: 61 },
      { type: "lounger", x: 41, y: 61 },
      { type: "float", x: 34, y: 52 },
    ],
    decor: [
      { type: "bunting", x0: 30, x1: 43, y: 47 },
      { type: "confetti", area: [30, 47, 43, 68] },
    ],
    playerStart: { x: 43, y: 8, dir: "down" },
    intro: [
      { who: "kael", text: "Qué silencio hay hoy en la urbanización..." },
      { who: "kael", mood: "surprised", text: "¿Eso de la verja es un globo?" },
    ],
    signs: {
      "41,13": [
        {
          text: "Un globo atado a la verja del patio. Lleva una nota colgando:",
        },
        { text: "«Sigue los globos. Y date prisa, dormilón.»" },
        {
          who: "kael",
          mood: "surprised",
          text: "¿Más globos? Ahí hay otro...",
        },
      ],
      "50,44": [
        { text: "Una nota clavada en el césped:" },
        { text: "«¿Por aquí? ¡Frío, frío! Vuelve con los globos.»" },
        {
          who: "kael",
          text: "Alguien se ha tomado muchas molestias con esto.",
        },
      ],
      "36,81": [
        { text: "Otra nota, medio enterrada en la arena:" },
        {
          text: "«Aquí solo hay arena y un cubo sin pala. La fiesta NO es en los columpios.»",
        },
      ],
      "39,15": [
        {
          text: "Otro globo. Y más allá, por el camino del parque, se ve otro.",
        },
      ],
      "35,29": [
        { text: "Un globo atado a una palmera... no, a una estaca." },
        {
          who: "kael",
          text: "Cuántos globos. Alguien ha vaciado una tienda entera.",
        },
      ],
      "35,45": [
        { text: "Un globo con un número enorme dibujado." },
        {
          who: "kael",
          mood: "surprised",
          text: "Espera... ¿ese número es mi edad?",
        },
      ],
      "38,45": [
        {
          text: "Al otro lado del seto se oyen risas y alguien que manda callar a todo el mundo.",
        },
        { who: "kael", text: "¿Qué estará pasando ahí dentro?" },
      ],
      "43,11": [
        { text: "La mesa del patio. Alguien ha dejado una limonada a medias." },
      ],
      "44,11": [
        { text: "La mesa del patio. Alguien ha dejado una limonada a medias." },
      ],
      "39,57": [
        {
          text: "Una tarta enorme con velas. Todavía no está empezada. Por poco.",
        },
      ],
      "40,57": [
        {
          text: "Una tarta enorme con velas. Todavía no está empezada. Por poco.",
        },
      ],
      "41,57": [{ text: "Vasos, refrescos y una montaña de patatas fritas." }],
      "43,57": [
        {
          text: "Una pila de regalos. Uno de ellos hace tictac. Mejor no preguntar.",
        },
      ],
      "43,58": [
        {
          text: "Una pila de regalos. Uno de ellos hace tictac. Mejor no preguntar.",
        },
      ],
      "31,84": [
        {
          text: "Los columpios. Hoy no hay nadie: todo el mundo está en otra parte.",
        },
      ],
      "39,84": [{ text: "El tobogán quema como una sartén. Mejor no." }],
    },
    triggers: [
      {
        id: "sorpresa",
        area: [36, 47, 37, 47],
        steps: [
          { face: "player" },
          { sfx: "cheer" },
          { wait: 20 },
          {
            say: [
              { who: "lira", mood: "happy", text: "¡¡SORPRESAAA!!" },
              { who: "pip", mood: "happy", text: "¡FELIZ CUMPLEAÑOS!" },
              {
                who: "kael",
                mood: "surprised",
                text: "¿¡Todo esto es para mí!?",
              },
              {
                who: "nora",
                mood: "happy",
                text: "¡Pues claro! Llevamos desde las nueve esperándote.",
              },
              { who: "dani", text: "Son las doce. Los hielos ya son agua." },
              {
                who: "kael",
                mood: "happy",
                text: "...Así que eso era lo del calendario.",
              },
            ],
          },
        ],
      },
    ],
    npcs: [
      {
        char: "lira",
        x: 33,
        y: 48,
        dir: "down",
        dance: true,
        talks: [
          [
            {
              who: "lira",
              mood: "happy",
              text: "¡Las flechas las pinté yo! ¿A que eran preciosas?",
            },
            { who: "kael", text: "Una apuntaba a un árbol." },
            {
              who: "lira",
              mood: "angry",
              text: "Era un árbol muy importante.",
            },
          ],
          [
            { who: "lira", mood: "happy", text: "¡Baila conmigo!" },
            { who: "kael", text: "Pero si no hay música." },
            { who: "lira", mood: "happy", text: "¡La llevo dentro!" },
          ],
        ],
      },
      {
        char: "nora",
        x: 40,
        y: 48,
        dir: "down",
        dance: true,
        talks: [
          [
            {
              who: "nora",
              mood: "happy",
              text: "¡Feliz cumple! ¿Te ha gustado la búsqueda del tesoro?",
            },
            { who: "kael", text: "Casi me voy por el camino equivocado." },
            {
              who: "nora",
              mood: "happy",
              text: "Por eso pusimos la nota de «frío, frío». Te conocemos.",
            },
          ],
          [
            {
              who: "nora",
              text: "Pip quería esconder la fiesta dentro de la piscina.",
            },
            { who: "kael", mood: "surprised", text: "¿Debajo del agua?" },
            {
              who: "nora",
              mood: "happy",
              text: "Le dijimos que no. Él lo está intentando igual.",
            },
          ],
        ],
      },
      {
        char: "dani",
        x: 30,
        y: 56,
        dir: "right",
        dance: true,
        talks: [
          [
            { who: "dani", text: "Bienvenido a la sesión de DJ Dani." },
            { who: "kael", text: "Los altavoces están apagados." },
            {
              who: "dani",
              mood: "happy",
              text: "Es una sesión de silencio. Muy exclusiva.",
            },
          ],
          [
            {
              who: "dani",
              text: "Petición del público: ¿qué quieres escuchar?",
            },
            { who: "kael", text: "¿Algo animado?" },
            {
              who: "dani",
              mood: "happy",
              text: "Hecho. En cuanto encuentre el cable del altavoz.",
            },
          ],
        ],
      },
      {
        char: "tobias",
        x: 39,
        y: 64,
        dir: "left",
        talks: [
          [
            {
              who: "tobias",
              text: "Feliz cumpleaños, chaval. En mis tiempos las fiestas duraban tres días.",
            },
            { who: "kael", mood: "surprised", text: "¿Tres días?" },
            {
              who: "tobias",
              mood: "happy",
              text: "Bueno, era una fiesta normal. Pero tardábamos dos en encontrar la casa.",
            },
          ],
          [
            {
              who: "tobias",
              text: "He traído la caña. Por si hay peces en la piscina.",
            },
            { who: "kael", text: "Tobías, es una piscina." },
            { who: "tobias", mood: "happy", text: "Eso decían del estanque." },
          ],
        ],
      },
      {
        char: "pip",
        x: 34,
        y: 60,
        dir: "down",
        swim: true,
        wander: 2,
        talks: [
          [
            {
              who: "pip",
              mood: "happy",
              text: "¡Kael! ¡Métete! ¡El agua está buenísima!",
            },
            { who: "kael", text: "¿Desde qué hora estás ahí dentro?" },
            { who: "pip", mood: "surprised", text: "¿Qué día es hoy?" },
          ],
          [
            {
              who: "pip",
              mood: "happy",
              text: "¡Mira! ¡Puedo aguantar la respiración diez segundos!",
            },
            {
              who: "pip",
              mood: "surprised",
              text: "...Bueno, tres. Pero muy intensos.",
            },
          ],
        ],
      },
      {
        char: "leo",
        x: 38,
        y: 52,
        dir: "right",
        swim: true,
        wander: 1,
        talks: [
          [
            {
              who: "leo",
              mood: "happy",
              text: "¡Felicidades! Te he traído un regalo.",
            },
            { who: "kael", mood: "happy", text: "¿En serio? ¿Qué es?" },
            { who: "leo", text: "Está en la pila. Es el que hace tictac." },
            { who: "kael", mood: "surprised", text: "..." },
            {
              who: "leo",
              mood: "happy",
              text: "¡Es un reloj! ¿Qué te pensabas?",
            },
          ],
        ],
      },
    ],
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
 *  { face: 'player' }              todos los NPCs se giran hacia el protagonista
 *  { minigame: 'chase' }           batalla en coche (en el estilo elegido en el título); la cinemática sigue al ganarla
 * Al terminar, el jugador toma el control.
 */
const STORY = {
  opening: {
    map: "casa",
    spawn: { x: 2, y: 4, dir: "down" },
    steps: [
      { dark: 1 },
      { pose: "sleep" },
      { wait: 20 },
      { sfx: "snore" },
      { wait: 150 },
      { sfx: "snore" },
      { wait: 150 },
      { bubble: "Mar...", hold: 60 },
      { wait: 25 },
      { bubble: "Mart...", hold: 75 },
      { wait: 20 },
      { fade: 0, frames: 180 },
      { wait: 110 },
      { pose: "sit" },
      { sfx: "rustle" },
      { wait: 50 },
      { getUp: { x: 3, y: 4, dir: "down" } },
      { wait: 25 },
      {
        say: [
          { who: "kael", text: "Ay, siempre me despierto en la mejor parte." },
        ],
      },
    ],
  },
};

/*
 * Niveles que se pueden elegir desde el título («Elegir nivel»). Cada uno empieza de una de estas formas:
 *  story: 'clave de STORY'   la cinemática de esa historia
 *  map: 'clave de MAPS'      en ese mapa, en su `playerStart`
 *  minigame: 'chase'         la batalla en coche (al ganar se vuelve al título)
 *  soon: true                todavía no existe: sale en la lista como «próximamente»
 * «Nueva partida» empieza por el primero.
 */
const LEVELS = [
  { name: "La casa", story: "opening" },
  { name: "El patio", map: "urba" },
  { name: "La batalla contra el monstruo", minigame: "chase" },
  { name: "La playa", soon: true },
];

// Batalla en coche contra el monstruo (js/battle.js y js/chasetop.js).
const CHASE = {
  boss: "EL MONSTRUO",
  hp: 30, // balas que aguanta antes de explotar
  magazine: 10, // balas por cargador
  reloadFrames: 120, // recarga al vaciar el cargador (60 = 1 s)
};

const CREDITS = [
  { h: "ALDEA BRISA", big: true },
  { t: "un pequeño prototipo RPG" },
  {},
  { h: "Idea y dirección" },
  { t: "Angel Quesada" },
  {},
  { h: "Programación" },
  { t: "Claude" },
  {},
  { h: "Arte" },
  { t: "Pixel art generado por código" },
  {},
  { h: "Sonido" },
  { t: "Sintetizado en tiempo real con Web Audio" },
  {},
  { h: "Tipografía" },
  { t: "Pixelify Sans" },
  {},
  { h: "Reparto" },
  { t: "Kael · Lira · Tobías · Pip" },
  { t: "y un rosal deprimido" },
  {},
  {},
  { h: "¡Gracias por jugar!", big: true },
];
