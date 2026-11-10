// Anthon se asoma a la fiesta: entra en la zona de la piscina (primera fila de baldosas, y=47),
// se sorprende y va solo, al doble de velocidad, hasta justo antes de la mesa de la comida (sin llegar donde está la gente).
SCENES.pool = {
  map: "urba",
  area: [30, 47, 43, 47],
  lines: [
    { "anthon.surprised": "!" },
    { walk: { to: [41, 55], speed: 2 } },
    { "anthon.base": "(So this is what Angel was preparing for me...)" },
    { "anthon.base": "(I should say hi to everyone)" },
  ],
};
