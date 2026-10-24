// Résumé d'un Jinémon : statistiques, talent, expérience et origine folklorique.
import { MAX_LEVEL, dexNumber, getSpecies } from '../../data/ginedex';
import { TALENTS } from '../../data/talents';
import { displayName, getStats, isFainted, xpForLevel, xpProgress, type Jinemon } from '../../engine/creature';
import { PAL, bar, box, statusBadge, text, typeBadge, wrap } from '../draw';
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

    box(ctx, 6, 6, 118, 228);
    text(ctx, `N°${dexNumber(species.id)}`, 14, 13, { size: 8, color: PAL.rust, bold: true });
    text(ctx, displayName(j), 14, 24, { size: 11, bold: true });
    text(ctx, species.category, 14, 38, { size: 7, color: PAL.grey });
    drawCreature(ctx, species.id, 65, 128, 92, { alpha: isFainted(j) ? 0.5 : 1 });
    species.types.forEach((t, i) => typeBadge(ctx, t, 14 + i * 52, 134, 48));
    text(ctx, `Niveau ${j.level}`, 14, 152, { size: 10, bold: true });
    if (isFainted(j)) text(ctx, 'K.O.', 90, 153, { size: 9, bold: true, color: PAL.hpRed });
    else if (j.status) statusBadge(ctx, j.status.kind, 88, 152);
    text(ctx, `Expérience : ${j.xp}`, 14, 172, { size: 8 });
    const toNext = j.level >= MAX_LEVEL ? 0 : xpForLevel(j.level + 1) - j.xp;
    text(ctx, j.level >= MAX_LEVEL ? 'Niveau maximum atteint' : `Prochain niveau : ${toNext}`, 14, 184, { size: 8 });
    bar(ctx, 14, 198, 102, 3, xpProgress(j), PAL.xp);
    text(ctx, '◄ ► changer · B retour', 14, 214, { size: 7, color: PAL.grey });

    box(ctx, 128, 6, 186, 228);
    text(ctx, 'STATISTIQUES', 138, 13, { size: 9, bold: true, color: PAL.rust });
    const rows: Array<[string, string, number]> = [
      ['PV', `${j.hp} / ${stats.hp}`, species.baseStats.hp],
      ['Attaque', String(stats.attack), species.baseStats.attack],
      ['Défense', String(stats.defense), species.baseStats.defense],
      ['Vitesse', String(stats.speed), species.baseStats.speed],
    ];
    rows.forEach(([label, value, base], i) => {
      const y = 28 + i * 14;
      text(ctx, label, 138, y, { size: 9 });
      text(ctx, value, 236, y, { size: 9, bold: true, align: 'right' });
      bar(ctx, 244, y + 4, 60, 3, base / 130, base >= 90 ? PAL.hpGreen : base >= 60 ? PAL.hpYellow : PAL.ochre);
    });

    let y = 88;
    text(ctx, 'TALENT', 138, y, { size: 9, bold: true, color: PAL.rust });
    y += 12;
    if (species.talent) {
      const talent = TALENTS[species.talent];
      text(ctx, talent.name, 138, y, { size: 9, bold: true });
      y += 11;
      for (const row of wrap(ctx, talent.description, 166, 8).slice(0, 3)) {
        text(ctx, row, 138, y, { size: 8 });
        y += 10;
      }
    } else {
      text(ctx, 'Aucun talent particulier.', 138, y, { size: 8, color: PAL.grey });
      y += 10;
    }
    y += 6;
    text(ctx, 'ORIGINE', 138, y, { size: 9, bold: true, color: PAL.rust });
    y += 12;
    for (const row of wrap(ctx, species.folklore, 166, 8).slice(0, 5)) {
      text(ctx, row, 138, y, { size: 8 });
      y += 10;
    }
    if (species.evolution) {
      y += 4;
      text(ctx, `Évolue au niveau ${species.evolution.level} en ${getSpecies(species.evolution.to).name}.`, 138, Math.min(y, 216), {
        size: 7,
        color: PAL.grey,
      });
    }
  }
}
