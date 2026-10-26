// État complet d'une partie (ce qui est sauvegardé dans le LocalStorage).
import type { ItemId } from '../data/items';
import type { BadgeId } from '../data/trainers';
import type { Dir, ZoneId } from '../data/zones';
import { newClock, type Clock } from './clock';
import { createJinemon, healFully, isFainted, type Jinemon } from './creature';
import type { Rng } from './rng';

export const PARTY_SIZE = 6;

export interface Position {
  zone: ZoneId;
  x: number;
  y: number;
  dir: Dir;
}

export interface Options {
  textSpeed: 'lent' | 'normal' | 'rapide';
  sound: boolean;
  music: boolean;
}

export interface GameState {
  version: number;
  playerName: string;
  /** Espèce du starter choisi (0 tant que le Hogon ne l'a pas confié). */
  starter: number;
  position: Position;
  /** Dernier lieu de soin visité : point de retour après une défaite. */
  lastHeal: Position;
  party: Jinemon[];
  /** Jinémon gardés au Grenier. */
  storage: Jinemon[];
  inventory: Partial<Record<ItemId, number>>;
  /** Monnaie : les cauris. */
  cauris: number;
  badges: BadgeId[];
  dex: { seen: number[]; caught: number[] };
  flags: Record<string, boolean>;
  playTimeMs: number;
  nextUid: number;
  options: Options;
  /** Heure du monde (cycle jour / nuit). */
  clock: Clock;
  /** Hantises repoussées : zone → identifiant de la nuit où elles l'ont été. */
  repelled: Partial<Record<ZoneId, number>>;
}

/** On se réveille dans sa chambre, à côté de son lit. */
export const START_POSITION: Position = { zone: 'chambre', x: 2, y: 3, dir: 'bas' };

export function newGameState(playerName: string): GameState {
  return {
    version: 1,
    playerName,
    starter: 0,
    position: { ...START_POSITION },
    lastHeal: { zone: 'maison', x: 5, y: 6, dir: 'haut' },
    party: [],
    storage: [],
    inventory: {},
    cauris: 500,
    badges: [],
    dex: { seen: [], caught: [] },
    flags: {},
    playTimeMs: 0,
    nextUid: 1,
    options: { textSpeed: 'normal', sound: true, music: true },
    clock: newClock(),
    repelled: {},
  };
}

export function takeUid(state: GameState): number {
  const uid = state.nextUid;
  state.nextUid += 1;
  return uid;
}

export function markSeen(state: GameState, speciesId: number): void {
  if (!state.dex.seen.includes(speciesId)) state.dex.seen.push(speciesId);
}

export function markCaught(state: GameState, speciesId: number): void {
  markSeen(state, speciesId);
  if (!state.dex.caught.includes(speciesId)) state.dex.caught.push(speciesId);
}

/** Ajoute un Jinémon à l'équipe, ou au Grenier si l'équipe est complète. */
export function addJinemon(state: GameState, j: Jinemon): 'equipe' | 'grenier' {
  j.uid = takeUid(state);
  markCaught(state, j.speciesId);
  if (state.party.length < PARTY_SIZE) {
    state.party.push(j);
    return 'equipe';
  }
  state.storage.push(j);
  return 'grenier';
}

export function giveStarter(state: GameState, speciesId: number, rng: Rng): Jinemon {
  const j = createJinemon(speciesId, 5, rng);
  addJinemon(state, j);
  state.starter = speciesId;
  state.flags.starter = true;
  return j;
}

export function healParty(state: GameState): void {
  for (const j of state.party) healFully(j);
}

export function hasUsableJinemon(state: GameState): boolean {
  return state.party.some((j) => !isFainted(j));
}

export function itemCount(state: GameState, item: ItemId): number {
  return state.inventory[item] ?? 0;
}

export function addItem(state: GameState, item: ItemId, quantity = 1): void {
  state.inventory[item] = itemCount(state, item) + quantity;
}

export function removeItem(state: GameState, item: ItemId, quantity = 1): boolean {
  const count = itemCount(state, item);
  if (count < quantity) return false;
  if (count === quantity) delete state.inventory[item];
  else state.inventory[item] = count - quantity;
  return true;
}

export function hasBadge(state: GameState, badge: BadgeId): boolean {
  return state.badges.includes(badge);
}

export function formatPlayTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}
