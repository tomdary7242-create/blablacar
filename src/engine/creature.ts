// Instances de Jinémon : statistiques, expérience, apprentissage et évolution.
import { getSpecies, MAX_LEVEL, type BaseStats } from '../data/ginedex';
import { getItem, type ItemId } from '../data/items';
import { MOVES, type MoveId } from '../data/moves';
import { randInt, type Rng } from './rng';

/** Altérations persistantes (conservées après le combat jusqu'à guérison). */
export type MajorStatus =
  | { kind: 'sommeil'; turns: number }
  | { kind: 'poison' }
  | { kind: 'paralysie' };

export interface MoveSlot {
  id: MoveId;
  pp: number;
}

export interface Jinemon {
  uid: number;
  speciesId: number;
  nickname?: string;
  level: number;
  /** Expérience totale accumulée. */
  xp: number;
  /** Potentiels individuels (0 à 15) : deux Jinémon d'une même espèce ne sont jamais identiques. */
  ivs: BaseStats;
  hp: number;
  moves: MoveSlot[];
  status: MajorStatus | null;
}

export type Stats = BaseStats;

export function computeStats(speciesId: number, level: number, ivs: BaseStats): Stats {
  const base = getSpecies(speciesId).baseStats;
  const calc = (b: number, iv: number) => Math.floor(((2 * b + iv) * level) / 100);
  return {
    hp: calc(base.hp, ivs.hp) + level + 10,
    attack: calc(base.attack, ivs.attack) + 5,
    defense: calc(base.defense, ivs.defense) + 5,
    speed: calc(base.speed, ivs.speed) + 5,
  };
}

export function getStats(j: Jinemon): Stats {
  return computeStats(j.speciesId, j.level, j.ivs);
}

export function maxHp(j: Jinemon): number {
  return getStats(j).hp;
}

export function displayName(j: Jinemon): string {
  return j.nickname ?? getSpecies(j.speciesId).name;
}

export function isFainted(j: Jinemon): boolean {
  return j.hp <= 0;
}

/** Expérience totale nécessaire pour atteindre un niveau (courbe cubique). */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : level ** 3;
}

/** Expérience donnée par un adversaire vaincu. */
export function xpYield(foe: Jinemon, fromTrainer: boolean): number {
  const base = Math.floor((getSpecies(foe.speciesId).baseXp * foe.level) / 7);
  return Math.max(1, Math.floor(base * (fromTrainer ? 1.5 : 1)));
}

/** Attaques du bassin apprises jusqu'à `level` inclus (sans doublon, dans l'ordre). */
export function movesUpTo(speciesId: number, level: number): MoveId[] {
  const seen = new Set<MoveId>();
  const out: MoveId[] = [];
  for (const [lvl, move] of getSpecies(speciesId).learnset) {
    if (lvl <= level && !seen.has(move)) {
      seen.add(move);
      out.push(move);
    }
  }
  return out;
}

export function movesLearnedAt(speciesId: number, level: number): MoveId[] {
  return getSpecies(speciesId).learnset.filter(([lvl]) => lvl === level).map(([, m]) => m);
}

export function slot(id: MoveId): MoveSlot {
  return { id, pp: MOVES[id].pp };
}

/** Les quatre dernières attaques apprises : le jeu d'attaques par défaut. */
export function defaultMoves(speciesId: number, level: number): MoveSlot[] {
  return movesUpTo(speciesId, level).slice(-4).map(slot);
}

export function randomIvs(rng: Rng): BaseStats {
  return { hp: randInt(rng, 0, 15), attack: randInt(rng, 0, 15), defense: randInt(rng, 0, 15), speed: randInt(rng, 0, 15) };
}

export function createJinemon(
  speciesId: number,
  level: number,
  rng: Rng,
  uid = 0,
  moves?: readonly MoveId[],
): Jinemon {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, level));
  const ivs = randomIvs(rng);
  const j: Jinemon = {
    uid,
    speciesId,
    level: lvl,
    xp: xpForLevel(lvl),
    ivs,
    hp: 0,
    moves: moves ? moves.slice(0, 4).map(slot) : defaultMoves(speciesId, lvl),
    status: null,
  };
  j.hp = maxHp(j);
  return j;
}

export interface LevelUpReport {
  /** Niveaux atteints, dans l'ordre. */
  levels: number[];
  /** Attaques apprises automatiquement (emplacement libre). */
  learned: MoveId[];
  /** Attaques à apprendre qui demandent de remplacer une attaque existante. */
  pending: MoveId[];
}

/** Ajoute de l'expérience et gère les montées de niveau. */
export function gainXp(j: Jinemon, amount: number): LevelUpReport {
  const report: LevelUpReport = { levels: [], learned: [], pending: [] };
  if (j.level >= MAX_LEVEL) return report;
  j.xp += Math.max(0, Math.floor(amount));
  while (j.level < MAX_LEVEL && j.xp >= xpForLevel(j.level + 1)) {
    const before = maxHp(j);
    j.level += 1;
    const after = maxHp(j);
    if (j.hp > 0) j.hp = Math.min(after, j.hp + (after - before));
    report.levels.push(j.level);
    for (const move of movesLearnedAt(j.speciesId, j.level)) {
      if (j.moves.some((m) => m.id === move)) continue;
      if (j.moves.length < 4) {
        j.moves.push(slot(move));
        report.learned.push(move);
      } else if (!report.pending.includes(move)) {
        report.pending.push(move);
      }
    }
  }
  if (j.level >= MAX_LEVEL) j.xp = xpForLevel(MAX_LEVEL);
  return report;
}

/**
 * Apprend une attaque. `replaceIndex` désigne l'attaque oubliée
 * (ignoré s'il reste un emplacement libre).
 */
export function learnMove(j: Jinemon, move: MoveId, replaceIndex?: number): boolean {
  if (j.moves.some((m) => m.id === move)) return false;
  if (j.moves.length < 4) {
    j.moves.push(slot(move));
    return true;
  }
  if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex >= j.moves.length) return false;
  j.moves[replaceIndex] = slot(move);
  return true;
}

/** Toutes les attaques déjà accessibles à ce niveau (le joueur peut en changer à tout moment). */
export function availableMoves(j: Jinemon): MoveId[] {
  return movesUpTo(j.speciesId, j.level);
}

/** Identifiant de l'espèce vers laquelle le Jinémon peut évoluer, ou null. */
export function evolutionTarget(j: Jinemon): number | null {
  const evo = getSpecies(j.speciesId).evolution;
  return evo && j.level >= evo.level ? evo.to : null;
}

export function evolve(j: Jinemon, to: number): void {
  const before = maxHp(j);
  j.speciesId = to;
  const after = maxHp(j);
  if (j.hp > 0) j.hp = Math.min(after, j.hp + (after - before));
}

export function healFully(j: Jinemon): void {
  j.hp = maxHp(j);
  j.status = null;
  for (const m of j.moves) m.pp = MOVES[m.id].pp;
}

export function xpProgress(j: Jinemon): number {
  if (j.level >= MAX_LEVEL) return 1;
  const lo = xpForLevel(j.level);
  const hi = xpForLevel(j.level + 1);
  return Math.max(0, Math.min(1, (j.xp - lo) / (hi - lo)));
}

/** Indique si un objet de soin aurait un effet sur ce Jinémon. */
export function canUseItem(j: Jinemon, itemId: ItemId): boolean {
  const effect = getItem(itemId).effect;
  switch (effect.kind) {
    case 'soin':
      return !isFainted(j) && j.hp < maxHp(j);
    case 'guerison':
      return !isFainted(j) && j.status !== null;
    case 'reanimation':
      return isFainted(j);
    case 'capture':
      return false;
  }
}

/** Applique un objet de soin. Retourne le message à afficher, ou null si sans effet. */
export function applyItem(j: Jinemon, itemId: ItemId): string | null {
  if (!canUseItem(j, itemId)) return null;
  const effect = getItem(itemId).effect;
  const name = displayName(j);
  switch (effect.kind) {
    case 'soin': {
      const healed = Math.min(effect.amount, maxHp(j) - j.hp);
      j.hp += healed;
      return `${name} récupère ${healed} PV !`;
    }
    case 'guerison':
      j.status = null;
      return `${name} est guéri de son altération !`;
    case 'reanimation':
      j.hp = Math.max(1, Math.floor(maxHp(j) * effect.fraction));
      return `${name} reprend connaissance !`;
    case 'capture':
      return null;
  }
}
