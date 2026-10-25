// Écran titre, saisie du nom et démarrage de la partie.
import { newGameState } from '../../engine/gameState';
import { hasSave, loadGame } from '../../engine/saveManager';
import { PAL, bandGradient, box, fillEllipse, menuList, stamp, text } from '../draw';
import { drawOutlinedText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { OverworldScene } from './overworld';
import { RevealScene } from './transition';

const SUGGESTIONS = ['Sékou', 'Aïssata', 'Moussa', 'Awa', 'Kofi', 'Mariam', 'Oumar', 'Ama', 'Yacouba', 'Fatou', 'Salif', 'Nana'];

/** Paysage sahélien au coucher du soleil (titre et saisie du nom). */
function sahelBackdrop(ctx: CanvasRenderingContext2D, time: number): void {
  bandGradient(ctx, 0, 0, W, 150, ['#2a1c40', '#4a2448', '#7a3048', '#b04838', '#d86a38', '#ee9448', '#f6b860', '#fad488']);
  // Soleil couchant, avec bandes horizontales de brume.
  fillEllipse(ctx, W / 2, 118, 34, 34, '#ffe08a');
  fillEllipse(ctx, W / 2 - 4, 112, 26, 26, '#fff0b8');
  for (let y = 100; y < 150; y += 6) {
    ctx.fillStyle = '#f6b860';
    ctx.fillRect(W / 2 - 40, y + Math.floor(time * 2) % 2, 80, 1);
  }
  // Falaise de Bandiagara et greniers dogon en silhouette
  const cliff = '#3a1c18';
  for (let x = 0; x < 120; x++) {
    const h = 30 + Math.round(Math.sin(x * 0.07) * 6 + Math.sin(x * 0.23) * 2) - Math.max(0, x - 80);
    ctx.fillStyle = cliff;
    ctx.fillRect(x, 150 - h, 1, h);
  }
  for (const gx of [30, 44, 58]) {
    stamp(ctx, ['...#...', '..###..', '.#####.', '#######', '.#####.', '.#####.', '.#####.', '.#####.'], gx, 104, { '#': '#2a1210' });
  }
  ctx.fillStyle = '#24100c';
  ctx.fillRect(0, 148, W, H - 148);
  // Baobab
  stamp(
    ctx,
    [
      '..##.......##.......##..',
      '...##.....##.......##...',
      '....##...##.#.....##....',
      '.....##.##...#...##.....',
      '......####....#.##......',
      '.......####....###......',
      '........#####.###.......',
      '.........#######........',
      '.........#######........',
      '........########........',
      '........#########.......',
      '........#########.......',
      '.......##########.......',
      '.......###########......',
      '......############......',
      '......#############.....',
    ],
    194,
    118,
    { '#': '#24100c' },
    1,
  );
  for (const [x, y] of [[194, 114], [212, 112], [232, 115], [204, 110], [222, 109]]) fillEllipse(ctx, x, y, 7, 3, '#24100c');
}

export class TitleScene implements Scene {
  readonly opaque = true;
  private index = 0;
  private options: string[];

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
    sahelBackdrop(ctx, this.game.time);
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

export class NameScene implements Scene {
  readonly opaque = true;
  private name = '';
  private suggestion = -1;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    const enter = input.codes.includes('Enter') || input.codes.includes('NumpadEnter');
    if (input.typed.length) {
      for (const ch of input.typed) {
        if (ch === '\b') this.name = this.name.slice(0, -1);
        else if (/^[\p{L}\p{N} '-]$/u.test(ch) && this.name.length < 10) this.name += ch;
      }
      this.suggestion = -1;
      // Les lettres tapées déclenchent aussi des boutons (ZQSD, J, K…) : seule Entrée valide.
      if (enter) this.confirm();
      return;
    }
    if (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down')) {
      const delta = input.pressed('left') || input.pressed('up') ? -1 : 1;
      this.suggestion = (this.suggestion + delta + SUGGESTIONS.length) % SUGGESTIONS.length;
      this.name = SUGGESTIONS[this.suggestion];
      this.game.sfx('curseur');
    }
    if (input.pressed('b')) {
      if (this.name) this.name = this.name.slice(0, -1);
      else this.game.scenes.pop(this);
    }
    if (input.pressed('a')) this.confirm();
  }

  private confirm(): void {
    const name = this.name.trim() || 'Initié';
    this.game.sfx('valider');
    startWorld(this.game, newGameState(name), true);
  }

  render(ctx: CanvasRenderingContext2D): void {
    sahelBackdrop(ctx, this.game.time);
    box(ctx, 14, 36, 228, 92);
    text(ctx, 'Comment t’appelles-tu, jeune Initié ?', W / 2, 42, { align: 'center', shadow: PAL.shadow });
    box(ctx, 58, 58, 140, 26, 'sombre');
    const caret = Math.floor(this.game.time * 2) % 2 === 0 ? '_' : ' ';
    text(ctx, this.name + caret, W / 2, 62, { align: 'center', color: PAL.cream, scale: 1 });
    text(ctx, 'Tape ton nom au clavier,', W / 2, 92, { align: 'center' });
    text(ctx, 'ou ◄ ► pour une suggestion.', W / 2, 102, { align: 'center' });
    text(ctx, 'Entrée / A : valider', W / 2, 114, { align: 'center', color: PAL.grey });
  }
}

/** Lance l'exploration avec l'état donné. */
export function startWorld(game: Game, state: ReturnType<typeof newGameState>, intro: boolean): void {
  game.state = state;
  game.audio.enabled = state.options.sound;
  game.scenes.reset(new OverworldScene(game));
  if (!intro) {
    game.scenes.push(new RevealScene(game, 0.6));
    game.toast(`Bon retour, ${state.playerName} !`);
    return;
  }
  game.save(true);
  // Le dialogue d'accueil s'ouvre une fois le fondu terminé.
  game.scenes.push(
    new RevealScene(game, 0.6, () =>
      game.say([
      `Bienvenue dans le monde de Ginémon, ${state.playerName} !`,
      'Ici, au Village des Greniers, les Jinémon vivent aux côtés des hommes depuis la nuit des temps.',
      "Aujourd'hui est le jour de ton initiation. L'Ancien t'attend dans sa case, à l'ouest du village.",
      'Flèches ou ZQSD pour te déplacer, Entrée ou Espace pour parler, Échap pour le menu, Maj pour courir.',
      ]),
    ),
  );
}
