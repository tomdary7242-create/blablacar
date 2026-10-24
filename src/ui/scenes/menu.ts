// Menu principal d'exploration, options et insignes.
import { SPECIES } from '../../data/ginedex';
import { BADGES, BADGE_ORDER, type BadgeId } from '../../data/trainers';
import { formatPlayTime } from '../../engine/gameState';
import { PAL, box, menuList, text, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { menuBackground } from '../widgets';
import { BagScene } from './bag';
import { DexScene } from './dex';
import { TeamScene } from './team';

const OPTIONS = ['GINÉDEX', 'ÉQUIPE', 'SAC', 'INSIGNES', 'SAUVEGARDER', 'OPTIONS', 'RETOUR'];

export class MenuScene implements Scene {
  private index = 0;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    if (input.pressed('up')) {
      this.index = (this.index + OPTIONS.length - 1) % OPTIONS.length;
      this.game.sfx('curseur');
    }
    if (input.pressed('down')) {
      this.index = (this.index + 1) % OPTIONS.length;
      this.game.sfx('curseur');
    }
    if (input.pressed('b') || input.pressed('start')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    if (!input.pressed('a')) return;
    this.game.sfx('valider');
    const game = this.game;
    switch (OPTIONS[this.index]) {
      case 'GINÉDEX':
        game.scenes.push(new DexScene(game));
        break;
      case 'ÉQUIPE':
        game.scenes.push(new TeamScene(game, 'consulter'));
        break;
      case 'SAC':
        game.scenes.push(new BagScene(game, 'consulter'));
        break;
      case 'INSIGNES':
        game.scenes.push(new BadgesScene(game));
        break;
      case 'SAUVEGARDER':
        game.save();
        break;
      case 'OPTIONS':
        game.scenes.push(new OptionsScene(game));
        break;
      default:
        game.scenes.pop(this);
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.game.s;
    box(ctx, 6, 6, 160, 76);
    text(ctx, s.playerName, 16, 13, { size: 11, bold: true });
    text(ctx, `Cauris : ${s.cauris}`, 16, 30, { size: 9 });
    text(ctx, `Insignes : ${s.badges.length} / 3`, 16, 43, { size: 9 });
    text(ctx, `Ginédex : ${s.dex.caught.length} / ${SPECIES.length}`, 16, 56, { size: 9 });
    text(ctx, `Temps de jeu : ${formatPlayTime(s.playTimeMs)}`, 16, 69, { size: 8, color: PAL.grey });
    box(ctx, 204, 6, 110, OPTIONS.length * 15 + 14);
    menuList(ctx, OPTIONS, 214, 14, this.index, { lineHeight: 15, size: 9 });
  }
}

export class OptionsScene implements Scene {
  private index = 0;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    const options = this.game.s.options;
    if (input.pressed('up') || input.pressed('down')) {
      this.index = (this.index + (input.pressed('up') ? 2 : 1)) % 3;
      this.game.sfx('curseur');
    }
    const delta = input.pressed('left') ? -1 : input.pressed('right') ? 1 : 0;
    if (delta && this.index === 0) {
      const speeds = ['lent', 'normal', 'rapide'] as const;
      options.textSpeed = speeds[(speeds.indexOf(options.textSpeed) + delta + 3) % 3];
      this.game.sfx('curseur');
    }
    if ((delta || input.pressed('a')) && this.index === 1) {
      options.sound = !options.sound;
      this.game.audio.enabled = options.sound;
      this.game.sfx('valider');
    }
    if (input.pressed('b') || (input.pressed('a') && this.index === 2)) {
      this.game.sfx('retour');
      this.game.save(true);
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const o = this.game.s.options;
    const speed = { lent: 'Lente', normal: 'Normale', rapide: 'Rapide' }[o.textSpeed];
    box(ctx, 40, 60, 240, 90);
    text(ctx, 'OPTIONS', 160, 68, { size: 11, bold: true, align: 'center', color: PAL.rust });
    menuList(ctx, [`Vitesse du texte :  ◄ ${speed} ►`, `Sons :  ◄ ${o.sound ? 'Activés' : 'Coupés'} ►`, 'Retour'], 56, 88, this.index, {
      lineHeight: 18,
    });
  }
}

/** Emblème dessiné de chaque insigne. */
export function drawBadge(ctx: CanvasRenderingContext2D, id: BadgeId, x: number, y: number, owned: boolean): void {
  const color = owned ? BADGES[id].color : '#6a5a4a';
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = owned ? '#f0c040' : '#8a7a68';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = owned ? '#fff8e8' : '#4a3a2e';
  if (id === 'enclume') {
    ctx.fillRect(x - 7, y - 4, 14, 4);
    ctx.fillRect(x - 3, y, 6, 4);
    ctx.fillRect(x - 6, y + 4, 12, 2);
  } else if (id === 'pluie') {
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.quadraticCurveTo(x + 7, y + 2, x, y + 6);
    ctx.quadraticCurveTo(x - 7, y + 2, x, y - 7);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 6);
    ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x + 6, y - 1);
    ctx.lineTo(x + 7, y - 7);
    ctx.lineTo(x + 1, y - 6);
    ctx.lineTo(x + 4, y - 4);
    ctx.lineTo(x - 7, y + 5);
    ctx.fill();
  }
}

export class BadgesScene implements Scene {
  readonly opaque = true;

  constructor(private readonly game: Game) {}

  update(): void {
    if (this.game.input.pressed('a') || this.game.input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    text(ctx, 'INSIGNES DES MAÎTRES DE PISTE', 10, 6, { size: 11, bold: true, color: PAL.cream, shadow: PAL.ink });
    BADGE_ORDER.forEach((id, i) => {
      const badge = BADGES[id];
      const owned = this.game.s.badges.includes(id);
      const y = 24 + i * 70;
      box(ctx, 6, y, 308, 66);
      drawBadge(ctx, id, 32, y + 33, owned);
      text(ctx, owned ? badge.name : '???', 58, y + 8, { size: 10, bold: true });
      text(ctx, badge.arena, 58, y + 21, { size: 8, color: PAL.rust });
      if (owned) {
        wrap(ctx, badge.description, 246, 8)
          .slice(0, 3)
          .forEach((row, r) => text(ctx, row, 58, y + 34 + r * 10, { size: 8 }));
      } else {
        text(ctx, 'Battez le Maître de Piste de cette Arène pour l’obtenir.', 58, y + 36, { size: 8, color: PAL.grey });
      }
    });
  }
}
