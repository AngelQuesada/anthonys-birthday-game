'use strict';

// Todo el pixel art se genera por código sobre canvas pequeños que luego se escalan.
const Art = (() => {
  const T = 16;
  const O = '#2b1d16'; // contorno

  const C = {
    grass: '#74c044', grassD: '#5ba534', grassDD: '#478a2a', grassL: '#93d65e',
    path: '#dcb77e', pathD: '#c49a5e', pathDD: '#a97f47', pathL: '#ecd09c',
    water: '#3d8fd6', waterD: '#2e72b8', waterL: '#7cc3f0', foam: '#d8f1ff', bank: '#8a6a3c', bankD: '#6b4f2a',
    leaf: '#3f9a3c', leafD: '#2c7230', leafDD: '#1f4f24', leafL: '#62bd4f',
    trunk: '#7b5230', trunkD: '#553619', trunkL: '#9a6b40',
    wood: '#b8844f', woodD: '#7d552c', woodL: '#d9a56d',
    stone: '#a4aab1', stoneD: '#7d838b', stoneL: '#c9ced3',
    shadow: 'rgba(0,0,0,0.25)',
  };

  // ---------- utilidades ----------
  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  }

  function P(g, col, x, y, w = 1, h = 1) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  }

  // Rectángulo con contorno de esquinas redondeadas.
  function orect(g, col, x, y, w, h, o = O) {
    P(g, o, x - 1, y, w + 2, h);
    P(g, o, x, y - 1, w, h + 2);
    P(g, col, x, y, w, h);
  }

  function ell(g, col, cx, cy, rx, ry) {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.round(cx - hw);
      const x1 = Math.round(cx + hw);
      if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1);
    }
  }

  function oell(g, col, cx, cy, rx, ry, o = O) {
    ell(g, o, cx, cy, rx + 1, ry + 1);
    ell(g, col, cx, cy, rx, ry);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, gr = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255;
    const k = Math.abs(amt);
    r = Math.round(r + (f - r) * k);
    gr = Math.round(gr + (f - gr) * k);
    b = Math.round(b + (f - b) * k);
    return '#' + ((1 << 24) | (r << 16) | (gr << 8) | b).toString(16).slice(1);
  }

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hash = (x, y) => (x * 73856093) ^ (y * 19349663);

  function flipped(src) {
    const { c, g } = mk(src.width, src.height);
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  // ---------- suelo ----------
  const groundOf = ch => (ch === '=' ? 'path' : ch === '~' ? 'water' : 'grass');

  function grassTile(g, x0, y0, r, flowers) {
    P(g, C.grass, x0, y0, T, T);
    for (let i = 0; i < 10; i++) {
      P(g, r() < 0.5 ? C.grassD : C.grassL, x0 + ((r() * T) | 0), y0 + ((r() * T) | 0));
    }
    const tufts = r() < 0.6 ? 1 + ((r() * 2) | 0) : 0;
    for (let i = 0; i < tufts; i++) {
      const x = x0 + 1 + ((r() * 12) | 0);
      const y = y0 + 2 + ((r() * 11) | 0);
      P(g, C.grassDD, x, y);
      P(g, C.grassDD, x + 1, y + 1);
      P(g, C.grassDD, x + 2, y);
      P(g, C.grassL, x + 1, y);
    }
    if (flowers) {
      const cols = ['#ff6b6b', '#ffd93d', '#ffffff', '#c77dff', '#ff9ecd'];
      const n = 2 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const fx = x0 + 2 + ((r() * 12) | 0);
        const fy = y0 + 2 + ((r() * 12) | 0);
        const col = cols[(r() * cols.length) | 0];
        P(g, C.grassDD, fx, fy + 2);
        P(g, col, fx - 1, fy);
        P(g, col, fx + 1, fy);
        P(g, col, fx, fy - 1);
        P(g, col, fx, fy + 1);
        P(g, '#f7b733', fx, fy);
      }
    }
  }

  function pathTile(g, x0, y0, r, nb) {
    P(g, C.path, x0, y0, T, T);
    for (let i = 0; i < 9; i++) {
      P(g, r() < 0.5 ? C.pathD : C.pathL, x0 + ((r() * T) | 0), y0 + ((r() * T) | 0));
    }
    if (r() < 0.7) {
      const x = x0 + 2 + ((r() * 11) | 0), y = y0 + 3 + ((r() * 10) | 0);
      P(g, C.pathDD, x, y, 2, 1);
      P(g, C.pathL, x, y - 1, 2, 1);
    }
    // bordes de hierba
    for (let i = 0; i < T; i++) {
      if (!nb.u) { const h = 2 + (r() < 0.4 ? 1 : 0); P(g, C.grass, x0 + i, y0, 1, h); P(g, C.pathD, x0 + i, y0 + h, 1, 1); }
      if (!nb.d) { const h = 1 + (r() < 0.4 ? 1 : 0); P(g, C.grass, x0 + i, y0 + T - h, 1, h); P(g, C.grassD, x0 + i, y0 + T - h, 1, 1); }
      if (!nb.l) { const w = 1 + (r() < 0.4 ? 1 : 0); P(g, C.grass, x0, y0 + i, w, 1); P(g, C.pathD, x0 + w, y0 + i, 1, 1); }
      if (!nb.r) { const w = 1 + (r() < 0.4 ? 1 : 0); P(g, C.grass, x0 + T - w, y0 + i, w, 1); P(g, C.pathD, x0 + T - w - 1, y0 + i, 1, 1); }
    }
    // esquinas exteriores redondeadas
    const fix = (x, y, w, h) => P(g, C.grass, Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h));
    if (!nb.u && !nb.l) { fix(x0, y0, 4, 3); fix(x0, y0, 3, 4); }
    if (!nb.u && !nb.r) { fix(x0 + T, y0, -4, 3); fix(x0 + T, y0, -3, 4); }
    if (!nb.d && !nb.l) { fix(x0, y0 + T, 4, -3); fix(x0, y0 + T, 3, -4); }
    if (!nb.d && !nb.r) { fix(x0 + T, y0 + T, -4, -3); fix(x0 + T, y0 + T, -3, -4); }
    // esquinas interiores
    if (nb.u && nb.l && !nb.ul) P(g, C.grass, x0, y0, 2, 2);
    if (nb.u && nb.r && !nb.ur) P(g, C.grass, x0 + T - 2, y0, 2, 2);
    if (nb.d && nb.l && !nb.dl) P(g, C.grass, x0, y0 + T - 2, 2, 2);
    if (nb.d && nb.r && !nb.dr) P(g, C.grass, x0 + T - 2, y0 + T - 2, 2, 2);
  }

  function waterTile(g, x0, y0, seed, nb, frame) {
    const r = rng(seed);
    P(g, C.water, x0, y0, T, T);
    for (let i = 0; i < 6; i++) P(g, C.waterD, x0 + ((r() * T) | 0), y0 + ((r() * T) | 0));
    for (let i = 0; i < 3; i++) {
      const wx = (r() * T) | 0, wy = 3 + ((r() * 10) | 0), len = 3 + ((r() * 3) | 0);
      if ((i + frame) % 3 === 0) continue;
      const sx = (wx + frame) % (T - len);
      P(g, C.waterL, x0 + sx, y0 + wy, len, 1);
      P(g, C.waterD, x0 + sx + 1, y0 + wy + 1, len - 2, 1);
    }
    const shimmer = x => (x + frame * 2) % 5 !== 0;
    if (!nb.u) {
      P(g, C.grass, x0, y0, T, 2);
      P(g, C.bank, x0, y0 + 2, T, 3);
      P(g, C.bankD, x0, y0 + 4, T, 1);
      for (let i = 0; i < T; i++) if (shimmer(i)) P(g, C.foam, x0 + i, y0 + 5);
    }
    if (!nb.d) {
      for (let i = 0; i < T; i++) if (shimmer(i + 3)) P(g, C.foam, x0 + i, y0 + T - 3);
      P(g, C.grass, x0, y0 + T - 2, T, 2);
    }
    if (!nb.l) {
      P(g, C.grass, x0, y0, 2, T);
      P(g, C.bank, x0 + 2, y0, 1, T);
      for (let i = 0; i < T; i++) if (shimmer(i + 1)) P(g, C.foam, x0 + 3, y0 + i);
    }
    if (!nb.r) {
      P(g, C.grass, x0 + T - 2, y0, 2, T);
      P(g, C.bank, x0 + T - 3, y0, 1, T);
      for (let i = 0; i < T; i++) if (shimmer(i + 2)) P(g, C.foam, x0 + T - 4, y0 + i);
    }
    if (!nb.u && !nb.l) { P(g, C.grass, x0, y0, 5, 4); P(g, C.grass, x0, y0, 4, 6); }
    if (!nb.u && !nb.r) { P(g, C.grass, x0 + T - 5, y0, 5, 4); P(g, C.grass, x0 + T - 4, y0, 4, 6); }
    if (!nb.d && !nb.l) { P(g, C.grass, x0, y0 + T - 4, 5, 4); P(g, C.grass, x0, y0 + T - 5, 3, 5); }
    if (!nb.d && !nb.r) { P(g, C.grass, x0 + T - 5, y0 + T - 4, 5, 4); P(g, C.grass, x0 + T - 3, y0 + T - 5, 3, 5); }
  }

  function ground(tiles, frame) {
    const h = tiles.length, w = tiles[0].length;
    const { c, g } = mk(w * T, h * T);
    const typeAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : groundOf(tiles[y][x]));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = tiles[y][x];
        const type = groundOf(ch);
        const same = (dx, dy) => { const t = typeAt(x + dx, y + dy); return t === null || t === type; };
        const nb = {
          u: same(0, -1), d: same(0, 1), l: same(-1, 0), r: same(1, 0),
          ul: same(-1, -1), ur: same(1, -1), dl: same(-1, 1), dr: same(1, 1),
        };
        const seed = hash(x, y);
        const r = rng(seed);
        if (type === 'path') pathTile(g, x * T, y * T, r, nb);
        else if (type === 'water') waterTile(g, x * T, y * T, seed, nb, frame);
        else grassTile(g, x * T, y * T, r, ch === ',');
      }
    }
    return c;
  }

  // ---------- objetos ----------
  function makeTree(seed) {
    const r = rng(seed);
    const { c, g } = mk(32, 40);
    ell(g, C.shadow, 16, 36, 11, 3);
    P(g, O, 12, 24, 8, 13);
    P(g, C.trunk, 13, 24, 6, 12);
    P(g, C.trunkD, 17, 24, 2, 12);
    P(g, C.trunkL, 14, 27, 1, 7);
    P(g, O, 10, 35, 12, 2);
    P(g, C.trunk, 11, 35, 10, 1);
    const j = () => (r() - 0.5) * 2;
    const blobs = [
      [16 + j(), 12, 12, 10],
      [9 + j(), 18 + j(), 7, 6],
      [23 + j(), 18 + j(), 7, 6],
      [16, 21, 10, 6],
    ];
    blobs.forEach(([x, y, rx, ry]) => ell(g, O, x, y, rx + 1, ry + 1));
    blobs.forEach(([x, y, rx, ry]) => ell(g, C.leafD, x, y, rx, ry));
    blobs.forEach(([x, y, rx, ry]) => ell(g, C.leaf, x - 1, y - 1.5, rx - 1.5, ry - 1.5));
    ell(g, C.leafL, 12, 8, 4, 2.5);
    ell(g, C.leafL, 7, 15, 2, 1.5);
    ell(g, C.leafL, 21, 14, 2, 1.5);
    // textura de hojas dentro de la copa principal
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.8;
      const x = Math.round(16 + Math.cos(a) * 11 * k), y = Math.round(14 + Math.sin(a) * 9 * k);
      P(g, r() < 0.5 ? C.leafDD : C.leafL, x, y);
    }
    return c;
  }

  function makeBush() {
    const { c, g } = mk(T, T);
    ell(g, C.shadow, 8, 14, 6.5, 1.8);
    oell(g, C.leafD, 8, 9, 6.5, 5);
    ell(g, C.leaf, 7, 8, 5, 3.8);
    ell(g, C.leafL, 6, 6.5, 2.2, 1.4);
    P(g, '#e04a5a', 10, 9); P(g, '#e04a5a', 5, 10); P(g, '#e04a5a', 9, 12);
    P(g, '#ffb3bd', 10, 8);
    return c;
  }

  function makeRock() {
    const { c, g } = mk(T, T);
    ell(g, C.shadow, 8, 14, 6.5, 1.8);
    oell(g, C.stoneD, 8, 10, 6, 4.5);
    ell(g, C.stone, 7, 9, 5, 3.5);
    ell(g, C.stoneL, 6, 7.5, 2, 1.3);
    P(g, C.stoneD, 9, 10, 2, 1);
    P(g, C.stoneD, 11, 9);
    return c;
  }

  function makeSign() {
    const { c, g } = mk(T, T);
    ell(g, C.shadow, 8, 15, 4, 1.2);
    orect(g, C.trunk, 7, 9, 2, 6);
    orect(g, C.wood, 2, 3, 12, 7);
    P(g, C.woodL, 2, 3, 12, 1);
    P(g, C.woodD, 2, 9, 12, 1);
    P(g, C.woodD, 4, 5, 8, 1);
    P(g, C.woodD, 4, 7, 6, 1);
    return c;
  }

  function makeFence(l, r, u, d) {
    const { c, g } = mk(T, T);
    if (l || r) {
      const x0 = l ? 0 : 7, x1 = r ? T : 9;
      [5, 9].forEach(y => {
        P(g, O, x0, y - 1, x1 - x0, 4);
        P(g, C.wood, x0, y, x1 - x0, 2);
        P(g, C.woodL, x0, y, x1 - x0, 1);
      });
    }
    if (u || d) {
      const y0 = u ? 0 : 7, y1 = d ? T : 9;
      P(g, O, 6, y0, 4, y1 - y0);
      P(g, C.wood, 7, y0, 2, y1 - y0);
      P(g, C.woodD, 8, y0, 1, y1 - y0);
    }
    ell(g, C.shadow, 8, 14.5, 3.5, 1.2);
    orect(g, C.wood, 6, 3, 4, 11);
    P(g, C.woodL, 6, 3, 4, 1);
    P(g, C.woodD, 9, 4, 1, 10);
    return c;
  }

  function makeHouse(hs) {
    const W = hs.w * T, H = hs.h * T + 8;
    const { c, g } = mk(W, H);
    const roof = hs.roof || '#c8553d';
    const roofD = shade(roof, -0.25), roofDD = shade(roof, -0.5), roofL = shade(roof, 0.25);
    const wall = hs.wall || '#d4a26a';
    const wallD = shade(wall, -0.2), wallDD = shade(wall, -0.45);
    const wallTop = H - 32;

    // paredes de tablones
    P(g, O, 1, wallTop, W - 2, 32);
    P(g, wall, 2, wallTop, W - 4, 31);
    for (let x = 6; x < W - 4; x += 5) P(g, wallD, x, wallTop, 1, 31);
    P(g, wallDD, 2, wallTop, W - 4, 3);
    P(g, wallDD, 2, wallTop, 2, 31);
    P(g, wallDD, W - 4, wallTop, 2, 31);
    // zócalo de piedra
    P(g, '#8d8a86', 2, H - 4, W - 4, 3);
    P(g, '#6e6b67', 2, H - 2, W - 4, 1);
    for (let x = 5; x < W - 4; x += 6) P(g, '#6e6b67', x, H - 4, 1, 2);

    // ventanas con jardinera
    const doorCol = Math.floor(hs.w / 2);
    [1, hs.w - 2].forEach(col => {
      if (col === doorCol) return;
      const wx = col * T + 3, wy = wallTop + 8;
      P(g, O, wx - 1, wy - 1, 12, 11);
      P(g, '#6b4423', wx, wy, 10, 9);
      P(g, '#9fd8f5', wx + 1, wy + 1, 8, 7);
      P(g, '#d9f3ff', wx + 2, wy + 2, 2, 2);
      P(g, '#6b4423', wx + 5, wy + 1, 1, 7);
      P(g, '#6b4423', wx + 1, wy + 4, 8, 1);
      P(g, O, wx - 1, wy + 10, 12, 3);
      P(g, '#7a4a26', wx, wy + 10, 10, 2);
      [1, 4, 7].forEach((fx, i) => {
        P(g, C.leaf, wx + fx, wy + 9, 2, 1);
        P(g, ['#ff6b8b', '#ffd93d', '#ff6b8b'][i], wx + fx + (i % 2), wy + 8);
      });
    });

    // puerta
    const dx = doorCol * T + 3, dy = wallTop + 9, dw = 10, dh = H - 4 - dy;
    P(g, O, dx - 1, dy - 1, dw + 2, dh + 1);
    P(g, '#7a4a26', dx, dy, dw, dh);
    P(g, '#5e3719', dx + 3, dy, 1, dh);
    P(g, '#5e3719', dx + 6, dy, 1, dh);
    P(g, '#9a6236', dx, dy, dw, 1);
    P(g, '#ffd35a', dx + 8, dy + (dh >> 1), 1, 1);
    P(g, '#a9a6a0', dx - 2, H - 3, dw + 4, 3);
    P(g, '#c9c6c0', dx - 2, H - 3, dw + 4, 1);

    // tejado
    const rh = wallTop + 4;
    P(g, O, 0, 1, W, rh);
    P(g, O, 1, 0, W - 2, rh + 2);
    P(g, roof, 1, 1, W - 2, rh);
    for (let y = 6, row = 0; y < rh - 2; y += 5, row++) {
      P(g, roofD, 1, y, W - 2, 1);
      P(g, roofL, 1, y + 1, W - 2, 1);
      for (let x = 2 + (row % 2) * 4; x < W - 2; x += 8) P(g, roofD, x, y - 4, 1, 4);
    }
    P(g, roofDD, 1, 1, W - 2, 2);
    P(g, roofL, 1, 3, W - 2, 1);
    P(g, roofDD, 1, rh - 2, W - 2, 2);
    P(g, 'rgba(255,255,255,0.07)', 1, 3, W >> 1, rh - 5);
    // chimenea
    const cx = W - 22;
    P(g, O, cx - 1, 1, 9, 13);
    P(g, '#9b8f85', cx, 2, 7, 11);
    P(g, '#6f655d', cx, 2, 7, 2);
    P(g, '#6f655d', cx + 5, 4, 2, 9);
    P(g, '#bdb2a8', cx + 1, 5, 2, 1);
    return c;
  }

  // ---------- interiores ----------
  const I = {
    floor: '#c68c55', floorD: '#a06a3a', floorL: '#dba26a',
    wall: '#efdcb4', wallD: '#e3cc9c', wallL: '#fbf0d6',
    trim: '#3b2a22', trimL: '#5e4332',
    base: '#8a5a32', baseL: '#b07a48',
    sheet: '#f4efe4', sheetD: '#d9d2c2',
    quilt: '#4f7fbf', quiltD: '#3a5f96', quiltL: '#7aa6dd',
  };

  // Tablones horizontales; cada fila de 4px tiene una junta en un sitio distinto.
  function floorTile(g, x0, y0, tx, ty) {
    P(g, I.floor, x0, y0, T, T);
    for (let py = 0; py < T; py += 4) {
      const r = rng(hash(tx, ty * 4 + py));
      P(g, I.floorL, x0, y0 + py, T, 1);
      P(g, I.floorD, x0, y0 + py + 3, T, 1);
      P(g, I.floorD, x0 + 2 + ((r() * 12) | 0), y0 + py, 1, 3);
      if (r() < 0.5) P(g, I.floorD, x0 + ((r() * T) | 0), y0 + py + 1 + ((r() * 2) | 0));
    }
  }

  function wallTile(g, x0, y0, up, down) {
    P(g, I.wall, x0, y0, T, T);
    for (let x = 0; x < T; x += 4) P(g, I.wallD, x0 + x, y0, 1, T);
    for (let y = 2; y < T; y += 8) for (let x = 2; x < T; x += 4) P(g, I.wallL, x0 + x, y0 + y + ((x >> 2) % 2) * 4);
    if (!up) { P(g, I.base, x0, y0, T, 2); P(g, I.baseL, x0, y0 + 2, T, 1); }
    if (!down) { P(g, I.trim, x0, y0 + T - 5, T, 1); P(g, I.base, x0, y0 + T - 4, T, 4); P(g, I.baseL, x0, y0 + T - 4, T, 1); }
  }

  function trimTile(g, x0, y0, nb) {
    P(g, I.trim, x0, y0, T, T);
    if (nb.d) P(g, I.trimL, x0, y0 + T - 1, T, 1);
    if (nb.u) P(g, I.trimL, x0, y0, T, 1);
    if (nb.l) P(g, I.trimL, x0, y0, 1, T);
    if (nb.r) P(g, I.trimL, x0 + T - 1, y0, 1, T);
  }

  function doormat(g, x0, y0) {
    orect(g, '#a8453a', x0 + 2, y0 + 4, 12, 9);
    P(g, '#c9685a', x0 + 2, y0 + 6, 12, 1);
    P(g, '#c9685a', x0 + 2, y0 + 10, 12, 1);
    for (let x = 3; x < 14; x += 2) { P(g, '#e8d6b0', x0 + x, y0 + 3); P(g, '#e8d6b0', x0 + x, y0 + 13); }
  }

  // Suelo y paredes de una habitación. Leyenda: X borde, W pared, D puerta, cualquier otra cosa es suelo.
  // Los muebles planos (alfombras, ventanas...) se pintan aquí mismo.
  function room(tiles, furniture) {
    const h = tiles.length, w = tiles[0].length;
    const { c, g } = mk(w * T, h * T);
    const at = (x, y) => (tiles[y] && tiles[y][x]) || 'X';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = tiles[y][x], x0 = x * T, y0 = y * T;
        if (ch === 'X') {
          trimTile(g, x0, y0, { u: at(x, y - 1) !== 'X', d: at(x, y + 1) !== 'X', l: at(x - 1, y) !== 'X', r: at(x + 1, y) !== 'X' });
        } else if (ch === 'W') {
          wallTile(g, x0, y0, at(x, y - 1) === 'W', at(x, y + 1) === 'W');
        } else {
          floorTile(g, x0, y0, x, y);
          if (at(x, y - 1) === 'W') P(g, 'rgba(0,0,0,0.16)', x0, y0, T, 3);
          if (at(x - 1, y) === 'X') P(g, 'rgba(0,0,0,0.12)', x0, y0, 2, T);
          if (ch === 'D') doormat(g, x0, y0);
        }
      }
    }
    furniture.filter(f => f.flat).forEach(f => g.drawImage(f.img, f.x * T, f.y * T));
    return c;
  }

  function makeNightstand() {
    const { c, g } = mk(T, 22);
    ell(g, C.shadow, 8, 20.5, 7, 1.5);
    orect(g, C.wood, 2, 9, 12, 11);
    P(g, C.woodL, 2, 9, 12, 2);
    P(g, C.woodD, 2, 11, 12, 1);
    P(g, C.woodD, 3, 15, 10, 1);
    P(g, '#ffd35a', 7, 17, 2, 1);
    // despertador
    P(g, O, 4, 1, 2, 1); P(g, O, 10, 1, 2, 1);
    oell(g, '#d94c3a', 8, 5.5, 3.5, 3.5);
    ell(g, '#fffaf0', 8, 5.5, 2.3, 2.3);
    P(g, O, 8, 4, 1, 2); P(g, O, 8, 5, 2, 1);
    return c;
  }

  function makeDesk() {
    const { c, g } = mk(32, 26);
    ell(g, C.shadow, 16, 24.5, 15, 1.5);
    orect(g, C.woodD, 2, 12, 28, 12);
    P(g, '#3a2418', 17, 14, 11, 10);
    orect(g, C.wood, 4, 14, 10, 4);
    orect(g, C.wood, 4, 19, 10, 4);
    P(g, '#ffd35a', 8, 16); P(g, '#ffd35a', 8, 21);
    orect(g, C.wood, 1, 7, 30, 6);
    P(g, C.woodL, 1, 7, 30, 1);
    P(g, C.woodD, 1, 12, 30, 1);
    // flexo, apuntes y un libro
    P(g, O, 4, 5, 5, 2);
    P(g, O, 6, 2, 1, 4);
    orect(g, '#f2c14e', 3, 1, 7, 3);
    P(g, '#fff3b0', 4, 1, 5, 1);
    P(g, O, 12, 5, 9, 4);
    P(g, '#fffaf0', 13, 5, 7, 3);
    P(g, '#b8b0a0', 14, 6, 5, 1);
    orect(g, '#c23b3b', 23, 5, 5, 3);
    P(g, '#fffaf0', 23, 7, 5, 1);
    return c;
  }

  // Silla vista desde detrás, de cara al escritorio.
  function makeChair() {
    const { c, g } = mk(T, 18);
    ell(g, C.shadow, 8, 16.5, 6, 1.5);
    orect(g, C.woodD, 3, 9, 2, 7);
    orect(g, C.woodD, 11, 9, 2, 7);
    orect(g, C.wood, 2, 6, 12, 4);
    P(g, C.woodD, 2, 9, 12, 1);
    orect(g, C.woodD, 3, 1, 2, 7);
    orect(g, C.woodD, 11, 1, 2, 7);
    orect(g, C.wood, 2, 0, 12, 3);
    P(g, C.woodL, 2, 0, 12, 1);
    return c;
  }

  function makeBookshelf() {
    const r = rng(7);
    const { c, g } = mk(32, 34);
    ell(g, C.shadow, 16, 32.5, 15, 1.5);
    orect(g, C.woodD, 1, 1, 30, 31);
    P(g, '#4a2f1c', 3, 3, 26, 27);
    const cols = ['#c23b3b', '#3b6fc4', '#e8b83a', '#4f7a4a', '#8a4fbf', '#e07a3a', '#f2efe6'];
    [[3, 11], [13, 20], [22, 29]].forEach(([top, bottom]) => {
      for (let x = 4; x < 28;) {
        const w = 2 + ((r() * 2) | 0);
        if (x + w > 28) break;
        if (r() < 0.12) { x += w + 1; continue; }
        const hgt = Math.min(bottom - top, 5 + ((r() * 4) | 0));
        const col = cols[(r() * cols.length) | 0];
        P(g, col, x, bottom - hgt, w, hgt);
        P(g, shade(col, 0.3), x, bottom - hgt, w, 1);
        P(g, shade(col, -0.35), x + w - 1, bottom - hgt, 1, hgt);
        x += w;
      }
      P(g, C.wood, 3, bottom, 26, 2);
      P(g, C.woodL, 3, bottom, 26, 1);
    });
    P(g, C.wood, 1, 1, 30, 2);
    P(g, C.woodL, 1, 1, 30, 1);
    return c;
  }

  function makePlant() {
    const { c, g } = mk(T, 26);
    ell(g, C.shadow, 8, 24.5, 5, 1.5);
    orect(g, '#c8643a', 4, 17, 8, 7);
    P(g, '#a8502c', 4, 22, 8, 2);
    orect(g, '#d97a4a', 3, 15, 10, 3);
    P(g, '#eb9a6a', 3, 15, 10, 1);
    [[3, 12, 3, 1.6], [13, 11, 3, 1.6], [4, 7, 2.5, 1.5], [12, 6, 2.5, 1.5]].forEach(([x, y, rx, ry]) => oell(g, C.leaf, x, y, rx, ry));
    oell(g, C.leafD, 8, 9, 4.5, 6);
    ell(g, C.leaf, 7.5, 8, 3.5, 4.5);
    ell(g, C.leafL, 6.5, 5.5, 1.5, 1.2);
    P(g, C.leafDD, 8, 12, 1, 3);
    return c;
  }

  function makeWindow() {
    const { c, g } = mk(32, 32);
    orect(g, '#f4efe4', 5, 6, 22, 18);
    const sky = ['#8fd0f3', '#8fd0f3', '#a5daf5', '#bfe4f4', '#d9ecec', '#f3efd6', '#ffe7b0'];
    for (let y = 0; y < 14; y++) P(g, sky[Math.floor(y / 2)], 7, 8 + y, 18, 1);
    ell(g, '#fff3b0', 11, 17, 3, 3);
    P(g, '#ffffff', 18, 10, 5, 2); P(g, '#ffffff', 19, 9, 3, 1);
    P(g, '#f4efe4', 15, 8, 2, 14);
    P(g, '#f4efe4', 7, 14, 18, 2);
    orect(g, C.wood, 3, 24, 26, 2);
    P(g, C.woodL, 3, 24, 26, 1);
    // cortinas y barra
    [[2, 5], [25, 5]].forEach(([x, w]) => {
      P(g, O, x - 1, 4, w + 2, 19);
      P(g, '#e27d8a', x, 4, w, 18);
      P(g, '#c95f6d', x + 1, 4, 1, 18);
      P(g, '#c95f6d', x + 3, 4, 1, 18);
      P(g, '#f4a3ae', x, 4, w, 1);
    });
    P(g, O, 1, 2, 30, 2);
    P(g, '#b0864f', 1, 2, 30, 1);
    return c;
  }

  function makeCalendar() {
    const { c, g } = mk(T, T);
    P(g, O, 3, 4, 10, 12);
    P(g, '#fffaf0', 4, 5, 8, 10);
    P(g, '#d94c3a', 4, 5, 8, 3);
    P(g, O, 7, 3, 2, 2);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) P(g, '#b8b0a0', 5 + col * 2, 9 + row * 2);
    P(g, '#d94c3a', 8, 10, 3, 1); P(g, '#d94c3a', 8, 12, 3, 1);
    P(g, '#d94c3a', 8, 11); P(g, '#d94c3a', 10, 11);
    return c;
  }

  function makeRug() {
    const { c, g } = mk(64, 48);
    oell(g, '#8a2f3a', 32, 24, 30, 21);
    ell(g, '#c8553d', 32, 24, 27, 18);
    ell(g, '#e8b83a', 32, 24, 22, 14);
    ell(g, '#c8553d', 32, 24, 19, 11);
    ell(g, '#f2e6c8', 32, 24, 9, 5);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      P(g, '#f2e6c8', Math.round(32 + Math.cos(a) * 24.5), Math.round(24 + Math.sin(a) * 16));
    }
    return c;
  }

  // Luz de la ventana sobre el suelo: franja inclinada que se desvanece.
  function makeSunbeam() {
    const { c, g } = mk(48, 48);
    for (let y = 0; y < 40; y++) {
      P(g, `rgba(255,236,170,${(0.26 * (1 - y / 40)).toFixed(3)})`, 7 + Math.floor(y * 0.5), y, 20, 1);
    }
    return c;
  }

  // Cama. state: empty | sleep0 | sleep1 (respira) | sit. Con alguien dentro se usa su sprite.
  function quilt(g, top, mound) {
    const bottom = 34;
    P(g, I.quilt, 4, top, 24, bottom - top);
    for (let y = top + 4; y < bottom; y += 4) P(g, I.quiltD, 4, y, 24, 1);
    for (let x = 10; x < 28; x += 6) P(g, I.quiltD, x, top + 2, 1, bottom - top - 2);
    if (mound) {
      ell(g, I.quiltL, 15, top + 8, 7, mound);
      ell(g, I.quilt, 16, top + 9, 6, mound - 1.5);
    }
    P(g, I.quiltD, 4, top, 1, bottom - top);
    P(g, I.quiltD, 27, top, 1, bottom - top);
    P(g, I.sheet, 4, top, 24, 2);
    P(g, I.sheetD, 4, top + 2, 24, 1);
  }

  const bedCache = {};
  function bed(d, state = 'empty') {
    const key = (d ? d.id : '') + ':' + state;
    if (bedCache[key]) return bedCache[key];
    const { c, g } = mk(32, 40);
    ell(g, C.shadow, 16, 38, 14, 2);
    orect(g, C.wood, 4, 2, 24, 8);
    P(g, C.woodL, 4, 2, 24, 1);
    P(g, C.woodD, 4, 8, 24, 2);
    [10, 16, 22].forEach(x => P(g, C.woodD, x, 4, 1, 4));
    orect(g, C.woodD, 2, 0, 3, 12);
    orect(g, C.woodD, 27, 0, 3, 12);
    P(g, C.woodL, 2, 0, 3, 1);
    P(g, C.woodL, 27, 0, 3, 1);
    orect(g, I.sheet, 4, 10, 24, 25);
    orect(g, '#ffffff', 6, 11, 20, 6);
    P(g, I.sheetD, 6, 16, 20, 1);
    P(g, I.sheetD, 7, 12, 1, 3);
    P(g, I.sheetD, 24, 12, 1, 3);

    if (d && state !== 'empty') {
      const spr = mk(T, 24);
      drawChar(spr.g, d, 'down', 0);
      if (state === 'sit') {
        g.drawImage(spr.c, 0, 0, T, 20, 8, 5, T, 20);
        quilt(g, 23, 0);
      } else {
        g.drawImage(spr.c, 0, 0, T, 12, 8, 7, T, 12);
        // ojos cerrados
        P(g, d.skin, 13, 15, 1, 2); P(g, d.skin, 18, 15, 1, 2);
        P(g, O, 12, 16, 2, 1); P(g, O, 18, 16, 2, 1);
        quilt(g, 18, state === 'sleep1' ? 5 : 4);
      }
    } else {
      quilt(g, 21, 0);
    }

    orect(g, C.wood, 3, 34, 26, 4);
    P(g, C.woodL, 3, 34, 26, 1);
    P(g, C.woodD, 3, 37, 26, 1);
    bedCache[key] = c;
    return c;
  }

  // Muebles: tamaño en casillas. Los planos no bloquean el paso y se pintan en el suelo.
  const FURNITURE = {
    bed: { w: 2, h: 2, make: () => bed(null) },
    nightstand: { w: 1, h: 1, make: makeNightstand },
    desk: { w: 2, h: 1, make: makeDesk },
    chair: { w: 1, h: 1, make: makeChair },
    bookshelf: { w: 2, h: 1, make: makeBookshelf },
    plant: { w: 1, h: 1, make: makePlant },
    window: { w: 2, h: 2, flat: true, make: makeWindow },
    calendar: { w: 1, h: 1, flat: true, make: makeCalendar },
    rug: { w: 4, h: 3, flat: true, make: makeRug },
    sunbeam: { w: 3, h: 3, flat: true, make: makeSunbeam },
  };
  const furnitureImgs = {};

  function furniture(type) {
    const f = FURNITURE[type];
    if (!f) throw new Error(`Mueble desconocido: ${type}`);
    if (!furnitureImgs[type]) furnitureImgs[type] = f.make();
    return { w: f.w, h: f.h, flat: !!f.flat, img: furnitureImgs[type] };
  }

  const treeImgs = [];
  const staticCache = {};

  function buildStatics(map, furnitureList = []) {
    if (!treeImgs.length) treeImgs.push(makeTree(11), makeTree(42), makeTree(97));
    if (!staticCache.bush) {
      staticCache.bush = makeBush();
      staticCache.rock = makeRock();
      staticCache.sign = makeSign();
    }
    const tiles = map.tiles;
    const list = [];
    const at = (x, y) => (tiles[y] && tiles[y][x]) || '';
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const ch = tiles[y][x];
        const base = y * T + T;
        if (ch === 'T') {
          list.push({ img: treeImgs[(x * 7 + y * 13) % treeImgs.length], dx: x * T - 8, dy: base - 40, base });
        } else if (ch === 'b' || ch === 'r' || ch === 's') {
          const img = { b: staticCache.bush, r: staticCache.rock, s: staticCache.sign }[ch];
          list.push({ img, dx: x * T, dy: y * T, base });
        } else if (ch === 'f') {
          const key = 'fence' + [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].map(v => (v === 'f' ? 1 : 0)).join('');
          if (!staticCache[key]) {
            staticCache[key] = makeFence(at(x - 1, y) === 'f', at(x + 1, y) === 'f', at(x, y - 1) === 'f', at(x, y + 1) === 'f');
          }
          list.push({ img: staticCache[key], dx: x * T, dy: y * T, base });
        }
      }
    }
    (map.houses || []).forEach(hs => {
      list.push({ img: makeHouse(hs), dx: hs.x * T, dy: hs.y * T - 8, base: (hs.y + hs.h) * T });
    });
    furnitureList.filter(f => !f.flat).forEach(f => {
      const base = (f.y + f.h) * T;
      list.push({ img: f.img, dx: f.x * T, dy: base - f.img.height, base, type: f.type });
    });
    return list;
  }

  // ---------- personajes (16x24) ----------
  function drawChar(g, d, dir, f) {
    const skin = d.skin, skinD = shade(skin, -0.2);
    const hair = d.hair, hairL = shade(hair, 0.3), hairD = shade(hair, -0.3);
    const shirt = d.shirt, shirtD = shade(shirt, -0.3);
    const pants = d.pants, pantsD = shade(pants, -0.3);
    const shoe = '#3b2a20', blush = '#f0a0a0';
    const style = d.hairStyle;

    ell(g, 'rgba(0,0,0,0.25)', 8, 22, 5, 1.6);

    const spikes = () => {
      [4, 7, 10].forEach(sx => {
        P(g, O, sx, 0, 2, 1);
        P(g, O, sx - 1, 1, 1, 1);
        P(g, O, sx + 2, 1, 1, 1);
        P(g, hair, sx, 1, 2, 1);
      });
    };

    if (dir === 'down' || dir === 'up') {
      const lh = f === 1 ? 3 : 4, rh = f === 2 ? 3 : 4;
      orect(g, pants, 5, 17, 2, lh); P(g, shoe, 5, 16 + lh, 2, 1);
      orect(g, pants, 9, 17, 2, rh); P(g, shoe, 9, 16 + rh, 2, 1);
      const la = f === 1 ? 1 : f === 2 ? -1 : 0;
      orect(g, shirt, 2, 13 + la, 2, 4); P(g, skin, 2, 16 + la, 2, 1);
      orect(g, shirt, 12, 13 - la, 2, 4); P(g, skin, 12, 16 - la, 2, 1);
      orect(g, shirt, 4, 12, 8, 6);
      P(g, shirtD, 4, 16, 8, 1);
      if (dir === 'down') P(g, skin, 7, 12, 2, 1);
      orect(g, skin, 3, 3, 10, 9);

      if (dir === 'down') {
        if (style === 'old') {
          const hairS = shade(hair, -0.15);
          P(g, shade(skin, 0.2), 6, 4, 3, 1);
          P(g, hair, 3, 6, 1, 4); P(g, hair, 12, 6, 1, 4);
          P(g, hair, 4, 6, 3, 1); P(g, hair, 9, 6, 3, 1);
          P(g, O, 5, 7); P(g, O, 10, 7);
          P(g, hair, 4, 9, 8, 2);
          P(g, hair, 5, 11, 6, 1);
          P(g, hairS, 6, 12, 4, 1);
          P(g, O, 6, 13, 4, 1); P(g, O, 5, 12); P(g, O, 10, 12);
          P(g, skinD, 7, 9, 2, 1);
        } else {
          orect(g, hair, 3, 2, 10, 4);
          P(g, hair, 3, 6, 1, 3); P(g, hair, 12, 6, 1, 3);
          P(g, hair, 4, 6, 2, 1); P(g, hair, 7, 6, 1, 1); P(g, hair, 9, 6, 3, 1);
          P(g, hairL, 5, 3, 3, 1);
          if (style === 'long') { orect(g, hair, 2, 5, 2, 9); orect(g, hair, 12, 5, 2, 9); P(g, hairD, 2, 12, 2, 1); P(g, hairD, 12, 12, 2, 1); }
          if (style === 'spiky') spikes();
          P(g, O, 5, 8, 1, 2); P(g, O, 10, 8, 1, 2);
          P(g, blush, 4, 10); P(g, blush, 11, 10);
        }
        if (d.hat) {
          orect(g, d.hat, 3, 1, 10, 4);
          P(g, shade(d.hat, 0.3), 5, 1, 3, 1);
          P(g, O, 2, 6, 12, 1);
          P(g, shade(d.hat, -0.3), 2, 5, 12, 1);
          P(g, '#ffffff', 7, 2, 2, 1);
        }
      } else {
        if (style === 'old') {
          P(g, shade(skin, 0.2), 6, 4, 3, 1);
          P(g, hair, 3, 7, 10, 3);
          P(g, shade(hair, -0.15), 3, 9, 10, 1);
        } else {
          orect(g, hair, 3, 2, 10, style === 'long' ? 12 : 9);
          P(g, hairL, 5, 3, 4, 1);
          P(g, hairD, 4, style === 'long' ? 12 : 9, 8, 1);
          if (style === 'spiky') spikes();
        }
        if (d.hat) {
          orect(g, d.hat, 3, 1, 10, 4);
          P(g, shade(d.hat, -0.3), 4, 5, 8, 1);
        }
      }
      return;
    }

    // mirando a la izquierda (la derecha se obtiene volteando)
    if (f === 0) {
      orect(g, pants, 6, 17, 3, 4); P(g, shoe, 5, 20, 4, 1);
    } else if (f === 1) {
      orect(g, pantsD, 9, 17, 2, 3); P(g, shoe, 9, 19, 2, 1);
      orect(g, pants, 5, 17, 2, 4); P(g, shoe, 4, 20, 3, 1);
    } else {
      orect(g, pantsD, 8, 17, 2, 4); P(g, shoe, 8, 20, 2, 1);
      orect(g, pants, 5, 17, 2, 3); P(g, shoe, 4, 19, 3, 1);
    }
    orect(g, shirt, 5, 12, 6, 6);
    P(g, shirtD, 5, 16, 6, 1);
    const ax = f === 1 ? 5 : f === 2 ? 9 : 7;
    orect(g, shade(shirt, -0.12), ax, 13, 2, 4);
    P(g, skin, ax, 16, 2, 1);
    orect(g, skin, 3, 3, 10, 9);
    if (style === 'old') {
      P(g, shade(skin, 0.2), 5, 4, 3, 1);
      P(g, hair, 9, 6, 4, 4);
      P(g, shade(hair, -0.15), 9, 9, 4, 1);
      P(g, skin, 8, 7, 2, 2); P(g, skinD, 9, 8);
      P(g, hair, 3, 6, 3, 1);
      P(g, O, 4, 7);
      P(g, hair, 3, 9, 4, 2);
      P(g, hair, 3, 11, 3, 1);
      P(g, O, 3, 12, 3, 1);
    } else {
      orect(g, hair, 3, 2, 10, 4);
      P(g, hair, 7, 6, 6, 4);
      P(g, hair, 3, 6, 2, 1);
      P(g, hairL, 6, 3, 3, 1);
      if (style === 'long') { orect(g, hair, 8, 5, 5, 9); P(g, hairD, 8, 12, 5, 1); }
      if (style === 'spiky') { spikes(); P(g, O, 13, 4, 1, 2); P(g, hair, 13, 5); }
      P(g, skin, 8, 7, 2, 2); P(g, skinD, 9, 8);
      P(g, O, 4, 8, 1, 2);
      P(g, blush, 4, 10);
    }
    if (d.hat) {
      orect(g, d.hat, 3, 1, 10, 4);
      P(g, shade(d.hat, 0.3), 5, 1, 3, 1);
      P(g, shade(d.hat, -0.3), 1, 5, 6, 1);
      P(g, O, 0, 5); P(g, O, 1, 6, 6, 1);
    }
  }

  const sheets = {};
  function charSheet(d) {
    if (sheets[d.id]) return sheets[d.id];
    const sheet = {};
    ['down', 'up', 'left'].forEach(dir => {
      sheet[dir] = [0, 1, 2].map(f => {
        const { c, g } = mk(T, 24);
        drawChar(g, d, dir, f);
        return c;
      });
    });
    sheet.right = sheet.left.map(flipped);
    sheets[d.id] = sheet;
    return sheet;
  }

  // ---------- retratos (64x64) ----------
  function drawPortrait(g, d, mood) {
    const skin = d.skin, skinD = shade(skin, -0.14), skinDD = shade(skin, -0.32), skinL = shade(skin, 0.25);
    const hair = d.hair, hairD = shade(hair, -0.3), hairL = shade(hair, 0.3);
    const shirt = d.shirt, shirtD = shade(shirt, -0.3);
    const iris = d.eyes, irisD = shade(iris, -0.4), irisL = shade(iris, 0.45);
    const style = d.hairStyle;

    // pelo trasero
    if (style === 'long') {
      ell(g, O, 32, 28, 21, 21);
      P(g, O, 11, 28, 42, 36);
      ell(g, hair, 32, 28, 20, 20);
      P(g, hair, 12, 28, 40, 36);
      P(g, hairD, 12, 46, 5, 18);
      P(g, hairD, 47, 46, 5, 18);
    }

    // cuello y cuerpo
    P(g, O, 26, 40, 12, 14);
    P(g, skinD, 27, 40, 10, 14);
    P(g, skinDD, 27, 40, 10, 3);
    oell(g, shirtD, 32, 75, 27, 20);
    ell(g, shirt, 31, 74, 25, 19);
    const trim = d.trim || O;
    for (let y = 54; y < 62; y++) {
      const hw = 7 - (y - 54);
      if (hw <= 0) break;
      P(g, trim, 32 - hw - 1, y, 1, 1);
      P(g, trim, 32 + hw, y, 1, 1);
      P(g, skinD, 32 - hw, y, hw * 2, 1);
    }
    if (d.trim) {
      P(g, d.trim, 12, 60, 10, 2);
      P(g, d.trim, 42, 60, 10, 2);
    }

    // orejas
    if (d.elf) {
      [false, true].forEach(mirror => {
        const X = x => (mirror ? 63 - x : x);
        for (let y = 20; y <= 35; y++) {
          const x0 = Math.round(6 + (y - 20) * 0.75);
          const x1 = 19;
          const a = Math.min(X(x0), X(x1)), b = Math.max(X(x0), X(x1));
          P(g, O, a - 1, y, b - a + 3, 1);
        }
        for (let y = 21; y <= 34; y++) {
          const x0 = Math.round(7 + (y - 21) * 0.8);
          const x1 = 18;
          const a = Math.min(X(x0), X(x1)), b = Math.max(X(x0), X(x1));
          P(g, skin, a, y, b - a + 1, 1);
          if (y > 25 && y < 32) P(g, skinD, Math.min(X(x0 + 3), X(x0 + 6)), y, 3, 1);
        }
      });
    } else {
      oell(g, skinD, 17, 31, 3, 4);
      oell(g, skinD, 47, 31, 3, 4);
    }
    if (style === 'old') {
      // mechones laterales, por detrás de la cara
      [17, 47].forEach(cx => {
        ell(g, O, cx, 27, 4.5, 7.5);
        ell(g, shade(hair, -0.15), cx, 27, 3.5, 6.5);
        ell(g, hair, cx + (cx < 32 ? -0.5 : 0.5), 26, 2.5, 5.5);
      });
    }

    // cara
    ell(g, O, 32, 28, 16, 17);
    ell(g, O, 32, 35, 13, 12);
    ell(g, skinD, 32, 28, 15, 16);
    ell(g, skinD, 32, 35, 12, 11);
    ell(g, skin, 31, 27, 14, 15);
    ell(g, skin, 31, 34, 11, 10);
    P(g, skinL, 22, 20, 3, 1);

    // ojos
    const eye = (cx, left) => {
      if (mood === 'happy') {
        P(g, O, cx - 3, 32); P(g, O, cx - 2, 31); P(g, O, cx - 1, 30, 2, 1); P(g, O, cx + 1, 31); P(g, O, cx + 2, 32);
        return;
      }
      if (style === 'old') {
        P(g, O, cx - 3, 30, 6, 1);
        P(g, iris, cx - 1, 31, 2, 2);
        P(g, O, cx, 31, 1, 2);
        return;
      }
      if (mood === 'surprised') {
        P(g, O, cx - 3, 26, 7, 1);
        P(g, '#ffffff', cx - 3, 27, 7, 7);
        P(g, iris, cx - 1, 28, 3, 4);
        P(g, O, cx, 29, 1, 2);
        P(g, skinDD, cx - 2, 34, 5, 1);
        return;
      }
      P(g, O, cx - 4, 27, 8, 2);
      if (mood === 'angry') { P(g, skin, left ? cx - 4 : cx + 1, 27, 3, 1); }
      P(g, '#ffffff', cx - 3, 29, 6, 5);
      P(g, iris, cx - 2, 29, 4, 5);
      P(g, irisD, cx - 2, 29, 4, 2);
      P(g, O, cx - 1, 30, 2, 3);
      P(g, '#ffffff', cx - 2, 30, 1, 1);
      P(g, irisL, cx - 1, 33, 3, 1);
      P(g, skinDD, cx - 2, 34, 4, 1);
    };
    eye(25, true);
    eye(39, false);

    // cejas
    const browCol = style === 'old' ? hair : hairD;
    if (style === 'old') {
      P(g, browCol, 21, 26, 8, 2); P(g, browCol, 35, 26, 8, 2);
    } else if (mood === 'angry') {
      for (let i = 0; i < 6; i++) {
        P(g, browCol, 22 + i, 23 + (i >> 1), 1, 2);
        P(g, browCol, 42 - i, 23 + (i >> 1), 1, 2);
      }
    } else {
      const by = mood === 'surprised' ? 22 : 24;
      P(g, browCol, 22, by, 6, 1); P(g, browCol, 36, by, 6, 1);
    }

    // nariz, rubor, boca
    P(g, skinDD, 32, 37);
    if (style !== 'old') {
      g.fillStyle = 'rgba(255,110,120,0.45)';
      g.fillRect(19, 35, 4, 2);
      g.fillRect(41, 35, 4, 2);
    }
    if (mood === 'happy') {
      P(g, O, 29, 40, 6, 1);
      P(g, '#9a3b3b', 30, 41, 4, 2);
      P(g, '#e77f7f', 31, 42, 2, 1);
    } else if (mood === 'surprised') {
      P(g, O, 31, 40, 2, 1); P(g, O, 30, 41, 1, 2); P(g, O, 33, 41, 1, 2); P(g, O, 31, 43, 2, 1);
      P(g, '#7a2a2a', 31, 41, 2, 2);
    } else if (mood === 'angry') {
      P(g, O, 29, 41, 6, 1); P(g, O, 28, 42); P(g, O, 35, 42);
    } else {
      P(g, skinDD, 30, 41, 4, 1);
    }

    // pelo delantero
    if (style === 'old') {
      P(g, skinD, 26, 17, 12, 1);
      P(g, skinD, 28, 20, 8, 1);
      P(g, skinL, 26, 14, 5, 1);
      ell(g, O, 32, 45, 13, 10);
      ell(g, shade(hair, -0.15), 32, 45, 12, 9);
      ell(g, hair, 31, 44, 11, 8);
      ell(g, shade(hair, -0.12), 32, 40, 7.5, 2.5);
      ell(g, hair, 31.5, 39.5, 6.5, 2);
      P(g, shade(hair, -0.2), 28, 48, 1, 3); P(g, shade(hair, -0.2), 35, 47, 1, 3);
      if (mood === 'happy' || mood === 'surprised') P(g, '#7a2a2a', 30, 43, 4, 2);
    } else {
      const bottoms = [], tops = [];
      for (let x = 13; x <= 51; x++) {
        const dx = (x + 0.5 - 32) / 19;
        let top = Math.round(20 - 13 * Math.sqrt(Math.max(0, 1 - dx * dx)));
        if (style === 'spiky') {
          const k = Math.abs(((x - 13) % 8) - 4);
          top -= Math.max(0, 5 - k * 1.5) | 0;
        }
        let bottom;
        if (x < 19 || x > 45) bottom = style === 'long' ? 46 : 34;
        else {
          const k = Math.abs(((x - 19) % 7) - 3);
          bottom = 23 + (3 - k) + (x > 27 && x < 37 ? 1 : 0);
        }
        tops[x] = top;
        bottoms[x] = bottom;
        P(g, O, x, top - 1, 1, 1);
        P(g, hair, x, top, 1, bottom - top + 1);
        P(g, hairD, x, bottom - 1, 1, 2);
        P(g, O, x, bottom + 1, 1, 1);
      }
      P(g, O, 12, tops[13], 1, bottoms[13] - tops[13] + 2);
      P(g, O, 52, tops[51], 1, bottoms[51] - tops[51] + 2);
      for (let x = 14; x <= 51; x++) {
        const a = bottoms[x - 1], b = bottoms[x];
        if (b > a + 1) P(g, O, x - 1, a + 1, 1, b - a);
        if (a > b + 1) P(g, O, x, b + 1, 1, a - b);
      }
      for (let x = 20; x <= 42; x++) if (x % 5) P(g, hairL, x, tops[x] + 4 + (Math.abs(x - 30) >> 3), 1, 1);
      P(g, hairL, 15, 26, 1, 6);
    }

    if (d.hat) {
      const hat = d.hat, hatD = shade(hat, -0.3), hatL = shade(hat, 0.3);
      for (let x = 12; x <= 52; x++) {
        const dx = (x + 0.5 - 32) / 20;
        if (Math.abs(dx) > 1) continue;
        const top = Math.round(19 - 13 * Math.sqrt(1 - dx * dx));
        P(g, O, x, top - 1, 1, 1);
        P(g, hat, x, top, 1, 20 - top);
      }
      P(g, hatL, 22, 9, 10, 1);
      oell(g, '#ffffff', 32, 13, 3, 3);
      P(g, hat, 32, 12, 1, 3);
      orect(g, hatD, 11, 19, 42, 3);
      P(g, hat, 11, 19, 42, 1);
    }
  }

  const portraits = {};
  function portrait(d, mood = 'normal') {
    const key = d.id + ':' + mood;
    if (!portraits[key]) {
      const { c, g } = mk(64, 64);
      drawPortrait(g, d, mood);
      portraits[key] = c;
    }
    return portraits[key];
  }

  // Primitivas de dibujo para otros módulos (p. ej. el minijuego de persecución).
  const util = { O, mk, P, ell, oell, orect, shade };

  return { T, ground, room, furniture, bed, buildStatics, charSheet, portrait, util };
})();
