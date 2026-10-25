// Marché : achat de calebasses et de remèdes contre des cauris.
import { getItem, type ItemId } from '../../data/items';
import { addItem, itemCount } from '../../engine/gameState';
import { PAL, box, cursor, text } from '../draw';
import { wrapText } from '../font';
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
    this.cursor = new ListCursor(items.length, 8);
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
    text(ctx, 'MARCHÉ', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    box(ctx, 150, 1, 104, 18);
    text(ctx, `${this.game.s.cauris} cauris`, 246, 4, { align: 'right', shadow: PAL.shadow });
    box(ctx, 2, 20, 252, 110);
    for (const i of this.cursor.window()) {
      const id = this.items[i];
      const y = 25 + (i - this.cursor.scroll) * 12;
      remedyIcon(ctx, id, 22, y + 6);
      text(ctx, getItem(id).name, 32, y, { shadow: PAL.shadow });
      text(ctx, `${getItem(id).price} c.`, 246, y, { align: 'right' });
      if (i === this.cursor.index) cursor(ctx, 8, y + 2);
    }
    const item = getItem(this.items[this.cursor.index]);
    box(ctx, 2, 132, 252, 58);
    if (this.quantity !== null) {
      text(ctx, `${item.name} : combien ?`, 10, 136, { shadow: PAL.shadow });
      text(ctx, `◄ ${this.quantity} ►`, 10, 152, { color: PAL.rust, scale: 2 });
      text(ctx, `Total : ${item.price * this.quantity} c.`, 246, 152, { align: 'right' });
      text(ctx, `Possédé : ${itemCount(this.game.s, item.id)}`, 246, 166, { align: 'right', color: PAL.grey });
      return;
    }
    text(ctx, this.message, 10, 136, { shadow: PAL.shadow });
    wrapText(item.description, 236)
      .slice(0, 2)
      .forEach((row, i) => text(ctx, row, 10, 150 + i * 11));
    text(ctx, `Possédé : ${itemCount(this.game.s, item.id)}`, 246, 175, { align: 'right', color: PAL.grey });
  }
}
