// Menu principal d'exploration, options et insignes.
import { SPECIES } from '../../data/ginedex';
import { BADGES, BADGE_ORDER, type BadgeId } from '../../data/trainers';
import { formatClock, phaseOf } from '../../engine/clock';
import { formatPlayTime } from '../../engine/gameState';
import { PAL, box, fillEllipse, menuList, shade, stamp, text } from '../draw';
import { wrapText } from '../font';
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
    box(ctx, 2, 2, 124, 78);
    text(ctx, s.playerName, 10, 5, { shadow: PAL.shadow });
    text(ctx, `Cauris : ${s.cauris}`, 10, 18);
    text(ctx, `Insignes : ${s.badges.length}/3`, 10, 29);
    text(ctx, `Ginédex : ${s.dex.caught.length}/${SPECIES.length}`, 10, 40);
    // Heure du monde, avec un soleil ou une lune.
    const phase = phaseOf(s.clock.minute);
    const night = phase === 'nuit';
    stamp(ctx, night ? ['.ww.', 'ww..', 'ww..', '.ww.'] : ['.yy.', 'yyyy', 'yyyy', '.yy.'], 10, 54, { w: '#e8e4c0', y: '#f0b030' });
    text(ctx, `Jour ${s.clock.day} · ${formatClock(s.clock)}`, 18, 51, { color: night ? PAL.indigo : PAL.ink });
    text(ctx, `Temps : ${formatPlayTime(s.playTimeMs)}`, 10, 63, { color: PAL.grey });
    box(ctx, 150, 2, 104, OPTIONS.length * 12 + 12);
    menuList(ctx, OPTIONS, 156, 7, this.index);
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
    box(ctx, 24, 56, 208, 66);
    text(ctx, 'OPTIONS', 128, 60, { align: 'center', color: PAL.rust });
    menuList(ctx, [`Texte : ◄ ${speed} ►`, `Sons : ◄ ${o.sound ? 'Activés' : 'Coupés'} ►`, 'Retour'], 34, 76, this.index, { lineHeight: 13 });
  }
}

/** Emblème de chaque insigne en pixel art. */
export function drawBadge(ctx: CanvasRenderingContext2D, id: BadgeId, x: number, y: number, owned: boolean): void {
  const color = owned ? BADGES[id].color : '#6a5a4a';
  fillEllipse(ctx, x, y, 13, 13, PAL.ink);
  fillEllipse(ctx, x, y, 12, 12, owned ? '#f0c040' : '#8a7a68');
  fillEllipse(ctx, x - 1, y - 1, 11, 11, owned ? '#fce090' : '#9a8a78');
  fillEllipse(ctx, x, y, 9, 9, color);
  fillEllipse(ctx, x - 2, y - 2, 4, 4, shade(color, 0.25));
  const mark = owned ? '#fff8e8' : '#4a3a2e';
  const glyph: Record<BadgeId, string[]> = {
    enclume: ['#########', '#########', '..#####..', '...###...', '..#####..', '.#######.'],
    pluie: ['....#....', '...###...', '..#####..', '.#######.', '.#######.', '..#####..', '...###...'],
    traqueur: ['.......##', '......###', '.....##..', '....##...', '.#.##....', '..##.....', '.#..#....', '#........'],
  };
  const rows = glyph[id];
  stamp(ctx, rows, x - Math.floor(rows[0].length / 2), y - Math.floor(rows.length / 2), { '#': mark });
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
    text(ctx, 'INSIGNES DES MAÎTRES DE PISTE', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    BADGE_ORDER.forEach((id, i) => {
      const badge = BADGES[id];
      const owned = this.game.s.badges.includes(id);
      const y = 15 + i * 59;
      box(ctx, 2, y, 252, 57);
      drawBadge(ctx, id, 22, y + 28, owned);
      text(ctx, owned ? badge.name : '???', 42, y + 4, { shadow: PAL.shadow });
      text(ctx, badge.arena, 42, y + 15, { color: PAL.rust });
      const body = owned ? badge.description : 'Battez le Maître de Piste de cette Arène.';
      wrapText(body, 204)
        .slice(0, 3)
        .forEach((row, r) => text(ctx, row, 42, y + 27 + r * 9, { color: owned ? PAL.ink : PAL.grey }));
    });
  }
}
