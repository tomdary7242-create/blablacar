// Sauvegarde automatique de la partie dans le LocalStorage :
// équipe, niveaux, inventaire (calebasses…), Ginédex, insignes et progression.
import { SPECIES } from '../data/ginedex';
import { ITEMS, type ItemId } from '../data/items';
import { MOVES } from '../data/moves';
import { BADGES, type BadgeId } from '../data/trainers';
import { ZONES } from '../data/zones';
import { maxHp, type Jinemon } from './creature';
import { newGameState, type GameState } from './gameState';

export const SAVE_KEY = 'ginemon:sauvegarde';
export const SAVE_VERSION = 1;

/** Sous-ensemble de l'API Storage : permet d'injecter un stockage en mémoire dans les tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...state, version: SAVE_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    return !!storage?.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function deleteSave(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // stockage indisponible : rien à effacer
  }
}

export function loadGame(storage: StorageLike | null = defaultStorage()): GameState | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

const speciesIds = new Set(SPECIES.map((s) => s.id));

function sanitizeJinemon(value: unknown): Jinemon | null {
  if (!value || typeof value !== 'object') return null;
  const j = value as Jinemon;
  if (!speciesIds.has(j.speciesId) || typeof j.level !== 'number') return null;
  const moves = Array.isArray(j.moves) ? j.moves.filter((m) => m && m.id in MOVES).slice(0, 4) : [];
  if (moves.length === 0) return null;
  const ivs = j.ivs ?? { hp: 0, attack: 0, defense: 0, speed: 0 };
  const clean: Jinemon = {
    uid: Number(j.uid) || 0,
    speciesId: j.speciesId,
    nickname: typeof j.nickname === 'string' ? j.nickname : undefined,
    level: Math.max(1, Math.min(70, Math.floor(j.level))),
    xp: Math.max(0, Number(j.xp) || 0),
    ivs,
    hp: 0,
    moves: moves.map((m) => ({ id: m.id, pp: Math.max(0, Math.min(MOVES[m.id].pp, Number(m.pp) || 0)) })),
    status: j.status && ['sommeil', 'poison', 'paralysie'].includes(j.status.kind) ? j.status : null,
  };
  clean.hp = Math.max(0, Math.min(maxHp(clean), Number(j.hp) || 0));
  return clean;
}

/** Valide une sauvegarde et complète les champs manquants (sauvegardes anciennes ou corrompues). */
export function sanitize(data: unknown): GameState | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<GameState>;
  if (typeof d.version !== 'number' || d.version > SAVE_VERSION) return null;
  const state = newGameState(typeof d.playerName === 'string' && d.playerName ? d.playerName : 'Initié');

  const validPos = (p: GameState['position'] | undefined) =>
    !!p && p.zone in ZONES && Number.isInteger(p.x) && Number.isInteger(p.y);
  if (validPos(d.position)) state.position = { ...d.position! };
  if (validPos(d.lastHeal)) state.lastHeal = { ...d.lastHeal! };

  state.party = (Array.isArray(d.party) ? d.party : []).map(sanitizeJinemon).filter((j): j is Jinemon => !!j).slice(0, 6);
  state.storage = (Array.isArray(d.storage) ? d.storage : []).map(sanitizeJinemon).filter((j): j is Jinemon => !!j);
  state.starter = speciesIds.has(Number(d.starter)) ? Number(d.starter) : 0;

  for (const [item, count] of Object.entries(d.inventory ?? {})) {
    if (item in ITEMS && typeof count === 'number' && count > 0) state.inventory[item as ItemId] = Math.floor(count);
  }
  state.cauris = Math.max(0, Math.floor(Number(d.cauris) || 0));
  state.badges = (Array.isArray(d.badges) ? d.badges : []).filter((b): b is BadgeId => b in BADGES);
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((n) => speciesIds.has(n)) : []);
  state.dex = { seen: ids(d.dex?.seen), caught: ids(d.dex?.caught) };
  state.flags = d.flags && typeof d.flags === 'object' ? { ...d.flags } : {};
  state.playTimeMs = Math.max(0, Number(d.playTimeMs) || 0);
  const maxUid = Math.max(0, ...state.party.map((j) => j.uid), ...state.storage.map((j) => j.uid));
  state.nextUid = Math.max(Number(d.nextUid) || 1, maxUid + 1);
  if (d.options) {
    state.options = {
      textSpeed: ['lent', 'normal', 'rapide'].includes(d.options.textSpeed) ? d.options.textSpeed : 'normal',
      sound: d.options.sound !== false,
      music: d.options.music !== false,
    };
  }
  const clock = d.clock as Partial<GameState['clock']> | undefined;
  if (clock && Number.isInteger(clock.day) && clock.day! >= 1 && typeof clock.minute === 'number' && clock.minute >= 0 && clock.minute < 1440) {
    state.clock = { day: clock.day!, minute: clock.minute };
  }
  for (const [zone, night] of Object.entries(d.repelled ?? {})) {
    if (zone in ZONES && Number.isInteger(night)) state.repelled[zone as keyof typeof ZONES] = night as number;
  }
  // Une partie sans Jinémon après le choix du starter est incohérente : on repart du début.
  if (state.starter && state.party.length === 0 && state.storage.length === 0) return null;
  if (state.party.length === 0 && state.storage.length > 0) state.party.push(state.storage.shift()!);
  return state;
}
