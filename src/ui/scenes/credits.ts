// Panthéon des Légendes : l'équipe victorieuse est inscrite, puis le générique défile.
import { SPECIES } from '../../data/ginedex';
import { displayName, isShiny } from '../../engine/creature';
import { formatPlayTime } from '../../engine/gameState';
import { PAL, box, text } from '../draw';
import { drawOutlinedText } from '../font';
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

/** Carte de fin de l'Acte I, avant la route de Tombouctou. */
const ACTE1 = [
  'FIN DE L’ACTE I',
  '',
  'Les trois insignes du Mandé,',
  'la Gardienne du Panthéon vaincue :',
  'votre nom est inscrit sur la falaise.',
  '',
  'Mais au-delà du grand désert,',
  'cinq Maîtres de Piste et le',
  'Conseil des Griots de Tombouctou',
  'attendent les plus grands Initiés.',
  '',
  'ACTE II',
  'La route de Tombouctou',
];

export class CreditsScene implements Scene {
  readonly opaque = true;
  private phase: 'pantheon' | 'generique' = 'pantheon';
  private t = 0;
  readonly music = 'titre';

  constructor(
    private readonly game: Game,
    /** Fin de l'Acte I (Panthéon) ou fin du jeu (Conseil des Griots). */
    private readonly mode: 'acte1' | 'final',
  ) {}

  private get lines(): string[] {
    return this.mode === 'final' ? CREDITS : ACTE1;
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.phase === 'pantheon' && input.pressed('a') && this.t > 1) {
      this.phase = 'generique';
      this.t = 0;
      return;
    }
    const scrollDone = 240 + this.lines.length * 16 - this.t * 24 < 0;
    if (this.phase === 'generique' && (scrollDone || input.pressed('a') || input.pressed('b'))) {
      this.game.scenes.pop(this);
      this.game.input.consume();
      this.game.say(
        this.mode === 'final'
          ? [
              'Les griots chanteront longtemps l’histoire de votre équipe.',
              'On raconte que la terre a tremblé dans les monts de Hombori : Aïdohwedo, le serpent qui porte le monde, se serait éveillé…',
            ]
          : [
              'Le Panthéon garde désormais la mémoire de votre équipe.',
              'On murmure que deux Légendes se sont éveillées sur les autels de la falaise : le Renard Pâle et le Serpent d’Or…',
              'Et au nord de la falaise, le Gardien du Nord a ouvert la route du désert. Tombouctou vous attend.',
            ],
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % 120;
      ctx.fillStyle = (i + Math.floor(this.t * 2)) % 5 === 0 ? '#ffffff' : '#8a90b0';
      ctx.fillRect(x, y, 1, 1);
    }
    const s = this.game.s;
    if (this.phase === 'pantheon') {
      const final = this.mode === 'final';
      drawOutlinedText(ctx, final ? 'CONSEIL DES GRIOTS' : 'PANTHÉON DES LÉGENDES', W / 2, 6, '#f0c040', PAL.ink, { align: 'center' });
      text(ctx, final ? `${s.playerName}, Champion du Mandé` : `${s.playerName}, Maître des Légendes`, W / 2, 20, { align: 'center', color: PAL.cream });
      s.party.forEach((j, i) => {
        const x = Math.round(W / 2 + (i - (s.party.length - 1) / 2) * 42);
        const bob = Math.floor(this.t * 2 + i) % 2;
        drawCreature(ctx, j.speciesId, x, 84 - bob, 32, { shiny: isShiny(j) });
        text(ctx, displayName(j).slice(0, 8), x, 88, { align: 'center', color: PAL.cream });
        text(ctx, `N.${j.level}`, x, 98, { align: 'center', color: '#c8b8a0' });
      });
      box(ctx, 28, 118, 200, 50, 'sombre');
      text(ctx, `Temps de jeu : ${formatPlayTime(s.playTimeMs)}`, W / 2, 122, { align: 'center', color: PAL.cream });
      text(ctx, `Ginédex : ${s.dex.caught.length}/${SPECIES.length} capturés`, W / 2, 134, { align: 'center', color: PAL.cream });
      text(ctx, `Insignes : ${s.badges.length}/8`, W / 2, 146, { align: 'center', color: PAL.cream });
      if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'Appuyez sur A', W / 2, 176, { align: 'center', color: '#c8b8a0' });
      return;
    }
    this.lines.forEach((line, i) => {
      const y = Math.round(H + i * 13 - this.t * 20);
      if (y < -12 || y > H) return;
      if (i === 0 || line.startsWith('ACTE')) drawOutlinedText(ctx, line, W / 2, y, '#f0c040', PAL.ink, { align: 'center' });
      else text(ctx, line, W / 2, y, { align: 'center', color: PAL.cream });
    });
  }
}
