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
  const GROUND = { '=': 'path', '~': 'water', ':': 'tiles', 'o': 'deck', 'P': 'pool', 'a': 'road', '-': 'walk', 'z': 'sand' };

  // Asfalto; si debajo sigue la carretera, la línea discontinua del centro va en el borde de abajo.
  function roadTile(g, x0, y0, r, nb) {
    P(g, '#55585e', x0, y0, T, T);
    for (let i = 0; i < 14; i++) P(g, r() < 0.5 ? '#4a4d52' : '#62656b', x0 + ((r() * T) | 0), y0 + ((r() * T) | 0));
    if (nb.d) P(g, '#f4f1ea', x0 + 2, y0 + T - 1, 9, 1);
    if (!nb.u) P(g, '#3e4146', x0, y0, T, 1);
  }

  function sandTile(g, x0, y0, r) {
    P(g, '#e9d49c', x0, y0, T, T);
    for (let i = 0; i < 12; i++) P(g, r() < 0.5 ? '#d8bf82' : '#f5e3b4', x0 + ((r() * T) | 0), y0 + ((r() * T) | 0));
  }
  const groundOf = ch => GROUND[ch] || 'grass';

  // Baldosas cuadradas de 8px (patio de barro cocido o suelo claro de la piscina).
  function pavedTile(g, x0, y0, tx, ty, base, grout, light) {
    P(g, grout, x0, y0, T, T);
    for (let sy = 0; sy < 2; sy++) {
      for (let sx = 0; sx < 2; sx++) {
        const r = rng(hash(tx * 2 + sx, ty * 2 + sy));
        const col = r() < 0.3 ? shade(base, -0.06) : r() < 0.2 ? shade(base, 0.06) : base;
        const px = x0 + sx * 8, py = y0 + sy * 8;
        P(g, col, px, py, 7, 7);
        P(g, light, px, py, 7, 1);
        if (r() < 0.4) P(g, shade(col, -0.12), px + 1 + ((r() * 5) | 0), py + 2 + ((r() * 4) | 0));
      }
    }
  }

  function poolTile(g, x0, y0, tx, ty, nb, frame) {
    P(g, '#4cc0e6', x0, y0, T, T);
    P(g, '#43b2da', x0 + 7, y0, 1, T);
    P(g, '#43b2da', x0, y0 + 7, T, 1);
    // reflejos que se mueven con el fotograma
    const r = rng(hash(tx, ty));
    for (let i = 0; i < 3; i++) {
      const wy = 2 + ((r() * 12) | 0), wx = ((r() * T) | 0);
      const sx = (wx + frame * 3 + i * 5) % T, len = 3 + ((r() * 3) | 0);
      for (let k = 0; k < len; k++) P(g, '#a8ecfb', x0 + ((sx + k) % T), y0 + wy + (k === 1 ? -1 : 0));
    }
    // bordillo blanco y sombra del borde dentro del agua
    if (!nb.u) { P(g, '#2f97c2', x0, y0 + 3, T, 2); P(g, '#f4f1ea', x0, y0, T, 3); P(g, '#cfc8b8', x0, y0 + 3, T, 1); }
    if (!nb.d) { P(g, '#f4f1ea', x0, y0 + T - 2, T, 2); }
    if (!nb.l) { P(g, '#2f97c2', x0 + 3, y0, 1, T); P(g, '#f4f1ea', x0, y0, 3, T); }
    if (!nb.r) { P(g, '#f4f1ea', x0 + T - 3, y0, 3, T); }
  }

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

  // flats: muebles planos (p. ej. un flotador) que se pintan sobre el suelo.
  function ground(tiles, frame, flats = []) {
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
        else if (type === 'tiles') pavedTile(g, x * T, y * T, x, y, '#c9714a', '#8f4a30', '#dd8a62');
        else if (type === 'deck') pavedTile(g, x * T, y * T, x, y, '#ebe3cf', '#c9bea4', '#f7f1e2');
        else if (type === 'pool') poolTile(g, x * T, y * T, x, y, nb, frame);
        else if (type === 'road') roadTile(g, x * T, y * T, r, nb);
        else if (type === 'sand') sandTile(g, x * T, y * T, r);
        else if (type === 'walk') {
          pavedTile(g, x * T, y * T, x, y, '#cfccc5', '#a9a6a0', '#e2dfd8');
          if (typeAt(x, y - 1) === 'road') { P(g, '#8d8a86', x * T, y * T, T, 2); P(g, '#e8e5de', x * T, y * T + 2, T, 1); }
        }
        else grassTile(g, x * T, y * T, r, ch === ',');
      }
    }
    flats.filter(f => f.flat).forEach(f => g.drawImage(f.img, f.x * T, f.y * T));
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

  // Palmera: tronco con anillos algo inclinado y penacho de hojas.
  function makePalm(seed) {
    const r = rng(seed);
    const { c, g } = mk(32, 48);
    ell(g, C.shadow, 16, 45, 9, 2.5);
    const lean = r() < 0.5 ? -1 : 1;
    const tx = y => Math.round(16 + lean * Math.pow((46 - y) / 34, 2) * 3);
    for (let y = 14; y < 46; y++) {
      P(g, O, tx(y) - 3, y, 6, 1);
      P(g, (y % 4 === 0) ? '#7d5a36' : '#a07a4c', tx(y) - 2, y, 4, 1);
      P(g, '#c49a64', tx(y) - 1, y, 1, 1);
    }
    const cx = tx(14), cy = 13;
    // hojas: arcos que salen del centro y caen
    [[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35], [-0.3, -1], [0.35, -0.9], [0, 0.6]].forEach(([dx, dy]) => {
      for (let i = 0; i <= 13; i++) {
        const k = i / 13;
        const x = Math.round(cx + dx * i * 1.05), y = Math.round(cy + dy * i * 0.8 + k * k * 6);
        P(g, O, x - 1, y - 1, 3, 3);
      }
    });
    [[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35], [-0.3, -1], [0.35, -0.9], [0, 0.6]].forEach(([dx, dy], j) => {
      for (let i = 0; i <= 13; i++) {
        const k = i / 13;
        const x = Math.round(cx + dx * i * 1.05), y = Math.round(cy + dy * i * 0.8 + k * k * 6);
        P(g, j % 2 ? C.leafD : C.leaf, x - (i < 11 ? 1 : 0), y, i < 11 ? 2 : 1, 1);
        if (i % 3 === 1) P(g, C.leafL, x, y - 1);
      }
    });
    oell(g, '#6b4f2a', cx, cy + 1, 2.5, 2);
    P(g, '#8a6a3c', cx - 1, cy, 2, 1);
    return c;
  }

  // Muro blanco de patio, más alto que una valla. Se une con los muros de alrededor:
  // los tramos horizontales enseñan la cara de delante; los verticales, solo la parte de arriba.
  function makeWall(l, r, u, d) {
    const { c, g } = mk(T, 28);
    const top = 6, bottom = 12, face = 12; // albardilla en y 6..12 (centro de la casilla), cara de 12px debajo
    const cap = '#ffffff', faceCol = '#ece7dc', faceD = '#d6cfc0';
    const x0 = l ? 0 : 5, x1 = r ? T : 11;
    const y0 = u ? 0 : top, y1 = d ? 28 : bottom;
    ell(g, C.shadow, 8, 26.5, d ? 3 : 7, 1.5);
    // contorno
    P(g, O, x0 - (l ? 0 : 1), top - 1, x1 - x0 + (l ? 0 : 1) + (r ? 0 : 1), bottom - top + face + 2);
    P(g, O, 4, y0 - (u ? 0 : 1), 8, y1 - y0 + (u ? 0 : 1) + (d ? 0 : face + 1));
    // cara de delante (donde el muro no sigue hacia abajo)
    P(g, faceCol, x0, bottom, x1 - x0, face);
    if (!d) P(g, faceCol, 5, bottom, 6, face);
    P(g, faceD, x0, bottom, x1 - x0, 1);
    P(g, faceD, x0, bottom + face - 2, x1 - x0, 2);
    // albardilla
    P(g, cap, x0, top, x1 - x0, bottom - top);
    P(g, cap, 5, y0, 6, y1 - y0);
    if (d) P(g, faceD, 10, bottom, 1, 28 - bottom);
    P(g, '#f7f4ee', x0, bottom - 1, x1 - x0, 1);
    return c;
  }

  // Seto recortado; se une con los setos de los lados.
  function makeHedge(l, r) {
    const { c, g } = mk(T, 24);
    const x0 = l ? 0 : 1, x1 = r ? T : T - 1;
    P(g, O, x0, 5, x1 - x0, 19);
    if (!l) P(g, O, 0, 7, 1, 15);
    if (!r) P(g, O, T - 1, 7, 1, 15);
    P(g, C.leafD, x0 + (l ? 0 : 1), 6, x1 - x0 - (l ? 0 : 1) - (r ? 0 : 1), 17);
    P(g, C.leaf, x0 + (l ? 0 : 1), 6, x1 - x0 - (l ? 0 : 1) - (r ? 0 : 1), 5);
    P(g, C.leafL, x0 + (l ? 0 : 1), 6, x1 - x0 - (l ? 0 : 1) - (r ? 0 : 1), 1);
    [[3, 13], [10, 16], [6, 19], [12, 9], [2, 8]].forEach(([x, y]) => P(g, C.leafDD, x, y, 2, 1));
    [[5, 8], [11, 7], [8, 14]].forEach(([x, y]) => P(g, C.leafL, x, y));
    return c;
  }

  // Globo atado a una estaca; sway mueve el globo para animarlo.
  function makeBalloon(col, sway) {
    const { c, g } = mk(T, 34);
    ell(g, C.shadow, 8, 32, 3, 1);
    orect(g, C.trunk, 7, 27, 2, 5);
    const bx = 8 + sway;
    for (let y = 15; y < 28; y++) P(g, '#f4f1ea', Math.round(8 + (bx - 8) * (1 - (y - 15) / 13)), y);
    oell(g, col, bx, 8, 5, 6.5);
    ell(g, shade(col, -0.25), bx + 1.5, 10, 3, 4);
    ell(g, col, bx - 0.5, 7, 3.5, 4.5);
    P(g, shade(col, 0.6), bx - 3, 4, 2, 2);
    P(g, O, bx - 1, 15, 3, 1);
    P(g, col, bx, 15, 1, 1);
    return c;
  }

  function makeNote() {
    const { c, g } = mk(T, T);
    ell(g, C.shadow, 8, 15, 3, 1);
    orect(g, C.trunk, 7, 10, 2, 5);
    orect(g, '#fffaf0', 3, 2, 10, 9);
    P(g, '#b8b0a0', 5, 4, 6, 1);
    P(g, '#b8b0a0', 5, 6, 5, 1);
    P(g, '#e04a5a', 9, 8, 1, 1); P(g, '#e04a5a', 11, 8, 1, 1); P(g, '#e04a5a', 9, 9, 3, 1); P(g, '#e04a5a', 10, 10);
    P(g, '#d94c3a', 7, 1, 2, 2);
    return c;
  }

  // Flecha de tiza en el suelo, apuntando a dir.
  const arrowCache = {};
  function arrow(dir) {
    if (arrowCache[dir]) return arrowCache[dir];
    const { c, g } = mk(T, T);
    const rot = { right: 0, down: 1, left: 2, up: 3 }[dir];
    g.translate(8, 8);
    g.rotate(rot * Math.PI / 2);
    g.translate(-8, -8);
    const col = 'rgba(255,251,232,0.85)';
    P(g, col, 2, 7, 8, 2);
    for (let i = 0; i < 5; i++) P(g, col, 9 + i, 3 + i, 1, 10 - 2 * i);
    P(g, 'rgba(255,251,232,0.35)', 3, 9, 6, 1);
    arrowCache[dir] = c;
    return c;
  }

  // Adosado mediterráneo como los de la urbanización: blanco, de dos plantas (floors: 1 | 2),
  // azotea con pérgola de madera oscura, viga marrón entre plantas y escalera exterior de barro cocido.
  function makeMedHouse(hs) {
    const floors = hs.floors || 2;
    const W = hs.w * T, H = hs.h * T + 8;
    const { c, g } = mk(W, H);
    const white = '#f8f6f1', whiteD = '#e6e1d6', whiteDD = '#cfc8ba', wood = '#5a3a28', woodD = '#3a2418';
    const ground = 32, upper = floors === 2 ? 24 : 0, roof = H - ground - upper;
    const yUp = roof, yGround = roof + upper;

    const win = (x, y, w, h) => {
      P(g, O, x - 1, y - 1, w + 2, h + 2);
      P(g, white, x, y, w, h);
      P(g, '#3d4a5a', x + 1, y + 1, w - 2, h - 2);
      P(g, '#6f8aa6', x + 1, y + 1, 2, h - 2);
      P(g, '#9fb6cc', x + 2, y + 1, 1, 2);
      P(g, white, x + (w >> 1), y + 1, 1, h - 2);
      P(g, wood, x - 1, y - 3, w + 2, 2); // dintel
    };

    // ---- azotea (vista desde arriba) ----
    P(g, O, 0, 0, W, roof + 1);
    P(g, '#ebe5d7', 1, 1, W - 2, roof - 1);
    for (let x = 4; x < W - 2; x += 8) P(g, '#ddd5c4', x, 3, 1, roof - 5);
    P(g, white, 1, 1, W - 2, 2);            // pretil de atrás
    P(g, white, 1, 1, 2, roof - 1);         // pretiles de los lados
    P(g, white, W - 3, 1, 2, roof - 1);
    // caseta de la escalera con su remate escalonado
    P(g, O, 5, 2, 15, roof - 4);
    P(g, white, 6, 3, 13, roof - 6);
    P(g, whiteD, 6, roof - 6, 13, 3);
    P(g, white, 8, 1, 9, 2);
    // pérgola de vigas sobre la mitad derecha
    const px0 = Math.round(W * 0.48), px1 = W - 5;
    for (let x = px0; x <= px1; x += 4) P(g, wood, x, 3, 2, roof - 6);
    P(g, woodD, px0, 3, px1 - px0 + 2, 2);
    P(g, woodD, px0, roof - 5, px1 - px0 + 2, 2);
    // pretil de delante
    P(g, white, 1, roof - 3, W - 2, 3);
    P(g, whiteD, 1, roof - 1, W - 2, 1);

    // ---- planta de arriba ----
    if (upper) {
      P(g, O, 0, yUp, W, upper);
      P(g, white, 1, yUp, W - 2, upper);
      P(g, whiteD, W - 10, yUp, 9, upper);   // sombra lateral
      P(g, wood, 1, yUp + 1, W - 2, 1);       // barandilla de la azotea
      win(Math.round(W * 0.18), yUp + 8, 12, 12);
      win(Math.round(W * 0.6), yUp + 8, 16, 12);
    }

    // ---- planta baja, bajo el porche ----
    P(g, O, 0, yGround, W, ground);
    P(g, white, 1, yGround, W - 2, ground - 1);
    P(g, whiteD, 1, yGround + 3, W - 2, 5);   // sombra del porche
    P(g, wood, 0, yGround, W, 3);             // viga marrón entre plantas
    P(g, woodD, 0, yGround + 3, W, 1);
    // pilares blancos del porche
    [[1, 5], [W - 6, 5]].forEach(([x, w]) => {
      P(g, O, x - 1, yGround + 4, w + 2, ground - 4);
      P(g, white, x, yGround + 4, w, ground - 5);
      P(g, whiteDD, x + w - 1, yGround + 4, 1, ground - 5);
    });
    const doorCol = Math.floor(hs.w / 2);
    const dx = doorCol * T + 3, dw = 10, dy = yGround + 11, dh = H - 3 - dy;
    // escalera exterior: peldaños de barro cocido subiendo hacia la izquierda, con su murete blanco
    if (upper) {
      const steps = [];
      for (let i = 0; i < 12; i++) {
        const sx = 7 + i * 2, sy = H - 6 - i * 2;
        if (sx + 6 > dx - 3) break;
        steps.push([sx, sy]);
      }
      // macizo blanco bajo los peldaños, con su contorno en diagonal
      steps.forEach(([sx, sy]) => {
        P(g, O, sx - 1, sy - 4, 7, 1);
        P(g, whiteD, sx, sy + 2, 6, H - 3 - sy - 2);
        P(g, white, sx + 4, sy - 3, 2, 3);
      });
      steps.forEach(([sx, sy]) => {
        P(g, '#d9733f', sx, sy, 5, 2);
        P(g, '#b85a2e', sx, sy + 1, 5, 1);
      });
      P(g, whiteDD, 6, H - 4, steps.length * 2 + 6, 1);
    }
    // ventana de la planta baja
    win(dx + dw + 7, yGround + 13, 12, 10);
    // puerta de madera oscura con el escalón
    P(g, O, dx - 1, dy - 1, dw + 2, dh + 1);
    P(g, '#6b4423', dx, dy, dw, dh);
    P(g, '#5a3a1e', dx + 3, dy, 1, dh);
    P(g, '#5a3a1e', dx + 6, dy, 1, dh);
    P(g, '#8a5a32', dx, dy, dw, 1);
    P(g, '#ffd35a', dx + 8, dy + (dh >> 1), 1, 1);
    // farol junto a la puerta
    P(g, O, dx + dw + 2, dy + 1, 3, 4);
    P(g, '#ffe7a0', dx + dw + 3, dy + 2, 1, 2);
    // zócalo
    P(g, whiteDD, 1, H - 3, W - 2, 2);
    P(g, '#c96f4a', dx - 2, H - 3, dw + 4, 3);
    return c;
  }

  // El mismo adosado, pero mirando a un lado (face: 'right' | 'left'): se ve la azotea desde arriba
  // y, en el lado de la fachada, el porche con la viga marrón, las ventanas de las dos plantas y la puerta.
  function makeMedHouseSide(hs) {
    const W = hs.w * T, H = hs.h * T + 8;
    const { c, g } = mk(W, H);
    const white = '#f8f6f1', whiteD = '#e6e1d6', whiteDD = '#cfc8ba', wood = '#5a3a28', woodD = '#3a2418';
    const fx = W - 22;          // donde empieza la fachada (a la derecha; para 'left' se voltea)
    const roofB = H - 8;        // abajo, la cara lateral del muro (8px) da sensación de altura

    // ---- azotea ----
    P(g, O, 0, 0, fx + 1, roofB + 1);
    P(g, '#ebe5d7', 1, 1, fx - 1, roofB - 1);
    for (let y = 4; y < roofB - 1; y += 8) P(g, '#ddd5c4', 2, y, fx - 3, 1);
    P(g, white, 1, 1, fx - 1, 2);
    P(g, white, 1, roofB - 2, fx - 1, 2);
    P(g, white, 1, 1, 2, roofB - 1);
    // caseta de la escalera
    P(g, O, 4, 4, 14, 16);
    P(g, white, 5, 5, 12, 14);
    P(g, whiteD, 5, 15, 12, 4);
    // pérgola sobre la parte de delante de la azotea
    const py0 = 5, py1 = roofB - 6;
    for (let y = py0; y <= py1; y += 4) P(g, wood, fx - 26, y, 22, 2);
    P(g, woodD, fx - 26, py0, 2, py1 - py0 + 2);
    P(g, woodD, fx - 6, py0, 2, py1 - py0 + 2);
    // pretil de delante de la azotea, con la barandilla de madera
    P(g, white, fx - 3, 1, 3, roofB - 1);
    P(g, wood, fx - 1, 2, 1, roofB - 3);

    // ---- fachada: planta de arriba (franja estrecha) y planta baja con porche ----
    P(g, O, fx, 0, W - fx, roofB + 1);
    P(g, white, fx + 1, 1, 8, roofB - 1);                 // planta de arriba
    P(g, whiteD, fx + 1, 1, 8, 3);
    P(g, wood, fx + 9, 0, 3, roofB + 1);                   // viga del porche
    P(g, woodD, fx + 12, 0, 1, roofB + 1);
    P(g, white, fx + 13, 1, W - fx - 14, roofB - 1);      // planta baja
    P(g, whiteD, fx + 13, 1, 3, roofB - 1);               // sombra del porche
    const mid = Math.round(roofB / 2);
    // ventanas de la planta de arriba
    [[mid - 14], [mid + 6]].forEach(([wy]) => {
      P(g, O, fx + 2, wy - 1, 6, 10);
      P(g, '#3d4a5a', fx + 3, wy, 4, 8);
      P(g, '#6f8aa6', fx + 3, wy, 1, 8);
    });
    // puerta (en la fila del medio) y ventana de la planta baja
    P(g, O, fx + 15, mid - 6, 6, 13);
    P(g, '#6b4423', fx + 16, mid - 5, 4, 11);
    P(g, '#8a5a32', fx + 16, mid - 5, 4, 1);
    P(g, '#ffd35a', fx + 17, mid + 1, 1, 1);
    P(g, '#c96f4a', W - 2, mid - 7, 2, 15);               // escalón de barro
    P(g, O, fx + 15, mid - 21, 6, 10);
    P(g, '#3d4a5a', fx + 16, mid - 20, 4, 8);
    P(g, O, fx + 15, mid + 12, 6, 6);
    P(g, '#3d4a5a', fx + 16, mid + 13, 4, 4);
    // pilares del porche
    [[1], [roofB - 5]].forEach(([y]) => { P(g, O, fx + 12, y - 1, 8, 6); P(g, white, fx + 13, y, 6, 4); P(g, whiteDD, fx + 13, y + 3, 6, 1); });

    // ---- cara lateral del muro, abajo ----
    P(g, O, 0, roofB, W, 8);
    P(g, whiteD, 1, roofB, W - 2, 7);
    P(g, whiteDD, 1, H - 2, W - 2, 1);
    P(g, wood, fx + 9, roofB, 3, 7);
    return hs.face === 'left' ? flipped(c) : c;
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
    floor: '#e6d8c0', floorD: '#d6c5a9', floorL: '#f0e6d4',
    wall: '#f6f5f2', wallD: '#e8e6e1', wallL: '#ffffff',
    trim: '#3b2a22', trimL: '#5e4332',
    base: '#8a5a32', baseL: '#b07a48',
    sheet: '#f4efe4', sheetD: '#d9d2c2',
    quilt: '#4f7fbf', quiltD: '#3a5f96', quiltL: '#7aa6dd',
  };

  // Baldosas grandes de color beige oscuro, con alguna mota suelta.
  function floorTile(g, x0, y0, tx, ty) {
    P(g, I.floor, x0, y0, T, T);
    const r = rng(hash(tx, ty));
    for (let i = 0; i < 4; i++) P(g, r() < 0.5 ? I.floorD : I.floorL, x0 + 2 + ((r() * 12) | 0), y0 + 2 + ((r() * 12) | 0));
    P(g, I.floorL, x0, y0, T, 1);
    P(g, I.floorL, x0, y0, 1, T);
    P(g, I.floorD, x0, y0 + T - 1, T, 1);
    P(g, I.floorD, x0 + T - 1, y0, 1, T);
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

  // Suelo y paredes de una habitación. Leyenda: X borde, W pared, D puerta, espacio = fuera de la casa (negro),
  // cualquier otra cosa es suelo. Los muebles planos (alfombras, ventanas...) se pintan aquí mismo.
  function room(tiles, furniture) {
    const h = tiles.length, w = tiles[0].length;
    const { c, g } = mk(w * T, h * T);
    const at = (x, y) => (tiles[y] && tiles[y][x]) || 'X';
    const open = (x, y) => at(x, y) !== 'X' && at(x, y) !== ' ';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = tiles[y][x], x0 = x * T, y0 = y * T;
        if (ch === ' ') continue;
        if (ch === 'X') {
          trimTile(g, x0, y0, { u: open(x, y - 1), d: open(x, y + 1), l: open(x - 1, y), r: open(x + 1, y) });
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
  // type: 'bed' (la cama clásica de 2x2) o una de BEDS.
  function bed(d, state = 'empty', type = 'bed') {
    if (BEDS[type]) return bedOf(type, d, state);
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

  // Camas vistas desde arriba, de w x h casillas. pillow: lado donde queda la almohada (up | right | down | left).
  const BEDS = {
    bigbed: { w: 4, h: 3, pillow: 'right', quilt: '#4f7fbf' },
    singlebed: { w: 2, h: 3, pillow: 'up', quilt: '#8a5fbf' },
    kidbed: { w: 2, h: 3, pillow: 'down', quilt: '#e07a3a' },
  };

  // Gira un canvas para que lo que estaba arriba quede mirando a `dir`.
  function rotated(src, dir) {
    if (dir === 'up') return src;
    const side = dir === 'right' || dir === 'left';
    const { c, g } = mk(side ? src.height : src.width, side ? src.width : src.height);
    g.translate(c.width / 2, c.height / 2);
    g.rotate({ right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
    g.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }

  function bedOf(type, d, state) {
    const key = type + ':' + (d ? d.id : '') + ':' + state;
    if (bedCache[key]) return bedCache[key];
    const spec = BEDS[type];
    const side = spec.pillow === 'right' || spec.pillow === 'left';
    const W = (side ? spec.h : spec.w) * T, H = (side ? spec.w : spec.h) * T;
    const { c, g } = mk(W, H);
    const q = spec.quilt, qD = shade(q, -0.25), qL = shade(q, 0.3);
    // armazón, cabecero y colchón
    orect(g, C.woodD, 1, 1, W - 2, H - 2);
    P(g, C.wood, 1, 1, W - 2, 4);
    P(g, C.woodL, 1, 1, W - 2, 1);
    P(g, I.sheet, 3, 5, W - 6, H - 8);
    // almohadas (dos si es de matrimonio)
    const n = W >= 40 ? 2 : 1;
    const pw = Math.floor((W - 8 - (n - 1) * 2) / n);
    const pillows = [];
    for (let i = 0; i < n; i++) {
      const px = 4 + i * (pw + 2);
      orect(g, '#ffffff', px, 7, pw, 6);
      P(g, I.sheetD, px, 12, pw, 1);
      pillows.push(Math.round(px + pw / 2));
    }
    // quien duerme ocupa la última almohada (en la cama de matrimonio, la del lado sur)
    const hx = pillows[n - 1] - 8;
    let top = 16, mound = 0;
    if (d && state !== 'empty') {
      const spr = mk(T, 24);
      drawChar(spr.g, d, 'down', 0);
      if (state === 'sit') {
        g.drawImage(spr.c, 0, 0, T, 20, hx, 1, T, 20);
        top = 19;
      } else {
        g.drawImage(spr.c, 0, 0, T, 12, hx, 4, T, 12);
        P(g, d.skin, hx + 5, 12, 1, 2); P(g, d.skin, hx + 10, 12, 1, 2);
        P(g, O, hx + 4, 13, 2, 1); P(g, O, hx + 10, 13, 2, 1);
        top = 15;
        mound = state === 'sleep1' ? 5 : 4;
      }
    }
    // edredón
    const bottom = H - 3;
    P(g, q, 3, top, W - 6, bottom - top);
    for (let y = top + 4; y < bottom; y += 4) P(g, qD, 3, y, W - 6, 1);
    if (mound) {
      oell(g, q, hx + 8, top + 9, 6, mound, qD);
      ell(g, qL, hx + 6, top + 7, 3, mound - 2.5);
    }
    P(g, qD, 3, top, 1, bottom - top);
    P(g, qD, W - 4, top, 1, bottom - top);
    P(g, I.sheet, 3, top, W - 6, 2);
    P(g, I.sheetD, 3, top + 2, W - 6, 1);
    P(g, C.wood, 1, H - 3, W - 2, 2);

    // girada y con el frente de madera abajo para que tenga algo de volumen
    const r = rotated(c, spec.pillow);
    const out = mk(r.width, r.height + 2);
    out.g.drawImage(r, 0, 0);
    P(out.g, C.woodD, 1, r.height - 1, r.width - 2, 2);
    P(out.g, O, 0, r.height + 1, r.width, 1);
    bedCache[key] = out.c;
    return out.c;
  }

  // ---------- muebles de la casa ----------
  // Mesa con ordenador; el monitor, de perfil, mira a la derecha.
  function makePcDesk() {
    const { c, g } = mk(T, 36);
    ell(g, C.shadow, 8, 34.5, 7, 1.5);
    orect(g, C.woodD, 2, 29, 2, 5);
    orect(g, C.woodD, 12, 29, 2, 5);
    orect(g, C.wood, 1, 5, 14, 24);
    P(g, C.woodL, 1, 5, 14, 1);
    P(g, C.woodD, 1, 27, 14, 2);
    // monitor de lado y su pie
    orect(g, '#3a3a44', 3, 19, 5, 2);
    orect(g, '#2a2a30', 4, 2, 2, 17);
    P(g, '#46464d', 4, 2, 1, 17);
    P(g, '#7cc3f0', 6, 3, 1, 15);
    P(g, '#bfe4f4', 6, 5, 1, 3);
    // teclado y ratón
    orect(g, '#d9d4c8', 9, 8, 3, 11);
    for (let y = 9; y < 19; y += 2) P(g, '#a4aab1', 10, y);
    oell(g, '#d9d4c8', 12.5, 23, 1.2, 1.6);
    return c;
  }

  // Silla de escritorio mirando a la izquierda (el respaldo queda a la derecha).
  function makeOfficeChair() {
    const { c, g } = mk(T, 20);
    ell(g, C.shadow, 8, 18.5, 6, 1.5);
    P(g, '#1e1e22', 7, 13, 2, 4);
    P(g, '#1e1e22', 3, 17, 10, 1);
    orect(g, '#3a3a44', 3, 7, 8, 7);
    P(g, '#4a4a55', 3, 7, 8, 1);
    orect(g, '#2a2a30', 11, 1, 3, 13);
    P(g, '#4a4a55', 11, 1, 3, 1);
    return c;
  }

  // Mesa alargada (3 casillas, tan larga como la cama de matrimonio) con lámpara y libros.
  function makeSideTable() {
    const { c, g } = mk(T, 52);
    ell(g, C.shadow, 8, 50.5, 6, 1.5);
    orect(g, C.woodD, 3, 42, 10, 7);
    P(g, '#ffd35a', 7, 45, 2, 1);
    orect(g, C.wood, 2, 8, 12, 35);
    P(g, C.woodL, 2, 8, 12, 1);
    // lámpara
    oell(g, '#7d552c', 8, 13, 3, 1.5);
    P(g, O, 7, 6, 2, 7);
    orect(g, '#f2e6c8', 5, 1, 6, 5);
    P(g, '#fffaf0', 6, 1, 2, 4);
    // pila de libros
    [['#c23b3b', 22], ['#3b6fc4', 26], ['#e8b83a', 30]].forEach(([col, y]) => {
      orect(g, col, 4, y, 8, 3);
      P(g, '#fffaf0', 11, y, 1, 3);
    });
    return c;
  }

  // Armario empotrado de w casillas, con puertas correderas; sube por la pared de detrás.
  function makeWardrobe(w) {
    const W = w * T;
    const { c, g } = mk(W, 36);
    ell(g, C.shadow, W / 2, 34.5, W / 2 - 1, 1.5);
    orect(g, '#f4f1ea', 1, 1, W - 2, 32);
    P(g, '#ffffff', 1, 1, W - 2, 2);
    for (let x = 1; x < W - 2; x += 16) {
      P(g, '#d8d2c6', x, 3, 1, 30);
      P(g, '#e9e4da', x + 1, 3, 14, 1);
      P(g, '#8a8a96', x + (((x - 1) / 16) % 2 ? 2 : 13), 15, 1, 6);
    }
    P(g, '#d8d2c6', 1, 31, W - 2, 2);
    return c;
  }

  // Nevera vista desde arriba, con la puerta (y los tiradores) mirando a la derecha.
  function makeFridge() {
    const { c, g } = mk(T, 44);
    ell(g, C.shadow, 8, 42.5, 7, 1.5);
    orect(g, '#e9edf0', 2, 1, 12, 29);
    P(g, '#ffffff', 2, 1, 12, 1);
    orect(g, '#cfd5da', 2, 30, 12, 11);
    P(g, '#b8c0c6', 2, 39, 12, 2);
    P(g, '#a4aab1', 11, 2, 1, 39);
    P(g, '#5a6066', 13, 4, 1, 8);
    P(g, '#5a6066', 13, 16, 1, 10);
    P(g, '#f2e27a', 4, 32, 4, 4);
    P(g, '#e04a5a', 5, 33, 2, 1);
    return c;
  }

  // Encimera de cocina con fregadero y vitrocerámica, de w casillas.
  function makeKitchen(w) {
    const W = w * T;
    const { c, g } = mk(W, 24);
    orect(g, '#f2efe6', 1, 9, W - 2, 13);
    for (let x = 1; x < W - 2; x += 16) {
      P(g, '#cfc8b8', x, 10, 1, 10);
      P(g, '#8a8a96', x + 7, 12, 3, 1);
    }
    P(g, '#cfc8b8', 1, 20, W - 2, 2);
    orect(g, '#c9c4bc', 1, 1, W - 2, 8);
    P(g, '#ddd8d0', 1, 1, W - 2, 1);
    P(g, '#a49e96', 1, 8, W - 2, 1);
    const sx = Math.round(W * 0.22), vx = Math.round(W * 0.55);
    orect(g, '#a4aab1', sx, 2, 13, 5);
    P(g, '#7d838b', sx + 1, 3, 11, 3);
    P(g, '#5a6066', sx + 5, 0, 2, 3);
    orect(g, '#2a2a30', vx, 2, 20, 5);
    ell(g, '#4a4a55', vx + 5, 4.5, 3, 2);
    ell(g, '#4a4a55', vx + 14, 4.5, 3, 2);
    oell(g, '#f4efe4', W - 10, 4.5, 4, 2);
    P(g, '#e04a5a', W - 13, 3, 2, 2); P(g, '#f2c14e', W - 10, 2, 2, 2); P(g, '#5cc96a', W - 8, 3, 2, 2);
    return c;
  }

  // Encimera americana (barra) de w casillas: frente de madera hacia el salón.
  function makeBar(w) {
    const W = w * T;
    const { c, g } = mk(W, 22);
    ell(g, C.shadow, W / 2, 20.5, W / 2 - 1, 1.5);
    orect(g, C.woodD, 1, 8, W - 2, 11);
    for (let x = 5; x < W - 2; x += 6) P(g, '#6a4524', x, 9, 1, 10);
    orect(g, '#e3ddd2', 0, 1, W, 7);
    P(g, '#f4efe6', 0, 1, W, 1);
    P(g, '#b8b0a0', 0, 7, W, 1);
    // una lista de la compra y un vaso
    P(g, '#fffaf0', 12, 2, 6, 5);
    P(g, '#b8b0a0', 13, 3, 4, 1); P(g, '#e04a5a', 13, 5, 4, 1);
    orect(g, '#e8f6ff', W - 20, 2, 3, 4);
    return c;
  }

  // Sofá rinconero oscuro en dos piezas que encajan: el tramo de arriba (con la esquina) y el chaise longue.
  const SOFA = { base: '#3d4150', dark: '#2b2e39', light: '#525869', cushion: '#474c5c' };
  function makeSofa() {
    const W = 96, H = 32;
    const { c, g } = mk(W, H);
    P(g, SOFA.base, 11, 11, W - 22, H - 11);
    P(g, O, 32, H - 1, W - 43, 1);
    P(g, SOFA.dark, 32, H - 3, W - 43, 2);
    orect(g, SOFA.dark, 1, 1, W - 2, 10);
    orect(g, SOFA.dark, 1, 1, 10, H);
    P(g, SOFA.light, 2, 1, W - 4, 1);
    orect(g, SOFA.cushion, 12, 12, 19, H - 12);
    [33, 51, 69].forEach(x => { orect(g, SOFA.cushion, x, 12, 16, H - 16); P(g, SOFA.light, x, 12, 16, 1); });
    P(g, SOFA.light, 12, 12, 19, 1);
    orect(g, SOFA.dark, W - 11, 3, 10, H - 4);
    P(g, SOFA.light, W - 11, 3, 10, 1);
    // cojín de color
    orect(g, '#e8b83a', 13, 4, 7, 6);
    P(g, '#f2d06a', 14, 4, 5, 1);
    return c;
  }

  function makeChaise() {
    const W = 32, H = 80;
    const { c, g } = mk(W, H);
    P(g, SOFA.base, 11, 0, 20, H - 2);
    P(g, O, 31, 0, 1, H);
    orect(g, SOFA.dark, 1, 0, 10, H - 1);
    orect(g, SOFA.cushion, 12, 1, 18, 32);
    orect(g, SOFA.cushion, 12, 35, 18, 32);
    P(g, SOFA.light, 12, 35, 18, 1);
    orect(g, SOFA.dark, 1, 69, 30, 10);
    P(g, SOFA.light, 1, 69, 30, 1);
    return c;
  }

  // Mesa baja alargada con el mando de la tele.
  function makeCoffeeTable() {
    const { c, g } = mk(T, 50);
    ell(g, C.shadow, 8, 48.5, 7, 1.5);
    orect(g, C.woodD, 2, 40, 2, 6);
    orect(g, C.woodD, 12, 40, 2, 6);
    orect(g, C.wood, 1, 2, 14, 39);
    P(g, C.woodL, 1, 2, 14, 1);
    P(g, C.woodD, 1, 39, 14, 2);
    // mando
    orect(g, '#2a2a30', 6, 12, 4, 11);
    P(g, '#e04a5a', 7, 13, 2, 1);
    P(g, '#8a8a96', 7, 16); P(g, '#8a8a96', 8, 18); P(g, '#8a8a96', 7, 20);
    // revista
    orect(g, '#f2efe6', 4, 28, 8, 7);
    P(g, '#4f9fe0', 5, 29, 6, 2);
    return c;
  }

  // Mueble bajo con la tele encima, de perfil y mirando a la izquierda.
  function makeTvStand() {
    const { c, g } = mk(T, 60);
    ell(g, C.shadow, 8, 58.5, 7, 1.5);
    orect(g, '#4a3426', 3, 50, 12, 7);
    orect(g, '#6b4d3a', 3, 13, 12, 37);
    P(g, '#80604a', 3, 13, 12, 1);
    orect(g, '#2a2a30', 6, 30, 6, 3);
    orect(g, '#1e1e22', 8, 1, 3, 31);
    P(g, '#33475e', 7, 2, 1, 29);
    P(g, '#6d88a6', 7, 5, 1, 4);
    return c;
  }

  // Váter con la cisterna contra la pared de arriba.
  function makeToilet() {
    const { c, g } = mk(T, 22);
    ell(g, C.shadow, 8, 20.5, 6, 1.5);
    orect(g, '#f4f6f8', 3, 1, 10, 6);
    P(g, '#ffffff', 3, 1, 10, 1);
    P(g, '#a4aab1', 7, 2, 2, 1);
    oell(g, '#f4f6f8', 8, 13, 5, 6);
    ell(g, '#dfe6ea', 8, 13, 3.5, 4.5);
    ell(g, '#9fd0ea', 8, 14, 2, 2.5);
    return c;
  }

  // Lavabo contra la pared de abajo (el grifo queda en ese lado).
  function makeSink() {
    const { c, g } = mk(T, 20);
    orect(g, '#f4f6f8', 1, 3, 14, 13);
    P(g, '#ffffff', 1, 3, 14, 1);
    oell(g, '#dfe6ea', 8, 9, 4.5, 3.5, '#b8c0c6');
    ell(g, '#9fd0ea', 8, 9, 1, 1);
    P(g, '#7d838b', 7, 13, 2, 2);
    orect(g, '#f48ab0', 12, 5, 2, 3);
    orect(g, '#cfd5da', 1, 16, 14, 3);
    return c;
  }

  function makeBathtub() {
    const { c, g } = mk(32, 50);
    orect(g, '#f4f6f8', 1, 2, 30, 44);
    P(g, '#ffffff', 1, 2, 30, 1);
    P(g, '#dfe6ea', 4, 5, 24, 38);
    P(g, '#9fd0ea', 5, 9, 22, 33);
    P(g, '#c9e8f7', 8, 14, 6, 1); P(g, '#c9e8f7', 15, 24, 8, 1); P(g, '#c9e8f7', 9, 33, 5, 1);
    P(g, '#a4aab1', 14, 3, 4, 3);
    // patito de goma
    oell(g, '#f2c14e', 19, 30, 2.5, 2);
    ell(g, '#f2c14e', 21, 27, 1.5, 1.5);
    P(g, '#e07a3a', 22, 27);
    orect(g, '#cfd5da', 1, 46, 30, 3);
    return c;
  }

  // Mesa con montones de ropa doblada.
  function makeClothesTable() {
    const { c, g } = mk(T, 36);
    ell(g, C.shadow, 8, 34.5, 7, 1.5);
    orect(g, C.woodD, 2, 29, 2, 5);
    orect(g, C.woodD, 12, 29, 2, 5);
    orect(g, C.wood, 1, 5, 14, 24);
    P(g, C.woodL, 1, 5, 14, 1);
    P(g, C.woodD, 1, 27, 14, 2);
    [[1, '#4f9fe0'], [8, '#e04a5a'], [15, '#5cc96a']].forEach(([y, col]) => {
      orect(g, col, 3, y, 10, 6);
      P(g, shade(col, 0.3), 3, y, 10, 1);
      P(g, shade(col, -0.3), 3, y + 3, 10, 1);
    });
    P(g, '#f2efe6', 9, 23, 4, 2);
    return c;
  }

  // Cristalera de la terraza en una pared de arriba (ocupa las dos filas de pared).
  function makeTerrace() {
    const { c, g } = mk(64, 32);
    P(g, O, 1, 1, 62, 31);
    P(g, '#e8e4dc', 2, 2, 60, 30);
    const sky = ['#8fd0f3', '#9cd6f4', '#abdcf5', '#bfe4f4', '#d2ecf6', '#e2f3f8'];
    [[4, 26], [34, 26]].forEach(([x, w]) => {
      for (let y = 0; y < 14; y++) P(g, sky[Math.min(5, y >> 1)], x, 4 + y, w, 1);
      P(g, '#cfc6b4', x, 18, w, 10);
      P(g, '#5a5f66', x, 15, w, 1);
      for (let bx = x + 1; bx < x + w; bx += 3) P(g, '#5a5f66', bx, 15, 1, 6);
      for (let i = 0; i < 6; i++) P(g, 'rgba(255,255,255,0.55)', x + 4 + i, 6 + i * 2, 1, 2);
    });
    P(g, '#8a8a96', 29, 14, 1, 5);
    P(g, '#8a8a96', 34, 14, 1, 5);
    P(g, '#a4aab1', 2, 29, 60, 3);
    return c;
  }

  // Cristal (ventana o terraza) en una pared de abajo, de w casillas.
  function makeGlassStrip(w) {
    const W = w * T;
    const { c, g } = mk(W, T);
    P(g, O, 1, 4, W - 2, 9);
    P(g, '#e8e4dc', 2, 5, W - 4, 7);
    P(g, '#a9dcf3', 3, 6, W - 6, 5);
    for (let x = 6; x < W - 6; x += 10) P(g, '#e6f6fd', x, 7, 3, 1);
    for (let x = T; x < W; x += T) P(g, '#e8e4dc', x, 6, 1, 5);
    return c;
  }

  // Luz que entra por una cristalera. dir: 'down' si entra por arriba, 'up' si entra por abajo.
  function makeGlow(w, h, dir) {
    const W = w * T, H = h * T;
    const { c, g } = mk(W, H);
    for (let i = 0; i < H; i++) {
      const y = dir === 'down' ? i : H - 1 - i;
      P(g, `rgba(255,236,170,${(0.24 * (1 - i / H)).toFixed(3)})`, 3 + Math.floor(i * 0.3), y, W - 10, 1);
    }
    return c;
  }

  // ---------- muebles de exterior ----------
  function makePatioTable() {
    const { c, g } = mk(32, 22);
    ell(g, C.shadow, 16, 20.5, 14, 1.5);
    orect(g, '#d9d4c8', 4, 10, 2, 10);
    orect(g, '#d9d4c8', 26, 10, 2, 10);
    orect(g, '#ffffff', 1, 5, 30, 7);
    for (let x = 1; x < 31; x += 4) for (let y = 5; y < 12; y += 4) P(g, '#e05a5a', x + ((y >> 2) % 2) * 2, y, 2, 2);
    P(g, '#c84848', 1, 11, 30, 1);
    // jarra de limonada y vasos
    orect(g, '#fff3a0', 7, 0, 5, 7);
    P(g, '#f2d040', 7, 3, 5, 4);
    P(g, '#ffffff', 8, 1, 1, 2);
    orect(g, '#e8f6ff', 17, 3, 3, 4);
    P(g, '#f2d040', 17, 5, 3, 2);
    orect(g, '#e8f6ff', 23, 4, 3, 3);
    return c;
  }

  // Silla de jardín de plástico blanco, vista de frente.
  function makeGardenChair() {
    const { c, g } = mk(T, 18);
    ell(g, C.shadow, 8, 16.5, 6, 1.5);
    orect(g, '#dcd8ce', 3, 10, 2, 6);
    orect(g, '#dcd8ce', 11, 10, 2, 6);
    orect(g, '#ffffff', 2, 8, 12, 3);
    orect(g, '#f2efe6', 3, 1, 10, 7);
    P(g, '#dcd8ce', 5, 3, 6, 1);
    P(g, '#dcd8ce', 5, 5, 6, 1);
    P(g, '#ffffff', 3, 1, 10, 1);
    return c;
  }

  // Poste con farolillo; los banderines se atan arriba.
  function makePole() {
    const { c, g } = mk(T, 38);
    ell(g, C.shadow, 8, 36.5, 4, 1.2);
    orect(g, C.trunk, 7, 6, 2, 30);
    P(g, C.trunkL, 7, 6, 1, 30);
    orect(g, '#f2c14e', 5, 0, 6, 6);
    P(g, '#fff3b0', 6, 1, 4, 3);
    return c;
  }

  function makePartyTable() {
    const { c, g } = mk(48, 32);
    ell(g, C.shadow, 24, 30.5, 22, 1.5);
    orect(g, '#e27d8a', 1, 16, 46, 13);
    for (let x = 3; x < 46; x += 6) P(g, '#f4a3ae', x, 18, 3, 11);
    P(g, '#c95f6d', 1, 28, 46, 1);
    orect(g, '#ffffff', 1, 13, 46, 4);
    // tarta de dos pisos con velas
    orect(g, '#f6e6c8', 6, 7, 16, 7);
    P(g, '#e27d8a', 6, 7, 16, 2);
    for (let x = 7; x < 22; x += 3) P(g, '#e27d8a', x, 9, 1, 1);
    orect(g, '#f6e6c8', 9, 2, 10, 5);
    P(g, '#8a4fbf', 9, 2, 10, 2);
    [10, 13, 16].forEach((x, i) => {
      P(g, ['#4f9fe0', '#5cc96a', '#e04a5a'][i], x, 1, 1, 2);
      P(g, '#ffd35a', x, 0, 1, 1);
    });
    // vasos y patatas
    [[27, '#e04a5a'], [31, '#4f9fe0'], [35, '#5cc96a']].forEach(([x, col]) => {
      orect(g, col, x, 9, 3, 4);
      P(g, '#ffffff', x, 9, 3, 1);
    });
    oell(g, '#f4efe4', 42, 11, 4, 2);
    ell(g, '#f2c14e', 42, 10, 3, 1.5);
    P(g, '#e0a030', 41, 10); P(g, '#e0a030', 43, 9);
    return c;
  }

  function makeSpeaker() {
    const { c, g } = mk(T, 28);
    ell(g, C.shadow, 8, 26.5, 7, 1.5);
    orect(g, '#2a2a30', 2, 2, 12, 24);
    P(g, '#3a3a44', 2, 2, 12, 1);
    oell(g, '#4a4a55', 8, 8, 3, 3, '#18181c');
    P(g, '#8a8a96', 7, 7, 2, 2);
    oell(g, '#4a4a55', 8, 18, 4.5, 4.5, '#18181c');
    ell(g, '#2a2a30', 8, 18, 2, 2);
    P(g, '#5cc96a', 11, 24);
    return c;
  }

  // Tumbona vista desde arriba (respaldo arriba).
  function makeLounger() {
    const { c, g } = mk(T, 32);
    ell(g, C.shadow, 8, 30.5, 7, 1.5);
    orect(g, '#ffffff', 2, 1, 12, 28);
    P(g, '#4f9fe0', 3, 2, 10, 26);
    for (let y = 4; y < 28; y += 4) P(g, '#ffffff', 3, y, 10, 2);
    P(g, '#d9d4c8', 2, 10, 12, 1);
    orect(g, '#f2c14e', 4, 15, 8, 5);
    P(g, '#e0a030', 4, 17, 8, 1);
    return c;
  }

  // Flotador de donut (plano: se pinta sobre el agua).
  function makeFloat() {
    const { c, g } = mk(T, T);
    ell(g, 'rgba(0,60,90,0.25)', 9, 10, 7, 4);
    oell(g, '#f48ab0', 8, 8, 6.5, 5);
    ell(g, '#f9b6cf', 7, 7, 4, 2.5);
    oell(g, '#4cc0e6', 8, 8, 2.5, 1.6);
    [[4, 6, '#ffd35a'], [11, 6, '#5cc96a'], [6, 11, '#4f9fe0'], [11, 10, '#ffffff']].forEach(([x, y, col]) => P(g, col, x, y, 2, 1));
    return c;
  }

  function makeGift() {
    const { c, g } = mk(T, T);
    ell(g, C.shadow, 8, 14.5, 7, 1.5);
    orect(g, '#4f9fe0', 2, 6, 12, 8);
    P(g, '#3a7fc0', 2, 12, 12, 2);
    orect(g, '#7cc3f0', 1, 4, 14, 3);
    P(g, '#f2c14e', 7, 4, 2, 10);
    P(g, '#f2c14e', 4, 1, 3, 3); P(g, '#f2c14e', 9, 1, 3, 3);
    P(g, '#e0a030', 7, 3, 2, 1);
    return c;
  }

  function makeBench() {
    const { c, g } = mk(32, 20);
    ell(g, C.shadow, 16, 18.5, 14, 1.5);
    [4, 26].forEach(x => orect(g, '#3a3a40', x, 10, 2, 8));
    orect(g, C.wood, 2, 1, 28, 3);
    P(g, C.woodL, 2, 1, 28, 1);
    orect(g, C.wood, 2, 8, 28, 3);
    P(g, C.woodL, 2, 8, 28, 1);
    P(g, C.woodD, 2, 10, 28, 1);
    [4, 26].forEach(x => orect(g, '#3a3a40', x, 3, 2, 5));
    return c;
  }

  // Baliza de luz negra, como las de los caminos de la urbanización.
  function makeBollard() {
    const { c, g } = mk(T, 20);
    ell(g, C.shadow, 8, 18.5, 3.5, 1.2);
    orect(g, '#2e2e33', 6, 4, 4, 14);
    P(g, '#46464d', 6, 4, 1, 14);
    P(g, '#fff3c0', 6, 6, 4, 2);
    P(g, '#1e1e22', 5, 3, 6, 1);
    return c;
  }

  // Coche aparcado, visto de lado.
  function makeCar(col) {
    const { c, g } = mk(32, 22);
    ell(g, C.shadow, 16, 20, 15, 2);
    orect(g, col, 1, 9, 30, 8);
    orect(g, col, 7, 3, 17, 7);
    P(g, '#bfe4f4', 9, 4, 6, 5); P(g, '#bfe4f4', 16, 4, 6, 5);
    P(g, '#ffffff', 10, 5, 2, 1);
    P(g, shade(col, 0.3), 1, 9, 30, 1);
    P(g, shade(col, -0.3), 1, 15, 30, 2);
    P(g, '#ffd35a', 29, 11, 2, 2); P(g, '#e04a4a', 1, 11, 2, 2);
    [7, 24].forEach(x => { oell(g, '#2a2a30', x, 17, 3, 3); P(g, '#a4aab1', x - 1, 16, 2, 2); });
    return c;
  }

  function makeSwing() {
    const { c, g } = mk(48, 32);
    ell(g, C.shadow, 24, 30.5, 22, 1.5);
    orect(g, '#c23b3b', 1, 2, 46, 3);
    [[2, '#c23b3b'], [44, '#c23b3b']].forEach(([x, col]) => orect(g, col, x, 4, 2, 26));
    [14, 30].forEach(x => {
      P(g, '#9a9a9a', x, 5, 1, 17); P(g, '#9a9a9a', x + 5, 5, 1, 17);
      orect(g, '#f2c14e', x - 1, 22, 8, 2);
    });
    return c;
  }

  function makeSlide() {
    const { c, g } = mk(32, 30);
    ell(g, C.shadow, 16, 28.5, 15, 1.5);
    orect(g, '#4f9fe0', 2, 4, 3, 24);
    orect(g, '#4f9fe0', 9, 4, 3, 24);
    for (let y = 8; y < 27; y += 4) P(g, '#3a7fc0', 5, y, 4, 1);
    orect(g, '#4f9fe0', 2, 3, 10, 3);
    for (let i = 0; i < 20; i++) P(g, i < 2 ? O : '#f2c14e', 12 + i, 4 + i, 2, 3);
    return c;
  }

  // Muebles: tamaño en casillas. Los planos no bloquean el paso y se pintan en el suelo.
  // Los `stretch` no tienen tamaño fijo: se les da `w` y `h` en el mapa (por defecto 1).
  const FURNITURE = {
    bed: { w: 2, h: 2, make: () => bed(null) },
    ...Object.fromEntries(Object.entries(BEDS).map(([k, b]) => [k, { w: b.w, h: b.h, make: () => bed(null, 'empty', k) }])),
    pcdesk: { w: 1, h: 2, make: makePcDesk },
    officechair: { w: 1, h: 1, make: makeOfficeChair },
    sidetable: { w: 1, h: 3, make: makeSideTable },
    wardrobe: { stretch: true, make: makeWardrobe },
    fridge: { w: 1, h: 2, make: makeFridge },
    kitchen: { stretch: true, make: makeKitchen },
    bar: { stretch: true, make: makeBar },
    sofa: { w: 6, h: 2, make: makeSofa },
    chaise: { w: 2, h: 5, make: makeChaise },
    coffeetable: { w: 1, h: 3, make: makeCoffeeTable },
    tvstand: { w: 1, h: 3, make: makeTvStand },
    toilet: { w: 1, h: 1, make: makeToilet },
    sink: { w: 1, h: 1, make: makeSink },
    bathtub: { w: 2, h: 3, make: makeBathtub },
    clothestable: { w: 1, h: 2, make: makeClothesTable },
    terrace: { w: 4, h: 2, flat: true, make: makeTerrace },
    glass: { stretch: true, flat: true, make: makeGlassStrip },
    lightdown: { stretch: true, flat: true, make: (w, h) => makeGlow(w, h, 'down') },
    lightup: { stretch: true, flat: true, make: (w, h) => makeGlow(w, h, 'up') },
    nightstand: { w: 1, h: 1, make: makeNightstand },
    desk: { w: 2, h: 1, make: makeDesk },
    chair: { w: 1, h: 1, make: makeChair },
    bookshelf: { w: 2, h: 1, make: makeBookshelf },
    plant: { w: 1, h: 1, make: makePlant },
    window: { w: 2, h: 2, flat: true, make: makeWindow },
    calendar: { w: 1, h: 1, flat: true, make: makeCalendar },
    rug: { w: 4, h: 3, flat: true, make: makeRug },
    sunbeam: { w: 3, h: 3, flat: true, make: makeSunbeam },
    patiotable: { w: 2, h: 1, make: makePatioTable },
    gardenchair: { w: 1, h: 1, make: makeGardenChair },
    pole: { w: 1, h: 1, make: makePole },
    partytable: { w: 3, h: 1, make: makePartyTable },
    speaker: { w: 1, h: 1, make: makeSpeaker },
    lounger: { w: 1, h: 2, make: makeLounger },
    float: { w: 1, h: 1, flat: true, make: makeFloat },
    gift: { w: 1, h: 1, make: makeGift },
    car: { w: 2, h: 1, make: () => makeCar('#c23b3b') },
    carblue: { w: 2, h: 1, make: () => makeCar('#3b6fc4') },
    carwhite: { w: 2, h: 1, make: () => makeCar('#ecebe6') },
    swing: { w: 3, h: 1, make: makeSwing },
    bench: { w: 2, h: 1, make: makeBench },
    bollard: { w: 1, h: 1, make: makeBollard },
    slide: { w: 2, h: 1, make: makeSlide },
  };
  const furnitureImgs = {};

  function furniture(type, w, h) {
    const f = FURNITURE[type];
    if (!f) throw new Error(`Mueble desconocido: ${type}`);
    const fw = f.stretch ? w || 1 : f.w, fh = f.stretch ? h || 1 : f.h;
    const key = f.stretch ? `${type}:${fw}x${fh}` : type;
    if (!furnitureImgs[key]) furnitureImgs[key] = f.make(fw, fh);
    return { w: fw, h: fh, flat: !!f.flat, img: furnitureImgs[key] };
  }

  const treeImgs = [];
  const staticCache = {};
  const BALLOON_COLS = ['#e04a5a', '#f2c14e', '#4f9fe0', '#c77dff', '#5cc96a'];

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
        } else if (ch === 'w') {
          const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].map(v => v === 'w');
          const key = 'wall' + nb.map(Number).join('');
          if (!staticCache[key]) staticCache[key] = makeWall(...nb);
          list.push({ img: staticCache[key], dx: x * T, dy: base - 28, base });
        } else if (ch === 'h') {
          const l = at(x - 1, y) === 'h', r = at(x + 1, y) === 'h';
          const key = `hedge${+l}${+r}`;
          if (!staticCache[key]) staticCache[key] = makeHedge(l, r);
          list.push({ img: staticCache[key], dx: x * T, dy: base - 24, base });
        } else if (ch === 'g') {
          const col = BALLOON_COLS[(x * 3 + y * 7) % BALLOON_COLS.length];
          const key = 'balloon' + col;
          if (!staticCache[key]) staticCache[key] = [-1, 0, 1, 0].map(s => makeBalloon(col, s));
          const frames = staticCache[key];
          list.push({ img: frames[0], frames, dx: x * T, dy: base - 34, base });
        } else if (ch === 'Y') {
          if (!staticCache.palms) staticCache.palms = [makePalm(3), makePalm(8), makePalm(21)];
          list.push({ img: staticCache.palms[(x * 5 + y * 3) % 3], dx: x * T - 8, dy: base - 48, base });
        } else if (ch === 'n') {
          if (!staticCache.note) staticCache.note = makeNote();
          list.push({ img: staticCache.note, dx: x * T, dy: y * T, base });
        }
      }
    }
    (map.houses || []).forEach(hs => {
      const side = hs.face === 'left' || hs.face === 'right';
      const img = (hs.style !== 'med' ? makeHouse : side ? makeMedHouseSide : makeMedHouse)(hs);
      list.push({ img, dx: hs.x * T, dy: (hs.y + hs.h) * T - img.height, base: (hs.y + hs.h) * T });
    });
    furnitureList.filter(f => !f.flat).forEach(f => {
      const base = (f.y + f.h) * T;
      list.push({ img: f.img, dx: f.x * T, dy: base - f.img.height, base, furn: f });
    });
    return list;
  }

  // ---------- personajes (16x24) ----------
  // Cabeza calva de Anthon, configurable con d.look:
  //   beard: full | goatee | stubble | none      glasses: aviator | round | thick | sun | none
  //   eyes: dot | big | happy                    mouth: smile | none          earring, blush: bool
  function drawBald(g, d, dir) {
    const look = d.look || {};
    const skin = d.skin, skinD = shade(skin, -0.2);
    const bc = d.beardColor || '#6b3f22', bcD = shade(bc, -0.3);
    const beard = look.beard || 'none', glasses = look.glasses || 'none';
    const eyes = look.eyes || 'dot', mouth = look.mouth || 'none';
    const gold = '#d4b05a', dark = '#3a2a20', mc = '#8a3a3a', stub = 'rgba(80,50,30,0.35)';
    const green = d.eyes, fc = look.frame || gold;
    // ojo con iris verde, brillo blanco arriba a la izquierda y pupila oscura
    const eye = (x, y, h) => { P(g, green, x, y, 2, h); P(g, O, x + 1, y + (h > 2 ? 1 : 1), 1, h - 1); P(g, '#ffffff', x, y); };
    const frame = glasses === 'thick' || glasses === 'sun' ? dark : gold;
    P(g, shade(skin, 0.25), dir === 'left' ? 6 : 5, 4, 3, 1);
    if (look.tuft && !d.hat) { P(g, O, 7, 1, 3, 1); P(g, O, 8, 0); P(g, bc, 8, 1); P(g, O, 6, 2, 1, 1); }
    if (dir === 'up') {
      if (d.hat) { orect(g, d.hat, 3, 1, 10, 4); P(g, shade(d.hat, -0.3), 4, 5, 8, 1); }
      return;
    }

    if (dir === 'down') {
      P(g, bc, 4, 5, 3, 1); P(g, bc, 9, 5, 3, 1); // cejas
      // ojos
      if (glasses === 'sun') {
        P(g, dark, 3, 6, 10, 1); P(g, dark, 3, 7, 4, 2); P(g, dark, 9, 7, 4, 2);
        P(g, '#5a6a8a', 4, 7, 2, 1); P(g, '#5a6a8a', 10, 7, 2, 1);
      } else {
        const eh = glasses === 'none' ? 3 : 2; // alto del ojo: más grande si no hay gafas
        if (eyes === 'sparkle') { eye(5, 7, eh); eye(9, 7, eh); }
        else if (eyes === 'wink') { eye(5, 7, eh); P(g, O, 9, 8, 3, 1); P(g, O, 12, 7); }
        else if (eyes === 'big') { eye(5, 7, 2); eye(9, 7, 2); }
        else if (eyes === 'happy') { P(g, O, 4, 8); P(g, O, 5, 7, 2, 1); P(g, O, 7, 8); P(g, O, 9, 8); P(g, O, 10, 7, 2, 1); P(g, O, 12, 8); }
        else { P(g, O, 5, 7, 1, 2); P(g, O, 10, 7, 1, 2); }
        if (glasses === 'aviator') {
          P(g, gold, 3, 6, 5, 1); P(g, gold, 8, 6, 5, 1); P(g, gold, 3, 7, 1, 3); P(g, gold, 7, 7, 2, 2); P(g, gold, 12, 7, 1, 3);
        } else if (glasses === 'round') {
          if (look.tint) { P(g, look.tint, 4, 7, 3, 2); P(g, look.tint, 9, 7, 3, 2); eye(5, 7, 2); eye(9, 7, 2); }
          P(g, fc, 4, 6, 3, 1); P(g, fc, 9, 6, 3, 1); P(g, fc, 3, 7, 1, 2); P(g, fc, 7, 7, 2, 1); P(g, fc, 12, 7, 1, 2);
          P(g, fc, 4, 9, 3, 1); P(g, fc, 9, 9, 3, 1); P(g, fc, 7, 7, 1, 2); P(g, fc, 8, 7, 1, 2);
        } else if (glasses === 'thick') {
          P(g, dark, 3, 6, 10, 1); P(g, dark, 3, 9, 4, 1); P(g, dark, 9, 9, 4, 1);
          P(g, dark, 3, 7, 1, 2); P(g, dark, 6, 7, 1, 2); P(g, dark, 9, 7, 1, 2); P(g, dark, 12, 7, 1, 2); P(g, dark, 7, 7, 2, 1);
        }
      }
      P(g, skinD, 7, 9, 2, 1); // nariz
      if (beard === 'full') {
        P(g, bc, 3, 9, 1, 3); P(g, bc, 12, 9, 1, 3); P(g, bc, 4, 10, 2, 2); P(g, bc, 10, 10, 2, 2);
        P(g, bc, 6, 10, 4, 2); P(g, bc, 4, 12, 8, 1); P(g, bcD, 5, 13, 6, 1);
        if (mouth === 'smile') P(g, '#e8a0a0', 7, 11, 2, 1);
      } else if (beard === 'goatee') {
        P(g, bc, 6, 10, 4, 1); P(g, bc, 6, 11, 4, 2); P(g, bcD, 7, 13, 2, 1);
        if (mouth === 'smile') { P(g, mc, 6, 11); P(g, mc, 9, 11); }
      } else {
        if (beard === 'stubble') { P(g, stub, 3, 9, 10, 3); P(g, stub, 4, 12, 8, 1); }
        if (mouth === 'smile') { P(g, mc, 6, 10); P(g, mc, 9, 10); P(g, mc, 7, 11, 2, 1); }
        else if (mouth === 'tiny') P(g, mc, 7, 11, 2, 1);
        else if (mouth === 'open') { P(g, mc, 7, 10, 2, 2); P(g, '#ff8a8a', 7, 11, 2, 1); }
        else if (mouth === 'o') P(g, mc, 7, 10, 2, 2);
      }
      if (d.hat) {
        orect(g, d.hat, 3, 1, 10, 4); P(g, shade(d.hat, 0.3), 5, 1, 3, 1);
        P(g, O, 2, 6, 12, 1); P(g, shade(d.hat, -0.3), 2, 5, 12, 1);
      }
    } else {
      P(g, bc, 3, 5, 3, 1);
      P(g, skinD, 10, 8, 2, 2); // oreja
      if (look.earring) P(g, gold, 10, 10);
      if (glasses === 'sun') { P(g, dark, 3, 6, 8, 1); P(g, dark, 3, 7, 4, 2); P(g, '#5a6a8a', 4, 7, 2, 1); }
      else {
        if (eyes === 'sparkle' || eyes === 'wink') { eye(4, 7, glasses === 'none' ? 3 : 2); }
        else if (eyes === 'big') eye(4, 7, 2);
        else if (eyes === 'happy') { P(g, O, 4, 8); P(g, O, 5, 7, 2, 1); }
        else P(g, O, 4, 7, 1, 2);
        if (glasses !== 'none') {
          const c = frame;
          P(g, c, 3, 6, 4, 1); P(g, c, 3, 7, 1, 3); P(g, c, 6, 7, 1, 2); P(g, c, 7, 6, 4, 1);
          if (glasses === 'thick') P(g, c, 3, 9, 4, 1);
        }
      }
      if (beard === 'full') { P(g, bc, 3, 10, 7, 2); P(g, bc, 6, 8, 4, 2); P(g, bcD, 4, 12, 5, 1); }
      else if (beard === 'goatee') { P(g, bc, 3, 10, 3, 2); P(g, bcD, 4, 12, 3, 1); }
      else {
        if (beard === 'stubble') P(g, stub, 3, 9, 7, 3);
        if (mouth === 'smile') { P(g, mc, 3, 10); P(g, mc, 4, 11, 3, 1); }
        else if (mouth === 'tiny') P(g, mc, 3, 11, 2, 1);
        else if (mouth === 'open' || mouth === 'o') { P(g, mc, 3, 10, 2, 2); }
      }
    }
  }

  // Cabeza calva: igual de cuadrada que las demás pero con la parte de arriba algo más redondeada.
  // Contorno del tono de la piel (no negro) para que no se lea como pelo.
  function baldHead(g, skin) {
    const o = shade(skin, -0.45);
    P(g, o, 5, 2, 6, 1); P(g, o, 3, 3, 10, 1); P(g, o, 2, 4, 12, 8); P(g, o, 3, 12, 10, 1);
    P(g, skin, 5, 3, 6, 1); P(g, skin, 3, 4, 10, 8);
  }

  function drawChar(g, d, dir, f) {
    const skin = d.skin, skinD = shade(skin, -0.2);
    const hair = d.hair, hairL = shade(hair, 0.3), hairD = shade(hair, -0.3);
    const shirt = d.shirt, shirtD = shade(shirt, -0.3);
    const pants = d.pants, pantsD = shade(pants, -0.3);
    const shoe = '#3b2a20', blush = '#f0a0a0';
    const style = d.hairStyle;
    const bald = style === 'bald';

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
      bald ? baldHead(g, skin) : orect(g, skin, 3, 3, 10, 9);

      if (dir === 'down' && bald) {
        drawBald(g, d, 'down');
      } else if (dir === 'down') {
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
      } else if (bald) {
        drawBald(g, d, 'up');
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
    bald ? baldHead(g, skin) : orect(g, skin, 3, 3, 10, 9);
    if (bald) {
      drawBald(g, d, 'left');
    } else if (style === 'old') {
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

  return { T, ground, room, furniture, bed, arrow, buildStatics, charSheet, portrait, util };
})();
