'use strict';

// Minijuego de persecución: carretera pseudo-3D en bucle, el coche solo se mueve a izquierda/derecha
// y dispara (ESPACIO) al monstruo que corre delante. Se lanza desde STORY con { minigame: 'chase' }
// y los ajustes (vida, cargador, recarga) están en CHASE, en data.js.
const Chase = (() => {
  const { O, mk, P, ell, oell } = Art.util;
  const VW = 320, VH = 240;     // mismo lienzo del mundo que el resto del juego (x3)
  const HZ = 96;                // horizonte
  const D0 = 10;                // distancia de la fila inferior de la pantalla
  const SPEED = 0.5;            // avance por frame
  const STRIPE = 2.8;           // largo de cada banda de color de la carretera
  const FEET_Y = 144;           // fila donde pisa el monstruo
  const MON_TOP = FEET_Y - 123;  // borde superior de su sprite
  const S_MON = (FEET_Y - HZ) / (VH - HZ);
  const D_MON = D0 / S_MON;
  const CAR_Y = 214;            // base del coche
  const GUN_DX = 34, GUN_Y = CAR_Y - 28; // el arma va en el lateral derecho
  const AIM_Y = FEET_Y - 58;    // altura del pecho del monstruo
  const HIT_HALF_W = 32;
  const BULLET_FRAMES = 22;
  const CURVES = [-1, -0.6, -0.3, 0, 0, 0.3, 0.6, 1];

  const C = {
    grass: ['#5fae45', '#519b3b'],
    road: ['#6e6c7a', '#666474'],
    rumble: ['#f2efe6', '#d23c3c'],
    line: '#f6e7b0',
    haze: '#f6a65a',
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const halfW = s => 2 + 150 * s;
  const roadX = (st, s) => VW / 2 + st.curve * 150 * Math.pow(1 - s, 3);

  // ---------- arte ----------
  function makeSky() {
    const { c, g } = mk(VW, HZ);
    const grad = g.createLinearGradient(0, 0, 0, HZ);
    grad.addColorStop(0, '#2b1f52');
    grad.addColorStop(0.55, '#a8456a');
    grad.addColorStop(1, C.haze);
    g.fillStyle = grad;
    g.fillRect(0, 0, VW, HZ);
    for (let i = 0; i < 36; i++) P(g, 'rgba(255,255,255,0.55)', (i * 97 + 13) % VW, (i * 53) % 38);
    ell(g, '#ffb35e', 240, 66, 24, 24);
    ell(g, '#ffd27a', 240, 66, 20, 20);
    ell(g, '#ffe9a8', 239, 63, 12, 12);
    for (let y = 70; y < 90; y += 5) P(g, '#f08a5e', 214, y, 52, 1 + ((y - 70) / 7 | 0));
    return c;
  }

  // Cordillera que se repite cada 512 px (senos con periodos enteros).
  function makeRange(seed, base, amp, col, colL) {
    const w = 512;
    const { c, g } = mk(w, HZ);
    for (let x = 0; x < w; x++) {
      const a = (x / w) * Math.PI * 2;
      const h = base + amp * (0.55 * Math.sin(a * 3 + seed) + 0.3 * Math.sin(a * 7 + seed * 2) + 0.15 * Math.sin(a * 17 + seed * 3));
      const top = Math.round(HZ - h);
      P(g, col, x, top, 1, HZ - top);
      P(g, colL, x, top, 1, 1);
    }
    return c;
  }

  function makeTree() {
    const { c, g } = mk(26, 40);
    P(g, O, 11, 25, 5, 15);
    P(g, '#7b5230', 12, 25, 3, 14);
    oell(g, '#2c7230', 13, 16, 11, 13);
    ell(g, '#3f9a3c', 12, 14, 9, 10);
    ell(g, '#62bd4f', 9, 10, 4, 4);
    return c;
  }

  function makePine() {
    const { c, g } = mk(22, 44);
    P(g, O, 9, 34, 4, 10);
    P(g, '#553619', 10, 34, 2, 9);
    [[4, 13, 3], [14, 24, 5], [24, 36, 7]].forEach(([y0, y1, w0]) => {
      for (let y = y0; y <= y1; y++) {
        const hw = w0 + ((y - y0) / (y1 - y0)) * 4;
        P(g, O, Math.round(11 - hw) - 1, y, Math.round(hw * 2) + 2, 1);
      }
      for (let y = y0 + 1; y < y1; y++) {
        const hw = w0 + ((y - y0) / (y1 - y0)) * 4 - 1;
        P(g, '#2c6e3a', Math.round(11 - hw), y, Math.round(hw * 2), 1);
        P(g, '#3f8f4a', Math.round(11 - hw), y, Math.round(hw), 1);
      }
    });
    P(g, O, 10, 1, 2, 4);
    return c;
  }

  function makeBush() {
    const { c, g } = mk(24, 14);
    oell(g, '#2c7230', 12, 8, 10, 5);
    ell(g, '#3f9a3c', 11, 7, 8, 4);
    ell(g, '#62bd4f', 8, 6, 3, 2);
    return c;
  }

  function makePost() {
    const { c, g } = mk(6, 18);
    P(g, O, 0, 0, 6, 18);
    P(g, '#f2efe6', 1, 1, 4, 16);
    P(g, '#d23c3c', 1, 3, 4, 3);
    return c;
  }

  // Coche visto desde atrás, con el arma montada en el lateral derecho. f alterna la banda de rodadura.
  function makeCar(f) {
    const { c, g } = mk(72, 44);
    const red = '#d8342c', redD = '#9e1f1c', redL = '#f06a4e';
    ell(g, 'rgba(0,0,0,0.35)', 34, 40, 34, 4);
    [6, 52].forEach(x => {
      P(g, O, x - 1, 27, 12, 14);
      P(g, '#2a2a30', x, 28, 10, 12);
      for (let y = 29 + f * 2; y < 40; y += 4) P(g, '#4a4a55', x, y, 10, 1);
    });
    // cabina
    for (let y = 2; y <= 13; y++) {
      const hw = Math.round(17 + (y - 2) * 0.55);
      P(g, O, 34 - hw - 1, y - 1, hw * 2 + 2, 1);
      P(g, red, 34 - hw, y, hw * 2, 1);
    }
    P(g, redL, 18, 2, 32, 1);
    // luna trasera con el conductor (pelo naranja de Kael)
    for (let y = 4; y <= 11; y++) {
      const hw = Math.round(14 + (y - 4) * 0.55);
      P(g, '#22324f', 34 - hw, y, hw * 2, 1);
    }
    ell(g, '#b8551e', 27, 10, 6, 4);
    ell(g, '#e0782e', 27, 9, 5, 3);
    [22, 25, 28, 31].forEach((x, i) => P(g, '#e0782e', x, 5 + (i & 1), 2, 2));
    for (let i = 0; i < 6; i++) P(g, 'rgba(160,200,255,0.35)', 40 + i, 5 + i, 2, 1);
    // carrocería
    P(g, O, 3, 13, 62, 22);
    P(g, red, 4, 14, 60, 20);
    P(g, redL, 4, 14, 60, 2);
    P(g, redD, 4, 29, 60, 5);
    P(g, '#3a3a44', 4, 27, 60, 3);
    [[5, 16], [51, 16]].forEach(([x, y]) => {
      P(g, O, x, y, 12, 7);
      P(g, '#ff4a3a', x + 1, y + 1, 10, 5);
      P(g, '#ffc0a0', x + 2, y + 1, 3, 1);
    });
    P(g, O, 27, 19, 14, 8);
    P(g, '#f4f0dc', 28, 20, 12, 6);
    P(g, '#3a3a44', 30, 22, 8, 2);
    P(g, '#555560', 12, 33, 5, 2);
    // arma lateral
    P(g, O, 63, 15, 4, 4);
    P(g, '#7d838b', 63, 16, 3, 2);
    P(g, O, 64, 8, 8, 11);
    P(g, '#7d838b', 65, 9, 6, 9);
    P(g, '#a4aab1', 65, 9, 6, 2);
    P(g, '#1d1d22', 66, 11, 4, 4);
    return c;
  }

  // Monstruo: cuerpo enorme y morado con la cabeza de un hombre de pelo blanco.
  const M = {
    skin: '#7b5aa6', skinD: '#5a3f80', skinL: '#9d7dc6',
    pants: '#4a3b2e', pantsD: '#33281f', claw: '#efe6cf',
    face: '#f0c39b', faceD: '#d39a74', faceDD: '#a86f50',
    hair: '#f7f7f4', hairD: '#c9ccd6',
  };

  function makeMonster(leg, roar, flash) {
    const { c, g } = mk(112, 124);
    const blobs = []; // [cx, cy, rx, ry, color, colorOscuro]
    const legs = leg ? [[38, 5], [74, 0]] : [[38, 0], [74, 5]];
    legs.forEach(([x, lift]) => {
      blobs.push([x, 104 - lift, 11, 13, M.pants, M.pantsD]);
      blobs.push([x, 118 - lift, 12, 5, M.skin, M.skinD]);
    });
    blobs.push([56, 72, 34, 27, M.skin, M.skinD]);
    blobs.push([24, 50, 15, 12, M.skin, M.skinD], [88, 50, 15, 12, M.skin, M.skinD]);
    blobs.push([56, 45, 11, 7, M.skin, M.skinD]);
    const swing = leg ? 6 : -6;
    const fists = [[12, 94 + swing], [100, 94 - swing]];
    [[24, 54], [88, 54]].forEach(([sx, sy], i) => {
      const [ex, ey] = fists[i];
      for (let k = 0; k <= 1; k += 1 / 6) blobs.push([sx + (ex - sx) * k, sy + (ey - sy) * k, 9 - k * 2, 9 - k * 2, M.skin, M.skinD]);
      blobs.push([ex, ey + 3, 9, 8, M.skin, M.skinD]);
    });
    blobs.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    blobs.forEach(([x, y, rx, ry, col, colD]) => {
      ell(g, colD, x, y, rx, ry);
      ell(g, col, x - 1, y - 1, rx - 1.5, ry - 1.5);
    });
    // músculos, barriga y pantalón roto
    ell(g, M.skinL, 56, 82, 15, 10);
    P(g, M.skinD, 40, 63, 14, 1); P(g, M.skinD, 58, 63, 14, 1);
    P(g, M.skinD, 55, 56, 2, 14);
    [76, 82].forEach(y => { P(g, M.skinD, 50, y, 4, 1); P(g, M.skinD, 58, y, 4, 1); });
    ell(g, O, 56, 96, 29, 8);
    ell(g, M.pants, 56, 95, 28, 7);
    for (let x = 30; x < 82; x += 6) P(g, M.pants, x, 101, 3, 2);
    P(g, M.pantsD, 32, 92, 48, 1);
    // garras y pinchos de los hombros
    fists.forEach(([x, y]) => [-5, -1, 3].forEach(dx => { P(g, O, x + dx, y + 10, 3, 4); P(g, M.claw, x + dx, y + 10, 2, 3); }));
    [[14, 40], [20, 37], [92, 37], [98, 40]].forEach(([x, y]) => {
      P(g, O, x - 1, y - 6, 4, 7);
      P(g, M.claw, x, y - 5, 2, 6);
    });

    // cabeza: pelo blanco alborotado por detrás
    const tufts = [[56, 20, 18, 13], [40, 30, 8, 10], [72, 30, 8, 10], [44, 13, 7, 6], [68, 13, 7, 6], [56, 9, 8, 6]];
    tufts.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    tufts.forEach(([x, y, rx, ry]) => { ell(g, M.hairD, x, y, rx, ry); ell(g, M.hair, x - 1, y - 1, rx - 1, ry - 1); });
    [[34, 22], [33, 33], [78, 22], [79, 33], [48, 4], [62, 4]].forEach(([x, y]) => { P(g, O, x - 1, y - 1, 4, 4); P(g, M.hair, x, y, 2, 2); });
    oell(g, M.faceD, 43, 32, 3, 4);
    oell(g, M.faceD, 69, 32, 3, 4);
    oell(g, M.faceD, 56, 32, 12, 14);
    ell(g, M.face, 55, 31, 11, 13);
    P(g, M.faceD, 50, 21, 12, 1); P(g, M.faceD, 51, 23, 10, 1);
    // flequillo
    ell(g, O, 56, 18, 12, 4);
    ell(g, M.hair, 56, 17, 11, 3);
    // ojos furiosos y cejas blancas
    [[47, 1], [61, 1]].forEach(([x]) => {
      P(g, O, x - 1, 28, 9, 6);
      P(g, '#ffffff', x, 29, 7, 4);
      P(g, '#d23c3c', x + 2, 29, 3, 3);
      P(g, O, x + 3, 30, 1, 2);
    });
    for (let i = 0; i < 8; i++) {
      P(g, O, 45 + i, 24 + (i >> 1), 1, 3);
      P(g, M.hair, 45 + i, 24 + (i >> 1), 1, 2);
      P(g, O, 66 - i, 24 + (i >> 1), 1, 3);
      P(g, M.hair, 66 - i, 24 + (i >> 1), 1, 2);
    }
    P(g, M.faceDD, 55, 32, 2, 5);
    P(g, M.faceDD, 53, 37, 6, 1);
    // bigote y boca
    if (roar) {
      P(g, O, 50, 39, 12, 9);
      P(g, '#6a1414', 51, 40, 10, 7);
      P(g, '#ffffff', 51, 40, 10, 2);
      P(g, '#ffffff', 52, 45, 8, 1);
      P(g, '#d0505a', 53, 44, 6, 1);
    } else {
      P(g, O, 50, 40, 12, 5);
      P(g, '#ffffff', 51, 41, 10, 3);
      [53, 56, 59].forEach(x => P(g, '#9a9aa8', x, 41, 1, 3));
    }
    ell(g, O, 56, 38, 8, 2.5);
    ell(g, M.hair, 56, 37.5, 7, 1.8);
    P(g, M.hair, 48, 38, 2, 4); P(g, M.hair, 62, 38, 2, 4);

    if (flash) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, 112, 124);
      g.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  let art = null;
  function loadArt() {
    if (art) return art;
    const monster = {};
    for (const key of ['000', '001', '010', '011', '100', '101', '110', '111']) {
      monster[key] = makeMonster(key[0] === '1', key[1] === '1', key[2] === '1');
    }
    art = {
      sky: makeSky(),
      far: makeRange(0.7, 26, 14, '#5a3a6e', '#7a5590'),
      near: makeRange(2.1, 10, 6, '#3f6b3a', '#5a8f4c'),
      props: { tree: makeTree(), pine: makePine(), bush: makeBush(), post: makePost() },
      cars: [makeCar(0), makeCar(1)],
      monster,
    };
    return art;
  }

  // ---------- estado ----------
  function create(onWin) {
    loadArt();
    const st = {
      onWin, t: 0, dist: 0, curve: 0, curveTarget: 0, curveT: 180, bgX: 0,
      car: { x: VW / 2, vx: 0, recoil: 0, flash: 0 },
      ammo: CHASE.magazine, reload: 0, cooldown: 0,
      mon: { x: VW / 2, hp: CHASE.hp, lag: CHASE.hp, flash: 0, roar: 0, knock: 0, phase: 0, roarT: 90, dead: false },
      bullets: [], parts: [], props: [], propT: 0,
      shake: 0, white: 0, state: 'fight', stateT: 0, banner: 150, done: false,
    };
    for (let d = 14; d < 220; d += 9) spawnProp(st, d);
    return st;
  }

  function spawnProp(st, d) {
    const r = Math.random();
    const kind = r < 0.4 ? 'tree' : r < 0.7 ? 'pine' : r < 0.85 ? 'bush' : 'post';
    st.props.push({ d, kind, side: Math.random() < 0.5 ? -1 : 1, off: kind === 'post' ? 2 : rand(8, 70) });
  }

  // ---------- actualización ----------
  // input: { dir: -1 | 0 | 1, fire: bool } o null mientras hay un fundido.
  function update(st, input) {
    st.t++;
    st.dist += SPEED;
    st.bgX += st.curve * SPEED * 3;
    Sfx.engine(true);

    if (--st.curveT <= 0) {
      st.curveTarget = CURVES[(Math.random() * CURVES.length) | 0];
      st.curveT = (200 + Math.random() * 240) | 0;
    }
    st.curve += (st.curveTarget - st.curve) * 0.012;

    st.props.forEach(p => { p.d -= SPEED; });
    st.props = st.props.filter(p => p.d > D0 * 0.5);
    if (--st.propT <= 0) {
      spawnProp(st, 220);
      st.propT = (10 + Math.random() * 16) | 0;
    }

    updateCar(st, input);
    updateBullets(st);
    updateMonster(st);
    st.parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.grav || 0;
      p.life--;
    });
    st.parts = st.parts.filter(p => p.life > 0);
    st.shake *= 0.86;
    st.white = Math.max(0, st.white - 0.035);
    if (st.banner > 0) st.banner--;
  }

  function updateCar(st, input) {
    const car = st.car;
    const playing = st.state === 'fight' && input;
    car.vx = (car.vx + (playing ? input.dir : 0) * 0.55) * 0.84;
    const x = clamp(car.x + car.vx, 36, VW - 40);
    if (x !== car.x + car.vx) car.vx = 0;
    car.x = x;
    car.recoil *= 0.7;
    if (car.flash > 0) car.flash--;
    if (st.t % 4 === 0) {
      st.parts.push({ kind: 'smoke', x: car.x - 20, y: CAR_Y - 8, vx: rand(-0.2, 0.2), vy: rand(0.4, 0.8), r: 2, life: 26, max: 26 });
    }

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
    st.bullets.push({ x0: car.x + GUN_DX, y0: GUN_Y, p: 0, checked: false });
    Sfx.shoot();
    if (st.ammo === 0) {
      st.reload = CHASE.reloadFrames;
      Sfx.reload();
    }
  }

  // Las balas van «hacia el fondo»: suben y convergen un poco hacia el centro mientras encogen.
  function bulletPos(b, p = b.p) {
    const tx = VW / 2 + (b.x0 - VW / 2) * 0.85;
    return { x: b.x0 + (tx - b.x0) * p, y: b.y0 + (AIM_Y - b.y0) * p, size: Math.max(0.2, 1 - 0.55 * p) };
  }

  function updateBullets(st) {
    const m = st.mon;
    st.bullets.forEach(b => {
      b.p += 1 / BULLET_FRAMES;
      if (b.p < 1 || b.checked) return;
      b.checked = true;
      const pos = bulletPos(b);
      if (st.state !== 'fight' || Math.abs(pos.x - m.x) > HIT_HALF_W) return;
      b.dead = true;
      hitMonster(st, pos.x, pos.y);
    });
    st.bullets = st.bullets.filter(b => !b.dead && b.p < 1.45);
  }

  function hitMonster(st, x, y) {
    const m = st.mon;
    m.hp--;
    m.flash = 6;
    m.knock = 3;
    st.shake = Math.max(st.shake, 2);
    Sfx.hit();
    for (let i = 0; i < 9; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.6, 2.2);
      st.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, grav: 0.08, col: ['#fff3b0', '#ffd05a', '#f07a2a'][i % 3], life: 18, max: 18 });
    }
    if (m.hp === 20 || m.hp === 10) { m.roar = 60; Sfx.roar(); st.shake = 4; }
    if (m.hp <= 0) {
      st.state = 'dying';
      st.stateT = 0;
      m.roar = 999;
      Sfx.roar();
    }
  }

  function explosion(st, x, y, n, size) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.2, 1.4) * size;
      st.parts.push({ kind: 'fire', x: x + rand(-3, 3), y: y + rand(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, r: rand(2, 5) * size, life: 34, max: 34 });
    }
  }

  function updateMonster(st) {
    const m = st.mon;
    if (m.dead) {
      if (++st.stateT === 220 && !st.done) {
        st.done = true;
        st.onWin();
      }
      return;
    }
    // cuanto menos vida, más rápido se mueve de lado a lado
    const rage = 1 + (1 - m.hp / CHASE.hp) * 0.9;
    m.phase += 0.02 * rage;
    const sway = 62 * Math.sin(m.phase) + 34 * Math.sin(m.phase * 2.3 + 1.3);
    m.x += (clamp(roadX(st, S_MON) + sway, 62, VW - 62) - m.x) * 0.08;
    if (m.flash > 0) m.flash--;
    m.knock *= 0.8;
    if (m.lag > m.hp) m.lag = Math.max(m.hp, m.lag - 0.06);
    if (m.roar > 0) m.roar--;
    else if (--m.roarT <= 0) {
      m.roar = 50;
      m.roarT = (320 + Math.random() * 300) | 0;
      Sfx.roar();
      st.shake = Math.max(st.shake, 3);
    }

    if (st.state !== 'dying') return;
    st.stateT++;
    m.flash = (st.stateT >> 2) & 1 ? 2 : 0;
    st.shake = Math.max(st.shake, 2.5);
    if (st.stateT % 7 === 0) explosion(st, m.x + rand(-34, 34), MON_TOP + rand(20, 110), 6, 1);
    if (st.stateT % 14 === 0) Sfx.boom();
    if (st.stateT >= 120) {
      m.dead = true;
      st.state = 'won';
      st.stateT = 0;
      st.white = 1;
      st.shake = 9;
      Sfx.bigBoom();
      for (let i = 0; i < 6; i++) explosion(st, m.x + rand(-30, 30), MON_TOP + rand(30, 110), 8, 1.6);
      for (let i = 0; i < 30; i++) {
        const a = rand(-Math.PI, 0), v = rand(1, 3.5);
        const hairBit = i % 3 === 0;
        st.parts.push({
          kind: 'chunk', x: m.x + rand(-20, 20), y: MON_TOP + rand(30, 90), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, grav: 0.12,
          col: hairBit ? M.hair : i % 2 ? M.skin : M.skinD, size: hairBit ? 2 : 3, life: 80, max: 80,
        });
      }
    }
  }

  // ---------- render del mundo (lienzo 320x240) ----------
  function drawLayer(g, img, off) {
    const x = -(((off % img.width) + img.width) % img.width);
    g.drawImage(img, Math.round(x), 0);
    g.drawImage(img, Math.round(x) + img.width, 0);
  }

  function drawRoad(st, g) {
    for (let y = HZ; y < VH; y++) {
      const s = (y + 1 - HZ) / (VH - HZ);
      const band = Math.floor((D0 / s + st.dist) / STRIPE) & 1;
      const cx = roadX(st, s), hw = halfW(s), rw = Math.max(1, hw * 0.1);
      g.fillStyle = C.grass[band];
      g.fillRect(0, y, VW, 1);
      g.fillStyle = C.rumble[band];
      g.fillRect(Math.round(cx - hw - rw), y, Math.round(2 * (hw + rw)), 1);
      g.fillStyle = C.road[band];
      g.fillRect(Math.round(cx - hw), y, Math.round(2 * hw), 1);
      if (band) {
        const lw = Math.max(1, Math.round(hw * 0.03));
        g.fillStyle = C.line;
        g.fillRect(Math.round(cx - lw / 2), y, lw, 1);
      }
    }
    // neblina en el horizonte: disimula el parpadeo de las bandas lejanas
    const haze = g.createLinearGradient(0, HZ, 0, HZ + 22);
    haze.addColorStop(0, 'rgba(246,166,90,0.75)');
    haze.addColorStop(1, 'rgba(246,166,90,0)');
    g.fillStyle = haze;
    g.fillRect(0, HZ, VW, 22);
  }

  function drawProp(st, g, p) {
    const s = D0 / p.d;
    const img = art.props[p.kind];
    const k = s * 1.7;
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const x = roadX(st, s) + p.side * (halfW(s) + p.off * s + w / 2);
    const y = HZ + s * (VH - HZ);
    if (y - h > VH || x + w / 2 < 0 || x - w / 2 > VW) return;
    g.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h);
  }

  function drawBullet(g, b) {
    const { x, y, size } = bulletPos(b);
    const fade = b.p > 1 ? Math.max(0, 1 - (b.p - 1) / 0.45) : 1;
    g.globalAlpha = fade;
    [0.12, 0.06].forEach((back, i) => {
      const t = bulletPos(b, Math.max(0, b.p - back));
      ell(g, i ? 'rgba(255,190,80,0.55)' : 'rgba(255,150,60,0.3)', t.x, t.y, 1.2 * t.size + 0.3, 1.6 * t.size + 0.3);
    });
    ell(g, 'rgba(255,200,80,0.4)', x, y, 3 * size + 1, 3 * size + 1);
    ell(g, '#fff3b0', x, y, 1.5 * size + 0.5, 2.3 * size + 0.5);
    g.globalAlpha = 1;
  }

  function drawMonster(st, g) {
    const m = st.mon;
    const run = Math.floor(st.t / 9) % 2;
    const bob = run ? 2 : 0;
    const jitter = st.state === 'dying' ? Math.round(rand(-2, 2)) : 0;
    ell(g, 'rgba(0,0,0,0.3)', m.x, FEET_Y - 1, 36, 5);
    const img = art.monster[`${run}${m.roar > 0 ? 1 : 0}${m.flash > 0 && (m.flash & 2) ? 1 : 0}`];
    g.drawImage(img, Math.round(m.x - 56) + jitter, Math.round(MON_TOP - bob - m.knock));
  }

  function drawParticles(st, g) {
    st.parts.forEach(p => {
      const k = p.life / p.max;
      if (p.kind === 'fire') {
        const r = p.r * (1.3 - k * 0.5);
        const col = k > 0.78 ? '#fff6c8' : k > 0.55 ? '#ffd05a' : k > 0.35 ? '#f07a2a' : k > 0.18 ? '#b8392a' : '#4a3a44';
        ell(g, col, p.x, p.y, r, r);
      } else if (p.kind === 'smoke') {
        g.globalAlpha = k * 0.45;
        const r = p.r * (2.2 - k);
        ell(g, '#d8d4dc', p.x, p.y, r, r);
        g.globalAlpha = 1;
      } else {
        P(g, p.col, Math.round(p.x), Math.round(p.y), p.size || 1, p.size || 1);
      }
    });
  }

  function drawWorld(st, g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a1020';
    g.fillRect(0, 0, VW, VH);
    g.save();
    if (st.shake > 0.3) g.translate(Math.round(rand(-1, 1) * st.shake), Math.round(rand(-1, 1) * st.shake));
    g.drawImage(art.sky, 0, 0);
    drawLayer(g, art.far, st.bgX * 0.4);
    drawLayer(g, art.near, st.bgX);
    drawRoad(st, g);

    const props = st.props.slice().sort((a, b) => b.d - a.d);
    props.filter(p => p.d >= D_MON).forEach(p => drawProp(st, g, p));
    st.bullets.filter(b => b.p > 1).forEach(b => drawBullet(g, b));
    if (!st.mon.dead) drawMonster(st, g);
    props.filter(p => p.d < D_MON).forEach(p => drawProp(st, g, p));
    st.bullets.filter(b => b.p <= 1).forEach(b => drawBullet(g, b));

    const car = st.car;
    const bob = (st.t >> 3) & 1;
    g.drawImage(art.cars[(st.t >> 1) & 1], Math.round(car.x - 34), Math.round(CAR_Y - 42 + bob + car.recoil));
    if (car.flash > 0) {
      const fx = car.x + GUN_DX, fy = GUN_Y - 4 + bob;
      ell(g, '#ff9a3a', fx, fy, 5, 6);
      ell(g, '#fff3b0', fx, fy, 3, 4);
    }
    drawParticles(st, g);
    g.restore();
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
  function drawBossBar(st, ctx, { text, panel }) {
    const m = st.mon;
    panel(190, 8, 580, 50, true);
    text(CHASE.boss, 214, 33, { size: 20, color: '#ffe28a', weight: 700 });
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

  function drawHud(st, ctx, ui) {
    const { W, H, text, panel } = ui;
    const m = st.mon;
    if (!m.dead) drawBossBar(st, ctx, ui);

    // balas y recarga
    panel(20, 646, 920, 62, true);
    text('BALAS', 46, 678, { size: 24, color: '#ffe28a', weight: 700 });
    const reloading = st.reload > 0;
    const k = reloading ? 1 - st.reload / CHASE.reloadFrames : 0;
    for (let i = 0; i < CHASE.magazine; i++) {
      bulletIcon(ctx, 146 + i * 22, 662, reloading ? i < Math.floor(k * CHASE.magazine) : i < st.ammo);
    }
    const ix = 146 + CHASE.magazine * 22 + 12;
    text(`${st.ammo}/${CHASE.magazine}`, ix, 678, { size: 26, weight: 700, color: st.ammo === 0 ? '#ff8a7a' : '#ffffff' });
    if (reloading) {
      text('RECARGANDO', 560, 678, { size: 22, weight: 700, color: (st.t >> 3) & 1 ? '#ffd45e' : '#ffb07a' });
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
      text('← →  mover     ESPACIO  disparar', 912, 678, { size: 20, align: 'right', color: 'rgba(255,240,220,0.8)' });
    }

    if (st.banner > 0) {
      const a = Math.min(1, st.banner / 30, (150 - st.banner) / 15);
      bigText(ctx, ui, '¡DETÉN AL MONSTRUO!', 330, a);
    }
    if (st.state === 'won' && st.stateT > 40) {
      bigText(ctx, ui, '¡MONSTRUO DERROTADO!', 320, Math.min(1, (st.stateT - 40) / 20), 70);
    }
    if (st.white > 0) {
      ctx.fillStyle = `rgba(255,255,255,${st.white})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return { create, update, drawWorld, drawHud };
})();
