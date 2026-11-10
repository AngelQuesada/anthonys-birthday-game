'use strict';

(() => {
  const W = 960, H = 720;           // resolución lógica de la interfaz
  const VIEW_W = 320, VIEW_H = 240; // resolución del mundo (x3)
  const T = Art.T;
  const FONT = '"Nunito", "Segoe UI", sans-serif';
  const TEXT_FONT = `700 28px ${FONT}`;
  const TEXT_SPEED = 0.7; // caracteres por frame
  const SOLID = new Set(['T', 'b', 'r', 'f', 's', '~', 'X', 'W', 'h', 'g', 'n', 'P', 'w', ' ', 'Y', 'm', 'Z', 'k', 'R', 'H']);
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
    shake: 0,      // frames que le quedan al terremoto
    camLock: null, // cámara fija [x, y] (para que los personajes puedan salir de pantalla)
    greeted: new Set(), // invitados (GUESTS) con los que ya se ha hablado
    track: null,   // canción (mp3) que suena ahora, puesta por un paso { music } de una escena
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
    def.tiles.forEach((row, i) => { if (row.length !== w) console.warn(`Row ${i} of map "${id}" is ${row.length} wide, expected ${w}`); });
    const solid = def.tiles.map(row => [...row].map(ch => SOLID.has(ch)));
    const doors = {};
    (def.houses || []).forEach(hs => {
      for (let y = hs.y; y < hs.y + hs.h; y++) for (let x = hs.x; x < hs.x + hs.w; x++) solid[y][x] = true;
      doors[doorTile(hs).join(',')] = hs;
    });
    const furniture = (def.furniture || []).map(f => ({ ...f, ...Art.furniture(f.type, f.w, f.h) }));
    furniture.forEach(f => {
      if (f.flat) return;
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) solid[y][x] = true;
    });
    const room = def.interior ? Art.room(def.tiles, furniture) : null;
    return {
      id, def, w, h, solid, doors,
      // la cama de las cinemáticas: la marcada con `sleep: true` o, si no hay, la primera de tipo 'bed'
      bed: furniture.find(f => f.sleep) || furniture.find(f => f.type === 'bed'),
      ground: room ? [room, room, room] : [0, 1, 2].map(f => Art.ground(def.tiles, f, furniture, def.base)),
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
    if (face === 'up') return [hs.x + Math.floor(hs.w / 2), hs.y];
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
    // desnivel: entre la arena de abajo y la alta (y) solo se pasa por la rampa (E)
    if (self) {
      const a = levelAt(self.x, self.y), b = levelAt(x, y);
      if (a !== b && a !== 'E' && b !== 'E') return true;
    }
    return entities().some(e => e !== self && ((e.x === x && e.y === y) || (e.moving && e.fromX === x && e.fromY === y)));
  }

  function levelAt(x, y) {
    const ch = G.world.def.tiles[y][x];
    return ch === 'E' ? 'E' : ch === 'y' ? 1 : 0;
  }

  // ¿La casilla está en una zona `turnBack` del mapa (por ahí el protagonista no quiere ir)?
  function turnBackAt(x, y) {
    return (G.world.def.turnBack || []).some(([x0, y0, x1, y1]) => x >= x0 && y >= y0 && x <= x1 && y <= y1);
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
    G.greeted = new Set();
    G.dialog = null;
    G.cut = null;
    G.mini = null;
    G.bedPose = null;
    G.track = null;
    if (lv.minigame) {
      G.player = null;
      // al ganar sigue el nivel indicado en `then` (o se vuelve al título)
      const next = lv.then && LEVELS.find(l => l.story === lv.then);
      return startMinigame(lv.minigame, () => fadeTo(next ? () => startLevel(next) : toTitle));
    }
    if (lv.story) {
      const story = STORY[lv.story];
      G.visited.add(story.map);
      enterMap(story.map, story.spawn.x, story.spawn.y, story.spawn.dir, false);
      // personajes que están ya en el mapa al empezar la historia
      (story.cast || []).forEach(c => G.world.npcs.push(makeEntity(c.char, c.x, c.y, c.dir, { x: c.x, y: c.y })));
      return startCutscene(story.steps);
    }
    const start = MAPS[lv.map].playerStart;
    enterMap(lv.map, start.x, start.y, start.dir, true);
  }

  const startGame = () => startLevel(LEVELS[0]);

  function toTitle() {
    G.scene = 'title';
    G.track = null;
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
    if (id === 'urba') spawnGuests(); // los invitados están en la urbanización siempre que se entra en ella
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
  function startCutscene(steps, opts = {}) {
    G.cut = { steps, i: -1, t: 0, dark: 0, bubble: null, ...opts };
    G.scene = 'cutscene';
    nextStep();
  }

  // Minijuegos: módulos con create(onWin), update(st, input), drawWorld(st, wctx) y drawHud(st, ctx, ui).
  const MINIGAMES = { chase: Battle };

  // Escenas con `minigame: id` (scenes/*.js): la que no lleva `when` (p. ej. scene_simone.js) la lanza el
  // minijuego al empezar y el combate arranca al terminarla; las que llevan `when` (p. ej. scene_gabi.js)
  // saltan a mitad de combate en cuanto se cumple su condición (game.reached).
  function miniScene(id, test) {
    return Object.keys(SCENES).find(k => SCENES[k].minigame === id && !G.flags.has('scene:' + k) && test(SCENES[k]));
  }

  function playMiniScene(sceneId, onEnd) {
    G.flags.add('scene:' + sceneId);
    const outer = G.cut; // cinemática de STORY que lanzó el minijuego, si la hay
    startCutscene(sceneSteps(SCENES[sceneId]), { quiet: true, onEnd: () => { G.cut = outer; onEnd(); } });
  }

  function startMinigame(id, onWin) {
    const game = MINIGAMES[id];
    const introId = miniScene(id, sc => !sc.when);
    const intro = introId && (begin => playMiniScene(introId, begin));
    G.mini = { id, game, st: game.create(onWin, intro) };
    G.scene = 'minigame';
  }

  // En pleno combate: ¿toca alguna escena con `when`? El combate se congela mientras dura.
  function checkMiniScenes() {
    const m = G.mini;
    if (!m || G.scene !== 'minigame' || m.st.state !== 'fight' || !m.game.reached) return;
    const sceneId = miniScene(m.id, sc => sc.when && m.game.reached(m.st, sc.when));
    if (!sceneId) return;
    m.game.hold(m.st);
    playMiniScene(sceneId, () => m.game.resume(m.st));
  }

  function endCutscene() {
    const { quiet, onEnd, dark } = G.cut;
    // si la escena acaba a oscuras, la pantalla sigue negra (y se aclara sola si no viene nada después)
    if (dark >= 1) G.fade.a = 1;
    G.cut = null;
    G.camLock = null;
    G.shake = 0;
    G.scene = G.mini ? 'minigame' : 'play';
    if (!quiet) G.banner = 200;
    if (onEnd) onEnd();
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
    if ('transform' in s) { G.mini.game.transform(G.mini.st); return nextStep(); }
    if ('music' in s) { G.track = s.music || null; return nextStep(); }
    if ('flag' in s) { G.flags.add(s.flag); return nextStep(); }
    if ('battle' in s) {
      // battle: "chase" -> empieza ese nivel de minijuego (con la pantalla en negro, que se aclara sola)
      const lv = LEVELS.find(l => l.minigame === s.battle);
      if (!lv) { console.warn(`Escena: no hay nivel de minijuego «${s.battle}»`); return nextStep(); }
      G.camLock = null;
      G.shake = 0;
      G.fade.a = 1;
      G.fade.target = 0;
      G.fade.cb = null;
      return startLevel(lv);
    }
    if ('drive' in s) {
      // drive: true -> el coche por la carretera recta del final, sin control del jugador (mejor tras un fade a negro).
      // La escena sigue encima: diálogos, { act: 'brake' } / { act: 'go' }, música, créditos...
      G.camLock = null;
      G.shake = 0;
      G.mini = { id: 'drive', game: Battle, st: Battle.create(null, null, { drive: true }) };
      return nextStep();
    }
    if ('finale' in s) {
      c.finale = { ...s.finale, t: 0 };
      portraitImage(s.finale.photo);
    }
    if ('act' in s) {
      if (!G.mini) { console.warn('Escena: { act } solo vale dentro de un minijuego'); return nextStep(); }
      G.mini.game.act(G.mini.st, s.act);
    }
    if ('face' in s) {
      if (G.mini) return nextStep(); // en el minijuego no hay personajes en el mapa
      // face: true gira a todos; face: ['ricardo', ...] solo a esos personajes
      const only = Array.isArray(s.face) ? s.face.map(k => CHARACTERS[k]) : null;
      G.world.npcs.forEach(n => { if (!only || only.includes(n.ch)) faceTo(n, G.player.x, G.player.y); });
      return nextStep();
    }
    if ('look' in s) {
      // look: { who: ['sharon', 'kael'], dir: 'up' } -> esos personajes miran hacia ahí (y se quedan así)
      [].concat(s.look.who).map(sceneEntity).filter(Boolean).forEach(e => {
        e.dir = e.homeDir = s.look.dir;
        e.restoreT = 0;
      });
      return nextStep();
    }
    if ('place' in s) {
      // place: { who, at: [x, y], dir } -> ese personaje aparece ahí (si no estaba en el mapa, se crea)
      const { who, at: [x, y], dir = 'down' } = s.place;
      let e = sceneEntity(who);
      if (!e) G.world.npcs.push(e = makeEntity(who, x, y, dir, { x, y }));
      Object.assign(e, { x, y, fromX: x, fromY: y, px: x * T, py: y * T, moving: false, moveT: 0, hop: 0, dir, homeDir: dir, restoreT: 0, hidden: false });
      return nextStep();
    }
    if ('remove' in s) {
      const e = sceneEntity(s.remove);
      G.world.npcs = G.world.npcs.filter(n => n !== e);
      return nextStep();
    }
    if ('item' in s) {
      // item: { type, at: [x, y] } -> objeto en el suelo (no bloquea el paso); se quita con `pickup`
      const [x, y] = s.item.at, f = Art.furniture(s.item.type);
      G.world.statics.push({ img: f.img, dx: x * T, dy: y * T, base: y * T + 1, item: s.item.type, at: [x, y] });
      return nextStep();
    }
    // pasos con duración
    if ('camera' in s) {
      // camera: [x, y] -> se desliza hasta centrarse en esa casilla; camera: 'anthon' -> vuelve a seguir a Anthon
      const w = G.world;
      c.camFrom = camera();
      G.camLock = null;
      c.camTo = s.camera === 'anthon' || s.camera === PLAYER_CHAR ? camera()
        : [Math.round(camAxis(w.w * T, VIEW_W, s.camera[0] * T + T / 2)), Math.round(camAxis(w.h * T, VIEW_H, s.camera[1] * T + T / 2))];
      G.camLock = c.camFrom;
    }
    if ('pickup' in s) {
      // pickup: { at: [x, y], name } -> Anthon se gira hacia el objeto, lo recoge y sale el aviso
      const p = G.player, w = G.world, [x, y] = s.pickup.at;
      faceTo(p, x, y);
      p.restoreT = 0;
      const i = w.statics.findIndex(o => o.item && o.at[0] === x && o.at[1] === y);
      const img = i >= 0 ? w.statics[i].img : null;
      if (i >= 0) w.statics.splice(i, 1);
      c.notice = { text: `You picked up: ${s.pickup.name}`, img, anim: 0 };
      G.flags.add('item:' + s.pickup.name.toLowerCase());
      Sfx.item();
    }
    if ('fade' in s) c.from = c.dark;
    if ('focus' in s) c.focusFrom = c.focus || 0; // el modo (c.focusMode) se queda hasta que se vuelve a 0
    if ('bubble' in s) c.bubble = { text: s.bubble, shown: 0, lastBlip: 0, hold: s.hold || 60, anim: 0 };
    if ('getUp' in s) {
      const p = G.player, b = G.world.bed;
      setPose(null);
      // salta desde la casilla de la cama más cercana al destino
      p.x = s.getUp.x; p.y = s.getUp.y;
      p.fromX = Math.max(b.x, Math.min(b.x + b.w - 1, p.x));
      p.fromY = Math.max(b.y, Math.min(b.y + b.h - 1, p.y));
      p.dir = p.x !== p.fromX ? (p.x > p.fromX ? 'right' : 'left') : p.y > p.fromY ? 'down' : 'up';
      p.moving = true;
      p.moveT = 0;
      p.walkSpeed = p.speed;
      p.speed = 24;
      Sfx.rustle();
    }
    if ('walk' in s) {
      // walk: { to: [x, y], speed: 2 } -> el protagonista camina solo hasta la casilla libre alcanzable más cercana
      const p = G.player;
      c.path = findPath(p, s.walk.to);
      p.walkSpeed = p.speed;
      p.speed = Math.max(1, Math.round(p.speed / (s.walk.speed || 1)));
    }
    if ('shake' in s) {
      G.shake = s.shake;
      Sfx.rumble(s.shake / 60);
    }
    if ('photo' in s) { setupPhoto(s.photo); return nextStep(); }
    if ('flash' in s) { c.flash = 1; Sfx.shutter(); }
    if ('enter' in s) {
      // enter: { who, speed } -> aparece en la casilla libre más cercana fuera de pantalla y corre hasta Anthon.
      // Si ya está en el mapa (p. ej. Angel tras la foto), solo se acerca a Anthon desde donde esté.
      const p = G.player;
      let npc = G.world.npcs.find(n => n.ch === CHARACTERS[s.enter.who]);
      if (!npc) {
        const [x, y] = offscreenTile([p.x, p.y], 1);
        npc = makeEntity(s.enter.who, x, y, 'down', { x, y });
        G.world.npcs.push(npc);
        c.origin = [x, y];
      }
      npc.walkSpeed = npc.walkSpeed || npc.speed;
      npc.speed = Math.max(1, Math.round(npc.walkSpeed / (s.enter.speed || 1)));
      c.movers = [{ e: npc, path: findPath(npc, [p.x, p.y]) }];
    }
    if ('run' in s) {
      // run: { who: [guía, ...seguidores], speed, to? } -> salen corriendo (por donde entró el último `enter`)
      // con la cámara quieta, para que se vayan de la pantalla
      G.camLock = camera();
      const ents = s.run.who.map(k => k === PLAYER_CHAR ? G.player : G.world.npcs.find(n => n.ch === CHARACTERS[k]));
      const lead = ents[0];
      const to = offscreenTile(s.run.to || c.origin || [lead.x, lead.y], 3);
      c.movers = ents.map(e => {
        e.walkSpeed = e.walkSpeed || e.speed;
        e.speed = Math.max(1, Math.round(e.speed / (s.run.speed || 1)));
        return { e };
      });
      c.movers[0].path = findPath(lead, to);
      c.movers.slice(1).forEach((m, i) => { m.trail = []; c.movers[i].leads = m; });
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
    } else if ('camera' in s) {
      const k = Math.min(1, c.t / (s.frames || 1)), e = k * k * (3 - 2 * k); // arranca y frena suave
      G.camLock = [0, 1].map(i => Math.round(c.camFrom[i] + (c.camTo[i] - c.camFrom[i]) * e));
      if (k < 1) return;
      if (s.camera === 'anthon' || s.camera === PLAYER_CHAR) G.camLock = null;
      nextStep();
    } else if ('pickup' in s) {
      c.notice.anim = Math.min(1, c.notice.anim + 0.1);
      if (c.t < 30 || !hit('Space')) return;
      c.notice = null;
      Sfx.close();
      nextStep();
    } else if ('act' in s) {
      if (!G.mini || !G.mini.game.acting(G.mini.st)) nextStep();
    } else if ('hold' in s) {
      // se queda aquí hasta que otra cosa continúe la historia
    } else if ('finale' in s) {
      c.finale.t++; // pantalla final: no termina nunca
    } else if ('shake' in s) {
      G.shake = s.shake - c.t;
      if (G.shake <= 0) nextStep();
    } else if ('enter' in s) {
      if (stepMovers(c)) return;
      const npc = c.movers[0].e, p = G.player;
      faceTo(npc, p.x, p.y);
      npc.restoreT = 0;
      npc.homeDir = npc.dir;
      p.dir = OPP[npc.dir];
      nextStep();
    } else if ('run' in s) {
      const [cx, cy] = G.camLock;
      const gone = e => e.px + T <= cx || e.px >= cx + VIEW_W || e.py + T <= cy - 8 || e.py - 8 >= cy + VIEW_H;
      if (stepMovers(c) && !c.movers.every(m => gone(m.e))) return;
      c.movers.forEach(m => { m.e.speed = m.e.walkSpeed; });
      nextStep();
    } else if ('flash' in s) {
      c.flash = Math.max(0, 1 - c.t / s.flash);
      if (c.flash <= 0) nextStep();
    } else if ('fade' in s) {
      const k = Math.min(1, c.t / (s.frames || 60));
      c.dark = c.from + (s.fade - c.from) * k;
      if (k >= 1) nextStep();
    } else if ('focus' in s) {
      // focus: "sea" (o 1) -> todo se funde a negro menos el mar; focus: 0 -> vuelve a verse todo
      const to = s.focus ? 1 : 0, k = Math.min(1, c.t / (s.frames || 60));
      if (s.focus) c.focusMode = s.focus;
      c.focus = c.focusFrom + (to - c.focusFrom) * k;
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
    } else if ('walk' in s) {
      const p = G.player;
      if (p.moving) return;
      const dir = c.path.shift();
      if (!dir || !tryMove(p, dir)) {
        p.speed = p.walkSpeed;
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

  // Foto de grupo: coloca a Anthon en `anthon`, a todos los demás personajes del mapa pegados en `rows` filas
  // justo detrás de él (todos mirando a la cámara), la cámara con trípode en `camera` y al fotógrafo a su derecha.
  function setupPhoto({ anthon, camera: cam, beside, hide = [], rows = 2 }) {
    const w = G.world, p = G.player;
    const place = (e, x, y, dir) => {
      if (w.solid[y] && w.solid[y][x]) console.warn(`Foto: la casilla ${x},${y} está ocupada`);
      Object.assign(e, { x, y, fromX: x, fromY: y, px: x * T, py: y * T, moving: false, moveT: 0, hop: 0, dir, homeDir: dir, restoreT: 0 });
    };
    place(p, anthon[0], anthon[1], 'down');
    const named = k => w.npcs.find(n => n.ch === CHARACTERS[k]);
    const hidden = hide.map(named).filter(Boolean);
    hidden.forEach(n => { n.hidden = true; });
    const side = beside && named(beside);
    if (side) place(side, anthon[0] + 1, anthon[1], 'down');
    const group = w.npcs.filter(n => n !== side && !hidden.includes(n) && !(n.def && n.def.swim));
    const cols = Math.ceil(group.length / rows);
    group.forEach((n, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, group.length - row * cols);
      const x = anthon[0] - Math.floor((inRow - 1) / 2) + (i % cols);
      // la última fila que se rellena es la de delante, pegada a Anthon
      if (n.def) { n.def.dance = false; n.def.wander = 0; }
      place(n, x, anthon[1] - rows + row, 'down');
    });
    if (cam) {
      const f = { type: 'phototripod', x: cam[0], y: cam[1], ...Art.furniture('phototripod') };
      w.statics.push({ img: f.img, dx: f.x * T, dy: (f.y + 1) * T - f.img.height, base: (f.y + 1) * T, furn: f });
      w.solid[cam[1]][cam[0]] = true;
    }
  }

  // Camino (lista de direcciones) desde `e` hasta la casilla libre alcanzable más cercana a `to` (búsqueda en anchura).
  function findPath(e, to) {
    const w = G.world, key = (x, y) => y * w.w + x;
    const { queue, prev } = explore([e.x, e.y]);
    let best = [e.x, e.y], bestD = Infinity;
    queue.forEach(([x, y]) => {
      const d = Math.abs(x - to[0]) + Math.abs(y - to[1]);
      if (d < bestD) { bestD = d; best = [x, y]; }
    });
    const path = [];
    for (let p = prev.get(key(...best)); p; p = prev.get(key(p[0], p[1]))) path.unshift(p[2]);
    return path;
  }

  // Casilla alcanzable más cercana a `from` que queda fuera de la cámara (al menos `margin` casillas fuera).
  function offscreenTile(from, margin) {
    const [cx, cy] = camera(), m = margin * T;
    const out = ([x, y]) => x * T + m <= cx || x * T >= cx + VIEW_W + m - T
      || y * T + m <= cy || y * T - 8 >= cy + VIEW_H + m - T;
    return explore(from).queue.find(out) || from;
  }

  // Búsqueda en anchura por casillas libres desde `from` (los personajes cuentan como obstáculo).
  function explore(from) {
    const w = G.world, key = (x, y) => y * w.w + x;
    const occupied = new Set(entities().map(n => key(n.x, n.y)));
    const prev = new Map([[key(from[0], from[1]), null]]);
    const queue = [from];
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      for (const dir in DIRS) {
        const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1], k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || prev.has(k) || w.solid[ny][nx] || occupied.has(k)) continue;
        const a = levelAt(x, y), b = levelAt(nx, ny);
        if (a !== b && a !== 'E' && b !== 'E') continue;
        prev.set(k, [x, y, dir]);
        queue.push([nx, ny]);
      }
    }
    return { queue, prev };
  }

  // Mueve a los personajes de un paso `enter`/`run`: el guía sigue su camino y cada seguidor pisa
  // las casillas que va dejando el de delante. Devuelve true mientras alguien siga moviéndose.
  function stepMovers(c) {
    let busy = false;
    c.movers.forEach(m => {
      const e = m.e;
      if (e.moving) { busy = true; return; }
      let dir = null;
      if (m.trail) {
        const t = m.trail[0];
        if (t) dir = Object.keys(DIRS).find(d => e.x + DIRS[d][0] === t[0] && e.y + DIRS[d][1] === t[1]);
        if (t && !dir) m.trail.shift();
      } else dir = m.path[0];
      if (!dir) return;
      busy = true;
      if (tryMove(e, dir)) {
        if (m.trail) m.trail.shift(); else m.path.shift();
        if (m.leads) m.leads.trail.push([e.fromX, e.fromY]);
        m.stuck = 0;
      } else if (++m.stuck > 90) {
        // atascado: se rinde para no bloquear la escena
        if (m.trail) m.trail.length = 0; else m.path.length = 0;
      }
    });
    return busy;
  }

  // Personaje del mapa por su clave de CHARACTERS (el protagonista también vale).
  function sceneEntity(key) {
    if (key === PLAYER_CHAR) return G.player;
    return G.world.npcs.find(n => n.ch === CHARACTERS[key]);
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
    // quien no tiene nada que decir (sin `talks`) ni se gira ni contesta
    if (npc && !(npc.def && npc.def.talks)) return;
    if (npc) {
      npc.dir = OPP[p.dir];
      const talks = npc.def.talks;
      let i = (Math.random() * talks.length) | 0;
      if (talks.length > 1 && i === npc.lastTalk) i = (i + 1) % talks.length;
      npc.lastTalk = i;
      startDialog(talks[i], npc, true, greetGuest(npc));
      return;
    }
    const sign = (w.def.signs || {})[`${tx},${ty}`];
    if (sign) return startDialog(sign);
    if (w.def.seaText && w.def.tiles[ty] && w.def.tiles[ty][tx] === 'm') return startDialog(w.def.seaText);
    const house = w.doors[`${tx},${ty}`];
    if (!house || p.dir !== OPP[house.face || 'down']) return;
    if (house.enter) goTo(house.enter);
    else startDialog(house.locked || [{ text: 'The door is closed.' }]);
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
    const who = line.who || PLAYER_CHAR; // sin personaje explícito (carteles, objetos...) habla el protagonista
    const ch = CHARACTERS[who];
    d.ch = ch;
    d.side = 'right'; // el retrato va siempre a la derecha, hable quien hable
    d.mood = line.mood || 'normal';
    d.wrapped = wrap(line.text, 610);
    d.total = d.wrapped.reduce((n, l) => n + l.length, 0);
    d.shown = 0;
    d.lastBlip = 0;
    if (who !== d.speaker) d.anim = 0;
    d.speaker = who;
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
    // escenas (scenes/*.js): cada una se lanza una sola vez en su mapa, al pisar su zona (`area`)
    // o al haber saludado a suficientes invitados (`when.greeted`)
    const scene = Object.keys(SCENES).find(id => {
      const sc = SCENES[id], a = sc.area;
      if (sc.map !== G.world.id || G.flags.has('scene:' + id)) return false;
      if (sc.when) return greetedEnough(sc.when.greeted);
      return wasMoving && p.x >= a[0] && p.y >= a[1] && p.x <= a[2] && p.y <= a[3];
    });
    if (scene) {
      G.flags.add('scene:' + scene);
      startCutscene(sceneSteps(SCENES[scene]));
      if (G.cut) G.cut.quiet = true;
      return;
    }
    if (hit('Space')) return interact();
    // tras darse la vuelta en una zona `turnBack`, esa flecha no cuenta hasta que se suelte
    if (G.refused && !dirStack.includes(G.refused)) G.refused = null;
    const d = dirStack.filter(x => x !== G.refused).pop();
    if (!d) { p.turnWait = 0; return; }
    // Un toque corto solo gira al personaje; mantener la flecha lo hace andar.
    if (d !== p.dir && !wasMoving) { p.dir = d; p.turnWait = 6; return; }
    if (p.turnWait > 0) { p.turnWait--; return; }
    const [sx, sy] = DIRS[d];
    if (turnBackAt(p.x + sx, p.y + sy) && !turnBackAt(p.x, p.y)) {
      G.refused = d;
      p.dir = OPP[d];
      p.turnWait = 6;
      return;
    }
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
    if (!G.mini || G.scene === 'pause') Sfx.engine(false);
    // música de la fase 1: en casa y patio; en pausa baja de volumen pero no se corta
    const sc = G.scene === 'pause' ? G.prevScene : G.scene;
    Sfx.music(['play', 'dialog', 'cutscene'].includes(sc) && !G.mini && !!G.world && MUSIC_MAPS.has(G.world.id), G.scene === 'pause');
    // olas en la playa
    Sfx.waves(['play', 'dialog', 'cutscene'].includes(sc) && !G.mini && !!G.world && G.world.id === 'playa', G.scene === 'pause');
    // canción de las escenas ({ music } en scenes/*.js), p. ej. la del combate contra el monstruo
    Sfx.track(G.track, G.scene === 'pause');
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
        if (G.mini) G.mini.game.update(G.mini.st, null); // escena dentro del minijuego: el mundo sigue vivo
        else { updateNpcs(false); stepEntity(G.player); }
        updateCutscene();
        break;
      case 'dialog':
        if (!locked && hit('Escape')) { openPause(); break; }
        if (G.mini) G.mini.game.update(G.mini.st, null);
        else { updateNpcs(false); stepEntity(G.player); }
        if (!locked) updateDialog();
        break;
      case 'minigame':
        if (!locked && hit('Escape')) { openPause(); break; }
        G.mini.game.update(G.mini.st, locked ? null : { dir: axisX(), fire: hit('Space') });
        checkMiniScenes();
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
  // Paso `focus`: la cámara "se mete en el mar". Solo se ve agua (animada) a pantalla completa, sin orilla ni
  // personajes; `a` (0..1) la funde sobre el mundo. Se toma una franja de agua pura del mapa (las filas de
  // arriba, por la izquierda de la roca) y se repite en vertical hasta cubrir la pantalla.
  function drawSeaView(a) {
    const w = G.world, g = w.ground[Math.floor(G.t / 28) % 3];
    const sh = 8 * T, sx = 4 * T; // 8 filas de agua, a partir de la columna 4
    wctx.save();
    wctx.globalAlpha = a;
    for (let y = 0; y < VIEW_H; y += sh) {
      wctx.drawImage(g, sx, 0, VIEW_W, sh, 0, y, VIEW_W, sh);
    }
    wctx.restore();
  }

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
    const pending = [];
    w.npcs.forEach(n => {
      const g = n.def && n.def.guest;
      if (g && n.def.counts !== false && !G.greeted.has(g)) pending.push(n);
    });
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
      wctx.drawImage(o.furn && o.furn === w.bed && G.bedPose ? bedImage() : img, x, y);
    });
    // señal sobre quien aún no has saludado
    pending.forEach(n => {
      const bob = Math.round(Math.sin(G.t / 12 + n.x * 2));
      const x = Math.round(n.px) + 5 - camX, y = Math.round(n.py) - 21 - camY + bob;
      wctx.fillStyle = '#2b1d16';
      wctx.fillRect(x - 1, y - 1, 9, 12);
      wctx.fillRect(x + 2, y + 11, 3, 2);
      wctx.fillStyle = '#ffd84a';
      wctx.fillRect(x, y, 7, 10);
      wctx.fillStyle = '#2b1d16';
      wctx.fillRect(x + 3, y + 1, 1, 5);
      wctx.fillRect(x + 3, y + 7, 1, 2);
    });
    (w.def.decor || []).forEach(dc => drawDecor(dc, camX, camY, true));
    if (G.cut && G.cut.focus > 0) drawSeaView(G.cut.focus);
    if (w.def.night) applyNight(camX, camY);
    // el brillo de las luces va por encima del tinte para que se vea encendido
    (w.def.decor || []).forEach(dc => { if (dc.type === 'partylights') drawLightGlow(dc, camX, camY); });
  }

  // Luces de fiesta: cuerda entre dos postes con bombillas de colores que parpadean (y = fila de los postes).
  function lightBulbs(dc) {
    const x0 = dc.x0 * T + 8, x1 = dc.x1 * T + 8, y0 = dc.y * T + T - 34, sag = (x1 - x0) * 0.08;
    const out = [];
    for (let x = x0; x <= x1; x++) out.push({ x, y: Math.round(y0 + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * sag), bulb: (x - x0) % 7 === 3, i: (x - x0) / 7 | 0 });
    return out;
  }
  function drawPartyLights(dc, camX, camY) {
    lightBulbs(dc).forEach(b => {
      wctx.fillStyle = '#2b1d16';
      wctx.fillRect(b.x - camX, b.y - camY, 1, 1);
      if (!b.bulb) return;
      const on = (Math.floor(G.t / 20) + b.i) % 3 !== 0;
      wctx.fillStyle = on ? PARTY_COLS[b.i % PARTY_COLS.length] : '#6b5a52';
      wctx.fillRect(b.x - 1 - camX, b.y + 1 - camY, 3, 3);
    });
  }
  function drawLightGlow(dc, camX, camY) {
    wctx.save();
    wctx.globalCompositeOperation = 'lighter';
    lightBulbs(dc).forEach(b => {
      if (!b.bulb || (Math.floor(G.t / 20) + b.i) % 3 === 0) return;
      const x = b.x - camX, y = b.y + 2 - camY;
      const g = wctx.createRadialGradient(x, y, 0, x, y, 14);
      const c = PARTY_COLS[b.i % PARTY_COLS.length];
      g.addColorStop(0, c + 'aa');
      g.addColorStop(1, c + '00');
      wctx.fillStyle = g;
      wctx.fillRect(x - 14, y - 14, 28, 28);
    });
    wctx.restore();
  }

  // Modo nocturno: tinte azul oscuro multiplicado sobre todo el mundo, reflejos de luna en el mar y viñeta.
  function applyNight() {
    wctx.save();
    wctx.globalCompositeOperation = 'multiply';
    wctx.fillStyle = '#8a98d0';
    wctx.fillRect(0, 0, VIEW_W, VIEW_H);
    wctx.restore();
    // destellos de luna sobre el agua
    wctx.save();
    wctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 28; i++) {
      const r1 = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1), r2 = Math.abs((Math.sin(i * 78.233) * 12345.678) % 1);
      const a = 0.5 + 0.5 * Math.sin(G.t / 14 + i * 3);
      if (a < 0.35) continue;
      wctx.fillStyle = `rgba(190,210,255,${(a * 0.18).toFixed(2)})`;
      wctx.fillRect(Math.round(r1 * VIEW_W), Math.round(r2 * VIEW_H), 3, 1);
    }
    wctx.restore();
    const g = wctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
    g.addColorStop(0, 'rgba(5,8,30,0)');
    g.addColorStop(1, 'rgba(5,8,30,0.25)');
    wctx.fillStyle = g;
    wctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
    } else if (dc.type === 'smoke' && top) {
      // humo que sale del capó: bocanadas grises que suben, crecen y se desvanecen
      for (let i = 0; i < 6; i++) {
        const k = ((G.t + i * 23) % 140) / 140;
        const x = dc.x * T + 8 + Math.sin(G.t / 30 + i * 2) * 3 + k * 10 - camX;
        const y = dc.y * T + 4 - k * 34 - camY;
        const r = 3 + k * 6;
        const v = k < 0.3 ? 60 : 120;
        wctx.fillStyle = `rgba(${v},${v - 2},${v + 2},${0.9 * (1 - k)})`;
        wctx.beginPath();
        wctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        wctx.fill();
      }
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
    } else if (dc.type === 'partylights' && top) {
      drawPartyLights(dc, camX, camY);
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
    return Art.bed(G.player.ch, pose, G.world.bed.type);
  }

  // Los mapas más pequeños que la pantalla quedan centrados.
  function camAxis(size, view, pos) {
    if (size <= view) return (size - view) / 2;
    return Math.max(0, Math.min(size - view, pos - view / 2));
  }

  function camera() {
    if (G.camLock) return G.camLock;
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
  const TITLE_MENU = ['Start'];

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

    panel(280, 340, 400, 130);
    menuList(TITLE_MENU, G.menu, W / 2, 384, 56);
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.t / 18);
    text('Press SPACE to start', W / 2, 432, { size: 22, align: 'center', color: '#fbe9d0' });
    ctx.globalAlpha = 1;

    // instrucciones
    text('Use the arrow keys to move', W / 2, 545, { size: 24, align: 'center', color: 'rgba(255,240,220,0.9)' });
    text('Press SPACE to interact', W / 2, 585, { size: 24, align: 'center', color: 'rgba(255,240,220,0.9)' });
  }

  function drawLevels() {
    titleBackground();
    vignette('rgba(25,10,35,0.7)', 'rgba(25,10,35,0.35)', 'rgba(25,10,35,0.8)');
    drawLeaves();
    text('Choose Level', W / 2, 130, { size: 60, align: 'center', color: '#ffd45e', weight: 700 });

    const items = LEVELS.concat({ name: 'Back', back: true });
    const x0 = 180, top = 200, gap = 64;
    panel(x0 - 40, top - 20, W - 2 * (x0 - 40), items.length * gap + 30);
    items.forEach((lv, i) => {
      const y = top + 30 + i * gap;
      const active = i === G.levelMenu;
      const label = lv.back ? lv.name : `${i + 1}. ${lv.name}`;
      const color = lv.soon ? (active ? '#e8c9b0' : '#b89a90') : active ? '#ffe28a' : '#f3e6e6';
      text(label, x0 + 20, y, { size: 32, color, weight: active ? 700 : 400 });
      if (lv.soon) text('COMING SOON', W - x0 + 20, y, { size: 18, align: 'right', color: '#ffb070', weight: 700 });
      if (active) cursor(x0 - 22, y);
    });

    if (G.levelMsg > 0) {
      ctx.globalAlpha = Math.min(1, G.levelMsg / 20);
      text('This level is still under construction!', W / 2, 610, { size: 26, align: 'center', color: '#ffb070', weight: 700 });
      ctx.globalAlpha = 1;
    }
    text('↑ ↓  choose     SPACE  play     ESC  back', W / 2, 680, { size: 20, align: 'center', color: 'rgba(255,240,220,0.8)' });
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
    text('SPACE / ESC  back', W / 2, 680, { size: 20, align: 'center', color: 'rgba(255,240,220,0.8)' });
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

  // Pantalla final ({ finale } en una escena), sobre negro:
  //  1. mensaje a la izquierda y foto fija a la derecha;
  //  2. tras `hold` frames la columna izquierda sube poco a poco (`speed` px/frame) y van pasando los créditos;
  //  3. al acabar los créditos la foto se desliza al centro y debajo aparece el texto `close`.
  function drawFinale(f) {
    const hold = f.hold || 180, speed = f.speed || 2.5, move = f.move || 90, gap = 96;
    const fadeIn = Math.min(1, f.t / 60);
    const titleY = H + 120, rolesY = titleY + 140;
    const end = rolesY + f.roles.length * gap + 40; // desplazamiento con el que el último cargo sale por arriba
    const off = Math.min(end, Math.max(0, f.t - hold) * speed);
    const doneT = hold + end / speed; // frame en que acaban los créditos
    const ease = x => x * x * (3 - 2 * x);
    const k = ease(Math.min(1, Math.max(0, (f.t - doneT) / move)));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // columna izquierda: mensaje y, debajo, los créditos
    if (off < end) {
      const cx = W / 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W / 2, H);
      ctx.clip();
      ctx.globalAlpha = fadeIn;
      const lines = f.message.split('\n');
      lines.forEach((l, i) => text(l, cx, H / 2 - off + (i - (lines.length - 1) / 2) * 66, { size: 52, align: 'center', color: '#ffd45e', weight: 800 }));
      text(f.title, cx, titleY - off, { size: 48, align: 'center', color: '#ffd45e', weight: 800 });
      f.roles.forEach((role, i) => {
        const y = rolesY + i * gap - off;
        if (y < -60 || y > H + 60) return;
        text(role, cx, y, { size: 24, align: 'center', color: '#ffd45e', weight: 700 });
        text(f.name, cx, y + 38, { size: 34, align: 'center', weight: 700 });
      });
      ctx.restore();
    }

    // foto con marco blanco: a la derecha y, al terminar los créditos, al centro (un poco más arriba)
    const img = portraitImage(f.photo);
    let bottom = H / 2;
    if (img) {
      const s = Math.min(380 / img.naturalWidth, 500 / img.naturalHeight);
      const pw = img.naturalWidth * s, ph = img.naturalHeight * s;
      const x = W * 3 / 4 + (W / 2 - W * 3 / 4) * k, y = H / 2 - 50 * k;
      bottom = y + ph / 2;
      ctx.save();
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x - pw / 2 - 4, y - ph / 2 + 8, pw + 24, ph + 24);
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(x - pw / 2 - 12, y - ph / 2 - 12, pw + 24, ph + 24);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, x - pw / 2, y - ph / 2, pw, ph);
      ctx.restore();
    }

    // texto de despedida bajo la foto, cuando ya está en el centro
    const a = Math.min(1, Math.max(0, (f.t - doneT - move) / 40));
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      text(f.close, W / 2, bottom + 52, { size: 32, align: 'center', color: '#fbe9d0', weight: 700 });
      ctx.restore();
    }
  }

  function drawCutscene(camX, camY) {
    const c = G.cut;
    if (c.dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${c.dark})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (c.flash > 0) {
      // flash de la cámara: blanco que se apaga poco a poco
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, c.flash * 1.4)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (c.finale) drawFinale(c.finale);
    if (c.notice) {
      // aviso de objeto recogido: panel arriba con el objeto en grande
      const n = c.notice, e = 1 - Math.pow(1 - n.anim, 3);
      ctx.font = `700 30px ${FONT}`;
      const icon = n.img ? 88 : 0;
      const bw = Math.ceil(ctx.measureText(n.text).width) + icon + 72, bh = 104;
      const bx = (W - bw) / 2, by = 140 - (1 - e) * 24;
      ctx.save();
      ctx.globalAlpha = e;
      panel(bx, by, bw, bh, true);
      ctx.imageSmoothingEnabled = false;
      if (n.img) ctx.drawImage(n.img, bx + 24, by + (bh - 72) / 2 - 4, 72, 72);
      text(n.text, bx + 36 + icon, by + bh / 2, { size: 30, color: '#ffe28a', weight: 700 });
      ctx.restore();
    }
    const b = G.world.bed;
    if (c.bubble && b) {
      const k = W / VIEW_W;
      drawBubble(c.bubble, (b.x * T + b.w * T / 2 - camX) * k, ((b.y + b.h) * T - b.img.height + 10 - camY) * k);
    }
  }

  // Contador de invitados que faltan por saludar (arriba a la derecha).
  function drawGuestCounter() {
    const counted = GUESTS.filter(g => g.count !== false);
    const left = counted.filter(g => !G.greeted.has(g.char)).length;
    const label = left > 0 ? 'Guests left to greet: ' + left : 'All guests greeted!';
    ctx.font = `700 26px ${FONT}`;
    const w = Math.ceil(ctx.measureText(label).width) + 44;
    panel(W - 24 - w, 24, w, 56, true);
    text(label, W - 24 - w / 2, 52, { size: 26, align: 'center', color: left > 0 ? '#ffe28a' : '#9bff9b', weight: 700 });
  }

  function drawPlay() {
    const [cx, cy] = camera();
    renderWorld(cx, cy);
    if (G.shake > 0) {
      // terremoto: el mundo tiembla (más fuerte al principio)
      const k = Math.min(1, G.shake / 40) * 9;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(Math.round((Math.random() * 2 - 1) * k), Math.round((Math.random() * 2 - 1) * k));
      blitWorld();
      ctx.restore();
    } else blitWorld();
    if (G.cut) drawCutscene(cx, cy);
    if (G.banner > 0 && G.scene === 'play') {
      const a = Math.min(1, G.banner / 30, (200 - G.banner) / 20);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `700 30px ${FONT}`;
      const bw = 420;
      const fs = Math.min(30, Math.floor(30 * (bw - 50) / ctx.measureText(G.world.def.name).width));
      panel(24, 24, bw, 70, true);
      text(G.world.def.name, 24 + bw / 2, 60, { size: fs, align: 'center', color: '#ffe28a', weight: 700 });
      ctx.globalAlpha = 1;
    }
    // el contador de invitados solo tiene sentido en la urbanización (ni en la batalla ni en la playa)
    if ((G.scene === 'play' || G.scene === 'dialog') && G.world.id === 'urba') drawGuestCounter();
    if (G.dialog) drawDialog();
  }

  // Imágenes de retrato; devuelve null hasta que estén listas (o si fallan).
  const portraitImages = {};
  function portraitImage(src) {
    let im = portraitImages[src];
    if (!im) {
      im = portraitImages[src] = new Image();
      im.decoding = 'sync';
      im.src = src;
      if (im.decode) im.decode().catch(() => {});
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  // Precarga todos los retratos al arrancar para que cambiar de expresión no parpadee.
  for (const k in CHARACTERS) {
    const p = CHARACTERS[k].portraits;
    if (p) for (const m in p) portraitImage(p[m]);
  }
  if (typeof CHATS !== 'undefined') {
    for (const k in CHATS) {
      const imgs = CHATS[k].images;
      if (imgs) for (const m in imgs) portraitImage(imgs[m]);
    }
  }
  // Foto de la pantalla final ({ finale } en las escenas), para que ya esté cargada al llegar.
  Object.values(SCENES).forEach(sc => (sc.lines || []).forEach(l => { if (l.finale) portraitImage(l.finale.photo); }));
  // Última foto mostrada por personaje: se mantiene mientras la nueva aún no está lista.
  const lastPhoto = new Map();

  function drawDialog() {
    const d = G.dialog;
    const box = { x: 20, y: 516, w: 920, h: 188 };
    const e = 1 - Math.pow(1 - d.anim, 3);
    // `accent` en CHARACTERS manda sobre el color de la camiseta (para camisetas claras que no contrastan)
    const accent = (d.ch && (d.ch.accent || d.ch.shirt)) || '#ffd45e';

    // Cuadro claro y plano: fondo crema, borde grueso y sombra sólida del color del personaje.
    ctx.save();
    ctx.globalAlpha = e;
    ctx.translate(0, (1 - e) * 24);
    rr(box.x + 6, box.y + 8, box.w, box.h, 24);
    ctx.fillStyle = accent;
    ctx.fill();
    rr(box.x, box.y, box.w, box.h, 24);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.restore();

    if (d.ch) {
      const size = 256;
      const file = d.ch.portraits && (d.ch.portraits[d.mood] || d.ch.portraits.normal);
      let photo = file ? portraitImage(file) : null;
      if (photo) lastPhoto.set(d.ch, photo);
      else if (file) photo = lastPhoto.get(d.ch) || null;
      const img = photo || Art.portrait(d.ch, d.mood);
      const left = d.side === 'left';
      const pw = photo ? Math.round(size * 1.15 * photo.width / photo.height) : size;
      const ph = photo ? Math.round(size * 1.15) : size;
      const px = left ? 14 - (1 - e) * 60 : W - 14 - pw + (1 - e) * 60;
      const py = box.y + box.h - ph - 6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, box.y + box.h - 6);
      ctx.clip();
      ctx.globalAlpha = e;
      ctx.imageSmoothingEnabled = !!photo;
      if (photo) ctx.drawImage(img, px, py, pw, ph);
      else if (left) ctx.drawImage(img, px, py, size, size);
      else {
        ctx.translate(px + size, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, size, size);
      }
      ctx.restore();

      // Etiqueta con el nombre: píldora del color del personaje.
      // Un personaje con `nameRevealedBy` se muestra como "???" hasta que se active esa bandera (G.flags).
      const label = d.ch.nameRevealedBy && !G.flags.has(d.ch.nameRevealedBy) ? '???' : d.ch.name;
      ctx.font = `800 24px ${FONT}`;
      const lw = ctx.measureText(label).width + 40, lh = 40;
      const lx = left ? 280 : 44; // siempre en el lado izquierdo del cuadro
      ctx.save();
      ctx.globalAlpha = e;
      rr(lx, box.y - lh / 2, lw, lh, lh / 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fffaf0';
      ctx.stroke();
      ctx.restore();
      text(label, lx + lw / 2, box.y + 1, { size: 24, align: 'center', color: '#fff', weight: 800 });
    }

    const tx = d.side === 'left' ? 292 : d.side === 'right' ? 52 : 60;
    let remaining = Math.floor(d.shown);
    d.wrapped.forEach((line, i) => {
      if (remaining <= 0) return;
      const part = line.slice(0, remaining);
      remaining -= line.length;
      ctx.font = TEXT_FONT;
      text(part, tx, box.y + 52 + i * 42, { size: 28, color: '#2b1d16', weight: 700, shadow: false });
    });

    if (d.shown >= d.total) {
      // Indicador de "continuar" en la esquina inferior derecha del cuadro.
      const ax = d.side === 'right' ? box.x + 44 : box.x + box.w - 44, ay = box.y + box.h - 30 + Math.sin(G.t / 6) * 3;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(ax - 9, ay - 5);
      ctx.lineTo(ax + 9, ay - 5);
      ctx.lineTo(ax, ay + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawMinigame() {
    const m = G.mini;
    m.game.drawWorld(m.st, wctx);
    blitWorld();
    m.game.drawHud(m.st, ctx, { W, H, FONT, text, panel });
    // escena dentro del minijuego: oscurecido y diálogo encima
    const sc = G.scene === 'pause' ? G.prevScene : G.scene;
    if (sc === 'minigame') return;
    if (G.cut && G.cut.dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${G.cut.dark})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (G.cut && G.cut.finale) drawFinale(G.cut.finale);
    if (G.dialog) drawDialog();
  }

  function drawPause() {
    (G.mini ? drawMinigame : drawPlay)();
    ctx.fillStyle = 'rgba(10,0,10,0.55)';
    ctx.fillRect(0, 0, W, H);
    panel(310, 190, 340, 330);
    text('PAUSED', W / 2, 240, { size: 40, align: 'center', color: '#ffd45e', weight: 700 });
    ctx.fillStyle = 'rgba(255,205,150,0.4)';
    ctx.fillRect(360, 272, 240, 2);
    menuList(['Continue', 'Restart', 'Quit to title'], G.pauseMenu, W / 2, 320, 56);
    text('ESC  back', W / 2, 485, { size: 18, align: 'center', color: 'rgba(255,240,220,0.7)' });
  }

  function render() {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ({ title: drawTitle, levels: drawLevels, credits: drawCredits, play: drawPlay, dialog: () => (G.mini ? drawMinigame : drawPlay)(), cutscene: () => (G.mini ? drawMinigame : drawPlay)(), minigame: drawMinigame, pause: drawPause })[G.scene]();
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

  // greeted: "all" -> todos los invitados que cuentan; un número -> esa cantidad de invitados cualesquiera.
  function greetedEnough(n) {
    if (n === 'all') return GUESTS.every(g => g.count === false || G.greeted.has(g.char));
    return G.greeted.size >= n;
  }

  // Al terminar de hablar con un invitado cuenta como saludado.
  function greetGuest(npc) {
    const id = npc.def && npc.def.guest;
    return id ? () => G.greeted.add(id) : null;
  }

  // Crea un invitado (con su chat) en la casilla indicada. `dance`: baila en el sitio.
  function spawnGuest(g, x, y, dir, dance = false) {
    const lines = CHATS[g.chat].lines.map(l => ({ who: g.char, mood: l.image, text: l.text }));
    const npc = makeEntity(g.char, x, y, dir, { x, y, talks: [lines], guest: g.char, counts: g.count !== false, dance });
    G.world.npcs.push(npc);
    return npc;
  }

  // Reparte al azar a los invitados por sus zonas de la piscina (GUEST_ZONES; las parejas, una al lado de la otra;
  // algunos bailan) y deja a Ricardo fuera del patio, donde antes había un globo azul. Solo vale suelo libre, lejos de donde
  // aparece el protagonista, y nadie se pone pegado a otro, para no tapar los pasos.
  function spawnGuests() {
    const w = G.world, p = G.player, tiles = w.def.tiles;
    const taken = [];
    const dist = (x, y, t) => Math.max(Math.abs(x - t[0]), Math.abs(y - t[1]));
    const byChar = c => GUESTS.find(g => g.char === c);
    const dirs = ['down', 'down', 'left', 'right', 'up'];
    const randDir = () => dirs[(Math.random() * dirs.length) | 0];
    const shuffle = arr => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    GUEST_ZONES.forEach(({ area: [x0, y0, x1, y1], chars }) => {
      const free = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && ':.,'.includes(tiles[y][x]) && !w.solid[y][x];
      const ok = (x, y) => free(x, y) && dist(x, y, [p.x, p.y]) >= 4 && taken.every(t => dist(x, y, t) >= 2);
      const cells = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (free(x, y)) cells.push([x, y]);
      shuffle(cells);
      const inPair = new Set();
      GUEST_PAIRS.forEach(([a, b]) => {
        if (!chars.includes(a) || !chars.includes(b)) return;
        inPair.add(a); inPair.add(b);
        const c = cells.find(([x, y]) => ok(x, y) && ok(x + 1, y));
        if (!c) return;
        const flip = Math.random() < 0.5, dance = Math.random() < 0.5;
        spawnGuest(byChar(flip ? b : a), c[0], c[1], 'down', dance);
        spawnGuest(byChar(flip ? a : b), c[0] + 1, c[1], 'down', dance);
        taken.push([c[0], c[1]], [c[0] + 1, c[1]]);
      });
      chars.forEach(ch => {
        if (inPair.has(ch)) return;
        const c = cells.find(([x, y]) => ok(x, y));
        if (!c) return;
        spawnGuest(byChar(ch), c[0], c[1], randDir(), Math.random() < 0.4);
        taken.push(c);
      });
    });
    const home = byChar(GUEST_AT_HOME.char);
    if (home) spawnGuest(home, GUEST_AT_HOME.x, GUEST_AT_HOME.y, GUEST_AT_HOME.dir);
    const hooded = byChar(GUEST_HOODED.char);
    if (hooded) spawnGuest(hooded, GUEST_HOODED.x, GUEST_HOODED.y, GUEST_HOODED.dir);
  }

  function boot() {
    resize();
    addEventListener('resize', resize);
    // TEMPORAL: sin menús, el juego arranca directamente en la playa para probarla.
    // (Para probar en otro sitio: enterMap('urba', x, y, 'down', false) y spawnGuests().)
    const startAtBeach = () => {
      G.restart = startAtBeach;
      G.visited = new Set();
      G.flags = new Set();
      G.greeted = new Set();
      const s = MAPS.playa.playerStart;
      enterMap('playa', s.x, s.y, s.dir, false);
    };
    // TEMPORAL: al recargar se aparece en la entrada de la piscina (urba), con los invitados repartidos al azar.
    const startAtPool = () => {
      G.restart = startAtPool;
      G.visited = new Set();
      G.flags = new Set();
      G.greeted = new Set();
      enterMap('urba', 36, 47, 'down', false);
    };
    // TEMPORAL: al recargar se aparece en el salón, junto a la salida al patio, para probar la escena de Ricardo.
    const startAtHome = () => {
      G.restart = startAtHome;
      G.visited = new Set();
      G.flags = new Set();
      G.greeted = new Set();
      enterMap('casa', 10, 30, 'right', false);
    };
    // TEMPORAL: al recargar se aparece justo delante de Ricardo (mirándole), para probar la escena del terremoto
    // hablando con él. Su escena de bienvenida se marca como vista para que no se cruce.
    const startFacingGuest = () => {
      G.restart = startFacingGuest;
      G.visited = new Set();
      G.flags = new Set(['scene:ricardo']);
      G.greeted = new Set();
      enterMap('urba', GUEST_AT_HOME.x, GUEST_AT_HOME.y + 1, 'up', false);
    };
    // TEMPORAL: al recargar se aparece justo delante de Jessie (mirándola) y empieza su chat.
    const startFacingJessie = () => {
      G.restart = startFacingJessie;
      G.visited = new Set();
      G.flags = new Set(['scene:ricardo']);
      G.greeted = new Set();
      enterMap('urba', 36, 47, 'down', false);
      const p = G.player;
      const [dx, dy] = DIRS[p.dir];
      const g = GUESTS.find(x => x.char === 'jessie');
      const lines = CHATS[g.chat].lines.map(l => ({ who: g.char, mood: l.image, text: l.text }));
      const npc = makeEntity(g.char, p.x + dx, p.y + dy, OPP[p.dir], { talks: [lines], guest: g.char });
      G.world.npcs.push(npc);
      startDialog(lines, npc, false, greetGuest(npc));
    };
    // TEMPORAL: al recargar empieza la batalla en coche, para probar la escena de Simone (scenes/scene_simone.js).
    const startAtBattle = () => startLevel(LEVELS.find(lv => lv.minigame === 'chase'));
    // TEMPORAL: al recargar empieza la historia de la playa (con Angel y Ricardo junto al coche).
    const startAtBeachStory = () => startLevel(LEVELS.find(lv => lv.story === 'playa'));
    toTitle(); // menú inicial; «Start» lanza el primer nivel (LEVELS[0])
    if (location.search.includes('debug')) window.__G = G;
    requestAnimationFrame(frame);
  }

  const fontTimeout = new Promise(r => setTimeout(r, 1500));
  const fontLoad = document.fonts
    ? Promise.all([document.fonts.load('28px "Nunito"'), document.fonts.load('700 28px "Nunito"')])
    : Promise.resolve();
  Promise.race([fontLoad, fontTimeout]).catch(() => {}).then(boot);
})();
