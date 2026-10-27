// Terreurs nocturnes sur la carte (voir data/nightMobs.ts). Le fauve rôde, flaire et charge ;
// l'oiseau tournoie (on ne voit que son ombre) et tombe du ciel ; le faux villageois attend,
// lanterne à la main ; l'araignée guette sur les toits et saute ; le pendu se laisse tomber
// des arbres ; le ver nage sous la terre vers vos pas ; la clochette attire avec sa lueur.
// Et des villageois attardés traversent la carte en hurlant, une bête sur les talons.
import type { MobDef } from '../data/nightMobs';
import type { CharacterLook } from '../data/trainers';
import { DIR_DELTA, SOLID_TILES, type Dir } from '../data/zones';
import type { Rng } from '../engine/rng';
import type { NightSound } from './audio';
import { PAL, box, text } from './draw';
import { textWidth } from './font';
import type { Light } from './night';
import { characterSprite, drawCreature } from './sprites';
import { TILE } from './tiles';

export interface MobHost {
  readonly rng: Rng;
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** Case et regard du joueur (case d'arrivée s'il marche). */
  player(): { x: number; y: number; dir: Dir };
  /** Secondes depuis le dernier pas du joueur (0 tant qu'il marche). */
  still(): number;
  /** Case de la carte ('' au-dehors). */
  tile(x: number, y: number): string;
  /** Case où une créature peut poser la patte (ni décor, ni PNJ, ni joueur, ni autre créature). */
  walkable(x: number, y: number): boolean;
  /** Bruit qui vient de cette case de la carte. */
  sound(kind: NightSound, x: number, y: number): void;
  /** La créature attrape le joueur. */
  caught(mob: NightMob): void;
}

type Phase =
  | 'rode'
  | 'chasse'
  | 'poursuite'
  | 'deguise'
  | 'revelation'
  | 'cercle'
  | 'vise'
  | 'pique'
  | 'pose'
  | 'envol'
  // Araignée des toits : postée, elle se tapit, bondit, saute de toit en toit, remonte.
  | 'perche'
  | 'tapi'
  | 'bond'
  | 'saut'
  | 'retraite'
  | 'remonte'
  // Pendu : accroché dans l'arbre, puis lâche prise.
  | 'pendu'
  | 'lache'
  // Ver : sous la terre, il jaillit, ou replonge.
  | 'sousTerre'
  | 'jaillit'
  | 'replonge'
  // Clochette : la lueur, l'éclosion de la bouche, la ruée, le repli.
  | 'leurre'
  | 'eclot'
  | 'ruee'
  | 'repli'
  | 'attaque';

const manhattan = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

/** Une case de sol libre de décor (les PNJ et créatures mis à part). */
function open(host: MobHost, x: number, y: number): boolean {
  const c = host.tile(x, y);
  return c !== '' && !SOLID_TILES.has(c);
}

/** Toits (cases rondes, maisons) et arbres : là où l'araignée se poste, à deux pas d'un sol où sauter. */
export function isPerch(host: MobHost, x: number, y: number): boolean {
  const c = host.tile(x, y);
  if (c !== 'R' && c !== 'T' && c !== 'B' && c !== '@') return false;
  // D'une maison, seul le toit : pas la façade (sa rangée du bas).
  if (c === '@' && host.tile(x, y + 1) !== '@') return false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && open(host, x + dx, y + dy)) return true;
  return false;
}

/** Un arbre dont la ramure surplombe une case de passage : le pendu s'y accroche. */
export function isHangTree(host: MobHost, x: number, y: number): boolean {
  const c = host.tile(x, y);
  return (c === 'T' || c === 'B') && open(host, x, y + 1);
}

/** Les cases de la carte où cette Terreur peut s'installer (toits, arbres) ; null : n'importe quel sol. */
export function lairsOf(kind: MobDef['kind'], host: MobHost): Array<[number, number]> | null {
  const accept = kind === 'guetteur' ? isPerch : kind === 'pendu' ? isHangTree : null;
  if (!accept) return null;
  const spots: Array<[number, number]> = [];
  for (let y = 0; y < host.mapHeight; y++) for (let x = 0; x < host.mapWidth; x++) if (accept(host, x, y)) spots.push([x, y]);
  return spots;
}

/** Plus court chemin (parcours en largeur) ; l'arrivée est acceptée même si elle n'est pas praticable. */
export function findPath(
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  passable: (x: number, y: number) => boolean,
  width: number,
  height: number,
): Array<[number, number]> | null {
  const key = (x: number, y: number) => y * width + x;
  const prev = new Map<number, number>([[key(sx, sy), -1]]);
  const queue: Array<[number, number]> = [[sx, sy]];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    if (x === gx && y === gy) {
      const path: Array<[number, number]> = [];
      for (let k = key(x, y); k >= 0; k = prev.get(k)!) path.unshift([k % width, Math.floor(k / width)]);
      return path;
    }
    for (const { dx, dy } of Object.values(DIR_DELTA)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || prev.has(key(nx, ny))) continue;
      if (!(nx === gx && ny === gy) && !passable(nx, ny)) continue;
      prev.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  return null;
}

/** Bulle de paroles au-dessus d'un personnage (x, y : sommet de sa tête, à l'écran). */
function bubble(ctx: CanvasRenderingContext2D, words: string, x: number, y: number, color: string = PAL.ink): void {
  const w = textWidth(words) + 10;
  const left = Math.round(Math.max(2, Math.min(254 - w, x - w / 2)));
  box(ctx, left, y - 16, w, 15);
  text(ctx, words, left + 5, y - 14, { color });
}

/** Trait d'un pixel d'épaisseur. */
function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}

/** Saut en cloche d'une case à une autre. */
interface Arc {
  fx: number;
  fy: number;
  t: number;
  dur: number;
  h: number;
}

export class NightMob {
  x: number;
  y: number;
  private fromX: number;
  private fromY: number;
  private moveT = 1;
  private stepTime = 0.4;
  facing: Dir = 'bas';
  phase: Phase;
  private phaseT = 0;
  private timer = 0;
  private lost = 0;
  private noise: number;
  private steps = 0;
  /** « ! » quand il vous repère. */
  private alert = 0;
  private words = '';
  private wordsT = 0;
  // Volant : position de son ombre (en cases, non arrondie), altitude (px) et cap.
  private fx: number;
  private fy: number;
  alt = 0;
  private angle: number;
  private cx: number;
  private cy: number;
  private tx = 0;
  private ty = 0;
  /** Chemin suivi pendant une poursuite (derrière un villageois). */
  private path: Array<[number, number]> = [];
  private pathIndex = 0;
  /** Saut en cours (araignée, pendu qui regagne son arbre). */
  private arc: Arc | null = null;
  /** Ver : il a senti vos pas. Pendu : il descend peu à peu quand vous approchez. */
  private tracking = false;
  private lower = 0;
  /** Secondes passées loin du joueur (l'araignée et le pendu changent alors de cachette). */
  private far = 0;

  constructor(
    readonly def: MobDef,
    private readonly host: MobHost,
    x: number,
    y: number,
  ) {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.fx = this.cx = x;
    this.fy = this.cy = y;
    this.angle = host.rng.next() * Math.PI * 2;
    this.noise = 2 + host.rng.next() * 5;
    const start: Record<MobDef['kind'], Phase> = {
      rodeur: 'rode',
      volant: 'cercle',
      imposteur: 'deguise',
      guetteur: isPerch(host, x, y) ? 'perche' : 'rode',
      pendu: isHangTree(host, x, y) ? 'pendu' : 'rode',
      fouisseur: 'sousTerre',
      leurre: 'leurre',
    };
    this.phase = start[def.kind];
    if (def.kind === 'volant') this.alt = 46;
  }

  /** Lancé sur les talons d'un villageois, le long de son chemin. */
  follow(path: Array<[number, number]>): void {
    this.path = path;
    this.pathIndex = 0;
    this.phase = 'poursuite';
  }

  distance(): number {
    const p = this.host.player();
    return manhattan(this.x, this.y, p.x, p.y);
  }

  /** Pendu : distance entre le joueur et la case sous ses branches. */
  private below(): number {
    const p = this.host.player();
    return manhattan(this.x, this.y + 1, p.x, p.y);
  }

  /** Posée au sol, à portée de patte (pas en l'air, ni sur un toit, ni sous la terre). */
  private grounded(): boolean {
    switch (this.phase) {
      case 'cercle':
      case 'vise':
      case 'pique':
      case 'envol':
      case 'perche':
      case 'tapi':
      case 'bond':
      case 'saut':
      case 'remonte':
      case 'pendu':
      case 'lache':
      case 'sousTerre':
      case 'replonge':
      case 'repli':
        return false;
      default:
        return true;
    }
  }

  /** La créature occupe-t-elle cette case au sol ? */
  occupies(x: number, y: number): boolean {
    return this.grounded() && this.x === x && this.y === y;
  }

  /** Vrai tant qu'elle fond sur le joueur (pour faire taire la musique et battre le cœur). */
  hunting(): boolean {
    switch (this.phase) {
      case 'chasse':
      case 'revelation':
      case 'vise':
      case 'pique':
      case 'tapi':
      case 'bond':
      case 'lache':
      case 'jaillit':
      case 'eclot':
      case 'ruee':
        return true;
      case 'poursuite':
        return this.distance() <= 8;
      case 'perche':
        return this.distance() <= 4;
      case 'pendu':
        return this.below() <= 3;
      case 'sousTerre':
        return this.tracking && this.distance() <= 7;
      default:
        return false;
    }
  }

  /** Le sol tremble au-dessus du ver qui approche (0 à 1). */
  tremor(): number {
    if (this.phase === 'jaillit') return 1;
    if (this.phase !== 'sousTerre' || !this.tracking) return 0;
    return Math.max(0, 1 - this.distance() / 7) * 0.6;
  }

  disguised(): boolean {
    return this.phase === 'deguise' || (this.phase === 'revelation' && this.phaseT < 0.5);
  }

  /** On lui parle : il se retourne. */
  talkedTo(): void {
    if (this.phase === 'deguise') this.reveal();
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseT = 0;
    this.timer = 0;
  }

  private say(words: string, duration = 1.6): void {
    this.words = words;
    this.wordsT = duration;
  }

  private moveTo(x: number, y: number, duration: number): void {
    if (x === this.x && y === this.y) return;
    this.fromX = this.x;
    this.fromY = this.y;
    this.facing = x > this.x ? 'droite' : x < this.x ? 'gauche' : y > this.y ? 'bas' : 'haut';
    this.x = x;
    this.y = y;
    this.moveT = 0;
    this.stepTime = duration;
    this.steps++;
  }

  /** Saute (en cloche) jusqu'à cette case. */
  private leap(x: number, y: number, dur: number, h: number): void {
    this.arc = { fx: this.x, fy: this.y, t: 0, dur, h };
    this.facing = x > this.x ? 'droite' : x < this.x ? 'gauche' : this.facing;
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.moveT = 1;
  }

  private stepToward(tx: number, ty: number, duration: number): void {
    const path = findPath(this.x, this.y, tx, ty, (x, y) => this.host.walkable(x, y), this.host.mapWidth, this.host.mapHeight);
    const next = path?.[1];
    if (next && this.host.walkable(next[0], next[1])) this.moveTo(next[0], next[1], duration);
  }

  private wander(duration: number): void {
    const options = Object.values(DIR_DELTA)
      .map(({ dx, dy }): [number, number] => [this.x + dx, this.y + dy])
      .filter(([x, y]) => this.host.walkable(x, y));
    if (options.length) this.moveTo(...options[Math.floor(this.host.rng.next() * options.length)], duration);
  }

  private strike(): void {
    this.phase = 'attaque';
    this.arc = null;
    const cries: Partial<Record<MobDef['kind'], NightSound>> = { volant: 'cri', guetteur: 'cliquetis', leurre: 'rire', fouisseur: 'grondement' };
    this.host.sound(cries[this.def.kind] ?? 'grognement', this.x, this.y);
    this.host.caught(this);
  }

  private reveal(): void {
    this.phase = 'revelation';
    this.phaseT = 0;
    this.host.sound('rire', this.x, this.y);
  }

  private hear(dt: number, sounds: NightSound[], every: number): void {
    this.noise -= dt;
    if (this.noise > 0 || this.distance() > 18) return;
    this.noise = every * (0.7 + this.host.rng.next() * 0.6);
    this.host.sound(sounds[Math.floor(this.host.rng.next() * sounds.length)], this.x, this.y);
  }

  /**
   * Une autre cachette (toit ou arbre) à bonne distance du joueur, de préférence devant lui :
   * c'est là qu'il passera.
   */
  private hideout(accept: (x: number, y: number) => boolean, minD: number, maxD: number): [number, number] | null {
    const p = this.host.player();
    const { dx, dy } = DIR_DELTA[p.dir];
    let best: [number, number] | null = null;
    let bestScore = -Infinity;
    for (let y = Math.max(0, p.y - maxD); y <= Math.min(this.host.mapHeight - 1, p.y + maxD); y++) {
      for (let x = Math.max(0, p.x - maxD); x <= Math.min(this.host.mapWidth - 1, p.x + maxD); x++) {
        const d = manhattan(x, y, p.x, p.y);
        if (d < minD || d > maxD || (x === this.x && y === this.y) || !accept(x, y)) continue;
        const ahead = (x - p.x) * dx + (y - p.y) * dy;
        const score = ahead + this.host.rng.next() * 3;
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    return best;
  }

  update(dt: number): void {
    if (this.phase === 'attaque') return;
    this.moveT = Math.min(1, this.moveT + dt / this.stepTime);
    this.timer += dt;
    this.phaseT += dt;
    this.alert = Math.max(0, this.alert - dt);
    this.wordsT = Math.max(0, this.wordsT - dt);
    if (this.arc) {
      this.arc.t += dt;
      if (this.arc.t < this.arc.dur) return;
      this.arc = null;
      this.landed();
      return;
    }
    switch (this.phase) {
      case 'rode':
      case 'chasse':
      case 'poursuite':
      case 'retraite':
        this.updateMarcheur(dt);
        return;
      case 'deguise':
      case 'revelation':
        this.updateImposteur();
        return;
      case 'perche':
      case 'tapi':
        this.updateGuetteur(dt);
        return;
      case 'pendu':
        this.updatePendu(dt);
        return;
      case 'sousTerre':
      case 'jaillit':
      case 'replonge':
        this.updateFouisseur(dt);
        return;
      case 'leurre':
      case 'eclot':
      case 'ruee':
      case 'repli':
        this.updateLeurre(dt);
        return;
      default:
        this.updateVolant(dt);
    }
  }

  /** Fin d'un saut : sur le joueur, sur un toit, ou à côté (raté). */
  private landed(): void {
    switch (this.phase) {
      case 'bond':
      case 'lache':
        if (this.distance() <= 1) {
          this.strike();
          return;
        }
        // Raté : le pendu regrimpe aussitôt dans un arbre ; l'araignée détale après vous.
        this.host.sound('pas', this.x, this.y);
        if (this.def.kind === 'pendu' && this.retreat()) {
          this.phase = 'remonte';
          this.leap(this.tx, this.ty, 0.5 + manhattan(this.x, this.y, this.tx, this.ty) * 0.04, 18);
          this.host.sound('bruissement', this.x, this.y);
          return;
        }
        this.enter('chasse');
        this.alert = 1;
        return;
      case 'saut':
        this.enter('perche');
        return;
      case 'remonte':
        this.lower = 0;
        this.enter(this.def.kind === 'pendu' ? 'pendu' : 'perche');
        return;
      default:
        return;
    }
  }

  /** L'araignée ou le pendu, retombés au sol, filent vers le toit ou l'arbre le plus proche. */
  private retreat(): boolean {
    const accept = this.def.kind === 'pendu' ? isHangTree : this.def.kind === 'guetteur' ? isPerch : null;
    if (!accept) return false;
    let best: [number, number] | null = null;
    for (let y = this.y - 15; y <= this.y + 15; y++) {
      for (let x = this.x - 15; x <= this.x + 15; x++) {
        const d = manhattan(x, y, this.x, this.y);
        if (d > 15 || !accept(this.host, x, y)) continue;
        if (!best || d < manhattan(best[0], best[1], this.x, this.y)) best = [x, y];
      }
    }
    if (!best) return false;
    [this.tx, this.ty] = best;
    this.enter('retraite');
    return true;
  }

  // Rôdeur (et imposteur démasqué, araignée ou pendu retombés) : il flaire, s'approche, puis fonce.
  private updateMarcheur(dt: number): void {
    const p = this.host.player();
    const d = this.distance();
    if (this.moveT >= 1 && d <= 1 && this.phase !== 'rode') {
      this.strike();
      return;
    }
    if (this.phase === 'poursuite') {
      // Tout près du joueur, il lâche le villageois pour une proie plus proche.
      if (d <= 2) {
        this.phase = 'chasse';
        this.alert = 1;
        this.host.sound('grognement', this.x, this.y);
        return;
      }
      this.hear(dt, ['grognement', 'cri'], 2.5);
      if (this.timer < 0.17 || this.moveT < 1) return;
      this.timer = 0;
      const next = this.path[this.pathIndex + 1];
      if (!next) {
        // Le villageois lui a échappé : il se tourne vers vous.
        this.phase = 'chasse';
        this.alert = 1;
        this.host.sound('hurlement', this.x, this.y);
        return;
      }
      if (next[0] === p.x && next[1] === p.y) return;
      this.pathIndex++;
      this.moveTo(next[0], next[1], 0.15);
      return;
    }
    if (this.phase === 'retraite') {
      // Au pied du toit (ou de l'arbre), elle y remonte d'un bond.
      if (this.moveT < 1 || this.timer < 0.17) return;
      this.timer = 0;
      if (manhattan(this.x, this.y, this.tx, this.ty) <= 2) {
        this.phase = 'remonte';
        this.leap(this.tx, this.ty, 0.55, 16);
        this.host.sound(this.def.kind === 'pendu' ? 'bruissement' : 'cliquetis', this.x, this.y);
        return;
      }
      const before = this.steps;
      this.stepToward(this.tx, this.ty, 0.17);
      // Chemin barré : elle reprend la chasse.
      if (this.steps === before) this.enter('chasse');
      return;
    }
    if (this.phase === 'rode') {
      if (d <= 6) {
        this.phase = 'chasse';
        this.alert = 1.1;
        this.host.sound('grognement', this.x, this.y);
        return;
      }
      this.hear(dt, ['grognement', 'hurlement'], 9);
      if (this.timer < 1.1 || this.moveT < 1) return;
      this.timer = 0;
      // Il vous flaire : le plus souvent, il fait un pas vers vous.
      if (this.host.rng.next() < 0.65) this.stepToward(p.x, p.y, 0.5);
      else this.wander(0.5);
      if (this.steps % 3 === 0) this.host.sound('pas', this.x, this.y);
      return;
    }
    // Retombés au sol, l'araignée et le pendu ne s'éloignent pas longtemps de leurs hauteurs.
    if ((this.def.kind === 'guetteur' || this.def.kind === 'pendu') && this.moveT >= 1 && (this.phaseT > 5 || d > 8) && this.retreat()) return;
    // Chasse : il fonce, un peu moins vite que vous ne courez.
    if (d > 11) {
      this.lost += dt;
      if (this.lost > 4) {
        this.phase = 'rode';
        this.lost = 0;
        return;
      }
    } else {
      this.lost = 0;
    }
    const fast = this.def.kind === 'imposteur' || this.def.kind === 'guetteur';
    this.hear(dt, this.def.kind === 'guetteur' ? ['cliquetis'] : fast ? ['cri', 'rire'] : ['grognement'], 3.5);
    if (this.timer < (fast ? 0.2 : 0.24) || this.moveT < 1) return;
    this.timer = 0;
    this.stepToward(p.x, p.y, fast ? 0.17 : 0.2);
    if (this.steps % 2 === 0) this.host.sound('pas', this.x, this.y);
  }

  // Imposteur : un villageois attardé, lanterne à la main… qui se retourne quand on approche.
  private updateImposteur(): void {
    const p = this.host.player();
    const d = this.distance();
    if (this.phase === 'revelation') {
      this.facing = p.x < this.x ? 'gauche' : p.x > this.x ? 'droite' : p.y < this.y ? 'haut' : 'bas';
      if (this.phaseT > 0.9) {
        this.phase = 'chasse';
        this.phaseT = 0;
        this.timer = 1;
        this.alert = 1;
        this.host.sound('cri', this.x, this.y);
      }
      return;
    }
    if (d <= 2) {
      this.reveal();
      return;
    }
    // Il appelle à l'aide pour qu'on s'approche.
    if (d <= 6 && this.wordsT <= 0 && this.timer > 3) {
      this.timer = 0;
      const lures = ['Hé… par ici…', 'Tu peux m’aider ?', 'Je me suis perdu…', 'Approche… n’aie pas peur…'];
      this.say(lures[Math.floor(this.host.rng.next() * lures.length)], 2);
    }
    if (d > 6 && this.timer > 3.5 && this.moveT >= 1) {
      this.timer = 0;
      this.wander(0.6);
    }
    if (d <= 8 && this.moveT >= 1) this.facing = p.x < this.x ? 'gauche' : p.x > this.x ? 'droite' : p.y < this.y ? 'haut' : 'bas';
  }

  // Araignée des toits : elle vous suit des yeux, se rapproche de toit en toit, se tapit… et saute.
  private updateGuetteur(dt: number): void {
    const p = this.host.player();
    const d = this.distance();
    if (this.phase === 'tapi') {
      // Un battement de cœur pour réagir : elle se ramasse, puis bondit là où vous êtes.
      if (this.phaseT > 0.55) {
        this.phase = 'bond';
        this.phaseT = 0;
        this.leap(p.x, p.y, 0.4, 14);
        this.host.sound('chute', this.x, this.y);
      }
      return;
    }
    if (d <= 2) {
      this.enter('tapi');
      this.alert = 1;
      this.host.sound('cliquetis', this.x, this.y);
      return;
    }
    this.hear(dt, ['cliquetis'], 7);
    if (d > 13) {
      // Trop loin : elle file se poster plus loin sur votre chemin.
      this.far += dt;
      if (this.far > 18) {
        this.far = 0;
        const spot = this.hideout((x, y) => isPerch(this.host, x, y), 7, 11);
        if (spot) {
          this.phase = 'saut';
          this.leap(spot[0], spot[1], 0.01, 0);
          this.host.sound('cliquetis', spot[0], spot[1]);
        }
      }
      return;
    }
    this.far = 0;
    if (this.timer < (d <= 7 ? 1.6 : 2.6)) return;
    this.timer = this.host.rng.next() * 0.8;
    // D'un toit à l'autre, toujours plus près (sans se poser juste à côté : elle attend qu'on vienne).
    let best: [number, number] | null = null;
    for (let y = this.y - 5; y <= this.y + 5; y++) {
      for (let x = this.x - 5; x <= this.x + 5; x++) {
        const hop = manhattan(x, y, this.x, this.y);
        const left = manhattan(x, y, p.x, p.y);
        if (hop === 0 || hop > 5 || left < 3 || left >= d || !isPerch(this.host, x, y)) continue;
        if (!best || left < manhattan(best[0], best[1], p.x, p.y)) best = [x, y];
      }
    }
    if (!best) return;
    this.phase = 'saut';
    this.leap(best[0], best[1], 0.45, 9);
    this.host.sound('cliquetis', this.x, this.y);
  }

  // Pendu : tête en bas dans l'arbre ; il descend peu à peu quand on approche, et lâche prise quand on passe dessous.
  private updatePendu(dt: number): void {
    const below = this.below();
    this.lower = Math.max(0, Math.min(1, (4 - below) / 3));
    if (below <= 1) {
      this.phase = 'lache';
      this.phaseT = 0;
      this.host.sound('bruissement', this.x, this.y);
      const p = this.host.player();
      this.leap(p.x, p.y, 0.28, 3);
      return;
    }
    if (below <= 3 && this.timer > 2.5) {
      this.timer = 0;
      this.host.sound('rire', this.x, this.y);
    }
    if (this.distance() > 12) {
      // Personne ne passe par ici : il change d'arbre, un peu plus loin sur votre route.
      this.far += dt;
      if (this.far > 14) {
        this.far = 0;
        const spot = this.hideout((x, y) => isHangTree(this.host, x, y), 5, 10);
        if (spot) {
          this.x = this.fromX = spot[0];
          this.y = this.fromY = spot[1];
          this.host.sound('bruissement', spot[0], spot[1]);
        }
      }
    } else {
      this.far = 0;
    }
  }

  // Ver : il nage sous la terre vers vos pas. Immobile, vous disparaissez pour lui ; en marchant sur lui, il jaillit.
  private updateFouisseur(dt: number): void {
    const p = this.host.player();
    const d = this.distance();
    const still = this.host.still();
    if (this.phase === 'jaillit') {
      if (this.phaseT < 0.45) return;
      // Il a jailli : s'il vous a manqué (vous couriez), il replonge.
      if (d <= 1) {
        this.strike();
        return;
      }
      this.enter('replonge');
      return;
    }
    if (this.phase === 'replonge') {
      if (this.phaseT > 0.6) this.enter('sousTerre');
      return;
    }
    if (still > 1.2) {
      // Vous ne bougez plus : il ne vous sent plus, et tourne au hasard.
      if (this.tracking) {
        this.tracking = false;
        this.timer = 0;
      }
      if (this.timer > 1.3 && this.moveT >= 1) {
        this.timer = 0;
        this.wander(0.9);
      }
      return;
    }
    if (d <= 1 && this.moveT >= 1 && still < 0.5) {
      this.enter('jaillit');
      this.alert = 1;
      this.host.sound('grondement', this.x, this.y);
      this.host.sound('cri', this.x, this.y);
      return;
    }
    if (d <= 12) this.tracking = true;
    if (this.tracking) {
      this.hear(dt, ['grondement'], 1.6);
      if (this.timer < 0.38 || this.moveT < 1 || d <= 1) return;
      this.timer = 0;
      this.stepToward(p.x, p.y, 0.38);
      return;
    }
    if (this.timer > 1.5 && this.moveT >= 1) {
      this.timer = 0;
      this.wander(0.9);
    }
  }

  // Clochette : une lueur qui danse et s'approche doucement ; tout près, la bouche s'ouvre et elle se rue.
  private updateLeurre(dt: number): void {
    const p = this.host.player();
    const d = this.distance();
    switch (this.phase) {
      case 'leurre':
        if (d <= 3) {
          this.enter('eclot');
          this.alert = 1;
          this.host.sound('rire', this.x, this.y);
          return;
        }
        this.hear(dt, ['clochette'], 2.8);
        if (this.timer < 0.95 || this.moveT < 1) return;
        this.timer = 0;
        if (d <= 14 && this.host.rng.next() < 0.75) this.stepToward(p.x, p.y, 0.9);
        else this.wander(0.9);
        return;
      case 'eclot':
        if (this.phaseT > 0.6) this.enter('ruee');
        return;
      case 'ruee':
        if (this.moveT >= 1 && d <= 1) {
          this.strike();
          return;
        }
        if (this.phaseT > 4.5 || d > 8) {
          this.enter('repli');
          this.host.sound('clochette', this.x, this.y);
          return;
        }
        if (this.timer < 0.15 || this.moveT < 1) return;
        this.timer = 0;
        this.stepToward(p.x, p.y, 0.14);
        return;
      default: {
        // Repli : elle s'éteint, et sa lueur se rallume plus loin.
        if (this.phaseT < 0.9) return;
        for (let tries = 0; tries < 40; tries++) {
          const x = Math.floor(this.host.rng.next() * this.host.mapWidth);
          const y = Math.floor(this.host.rng.next() * this.host.mapHeight);
          const far = manhattan(x, y, p.x, p.y);
          if (far < 9 || far > 15 || !this.host.walkable(x, y)) continue;
          this.x = this.fromX = x;
          this.y = this.fromY = y;
          break;
        }
        this.enter('leurre');
      }
    }
  }

  // Volant : il tournoie au-dessus de vous, vise, puis tombe en piqué.
  private updateVolant(dt: number): void {
    const p = this.host.player();
    const sync = () => {
      this.x = Math.round(this.fx);
      this.y = Math.round(this.fy);
    };
    switch (this.phase) {
      case 'cercle': {
        // Le centre de ses cercles suit le joueur, avec un temps de retard.
        const k = Math.min(1, dt * 0.8);
        this.cx += (p.x - this.cx) * k;
        this.cy += (p.y - this.cy) * k;
        this.angle += dt * 0.9;
        const radius = 5.5;
        this.fx = Math.max(0, Math.min(this.host.mapWidth - 1, this.cx + Math.cos(this.angle) * radius));
        this.fy = Math.max(0, Math.min(this.host.mapHeight - 1, this.cy + Math.sin(this.angle) * radius * 0.7));
        this.alt = 46 + Math.sin(this.phaseT * 2) * 4;
        this.facing = Math.sin(this.angle) > 0 ? 'gauche' : 'droite';
        sync();
        this.hear(dt, ['ailes', 'ailes', 'cri'], 3.2);
        if (this.timer > 8 && manhattan(Math.round(this.cx), Math.round(this.cy), p.x, p.y) <= 6) {
          this.phase = 'vise';
          this.phaseT = 0;
          this.tx = p.x;
          this.ty = p.y;
          this.alert = 1;
          this.host.sound('cri', this.x, this.y);
        }
        return;
      }
      case 'vise': {
        // Son ombre glisse vers vous… et vous suit encore un instant.
        if (this.phaseT < 0.55) {
          this.tx = p.x;
          this.ty = p.y;
        }
        const k = Math.min(1, dt * 6);
        this.fx += (this.tx - this.fx) * k;
        this.fy += (this.ty - this.fy) * k;
        this.alt = 46 - (this.phaseT / 0.9) * 18;
        sync();
        if (this.phaseT > 0.9) {
          this.phase = 'pique';
          this.phaseT = 0;
          this.fx = this.tx;
          this.fy = this.ty;
          sync();
          this.host.sound('chute', this.x, this.y);
        }
        return;
      }
      case 'pique': {
        const u = Math.min(1, this.phaseT / 0.45);
        this.alt = 28 * (1 - u * u);
        if (u < 1) return;
        this.alt = 0;
        if (manhattan(this.tx, this.ty, p.x, p.y) <= 1) {
          this.strike();
          return;
        }
        // Raté : il s'écrase au sol, et le sol tremble.
        this.phase = 'pose';
        this.phaseT = 0;
        this.host.sound('pas', this.x, this.y);
        this.host.sound('grognement', this.x, this.y);
        return;
      }
      case 'pose':
        if (this.distance() <= 1) {
          this.strike();
          return;
        }
        if (this.phaseT > 1.3) {
          this.phase = 'envol';
          this.phaseT = 0;
          this.host.sound('ailes', this.x, this.y);
        }
        return;
      case 'envol':
        this.alt = Math.min(46, this.phaseT * 60);
        if (this.alt >= 46) {
          this.phase = 'cercle';
          this.phaseT = 0;
          this.timer = 0;
          this.cx = this.fx;
          this.cy = this.fy;
        }
        return;
      default:
        return;
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  private pixel(): { px: number; py: number; lift: number } {
    if (this.def.kind === 'volant' && this.phase !== 'poursuite') return { px: this.fx * TILE, py: this.fy * TILE, lift: 0 };
    if (this.arc) {
      const u = Math.min(1, this.arc.t / this.arc.dur);
      return {
        px: (this.arc.fx + (this.x - this.arc.fx) * u) * TILE,
        py: (this.arc.fy + (this.y - this.arc.fy) * u) * TILE,
        lift: 4 * this.arc.h * u * (1 - u) + (1 - u) * this.perchLift(this.arc.fx, this.arc.fy) + u * this.landingLift(),
      };
    }
    const t = this.moveT;
    return {
      px: (this.fromX + (this.x - this.fromX) * t) * TILE,
      py: (this.fromY + (this.y - this.fromY) * t) * TILE,
      lift: this.aloft() ? this.perchLift(this.x, this.y) : 0,
    };
  }

  /** Perchée (toit, arbre) : elle n'est pas au sol. */
  private aloft(): boolean {
    return this.phase === 'perche' || this.phase === 'tapi' || this.phase === 'pendu';
  }

  /** Hauteur (px) du faîte d'un toit ou d'un arbre au-dessus de sa case. */
  private perchLift(x: number, y: number): number {
    const c = this.host.tile(x, y);
    return c === 'T' || c === 'B' ? 7 : c === 'R' || c === '@' ? 3 : 0;
  }

  private landingLift(): number {
    return this.phase === 'saut' || this.phase === 'remonte' ? this.perchLift(this.x, this.y) : 0;
  }

  /** Profondeur de tri (avec les PNJ et le joueur). */
  depth(): number {
    return this.pixel().py;
  }

  /** La lanterne de l'imposteur, la lueur de la clochette, attirent le regard dans le noir. */
  light(ox: number, oy: number, time: number): Light | null {
    const { px, py } = this.pixel();
    if (this.def.kind === 'leurre' && (this.phase === 'leurre' || this.phase === 'eclot')) {
      const [bx, by] = this.lure(time);
      return { x: px + ox + bx, y: py + oy + by, r: 13 + Math.sin(time * 5) * 1.5 };
    }
    if (!this.disguised()) return null;
    return { x: px + ox + 12, y: py + oy + 6, r: 22 + Math.sin(time * 7) * 1.5 };
  }

  /** La lueur de la clochette danse au-dessus du sol (décalage en px dans la case). */
  private lure(time: number): [number, number] {
    return [8 + Math.sin(time * 1.3 + this.x) * 2, 2 + Math.sin(time * 2.2) * 2.5];
  }

  /** Au sol : la créature, son ombre ou son déguisement (sous l'obscurité de la nuit). */
  render(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number): void {
    const { px, py, lift } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    if (this.def.kind === 'volant' && this.phase !== 'poursuite') {
      // Ombre au sol : plus la bête descend, plus elle est grande et nette.
      const k = 1 - this.alt / 60;
      ctx.fillStyle = `rgba(8,4,10,${(0.25 + k * 0.4).toFixed(2)})`;
      const rw = Math.round(5 + k * 7 + Math.sin(time * 9) * (this.alt > 10 ? 2 : 0));
      ctx.fillRect(sx + 8 - rw, sy + 13, rw * 2, 3);
      ctx.fillRect(sx + 9 - rw, sy + 12, rw * 2 - 2, 1);
      if (this.alt < 6) drawCreature(ctx, this.def.species, sx + 8, sy + 15, 32, { flip: this.facing === 'droite' });
      return;
    }
    switch (this.phase) {
      case 'perche':
      case 'tapi':
      case 'pendu':
      case 'saut':
      case 'remonte':
      case 'bond':
      case 'lache':
      case 'leurre':
        // Tout se passe au-dessus de la nuit (sur les toits, dans les arbres, dans la lueur).
        if ((this.phase === 'bond' || this.phase === 'lache') && this.arc) {
          ctx.fillStyle = 'rgba(10,6,4,0.4)';
          const w = Math.round(3 + (this.arc.t / this.arc.dur) * 4);
          ctx.fillRect(sx + 8 - w, sy + 14, w * 2, 2);
        }
        return;
      case 'sousTerre':
        // La bosse de terre se dessine par-dessus la nuit (renderAbove).
        return;
      case 'replonge':
        this.renderRising(ctx, sx, sy, 1 - this.phaseT / 0.6);
        return;
      case 'jaillit':
        this.renderRising(ctx, sx, sy, Math.min(1, this.phaseT / 0.2));
        return;
      case 'repli':
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - this.phaseT / 0.9);
        drawCreature(ctx, this.def.species, sx + 8, sy + 15, 32, { flip: this.facing === 'droite' });
        ctx.restore();
        return;
      default:
    }
    ctx.fillStyle = 'rgba(10,6,4,0.35)';
    ctx.fillRect(sx + 3, sy + 14, 10, 2);
    if (this.disguised()) {
      const look = this.def.disguise!;
      ctx.drawImage(characterSprite(look, this.facing, this.moveT < 1 ? 1 + (this.steps % 2) : 0), sx, sy - 8);
      return;
    }
    if (this.phase === 'revelation' && Math.floor(this.phaseT * 14) % 2 === 0) {
      // Le même villageois… sans visage : le masque volé tombe.
      ctx.drawImage(characterSprite({ ...this.def.disguise!, faceless: true }, this.facing, 0), sx, sy - 8);
      return;
    }
    if (this.phase === 'eclot' && Math.floor(this.phaseT * 12) % 2 === 0) return;
    const bob = this.moveT < 1 ? Math.round(Math.abs(Math.sin(this.moveT * Math.PI)) * 2) : 0;
    drawCreature(ctx, this.def.species, sx + 8, sy + 15 - bob - Math.round(lift), 32, { flip: this.facing === 'droite' });
  }

  /**
   * Le ver sous la terre : une bosse de sable fendillée qui avance, des mottes qui sautent,
   * un sillon derrière lui. Assez sombre pour qu'on la devine plus qu'on ne la voie.
   */
  private renderMound(ctx: CanvasRenderingContext2D, sx: number, sy: number, time: number): void {
    const moving = this.moveT < 1;
    const big = this.tracking || this.phase !== 'sousTerre' ? 1 : 0;
    ctx.save();
    ctx.globalAlpha = 0.8;
    // Le sillon laissé derrière lui.
    if (moving) {
      const bx = Math.round(sx + (this.fromX - this.x) * TILE * (1 - this.moveT));
      const by = Math.round(sy + (this.fromY - this.y) * TILE * (1 - this.moveT));
      ctx.fillStyle = '#4a3a26';
      ctx.fillRect(Math.min(bx, sx) + 6, Math.min(by, sy) + 12, Math.abs(bx - sx) + 4, Math.abs(by - sy) + 2);
    }
    const w = 6 + big * 2;
    const h = 2 + big * 2;
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(sx + 8 - w, sy + 14 - h, w * 2, h + 1);
    ctx.fillStyle = '#7a6040';
    ctx.fillRect(sx + 9 - w, sy + 13 - h, w * 2 - 2, h);
    ctx.fillStyle = '#a08860';
    ctx.fillRect(sx + 10 - w, sy + 13 - h, w * 2 - 6, 1);
    // Fissures qui rayonnent.
    ctx.fillStyle = '#1e140c';
    ctx.fillRect(sx + 5, sy + 12 - big, 1, 2);
    ctx.fillRect(sx + 6, sy + 13, 2, 1);
    ctx.fillRect(sx + 10, sy + 11 - big, 1, 2);
    ctx.fillRect(sx + 11, sy + 13, 2, 1);
    ctx.fillRect(sx + 8, sy + 12 - big * 2, 1, 1);
    if (moving || this.phase !== 'sousTerre') {
      ctx.fillStyle = '#8a7048';
      for (let i = 0; i < 4; i++) {
        const u = (time * 3 + i / 4) % 1;
        ctx.fillRect(sx + 3 + i * 3, sy + 11 - h - Math.round(Math.sin(u * Math.PI) * 5), 1, 1);
      }
    }
    ctx.restore();
  }

  /** Le ver qui sort de terre (0 : enfoui, 1 : dressé). */
  private renderRising(ctx: CanvasRenderingContext2D, sx: number, sy: number, u: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - 24, sy - 40, 64, 53);
    ctx.clip();
    drawCreature(ctx, this.def.species, sx + 8, sy + 15 + Math.round((1 - u) * 26), 32, { flip: this.facing === 'droite' });
    ctx.restore();
  }

  /** Par-dessus la nuit : yeux luisants, créatures perchées, volant dans le ciel, « ! » et paroles. */
  renderAbove(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number, dark: number): void {
    const { px, py, lift } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    let top = sy - 22;
    if (this.def.kind === 'volant' && this.phase !== 'poursuite' && this.alt >= 6) {
      // Silhouette noire qui bat des ailes au-dessus des arbres.
      const flap = 1 + Math.sin(time * 14) * 0.18;
      ctx.save();
      ctx.translate(sx + 8, sy + 12 - this.alt);
      ctx.scale(flap, 1);
      drawCreature(ctx, this.def.species, 0, 0, 32, { flip: this.facing === 'droite', silhouette: true, alpha: 0.9 });
      ctx.restore();
      this.eyes(ctx, sx, sy - this.alt - 2, '#ff3020', time);
      top -= this.alt;
    } else if (this.def.kind === 'guetteur' && (this.aloft() || this.phase === 'saut' || this.phase === 'remonte' || this.phase === 'bond')) {
      this.renderSpider(ctx, sx + 8, sy + 9 - Math.round(lift), time);
      top = sy - 6 - Math.round(lift);
    } else if (this.def.kind === 'pendu' && (this.phase === 'pendu' || this.phase === 'remonte' || this.phase === 'lache')) {
      const drop = this.phase === 'lache' && this.arc ? this.arc.t / this.arc.dur : 0;
      this.renderHanger(ctx, sx + 8, sy + 4 - (this.phase === 'remonte' ? Math.round(lift) : 0) + Math.round(drop * 10), time);
      top = sy - 10;
    } else if (this.def.kind === 'leurre' && (this.phase === 'leurre' || this.phase === 'eclot')) {
      this.renderLure(ctx, sx, sy, time);
    } else if (this.phase === 'sousTerre' || this.phase === 'replonge' || this.phase === 'jaillit') {
      if (this.phase !== 'replonge' || this.phaseT < 0.3) this.renderMound(ctx, sx, sy, time);
    } else if (!this.disguised() && dark > 0.3 && this.phase !== 'revelation' && this.phase !== 'repli') {
      this.eyes(ctx, sx, sy - Math.round(lift), this.def.kind === 'imposteur' ? '#c8f0ff' : this.def.kind === 'pendu' ? '#ffe060' : '#ff3a2a', time);
    }
    if (this.alert > 0 && this.phase !== 'attaque') {
      const rise = Math.round((1.1 - this.alert) * 6);
      text(ctx, '!', sx + 6, top - rise, { color: '#ff4030', shadow: PAL.ink });
    }
    if (this.wordsT > 0 && this.disguised()) bubble(ctx, this.words, sx + 8, sy - 10, '#5a3a8a');
  }

  /**
   * L'araignée des toits, vue d'en haut : huit pattes sur le chaume et huit yeux rouges
   * tournés vers le joueur, où qu'il aille. Tapie, elle se ramasse avant de bondir.
   */
  private renderSpider(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
    const p = this.host.player();
    const { px, py } = this.pixel();
    const a = Math.atan2(p.y * TILE - py, p.x * TILE - px);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const k = 1.5;
    const crouch = this.phase === 'tapi' ? Math.min(1, this.phaseT / 0.3) : 0;
    const flying = this.arc ? 1 : 0;
    // Pattes : quatre de chaque côté, genou relevé, de l'avant vers l'arrière.
    ctx.fillStyle = '#140c10';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const leg = a + side * (0.45 + i * 0.62);
        const twitch = Math.sin(time * (crouch ? 30 : 5) + i * 1.7 + side) * (crouch ? 0.6 : 0.3);
        const reach = (7.5 + crouch * 1.5 - flying * 2.5 + twitch) * k;
        const kx = cx + Math.cos(leg) * 4 * k;
        const ky = cy + Math.sin(leg) * 3 * k - 3 * k + crouch * 2;
        line(ctx, cx + Math.cos(leg) * 2, cy + Math.sin(leg) * 1.5, kx, ky);
        line(ctx, kx, ky, cx + Math.cos(leg) * reach, cy + Math.sin(leg) * reach * 0.75 + 1);
      }
    }
    // Abdomen (derrière) et céphalothorax (devant), presque noirs, liserés de pourpre, sablier rouge.
    const bob = Math.round(crouch * 2);
    const ax = Math.round(cx - ca * 4.5);
    const ay = Math.round(cy - sa * 3) + bob;
    ctx.fillStyle = '#4a2a3a';
    ctx.fillRect(ax - 6, ay - 4, 12, 9);
    ctx.fillStyle = '#1c1218';
    ctx.fillRect(ax - 5, ay - 4, 10, 9);
    ctx.fillRect(ax - 6, ay - 3, 12, 7);
    ctx.fillStyle = '#8a1a24';
    ctx.fillRect(ax - 1, ay - 2, 3, 1);
    ctx.fillRect(ax, ay - 1, 1, 2);
    ctx.fillRect(ax - 1, ay + 1, 3, 1);
    const hx = Math.round(cx + ca * 3);
    const hy = Math.round(cy + sa * 2.2) + bob;
    ctx.fillStyle = '#3a2430';
    ctx.fillRect(hx - 4, hy - 3, 8, 6);
    ctx.fillStyle = '#241820';
    ctx.fillRect(hx - 3, hy - 3, 6, 6);
    ctx.fillRect(hx - 4, hy - 2, 8, 4);
    // Huit yeux : deux gros, six petits, toujours tournés vers vous.
    const ex = hx + ca * 2.4;
    const ey = hy + sa * 1.8 - 1;
    const glow = 0.75 + Math.sin(time * 3 + this.x) * 0.25;
    const red = `rgba(255,${Math.round(40 + crouch * 60)},30,${glow.toFixed(2)})`;
    for (const [along, across, big] of [[0, -1, 1], [0, 1, 1], [0, -2.6, 0], [0, 2.6, 0], [-1.6, -1.8, 0], [-1.6, 1.8, 0], [-2.4, -0.7, 0], [-2.4, 0.7, 0]]) {
      const x = Math.round(ex + ca * along - sa * across);
      const y = Math.round(ey + sa * along + ca * across * 0.7);
      ctx.fillStyle = red;
      ctx.fillRect(x - (big ? 1 : 0), y, big ? 2 : 1, big ? 2 : 1);
      if (big) {
        ctx.fillStyle = '#ffd8c8';
        ctx.fillRect(x - 1, y, 1, 1);
      }
    }
  }

  /**
   * Le pendu des figuiers, tête en bas sous la ramure : pieds crochés dans les branches,
   * longs bras qui pendent, ventouses au bout des doigts. Il descend quand on approche.
   */
  private renderHanger(ctx: CanvasRenderingContext2D, cx: number, top: number, time: number): void {
    const sway = Math.sin(time * 1.4 + this.x) * (1.2 + this.lower);
    const drop = Math.round(this.lower * 5);
    const x = Math.round(cx + sway);
    ctx.save();
    ctx.globalAlpha = 0.55 + this.lower * 0.45;
    // Jambes repliées sur la branche.
    ctx.fillStyle = '#6a2018';
    ctx.fillRect(Math.round(cx) - 2, top, 1, 3 + drop);
    ctx.fillRect(Math.round(cx) + 1, top, 1, 3 + drop);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(Math.round(cx) - 3, top - 1, 2, 1);
    ctx.fillRect(Math.round(cx) + 1, top - 1, 2, 1);
    // Corps, puis la grosse tête, en bas.
    ctx.fillStyle = '#b8402a';
    ctx.fillRect(x - 2, top + 3 + drop, 4, 5);
    ctx.fillStyle = '#8a2a1a';
    ctx.fillRect(x - 2, top + 3 + drop, 1, 5);
    const hy = top + 8 + drop;
    ctx.fillStyle = '#c8482e';
    ctx.fillRect(x - 3, hy, 7, 5);
    ctx.fillRect(x - 2, hy + 5, 5, 1);
    // Tête en bas : la bouche au-dessus des yeux, qui s'ouvre quand il descend.
    ctx.fillStyle = '#3a0a08';
    ctx.fillRect(x - 2, hy + 1, 5, this.lower > 0.5 ? 2 : 1);
    if (this.lower > 0.5) {
      ctx.fillStyle = '#f0e8d0';
      ctx.fillRect(x - 1, hy + 1, 1, 1);
      ctx.fillRect(x + 1, hy + 1, 1, 1);
    }
    // Bras qui pendent jusque sous la tête, ventouses pâles au bout.
    const reach = 7 + drop;
    for (const side of [-1, 1]) {
      const swing = Math.sin(time * 2 + side) * 1.2;
      ctx.fillStyle = '#a03a26';
      line(ctx, x + side * 3, top + 5 + drop, x + side * 4 + swing, top + 5 + drop + reach);
      ctx.fillStyle = '#f0c0a0';
      ctx.fillRect(Math.round(x + side * 4 + swing), top + 6 + drop + reach, 1, 1);
      ctx.fillRect(Math.round(x + side * 4 + swing) - side, top + 6 + drop + reach, 1, 1);
    }
    ctx.restore();
    // Les yeux jaunes, eux, se voient de loin.
    if (Math.floor(time * 2 + this.y) % 9 !== 0) {
      ctx.fillStyle = '#ffe060';
      ctx.fillRect(x - 2, hy + 3, 2, 1);
      ctx.fillRect(x + 1, hy + 3, 2, 1);
    }
  }

  /** La clochette : une petite lueur chaude qui danse, une clochette de cuivre en dessous. */
  private renderLure(ctx: CanvasRenderingContext2D, sx: number, sy: number, time: number): void {
    const [bx, by] = this.lure(time);
    const x = Math.round(sx + bx);
    const y = Math.round(sy + by);
    if (this.phase === 'eclot' && Math.floor(this.phaseT * 12) % 2 === 1) return;
    ctx.fillStyle = 'rgba(255,220,120,0.35)';
    ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillRect(x - 1, y - 2, 3, 5);
    ctx.fillStyle = '#fff4c0';
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = '#ffd860';
    ctx.fillRect(x - 1, y, 1, 1);
    ctx.fillRect(x + 1, y, 1, 1);
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillRect(x, y + 1, 1, 1);
    // La clochette, qui oscille.
    const swing = Math.round(Math.sin(time * 6));
    ctx.fillStyle = '#b8862a';
    ctx.fillRect(x - 1 + swing, y + 3, 3, 2);
    ctx.fillRect(x + swing, y + 2, 1, 1);
    ctx.fillStyle = '#5a3a10';
    ctx.fillRect(x + swing, y + 5, 1, 1);
  }

  private eyes(ctx: CanvasRenderingContext2D, sx: number, sy: number, color: string, time: number): void {
    if (Math.floor(time * 3 + this.x * 7) % 13 === 0) return;
    const lean = this.facing === 'gauche' ? -2 : this.facing === 'droite' ? 2 : 0;
    ctx.fillStyle = color;
    ctx.fillRect(sx + 5 + lean, sy + 4, 2, 1);
    ctx.fillRect(sx + 9 + lean, sy + 4, 2, 1);
  }
}

/** Un villageois attardé qui fuit en hurlant, une bête sur les talons. */
export class Fugitive {
  private index: number;
  private fromX: number;
  private fromY: number;
  private moveT = 1;
  private timer = 0;
  private shout = 0;
  private words = '';
  private wordsT = 0;
  facing: Dir = 'bas';
  /** Arrivé au bout de son chemin : il s'est mis à l'abri. */
  safe = false;

  constructor(
    private readonly host: MobHost,
    readonly path: Array<[number, number]>,
    readonly look: CharacterLook,
    head = 3,
  ) {
    this.index = Math.min(head, path.length - 1);
    [this.fromX, this.fromY] = path[this.index];
  }

  get x(): number {
    return this.path[this.index][0];
  }

  get y(): number {
    return this.path[this.index][1];
  }

  update(dt: number): void {
    if (this.safe) return;
    this.moveT = Math.min(1, this.moveT + dt / 0.14);
    this.timer += dt;
    this.wordsT = Math.max(0, this.wordsT - dt);
    this.shout -= dt;
    if (this.shout <= 0) {
      this.shout = 2.2 + this.host.rng.next();
      const cries = ['Au secours !', 'À l’aide !!', 'Il arrive !', 'Courez !'];
      this.words = cries[Math.floor(this.host.rng.next() * cries.length)];
      this.wordsT = 1.6;
      this.host.sound('appel', this.x, this.y);
    }
    if (this.timer < 0.16 || this.moveT < 1) return;
    this.timer = 0;
    const next = this.path[this.index + 1];
    if (!next) {
      this.safe = true;
      return;
    }
    const p = this.host.player();
    if (next[0] === p.x && next[1] === p.y) return;
    this.fromX = this.x;
    this.fromY = this.y;
    this.facing = next[0] > this.x ? 'droite' : next[0] < this.x ? 'gauche' : next[1] > this.y ? 'bas' : 'haut';
    this.index++;
    this.moveT = 0;
  }

  private pixel(): { px: number; py: number } {
    const t = this.moveT;
    return { px: (this.fromX + (this.x - this.fromX) * t) * TILE, py: (this.fromY + (this.y - this.fromY) * t) * TILE };
  }

  depth(): number {
    return this.pixel().py;
  }

  /** Sa torche, qui tremble dans sa course. */
  light(ox: number, oy: number, time: number): Light | null {
    if (this.safe) return null;
    const { px, py } = this.pixel();
    return { x: px + ox + 8, y: py + oy + 2, r: 20 + Math.sin(time * 13) * 2 };
  }

  render(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    if (this.safe) return;
    const { px, py } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    ctx.fillStyle = 'rgba(10,6,4,0.35)';
    ctx.fillRect(sx + 3, sy + 14, 10, 2);
    ctx.drawImage(characterSprite(this.look, this.facing, this.moveT < 0.7 ? 1 + (this.index % 2) : 0), sx, sy - 8);
  }

  renderAbove(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    if (this.safe || this.wordsT <= 0) return;
    const { px, py } = this.pixel();
    bubble(ctx, this.words, Math.round(px + ox) + 8, Math.round(py + oy) - 10, '#a01818');
  }
}
