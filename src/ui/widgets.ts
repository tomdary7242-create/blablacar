// Composants d'interface réutilisables.
import { bandGradient, stamp } from './draw';
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

/** Fond commun des écrans de menu : ocre en bandes et losanges de bogolan. */
export function menuBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  bandGradient(ctx, 0, 0, w, h, ['#ecd29c', '#e4c486', '#dcb472', '#d4a462', '#cc9454']);
  for (let row = 0, y = 4; y < h; y += 16, row++) {
    for (let x = row % 2 === 0 ? 4 : 12; x < w; x += 16) {
      stamp(ctx, ['.#.', '#.#', '.#.'], x, y, { '#': 'rgba(120,70,30,0.22)' });
    }
  }
}
