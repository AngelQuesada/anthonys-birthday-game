// Cuando Anthon ha saludado a todos los invitados: llega Angel y propone una foto de grupo. Todos se juntan
// (Anthon delante, una casilla por delante del resto) con la cámara en el suelo, flash... y justo después
// el terremoto: Angel, asustado, se acerca a Anthon y se lo lleva corriendo.
SCENES.earthquake = {
  map: "urba",
  // TEMPORAL para probar: basta con hablar con 1 invitado cualquiera. El valor final es greeted: "all".
  when: { greeted: 1 },
  lines: [
    { wait: 20 },
    { enter: { who: "angel", speed: 2 } },
    { "angel.base": "Guys, let's all take a picture together!" },
    // parpadeo: al volver, todos están juntos en el césped al sur de la piscina
    { fade: 1, frames: 12 },
    { photo: { anthon: [36, 72], camera: [36, 75], beside: "angel", hide: ["gabi"], rows: 2 } },
    { wait: 10 },
    { fade: 0, frames: 12 },
    { wait: 30 },
    { "angel.base": "Say cheese!" },
    { wait: 20 },
    { flash: 40 }, // flash de la foto (con sonido de obturador)
    { wait: 40 },
    // a partir de aquí, como antes: terremoto y Angel se lleva a Anthon
    { shake: 120 },
    { wait: 20 },
    { enter: { who: "angel", speed: 2 } }, // Angel ya está al lado de Anthon
    { "angel.base": "What was that?" },
    { "angel.base": "Anthon, come with me, let's go take a look" },
    { run: { who: ["angel", "anthon"], speed: 2 } },
    { fade: 1, frames: 60 },
    { battle: "chase" }, // empieza el combate en coche contra el monstruo
  ],
};
