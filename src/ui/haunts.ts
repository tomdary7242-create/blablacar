// Hantises sur la carte : déplacement, ruses et attaque au contact.
// Chaque comportement est une petite machine à états mise à jour à chaque image.
import type { Haunt } from '../data/hantises';
import { DIR_DELTA, type Dir } from '../data/zones';
import type { Rng } from '../engine/rng';
import { characterSprite, drawCreature } from './sprites';
import type { Light } from './night';
import { TILE } from './tiles';

export interface HauntHost {
  readonly rng: Rng;
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** Position et regard du joueur (case d'arrivée s'il est en train de marcher). */
  player(): { x: number; y: number; dir: Dir };
  /** Case praticable pour une Hantise (ni décor solide, ni PNJ, ni joueur). */
  walkable(x: number, y: number): boolean;
  tile(x: number, y: number): string;
  /** Traces de pas laissées par le joueur cette nuit (de la plus ancienne à la plus récente). */
  trail(): Array<[number, number]>;
  sfx(name: 'pas' | 'grincement' | 'cri' | 'battement'): void;
  /** La Hantise rattrape le joueur. */
  caught(): void;
}

type Phase = 'cache' | 'rode' | 'deguise' | 'revelation' | 'chasse' | 'eteinte' | 'apparition' | 'attaque';

const manhattan = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

export class HauntActor {
  x: number;
  y: number;
  private fromX: number;
  private fromY: number;
  private moveT = 1;
  private timer = 0;
  private phase: Phase;
  private phaseT = 0;
  facing: Dir = 'bas';
  private trailIndex = 0;
  private stepsTaken = 0;
  /** Une fois déclenchée, l'attaque ne se répète pas. */
  private struck = false;

  constructor(
    readonly haunt: Haunt,
    private readonly host: HauntHost,
    x: number,
    y: number,
  ) {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.phase = haunt.behavior === 'imitateur' ? 'deguise' : haunt.behavior === 'herbes' ? 'cache' : 'rode';
    if (haunt.behavior === 'teleporteur') this.phase = 'apparition';
  }

  /** Distance (en cases) au joueur. */
  distance(): number {
    const p = this.host.player();
    return manhattan(this.x, this.y, p.x, p.y);
  }

  /** Le joueur regarde-t-il dans la direction de la Hantise ? */
  private watched(): boolean {
    const p = this.host.player();
    const dx = this.x - p.x;
    const dy = this.y - p.y;
    if (Math.abs(dx) + Math.abs(dy) > 10) return false;
    switch (p.dir) {
      case 'haut':
        return dy < 0 && Math.abs(dx) <= -dy;
      case 'bas':
        return dy > 0 && Math.abs(dx) <= dy;
      case 'gauche':
        return dx < 0 && Math.abs(dy) <= -dx;
      case 'droite':
        return dx > 0 && Math.abs(dy) <= dx;
    }
  }

  private moveTo(x: number, y: number): void {
    if (x === this.x && y === this.y) return;
    this.fromX = this.x;
    this.fromY = this.y;
    this.facing = x > this.x ? 'droite' : x < this.x ? 'gauche' : y > this.y ? 'bas' : 'haut';
    this.x = x;
    this.y = y;
    this.moveT = 0;
    this.stepsTaken++;
  }

  /** Prochaine case vers le joueur (parcours en largeur), éventuellement restreinte. */
  private stepToward(tx: number, ty: number, allowed: (x: number, y: number) => boolean): [number, number] | null {
    const w = this.host.mapWidth;
    const key = (x: number, y: number) => y * w + x;
    const prev = new Map<number, number>([[key(this.x, this.y), -1]]);
    const queue: Array<[number, number]> = [[this.x, this.y]];
    let found: [number, number] | null = null;
    while (queue.length && !found) {
      const [x, y] = queue.shift()!;
      for (const { dx, dy } of Object.values(DIR_DELTA)) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= this.host.mapHeight || prev.has(key(nx, ny))) continue;
        if (manhattan(nx, ny, tx, ty) === 0) {
          prev.set(key(nx, ny), key(x, y));
          found = [nx, ny];
          break;
        }
        if (!allowed(nx, ny)) continue;
        prev.set(key(nx, ny), key(x, y));
        queue.push([nx, ny]);
      }
    }
    if (!found) return null;
    // On remonte le chemin jusqu'au premier pas.
    const start = key(this.x, this.y);
    let k = key(found[0], found[1]);
    while (prev.get(k) !== start) {
      const back = prev.get(k);
      if (back === undefined || back < 0) return null;
      k = back;
    }
    return [k % w, Math.floor(k / w)];
  }

  update(dt: number): void {
    if (this.struck) return;
    this.moveT = Math.min(1, this.moveT + dt / Math.max(0.12, this.haunt.step * 0.8));
    this.timer += dt;
    this.phaseT += dt;
    const p = this.host.player();
    if (this.moveT >= 1 && this.canStrike() && this.distance() <= 1) {
      this.strike();
      return;
    }
    switch (this.haunt.behavior) {
      case 'herbes':
        this.updateHerbes(p);
        break;
      case 'traqueur':
        this.updateTraqueur(p);
        break;
      case 'miroir':
        this.updateMiroir(p);
        break;
      case 'statue':
        this.updateStatue(p);
        break;
      case 'imitateur':
        this.updateImitateur(p);
        break;
      case 'teleporteur':
        this.updateTeleporteur(p);
        break;
    }
    if (!this.struck && this.moveT >= 1 && this.canStrike() && this.distance() <= 1) this.strike();
  }

  /** Révèle la Hantise (fin de partie de cache-cache). */
  get revealed(): boolean {
    return this.phase === 'attaque';
  }

  private canStrike(): boolean {
    if (this.haunt.behavior === 'imitateur') return this.phase === 'chasse';
    if (this.haunt.behavior === 'teleporteur') return this.phase === 'rode';
    if (this.haunt.behavior === 'traqueur') return this.phase === 'chasse';
    return true;
  }

  private strike(): void {
    this.struck = true;
    this.phase = 'attaque';
    this.host.sfx('cri');
    this.host.caught();
  }

  // Rôdeur des herbes : invisible, il glisse d'une touffe à l'autre vers le joueur.
  private updateHerbes(p: { x: number; y: number }): void {
    const grass = (x: number, y: number) => this.host.tile(x, y) === ',' && this.host.walkable(x, y);
    const near = this.distance() <= 9;
    const delay = near ? this.haunt.step : this.haunt.step * 3;
    if (this.timer < delay || this.moveT < 1) return;
    this.timer = 0;
    if (near) {
      const next = this.stepToward(p.x, p.y, grass);
      if (next && grass(next[0], next[1])) this.moveTo(next[0], next[1]);
      return;
    }
    const options = Object.values(DIR_DELTA)
      .map(({ dx, dy }): [number, number] => [this.x + dx, this.y + dy])
      .filter(([x, y]) => grass(x, y));
    if (options.length) this.moveTo(...options[Math.floor(this.host.rng.next() * options.length)]);
  }

  // Traqueur : apparaît loin derrière, puis suit les traces du joueur sans jamais s'arrêter.
  private updateTraqueur(p: { x: number; y: number }): void {
    const trail = this.host.trail();
    if (this.phase === 'rode') {
      // Il attend que le joueur ait assez marché, puis surgit sur ses premières traces.
      if (trail.length < 10) return;
      const [sx, sy] = trail[0];
      if (manhattan(sx, sy, p.x, p.y) < 6 || !this.host.walkable(sx, sy)) return;
      this.x = this.fromX = sx;
      this.y = this.fromY = sy;
      this.trailIndex = 0;
      this.phase = 'chasse';
      this.timer = 0;
      return;
    }
    if (this.timer < this.haunt.step || this.moveT < 1) return;
    this.timer = 0;
    // Tout près : il quitte les traces et fonce droit sur sa proie.
    if (this.distance() <= 4) {
      const next = this.stepToward(p.x, p.y, (x, y) => this.host.walkable(x, y));
      if (next && this.host.walkable(next[0], next[1])) this.moveTo(next[0], next[1]);
    } else {
      // Sinon, pas à pas sur les empreintes (en sautant les boucles déjà rejointes).
      let index = this.trailIndex + 1;
      for (let i = trail.length - 1; i > index; i--) {
        if (trail[i][0] === this.x && trail[i][1] === this.y) {
          index = i + 1;
          break;
        }
      }
      if (index < trail.length) {
        const [nx, ny] = trail[index];
        if (manhattan(nx, ny, this.x, this.y) === 1 && this.host.walkable(nx, ny)) {
          this.trailIndex = index;
          this.moveTo(nx, ny);
        } else {
          const next = this.stepToward(nx, ny, (x, y) => this.host.walkable(x, y));
          if (next && this.host.walkable(next[0], next[1])) this.moveTo(next[0], next[1]);
          this.trailIndex = index;
        }
      }
    }
    if (this.distance() <= 10) this.host.sfx('pas');
  }

  // Miroir : il se place toujours à l'opposé du joueur par rapport à la ligne d'eau.
  private updateMiroir(p: { x: number; y: number }): void {
    if (this.timer < this.haunt.step || this.moveT < 1) return;
    this.timer = 0;
    const axis = this.haunt.axis ?? Math.floor(this.host.mapHeight / 2);
    const tx = Math.max(0, Math.min(this.host.mapWidth - 1, p.x));
    const ty = Math.max(0, Math.min(this.host.mapHeight - 1, 2 * axis - p.y));
    if (tx === this.x && ty === this.y) {
      // Face à face sur la ligne : il sort de l'eau.
      if (this.distance() <= 1) return;
    }
    const dx = Math.sign(tx - this.x);
    const dy = Math.sign(ty - this.y);
    // Un reflet marche sur l'eau comme sur la terre ferme.
    if (Math.abs(tx - this.x) >= Math.abs(ty - this.y) && dx !== 0) this.moveTo(this.x + dx, this.y);
    else if (dy !== 0) this.moveTo(this.x, this.y + dy);
    this.facing = p.x < this.x ? 'gauche' : p.x > this.x ? 'droite' : p.y < this.y ? 'haut' : 'bas';
  }

  /** Le reflet est-il sous l'eau ? */
  submerged(): boolean {
    const t = this.host.tile(this.x, this.y);
    return t === '~' || t === 'w';
  }

  // Statue : immobile quand on la regarde, elle avance dès qu'on lui tourne le dos.
  private updateStatue(p: { x: number; y: number }): void {
    if (this.watched()) {
      this.timer = 0;
      return;
    }
    if (this.timer < this.haunt.step || this.moveT < 1) return;
    this.timer = 0;
    const next = this.stepToward(p.x, p.y, (x, y) => this.host.walkable(x, y));
    if (next && this.host.walkable(next[0], next[1])) {
      this.moveTo(next[0], next[1]);
      if (this.stepsTaken % 2 === 0) this.host.sfx('grincement');
    }
  }

  /** Vrai tant que l'imitateur garde son apparence de villageois. */
  disguised(): boolean {
    return this.phase === 'deguise' || (this.phase === 'revelation' && this.phaseT < 0.6);
  }

  /** Le joueur lui parle : il se retourne. */
  talkedTo(): void {
    if (this.phase === 'deguise') {
      this.phase = 'revelation';
      this.phaseT = 0;
    }
  }

  // Imitateur : un villageois de dos… qui tourne la tête quand on ne le regarde pas.
  private updateImitateur(p: { x: number; y: number }): void {
    if (this.phase === 'deguise') {
      this.facing = this.watched() ? 'haut' : this.x > p.x ? 'gauche' : this.x < p.x ? 'droite' : this.y > p.y ? 'haut' : 'bas';
      if (this.distance() <= 2) {
        this.phase = 'revelation';
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === 'revelation') {
      this.facing = p.y > this.y ? 'bas' : p.x < this.x ? 'gauche' : p.x > this.x ? 'droite' : 'haut';
      if (this.phaseT > 1.1) {
        this.phase = 'chasse';
        this.timer = 0;
        this.host.sfx('cri');
      }
      return;
    }
    if (this.timer < this.haunt.step || this.moveT < 1) return;
    this.timer = 0;
    const next = this.stepToward(p.x, p.y, (x, y) => this.host.walkable(x, y));
    if (next && this.host.walkable(next[0], next[1])) this.moveTo(next[0], next[1]);
  }

  // Téléporteur : s'éteint, puis se rallume plus près, de préférence dans le dos du joueur.
  private updateTeleporteur(p: { x: number; y: number; dir: Dir }): void {
    if (this.phase === 'apparition') {
      if (this.phaseT > 0.45) {
        this.phase = 'rode';
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === 'rode') {
      if (this.phaseT < this.haunt.step) return;
      this.phase = 'eteinte';
      this.phaseT = 0;
      return;
    }
    if (this.phaseT < 0.5) return;
    const current = this.distance();
    const target = Math.max(1, current - 2 - Math.floor(this.host.rng.next() * 2));
    const back = DIR_DELTA[p.dir];
    let best: [number, number] | null = null;
    let bestScore = -Infinity;
    for (let tries = 0; tries < 80; tries++) {
      const x = p.x + Math.round((this.host.rng.next() * 2 - 1) * (target + 1));
      const y = p.y + Math.round((this.host.rng.next() * 2 - 1) * (target + 1));
      if (!this.host.walkable(x, y)) continue;
      const d = manhattan(x, y, p.x, p.y);
      if (d === 0) continue;
      // Proche de la distance visée, et derrière le joueur.
      const behind = -((x - p.x) * back.dx + (y - p.y) * back.dy);
      const score = -Math.abs(d - target) * 2 + Math.sign(behind);
      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }
    if (best) {
      this.x = this.fromX = best[0];
      this.y = this.fromY = best[1];
      this.moveT = 1;
    }
    this.phase = 'apparition';
    this.phaseT = 0;
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  pixel(): { px: number; py: number } {
    const t = this.moveT;
    return {
      px: (this.fromX + (this.x - this.fromX) * t) * TILE,
      py: (this.fromY + (this.y - this.fromY) * t) * TILE,
    };
  }

  /** Lumière émise (la sorcière de lumière éclaire la nuit). */
  light(ox: number, oy: number, time: number): Light | null {
    if (this.haunt.behavior !== 'teleporteur' || this.phase === 'eteinte') return null;
    const { px, py } = this.pixel();
    const flicker = this.phase === 'apparition' ? this.phaseT / 0.45 : 1;
    return { x: px + ox + 8, y: py + oy + 4, r: (26 + Math.sin(time * 9) * 2) * flicker };
  }

  render(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number): void {
    const { px, py } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    const shadow = () => {
      ctx.fillStyle = 'rgba(10,6,4,0.35)';
      ctx.fillRect(sx + 3, sy + 14, 10, 2);
    };
    switch (this.haunt.behavior) {
      case 'herbes': {
        if (this.phase === 'attaque') {
          shadow();
          drawCreature(ctx, this.haunt.species, sx + 8, sy + 12 - 4, 32);
          return;
        }
        // Les herbes frémissent au-dessus de la créature.
        const shake = Math.round(Math.sin(time * 26 + this.x) * 1.5);
        ctx.fillStyle = '#d8d070';
        for (const [bx, by] of [[3, 3], [7, 1], [11, 4], [5, 8], [12, 9]]) ctx.fillRect(sx + bx + shake, sy + by, 1, 3);
        ctx.fillStyle = '#5a5420';
        for (const [bx, by] of [[4, 5], [9, 3], [13, 6]]) ctx.fillRect(sx + bx - shake, sy + by, 1, 2);
        return;
      }
      case 'miroir': {
        if (this.submerged()) {
          // Cercles dans l'eau et silhouette trouble sous la surface.
          const r = 3 + ((time * 6) % 5);
          ctx.fillStyle = '#c8e8ff';
          for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2;
            ctx.fillRect(Math.round(sx + 8 + Math.cos(ang) * r), Math.round(sy + 10 + Math.sin(ang) * r * 0.5), 1, 1);
          }
          drawCreature(ctx, this.haunt.species, sx + 8, sy + 14, 32, { alpha: 0.28 });
          return;
        }
        shadow();
        drawCreature(ctx, this.haunt.species, sx + 8, sy + 15, 32, { flip: this.facing === 'droite' });
        return;
      }
      case 'imitateur': {
        shadow();
        if (this.disguised()) {
          ctx.drawImage(characterSprite(this.haunt.disguise!, this.facing, 0), sx, sy - 8);
        } else if (this.phase === 'revelation' || (this.phase === 'chasse' && Math.floor(time * 6) % 7 !== 0)) {
          // Le même passant… sans visage.
          ctx.drawImage(characterSprite({ ...this.haunt.disguise!, faceless: true }, this.facing, this.moveT < 1 ? 1 + (this.stepsTaken % 2) : 0), sx, sy - 8);
        } else {
          drawCreature(ctx, this.haunt.species, sx + 8, sy + 15, 32);
        }
        return;
      }
      case 'teleporteur': {
        if (this.phase === 'eteinte') return;
        const flicker = this.phase === 'apparition' ? Math.floor(this.phaseT * 20) % 2 === 0 : Math.floor(time * 10) % 9 !== 0;
        if (!flicker) return;
        const bob = Math.round(Math.sin(time * 4) * 2);
        drawCreature(ctx, this.haunt.species, sx + 8, sy + 12 + bob, 32);
        return;
      }
      default: {
        if (this.haunt.behavior === 'traqueur' && this.phase === 'rode') return;
        shadow();
        drawCreature(ctx, this.haunt.species, sx + 8, sy + 15, 32, { flip: this.facing === 'droite' });
      }
    }
  }

  /** Yeux luisants, visibles même au plus noir de la nuit. */
  renderEyes(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number): void {
    if (this.haunt.behavior === 'traqueur' && this.phase === 'rode') return;
    if (this.haunt.behavior === 'teleporteur' || this.disguised()) return;
    if (this.haunt.behavior === 'herbes' && Math.floor(time * 0.8 + this.x) % 4 !== 0) return;
    if (this.haunt.behavior === 'statue' && this.watched()) return;
    const { px, py } = this.pixel();
    const sx = Math.round(px + ox);
    const sy = Math.round(py + oy);
    const color = this.haunt.behavior === 'herbes' ? '#f0f040' : this.haunt.behavior === 'miroir' ? '#c8b0ff' : '#ff3a2a';
    const blink = Math.floor(time * 3 + this.x * 7) % 13 === 0;
    if (blink) return;
    const lean = this.facing === 'gauche' ? -2 : this.facing === 'droite' ? 2 : 0;
    ctx.fillStyle = color;
    ctx.fillRect(sx + 5 + lean, sy + 4, 2, 1);
    ctx.fillRect(sx + 9 + lean, sy + 4, 2, 1);
  }
}
