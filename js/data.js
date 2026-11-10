"use strict";

// voice: tono del "blip" al escribir el texto.
// hairStyle: short | bob (media melena corta) | long | spiky | old
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
    portraits: {
      normal: "characters/Anthon/base.png",
      base: "characters/Anthon/base.png",
      surprised: "characters/Anthon/surprised.png",
      scared: "characters/Anthon/scared.png",
      "smile-cry": "characters/Anthon/smile-cry.png",
    },
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
  oscar: {
    id: "oscar",
    name: "Oscar",
    voice: 0.92,
    skin: "#f7cfaa",
    hair: "#65625d",
    hairStyle: "short",
    shirt: "#585652",
    pants: "#3a3d40",
    eyes: "#4a382c",
    portraits: {
      normal: "characters/Oscar/base.png",
      base: "characters/Oscar/base.png",
      happy: "characters/Oscar/happy.png",
    },
  },
  tymen: {
    id: "tymen",
    name: "Tymen",
    voice: 0.88,
    skin: "#fcd8ba",
    hair: "#8a603c",
    hairStyle: "short",
    shirt: "#6b6844",
    pants: "#3a3f4a",
    eyes: "#4a382c",
    portraits: {
      normal: "characters/Tymen/base.png",
      base: "characters/Tymen/base.png",
      happy: "characters/Tymen/happy.png",
    },
  },
  ricardo: {
    id: "ricardo",
    name: "Ricardo",
    voice: 0.65,
    isDog: true,
    fur: "#efd7af",
    collar: "#e03b2e",
    skin: "#efd7af",
    hair: "#c89a65",
    hairStyle: "short",
    shirt: "#e03b2e",
    pants: "#3a3f4a",
    eyes: "#2b1a10",
    portraits: {
      normal: "characters/Ricardo/base.png",
      base: "characters/Ricardo/base.png",
      disapointed: "characters/Ricardo/disapointed.png",
      mad: "characters/Ricardo/mad.png",
      scared: "characters/Ricardo/scared.png",
    },
  },
  mark: {
    id: "mark",
    name: "Mark",
    voice: 0.75,
    skin: "#f8c099",
    hair: "#dcd2c6",
    hairStyle: "short",
    shirt: "#2b211e",
    pants: "#281c1c",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Mark/base.png",
      base: "characters/Mark/base.png",
      happy: "characters/Mark/happy.png",
    },
  },
  jamie: {
    id: "jamie",
    name: "Jamie",
    voice: 0.9,
    skin: "#dfa87d",
    hair: "#a8784a",
    hairStyle: "long",
    shirt: "#2d2622",
    pants: "#3a3530",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Jamie/base.png",
      base: "characters/Jamie/base.png",
      happy: "characters/Jamie/happy.png",
    },
  },
  carol: {
    id: "carol",
    name: "Carol",
    voice: 0.95,
    skin: "#f2c097",
    hair: "#302d32",
    hairStyle: "long",
    shirt: "#5a789a",
    pants: "#415b78",
    eyes: "#3b2c24",
    portraits: {
      normal: "characters/Carol/base.png",
      base: "characters/Carol/base.png",
      happy: "characters/Carol/happy.png",
    },
  },
  owen: {
    id: "owen",
    name: "Owen",
    voice: 1.05,
    skin: "#f9c7a2",
    hair: "#35211c",
    hairStyle: "short",
    shirt: "#3a3532",
    pants: "#393f43",
    eyes: "#3b2c24",
    portraits: {
      normal: "characters/Owen/base.png",
      base: "characters/Owen/base.png",
      happy: "characters/Owen/happy.png",
    },
  },
  keziah: {
    id: "keziah",
    name: "Keziah",
    voice: 1.1,
    skin: "#fcccaa",
    hair: "#6b422a",
    hairStyle: "long",
    shirt: "#9c4b28",
    pants: "#c9a07b",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Keziah/base.png",
      base: "characters/Keziah/base.png",
      happy: "characters/Keziah/happy.png",
    },
  },
  gabi: {
    id: "gabi",
    name: "Gabi",
    nameRevealedBy: "gabi_revealed", // se muestra "???" hasta que G.flags contenga esta bandera
    voice: 0.8,
    skin: "#e8b896",
    hair: "#2a2630",
    hairStyle: "short",
    hood: "#3a3646",
    shirt: "#3a3646",
    pants: "#2a2832",
    eyes: "#2a2630",
    portraits: {
      normal: "characters/Gabi/covered.png",
      covered: "characters/Gabi/covered.png",
      uncovered: "characters/Gabi/uncovered.png",
    },
  },
  alexandra: {
    id: "alexandra",
    name: "Alexandra",
    voice: 1.05,
    skin: "#f4c3a2",
    hair: "#6a3520",
    hairStyle: "long",
    shirt: "#e8eaf0",
    pants: "#3a4660",
    eyes: "#6a95b0",
    portraits: {
      normal: "characters/Alexandra/base.png",
      base: "characters/Alexandra/base.png",
    },
  },
  radu: {
    id: "radu",
    name: "Radu",
    voice: 0.9,
    skin: "#e8b48c",
    hair: "#2a2522",
    hairStyle: "short",
    shirt: "#c4dcae",
    pants: "#3a3f4a",
    eyes: "#5a3a26",
    portraits: {
      normal: "characters/Radu/base.png",
      base: "characters/Radu/base.png",
    },
  },
  jessie: {
    id: "jessie",
    name: "Jessie",
    voice: 1.05,
    skin: "#f6cdb2",
    hair: "#e06a2a",
    hairStyle: "long",
    shirt: "#c88aa0",
    pants: "#3a4660",
    eyes: "#4aa89a",
    portraits: {
      normal: "characters/Jessie/base.png",
      base: "characters/Jessie/base.png",
    },
  },
  safa: {
    id: "safa",
    name: "Safa",
    voice: 0.9,
    skin: "#e8a97c",
    hair: "#2a2523",
    hairStyle: "short",
    beardColor: "#2a2523",
    look: { beard: "full" },
    shirt: "#2f3857",
    pants: "#3a3f4a",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Safa/base.png",
      base: "characters/Safa/base.png",
    },
  },
  // Angel, el organizador de la fiesta. No es invitado: solo aparece en escenas.
  angel: {
    id: "angel",
    name: "Angel",
    voice: 0.9,
    skin: "#eab48e",
    hair: "#3a2620",
    hairStyle: "spiky",
    shirt: "#f4f4f6",
    accent: "#2f6fd0", // color del bocadillo (la camiseta blanca no contrasta con el fondo crema)
    pants: "#3a3f4a",
    eyes: "#4a3022",
    portraits: {
      normal: "characters/Angel/base.png",
      base: "characters/Angel/base.png",
      mad: "characters/Angel/mad.png",
      scared: "characters/Angel/scared.png",
      smile: "characters/Angel/smile.png",
      disapointed: "characters/Angel/disapointed.png",
      disgust: "characters/Angel/disgust.png",
    },
  },
  // Simone: el villano. Aparece en la carretera al empezar la batalla en coche y se convierte en el monstruo.
  simone: {
    id: "simone",
    name: "Simone",
    voice: 0.75,
    skin: "#e2a77e",
    hair: "#8a8178", // castaño canoso, tirando a gris
    hairStyle: "short",
    shirt: "#2a2220",
    accent: "#8a3a2a", // la camiseta negra no luce como color del bocadillo
    pants: "#3a3f4a",
    eyes: "#5a8ab0",
    portraits: {
      normal: "characters/Simone/base.png",
      base: "characters/Simone/base.png",
      evil: "characters/Simone/evil.png",
    },
  },
  // Sharon: punto 5 de la playa. Pelo corto rubio y vestido blanco con hojas verdes (como en sus fotos);
  // mira el mar desde lo alto. Habla en scenes/scene_sharon.js.
  sharon: {
    id: "sharon",
    name: "Sharon",
    voice: 1.1,
    skin: "#e9b48e",
    hair: "#f2cf4a",
    hairStyle: "short",
    shirt: "#f4f2ea",
    pants: "#f4f2ea",
    print: "#4e9a50", // estampado de hojas verdes sobre la ropa (js/art.js)
    accent: "#4e9a50", // el vestido blanco no contrasta como color del bocadillo
    eyes: "#3b2c24",
    portraits: {
      normal: "characters/Sharon/base.png",
      base: "characters/Sharon/base.png",
      smile: "characters/Sharon/smile.png",
      suspecting: "characters/Sharon/suspecting.png",
      "suspecting.smile": "characters/Sharon/suspecting.smile.png",
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
  { chat: "Oscar", char: "oscar" },
  { chat: "Tymen", char: "tymen" },
  { chat: "Ricardo", char: "ricardo", count: false }, // no cuenta para el contador de saludos
  { chat: "Mark", char: "mark" },
  { chat: "Jamie", char: "jamie" },
  { chat: "Carol", char: "carol" },
  { chat: "Owen", char: "owen" },
  { chat: "Keziah", char: "keziah" },
  { chat: "Alexandra", char: "alexandra" },
  { chat: "Radu", char: "radu" },
  { chat: "Jessie", char: "jessie" },
  { chat: "Safa", char: "safa" },
  { chat: "Gabi", char: "gabi", count: false }, // no cuenta para el contador de saludos
];
// Parejas que siempre aparecen una al lado de la otra en la piscina.
const GUEST_PAIRS = [["mark", "carol"], ["radu", "alexandra"]];
// Invitado que espera fuera del patio, donde antes había un globo azul, justo donde se sale de la zona de la terraza.
const GUEST_AT_HOME = { char: "ricardo", x: 43, y: 14, dir: "down" };
// Gabi, encapuchada, dos casillas a la derecha de Ricardo y también mirando al sur.
const GUEST_HOODED = { char: "gabi", x: 45, y: 14, dir: "down" };
// Grupos que se reparten al azar, cada uno por su zona [x0, y0, x1, y1] (nadie más que Ricardo queda fuera):
//  - derecha de la piscina, donde estaba el edificio de los vestuarios
//  - suroeste de la piscina (abajo a la izquierda), el resto, juntos
const GUEST_ZONES = [
  { area: [38, 60, 46, 69], chars: ["dominik", "diego", "alexandra", "muha", "oscar", "radu", "tymen", "vives", "jessie", "safa"] },
  { area: [25, 59, 30, 69], chars: ["mark", "carol", "jamie", "owen", "keziah"] },
];

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
  "You knock. Nobody answers. Strange, there's always someone home at this hour...",
  "Behind the door, a dog barks like you owe it money.",
  "The doormat says “Welcome”. The door, however, is locked.",
  "It smells like freshly made tortilla. But nobody opens up.",
  "There's a note on the door: “Back soon”. It's been there since 2019.",
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
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) out[`${i},${j}`] = lines;
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
            text: "Lira's door is closed. It smells like herbal tea.",
          },
        ],
      },
    ],
    signs: {
      "8,6": [
        { text: "“Breeze Village”" },
        { text: "Population: 4 inhabitants and an undetermined number of mushrooms." },
      ],
      "13,16": [
        { text: "Road to the Whispering Forest." },
        {
          text: "CLOSED FOR ROADWORKS (of destiny). Please come back next chapter.",
        },
      ],
    },
    decor: [{ type: "bobber", x: 7, y: 12 }],
    playerStart: { x: 5, y: 6, dir: "down" },
    intro: [
      { text: "A quiet morning in Breeze Village..." },
      {
        text: "The sun is shining, the birds are singing, and someone has lost their mushroom basket again.",
      },
      {
        who: "kael",
        mood: "happy",
        text: "Good morning, world! Let's see what everyone's up to today.",
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
    name: "Condado de Alhama, Murcia Apartment",
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
    // «New Game» empieza aquí, en el salón (la cinemática de despertar está en STORY.opening).
    playerStart: { x: 7, y: 27, dir: "down" },
    exits: {
      "12,30": { to: "urba", x: 44, y: 9, dir: "right" },
      "12,31": { to: "urba", x: 44, y: 9, dir: "right" },
    },
    signs: {
      // dormitorio grande
      ...area(16, 4, 4, 3, [
        {
          who: "kael",
          text: "It's still warm... No. Willpower.",
        },
      ]),
      ...area(19, 3, 1, 1, [
        { text: "The alarm clock says half past eleven." },
        {
          who: "kael",
          mood: "surprised",
          text: "...Lo he vuelto a apagar sin despertarme.",
        },
      ]),
      ...area(19, 7, 1, 1, [
        {
          text: "Another nightstand with another alarm clock. This one doesn't even have batteries.",
        },
      ]),
      ...area(8, 4, 1, 3, [
        {
          text: "A table with a lamp and a pile of books nobody has finished.",
        },
      ]),
      "9,2": [
        {
          text: "A calendar. One day is circled in huge red ink.",
        },
        { who: "kael", text: "I have the feeling I'm forgetting something..." },
      ],
      ...area(11, 2, 4, 1, [
        { text: "The terrace door. The sunshine pouring in feels great." },
        { who: "kael", text: "It's stuck. Just like me on Mondays." },
      ]),
      // cuarto pequeño
      ...area(2, 2, 2, 1, [{ text: "It's a beautiful day out there." }]),
      ...area(5, 3, 2, 3, [
        {
          text: "A perfectly made bed. Nobody slept here... or someone very tidy did.",
        },
      ]),
      ...area(1, 7, 1, 2, [
        {
          text: "The computer is asleep. There's a note on the screen: “Don't forget about today!”",
        },
        {
          who: "kael",
          mood: "surprised",
          text: "Today? What's today?",
        },
      ]),
      ...area(1, 10, 1, 2, [
        {
          text: "A half-finished game. Better not touch anything if you want to stay alive.",
        },
      ]),
      // baño
      "15,10": [{ text: "Better not." }],
      "15,15": [
        { text: "You look in the mirror." },
        {
          who: "kael",
          mood: "surprised",
          text: "Este pelo necesita ayuda profesional.",
        },
      ],
      ...area(18, 10, 2, 4, [
        { text: "The bathtub. A rubber duck watches you in silence." },
      ]),
      // cocina
      ...area(1, 16, 6, 1, [
        { text: "The kitchen is tidy. Suspiciously tidy." },
      ]),
      ...area(1, 17, 1, 2, [
        {
          text: "You open the fridge. There's a huge gap, as if someone took something very big.",
        },
        { who: "kael", text: "...Where's my yogurt?" },
      ]),
      ...area(1, 19, 6, 1, [
        {
          text: "There's a list on the counter: “balloons, candles, confetti...”. The rest is crossed out.",
        },
      ]),
      // cuarto de las dos camas
      ...area(13, 18, 7, 1, [
        { text: "The built-in wardrobe. It's so full it's scary to open." },
        { who: "kael", text: "Better leave it like that. For everyone's safety." },
      ]),
      ...area(19, 20, 1, 2, [
        { text: "A pile of folded clothes. Well, “folded”." },
      ]),
      ...area(13, 23, 2, 3, [
        { text: "The bed is empty. It's so quiet at home today..." },
      ]),
      ...area(18, 23, 2, 3, [
        { text: "The bed is empty. It's so quiet at home today..." },
      ]),
      ...area(15, 26, 3, 1, [
        { text: "Through the window you can see the courtyard. Not a soul." },
      ]),
      // salón
      ...area(1, 20, 6, 2, [
        {
          text: "The sofa. It has the exact shape of someone who spent all Sunday here.",
        },
      ]),
      ...area(1, 22, 2, 5, [
        {
          text: "The sofa. It has the exact shape of someone who spent all Sunday here.",
        },
      ]),
      ...area(4, 23, 1, 3, [
        { text: "The TV remote. The batteries are missing, as always." },
      ]),
      ...area(11, 22, 1, 3, [
        {
          text: "The TV is off. In the reflection you see someone with messy hair...",
        },
        { who: "kael", text: "Oh, that's me." },
      ]),
      ...area(5, 33, 7, 1, [
        {
          text: "The living room terrace. It's closed, but a lovely light comes in.",
        },
      ]),
    },
  },

  // Escenario 2: la urbanización, en proporción a la foto aérea y girada para que el norte quede arriba.
  // Arriba la carretera de detrás de casa y nuestro bloque de tres adosadas (la nuestra, la de la derecha)
  // con un camino a cada lado. Debajo, el gran parque de palmeras con la piscina a dos tercios y la zona
  // de arena al fondo; a los lados, filas de adosados separadas del parque por una franja de césped.
  urba: {
    name: "Condado de Alhama Residential Area",
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaT",
      "TaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaT",
      "T------------------------------------------------------------------------T",
      "T..........................=...................=..............-.........-T",
      "T.Y........................=...................=..,..w:::.....-w:::.....-T",
      "T.....,.........T..........=..........,........=.....::::.....-::::.....-T",
      "T.,......T...,.........Y...=........,..........=.....wwww.....-wwww.....-T",
      "T..........................=w....bw....b::::::w=,....w:::.....-w:::.....-T",
      "T,........Y.Y...T..........=w.....w.....::::::w=.,...::::.....-::::.....-T",
      "T....T........,............=w.....w.....w:::::w=..,..wwww.....-wwww.....-T",
      "T..........................=w.....w.....w:::::w=.,...w:::.....-w:::.....-T",
      "T..........................=wb....wb....w:::::w=.....::::.....-::::.,...-T",
      "T.Y.....Y......Y...........=www.wwwww.wwwg:wwww=.....wwww.....-wwww.....-T",
      "T.....,....Y.,.............=...................=.....w:::.....-w:::.....-T",
      "T........Y.................=...........g.......=.....::::.....-::::.....-T",
      "T.....................======..................======.wwww.....-wwww.....-T",
      "T---------------------=........Y...................=---------------------T",
      "T-w::..........::::w..=.....Y...............Y......=.w:::.....-w:::.....-T",
      "T-:::........,.:::::..=..................T.........=.::::.....-::::.....-T",
      "T-www..........wwwww..=............................=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=..Y..Y.Y...........Y.....b..=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=............................=.::::.....-::::.....-T",
      "T-www..........wwwww..=..T.........................=.wwww.....-wwww.,...-T",
      "T-w::..........::::w..=......T..........,.Y..Y.....=.w:::.....-w:::...,.-T",
      "T-:::..........:::::..=..........T.................=.::::.....-::::.....-T",
      "T-www..........wwwww..=......Y............Y..Y.Y.b.=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=..b.....Y...................=.w:::.....-w:::.....-T",
      "T-:::.,.,......:::::..=....Y.............Y...Y..Y..=.::::.....-::::.....-T",
      "T-www..........wwwww..=............g.......Y.......=.wwww.....-wwww.....-T",
      "T---------------------=....,..Y..............T.....=---------------------T",
      "T-w::..........::::w..=..........Y......Y.Y........=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.....................T......=.::::.....-::::.....-T",
      "T-www..........wwwww..=..................Y......T..=.wwww.....-wwww.,...-T",
      "T-w::..........::::w..=...Y..Y...............Y.....=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=..........Y.......Y.........=.::::...,.-::::.....-T",
      "T-www..,,......wwwww..=.....Y.Y.......g....Y.......=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=...Y........................=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.....Y...b............T.....=.::::.....-::::.....-T",
      "T-www..........wwwww..=.........................Y..=.wwww.....-wwww..,..-T",
      "T-w::..........::::w..=.................Y..........=.w:::.,...-w:::.....-T",
      "T-:::..........:::::..=...................Y........=.::::.....-::::.....-T",
      "T-www..........wwwww..=........Y...g....Y....Y.....=.wwww.....-wwww.....-T",
      "T---------------------=.....b.............T........=---------------------T",
      "T-w::..........::::w..=.......Y.............,...Y.n=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=............g..g............=.::::...,.-::::.....-T",
      "T-www..........wwwww..=.............::........,....=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=.......::::::::::::::.......=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.......::::::::::::::...Y...=.::::.....-::::.....-T",
      "T-www...,......wwwww..=.......:PPPPPPPPPP:::.......=.wwww.....-wwww.....-T",
      "T-w::.,.,,.....::::w..=.......:PPPPPPPPPP:::.......=.w:::.....-w:::.....-T",
      "T-:::....,.....:::::..=..Y....:PPPPPPPPPP:::.......=.::::.....-::::.....-T",
      "T-www..........wwwww..=.......:PPPPPPPPPP:::.......=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=.T.....:PPPPPPPPPP:::.......=.w:::.....-w:::.....-T",
      "T-:::..,.......:::::..=.......:PPPPPPPPPP:::.......=.::::.....-::::...,.-T",
      "T-www..........wwwww..=.......:PPPPPPPPPP:::.....Y.=.wwww.....-wwww.....-T",
      "T---------------------=..b....:PPPPPPP::::::.......=---------------------T",
      "T-w::..........::::w..=.......:PPPPPPP::::::....Y..=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=..Y....:PPPPPPP::::::.......=.::::...,.-::::.....-T",
      "T-www..........wwwww..=.......:PPPPPPP::::::.......=.wwww.....-wwww..,..-T",
      "T-w::..........::::w..=..Y....:PPPPPPP::::::.......=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.......:PPPPPPP::::::.......=.::::.....-::::.....-T",
      "T-www..........wwwww..=.......:PPPPPPP::::::...b...=.wwww.....-wwww.....-T",
      "T-w::.....,....::::w..=.......:PPPPPPP::::::.......=.w:::.....-w:::.....-T",
      "T-:::........,.:::::..=.......:PPPPPPP::::::.......=.::::.....-::::.....-T",
      "T-www..........wwwww..=...b...:PPPPPPP::::::.......=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=.......:PPPPPPP::::::...b...=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=..Y.b..:PPPPPPP::::::.......=.::::.....-::::...,.-T",
      "T-www..........wwwww..=.......::::::::::::::.....Y.=.wwww.....-wwww.....-T",
      "T---------------------=............................=---------------------T",
      "T-w::..........::::w..=............................=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=........,..........b.....Y..=.::::.....-::::.....-T",
      "T-www..........wwwww..=............................=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=....,.......................=.w:::.....-w:::.,.,.-T",
      "T-:::...,,.....:::::..=..Y............b....,.....Y.=.::::.....-::::...,.-T",
      "T-www..........wwwww..=.......b..........b.........=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=.......................,....=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=....Y.......T...T...........=.::::.....-::::.....-T",
      "T-www..........wwwww..=..Y....Y..T...,.....Y.....Y.=.wwww.....-wwww.....-T",
      "T-w::........,.::::w..=.....,............b...b.....=.w:::.....-w:::.....-T",
      "T-:::.......,..:::::..=................Y........Y..=.::::..,..-::::.....-T",
      "T-www..........wwwww..=.............n.......Y......=.wwww.....-wwww.....-T",
      "T---------------------=.Y...Y.zzzzzzzzzzzzz........=---------------------T",
      "T-w::..........::::w..=.......zzzzzzzzzzzzz......Y.=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.......zzzzzzzzzzzzz..Y.....=.::::.....-::::.....-T",
      "T-www..........wwwww..=.......zzzzzzzzzzzzz.....b..=.wwww.....-wwww.....-T",
      "T-w::..........::::w..=.......zzzzzzzzzzzzz.,......=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=.......zzzzzzzzzzzzz........=.::::.....-::::...,.-T",
      "T-www..........wwwww..=.......zzzzzzzzzzzzz........=.wwww.....-wwww...,.-T",
      "T-w::..........::::w..=...Y..................T.....=.w:::.....-w:::.....-T",
      "T-:::..........:::::..=...................Y........=.::::.....-::::.....-T",
      "T-www..........wwwww..=.............b...........Y..=.wwww.....-wwww.....-T",
      "T-....................=............................=..........-.........-T",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    houses: [
      // la nuestra es la de la derecha. Como en el plano de dentro, el salón sobresale hacia el patio
      // por la izquierda (el anexo de debajo) y la habitación de las dos camas da al tramo estrecho del patio.
      ...adosados(28, 4, 3, { 2: { door: false } }),
      {
        x: 40,
        y: 8,
        w: 4,
        h: 2,
        style: "annex",
        face: "right", // puerta del lateral (la D del salón), en (43,9)
        terrace: [1, 2], // cristalera de la terraza del salón, en x41-42 (sin llegar a la esquina)
        enter: { to: "casa", x: 11, y: 30, dir: "left" },
      },
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
    ],
    furniture: [
      // coches aparcados en la carretera de detrás de casa
      { type: "carwhite", x: 6, y: 2 },
      { type: "car", x: 19, y: 1 },
      { type: "carblue", x: 35, y: 2 },
      { type: "carwhite", x: 50, y: 1 },
      { type: "car", x: 64, y: 2 },
      // patio: mesa con sillas a la derecha
      { type: "patiotable", x: 44, y: 11 },
      { type: "gardenchair", x: 44, y: 12 },
      { type: "gardenchair", x: 45, y: 12 },
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
      { type: "float", x: 34, y: 52 },
      // zona de baile de la derecha: postes para las luces de fiesta y altavoces
      { type: "pole", x: 38, y: 60 },
      { type: "pole", x: 44, y: 60 },
      { type: "pole", x: 38, y: 68 },
      { type: "pole", x: 44, y: 68 },
      { type: "speaker", x: 38, y: 64 },
      { type: "speaker", x: 44, y: 65 },
      { type: "speaker", x: 41, y: 69 },
    ],
    decor: [
      { type: "bunting", x0: 30, x1: 43, y: 47 },
      { type: "partylights", x0: 38, x1: 44, y: 60 },
      { type: "partylights", x0: 38, x1: 44, y: 68 },
      { type: "confetti", area: [30, 47, 43, 68] },
    ],
    playerStart: { x: 44, y: 9, dir: "right" },
    intro: [
      { who: "kael", text: "It's so quiet in the neighborhood today..." },
      { who: "kael", mood: "surprised", text: "Is that a balloon on the fence?" },
    ],
    signs: {
      "41,13": [
        {
          text: "A balloon tied to the courtyard fence. It has a note hanging from it:",
        },
        { text: "“Follow the balloons. And hurry up, sleepyhead.”" },
        {
          who: "kael",
          mood: "surprised",
          text: "More balloons? There's another one...",
        },
      ],
      "50,44": [
        { text: "A note stuck in the grass:" },
        { text: "“This way? Cold, cold! Go back to the balloons.”" },
        {
          who: "kael",
          text: "Someone went to a lot of trouble for this.",
        },
      ],
      "36,81": [
        { text: "Another note, half buried in the sand:" },
        {
          text: "“There's only sand and a bucket without a shovel here. The party is NOT at the swings.”",
        },
      ],
      "39,15": [
        {
          text: "Another balloon. And further along the park path, there's another.",
        },
      ],
      "35,29": [
        { text: "A balloon tied to a palm tree... no, to a stake." },
        {
          who: "kael",
          text: "So many balloons. Someone emptied an entire shop.",
        },
      ],
      "35,45": [
        { text: "A balloon with a huge number drawn on it." },
        {
          who: "kael",
          mood: "surprised",
          text: "Wait... is that number my age?",
        },
      ],
      "38,45": [
        {
          text: "On the other side of the hedge you hear laughter and someone shushing everybody.",
        },
        { who: "kael", text: "What could be going on in there?" },
      ],
      ...area(41, 9, 2, 1, [
        {
          text: "The living room terrace door, seen from outside. It's closed.",
        },
      ]),
      "44,11": [
        { text: "The courtyard table. Someone left a half-drunk lemonade." },
      ],
      "45,11": [
        { text: "The courtyard table. Someone left a half-drunk lemonade." },
      ],
      "39,57": [
        {
          text: "A huge cake with candles. Not started yet. Barely.",
        },
      ],
      "40,57": [
        {
          text: "A huge cake with candles. Not started yet. Barely.",
        },
      ],
      "41,57": [{ text: "Cups, soft drinks and a mountain of chips." }],
      "43,57": [
        {
          text: "A pile of presents. One of them is ticking. Better not ask.",
        },
      ],
      "43,58": [
        {
          text: "A pile of presents. One of them is ticking. Better not ask.",
        },
      ],
      "31,84": [
        {
          text: "The swings. Nobody's here today: everyone is somewhere else.",
        },
      ],
      "39,84": [{ text: "The slide is hot as a frying pan. Better not." }],
    },
  },

  // Escenario 3: la playa, según el boceto: el mar arriba y la carretera abajo.
  // Se empieza en la acera (punto 1), junto al coche estrellado contra una palmera. Un pasillo de arena
  // entre muros blancos (2) sube hasta la playa. A la izquierda de la columna 21 (línea 3) la playa sigue,
  // pero Anthon se da la vuelta (`turnBack`). A la derecha, una meseta de arena más alta (punto 7):
  // se sube por una rampa de arena en el cortado y desde arriba se llega a la puerta trasera de la casa
  // blanca grande (punto 4) y a Sharon, que mira el mar (punto 5).
  // Suelos propios: m mar, R piedras con arena, z arena (abajo), y arena alta (meseta),
  // H cortado de arenisca, E rampa de arena. Entre la arena de abajo y la alta solo se pasa por la rampa.
  playa: {
    name: "Mazarrón Beach",
    night: true, // toda la playa transcurre de noche (tinte nocturno en renderWorld)
    base: "sand", // bajo palmeras, muros y carteles hay arena, no hierba
    tiles: [
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmyyyyymyyyyyyyRRRmmmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmyyymyyyyyyyyyyyyyRRRRRmm",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmyyymyyyyyyyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmyyyyyyyyyyyyyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzyyyyyyyyyyyyyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzyyyyyyyyyyyyyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzRyyyyyyyyyyyyyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzzRyyyyyRRRRRRRyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzzRyyyyyRRRRRRRyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzzzRHHEEHRRRRRRRyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzzzzRHHEEHRRRRRRRyyyyyyyRRRRRRR",
      "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmzzzzzzzzzzzzRzzzzzRRRRRRRyyyyyyyRRRRRRR",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzRRRRRRRyyyyyyyRRRRRRR",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzwwwwww...........wwww",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw....................",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw.Y................Y.",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw....................",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw...b.............b..",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw....................",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw.Y................Y.",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw....................",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw........b...b.......",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw..Y...Y...Y...Y...Y.",
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzw....................",
      "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwzzzzzzzzzzzzwwwwwwwwwwwwwwwwwwwww",
      "......................................wzzzzzzzzzzzzw....................",
      "........................Y.........b...wzzzzzzzzzzzzw.........Y..........",
      "...Y....Y....b.....Y.........Y........wzzzzzzzzzzzzw...Y.........Y....Y.",
      "......................................wzzzzzzzzzzzzw....................",
      "....Y.............b....Y....b.........wzzzzzzzzzzzzw...b..........b.....",
      ".........Y....b...................b...wzzzzzzzzzzzzw.........Y........Y.",
      "......................................wzzzzzzzzzzzzw....................",
      "...Y.....Y....Y.........Y...Y.........wzzzzzzzzzzzzw...Y..........Y.....",
      "..................b..............Y....wzzzzzzzzzzzzw........Y.........Y.",
      "......................................wzzzzzzzzzzzzw....................",
      "...................Y........b.....b...wzzzzzzzzzzzzw....................",
      "...Y.....Y....Y........Y..............wzzzzzzzzzzzzw....Y....b....Y...b.",
      "......................................wzzzzzzzzzzzzw....................",
      "...Y....Y.....Y....b....b....Y...Y....wzzzzzzzzzzzzw...Y.....Y....Y...Y.",
      "......................................wzzzzzzzzzzzzw....................",
      "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwzzzzzzzzzzzzwwwwwwwwwwwwwwwwwwwww",
      "------------------------------------------Y-----------------------------",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "------------------------------------------------------------------------",
      "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
      "zYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzzzYzz",
    ],
    // zonas por las que no se pasa: al intentarlo, Anthon se da la vuelta (x0, y0, x1, y1)
    turnBack: [[0, 21, 20, 32]],
    // lo que se ve al mirar el mar (m) desde la orilla
    seaText: [{ text: "The water is cold and clear." }],
    houses: [
      // la casa blanca grande del punto 4: su puerta da arriba, a la meseta
      {
        x: 57,
        y: 22,
        w: 11,
        h: 7,
        style: "med",
        face: "up",
        locked: [
          { text: "The back door of a huge white house. It opens straight onto the rocks and the sea." },
          { text: "You knock. Nobody answers. You can only hear the waves." },
        ],
      },
    ],
    npcs: [
      // punto 5: Sharon mira el mar desde lo alto (su escena salta al subir la rampa: scenes/scene_sharon.js)
      { char: "sharon", x: 54, y: 9, dir: "up" },
    ],
    furniture: [
      // la roca enorme en el mar
      { type: "bigrock", x: 32, y: 7 },
      { type: "carcrash", x: 40, y: 50 },
      // conos de obra: la carretera está cortada a izquierda y derecha
      ...[50, 51, 52, 53].flatMap((y) => [
        { type: "cone", x: 27, y },
        { type: "cone", x: 61, y },
      ]),
      // felpudo delante de la puerta trasera de la casa grande
      { type: "doormat", x: 62, y: 21 },
    ],
    decor: [{ type: "smoke", x: 41, y: 50 }],
    playerStart: { x: 39, y: 50, dir: "up" },
    signs: {
      ...area(40, 50, 2, 1, [
        {
          text: "The convertible is wedged against the palm tree. Smoke is coming out of the hood and it doesn't smell good.",
        },
        { who: "kael", text: "Well... the monster came out worse. I think." },
      ]),
      "42,50": [{ text: "The palm tree didn't even flinch. It won." }],
      ...area(27, 50, 1, 4, [
        { text: "Traffic cones. The road is closed here." },
      ]),
      ...area(61, 50, 1, 4, [
        { text: "Traffic cones. The road is closed here." },
      ]),
      ...area(38, 33, 1, 17, [
        { text: "A white wall. Behind it there are so many palm trees you can't see anything." },
      ]),
      ...area(21, 33, 17, 1, [
        { text: "A white wall. Behind it there's a garden full of palm trees." },
      ]),
      ...area(51, 22, 1, 28, [
        { text: "On the other side of the wall there's a garden with palm trees. And a “Private property” sign." },
      ]),
      ...area(46, 19, 2, 1, [{ text: "A sandstone cliff. You can't climb up here." }]),
      "50,19": [{ text: "A sandstone cliff. You can't climb up here." }],
      ...area(45, 15, 1, 6, [{ text: "Loose rocks half buried in the sand. Better stay out." }]),
      ...area(51, 16, 7, 6, [{ text: "Loose rocks half buried in the sand. Better stay out." }]),
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
 * Opcional: `cast: [{ char, x, y, dir }]` pone esos personajes en el mapa al empezar la historia.
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
          { who: "kael", text: "Ugh, I always wake up at the best part." },
        ],
      },
    ],
  },
  // Tras la batalla: el coche acaba empotrado contra una palmera junto a la playa (punto 1).
  // Anthon, Angel y Ricardo aparecen juntos en la acera, al lado del coche.
  playa: {
    map: "playa",
    spawn: { x: 39, y: 50, dir: "up" },
    cast: [
      { char: "angel", x: 41, y: 51, dir: "up" }, // delante del coche, mirándolo (el capó humea en 41,50)
      { char: "ricardo", x: 37, y: 50, dir: "up" },
    ],
    steps: [
      { dark: 1 },
      { wait: 40 },
      { sfx: "boom" },
      { wait: 100 },
      { fade: 0, frames: 150 },
      { wait: 30 },
      { face: ["ricardo"] }, // Angel sigue mirando el coche
      {
        say: [
          { who: "angel", mood: "smile", text: "The car's not working. I'm going to try to fix it." },
          { who: "ricardo", mood: "base", text: "Call the insurance, you won't be able to fix it." },
          { who: "angel", mood: "base", text: "Anthon, go to the beach if you want, there's not much to do here." },
        ],
      },
    ],
  },
};

/*
 * Niveles que se pueden elegir desde el título («Choose Level»). Cada uno empieza de una de estas formas:
 *  story: 'clave de STORY'   la cinemática de esa historia
 *  map: 'clave de MAPS'      en ese mapa, en su `playerStart`
 *  minigame: 'chase'         la batalla en coche (al ganar se vuelve al título, o se sigue con `then: 'clave de STORY'`)
 *  soon: true                todavía no existe: sale en la lista como «próximamente»
 * «New Game» empieza por el primero.
 */
const LEVELS = [
  { name: "The House", map: "casa" },
  { name: "The Courtyard", map: "urba" },
  { name: "The Battle Against the Monster", minigame: "chase", then: "playa" }, // al ganar se pasa a la playa
  { name: "The Beach", story: "playa" },
];

// Mapas donde suena la música alegre de la fase 1 (js/audio.js).
const MUSIC_MAPS = new Set(["casa", "urba"]);

// Batalla en coche contra el monstruo (js/battle.js y js/chasetop.js).
const CHASE = {
  boss: "THE MONSTER",
  hp: 30, // balas que aguanta antes de explotar
  carHp: 5, // jeringuillas que aguanta el coche (la barra nunca llega a cero: con 1 salta scenes/scene_gabi.js)
  syringeEvery: 85, // frames entre jeringuillas al empezar; lanza más rápido cuanto menos vida le queda
  magazine: 10, // balas por cargador
  reloadFrames: 120, // recarga al vaciar el cargador (60 = 1 s)
};

const CREDITS = [
  { h: "BREEZE VILLAGE", big: true },
  { t: "a small RPG prototype" },
  {},
  { h: "Idea and Direction" },
  { t: "Angel Quesada" },
  {},
  { h: "Programming" },
  { t: "Claude" },
  {},
  { h: "Art" },
  { t: "Pixel art generated by code" },
  {},
  { h: "Sonido" },
  { t: "Synthesized in real time with Web Audio" },
  {},
  { h: "Typography" },
  { t: "Nunito" },
  {},
  { h: "Cast" },
  {
    t: "Anthon · Dominik · Vives · Muha · Diego · Oscar · Tymen · Ricardo · Mark · Jamie · Carol · Owen · Keziah",
  },
  { t: "and a depressed rosebush" },
  {},
  {},
  { h: "Thanks for playing!", big: true },
];
