// Évolution d'un Jinémon (annulable avec B pendant l'animation).
import { getSpecies } from '../../data/ginedex';
import { displayName, evolve, type Jinemon } from '../../engine/creature';
import { markCaught } from '../../engine/gameState';
import { evolutionGlow } from '../backdrops';
import { PAL, box, continueMarker, stamp, text } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { W } from '../screen';
import { drawCreature } from '../sprites';

const DURATION = 3.6;

export class EvolutionScene implements Scene {
  readonly opaque = true;
  private phase: 'debut' | 'animation' | 'fin' = 'debut';
  private t = 0;
  private message: string;
  private shownSpecies: number;
  private readonly oldName: string;

  constructor(
    private readonly game: Game,
    private readonly j: Jinemon,
    private readonly to: number,
    private readonly onDone: () => void,
  ) {
    this.oldName = displayName(j);
    this.shownSpecies = j.speciesId;
    this.message = `Quoi ? ${this.oldName} évolue !`;
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.phase === 'debut') {
      if (input.pressed('a') || this.t > 1.5) {
        this.phase = 'animation';
        this.t = 0;
      }
      return;
    }
    if (this.phase === 'animation') {
      if (input.pressed('b')) {
        this.phase = 'fin';
        this.shownSpecies = this.j.speciesId;
        this.message = `${this.oldName} a cessé d'évoluer.`;
        this.game.sfx('retour');
        return;
      }
      if (this.t >= DURATION) {
        evolve(this.j, this.to);
        markCaught(this.game.s, this.to);
        this.shownSpecies = this.to;
        this.phase = 'fin';
        this.message = `Félicitations ! ${this.oldName} a évolué en ${getSpecies(this.to).name} !`;
        this.game.sfx('capture');
      }
      return;
    }
    if (input.pressed('a') || input.pressed('b')) {
      this.game.scenes.pop(this);
      this.game.input.consume();
      this.onDone();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(evolutionGlow(), 0, 0);
    if (this.phase === 'animation') {
      // Alternance de plus en plus rapide entre les deux formes.
      const p = this.t / DURATION;
      const freq = 2 + p * 14;
      const showNew = Math.sin(this.t * freq * Math.PI) > 0;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + this.t * 2;
        const r = 70 - p * 40;
        stamp(ctx, ['.#.', '###', '.#.'], Math.round(W / 2 + Math.cos(a) * r), Math.round(76 + Math.sin(a) * r * 0.7), { '#': '#fff4c0' });
      }
      drawCreature(ctx, showNew ? this.to : this.j.speciesId, W / 2, 138, 64, { white: 1, scale: 2 });
    } else {
      drawCreature(ctx, this.shownSpecies, W / 2, 138, 64, { scale: 2 });
    }
    box(ctx, 2, 144, 252, 46);
    wrapText(this.message, 232)
      .slice(0, 3)
      .forEach((row, i) => text(ctx, row, 12, 149 + i * 12, { shadow: PAL.shadow }));
    if (this.phase === 'fin') continueMarker(ctx, 240, 180, this.game.time);
    if (this.phase === 'animation') text(ctx, 'B : interrompre', 246, 176, { align: 'right', color: PAL.grey });
  }
}
