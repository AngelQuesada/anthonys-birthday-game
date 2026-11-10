# Breeze Village — RPG prototype

A classic RPG-style web minigame. HTML5 Canvas + plain JavaScript: no dependencies, no build step.

## How to play

Open `index.html` with a double click (Safari, Chrome or Firefox).

| Key | Action |
|-----|--------|
| Arrows | Move (a short tap only turns the character) / navigate menus |
| Space | Talk, advance text, accept |
| Escape | Pause menu (continue / restart / quit to title) |

## Structure

- `js/data.js` — characters, maps, dialogues and credits. **Almost all content is edited here.**
- `js/game.js` — engine: scenes, tile movement, collisions, dialogues, menus.
- `js/art.js` — code-generated pixel art (tiles, 16x24 sprites, 64x64 portraits).
- `js/audio.js` — sound effects synthesized with Web Audio.
- `js/battle.js` — car battle against the monster: shared rules (bullets, reload, health, explosion) and UI.
- `js/chasetop.js` — how the battle looks: top-down view (from above, like the rest of the game).

## Adding content

- **Dialogues**: each NPC has `talks`, a list of conversations; one is picked at random when you talk to them.
  Each line is `{ who, mood, text }`, where `mood` is `normal | happy | surprised | angry`.
  If you omit `who`, the line is narration and shows no portrait.
- **Characters**: add an entry to `CHARACTERS` with its colors and `hairStyle` (`short | long | spiky | old`),
  and optionally `elf`, `hat` or `trim`. Sprite and portrait are generated automatically.
- **Maps**: add an entry to `MAPS` following the legend in `data.js`. Interiors
  (`interior: true`) use furniture (`furniture`) and are centered on screen if small.
  To link maps: `exits` (stepping on a tile) or `enter` on a house (walking toward its door).
- **Stage 2 (`urba`)**: the neighborhood from the aerial photo, north up: the road behind the house,
  our block of three townhouses (we exit to the courtyard of the one on the right), the palm park, the rows of
  townhouses at the sides, the playground and, at the back, the stepped pool. Houses are generated with `adosados()`.
  A trail of balloons (and a few decoy notes) leads to the pool, where the party is;
  crossing the entrance triggers the `sorpresa` cutscene (`triggers`). The legend for tiles, pool, hedges,
  balloons, decoration and dancing or swimming NPCs is in `data.js`, above `MAPS`.
- **Story mode**: cutscenes live in `STORY` (`data.js`) as a list of steps
  (wait, fade, sound, bubble, bed pose, get up, dialogue). The step legend is above it.
  “New Game” starts with `STORY.opening`.
- **Levels**: on the title screen, “Choose Level” lets you start at any of the `LEVELS` (`data.js`):
  the house, the courtyard, the battle against the monster and the beach (shown as “coming soon” until it exists).
  To add one, add an entry with `story`, `map` or `minigame`; remove `soon` when it's ready.
- **Car battle**: launched from “Choose Level” (returns to the title when you win).
  To put it in the story, add the step `{ minigame: 'chase' }` to a cutscene: the cutscene continues after winning. Monster health, bullets per magazine and reload are tuned in `CHASE` (`data.js`).
  Controls: ← → move, SPACE shoot, ESC pause.
- `versiones/batalla-3d/` is a frozen copy of the game as it was with the first 3D version.

`index.html?debug` exposes the game state in `window.__G` for debugging from the console.
