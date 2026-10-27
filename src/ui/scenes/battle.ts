// Scène de combat : rejoue les événements du moteur avec des animations soignées
// (chorégraphies d'attaque, impacts, dégâts affichés, altérations visibles) et propose
// les actions du joueur.
import { MAX_LEVEL, getSpecies } from '../../data/ginedex';
import { isCaptureItem, type ItemId } from '../../data/items';
import { MOVES, type MoveId, type StatKey, type StatusKind } from '../../data/moves';
import type { CharacterLook, Trainer } from '../../data/trainers';
import type { Theme } from '../../data/zones';
import type { Combat, CombatEvent, Outcome, PlayerAction, Side } from '../../engine/combat';
import { isNight } from '../../engine/clock';
import { displayName, isShiny, maxHp, xpForLevel } from '../../engine/creature';
import { itemCount, removeItem } from '../../engine/gameState';
import {
  ACTION_HINTS,
  ACTION_LABELS,
  Duel,
  heroFighter,
  monsterFighter,
  setHeroHp,
  type DuelBlow,
  type DuelEvent,
  type DuelKind,
  type DuelOutcome,
  type Fighter,
} from '../../engine/hero';
import { battleBackdrop } from '../backdrops';
import { MoveAnim, type Anchor, type FxHost, type Pose } from '../battle/moveFx';
import { fighterSprite, type FighterPose } from '../fighters';
import { Particles, rnd } from '../battle/particles';
import { PAL, bar, box, calabash, cursor, fillEllipse, hpBar, stamp, statusBadge, text, typeBadge } from '../draw';
import { drawOutlinedText, wrapText } from '../font';
import type { Game } from '../game';
import type { TrackId } from '../musicScore';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { creatureMotion } from '../creatures';
import { PLAYER_LOOK, characterSprite, drawCreatureFx, drawSpriteFx, type CreatureFx } from '../sprites';
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
  /** Couleurs rares : scintille à son entrée. */
  shiny: boolean;
  /** Temps écoulé depuis l'entrée (pour l'éclat chatoyant). */
  since: number;
  /** PV « fantômes » : la part perdue reste visible un instant sur la barre. */
  ghostHp: number;
  ghostWait: number;
  /** Temps depuis le dernier coup reçu (éclair blanc, clignotement). */
  hit: number;
  /** Recul après un coup (px), qui s'amortit. */
  knock: number;
  /** Teinte passagère (soin, poison…) et sa force restante. */
  tint: string;
  tintT: number;
  /** Rythme des effets d'altération (Z du sommeil, bulles de poison…). */
  statusClock: number;
  /** Un humain (le héros, un bandit) plutôt qu'un Jinémon. */
  fighter?: { look: CharacterLook; facing: 'face' | 'dos'; pose: FighterPose };
}

/** Événements du duel (côté « heros » = côté joueur) et étapes de mise en scène. */
type StageEvent =
  | { type: 'duel-coup'; side: Side; blow: DuelBlow }
  | { type: 'duel-pv'; side: Side; hp: number; maxHp: number; damage: number; critical: boolean; blocked: boolean }
  | { type: 'duel-garde'; side: Side }
  | { type: 'duel-fin'; outcome: DuelOutcome }
  /** Étape scriptée : renvoie le temps à attendre avant la suite. */
  | { type: 'script'; run: () => number };
type SceneEvent = CombatEvent | StageEvent;

export type Verdict = 'achever' | 'epargner';

/** Ce qui s'est passé après le combat des Jinémon : duel du héros et sort du bandit. */
export interface BattleEnd {
  duel?: DuelOutcome;
  verdict?: Verdict;
}

/** Chorégraphies (voir moveFx) prêtées aux coups des humains et des monstres. */
const BLOW_FX: Record<DuelBlow, MoveId | null> = {
  frapper: 'coupDePatte',
  assommer: 'chargeBrousse',
  parer: null,
  fuir: null,
  machette: 'lameFerForge',
  coupBas: 'larcin',
  griffes: 'embuscadeNocturne',
  devorer: 'crocsNuit',
};

type AnimKind =
  | 'entree'
  | 'emergence'
  | 'liberation'
  | 'sortie'
  | 'ko'
  | 'esquive'
  | 'stat'
  | 'niveau'
  /** Un humain entre en scène en marchant (depuis le bord de l'écran). */
  | 'arrivee'
  /** Le héros s'enfuit, ou le bandit détale. */
  | 'depart'
  /** Une Hantise surgit, immense, puis recule à sa place. */
  | 'surgir'
  /** Un volant tombe du ciel et s'écrase devant vous. */
  | 'chute';
interface Anim {
  kind: AnimKind;
  side: Side;
  t: number;
  duration: number;
  up?: boolean;
  fired?: boolean;
}

interface Floater {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
  scale: number;
  /** Étiquette (« CRITIQUE ! ») plutôt que nombre. */
  label?: boolean;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  duration: number;
  color: string;
  r: number;
}

interface Timed {
  color: string;
  alpha: number;
  t: number;
  duration: number;
}

interface CaptureAnim {
  t: number;
  shakes: number;
  success: boolean;
  phase: 'lancer' | 'absorber' | 'secousses' | 'resultat';
  shakeIndex: number;
}

const MAIN_MENU = ['ATTAQUE', 'SAC', 'ÉQUIPE', 'FUITE'];
const STAT_SHORT: Record<StatKey, string> = { attack: 'ATQ', defense: 'DÉF', speed: 'VIT' };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - (1 - t) * (1 - t);

export interface BattleOptions {
  theme: Theme;
  trainer?: Trainer;
  music: TrackId;
  /** Bandit : quand ses Jinémon sont à terre, le héros doit le mettre à terre lui-même. */
  bandit?: { foe: Fighter };
  /** La nuit : si toute l'équipe tombe, le monstre s'en prend au héros. */
  prey?: boolean;
  /** Apparition terrifiante : surgie des ténèbres (Hantises), ou tombée du ciel (créatures volantes). */
  entrance?: 'surgir' | 'chute';
  onEnd: (outcome: Outcome, end: BattleEnd) => void;
}

export class BattleScene implements Scene {
  readonly opaque = true;
  private queue: SceneEvent[] = [];
  private current: SceneEvent | null = null;
  private wait = 0;
  /** Les événements suivants attendent que l'attaque en cours touche sa cible. */
  private gate = 0;
  private dismiss = false;
  /** Le message en cours annonce une attaque : il cède la place aux dégâts dès l'impact. */
  private moveMessage = false;
  private busy = false;
  private mode: 'evenements' | 'menu' | 'attaques' | 'fin' | 'duel' | 'verdict' = 'evenements';
  /** Corps-à-corps du héros (contre le bandit, ou le monstre de la nuit). */
  private duel: Duel | null = null;
  private duelIndex = 0;
  private verdict: Verdict | null = null;
  private verdictIndex = 1;
  /** Terreur : l'écran s'assombrit et rougit quand le monstre s'en prend au héros (0 à 1). */
  private dread = 0;
  private dreadBeat = 0;
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
  private time = 0;

  // ── Effets ─────────────────────────────────────────────────────────────
  private readonly particles = new Particles();
  private moves: MoveAnim[] = [];
  private floaters: Floater[] = [];
  private rings: Ring[] = [];
  private shakeAmp = 0;
  private shakeT = 0;
  private shakeDur = 0;
  /** Arrêt sur image à l'impact (s). */
  private hitStop = 0;
  private flashFx: Timed | null = null;
  private veilFx: Timed | null = null;
  private warpFx: { amount: number; t: number; duration: number } | null = null;
  private readonly host: FxHost = {
    particles: this.particles,
    anchor: (side) => this.anchor(side),
    shake: (amplitude, duration) => this.addShake(amplitude, duration),
    flash: (color, alpha, duration) => (this.flashFx = { color, alpha, t: 0, duration }),
    veil: (color, alpha, duration) => (this.veilFx = { color, alpha, t: 0, duration }),
    warp: (amount, duration) => (this.warpFx = { amount, t: 0, duration }),
    sound: (kind) => this.game.audio.fx(kind),
    dark: () => isNight(this.game.s.clock) || this.opts.theme === 'grotte' || this.dread > 0 || (!!this.veilFx && this.veilFx.alpha >= 0.3),
  };

  constructor(
    private readonly game: Game,
    private readonly combat: Combat,
    private readonly opts: BattleOptions,
  ) {
    this.queue.push(...combat.start());
  }

  get music(): TrackId | null {
    // Seul le cœur bat quand le monstre se tourne vers vous.
    if (this.duel?.kind === 'monstre') return null;
    if (this.verdict === 'achever') return null;
    if (this.opts.trainer && this.combat.isOver() && this.combat.outcome === 'victoire' && (!this.opts.bandit || this.verdict)) return 'victoire';
    return this.opts.music;
  }

  /** Repères d'un Jinémon à l'écran (pied, centre, tête). */
  private anchor(side: Side): Anchor {
    const player = side === 'joueur';
    const size = player ? 72 : 64;
    const foot = player ? { x: 66, y: 142 } : { x: 186, y: 86 };
    return {
      foot,
      size,
      center: { x: foot.x, y: foot.y - size * 0.45 },
      head: { x: foot.x + (player ? 4 : -6), y: foot.y - size * 0.68 },
    };
  }

  // ── Boucle ─────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.time += dt;
    this.updateShake(dt);
    this.updateDread(dt);
    // À l'impact, tout se fige un instant : le coup « porte ».
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.intro = Math.min(1, this.intro + dt * 2.2);
    // Les animations terminées sont retirées après avoir appliqué leur effet final.
    this.anims = this.anims.filter((a) => (a.t += dt / a.duration) < 1 || this.finishAnim(a));
    this.updateAnims();
    for (const m of this.moves) m.update(dt);
    this.moves = this.moves.filter((m) => !m.finished);
    this.particles.update(dt);
    this.updateEffects(dt);
    this.animateBars(dt);
    if (this.capture) this.updateCapture(dt);
    this.gate = Math.max(0, this.gate - dt);
    if (this.intro < 1 || this.busy) return;

    if (this.current) {
      this.stepCurrent(dt);
      return;
    }
    if (this.queue.length) {
      if (this.gate <= 0) this.begin(this.queue.shift()!);
      return;
    }
    if (this.moves.length && this.combat.isOver()) return;
    if (this.combat.isOver()) {
      if (this.duelStage()) return;
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
    this.opts.onEnd(this.combat.outcome ?? 'fuite', { duel: this.duel?.outcome ?? undefined, verdict: this.verdict ?? undefined });
  }

  resume(): void {
    this.game.input.consume();
  }

  // ── Événements ─────────────────────────────────────────────────────────

  private begin(event: SceneEvent): void {
    this.current = event;
    this.wait = 0;
    switch (event.type) {
      case 'message':
        this.message = event.text;
        this.shown = 0;
        this.hold = 0;
        this.dismiss = false;
        // « X utilise Y ! » s'affiche pendant que l'attaque se joue.
        this.moveMessage = false;
        if (this.queue[0]?.type === 'attaque') {
          this.startMove(this.queue.shift() as Extract<CombatEvent, { type: 'attaque' }>);
          this.moveMessage = true;
        }
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
          shiny: isShiny(j),
          since: 0,
          ghostHp: event.hp,
          ghostWait: 0,
          hit: 9,
          knock: 0,
          tint: '#ffffff',
          tintT: 0,
          statusClock: 0,
        };
        if (event.side === 'joueur') {
          this.lastXp = j.xp;
          this.xpShown = this.xpTarget = this.xpRatio(j.xp, event.level);
        }
        // Un Jinémon sauvage surgit des herbes ; les autres sortent de leur calebasse.
        const wild = event.side === 'adversaire' && this.combat.kind === 'sauvage';
        if (event.side === 'adversaire') this.capture = null;
        if (wild && this.opts.entrance) {
          const duration = this.opts.entrance === 'chute' ? 1.1 : 1.3;
          this.anims.push({ kind: this.opts.entrance, side: event.side, t: 0, duration });
          if (this.opts.entrance === 'chute') this.game.audio.night('chute', 0.8, 0.3);
          this.wait = duration;
          break;
        }
        this.anims.push({ kind: wild ? 'emergence' : 'entree', side: event.side, t: 0, duration: wild ? 0.9 : 0.85 });
        if (!wild) this.game.audio.fx('lancer');
        this.wait = 0.9;
        break;
      }
      case 'retrait':
        this.anims.push({ kind: 'sortie', side: event.side, t: 0, duration: 0.45 });
        this.game.audio.fx('magie');
        this.wait = 0.5;
        break;
      case 'attaque':
        this.startMove(event);
        this.current = null;
        break;
      case 'rate': {
        this.anims.push({ kind: 'esquive', side: event.side, t: 0, duration: 0.4 });
        const a = this.anchor(event.side);
        this.floaters.push({ text: 'Raté !', x: a.center.x, y: a.head.y - 6, t: 0, color: '#e8e0d0', scale: 1, label: true });
        this.game.audio.fx('esquive');
        this.wait = 0.4;
        break;
      }
      case 'confus': {
        this.burstAround(event.side, 'etoile', ['#ffffff', '#f8e070'], 10);
        const a = this.anchor(event.side);
        this.floaters.push({ text: 'Confus !', x: a.center.x, y: a.head.y - 10, t: 0, color: '#f070c0', scale: 1, label: true });
        this.game.audio.fx('magie');
        this.wait = 0.35;
        break;
      }
      case 'pv':
        this.onHp(event);
        break;
      case 'statut': {
        const view = this.views[event.side];
        if (view) {
          const before = view.status;
          view.status = event.status;
          if (event.status && event.status !== before) this.statusBurst(event.side, event.status);
          else if (!event.status && before) this.burstAround(event.side, 'etoile', ['#ffffff', '#c8f8c0'], 10);
        }
        this.wait = event.status ? 0.45 : 0.2;
        break;
      }
      case 'stage': {
        this.anims.push({ kind: 'stat', side: event.side, t: 0, duration: 0.75, up: event.delta > 0 });
        const a = this.anchor(event.side);
        const arrows = (event.delta > 0 ? '↑' : '↓').repeat(Math.min(2, Math.abs(event.delta)));
        this.floaters.push({ text: `${STAT_SHORT[event.stat]} ${arrows}`, x: a.center.x, y: a.head.y - 4, t: 0, color: event.delta > 0 ? '#ff9040' : '#68a8ff', scale: 1, label: true });
        this.game.audio.fx(event.delta > 0 ? 'buff' : 'debuff');
        this.wait = 0.55;
        break;
      }
      case 'ko': {
        this.anims.push({ kind: 'ko', side: event.side, t: 0, duration: 0.85 });
        if (this.views[event.side]) this.game.audio.cry(this.views[event.side]!.speciesId, 0.72);
        this.game.sfx('ko');
        this.wait = 0.9;
        break;
      }
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
          this.anims.push({ kind: 'niveau', side: 'joueur', t: 0, duration: 1.1 });
          const a = this.anchor('joueur');
          this.floaters.push({ text: `NIVEAU ${event.level} !`, x: a.center.x + 10, y: a.head.y - 8, t: 0, color: '#ffe060', scale: 1, label: true });
        }
        this.game.sfx('niveau');
        this.wait = 0.5;
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
        this.capture = { t: 0, shakes: event.shakes, success: event.success, phase: 'lancer', shakeIndex: -1 };
        this.game.audio.fx('lancer');
        this.wait = 0.5 + 0.35 + event.shakes * 0.55 + 0.6;
        break;
      case 'fin':
        this.wait = 0.1;
        break;
      case 'duel-coup':
        this.duelBlow(event.side, event.blow);
        break;
      case 'duel-pv':
        this.duelHit(event);
        break;
      case 'duel-garde': {
        const a = this.anchor(event.side);
        this.rings.push({ x: a.center.x, y: a.center.y, t: 0, duration: 0.4, color: '#80b8ff', r: 30 });
        this.floaters.push({ text: 'EN GARDE', x: a.center.x, y: a.head.y - 6, t: 0, color: '#a8d0ff', scale: 1, label: true });
        this.game.audio.fx('buff');
        this.wait = 0.4;
        break;
      }
      case 'duel-fin':
        this.duelEnd(event.outcome);
        break;
      case 'script':
        this.wait = event.run();
        break;
    }
  }

  /** Lance la chorégraphie d'une attaque ; la suite attend que le coup porte. */
  private startMove(event: Extract<CombatEvent, { type: 'attaque' }>): void {
    let target: Side = event.side === 'joueur' ? 'adversaire' : 'joueur';
    if (event.moveId) {
      // Les soins et les renforcements se jouent sur le lanceur.
      const move = MOVES[event.moveId];
      const self = move.power === 0 && !move.status && (move.heal || move.stages?.every((st) => st.target === 'self'));
      if (self) target = event.side;
    }
    const anim = new MoveAnim(this.host, event.moveId, event.side, target);
    if (this.queue[0]?.type === 'rate') anim.missed = true;
    this.moves.push(anim);
    this.gate = Math.max(this.gate, anim.impact);
  }

  /** Les PV changent : coup, contrecoup, poison, soin… chaque cause a sa réaction. */
  private onHp(event: Extract<CombatEvent, { type: 'pv' }>): void {
    const view = this.views[event.side];
    if (!view) return;
    const delta = event.hp - view.hp;
    const previous = view.hp;
    view.hp = event.hp;
    view.maxHp = event.maxHp;
    this.wait = Math.min(0.9, Math.max(0.25, (Math.abs(delta) / Math.max(1, event.maxHp)) * 1.5));
    if (delta === 0) return;
    const a = this.anchor(event.side);
    if (delta < 0) {
      view.ghostHp = Math.max(view.ghostHp, previous);
      view.ghostWait = 0.45;
      const lost = -delta;
      const frac = lost / Math.max(1, event.maxHp);
      switch (event.cause) {
        case 'poison':
          view.tint = '#a040d0';
          view.tintT = 1;
          view.hit = 0.1;
          this.burstAround(event.side, 'bulle', ['#e0a0ff', '#9a40c8'], 8);
          this.addShake(1.5, 0.2);
          this.floaters.push({ text: `-${lost}`, x: a.center.x, y: a.head.y - 4, t: 0, color: '#d080ff', scale: 1 });
          this.game.audio.fx('sombre');
          break;
        case 'confusion':
        case 'contrecoup':
          view.hit = 0;
          view.knock = 4;
          if (event.cause === 'confusion') this.burstAround(event.side, 'etoile', ['#ffffff', '#f8e070'], 8);
          this.addShake(2, 0.2);
          this.floaters.push({ text: `-${lost}`, x: a.center.x, y: a.head.y - 4, t: 0, color: '#ffffff', scale: 1 });
          this.game.audio.fx('impact');
          break;
        default:
          this.hitReaction(event.side, lost, frac, !!event.critical, event.multiplier ?? 1);
      }
      return;
    }
    // Soin : chiffre vert, étincelles et lueur verte.
    view.ghostHp = view.hp;
    view.tint = '#80f080';
    view.tintT = 1;
    this.floaters.push({ text: `+${delta}`, x: a.center.x, y: a.head.y - 4, t: 0, color: '#90f890', scale: 1 });
    if (event.cause) {
      for (let i = 0; i < 12; i++) {
        this.particles.add({
          x: a.center.x + (rnd(i, 3) - 0.5) * 36,
          y: a.foot.y - 4 - rnd(i, 4) * 20,
          vy: -40 - rnd(i, 5) * 40,
          delay: i * 0.03,
          life: 0.8,
          shape: i % 3 ? 'etoile' : 'glyphe',
          glyph: 'plus',
          size: 1,
          colors: ['#ffffff', '#b8f8a0', '#58c838'],
          glow: true,
        });
      }
    }
  }

  /** Un coup qui porte : arrêt sur image, tremblement, éclair blanc, recul et dégâts affichés. */
  private hitReaction(side: Side, lost: number, frac: number, critical: boolean, multiplier: number): void {
    const view = this.views[side]!;
    const a = this.anchor(side);
    view.hit = 0;
    view.knock = 6 + frac * 16;
    this.hitStop = critical || multiplier > 1 ? 0.14 : 0.07;
    this.addShake(Math.min(8, 2 + frac * 9 + (critical ? 2.5 : 0) + (multiplier > 1 ? 1.5 : 0)), 0.34);
    const color = critical ? '#ffe040' : multiplier > 1 ? '#ffa050' : multiplier < 1 ? '#c8c0b0' : '#ffffff';
    this.floaters.push({ text: `-${lost}`, x: a.center.x, y: a.head.y - 4, t: 0, color, scale: critical || frac > 0.35 ? 2 : 1 });
    this.rings.push({ x: a.center.x, y: a.center.y, t: 0, duration: 0.35, color: multiplier > 1 ? '#ff9040' : '#ffffff', r: 26 + frac * 24 });
    let labelY = a.head.y - (critical || frac > 0.35 ? 24 : 16);
    if (critical) {
      this.floaters.push({ text: 'CRITIQUE !', x: a.center.x, y: labelY, t: 0, color: '#ffe040', scale: 1, label: true });
      this.flashFx = { color: '#ffffff', alpha: 0.45, t: 0, duration: 0.2 };
      this.game.audio.fx('critique');
      labelY -= 10;
    }
    if (multiplier > 1) {
      this.floaters.push({ text: 'SUPER EFFICACE !', x: a.center.x, y: labelY, t: 0.05, color: '#ff8030', scale: 1, label: true });
      this.rings.push({ x: a.center.x, y: a.center.y, t: -0.08, duration: 0.45, color: '#ffd040', r: 44 });
    } else if (multiplier < 1) {
      this.floaters.push({ text: 'Peu efficace…', x: a.center.x, y: labelY, t: 0, color: '#d0c8b8', scale: 1, label: true });
    }
  }

  /** Effet d'apparition d'une altération. */
  private statusBurst(side: Side, status: StatusKind): void {
    const view = this.views[side]!;
    const a = this.anchor(side);
    switch (status) {
      case 'sommeil':
        for (let i = 0; i < 3; i++) {
          this.particles.add({ x: a.head.x + 8, y: a.head.y, vx: 14, vy: -26, delay: i * 0.18, life: 1, shape: 'glyphe', glyph: i === 1 ? 'Z' : 'z', colors: ['#ffffff', '#c8d8ff'], wobble: 3 });
        }
        view.tint = '#4060a0';
        view.tintT = 1;
        this.game.audio.fx('debuff');
        break;
      case 'poison':
        this.burstAround(side, 'bulle', ['#e0a0ff', '#9a40c8'], 12);
        view.tint = '#a040d0';
        view.tintT = 1;
        this.game.audio.fx('sombre');
        break;
      case 'paralysie':
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2;
          this.particles.add({ x: a.center.x + Math.cos(ang) * 18, y: a.center.y + Math.sin(ang) * 16, vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60, drag: 4, life: 0.45, size: 2, shape: 'trait', colors: ['#ffffff', '#fff070', '#f0c020'], glow: true });
        }
        view.hit = 0.1;
        view.tint = '#f0e040';
        view.tintT = 1;
        this.game.audio.fx('eclair');
        break;
      case 'confusion':
        this.burstAround(side, 'etoile', ['#ffffff', '#f8e070'], 10);
        break;
    }
  }

  /** Gerbe de particules autour d'un Jinémon. */
  private burstAround(side: Side, kind: 'etoile' | 'bulle', colors: string[], n: number): void {
    const a = this.anchor(side);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      this.particles.add({
        x: a.center.x + Math.cos(ang) * 14,
        y: a.center.y + Math.sin(ang) * 12,
        vx: Math.cos(ang) * 40,
        vy: Math.sin(ang) * 30 - 30,
        drag: 2,
        delay: i * 0.02,
        life: 0.8,
        shape: kind === 'bulle' ? 'glyphe' : 'etoile',
        glyph: 'bulle',
        size: 1,
        colors,
        glow: kind === 'etoile',
        wobble: kind === 'bulle' ? 2 : 0,
      });
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
        else this.dismiss = true;
      }
      if (complete) {
        this.hold += dt;
        const delay = this.game.s.options.textSpeed === 'lent' ? 1.6 : this.game.s.options.textSpeed === 'rapide' ? 0.55 : 1;
        if (this.hold >= delay) this.dismiss = true;
      }
      // Le message ne s'efface pas avant que l'attaque en cours ait touché ; s'il annonce
      // l'attaque, il reste affiché pendant que les dégâts tombent, pile à l'impact.
      if (this.gate <= 0 && (this.dismiss || this.moveMessage)) {
        this.shown = this.message.length;
        this.current = null;
        this.moveMessage = false;
      }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) this.current = null;
  }

  private finishAnim(a: Anim): boolean {
    const view = this.views[a.side];
    if (view && (a.kind === 'ko' || a.kind === 'sortie' || a.kind === 'depart')) view.visible = false;
    return false;
  }

  /** Moments clés des animations d'entrée, de K.O. et de montée de niveau. */
  private updateAnims(): void {
    for (const a of this.anims) {
      const anchor = this.anchor(a.side);
      if (a.kind === 'entree' && a.t > 0.4 && !a.fired) {
        a.fired = true;
        // La calebasse s'ouvre dans un éclat de lumière.
        this.flashFx = { color: '#ffffff', alpha: 0.35, t: 0, duration: 0.18 };
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          this.particles.add({ x: anchor.center.x, y: anchor.center.y, vx: Math.cos(ang) * 110, vy: Math.sin(ang) * 80, drag: 4, life: 0.5, size: 2, shape: i % 2 ? 'trait' : 'etoile', colors: ['#ffffff', '#fff0b0', '#f0c040'], glow: true });
        }
        if (this.views[a.side]) this.game.audio.cry(this.views[a.side]!.speciesId);
        if (this.views[a.side]?.shiny) setTimeout(() => this.game.sfx('niveau'), 250);
      }
      if (a.kind === 'surgir' && a.t > 0.05 && !a.fired) {
        a.fired = true;
        this.scareBurst();
      }
      if (a.kind === 'chute' && a.t > 0.5 && !a.fired) {
        // Il s'écrase devant vous : le sol tremble, la poussière vole.
        a.fired = true;
        this.scareBurst();
        this.dust(a.side);
        this.game.audio.fx('impactFort');
      }
      if (a.kind === 'emergence' && a.t > 0.55 && !a.fired) {
        a.fired = true;
        if (this.views[a.side]) this.game.audio.cry(this.views[a.side]!.speciesId);
        if (this.views[a.side]?.shiny) setTimeout(() => this.game.sfx('niveau'), 250);
      }
      if (a.kind === 'ko' && a.t > 0.2 && !a.fired) {
        a.fired = true;
        for (let i = 0; i < 12; i++) {
          const dir = i % 2 ? 1 : -1;
          this.particles.add({ x: anchor.foot.x + dir * rnd(i, 1) * 14, y: anchor.foot.y - 2, vx: dir * (20 + rnd(i, 2) * 40), vy: -10 - rnd(i, 3) * 20, drag: 3, life: 0.8, size: 3, sizeEnd: 6, shape: 'disque', colors: ['#f0e4c8', '#d8c8a8', '#b8a888'] });
        }
      }
      if (a.kind === 'niveau' && Math.random() < 0.6 && a.t < 0.8) {
        this.particles.add({ x: anchor.center.x + (Math.random() - 0.5) * 40, y: anchor.foot.y - 4, vy: -70 - Math.random() * 40, life: 0.7, size: 1, shape: 'etoile', colors: ['#ffffff', '#ffe060', '#f0a020'], glow: true });
      }
    }
  }

  private updateEffects(dt: number): void {
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < (f.label ? 1.25 : 1.05));
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.duration);
    for (const fx of [this.flashFx, this.veilFx]) if (fx) fx.t += dt;
    if (this.flashFx && this.flashFx.t >= this.flashFx.duration) this.flashFx = null;
    if (this.veilFx && this.veilFx.t >= this.veilFx.duration) this.veilFx = null;
    if (this.warpFx && (this.warpFx.t += dt) >= this.warpFx.duration) this.warpFx = null;
    for (const side of ['joueur', 'adversaire'] as const) {
      const view = this.views[side];
      if (!view) continue;
      view.since += dt;
      view.hit += dt;
      view.knock *= Math.max(0, 1 - dt * 9);
      view.tintT = Math.max(0, view.tintT - dt * 1.6);
      if (view.ghostWait > 0) view.ghostWait -= dt;
      else view.ghostHp = Math.max(view.shownHp, view.ghostHp - view.maxHp * 1.4 * dt);
      if (!view.visible) continue;
      this.statusIdle(side, view, dt);
    }
  }

  /** Signes discrets et réguliers des altérations : Z du sommeil, bulles de poison, étincelles. */
  private statusIdle(side: Side, view: SideView, dt: number): void {
    if (!view.status) return;
    view.statusClock += dt;
    const a = this.anchor(side);
    const period = view.status === 'sommeil' ? 0.9 : view.status === 'poison' ? 0.55 : 1.3;
    if (view.statusClock < period) return;
    view.statusClock = 0;
    switch (view.status) {
      case 'sommeil':
        this.particles.add({ x: a.head.x + 8, y: a.head.y, vx: 12, vy: -22, life: 1.1, shape: 'glyphe', glyph: Math.random() < 0.5 ? 'Z' : 'z', colors: ['#ffffff', '#c8d8ff'], wobble: 3 });
        break;
      case 'poison':
        this.particles.add({ x: a.center.x + (Math.random() - 0.5) * 24, y: a.center.y + 8, vy: -24, life: 0.9, shape: 'glyphe', glyph: 'bulle', colors: ['#e0a0ff', '#9a40c8'], wobble: 2 });
        break;
      case 'paralysie':
        view.hit = 0.6;
        for (let i = 0; i < 4; i++) {
          const ang = Math.random() * Math.PI * 2;
          this.particles.add({ x: a.center.x + Math.cos(ang) * 14, y: a.center.y + Math.sin(ang) * 14, vx: Math.cos(ang) * 50, vy: Math.sin(ang) * 50, drag: 5, life: 0.3, size: 2, shape: 'trait', colors: ['#ffffff', '#fff070'], glow: true });
        }
        break;
      default:
        break;
    }
  }

  private addShake(amplitude: number, duration: number): void {
    if (amplitude >= this.shakeAmp * (1 - this.shakeT / Math.max(0.01, this.shakeDur))) {
      this.shakeAmp = amplitude;
      this.shakeT = 0;
      this.shakeDur = duration;
    }
  }

  private updateShake(dt: number): void {
    this.shakeT += dt;
    if (this.shakeT >= this.shakeDur) this.shakeAmp = 0;
  }

  private shakeOffset(): [number, number] {
    if (this.shakeAmp <= 0) return [0, 0];
    const k = this.shakeAmp * (1 - this.shakeT / this.shakeDur);
    return [Math.round(Math.sin(this.time * 73) * k), Math.round(Math.cos(this.time * 61) * k * 0.6)];
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
    const at = this.anchor('adversaire');
    if (c.phase === 'lancer' && c.t > 0.5) {
      c.phase = 'absorber';
      c.t = 0;
      this.flashFx = { color: '#fff4c0', alpha: 0.4, t: 0, duration: 0.2 };
      this.game.audio.fx('magie');
    } else if (c.phase === 'absorber') {
      // La lumière aspire le Jinémon dans la calebasse.
      if (Math.random() < 0.8) {
        const ang = Math.random() * Math.PI * 2;
        this.particles.add({ x: at.center.x + Math.cos(ang) * 30, y: at.center.y + Math.sin(ang) * 24, vx: -Math.cos(ang) * 90, vy: -Math.sin(ang) * 70 + 20, life: 0.3, size: 1, shape: 'etoile', colors: ['#ffffff', '#fff0b0'], glow: true });
      }
      if (c.t > 0.35) {
        if (foe) foe.visible = false;
        c.phase = 'secousses';
        c.t = 0;
      }
    } else if (c.phase === 'secousses') {
      const index = Math.floor(c.t / 0.55);
      if (index !== c.shakeIndex && index < c.shakes) {
        c.shakeIndex = index;
        this.game.sfx('pas');
        for (let i = 0; i < 4; i++) this.particles.add({ x: at.center.x + (i - 1.5) * 4, y: at.foot.y - 4, vx: (i - 1.5) * 20, vy: -14, drag: 3, life: 0.4, size: 2, shape: 'disque', colors: ['#e8dcc0', '#c8b898'] });
      }
      if (c.t > c.shakes * 0.55) {
        c.phase = 'resultat';
        c.t = 0;
        if (c.success) {
          this.game.jingle('capture');
          for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            this.particles.add({ x: at.center.x, y: at.center.y + 10, vx: Math.cos(ang) * 70, vy: Math.sin(ang) * 50 - 20, drag: 2, life: 0.9, size: 2, shape: 'etoile', colors: ['#ffffff', '#ffe066', '#f0a020'], glow: true });
          }
          this.floaters.push({ text: 'Capturé !', x: at.center.x, y: at.center.y - 16, t: 0, color: '#ffe060', scale: 1, label: true });
        } else if (foe) {
          // La calebasse se rompt : le Jinémon s'échappe.
          foe.visible = true;
          this.anims.push({ kind: 'liberation', side: 'adversaire', t: 0, duration: 0.4 });
          this.flashFx = { color: '#ffffff', alpha: 0.5, t: 0, duration: 0.2 };
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            this.particles.add({ x: at.center.x, y: at.center.y + 10, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 80, drag: 4, life: 0.5, size: 2, shape: 'trait', colors: ['#ffffff', '#fff0b0'], glow: true });
          }
          this.game.audio.cry(foe.speciesId);
        }
      }
    } else if (c.phase === 'resultat' && ((c.t > 0.6 && !c.success) || (c.t > 1.1 && !this.combat.isOver()))) {
      // Arraché à un bandit, le combat continue : la calebasse scellée disparaît.
      this.capture = null;
    }
  }

  // ── Duel du héros ──────────────────────────────────────────────────────

  /**
   * Après le combat des Jinémon : duel contre le bandit, ou le monstre de la nuit
   * qui s'en prend au héros, puis le sort du bandit. Vrai tant que cela se joue.
   */
  private duelStage(): boolean {
    if (!this.duel) {
      const kind: DuelKind | null =
        this.opts.bandit && this.combat.outcome === 'victoire'
          ? 'bandit'
          : this.opts.prey && this.combat.outcome === 'defaite'
            ? 'monstre'
            : null;
      if (!kind) return false;
      this.startDuel(kind);
      return true;
    }
    if (this.duel.phase === 'choix') {
      this.updateDuelMenu();
      return true;
    }
    if (this.duel.kind === 'bandit' && this.duel.outcome === 'victoire' && !this.verdict) {
      this.updateVerdict();
      return true;
    }
    return false;
  }

  private startDuel(kind: DuelKind): void {
    const state = this.game.s;
    const hero = heroFighter(state, state.playerName);
    const monster = this.combat.foeActive;
    const foe = kind === 'bandit' ? { ...this.opts.bandit!.foe } : monsterFighter(getSpecies(monster.speciesId).name, monster.level, monster.hp, maxHp(monster));
    const duel = new Duel(kind, hero, foe, this.game.rng);
    this.duel = duel;
    const trainer = this.opts.trainer;
    const steps: SceneEvent[] = [];
    if (kind === 'bandit') {
      for (const text of trainer?.defeat ?? []) steps.push({ type: 'message', text });
      steps.push({
        type: 'script',
        run: () => {
          // Votre Jinémon recule ; le bandit s'avance en personne.
          if (this.views.joueur?.visible) this.anims.push({ kind: 'sortie', side: 'joueur', t: 0, duration: 0.45 });
          this.setView('adversaire', this.fighterView(foe, trainer?.look ?? PLAYER_LOOK, 'face', 'menace'));
          this.anims.push({ kind: 'arrivee', side: 'adversaire', t: 0, duration: 0.75 });
          this.game.audio.fx('metal');
          return 0.8;
        },
      });
    } else {
      steps.push({ type: 'message', text: 'Vos Jinémon gisent dans la poussière, inanimés…' });
      steps.push({
        type: 'script',
        run: () => {
          // Le monstre se détourne d'eux… et s'approche.
          this.dread = 0.01;
          this.game.audio.cry(monster.speciesId, 0.55);
          this.addShake(5, 0.7);
          this.flashFx = { color: '#900010', alpha: 0.55, t: 0, duration: 0.6 };
          return 0.9;
        },
      });
    }
    steps.push({
      type: 'script',
      run: () => {
        this.setView('joueur', this.fighterView(hero, PLAYER_LOOK, 'dos', 'garde'));
        this.anims.push({ kind: 'arrivee', side: 'joueur', t: 0, duration: 0.6 });
        this.game.sfx('pas');
        return 0.65;
      },
    });
    steps.push(...this.stage(duel.start()));
    this.queue.push(...steps);
    this.mode = 'evenements';
  }

  /** Remplace ce qui occupe un côté de l'arène (les animations en cours s'arrêtent). */
  private setView(side: Side, view: SideView): void {
    this.anims = this.anims.filter((a) => a.side !== side);
    this.views[side] = view;
  }

  private fighterView(f: Fighter, look: CharacterLook, facing: 'face' | 'dos', pose: FighterPose): SideView {
    return {
      speciesId: -1,
      name: f.name,
      level: f.level,
      hp: f.hp,
      shownHp: f.hp,
      maxHp: f.maxHp,
      status: null,
      visible: true,
      shiny: false,
      since: 0,
      ghostHp: f.hp,
      ghostWait: 0,
      hit: 9,
      knock: 0,
      tint: '#ffffff',
      tintT: 0,
      statusClock: 0,
      fighter: { look, facing, pose },
    };
  }

  /** Traduit les événements du duel (côté « héros » = côté joueur) en étapes de la scène. */
  private stage(events: DuelEvent[]): SceneEvent[] {
    const side = (s: 'heros' | 'adversaire'): Side => (s === 'heros' ? 'joueur' : 'adversaire');
    return events.map((e): SceneEvent => {
      switch (e.type) {
        case 'message':
          return e;
        case 'coup':
          return { type: 'duel-coup', side: side(e.side), blow: e.blow };
        case 'pv':
          return { type: 'duel-pv', side: side(e.side), hp: e.hp, maxHp: e.maxHp, damage: e.damage, critical: e.critical, blocked: e.blocked };
        case 'rate':
          return { type: 'rate', side: side(e.side) };
        case 'garde':
          return { type: 'duel-garde', side: side(e.side) };
        case 'fin':
          return { type: 'duel-fin', outcome: e.outcome };
      }
    });
  }

  /** Un coup part : la chorégraphie d'une attaque prête son élan et son impact. */
  private duelBlow(side: Side, blow: DuelBlow): void {
    if (blow === 'fuir') {
      this.anims.push({ kind: 'esquive', side, t: 0, duration: 0.4 });
      this.game.sfx('pas');
      this.wait = 0.35;
      return;
    }
    const id = BLOW_FX[blow];
    if (!id) return;
    const anim = new MoveAnim(this.host, id, side, side === 'joueur' ? 'adversaire' : 'joueur');
    if (this.queue[0]?.type === 'rate') anim.missed = true;
    this.moves.push(anim);
    this.gate = Math.max(this.gate, anim.impact);
    if (blow === 'machette') this.game.audio.fx('metal');
  }

  private duelHit(event: Extract<StageEvent, { type: 'duel-pv' }>): void {
    const view = this.views[event.side];
    this.wait = 0.55;
    if (!view) return;
    view.ghostHp = Math.max(view.ghostHp, view.hp);
    view.ghostWait = 0.45;
    view.hp = event.hp;
    const a = this.anchor(event.side);
    if (event.blocked) {
      view.hit = 0.3;
      view.knock = 3;
      this.addShake(1.5, 0.2);
      this.floaters.push({ text: `-${event.damage}`, x: a.center.x, y: a.head.y - 4, t: 0, color: '#c8d8f0', scale: 1 });
      this.floaters.push({ text: 'PARÉ !', x: a.center.x, y: a.head.y - 16, t: 0, color: '#a8d0ff', scale: 1, label: true });
      this.rings.push({ x: a.center.x, y: a.center.y, t: 0, duration: 0.35, color: '#80b8ff', r: 28 });
      this.game.audio.fx('metal');
      return;
    }
    this.hitReaction(event.side, event.damage, event.damage / Math.max(1, event.maxHp), event.critical, 1);
    // Le monstre déchire : l'écran se teinte de sang.
    if (event.side === 'joueur' && this.duel?.kind === 'monstre') this.flashFx = { color: '#a00010', alpha: 0.45, t: 0, duration: 0.35 };
  }

  private duelEnd(outcome: DuelOutcome): void {
    const duel = this.duel!;
    setHeroHp(this.game.s, duel.hero.hp);
    this.wait = 0.5;
    if (duel.kind === 'bandit') {
      if (outcome === 'victoire') {
        // À genoux, il implore.
        const view = this.views.adversaire;
        if (view?.fighter) view.fighter.pose = 'genoux';
        this.dust('adversaire');
        this.addShake(2, 0.25);
        for (const text of this.opts.trainer?.bandit?.plea ?? []) this.queue.push({ type: 'message', text });
      } else {
        this.anims.push({ kind: 'ko', side: 'joueur', t: 0, duration: 1 });
        this.game.sfx('ko');
        this.wait = 1.1;
      }
      return;
    }
    if (outcome === 'victoire') {
      this.anims.push({ kind: 'ko', side: 'adversaire', t: 0, duration: 1 });
      this.game.audio.cry(this.combat.foeActive.speciesId, 0.5);
      this.wait = 1.1;
    } else if (outcome === 'fuite') {
      this.anims.push({ kind: 'depart', side: 'joueur', t: 0, duration: 0.8 });
      this.veilFx = { color: '#000000', alpha: 1, t: 0, duration: 4 };
      this.wait = 1;
    } else {
      // Évanouissement : le héros s'effondre, tout devient noir.
      this.anims.push({ kind: 'ko', side: 'joueur', t: 0, duration: 1.2 });
      this.veilFx = { color: '#000000', alpha: 1, t: 0, duration: 4 };
      this.game.sfx('ko');
      this.wait = 1.6;
    }
  }

  private dust(side: Side): void {
    const a = this.anchor(side);
    for (let i = 0; i < 12; i++) {
      const dir = i % 2 ? 1 : -1;
      this.particles.add({ x: a.foot.x + dir * rnd(i, 1) * 14, y: a.foot.y - 2, vx: dir * (20 + rnd(i, 2) * 40), vy: -10 - rnd(i, 3) * 20, drag: 3, life: 0.8, size: 3, sizeEnd: 6, shape: 'disque', colors: ['#f0e4c8', '#d8c8a8', '#b8a888'] });
    }
  }

  private updateDuelMenu(): void {
    const actions = this.duel!.actions;
    this.mode = 'duel';
    const input = this.game.input;
    const before = this.duelIndex;
    if (input.pressed('up') || input.pressed('down')) this.duelIndex ^= 2;
    if (input.pressed('left') || input.pressed('right')) this.duelIndex ^= 1;
    if (this.duelIndex >= actions.length) this.duelIndex = before < actions.length ? before : 0;
    if (before !== this.duelIndex) this.game.sfx('curseur');
    this.message = ACTION_HINTS[actions[this.duelIndex]];
    this.shown = this.message.length;
    if (!input.pressed('a')) return;
    this.game.sfx('valider');
    this.queue.push(...this.stage(this.duel!.submit(actions[this.duelIndex])));
    this.mode = 'evenements';
  }

  /** Le bandit est à genoux : l'achever, ou l'épargner (et le menotter s'il est recherché). */
  private updateVerdict(): void {
    const prime = this.opts.trainer?.bandit?.prime ?? 0;
    if (this.mode !== 'verdict') {
      this.mode = 'verdict';
      this.verdictIndex = 1;
    }
    this.message = prime > 0 ? `Sa tête est mise à prix : ${prime} cauris.` : 'Personne ne réclame sa tête.';
    this.shown = this.message.length;
    const input = this.game.input;
    if (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down')) {
      this.verdictIndex ^= 1;
      this.game.sfx('curseur');
    }
    if (!input.pressed('a')) return;
    this.game.sfx('valider');
    this.choose(this.verdictIndex === 0 ? 'achever' : 'epargner');
  }

  private choose(verdict: Verdict): void {
    this.verdict = verdict;
    this.mode = 'evenements';
    const name = this.duel!.foe.name;
    const prime = this.opts.trainer?.bandit?.prime ?? 0;
    if (verdict === 'achever') {
      this.queue.push(
        { type: 'message', text: 'Vous ramassez sa machette…' },
        {
          type: 'script',
          run: () => {
            const anim = new MoveAnim(this.host, 'lameFerForge', 'joueur', 'adversaire');
            this.moves.push(anim);
            this.gate = anim.impact;
            return 0;
          },
        },
        {
          type: 'script',
          run: () => {
            this.flashFx = { color: '#a00010', alpha: 0.75, t: 0, duration: 0.6 };
            this.hitStop = 0.22;
            this.addShake(7, 0.5);
            this.anims.push({ kind: 'ko', side: 'adversaire', t: 0, duration: 1.3 });
            this.game.audio.fx('impactFort');
            return 1.5;
          },
        },
        { type: 'message', text: `${name} ne se relèvera plus.` },
      );
      return;
    }
    if (prime > 0 && itemCount(this.game.s, 'menottes') > 0) {
      this.queue.push(
        { type: 'message', text: `Vous passez les menottes à ${name}.` },
        {
          type: 'script',
          run: () => {
            const a = this.anchor('adversaire');
            this.game.audio.fx('metal');
            setTimeout(() => this.game.audio.fx('metal'), 180);
            this.particles.add({ x: a.center.x, y: a.center.y, vy: -18, life: 1.2, shape: 'glyphe', glyph: 'menottes', colors: ['#f0f0f0', '#c8ccd0'], fade: true });
            this.floaters.push({ text: 'ARRÊTÉ !', x: a.center.x, y: a.head.y - 6, t: 0, color: '#ffe060', scale: 1, label: true });
            return 1;
          },
        },
      );
      return;
    }
    this.queue.push(
      { type: 'message', text: prime > 0 ? 'Vous n’avez pas de menottes pour l’arrêter…' : 'Vous le laissez partir.' },
      {
        type: 'script',
        run: () => {
          const view = this.views.adversaire;
          if (view?.fighter) view.fighter.pose = 'menace';
          this.anims.push({ kind: 'depart', side: 'adversaire', t: 0, duration: 0.8 });
          this.game.sfx('pas');
          return 0.9;
        },
      },
      { type: 'message', text: prime > 0 ? `${name} en profite pour détaler !` : `${name} détale sans demander son reste.` },
    );
  }

  /** Terreur : le cœur bat de plus en plus vite, et l'écran se teinte de sang. */
  private updateDread(dt: number): void {
    if (this.dread <= 0) return;
    const ending = this.duel?.phase === 'fini' && this.duel.outcome === 'victoire';
    this.dread = ending ? Math.max(0, this.dread - dt) : Math.min(1, this.dread + dt * 0.8);
    const hero = this.views.joueur;
    const danger = hero?.fighter ? 1 - hero.hp / Math.max(1, hero.maxHp) : 0;
    this.dreadBeat -= dt;
    if (this.dreadBeat <= 0 && !ending) {
      this.game.sfx('battement');
      this.dreadBeat = 0.85 - danger * 0.5;
    }
  }

  /** Apparition d'une Hantise : un éclair rouge, un hurlement, la terre tremble. */
  private scareBurst(): void {
    this.flashFx = { color: '#a00010', alpha: 0.7, t: 0, duration: 0.5 };
    this.addShake(8, 0.8);
    const foe = this.views.adversaire;
    if (foe) this.game.audio.cry(foe.speciesId, 0.45);
    this.game.sfx('battement');
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
          this.flash(this.combat.bandit ? 'Le bandit vous barre la route : impossible de fuir !' : 'Impossible de fuir un combat contre un dresseur !');
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
          const refusal = this.combat.captureRefusal();
          if (refusal) {
            this.flash(refusal);
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
    const [sx, sy] = this.shakeOffset();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(sx, sy);
    this.renderBackground(ctx);
    this.renderVeil(ctx);
    for (const m of this.moves) m.renderBack(ctx);
    this.renderShadow(ctx, 'adversaire');
    this.renderShadow(ctx, 'joueur');
    this.renderSide(ctx, 'adversaire');
    this.renderSide(ctx, 'joueur');
    this.renderStatusMarks(ctx);
    this.renderEntries(ctx);
    for (const m of this.moves) m.renderFront(ctx);
    this.particles.additive = this.host.dark();
    this.particles.render(ctx);
    this.renderRings(ctx);
    this.renderCapture(ctx);
    this.renderFloaters(ctx);
    ctx.restore();
    this.renderDread(ctx);
    if (this.flashFx) {
      const f = this.flashFx;
      ctx.globalAlpha = f.alpha * (1 - f.t / f.duration);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    this.renderInfo(ctx);
    this.renderBottom(ctx);
    if (this.intro < 1) {
      // Ouverture en volets, comme un rideau qui se lève sur l'arène.
      const h = Math.round((1 - ease(this.intro)) * (H / 2 + 2));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, h);
      ctx.fillRect(0, H - h, W, h);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const backdrop = battleBackdrop(this.opts.theme, isNight(this.game.s.clock));
    if (this.warpFx) {
      // Ondulation psychique : chaque ligne du décor glisse d'un côté puis de l'autre.
      const w = this.warpFx;
      const k = w.amount * Math.sin(Math.PI * clamp01(w.t / w.duration));
      for (let y = 0; y < backdrop.height; y++) {
        const dx = Math.round(Math.sin(y * 0.13 + this.time * 14) * k);
        ctx.drawImage(backdrop, 0, y, backdrop.width, 1, dx, y, backdrop.width, 1);
      }
    } else {
      ctx.drawImage(backdrop, 0, 0);
    }
    // Dresseurs : ils s'effacent en lançant leur calebasse.
    const leaving = (side: Side) => {
      const a = this.anims.find((x) => x.side === side && x.kind === 'entree');
      if (a) return clamp01(a.t * 2.2);
      return this.views[side] ? 1 : 0;
    };
    const foeOut = leaving('adversaire');
    if (this.opts.trainer && foeOut < 1) {
      ctx.globalAlpha = 1 - foeOut;
      ctx.drawImage(characterSprite(this.opts.trainer.look, 'bas', 0), 170 + Math.round(foeOut * 60), 38, 32, 48);
      ctx.globalAlpha = 1;
    }
    const meOut = leaving('joueur');
    if (meOut < 1) {
      ctx.globalAlpha = 1 - meOut;
      ctx.drawImage(characterSprite(PLAYER_LOOK, 'haut', 0), 50 - Math.round(meOut * 60), 94, 32, 48);
      ctx.globalAlpha = 1;
    }
  }

  /** Bords de l'écran assombris et rougis, au rythme du cœur. */
  private renderDread(ctx: CanvasRenderingContext2D): void {
    if (this.dread <= 0) return;
    const hero = this.views.joueur;
    const danger = hero?.fighter ? 1 - hero.hp / Math.max(1, hero.maxHp) : 0;
    const pulse = 0.5 + 0.5 * Math.max(0, Math.sin(this.time * (5 + danger * 6)));
    for (let k = 0; k < 6; k++) {
      ctx.globalAlpha = this.dread * (0.5 - k * 0.075) * (0.75 + 0.25 * pulse);
      ctx.fillStyle = k < 2 ? '#000000' : '#4a0008';
      const m = k * 5;
      ctx.fillRect(m, m, W - 2 * m, 5);
      ctx.fillRect(m, H - m - 5, W - 2 * m, 5);
      ctx.fillRect(m, m + 5, 5, H - 2 * m - 10);
      ctx.fillRect(W - m - 5, m + 5, 5, H - 2 * m - 10);
    }
    ctx.globalAlpha = 0.18 * this.dread;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  private renderVeil(ctx: CanvasRenderingContext2D): void {
    const v = this.veilFx;
    if (!v) return;
    const fadeIn = clamp01(v.t / 0.15);
    const fadeOut = clamp01((v.duration - v.t) / 0.3);
    ctx.globalAlpha = v.alpha * Math.min(fadeIn, fadeOut);
    ctx.fillStyle = v.color;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.globalAlpha = 1;
  }

  private animOf(side: Side): Anim | undefined {
    return this.anims.find((a) => a.side === side);
  }

  /** Pose combinée des chorégraphies en cours pour ce côté. */
  private movePose(side: Side): Pose | null {
    let pose: Pose | null = null;
    for (const m of this.moves) pose = m.pose(side) ?? pose;
    return pose;
  }

  /** Ombre au sol : elle reste en place et rapetisse quand le Jinémon s'élève. */
  private renderShadow(ctx: CanvasRenderingContext2D, side: Side): void {
    const view = this.views[side];
    if (!view || !view.visible) return;
    const a = this.anchor(side);
    const pose = this.movePose(side);
    const lift = Math.max(0, -(pose?.dy ?? 0));
    const anim = this.animOf(side);
    if (anim?.kind === 'ko' || anim?.kind === 'sortie') return;
    if (anim?.kind === 'entree' && anim.t < 0.4) return;
    const k = Math.max(0.3, 1 - lift / 60);
    ctx.globalAlpha = 0.22 * (pose?.alpha ?? 1);
    fillEllipse(ctx, a.foot.x + Math.round(pose?.dx ?? 0), a.foot.y - 2, Math.round(a.size * 0.28 * k), Math.max(1, Math.round(4 * k)), '#140c04');
    ctx.globalAlpha = 1;
  }

  private renderSide(ctx: CanvasRenderingContext2D, side: Side): void {
    const view = this.views[side];
    if (!view || !view.visible) return;
    const player = side === 'joueur';
    const anchor = this.anchor(side);
    let x = anchor.foot.x;
    let y = anchor.foot.y;
    // Le Jinémon est vivant, même immobile : il respire, se balance, ondule, bat des ailes
    // ou flotte selon son corps, et cligne des yeux. Endormi, il garde les yeux fermés.
    const sleeping = view.status === 'sommeil';
    const tm = this.time + (player ? 0 : 1.7) + view.speciesId * 0.37;
    const motion = view.fighter ? null : creatureMotion(view.speciesId);
    const amp = motion?.breath ?? 0.02;
    const breath = Math.sin(tm * (sleeping ? 1.3 : 2.6));
    const fx: CreatureFx = { back: player, shiny: view.shiny, sx: 1 - breath * amp * 0.6, sy: 1 + breath * (sleeping ? amp * 1.5 : amp) };
    if (motion) {
      const calm = sleeping ? 0.3 : 1;
      const turn = Math.PI * 2;
      fx.bend = {
        sway: motion.sway * calm * Math.sin(tm * motion.swayHz * turn),
        wave: motion.wave * calm,
        flap: motion.flap * calm * (0.5 + 0.5 * Math.sin(tm * motion.flapHz * turn)),
        phase: tm * motion.waveHz * turn,
      };
      y -= motion.bob * calm * (0.5 + 0.5 * Math.sin(tm * motion.bobHz * turn));
      fx.blink = sleeping || tm % (2.6 + (view.speciesId % 5) * 0.45) < 0.14;
    }
    x += (player ? -1 : 1) * view.knock;
    if (view.hit < 0.07) fx.white = 1;
    else if (view.hit < 0.45 && Math.floor(view.hit * 18) % 2 === 0) fx.alpha = 0.3;
    if (view.tintT > 0) {
      fx.tint = view.tint;
      fx.tintAmount = 0.55 * view.tintT;
    } else if (view.status === 'poison') {
      fx.tint = '#9a40c8';
      fx.tintAmount = 0.1 + 0.08 * Math.sin(this.time * 4);
    }
    if (view.status === 'paralysie' && view.hit > 0.45 && view.hit < 0.75) x += Math.sin(this.time * 90) * 1.5;

    const a = this.animOf(side);
    if (a) {
      const t = Math.min(1, a.t);
      switch (a.kind) {
        case 'entree': {
          if (t < 0.4) return;
          const v = (t - 0.4) / 0.6;
          const s = v < 0.55 ? 0.2 + (v / 0.55) * 0.9 : 1.1 - ((v - 0.55) / 0.45) * 0.1;
          fx.sx = (fx.sx ?? 1) * s;
          fx.sy = (fx.sy ?? 1) * s;
          fx.white = Math.max(fx.white ?? 0, clamp01(1 - v * 1.4));
          break;
        }
        case 'liberation': {
          const s = 0.3 + ease(t) * 0.7;
          fx.sx = (fx.sx ?? 1) * s;
          fx.sy = (fx.sy ?? 1) * s;
          fx.white = 1 - t;
          break;
        }
        case 'emergence':
          // Silhouette sombre qui surgit, puis se révèle.
          x += (1 - ease(clamp01(t / 0.45))) * 90;
          fx.silhouette = 1 - clamp01((t - 0.45) / 0.35);
          break;
        case 'surgir': {
          // Immense, presque contre vous… puis elle recule à sa place, sans vous quitter des yeux.
          const u = ease(clamp01((t - 0.1) / 0.55));
          const k = 2.6 - 1.6 * u;
          fx.sx = (fx.sx ?? 1) * k;
          fx.sy = (fx.sy ?? 1) * k;
          x -= (1 - u) * 70;
          y += (1 - u) * 80;
          fx.silhouette = t < 0.1 ? 1 : 1 - clamp01((t - 0.1) / 0.5);
          fx.tint = '#a00010';
          fx.tintAmount = 0.6 * (1 - clamp01((t - 0.3) / 0.6));
          break;
        }
        case 'chute': {
          // Il tombe du ciel en accélérant, puis s'écrase et rebondit.
          if (t < 0.5) {
            const u = t / 0.5;
            y -= (1 - u * u) * 150;
            fx.silhouette = 1 - u;
          } else {
            const v = (t - 0.5) / 0.5;
            const squash = Math.sin(Math.min(1, v * 2) * Math.PI) * 0.22;
            fx.sx = (fx.sx ?? 1) * (1 + squash);
            fx.sy = (fx.sy ?? 1) * (1 - squash);
          }
          break;
        }
        case 'arrivee': {
          // Il entre en marchant depuis le bord de l'écran.
          const u = ease(t);
          x += (player ? -80 : 90) * (1 - u);
          y -= Math.abs(Math.sin(t * Math.PI * 4)) * 2 * (1 - u);
          break;
        }
        case 'depart':
          x += (player ? -100 : 110) * t * t;
          y -= Math.abs(Math.sin(t * Math.PI * 5)) * 2;
          fx.alpha = 1 - clamp01((t - 0.55) / 0.45);
          break;
        case 'sortie':
          fx.white = clamp01(t * 2.5);
          fx.sx = (fx.sx ?? 1) * (1 - t * 0.8);
          fx.sy = (fx.sy ?? 1) * (1 - t * 0.8);
          fx.alpha = 1 - clamp01((t - 0.6) / 0.4);
          break;
        case 'ko': {
          if (t < 0.12) {
            fx.white = 1;
            break;
          }
          const u = (t - 0.12) / 0.88;
          if (view.fighter) {
            // Un homme ne s'enfonce pas dans le sol : il bascule et s'effondre.
            fx.rotate = (player ? -1 : 1) * ease(clamp01(u * 1.4)) * 1.45;
            y += ease(clamp01(u * 1.4)) * 4;
            fx.alpha = 1 - clamp01((u - 0.75) / 0.25);
            break;
          }
          y += ease(u) * anchor.size * 0.75;
          fx.clipBelow = anchor.foot.y + 1;
          fx.sx = (fx.sx ?? 1) * (1 + u * 0.12);
          fx.alpha = 1 - clamp01((u - 0.6) / 0.4);
          break;
        }
        case 'esquive': {
          const toward = player ? -1 : 1;
          x += toward * Math.sin(t * Math.PI) * 18;
          y -= Math.sin(t * Math.PI) * 5;
          fx.alpha = Math.min(fx.alpha ?? 1, 0.85);
          break;
        }
        case 'stat':
          fx.glow = a.up ? '#ff7040' : '#5090ff';
          break;
        case 'niveau':
          fx.glow = '#ffe060';
          fx.white = Math.max(fx.white ?? 0, 0.35 * Math.sin(t * Math.PI));
          break;
      }
    }
    // La nuit, le monstre s'approche du héros sans défense.
    if (!player && this.dread > 0 && !view.fighter) {
      const k = 1 + ease(this.dread) * 0.32;
      fx.sx = (fx.sx ?? 1) * k;
      fx.sy = (fx.sy ?? 1) * k;
      x -= ease(this.dread) * 22;
      y += ease(this.dread) * 16;
      fx.tint = '#200810';
      fx.tintAmount = Math.max(fx.tintAmount ?? 0, 0.25 * this.dread);
    }
    // Capture : le Jinémon blanchit et rapetisse, aspiré par la calebasse.
    if (!player && this.capture?.phase === 'absorber') {
      const u = clamp01(this.capture.t / 0.35);
      fx.white = u;
      fx.sx = (fx.sx ?? 1) * (1 - u * 0.9);
      fx.sy = (fx.sy ?? 1) * (1 - u * 0.9);
      y -= u * 12;
    }

    const pose = this.movePose(side);
    if (pose) {
      x += pose.dx;
      y += pose.dy;
      fx.sx = (fx.sx ?? 1) * (pose.sx ?? 1);
      fx.sy = (fx.sy ?? 1) * (pose.sy ?? 1);
      if (pose.white !== undefined) fx.white = Math.max(fx.white ?? 0, pose.white);
      if (pose.alpha !== undefined) fx.alpha = Math.min(fx.alpha ?? 1, pose.alpha);
      if (pose.glow) fx.glow = pose.glow;
      if (pose.trail) {
        // Images rémanentes entre la position de départ et la position actuelle.
        for (let k = 3; k >= 1; k--) {
          this.drawView(ctx, side, view, anchor.foot.x + pose.dx * (1 - k * 0.22), anchor.foot.y + pose.dy * (1 - k * 0.22), {
            back: player,
            shiny: view.shiny,
            alpha: 0.18 + (3 - k) * 0.08,
            tint: '#ffffff',
            tintAmount: 0.35,
          });
        }
      }
    }
    this.drawView(ctx, side, view, x, y, fx);

    if (view.shiny && view.since > 0.5 && view.since < 1.6) {
      // Étoiles qui jaillissent autour du Jinémon chatoyant.
      const t = (view.since - 0.5) / 1.1;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + t * 2;
        const r = 10 + t * 26;
        const sx = Math.round(x + Math.cos(ang) * r);
        const sy = Math.round(y - 24 + Math.sin(ang) * r * 0.7);
        stamp(ctx, ['..#..', '..#..', '#####', '..#..', '..#..'], sx - 2, sy - 2, { '#': i % 2 ? '#fff8c0' : '#ffffff' });
      }
    }
    if (a?.kind === 'stat') {
      // Flèches qui montent (renforcement) ou descendent (affaiblissement), et anneaux d'énergie.
      const t = Math.min(1, a.t);
      const color = a.up ? '#f87838' : '#4890f8';
      for (let i = 0; i < 5; i++) {
        const ax = Math.round(x - 26 + i * 13);
        const phase = (t * 1.6 + i * 0.17) % 1;
        const ay = Math.round(y - 20 - (a.up ? phase * 34 : (1 - phase) * 34));
        ctx.globalAlpha = Math.sin(phase * Math.PI);
        stamp(ctx, a.up ? ['..#..', '.###.', '#####', '.###.'] : ['.###.', '#####', '.###.', '..#..'], ax, ay, { '#': color });
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const v = (t * 1.5 + k * 0.5) % 1;
        const ry = a.up ? anchor.foot.y - v * 36 : anchor.foot.y - (1 - v) * 36;
        ctx.globalAlpha = 1 - v;
        ctx.fillStyle = color;
        for (let i = 0; i < 28; i++) {
          const ang = (i / 28) * Math.PI * 2;
          ctx.fillRect(Math.round(x + Math.cos(ang) * 20), Math.round(ry + Math.sin(ang) * 6), 2, 1);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Un Jinémon, ou un humain sculpté (le héros de dos, le bandit de face). */
  private drawView(ctx: CanvasRenderingContext2D, side: Side, view: SideView, x: number, y: number, fx: CreatureFx): void {
    const f = view.fighter;
    if (!f) {
      drawCreatureFx(ctx, view.speciesId, x, y, this.anchor(side).size, fx);
      return;
    }
    const size = side === 'joueur' ? 84 : 72;
    const key = `humain:${f.look.skin}${f.look.outfit}${f.look.accent}${f.look.headwear}:${f.facing}:${f.pose}:${size}`;
    drawSpriteFx(ctx, fighterSprite(f.look, f.facing, f.pose, size), key, x, y, fx);
  }

  /** Étoiles qui tournent au-dessus de la tête d'un Jinémon confus. */
  private renderStatusMarks(ctx: CanvasRenderingContext2D): void {
    for (const side of ['joueur', 'adversaire'] as const) {
      const view = this.views[side];
      if (!view?.visible || !this.combat.isConfused(side)) continue;
      const h = this.anchor(side).head;
      for (let i = 0; i < 3; i++) {
        const ang = this.time * 4 + (i * Math.PI * 2) / 3;
        const front = Math.sin(ang) > 0;
        stamp(ctx, ['.#.', '###', '.#.'], Math.round(h.x + Math.cos(ang) * 12) - 1, Math.round(h.y - 10 + Math.sin(ang) * 3) - 1, { '#': front ? '#fff070' : '#c8a838' });
      }
    }
  }

  /** Calebasses lancées pour faire entrer les Jinémon. */
  private renderEntries(ctx: CanvasRenderingContext2D): void {
    for (const a of this.anims) {
      if (a.kind !== 'entree' || a.t >= 0.4) continue;
      const u = a.t / 0.4;
      const target = this.anchor(a.side).center;
      const from = a.side === 'joueur' ? { x: 14, y: 150 } : { x: 186, y: 50 };
      const x = from.x + (target.x - from.x) * u;
      const y = from.y + (target.y - from.y) * u - Math.sin(u * Math.PI) * (a.side === 'joueur' ? 46 : 18);
      // La calebasse tourne sur elle-même.
      const spin = Math.floor(a.t * 30) % 2;
      calabash(ctx, Math.round(x + (spin ? 1 : 0)), Math.round(y - (spin ? 1 : 0)), 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#fff0b0';
      ctx.globalAlpha = 0.5;
      for (let k = 1; k < 4; k++) {
        const v = Math.max(0, u - k * 0.06);
        ctx.fillRect(Math.round(from.x + (target.x - from.x) * v), Math.round(from.y + (target.y - from.y) * v - Math.sin(v * Math.PI) * (a.side === 'joueur' ? 46 : 18)), 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private renderRings(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      if (r.t < 0) continue;
      const u = r.t / r.duration;
      const rx = r.r * ease(u);
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = r.color;
      const n = Math.max(20, Math.round(rx * 3));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        ctx.fillRect(Math.round(r.x + Math.cos(ang) * rx), Math.round(r.y + Math.sin(ang) * rx * 0.75), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Dégâts, soins et étiquettes qui jaillissent puis s'envolent. */
  private renderFloaters(ctx: CanvasRenderingContext2D): void {
    for (const f of this.floaters) {
      if (f.t < 0) continue;
      const life = f.label ? 1.25 : 1.05;
      const rise = f.label ? ease(clamp01(f.t / 0.3)) * 8 : ease(clamp01(f.t / 0.5)) * 16;
      // Petit rebond à l'apparition des nombres.
      const bounce = f.label ? 0 : Math.max(0, Math.sin(clamp01(f.t / 0.25) * Math.PI)) * 4;
      // Les étiquettes jaillissent d'un petit saut.
      const jump = f.label ? Math.max(0, Math.sin(clamp01(f.t / 0.18) * Math.PI)) * 5 : 0;
      ctx.globalAlpha = clamp01((life - f.t) / 0.3);
      drawOutlinedText(ctx, f.text, Math.round(f.x), Math.round(f.y - rise - bounce - jump), f.color, PAL.ink, { align: 'center', scale: f.scale });
      ctx.globalAlpha = 1;
    }
  }

  private renderCapture(ctx: CanvasRenderingContext2D): void {
    const c = this.capture;
    if (!c) return;
    const at = this.anchor('adversaire');
    const tx = at.center.x;
    const ty = at.center.y + 10;
    if (c.phase === 'lancer') {
      const t = Math.min(1, c.t / 0.5);
      const x = 60 + (tx - 60) * t;
      const y = 128 + (ty - 128) * t - Math.sin(t * Math.PI) * 50;
      const spin = Math.floor(c.t * 24) % 2;
      calabash(ctx, Math.round(x + spin), Math.round(y - spin), 2);
      return;
    }
    if (c.phase === 'absorber') {
      const t = Math.min(1, c.t / 0.35);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - t * 0.5;
      fillEllipse(ctx, tx, ty - 14, Math.round(24 * (1 - t)) + 3, Math.round(20 * (1 - t)) + 3, '#fff4c0');
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      calabash(ctx, tx, ty, 2);
      return;
    }
    let dx = 0;
    let dy = 0;
    if (c.phase === 'secousses') {
      const local = (c.t % 0.55) / 0.55;
      if (local < 0.5) {
        dx = Math.round(Math.sin(local * Math.PI * 4) * 3);
        dy = -Math.round(Math.abs(Math.sin(local * Math.PI * 4)) * 1);
      }
    }
    if (c.phase === 'resultat' && !c.success && c.t < 0.2) return;
    calabash(ctx, tx + dx, ty + 8 + dy, 2);
    if (c.phase === 'resultat' && c.success) {
      // La calebasse se scelle : une petite lueur pulse.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * (1 - clamp01(c.t / 0.8));
      fillEllipse(ctx, tx, ty + 6, 9, 9, '#ffe066');
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private renderInfo(ctx: CanvasRenderingContext2D): void {
    const foe = this.views.adversaire;
    if (foe && (foe.visible || this.capture)) {
      box(ctx, 4, 8, 118, 38);
      text(ctx, foe.name, 12, 10, { shadow: PAL.shadow });
      text(ctx, `N.${foe.level}`, 114, 10, { align: 'right' });
      this.healthBar(ctx, foe, 12, 26, 102);
      if (foe.status) statusBadge(ctx, foe.status, 90, 32);
      if (foe.fighter) {
        text(ctx, 'HORS-LA-LOI', 14, 33, { color: PAL.rust });
      } else if (this.combat.kind === 'dresseur') {
        this.partyDots(ctx, this.combat.foe.map((j) => ({ hp: this.combat.stolen.includes(j) ? 0 : j.hp })), 14, 36);
        // Affaibli, le Jinémon du bandit peut lui être arraché : la calebasse clignote.
        if (this.combat.bandit && !this.combat.isOver() && this.combat.isWeakened() && Math.floor(this.time * 2.5) % 2 === 0) calabash(ctx, 112, 38, 1);
      } else if (this.game.s.dex.caught.includes(foe.speciesId)) calabash(ctx, 16, 38, 1);
    }
    const me = this.views.joueur;
    if (me && me.visible) {
      box(ctx, 132, 92, 122, 48);
      text(ctx, me.name, 140, 94, { shadow: PAL.shadow });
      text(ctx, `N.${me.level}`, 246, 94, { align: 'right' });
      this.healthBar(ctx, me, 140, 110, 106);
      text(ctx, `${Math.ceil(me.shownHp)}/${me.maxHp}`, 246, 114, { align: 'right' });
      if (me.status) statusBadge(ctx, me.status, 140, 117);
      if (me.fighter) {
        text(ctx, 'VOUS', 140, 126, { color: PAL.rust });
      } else {
        stamp(ctx, ['#.#.###', '.#..#.#', '#.#.###', '....#..'], 140, 129, { '#': PAL.xp });
        bar(ctx, 150, 130, 96, 2, this.xpShown, PAL.xp);
      }
    }
  }

  /** Barre de PV : la part qui vient d'être perdue reste un instant en clair, et la barre clignote en danger. */
  private healthBar(ctx: CanvasRenderingContext2D, view: SideView, x: number, y: number, w: number): void {
    const ratio = view.shownHp / view.maxHp;
    hpBar(ctx, x, y, w, ratio);
    const inner = w - 16;
    const from = Math.round(inner * clamp01(ratio));
    const to = Math.round(inner * clamp01(view.ghostHp / view.maxHp));
    if (to > from) {
      ctx.fillStyle = '#f8d8c8';
      ctx.fillRect(x + 16 + from, y, to - from, 3);
      ctx.fillStyle = '#e86848';
      ctx.fillRect(x + 16 + from, y + 2, to - from, 1);
    }
    if (ratio > 0 && ratio <= 0.2 && Math.floor(this.time * 3) % 2 === 0) {
      ctx.fillStyle = PAL.hpRed;
      ctx.fillRect(x + 15, y - 2, inner + 2, 1);
      ctx.fillRect(x + 15, y + 4, inner + 2, 1);
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
    if (this.mode === 'duel' || this.mode === 'verdict') {
      const labels = this.mode === 'duel' ? this.duel!.actions.map((a) => ACTION_LABELS[a]) : ['ACHEVER', 'ÉPARGNER'];
      const index = this.mode === 'duel' ? this.duelIndex : this.verdictIndex;
      box(ctx, 2, 144, 120, 46);
      wrapText(this.message, 102)
        .slice(0, 3)
        .forEach((row, i) => text(ctx, row, 10, 149 + i * 12, { shadow: PAL.shadow }));
      box(ctx, 122, 144, 132, 46);
      labels.forEach((label, i) => {
        const x = 129 + (i % 2) * 62;
        const y = 152 + Math.floor(i / 2) * 15;
        const red = label === 'ACHEVER';
        text(ctx, label, x + 7, y, { color: red ? '#a01818' : PAL.ink, shadow: PAL.shadow });
        if (i === index) cursor(ctx, x, y + 2);
      });
      if (this.mode === 'verdict') text(ctx, `Menottes : ${itemCount(this.game.s, 'menottes')}`, 136, 175, { color: PAL.grey });
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
