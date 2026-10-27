// Créatures de la nuit sur la carte (voir data/nightMobs.ts) : le rôdeur flaire le joueur,
// se rapproche peu à peu puis fonce ; le volant tournoie (on ne voit que son ombre) et
// tombe du ciel ; l'imposteur attend, lanterne à la main, qu'on s'approche. Et des
// villageois attardés traversent la carte en hurlant, une bête sur les talons.
import type { MobDef } from '../data/nightMobs';
import type { CharacterLook } from '../data/trainers';
import { DIR_DELTA, type Dir } from '../data/zones';
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
  | 'attaque';

const manhattan = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

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
    this.phase = def.kind === 'imposteur' ? 'deguise' : def.kind === 'volant' ? 'cercle' : 'rode';
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

  /** La créature occupe-t-elle cette case au sol ? (Un volant en l'air n'occupe rien.) */
  occupies(x: number, y: number): boolean {
    if (this.def.kind === 'volant' && this.phase !== 'pose') return false;
    return this.x === x && this.y === y;
  }

  /** Vrai tant qu'elle fond sur le joueur (pour faire taire la musique et battre le cœur). */
  hunting(): boolean {
    return ['chasse', 'revelation', 'vise', 'pique'].includes(this.phase) || (this.phase === 'poursuite' && this.distance() <= 8);
  }

  disguised(): boolean {
    return this.phase === 'deguise' || (this.phase === 'revelation' && this.phaseT < 0.5);
  }

  /** On lui parle : il se retourne. */
  talkedTo(): void {
    if (this.phase === 'deguise') this.reveal();
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
    this.host.sound(this.def.kind === 'volant' ? 'cri' : 'grognement', this.x, this.y);
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

  update(dt: number): void {
    if (this.phase === 'attaque') return;
    this.moveT = Math.min(1, this.moveT + dt / this.stepTime);
    this.timer += dt;
    this.phaseT += dt;
    this.alert = Math.max(0, this.alert - dt);
    this.wordsT = Math.max(0, this.wordsT - dt);
    if (this.def.kind === 'volant' && this.phase !== 'poursuite') this.updateVolant(dt);
    else if (this.phase === 'deguise' || this.phase === 'revelation') this.updateImposteur();
    else this.updateMarcheur(dt);
  }

  // Rôdeur (et imposteur démasqué) : il flaire, s'approche, puis fonce.
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
    const fast = this.def.kind === 'imposteur';
    this.hear(dt, fast ? ['cri', 'rire'] : ['grognement'], 3.5);
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

  private pixel(): { px: number; py: number } {
    if (this.def.kind === 'volant' && this.phase !== 'poursuite') return { px: this.fx * TILE, py: this.fy * TILE };
    const t = this.moveT;
    return {
      px: (this.fromX + (this.x - this.fromX) * t) * TILE,
      py: (this.fromY + (this.y - this.fromY) * t) * TILE,
    };
  }

  /** Profondeur de tri (avec les PNJ et le joueur). */
  depth(): number {
    return this.pixel().py;
  }

  /** La lanterne de l'imposteur attire le regard dans le noir. */
  light(ox: number, oy: number, time: number): Light | null {
    if (!this.disguised()) return null;
    const { px, py } = this.pixel();
    return { x: px + ox + 12, y: py + oy + 6, r: 22 + Math.sin(time * 7) * 1.5 };
  }

  /** Au sol : la créature, son ombre ou son déguisement (sous l'obscurité de la nuit). */
  render(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number): void {
    const { px, py } = this.pixel();
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
    ctx.fillStyle = 'rgba(10,6,4,0.35)';
    ctx.fillRect(sx + 3, sy + 14, 10, 2);
    if (this.disguised()) {
      const look = this.def.disguise!;
      ctx.drawImage(characterSprite(look, this.facing, this.moveT < 1 ? 1 + (this.steps % 2) : 0), sx, sy - 8);
      return;
    }
    if (this.phase === 'revelation' && Math.floor(this.phaseT * 14) % 2 === 0) {
      // Le même villageois… sans visage.
      ctx.drawImage(characterSprite({ ...this.def.disguise!, faceless: true }, this.facing, 0), sx, sy - 8);
      return;
    }
    const bob = this.moveT < 1 ? Math.round(Math.abs(Math.sin(this.moveT * Math.PI)) * 2) : 0;
    drawCreature(ctx, this.def.species, sx + 8, sy + 15 - bob, 32, { flip: this.facing === 'droite' });
  }

  /** Par-dessus la nuit : yeux luisants, volant dans le ciel, « ! » et paroles. */
  renderAbove(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number, dark: number): void {
    const { px, py } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    if (this.def.kind === 'volant' && this.phase !== 'poursuite' && this.alt >= 6) {
      // Silhouette noire qui bat des ailes au-dessus des arbres.
      const flap = 1 + Math.sin(time * 14) * 0.18;
      ctx.save();
      ctx.translate(sx + 8, sy + 12 - this.alt);
      ctx.scale(flap, 1);
      drawCreature(ctx, this.def.species, 0, 0, 32, { flip: this.facing === 'droite', silhouette: true, alpha: 0.9 });
      ctx.restore();
      this.eyes(ctx, sx, sy - this.alt - 2, '#ff3020', time);
    } else if (!this.disguised() && dark > 0.3 && this.phase !== 'revelation') {
      this.eyes(ctx, sx, sy, this.def.kind === 'imposteur' ? '#c8f0ff' : '#ff3a2a', time);
    }
    if (this.alert > 0 && this.phase !== 'attaque') {
      const lift = Math.round((1.1 - this.alert) * 6);
      text(ctx, '!', sx + 6, sy - 22 - lift - (this.def.kind === 'volant' ? this.alt : 0), { color: '#ff4030', shadow: PAL.ink });
    }
    if (this.wordsT > 0 && this.disguised()) bubble(ctx, this.words, sx + 8, sy - 10, '#5a3a8a');
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
