// Le sac : calebasses et remèdes. En combat, renvoie l'objet choisi.
import { ITEM_IDS, getItem, isCaptureItem, type ItemId } from '../../data/items';
import { applyItem } from '../../engine/creature';
import { itemCount, removeItem } from '../../engine/gameState';
import { PAL, box, calabash, cursor, text, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { ListCursor, menuBackground } from '../widgets';
import { TeamScene } from './team';

/** Petit pot de remède. */
export function remedyIcon(ctx: CanvasRenderingContext2D, item: ItemId, x: number, y: number): void {
  if (isCaptureItem(item)) {
    const color = item === 'calebasseAncetres' ? '#e8c040' : item === 'calebasseOrnee' ? '#c87a3a' : '#d8a040';
    calabash(ctx, x, y, 5, color);
    return;
  }
  const colors: Partial<Record<ItemId, string>> = {
    karite: '#f0e0b0',
    bissap: '#b8203a',
    painDeSinge: '#e8e0c8',
    moringa: '#5fa83a',
    kola: '#c86a3a',
  };
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x - 5, y - 4, 10, 10);
  ctx.fillStyle = colors[item] ?? '#ccc';
  ctx.fillRect(x - 4, y - 3, 8, 8);
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(x - 3, y - 6, 6, 2);
}

export class BagScene implements Scene {
  readonly opaque = true;
  private cursor: ListCursor;
  private message = '';

  constructor(
    private readonly game: Game,
    private readonly mode: 'consulter' | 'combat',
    private readonly onPick?: (item: ItemId) => void,
  ) {
    this.cursor = new ListCursor(this.items().length, 9);
  }

  private items(): ItemId[] {
    return ITEM_IDS.filter((id) => itemCount(this.game.s, id) > 0);
  }

  update(): void {
    const items = this.items();
    this.cursor.count = items.length;
    this.cursor.clamp();
    this.cursor.update(this.game);
    const input = this.game.input;
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    if (!input.pressed('a') || items.length === 0) return;
    const item = items[this.cursor.index];
    if (this.mode === 'combat') {
      this.game.sfx('valider');
      this.game.scenes.pop(this);
      this.onPick?.(item);
      return;
    }
    if (isCaptureItem(item)) {
      this.message = 'Les calebasses se lancent sur les Jinémon sauvages, en combat.';
      this.game.sfx('erreur');
      return;
    }
    this.game.sfx('valider');
    this.game.scenes.push(
      new TeamScene(this.game, 'objet', {
        item,
        onPick: (index) => {
          const message = applyItem(this.game.s.party[index], item);
          if (message) {
            removeItem(this.game.s, item);
            this.game.sfx('soin');
            this.message = message;
            this.game.save(true);
          }
        },
      }),
    );
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'SAC', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    box(ctx, 220, 4, 94, 28);
    text(ctx, `${this.game.s.cauris} cauris`, 306, 13, { size: 9, bold: true, align: 'right' });
    box(ctx, 6, 36, 308, 140);
    const items = this.items();
    if (items.length === 0) text(ctx, 'Votre sac est vide.', 20, 50, { size: 10, color: PAL.grey });
    for (const i of this.cursor.window()) {
      const id = items[i];
      const y = 44 + (i - this.cursor.scroll) * 14.5;
      remedyIcon(ctx, id, 34, y + 6);
      text(ctx, getItem(id).name, 46, y, { size: 10, bold: i === this.cursor.index });
      text(ctx, `× ${itemCount(this.game.s, id)}`, 304, y, { size: 10, align: 'right' });
      if (i === this.cursor.index) cursor(ctx, 14, y + 1);
    }
    box(ctx, 6, 180, 308, 56);
    const selected = items[this.cursor.index];
    const body = this.message || (selected ? getItem(selected).description : '');
    wrap(ctx, body, 288, 9)
      .slice(0, 3)
      .forEach((row, i) => text(ctx, row, 16, 189 + i * 13, { size: 9 }));
  }
}
