'use strict';

// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
const Sfx = (() => {
  let ctx = null;
  let master = null;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq, freqEnd, type = 'square', dur = 0.08, vol = 0.3, delay = 0 }) {
    const c = unlock();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noiseSource(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    return src;
  }

  // Ruido filtrado con envolvente: respiraciones, sábanas, puertas.
  function hiss({ type = 'bandpass', freq = 800, freqEnd, q = 1, dur = 0.3, vol = 0.2, delay = 0, attack = 0.02 }) {
    const c = unlock();
    if (!c) return;
    const t = c.currentTime + delay;
    const src = noiseSource(c);
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // Ronquido: inspiración grave que vibra (el LFO abre y cierra el volumen) y espiración soplada.
  function snore() {
    const c = unlock();
    if (!c) return;
    const t = c.currentTime, inhale = 1.3;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.linearRampToValueAtTime(78, t + inhale);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 4;
    const flutter = c.createGain();
    flutter.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.frequency.value = 24;
    const depth = c.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth);
    depth.connect(flutter.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.6, t + inhale * 0.75);
    env.gain.exponentialRampToValueAtTime(0.0001, t + inhale);
    osc.connect(lp);
    lp.connect(flutter);
    flutter.connect(env);
    env.connect(master);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + inhale + 0.05);
    lfo.stop(t + inhale + 0.05);
    hiss({ freq: 500, dur: inhale, vol: 0.08, attack: inhale * 0.6 });
    hiss({ freq: 1400, freqEnd: 600, q: 2, dur: 0.9, vol: 0.07, delay: inhale + 0.15, attack: 0.15 });
  }

  // Rugido del monstruo: diente de sierra grave que tiembla, con aliento ruidoso encima.
  function roar() {
    const c = unlock();
    if (!c) return;
    const t = c.currentTime, dur = 1.1;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 6;
    const flutter = c.createGain();
    flutter.gain.value = 0.6;
    const lfo = c.createOscillator();
    lfo.frequency.value = 31;
    const depth = c.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(flutter.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    lp.connect(flutter);
    flutter.connect(env);
    env.connect(master);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
    hiss({ freq: 700, freqEnd: 300, q: 1.5, dur, vol: 0.18, attack: 0.1 });
  }

  // Motor en bucle: se llama cada frame con on/off; solo arranca o para cuando cambia.
  let motor = null;
  function engine(on) {
    if (!on) {
      if (!motor) return;
      const t = ctx.currentTime;
      motor.gain.gain.setTargetAtTime(0.0001, t, 0.06);
      motor.oscs.forEach(o => o.stop(t + 0.4));
      motor = null;
      return;
    }
    if (motor || !ctx) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const oscs = [[52, 'sawtooth'], [78, 'square']].map(([f, type]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(lp);
      o.start(t);
      return o;
    });
    // ronroneo: el LFO hace vibrar el volumen como los cilindros
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 17;
    const depth = ctx.createGain();
    depth.gain.value = 0.025;
    lfo.connect(depth);
    depth.connect(gain.gain);
    lfo.start(t);
    oscs.push(lfo);
    lp.connect(gain);
    gain.connect(master);
    motor = { gain, oscs };
  }

  // ---------- música de la fase 1 (casa y patio) ----------
  // Generativa: en vez de un bucle fijo, compone sobre la marcha. Un tema de 2 compases se repite
  // transportado sobre cada acorde (así se reconoce), se contesta con frases nuevas, cambian la
  // progresión, el acompañamiento y la tonalidad cada pocas vueltas, y casi nunca suena igual dos veces.
  const music = (() => {
    const BPM = 116;
    const E = 60 / BPM / 2; // una corchea
    const SCALE = [0, 2, 4, 5, 7, 9, 11]; // Do mayor; la tonalidad se transporta con KEYS
    const KEYS = [0, 2, 5, 0, -3, 4, -5, 2];
    const PROGS = [ // grados de la escala (0 = I, 3 = IV, 4 = V, 5 = vi), un acorde por compás
      [0, 4, 5, 3], [0, 5, 3, 4], [0, 2, 3, 4], [5, 3, 0, 4], [0, 3, 0, 4], [3, 4, 2, 5], [0, 2, 5, 4],
    ];
    // ritmos de melodía: [corchea de inicio, duración en corcheas]
    const RHYTHMS = [
      [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2]],
      [[0, 1], [1, 1], [2, 2], [4, 1], [5, 1], [6, 2]],
      [[0, 3], [3, 1], [4, 2], [6, 1], [7, 1]],
      [[0, 2], [2, 2], [4, 1], [5, 1], [6, 1], [7, 1]],
      [[1, 1], [2, 1], [3, 2], [5, 1], [6, 2]],
      [[0, 1], [1, 1], [2, 1], [3, 1], [4, 4]],
      [[0, 4], [4, 2], [6, 2]],
    ];
    const BASS = [ // [corchea, grados sobre la fundamental]
      [[0, 0], [2, 7], [4, 4], [6, 7]],
      [[0, 0], [3, 0], [4, 4], [7, 4]],
      [[0, 0], [4, 4]],
      [[0, 0], [2, 0], [4, 4], [5, 4], [6, 7]],
    ];
    const KICKS = [[0, 4], [0, 4, 7], [0, 3, 4]];
    const ARPS = [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 1, 2, 3, 2, 1, 2], [0, 1, 2, 1, 3, 2, 1, 0]];
    const LEVEL = 0.55, DUCKED = 0.16;

    const pick = a => a[Math.floor(Math.random() * a.length)];
    const midiOf = (d, key) => 60 + key + 12 * Math.floor(d / 7) + SCALE[((d % 7) + 7) % 7];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);

    let song = null;

    // ---- composición ----
    function nearestTone(d, chord) {
      let best = d, bd = 99;
      for (const base of [-7, 0, 7]) {
        for (const o of [0, 2, 4]) {
          const c = chord + o + base;
          if (Math.abs(c - d) < bd) { bd = Math.abs(c - d); best = c; }
        }
      }
      return best;
    }

    function newSpec() {
      const pat = pick(RHYTHMS);
      return { pat, steps: pat.map(() => pick([-2, -1, -1, -1, 0, 1, 1, 1, 2, -3, 3])) };
    }

    function realize(spec, chord, from, ending) {
      let d = from;
      const out = spec.pat.map(([s, l], i) => {
        d += spec.steps[i];
        if (s % 4 === 0) d = nearestTone(d, chord); // los tiempos fuertes caen en notas del acorde
        d = Math.max(2, Math.min(12, d));
        return { s, l, d };
      });
      if (ending) { // la última nota del tema se posa en el acorde y se alarga
        const n = out[out.length - 1];
        n.d = Math.max(2, Math.min(12, nearestTone(n.d, chord)));
        n.l = 8 - n.s;
      }
      return out;
    }

    function planPass() {
      if (song.pass % 2 === 0) { // progresión nueva
        let prog;
        do { prog = pick(PROGS); } while (prog === song.prog);
        const a = newSpec();
        song.prog = prog;
        song.key = KEYS[(song.pass / 2) % KEYS.length];
        song.specs = [a, newSpec(), Math.random() < 0.75 ? a : newSpec(), newSpec()];
        song.bass = pick(BASS);
        song.kick = pick(KICKS);
        song.arp = pick(ARPS);
        song.strum = pick([[2, 6], [1, 3, 5, 7], [2, 3, 6, 7]]);
        song.comp = song.comp === 'arp' ? 'strum' : 'arp';
      } else { // segunda vuelta: mismo tema, respuestas nuevas
        const a = song.specs[0];
        song.specs = [a, newSpec(), a, newSpec()];
        song.comp = song.comp === 'arp' ? 'strum' : 'arp';
        if (Math.random() < 0.35) song.arp = pick(ARPS);
      }
    }

    // ---- instrumentos ----
    function note(midi, t, dur, o) {
      const c = ctx;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(o.cutoff, t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, o.cutoff * 0.4), t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(o.vol * 0.5, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      [[o.type, 1, 0], [o.type2, 0.3, 6]].forEach(([type, amp, cents]) => {
        if (!type) return;
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.value = hz(midi);
        osc.detune.value = cents;
        const m = c.createGain();
        m.gain.value = amp;
        osc.connect(m);
        m.connect(lp);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
      lp.connect(g);
      g.connect(song.bus);
      if (o.send) {
        const s = c.createGain();
        s.gain.value = o.send;
        g.connect(s);
        s.connect(song.echo);
      }
    }

    const LEAD = { type: 'triangle', type2: 'square', vol: 0.17, cutoff: 3400, send: 0.32 };
    const BASSV = { type: 'triangle', type2: 'sine', vol: 0.3, cutoff: 800 };
    const STAB = { type: 'triangle', vol: 0.055, cutoff: 2200, send: 0.12 };
    const PLUCK = { type: 'sine', type2: 'triangle', vol: 0.085, cutoff: 2600, send: 0.28 };

    function kick(t) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.38, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g);
      g.connect(song.bus);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    function noiseHit(t, type, freq, q, dur, vol) {
      const src = noiseSource(ctx);
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(song.bus);
      src.start(t);
      src.stop(t + dur + 0.03);
    }

    // ---- un compás ----
    function scheduleBar(T) {
      const s = song, chord = s.prog[s.bar], key = s.key;
      const at = step => T + step * E;

      // melodía
      const notes = realize(s.specs[s.bar], chord, s.lastD, s.bar === 3);
      s.lastD = notes[notes.length - 1].d;
      notes.forEach(n => note(midiOf(n.d, key), at(n.s), n.l * E * 0.92, LEAD));

      // bajo
      s.bass.forEach(([st, deg]) => note(midiOf(chord + deg, key) - 24, at(st), E * 1.9, BASSV));

      // acompañamiento: arpegio de campanitas o acordes saltarines a contratiempo
      const tones = [chord, chord + 2, chord + 4, chord + 7];
      if (s.comp === 'arp') {
        s.arp.forEach((idx, st) => note(midiOf(tones[idx], key) - 12, at(st), E * 1.6, PLUCK));
      } else {
        s.strum.forEach(st => tones.slice(0, 3).forEach((d, i) => note(midiOf(d, key) - 12, at(st) + i * 0.012, E * 0.9, STAB)));
      }

      // percusión suave (entra tras un par de compases y a veces respira)
      if (!(s.pass === 0 && s.bar < 2) && (s.bar === 0 || Math.random() > 0.15)) {
        s.kick.forEach(st => kick(at(st)));
        [2, 6].forEach(st => noiseHit(at(st), 'bandpass', 1900, 0.9, 0.1, 0.1));
        [1, 3, 5, 7].forEach(st => { if (Math.random() > 0.2) noiseHit(at(st), 'highpass', 7500, 0.7, 0.04, 0.04); });
        if (s.bar === 3) [6.5, 7.5].forEach(st => noiseHit(at(st), 'highpass', 7000, 0.7, 0.04, 0.05)); // redoble final
      }
    }

    function tick() {
      if (!song) return;
      if (song.next < ctx.currentTime) song.next = ctx.currentTime + 0.05; // pestaña dormida: reengancha
      while (song.next < ctx.currentTime + 0.6) {
        scheduleBar(song.next);
        song.next += 8 * E;
        if (++song.bar === 4) { song.bar = 0; song.pass++; planPass(); }
      }
    }

    // ---- ciclo de vida ----
    function start() {
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      bus.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.6);
      bus.connect(master);
      // eco de corchea con puntillo: da brillo y espacio a la melodía
      const echo = ctx.createDelay(1);
      echo.delayTime.value = E * 3;
      const fb = ctx.createGain();
      fb.gain.value = 0.3;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;
      echo.connect(damp);
      damp.connect(fb);
      fb.connect(echo);
      damp.connect(bus);
      song = { bus, echo, next: ctx.currentTime + 0.15, bar: 0, pass: 0, lastD: 4, prog: null, comp: 'strum', level: LEVEL, fading: false, kill: 0 };
      planPass();
      song.timer = setInterval(tick, 100);
      tick();
    }

    function stop() {
      song.fading = true;
      song.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      const s = song;
      s.kill = setTimeout(() => {
        clearInterval(s.timer);
        s.bus.disconnect();
        s.echo.disconnect();
        if (song === s) song = null;
      }, 1500);
    }

    // on: ¿debe sonar?; duck: bajarla (pausa) sin cortarla
    function set(on, duck) {
      if (!ctx) return;
      if (!on) { if (song && !song.fading) stop(); return; }
      if (!song) start();
      if (song.fading) { clearTimeout(song.kill); song.fading = false; song.level = -1; }
      const level = duck ? DUCKED : LEVEL;
      if (song.level !== level) {
        song.level = level;
        song.bus.gain.setTargetAtTime(level, ctx.currentTime, 0.2);
      }
    }

    return { set };
  })();

  return {
    unlock,
    music: music.set,
    // ¡Sorpresa!: gente gritando y matasuegras.
    cheer: () => {
      hiss({ freq: 900, freqEnd: 1300, q: 0.8, dur: 1.4, vol: 0.22, attack: 0.08 });
      hiss({ freq: 1900, freqEnd: 2400, q: 1.5, dur: 1.1, vol: 0.12, attack: 0.05, delay: 0.1 });
      [0, 0.25, 0.55].forEach((d, i) => tone({ freq: 380 + i * 60, freqEnd: 560 + i * 80, type: 'sawtooth', dur: 0.35, vol: 0.08, delay: d }));
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.12, vol: 0.12, type: 'triangle', delay: 0.9 + i * 0.08 }));
    },
    cursor: () => tone({ freq: 880, dur: 0.05, vol: 0.18 }),
    confirm: () => {
      tone({ freq: 660, dur: 0.07, vol: 0.2 });
      tone({ freq: 990, dur: 0.12, vol: 0.2, delay: 0.06 });
    },
    cancel: () => tone({ freq: 520, freqEnd: 260, dur: 0.12, vol: 0.18 }),
    pause: () => {
      tone({ freq: 523, dur: 0.07, vol: 0.16, type: 'triangle' });
      tone({ freq: 659, dur: 0.07, vol: 0.16, type: 'triangle', delay: 0.07 });
      tone({ freq: 784, dur: 0.12, vol: 0.16, type: 'triangle', delay: 0.14 });
    },
    open: () => {
      tone({ freq: 587, dur: 0.06, vol: 0.14, type: 'triangle' });
      tone({ freq: 880, dur: 0.09, vol: 0.14, type: 'triangle', delay: 0.05 });
    },
    close: () => tone({ freq: 660, freqEnd: 440, dur: 0.1, vol: 0.12, type: 'triangle' }),
    advance: () => tone({ freq: 740, freqEnd: 1180, dur: 0.07, vol: 0.13 }),
    blip: (pitch = 1) => tone({
      freq: 480 * pitch * (0.94 + Math.random() * 0.12),
      type: 'triangle',
      dur: 0.035,
      vol: 0.12,
    }),
    bump: () => tone({ freq: 120, freqEnd: 70, dur: 0.09, vol: 0.22 }),
    snore,
    rustle: () => {
      hiss({ type: 'highpass', freq: 2200, dur: 0.25, vol: 0.09 });
      hiss({ type: 'highpass', freq: 2800, dur: 0.3, vol: 0.07, delay: 0.18 });
    },
    thud: () => {
      tone({ freq: 150, freqEnd: 60, dur: 0.12, vol: 0.25, type: 'triangle' });
      hiss({ type: 'lowpass', freq: 400, dur: 0.1, vol: 0.12 });
    },
    door: () => {
      hiss({ type: 'lowpass', freq: 350, dur: 0.18, vol: 0.18 });
      tone({ freq: 220, freqEnd: 170, dur: 0.14, vol: 0.1, type: 'triangle', delay: 0.05 });
    },
    // --- minijuego de persecución ---
    shoot: () => {
      hiss({ type: 'highpass', freq: 1800, dur: 0.09, vol: 0.22, attack: 0.003 });
      tone({ freq: 520, freqEnd: 110, dur: 0.11, vol: 0.14 });
    },
    hit: () => {
      tone({ freq: 190, freqEnd: 55, dur: 0.16, vol: 0.3, type: 'triangle' });
      hiss({ type: 'lowpass', freq: 1100, dur: 0.1, vol: 0.18, attack: 0.003 });
    },
    empty: () => tone({ freq: 1500, dur: 0.02, vol: 0.08 }),
    reload: () => {
      tone({ freq: 900, dur: 0.03, vol: 0.12 });
      tone({ freq: 700, dur: 0.03, vol: 0.12, delay: 0.12 });
    },
    reloaded: () => {
      tone({ freq: 1100, dur: 0.03, vol: 0.14 });
      tone({ freq: 660, dur: 0.06, vol: 0.14, type: 'triangle', delay: 0.08 });
      tone({ freq: 990, dur: 0.1, vol: 0.14, type: 'triangle', delay: 0.14 });
    },
    roar,
    boom: () => {
      hiss({ type: 'lowpass', freq: 1400, freqEnd: 120, dur: 0.45, vol: 0.3, attack: 0.005 });
      tone({ freq: 110, freqEnd: 40, dur: 0.35, vol: 0.3, type: 'sine' });
    },
    bigBoom: () => {
      hiss({ type: 'lowpass', freq: 2400, freqEnd: 70, dur: 1.8, vol: 0.55, attack: 0.005 });
      tone({ freq: 80, freqEnd: 28, dur: 1.4, vol: 0.5, type: 'sine' });
      hiss({ type: 'lowpass', freq: 900, freqEnd: 60, dur: 1.2, vol: 0.3, delay: 0.25 });
    },
    engine,
  };
})();
