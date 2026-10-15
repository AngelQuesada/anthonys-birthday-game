'use strict';

// Batalla en coche, estilo cenital (como el resto del juego): el coche sube por un camino de la aldea
// que se repite en bucle y el monstruo corre delante. Suelo, árboles y rocas son los mismos de art.js.
// Las reglas comunes están en battle.js.
Battle.views.top = (() => {
  const { O, mk, P, ell, oell, orect } = Art.util;
  const { M, rand, clamp } = Battle;
  const T = Art.T;
  const VW = 320, VH = 240;
  const COLS = 32, ROWS = 80;          // mapa del bucle, en casillas
  const MAP_W = COLS * T, LEN = ROWS * T;
  const ROAD = 4;                       // casillas de camino a cada lado del centro
  const SPEED = 2.4;                    // px por frame
  const CAR_BASE = 208;                 // base del coche en pantalla
  const MON_BASE = 104;                 // pies del monstruo en pantalla
  const GUN_DX = 13, GUN_Y = CAR_BASE - 31;
  const AIM_Y = MON_BASE - 30;          // altura del pecho del monstruo
  const DUST = '#c49a5e';

  const mod = (a, n) => ((a % n) + n) % n;
  // Centro del camino (px del mapa) para una fila y; periódico en LEN para que el bucle no tenga costura.
  const center = y => MAP_W / 2 + 50 * Math.sin((2 * Math.PI * y) / LEN) + 18 * Math.sin((4 * Math.PI * y) / LEN + 1.3);
  const roadCol = row => Math.round(center(row * T + T / 2) / T);

  // ---------- mapa del bucle ----------
  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function buildTiles() {
    const r = seeded(7);
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
      let row = '';
      for (let x = 0; x < COLS; x++) {
        // distancia (en casillas) al camino, mirando también las filas vecinas por la altura de los árboles
        let dist = Infinity;
        for (let dy = -2; dy <= 1; dy++) {
          const c = roadCol(mod(y + dy, ROWS));
          dist = Math.min(dist, x < c - ROAD ? c - ROAD - x : x >= c + ROAD ? x - (c + ROAD - 1) : 0);
        }
        const k = r();
        if (dist === 0) row += '=';
        else if (dist >= 3 && k < 0.33) row += 'T';
        else if (dist >= 2 && k < 0.41) row += 'b';
        else if (dist >= 2 && k < 0.45) row += 'r';
        else row += k > 0.85 ? ',' : '.';
      }
      rows.push(row);
    }
    return rows;
  }

  // El suelo se genera con una fila extra arriba y abajo (las del otro extremo del bucle)
  // para que los bordes del camino casen al dar la vuelta.
  function buildGround(tiles) {
    const wrapped = [tiles[ROWS - 1], ...tiles, tiles[0]];
    const full = Art.ground(wrapped, 0);
    const { c, g } = mk(MAP_W, LEN);
    g.drawImage(full, 0, -T);
    return c;
  }

  // ---------- coche visto desde arriba (el morro apunta hacia arriba) ----------
  function makeCar(f) {
    const { c, g } = mk(28, 32);
    const red = '#d8342c', redD = '#9e1f1c', redL = '#f06a4e';
    ell(g, 'rgba(0,0,0,0.25)', 11, 29, 11, 3);
    [[0, 5], [17, 5], [0, 19], [17, 19]].forEach(([x, y]) => {
      P(g, O, x, y, 5, 8);
      P(g, '#2a2a30', x + 1, y + 1, 3, 6);
      for (let yy = y + 1 + f; yy < y + 7; yy += 2) P(g, '#4a4a55', x + 1, yy, 3, 1);
    });
    orect(g, red, 3, 1, 16, 27);
    P(g, redL, 3, 1, 16, 2);
    P(g, redL, 4, 3, 1, 5);
    P(g, redD, 10, 3, 2, 4);
    P(g, redD, 3, 24, 16, 4);
    P(g, '#fff3b0', 4, 1, 3, 2);
    P(g, '#fff3b0', 15, 1, 3, 2);
    P(g, '#ff4a3a', 4, 26, 3, 2);
    P(g, '#ff4a3a', 15, 26, 3, 2);
    // parabrisas
    P(g, O, 4, 8, 14, 4);
    P(g, '#22324f', 5, 9, 12, 2);
    P(g, '#7aa0d0', 6, 9, 3, 1);
    // descapotable: Kael al volante (pelo naranja visto desde arriba) y el asiento de al lado
    P(g, '#3a2a20', 5, 12, 12, 9);
    P(g, '#6b4a2a', 12, 14, 4, 5);
    P(g, '#5a3d22', 12, 18, 4, 1);
    oell(g, '#e0782e', 8, 16, 2.5, 3);
    P(g, '#b8551e', 7, 18, 3, 1);
    P(g, '#f3a060', 7, 14, 2, 1);
    P(g, redD, 5, 21, 12, 1);
    // arma montada en el lateral derecho, apuntando hacia delante
    P(g, O, 19, 9, 4, 3);
    P(g, '#7d838b', 19, 10, 3, 1);
    P(g, O, 22, 0, 5, 16);
    P(g, '#7d838b', 23, 1, 3, 14);
    P(g, '#a4aab1', 23, 1, 1, 14);
    P(g, '#1d1d22', 23, 0, 3, 1);
    return c;
  }

  // ---------- monstruo en el estilo de los personajes del juego (de frente, cabezón) ----------
  function makeMonster(leg, roar, flash) {
    const { c, g } = mk(56, 60);
    const blobs = [];
    const legs = leg ? [[20, 3], [36, 0]] : [[20, 0], [36, 3]];
    legs.forEach(([x, lift]) => {
      blobs.push([x, 50 - lift, 6, 6, M.pants, M.pantsD]);
      blobs.push([x, 56 - lift, 7, 3, M.skin, M.skinD]);
    });
    blobs.push([28, 37, 19, 13, M.skin, M.skinD]);
    blobs.push([11, 30, 8, 7, M.skin, M.skinD], [45, 30, 8, 7, M.skin, M.skinD]);
    blobs.push([28, 25, 7, 4, M.skin, M.skinD]);
    const swing = leg ? 3 : -3;
    const fists = [[6, 46 + swing], [50, 46 - swing]];
    [[10, 33], [46, 33]].forEach(([sx, sy], i) => {
      const [ex, ey] = fists[i];
      for (let k = 0; k <= 1; k += 1 / 4) blobs.push([sx + (ex - sx) * k, sy + (ey - sy) * k, 5 - k, 5 - k, M.skin, M.skinD]);
      blobs.push([ex, ey + 2, 5, 4.5, M.skin, M.skinD]);
    });
    blobs.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    blobs.forEach(([x, y, rx, ry, col, colD]) => {
      ell(g, colD, x, y, rx, ry);
      ell(g, col, x - 0.5, y - 1, rx - 1, ry - 1);
    });
    // músculos, barriga y pantalón roto
    ell(g, M.skinL, 28, 41, 8, 5);
    P(g, M.skinD, 18, 32, 8, 1); P(g, M.skinD, 30, 32, 8, 1);
    P(g, M.skinD, 27, 29, 2, 8);
    ell(g, O, 28, 47, 16, 4);
    ell(g, M.pants, 28, 46.5, 15, 3);
    for (let x = 15; x < 42; x += 4) P(g, M.pants, x, 50, 2, 1);
    P(g, M.pantsD, 15, 45, 26, 1);
    fists.forEach(([x, y]) => [-3, 0, 3].forEach(dx => { P(g, O, x + dx - 1, y + 6, 2, 3); P(g, M.claw, x + dx - 1, y + 6, 1, 2); }));
    [[7, 25], [12, 23], [44, 23], [49, 25]].forEach(([x, y]) => {
      P(g, O, x - 1, y - 4, 3, 5);
      P(g, M.claw, x, y - 3, 1, 3);
    });

    // cabeza de hombre: pelo blanco alborotado por detrás
    const tufts = [[28, 8, 11, 6], [18, 13, 5, 7], [38, 13, 5, 7], [22, 4, 4, 3], [34, 4, 4, 3]];
    tufts.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    tufts.forEach(([x, y, rx, ry]) => { ell(g, M.hairD, x, y, rx, ry); ell(g, M.hair, x - 0.5, y - 0.5, rx - 1, ry - 1); });
    [[13, 8], [42, 8], [27, 0]].forEach(([x, y]) => { P(g, O, x - 1, y, 3, 3); P(g, M.hair, x, y + 1, 1, 1); });
    oell(g, M.faceD, 19, 16, 2, 2.5);
    oell(g, M.faceD, 37, 16, 2, 2.5);
    oell(g, M.faceD, 28, 16, 8, 8);
    ell(g, M.face, 27.5, 15.5, 7, 7);
    // flequillo
    ell(g, O, 28, 9, 8, 3);
    ell(g, M.hair, 28, 8.5, 7, 2);
    // ojos rojos de furia y cejas blancas
    [[22, 1], [30, -1]].forEach(([x]) => {
      P(g, O, x, 13, 5, 4);
      P(g, '#ffffff', x + 1, 14, 3, 2);
      P(g, '#d23c3c', x + 2, 14, 1, 2);
    });
    for (let i = 0; i < 4; i++) {
      P(g, M.hair, 21 + i, 11 + (i >> 1), 1, 2);
      P(g, M.hair, 35 - i, 11 + (i >> 1), 1, 2);
    }
    P(g, M.faceDD, 27, 16, 2, 2);
    // boca y bigote
    if (roar) {
      P(g, O, 24, 19, 8, 5);
      P(g, '#6a1414', 25, 20, 6, 3);
      P(g, '#ffffff', 25, 20, 6, 1);
    } else {
      P(g, O, 24, 20, 8, 3);
      P(g, '#ffffff', 25, 21, 6, 1);
    }
    P(g, M.hair, 24, 18, 8, 2);
    P(g, M.hair, 23, 19, 1, 2);
    P(g, M.hair, 32, 19, 1, 2);

    if (flash) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, 56, 60);
      g.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  let art = null;
  function loadArt() {
    if (art) return art;
    const tiles = buildTiles();
    const monster = {};
    for (const key of ['000', '001', '010', '011', '100', '101', '110', '111']) {
      monster[key] = makeMonster(key[0] === '1', key[1] === '1', key[2] === '1');
    }
    art = {
      ground: buildGround(tiles),
      statics: Art.buildStatics({ tiles }),
      cars: [makeCar(0), makeCar(1)],
      monster,
    };
    return art;
  }

  // ---------- estado y avance ----------
  // w.y: fila del mapa (px) en lo alto de la pantalla; baja sin parar porque el coche avanza hacia arriba.
  function init(st) {
    loadArt();
    st.w = { y: 0, camX: 0 };
    scroll(st);
  }

  function scroll(st) {
    const w = st.w;
    w.y -= SPEED;
    // la cámara sigue el camino a la altura del coche, así las curvas no lo sacan de la carretera
    w.camX = clamp(center(w.y + CAR_BASE - 12) - VW / 2, 0, MAP_W - VW);
    // polvo de las ruedas traseras y de los pies del monstruo
    if (st.t % 3 === 0) {
      const x = st.car.x + (st.t % 6 ? -9 : 7);
      st.parts.push({ kind: 'smoke', col: DUST, x, y: CAR_BASE - 4, vx: rand(-0.3, 0.3), vy: rand(1.2, 1.8), r: 1.5, life: 18, max: 18 });
    }
    if (!st.mon.dead && st.t % 9 === 0) {
      const x = st.mon.x + ((st.t / 9) & 1 ? -8 : 8);
      st.parts.push({ kind: 'smoke', col: DUST, x, y: MON_BASE - 1, vx: rand(-0.4, 0.4), vy: rand(1.5, 2.2), r: 2, life: 22, max: 22 });
    }
  }

  const gun = st => ({ x: st.car.x + GUN_DX, y: GUN_Y });
  const exhaust = st => ({ x: st.car.x - 4, y: CAR_BASE - 2, vx: rand(-0.2, 0.2), vy: rand(1.4, 2), r: 1.5 });
  const monsterTarget = (st, sway) => clamp(center(st.w.y + MON_BASE - 10) - st.w.camX + 44 * sway, 60, VW - 60);
  // Vista cenital: las balas suben en línea recta.
  const bulletPos = (b, p) => ({ x: b.x0, y: b.y0 + (AIM_Y - b.y0) * p, size: 1 });

  // ---------- dibujo ----------
  function drawBullet(g, b) {
    const { x, y } = bulletPos(b, b.p);
    const fade = b.p > 1.4 ? Math.max(0, 1 - (b.p - 1.4) / 0.4) : 1;
    g.globalAlpha = fade;
    P(g, 'rgba(255,150,60,0.35)', x - 1, y + 4, 2, 6);
    P(g, 'rgba(255,190,80,0.6)', x - 1, y + 2, 2, 3);
    P(g, O, x - 2, y - 2, 4, 5);
    P(g, '#ffd05a', x - 1, y - 1, 2, 3);
    P(g, '#fff3b0', x - 1, y - 1, 1, 2);
    g.globalAlpha = 1;
  }

  function drawMonster(st, g) {
    const m = st.mon;
    const step = Math.floor(st.t / 8) % 2;
    const bob = step ? 1 : 0;
    const jitter = st.state === 'dying' ? Math.round(rand(-1, 1)) : 0;
    ell(g, 'rgba(0,0,0,0.25)', m.x, MON_BASE - 2, 22, 4);
    const img = art.monster[`${step}${m.roar > 0 ? 1 : 0}${m.flash > 0 && (m.flash & 2) ? 1 : 0}`];
    g.drawImage(img, Math.round(m.x - 28) + jitter, Math.round(MON_BASE - 59 - bob - m.knock));
  }

  function drawCar(st, g) {
    const car = st.car;
    const bob = (st.t >> 3) & 1;
    g.drawImage(art.cars[(st.t >> 1) & 1], Math.round(car.x - 11), Math.round(CAR_BASE - 31 + bob + car.recoil));
    if (car.flash > 0) {
      const fx = car.x + GUN_DX, fy = GUN_Y - 3 + bob;
      ell(g, '#ff9a3a', fx, fy, 3, 4);
      ell(g, '#fff3b0', fx, fy, 1.5, 2.5);
    }
  }

  function draw(st, g) {
    const w = st.w;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1f4f24';
    g.fillRect(0, 0, VW, VH);
    g.save();
    g.translate(...Battle.shakeOffset(st));
    const oy = Math.round(mod(w.y, LEN)), camX = Math.round(w.camX);
    g.drawImage(art.ground, -camX, -oy);
    g.drawImage(art.ground, -camX, -oy + LEN);

    // árboles, monstruo y coche ordenados por su base, como en el resto del juego
    const list = [];
    [0, 1, -1].forEach(k => art.statics.forEach(o => {
      const y = o.dy - oy + k * LEN;
      if (y > VH || y + o.img.height < 0) return;
      list.push({ img: o.img, x: o.dx - camX, y, base: o.base - oy + k * LEN });
    }));
    if (!st.mon.dead) list.push({ fn: drawMonster, base: MON_BASE });
    list.push({ fn: drawCar, base: CAR_BASE });
    list.sort((a, b) => a.base - b.base);
    list.forEach(o => (o.fn ? o.fn(st, g) : g.drawImage(o.img, o.x, o.y)));

    st.bullets.forEach(b => drawBullet(g, b));
    Battle.drawParticles(st, g);
    g.restore();
  }

  return {
    name: 'Cenital',
    carStartX: VW / 2, carMin: VW / 2 - 70, carMax: VW / 2 + 64,
    bulletFrames: 14, bulletEnd: 1.8, hitHalfW: 20,
    monArea: { hw: 20, y0: MON_BASE - 52, y1: MON_BASE - 10, fx: 0.6 },
    init, scroll, gun, exhaust, bulletPos, monsterTarget, draw,
  };
})();
