// Composants d'interface réutilisables.
import type { Game } from './game';

/** Curseur de liste verticale avec défilement. */
export class ListCursor {
  index = 0;
  scroll = 0;

  constructor(
    public count: number,
    public visible: number,
    public wrapAround = true,
  ) {}

  /** Gère haut/bas ; renvoie vrai si la sélection a changé. */
  update(game: Game): boolean {
    if (this.count === 0) return false;
    const input = game.input;
    const before = this.index;
    if (input.pressed('up')) this.index = this.wrapAround ? (this.index + this.count - 1) % this.count : Math.max(0, this.index - 1);
    if (input.pressed('down')) this.index = this.wrapAround ? (this.index + 1) % this.count : Math.min(this.count - 1, this.index + 1);
    if (input.pressed('left')) this.index = Math.max(0, this.index - this.visible);
    if (input.pressed('right')) this.index = Math.min(this.count - 1, this.index + this.visible);
    this.clamp();
    if (before !== this.index) game.sfx('curseur');
    return before !== this.index;
  }

  clamp(): void {
    this.index = Math.max(0, Math.min(this.count - 1, this.index));
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.visible) this.scroll = this.index - this.visible + 1;
    this.scroll = Math.max(0, Math.min(Math.max(0, this.count - this.visible), this.scroll));
  }

  /** Indices visibles actuellement. */
  window(): number[] {
    const out: number[] = [];
    for (let i = this.scroll; i < Math.min(this.count, this.scroll + this.visible); i++) out.push(i);
    return out;
  }
}

/** Fond commun des écrans de menu. */
export function menuBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e8c890');
  g.addColorStop(1, '#c8904a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Motifs bogolan discrets
  ctx.fillStyle = 'rgba(90,50,20,0.12)';
  for (let y = 0; y < h; y += 16) {
    for (let x = (y / 16) % 2 === 0 ? 0 : 8; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 2);
      ctx.lineTo(x + 7, y + 6);
      ctx.lineTo(x + 4, y + 10);
      ctx.lineTo(x + 1, y + 6);
      ctx.fill();
    }
  }
}
