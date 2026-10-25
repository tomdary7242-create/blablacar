// Scène de combat : rejoue les événements du moteur et propose les actions du joueur.
import { MAX_LEVEL, getSpecies } from '../../data/ginedex';
import { isCaptureItem, type ItemId } from '../../data/items';
import { MOVES, type StatusKind } from '../../data/moves';
import type { Trainer } from '../../data/trainers';
import type { ElementType } from '../../data/types';
import type { Theme } from '../../data/zones';
import type { Combat, CombatEvent, Outcome, PlayerAction, Side } from '../../engine/combat';
import { isNight } from '../../engine/clock';
import { displayName, xpForLevel } from '../../engine/creature';
import { removeItem } from '../../engine/gameState';
import { PAL, bar, box, calabash, cursor, fillEllipse, hpBar, stamp, statusBadge, text, typeBadge } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { battleBackdrop } from '../backdrops';
import { drawMoveEffect } from '../effects';
import { PLAYER_LOOK, characterSprite, drawCreature } from '../sprites';
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
  /** Effets d'attaque en cours, joués sur la cible. */
  private effects: Array<{ type: ElementType; side: Side; t: number; duration: number }> = [];
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
    this.effects = this.effects.filter((e) => (e.t += dt / e.duration) < 1);
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
      case 'attaque': {
        this.anims.push({ kind: 'elan', side: event.side, t: 0, duration: 0.3 });
        this.wait = 0.3;
        if (event.moveId) {
          // L'effet vise le lanceur pour les soins et les renforcements, l'adversaire sinon.
          const move = MOVES[event.moveId];
          const self = move.power === 0 && !move.status && (move.heal || move.stages?.every((st) => st.target === 'self'));
          const target: Side = self ? event.side : event.side === 'joueur' ? 'adversaire' : 'joueur';
          this.effects.push({ type: move.type, side: target, t: -0.4, duration: 0.75 });
          this.wait = 0.95;
        }
        break;
      }
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
    for (const e of this.effects) {
      if (e.t < 0) continue;
      const player = e.side === 'joueur';
      drawMoveEffect(ctx, e.type, player ? 66 : 186, player ? 112 : 60, e.t);
    }
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
    ctx.drawImage(battleBackdrop(this.opts.theme, isNight(this.game.s.clock)), 0, 0);
    if (this.opts.trainer && !this.views.adversaire) {
      ctx.drawImage(characterSprite(this.opts.trainer.look, 'bas', 0), 170, 38, 32, 48);
    }
    if (!this.views.joueur) {
      ctx.drawImage(characterSprite(PLAYER_LOOK, 'haut', 0), 50, 94, 32, 48);
    }
  }

  private animOf(side: Side): Anim | undefined {
    return this.anims.find((a) => a.side === side);
  }

  private renderSide(ctx: CanvasRenderingContext2D, side: Side): void {
    const view = this.views[side];
    if (!view || !view.visible) return;
    const player = side === 'joueur';
    let x = player ? 66 : 186;
    let y = player ? 142 : 86;
    let alpha = 1;
    let white = 0;
    const a = this.animOf(side);
    if (a) {
      const t = Math.min(1, a.t);
      switch (a.kind) {
        case 'entree':
          x += (player ? -1 : 1) * (1 - t) * 120;
          white = 1 - t;
          break;
        case 'sortie':
          white = t;
          alpha = 1 - t;
          break;
        case 'elan':
          x += (player ? 1 : -1) * Math.round(Math.sin(t * Math.PI) * 12);
          break;
        case 'touche':
          if (Math.floor(t * 8) % 2 === 0) alpha = 0;
          break;
        case 'ko':
          y += Math.round(t * 28);
          alpha = 1 - t;
          break;
        case 'stat':
          break;
      }
    }
    drawCreature(ctx, view.speciesId, Math.round(x), Math.round(y), player ? 72 : 64, { back: player, alpha, white });
    if (a?.kind === 'stat') {
      const t = Math.min(1, a.t);
      const color = a.up ? '#f87838' : '#4890f8';
      for (let i = 0; i < 4; i++) {
        const ax = Math.round(x - 22 + i * 14);
        const ay = Math.round(y - 20 - (a.up ? t * 28 : (1 - t) * 28) - (i % 2) * 8);
        stamp(ctx, a.up ? ['..#..', '.###.', '#####'] : ['#####', '.###.', '..#..'], ax, ay, { '#': color });
      }
    }
  }

  private renderCapture(ctx: CanvasRenderingContext2D): void {
    const c = this.capture;
    if (!c) return;
    const tx = 186;
    const ty = 70;
    if (c.phase === 'lancer') {
      const t = Math.min(1, c.t / 0.5);
      const x = 60 + (tx - 60) * t;
      const y = 128 + (ty - 128) * t - Math.sin(t * Math.PI) * 50;
      calabash(ctx, Math.round(x), Math.round(y), 2);
      return;
    }
    if (c.phase === 'absorber') {
      const t = Math.min(1, c.t / 0.35);
      fillEllipse(ctx, tx, ty - 8, Math.round(26 * (1 - t)) + 4, Math.round(22 * (1 - t)) + 4, '#fff4c0');
      calabash(ctx, tx, ty, 2);
      return;
    }
    let dx = 0;
    if (c.phase === 'secousses') {
      const local = (c.t % 0.55) / 0.55;
      dx = local < 0.5 ? Math.round(Math.sin(local * Math.PI * 4) * 2) : 0;
    }
    calabash(ctx, tx + dx, ty + 8, 2);
    if (c.phase === 'resultat' && c.success) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + c.t * 3;
        stamp(ctx, ['.#.', '###', '.#.'], Math.round(tx + Math.cos(a) * 16) - 1, Math.round(ty + 4 + Math.sin(a) * 10) - 1, { '#': '#ffe066' });
      }
    }
  }

  private renderInfo(ctx: CanvasRenderingContext2D): void {
    const foe = this.views.adversaire;
    if (foe && (foe.visible || this.capture)) {
      box(ctx, 4, 8, 118, 38);
      text(ctx, foe.name, 12, 10, { shadow: PAL.shadow });
      text(ctx, `N.${foe.level}`, 114, 10, { align: 'right' });
      hpBar(ctx, 12, 26, 102, foe.shownHp / foe.maxHp);
      if (foe.status) statusBadge(ctx, foe.status, 90, 32);
      if (this.combat.kind === 'dresseur') this.partyDots(ctx, this.combat.foe, 14, 36);
      else if (this.game.s.dex.caught.includes(foe.speciesId)) calabash(ctx, 16, 38, 1);
    }
    const me = this.views.joueur;
    if (me && me.visible) {
      box(ctx, 132, 92, 122, 48);
      text(ctx, me.name, 140, 94, { shadow: PAL.shadow });
      text(ctx, `N.${me.level}`, 246, 94, { align: 'right' });
      hpBar(ctx, 140, 110, 106, me.shownHp / me.maxHp);
      text(ctx, `${Math.ceil(me.shownHp)}/${me.maxHp}`, 246, 114, { align: 'right' });
      if (me.status) statusBadge(ctx, me.status, 140, 117);
      stamp(ctx, ['#.#.###', '.#..#.#', '#.#.###', '....#..'], 140, 129, { '#': PAL.xp });
      bar(ctx, 150, 130, 96, 2, this.xpShown, PAL.xp);
    }
  }

  private partyDots(ctx: CanvasRenderingContext2D, team: { hp: number }[], x: number, y: number): void {
    team.forEach((j, i) => {
      fillEllipse(ctx, x + i * 8, y, 3, 3, PAL.ink);
      fillEllipse(ctx, x + i * 8, y, 2, 2, j.hp > 0 ? '#e8a838' : '#6a5a4a');
    });
  }

  private renderBottom(ctx: CanvasRenderingContext2D): void {
    if (this.mode === 'attaques') {
      this.renderMoves(ctx);
      return;
    }
    const menu = this.mode === 'menu';
    box(ctx, 2, 144, menu ? 140 : 252, 46);
    const rows = wrapText(this.message, menu ? 120 : 230);
    let remaining = Math.floor(this.shown);
    rows.slice(0, 3).forEach((row, i) => {
      text(ctx, row.slice(0, Math.max(0, remaining)), 12, 149 + i * 12, { shadow: PAL.shadow });
      remaining -= row.length + 1;
    });
    if (!menu) return;
    box(ctx, 142, 144, 112, 46);
    MAIN_MENU.forEach((label, i) => {
      const x = 152 + (i % 2) * 52;
      const y = 152 + Math.floor(i / 2) * 15;
      const disabled = i === 3 && this.combat.kind === 'dresseur';
      text(ctx, label, x + 7, y, { color: disabled ? PAL.grey : PAL.ink, shadow: disabled ? undefined : PAL.shadow });
      if (i === this.menuIndex) cursor(ctx, x, y + 2);
    });
  }

  private renderMoves(ctx: CanvasRenderingContext2D): void {
    const moves = this.combat.playerActive.moves;
    box(ctx, 2, 144, 252, 46);
    moves.forEach((slot, i) => {
      const x = 12 + (i % 2) * 120;
      const y = 152 + Math.floor(i / 2) * 15;
      const move = MOVES[slot.id];
      text(ctx, move.name, x + 7, y, { color: slot.pp <= 0 ? PAL.grey : PAL.ink, shadow: PAL.shadow });
      if (i === this.moveIndex) cursor(ctx, x, y + 2);
    });
    const slot = moves[this.moveIndex];
    if (!slot) return;
    const move = MOVES[slot.id];
    box(ctx, 160, 112, 94, 31);
    text(ctx, 'PP', 168, 114, { color: PAL.rust });
    text(ctx, `${slot.pp}/${move.pp}`, 246, 114, { align: 'right', color: slot.pp / move.pp > 0.25 ? PAL.ink : PAL.hpRed });
    typeBadge(ctx, move.type, 168, 127, 40);
    text(ctx, move.power > 0 ? `P.${move.power}` : 'Statut', 246, 127, { align: 'right' });
  }
}
