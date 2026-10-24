// Écran d'équipe : consultation, changement en combat, remplacement forcé et usage d'objets.
import { getItem, type ItemId } from '../../data/items';
import type { Combat } from '../../engine/combat';
import { canUseItem, displayName, isFainted, maxHp } from '../../engine/creature';
import { PAL, box, hpBar, menuList, statusBadge, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { menuBackground } from '../widgets';
import { MovesScene } from './moves';
import { SummaryScene } from './summary';

export type TeamMode = 'consulter' | 'combat' | 'remplacement' | 'objet';

export interface TeamOptions {
  combat?: Combat;
  item?: ItemId;
  onPick?: (index: number) => void;
}

const SUBMENU = ['Résumé', 'Attaques', 'Déplacer', 'Retour'];

export class TeamScene implements Scene {
  readonly opaque = true;
  private index = 0;
  private submenu: number | null = null;
  private swapFrom: number | null = null;
  private hint: string;

  constructor(
    private readonly game: Game,
    private readonly mode: TeamMode,
    private readonly opts: TeamOptions = {},
  ) {
    this.hint = {
      consulter: 'Choisissez un Jinémon.',
      combat: 'Quel Jinémon envoyer au combat ?',
      remplacement: 'Quel Jinémon envoyer au combat ?',
      objet: `Sur quel Jinémon utiliser : ${opts.item ? getItem(opts.item).name : ''} ?`,
    }[mode];
    if (opts.combat && mode !== 'objet') this.index = opts.combat.playerIndex;
  }

  private get party() {
    return this.game.s.party;
  }

  update(): void {
    const input = this.game.input;
    if (this.submenu !== null) {
      if (input.pressed('up')) this.submenu = (this.submenu + SUBMENU.length - 1) % SUBMENU.length;
      if (input.pressed('down')) this.submenu = (this.submenu + 1) % SUBMENU.length;
      if (input.pressed('b')) this.submenu = null;
      else if (input.pressed('a')) this.subAction(this.submenu);
      return;
    }
    const n = this.party.length;
    const before = this.index;
    // Grille de deux colonnes : gauche/droite change de colonne, haut/bas de ligne (avec bouclage).
    if ((input.pressed('left') || input.pressed('right')) && (this.index ^ 1) < n) this.index ^= 1;
    if (input.pressed('up')) {
      this.index -= 2;
      if (this.index < 0) {
        const col = before % 2;
        this.index = n - 1 - ((n - 1 - col) % 2);
      }
    }
    if (input.pressed('down')) {
      this.index += 2;
      if (this.index >= n) this.index = before % 2 < n ? before % 2 : 0;
    }
    if (before !== this.index) this.game.sfx('curseur');

    if (input.pressed('b')) {
      if (this.swapFrom !== null) {
        this.swapFrom = null;
        this.hint = 'Choisissez un Jinémon.';
      } else if (this.mode !== 'remplacement') {
        this.game.sfx('retour');
        this.game.scenes.pop(this);
      }
      return;
    }
    if (input.pressed('a')) this.act();
  }

  private act(): void {
    const j = this.party[this.index];
    const name = displayName(j);
    const fail = (message: string) => {
      this.hint = message;
      this.game.sfx('erreur');
    };
    switch (this.mode) {
      case 'consulter':
        if (this.swapFrom !== null) {
          const a = this.swapFrom;
          [this.party[a], this.party[this.index]] = [this.party[this.index], this.party[a]];
          this.swapFrom = null;
          this.hint = 'Ordre modifié. Le premier Jinémon part au combat.';
          this.game.sfx('valider');
          return;
        }
        this.game.sfx('valider');
        this.submenu = 0;
        return;
      case 'combat':
      case 'remplacement': {
        const combat = this.opts.combat!;
        if (this.index === combat.playerIndex && !isFainted(j)) return fail(`${name} est déjà au combat !`);
        if (isFainted(j)) return fail(`${name} n'a plus la force de se battre !`);
        this.pick();
        return;
      }
      case 'objet':
        if (!this.opts.item || !canUseItem(j, this.opts.item)) return fail(`Cela n'aurait aucun effet sur ${name}.`);
        this.pick();
        return;
    }
  }

  private pick(): void {
    this.game.sfx('valider');
    this.game.scenes.pop(this);
    this.opts.onPick?.(this.index);
  }

  private subAction(choice: number): void {
    this.submenu = null;
    this.game.sfx('valider');
    switch (choice) {
      case 0:
        this.game.scenes.push(new SummaryScene(this.game, this.party, this.index));
        break;
      case 1:
        this.game.scenes.push(new MovesScene(this.game, this.party[this.index]));
        break;
      case 2:
        this.swapFrom = this.index;
        this.hint = `Échanger ${displayName(this.party[this.index])} avec quel Jinémon ?`;
        break;
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'ÉQUIPE', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    this.party.forEach((j, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 6 + col * 156;
      const y = 22 + row * 62;
      const selected = i === this.index;
      box(ctx, x, y, 152, 58, selected ? 'sombre' : 'papier');
      const ink = selected ? PAL.cream : PAL.ink;
      if (this.swapFrom === i) {
        ctx.strokeStyle = PAL.ochre;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, 148, 54);
      }
      drawCreature(ctx, j.speciesId, x + 22, y + 50, 40, { alpha: isFainted(j) ? 0.4 : 1 });
      text(ctx, displayName(j), x + 44, y + 8, { size: 10, bold: true, color: ink });
      text(ctx, `Niv.${j.level}`, x + 146, y + 9, { size: 8, align: 'right', color: ink });
      hpBar(ctx, x + 44, y + 26, 102, j.hp / maxHp(j));
      text(ctx, `${j.hp} / ${maxHp(j)}`, x + 146, y + 33, { size: 8, align: 'right', color: ink });
      if (isFainted(j)) text(ctx, 'K.O.', x + 44, y + 42, { size: 8, bold: true, color: PAL.hpRed });
      else if (j.status) statusBadge(ctx, j.status.kind, x + 44, y + 41);
      if (this.opts.combat && i === this.opts.combat.playerIndex && this.mode !== 'objet') {
        text(ctx, 'AU COMBAT', x + 146, y + 44, { size: 7, bold: true, align: 'right', color: PAL.ochre });
      }
    });
    box(ctx, 6, 210, 308, 26);
    text(ctx, this.hint, 16, 218, { size: 9 });
    if (this.submenu !== null) {
      box(ctx, 214, 116, 100, 70);
      menuList(ctx, SUBMENU, 224, 126, this.submenu, { lineHeight: 13, size: 9 });
    }
  }
}
