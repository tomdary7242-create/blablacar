// Voler (Insigne du Vent) : un Jinémon Vol emporte le joueur vers un lieu de soin déjà visité.
import { MOVES } from '../../data/moves';
import { ZONES, type Zone } from '../../data/zones';
import { displayName } from '../../engine/creature';
import { hasBadge, type GameState } from '../../engine/gameState';
import { PAL, box, menuList, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { CoverScene, RevealScene } from './transition';

/** Jinémon capable de voler (Insigne du Vent et une attaque Vol), ou null. */
export function flyer(state: GameState): { name: string } | null {
  if (!hasBadge(state, 'vent')) return null;
  const j = state.party.find((p) => p.hp > 0 && p.moves.some((m) => MOVES[m.id].type === 'Vol'));
  return j ? { name: displayName(j) } : null;
}

/** Destinations : les zones visitées qui ont un lieu de soin. */
function destinations(state: GameState): Zone[] {
  return Object.values(ZONES).filter((z) => z.flyPoint && state.flags[`visite:${z.id}`]);
}

export class FlyScene implements Scene {
  private index = 0;
  private readonly places: Zone[];

  constructor(
    private readonly game: Game,
    private readonly onLeave: () => void,
  ) {
    this.places = destinations(game.s);
  }

  update(): void {
    const input = this.game.input;
    const n = this.places.length + 1;
    if (input.pressed('up')) {
      this.index = (this.index + n - 1) % n;
      this.game.sfx('curseur');
    }
    if (input.pressed('down')) {
      this.index = (this.index + 1) % n;
      this.game.sfx('curseur');
    }
    if (input.pressed('b') || (input.pressed('a') && this.index === this.places.length)) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    if (!input.pressed('a')) return;
    const zone = this.places[this.index];
    const game = this.game;
    const who = flyer(game.s);
    game.scenes.pop(this);
    this.onLeave();
    game.sfx('valider');
    game.say([`${who?.name ?? 'Votre Jinémon'} déploie ses ailes et vous emporte vers ${zone.name} !`], () => {
      game.scenes.push(
        new CoverScene(game, 'fondu', () => {
          const p = zone.flyPoint!;
          game.world?.teleport(zone.id, p.x, p.y, p.dir);
          game.save(true);
          game.scenes.push(new RevealScene(game));
        }, 0.5),
      );
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const items = [...this.places.map((z) => z.name), 'Annuler'];
    const h = items.length * 12 + 26;
    box(ctx, 40, 4, 176, h);
    text(ctx, 'OÙ VOLER ?', 128, 8, { align: 'center', color: PAL.rust });
    menuList(ctx, items, 50, 22, this.index);
  }
}
