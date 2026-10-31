"use strict";

// voice: tono del "blip" al escribir el texto.
// hairStyle: short | long | spiky | old
const CHARACTERS = {
  kael: {
    id: "kael",
    name: "Anthon",
    voice: 1.0,
    skin: "#f0b48c",
    hair: "#e0782e",
    hairStyle: "bald",

    look: { glasses: "round", eyes: "sparkle", mouth: "none" },
    shirt: "#2b2b30",
    pants: "#4a3b2e",
    eyes: "#35b04f",
    // Retratos de diálogo por expresión (mood). "normal" usa la imagen base.
    portraits: { normal: "characters/Anthon/base.png" },
  },
  dominik: {
    id: "dominik",
    name: "Dominik",
    voice: 0.95,
    skin: "#f0c4a0",
    hair: "#6b4a2e",
    hairStyle: "short",
    shirt: "#8f959b",
    pants: "#3a3f4a",
    eyes: "#6a9ac8",
    // El mood de cada línea es el nombre de la imagen (characters/Dominik/chat.txt); "normal" es la base.
    portraits: {
      normal: "characters/Dominik/base.png",
      base: "characters/Dominik/base.png",
      happy: "characters/Dominik/happy.png",
    },
  },
  vives: {
    id: "vives",
    name: "Vives",
    voice: 0.85,
    skin: "#e8b890",
    hair: "#3a2c24",
    hairStyle: "short",
    shirt: "#d9594f",
    pants: "#3a3f4a",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Vives/base.png",
      base: "characters/Vives/base.png",
      happy: "characters/Vives/happy.png",
    },
  },
  muha: {
    id: "muha",
    name: "Muha",
    voice: 0.9,
    skin: "#d48a60",
    hair: "#28221e",
    hairStyle: "short",
    shirt: "#4a2d23",
    pants: "#2e323b",
    eyes: "#3a2418",
    portraits: {
      normal: "characters/Muha/base.png",
      base: "characters/Muha/base.png",
      happy: "characters/Muha/happy.png",
    },
  },
  diego: {
    id: "diego",
    name: "Diego",
    voice: 0.8,
    skin: "#e8a888",
    hair: "#7a6a62",
    hairStyle: "short",
    shirt: "#2f4fa0",
    pants: "#3a3f4a",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Diego/base.png",
      base: "characters/Diego/base.png",
      happy: "characters/Diego/happy.png",
    },
  },
};

// El protagonista siempre sale a la derecha en los diálogos.
const PLAYER_CHAR = "kael";

// Invitados de la fiesta: `chat` es la carpeta de characters/ (js/chats.js) y `char` su clave en CHARACTERS.
// Anthon NUNCA habla en el juego, solo piensa: los demás le hablan y él escucha sin contestar.
const GUESTS = [
  { chat: "Dominik", char: "dominik" },
  { chat: "Vives", char: "vives" },
  { chat: "Muha", char: "muha" },
  { chat: "Diego", char: "diego" },
];
// Invitado en pruebas: nada más cargar aparece delante de Anthon y suelta su chat. Los demás esperan a su lado.
const TEST_CHAT = "diego";

/*
 * Leyenda del mapa:
 *  .  hierba        ,  hierba con flores   =  camino    ~  agua
 *  T  árbol         b  arbusto             r  roca      f  valla
 *  s  cartel (su texto va en `signs`)
 * Las casas se definen aparte en `houses` (la puerta queda en el centro de su fila inferior).
 * Una casa con `enter` lleva a otro mapa al andar hacia su puerta.
 *
 * Interiores (`interior: true`):
 *  X  borde    W  pared    _  suelo    D  puerta (suelo con felpudo)    (espacio)  fuera de la casa
 * Los muebles van en `furniture` como { type, x, y }; tipos en Art (bed, bigbed, sofa, rug...).
 * Los de ancho variable (kitchen, bar, wardrobe, glass, lightdown, lightup) llevan además `w` y `h`.
 * La cama marcada con `sleep: true` es la que usan las cinemáticas (dormir, levantarse).
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

// Mismas líneas para todas las casillas de un rectángulo (muebles grandes): ...area(x, y, w, h, líneas) en `signs`.
function area(x, y, w, h, lines) {
  const out = {};
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) out[`${i},${j}`] = lines;
  return out;
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
        enter: { to: "casa", x: 11, y: 30, dir: "left" },
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
  },

  // La casa, según el plano dibujado a mano (el norte arriba):
  //  arriba a la izquierda, el cuarto pequeño con la cama individual y los dos ordenadores;
  //  arriba a la derecha, el dormitorio grande con la cama de matrimonio (donde despiertas) y la terraza;
  //  en el centro, el pasillo con el baño y el cuarto de las dos camas a la derecha;
  //  a la izquierda, la cocina entre dos encimeras; abajo, el salón (comedor) con el sofá rinconero, la tele,
  //  la terraza del salón y la salida al patio (la D de la derecha).
  casa: {
    name: "Casa",
    interior: true,
    tiles: [
      "XXXXXXXXXXXXXXXXXXXXX", // 0
      "XWWWWWWXWWWWWWWWWWWWX",
      "XWWWWWWXWWWWWWWWWWWWX",
      "X______X____________X", // 3  cuarto pequeño | dormitorio grande
      "X______X____________X",
      "X______X____________X",
      "X______X____________X",
      "X______X____________X",
      "X______XX__XXXXXXXXXX", // 8  puerta del dormitorio grande al pasillo
      "X______XW__WXWWWWWWWX",
      "X______X____X_______X", // 10 baño
      "X______X____________X", // 11 puerta del baño
      "X___________________X", // 12 puerta del cuarto pequeño al pasillo
      "X___________X_______X",
      "XXXXXXXX____X_______X",
      "XWWWWWW_____X_______X", // 15
      "X___________XXXXXXXXX", // 16 cocina
      "X___________XWWWWWWWX",
      "X___________X_______X", // 18 armario empotrado
      "X___________________X", // 19 encimera americana | puerta del cuarto de las dos camas
      "X___________________X", // 20 salón
      "X___________X_______X",
      "X___________X_______X",
      "X___________X_______X",
      "X___________X_______X",
      "X___________X_______X",
      "X___________XXXXXXXXX", // 26 ventana del cuarto de las dos camas
      "X___________X        ",
      "X___________X        ",
      "X___________X        ",
      "X___________D        ", // 30 salida al patio
      "X___________D        ",
      "X___________X        ",
      "XXXXXXXXXXXXX        ", // 33 terraza del salón
    ],
    furniture: [
      // cuarto pequeño de arriba a la izquierda
      { type: "window", x: 2, y: 1 },
      { type: "singlebed", x: 5, y: 3 },
      { type: "pcdesk", x: 1, y: 7 },
      { type: "officechair", x: 2, y: 7 },
      { type: "pcdesk", x: 1, y: 10 },
      { type: "officechair", x: 2, y: 10 },
      { type: "plant", x: 3, y: 13 },
      // dormitorio grande: la cama contra la pared derecha, con una mesita encima y otra debajo,
      // y la mesa alargada a su altura contra la pared de enfrente
      { type: "calendar", x: 9, y: 1 },
      { type: "terrace", x: 11, y: 1 },
      { type: "lightdown", x: 11, y: 3, w: 4, h: 3 },
      { type: "bigbed", x: 16, y: 4, sleep: true },
      { type: "nightstand", x: 19, y: 3 },
      { type: "nightstand", x: 19, y: 7 },
      { type: "sidetable", x: 8, y: 4 },
      // baño
      { type: "toilet", x: 15, y: 10 },
      { type: "bathtub", x: 18, y: 10 },
      { type: "sink", x: 15, y: 15 },
      // cocina
      { type: "kitchen", x: 1, y: 16, w: 6 },
      { type: "fridge", x: 1, y: 17 },
      { type: "bar", x: 1, y: 19, w: 6 },
      // cuarto de las dos camas
      { type: "wardrobe", x: 13, y: 18, w: 7 },
      { type: "clothestable", x: 19, y: 20 },
      { type: "kidbed", x: 13, y: 23 },
      { type: "kidbed", x: 18, y: 23 },
      { type: "glass", x: 15, y: 26, w: 3 },
      // salón
      { type: "sofa", x: 1, y: 20 },
      { type: "chaise", x: 1, y: 22 },
      { type: "coffeetable", x: 4, y: 23 },
      { type: "tvstand", x: 11, y: 22 },
      { type: "glass", x: 5, y: 33, w: 7 },
      { type: "lightup", x: 5, y: 29, w: 7, h: 4 },
      { type: "plant", x: 1, y: 32 },
    ],
    // «Nueva partida» empieza aquí, en el salón (la cinemática de despertar está en STORY.opening).
    playerStart: { x: 7, y: 27, dir: "down" },
    exits: {
      "12,30": { to: "urba", x: 43, y: 8, dir: "down" },
      "12,31": { to: "urba", x: 43, y: 8, dir: "down" },
    },
    signs: {
      // dormitorio grande
      ...area(16, 4, 4, 3, [
        { who: "kael", text: "Todavía está calentita... No. Fuerza de voluntad." },
      ]),
      ...area(19, 3, 1, 1, [
        { text: "El despertador marca las once y media." },
        { who: "kael", mood: "surprised", text: "...Lo he vuelto a apagar sin despertarme." },
      ]),
      ...area(19, 7, 1, 1, [{ text: "Otra mesita con otro despertador. Este ni siquiera tiene pilas." }]),
      ...area(8, 4, 1, 3, [{ text: "Una mesa con una lámpara y un montón de libros que nadie ha terminado." }]),
      "9,2": [
        { text: "Un calendario. Hay un día marcado con un círculo rojo enorme." },
        { who: "kael", text: "Tengo la sensación de que se me olvida algo..." },
      ],
      ...area(11, 2, 4, 1, [
        { text: "La puerta de la terraza. Entra un sol que da gusto." },
        { who: "kael", text: "Está atrancada. Como yo los lunes." },
      ]),
      // cuarto pequeño
      ...area(2, 2, 2, 1, [{ text: "Hace un día precioso ahí fuera." }]),
      ...area(5, 3, 2, 3, [
        { text: "Una cama perfectamente hecha. Aquí no ha dormido nadie... o alguien muy ordenado." },
      ]),
      ...area(1, 7, 1, 2, [
        { text: "El ordenador está en suspensión. En la pantalla hay una nota: «¡No olvides lo de hoy!»." },
        { who: "kael", mood: "surprised", text: "¿Lo de hoy? ¿Qué es lo de hoy?" },
      ]),
      ...area(1, 10, 1, 2, [{ text: "Una partida a medias. Mejor no tocar nada si quieres seguir vivo." }]),
      // baño
      "15,10": [{ text: "Mejor no." }],
      "15,15": [
        { text: "Te miras en el espejo." },
        { who: "kael", mood: "surprised", text: "Este pelo necesita ayuda profesional." },
      ],
      ...area(18, 10, 2, 3, [{ text: "La bañera. Un patito de goma te vigila en silencio." }]),
      // cocina
      ...area(1, 16, 6, 1, [{ text: "La cocina está recogida. Sospechosamente recogida." }]),
      ...area(1, 17, 1, 2, [
        { text: "Abres la nevera. Hay un hueco enorme, como si alguien se hubiera llevado algo muy grande." },
        { who: "kael", text: "...¿Y mi yogur?" },
      ]),
      ...area(1, 19, 6, 1, [
        { text: "Hay una lista en la encimera: «globos, velas, confeti...». El resto está tachado." },
      ]),
      // cuarto de las dos camas
      ...area(13, 18, 7, 1, [
        { text: "El armario empotrado. Está tan lleno que da miedo abrirlo." },
        { who: "kael", text: "Mejor dejarlo así. Por la seguridad de todos." },
      ]),
      ...area(19, 20, 1, 2, [{ text: "Un montón de ropa doblada. Bueno, «doblada»." }]),
      ...area(13, 23, 2, 3, [{ text: "La cama está vacía. Qué silencio hay hoy en casa..." }]),
      ...area(18, 23, 2, 3, [{ text: "La cama está vacía. Qué silencio hay hoy en casa..." }]),
      ...area(15, 26, 3, 1, [{ text: "Por la ventana se ve el patio. Ni un alma." }]),
      // salón
      ...area(1, 20, 6, 2, [
        { text: "El sofá. Tiene la forma exacta de alguien que se pasó aquí todo el domingo." },
      ]),
      ...area(1, 22, 2, 5, [
        { text: "El sofá. Tiene la forma exacta de alguien que se pasó aquí todo el domingo." },
      ]),
      ...area(4, 23, 1, 3, [{ text: "El mando de la tele. Le faltan las pilas, como siempre." }]),
      ...area(11, 22, 1, 3, [
        { text: "La tele está apagada. En el reflejo se ve a alguien despeinado..." },
        { who: "kael", text: "Ah, que soy yo." },
      ]),
      ...area(5, 33, 7, 1, [{ text: "La terraza del salón. Está cerrada, pero entra una luz muy bonita." }]),
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
        2: { enter: { to: "casa", x: 11, y: 30, dir: "left" } },
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
    spawn: { x: 18, y: 6, dir: "down" },
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
      { getUp: { x: 18, y: 7, dir: "down" } },
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
  { name: "La casa", map: "casa" },
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
  { t: "Nunito" },
  {},
  { h: "Reparto" },
  { t: "Anthon · Dominik · Vives · Muha · Diego" },
  { t: "y un rosal deprimido" },
  {},
  {},
  { h: "¡Gracias por jugar!", big: true },
];
