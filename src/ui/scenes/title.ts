// Écran titre, saisie du nom et démarrage de la partie.
import { newGameState } from '../../engine/gameState';
import { hasSave, loadGame } from '../../engine/saveManager';
import { titleBackdrop } from '../backdrops';
import { PAL, box, menuList, text } from '../draw';
import { drawOutlinedText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { W } from '../screen';
import { drawCreature } from '../sprites';
import { OverworldScene } from './overworld';
import { TextEntryScene } from './textEntry';
import { RevealScene } from './transition';

/** Le prénom proposé d'office (on peut l'effacer), puis d'autres suggestions. */
export const DEFAULT_NAME = 'Lisa';
const SUGGESTIONS = [DEFAULT_NAME, 'Sékou', 'Aïssata', 'Moussa', 'Awa', 'Kofi', 'Mariam', 'Oumar', 'Ama', 'Fatou', 'Salif', 'Nana'];

/** Paysage sahélien au coucher du soleil (titre et saisie du nom). */
function sahelBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(titleBackdrop(), 0, 0);
}

export class TitleScene implements Scene {
  readonly opaque = true;
  private index = 0;
  private options: string[];
  readonly music = 'titre';

  constructor(private readonly game: Game) {
    this.options = hasSave() ? ['Continuer', 'Nouvelle partie'] : ['Nouvelle partie'];
  }

  update(): void {
    const input = this.game.input;
    const n = this.options.length;
    if (input.pressed('up') || input.pressed('down')) {
      this.index = (this.index + 1) % n;
      this.game.sfx('curseur');
    }
    if (!input.pressed('a')) return;
    this.game.sfx('valider');
    if (this.options[this.index] === 'Continuer') {
      const state = loadGame();
      if (!state) {
        this.game.say(['La sauvegarde est illisible. Commencez une nouvelle partie.']);
        this.options = ['Nouvelle partie'];
        this.index = 0;
        return;
      }
      startWorld(this.game, state, false);
      return;
    }
    if (hasSave()) {
      this.game.ask(['Une partie est déjà sauvegardée.', 'Commencer une nouvelle aventure ? L’ancienne sera écrasée.'], ['Non', 'Oui'], (choice) => {
        if (choice === 1) this.game.scenes.push(new NameScene(this.game));
      }, 0);
    } else {
      this.game.scenes.push(new NameScene(this.game));
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    sahelBackdrop(ctx);
    drawOutlinedText(ctx, 'GINÉMON', W / 2 + 2, 14, '#7a3010', PAL.ink, { align: 'center', scale: 3 });
    drawOutlinedText(ctx, 'GINÉMON', W / 2, 12, '#f8c840', PAL.ink, { align: 'center', scale: 3 });
    text(ctx, 'Légendes du Sahel et d’ailleurs', W / 2, 46, { align: 'center', color: PAL.cream, shadow: PAL.ink });
    [1, 4, 7].forEach((id, i) => {
      const bob = Math.floor(this.game.time * 2 + i) % 2;
      drawCreature(ctx, id, 52 + i * 76, 148 - bob, 64);
    });
    box(ctx, 78, 152, 100, this.options.length * 12 + 12);
    menuList(ctx, this.options, 86, 157, this.index);
  }
}

/** Le prénom de l'héroïne : « Lisa » est proposé d'office, on peut en taper un autre. */
export class NameScene extends TextEntryScene {
  constructor(game: Game) {
    super(game, {
      title: 'Comment t’appelles-tu ?',
      initial: DEFAULT_NAME,
      suggestions: SUGGESTIONS,
      backdrop: sahelBackdrop,
      onDone: (name) => startWorld(game, newGameState(name), true),
      onCancel: () => undefined,
    });
  }
}

/** Lance l'exploration avec l'état donné. */
export function startWorld(game: Game, state: ReturnType<typeof newGameState>, intro: boolean): void {
  game.state = state;
  game.audio.enabled = state.options.sound;
  game.audio.music.enabled = state.options.music;
  game.scenes.reset(new OverworldScene(game));
  if (!intro) {
    game.scenes.push(new RevealScene(game, 0.6));
    game.toast(`Bon retour, ${state.playerName} !`);
    return;
  }
  game.save(true);
  // Réveil dans la chambre : Maman appelle depuis le salon.
  const touch = document.body.classList.contains('tactile');
  game.scenes.push(
    new RevealScene(game, 0.9, () =>
      game.say([
        '… … …',
        `Maman (d’en bas) : ${state.playerName} ! Debout ! Tu as encore beaucoup trop dormi !`,
        'Maman : Descends vite, je t’attends au salon. C’est un grand jour aujourd’hui !',
        touch
          ? 'Croix pour te déplacer, A pour parler, B maintenu pour courir, ☰ pour le menu. L’escalier est en haut à droite de ta chambre.'
          : 'Flèches ou ZQSD pour te déplacer, Entrée pour parler, Maj pour courir, Échap pour le menu. L’escalier est en haut à droite de ta chambre.',
      ]),
    ),
  );
}
