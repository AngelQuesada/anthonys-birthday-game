'use strict';

(() => {
  const W = 960, H = 720;           // resolución lógica de la interfaz
  const VIEW_W = 320, VIEW_H = 240; // resolución del mundo (x3)
  const T = Art.T;
  const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
  const TEXT_FONT = `28px ${FONT}`;
  const TEXT_SPEED = 0.7; // caracteres por frame
  const SOLID = new Set(['T', 'b', 'r', 'f', 's', '~', 'X', 'W', 'h', 'g', 'n', 'P', 'w']);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const worldCv = document.createElement('canvas');
  worldCv.width = VIEW_W;
  worldCv.height = VIEW_H;
  const wctx = worldCv.getContext('2d');

  // ---------- entrada: solo flechas, espacio y escape ----------
  const KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const pressed = new Set();
  let dirStack = [];

  addEventListener('keydown', e => {
    if (!(e.code in KEY_DIR) && e.code !== 'Space' && e.code !== 'Escape') return;
    e.preventDefault();
    Sfx.unlock();
    if (e.repeat) return;
    pressed.add(e.code);
    const d = KEY_DIR[e.code];
    if (d) dirStack = dirStack.filter(x => x !== d).concat(d);
  });
  addEventListener('keyup', e => {
    const d = KEY_DIR[e.code];
    if (d) dirStack = dirStack.filter(x => x !== d);
  });
  addEventListener('blur', () => { dirStack = []; });
  const hit = code => pressed.has(code);
  // Eje horizontal según la última flecha izquierda/derecha que sigue pulsada.
  function axisX() {
    const d = dirStack.filter(x => x === 'left' || x === 'right').pop();
    return d === 'left' ? -1 : d === 'right' ? 1 : 0;
  }

  // ---------- estado ----------
  const G = {
    scene: 'title',
    t: 0,
    menu: 0,
    pauseMenu: 0,
    prevScene: 'play',
    world: null,
    player: null,
    dialog: null,
    cut: null,
    mini: null,
    restart: null,
    bedPose: null,
    visited: new Set(),
    flags: new Set(), // cinemáticas de `triggers` ya vistas
    banner: 0,
    creditsY: H,
    fade: { a: 1, target: 0, cb: null },
    leaves: Array.from({ length: 18 }, () => newLeaf(true)),
  };

  function newLeaf(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -20,
      vx: 0.4 + Math.random() * 0.8,
      vy: 0.6 + Math.random() * 0.9,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.08,
      phase: Math.random() * 100,
      col: ['#7cc451', '#a8d65a', '#f2c14e', '#e98a3c'][(Math.random() * 4) | 0],
    };
  }

  function fadeTo(cb) {
    G.fade.target = 1;
    G.fade.cb = cb;
  }

  // ---------- mundo y entidades ----------
  function createWorld(id) {
    const def = MAPS[id];
    const h = def.tiles.length, w = def.tiles[0].length;
    def.tiles.forEach((row, i) => { if (row.length !== w) console.warn(`Fila ${i} del mapa "${id}" mide ${row.length}, se esperaban ${w}`); });
    const solid = def.tiles.map(row => [...row].map(ch => SOLID.has(ch)));
    const doors = {};
    (def.houses || []).forEach(hs => {
      for (let y = hs.y; y < hs.y + hs.h; y++) for (let x = hs.x; x < hs.x + hs.w; x++) solid[y][x] = true;
      doors[doorTile(hs).join(',')] = hs;
    });
    const furniture = (def.furniture || []).map(f => ({ ...f, ...Art.furniture(f.type) }));
    furniture.forEach(f => {
      if (f.flat) return;
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) solid[y][x] = true;
    });
    const room = def.interior ? Art.room(def.tiles, furniture) : null;
    return {
      id, def, w, h, solid, doors,
      bed: furniture.find(f => f.type === 'bed'),
      ground: room ? [room, room, room] : [0, 1, 2].map(f => Art.ground(def.tiles, f, furniture)),
      statics: Art.buildStatics(def, furniture),
      npcs: (def.npcs || []).map(n => makeEntity(n.char, n.x, n.y, n.dir, n)),
    };
  }

  // Casilla de la puerta según hacia dónde mira la casa (face: down por defecto, left o right).
  // Para llamar o entrar hay que andar hacia ella en la dirección contraria (OPP[face]).
  function doorTile(hs) {
    const face = hs.face || 'down';
    if (face === 'right') return [hs.x + hs.w - 1, hs.y + Math.floor(hs.h / 2)];
    if (face === 'left') return [hs.x, hs.y + Math.floor(hs.h / 2)];
    return [hs.x + Math.floor(hs.w / 2), hs.y + hs.h - 1];
  }

  function makeEntity(charKey, x, y, dir, def = null) {
    const ch = CHARACTERS[charKey];
    return {
      ch, def, sheet: Art.charSheet(ch),
      x, y, fromX: x, fromY: y, px: x * T, py: y * T,
      dir, homeDir: dir,
      moving: false, moveT: 0, speed: def ? 18 : 14, parity: false,
      turnWait: 0, bumpCd: 0, restoreT: 0, lastTalk: -1,
      timer: 60 + ((Math.random() * 120) | 0),
    };
  }

  function entities() {
    return G.player ? G.world.npcs.concat(G.player) : G.world.npcs;
  }

  function blocked(x, y, self) {
    const w = G.world;
    if (x < 0 || y < 0 || x >= w.w || y >= w.h) return true;
    // quien nada solo puede moverse por el agua de la piscina
    const swims = self && self.def && self.def.swim;
    if (swims ? w.def.tiles[y][x] !== 'P' : w.solid[y][x]) return true;
    return entities().some(e => e !== self && ((e.x === x && e.y === y) || (e.moving && e.fromX === x && e.fromY === y)));
  }

  function tryMove(e, dir) {
    const [dx, dy] = DIRS[dir];
    const nx = e.x + dx, ny = e.y + dy;
    e.dir = dir;
    if (blocked(nx, ny, e)) return false;
    e.fromX = e.x; e.fromY = e.y;
    e.x = nx; e.y = ny;
    e.moving = true;
    e.moveT = 0;
    e.parity = !e.parity;
    return true;
  }

  function stepEntity(e) {
    if (!e.moving) return;
    e.moveT++;
    const p = Math.min(1, e.moveT / e.speed);
    e.px = (e.fromX + (e.x - e.fromX) * p) * T;
    e.py = (e.fromY + (e.y - e.fromY) * p) * T;
    if (p >= 1) e.moving = false;
  }

  function animFrame(e) {
    if (!e.moving) return 0;
    return e.moveT / e.speed < 0.7 ? (e.parity ? 1 : 2) : 0;
  }

  // Empieza un nivel de LEVELS (data.js) desde cero; «Reiniciar» en la pausa vuelve a empezarlo.
  function startLevel(lv) {
    G.restart = () => startLevel(lv);
    G.visited = new Set();
    G.flags = new Set();
    G.dialog = null;
    G.cut = null;
    G.mini = null;
    G.bedPose = null;
    if (lv.minigame) {
      G.player = null;
      return startMinigame(lv.minigame, () => fadeTo(toTitle));
    }
    if (lv.story) {
      const story = STORY[lv.story];
      G.visited.add(story.map);
      enterMap(story.map, story.spawn.x, story.spawn.y, story.spawn.dir, false);
      return startCutscene(story.steps);
    }
    const start = MAPS[lv.map].playerStart;
    enterMap(lv.map, start.x, start.y, start.dir, true);
  }

  const startGame = () => startLevel(LEVELS[0]);

  function toTitle() {
    G.scene = 'title';
    G.menu = 0;
    G.player = null;
    G.dialog = null;
    G.cut = null;
    G.mini = null;
    G.bedPose = null;
    G.world = createWorld(TITLE_MAP);
  }

  // arrive: al llegar andando se muestra el nombre del sitio y, la primera vez, su intro.
  function enterMap(id, x, y, dir, arrive) {
    G.world = createWorld(id);
    G.player = makeEntity(PLAYER_CHAR, x, y, dir);
    G.dialog = null;
    G.bedPose = null;
    G.scene = 'play';
    if (!arrive) return;
    G.banner = 200;
    const intro = G.world.def.intro;
    if (intro && !G.visited.has(id)) startDialog(intro, null, false);
    G.visited.add(id);
  }

  function goTo(dest) {
    Sfx.door();
    fadeTo(() => enterMap(dest.to, dest.x, dest.y, dest.dir, true));
  }

  // ---------- cinemáticas (pasos definidos en STORY, data.js) ----------
  function startCutscene(steps) {
    G.cut = { steps, i: -1, t: 0, dark: 0, bubble: null };
    G.scene = 'cutscene';
    nextStep();
  }

  // Minijuegos: módulos con create(onWin), update(st, input), drawWorld(st, wctx) y drawHud(st, ctx, ui).
  const MINIGAMES = { chase: Battle };

  function startMinigame(id, onWin) {
    const game = MINIGAMES[id];
    G.mini = { game, st: game.create(onWin) };
    G.scene = 'minigame';
  }

  function endCutscene() {
    const quiet = G.cut.quiet;
    G.cut = null;
    G.scene = 'play';
    if (!quiet) G.banner = 200;
  }

  function setPose(pose) {
    G.bedPose = pose;
    G.player.hidden = !!pose;
  }

  function nextStep() {
    const c = G.cut;
    c.i++;
    c.t = 0;
    const s = c.steps[c.i];
    if (!s) return endCutscene();
    // pasos instantáneos
    if ('dark' in s) { c.dark = s.dark; return nextStep(); }
    if ('sfx' in s) { Sfx[s.sfx](); return nextStep(); }
    if ('pose' in s) { setPose(s.pose); return nextStep(); }
    if ('face' in s) { G.world.npcs.forEach(n => faceTo(n, G.player.x, G.player.y)); return nextStep(); }
    // pasos con duración
    if ('fade' in s) c.from = c.dark;
    if ('bubble' in s) c.bubble = { text: s.bubble, shown: 0, lastBlip: 0, hold: s.hold || 60, anim: 0 };
    if ('getUp' in s) {
      const p = G.player, b = G.world.bed;
      setPose(null);
      p.fromX = b.x + b.w - 1; p.fromY = b.y + b.h - 1;
      p.x = s.getUp.x; p.y = s.getUp.y;
      p.dir = p.x > p.fromX ? 'right' : 'left';
      p.moving = true;
      p.moveT = 0;
      p.walkSpeed = p.speed;
      p.speed = 24;
      Sfx.rustle();
    }
    if ('minigame' in s) {
      return startMinigame(s.minigame, () => fadeTo(() => {
        G.mini = null;
        G.scene = 'cutscene';
        nextStep();
      }));
    }
    if ('say' in s) {
      startDialog(s.say, null, true, () => { G.scene = 'cutscene'; nextStep(); });
    }
  }

  function updateCutscene() {
    const c = G.cut, s = c.steps[c.i];
    c.t++;
    if ('wait' in s) {
      if (c.t >= s.wait) nextStep();
    } else if ('fade' in s) {
      const k = Math.min(1, c.t / (s.frames || 60));
      c.dark = c.from + (s.fade - c.from) * k;
      if (k >= 1) nextStep();
    } else if ('bubble' in s) {
      const b = c.bubble;
      b.anim = Math.min(1, b.anim + 0.12);
      if (b.shown < b.text.length) {
        b.shown = Math.min(b.text.length, b.shown + 0.22);
        const n = Math.floor(b.shown);
        if (n > b.lastBlip) { b.lastBlip = n; Sfx.blip(G.player.ch.voice * 0.8); }
      } else if (--b.hold <= 0) {
        c.bubble = null;
        nextStep();
      }
    } else if ('getUp' in s) {
      const p = G.player;
      p.hop = Math.sin(Math.min(1, p.moveT / p.speed) * Math.PI) * 7;
      if (!p.moving) {
        p.hop = 0;
        p.speed = p.walkSpeed;
        p.dir = s.getUp.dir || 'down';
        Sfx.thud();
        nextStep();
      }
    }
  }

  function faceTo(n, x, y) {
    const dx = x - n.x, dy = y - n.y;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    n.restoreT = 240;
  }

  // ---------- interacción y diálogos ----------
  function interact() {
    const p = G.player, w = G.world;
    const [dx, dy] = DIRS[p.dir];
    const tx = p.x + dx, ty = p.y + dy;
    const npc = w.npcs.find(n => (n.x === tx && n.y === ty) || (n.moving && n.fromX === tx && n.fromY === ty));
    if (npc) {
      npc.dir = OPP[p.dir];
      const talks = npc.def.talks;
      let i = (Math.random() * talks.length) | 0;
      if (talks.length > 1 && i === npc.lastTalk) i = (i + 1) % talks.length;
      npc.lastTalk = i;
      startDialog(talks[i], npc);
      return;
    }
    const sign = (w.def.signs || {})[`${tx},${ty}`];
    if (sign) return startDialog(sign);
    const house = w.doors[`${tx},${ty}`];
    if (!house || p.dir !== OPP[house.face || 'down']) return;
    if (house.enter) goTo(house.enter);
    else startDialog(house.locked || [{ text: 'La puerta está cerrada.' }]);
  }

  function wrap(text, maxW) {
    ctx.font = TEXT_FONT;
    const lines = [];
    let cur = '';
    text.split(' ').forEach(word => {
      const test = cur ? cur + ' ' + word : word;
      if (cur && ctx.measureText(test).width > maxW) {
        lines.push(cur);
        cur = word;
      } else cur = test;
    });
    lines.push(cur);
    return lines;
  }

  function startDialog(lines, npc = null, sound = true, onEnd = null) {
    G.dialog = { lines, i: 0, npc, speaker: undefined, onEnd };
    prepLine();
    G.scene = 'dialog';
    if (sound) Sfx.open();
  }

  function prepLine() {
    const d = G.dialog;
    const line = d.lines[d.i];
    const ch = line.who ? CHARACTERS[line.who] : null;
    d.ch = ch;
    d.side = !ch ? 'none' : ch.id === PLAYER_CHAR ? 'right' : 'left';
    d.mood = line.mood || 'normal';
    d.wrapped = wrap(line.text, d.side === 'none' ? 840 : 610);
    d.total = d.wrapped.reduce((n, l) => n + l.length, 0);
    d.shown = 0;
    d.lastBlip = 0;
    if (line.who !== d.speaker) d.anim = 0;
    d.speaker = line.who;
  }

  function updateDialog() {
    const d = G.dialog;
    d.anim = Math.min(1, d.anim + 0.1);
    if (d.shown < d.total) {
      d.shown = Math.min(d.total, d.shown + TEXT_SPEED);
      const n = Math.floor(d.shown);
      if (n - d.lastBlip >= 2) {
        d.lastBlip = n;
        Sfx.blip(d.ch ? d.ch.voice : 0.85);
      }
    }
    if (!hit('Space')) return;
    if (d.shown < d.total) {
      d.shown = d.total;
    } else if (d.i < d.lines.length - 1) {
      d.i++;
      prepLine();
      Sfx.advance();
    } else {
      Sfx.close();
      if (d.npc && !d.npc.def.wander) d.npc.restoreT = 45;
      G.dialog = null;
      G.scene = 'play';
      if (d.onEnd) d.onEnd();
    }
  }

  // ---------- actualización ----------
  function updatePlayer() {
    const p = G.player;
    const wasMoving = p.moving;
    stepEntity(p);
    if (p.bumpCd > 0) p.bumpCd--;
    if (p.moving) return;
    const exit = wasMoving && (G.world.def.exits || {})[`${p.x},${p.y}`];
    if (exit) return goTo(exit);
    const trig = wasMoving && (G.world.def.triggers || []).find(tr => !G.flags.has(tr.id)
      && p.x >= tr.area[0] && p.y >= tr.area[1] && p.x <= tr.area[2] && p.y <= tr.area[3]);
    if (trig) {
      G.flags.add(trig.id);
      startCutscene(trig.steps);
      if (G.cut) G.cut.quiet = true; // a mitad de mapa no hace falta volver a mostrar su nombre
      return;
    }
    if (hit('Space')) return interact();
    const d = dirStack[dirStack.length - 1];
    if (!d) { p.turnWait = 0; return; }
    // Un toque corto solo gira al personaje; mantener la flecha lo hace andar.
    if (d !== p.dir && !wasMoving) { p.dir = d; p.turnWait = 6; return; }
    if (p.turnWait > 0) { p.turnWait--; return; }
    if (tryMove(p, d)) return;
    const [dx, dy] = DIRS[d];
    const house = G.world.doors[`${p.x + dx},${p.y + dy}`];
    if (house && house.enter && d === OPP[house.face || 'down']) return goTo(house.enter);
    if (p.bumpCd === 0) {
      Sfx.bump();
      p.bumpCd = 24;
    }
  }

  function updateNpcs(ai) {
    G.world.npcs.forEach(n => {
      stepEntity(n);
      if (n.def.dance) n.hop = Math.abs(Math.sin(G.t / 9 + n.def.x)) * 3;
      if (!ai) return;
      // los que bailan cambian de pose al ritmo, salvo justo después de hablar con ellos
      if (n.def.dance && n.restoreT === 0 && (G.t + n.def.x * 11) % 44 === 0) {
        n.dir = ['down', 'left', 'down', 'right'][((G.t / 44) | 0) % 4];
      }
      if (n.restoreT > 0 && --n.restoreT === 0) n.dir = n.homeDir;
      if (!n.def.wander || n.moving || --n.timer > 0) return;
      n.timer = 70 + ((Math.random() * 150) | 0);
      const dir = Object.keys(DIRS)[(Math.random() * 4) | 0];
      const [dx, dy] = DIRS[dir];
      const r = n.def.wander;
      if (Math.random() < 0.7 && Math.abs(n.x + dx - n.def.x) <= r && Math.abs(n.y + dy - n.def.y) <= r) tryMove(n, dir);
      else n.dir = dir;
    });
  }

  function menuNav(count, key) {
    if (hit('ArrowUp')) { G[key] = (G[key] + count - 1) % count; Sfx.cursor(); }
    if (hit('ArrowDown')) { G[key] = (G[key] + 1) % count; Sfx.cursor(); }
  }

  function update() {
    G.t++;
    if (G.scene !== 'minigame') Sfx.engine(false);
    const f = G.fade;
    if (f.target === 1) {
      f.a = Math.min(1, f.a + 0.06);
      if (f.a >= 1) { f.target = 0; const cb = f.cb; f.cb = null; if (cb) cb(); }
    } else if (f.a > 0) f.a = Math.max(0, f.a - 0.05);
    const locked = f.target === 1 || f.a > 0.5;

    G.leaves.forEach((l, i) => {
      l.x += l.vx + Math.sin(G.t / 50 + l.phase) * 0.6;
      l.y += l.vy;
      l.rot += l.spin;
      if (l.y > H + 20 || l.x > W + 20) G.leaves[i] = newLeaf(false);
    });

    switch (G.scene) {
      case 'title':
        if (locked) break;
        menuNav(TITLE_MENU.length, 'menu');
        if (hit('Space')) {
          Sfx.confirm();
          if (G.menu === 0) fadeTo(startGame);
          else if (G.menu === 1) { G.scene = 'levels'; G.levelMenu = 0; G.levelMsg = 0; }
          else { G.scene = 'credits'; G.creditsY = H; }
        }
        break;
      case 'levels': {
        if (G.levelMsg > 0) G.levelMsg--;
        if (locked) break;
        menuNav(LEVELS.length + 1, 'levelMenu'); // la última opción es «Volver»
        const lv = LEVELS[G.levelMenu];
        if (hit('Escape') || (hit('Space') && !lv)) { Sfx.cancel(); G.scene = 'title'; }
        else if (hit('Space') && lv.soon) { Sfx.bump(); G.levelMsg = 120; }
        else if (hit('Space')) { Sfx.confirm(); fadeTo(() => startLevel(lv)); }
        break;
      }
      case 'credits':
        G.creditsY -= 0.9;
        if (G.creditsY < -CREDITS.length * 46 - 40) G.creditsY = H;
        if (!locked && (hit('Space') || hit('Escape'))) { Sfx.cancel(); G.scene = 'title'; }
        break;
      case 'play':
        if (!locked && hit('Escape')) { openPause(); break; }
        if (G.banner > 0) G.banner--;
        updateNpcs(true);
        if (!locked) updatePlayer();
        else stepEntity(G.player);
        break;
      case 'cutscene':
        if (!locked && hit('Escape')) { openPause(); break; }
        updateNpcs(false);
        stepEntity(G.player);
        updateCutscene();
        break;
      case 'dialog':
        if (!locked && hit('Escape')) { openPause(); break; }
        updateNpcs(false);
        stepEntity(G.player);
        if (!locked) updateDialog();
        break;
      case 'minigame':
        if (!locked && hit('Escape')) { openPause(); break; }
        G.mini.game.update(G.mini.st, locked ? null : { dir: axisX(), fire: hit('Space') });
        break;
      case 'pause':
        if (locked) break;
        menuNav(3, 'pauseMenu');
        if (hit('Escape')) { Sfx.cancel(); G.scene = G.prevScene; }
        else if (hit('Space')) {
          Sfx.confirm();
          if (G.pauseMenu === 0) G.scene = G.prevScene;
          else if (G.pauseMenu === 1) fadeTo(G.restart || startGame);
          else fadeTo(toTitle);
        }
        break;
    }
  }

  function openPause() {
    Sfx.pause();
    G.prevScene = G.scene;
    G.pauseMenu = 0;
    G.scene = 'pause';
  }

  // ---------- render del mundo ----------
  function renderWorld(camX, camY) {
    const w = G.world;
    wctx.imageSmoothingEnabled = false;
    wctx.fillStyle = w.def.interior ? '#000' : '#1f4f24';
    wctx.fillRect(0, 0, VIEW_W, VIEW_H);
    wctx.drawImage(w.ground[Math.floor(G.t / 28) % 3], -camX, -camY);

    (w.def.decor || []).forEach(dc => drawDecor(dc, camX, camY, false));
    w.npcs.forEach(n => {
      if (!n.def.swim) return;
      const ring = ((G.t + n.def.x * 17) % 90) / 90;
      wctx.strokeStyle = `rgba(230,250,255,${0.9 - ring * 0.9})`;
      wctx.beginPath();
      wctx.ellipse(Math.round(n.px) + 8 - camX, Math.round(n.py) + 13 - camY, 6 + ring * 5, 2 + ring * 2, 0, 0, Math.PI * 2);
      wctx.stroke();
    });

    const list = w.statics.slice();
    entities().forEach(e => {
      if (e.hidden) return;
      const img = e.sheet[e.dir][animFrame(e)];
      // en la piscina solo asoman la cabeza y los hombros
      if (e.def && e.def.swim) {
        const bob = Math.round(Math.sin(G.t / 20 + e.def.x));
        list.push({ img, dx: Math.round(e.px), dy: Math.round(e.py - 2 + bob), base: e.py + T + 0.5, crop: 15 - bob });
        return;
      }
      list.push({ img, dx: Math.round(e.px), dy: Math.round(e.py - 8 - (e.hop || 0)), base: e.py + T + 0.5 });
    });
    list.sort((a, b) => a.base - b.base);
    list.forEach(o => {
      const x = o.dx - camX, y = o.dy - camY;
      if (x > VIEW_W || y > VIEW_H || x + o.img.width < 0 || y + o.img.height < 0) return;
      if (o.crop) return wctx.drawImage(o.img, 0, 0, o.img.width, o.crop, x, y, o.img.width, o.crop);
      const img = o.frames ? o.frames[Math.floor((G.t + o.dx) / 24) % o.frames.length] : o.img;
      wctx.drawImage(o.type === 'bed' && G.bedPose ? bedImage() : img, x, y);
    });
    (w.def.decor || []).forEach(dc => drawDecor(dc, camX, camY, true));
  }

  // Decoración animada. top: la que va por encima de personajes y objetos (banderines, confeti).
  const PARTY_COLS = ['#e04a5a', '#f2c14e', '#4f9fe0', '#c77dff', '#5cc96a', '#ff9ecd'];
  function drawDecor(dc, camX, camY, top) {
    if (dc.type === 'bobber' && !top) {
      const bx = dc.x * T + 8 - camX, by = dc.y * T + 8 - camY + Math.round(Math.sin(G.t / 18));
      const ring = (G.t % 120) / 120;
      wctx.strokeStyle = `rgba(216,241,255,${0.8 - ring * 0.8})`;
      wctx.beginPath();
      wctx.ellipse(bx + 1, by + 3, 2 + ring * 6, 1 + ring * 2, 0, 0, Math.PI * 2);
      wctx.stroke();
      wctx.fillStyle = '#2b1d16'; wctx.fillRect(bx - 1, by - 2, 4, 5);
      wctx.fillStyle = '#e04a4a'; wctx.fillRect(bx, by - 1, 2, 2);
      wctx.fillStyle = '#ffffff'; wctx.fillRect(bx, by + 1, 2, 1);
    } else if (dc.type === 'arrow' && !top) {
      wctx.drawImage(Art.arrow(dc.dir), dc.x * T - camX, dc.y * T - camY);
    } else if (dc.type === 'bunting' && top) {
      // cuerda que cuelga entre los dos postes, con banderines que se mecen
      const x0 = dc.x0 * T + 8, x1 = dc.x1 * T + 8, y0 = dc.y * T + T - 34;
      const sag = (x1 - x0) * 0.08;
      for (let x = x0; x <= x1; x++) {
        const y = Math.round(y0 + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * sag);
        wctx.fillStyle = '#2b1d16';
        wctx.fillRect(x - camX, y - camY, 1, 1);
        if ((x - x0) % 8 !== 4) continue;
        const sway = Math.round(Math.sin(G.t / 15 + x / 9));
        wctx.fillStyle = PARTY_COLS[((x - x0) >> 3) % PARTY_COLS.length];
        for (let i = 0; i < 6; i++) {
          const half = 3 - (i >> 1);
          wctx.fillRect(x - half + (i > 2 ? sway : 0) - camX, y + 1 + i - camY, half * 2, 1);
        }
      }
    } else if (dc.type === 'confetti' && top) {
      // sin estado: cada trocito cae en bucle según G.t
      const [ax, ay, bx, by] = dc.area;
      const w = (bx - ax + 1) * T, h = (by - ay + 1) * T;
      for (let i = 0; i < 40; i++) {
        const r1 = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1), r2 = Math.abs((Math.sin(i * 78.233) * 12345.678) % 1);
        const x = ax * T + r1 * w + Math.sin(G.t / 25 + i) * 4;
        const y = ay * T - 20 + ((r2 * h + G.t * (0.25 + r1 * 0.35)) % (h + 20));
        wctx.fillStyle = PARTY_COLS[i % PARTY_COLS.length];
        wctx.fillRect(Math.round(x - camX), Math.round(y - camY), (G.t + i * 7) % 20 < 10 ? 2 : 1, 2);
      }
    }
  }

  function bedImage() {
    const pose = G.bedPose === 'sleep' ? `sleep${Math.floor(G.t / 50) % 2}` : G.bedPose;
    return Art.bed(G.player.ch, pose);
  }

  // Los mapas más pequeños que la pantalla quedan centrados.
  function camAxis(size, view, pos) {
    if (size <= view) return (size - view) / 2;
    return Math.max(0, Math.min(size - view, pos - view / 2));
  }

  function camera() {
    const w = G.world, p = G.player;
    return [
      Math.round(camAxis(w.w * T, VIEW_W, p.px + T / 2)),
      Math.round(camAxis(w.h * T, VIEW_H, p.py + T / 2)),
    ];
  }

  function blitWorld() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(worldCv, 0, 0, W, H);
  }

  // ---------- helpers de interfaz ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(x, y, w, h, dark = false) {
    ctx.save();
    rr(x, y, w, h, 12);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, dark ? 'rgba(70,10,10,0.97)' : 'rgba(135,26,26,0.95)');
    g.addColorStop(1, dark ? 'rgba(35,4,4,0.97)' : 'rgba(60,8,8,0.95)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1e0303';
    ctx.stroke();
    rr(x + 6, y + 6, w - 12, h - 12, 8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,205,150,0.55)';
    ctx.stroke();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, w, h * 0.45);
    ctx.restore();
  }

  function text(str, x, y, { size = 28, color = '#fff', align = 'left', weight = 400, shadow = true } = {}) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (shadow) {
      ctx.fillStyle = 'rgba(20,0,0,0.75)';
      ctx.fillText(str, x + 2, y + 3);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function cursor(x, y) {
    const bx = x + Math.sin(G.t / 7) * 4;
    ctx.fillStyle = 'rgba(20,0,0,0.7)';
    ctx.beginPath(); ctx.moveTo(bx + 2, y - 10 + 3); ctx.lineTo(bx + 18, y + 3); ctx.lineTo(bx + 2, y + 13); ctx.fill();
    ctx.fillStyle = '#ffd45e';
    ctx.beginPath(); ctx.moveTo(bx, y - 11); ctx.lineTo(bx + 16, y); ctx.lineTo(bx, y + 11); ctx.fill();
  }

  function menuList(options, sel, cx, y0, gap) {
    options.forEach((opt, i) => {
      const y = y0 + i * gap;
      const active = i === sel;
      text(opt, cx, y, { size: 32, align: 'center', color: active ? '#ffe28a' : '#f3e6e6', weight: active ? 700 : 400 });
      if (active) {
        ctx.font = `700 32px ${FONT}`;
        cursor(cx - ctx.measureText(opt).width / 2 - 40, y);
      }
    });
  }

  function vignette(top, mid, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(0.5, mid);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawLeaves() {
    G.leaves.forEach(l => {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = l.col;
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-6, 0, 12, 1.5);
      ctx.restore();
    });
  }

  function titleBackground() {
    const w = G.world;
    const maxX = w.w * T - VIEW_W;
    renderWorld(Math.round(((Math.sin(G.t / 500) + 1) / 2) * maxX), 24);
    blitWorld();
  }

  // ---------- escenas ----------
  const TITLE_MAP = 'urba'; // mapa que se ve de fondo en el título y los créditos
  const TITLE_MENU = ['Nueva partida', 'Elegir nivel', 'Créditos'];

  function drawTitle() {
    titleBackground();
    vignette('rgba(25,10,35,0.6)', 'rgba(25,10,35,0.15)', 'rgba(25,10,35,0.75)');
    drawLeaves();

    const y = 190 + Math.sin(G.t / 45) * 5;
    ctx.font = `700 104px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText('Anthonys Bday', W / 2 + 6, y + 9);
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#3b0f0f';
    ctx.strokeText('Anthonys Bday', W / 2, y);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#a8401f';
    ctx.strokeText('Anthonys Bday', W / 2, y);
    const g = ctx.createLinearGradient(0, y - 45, 0, y + 45);
    g.addColorStop(0, '#fff8c9');
    g.addColorStop(0.5, '#ffd45e');
    g.addColorStop(1, '#f0892a');
    ctx.fillStyle = g;
    ctx.fillText('Anthonys Bday', W / 2, y);
    text('— A quien no le va a gustar! —', W / 2, y + 78, { size: 26, align: 'center', color: '#fbe9d0' });

    panel(280, 340, 400, 206);
    menuList(TITLE_MENU, G.menu, W / 2, 386, 56);

    text('↑ ↓  elegir     ESPACIO  aceptar', W / 2, 680, { size: 20, align: 'center', color: 'rgba(255,240,220,0.8)' });
  }

  function drawLevels() {
    titleBackground();
    vignette('rgba(25,10,35,0.7)', 'rgba(25,10,35,0.35)', 'rgba(25,10,35,0.8)');
    drawLeaves();
    text('Elegir nivel', W / 2, 130, { size: 60, align: 'center', color: '#ffd45e', weight: 700 });

    const items = LEVELS.concat({ name: 'Volver', back: true });
    const x0 = 180, top = 200, gap = 64;
    panel(x0 - 40, top - 20, W - 2 * (x0 - 40), items.length * gap + 30);
    items.forEach((lv, i) => {
      const y = top + 30 + i * gap;
      const active = i === G.levelMenu;
      const label = lv.back ? lv.name : `${i + 1}. ${lv.name}`;
      const color = lv.soon ? (active ? '#e8c9b0' : '#b89a90') : active ? '#ffe28a' : '#f3e6e6';
      text(label, x0 + 20, y, { size: 32, color, weight: active ? 700 : 400 });
      if (lv.soon) text('PRÓXIMAMENTE', W - x0 + 20, y, { size: 18, align: 'right', color: '#ffb070', weight: 700 });
      if (active) cursor(x0 - 22, y);
    });

    if (G.levelMsg > 0) {
      ctx.globalAlpha = Math.min(1, G.levelMsg / 20);
      text('¡Este nivel todavía está en obras!', W / 2, 610, { size: 26, align: 'center', color: '#ffb070', weight: 700 });
      ctx.globalAlpha = 1;
    }
    text('↑ ↓  elegir     ESPACIO  jugar     ESC  volver', W / 2, 680, { size: 20, align: 'center', color: 'rgba(255,240,220,0.8)' });
  }

  function drawCredits() {
    titleBackground();
    ctx.fillStyle = 'rgba(15,5,20,0.78)';
    ctx.fillRect(0, 0, W, H);
    drawLeaves();
    let y = G.creditsY;
    CREDITS.forEach(c => {
      if (c.h) text(c.h, W / 2, y, { size: c.big ? 48 : 24, align: 'center', color: '#ffd45e', weight: 700 });
      else if (c.t) text(c.t, W / 2, y, { size: 32, align: 'center' });
      y += c.big ? 64 : 46;
    });
    const g1 = ctx.createLinearGradient(0, 0, 0, 120);
    g1.addColorStop(0, 'rgba(15,5,20,1)'); g1.addColorStop(1, 'rgba(15,5,20,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, 120);
    const g2 = ctx.createLinearGradient(0, H - 130, 0, H);
    g2.addColorStop(0, 'rgba(15,5,20,0)'); g2.addColorStop(1, 'rgba(15,5,20,1)');
    ctx.fillStyle = g2; ctx.fillRect(0, H - 130, W, 130);
    text('ESPACIO / ESC  volver', W / 2, 680, { size: 20, align: 'center', color: 'rgba(255,240,220,0.8)' });
  }

  // Bocadillo de cómic que apunta a (ax, ay). Se mide con el texto completo para que no cambie de tamaño al escribirse.
  function drawBubble(b, ax, ay) {
    const size = 34;
    ctx.font = `700 ${size}px ${FONT}`;
    const bw = ctx.measureText(b.text).width + 56, bh = 72;
    const bx = Math.max(16, Math.min(W - bw - 16, ax - 60)), by = ay - 70 - bh;
    const tip = [ax, ay - 14];
    const tail = [[ax - 16, by + bh - 2], [ax + 10, by + bh - 2]];
    const s = 1 + 2.7 * Math.pow(b.anim - 1, 3) + 1.7 * Math.pow(b.anim - 1, 2); // aparece con un pequeño rebote

    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(s, s);
    ctx.translate(-ax, -ay);
    ctx.lineJoin = 'round';
    const tailPath = () => {
      ctx.beginPath();
      ctx.moveTo(...tail[0]);
      ctx.lineTo(...tip);
      ctx.lineTo(...tail[1]);
      ctx.closePath();
    };
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(bx + 5, by + 7, bw, bh, 26);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = '#2b1d16';
    ctx.lineWidth = 5;
    tailPath(); ctx.fill(); ctx.stroke();
    rr(bx, by, bw, bh, 26); ctx.fill(); ctx.stroke();
    tailPath(); ctx.fill();
    text(b.text.slice(0, Math.floor(b.shown)), bx + 28, by + bh / 2 + 2, { size, color: '#2b1d16', weight: 700, shadow: false });
    ctx.restore();
  }

  function drawCutscene(camX, camY) {
    const c = G.cut;
    if (c.dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${c.dark})`;
      ctx.fillRect(0, 0, W, H);
    }
    const b = G.world.bed;
    if (c.bubble && b) {
      const k = W / VIEW_W;
      drawBubble(c.bubble, (b.x * T + b.w * T / 2 - camX) * k, ((b.y + b.h) * T - b.img.height + 10 - camY) * k);
    }
  }

  function drawPlay() {
    const [cx, cy] = camera();
    renderWorld(cx, cy);
    blitWorld();
    if (G.cut) drawCutscene(cx, cy);
    if (G.banner > 0 && G.scene === 'play') {
      const a = Math.min(1, G.banner / 30, (200 - G.banner) / 20);
      ctx.globalAlpha = Math.max(0, a);
      panel(24, 24, 300, 70, true);
      text(G.world.def.name, 174, 60, { size: 30, align: 'center', color: '#ffe28a', weight: 700 });
      ctx.globalAlpha = 1;
    }
    if (G.dialog) drawDialog();
  }

  function drawDialog() {
    const d = G.dialog;
    const box = { x: 20, y: 516, w: 920, h: 188 };
    const e = 1 - Math.pow(1 - d.anim, 3);
    panel(box.x, box.y, box.w, box.h);

    if (d.ch) {
      const size = 256;
      const img = Art.portrait(d.ch, d.mood);
      const left = d.side === 'left';
      const px = left ? 14 - (1 - e) * 60 : W - 14 - size + (1 - e) * 60;
      const py = box.y + box.h - size - 6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, box.y + box.h - 6);
      ctx.clip();
      ctx.globalAlpha = e;
      ctx.imageSmoothingEnabled = false;
      if (left) ctx.drawImage(img, px, py, size, size);
      else {
        ctx.translate(px + size, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, size, size);
      }
      ctx.restore();

      const label = `-${d.ch.name}-`;
      ctx.font = `700 26px ${FONT}`;
      const lw = ctx.measureText(label).width + 50;
      const lx = left ? 280 : W - 280 - lw;
      panel(lx, box.y - 30, lw, 46, true);
      text(label, lx + lw / 2, box.y - 7, { size: 26, align: 'center', color: '#ffe28a', weight: 700 });
    }

    const tx = d.side === 'left' ? 292 : d.side === 'right' ? 52 : 60;
    let remaining = Math.floor(d.shown);
    d.wrapped.forEach((line, i) => {
      if (remaining <= 0) return;
      const part = line.slice(0, remaining);
      remaining -= line.length;
      ctx.font = TEXT_FONT;
      text(part, tx, box.y + 50 + i * 42, { size: 28 });
    });

    if (d.shown >= d.total) {
      const ax = box.x + box.w / 2, ay = box.y + box.h - 22 + Math.sin(G.t / 6) * 3;
      ctx.fillStyle = '#ffd45e';
      ctx.beginPath();
      ctx.moveTo(ax - 10, ay - 6);
      ctx.lineTo(ax + 10, ay - 6);
      ctx.lineTo(ax, ay + 6);
      ctx.fill();
    }
  }

  function drawMinigame() {
    const m = G.mini;
    m.game.drawWorld(m.st, wctx);
    blitWorld();
    m.game.drawHud(m.st, ctx, { W, H, FONT, text, panel });
  }

  function drawPause() {
    (G.prevScene === 'minigame' ? drawMinigame : drawPlay)();
    ctx.fillStyle = 'rgba(10,0,10,0.55)';
    ctx.fillRect(0, 0, W, H);
    panel(310, 190, 340, 330);
    text('PAUSA', W / 2, 240, { size: 40, align: 'center', color: '#ffd45e', weight: 700 });
    ctx.fillStyle = 'rgba(255,205,150,0.4)';
    ctx.fillRect(360, 272, 240, 2);
    menuList(['Continuar', 'Reiniciar', 'Salir al título'], G.pauseMenu, W / 2, 320, 56);
    text('ESC  volver', W / 2, 485, { size: 18, align: 'center', color: 'rgba(255,240,220,0.7)' });
  }

  function render() {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ({ title: drawTitle, levels: drawLevels, credits: drawCredits, play: drawPlay, dialog: drawPlay, cutscene: drawPlay, minigame: drawMinigame, pause: drawPause })[G.scene]();
    if (G.fade.a > 0) {
      ctx.fillStyle = `rgba(0,0,0,${G.fade.a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- bucle y arranque ----------
  function resize() {
    const ar = W / H;
    let w = innerWidth, h = innerHeight;
    if (w / h > ar) w = h * ar; else h = w / ar;
    canvas.style.width = `${Math.floor(w)}px`;
    canvas.style.height = `${Math.floor(h)}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      update();
      pressed.clear();
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  function boot() {
    resize();
    addEventListener('resize', resize);
    G.world = createWorld(TITLE_MAP);
    if (location.search.includes('debug')) window.__G = G;
    requestAnimationFrame(frame);
  }

  const fontTimeout = new Promise(r => setTimeout(r, 1500));
  const fontLoad = document.fonts
    ? Promise.all([document.fonts.load('28px "Pixelify Sans"'), document.fonts.load('700 28px "Pixelify Sans"')])
    : Promise.resolve();
  Promise.race([fontLoad, fontTimeout]).catch(() => {}).then(boot);
})();
