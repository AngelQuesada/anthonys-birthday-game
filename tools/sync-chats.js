"use strict";
// Convierte characters/<Nombre>/chat.txt (+ las imágenes de esa carpeta) en js/chats.js.
// El juego se abre con doble clic (file://) y ahí el navegador no deja leer los .txt, por eso se genera un .js.
// Ejecutar tras editar cualquier chat.txt o añadir imágenes:  node tools/sync-chats.js
// Formato de chat.txt: "imagen: texto"; una línea en blanco separa cada línea de diálogo (el texto puede ocupar varias líneas).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dir = path.join(root, "characters");
const IMG = /\.(png|jpe?g|webp|gif)$/i;
const out = {};

for (const name of fs.readdirSync(dir)) {
  const folder = path.join(dir, name);
  const chatFile = path.join(folder, "chat.txt");
  if (!fs.statSync(folder).isDirectory() || !fs.existsSync(chatFile)) continue;

  const images = {};
  for (const f of fs.readdirSync(folder)) {
    if (IMG.test(f)) images[f.replace(IMG, "")] = `characters/${name}/${f}`;
  }

  const lines = fs.readFileSync(chatFile, "utf8").replace(/^\uFEFF/, "").split(/\r?\n\s*\r?\n/)
    .map(block => block.trim()).filter(Boolean)
    .map(block => {
      const m = block.match(/^([^:\n]+):\s*([\s\S]*)$/);
      if (!m) throw new Error(`${name}/chat.txt: falta «imagen:» en «${block.slice(0, 40)}»`);
      const image = m[1].trim();
      if (!images[image]) throw new Error(`${name}/chat.txt: no existe la imagen «${image}» en characters/${name}`);
      return { image, text: m[2].replace(/\s*\r?\n\s*/g, " ").trim() };
    });

  out[name] = { images, lines };
}

fs.writeFileSync(
  path.join(root, "js", "chats.js"),
  `"use strict";\n// GENERADO por tools/sync-chats.js a partir de characters/*/chat.txt. No editar a mano.\nconst CHATS = ${JSON.stringify(out, null, 2)};\n`
);
console.log("js/chats.js:", Object.entries(out).map(([n, c]) => `${n} (${c.lines.length} líneas)`).join(", "));
