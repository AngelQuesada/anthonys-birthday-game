// Al empezar la batalla en coche (fase 2): el coche avanza por el camino y se para delante de Simone.
// Tras hablar, la pantalla se oscurece y al volver Simone se ha convertido en el monstruo. Luego empieza el combate.
SCENES.simone = {
  minigame: "chase",
  lines: [
    {
      "simone.base":
        "Ahh... the two of you are exactly who I've been waiting for.",
    },
    {
      "ricardo.disapointed":
        "I'm pretty sure that was meant for you guys, I'm out of here.",
    },
    { "angel.mad": "God, I can't stand this guy." },
    {
      "simone.base":
        "Angel, I see you've gotten ridiculously jacked—those muscles are practically bursting through your shirt.",
    },
    { "simone.evil": "But even so, you don't stand a chance against me..." },
    { "anthon.scared": "!!!" },
    { "simone.base": "You've caused me a lot of trouble." },
    { "simone.base": "Hold on a second... (snorts something up his nose)" },
    { "simone.evil": "Now you'll see who I really am!!!" },
    { "simone.evil": "Once I'm done with you, all the chubbies will be mine!" },
    { "simone.evil": "Bwahaha!" },
    { fade: 1, frames: 60 },
    { transform: true },
    // al convertirse empieza la canción, que suena en bucle todo el combate (hasta que Simone explota)
    { music: "media/music/song_carino.mp3" },
    { wait: 70 },
    { fade: 0, frames: 60 },
    { wait: 20 },
    { "ricardo.mad": "What the hell is this? Turn it off!" },
    {
      "angel.mad":
        "I got nervous and hit the play button by accident, we'll have to fight like this.",
    },
    { "ricardo.disapointed": "You disgust me." },
  ],
};
