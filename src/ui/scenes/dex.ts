// Le Ginédex : liste des espèces vues et capturées, avec fiche détaillée.
import { SPECIES, dexNumber, getSpecies, preEvolution } from '../../data/ginedex';
import { TALENTS } from '../../data/talents';
import { HAUNTS } from '../../data/hantises';
import { HUNT_HINTS, huntingGrounds, mobKindOf } from '../../data/nightMobs';
import { ZONES, habitats } from '../../data/zones';
import { PAL, bar, box, calabash, cursor, fillEllipse, stamp, text, typeBadge } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { ListCursor, menuBackground } from '../widgets';

export class DexScene implements Scene {
  readonly opaque = true;
  private cursor = new ListCursor(SPECIES.length, 14);

  constructor(private readonly game: Game) {}

  update(): void {
    this.cursor.update(this.game);
    const input = this.game.input;
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    if (input.pressed('a')) {
      const id = SPECIES[this.cursor.index].id;
      if (this.game.s.dex.seen.includes(id)) {
        this.game.sfx('valider');
        this.game.scenes.push(new DexEntryScene(this.game, id));
      } else {
        this.game.sfx('erreur');
      }
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const dex = this.game.s.dex;
    menuBackground(ctx, W, H);
    text(ctx, 'GINÉDEX', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    text(ctx, `Vus ${dex.seen.length} · Capturés ${dex.caught.length}/${SPECIES.length}`, 250, 2, { align: 'right', color: PAL.cream, shadow: PAL.ink });
    box(ctx, 2, 14, 126, 176);
    for (const i of this.cursor.window()) {
      const s = SPECIES[i];
      const y = 19 + (i - this.cursor.scroll) * 12;
      const seen = dex.seen.includes(s.id);
      const caught = dex.caught.includes(s.id);
      if (i === this.cursor.index) {
        ctx.fillStyle = '#f0d898';
        ctx.fillRect(6, y, 118, 11);
        cursor(ctx, 8, y + 2);
      }
      text(ctx, dexNumber(s.id), 14, y, { color: PAL.rust });
      text(ctx, seen ? s.name : '- - - - -', 34, y, { color: seen ? PAL.ink : PAL.grey, shadow: seen ? PAL.shadow : undefined });
      if (caught) calabash(ctx, 118, y + 6, 1);
      else if (seen) stamp(ctx, ['##', '##'], 116, y + 5, { '#': PAL.grey });
    }
    const s = SPECIES[this.cursor.index];
    const seen = dex.seen.includes(s.id);
    box(ctx, 130, 14, 124, 176);
    fillEllipse(ctx, 192, 92, 34, 7, '#e8d4a4');
    drawCreature(ctx, s.id, 192, 94, 64, { silhouette: !seen });
    text(ctx, `N°${dexNumber(s.id)}`, 138, 18, { color: PAL.rust });
    text(ctx, seen ? s.name : '???', 192, 102, { align: 'center', shadow: PAL.shadow });
    if (seen) {
      s.types.forEach((t, i) => typeBadge(ctx, t, s.types.length === 1 ? 172 : 150 + i * 44, 116, 40));
      wrapText(s.folklore.split(' — ')[0], 108)
        .slice(0, 3)
        .forEach((row, i) => text(ctx, row, 192, 132 + i * 10, { align: 'center' }));
      text(ctx, 'A : fiche', 192, 174, { align: 'center', color: PAL.grey });
    } else {
      text(ctx, 'Jamais rencontré.', 192, 120, { align: 'center', color: PAL.grey });
    }
  }
}

/** Le texte, sur au plus `max` lignes ; s'il est coupé, la dernière finit par « … ». */
function fit(words: string, max: number): string[] {
  const rows = wrapText(words, 236);
  if (rows.length <= max) return rows;
  const kept = wrapText(rows.slice(0, max).join(' '), 228).slice(0, max);
  kept[max - 1] = `${kept[max - 1].replace(/[\s·,;:]+$/, '')}…`;
  return kept;
}

export class DexEntryScene implements Scene {
  readonly opaque = true;

  constructor(
    private readonly game: Game,
    private id: number,
  ) {}

  private seenIds(): number[] {
    return SPECIES.map((s) => s.id).filter((id) => this.game.s.dex.seen.includes(id));
  }

  update(): void {
    const input = this.game.input;
    const ids = this.seenIds();
    const pos = ids.indexOf(this.id);
    if (input.pressed('left') || input.pressed('up')) {
      this.id = ids[(pos + ids.length - 1) % ids.length];
      this.game.sfx('curseur');
    }
    if (input.pressed('right') || input.pressed('down')) {
      this.id = ids[(pos + 1) % ids.length];
      this.game.sfx('curseur');
    }
    if (input.pressed('a') || input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = getSpecies(this.id);
    const caught = this.game.s.dex.caught.includes(s.id);
    menuBackground(ctx, W, H);
    box(ctx, 2, 2, 252, 188);
    ctx.fillStyle = '#f0e0b8';
    ctx.fillRect(8, 8, 68, 68);
    fillEllipse(ctx, 42, 70, 26, 5, '#dcc490');
    drawCreature(ctx, s.id, 42, 72, 64);
    text(ctx, `N°${dexNumber(s.id)}`, 82, 6, { color: PAL.rust });
    text(ctx, s.name, 112, 6, { shadow: PAL.shadow });
    if (caught) calabash(ctx, 244, 11, 1);
    text(ctx, s.category + (s.legendary ? ' ★' : ''), 82, 17, { color: PAL.grey });
    s.types.forEach((t, i) => typeBadge(ctx, t, 82 + i * 44, 30, 40));

    if (!caught) {
      text(ctx, 'Capturez-le pour compléter', 82, 46, { color: PAL.grey });
      text(ctx, 'sa fiche.', 82, 56, { color: PAL.grey });
    } else {
      const base = s.baseStats;
      const rows: Array<[string, number]> = [
        ['PV', base.hp],
        ['Att.', base.attack],
        ['Déf.', base.defense],
        ['Vit.', base.speed],
      ];
      rows.forEach(([label, v], i) => {
        const y = 43 + i * 9;
        text(ctx, label, 82, y - 2);
        text(ctx, String(v), 124, y - 2, { align: 'right' });
        bar(ctx, 130, y + 3, 116, 2, v / 130, v >= 90 ? PAL.hpGreen : v >= 60 ? PAL.hpYellow : PAL.ochre);
      });
    }
    let y = 80;
    const pre = preEvolution(s.id);
    const evo = s.evolution
      ? `Évolue en ${getSpecies(s.evolution.to).name} au niveau ${s.evolution.level}.`
      : pre
        ? `Évolution de ${pre.name}.`
        : 'N’évolue pas.';
    text(ctx, evo, 10, y, { color: PAL.indigo });
    y += 12;
    const where = habitats(s.id);
    const haunt = HAUNTS.find((h) => h.species === s.id);
    const habitat = haunt
      ? `Habitat : rôde la nuit, ${ZONES[haunt.zone].name}. Hantise : elle vous traque sur la carte.`
      : s.legendary
        ? 'Habitat : inconnu. On dit qu’il ne se montre qu’aux plus grands Initiés.'
        : where.length
          ? `Habitat : ${where.join(' · ')}`
          : 'Habitat : par évolution uniquement.';
    // Une Terreur : sa façon de chasser, puis les zones où elle rôde.
    const rows =
      s.terreur && !haunt
        ? [`Terreur : ${HUNT_HINTS[mobKindOf(s.id)]}.`, ...fit(huntingGrounds(s.id).map((id) => ZONES[id].name).join(' · '), 1)]
        : fit(habitat, 2);
    for (const row of rows) {
      text(ctx, row, 10, y, { color: '#3a7a3a' });
      y += 10;
    }
    y += 2;
    if (caught && s.talent) {
      text(ctx, `Talent : ${TALENTS[s.talent].name}`, 10, y, { color: PAL.rust });
      y += 12;
    }
    if (caught) {
      for (const row of fit(s.description, 4)) {
        text(ctx, row, 10, y, { shadow: PAL.shadow });
        y += 10;
      }
      y += 2;
    }
    text(ctx, 'Origine', 10, y, { color: PAL.rust });
    y += 11;
    // L'origine prend la place qui reste au-dessus du pied de page.
    for (const row of fit(s.folklore, Math.max(1, Math.min(3, Math.floor((178 - y) / 10))))) {
      text(ctx, row, 10, y);
      y += 10;
    }
    text(ctx, '◄ ► · B', 246, 178, { color: PAL.grey, align: 'right' });
  }
}
