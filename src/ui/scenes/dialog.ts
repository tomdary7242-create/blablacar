// Boîte de dialogue avec texte progressif, pagination et choix éventuels.
import { box, continueMarker, measure, menuList, text, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';

const BOX = { x: 4, y: 178, w: 312, h: 58 };
const LINES_PER_PAGE = 3;

export interface DialogOptions {
  onDone?: () => void;
  choices?: string[];
  onChoice?: (index: number) => void;
  cancelIndex?: number;
}

export class DialogScene implements Scene {
  private pages: string[][] | null = null;
  private page = 0;
  private shown = 0;
  private choiceIndex = 0;
  private choosing = false;

  constructor(
    private readonly game: Game,
    private readonly lines: string[],
    private readonly opts: DialogOptions = {},
  ) {}

  private layout(ctx: CanvasRenderingContext2D): string[][] {
    const pages: string[][] = [];
    for (const line of this.lines) {
      const rows = wrap(ctx, line, BOX.w - 24, 10);
      for (let i = 0; i < rows.length; i += LINES_PER_PAGE) pages.push(rows.slice(i, i + LINES_PER_PAGE));
    }
    return pages.length ? pages : [['']];
  }

  private get pageLength(): number {
    return this.pages ? this.pages[this.page].join(' ').length : 0;
  }

  update(dt: number): void {
    const input = this.game.input;
    if (!this.pages) return;
    if (this.choosing) {
      const choices = this.opts.choices!;
      if (input.pressed('up')) {
        this.choiceIndex = (this.choiceIndex + choices.length - 1) % choices.length;
        this.game.sfx('curseur');
      } else if (input.pressed('down')) {
        this.choiceIndex = (this.choiceIndex + 1) % choices.length;
        this.game.sfx('curseur');
      } else if (input.pressed('a')) {
        this.game.sfx('valider');
        this.close(this.choiceIndex);
      } else if (input.pressed('b')) {
        this.game.sfx('retour');
        this.close(this.opts.cancelIndex ?? choices.length - 1);
      }
      return;
    }
    this.shown = Math.min(this.pageLength, this.shown + dt * this.game.textSpeed);
    const complete = this.shown >= this.pageLength;
    if (input.pressed('a') || input.pressed('b')) {
      if (!complete) {
        this.shown = this.pageLength;
      } else if (this.page < this.pages.length - 1) {
        this.page += 1;
        this.shown = 0;
        this.game.sfx('curseur');
      } else if (this.opts.choices?.length) {
        this.choosing = true;
      } else {
        this.close(-1);
      }
    } else if (complete && this.page === this.pages.length - 1 && this.opts.choices?.length) {
      this.choosing = true;
    }
  }

  private close(choice: number): void {
    this.game.scenes.pop(this);
    this.game.input.consume();
    if (choice >= 0) this.opts.onChoice?.(choice);
    this.opts.onDone?.();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.pages) this.pages = this.layout(ctx);
    box(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
    let remaining = Math.floor(this.shown);
    this.pages[this.page].forEach((row, i) => {
      const visible = row.slice(0, Math.max(0, remaining));
      remaining -= row.length + 1;
      text(ctx, visible, BOX.x + 12, BOX.y + 9 + i * 14, { size: 10 });
    });
    const complete = this.shown >= this.pageLength;
    if (complete && !this.choosing && !(this.opts.choices && this.page === this.pages.length - 1)) {
      continueMarker(ctx, BOX.x + BOX.w - 16, BOX.y + BOX.h - 11, this.game.time);
    }
    if (this.choosing && this.opts.choices) {
      const choices = this.opts.choices;
      const w = Math.max(...choices.map((c) => measure(ctx, c, 10, true))) + 30;
      const h = choices.length * 14 + 14;
      const x = BOX.x + BOX.w - w;
      const y = BOX.y - h - 2;
      box(ctx, x, y, w, h);
      menuList(ctx, choices, x + 8, y + 8, this.choiceIndex);
    }
  }
}
