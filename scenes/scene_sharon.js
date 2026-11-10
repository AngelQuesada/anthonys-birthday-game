// Sharon, en la meseta de la playa: salta al subir la rampa de arena (a la derecha del agua, la que lleva a la
// casa blanca), en cuanto Anthon pisa la arena alta. Sharon mira el mar; al oír a Anthon se da la vuelta.
// Él se sienta a su lado y los dos miran el mar mientras ella habla. Al final Angel le llama desde el coche:
// la cámara baja hasta Angel y Ricardo y, al volver, Sharon ya no está: en su sitio hay una cartera.
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
  ],
};
