'use strict';

// Batalla en coche contra el monstruo: reglas comunes a todos los estilos (movimiento lateral, balas,
// recarga, vida, explosión final e interfaz). Cada estilo visual es una «vista» que se registra en
// Battle.views (chasetop.js, chase3d.js) y pone la geometría y el dibujo del mundo.
// Los ajustes (vida, cargador, recarga) están en CHASE, en data.js.
const Battle = (() => {
  const { P, ell } = Art.util;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const views = {};

  // Colores del monstruo, compartidos por todas las vistas (y por los trozos al explotar).
  const M = {
    skin: '#7b5aa6', skinD: '#5a3f80', skinL: '#9d7dc6',
    pants: '#4a3b2e', pantsD: '#33281f', claw: '#efe6cf',
    face: '#f0c39b', faceD: '#d39a74', faceDD: '#a86f50',
    hair: '#f7f7f4', hairD: '#c9ccd6',
  };

  /*
   * Una vista define:
   *  name                         nombre en el menú
   *  carStartX, carMin, carMax    posición y límites del coche (px del lienzo 320x240)
   *  bulletFrames, bulletEnd      frames hasta la altura del monstruo y hasta desaparecer (en progreso p)
   *  hitHalfW                     media anchura del cuerpo del monstruo para los impactos
   *  monArea { hw, y0, y1, fx }   zona de las explosiones finales y escala de las llamas
   *  init(st)  scroll(st)         estado propio (st.w) y avance del escenario cada frame
   *  gun(st)  exhaust(st)         boca del arma y salida del humo -> { x, y, ... }
   *  bulletPos(b, p)              posición de una bala con progreso p -> { x, y, size }
   *  monsterTarget(st, sway)      x a la que va el monstruo; sway oscila entre -1 y 1
   *  draw(st, g)                  dibuja el mundo
   */
  function create(onWin, style) {
    const view = views[style] || Object.values(views)[0];
    const st = {
      view, onWin, t: 0,
      car: { x: view.carStartX, vx: 0, recoil: 0, flash: 0 },
      ammo: CHASE.magazine, reload: 0, cooldown: 0,
      mon: { x: view.carStartX, hp: CHASE.hp, lag: CHASE.hp, flash: 0, roar: 0, knock: 0, phase: 0, roarT: 90, dead: false },
      bullets: [], parts: [],
      shake: 0, white: 0, state: 'fight', stateT: 0, banner: 150, done: false,
    };
    view.init(st);
    return st;
  }

  // ---------- actualización ----------
  // input: { dir: -1 | 0 | 1, fire: bool } o null mientras hay un fundido.
  function update(st, input) {
    st.t++;
    Sfx.engine(true);
    st.view.scroll(st);
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
    const v = st.view, car = st.car;
    const playing = st.state === 'fight' && input;
    car.vx = (car.vx + (playing ? input.dir : 0) * 0.55) * 0.84;
    const x = clamp(car.x + car.vx, v.carMin, v.carMax);
    if (x !== car.x + car.vx) car.vx = 0;
    car.x = x;
    car.recoil *= 0.7;
    if (car.flash > 0) car.flash--;
    if (st.t % 4 === 0) st.parts.push({ kind: 'smoke', r: 2, life: 26, max: 26, ...v.exhaust(st) });

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
    const m = st.mon, area = st.view.monArea;
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
    const sway = 0.65 * Math.sin(m.phase) + 0.35 * Math.sin(m.phase * 2.3 + 1.3);
    m.x += (st.view.monsterTarget(st, sway) - m.x) * 0.08;
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
    if (st.stateT % 7 === 0) explosion(st, m.x + rand(-area.hw, area.hw), rand(area.y0, area.y1), 6, area.fx);
    if (st.stateT % 14 === 0) Sfx.boom();
    if (st.stateT >= 120) {
      m.dead = true;
      st.state = 'won';
      st.stateT = 0;
      st.white = 1;
      st.shake = 9;
      Sfx.bigBoom();
      for (let i = 0; i < 6; i++) explosion(st, m.x + rand(-area.hw, area.hw), rand(area.y0, area.y1), 8, 1.6 * area.fx);
      for (let i = 0; i < 30; i++) {
        const a = rand(-Math.PI, 0), v = rand(1, 3.5) * Math.sqrt(area.fx);
        const hairBit = i % 3 === 0;
        st.parts.push({
          kind: 'chunk', x: m.x + rand(-area.hw, area.hw) * 0.6, y: rand(area.y0, area.y1), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, grav: 0.12,
          col: hairBit ? M.hair : i % 2 ? M.skin : M.skinD, size: hairBit ? 2 : 3, life: 80, max: 80,
        });
      }
    }
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
        g.globalAlpha = k * 0.45;
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
    if (!st.mon.dead) drawBossBar(st, ctx, ui);

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

  return { views, M, rand, clamp, create, update, drawWorld, drawHud, drawParticles, shakeOffset };
})();
