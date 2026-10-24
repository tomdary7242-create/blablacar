// Panthéon des Légendes : l'équipe victorieuse est inscrite, puis le générique défile.
import { SPECIES } from '../../data/ginedex';
import { displayName } from '../../engine/creature';
import { formatPlayTime } from '../../engine/gameState';
import { PAL, box, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';

const CREDITS = [
  'GINÉMON',
  '',
  'Un RPG de collection et de combat',
  'inspiré des contes et cosmogonies',
  "d'Afrique de l'Ouest :",
  'traditions dogon, bambara, peule,',
  'soninké, wolof, mandingue, akan…',
  '',
  'et enrichi des légendes du monde :',
  'dragons d’Europe et de Chine,',
  'esprits du Japon, spectres du Nord,',
  'serpent à plumes de Mésoamérique,',
  'sphinx d’Égypte et feux follets.',
  '',
  'Les contes appartiennent à ceux',
  'qui les racontent et les transmettent.',
  'Merci aux griots, aux conteuses',
  'et à toutes les mémoires vivantes.',
  '',
  'Merci d’avoir joué !',
];

export class CreditsScene implements Scene {
  readonly opaque = true;
  private phase: 'pantheon' | 'generique' = 'pantheon';
  private t = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.phase === 'pantheon' && input.pressed('a') && this.t > 1) {
      this.phase = 'generique';
      this.t = 0;
      return;
    }
    const scrollDone = 240 + CREDITS.length * 16 - this.t * 24 < 0;
    if (this.phase === 'generique' && (scrollDone || input.pressed('a') || input.pressed('b'))) {
      this.game.scenes.pop(this);
      this.game.input.consume();
      this.game.say([
        'Le Panthéon garde désormais la mémoire de votre équipe.',
        'On murmure que deux Légendes se sont éveillées sur les autels de la falaise : le Renard Pâle et le Serpent d’Or…',
      ]);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % 140;
      ctx.fillStyle = `rgba(255,248,232,${0.3 + ((i * 7) % 10) / 15})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const s = this.game.s;
    if (this.phase === 'pantheon') {
      text(ctx, 'PANTHÉON DES LÉGENDES', W / 2, 14, { size: 14, bold: true, align: 'center', color: '#f0c040', shadow: PAL.ink });
      text(ctx, `${s.playerName}, Maître des Légendes`, W / 2, 36, { size: 10, align: 'center', color: PAL.cream });
      s.party.forEach((j, i) => {
        const x = W / 2 + (i - (s.party.length - 1) / 2) * 51;
        const bob = Math.sin(this.t * 3 + i) * 2;
        drawCreature(ctx, j.speciesId, x, 118 + bob, 56);
        text(ctx, displayName(j), x, 124, { size: 7, align: 'center', color: PAL.cream });
        text(ctx, `Niv.${j.level}`, x, 134, { size: 7, align: 'center', color: '#c8b8a0' });
      });
      box(ctx, 40, 156, 240, 60, 'sombre');
      text(ctx, `Temps de jeu : ${formatPlayTime(s.playTimeMs)}`, W / 2, 166, { size: 9, align: 'center', color: PAL.cream });
      text(ctx, `Ginédex : ${s.dex.caught.length} / ${SPECIES.length} capturés`, W / 2, 180, { size: 9, align: 'center', color: PAL.cream });
      text(ctx, `Insignes : ${s.badges.length} / 3`, W / 2, 194, { size: 9, align: 'center', color: PAL.cream });
      if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Appuyez sur A', W / 2, 224, { size: 8, align: 'center', color: '#c8b8a0' });
      return;
    }
    CREDITS.forEach((line, i) => {
      const y = 240 + i * 16 - this.t * 24;
      if (y < -16 || y > H) return;
      text(ctx, line, W / 2, y, { size: i === 0 ? 14 : 10, bold: i === 0, align: 'center', color: i === 0 ? '#f0c040' : PAL.cream });
    });
  }
}
