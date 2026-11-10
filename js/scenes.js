"use strict";
// Escenas: momentos en los que uno o varios personajes interactúan y hablan (y pueden pasar más cosas).
// Cada escena va en su propio archivo de scenes/ y se registra en SCENES:
//
//   SCENES.nombre = {
//     map: "urba",                 // mapa donde ocurre
//     area: [x0, y0, x1, y1],      // se activa la primera vez que Anthon pisa una casilla de esta zona
//     lines: [                     // se ejecuta en orden
//       { "ricardo.base": "Hola" },                // diálogo: { "personaje.imagen": "texto" }
//       { walk: { to: [41, 64], speed: 2 } },      // Anthon camina solo hasta esa casilla (speed 2 = el doble de rápido)
//       { shake: 120 },                            // terremoto: la pantalla tiembla 120 frames (2 s)
//       { enter: { who: "angel", speed: 2 } },     // aparece fuera de pantalla y corre hasta ponerse cara a cara con Anthon
//                                                  // (si ya está en el mapa, solo se acerca a Anthon desde donde esté)
//       { photo: { anthon: [36, 72], camera: [36, 75], beside: "angel", hide: ["gabi"], rows: 2 } },
//                                                  // foto de grupo: Anthon en esa casilla, todos los demás pegados en
//                                                  // `rows` filas justo detrás, cámara con trípode en `camera`,
//                                                  // `beside` a la derecha de Anthon y `hide` oculto (mejor hacerlo con la pantalla en negro)
//       { flash: 40 },                             // flash de cámara (pantalla blanca que se apaga en 40 frames)
//       { run: { who: ["angel", "anthon"], speed: 2 } }, // salen corriendo (el primero guía, el resto le sigue) por donde entró
//       { fade: 1, frames: 60 },                   // la pantalla se oscurece (1 = negro del todo)
//       { wait: 30 },                              // pausa en frames
//       { battle: "chase" },                       // empieza el combate en coche (mejor tras un fade a negro)
//       { hold: true },                            // la escena se queda ahí (sin terminar)
//     ],
//   };
//
// En vez de `area`, una escena puede llevar `when: { greeted: "all" }`: se lanza al terminar de saludar
// a todos los invitados que cuentan (o `greeted: 3`: al haber saludado a 3 cualesquiera).
//
// O `minigame: "chase"` (sin `map`): se lanza al empezar la batalla en coche, cuando el coche se para
// delante de Simone; al acabar la escena empieza el combate. Si además lleva `when: { carHp: 1, monsterHp: 5 }`,
// salta a mitad de combate en cuanto al coche le quede esa vida o al monstruo esa (scenes/scene_gabi.js);
// si al acabar la escena el monstruo ha muerto, la batalla termina. Ahí valen diálogo, fade, wait, sfx y:
//       { transform: true }                       // Simone se convierte en el monstruo
//       { act: "smoke" }                          // acción del combate (lista en ACTS, js/battle.js):
//                                                 // blow, smoke, gabiArrives, gabiShoots, bikeAlongside,
//                                                 // unmask, shootBike, skid
//
// Pasos que valen en cualquier escena:
//       { music: "media/music/song_carino.mp3" }  // canción en bucle hasta que otra escena ponga { music: null }
//       { flag: "gabi_revealed" }                 // activa una bandera (p. ej. muestra el nombre de Gabi en vez de "???")
//       { sfx: "boom" }                           // efecto de sonido de Sfx (js/audio.js)
//
// Pasos en el mapa (scenes/scene_sharon.js los usa todos):
//       { face: ["sharon"] }                      // esos personajes se giran hacia Anthon
//       { look: { who: ["sharon", "anthon"], dir: "up" } } // esos personajes miran hacia ahí
//       { camera: [39, 49], frames: 120 }         // la cámara se desliza hasta centrarse en esa casilla y se queda ahí
//       { camera: "anthon", frames: 120 }         // la cámara vuelve a Anthon y le sigue otra vez
//       { place: { who: "angel", at: [38, 50], dir: "up" } } // pone a ese personaje ahí (lo crea si no está en el mapa)
//       { focus: "sea", frames: 90 }              // la cámara se mete mar adentro: solo se ve agua a pantalla completa; { focus: 0 } vuelve al mapa
//       { remove: "sharon" }                     // ese personaje desaparece del mapa
//       { item: { type: "wallet", at: [54, 9] } } // deja un objeto en el suelo (tipo de Art.furniture)
//       { pickup: { at: [54, 9], name: "Wallet" } } // Anthon lo recoge: aviso «You picked up: Wallet» (se cierra con ESPACIO)
//
// "personaje" es la clave en CHARACTERS (data.js) o "anthon"; "imagen" una de sus fotos (portraits), que
// puede llevar puntos ("sharon.suspecting.smile" -> imagen "suspecting.smile"). Un texto vacío ("") solo muestra la cara.
// Los personajes que hablan se giran hacia Anthon al empezar la escena, salvo si la escena lleva `face: false`.
// Anthon nunca habla: sus líneas son pensamientos, así que van entre paréntesis.
const SCENES = {};

const SCENE_ALIASES = { anthon: "kael" };
const sceneAlias = n => SCENE_ALIASES[n] || n;

// Convierte la escena en los pasos de cinemática que entiende game.js.
function sceneSteps(scene) {
  const steps = [];
  const cast = new Set();
  let say = null;
  scene.lines.forEach(entry => {
    const [key, text] = Object.entries(entry)[0];
    // todo lo que no es "personaje.imagen" es un paso de acción (walk, shake, enter, run, fade...)
    if (!key.includes(".")) {
      say = null;
      const step = { ...entry };
      ["enter", "run", "look", "place"].forEach(k => {
        if (!step[k] || !step[k].who) return;
        const who = step[k].who;
        step[k] = { ...step[k], who: Array.isArray(who) ? who.map(sceneAlias) : sceneAlias(who) };
      });
      if (typeof step.remove === "string") step.remove = sceneAlias(step.remove);
      steps.push(step);
      return;
    }
    // solo el primer punto separa personaje e imagen (la imagen puede llevar puntos: "suspecting.smile")
    const dot = key.indexOf(".");
    const name = key.slice(0, dot), mood = key.slice(dot + 1) || "normal";
    const who = SCENE_ALIASES[name] || name;
    if (!CHARACTERS[who]) console.warn(`Escena: no existe el personaje «${name}»`);
    if (who !== "kael") cast.add(who);
    if (!say) steps.push({ say: (say = []) });
    say.push({ who, mood, text });
  });
  return scene.face === false ? steps : [{ face: [...cast] }, ...steps];
}
