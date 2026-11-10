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
  const DECEL = 0.02;                   // frenada al llegar a Simone (px/frame²)
  const BRAKE = (SPEED * SPEED) / (2 * DECEL); // distancia de frenada
  const INTRO_FRAMES = 150;             // frames a toda velocidad antes de empezar a frenar
  const CAR_BASE = 208;                 // base del coche en pantalla
  const MON_BASE = 104;                 // pies del monstruo en pantalla
  const GUN_DX = 13;
  const SCENE_LIFT = 40;                // en las escenas el coche sube para que no lo tape el cuadro de diálogo
  const carY = st => CAR_BASE - st.car.lift; // base del coche ahora mismo
  const AIM_Y = MON_BASE - 30;          // altura del pecho del monstruo
  const SCENE_MON_LIFT = 24;            // en la escena final el monstruo se aleja (sube) para dejar sitio a la moto
  const monY = st => MON_BASE - st.mon.lift; // pies del monstruo ahora mismo
  const DUST = '#c49a5e';

  const mod = (a, n) => ((a % n) + n) % n;
  // Centro del camino (px del mapa) para una fila y; periódico en LEN para que el bucle no tenga costura.
  const center = y => MAP_W / 2 + 50 * Math.sin((2 * Math.PI * y) / LEN) + 18 * Math.sin((4 * Math.PI * y) / LEN + 1.3);
  // Carretera recta del final (scenes/scene_sharon.js): el centro no se mueve.
  const straightCenter = () => MAP_W / 2;
  const roadCenter = (st, y) => (st.straight ? straightCenter : center)(y);

  // ---------- mapa del bucle ----------
  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function buildTiles(mid) {
    const roadCol = row => Math.round(mid(row * T + T / 2) / T);
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
        else if (dist >= 3 && k < 0.12) row += 'T';
        else if (dist >= 2 && k < 0.2) row += 'b';
        else if (dist >= 2 && k < 0.3) row += 'r';
        else row += k > 0.97 ? ',' : '.';
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
    dry(c, (x, y) => greenPatch(x, y));
    return c;
  }

  // ---------- zona seca ----------
  // Manchas donde aún queda algo de verde (0 = seco del todo, 1 = verde); periódicas en LEN para el bucle.
  const greenPatch = (x, y) => {
    const a = (2 * Math.PI * y) / LEN;
    const n = Math.sin(a * 5 + x * 0.021) + Math.sin(a * 9 - x * 0.034 + 2) * 0.7 + Math.sin(a * 3 + x * 0.05 + 4) * 0.5;
    return clamp((n - 0.9) / 0.8, 0, 1);
  };
  const STRAW = [[110, 86, 46], [168, 138, 78], [214, 188, 120]]; // oscuro, medio, claro
  const OLIVE = [[72, 84, 40], [112, 124, 58], [150, 160, 84]];
  const mixCol = (pal, l) => {
    const i = l < 0.5 ? 0 : 1, k = l < 0.5 ? l * 2 : (l - 0.5) * 2;
    return pal[i].map((v, j) => v + (pal[i + 1][j] - v) * k);
  };
  // Pasa los verdes a tonos de hierba seca; green(x, y) dice cuánto verde (oliva) se conserva en cada sitio.
  function dry(canvas, green) {
    const g = canvas.getContext('2d');
    const im = g.getImageData(0, 0, canvas.width, canvas.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      if (d[i + 3] === 0 || gr < r + 6 || gr < b) continue; // solo lo verde
      const p = i / 4, x = p % canvas.width, y = (p / canvas.width) | 0;
      const l = clamp((gr - 40) / 170, 0, 1);
      const keep = green(x, y);
      const a = mixCol(STRAW, l), o = mixCol(OLIVE, l);
      d[i] = a[0] + (o[0] - a[0]) * keep;
      d[i + 1] = a[1] + (o[1] - a[1]) * keep;
      d[i + 2] = a[2] + (o[2] - a[2]) * keep;
    }
    g.putImageData(im, 0, 0);
    return canvas;
  }

  // Árboles y matojos secos: copia de cada imagen con los verdes cambiados (los árboles conservan algo de verde).
  function dryStatics(statics) {
    const cache = new Map();
    return statics.map(o => {
      if (!cache.has(o.img)) {
        const { c, g } = mk(o.img.width, o.img.height);
        g.drawImage(o.img, 0, 0);
        const tree = o.img.height > 24;
        cache.set(o.img, dry(c, () => (tree ? 0.55 : 0.15)));
      }
      return { ...o, img: cache.get(o.img) };
    });
  }

  // ---------- coche visto desde arriba (el morro apunta hacia arriba) ----------
  function makeCar(f) {
    const { c, g } = mk(28, 32);
    const red = '#d6c29a', redD = '#a48f68', redL = '#efe2c4'; // carrocería beige
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
    // descapotable con el habitáculo negro: Anthon al volante (visto desde arriba) y el asiento de al lado
    P(g, '#141418', 5, 12, 12, 9);
    P(g, '#2c2c33', 12, 14, 4, 5);
    P(g, '#202026', 12, 18, 4, 1);
    oell(g, '#f0b48c', 8, 16, 2.5, 3); // cabeza calva vista desde arriba
    P(g, '#d99a70', 7, 18, 3, 1); // nuca
    P(g, '#f8d0b0', 7, 14, 2, 1);
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

  // ---------- monstruo: Simone convertido en un gigantón (de frente, cabezón, en el estilo del juego) ----------
  function makeMonster(leg, roar, flash) {
    const { c, g } = mk(56, 60);
    const blobs = [];
    // vaqueros y zapatillas blancas
    const legs = leg ? [[21, 3], [35, 0]] : [[21, 0], [35, 3]];
    legs.forEach(([x, lift]) => {
      blobs.push([x, 50 - lift, 6, 6, M.pants, M.pantsD]);
      blobs.push([x, 56 - lift, 6, 3, M.shoe, M.shoeD]);
    });
    // torso con la camiseta negra a punto de reventar
    blobs.push([28, 38, 18, 12, M.shirt, M.shirtD]);
    blobs.push([28, 25, 7, 4, M.skin, M.skinD]); // cuello de toro
    // hombros y brazos enormes, ya sin mangas
    blobs.push([11, 30, 8, 7, M.skin, M.skinD], [45, 30, 8, 7, M.skin, M.skinD]);
    const swing = leg ? 3 : -3;
    const fists = [[6, 46 + swing], [50, 46 - swing]];
    [[10, 33], [46, 33]].forEach(([sx, sy], i) => {
      const [ex, ey] = fists[i];
      for (let k = 0; k <= 1; k += 1 / 4) blobs.push([sx + (ex - sx) * k, sy + (ey - sy) * k, 6 - k, 6 - k, M.skin, M.skinD]);
      blobs.push([ex, ey + 2, 5.5, 5, M.skin, M.skinD]);
    });
    blobs.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    blobs.forEach(([x, y, rx, ry, col, colD]) => {
      ell(g, colD, x, y, rx, ry);
      ell(g, col, x - 0.5, y - 1, rx - 1, ry - 1);
    });

    // pectorales marcados bajo la camiseta y jirones por donde asoma la piel
    ell(g, M.shirtL, 21, 34, 6, 3.5);
    ell(g, M.shirtL, 35, 34, 6, 3.5);
    P(g, M.shirtD, 27, 31, 2, 9);
    [[20, 44, 3, 1.5], [35, 42, 2.5, 1.5], [29, 47, 3.5, 1.2]].forEach(([x, y, rx, ry]) => {
      oell(g, M.skin, x, y, rx, ry);
      P(g, M.skinD, Math.round(x - rx + 1), Math.round(y + ry - 1), Math.round(rx * 2 - 1), 1);
    });
    // bordes rotos de las mangas
    [[16, 27], [18, 29], [38, 27], [36, 29]].forEach(([x, y]) => { P(g, O, x, y, 2, 2); P(g, M.shirt, x, y, 1, 1); });
    // músculos y venas en los brazos
    ell(g, M.skinL, 10, 28, 4, 2.5);
    ell(g, M.skinL, 46, 28, 4, 2.5);
    [[7, 36], [8, 39], [48, 36], [47, 39]].forEach(([x, y]) => P(g, M.skinD, x, y, 1, 3));
    // nudillos
    fists.forEach(([x, y]) => [-3, 0, 3].forEach(dx => P(g, M.skinD, x + dx, y + 5, 1, 2)));
    // cinturón
    P(g, O, 13, 49, 30, 1);

    // cabeza de Simone: orejas, cara, pelo corto canoso con los lados rapados
    oell(g, M.skin, 18, 15, 2, 3);
    oell(g, M.skin, 38, 15, 2, 3);
    oell(g, M.skinD, 28, 15, 9, 9);
    ell(g, M.skin, 27.5, 14.5, 8, 8);
    ell(g, O, 28, 6, 9.5, 5);
    ell(g, M.hairD, 28, 6, 9, 4.5);
    ell(g, M.hair, 27.5, 5, 8, 3.5);
    [[22, 2], [26, 1], [30, 1], [34, 2]].forEach(([x, y]) => { P(g, O, x, y - 1, 2, 1); P(g, M.hairL, x, y, 2, 1); });
    P(g, M.hairD, 19, 9, 2, 4);
    P(g, M.hairD, 35, 9, 2, 4);
    // patillas y barba poblada, con canas en la barbilla
    P(g, M.beard, 19, 15, 2, 4);
    P(g, M.beard, 35, 15, 2, 4);
    ell(g, M.beardD, 28, 21.5, 8.5, 3.5);
    ell(g, M.beard, 28, 21, 7.5, 3);
    P(g, M.hairL, 26, 23, 4, 1);
    P(g, M.hairL, 27, 24, 2, 1);
    // mejillas coloradas
    P(g, M.skinL, 21, 16, 2, 1);
    P(g, M.skinL, 33, 16, 2, 1);
    // cejas furiosas y ojos azules que brillan
    for (let i = 0; i < 4; i++) {
      P(g, M.beardD, 21 + i, 10 + (i >> 1), 1, 2);
      P(g, M.beardD, 34 - i, 10 + (i >> 1), 1, 2);
    }
    [21, 30].forEach(x => {
      P(g, O, x, 12, 5, 4);
      P(g, '#ffffff', x + 1, 13, 3, 2);
      P(g, M.eye, x + 2, 13, 1, 2);
    });
    // nariz, con restos de polvo blanco
    P(g, M.skinD, 27, 14, 2, 3);
    P(g, '#ffffff', 26, 17);
    P(g, '#ffffff', 29, 17);
    // bigote y sonrisa malvada (o rugido)
    P(g, M.beardD, 23, 18, 10, 1);
    if (roar) {
      P(g, O, 22, 19, 12, 5);
      P(g, '#6a1414', 23, 20, 10, 3);
      P(g, '#ffffff', 23, 20, 10, 1);
      P(g, '#ffffff', 24, 22, 8, 1);
    } else {
      P(g, O, 22, 19, 12, 3);
      P(g, '#ffffff', 23, 20, 10, 1);
      [25, 28, 31].forEach(x => P(g, '#c8c0b0', x, 20));
      P(g, O, 21, 18);
      P(g, O, 34, 18);
    }

    if (flash) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, 56, 60);
      g.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  // ---------- jeringuilla que lanza el monstruo (dibujada con la aguja hacia abajo) ----------
  function makeSyringe() {
    const { c, g } = mk(7, 18);
    // émbolo
    P(g, O, 0, 0, 7, 2);
    P(g, '#c8ccd4', 1, 0, 5, 1);
    P(g, O, 2, 2, 3, 3);
    P(g, '#c8ccd4', 3, 2, 1, 3);
    // cuerpo con el líquido verde del monstruo
    orect(g, '#eef6fa', 1, 5, 5, 8);
    P(g, '#7dde4a', 2, 8, 3, 5);
    P(g, '#b4f08a', 2, 8, 1, 5);
    P(g, '#ffffff', 2, 6, 1, 1);
    // aguja
    P(g, O, 3, 13, 1, 1);
    P(g, '#c8ccd4', 3, 14, 1, 4);
    return c;
  }

  // ---------- moto de Gabi vista desde arriba (el morro hacia arriba) ----------
  function makeBike() {
    const { c, g } = mk(16, 30);
    const body = '#c0392b', bodyL = '#e8644e', red = '#ffd05a';
    ell(g, 'rgba(0,0,0,0.25)', 8, 28, 6, 2);
    orect(g, '#26262c', 6, 20, 4, 9); // rueda trasera
    P(g, '#4a4a55', 7, 22, 2, 1);
    P(g, '#4a4a55', 7, 25, 2, 1);
    orect(g, '#26262c', 6, 1, 4, 7); // rueda delantera
    P(g, '#4a4a55', 7, 3, 2, 1);
    orect(g, body, 5, 7, 6, 14); // depósito y asiento
    P(g, bodyL, 6, 8, 1, 11);
    P(g, red, 5, 9, 6, 2);
    P(g, '#1a1a1e', 5, 16, 6, 4);
    P(g, '#7d838b', 11, 19, 2, 7); // tubo de escape
    P(g, '#fff3b0', 7, 0, 2, 1); // faro
    return c;
  }
  // manillar (se dibuja encima del piloto para que se vean los puños)
  function drawBars(g, x, y) {
    P(g, O, x - 7, y, 14, 2);
    P(g, '#a4aab1', x - 6, y, 12, 1);
    P(g, O, x - 8, y - 1, 2, 3);
    P(g, O, x + 6, y - 1, 2, 3);
  }

  // Copia de una imagen teñida de un color (para el parpadeo del coche al recibir un golpe).
  function tint(img, col) {
    const { c, g } = mk(img.width, img.height);
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = col;
    g.fillRect(0, 0, img.width, img.height);
    return c;
  }

  let art = null;
  function loadArt() {
    if (art) return art;
    const tiles = buildTiles(center);
    const monster = {};
    for (const key of ['000', '001', '010', '011', '100', '101', '110', '111']) {
      monster[key] = makeMonster(key[0] === '1', key[1] === '1', key[2] === '1');
    }
    const cars = [makeCar(0), makeCar(1)];
    art = {
      ground: buildGround(tiles),
      statics: dryStatics(Art.buildStatics({ tiles })),
      cars,
      carsHurt: cars.map(c => tint(c, 'rgba(255,70,50,0.65)')),
      monster,
      simone: Art.charSheet(CHARACTERS.simone).down[0],
      syringe: makeSyringe(),
      bike: makeBike(),
      bikeHit: tint(makeBike(), 'rgba(255,255,255,0.8)'),
      // Gabi con capucha y sin ella (mismo personaje, sin la capucha)
      gabi: Art.charSheet(CHARACTERS.gabi),
      gabiBare: Art.charSheet({ ...CHARACTERS.gabi, id: 'gabi_bare', hood: null }),
    };
    return art;
  }

  // Suelo y árboles de la carretera recta (solo se generan si hacen falta).
  function straightArt() {
    if (!art.straight) {
      const tiles = buildTiles(straightCenter);
      art.straight = { ground: buildGround(tiles), statics: dryStatics(Art.buildStatics({ tiles })) };
    }
    return art.straight;
  }
  const road = st => (st.straight ? straightArt() : art);

  // ---------- estado y avance ----------
  // w.y: fila del mapa (px) en lo alto de la pantalla; baja sin parar porque el coche avanza hacia arriba.
  function init(st) {
    loadArt();
    if (st.straight) straightArt();
    st.w = { y: 0, camX: 0, speed: SPEED };
    if (st.state === 'intro') {
      // Simone espera más adelante en el camino; el coche frena hasta tenerlo donde luego estará el monstruo
      st.w.stopY = -(SPEED * INTRO_FRAMES + BRAKE);
      st.w.simY = st.w.stopY + MON_BASE;
    }
    scroll(st);
  }

  function scroll(st) {
    const w = st.w;
    if (st.state === 'intro') {
      const d = w.y - w.stopY;
      w.speed = Math.min(SPEED, Math.sqrt(2 * DECEL * Math.max(0, d)));
      if (d <= 0.5) { w.speed = 0; w.y = w.stopY; w.stopped = true; }
    } else if (st.state === 'drive') {
      // final: va recto; la acción `brake` lo para y `go` lo vuelve a arrancar
      w.speed = st.braking ? Math.max(0, w.speed - DECEL * 2) : Math.min(SPEED, w.speed + 0.04);
    } else w.speed = Math.min(SPEED, w.speed + 0.04); // arranca poco a poco tras la escena
    w.y -= w.speed;
    // la cámara sigue el camino a la altura del coche, así las curvas no lo sacan de la carretera
    w.camX = clamp(roadCenter(st, w.y + CAR_BASE - 12) - VW / 2, 0, MAP_W - VW);
    // polvo de las ruedas traseras y de los pies del monstruo
    if (w.speed > 0.3 && st.t % 3 === 0) {
      const x = st.car.x + (st.t % 6 ? -9 : 7);
      st.parts.push({ kind: 'smoke', col: DUST, x, y: carY(st) - 4, vx: rand(-0.3, 0.3), vy: rand(1.2, 1.8), r: 1.5, life: 18, max: 18 });
    }
    if (!st.mon.dead && !st.mon.human && st.state !== 'intro' && st.t % 9 === 0) {
      const x = st.mon.x + ((st.t / 9) & 1 ? -8 : 8);
      st.parts.push({ kind: 'smoke', col: DUST, x, y: monY(st) - 1, vx: rand(-0.4, 0.4), vy: rand(1.5, 2.2), r: 2, life: 22, max: 22 });
    }
  }

  const gun = st => ({ x: st.car.x + GUN_DX, y: carY(st) - 31 });
  const exhaust = st => ({ x: st.car.x - 4, y: carY(st) - 2, vx: rand(-0.2, 0.2), vy: rand(1.4, 2), r: 1.5 });
  // humo negro del capó cuando el coche está tocado
  const hood = st => ({ x: st.car.x + rand(-4, 4), y: carY(st) - 27, vx: rand(-0.6, 0.6), vy: rand(1.4, 2), r: 3 });
  const carHitY = st => carY(st) - 16;
  const hand = (st, side) => ({ x: st.mon.x + side * 22, y: monY(st) - 12 });
  const aimY = st => monY(st) - 30;
  const simoneX = st => center(st.w.simY - 10) - st.w.camX;
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
    const step = st.state === 'intro' ? 0 : Math.floor(st.t / 8) % 2;
    const bob = step ? 1 : 0;
    const jitter = st.state === 'dying' ? Math.round(rand(-1, 1)) : 0;
    ell(g, 'rgba(0,0,0,0.25)', m.x, monY(st) - 2, 22, 4);
    const img = art.monster[`${step}${m.roar > 0 || m.throwAnim > 0 ? 1 : 0}${m.flash > 0 && (m.flash & 2) ? 1 : 0}`];
    g.drawImage(img, Math.round(m.x - 28) + jitter, Math.round(monY(st) - 59 - bob - m.knock));
  }

  // Simone (antes de transformarse), de pie en el camino mirando al coche
  function drawSimone(st, g) {
    const x = Math.round(simoneX(st)), y = Math.round(st.w.simY - st.w.y);
    ell(g, 'rgba(0,0,0,0.25)', x, y - 1, 6, 2);
    g.drawImage(art.simone, x - 8, y - 24);
  }

  function drawCar(st, g) {
    const car = st.car;
    const bob = (st.t >> 3) & 1;
    const img = (car.hurt > 0 && (car.hurt >> 1) & 1 ? art.carsHurt : art.cars)[(st.t >> 1) & 1];
    const x = Math.round(car.x - 11), y = Math.round(carY(st) - 31 + bob + car.recoil);
    if (car.angle) {
      // derrapando: gira sobre su centro
      g.save();
      g.translate(x + 11, y + 16);
      g.rotate(car.angle);
      g.drawImage(img, -11, -16);
      g.restore();
      return;
    }
    g.drawImage(img, x, y);
    if (car.flash > 0) {
      const fx = car.x + GUN_DX, fy = carY(st) - 34 + bob;
      ell(g, '#ff9a3a', fx, fy, 3, 4);
      ell(g, '#fff3b0', fx, fy, 1.5, 2.5);
    }
  }

  // Jeringuilla orientada hacia donde vuela (la gorda del golpe final, al doble de tamaño).
  function drawSyringe(st, g, s) {
    const { x, y } = Battle.syringePos(s);
    const fade = s.p > 1.2 ? Math.max(0, 1 - (s.p - 1.2) / 0.4) : 1;
    const k = s.big ? 2 : 1;
    g.save();
    g.globalAlpha = fade;
    g.translate(Math.round(x), Math.round(y));
    g.rotate(Math.atan2(s.y1 - s.y0, s.x1 - s.x0) - Math.PI / 2);
    g.drawImage(art.syringe, Math.round(-3.5 * k), -16 * k, 7 * k, 18 * k);
    g.restore();
  }

  // Gabi en su moto: con la capucha (o sin ella), de espaldas o girado hacia el coche.
  function drawBike(st, g) {
    const b = st.bike;
    const x = Math.round(b.x), y = Math.round(b.y);
    g.save();
    g.translate(x, y);
    if (b.angle) g.rotate(b.angle);
    g.drawImage(b.flash > 0 && (b.flash & 2) ? art.bikeHit : art.bike, -8, -30);
    // piloto: solo cabeza y torso, sentado en la moto
    const sheet = b.cover ? art.gabi : art.gabiBare;
    g.drawImage(sheet[b.look][0], 0, 0, 16, 15, -8, -32, 16, 15);
    drawBars(g, 0, -23);
    g.restore();
  }

  function drawShot(g, s) {
    const x = Math.round(s.x), y = Math.round(s.y);
    P(g, O, x - 2, y - 2, 4, 4);
    P(g, '#ffd05a', x - 1, y - 1, 2, 2);
    P(g, '#fff3b0', x - 1, y - 1, 1, 1);
  }

  function draw(st, g) {
    const w = st.w;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#6e5630';
    g.fillRect(0, 0, VW, VH);
    g.save();
    g.translate(...Battle.shakeOffset(st));
    const oy = Math.round(mod(w.y, LEN)), camX = Math.round(w.camX);
    const { ground, statics } = road(st);
    g.drawImage(ground, -camX, -oy);
    g.drawImage(ground, -camX, -oy + LEN);

    // árboles, monstruo y coche ordenados por su base, como en el resto del juego
    const list = [];
    [0, 1, -1].forEach(k => statics.forEach(o => {
      const y = o.dy - oy + k * LEN;
      if (y > VH || y + o.img.height < 0) return;
      list.push({ img: o.img, x: o.dx - camX, y, base: o.base - oy + k * LEN });
    }));
    if (st.mon.human) list.push({ fn: drawSimone, base: st.w.simY - w.y });
    else if (!st.mon.dead) list.push({ fn: drawMonster, base: monY(st) });
    list.push({ fn: drawCar, base: carY(st) });
    if (st.bike) list.push({ fn: drawBike, base: st.bike.y });
    list.sort((a, b) => a.base - b.base);
    list.forEach(o => (o.fn ? o.fn(st, g) : g.drawImage(o.img, o.x, o.y)));

    st.bullets.forEach(b => drawBullet(g, b));
    st.shots.forEach(s => drawShot(g, s));
    st.syringes.forEach(s => drawSyringe(st, g, s));
    Battle.drawParticles(st, g);
    g.restore();
  }

  return {
    name: 'Top-down',
    width: VW,
    carStartX: VW / 2, carMin: VW / 2 - 70, carMax: VW / 2 + 64, sceneCarX: VW / 2 - 18,
    bulletFrames: 14, bulletEnd: 1.8, hitHalfW: 20,
    carHalfW: 12, aimY, sceneLift: SCENE_LIFT, sceneMonLift: SCENE_MON_LIFT,
    bike: { dx: 36, ahead: -14, beside: 2, enterY: VH + 34 },
    monArea: { hw: 20, y0: MON_BASE - 52, y1: MON_BASE - 10, fx: 0.6 },
    init, scroll, carY, carHitY, gun, exhaust, hood, hand, bulletPos, monsterTarget, simoneX, draw,
  };
})();
