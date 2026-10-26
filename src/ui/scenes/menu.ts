// Menu principal d'exploration, options et insignes.
import { SPECIES } from '../../data/ginedex';
import { BADGES, BADGE_ORDER, type BadgeId } from '../../data/trainers';
import { formatClock, phaseOf } from '../../engine/clock';
import { formatPlayTime } from '../../engine/gameState';
import { currentObjective } from '../../engine/objective';
import { PAL, box, fillEllipse, menuList, shade, stamp, text } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { menuBackground } from '../widgets';
import { BagScene } from './bag';
import { DexScene } from './dex';
import { FlyScene, flyer } from './fly';
import { WorldMapScene } from './plan';
import { TeamScene } from './team';

const OPTIONS = ['GINÉDEX', 'ÉQUIPE', 'SAC', 'CARTE', 'VOLER', 'INSIGNES', 'SAUVEGARDER', 'OPTIONS', 'RETOUR'];
/** « VOLER » n'apparaît que si un Jinémon Vol peut porter le joueur ; avant le premier Jinémon, pas d'équipe ni de Ginédex. */
const optionsFor = (game: Game) => {
  const s = game.s;
  return OPTIONS.filter((o) => {
    if (o === 'VOLER') return !!flyer(s);
    if (o === 'ÉQUIPE') return s.party.length > 0;
    if (o === 'GINÉDEX') return s.party.length > 0 || !!s.flags.starter;
    return true;
  });
};

export class MenuScene implements Scene {
  private index = 0;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    const options = optionsFor(this.game);
    this.index = Math.min(this.index, options.length - 1);
    if (input.pressed('up')) {
      this.index = (this.index + options.length - 1) % options.length;
      this.game.sfx('curseur');
    }
    if (input.pressed('down')) {
      this.index = (this.index + 1) % options.length;
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
    switch (options[this.index]) {
      case 'VOLER':
        game.scenes.push(new FlyScene(game, () => game.scenes.pop(this)));
        break;
      case 'GINÉDEX':
        game.scenes.push(new DexScene(game));
        break;
      case 'ÉQUIPE':
        game.scenes.push(new TeamScene(game, 'consulter'));
        break;
      case 'SAC':
        game.scenes.push(new BagScene(game, 'consulter'));
        break;
      case 'CARTE':
        game.scenes.push(new WorldMapScene(game));
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
    text(ctx, `Insignes : ${s.badges.length}/8`, 10, 29);
    text(ctx, `Ginédex : ${s.dex.caught.length}/${SPECIES.length}`, 10, 40);
    // Heure du monde, avec un soleil ou une lune.
    const phase = phaseOf(s.clock.minute);
    const night = phase === 'nuit';
    stamp(ctx, night ? ['.ww.', 'ww..', 'ww..', '.ww.'] : ['.yy.', 'yyyy', 'yyyy', '.yy.'], 10, 54, { w: '#e8e4c0', y: '#f0b030' });
    text(ctx, `Jour ${s.clock.day} · ${formatClock(s.clock)}`, 18, 51, { color: night ? PAL.indigo : PAL.ink });
    text(ctx, `Temps : ${formatPlayTime(s.playTimeMs)}`, 10, 63, { color: PAL.grey });
    const options = optionsFor(this.game);
    box(ctx, 150, 2, 104, options.length * 12 + 12);
    menuList(ctx, options, 156, 7, this.index);
    // Objectif du moment, toujours sous les yeux.
    const rows = wrapText(currentObjective(s).text, 128).slice(0, 7);
    const top = 84;
    box(ctx, 2, top, 144, rows.length * 10 + 20);
    stamp(ctx, ['...k...', '..kyk..', 'kkkyykk', 'kyyyyyk', '.kyyyk.', '.kykyk.', 'kk...kk'], 9, top + 5, { k: PAL.ink, y: '#f0c040' });
    text(ctx, 'OBJECTIF', 19, top + 4, { color: PAL.rust });
    rows.forEach((row, i) => text(ctx, row, 9, top + 16 + i * 10));
  }
}

export class OptionsScene implements Scene {
  private index = 0;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    const options = this.game.s.options;
    if (input.pressed('up') || input.pressed('down')) {
      this.index = (this.index + (input.pressed('up') ? 3 : 1)) % 4;
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
    if ((delta || input.pressed('a')) && this.index === 2) {
      options.music = !options.music;
      this.game.audio.music.enabled = options.music;
      this.game.sfx('valider');
    }
    if (input.pressed('b') || (input.pressed('a') && this.index === 3)) {
      this.game.sfx('retour');
      this.game.save(true);
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const o = this.game.s.options;
    const speed = { lent: 'Lente', normal: 'Normale', rapide: 'Rapide' }[o.textSpeed];
    box(ctx, 24, 50, 208, 79);
    text(ctx, 'OPTIONS', 128, 54, { align: 'center', color: PAL.rust });
    menuList(ctx, [`Texte : ◄ ${speed} ►`, `Sons : ◄ ${o.sound ? 'Activés' : 'Coupés'} ►`, `Musique : ◄ ${o.music ? 'Activée' : 'Coupée'} ►`, 'Retour'], 34, 70, this.index, { lineHeight: 13 });
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
    mirage: ['...###...', '..#####..', '...###...', '.........', '..##..##.', '.####.###', '#########'],
    pierre: ['.#.#.#.#.', '.#.#.#.#.', '.#######.', '#########', '.#######.', '..#####..'],
    dragon: ['..####...', '.##..##..', '.##......', '..####...', '.....##..', '.##..##..', '..####...'],
    vent: ['.###.....', '#...#....', '....#.##.', '.###.#..#', '.....#..#', '..##..##.'],
    masque: ['#.......#', '##.....##', '.###.###.', '...###...', '..#####..', '..#.#.#..', '..#####..', '...###...'],
  };
  const rows = glyph[id];
  stamp(ctx, rows, x - Math.floor(rows[0].length / 2), y - Math.floor(rows.length / 2), { '#': mark });
}

export class BadgesScene implements Scene {
  readonly opaque = true;
  private index = 0;

  constructor(private readonly game: Game) {}

  update(): void {
    const input = this.game.input;
    const before = this.index;
    if (input.pressed('left')) this.index = (this.index + 7) % 8;
    if (input.pressed('right')) this.index = (this.index + 1) % 8;
    if (input.pressed('up') || input.pressed('down')) this.index = (this.index + 4) % 8;
    if (before !== this.index) this.game.sfx('curseur');
    if (input.pressed('a') || input.pressed('b')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackground(ctx, W, H);
    const owned = this.game.s.badges;
    text(ctx, 'INSIGNES DES MAÎTRES DE PISTE', 6, 2, { color: PAL.cream, shadow: PAL.ink });
    text(ctx, `${owned.length}/8`, 250, 2, { align: 'right', color: PAL.cream, shadow: PAL.ink });
    BADGE_ORDER.forEach((id, i) => {
      const x = 4 + (i % 4) * 62;
      const y = 15 + Math.floor(i / 4) * 52;
      box(ctx, x, y, 60, 50, i === this.index ? 'actif' : 'papier');
      drawBadge(ctx, id, x + 30, y + 21, owned.includes(id));
      text(ctx, `${i + 1}`, x + 6, y + 37, { color: i === this.index ? PAL.rust : PAL.grey });
    });
    const id = BADGE_ORDER[this.index];
    const badge = BADGES[id];
    const has = owned.includes(id);
    box(ctx, 2, 120, 252, 70);
    text(ctx, has ? badge.name : '???', 10, 124, { shadow: PAL.shadow });
    text(ctx, badge.arena, 10, 136, { color: PAL.rust });
    wrapText(has ? badge.description : 'Battez le Maître de Piste de cette Arène.', 236)
      .slice(0, 3)
      .forEach((row, r) => text(ctx, row, 10, 149 + r * 12, { color: has ? PAL.ink : PAL.grey }));
  }
}
