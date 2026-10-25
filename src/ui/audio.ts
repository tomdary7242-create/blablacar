// Petits effets sonores synthétisés (WebAudio), sans fichier externe.

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

export class Audio {
  private ctx: AudioContext | null = null;
  enabled = true;

  unlock(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctor ? new Ctor() : null;
    } catch {
      this.ctx = null;
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
