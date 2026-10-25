// Le sac : calebasses et remèdes. En combat, renvoie l'objet choisi.
import { ITEM_IDS, getItem, isCaptureItem, isKeyItem, type ItemId } from '../../data/items';
import { applyItem } from '../../engine/creature';
import { itemCount, removeItem } from '../../engine/gameState';
import { PAL, box, calabash, cursor, shade, stamp, text } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { ListCursor, menuBackground } from '../widgets';
import { TeamScene } from './team';

/** Icône d'objet en pixel art (calebasse ou pot de remède), centrée sur (x, y). */
export function remedyIcon(ctx: CanvasRenderingContext2D, item: ItemId, x: number, y: number): void {
  if (isCaptureItem(item)) {
    const color = item === 'calebasseRoyale' ? '#9a5ad0' : item === 'calebasseAncetres' ? '#f0c848' : item === 'calebasseOrnee' ? '#c87038' : '#d8a040';
    calabash(ctx, x, y, 2, color);
    return;
  }
  if (item === 'amulettePartage') {
    stamp(ctx, ['..kkkk..', '.k....k.', 'k......k', 'k......k', '.k....k.', '..kwwk..', '..wyyw..', '...ww...'], x - 4, y - 4, { k: '#f0ecdc', w: '#c8a040', y: '#c8401a' });
    return;
  }
  if (item === 'nasse') {
    stamp(
      ctx,
      ['..kkkk..', '.kwkwkk.', 'kwkwkwkk', 'kkwkwkwk', 'kwkwkwkk', '.kkwkwk.', '..kkkk..', '...kk...'],
      x - 4,
      y - 4,
      { k: '#5a3a1a', w: '#d8b070' },
    );
    return;
  }
  const colors: Partial<Record<ItemId, string>> = {
    karite: '#f4e4b8',
    bissap: '#c02848',
    painDeSinge: '#ece4cc',
    moringa: '#58a838',
    kola: '#c86a3a',
    mielSauvage: '#e8a020',
    baumeAnciens: '#f0f0e0',
  };
  const c = colors[item] ?? '#cccccc';
  stamp(
    ctx,
    ['..kkkk..', '..kwwk..', '.kkkkkk.', 'kchccdck', 'khcccdck', 'kcccccdk', 'kccccddk', '.kkkkkk.'],
    x - 4,
    y - 4,
    { k: '#28180e', w: '#8a5a32', c, h: shade(c, 0.5), d: shade(c, -0.25) },
  );
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
    this.cursor = new ListCursor(this.items().length, 8);
  }

  private items(): ItemId[] {
    return ITEM_IDS.filter((id) => itemCount(this.game.s, id) > 0 && !(this.mode === 'combat' && isKeyItem(id)));
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
    if (isKeyItem(item)) {
      this.message = getItem(item).description;
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
    text(ctx, 'SAC', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    box(ctx, 150, 1, 104, 18);
    text(ctx, `${this.game.s.cauris} cauris`, 246, 4, { align: 'right', shadow: PAL.shadow });
    box(ctx, 2, 20, 252, 110);
    const items = this.items();
    if (items.length === 0) text(ctx, 'Votre sac est vide.', 16, 26, { color: PAL.grey });
    for (const i of this.cursor.window()) {
      const id = items[i];
      const y = 25 + (i - this.cursor.scroll) * 12;
      remedyIcon(ctx, id, 22, y + 6);
      text(ctx, getItem(id).name, 32, y, { shadow: PAL.shadow });
      text(ctx, `× ${itemCount(this.game.s, id)}`, 246, y, { align: 'right' });
      if (i === this.cursor.index) cursor(ctx, 8, y + 2);
    }
    box(ctx, 2, 132, 252, 58);
    const selected = items[this.cursor.index];
    const body = this.message || (selected ? getItem(selected).description : '');
    wrapText(body, 236)
      .slice(0, 4)
      .forEach((row, i) => text(ctx, row, 10, 136 + i * 12, { shadow: PAL.shadow }));
  }
}
