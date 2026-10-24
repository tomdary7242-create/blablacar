// Le Ginédex : liste des espèces vues et capturées, avec fiche détaillée.
import { SPECIES, dexNumber, getSpecies, preEvolution } from '../../data/ginedex';
import { TALENTS } from '../../data/talents';
import { PAL, bar, box, calabash, cursor, text, typeBadge, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { ListCursor, menuBackground } from '../widgets';

export class DexScene implements Scene {
  readonly opaque = true;
  private cursor = new ListCursor(SPECIES.length, 13);

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
    text(ctx, 'GINÉDEX', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    text(ctx, `Vus : ${dex.seen.length}   Capturés : ${dex.caught.length} / ${SPECIES.length}`, 310, 8, {
      size: 8,
      align: 'right',
      color: PAL.cream,
      shadow: PAL.ink,
    });
    box(ctx, 6, 22, 168, 214);
    for (const i of this.cursor.window()) {
      const s = SPECIES[i];
      const y = 31 + (i - this.cursor.scroll) * 15.5;
      const seen = dex.seen.includes(s.id);
      const caught = dex.caught.includes(s.id);
      const selected = i === this.cursor.index;
      if (selected) cursor(ctx, 12, y + 1);
      text(ctx, dexNumber(s.id), 22, y, { size: 9, color: PAL.rust, bold: selected });
      text(ctx, seen ? s.name : '- - - - -', 48, y, { size: 9, bold: selected, color: seen ? PAL.ink : PAL.grey });
      if (caught) calabash(ctx, 162, y + 5, 3.5);
      else if (seen) {
        ctx.fillStyle = PAL.grey;
        ctx.beginPath();
        ctx.arc(162, y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const s = SPECIES[this.cursor.index];
    const seen = dex.seen.includes(s.id);
    box(ctx, 178, 22, 136, 214);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(246, 128, 44, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    drawCreature(ctx, s.id, 246, 132, 100, { silhouette: !seen });
    text(ctx, `N°${dexNumber(s.id)}`, 188, 30, { size: 8, color: PAL.rust, bold: true });
    text(ctx, seen ? s.name : '???', 246, 142, { size: 11, bold: true, align: 'center' });
    if (seen) {
      text(ctx, s.category, 246, 157, { size: 7, align: 'center', color: PAL.grey });
      s.types.forEach((t, i) => typeBadge(ctx, t, s.types.length === 1 ? 224 : 196 + i * 52, 170, 48));
      wrap(ctx, s.folklore.split(' — ')[0], 118, 8)
        .slice(0, 3)
        .forEach((row, i) => text(ctx, row, 246, 190 + i * 10, { size: 8, align: 'center' }));
      text(ctx, 'A : voir la fiche', 246, 222, { size: 7, align: 'center', color: PAL.grey });
    } else {
      text(ctx, 'Jinémon jamais rencontré.', 246, 170, { size: 8, align: 'center', color: PAL.grey });
    }
  }
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
    box(ctx, 6, 6, 308, 228);
    ctx.fillStyle = 'rgba(200,137,42,0.18)';
    ctx.fillRect(12, 12, 96, 104);
    drawCreature(ctx, s.id, 60, 112, 100);
    text(ctx, `N°${dexNumber(s.id)}`, 116, 14, { size: 9, color: PAL.rust, bold: true });
    text(ctx, s.name, 150, 12, { size: 13, bold: true });
    text(ctx, s.category + (s.legendary ? ' · Légende du Panthéon' : ''), 116, 30, { size: 8, color: PAL.grey });
    s.types.forEach((t, i) => typeBadge(ctx, t, 116 + i * 52, 42, 48));
    if (caught) calabash(ctx, 300, 20, 5);

    if (!caught) {
      text(ctx, 'Capturez ce Jinémon pour compléter sa fiche.', 116, 64, { size: 8, color: PAL.grey });
    } else {
      const base = s.baseStats;
      const rows: Array<[string, number]> = [
        ['PV', base.hp],
        ['Att.', base.attack],
        ['Déf.', base.defense],
        ['Vit.', base.speed],
      ];
      rows.forEach(([label, v], i) => {
        const y = 60 + i * 12;
        text(ctx, label, 116, y, { size: 8 });
        text(ctx, String(v), 162, y, { size: 8, bold: true, align: 'right' });
        bar(ctx, 168, y + 3, 134, 3, v / 130, v >= 90 ? PAL.hpGreen : v >= 60 ? PAL.hpYellow : PAL.ochre);
      });
      if (s.talent) {
        text(ctx, `Talent : ${TALENTS[s.talent].name}`, 116, 110, { size: 8, bold: true, color: PAL.rust });
      }
    }

    let y = 124;
    const pre = preEvolution(s.id);
    const evo = s.evolution
      ? `Évolue en ${getSpecies(s.evolution.to).name} au niveau ${s.evolution.level}.`
      : pre
        ? `Évolution de ${pre.name}.`
        : 'N’évolue pas.';
    text(ctx, evo, 16, y, { size: 8, color: PAL.indigo, bold: true });
    y += 14;
    if (caught) {
      for (const row of wrap(ctx, s.description, 288, 9).slice(0, 4)) {
        text(ctx, row, 16, y, { size: 9 });
        y += 12;
      }
      y += 4;
    }
    text(ctx, 'Origine', 16, y, { size: 8, bold: true, color: PAL.rust });
    y += 11;
    for (const row of wrap(ctx, s.folklore, 288, 8).slice(0, 3)) {
      text(ctx, row, 16, y, { size: 8 });
      y += 10;
    }
    text(ctx, '◄ ► fiches · B retour', 304, 222, { size: 7, color: PAL.grey, align: 'right' });
  }
}
