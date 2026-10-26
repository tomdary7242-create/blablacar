import { describe, expect, it } from 'vitest';
import { ZONES } from '../src/data/zones';
import { START_POSITION, addItem, giveStarter, markSeen, newGameState } from '../src/engine/gameState';
import { SAVE_KEY, deleteSave, hasSave, loadGame, saveGame, standable, type StorageLike } from '../src/engine/saveManager';
import { seededRng } from '../src/engine/rng';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('Gestionnaire de sauvegarde', () => {
  it("sauvegarde et recharge l'équipe, l'inventaire et le Ginédex", () => {
    const storage = memoryStorage();
    const state = newGameState('Awa');
    giveStarter(state, 4, seededRng(1));
    addItem(state, 'calebasse', 5);
    markSeen(state, 14);
    state.badges.push('enclume');
    state.position = { zone: 'savane', x: 8, y: 20, dir: 'haut' };
    expect(saveGame(state, storage)).toBe(true);
    expect(hasSave(storage)).toBe(true);

    const loaded = loadGame(storage)!;
    expect(loaded.playerName).toBe('Awa');
    expect(loaded.party[0].speciesId).toBe(4);
    expect(loaded.party[0].moves.length).toBeGreaterThan(0);
    expect(loaded.inventory.calebasse).toBe(5);
    expect(loaded.dex.seen).toEqual(expect.arrayContaining([4, 14]));
    expect(loaded.dex.caught).toEqual([4]);
    expect(loaded.badges).toEqual(['enclume']);
    expect(loaded.position).toEqual({ zone: 'savane', x: 8, y: 20, dir: 'haut' });
    expect(loaded.flags.starter).toBe(true);
  });

  it('ignore une sauvegarde corrompue', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{pas du json');
    expect(loadGame(storage)).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    expect(loadGame(storage)).toBeNull();
  });

  it('écarte les données inconnues', () => {
    const storage = memoryStorage();
    const state = newGameState('Kofi');
    giveStarter(state, 7, seededRng(2));
    const raw = JSON.parse(JSON.stringify(state));
    raw.party.push({ speciesId: 999, level: 5, moves: [{ id: 'coupDePatte', pp: 10 }] });
    raw.inventory.objetMystere = 3;
    raw.badges.push('faux');
    raw.position.zone = 'atlantide';
    storage.setItem(SAVE_KEY, JSON.stringify(raw));
    const loaded = loadGame(storage)!;
    expect(loaded.party).toHaveLength(1);
    expect(loaded.inventory).toEqual({});
    expect(loaded.badges).toEqual([]);
    expect(loaded.position).toEqual(START_POSITION);
  });

  it('ramène en lieu sûr une position devenue invalide (carte redessinée)', () => {
    const storage = memoryStorage();
    const state = newGameState('Ama');
    giveStarter(state, 1, seededRng(3));
    // Dans l'ancien village, on se tenait là où s'élève aujourd'hui le sanctuaire.
    state.position = { zone: 'village', x: 18, y: 4, dir: 'bas' };
    state.lastHeal = { zone: 'terresRouges', x: 4, y: 5, dir: 'bas' };
    saveGame(state, storage);
    const loaded = loadGame(storage)!;
    expect(loaded.position).toEqual({ zone: 'village', ...ZONES.village.flyPoint! });
    expect(loaded.lastHeal).toEqual({ zone: 'terresRouges', ...ZONES.terresRouges.flyPoint! });
    expect(standable(loaded.position)).toBe(true);
  });

  it('efface la sauvegarde', () => {
    const storage = memoryStorage();
    saveGame(newGameState('Moussa'), storage);
    deleteSave(storage);
    expect(hasSave(storage)).toBe(false);
    expect(loadGame(storage)).toBeNull();
  });

  it('fonctionne sans stockage disponible', () => {
    expect(saveGame(newGameState('X'), null)).toBe(false);
    expect(loadGame(null)).toBeNull();
  });
});
