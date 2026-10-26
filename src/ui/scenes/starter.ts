// Cérémonie du choix du premier Jinémon, parmi trois Calebasses Sacrées.
import { getSpecies } from '../../data/ginedex';
import { markSeen } from '../../engine/gameState';
import { hutInterior } from '../backdrops';
import { PAL, box, calabash, cursor, text, typeBadge } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { W } from '../screen';
import { drawCreature } from '../sprites';

const STARTERS = [1, 4, 7];

export class StarterScene implements Scene {
  readonly opaque = true;
  private index = 0;

  constructor(
    private readonly game: Game,
    private readonly onChoose: (speciesId: number) => void,
  ) {
    STARTERS.forEach((id) => markSeen(game.s, id));
  }

  update(): void {
    const input = this.game.input;
    if (input.pressed('left')) {
      this.index = (this.index + 2) % 3;
      this.game.sfx('curseur');
    }
    if (input.pressed('right')) {
      this.index = (this.index + 1) % 3;
      this.game.sfx('curseur');
    }
    if (input.pressed('a')) {
      const species = getSpecies(STARTERS[this.index]);
      this.game.ask([`Choisir ${species.name}, le Jinémon de type ${species.types[0]} ?`], ['Oui', 'Non'], (choice) => {
        if (choice !== 0) return;
        this.game.scenes.pop(this);
        this.onChoose(species.id);
      });
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Intérieur du sanctuaire du Hogon : murs de banco, frise bogolan et natte tressée.
    ctx.drawImage(hutInterior(), 0, 0);
    text(ctx, 'Choisis ton premier compagnon', W / 2, 4, { align: 'center', color: PAL.cream, shadow: PAL.ink });

    STARTERS.forEach((id, i) => {
      const x = 64 + i * 64;
      const selected = i === this.index;
      calabash(ctx, x, 110, selected ? 3 : 2, ['#7ac84a', '#5ab0d8', '#f08a3a'][i]);
      if (selected) {
        const bob = Math.floor(this.game.time * 3) % 2;
        drawCreature(ctx, id, x, 90 - bob, 64);
        cursor(ctx, x - 22, 106);
      } else {
        drawCreature(ctx, id, x, 90, 32, { silhouette: true, alpha: 0.75 });
      }
    });

    const species = getSpecies(STARTERS[this.index]);
    box(ctx, 2, 124, 252, 66);
    text(ctx, species.name, 10, 128, { shadow: PAL.shadow });
    typeBadge(ctx, species.types[0], 206, 129, 40);
    text(ctx, species.category, 10, 139, { color: PAL.grey });
    wrapText(species.description, 236)
      .slice(0, 3)
      .forEach((row, i) => text(ctx, row, 10, 151 + i * 11));
  }
}
