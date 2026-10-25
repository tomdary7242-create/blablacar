// Boîte de dialogue avec texte progressif, pagination et choix éventuels.
import { box, continueMarker, menuList, PAL, text } from '../draw';
import { textWidth, wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';

const BOX = { x: 2, y: 144, w: 252, h: 46 };
const LINES_PER_PAGE = 3;

export interface DialogOptions {
  onDone?: () => void;
  choices?: string[];
  onChoice?: (index: number) => void;
  cancelIndex?: number;
}

export class DialogScene implements Scene {
  private readonly pages: string[][];
  private page = 0;
  private shown = 0;
  private choiceIndex = 0;
  private choosing = false;

  constructor(
    private readonly game: Game,
    lines: string[],
    private readonly opts: DialogOptions = {},
  ) {
    const pages: string[][] = [];
    for (const line of lines) {
      const rows = wrapText(line, BOX.w - 22);
      for (let i = 0; i < rows.length; i += LINES_PER_PAGE) pages.push(rows.slice(i, i + LINES_PER_PAGE));
    }
    this.pages = pages.length ? pages : [['']];
  }

  private get pageLength(): number {
    return this.pages[this.page].join(' ').length;
  }

  update(dt: number): void {
    const input = this.game.input;
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
    const last = this.page === this.pages.length - 1;
    if (input.pressed('a') || input.pressed('b')) {
      if (!complete) this.shown = this.pageLength;
      else if (!last) {
        this.page += 1;
        this.shown = 0;
        this.game.sfx('curseur');
      } else if (this.opts.choices?.length) this.choosing = true;
      else this.close(-1);
    } else if (complete && last && this.opts.choices?.length) {
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
    box(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
    let remaining = Math.floor(this.shown);
    this.pages[this.page].forEach((row, i) => {
      text(ctx, row.slice(0, Math.max(0, remaining)), BOX.x + 10, BOX.y + 5 + i * 12, { shadow: PAL.shadow });
      remaining -= row.length + 1;
    });
    const complete = this.shown >= this.pageLength;
    const last = this.page === this.pages.length - 1;
    if (complete && !this.choosing && !(this.opts.choices && last)) continueMarker(ctx, BOX.x + BOX.w - 14, BOX.y + BOX.h - 10, this.game.time);
    if (this.choosing && this.opts.choices) {
      const choices = this.opts.choices;
      const w = Math.max(...choices.map((c) => textWidth(c))) + 26;
      const h = choices.length * 12 + 12;
      const x = BOX.x + BOX.w - w;
      const y = BOX.y - h - 1;
      box(ctx, x, y, w, h);
      menuList(ctx, choices, x + 8, y + 5, this.choiceIndex);
    }
  }
}
