// Final del combate contra el monstruo: salta cuando al coche le queda 1 golpe de vida o cuando al monstruo
// le quedan 5 puntos (en ese caso el monstruo lanza un golpe que deja el coche con 1).
// El coche echa humo, llega Gabi en moto, revienta a Simone, se quita la capucha... y desde el coche le
// disparan sin querer. Sin frenos, el coche derrapa y se estrella: se sigue en la playa (STORY.playa).
SCENES.gabi = {
  minigame: "chase",
  when: { carHp: 1, monsterHp: 5 },
  lines: [
    { act: "blow" }, // golpe del monstruo que deja el coche con 1 de vida (si no lo estaba ya)
    { act: "smoke" }, // el coche empieza a echar humo
    { "angel.scared": "This is the end, Simone is going to kill us." },
    { "angel.mad": "I'd rather have died of gonorrhea than die like this." },
    { "angel.mad": "But oh well, it is what it is." },
    { "anthon.scared": "!!" },
    { "ricardo.mad": "Angel, you have no idea how to shoot, you're useless!" },
    { act: "gabiArrives" }, // Gabi llega en moto, todavía con la capucha (se llama "???")
    { "gabi.covered": "Guys, don't worry, I'm here." },
    { "anthon.surprised": "!" },
    { "angel.scared": "!" },
    { "ricardo.scared": "!" },
    { act: "gabiShoots" }, // dispara a Simone desde la moto y este explota
    { act: "bikeAlongside" }, // la moto se pone al lado del coche
    { "gabi.covered": "I knew what was happening and that you'd need me..." },
    { "gabi.covered": "I bet you're curious to know who I am." },
    { act: "unmask" }, // se quita la capucha
    { flag: "gabi_revealed" }, // a partir de aquí su nombre ya no es "???"
    { "gabi.uncovered": "It's me, Gabi." },
    { "ricardo.base": "Just what we needed." },
    { "angel.disapointed": "Dear God, take me soon." },
    { "gabi.uncovered": "Anthon, I did it for you." },
    { "gabi.uncovered": "I also wanted to wish you a happy birthday because..." },
    { act: "shootBike" }, // dos disparos desde el coche: la moto se sale de la pantalla y se estrella
    { "angel.disgust": "Ricardo, how could you do that?" },
    { "ricardo.mad": "You're the one holding the gun, you useless idiot!" },
    { "angel.smile": "Well, it doesn't matter who did it, it is what it is." },
    { "angel.scared": "Wait, the brakes aren't working." },
    { "angel.scared": "I think Simone damaged them." },
    { "ricardo.mad": "Do something, you bastard!" },
    { "anthon.scared": "!!!" },
    { "angel.mad": "What do you want me to do? They don't work!" },
    { act: "skid" }, // el coche derrapa...
    { fade: 1, frames: 40 }, // ...y a negro; el golpe se oye ya en la playa
  ],
};
