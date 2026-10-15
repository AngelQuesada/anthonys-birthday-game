'use strict';

// Batalla en coche, estilo 3D: carretera pseudo-3D en bucle con curvas, vista desde detrás del coche,
// y el monstruo corriendo delante. Las reglas comunes están en battle.js.
Battle.views['3d'] = (() => {
  const { O, mk, P, ell, oell } = Art.util;
  const { M, rand, clamp } = Battle;
  const VW = 320, VH = 240;     // mismo lienzo del mundo que el resto del juego (x3)
  const HZ = 96;                // horizonte
  const D0 = 10;                // distancia de la fila inferior de la pantalla
  const SPEED = 0.5;            // avance por frame
  const STRIPE = 2.8;           // largo de cada banda de color de la carretera
  const FEET_Y = 144;           // fila donde pisa el monstruo
  const MON_TOP = FEET_Y - 123; // borde superior de su sprite
  const S_MON = (FEET_Y - HZ) / (VH - HZ);
  const D_MON = D0 / S_MON;
  const CAR_Y = 214;            // base del coche
  const GUN_DX = 34, GUN_Y = CAR_Y - 28; // el arma va en el lateral derecho
  const AIM_Y = FEET_Y - 58;    // altura del pecho del monstruo
  const CURVES = [-1, -0.6, -0.3, 0, 0, 0.3, 0.6, 1];

  const C = {
    grass: ['#5fae45', '#519b3b'],
    road: ['#6e6c7a', '#666474'],
    rumble: ['#f2efe6', '#d23c3c'],
    line: '#f6e7b0',
    haze: '#f6a65a',
  };

  const halfW = s => 2 + 150 * s;
  const roadX = (st, s) => VW / 2 + st.w.curve * 150 * Math.pow(1 - s, 3);

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

  // ---------- estado y avance ----------
  function init(st) {
    loadArt();
    st.w = { dist: 0, curve: 0, curveTarget: 0, curveT: 180, bgX: 0, props: [], propT: 0 };
    for (let d = 14; d < 220; d += 9) spawnProp(st.w, d);
  }

  function spawnProp(w, d) {
    const r = Math.random();
    const kind = r < 0.4 ? 'tree' : r < 0.7 ? 'pine' : r < 0.85 ? 'bush' : 'post';
    w.props.push({ d, kind, side: Math.random() < 0.5 ? -1 : 1, off: kind === 'post' ? 2 : rand(8, 70) });
  }

  function scroll(st) {
    const w = st.w;
    w.dist += SPEED;
    w.bgX += w.curve * SPEED * 3;
    if (--w.curveT <= 0) {
      w.curveTarget = CURVES[(Math.random() * CURVES.length) | 0];
      w.curveT = (200 + Math.random() * 240) | 0;
    }
    w.curve += (w.curveTarget - w.curve) * 0.012;
    w.props.forEach(p => { p.d -= SPEED; });
    w.props = w.props.filter(p => p.d > D0 * 0.5);
    if (--w.propT <= 0) {
      spawnProp(w, 220);
      w.propT = (10 + Math.random() * 16) | 0;
    }
  }

  const gun = st => ({ x: st.car.x + GUN_DX, y: GUN_Y });
  const exhaust = st => ({ x: st.car.x - 20, y: CAR_Y - 8, vx: rand(-0.2, 0.2), vy: rand(0.4, 0.8) });
  const monsterTarget = (st, sway) => clamp(roadX(st, S_MON) + 96 * sway, 62, VW - 62);

  // Las balas van «hacia el fondo»: suben y convergen un poco hacia el centro mientras encogen.
  function bulletPos(b, p) {
    const tx = VW / 2 + (b.x0 - VW / 2) * 0.85;
    return { x: b.x0 + (tx - b.x0) * p, y: b.y0 + (AIM_Y - b.y0) * p, size: Math.max(0.2, 1 - 0.55 * p) };
  }

  // ---------- dibujo ----------
  function drawLayer(g, img, off) {
    const x = -(((off % img.width) + img.width) % img.width);
    g.drawImage(img, Math.round(x), 0);
    g.drawImage(img, Math.round(x) + img.width, 0);
  }

  function drawRoad(st, g) {
    for (let y = HZ; y < VH; y++) {
      const s = (y + 1 - HZ) / (VH - HZ);
      const band = Math.floor((D0 / s + st.w.dist) / STRIPE) & 1;
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
    const { x, y, size } = bulletPos(b, b.p);
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

  function draw(st, g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a1020';
    g.fillRect(0, 0, VW, VH);
    g.save();
    g.translate(...Battle.shakeOffset(st));
    g.drawImage(art.sky, 0, 0);
    drawLayer(g, art.far, st.w.bgX * 0.4);
    drawLayer(g, art.near, st.w.bgX);
    drawRoad(st, g);

    const props = st.w.props.slice().sort((a, b) => b.d - a.d);
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
    Battle.drawParticles(st, g);
    g.restore();
  }

  return {
    name: '3D',
    carStartX: VW / 2, carMin: 36, carMax: VW - 40,
    bulletFrames: 22, bulletEnd: 1.45, hitHalfW: 32,
    monArea: { hw: 34, y0: MON_TOP + 20, y1: MON_TOP + 110, fx: 1 },
    init, scroll, gun, exhaust, bulletPos, monsterTarget, draw,
  };
})();
