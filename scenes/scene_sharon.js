// Sharon, en la meseta de la playa: salta al subir la rampa de arena (a la derecha del agua, la que lleva a la
// casa blanca), en cuanto Anthon pisa la arena alta. Sharon mira el mar; al oír a Anthon se da la vuelta.
// Él se sienta a su lado y los dos miran el mar mientras ella habla. Al final Angel le llama desde el coche:
// la cámara baja hasta Angel y Ricardo y, al volver, Sharon ya no está: en su sitio hay una cartera.
// Final del juego: Anthon baja con Angel y Ricardo, se van en coche por una carretera recta, Angel para para
// poner su canción, salen unos créditos rapidísimos y la pantalla se queda en negro con el mensaje final.
SCENES.sharon = {
  map: "playa",
  area: [50, 13, 56, 13],
  face: false, // Sharon no se gira al empezar: lo hace después del "?"
  lines: [
    { "anthon.surprised": "?" },
    // la cámara sube un poco para que se vea a Sharon de espaldas
    { camera: [51, 13], frames: 60 },
    { wait: 20 },
    { face: ["sharon"] }, // se da la vuelta
    { wait: 30 },
    { "sharon.base": "Aye up duck!" },
    { "anthon.smile-cry": "" }, // sin texto: solo su cara
    { "sharon.base": "Come and sit here with me" },
    // Anthon va solo hasta su lado y los dos miran el mar
    { walk: { to: [53, 9] } },
    { look: { who: ["sharon", "anthon"], dir: "up" } },
    { wait: 40 },
    // fundido a "mar adentro": solo se ve agua mientras Sharon habla
    { focus: "sea", frames: 90 },
    { "sharon.smile": "Look at you... I am so proud of you, truly." },
    {
      "sharon.base":
        "I know it hasn’t been an easy road, and I see just how hard you’ve been working through it all",
    },
    { "sharon.base": "It’s been tough, I know" },
    {
      "sharon.smile":
        "but I’m always right here with you—watching over you and guiding you every step of the way",
    },
    { "sharon.base": "I've seen how much love surrounds you, too" },
    {
      "sharon.smile":
        "I even saw that pool party! It’s not easy to have that many people in your life who genuinely love you",
    },
    {
      "sharon.suspecting":
        "Well... except maybe that lad with the massive arms who claims he doesn't like you",
    },
    {
      "sharon.suspecting":
        "To be fair, he’s built like a tank, must spend his whole life at the gym!",
    },
    {
      "sharon.suspecting.smile":
        "But something tells me he’s probably the one who needs you the most out of everyone",
    },
    {
      "sharon.base":
        "btw! I heard you're coming to visit where we are in the real world to scatter my ashes",
    },
    {
      "sharon.smile":
        "Thank you for doing that. It means more to me than words can say",
    },
    { "sharon.base": "You're worth so much, Always be you" },
    { "sharon.base": "Oh I almost forgot! I found this in the beach." },
    {
      "sharon.smile": "I hope you fill it right up and buy that house one day",
    },
    { "sharon.suspecting": "I loved that house..." },
    { wait: 40 },
    // al hablar Angel, todo vuelve a verse
    { focus: 0, frames: 30 },
    // Angel grita desde abajo, sin que se le vea
    { "angel.base": "Anthon!" },
    // la cámara baja hasta el coche, donde están Angel y Ricardo (si no estaban, se ponen ahí)
    { place: { who: "angel", at: [38, 50], dir: "up" } },
    { place: { who: "ricardo", at: [37, 50], dir: "right" } },
    { camera: [39, 48], frames: 120 },
    { wait: 20 },
    { "angel.base": "Anthon! The car's fixed, come on, I'm sick of this ****" },
    // mientras la cámara está abajo, Sharon se va y deja la cartera en su sitio
    { remove: "sharon" },
    { item: { type: "wallet", at: [54, 9] } },
    { wait: 20 },
    { camera: "anthon", frames: 120 },
    { wait: 50 },
    { look: { who: "anthon", dir: "right" } },
    { wait: 30 },
    { pickup: { at: [54, 9], name: "Lost Wallet" } },
    { "anthon.base": "(I lost my wallet here a few years ago...)" },

    // ---------- final del juego ----------
    // Anthon baja andando hacia el coche y se sale de la pantalla (la cámara se queda quieta)
    { wait: 30 },
    { run: { who: ["anthon"], to: [39, 40] } },
    { wait: 20 },
    // corte: la cámara ya está en el coche y Anthon llega por el pasillo hasta el lado de Angel
    { fade: 1, frames: 40 },
    { place: { who: "anthon", at: [39, 40], dir: "down" } }, // justo fuera de cámara
    { camera: [39, 48], frames: 1 },
    { fade: 0, frames: 40 },
    { walk: { to: [39, 50] } },
    { face: ["ricardo", "angel"] },
    { look: { who: "anthon", dir: "left" } },
    { wait: 15 },
    { "ricardo.base": "Where were you?" },
    { "angel.base": "Come on, let's go, they're waiting for us at the pool" },
    // el coche por la carretera del combate, pero recta
    { fade: 1, frames: 60 },
    { wait: 30 },
    { drive: true },
    { fade: 0, frames: 60 },
    { wait: 130 }, // ~3 s en recto contando el fundido
    { act: "brake" },
    { wait: 20 },
    { "angel.mad": "Wait" },
    { music: "media/music/song_carino.mp3" },
    { wait: 120 },
    { "angel.base": "Much better" },
    { "ricardo.disapointed": "Not again" },
    // el coche vuelve a arrancar mientras la pantalla se va a negro
    { act: "go" },
    { fade: 1, frames: 60 },
    // pantalla final: mensaje a la izquierda y foto a la derecha; a los 3 s la izquierda sube y pasan los
    // créditos (todos de Ángel); al acabar, la foto va al centro con el texto de despedida debajo
    {
      finale: {
        message: "Happy birthday,\nI love you millions",
        photo: "media/anthony_and_angel.jpeg",
        close: "You can close it now",
        hold: 180, // 3 s con el mensaje quieto
        speed: 2.5, // px por frame que sube la columna izquierda
        title: "Anthonys Bday",
        name: "Ángel Quesada",
        roles: [
          "Directed by", "Produced by", "Written by", "Game Design", "Lead Programmer", "Pixel Art",
          "Character Design", "Animation", "Music Supervisor", "Sound Design", "Level Design", "Monster Design",
          "Stunt Driver", "Car Mechanic", "Insurance Agent", "Pool Party Planner", "Catering", "Photographer",
          "Earthquake Coordinator", "Beach Cleaning", "Lost Wallet Finder", "Quality Assurance", "Bug Creator",
          "Bug Fixer", "Casting", "Special Thanks", "Executive Producer",
        ],
      },
    }, // se queda para siempre
  ],
};
