// Gestion des attaques : le joueur peut remplacer à tout moment une attaque
// par une autre déjà apprise de son bassin (niveau ≤ niveau actuel).
import { getSpecies } from '../../data/ginedex';
import { MOVES, type MoveId } from '../../data/moves';
import { availableMoves, displayName, slot, type Jinemon } from '../../engine/creature';
import { PAL, box, cursor, text, typeBadge, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { ListCursor, menuBackground } from '../widgets';

export interface MoveEntry {
  id: MoveId;
  tag?: string;
}

/** Détails d'une attaque dans un cadre. */
export function drawMoveDetails(ctx: CanvasRenderingContext2D, id: MoveId, x: number, y: number, w: number, h: number, pp?: number): void {
  const move = MOVES[id];
  box(ctx, x, y, w, h);
  text(ctx, move.name, x + 10, y + 8, { size: 10, bold: true });
  typeBadge(ctx, move.type, x + 10, y + 22, 50);
  const power = move.power > 0 ? String(move.power) : '—';
  text(ctx, `Puissance ${power}   Précision ${move.accuracy}   PP ${pp ?? move.pp}/${move.pp}`, x + 66, y + 23, { size: 8 });
  wrap(ctx, move.description, w - 20, 8)
    .slice(0, Math.floor((h - 40) / 10))
    .forEach((row, i) => text(ctx, row, x + 10, y + 38 + i * 10, { size: 8 }));
}

/** Liste d'attaques avec panneau de détails ; `onPick(null)` si annulation. */
export class MoveListScene implements Scene {
  readonly opaque = true;
  private cursor: ListCursor;

  constructor(
    private readonly game: Game,
    private readonly title: string,
    private readonly entries: MoveEntry[],
    private readonly onPick: (index: number | null) => void,
    private readonly levelOf?: (id: MoveId) => number | undefined,
  ) {
    this.cursor = new ListCursor(entries.length, 8);
  }

  update(): void {
    this.cursor.update(this.game);
    const input = this.game.input;
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      this.onPick(null);
    } else if (input.pressed('a')) {
      this.game.sfx('valider');
      this.game.scenes.pop(this);
      this.onPick(this.cursor.index);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, this.title, 10, 6, { size: 10, bold: true, color: PAL.cream, shadow: PAL.ink });
    box(ctx, 6, 20, 308, 128);
    for (const i of this.cursor.window()) {
      const e = this.entries[i];
      const y = 30 + (i - this.cursor.scroll) * 14;
      const move = MOVES[e.id];
      const level = this.levelOf?.(e.id);
      if (level !== undefined) text(ctx, `Niv.${level}`, 26, y, { size: 8, color: PAL.grey });
      text(ctx, move.name, 66, y, { size: 10, bold: i === this.cursor.index });
      text(ctx, move.type, 220, y + 1, { size: 8, color: PAL.grey });
      if (e.tag) text(ctx, e.tag, 304, y + 1, { size: 8, bold: true, align: 'right', color: PAL.rust });
      if (i === this.cursor.index) cursor(ctx, 14, y + 1);
    }
    const current = this.entries[this.cursor.index];
    if (current) drawMoveDetails(ctx, current.id, 6, 152, 308, 84);
  }
}

/** Écran « Attaques » d'un Jinémon de l'équipe. */
export class MovesScene implements Scene {
  readonly opaque = true;
  private index = 0;
  private message = 'Choisissez une attaque à remplacer.';

  constructor(
    private readonly game: Game,
    private readonly j: Jinemon,
  ) {}

  private levelOf = (id: MoveId) => getSpecies(this.j.speciesId).learnset.find(([, m]) => m === id)?.[0];

  update(): void {
    const input = this.game.input;
    const n = this.j.moves.length;
    if (input.pressed('up')) this.index = (this.index + n - 1) % n;
    if (input.pressed('down')) this.index = (this.index + 1) % n;
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    if (!input.pressed('a')) return;
    const equipped = new Set(this.j.moves.map((m) => m.id));
    const candidates = availableMoves(this.j).filter((m) => !equipped.has(m));
    if (candidates.length === 0) {
      this.message = 'Aucune autre attaque apprise pour le moment.';
      this.game.sfx('erreur');
      return;
    }
    this.game.sfx('valider');
    const old = this.j.moves[this.index].id;
    this.game.scenes.push(
      new MoveListScene(
        this.game,
        `Remplacer ${MOVES[old].name} par…`,
        candidates.map((id) => ({ id })),
        (picked) => {
          if (picked === null) return;
          this.j.moves[this.index] = slot(candidates[picked]);
          this.message = `${displayName(this.j)} utilisera désormais ${MOVES[candidates[picked]].name}.`;
          this.game.save(true);
        },
        this.levelOf,
      ),
    );
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, `ATTAQUES DE ${displayName(this.j).toUpperCase()}`, 10, 6, { size: 10, bold: true, color: PAL.cream, shadow: PAL.ink });
    box(ctx, 6, 20, 308, 74);
    this.j.moves.forEach((m, i) => {
      const y = 30 + i * 14;
      text(ctx, MOVES[m.id].name, 26, y, { size: 10, bold: i === this.index });
      text(ctx, `PP ${m.pp}/${MOVES[m.id].pp}`, 304, y + 1, { size: 8, align: 'right' });
      if (i === this.index) cursor(ctx, 14, y + 1);
    });
    const slotSel = this.j.moves[this.index];
    drawMoveDetails(ctx, slotSel.id, 6, 98, 308, 84, slotSel.pp);
    box(ctx, 6, 186, 308, 50);
    text(ctx, this.message, 16, 194, { size: 9 });
    const total = availableMoves(this.j).length;
    text(ctx, `Bassin : ${total} attaque${total > 1 ? 's' : ''} apprise${total > 1 ? 's' : ''} sur ${getSpecies(this.j.speciesId).learnset.length}.`, 16, 210, {
      size: 8,
      color: PAL.grey,
    });
  }
}
