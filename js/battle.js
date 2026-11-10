'use strict';

// Batalla en coche contra el monstruo: reglas (movimiento lateral, balas, recarga, vida, jeringuillas,
// explosión final) e interfaz. La vista cenital (chasetop.js) se registra en Battle.views y pone la
// geometría y el dibujo del mundo. Los ajustes (vidas, cargador, recarga...) están en CHASE, en data.js.
const Battle = (() => {
  const { P, ell } = Art.util;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const views = {};

  // Colores del monstruo, compartidos por todas las vistas (y por los trozos al explotar).
  // Es Simone hinchado: piel enrojecida, pelo corto canoso, barba, camiseta negra rota y vaqueros.
  const M = {
    skin: '#d98a62', skinD: '#a85a3c', skinL: '#f0ae86',
    shirt: '#26211f', shirtD: '#141010', shirtL: '#3d3533',
    pants: '#3d5275', pantsD: '#2a3a56', shoe: '#e8e4dc', shoeD: '#a8a296',
    hair: '#8a8178', hairD: '#5f5852', hairL: '#b4ada4',
    beard: '#86684c', beardD: '#5e4834', eye: '#56c8ff',
  };

  /*
   * Una vista define:
   *  name                         nombre en el menú
   *  carStartX, carMin, carMax    posición y límites del coche (px del lienzo 320x240)
   *  sceneCarX                    x a la que se va el coche durante las escenas del combate
   *  bulletFrames, bulletEnd      frames hasta la altura del monstruo y hasta desaparecer (en progreso p)
   *  hitHalfW                     media anchura del cuerpo del monstruo para los impactos
   *  carHalfW                     media anchura del coche (para los impactos de las jeringuillas)
   *  sceneLift                    cuánto sube el coche en pantalla durante las escenas (para que no lo tape el diálogo)
   *  carY(st)  carHitY(st)        base del coche en pantalla y altura a la que le dan las jeringuillas
   *  aimY(st)                     altura del pecho del monstruo (adonde van los disparos de Gabi)
   *  sceneMonLift                 cuánto se aleja (sube) el monstruo durante las escenas del combate
   *  bike { dx, ahead, beside, enterY }  moto de Gabi: separación lateral y vertical respecto al coche, y y de entrada
   *  monArea { hw, y0, y1, fx }   zona de las explosiones finales y escala de las llamas
   *  init(st)  scroll(st)         estado propio (st.w) y avance del escenario cada frame
   *  gun(st)  exhaust(st)  hood(st)  boca del arma, salida del humo y capó (humo negro) -> { x, y, ... }
   *  hand(st, side)               mano del monstruo que lanza (side -1 izquierda, 1 derecha) -> { x, y }
   *  bulletPos(b, p)              posición de una bala con progreso p -> { x, y, size }
   *  monsterTarget(st, sway)      x a la que va el monstruo; sway oscila entre -1 y 1
   *  simoneX(st)                  x de Simone en el camino durante la intro (ahí se transforma)
   *  draw(st, g)                  dibuja el mundo
   */
  // intro (opcional): función a la que se llama cuando el coche se para delante de Simone, con otra
  // función que empieza el combate. Sin intro, el combate empieza directamente.
  // opts.drive: el final del juego (scenes/scene_sharon.js). El coche, ya arreglado, va por una carretera
  // recta sin monstruo ni interfaz y sin que el jugador lo maneje; la escena lo frena y arranca con acciones.
  function create(onWin, intro, opts = {}) {
    const view = views.top;
    const drive = !!opts.drive;
    const st = {
      view, onWin, intro, t: 0, straight: drive,
      car: { x: view.carStartX, vx: 0, recoil: 0, flash: 0, lift: drive ? view.sceneLift : 0, hp: CHASE.carHp, hurt: 0, safe: 0, smoking: false, skid: 0, angle: 0 },
      ammo: CHASE.magazine, reload: 0, cooldown: 0,
      mon: {
        x: view.carStartX, hp: CHASE.hp, lag: CHASE.hp, flash: 0, roar: 0, knock: 0, phase: 0, roarT: 90,
        throwT: CHASE.syringeEvery, throwAnim: 0, lift: 0, dying: false, dieT: 0, dead: drive, human: !!intro,
      },
      bullets: [], syringes: [], shots: [], parts: [],
      bike: null, act: null, braking: false,
      shake: 0, white: 0, state: drive ? 'drive' : intro ? 'intro' : 'fight', stateT: 0,
      banner: drive || intro ? 0 : 150, done: false,
    };
    view.init(st);
    return st;
  }

  // ---------- actualización ----------
  // input: { dir: -1 | 0 | 1, fire: bool } o null mientras hay un fundido o una escena.
  function update(st, input) {
    st.t++;
    Sfx.engine(true);
    st.view.scroll(st);
    updateCar(st, input);
    updateBullets(st);
    updateSyringes(st);
    updateShots(st);
    updateMonster(st);
    updateBike(st);
    updateAct(st);
    st.parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.grav || 0;
      p.life--;
    });
    st.parts = st.parts.filter(p => p.life > 0);
    st.shake *= 0.86;
    st.white = Math.max(0, st.white - 0.035);
    if (st.banner > 0) st.banner--;
    // intro: al pararse el coche delante de Simone empieza la escena (scenes/scene_simone.js)
    if (st.state === 'intro' && st.w.stopped && !st.introStarted) {
      st.introStarted = true;
      st.intro(() => startFight(st));
    }
  }

  function startFight(st) {
    st.state = 'fight';
    st.banner = 150;
    st.mon.roarT = 90;
  }

  // ---------- escenas a mitad de combate (scenes/*.js con `when`) ----------
  // ¿Se cumple alguna condición de la escena? when: { carHp: n, monsterHp: n }
  function reached(st, when) {
    return (when.carHp != null && st.car.hp <= when.carHp) || (when.monsterHp != null && st.mon.hp <= when.monsterHp);
  }

  // Congela el combate mientras dura la escena (el coche sigue en marcha, pero nadie dispara).
  function hold(st) {
    st.state = 'scene';
    st.banner = 0;
  }

  // Al acabar la escena: si el monstruo ya ha muerto, la batalla termina; si no, se sigue peleando.
  function resume(st) {
    if (!st.mon.dead) { st.state = 'fight'; return; }
    if (st.done) return;
    st.done = true;
    st.onWin();
  }

  // Simone se convierte en el monstruo, en el mismo sitio del camino.
  function transform(st) {
    const m = st.mon;
    m.human = false;
    m.x = st.view.simoneX(st);
    m.roar = 110;
    st.shake = 6;
    Sfx.roar();
  }

  function updateCar(st, input) {
    const v = st.view, car = st.car;
    const playing = st.state === 'fight' && input;
    car.vx = (car.vx + (playing ? input.dir : 0) * 0.55) * 0.84;
    const x = clamp(car.x + car.vx, v.carMin, v.carMax);
    if (x !== car.x + car.vx) car.vx = 0;
    car.x = x;
    car.recoil *= 0.7;
    if (car.flash > 0) car.flash--;
    if (car.hurt > 0) car.hurt--;
    if (car.safe > 0) car.safe--;
    // en las escenas el coche se coloca solo, dejando sitio a la moto de Gabi
    if (st.state === 'scene' && !car.skid) car.x += (v.sceneCarX - car.x) * 0.04;
    car.lift += ((st.state === 'scene' || st.state === 'drive' ? v.sceneLift : 0) - car.lift) * 0.04;
    // sin frenos: derrapa a un lado y a otro, cada vez más
    if (car.skid) {
      const k = Math.min(1, ++car.skid / 50);
      car.angle = Math.sin(car.skid * 0.2) * 0.55 * k;
      car.x = clamp(car.x + Math.sin(car.skid * 0.1) * 2.4 * k, v.carMin - 16, v.carMax + 16);
      if (st.t % 2 === 0) st.parts.push({ kind: 'smoke', col: '#e8e4dc', ...v.exhaust(st), x: car.x + rand(-10, 10), r: 2.5 });
    }
    if (st.t % 4 === 0) st.parts.push({ kind: 'smoke', r: 2, life: 26, max: 26, ...v.exhaust(st) });
    if (car.smoking && st.t % 3 === 0) st.parts.push({ kind: 'smoke', col: '#1e1e24', alpha: 0.6, life: 48, max: 48, ...v.hood(st) });

    if (st.cooldown > 0) st.cooldown--;
    if (st.reload > 0 && --st.reload === 0) {
      st.ammo = CHASE.magazine;
      Sfx.reloaded();
    }
    if (!playing || !input.fire) return;
    if (st.reload > 0) { Sfx.empty(); return; }
    if (st.cooldown > 0) return;
    st.ammo--;
    st.cooldown = 7;
    car.flash = 5;
    car.recoil = 2;
    const gun = v.gun(st);
    st.bullets.push({ x0: gun.x, y0: gun.y, p: 0, checked: false });
    Sfx.shoot();
    if (st.ammo === 0) {
      st.reload = CHASE.reloadFrames;
      Sfx.reload();
    }
  }

  function updateBullets(st) {
    const v = st.view, m = st.mon;
    st.bullets.forEach(b => {
      b.p += 1 / v.bulletFrames;
      if (b.p < 1 || b.checked) return;
      b.checked = true;
      const pos = v.bulletPos(b, b.p);
      if (st.state !== 'fight' || Math.abs(pos.x - m.x) > v.hitHalfW) return;
      b.dead = true;
      hitMonster(st, pos.x, pos.y);
    });
    st.bullets = st.bullets.filter(b => !b.dead && b.p < v.bulletEnd);
  }

  function sparks(st, x, y, n, cols) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.6, 2.2);
      st.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, grav: 0.08, col: cols[i % cols.length], life: 18, max: 18 });
    }
  }
  const FIRE = ['#fff3b0', '#ffd05a', '#f07a2a'];

  function hitMonster(st, x, y) {
    const m = st.mon;
    m.hp--;
    m.flash = 6;
    m.knock = 3;
    st.shake = Math.max(st.shake, 2);
    Sfx.hit();
    sparks(st, x, y, 9, FIRE);
    if (m.hp === 20 || m.hp === 10) { m.roar = 60; Sfx.roar(); st.shake = 4; }
    if (m.hp <= 0) kill(st);
  }

  // El monstruo empieza a reventar (por las balas del coche o por los disparos de Gabi).
  function kill(st) {
    const m = st.mon;
    if (m.dying || m.dead) return;
    m.hp = 0;
    m.dying = true;
    m.dieT = 0;
    m.roar = 999;
    Sfx.roar();
    if (st.state === 'fight') { st.state = 'dying'; st.stateT = 0; }
  }

  // ---------- jeringuillas del monstruo ----------
  // big: el golpe de la escena final, que va directo al coche y lo deja con 1 de vida.
  function throwSyringe(st, big) {
    const v = st.view, m = st.mon, car = st.car;
    const from = v.hand(st, car.x < m.x ? -1 : 1);
    const x1 = big ? car.x : clamp(car.x + car.vx * 14 + rand(-6, 6), v.carMin, v.carMax);
    const y1 = v.carHitY(st);
    const dist = Math.hypot(x1 - from.x, y1 - from.y);
    st.syringes.push({ x0: from.x, y0: from.y, x1, y1, p: 0, dur: Math.max(20, Math.round(dist / (big ? 2.6 : 2.1))), big });
    m.throwAnim = 10;
    Sfx.toss();
  }

  // Posición de una jeringuilla (sigue recta más allá del objetivo si falla).
  const syringePos = s => ({ x: s.x0 + (s.x1 - s.x0) * s.p, y: s.y0 + (s.y1 - s.y0) * s.p });

  function updateSyringes(st) {
    const v = st.view, car = st.car;
    st.syringes.forEach(s => {
      s.p += 1 / s.dur;
      if (s.p < 1 || s.checked) return;
      s.checked = true;
      if (!s.big && (st.state !== 'fight' || car.safe > 0 || Math.abs(s.x1 - car.x) > v.carHalfW)) return;
      s.dead = true;
      hitCar(st, s);
    });
    st.syringes = st.syringes.filter(s => !s.dead && s.p < 1.6);
  }

  // La barra del coche nunca llega a cero: como mucho se queda en 1 (y entonces salta la escena final).
  function hitCar(st, s) {
    const car = st.car;
    car.hp = s.big ? 1 : Math.max(1, car.hp - 1);
    car.hurt = 16;
    car.safe = 45;
    st.shake = Math.max(st.shake, s.big ? 7 : 4);
    Sfx.crunch();
    if (s.big) Sfx.boom();
    sparks(st, s.x1, s.y1, s.big ? 18 : 10, ['#ffffff', '#d9f3ff', '#7dde4a', '#b4f08a']);
  }

  // ---------- disparos sueltos de las escenas (Gabi al monstruo, el coche a la moto) ----------
  // Van derechos a su objetivo (`to` devuelve su posición actual) y al llegar llaman a `onHit`.
  function shoot(st, from, to, onHit) {
    st.shots.push({ x: from.x, y: from.y, to, onHit });
    Sfx.shoot();
  }

  function updateShots(st) {
    st.shots.forEach(s => {
      const t = s.to(), dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy);
      if (d <= 7) {
        s.dead = true;
        sparks(st, t.x, t.y, 9, FIRE);
        Sfx.hit();
        s.onHit();
        return;
      }
      s.x += (dx / d) * 7;
      s.y += (dy / d) * 7;
    });
    st.shots = st.shots.filter(s => !s.dead);
  }

  function explosion(st, x, y, n, size) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.2, 1.4) * size;
      st.parts.push({ kind: 'fire', x: x + rand(-3, 3), y: y + rand(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, r: rand(2, 5) * size, life: 34, max: 34 });
    }
  }

  function updateMonster(st) {
    const m = st.mon, area = st.view.monArea;
    if (m.dead) {
      if (st.state === 'won' && ++st.stateT === 220 && !st.done) {
        st.done = true;
        st.onWin();
      }
      return;
    }
    // cuanto menos vida, más rápido se mueve de lado a lado y más jeringuillas lanza
    const rage = 1 + (1 - m.hp / CHASE.hp) * 0.9;
    if (m.flash > 0) m.flash--;
    if (m.throwAnim > 0) m.throwAnim--;
    if (st.state === 'intro') {
      // quieto en el camino mientras dura la escena
      if (m.roar > 0) m.roar--;
      return;
    }
    // en las escenas se aleja un poco, para que se vea bien quién dispara desde la moto
    m.lift += ((st.state === 'scene' ? st.view.sceneMonLift : 0) - m.lift) * 0.03;
    m.phase += 0.02 * rage;
    const sway = 0.65 * Math.sin(m.phase) + 0.35 * Math.sin(m.phase * 2.3 + 1.3);
    m.x += (st.view.monsterTarget(st, sway) - m.x) * 0.08;
    m.knock *= 0.8;
    if (m.lag > m.hp) m.lag = Math.max(m.hp, m.lag - 0.06);
    if (m.roar > 0) m.roar--;
    else if (--m.roarT <= 0) {
      m.roar = 50;
      m.roarT = (320 + Math.random() * 300) | 0;
      Sfx.roar();
      st.shake = Math.max(st.shake, 3);
    }
    if (st.state === 'fight' && --m.throwT <= 0) {
      m.throwT = Math.round((CHASE.syringeEvery * rand(0.75, 1.25)) / rage);
      throwSyringe(st, false);
    }

    if (!m.dying) return;
    m.dieT++;
    m.flash = (m.dieT >> 2) & 1 ? 2 : 0;
    st.shake = Math.max(st.shake, 2.5);
    if (m.dieT % 7 === 0) explosion(st, m.x + rand(-area.hw, area.hw), rand(area.y0, area.y1) - m.lift, 6, area.fx);
    if (m.dieT % 14 === 0) Sfx.boom();
    if (m.dieT >= 120) {
      m.dead = true;
      if (st.state === 'dying') { st.state = 'won'; st.stateT = 0; }
      st.white = 1;
      st.shake = 9;
      Sfx.bigBoom();
      for (let i = 0; i < 6; i++) explosion(st, m.x + rand(-area.hw, area.hw), rand(area.y0, area.y1) - m.lift, 8, 1.6 * area.fx);
      for (let i = 0; i < 30; i++) {
        const a = rand(-Math.PI, 0), v = rand(1, 3.5) * Math.sqrt(area.fx);
        const hairBit = i % 3 === 0;
        st.parts.push({
          kind: 'chunk', x: m.x + rand(-area.hw, area.hw) * 0.6, y: rand(area.y0, area.y1) - m.lift, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, grav: 0.12,
          col: hairBit ? M.hair : i % 2 ? M.skin : M.shirt, size: hairBit ? 2 : 3, life: 80, max: 80,
        });
      }
    }
  }

  // ---------- moto de Gabi ----------
  const bikeTargetY = st => st.view.carY(st) + st.bike.dy;
  const bikeThere = (st, d = 1.5) => Math.abs(st.bike.y - bikeTargetY(st)) < d;
  // bike: { x, y (base), dy: altura respecto al coche, cover: con capucha, look: 'up' | 'left' }
  function updateBike(st) {
    const b = st.bike, v = st.view;
    if (!b) return;
    if (b.flash > 0) b.flash--;
    if (b.hit) {
      // alcanzada: se va de lado, se queda atrás y se estrella fuera de la pantalla
      b.vx = Math.min(3.2, b.vx + 0.09);
      b.x += b.vx;
      b.y += 0.5;
      b.angle = Math.min(1.1, b.angle + 0.035);
      if (st.t % 2 === 0) st.parts.push({ kind: 'smoke', col: '#5a5a62', x: b.x, y: b.y - 6, vx: rand(-0.3, 0.3), vy: rand(1, 1.6), r: 2, life: 26, max: 26, alpha: 0.6 });
      if (!b.crashed && b.x > v.width + 18) {
        b.crashed = st.t;
        st.shake = Math.max(st.shake, 6);
        Sfx.crash();
        for (let i = 0; i < 4; i++) explosion(st, v.width - rand(0, 10), b.y - rand(0, 20), 7, 0.9);
      }
      return;
    }
    const tx = st.car.x + v.bike.dx, ty = bikeTargetY(st);
    b.x += (tx - b.x) * 0.08;
    b.y += (ty - b.y) * 0.05;
  }

  // ---------- acciones de las escenas: { act: 'nombre' } en scenes/*.js ----------
  // start(st, a) al empezar; update(st, a) cada frame hasta que devuelve true (entonces sigue la escena).
  const ACTS = {
    // el monstruo lanza una jeringuilla enorme que deja el coche con 1 de vida (si no lo estaba ya)
    blow: {
      start(st, a) {
        if (st.car.hp <= 1) { a.skip = true; return; }
        st.mon.roar = 50;
        Sfx.roar();
        st.shake = Math.max(st.shake, 3);
      },
      update(st, a) {
        if (a.skip) return true;
        if (a.t === 30) throwSyringe(st, true);
        if (a.t > 30 && st.car.hp <= 1 && !a.hitT) a.hitT = a.t;
        return a.hitT && a.t - a.hitT > 45;
      },
    },
    // el coche empieza a echar humo negro
    smoke: {
      start(st) { st.car.smoking = true; Sfx.fizz(); },
      update: (st, a) => a.t > 60,
    },
    // llega Gabi en moto por detrás y se pone algo por delante del coche, en el lado derecho
    gabiArrives: {
      start(st) {
        const v = st.view;
        st.bike = { x: st.car.x + v.bike.dx, y: v.bike.enterY, dy: v.bike.ahead, cover: true, look: 'up', angle: 0, vx: 0, flash: 0 };
        Sfx.bike();
      },
      update: (st, a) => a.t > 50 && bikeThere(st),
    },
    // Gabi dispara tres veces al monstruo, que revienta
    gabiShoots: {
      update(st, a) {
        const b = st.bike, m = st.mon, v = st.view;
        if (a.t === 20 || a.t === 34 || a.t === 48) {
          b.flash = 5;
          const last = a.t === 48;
          shoot(st, { x: b.x + 4, y: b.y - 22 }, () => ({ x: m.x, y: v.aimY(st) }), () => {
            m.flash = 6;
            m.knock = 3;
            if (last) kill(st);
          });
        }
        if (m.dead && !a.deadT) a.deadT = a.t;
        return a.deadT && a.t - a.deadT > 70;
      },
    },
    // la moto se pone justo al lado del coche y Gabi mira hacia ellos
    bikeAlongside: {
      start(st) { st.bike.dy = st.view.bike.beside; },
      update(st, a) {
        if (bikeThere(st, 6)) st.bike.look = 'left';
        return a.t > 40 && bikeThere(st);
      },
    },
    // Gabi se quita la capucha
    unmask: {
      start(st) {
        const b = st.bike;
        b.cover = false;
        Sfx.rustle();
        for (let i = 0; i < 8; i++) st.parts.push({ kind: 'smoke', col: '#ffffff', x: b.x + rand(-5, 5), y: b.y - 26 + rand(-3, 3), vx: rand(-0.5, 0.5), vy: rand(-0.6, 0.2), r: 1.5, life: 22, max: 22 });
      },
      update: (st, a) => a.t > 30,
    },
    // salen dos disparos del coche que le dan a la moto; se desvía fuera de la pantalla y se estrella
    shootBike: {
      update(st, a) {
        const b = st.bike, car = st.car;
        if (a.t === 15 || a.t === 30) {
          car.flash = 5;
          car.recoil = 2;
          const last = a.t === 30;
          shoot(st, st.view.gun(st), () => ({ x: b.x, y: b.y - 16 }), () => {
            b.flash = 6;
            if (last) b.hit = true;
          });
        }
        if (b.crashed && st.t - b.crashed > 60) {
          st.bike = null;
          return true;
        }
        return false;
      },
    },
    // sin frenos: el coche empieza a derrapar (la escena sigue con el fundido a negro)
    skid: {
      start(st) { st.car.skid = 1; Sfx.skid(); },
      update: (st, a) => a.t > 110,
    },
    // final (state 'drive'): el coche frena hasta pararse en mitad de la carretera
    brake: {
      start(st) { st.braking = true; Sfx.brake(); },
      update: st => st.w.speed <= 0,
    },
    // final: vuelve a arrancar (la escena sigue mientras va cogiendo velocidad)
    go: {
      start(st) { st.braking = false; },
      update: (st, a) => a.t > 30,
    },
  };

  function act(st, name) {
    const def = ACTS[name];
    if (!def) { console.warn(`Escena: no existe la acción «${name}»`); return; }
    st.act = { name, t: 0 };
    if (def.start) def.start(st, st.act);
  }

  const acting = st => !!st.act;

  function updateAct(st) {
    const a = st.act;
    if (!a) return;
    a.t++;
    if (ACTS[a.name].update(st, a)) st.act = null;
  }

  // ---------- dibujo compartido ----------
  function drawParticles(st, g) {
    st.parts.forEach(p => {
      const k = p.life / p.max;
      if (p.kind === 'fire') {
        const r = p.r * (1.3 - k * 0.5);
        const col = k > 0.78 ? '#fff6c8' : k > 0.55 ? '#ffd05a' : k > 0.35 ? '#f07a2a' : k > 0.18 ? '#b8392a' : '#4a3a44';
        ell(g, col, p.x, p.y, r, r);
      } else if (p.kind === 'smoke') {
        g.globalAlpha = k * (p.alpha || 0.45);
        const r = p.r * (2.2 - k);
        ell(g, p.col || '#d8d4dc', p.x, p.y, r, r);
        g.globalAlpha = 1;
      } else {
        P(g, p.col, Math.round(p.x), Math.round(p.y), p.size || 1, p.size || 1);
      }
    });
  }

  // Temblor de cámara: devuelve el desplazamiento a aplicar al dibujar el mundo.
  function shakeOffset(st) {
    if (st.shake <= 0.3) return [0, 0];
    return [Math.round(rand(-1, 1) * st.shake), Math.round(rand(-1, 1) * st.shake)];
  }

  function drawWorld(st, g) {
    st.view.draw(st, g);
  }

  // ---------- interfaz (lienzo 960x720) ----------
  function bigText(ctx, ui, str, y, alpha, size = 64) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${size}px ${ui.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#3b0f0f';
    ctx.strokeText(str, ui.W / 2, y);
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#fff8c9');
    g.addColorStop(0.5, '#ffd45e');
    g.addColorStop(1, '#f0892a');
    ctx.fillStyle = g;
    ctx.fillText(str, ui.W / 2, y);
    ctx.restore();
  }

  function bulletIcon(ctx, x, y, full) {
    ctx.fillStyle = full ? '#2b1d16' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 1, y - 1, 12, 32);
    if (!full) return;
    ctx.fillStyle = '#d9a54a';
    ctx.fillRect(x, y + 10, 10, 20);
    ctx.fillStyle = '#f0d27a';
    ctx.fillRect(x + 1, y + 11, 3, 18);
    ctx.fillStyle = '#b8743a';
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 10, y + 10);
    ctx.fill();
  }

  // Vida del monstruo: una muesca por bala (compacta para no taparle la cabeza).
  function drawBossBar(st, ctx, { text, panel, FONT }) {
    const m = st.mon;
    panel(190, 8, 580, 50, true);
    // el nombre se encoge hasta caber en el hueco que deja la barra (de 214 a ~380)
    let size = 20;
    for (; size > 10; size--) {
      ctx.font = `700 ${size}px ${FONT}`;
      if (ctx.measureText(CHASE.boss).width <= 166) break;
    }
    text(CHASE.boss, 214, 33, { size, color: '#ffe28a', weight: 700 });
    const bx = 390, by = 22, bw = 356, bh = 22;
    ctx.fillStyle = '#1e0303';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = '#3a0c0c';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffe9c2';
    ctx.fillRect(bx, by, bw * (m.lag / CHASE.hp), bh);
    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    const pulse = m.hp <= 5 && m.hp > 0 && (st.t >> 3) & 1;
    grad.addColorStop(0, pulse ? '#ffc09a' : '#ff8a5a');
    grad.addColorStop(0.5, '#e8342a');
    grad.addColorStop(1, '#9a1414');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw * (m.hp / CHASE.hp), bh);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx, by + 2, bw * (m.hp / CHASE.hp), 3);
    ctx.fillStyle = 'rgba(30,3,3,0.6)';
    for (let i = 1; i < CHASE.hp; i++) ctx.fillRect(Math.round(bx + (bw * i) / CHASE.hp) - 1, by, 2, bh);
  }

  // Vida del coche: un bloque por golpe que aguanta. Con el último bloque parpadea en rojo.
  function drawCarBar(st, ctx, { text, panel }) {
    const car = st.car;
    panel(20, 580, 300, 56, true);
    text('CAR', 44, 608, { size: 22, color: '#ffe28a', weight: 700 });
    const last = car.hp <= 1 && (st.t >> 3) & 1;
    const hurt = car.hurt > 0 && (car.hurt >> 1) & 1;
    for (let i = 0; i < CHASE.carHp; i++) {
      const x = 104 + i * 42, y = 596;
      ctx.fillStyle = '#1e0303';
      ctx.fillRect(x - 3, y - 3, 38, 30);
      const full = i < car.hp;
      ctx.fillStyle = !full ? '#3a0c0c' : hurt ? '#ffffff' : last ? '#ff5a3a' : '#7ed957';
      ctx.fillRect(x, y, 32, 24);
      if (!full) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y + 2, 32, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x, y + 19, 32, 5);
    }
  }

  function drawHud(st, ctx, ui) {
    const { W, H, text, panel } = ui;
    if (st.state === 'intro' || st.state === 'drive') return; // ni en la escena de Simone ni en el final hay interfaz
    if (!st.mon.dead) drawBossBar(st, ctx, ui);
    drawCarBar(st, ctx, ui);

    if (st.state !== 'scene') {
      // balas y recarga
      panel(20, 646, 920, 62, true);
      text('AMMO', 46, 678, { size: 24, color: '#ffe28a', weight: 700 });
      const reloading = st.reload > 0;
      const k = reloading ? 1 - st.reload / CHASE.reloadFrames : 0;
      for (let i = 0; i < CHASE.magazine; i++) {
        bulletIcon(ctx, 146 + i * 22, 662, reloading ? i < Math.floor(k * CHASE.magazine) : i < st.ammo);
      }
      const ix = 146 + CHASE.magazine * 22 + 12;
      text(`${st.ammo}/${CHASE.magazine}`, ix, 678, { size: 26, weight: 700, color: st.ammo === 0 ? '#ff8a7a' : '#ffffff' });
      if (reloading) {
        text('RELOADING', 560, 678, { size: 22, weight: 700, color: (st.t >> 3) & 1 ? '#ffd45e' : '#ffb07a' });
        const rx = 700, ry = 667, rw = 214, rh = 22;
        ctx.fillStyle = '#1e0303';
        ctx.fillRect(rx - 3, ry - 3, rw + 6, rh + 6);
        ctx.fillStyle = '#3a2a0c';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = '#ffd45e';
        ctx.fillRect(rx, ry, rw * k, rh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(rx, ry + 2, rw * k, 4);
      } else {
        text('← →  move     SPACE  shoot', 912, 678, { size: 20, align: 'right', color: 'rgba(255,240,220,0.8)' });
      }
    }

    if (st.banner > 0) {
      const a = Math.min(1, st.banner / 30, (150 - st.banner) / 15);
      bigText(ctx, ui, 'STOP THE MONSTER!', 330, a);
    }
    if (st.state === 'won' && st.stateT > 40) {
      bigText(ctx, ui, 'MONSTER DEFEATED!', 320, Math.min(1, (st.stateT - 40) / 20), 70);
    }
    if (st.white > 0) {
      ctx.fillStyle = `rgba(255,255,255,${st.white})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return {
    views, M, rand, clamp, create, update, transform, reached, hold, resume, act, acting, syringePos,
    drawWorld, drawHud, drawParticles, shakeOffset,
  };
})();
