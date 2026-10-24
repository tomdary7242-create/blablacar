// Cérémonie du choix du premier Jinémon, parmi trois Calebasses Sacrées.
import { getSpecies } from '../../data/ginedex';
import { markSeen } from '../../engine/gameState';
import { PAL, box, calabash, text, typeBadge, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
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
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a2414');
    g.addColorStop(1, '#8a5a32');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Natte tressée
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(20, 112, 280, 40);
    ctx.fillStyle = '#a87a38';
    for (let x = 20; x < 300; x += 8) ctx.fillRect(x, 112, 2, 40);
    text(ctx, 'Choisis ton premier compagnon', W / 2, 12, { size: 12, bold: true, align: 'center', color: PAL.cream, shadow: PAL.ink });

    STARTERS.forEach((id, i) => {
      const x = 70 + i * 90;
      const selected = i === this.index;
      calabash(ctx, x, 134, selected ? 13 : 11, ['#7ac84a', '#5ab0d8', '#f08a3a'][i]);
      if (selected) {
        const bob = Math.sin(this.game.time * 4) * 2;
        ctx.fillStyle = 'rgba(255,240,180,0.25)';
        ctx.beginPath();
        ctx.arc(x, 82, 34, 0, Math.PI * 2);
        ctx.fill();
        drawCreature(ctx, id, x, 108 + bob, 76);
      } else {
        drawCreature(ctx, id, x, 104, 44, { silhouette: true, alpha: 0.6 });
      }
    });

    const species = getSpecies(STARTERS[this.index]);
    box(ctx, 6, 160, 308, 76);
    text(ctx, species.name, 16, 168, { size: 12, bold: true });
    typeBadge(ctx, species.types[0], 260, 170, 46);
    text(ctx, species.category, 16, 184, { size: 8, color: PAL.grey });
    wrap(ctx, species.description, 288, 9)
      .slice(0, 3)
      .forEach((row, i) => text(ctx, row, 16, 197 + i * 12, { size: 9 }));
  }
}
