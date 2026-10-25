// Résumé d'un Jinémon : statistiques, talent, expérience et origine folklorique.
import { MAX_LEVEL, dexNumber, getSpecies } from '../../data/ginedex';
import { TALENTS } from '../../data/talents';
import { displayName, getStats, isFainted, isShiny, xpForLevel, xpProgress, type Jinemon } from '../../engine/creature';
import { PAL, bar, box, statusBadge, text, typeBadge } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { menuBackground } from '../widgets';

export class SummaryScene implements Scene {
  readonly opaque = true;

  constructor(
    private readonly game: Game,
    private readonly list: Jinemon[],
    private index: number,
  ) {}

  update(): void {
    const input = this.game.input;
    const n = this.list.length;
    if (input.pressed('left') || input.pressed('up')) {
      this.index = (this.index + n - 1) % n;
      this.game.sfx('curseur');
    }
    if (input.pressed('right') || input.pressed('down')) {
      this.index = (this.index + 1) % n;
      this.game.sfx('curseur');
    }
    if (input.pressed('b') || input.pressed('a')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const j = this.list[this.index];
    const species = getSpecies(j.speciesId);
    const stats = getStats(j);
    menuBackground(ctx, W, H);

    box(ctx, 2, 2, 100, 188);
    text(ctx, `N°${dexNumber(species.id)}`, 10, 4, { color: PAL.rust });
    text(ctx, displayName(j), 10, 15, { shadow: PAL.shadow });
    wrapText(species.category, 84)
      .slice(0, 2)
      .forEach((row, i) => text(ctx, row, 10, 26 + i * 10, { color: PAL.grey }));
    drawCreature(ctx, species.id, 52, 112, 64, { alpha: isFainted(j) ? 0.5 : 1, shiny: isShiny(j) });
    if (isShiny(j)) text(ctx, '★ Chatoyant', 10, 46, { color: '#c8901a' });
    species.types.forEach((t, i) => typeBadge(ctx, t, 8 + i * 44, 114, 42));
    text(ctx, `Niveau ${j.level}`, 10, 127, { shadow: PAL.shadow });
    if (isFainted(j)) text(ctx, 'K.O.', 92, 127, { align: 'right', color: PAL.hpRed });
    else if (j.status) statusBadge(ctx, j.status.kind, 70, 130);
    text(ctx, `XP ${j.xp}`, 10, 141);
    const toNext = j.level >= MAX_LEVEL ? 0 : xpForLevel(j.level + 1) - j.xp;
    text(ctx, j.level >= MAX_LEVEL ? 'Niveau max.' : `Suivant : ${toNext}`, 10, 152);
    bar(ctx, 10, 166, 84, 2, xpProgress(j), PAL.xp);
    text(ctx, '◄ ► · B', 10, 175, { color: PAL.grey });

    box(ctx, 104, 2, 150, 188);
    text(ctx, 'STATISTIQUES', 112, 4, { color: PAL.rust });
    const rows: Array<[string, string, number]> = [
      ['PV', `${j.hp}/${stats.hp}`, species.baseStats.hp],
      ['Attaque', String(stats.attack), species.baseStats.attack],
      ['Défense', String(stats.defense), species.baseStats.defense],
      ['Vitesse', String(stats.speed), species.baseStats.speed],
    ];
    rows.forEach(([label, value, base], i) => {
      const y = 16 + i * 11;
      text(ctx, label, 112, y);
      text(ctx, value, 196, y, { align: 'right', shadow: PAL.shadow });
      bar(ctx, 202, y + 5, 44, 2, base / 130, base >= 90 ? PAL.hpGreen : base >= 60 ? PAL.hpYellow : PAL.ochre);
    });

    let y = 64;
    text(ctx, 'TALENT', 112, y, { color: PAL.rust });
    y += 11;
    if (species.talent) {
      const talent = TALENTS[species.talent];
      text(ctx, talent.name, 112, y, { shadow: PAL.shadow });
      y += 11;
      for (const row of wrapText(talent.description, 136).slice(0, 3)) {
        text(ctx, row, 112, y);
        y += 10;
      }
    } else {
      text(ctx, 'Aucun talent particulier.', 112, y, { color: PAL.grey });
      y += 10;
    }
    y += 4;
    text(ctx, 'ORIGINE', 112, y, { color: PAL.rust });
    y += 11;
    for (const row of wrapText(species.folklore, 136).slice(0, 5)) {
      text(ctx, row, 112, y);
      y += 10;
    }
    if (species.evolution) {
      text(ctx, `→ ${getSpecies(species.evolution.to).name} (N.${species.evolution.level})`, 112, 174, { color: PAL.indigo });
    }
  }
}
