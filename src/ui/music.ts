// Séquenceur chiptune (WebAudio) : joue en boucle les pistes de musicScore.ts,
// interrompt la musique le temps d'un jingle, puis la reprend où elle en était.
import { JINGLES, TRACKS, parseVoice, type Instrument, type JingleId, type NoteEvent, type TrackDef, type TrackId } from './musicScore';

/**
 * Durée d'avance avec laquelle on programme les notes (secondes). Large, pour
 * que la musique ne bégaie pas quand le jeu est occupé (sculpture des sprites,
 * changement de zone) : les fondus passent par le bus de la piste, pas par les notes.
 */
const LOOKAHEAD = 0.6;
const TICK_MS = 40;
/** Volume général de la musique, sous celui des bruitages. */
const VOLUME = 0.6;

const BASE_GAIN: Record<Instrument, number> = {
  pulse: 0.05,
  pulse12: 0.04,
  kora: 0.1,
  balafon: 0.11,
  basse: 0.13,
  flute: 0.08,
  drone: 0.045,
};

/**
 * Timbres composés en une seule forme d'onde (coefficients des harmoniques) :
 * un oscillateur par note au lieu de trois, pour ménager les téléphones.
 */
const triangle = (k: number) => (k % 2 ? ((8 / (Math.PI * Math.PI * k * k)) * (((k - 1) / 2) % 2 ? -1 : 1)) : 0);
const square = (k: number) => (k % 2 ? 4 / (Math.PI * k) : 0);
const TIMBRES: Partial<Record<Instrument, (k: number) => number>> = {
  // Triangle, octave douce et pointe de carré : corde pincée.
  kora: (k) => triangle(k) + (k === 2 ? 0.35 : 0) + square(k) * 0.04,
  // Lame de bois frappée : fondamentale, partiel aigu et un peu d'octave.
  balafon: (k) => (k === 1 ? 1 : 0) + (k === 4 ? 0.18 : 0) + (k % 2 === 0 ? triangle(k / 2) * 0.12 : 0),
  basse: (k) => triangle(k) + (k === 1 ? 0.5 : 0),
  flute: (k) => (k === 1 ? 1 : 0) + triangle(k) * 0.25 + (k === 2 ? 0.08 : 0),
};

/** Instruments envoyés dans l'écho (cordes pincées, bois, souffle). */
const ECHO: Partial<Record<Instrument, number>> = { kora: 0.5, balafon: 0.4, flute: 0.6, pulse12: 0.25 };

interface Prepared {
  def: TrackDef;
  length: number;
  /** Notes qui commencent à chaque pas, voix par voix. */
  byStep: Array<Array<{ inst: Instrument; gain: number; ev: NoteEvent }>>;
}

interface Playing {
  id: string;
  prep: Prepared;
  bus: GainNode;
  step: number;
  nextTime: number;
  done?: () => void;
}

const cache = new Map<TrackDef, Prepared>();

function prepare(def: TrackDef): Prepared {
  const hit = cache.get(def);
  if (hit) return hit;
  const voices = def.voices.map((v) => ({ v, parsed: parseVoice(v.notes) }));
  const length = Math.max(def.drums?.length ?? 0, ...voices.map((x) => x.parsed.length));
  const byStep: Prepared['byStep'] = Array.from({ length }, () => []);
  for (const { v, parsed } of voices) {
    for (const ev of parsed.events) byStep[ev.step % length].push({ inst: v.inst, gain: v.gain ?? 1, ev });
  }
  const prep = { def, length, byStep };
  cache.set(def, prep);
  return prep;
}

const freqOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private echoIn!: GainNode;
  private noise!: AudioBuffer;
  private waves = new Map<number, PeriodicWave>();
  private timbres = new Map<Instrument, PeriodicWave>();
  /** Envois vers l'écho, un par instrument (plutôt qu'un nœud par note). */
  private sends = new Map<Instrument, GainNode>();
  private current: Playing | null = null;
  private jingleTrack: Playing | null = null;
  private wanted: TrackId | null = null;
  private enabledFlag = true;

  /** Branche le séquenceur sur le contexte audio (après une interaction), vers `destination`. */
  attach(ctx: BaseAudioContext, destination: AudioNode = ctx.destination): void {
    if (this.ctx) return;
    this.ctx = ctx as AudioContext;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabledFlag ? VOLUME : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(destination);
    // Écho discret qui donne de l'espace à la kora et à la flûte.
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.27;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.echoIn.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(wet).connect(this.out);
    for (const [inst, level] of Object.entries(ECHO) as Array<[Instrument, number]>) {
      const send = ctx.createGain();
      send.gain.value = level;
      send.connect(this.echoIn);
      this.sends.set(inst, send);
    }
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    setInterval(() => this.tick(), TICK_MS);
    const want = this.wanted;
    this.wanted = null;
    this.play(want);
  }

  get enabled(): boolean {
    return this.enabledFlag;
  }

  set enabled(on: boolean) {
    this.enabledFlag = on;
    if (this.ctx) this.out.gain.setTargetAtTime(on ? VOLUME : 0, this.ctx.currentTime, 0.05);
  }

  get playing(): TrackId | null {
    return this.wanted;
  }

  /** Change de piste (fondu enchaîné) ; `null` fait taire la musique. */
  play(id: TrackId | null): void {
    if (id === this.wanted) return;
    this.wanted = id;
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.current) this.fadeOut(this.current, 0.25);
    this.current = null;
    if (!id) return;
    this.current = this.start(id, TRACKS[id], ctx.currentTime + 0.08);
    if (this.jingleTrack) this.current.bus.gain.value = 0;
  }

  /** Joue un jingle par-dessus la musique, qui reprend ensuite. */
  jingle(id: JingleId, onDone?: () => void): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabledFlag) {
      onDone?.();
      return;
    }
    if (this.jingleTrack) this.fadeOut(this.jingleTrack, 0.05);
    if (this.current) this.current.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    const j = this.start(`jingle:${id}`, JINGLES[id], ctx.currentTime + 0.06);
    const duration = (j.prep.length * 60) / (j.prep.def.bpm * 4);
    j.done = () => {
      if (this.jingleTrack !== j) return;
      this.jingleTrack = null;
      if (this.current) {
        this.current.nextTime = Math.max(this.current.nextTime, ctx.currentTime + 0.05);
        this.current.bus.gain.setTargetAtTime(1, ctx.currentTime, 0.2);
      }
      onDone?.();
    };
    this.jingleTrack = j;
    setTimeout(() => j.done?.(), duration * 1000 + 350);
  }

  private start(id: string, def: TrackDef, at: number): Playing {
    const ctx = this.ctx!;
    const bus = ctx.createGain();
    bus.connect(this.out);
    return { id, prep: prepare(def), bus, step: 0, nextTime: at };
  }

  private fadeOut(p: Playing, time: number): void {
    const ctx = this.ctx!;
    p.bus.gain.setTargetAtTime(0, ctx.currentTime, time / 3);
    p.step = -1;
    setTimeout(() => p.bus.disconnect(), time * 1000 + 1500);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabledFlag) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    // La musique de fond est suspendue pendant un jingle.
    if (this.current && !this.jingleTrack) this.advance(this.current, horizon);
    if (this.jingleTrack) this.advance(this.jingleTrack, horizon);
  }

  private advance(p: Playing, horizon: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const stepDur = 60 / (p.prep.def.bpm * 4);
    // Après une longue pause (onglet caché), on reprend la piste là où elle en était.
    if (p.nextTime < now - 0.25) p.nextTime = now + 0.05;
    while (p.step >= 0 && p.nextTime < horizon) {
      // Une note déjà en retard est sautée : jouée en catastrophe, elle claquerait.
      if (p.nextTime > now + 0.005) {
        for (const n of p.prep.byStep[p.step]) {
          this.note(n.inst, n.ev.midi, p.nextTime, n.ev.len * stepDur, n.gain, p.bus);
        }
        const drum = p.prep.def.drums?.[p.step % p.prep.def.drums.length];
        if (drum && drum !== '.') this.drum(drum, p.nextTime, p.bus);
      }
      p.nextTime += stepDur;
      p.step += 1;
      if (p.step >= p.prep.length) {
        if (p.prep.def.loop) p.step = 0;
        else {
          p.step = -1;
          const end = p.nextTime;
          setTimeout(() => p.done?.(), Math.max(0, (end - ctx.currentTime) * 1000));
        }
      }
    }
  }

  private timbre(inst: Instrument): PeriodicWave {
    let wave = this.timbres.get(inst);
    if (!wave) {
      const n = 24;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let k = 1; k < n; k++) imag[k] = TIMBRES[inst]!(k);
      wave = this.ctx!.createPeriodicWave(real, imag);
      this.timbres.set(inst, wave);
    }
    return wave;
  }

  private pulseWave(duty: number): PeriodicWave {
    let wave = this.waves.get(duty);
    if (!wave) {
      const n = 32;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      wave = this.ctx!.createPeriodicWave(real, imag);
      this.waves.set(duty, wave);
    }
    return wave;
  }

  private note(inst: Instrument, midi: number, t: number, dur: number, gain: number, bus: GainNode): void {
    const ctx = this.ctx!;
    const f = freqOf(midi);
    const v = BASE_GAIN[inst] * gain;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.connect(bus);
    const send = this.sends.get(inst);
    if (send) g.connect(send);
    const o = ctx.createOscillator();
    o.connect(g);
    // Chaque enveloppe retombe à zéro avant l'arrêt de l'oscillateur : pas de clic.
    let end = t + dur;
    switch (inst) {
      case 'pulse':
      case 'pulse12': {
        o.setPeriodicWave(this.pulseWave(inst === 'pulse' ? 0.25 : 0.125));
        o.frequency.setValueAtTime(f, t);
        g.gain.linearRampToValueAtTime(v, t + 0.006);
        g.gain.setTargetAtTime(v * 0.72, t + 0.03, 0.08);
        const release = Math.max(t + 0.03, end - 0.03);
        g.gain.setTargetAtTime(0, release, 0.012);
        if (dur > 0.32) this.vibrato(o, f, t + 0.18, end, 0.007);
        end = release + 0.012 * 8;
        break;
      }
      case 'kora': {
        o.setPeriodicWave(this.timbre('kora'));
        o.frequency.setValueAtTime(f, t);
        const tau = Math.min(0.32, 0.08 + dur * 0.5);
        g.gain.linearRampToValueAtTime(v, t + 0.003);
        g.gain.setTargetAtTime(0, t + 0.01, tau);
        end = t + 0.01 + tau * 7;
        break;
      }
      case 'balafon': {
        o.setPeriodicWave(this.timbre('balafon'));
        o.frequency.setValueAtTime(f * 1.03, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
        const tau = Math.min(0.2, 0.06 + dur * 0.3);
        g.gain.linearRampToValueAtTime(v, t + 0.002);
        g.gain.setTargetAtTime(0, t + 0.008, tau);
        end = t + 0.008 + tau * 7;
        break;
      }
      case 'basse': {
        o.setPeriodicWave(this.timbre('basse'));
        o.frequency.setValueAtTime(f, t);
        g.gain.linearRampToValueAtTime(v, t + 0.006);
        g.gain.setTargetAtTime(v * 0.8, t + 0.02, 0.1);
        const release = Math.max(t + 0.02, end - 0.025);
        g.gain.setTargetAtTime(0, release, 0.01);
        end = release + 0.01 * 8;
        break;
      }
      case 'flute': {
        o.setPeriodicWave(this.timbre('flute'));
        o.frequency.setValueAtTime(f, t);
        g.gain.linearRampToValueAtTime(v, t + 0.05);
        const release = Math.max(t + 0.05, end - 0.05);
        g.gain.setTargetAtTime(0, release, 0.03);
        if (dur > 0.25) this.vibrato(o, f, t + 0.15, end, 0.009);
        end = release + 0.03 * 8;
        break;
      }
      case 'drone': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        g.disconnect();
        filter.connect(bus);
        g.connect(filter);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        // Seconde scie légèrement désaccordée : le bourdon « bat » doucement.
        const o2 = ctx.createOscillator();
        o2.type = 'sawtooth';
        o2.frequency.setValueAtTime(f * 1.006, t);
        const lg = ctx.createGain();
        lg.gain.value = 0.8;
        o2.connect(lg).connect(g);
        g.gain.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3));
        const release = Math.max(t + 0.1, end - 0.2);
        g.gain.setTargetAtTime(0, release, 0.08);
        end = release + 0.08 * 8;
        o2.start(t);
        o2.stop(end);
        break;
      }
    }
    o.start(t);
    o.stop(end);
  }

  private vibrato(o: OscillatorNode, f: number, from: number, to: number, depth: number): void {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.6;
    const amount = ctx.createGain();
    amount.gain.setValueAtTime(0, from);
    amount.gain.linearRampToValueAtTime(f * depth, from + 0.15);
    lfo.connect(amount).connect(o.frequency);
    lfo.start(from);
    lfo.stop(to + 0.1);
  }

  private drum(kind: string, t: number, bus: GainNode): void {
    const ctx = this.ctx!;
    const thump = (f0: number, f1: number, decay: number, level: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.7);
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      o.connect(g).connect(bus);
      o.start(t);
      o.stop(t + decay + 0.02);
    };
    const hiss = (type: BiquadFilterType, freq: number, decay: number, level: number, q = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      src.connect(filter).connect(g).connect(bus);
      src.start(t, Math.random() * 0.5);
      src.stop(t + decay + 0.02);
    };
    switch (kind) {
      case 'B': // djembé grave, frappé au centre
        thump(120, 62, 0.22, 0.32);
        break;
      case 'T': // tonique, frappé au bord
        thump(300, 220, 0.1, 0.16);
        hiss('bandpass', 1200, 0.04, 0.05, 2);
        break;
      case 'S': // claqué
        hiss('bandpass', 2600, 0.08, 0.14, 1.2);
        thump(420, 360, 0.04, 0.06);
        break;
      case 'h': // maracas (bande étroite et douce : pas de sifflement sur un petit haut-parleur)
        hiss('bandpass', 5200, 0.04, 0.032, 0.9);
        break;
      case 'k': // grosse caisse
        thump(150, 42, 0.18, 0.38);
        break;
      case 's': // caisse claire
        hiss('bandpass', 1900, 0.13, 0.13, 0.8);
        thump(190, 150, 0.06, 0.08);
        break;
      case 'c': // cymbale
        hiss('bandpass', 6000, 0.45, 0.04, 0.6);
        break;
    }
  }
}
