// Machine à états du combat au tour par tour (1 contre 1).
//
// Le moteur est synchrone : chaque appel (start, submit, submitReplacement)
// résout entièrement l'étape demandée et renvoie la liste des événements
// produits. L'interface les rejoue ensuite un par un (messages, barres de PV,
// animations). Le moteur modifie directement les Jinémon du joueur (PV, PP,
// expérience, altérations), qui sont ensuite sauvegardés.

import { getSpecies, MAX_LEVEL } from '../data/ginedex';
import { getItem, type ItemId } from '../data/items';
import { MOVES, STAT_LABELS, type Move, type MoveId, type StatKey, type StatusKind } from '../data/moves';
import type { TalentId } from '../data/talents';
import { effectiveness, effectivenessLabel, type ElementType } from '../data/types';
import {
  applyItem,
  displayName,
  gainXp,
  getStats,
  isFainted,
  maxHp,
  xpYield,
  type Jinemon,
} from './creature';
import { chance, mathRng, randInt, weightedPick, type Rng } from './rng';

export type Side = 'joueur' | 'adversaire';
export type Outcome = 'victoire' | 'defaite' | 'fuite' | 'capture';
export type CombatKind = 'sauvage' | 'dresseur';
export type Phase = 'choix' | 'remplacement' | 'fini';

export type CombatEvent =
  | { type: 'message'; text: string }
  | {
      type: 'envoi';
      side: Side;
      index: number;
      speciesId: number;
      level: number;
      hp: number;
      maxHp: number;
      status: StatusKind | null;
    }
  | { type: 'retrait'; side: Side }
  | { type: 'attaque'; side: Side; moveId: MoveId | null }
  /**
   * Les PV changent. `cause` dit pourquoi (pour l'animation) ; sur un coup, `critical`
   * et `multiplier` (efficacité du type) accompagnent les dégâts.
   */
  | { type: 'pv'; side: Side; hp: number; maxHp: number; cause?: HpCause; critical?: boolean; multiplier?: number }
  /** L'attaque a raté : `side` est la cible, qui esquive. */
  | { type: 'rate'; side: Side }
  /** La cible est prise de confusion. */
  | { type: 'confus'; side: Side }
  | { type: 'statut'; side: Side; status: StatusKind | null }
  | { type: 'stage'; side: Side; stat: StatKey; delta: number }
  | { type: 'ko'; side: Side }
  | { type: 'xp'; index: number; xp: number }
  | { type: 'niveau'; index: number; level: number }
  | { type: 'apprentissage'; index: number; moveId: MoveId }
  | { type: 'objet'; item: ItemId }
  | { type: 'capture'; item: ItemId; shakes: number; success: boolean }
  | { type: 'fin'; outcome: Outcome };

export type HpCause = 'coup' | 'contrecoup' | 'confusion' | 'poison' | 'soin' | 'drain' | 'objet';

export type PlayerAction =
  /** `moveIndex` = -1 pour la Lutte Désespérée (plus aucun PP). */
  | { kind: 'attaque'; moveIndex: number }
  | { kind: 'changer'; partyIndex: number }
  | { kind: 'objet'; item: ItemId; partyIndex: number }
  | { kind: 'capture'; item: ItemId }
  | { kind: 'fuite' };

export interface CombatOptions {
  kind: CombatKind;
  player: Jinemon[];
  foe: Jinemon[];
  rng?: Rng;
  /** Nom complet du dresseur adverse (« Maître du Feu Sacré Sirafa »). */
  trainerName?: string;
  ai?: 'simple' | 'malin';
  /** Message d'apparition d'un Jinémon sauvage (Légendes, rencontres scénarisées). */
  intro?: string;
  /**
   * Amulette du Partage : les Jinémon restés en réserve gagnent la moitié de l'expérience
   * (sans elle, ils en gagnent déjà un peu : voir BENCH_XP).
   */
  xpShare?: boolean;
  /**
   * Combat contre un bandit : ses Jinémon, asservis, peuvent lui être arrachés
   * d'un coup de calebasse quand ils sont affaiblis.
   */
  bandit?: boolean;
}

/**
 * Avantage de l'Initiée : les coups portés par le camp du joueur font 35 % de
 * dégâts en plus que la normale (une aventure courte et facile).
 */
export const PLAYER_EDGE = 1.35;

/** Part de l'expérience que gagnent les Jinémon restés en réserve (sans, puis avec l'Amulette du Partage). */
export const BENCH_XP = { base: 0.3, amulette: 0.5 };

/** Part des PV en dessous de laquelle un Jinémon de bandit peut être capturé. */
export const STEAL_HP = 0.3;

interface Volatile {
  stages: Record<StatKey, number>;
  /** Actions restantes avant de sortir de la confusion (0 = lucide). */
  confusion: number;
  /** Nombre de tours passés empoisonné : le poison s'intensifie. */
  poisonTurns: number;
}

type Stages = Record<StatKey, number>;

const freshVolatile = (): Volatile => ({ stages: { attack: 0, defense: 0, speed: 0 }, confusion: 0, poisonTurns: 0 });

/** Attaque utilisée quand plus aucune attaque n'a de PP. */
const LUTTE = { name: 'Lutte Désespérée', power: 50 } as const;

export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function talentOf(j: Jinemon): TalentId | undefined {
  return getSpecies(j.speciesId).talent;
}

/** Multiplicateur de type, talents d'immunité compris. */
export function typeMultiplierFor(moveType: ElementType, defender: Jinemon): number {
  const species = getSpecies(defender.speciesId);
  if (moveType === 'Terre' && species.talent === 'levitation') return 0;
  if (moveType === 'Feu' && species.talent === 'ignifuge') return 0;
  return effectiveness(moveType, species.types);
}

export interface DamageInput {
  power: number;
  /** null = dégâts sans type (confusion, Lutte). */
  type: ElementType | null;
  highCrit?: boolean;
}

export interface DamageResult {
  damage: number;
  multiplier: number;
  critical: boolean;
}

/**
 * Formule croisée Puissance × Attaque / Défense, modulée par le niveau,
 * le bonus de type identique (STAB ×1.5), l'efficacité, le critique (×1.5),
 * les talents et une variation aléatoire (85 % à 100 %).
 */
export function computeDamage(
  attacker: Jinemon,
  attackerStages: Stages,
  defender: Jinemon,
  defenderStages: Stages,
  move: DamageInput,
  rng: Rng,
  opts: { allowCrit?: boolean; randomize?: boolean; edge?: number } = {},
): DamageResult {
  const allowCrit = opts.allowCrit ?? true;
  const randomize = opts.randomize ?? true;
  const multiplier = move.type ? typeMultiplierFor(move.type, defender) : 1;
  if (multiplier === 0) return { damage: 0, multiplier, critical: false };

  const defTalent = talentOf(defender);
  const critical = allowCrit && defTalent !== 'carapace' && chance(rng, move.highCrit ? 1 / 8 : 1 / 16);
  // Un coup critique ignore les baisses d'Attaque du lanceur et les hausses de Défense de la cible.
  const aStage = critical ? Math.max(0, attackerStages.attack) : attackerStages.attack;
  const dStage = critical ? Math.min(0, defenderStages.defense) : defenderStages.defense;
  const atk = getStats(attacker).attack * stageMultiplier(aStage);
  const def = getStats(defender).defense * stageMultiplier(dStage);

  const levelFactor = Math.floor((2 * attacker.level) / 5) + 2;
  const base = Math.floor(Math.floor((levelFactor * move.power * atk) / def) / 50) + 2;

  let modifier = multiplier;
  if (move.type && getSpecies(attacker.speciesId).types.includes(move.type)) modifier *= 1.5;
  if (critical) modifier *= 1.5;
  if (
    talentOf(attacker) === 'coeurForge' &&
    (move.type === 'Feu' || move.type === 'Métal') &&
    attacker.hp <= maxHp(attacker) / 3
  ) {
    modifier *= 1.5;
  }
  if (defTalent === 'ecaillesAntiques' && multiplier > 1) modifier *= 0.75;
  modifier *= opts.edge ?? 1;
  if (randomize) modifier *= 0.85 + rng.next() * 0.15;

  return { damage: Math.max(1, Math.floor(base * modifier)), multiplier, critical };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function targetsOnlySelf(move: Move): boolean {
  return move.power === 0 && !move.status && (move.stages ?? []).every((s) => s.target === 'self');
}

/** Les calebasses sont généreuses : la formule classique, multipliée par 1,5. */
export const CAPTURE_EASE = 1.5;

/**
 * Chance qu'une calebasse retienne un Jinémon (0 à 1). Plus il est affaibli, plus c'est
 * facile ; les jeunes Jinémon (jusqu'au niveau 20) se laissent bien plus volontiers
 * enfermer ; le sommeil, la paralysie, le poison et la confusion aident aussi.
 */
export function captureChance(foe: Jinemon, bonus: number, confused = false): number {
  const max = maxHp(foe);
  const status = foe.status?.kind === 'sommeil' ? 2 : foe.status || confused ? 1.5 : 1;
  const young = 1 + Math.max(0, 20 - foe.level) / 8;
  const a = (((3 * max - 2 * foe.hp) * getSpecies(foe.speciesId).catchRate * bonus) / (3 * max)) * status * young * CAPTURE_EASE;
  return Math.min(1, a / 255);
}

export class Combat {
  readonly kind: CombatKind;
  readonly player: Jinemon[];
  readonly foe: Jinemon[];
  readonly trainerName?: string;
  private readonly intro?: string;
  private readonly xpShare: boolean;
  playerIndex: number;
  foeIndex = 0;
  phase: Phase = 'choix';
  outcome: Outcome | null = null;
  /** Jinémon capturé (issue « capture »). */
  captured: Jinemon | null = null;
  /** Jinémon arrachés au bandit pendant le combat. */
  readonly stolen: Jinemon[] = [];
  readonly bandit: boolean;
  turn = 0;

  private readonly rng: Rng;
  private readonly ai: 'simple' | 'malin';
  private vol: Record<Side, Volatile> = { joueur: freshVolatile(), adversaire: freshVolatile() };
  /** Jinémon du joueur ayant affronté l'adversaire actuel (partage de l'expérience). */
  private participants = new Set<Jinemon>();
  private koHandled = new Set<Jinemon>();
  private fleeAttempts = 0;
  private log: CombatEvent[] = [];

  constructor(opts: CombatOptions) {
    if (!opts.player.some((j) => !isFainted(j))) throw new Error('Aucun Jinémon en état de combattre');
    this.kind = opts.kind;
    this.player = opts.player;
    this.foe = opts.foe;
    this.trainerName = opts.trainerName;
    this.intro = opts.intro;
    this.xpShare = opts.xpShare ?? false;
    this.bandit = opts.bandit ?? false;
    this.rng = opts.rng ?? mathRng;
    this.ai = opts.ai ?? (opts.kind === 'dresseur' ? 'malin' : 'simple');
    this.playerIndex = opts.player.findIndex((j) => !isFainted(j));
  }

  get playerActive(): Jinemon {
    return this.player[this.playerIndex];
  }

  get foeActive(): Jinemon {
    return this.foe[this.foeIndex];
  }

  /** Paliers de statistiques actuels d'un camp (lecture seule, pour l'interface). */
  stagesOf(side: Side): Readonly<Stages> {
    return this.vol[side].stages;
  }

  isConfused(side: Side): boolean {
    return this.vol[side].confusion > 0;
  }

  /** Le Jinémon adverse est-il assez affaibli pour être arraché à son bandit ? */
  isWeakened(): boolean {
    const foe = this.foeActive;
    const status = foe.status?.kind;
    return foe.hp <= maxHp(foe) * STEAL_HP || status === 'sommeil' || status === 'paralysie' || this.vol.adversaire.confusion > 0;
  }

  /** Raison pour laquelle une calebasse ne peut pas être lancée (sinon null). */
  captureRefusal(): string | null {
    if (this.kind === 'sauvage') return null;
    if (!this.bandit) return `${this.trainerName ?? 'Votre adversaire'} se bat dans les règles : on ne lui prend pas ses Jinémon.`;
    if (!this.isWeakened()) {
      return 'Le bandit tient son Jinémon d’une main de fer ! Affaiblissez-le d’abord : PV bas, sommeil, paralysie ou confusion.';
    }
    return null;
  }

  /** Jinémon adverse encore en lice (ni K.O., ni capturé). */
  private inPlay(j: Jinemon): boolean {
    return !isFainted(j) && !this.stolen.includes(j);
  }

  canSwitchTo(index: number): boolean {
    const j = this.player[index];
    return !!j && !isFainted(j) && index !== this.playerIndex;
  }

  // ── Déroulement ─────────────────────────────────────────────────────────

  start(): CombatEvent[] {
    const foe = this.foeActive;
    if (this.kind === 'sauvage') {
      this.emitEnvoi('adversaire');
      this.say(this.intro ?? `Un Jinémon sauvage surgit des herbes : ${getSpecies(foe.speciesId).name} !`);
    } else {
      this.say(`${this.trainerName ?? 'Le dresseur'} veut se battre !`);
      this.emitEnvoi('adversaire');
      this.say(`${this.trainerName ?? 'Le dresseur'} envoie ${getSpecies(foe.speciesId).name} !`);
    }
    this.emitEnvoi('joueur');
    this.say(`En avant, ${displayName(this.playerActive)} !`);
    this.participants.add(this.playerActive);
    this.entryTalent('adversaire');
    this.entryTalent('joueur');
    return this.flush();
  }

  submit(action: PlayerAction): CombatEvent[] {
    if (this.phase !== 'choix') throw new Error(`Action inattendue pendant la phase « ${this.phase} »`);

    // Actions refusées sans consommer le tour.
    if (action.kind === 'fuite' && this.kind === 'dresseur') {
      this.say(this.bandit ? 'Le bandit vous barre la route : impossible de fuir !' : 'Impossible de fuir un combat contre un dresseur !');
      return this.flush();
    }
    if (action.kind === 'capture') {
      const refusal = this.captureRefusal();
      if (refusal) {
        this.say(refusal);
        return this.flush();
      }
    }
    if (action.kind === 'changer' && !this.canSwitchTo(action.partyIndex)) {
      this.say('Ce Jinémon ne peut pas combattre.');
      return this.flush();
    }

    this.turn += 1;
    const foeChoice = this.chooseFoeMove();
    let playerMove: number | null = null;

    switch (action.kind) {
      case 'fuite':
        if (this.tryFlee()) {
          this.say('Vous prenez la fuite !');
          this.finish('fuite');
          return this.flush();
        }
        this.say('Impossible de fuir !');
        break;
      case 'changer':
        this.switchPlayer(action.partyIndex, true);
        break;
      case 'objet':
        this.useItem(action.item, action.partyIndex);
        break;
      case 'capture':
        if (this.tryCapture(action.item)) return this.flush();
        break;
      case 'attaque':
        playerMove = action.moveIndex;
        break;
    }

    for (const side of this.turnOrder(playerMove, foeChoice)) {
      if (this.isOver()) break;
      if (isFainted(this.active(side)) || isFainted(this.active(this.opponent(side)))) continue;
      this.executeMove(side, side === 'joueur' ? (playerMove ?? -1) : foeChoice);
      this.checkFaints();
    }
    if (!this.isOver()) this.endOfTurn();
    return this.flush();
  }

  isOver(): boolean {
    return this.phase === 'fini';
  }

  /** Remplacement obligatoire après le K.O. du Jinémon actif du joueur. */
  submitReplacement(partyIndex: number): CombatEvent[] {
    if (this.phase !== 'remplacement') throw new Error('Aucun remplacement attendu');
    if (!this.canSwitchTo(partyIndex)) throw new Error('Remplaçant invalide');
    this.switchPlayer(partyIndex, false);
    this.phase = 'choix';
    return this.flush();
  }

  // ── Utilitaires ────────────────────────────────────────────────────────

  private emit(event: CombatEvent): void {
    this.log.push(event);
  }

  private emitEnvoi(side: Side): void {
    const j = this.active(side);
    this.emit({
      type: 'envoi',
      side,
      index: side === 'joueur' ? this.playerIndex : this.foeIndex,
      speciesId: j.speciesId,
      level: j.level,
      hp: j.hp,
      maxHp: maxHp(j),
      status: j.status?.kind ?? null,
    });
  }

  private say(text: string): void {
    this.log.push({ type: 'message', text });
  }

  private flush(): CombatEvent[] {
    const out = this.log;
    this.log = [];
    return out;
  }

  private active(side: Side): Jinemon {
    return side === 'joueur' ? this.playerActive : this.foeActive;
  }

  private opponent(side: Side): Side {
    return side === 'joueur' ? 'adversaire' : 'joueur';
  }

  private name(side: Side): string {
    const j = this.active(side);
    if (side === 'joueur') return displayName(j);
    return `${getSpecies(j.speciesId).name} ${this.kind === 'sauvage' ? 'sauvage' : 'adverse'}`;
  }

  private edge(side: Side): number {
    return side === 'joueur' ? PLAYER_EDGE : 1;
  }

  private effectiveSpeed(side: Side): number {
    const j = this.active(side);
    const para = j.status?.kind === 'paralysie' ? 0.25 : 1;
    return getStats(j).speed * stageMultiplier(this.vol[side].stages.speed) * para;
  }

  private priorityOf(side: Side, moveIndex: number): number {
    const s = this.active(side).moves[moveIndex];
    return s && s.pp > 0 ? (MOVES[s.id].priority ?? 0) : 0;
  }

  private turnOrder(playerMove: number | null, foeMove: number): Side[] {
    if (playerMove === null) return ['adversaire'];
    const pp = this.priorityOf('joueur', playerMove);
    const fp = this.priorityOf('adversaire', foeMove);
    if (pp !== fp) return pp > fp ? ['joueur', 'adversaire'] : ['adversaire', 'joueur'];
    const ps = this.effectiveSpeed('joueur');
    const fs = this.effectiveSpeed('adversaire');
    const playerFirst = ps === fs ? chance(this.rng, 0.5) : ps > fs;
    return playerFirst ? ['joueur', 'adversaire'] : ['adversaire', 'joueur'];
  }

  private damage(side: Side, amount: number, cause: HpCause, hit: { critical?: boolean; multiplier?: number } = {}): number {
    const j = this.active(side);
    const lost = Math.min(j.hp, Math.max(0, amount));
    j.hp -= lost;
    this.emit({ type: 'pv', side, hp: j.hp, maxHp: maxHp(j), cause, ...hit });
    return lost;
  }

  private heal(side: Side, amount: number, cause: HpCause): number {
    const j = this.active(side);
    const gained = Math.min(maxHp(j) - j.hp, Math.max(0, amount));
    j.hp += gained;
    this.emit({ type: 'pv', side, hp: j.hp, maxHp: maxHp(j), cause });
    return gained;
  }

  private finish(outcome: Outcome): void {
    this.phase = 'fini';
    this.outcome = outcome;
    this.emit({ type: 'fin', outcome });
  }

  // ── Actions ────────────────────────────────────────────────────────────

  private switchPlayer(index: number, voluntary: boolean): void {
    if (voluntary) {
      this.say(`Reviens, ${displayName(this.playerActive)} !`);
      this.emit({ type: 'retrait', side: 'joueur' });
    }
    this.playerIndex = index;
    this.vol.joueur = freshVolatile();
    this.emitEnvoi('joueur');
    this.say(`En avant, ${displayName(this.playerActive)} !`);
    this.participants.add(this.playerActive);
    this.entryTalent('joueur');
  }

  private sendNextFoe(): void {
    const index = this.foe.findIndex((j) => this.inPlay(j));
    this.foeIndex = index;
    this.vol.adversaire = freshVolatile();
    const foe = this.foeActive;
    this.emitEnvoi('adversaire');
    this.say(`${this.trainerName ?? 'Le dresseur'} envoie ${getSpecies(foe.speciesId).name} !`);
    if (!isFainted(this.playerActive)) this.participants.add(this.playerActive);
    this.entryTalent('adversaire');
  }

  private entryTalent(side: Side): void {
    const j = this.active(side);
    const other = this.opponent(side);
    if (isFainted(j) || isFainted(this.active(other))) return;
    if (talentOf(j) === 'prestance') {
      this.say(`La Prestance du Chasseur de ${this.name(side)} intimide ${this.name(other)} !`);
      this.applyStage(other, 'attack', -1, true, false);
    }
  }

  private useItem(item: ItemId, partyIndex: number): void {
    const target = this.player[partyIndex];
    this.emit({ type: 'objet', item });
    this.say(`Vous utilisez : ${getItem(item).name}.`);
    if (!target) {
      this.say("Cela n'a aucun effet.");
      return;
    }
    const wasFainted = isFainted(target);
    const message = applyItem(target, item);
    if (!message) {
      this.say("Cela n'a aucun effet.");
      return;
    }
    this.say(message);
    if (wasFainted && !isFainted(target)) this.koHandled.delete(target);
    if (partyIndex === this.playerIndex) {
      this.emit({ type: 'pv', side: 'joueur', hp: target.hp, maxHp: maxHp(target), cause: 'objet' });
      this.emit({ type: 'statut', side: 'joueur', status: target.status?.kind ?? null });
    }
  }

  private tryCapture(item: ItemId): boolean {
    const effect = getItem(item).effect;
    const bonus = effect.kind === 'capture' ? effect.bonus : 1;
    const foe = this.foeActive;
    const species = getSpecies(foe.speciesId);
    this.emit({ type: 'objet', item });
    this.say(`Vous lancez une ${getItem(item).name} !`);

    const p = captureChance(foe, bonus, this.vol.adversaire.confusion > 0);
    const shakeChance = Math.pow(p, 1 / 4);
    let checks = 0;
    while (checks < 4 && chance(this.rng, shakeChance)) checks += 1;
    const success = checks === 4;
    this.emit({ type: 'capture', item, shakes: Math.min(3, checks), success });

    if (success && this.kind === 'dresseur') {
      this.say(`${species.name} est arraché à ${this.trainerName ?? 'son maître'} et scellé dans la calebasse !`);
      this.stolen.push(foe);
      this.vol.adversaire = freshVolatile();
      if (this.foe.some((j) => this.inPlay(j))) this.sendNextFoe();
      else {
        this.say(`${this.trainerName ?? 'Le bandit'} n’a plus un seul Jinémon pour le protéger !`);
        this.finish('victoire');
      }
      return true;
    }
    if (success) {
      this.say(`${species.name} est scellé dans la calebasse !`);
      this.captured = foe;
      this.finish('capture');
      return true;
    }
    const fails = [
      'Le sceau cède aussitôt : le Jinémon se libère !',
      'Raté ! La calebasse a à peine bougé.',
      'Le sceau a failli tenir…',
      'Si près du but ! La calebasse s’est rouverte au dernier moment !',
    ];
    this.say(fails[checks]);
    return false;
  }

  private tryFlee(): boolean {
    this.fleeAttempts += 1;
    const ps = this.effectiveSpeed('joueur');
    const fs = this.effectiveSpeed('adversaire');
    if (ps >= fs) return true;
    const odds = ((ps * 128) / fs + 30 * this.fleeAttempts) / 256;
    return chance(this.rng, odds);
  }

  // ── Attaques ───────────────────────────────────────────────────────────

  private executeMove(side: Side, moveIndex: number): void {
    const user = this.active(side);
    const v = this.vol[side];
    const name = this.name(side);

    if (user.status?.kind === 'sommeil') {
      if (user.status.turns > 0) {
        user.status.turns -= 1;
        this.say(`${name} dort profondément…`);
        return;
      }
      user.status = null;
      this.emit({ type: 'statut', side, status: null });
      this.say(`${name} se réveille !`);
    }
    if (user.status?.kind === 'paralysie' && chance(this.rng, 0.5)) {
      this.say(`La paralysie empêche ${name} d'agir !`);
      return;
    }
    if (v.confusion > 0) {
      v.confusion -= 1;
      if (v.confusion === 0) {
        this.say(`${name} retrouve ses esprits !`);
      } else {
        this.say(`La confusion trouble ${name}…`);
        if (chance(this.rng, 1 / 3)) {
          const { damage } = computeDamage(user, v.stages, user, v.stages, { power: 40, type: null }, this.rng, {
            allowCrit: false,
          });
          this.say(`Dans sa confusion, ${name} se blesse !`);
          this.damage(side, damage, 'confusion');
          return;
        }
      }
    }

    const moveSlot = moveIndex >= 0 ? user.moves[moveIndex] : undefined;
    if (!moveSlot || moveSlot.pp <= 0) {
      this.struggle(side);
      return;
    }
    moveSlot.pp -= 1;
    const move = MOVES[moveSlot.id];
    this.say(`${name} utilise ${move.name} !`);
    this.emit({ type: 'attaque', side, moveId: move.id });

    if (!targetsOnlySelf(move) && !chance(this.rng, move.accuracy / 100)) {
      this.emit({ type: 'rate', side: this.opponent(side) });
      this.say(`${name} rate son attaque !`);
      return;
    }
    if (move.power > 0) this.damagingMove(side, move);
    else this.statusMove(side, move);
  }

  private struggle(side: Side): void {
    const user = this.active(side);
    const target = this.opponent(side);
    this.say(`${this.name(side)} n'a plus aucune attaque disponible : c'est la ${LUTTE.name} !`);
    this.emit({ type: 'attaque', side, moveId: null });
    const { damage } = computeDamage(
      user, this.vol[side].stages, this.active(target), this.vol[target].stages,
      { power: LUTTE.power, type: null }, this.rng, { edge: this.edge(side) },
    );
    this.damage(target, damage, 'coup');
    this.say(`${this.name(side)} subit le contrecoup !`);
    this.damage(side, Math.max(1, Math.floor(maxHp(user) / 4)), 'contrecoup');
  }

  private damagingMove(side: Side, move: Move): void {
    const user = this.active(side);
    const tSide = this.opponent(side);
    const target = this.active(tSide);
    const result = computeDamage(user, this.vol[side].stages, target, this.vol[tSide].stages, move, this.rng, { edge: this.edge(side) });
    if (result.multiplier === 0) {
      this.say(`Ça n'affecte pas ${this.name(tSide)}…`);
      return;
    }
    const dealt = this.damage(tSide, result.damage, 'coup', { critical: result.critical, multiplier: result.multiplier });
    if (result.critical) this.say('Coup critique !');
    const label = effectivenessLabel(result.multiplier);
    if (label) this.say(label);

    if (move.drain && dealt > 0 && user.hp < maxHp(user)) {
      this.heal(side, Math.max(1, Math.floor(dealt * move.drain)), 'drain');
      this.say(`${this.name(side)} draine l'énergie de ${this.name(tSide)} !`);
    }
    if (move.recoil && dealt > 0) {
      this.say(`${this.name(side)} subit le contrecoup !`);
      this.damage(side, Math.max(1, Math.floor(dealt * move.recoil)), 'contrecoup');
    }

    const targetAlive = !isFainted(target);
    if (targetAlive && move.status && chance(this.rng, move.status.chance)) {
      this.inflict(tSide, move.status.kind, false);
    }
    if (targetAlive && talentOf(user) === 'toucherToxique' && chance(this.rng, 0.3)) {
      this.inflict(tSide, 'poison', false);
    }
    for (const change of move.stages ?? []) {
      if (change.chance !== undefined && !chance(this.rng, change.chance)) continue;
      if (change.target === 'self') {
        if (!isFainted(user)) this.applyStage(side, change.stat, change.delta, false, true);
      } else if (targetAlive) {
        this.applyStage(tSide, change.stat, change.delta, true, true);
      }
    }
  }

  private statusMove(side: Side, move: Move): void {
    const user = this.active(side);
    const tSide = this.opponent(side);
    const name = this.name(side);

    if (move.heal !== undefined || move.cureSelf) {
      const cured = move.cureSelf && user.status !== null;
      if (cured) {
        user.status = null;
        this.vol[side].poisonTurns = 0;
        this.emit({ type: 'statut', side, status: null });
        this.say(`Le souffle des ancêtres purifie ${name} !`);
      }
      if (move.heal !== undefined && user.hp < maxHp(user)) {
        this.heal(side, Math.max(1, Math.floor(maxHp(user) * move.heal)), 'soin');
        this.say(`${name} récupère des PV !`);
      } else if (!cured) {
        this.say('Mais cela échoue !');
      }
    }
    if (move.status) this.inflict(tSide, move.status.kind, true);
    for (const change of move.stages ?? []) {
      const targetSide = change.target === 'self' ? side : tSide;
      this.applyStage(targetSide, change.stat, change.delta, change.target === 'foe', false);
    }
  }

  /** Inflige une altération. `primary` : l'attaque n'a pas d'autre effet (afficher les échecs). */
  private inflict(tSide: Side, kind: StatusKind, primary: boolean): boolean {
    const target = this.active(tSide);
    const tv = this.vol[tSide];
    const n = this.name(tSide);
    if (kind === 'confusion') {
      if (tv.confusion > 0) {
        if (primary) this.say(`${n} est déjà dans la confusion !`);
        return false;
      }
      tv.confusion = randInt(this.rng, 2, 5);
      this.emit({ type: 'confus', side: tSide });
      this.say(`La confusion gagne ${n} !`);
      return true;
    }
    if (target.status) {
      if (primary) this.say('Mais cela échoue !');
      return false;
    }
    const species = getSpecies(target.speciesId);
    if (kind === 'poison' && species.types.includes('Métal')) {
      if (primary) this.say(`${n} ne craint pas le poison !`);
      return false;
    }
    if (kind === 'sommeil' && species.talent === 'oeilVigilant') {
      if (primary) this.say(`L'Œil Vigilant de ${n} l'empêche de s'endormir !`);
      return false;
    }
    if (kind === 'sommeil') {
      target.status = { kind: 'sommeil', turns: randInt(this.rng, 1, 3) };
      this.say(`${n} tombe dans un profond sommeil !`);
    } else if (kind === 'poison') {
      target.status = { kind: 'poison' };
      tv.poisonTurns = 0;
      this.say(`Le poison s'insinue dans le corps de ${n} !`);
    } else {
      target.status = { kind: 'paralysie' };
      this.say(`La paralysie gagne ${n} ! Ses mouvements ralentissent.`);
    }
    this.emit({ type: 'statut', side: tSide, status: kind });
    return true;
  }

  private applyStage(tSide: Side, stat: StatKey, delta: number, byOpponent: boolean, secondary: boolean): boolean {
    const target = this.active(tSide);
    const n = this.name(tSide);
    if (byOpponent && delta < 0 && talentOf(target) === 'ruse') {
      this.say(`La Ruse du Conteur protège ${n} !`);
      return false;
    }
    const stages = this.vol[tSide].stages;
    const current = stages[stat];
    const next = Math.max(-6, Math.min(6, current + delta));
    const label = capitalize(STAT_LABELS[stat]);
    if (next === current) {
      if (!secondary) this.say(`${label} de ${n} ne peut plus ${delta > 0 ? 'augmenter' : 'baisser'} !`);
      return false;
    }
    stages[stat] = next;
    this.emit({ type: 'stage', side: tSide, stat, delta: next - current });
    const amount = Math.abs(next - current);
    const verb = delta > 0 ? (amount >= 2 ? 'augmente beaucoup' : 'augmente') : amount >= 2 ? 'baisse beaucoup' : 'baisse';
    this.say(`${label} de ${n} ${verb} !`);
    return true;
  }

  // ── Fin de tour ────────────────────────────────────────────────────────

  private endOfTurn(): void {
    for (const side of ['joueur', 'adversaire'] as const) {
      const j = this.active(side);
      if (isFainted(j)) continue;
      const v = this.vol[side];
      const n = this.name(side);
      if (j.status?.kind === 'poison') {
        v.poisonTurns = Math.min(v.poisonTurns + 1, 8);
        this.say(`${n} souffre du poison !`);
        this.damage(side, Math.max(1, Math.floor((maxHp(j) * v.poisonTurns) / 16)), 'poison');
        if (isFainted(j)) continue;
      }
      const talent = talentOf(j);
      if (talent === 'auraMoissons' && j.hp < maxHp(j)) {
        this.heal(side, Math.max(1, Math.floor(maxHp(j) / 16)), 'soin');
        this.say(`L'Aura des Moissons rend des PV à ${n}.`);
      }
      if (talent === 'benedictionPluvieuse' && j.status && chance(this.rng, 1 / 3)) {
        j.status = null;
        v.poisonTurns = 0;
        this.emit({ type: 'statut', side, status: null });
        this.say(`La Bénédiction Pluvieuse guérit ${n} !`);
      }
    }
    this.checkFaints();
    this.resolveTurnEnd();
  }

  private checkFaints(): void {
    for (const side of ['adversaire', 'joueur'] as const) {
      const j = this.active(side);
      if (!isFainted(j) || this.koHandled.has(j)) continue;
      this.koHandled.add(j);
      this.emit({ type: 'ko', side });
      this.say(`${this.name(side)} est terrassé !`);
      this.vol[side] = freshVolatile();
      if (side === 'adversaire') this.awardXp(j);
      else this.participants.delete(j);
    }
  }

  private awardXp(foe: Jinemon): void {
    const fighters = [...this.participants].filter((j) => !isFainted(j) && j.level < MAX_LEVEL);
    this.participants = new Set(isFainted(this.playerActive) ? [] : [this.playerActive]);
    const total = xpYield(foe, this.kind === 'dresseur');
    const gains = new Map<Jinemon, number>();
    if (fighters.length) for (const j of fighters) gains.set(j, Math.max(1, Math.floor(total / fighters.length)));
    // Le reste de l'équipe, resté en réserve, en profite aussi un peu (davantage avec l'Amulette).
    const bench = Math.max(1, Math.floor(total * (this.xpShare ? BENCH_XP.amulette : BENCH_XP.base)));
    for (const j of this.player) {
      if (!gains.has(j) && !isFainted(j) && j.level < MAX_LEVEL) gains.set(j, bench);
    }
    let shared = false;
    for (const [j, share] of gains) {
      const index = this.player.indexOf(j);
      const report = gainXp(j, share);
      if (fighters.includes(j)) this.say(`${displayName(j)} gagne ${share} points d'expérience !`);
      else if (!shared) {
        shared = true;
        this.say(
          this.xpShare
            ? `L’Amulette du Partage fait profiter le reste de l’équipe : ${share} points d'expérience chacun !`
            : `Le reste de l’équipe en profite aussi : ${share} points d'expérience chacun.`,
        );
      }
      this.emit({ type: 'xp', index, xp: j.xp });
      for (const level of report.levels) {
        this.emit({ type: 'niveau', index, level });
        this.say(`${displayName(j)} monte au niveau ${level} !`);
      }
      if (report.levels.length > 0 && j === this.playerActive) {
        this.emit({ type: 'pv', side: 'joueur', hp: j.hp, maxHp: maxHp(j) });
      }
      for (const move of report.learned) this.say(`${displayName(j)} apprend ${MOVES[move].name} !`);
      for (const move of report.pending) this.emit({ type: 'apprentissage', index, moveId: move });
    }
  }

  private resolveTurnEnd(): void {
    if (!this.foe.some((j) => this.inPlay(j))) {
      if (this.bandit) this.say(`${this.trainerName ?? 'Le bandit'} n’a plus un seul Jinémon pour le protéger !`);
      else if (this.kind === 'dresseur') this.say(`Vous avez vaincu ${this.trainerName ?? 'le dresseur'} !`);
      this.finish('victoire');
      return;
    }
    if (!this.player.some((j) => !isFainted(j))) {
      this.say("Vous n'avez plus de Jinémon en état de combattre…");
      this.finish('defaite');
      return;
    }
    if (isFainted(this.foeActive)) this.sendNextFoe();
    if (isFainted(this.playerActive)) this.phase = 'remplacement';
  }

  // ── Intelligence artificielle ──────────────────────────────────────────

  private chooseFoeMove(): number {
    const user = this.foeActive;
    const usable = user.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0);
    if (usable.length === 0) return -1;
    if (this.ai === 'simple') {
      const weighted = usable.map(({ m, i }) => {
        const score = this.scoreMove(MOVES[m.id]);
        const weight = score <= 0 ? 0.1 : MOVES[m.id].power > 0 ? 2 : 1;
        return { i, weight };
      });
      return weightedPick(this.rng, weighted).i;
    }
    let best = usable[0].i;
    let bestScore = -Infinity;
    for (const { m, i } of usable) {
      const score = this.scoreMove(MOVES[m.id]) * (0.85 + this.rng.next() * 0.3);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /** Intérêt estimé d'une attaque pour l'adversaire. */
  private scoreMove(move: Move): number {
    const user = this.foeActive;
    const target = this.playerActive;
    const uv = this.vol.adversaire;
    const tv = this.vol.joueur;
    const accuracy = targetsOnlySelf(move) ? 1 : move.accuracy / 100;

    if (move.power > 0) {
      const { damage, multiplier } = computeDamage(user, uv.stages, target, tv.stages, move, this.rng, {
        allowCrit: false,
        randomize: false,
      });
      if (multiplier === 0) return 0;
      const expected = damage * accuracy;
      return damage >= target.hp ? expected * 1.5 + 10 : expected;
    }

    let score = 0;
    if (move.status) {
      const kind = move.status.kind;
      const species = getSpecies(target.speciesId);
      if (kind === 'confusion') {
        if (tv.confusion === 0) score = 25;
      } else if (
        !target.status &&
        !(kind === 'poison' && species.types.includes('Métal')) &&
        !(kind === 'sommeil' && species.talent === 'oeilVigilant')
      ) {
        score = kind === 'sommeil' ? 45 : kind === 'paralysie' ? 40 : 30;
      }
    }
    const ratio = user.hp / maxHp(user);
    if (move.heal !== undefined) {
      if (ratio < 0.5) score = Math.max(score, 60);
      else if (ratio < 0.8) score = Math.max(score, 10);
    }
    if (move.cureSelf && user.status) score = Math.max(score, 35);
    for (const change of move.stages ?? []) {
      if (change.target === 'self' && change.delta > 0 && uv.stages[change.stat] < 2 && ratio > 0.5) score += 15;
      if (change.target === 'foe' && change.delta < 0 && tv.stages[change.stat] > -2 && talentOf(target) !== 'ruse') {
        score += 10;
      }
    }
    return score * accuracy;
  }
}
