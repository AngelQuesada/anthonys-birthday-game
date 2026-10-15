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

  return {
    unlock,
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
