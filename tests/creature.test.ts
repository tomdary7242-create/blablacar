import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/ginedex';
import {
  applyItem,
  availableMoves,
  createJinemon,
  evolutionTarget,
  evolve,
  gainXp,
  learnMove,
  maxHp,
  xpForLevel,
} from '../src/engine/creature';
import { seededRng } from '../src/engine/rng';

describe('Jinémon', () => {
  it('connaît par défaut ses quatre dernières attaques apprises', () => {
    const j = createJinemon(1, 30, seededRng(1));
    expect(j.moves.map((m) => m.id)).toEqual(['racineEpineuse', 'berceuseFeuilles', 'seveNourriciere', 'piegeBoue']);
    expect(getSpecies(1).learnset.find(([, m]) => m === 'piegeBoue')?.[0]).toBe(29);
    expect(j.hp).toBe(maxHp(j));
    expect(j.xp).toBe(xpForLevel(30));
  });

  it('monte de niveau et apprend ses attaques', () => {
    const j = createJinemon(1, 4, seededRng(2));
    expect(j.moves.map((m) => m.id)).toEqual(['coupDePatte', 'criDeGuerre']);
    const report = gainXp(j, xpForLevel(5) - j.xp);
    expect(report.levels).toEqual([5]);
    expect(report.learned).toEqual(['pousseMil']);
    expect(j.moves).toHaveLength(3);
  });

  it("met en attente l'apprentissage quand les 4 emplacements sont pleins", () => {
    const j = createJinemon(1, 16, seededRng(3));
    expect(j.moves).toHaveLength(4);
    const report = gainXp(j, xpForLevel(17) - j.xp);
    expect(report.pending).toEqual(['racineEpineuse']);
    expect(learnMove(j, 'racineEpineuse', 0)).toBe(true);
    expect(j.moves[0].id).toBe('racineEpineuse');
    expect(availableMoves(j)).toContain('coupDePatte');
  });

  it('ne dépasse jamais le niveau 70', () => {
    const j = createJinemon(9, 69, seededRng(4));
    gainXp(j, 10_000_000);
    expect(j.level).toBe(70);
    expect(gainXp(j, 1000).levels).toEqual([]);
  });

  it('évolue au niveau fixé par le Ginédex', () => {
    const j = createJinemon(1, 15, seededRng(5));
    expect(evolutionTarget(j)).toBeNull();
    gainXp(j, xpForLevel(16) - j.xp);
    expect(evolutionTarget(j)).toBe(2);
    const before = maxHp(j);
    evolve(j, 2);
    expect(j.speciesId).toBe(2);
    expect(maxHp(j)).toBeGreaterThan(before);
  });

  it('utilise les remèdes traditionnels', () => {
    const j = createJinemon(4, 20, seededRng(6));
    expect(applyItem(j, 'karite')).toBeNull();
    j.hp = 5;
    expect(applyItem(j, 'karite')).toContain('20 PV');
    expect(j.hp).toBe(25);
    j.status = { kind: 'poison' };
    expect(applyItem(j, 'moringa')).not.toBeNull();
    expect(j.status).toBeNull();
    j.hp = 0;
    expect(applyItem(j, 'bissap')).toBeNull();
    expect(applyItem(j, 'kola')).not.toBeNull();
    expect(j.hp).toBe(Math.floor(maxHp(j) / 2));
  });
});
