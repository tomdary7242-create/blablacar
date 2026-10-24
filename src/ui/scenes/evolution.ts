// Évolution d'un Jinémon (annulable avec B pendant l'animation).
import { getSpecies } from '../../data/ginedex';
import { displayName, evolve, type Jinemon } from '../../engine/creature';
import { markCaught } from '../../engine/gameState';
import { box, continueMarker, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
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
    const g = ctx.createRadialGradient(W / 2, 90, 10, W / 2, 90, 200);
    g.addColorStop(0, '#f8e0a8');
    g.addColorStop(1, '#3a2414');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (this.phase === 'animation') {
      // Alternance de plus en plus rapide entre les deux formes.
      const p = this.t / DURATION;
      const freq = 2 + p * 14;
      const showNew = Math.sin(this.t * freq * Math.PI) > 0;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + p * 0.5})`;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + this.t * 2;
        ctx.fillRect(W / 2 + Math.cos(a) * (70 - p * 40), 90 + Math.sin(a) * (50 - p * 30), 3, 3);
      }
      drawCreature(ctx, showNew ? this.to : this.j.speciesId, W / 2, 140, 110, { white: 1 });
    } else {
      drawCreature(ctx, this.shownSpecies, W / 2, 140, 110);
    }
    box(ctx, 4, 178, 312, 58);
    text(ctx, this.message, 16, 192, { size: 10 });
    if (this.phase === 'fin') continueMarker(ctx, 300, 224, this.game.time);
    if (this.phase === 'animation') text(ctx, 'B : interrompre', 304, 222, { size: 7, align: 'right', color: '#8a7a68' });
  }
}
