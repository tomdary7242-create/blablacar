import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, SPECIES, getSpecies } from '../src/data/ginedex';
import { ITEMS } from '../src/data/items';
import { MOVES, MOVE_IDS } from '../src/data/moves';
import { TALENTS } from '../src/data/talents';
import { TRAINERS, trainerTeam } from '../src/data/trainers';
import { TYPES, effectiveness } from '../src/data/types';

describe('Répertoire des attaques', () => {
  it('contient exactement 100 attaques uniques', () => {
    expect(MOVE_IDS).toHaveLength(100);
    expect(new Set(MOVE_IDS.map((id) => MOVES[id].name)).size).toBe(100);
  });

  it('couvre chacun des 14 types', () => {
    expect(TYPES).toHaveLength(14);
    for (const type of TYPES) {
      expect(MOVE_IDS.some((id) => MOVES[id].type === type), type).toBe(true);
    }
  });

  it('a des valeurs cohérentes', () => {
    for (const id of MOVE_IDS) {
      const m = MOVES[id];
      expect(m.accuracy, id).toBeGreaterThan(0);
      expect(m.accuracy, id).toBeLessThanOrEqual(100);
      expect(m.pp, id).toBeGreaterThan(0);
      if (m.tier === 'statut') expect(m.power, id).toBe(0);
      if (m.power === 0) {
        const hasEffect = !!(m.status || m.stages?.length || m.heal || m.cureSelf);
        expect(hasEffect, id).toBe(true);
      }
      if (m.tier === 'divin') expect(m.power, id).toBeGreaterThanOrEqual(110);
    }
  });

  it('propose chaque altération du GDD', () => {
    const kinds = new Set(MOVE_IDS.map((id) => MOVES[id].status?.kind).filter(Boolean));
    expect([...kinds].sort()).toEqual(['confusion', 'paralysie', 'poison', 'sommeil']);
    for (const stat of ['attack', 'defense', 'speed'] as const) {
      expect(MOVE_IDS.some((id) => MOVES[id].stages?.some((s) => s.stat === stat && s.delta > 0))).toBe(true);
      expect(MOVE_IDS.some((id) => MOVES[id].stages?.some((s) => s.stat === stat && s.delta < 0))).toBe(true);
    }
  });

  it("utilise chaque attaque dans au moins un bassin d'apprentissage", () => {
    const used = new Set(SPECIES.flatMap((s) => s.learnset.map(([, m]) => m)));
    expect(MOVE_IDS.filter((id) => !used.has(id))).toEqual([]);
  });
});

describe('Ginédex', () => {
  it('numérote les espèces sans trou à partir de 001', () => {
    SPECIES.forEach((s, i) => expect(s.id).toBe(i + 1));
    expect(new Set(SPECIES.map((s) => s.name)).size).toBe(SPECIES.length);
  });

  it('respecte les lignées du GDD', () => {
    const expected: Array<[number, string, string[]]> = [
      [1, 'Poussilope', ['Plante']],
      [2, 'Cultivare', ['Plante', 'Terre']],
      [3, 'Chiwate', ['Plante', 'Terre']],
      [4, 'Têtuanom', ['Eau']],
      [5, 'Amphinommo', ['Eau', 'Esprit']],
      [6, 'Nommoth', ['Eau', 'Esprit']],
      [7, 'Étincel', ['Feu']],
      [8, 'Forgeron-Feu', ['Feu', 'Métal']],
      [9, 'Vulcanis-Djinn', ['Feu', 'Métal']],
      [10, 'Termiton', ['Insecte']],
      [11, 'Termitox', ['Insecte', 'Terre']],
      [12, 'Rochard', ['Roche', 'Feu']],
    ];
    for (const [id, name, types] of expected) {
      expect(getSpecies(id).name).toBe(name);
      expect([...getSpecies(id).types]).toEqual(types);
    }
    for (const id of [1, 4, 7]) {
      expect(getSpecies(id).evolution?.level).toBe(16);
      expect(getSpecies(id + 1).evolution?.level).toBe(36);
    }
    expect(getSpecies(3).talent).toBe('auraMoissons');
    expect(getSpecies(6).talent).toBe('benedictionPluvieuse');
    expect(getSpecies(9).talent).toBe('coeurForge');
  });

  it("donne à chaque espèce un bassin d'environ 15 attaques entre 1 et 70", () => {
    for (const s of SPECIES) {
      const moves = s.learnset.map(([, m]) => m);
      expect(moves.length, s.name).toBeGreaterThanOrEqual(14);
      expect(moves.length, s.name).toBeLessThanOrEqual(16);
      expect(new Set(moves).size, s.name).toBe(moves.length);
      expect(s.learnset[0][0], s.name).toBe(1);
      let previous = 0;
      for (const [level, move] of s.learnset) {
        expect(move in MOVES, `${s.name} → ${move}`).toBe(true);
        expect(level).toBeGreaterThanOrEqual(previous);
        expect(level).toBeLessThanOrEqual(MAX_LEVEL);
        previous = level;
      }
    }
  });

  it('a des évolutions et talents valides', () => {
    for (const s of SPECIES) {
      if (s.evolution) {
        expect(() => getSpecies(s.evolution!.to)).not.toThrow();
        expect(s.evolution.level).toBeLessThan(MAX_LEVEL);
      }
      if (s.talent) expect(s.talent in TALENTS).toBe(true);
      expect(s.catchRate).toBeGreaterThan(0);
      expect(s.catchRate).toBeLessThanOrEqual(255);
      expect(s.folklore.length).toBeGreaterThan(10);
      expect(s.description.length).toBeGreaterThan(10);
    }
  });

  it("mélange les folklores d'Afrique de l'Ouest et du monde", () => {
    const folklores = SPECIES.map((s) => s.folklore);
    for (const origin of ['Dogon', 'Bambara', 'Peul', 'Soninké', 'Japon', 'Scandinavie', 'Chine', 'France']) {
      expect(folklores.some((f) => f.includes(origin)), origin).toBe(true);
    }
    expect(SPECIES.filter((s) => s.types.includes('Dragon')).length).toBeGreaterThanOrEqual(8);
  });
});

describe('Table des types', () => {
  it('forme le triangle des starters', () => {
    expect(effectiveness('Plante', ['Eau'])).toBe(2);
    expect(effectiveness('Eau', ['Feu'])).toBe(2);
    expect(effectiveness('Feu', ['Plante'])).toBe(2);
    expect(effectiveness('Eau', ['Plante'])).toBe(0.5);
  });

  it('combine les doubles types et les immunités', () => {
    expect(effectiveness('Eau', ['Plante', 'Terre'])).toBe(1);
    expect(effectiveness('Feu', ['Plante', 'Insecte'])).toBe(4);
    expect(effectiveness('Normal', ['Spectre'])).toBe(0);
    expect(effectiveness('Terre', ['Vol'])).toBe(0);
  });

  it('donne à chaque type au moins une force', () => {
    for (const attack of TYPES) {
      expect(TYPES.some((d) => effectiveness(attack, [d]) > 1) || attack === 'Normal', attack).toBe(true);
    }
  });
});

describe('Dresseurs et objets', () => {
  it('ont des équipes valides', () => {
    for (const t of Object.values(TRAINERS)) {
      for (const starter of [1, 4, 7]) {
        for (const mon of trainerTeam(t, starter)) {
          expect(() => getSpecies(mon.species)).not.toThrow();
          expect(mon.level).toBeGreaterThan(0);
          expect(mon.level).toBeLessThanOrEqual(MAX_LEVEL);
        }
      }
    }
  });

  it('confient à la rivale le starter avantagé', () => {
    const rival = TRAINERS.rival1;
    expect(trainerTeam(rival, 1)[0].species).toBe(7);
    expect(trainerTeam(rival, 4)[0].species).toBe(1);
    expect(trainerTeam(rival, 7)[0].species).toBe(4);
    expect(trainerTeam(TRAINERS.rival2, 7).at(-1)!.species).toBe(5);
  });

  it('remettent les trois insignes des Arènes', () => {
    const badges = Object.values(TRAINERS).map((t) => t.badge).filter(Boolean);
    expect(badges.sort()).toEqual(['enclume', 'pluie', 'traqueur']);
  });

  it('vendent la Calebasse Sacrée', () => {
    expect(ITEMS.calebasse.name).toBe('Calebasse Sacrée');
    expect(ITEMS.calebasse.effect.kind).toBe('capture');
  });
});
