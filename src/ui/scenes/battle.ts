// Scène de combat : rejoue les événements du moteur et propose les actions du joueur.
import { MAX_LEVEL, getSpecies } from '../../data/ginedex';
import { isCaptureItem, type ItemId } from '../../data/items';
import { MOVES, type StatusKind } from '../../data/moves';
import type { Trainer } from '../../data/trainers';
import type { Theme } from '../../data/zones';
import type { Combat, CombatEvent, Outcome, PlayerAction, Side } from '../../engine/combat';
import { displayName, xpForLevel } from '../../engine/creature';
import { removeItem } from '../../engine/gameState';
import { PAL, bar, box, calabash, hpBar, hpColor, statusBadge, text, typeBadge, wrap } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { PLAYER_LOOK, THEMES, characterSprite, drawCreature, shade } from '../sprites';
import { BagScene } from './bag';
import { promptLearnMove } from './learnMove';
import { TeamScene } from './team';

interface SideView {
  speciesId: number;
  name: string;
  level: number;
  hp: number;
  shownHp: number;
  maxHp: number;
  status: StatusKind | null;
  visible: boolean;
}

type Anim = { kind: 'entree' | 'sortie' | 'elan' | 'touche' | 'ko' | 'stat'; side: Side; t: number; duration: number; up?: boolean };

interface CaptureAnim {
  t: number;
  shakes: number;
  success: boolean;
  phase: 'lancer' | 'absorber' | 'secousses' | 'resultat';
}

const MAIN_MENU = ['ATTAQUE', 'SAC', 'ÉQUIPE', 'FUITE'];

export interface BattleOptions {
  theme: Theme;
  trainer?: Trainer;
  onEnd: (outcome: Outcome) => void;
}

export class BattleScene implements Scene {
  readonly opaque = true;
  private queue: CombatEvent[] = [];
  private current: CombatEvent | null = null;
  private wait = 0;
  private busy = false;
  private mode: 'evenements' | 'menu' | 'attaques' | 'fin' = 'evenements';
  private message = '';
  private shown = 0;
  private hold = 0;
  private menuIndex = 0;
  private moveIndex = 0;
  private views: Record<Side, SideView | null> = { joueur: null, adversaire: null };
  private anims: Anim[] = [];
  private xpShown = 0;
  private xpTarget = 0;
  private lastXp = 0;
  private capture: CaptureAnim | null = null;
  private intro = 0;
  private endTimer = 0;
  private ended = false;

  constructor(
    private readonly game: Game,
    private readonly combat: Combat,
    private readonly opts: BattleOptions,
  ) {
    this.queue.push(...combat.start());
  }

  // ── Boucle ─────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.intro = Math.min(1, this.intro + dt * 2.2);
    // Les animations terminées sont retirées après avoir appliqué leur effet final.
    this.anims = this.anims.filter((a) => (a.t += dt / a.duration) < 1 || this.finishAnim(a));
    this.animateBars(dt);
    if (this.capture) this.updateCapture(dt);
    if (this.intro < 1 || this.busy) return;

    if (this.current) {
      this.stepCurrent(dt);
      return;
    }
    if (this.queue.length) {
      this.begin(this.queue.shift()!);
      return;
    }
    if (this.combat.isOver()) {
      this.mode = 'fin';
      this.endTimer += dt;
      if (this.endTimer > 0.5 && !this.ended) this.end();
      return;
    }
    if (this.combat.phase === 'remplacement') {
      this.busy = true;
      this.game.scenes.push(
        new TeamScene(this.game, 'remplacement', {
          combat: this.combat,
          onPick: (index) => {
            this.busy = false;
            this.queue.push(...this.combat.submitReplacement(index));
          },
        }),
      );
      return;
    }
    if (this.mode === 'evenements') {
      this.mode = 'menu';
      this.message = `Que doit faire ${displayName(this.combat.playerActive)} ?`;
      this.shown = this.message.length;
    }
    if (this.mode === 'menu') this.updateMenu();
    else if (this.mode === 'attaques') this.updateMoves();
  }

  private end(): void {
    this.ended = true;
    this.game.scenes.pop(this);
    this.opts.onEnd(this.combat.outcome ?? 'fuite');
  }

  resume(): void {
    this.game.input.consume();
  }

  // ── Événements ─────────────────────────────────────────────────────────

  private begin(event: CombatEvent): void {
    this.current = event;
    this.wait = 0;
    switch (event.type) {
      case 'message':
        this.message = event.text;
        this.shown = 0;
        this.hold = 0;
        break;
      case 'envoi': {
        const species = getSpecies(event.speciesId);
        const j = event.side === 'joueur' ? this.combat.player[event.index] : this.combat.foe[event.index];
        this.views[event.side] = {
          speciesId: event.speciesId,
          name: event.side === 'joueur' ? displayName(j) : species.name,
          level: event.level,
          hp: event.hp,
          shownHp: event.hp,
          maxHp: event.maxHp,
          status: event.status,
          visible: true,
        };
        if (event.side === 'joueur') {
          this.lastXp = j.xp;
          this.xpShown = this.xpTarget = this.xpRatio(j.xp, event.level);
        }
        this.anims.push({ kind: 'entree', side: event.side, t: 0, duration: 0.35 });
        this.wait = 0.4;
        break;
      }
      case 'retrait':
        this.anims.push({ kind: 'sortie', side: event.side, t: 0, duration: 0.3 });
        this.wait = 0.35;
        break;
      case 'attaque':
        this.anims.push({ kind: 'elan', side: event.side, t: 0, duration: 0.3 });
        this.wait = 0.3;
        break;
      case 'pv': {
        const view = this.views[event.side];
        if (view) {
          const delta = event.hp - view.hp;
          view.hp = event.hp;
          view.maxHp = event.maxHp;
          if (delta < 0) {
            this.anims.push({ kind: 'touche', side: event.side, t: 0, duration: 0.4 });
            this.game.sfx(-delta > event.maxHp * 0.4 ? 'superCoup' : 'coup');
          }
          this.wait = Math.min(0.9, Math.max(0.25, (Math.abs(delta) / Math.max(1, event.maxHp)) * 1.5));
        }
        break;
      }
      case 'statut': {
        const view = this.views[event.side];
        if (view) view.status = event.status;
        this.wait = 0.1;
        break;
      }
      case 'stage':
        this.anims.push({ kind: 'stat', side: event.side, t: 0, duration: 0.5, up: event.delta > 0 });
        this.wait = 0.45;
        break;
      case 'ko':
        this.anims.push({ kind: 'ko', side: event.side, t: 0, duration: 0.5 });
        this.game.sfx('ko');
        this.wait = 0.6;
        break;
      case 'xp':
        this.lastXp = event.xp;
        if (event.index === this.combat.playerIndex && this.views.joueur) {
          this.xpTarget = this.xpRatio(event.xp, this.views.joueur.level);
          this.wait = 0.6;
        }
        break;
      case 'niveau':
        if (event.index === this.combat.playerIndex && this.views.joueur) {
          this.views.joueur.level = event.level;
          this.xpShown = 0;
          this.xpTarget = this.xpRatio(this.lastXp, event.level);
        }
        this.game.sfx('niveau');
        this.wait = 0.3;
        break;
      case 'apprentissage': {
        this.busy = true;
        const j = this.combat.player[event.index];
        promptLearnMove(this.game, j, event.moveId, () => {
          this.busy = false;
        });
        break;
      }
      case 'objet':
        this.wait = 0.15;
        break;
      case 'capture':
        this.capture = { t: 0, shakes: event.shakes, success: event.success, phase: 'lancer' };
        this.wait = 0.5 + 0.35 + event.shakes * 0.55 + 0.6;
        break;
      case 'fin':
        this.wait = 0.1;
        break;
    }
  }

  private stepCurrent(dt: number): void {
    const event = this.current!;
    if (event.type === 'message') {
      const input = this.game.input;
      this.shown = Math.min(this.message.length, this.shown + dt * this.game.textSpeed);
      const complete = this.shown >= this.message.length;
      if (input.pressed('a') || input.pressed('b')) {
        if (!complete) this.shown = this.message.length;
        else this.current = null;
        return;
      }
      if (complete) {
        this.hold += dt;
        const delay = this.game.s.options.textSpeed === 'lent' ? 1.6 : this.game.s.options.textSpeed === 'rapide' ? 0.55 : 1;
        if (this.hold >= delay) this.current = null;
      }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) this.current = null;
  }

  private finishAnim(a: Anim): boolean {
    const view = this.views[a.side];
    if (view && (a.kind === 'ko' || a.kind === 'sortie')) view.visible = false;
    return false;
  }

  private animateBars(dt: number): void {
    for (const view of Object.values(this.views)) {
      if (!view) continue;
      const speed = Math.max(view.maxHp * 0.9, 8) * dt;
      if (view.shownHp < view.hp) view.shownHp = Math.min(view.hp, view.shownHp + speed);
      else if (view.shownHp > view.hp) view.shownHp = Math.max(view.hp, view.shownHp - speed);
    }
    if (this.xpShown < this.xpTarget) this.xpShown = Math.min(this.xpTarget, this.xpShown + dt * 1.2);
  }

  private xpRatio(xp: number, level: number): number {
    if (level >= MAX_LEVEL) return 1;
    const lo = xpForLevel(level);
    const hi = xpForLevel(level + 1);
    return Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
  }

  private updateCapture(dt: number): void {
    const c = this.capture!;
    c.t += dt;
    const foe = this.views.adversaire;
    if (c.phase === 'lancer' && c.t > 0.5) {
      c.phase = 'absorber';
      c.t = 0;
    } else if (c.phase === 'absorber' && c.t > 0.35) {
      if (foe) foe.visible = false;
      c.phase = 'secousses';
      c.t = 0;
    } else if (c.phase === 'secousses' && c.t > c.shakes * 0.55) {
      c.phase = 'resultat';
      c.t = 0;
      if (c.success) this.game.sfx('capture');
      else if (foe) foe.visible = true;
    } else if (c.phase === 'resultat' && c.t > 0.6 && !c.success) {
      this.capture = null;
    }
  }

  // ── Menus ──────────────────────────────────────────────────────────────

  private submit(action: PlayerAction): void {
    this.queue.push(...this.combat.submit(action));
    this.mode = 'evenements';
  }

  private updateMenu(): void {
    const input = this.game.input;
    const before = this.menuIndex;
    if (input.pressed('up') || input.pressed('down')) this.menuIndex ^= 2;
    if (input.pressed('left') || input.pressed('right')) this.menuIndex ^= 1;
    if (before !== this.menuIndex) this.game.sfx('curseur');
    if (!input.pressed('a')) return;
    this.game.sfx('valider');
    switch (this.menuIndex) {
      case 0: {
        const active = this.combat.playerActive;
        if (active.moves.every((m) => m.pp <= 0)) this.submit({ kind: 'attaque', moveIndex: -1 });
        else this.mode = 'attaques';
        break;
      }
      case 1:
        this.openBag();
        break;
      case 2:
        this.game.scenes.push(
          new TeamScene(this.game, 'combat', {
            combat: this.combat,
            onPick: (index) => this.submit({ kind: 'changer', partyIndex: index }),
          }),
        );
        break;
      case 3:
        if (this.combat.kind === 'dresseur') {
          this.flash('Impossible de fuir un combat contre un dresseur !');
        } else {
          this.submit({ kind: 'fuite' });
        }
        break;
    }
  }

  /** Message ponctuel sans consommer le tour. */
  private flash(text: string): void {
    this.queue.push({ type: 'message', text });
    this.mode = 'evenements';
  }

  private openBag(): void {
    this.game.scenes.push(
      new BagScene(this.game, 'combat', (item: ItemId) => {
        if (isCaptureItem(item)) {
          if (this.combat.kind === 'dresseur') {
            this.flash('On ne capture pas les Jinémon des autres dresseurs !');
            return;
          }
          removeItem(this.game.s, item);
          this.submit({ kind: 'capture', item });
          return;
        }
        this.game.scenes.push(
          new TeamScene(this.game, 'objet', {
            item,
            onPick: (index) => {
              removeItem(this.game.s, item);
              this.submit({ kind: 'objet', item, partyIndex: index });
            },
          }),
        );
      }),
    );
  }

  private updateMoves(): void {
    const input = this.game.input;
    const moves = this.combat.playerActive.moves;
    const before = this.moveIndex;
    if (input.pressed('up') || input.pressed('down')) this.moveIndex ^= 2;
    if (input.pressed('left') || input.pressed('right')) this.moveIndex ^= 1;
    if (this.moveIndex >= moves.length) this.moveIndex = before < moves.length ? before : 0;
    if (before !== this.moveIndex) this.game.sfx('curseur');
    if (input.pressed('b')) {
      this.game.sfx('retour');
      this.mode = 'menu';
      return;
    }
    if (input.pressed('a')) {
      if (moves[this.moveIndex].pp <= 0) {
        this.game.sfx('erreur');
        return;
      }
      this.game.sfx('valider');
      this.submit({ kind: 'attaque', moveIndex: this.moveIndex });
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx);
    this.renderSide(ctx, 'adversaire');
    this.renderSide(ctx, 'joueur');
    this.renderCapture(ctx);
    this.renderInfo(ctx);
    this.renderBottom(ctx);
    if (this.intro < 1) {
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 1 - this.intro;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const pal = THEMES[this.opts.theme];
    const sky = ctx.createLinearGradient(0, 0, 0, 120);
    const night = this.opts.theme === 'foret' || this.opts.theme === 'falaise';
    sky.addColorStop(0, night ? '#3a4a7a' : '#f0a860');
    sky.addColorStop(1, night ? '#8a7aa8' : '#f8e0a8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 120);
    // Silhouettes lointaines (falaise, acacias)
    ctx.fillStyle = shade(pal.tree, -0.35);
    ctx.beginPath();
    ctx.moveTo(0, 96);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 88 + Math.sin(x * 0.05) * 6 + (x % 60 === 0 ? -8 : 0));
    ctx.lineTo(W, 120);
    ctx.lineTo(0, 120);
    ctx.fill();
    for (const tx of [30, 140, 290]) {
      ctx.fillRect(tx, 70, 2, 22);
      ctx.beginPath();
      ctx.ellipse(tx + 1, 70, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = pal.grass;
    ctx.fillRect(0, 100, W, 140);
    ctx.fillStyle = shade(pal.grass, -0.08);
    for (let y = 110; y < H; y += 12) ctx.fillRect(0, y, W, 2);
    // Socles
    for (const [x, y, rx] of [
      [232, 98, 50],
      [82, 166, 58],
    ] as const) {
      ctx.fillStyle = shade(pal.ground, -0.25);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.ground;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, rx - 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dresseur adverse et joueur visibles tant que leurs Jinémon ne sont pas envoyés.
    if (this.opts.trainer && !this.views.adversaire) {
      ctx.drawImage(characterSprite(this.opts.trainer.look, 'bas', 0), 216, 34, 32, 40);
    }
    if (!this.views.joueur) {
      ctx.drawImage(characterSprite(PLAYER_LOOK, 'haut', 0), 66, 118, 32, 40);
    }
  }

  private animOf(side: Side): Anim | undefined {
    return this.anims.find((a) => a.side === side);
  }

  private renderSide(ctx: CanvasRenderingContext2D, side: Side): void {
    const view = this.views[side];
    if (!view || !view.visible) return;
    const player = side === 'joueur';
    let x = player ? 82 : 232;
    let y = player ? 166 : 98;
    let alpha = 1;
    let white = 0;
    const a = this.animOf(side);
    if (a) {
      const t = Math.min(1, a.t);
      switch (a.kind) {
        case 'entree':
          x += (player ? -1 : 1) * (1 - t) * 140;
          white = 1 - t;
          break;
        case 'sortie':
          white = t;
          alpha = 1 - t;
          break;
        case 'elan':
          x += (player ? 1 : -1) * Math.sin(t * Math.PI) * 14;
          break;
        case 'touche':
          if (Math.floor(t * 8) % 2 === 0) alpha = 0.25;
          x += Math.sin(t * 40) * 2;
          break;
        case 'ko':
          y += t * 30;
          alpha = 1 - t;
          break;
        case 'stat':
          break;
      }
    }
    drawCreature(ctx, view.speciesId, x, y, player ? 84 : 72, { flip: player, alpha, white });
    if (a?.kind === 'stat') {
      const t = Math.min(1, a.t);
      ctx.fillStyle = a.up ? 'rgba(255,120,60,0.85)' : 'rgba(80,140,255,0.85)';
      for (let i = 0; i < 4; i++) {
        const ax = x - 24 + i * 16;
        const ay = y - 20 - (a.up ? t * 30 : (1 - t) * 30) - (i % 2) * 8;
        ctx.beginPath();
        if (a.up) {
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + 5, ay + 6);
          ctx.lineTo(ax - 5, ay + 6);
        } else {
          ctx.moveTo(ax, ay + 6);
          ctx.lineTo(ax + 5, ay);
          ctx.lineTo(ax - 5, ay);
        }
        ctx.fill();
      }
    }
  }

  private renderCapture(ctx: CanvasRenderingContext2D): void {
    const c = this.capture;
    if (!c) return;
    const tx = 232;
    const ty = 88;
    if (c.phase === 'lancer') {
      const t = Math.min(1, c.t / 0.5);
      const x = 70 + (tx - 70) * t;
      const y = 150 + (ty - 150) * t - Math.sin(t * Math.PI) * 60;
      calabash(ctx, x, y, 6);
      return;
    }
    if (c.phase === 'absorber') {
      const t = Math.min(1, c.t / 0.35);
      ctx.fillStyle = `rgba(255,240,180,${0.8 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(tx, ty - 10, 30 * (1 - t) + 6, 0, Math.PI * 2);
      ctx.fill();
      calabash(ctx, tx, ty, 6);
      return;
    }
    let angle = 0;
    if (c.phase === 'secousses') {
      const local = (c.t % 0.55) / 0.55;
      angle = local < 0.5 ? Math.sin(local * Math.PI * 4) * 0.4 : 0;
    }
    ctx.save();
    ctx.translate(tx, ty + 6);
    ctx.rotate(angle);
    calabash(ctx, 0, -6, 6);
    ctx.restore();
    if (c.phase === 'resultat' && c.success) {
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + c.t * 3;
        ctx.fillRect(tx + Math.cos(a) * 16 - 1, ty - 4 + Math.sin(a) * 10 - 1, 3, 3);
      }
    }
  }

  private renderInfo(ctx: CanvasRenderingContext2D): void {
    const foe = this.views.adversaire;
    if (foe && (foe.visible || this.capture)) {
      box(ctx, 8, 10, 146, 40);
      text(ctx, foe.name, 16, 16, { size: 10, bold: true });
      text(ctx, `Niv.${foe.level}`, 146, 17, { size: 8, align: 'right' });
      hpBar(ctx, 16, 34, 106, foe.shownHp / foe.maxHp);
      if (foe.status) statusBadge(ctx, foe.status, 124, 31);
      if (this.combat.kind === 'dresseur') this.partyDots(ctx, this.combat.foe, 18, 4);
      else if (this.game.s.dex.caught.includes(foe.speciesId)) calabash(ctx, 140, 34, 3);
    }
    const me = this.views.joueur;
    if (me && me.visible) {
      box(ctx, 166, 116, 148, 52);
      text(ctx, me.name, 174, 122, { size: 10, bold: true });
      text(ctx, `Niv.${me.level}`, 306, 123, { size: 8, align: 'right' });
      hpBar(ctx, 174, 140, 132, me.shownHp / me.maxHp);
      text(ctx, `${Math.ceil(me.shownHp)} / ${me.maxHp}`, 306, 146, { size: 8, align: 'right' });
      if (me.status) statusBadge(ctx, me.status, 174, 146);
      text(ctx, 'XP', 174, 157, { size: 6, bold: true, color: PAL.xp });
      bar(ctx, 186, 159, 120, 2, this.xpShown, PAL.xp);
      this.partyDots(ctx, this.combat.player, 172, 108);
    }
  }

  private partyDots(ctx: CanvasRenderingContext2D, team: { hp: number }[], x: number, y: number): void {
    team.forEach((j, i) => {
      ctx.fillStyle = PAL.ink;
      ctx.beginPath();
      ctx.arc(x + i * 9, y + 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = j.hp > 0 ? '#d8a040' : '#6a5a4a';
      ctx.beginPath();
      ctx.arc(x + i * 9, y + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderBottom(ctx: CanvasRenderingContext2D): void {
    if (this.mode === 'attaques') {
      this.renderMoves(ctx);
      return;
    }
    const menu = this.mode === 'menu';
    box(ctx, 4, 178, menu ? 170 : 312, 58);
    const rows = wrap(ctx, this.message, menu ? 148 : 288, 10);
    let remaining = Math.floor(this.shown);
    rows.slice(0, 3).forEach((row, i) => {
      text(ctx, row.slice(0, Math.max(0, remaining)), 16, 188 + i * 14, { size: 10 });
      remaining -= row.length + 1;
    });
    if (!menu) return;
    box(ctx, 176, 178, 140, 58);
    MAIN_MENU.forEach((label, i) => {
      const x = 188 + (i % 2) * 64;
      const y = 190 + Math.floor(i / 2) * 22;
      const disabled = i === 3 && this.combat.kind === 'dresseur';
      text(ctx, label, x + 8, y, { size: 10, bold: i === this.menuIndex, color: disabled ? PAL.grey : PAL.ink });
      if (i === this.menuIndex) {
        ctx.fillStyle = PAL.rust;
        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + 5, y + 5);
        ctx.lineTo(x, y + 9);
        ctx.fill();
      }
    });
  }

  private renderMoves(ctx: CanvasRenderingContext2D): void {
    const moves = this.combat.playerActive.moves;
    box(ctx, 4, 178, 216, 58);
    moves.forEach((slot, i) => {
      const x = 14 + (i % 2) * 102;
      const y = 189 + Math.floor(i / 2) * 22;
      const move = MOVES[slot.id];
      const color = slot.pp <= 0 ? PAL.grey : PAL.ink;
      text(ctx, move.name, x + 9, y, { size: 9, bold: i === this.moveIndex, color });
      if (i === this.moveIndex) {
        ctx.fillStyle = PAL.rust;
        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + 5, y + 5);
        ctx.lineTo(x, y + 9);
        ctx.fill();
      }
    });
    box(ctx, 222, 178, 94, 58);
    const slot = moves[this.moveIndex];
    if (!slot) return;
    const move = MOVES[slot.id];
    const ratio = slot.pp / move.pp;
    text(ctx, 'PP', 232, 187, { size: 9, bold: true, color: PAL.rust });
    text(ctx, `${slot.pp} / ${move.pp}`, 306, 187, { size: 9, align: 'right', color: ratio > 0.25 ? PAL.ink : hpColor(0.1) });
    typeBadge(ctx, move.type, 232, 202, 74);
    text(ctx, move.power > 0 ? `Puiss. ${move.power}  Préc. ${move.accuracy}` : `Statut  Préc. ${move.accuracy}`, 269, 219, {
      size: 7,
      align: 'center',
    });
  }
}
