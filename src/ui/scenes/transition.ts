// Transitions plein écran : fondu au noir et volets d'entrée en combat.
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';

export type TransitionKind = 'fondu' | 'combat';

/** Recouvre l'écran puis appelle `onCovered` (qui change de zone ou lance un combat). */
export class CoverScene implements Scene {
  private t = 0;

  constructor(
    private readonly game: Game,
    private readonly kind: TransitionKind,
    private readonly onCovered: () => void,
    private readonly duration = kind === 'combat' ? 0.7 : 0.25,
  ) {}

  update(dt: number): void {
    this.t += dt / this.duration;
    if (this.t >= 1) {
      this.game.scenes.pop(this);
      this.onCovered();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(1, this.t);
    ctx.fillStyle = '#000';
    if (this.kind === 'fondu') {
      ctx.globalAlpha = t;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      return;
    }
    // Volets horizontaux alternés, précédés de deux éclairs.
    if (t < 0.3) {
      if (Math.floor(t * 20) % 2 === 0) {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      return;
    }
    const p = (t - 0.3) / 0.7;
    const bands = 8;
    const bh = H / bands;
    for (let i = 0; i < bands; i++) {
      const w = W * p;
      ctx.fillRect(i % 2 === 0 ? 0 : W - w, i * bh, w, bh + 1);
    }
  }
}

/** Révèle l'écran depuis le noir, se retire, puis appelle `onDone`. */
export class RevealScene implements Scene {
  private t = 0;

  constructor(
    private readonly game: Game,
    private readonly duration = 0.3,
    private readonly onDone?: () => void,
  ) {}

  update(dt: number): void {
    this.t += dt / this.duration;
    if (this.t >= 1) {
      this.game.scenes.pop(this);
      this.onDone?.();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.globalAlpha = Math.max(0, 1 - this.t);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
