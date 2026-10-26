// Effets sonores, cris des Jinémon et musique, synthétisés (WebAudio) sans fichier externe.
import { getSpecies } from '../data/ginedex';
import type { ElementType } from '../data/types';
import { Music } from './music';

export type Sfx =
  | 'curseur'
  | 'valider'
  | 'retour'
  | 'coup'
  | 'superCoup'
  | 'ko'
  | 'capture'
  | 'niveau'
  | 'soin'
  | 'erreur'
  | 'pas'
  | 'grincement'
  | 'cri'
  | 'battement'
  | 'nuit'
  | 'surprise';

type Note = [freq: number, duration: number, type?: OscillatorType];

/** Bruitages des attaques et des coups, synthétisés à partir de bruit filtré et d'oscillateurs. */
export type FxSound =
  | 'elan'
  | 'lancer'
  | 'impact'
  | 'impactFort'
  | 'critique'
  | 'esquive'
  | 'feu'
  | 'eau'
  | 'vent'
  | 'seisme'
  | 'magie'
  | 'sombre'
  | 'eclair'
  | 'metal'
  | 'nuee'
  | 'charge'
  | 'buff'
  | 'debuff'
  | 'soin';

const SOUNDS: Record<Sfx, Note[]> = {
  curseur: [[880, 0.03, 'square']],
  valider: [[660, 0.05, 'square'], [990, 0.07, 'square']],
  retour: [[440, 0.05, 'square'], [330, 0.06, 'square']],
  coup: [[160, 0.08, 'sawtooth'], [90, 0.08, 'sawtooth']],
  superCoup: [[220, 0.06, 'sawtooth'], [120, 0.06, 'sawtooth'], [70, 0.1, 'sawtooth']],
  ko: [[400, 0.1, 'triangle'], [300, 0.1, 'triangle'], [200, 0.2, 'triangle']],
  capture: [[523, 0.08, 'triangle'], [659, 0.08, 'triangle'], [784, 0.08, 'triangle'], [1046, 0.2, 'triangle']],
  niveau: [[523, 0.07, 'square'], [659, 0.07, 'square'], [784, 0.07, 'square'], [1046, 0.15, 'square']],
  soin: [[587, 0.1, 'triangle'], [784, 0.1, 'triangle'], [880, 0.1, 'triangle'], [1174, 0.25, 'triangle']],
  erreur: [[200, 0.12, 'square'], [150, 0.15, 'square']],
  pas: [[90, 0.02, 'triangle']],
  // Bois qui craque : deux grincements graves et désaccordés.
  grincement: [[70, 0.09, 'sawtooth'], [62, 0.12, 'sawtooth']],
  // Cri strident qui glisse vers le grave.
  cri: [[1480, 0.07, 'sawtooth'], [1180, 0.07, 'sawtooth'], [940, 0.09, 'sawtooth'], [620, 0.14, 'sawtooth'], [300, 0.22, 'sawtooth']],
  // Battement de cœur : « poum-poum ».
  battement: [[58, 0.08, 'sine'], [1, 0.06, 'sine'], [52, 0.11, 'sine']],
  // Tombée de la nuit : trois notes descendantes.
  nuit: [[392, 0.18, 'triangle'], [330, 0.18, 'triangle'], [262, 0.35, 'triangle']],
  // Un dresseur vous a repéré.
  surprise: [[1320, 0.05, 'square'], [1760, 0.1, 'square']],
};

/** Timbre du cri selon le type principal. */
const CRY_WAVE: Partial<Record<ElementType, OscillatorType>> = {
  Feu: 'sawtooth',
  Métal: 'square',
  Eau: 'sine',
  Esprit: 'sine',
  Psy: 'triangle',
  Spectre: 'sine',
  Vol: 'triangle',
  Insecte: 'square',
  Dragon: 'sawtooth',
  Ténèbres: 'sawtooth',
};

interface CrySegment {
  wave: OscillatorType;
  dur: number;
  f0: number;
  f1: number;
  /** Profondeur du trémolo (0 : aucun). */
  warble: number;
}

/** Cri propre à chaque espèce, déterminé par son numéro, sa taille et ses types. */
export function cryOf(speciesId: number): CrySegment[] {
  const sp = getSpecies(speciesId);
  let seed = speciesId * 2654435761;
  const rnd = () => {
    seed = (seed ^ (seed >>> 15)) * 2246822507;
    seed = (seed ^ (seed >>> 13)) * 3266489909;
    return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
  };
  // Les petits Jinémon piaillent, les grands grondent.
  const base = 160 + (1.35 - Math.min(1.3, sp.look.size)) * 620;
  const wave = CRY_WAVE[sp.types[0]] ?? (rnd() < 0.5 ? 'square' : 'sawtooth');
  const ghostly = sp.types.includes('Spectre') || sp.types.includes('Esprit');
  const count = 2 + Math.floor(rnd() * 3);
  const segments: CrySegment[] = [];
  let f = base * (0.85 + rnd() * 0.5);
  for (let i = 0; i < count; i++) {
    const up = rnd() < 0.5;
    const to = f * (up ? 1.15 + rnd() * 0.5 : 0.55 + rnd() * 0.35);
    segments.push({
      wave: i === count - 1 && rnd() < 0.3 ? 'triangle' : wave,
      dur: 0.06 + rnd() * 0.12 + (i === count - 1 ? 0.08 : 0),
      f0: f,
      f1: to,
      warble: ghostly ? 0.25 : rnd() < 0.3 ? 0.12 : 0,
    });
    f = to * (0.9 + rnd() * 0.3);
  }
  return segments;
}

export class Audio {
  private ctx: AudioContext | null = null;
  /** Sortie commune (musique, bruitages, cris) protégée par un limiteur. */
  private master!: AudioNode;
  private noiseBuffer: AudioBuffer | null = null;
  enabled = true;
  readonly music = new Music();

  unlock(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      // Tampons audio plus larges : sur téléphone, c'est ce qui évite les grésillements.
      this.ctx = Ctor ? new Ctor({ latencyHint: 'playback' }) : null;
    } catch {
      this.ctx = null;
    }
    if (!this.ctx) return;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    limiter.connect(this.ctx.destination);
    this.master = limiter;
    this.music.attach(this.ctx, limiter);
    const n = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, n, n);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Souffle de bruit filtré dont la fréquence glisse de f0 à f1. */
  private hiss(t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, level: number, q = 1, attack = 0.005): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setTargetAtTime(0, t + Math.max(attack, dur * 0.55), dur * 0.18);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + dur * 0.18 * 7);
  }

  /** Note dont la hauteur glisse de f0 à f1. */
  private sweep(t: number, type: OscillatorType, f0: number, f1: number, dur: number, level: number, attack = 0.004): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setTargetAtTime(0, t + Math.max(attack, dur * 0.5), dur * 0.2);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + dur * 0.2 * 7);
  }

  /** Bruitage d'attaque. */
  fx(kind: FxSound): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + 0.005;
    switch (kind) {
      case 'elan':
        this.hiss(t, 0.22, 'bandpass', 400, 2400, 0.22, 1.4, 0.03);
        break;
      case 'esquive':
        this.hiss(t, 0.16, 'bandpass', 2200, 700, 0.16, 1.6, 0.01);
        break;
      case 'lancer':
        this.sweep(t, 'square', 500, 1300, 0.08, 0.035);
        this.hiss(t, 0.14, 'bandpass', 1400, 3200, 0.1, 1.2);
        break;
      case 'impact':
        this.sweep(t, 'sine', 170, 50, 0.16, 0.4);
        this.hiss(t, 0.1, 'lowpass', 3000, 500, 0.3, 0.7);
        break;
      case 'impactFort':
        this.sweep(t, 'sine', 130, 34, 0.32, 0.55);
        this.sweep(t, 'triangle', 90, 30, 0.3, 0.25);
        this.hiss(t, 0.24, 'lowpass', 3200, 300, 0.4, 0.7);
        break;
      case 'critique':
        this.sweep(t, 'sine', 140, 36, 0.3, 0.55);
        this.hiss(t, 0.2, 'lowpass', 4000, 400, 0.4, 0.7);
        this.sweep(t + 0.01, 'square', 2400, 1800, 0.12, 0.05);
        break;
      case 'feu':
        this.hiss(t, 0.55, 'lowpass', 1100, 400, 0.3, 0.8, 0.06);
        for (let i = 0; i < 5; i++) this.hiss(t + 0.05 + i * 0.08, 0.03, 'highpass', 3000, 2500, 0.12);
        break;
      case 'eau':
        this.hiss(t, 0.4, 'bandpass', 1400, 400, 0.25, 1.8, 0.02);
        for (let i = 0; i < 3; i++) this.sweep(t + 0.08 + i * 0.07, 'sine', 500 + i * 120, 1100 + i * 150, 0.05, 0.08);
        break;
      case 'vent':
        this.hiss(t, 0.55, 'bandpass', 500, 2600, 0.22, 3, 0.12);
        break;
      case 'seisme':
        this.sweep(t, 'sine', 60, 38, 0.6, 0.45, 0.02);
        this.hiss(t, 0.6, 'lowpass', 320, 120, 0.4, 0.7, 0.03);
        break;
      case 'magie':
        this.sweep(t, 'sine', 600, 1800, 0.4, 0.07, 0.03);
        this.sweep(t + 0.04, 'triangle', 900, 2700, 0.4, 0.05, 0.03);
        for (let i = 0; i < 4; i++) this.sweep(t + 0.1 + i * 0.06, 'sine', 2000 + i * 300, 2200 + i * 300, 0.05, 0.03);
        break;
      case 'sombre':
        this.sweep(t, 'sawtooth', 320, 70, 0.5, 0.05, 0.03);
        this.hiss(t, 0.45, 'lowpass', 700, 200, 0.2, 0.8, 0.05);
        break;
      case 'eclair':
        for (let i = 0; i < 5; i++) this.sweep(t + i * 0.035, 'square', 900 + Math.random() * 1400, 300, 0.04, 0.05);
        this.hiss(t, 0.2, 'highpass', 4000, 2000, 0.18);
        break;
      case 'metal':
        for (const [f, l] of [[1180, 0.07], [1830, 0.05], [2640, 0.04], [3420, 0.03]] as const) this.sweep(t, 'sine', f, f * 0.98, 0.5, l, 0.002);
        this.hiss(t, 0.06, 'highpass', 5000, 4000, 0.15);
        break;
      case 'nuee': {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 180;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 28;
        const depth = ctx.createGain();
        depth.gain.value = 0.03;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.08);
        g.gain.setTargetAtTime(0, t + 0.5, 0.06);
        lfo.connect(depth).connect(g.gain);
        osc.connect(g).connect(this.master);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 1);
        lfo.stop(t + 1);
        this.hiss(t, 0.6, 'bandpass', 2600, 2400, 0.08, 2, 0.08);
        break;
      }
      case 'charge':
        this.sweep(t, 'sine', 180, 900, 0.7, 0.08, 0.2);
        this.hiss(t, 0.7, 'bandpass', 300, 2400, 0.14, 2, 0.3);
        break;
      case 'buff':
        [523, 659, 784, 1046].forEach((f, i) => this.sweep(t + i * 0.06, 'square', f, f, 0.08, 0.04));
        break;
      case 'debuff':
        [784, 622, 523, 392].forEach((f, i) => this.sweep(t + i * 0.07, 'square', f, f * 0.97, 0.09, 0.04));
        break;
      case 'soin':
        this.play('soin');
        break;
    }
  }

  /** Cri d'un Jinémon ; `pitch` < 1 pour un cri plus grave (K.O.). */
  cry(speciesId: number, pitch = 1): void {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    let t = ctx.currentTime + 0.01;
    const stretch = pitch < 1 ? 1.4 : 1;
    for (const seg of cryOf(speciesId)) {
      const dur = seg.dur * stretch;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = seg.wave;
      osc.frequency.setValueAtTime(seg.f0 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, seg.f1 * pitch), t + dur);
      const level = seg.wave === 'sine' || seg.wave === 'triangle' ? 0.11 : 0.055;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.012);
      gain.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.2);
      if (seg.warble) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 18;
        depth.gain.value = seg.f0 * pitch * seg.warble * 0.3;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.05);
      }
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur * 0.7 + dur * 0.2 * 8);
      t += dur * 0.85;
    }
  }

  play(name: Sfx): void {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    let t = ctx.currentTime;
    for (const [freq, duration, type = 'square'] of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      // Attaque de quelques millisecondes : le son démarre sans « clac ».
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(name === 'battement' ? 0.16 : 0.06, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + duration);
      t += duration * 0.9;
    }
  }
}
