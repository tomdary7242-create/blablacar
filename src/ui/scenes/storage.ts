// Grenier des Jinémon : dépôt et retrait entre l'équipe et la réserve.
import { displayName, isFainted, maxHp, type Jinemon } from '../../engine/creature';
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
  private stock = new ListCursor(0, 10, false);
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
        this.message = 'Garde au moins un Jinémon en état de combattre avec toi !';
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
      ctx.fillStyle = 'rgba(200,137,42,0.3)';
      ctx.fillRect(x - 2, y - 2, 146, 16);
      cursor(ctx, x, y + 2);
    }
    drawCreature(ctx, j.speciesId, x + 16, y + 14, 18);
    text(ctx, displayName(j), x + 28, y, { size: 9, bold: selected });
    text(ctx, `Niv.${j.level}`, x + 140, y, { size: 8, align: 'right' });
    ctx.fillStyle = hpColor(j.hp / maxHp(j));
    ctx.fillRect(x + 28, y + 11, Math.round(60 * (j.hp / maxHp(j))), 2);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'GRENIER DES JINÉMON', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    const state = this.game.s;
    box(ctx, 6, 22, 152, 160, this.focus === 'equipe' ? 'papier' : 'sombre');
    text(ctx, `ÉQUIPE (${state.party.length}/6)`, 14, 28, { size: 8, bold: true, color: this.focus === 'equipe' ? PAL.rust : PAL.ochre });
    state.party.forEach((j, i) => this.row(ctx, j, 12, 42 + i * 22, this.focus === 'equipe' && i === this.party.index));

    box(ctx, 162, 22, 152, 160, this.focus === 'grenier' ? 'papier' : 'sombre');
    text(ctx, `GRENIER (${state.storage.length})`, 170, 28, { size: 8, bold: true, color: this.focus === 'grenier' ? PAL.rust : PAL.ochre });
    if (state.storage.length === 0) text(ctx, 'Le grenier est vide.', 170, 46, { size: 8, color: PAL.grey });
    for (const i of this.stock.window()) {
      const y = 42 + (i - this.stock.scroll) * 13.5;
      const j = state.storage[i];
      const selected = this.focus === 'grenier' && i === this.stock.index;
      if (selected) cursor(ctx, 168, y + 1);
      text(ctx, displayName(j), 178, y, { size: 8, bold: selected });
      text(ctx, `Niv.${j.level}`, 306, y, { size: 8, align: 'right' });
    }
    box(ctx, 6, 186, 308, 50);
    text(ctx, this.message, 16, 195, { size: 9 });
    text(ctx, '◄ ► changer de colonne · A choisir · B sortir', 16, 214, { size: 8, color: PAL.grey });
    if (this.submenu) {
      box(ctx, 214, 120, 96, 56);
      menuList(ctx, this.submenu.options, 224, 130, this.submenu.index, { lineHeight: 13, size: 9 });
    }
  }
}
