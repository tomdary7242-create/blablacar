// Écran titre, saisie du nom et démarrage de la partie.
import { newGameState } from '../../engine/gameState';
import { hasSave, loadGame } from '../../engine/saveManager';
import { PAL, box, menuList, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { OverworldScene } from './overworld';
import { RevealScene } from './transition';

const SUGGESTIONS = ['Sékou', 'Aïssata', 'Moussa', 'Awa', 'Kofi', 'Mariam', 'Oumar', 'Ama', 'Yacouba', 'Fatou', 'Salif', 'Nana'];

/** Paysage sahélien au coucher du soleil (titre et saisie du nom). */
function sahelBackdrop(ctx: CanvasRenderingContext2D, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2a1a3a');
  sky.addColorStop(0.45, '#c8502a');
  sky.addColorStop(0.75, '#f0a050');
  sky.addColorStop(1, '#f8d890');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd870';
  ctx.beginPath();
  ctx.arc(W / 2, 150, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,216,112,0.25)';
  ctx.beginPath();
  ctx.arc(W / 2, 150, 60 + Math.sin(time) * 2, 0, Math.PI * 2);
  ctx.fill();
  // Falaise et greniers
  ctx.fillStyle = '#4a2418';
  ctx.beginPath();
  ctx.moveTo(0, 150);
  ctx.lineTo(40, 140);
  ctx.lineTo(70, 146);
  ctx.lineTo(96, 132);
  ctx.lineTo(120, 160);
  ctx.lineTo(0, 175);
  ctx.fill();
  for (const [x, y] of [
    [52, 150],
    [66, 152],
    [84, 146],
  ]) {
    ctx.fillRect(x, y, 8, 10);
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 1);
    ctx.lineTo(x + 4, y - 6);
    ctx.lineTo(x + 10, y + 1);
    ctx.fill();
  }
  ctx.fillStyle = '#2a140c';
  ctx.fillRect(0, 168, W, H - 168);
  // Baobab et acacia
  ctx.fillRect(238, 128, 12, 42);
  ctx.fillRect(232, 124, 4, 10);
  ctx.fillRect(250, 120, 4, 12);
  ctx.beginPath();
  ctx.ellipse(244, 120, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(286, 146, 3, 24);
  ctx.beginPath();
  ctx.ellipse(288, 144, 20, 4, 0, 0, Math.PI * 2);
  ctx.fill();
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
    text(ctx, 'GINÉMON', W / 2 + 2, 30, { size: 40, bold: true, align: 'center', color: PAL.ink });
    text(ctx, 'GINÉMON', W / 2, 28, { size: 40, bold: true, align: 'center', color: '#f0c040' });
    text(ctx, 'Légendes du Sahel et d’ailleurs', W / 2, 74, { size: 10, align: 'center', color: PAL.cream, shadow: PAL.ink });
    [1, 4, 7].forEach((id, i) => {
      const bob = Math.sin(this.game.time * 3 + i * 2) * 2;
      drawCreature(ctx, id, 70 + i * 90, 160 + bob, 56);
    });
    box(ctx, 110, 176, 100, this.options.length * 15 + 14);
    menuList(ctx, this.options, 120, 184, this.index, { lineHeight: 15 });
    text(ctx, 'Flèches/ZQSD : bouger · Entrée : valider · Échap : menu · Maj : courir', W / 2, 226, {
      size: 7,
      align: 'center',
      color: '#e8d4b0',
    });
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
    box(ctx, 30, 40, 260, 120);
    text(ctx, 'Comment t’appelles-tu, jeune Initié ?', W / 2, 52, { size: 11, bold: true, align: 'center' });
    box(ctx, 70, 76, 180, 30, 'sombre');
    const caret = Math.floor(this.game.time * 2) % 2 === 0 ? '_' : ' ';
    text(ctx, this.name + caret, W / 2, 84, { size: 13, bold: true, align: 'center', color: PAL.cream });
    text(ctx, 'Tape ton nom au clavier, ou ◄ ► pour une suggestion.', W / 2, 116, { size: 8, align: 'center' });
    text(ctx, 'Entrée / A : valider', W / 2, 132, { size: 8, align: 'center', color: PAL.grey });
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
