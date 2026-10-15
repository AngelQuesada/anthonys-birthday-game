# Aldea Brisa — prototipo RPG

Minijuego web estilo RPG clásico. HTML5 Canvas + JavaScript puro: sin dependencias ni compilación.

## Cómo jugar

Abre `index.html` con doble clic (Safari, Chrome o Firefox en Mac).

| Tecla | Acción |
|-------|--------|
| Flechas | Moverse (un toque corto solo gira al personaje) / navegar menús |
| Espacio | Hablar, pasar al siguiente texto, aceptar |
| Escape | Menú de pausa (continuar / reiniciar / salir al título) |

## Estructura

- `js/data.js` — personajes, mapas, diálogos y créditos. **Casi todo el contenido se edita aquí.**
- `js/game.js` — motor: escenas, movimiento por casillas, colisiones, diálogos, menús.
- `js/art.js` — pixel art generado por código (tiles, sprites 16x24, retratos 64x64).
- `js/audio.js` — efectos de sonido sintetizados con Web Audio.
- `js/battle.js` — batalla en coche contra el monstruo: reglas comunes (balas, recarga, vida, explosión) e interfaz.
- `js/chasetop.js` / `js/chase3d.js` — los dos estilos de la batalla: cenital (como el resto del juego) y 3D.

## Añadir contenido

- **Diálogos**: cada NPC tiene `talks`, una lista de conversaciones; al hablarle se elige una al azar.
  Cada línea es `{ who, mood, text }`, donde `mood` es `normal | happy | surprised | angry`.
  Si no pones `who`, la línea es de narrador y sale sin retrato.
- **Personajes**: añade una entrada en `CHARACTERS` con sus colores y `hairStyle` (`short | long | spiky | old`),
  y opcionalmente `elf`, `hat` o `trim`. Sprite y retrato se generan solos.
- **Mapas**: añade una entrada en `MAPS` siguiendo la leyenda que hay en `data.js`. Los interiores
  (`interior: true`) usan muebles (`furniture`) y se centran en pantalla si son pequeños.
  Para enlazar mapas: `exits` (al pisar una casilla) o `enter` en una casa (al andar hacia su puerta).
- **Modo historia**: las cinemáticas están en `STORY` (`data.js`) como una lista de pasos
  (esperar, fundido, sonido, bocadillo, postura en la cama, levantarse, diálogo). La leyenda de pasos está encima.
  «Nueva partida» empieza con `STORY.opening`.

- **Batalla en coche**: en el título, «Probar batalla» la lanza directamente (al ganar vuelve al título) y
  «Estilo» elige con ← → cómo se ve: *Cenital* (el estilo del juego) o *3D*. El estilo se recuerda en el navegador.
  Para meterla en la historia, añade el paso `{ minigame: 'chase' }` a una cinemática: se juega en el estilo elegido
  y la cinemática sigue al ganar. Vida del monstruo, balas por cargador y recarga se ajustan en `CHASE` (`data.js`).
  Controles: ← → moverse, ESPACIO disparar, ESC pausa.
- `versiones/batalla-3d/` es una copia congelada del juego tal como estaba con la primera versión 3D.

`index.html?debug` expone el estado del juego en `window.__G` para depurar desde la consola.
# anthonys-birthday-game
