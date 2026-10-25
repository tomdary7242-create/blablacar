// Grenier des Jinémon : dépôt et retrait entre l'équipe et la réserve.
import { displayName, isFainted, isShiny, maxHp, type Jinemon } from '../../engine/creature';
import { PARTY_SIZE } from '../../engine/gameState';
import { PAL, box, cursor, hpColor, menuList, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { ListCursor, menuBackground } from '../widgets';
import { SummaryScene } from './summary';

export class StorageScene implements Scene {
  readonly opaque = true;
  private focus: 'equipe' | 'grenier' = 'equipe';
  private party = new ListCursor(0, 6, false);
  private stock = new ListCursor(0, 9, false);
  private submenu: { options: string[]; index: number } | null = null;
  private message = 'Choisissez un Jinémon.';

  constructor(private readonly game: Game) {}

  private sync(): void {
    this.party.count = this.game.s.party.length;
    this.stock.count = this.game.s.storage.length;
    this.party.clamp();
    this.stock.clamp();
  }

  update(): void {
    this.sync();
    const input = this.game.input;
    if (this.submenu) {
      const m = this.submenu;
      if (input.pressed('up')) m.index = (m.index + m.options.length - 1) % m.options.length;
      if (input.pressed('down')) m.index = (m.index + 1) % m.options.length;
      if (input.pressed('b')) this.submenu = null;
      else if (input.pressed('a')) this.choose(m.options[m.index]);
      return;
    }
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      this.game.save(true);
      return;
    }
    if (input.pressed('left') || input.pressed('right')) {
      this.focus = this.focus === 'equipe' ? 'grenier' : 'equipe';
      this.game.sfx('curseur');
      return;
    }
    const list = this.focus === 'equipe' ? this.party : this.stock;
    if (input.pressed('up') || input.pressed('down')) {
      const before = list.index;
      list.index += input.pressed('up') ? -1 : 1;
      list.clamp();
      if (before !== list.index) this.game.sfx('curseur');
    }
    if (input.pressed('a') && list.count > 0) {
      this.game.sfx('valider');
      this.submenu = { options: [this.focus === 'equipe' ? 'Déposer' : 'Retirer', 'Résumé', 'Retour'], index: 0 };
    }
  }

  private choose(option: string): void {
    this.submenu = null;
    const state = this.game.s;
    if (option === 'Résumé') {
      const list = this.focus === 'equipe' ? state.party : state.storage;
      this.game.scenes.push(new SummaryScene(this.game, list, (this.focus === 'equipe' ? this.party : this.stock).index));
      return;
    }
    if (option === 'Déposer') {
      const j = state.party[this.party.index];
      const othersReady = state.party.filter((o) => o !== j && !isFainted(o)).length;
      if (othersReady === 0) {
        this.message = 'Garde au moins un Jinémon valide !';
        this.game.sfx('erreur');
        return;
      }
      state.party.splice(this.party.index, 1);
      state.storage.push(j);
      this.message = `${displayName(j)} se repose au grenier.`;
    } else if (option === 'Retirer') {
      if (state.party.length >= PARTY_SIZE) {
        this.message = 'Ton équipe est complète (6 Jinémon).';
        this.game.sfx('erreur');
        return;
      }
      const [j] = state.storage.splice(this.stock.index, 1);
      state.party.push(j);
      this.message = `${displayName(j)} rejoint ton équipe !`;
    }
    this.game.sfx('valider');
    this.sync();
  }

  resume(): void {
    this.game.input.consume();
  }

  private row(ctx: CanvasRenderingContext2D, j: Jinemon, x: number, y: number, selected: boolean): void {
    if (selected) {
      ctx.fillStyle = '#f0d898';
      ctx.fillRect(x - 2, y - 1, 120, 18);
      cursor(ctx, x, y + 4);
    }
    drawCreature(ctx, j.speciesId, x + 17, y + 18, 24, { shiny: isShiny(j) });
    text(ctx, displayName(j), x + 30, y, { shadow: PAL.shadow });
    text(ctx, `N.${j.level}`, x + 116, y, { align: 'right' });
    const ratio = j.hp / maxHp(j);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(x + 30, y + 11, 62, 4);
    ctx.fillStyle = hpColor(ratio);
    ctx.fillRect(x + 31, y + 12, Math.round(60 * ratio), 2);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'GRENIER DES JINÉMON', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    const state = this.game.s;
    box(ctx, 2, 14, 126, 134, this.focus === 'equipe' ? 'actif' : 'papier');
    text(ctx, `ÉQUIPE (${state.party.length}/6)`, 10, 16, { color: PAL.rust });
    state.party.forEach((j, i) => this.row(ctx, j, 8, 28 + i * 19, this.focus === 'equipe' && i === this.party.index));

    box(ctx, 130, 14, 124, 134, this.focus === 'grenier' ? 'actif' : 'papier');
    text(ctx, `GRENIER (${state.storage.length})`, 138, 16, { color: PAL.rust });
    if (state.storage.length === 0) text(ctx, 'Le grenier est vide.', 138, 30, { color: PAL.grey });
    for (const i of this.stock.window()) {
      const y = 28 + (i - this.stock.scroll) * 12;
      const j = state.storage[i];
      const selected = this.focus === 'grenier' && i === this.stock.index;
      if (selected) cursor(ctx, 136, y + 2);
      text(ctx, displayName(j), 144, y, { shadow: PAL.shadow });
      text(ctx, `N.${j.level}`, 246, y, { align: 'right' });
    }
    box(ctx, 2, 150, 252, 40);
    text(ctx, this.message, 10, 154, { shadow: PAL.shadow });
    text(ctx, '◄ ► colonne · A choisir · B sortir', 10, 170, { color: PAL.grey });
    if (this.submenu) {
      box(ctx, 160, 100, 92, 46);
      menuList(ctx, this.submenu.options, 166, 106, this.submenu.index);
    }
  }
}
