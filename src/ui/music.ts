// Séquenceur chiptune (WebAudio) : joue en boucle les pistes de musicScore.ts,
// interrompt la musique le temps d'un jingle, puis la reprend où elle en était.
import { JINGLES, TRACKS, parseVoice, type Instrument, type JingleId, type NoteEvent, type TrackDef, type TrackId } from './musicScore';

/** Durée d'avance avec laquelle on programme les notes (secondes). */
const LOOKAHEAD = 0.14;
const TICK_MS = 25;
/** Volume général de la musique, sous celui des bruitages. */
const VOLUME = 0.6;

const BASE_GAIN: Record<Instrument, number> = {
  pulse: 0.05,
  pulse12: 0.04,
  kora: 0.085,
  balafon: 0.1,
  basse: 0.11,
  flute: 0.07,
  drone: 0.045,
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
  private current: Playing | null = null;
  private jingleTrack: Playing | null = null;
  private wanted: TrackId | null = null;
  private enabledFlag = true;

  /** Branche le séquenceur sur le contexte audio (après une interaction). */
  attach(ctx: AudioContext): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabledFlag ? VOLUME : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(ctx.destination);
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
    const stepDur = 60 / (p.prep.def.bpm * 4);
    if (p.nextTime < ctx.currentTime - 0.2) p.nextTime = ctx.currentTime + 0.02;
    while (p.step >= 0 && p.nextTime < horizon) {
      for (const n of p.prep.byStep[p.step]) {
        this.note(n.inst, n.ev.midi, p.nextTime, n.ev.len * stepDur, n.gain, p.bus);
      }
      const drum = p.prep.def.drums?.[p.step % p.prep.def.drums.length];
      if (drum && drum !== '.') this.drum(drum, p.nextTime, p.bus);
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
    const echo = ECHO[inst];
    if (echo) {
      const send = ctx.createGain();
      send.gain.value = echo;
      g.connect(send).connect(this.echoIn);
    }
    const oscs: OscillatorNode[] = [];
    const osc = (type: OscillatorType | PeriodicWave, freq: number, level = 1): OscillatorNode => {
      const o = ctx.createOscillator();
      if (type instanceof PeriodicWave) o.setPeriodicWave(type);
      else o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (level === 1) o.connect(g);
      else {
        const lg = ctx.createGain();
        lg.gain.value = level;
        o.connect(lg).connect(g);
      }
      oscs.push(o);
      return o;
    };
    let end = t + dur;
    switch (inst) {
      case 'pulse':
      case 'pulse12': {
        const o = osc(this.pulseWave(inst === 'pulse' ? 0.25 : 0.125), f);
        g.gain.linearRampToValueAtTime(v, t + 0.006);
        g.gain.setTargetAtTime(v * 0.72, t + 0.03, 0.08);
        g.gain.setTargetAtTime(0, Math.max(t + 0.03, end - 0.03), 0.012);
        if (dur > 0.32) this.vibrato(o, f, t + 0.18, end, 0.007);
        end += 0.08;
        break;
      }
      case 'kora': {
        osc('triangle', f);
        osc('sine', f * 2, 0.35);
        osc('square', f, 0.04);
        g.gain.linearRampToValueAtTime(v, t + 0.003);
        g.gain.setTargetAtTime(0, t + 0.01, Math.min(0.32, 0.08 + dur * 0.5));
        end = t + Math.max(dur, 0.9);
        break;
      }
      case 'balafon': {
        const o = osc('sine', f * 1.03);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
        osc('sine', f * 3.98, 0.18);
        osc('triangle', f * 2, 0.12);
        g.gain.linearRampToValueAtTime(v, t + 0.002);
        g.gain.setTargetAtTime(0, t + 0.008, Math.min(0.2, 0.06 + dur * 0.3));
        end = t + Math.max(dur, 0.7);
        break;
      }
      case 'basse': {
        osc('triangle', f);
        osc('sine', f, 0.5);
        g.gain.linearRampToValueAtTime(v, t + 0.006);
        g.gain.setTargetAtTime(v * 0.8, t + 0.02, 0.1);
        g.gain.setTargetAtTime(0, Math.max(t + 0.02, end - 0.025), 0.01);
        end += 0.06;
        break;
      }
      case 'flute': {
        const o = osc('sine', f);
        osc('triangle', f, 0.25);
        osc('sine', f * 2, 0.08);
        g.gain.linearRampToValueAtTime(v, t + 0.05);
        g.gain.setTargetAtTime(0, Math.max(t + 0.05, end - 0.05), 0.03);
        if (dur > 0.25) this.vibrato(o, f, t + 0.15, end, 0.009);
        end += 0.15;
        break;
      }
      case 'drone': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        g.disconnect();
        filter.connect(bus);
        g.connect(filter);
        osc('sawtooth', f);
        osc('sawtooth', f * 1.006, 0.8);
        g.gain.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3));
        g.gain.setTargetAtTime(0, Math.max(t + 0.1, end - 0.2), 0.08);
        end += 0.4;
        break;
      }
    }
    for (const o of oscs) {
      o.start(t);
      o.stop(end + 0.05);
    }
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
      case 'h': // maracas
        hiss('highpass', 6500, 0.045, 0.045);
        break;
      case 'k': // grosse caisse
        thump(150, 42, 0.18, 0.38);
        break;
      case 's': // caisse claire
        hiss('bandpass', 1900, 0.13, 0.13, 0.8);
        thump(190, 150, 0.06, 0.08);
        break;
      case 'c': // cymbale
        hiss('highpass', 5200, 0.7, 0.06);
        break;
    }
  }
}
