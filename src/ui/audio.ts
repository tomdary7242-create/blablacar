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
  | 'nuit';

type Note = [freq: number, duration: number, type?: OscillatorType];

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
  enabled = true;
  readonly music = new Music();

  unlock(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctor ? new Ctor() : null;
    } catch {
      this.ctx = null;
    }
    if (this.ctx) this.music.attach(this.ctx);
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
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.1);
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
      gain.gain.setValueAtTime(name === 'battement' ? 0.16 : 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration * 0.9;
    }
  }
}
