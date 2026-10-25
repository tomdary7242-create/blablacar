// Gestion des attaques : le joueur peut remplacer à tout moment une attaque
// par une autre déjà apprise de son bassin (niveau ≤ niveau actuel).
import { getSpecies } from '../../data/ginedex';
import { MOVES, type MoveId } from '../../data/moves';
import { availableMoves, displayName, slot, type Jinemon } from '../../engine/creature';
import { PAL, box, cursor, text, typeBadge } from '../draw';
import { wrapText } from '../font';
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
  text(ctx, move.name, x + 8, y + 3, { shadow: PAL.shadow });
  typeBadge(ctx, move.type, x + 8, y + 16, 40);
  const power = move.power > 0 ? String(move.power) : '—';
  text(ctx, `Puiss. ${power}  Préc. ${move.accuracy}  PP ${pp ?? move.pp}/${move.pp}`, x + 52, y + 15);
  wrapText(move.description, w - 16)
    .slice(0, Math.max(0, Math.floor((h - 34) / 10)))
    .forEach((row, i) => text(ctx, row, x + 8, y + 28 + i * 10));
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
    this.cursor = new ListCursor(entries.length, 7);
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
    text(ctx, this.title, 6, 2, { color: PAL.cream, shadow: PAL.ink });
    box(ctx, 2, 15, 252, 100);
    for (const i of this.cursor.window()) {
      const e = this.entries[i];
      const y = 20 + (i - this.cursor.scroll) * 12;
      const move = MOVES[e.id];
      const level = this.levelOf?.(e.id);
      if (level !== undefined) text(ctx, `N.${level}`, 16, y, { color: PAL.grey });
      text(ctx, move.name, 44, y, { shadow: PAL.shadow });
      text(ctx, move.type, 196, y, { color: PAL.grey });
      if (e.tag) text(ctx, e.tag, 246, y, { align: 'right', color: PAL.rust });
      if (i === this.cursor.index) cursor(ctx, 8, y + 2);
    }
    const current = this.entries[this.cursor.index];
    if (current) drawMoveDetails(ctx, current.id, 2, 117, 252, 73);
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
      this.message = 'Aucune autre attaque apprise.';
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
          this.message = `Nouvelle attaque : ${MOVES[candidates[picked]].name}.`;
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
    text(ctx, `ATTAQUES DE ${displayName(this.j).toUpperCase()}`, 6, 2, { color: PAL.cream, shadow: PAL.ink });
    box(ctx, 2, 15, 252, 58);
    this.j.moves.forEach((m, i) => {
      const y = 20 + i * 12;
      text(ctx, MOVES[m.id].name, 18, y, { shadow: PAL.shadow });
      text(ctx, `PP ${m.pp}/${MOVES[m.id].pp}`, 246, y, { align: 'right' });
      if (i === this.index) cursor(ctx, 8, y + 2);
    });
    const slotSel = this.j.moves[this.index];
    drawMoveDetails(ctx, slotSel.id, 2, 75, 252, 70, slotSel.pp);
    box(ctx, 2, 147, 252, 43);
    wrapText(this.message, 236)
      .slice(0, 1)
      .forEach((row) => text(ctx, row, 10, 152, { shadow: PAL.shadow }));
    const total = availableMoves(this.j).length;
    text(ctx, `Bassin : ${total}/${getSpecies(this.j.speciesId).learnset.length} attaques apprises.`, 10, 168, { color: PAL.grey });
  }
}
