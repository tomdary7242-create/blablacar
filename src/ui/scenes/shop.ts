// Marché : achat de calebasses et de remèdes contre des cauris.
import { getItem, type ItemId } from '../../data/items';
import { addItem, itemCount } from '../../engine/gameState';
import { PAL, box, cursor, text, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { ListCursor, menuBackground } from '../widgets';
import { remedyIcon } from './bag';

export class ShopScene implements Scene {
  readonly opaque = true;
  private cursor: ListCursor;
  private quantity: number | null = null;
  private message = 'Que veux-tu acheter ?';

  constructor(
    private readonly game: Game,
    private readonly items: ItemId[],
  ) {
    this.cursor = new ListCursor(items.length, 9);
  }

  update(): void {
    const input = this.game.input;
    const state = this.game.s;
    const item = getItem(this.items[this.cursor.index]);
    const max = Math.min(99, Math.floor(state.cauris / item.price));

    if (this.quantity !== null) {
      const before = this.quantity;
      if (input.pressed('right')) this.quantity += 1;
      if (input.pressed('left')) this.quantity -= 1;
      if (input.pressed('up')) this.quantity += 10;
      if (input.pressed('down')) this.quantity -= 10;
      this.quantity = Math.max(1, Math.min(max, this.quantity));
      if (before !== this.quantity) this.game.sfx('curseur');
      if (input.pressed('b')) {
        this.quantity = null;
        this.game.sfx('retour');
      } else if (input.pressed('a')) {
        state.cauris -= item.price * this.quantity;
        addItem(state, item.id, this.quantity);
        this.message = `Merci ! Voici ${this.quantity} × ${item.name}.`;
        this.quantity = null;
        this.game.sfx('valider');
        this.game.save(true);
      }
      return;
    }

    this.cursor.update(this.game);
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      this.game.say(['Reviens quand tu veux ! Les ancêtres bénissent le commerce honnête.']);
      return;
    }
    if (input.pressed('a')) {
      if (max < 1) {
        this.message = 'Tu n’as pas assez de cauris…';
        this.game.sfx('erreur');
        return;
      }
      this.quantity = 1;
      this.game.sfx('valider');
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'MARCHÉ', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    box(ctx, 200, 4, 114, 28);
    text(ctx, `${this.game.s.cauris} cauris`, 306, 13, { size: 9, bold: true, align: 'right' });
    box(ctx, 6, 36, 308, 140);
    for (const i of this.cursor.window()) {
      const id = this.items[i];
      const y = 44 + (i - this.cursor.scroll) * 14.5;
      remedyIcon(ctx, id, 34, y + 6);
      text(ctx, getItem(id).name, 46, y, { size: 10, bold: i === this.cursor.index });
      text(ctx, `${getItem(id).price} c.`, 304, y, { size: 10, align: 'right' });
      if (i === this.cursor.index) cursor(ctx, 14, y + 1);
    }
    const item = getItem(this.items[this.cursor.index]);
    box(ctx, 6, 180, 308, 56);
    if (this.quantity !== null) {
      text(ctx, `${item.name} — combien ?`, 16, 189, { size: 9, bold: true });
      text(ctx, `◄  ${this.quantity}  ►`, 16, 205, { size: 11, bold: true, color: PAL.rust });
      text(ctx, `Total : ${item.price * this.quantity} cauris`, 304, 206, { size: 9, align: 'right' });
      text(ctx, `Possédé : ${itemCount(this.game.s, item.id)}`, 304, 220, { size: 8, align: 'right', color: PAL.grey });
      return;
    }
    text(ctx, this.message, 16, 188, { size: 9, bold: true });
    wrap(ctx, item.description, 288, 8)
      .slice(0, 2)
      .forEach((row, i) => text(ctx, row, 16, 204 + i * 11, { size: 8 }));
    text(ctx, `Possédé : ${itemCount(this.game.s, item.id)}`, 304, 188, { size: 8, align: 'right', color: PAL.grey });
  }
}
