import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/ginedex';
import { ITEM_IDS, isCaptureItem } from '../src/data/items';
import { MOVES } from '../src/data/moves';
import { TRAINERS, trainerTeam } from '../src/data/trainers';
import { Combat, typeMultiplierFor, type CombatEvent } from '../src/engine/combat';
import { canUseItem, createJinemon, isFainted, maxHp, type Jinemon } from '../src/engine/creature';
import { seededRng, type Rng } from '../src/engine/rng';

const MAX_TURNS = 400;

/** Joueur automatique : choisit l'attaque la plus puissante compte tenu des types. */
function bestMove(combat: Combat): number {
  const me = combat.playerActive;
  const foe = combat.foeActive;
  let best = -1;
  let bestScore = -1;
  me.moves.forEach((m, i) => {
    if (m.pp <= 0) return;
    const move = MOVES[m.id];
    const stab = getSpecies(me.speciesId).types.includes(move.type) ? 1.5 : 1;
    const score = move.power > 0 ? move.power * stab * typeMultiplierFor(move.type, foe) * (move.accuracy / 100) : 1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

function checkEvents(events: CombatEvent[]): void {
  for (const e of events) {
    if (e.type === 'pv') {
      expect(e.hp).toBeGreaterThanOrEqual(0);
      expect(e.hp).toBeLessThanOrEqual(e.maxHp);
    }
  }
}

function playOut(combat: Combat, rng: Rng, chooser: () => Parameters<Combat['submit']>[0]): number {
  checkEvents(combat.start());
  let turns = 0;
  while (!combat.isOver()) {
    turns += 1;
    if (turns > MAX_TURNS) throw new Error('Combat interminable');
    if (combat.phase === 'remplacement') {
      const options = combat.player.map((_, i) => i).filter((i) => combat.canSwitchTo(i));
      checkEvents(combat.submitReplacement(options[Math.floor(rng.next() * options.length)]));
      continue;
    }
    checkEvents(combat.submit(chooser()));
    for (const j of [...combat.player, ...combat.foe]) {
      expect(j.hp).toBeGreaterThanOrEqual(0);
      expect(j.hp).toBeLessThanOrEqual(maxHp(j));
    }
    for (const side of ['joueur', 'adversaire'] as const) {
      for (const v of Object.values(combat.stagesOf(side))) expect(Math.abs(v)).toBeLessThanOrEqual(6);
    }
  }
  return turns;
}

/** Équipe type du joueur au moment d'affronter un dresseur. */
function playerTeam(starter: number, level: number, rng: Rng): Jinemon[] {
  let species = starter;
  for (let s = getSpecies(species); s.evolution && level >= s.evolution.level; s = getSpecies(species)) species = s.evolution.to;
  const support = [43, 35, 22, 41, 49, 53];
  return [species, ...support.slice(0, 3)].map((id) => {
    let sp = id;
    for (let s = getSpecies(sp); s.evolution && level >= s.evolution.level; s = getSpecies(sp)) sp = s.evolution.to;
    return createJinemon(sp, id === species ? level : level - 2, rng);
  });
}

describe('Simulation de combats', () => {
  it('mène chaque combat de dresseur à son terme, pour chaque starter', () => {
    let wins = 0;
    let total = 0;
    for (const trainer of Object.values(TRAINERS)) {
      for (const starter of [1, 4, 7]) {
        const rng = seededRng(trainer.id.length * 31 + starter);
        const team = trainerTeam(trainer, starter);
        const foe = team.map((m) => createJinemon(m.species, m.level, rng, 0, m.moves));
        const top = Math.max(...team.map((m) => m.level));
        const combat = new Combat({ kind: 'dresseur', player: playerTeam(starter, top + 2, rng), foe, rng, trainerName: trainer.name, ai: trainer.ai });
        playOut(combat, rng, () => ({ kind: 'attaque', moveIndex: bestMove(combat) }));
        expect(['victoire', 'defaite']).toContain(combat.outcome);
        total += 1;
        if (combat.outcome === 'victoire') wins += 1;
      }
    }
    // Avec une équipe au bon niveau et un jeu simple, la plupart des combats doivent être gagnables.
    expect(wins / total).toBeGreaterThan(0.6);
  });

  it('résiste à 300 combats sauvages aux actions aléatoires', () => {
    const rng = seededRng(2024);
    const healing = ITEM_IDS.filter((i) => !isCaptureItem(i));
    const capture = ITEM_IDS.filter(isCaptureItem);
    const outcomes = new Map<string, number>();
    for (let n = 0; n < 300; n++) {
      const pick = () => SPECIES[Math.floor(rng.next() * SPECIES.length)].id;
      const level = 1 + Math.floor(rng.next() * 70);
      const party = Array.from({ length: 1 + Math.floor(rng.next() * 6) }, () =>
        createJinemon(pick(), Math.max(1, level + Math.floor(rng.next() * 10) - 5), rng),
      );
      const combat = new Combat({ kind: 'sauvage', player: party, foe: [createJinemon(pick(), level, rng)], rng });
      playOut(combat, rng, () => {
        const r = rng.next();
        if (r < 0.06) return { kind: 'fuite' };
        if (r < 0.14) return { kind: 'capture', item: capture[Math.floor(rng.next() * capture.length)] };
        if (r < 0.22) {
          const switches = party.map((_, i) => i).filter((i) => combat.canSwitchTo(i));
          if (switches.length) return { kind: 'changer', partyIndex: switches[Math.floor(rng.next() * switches.length)] };
        }
        if (r < 0.3) {
          const item = healing[Math.floor(rng.next() * healing.length)];
          const target = party.findIndex((j) => canUseItem(j, item));
          if (target >= 0) return { kind: 'objet', item, partyIndex: target };
        }
        const usable = combat.playerActive.moves.map((m, i) => (m.pp > 0 ? i : -1)).filter((i) => i >= 0);
        return { kind: 'attaque', moveIndex: usable.length ? usable[Math.floor(rng.next() * usable.length)] : -1 };
      });
      outcomes.set(combat.outcome!, (outcomes.get(combat.outcome!) ?? 0) + 1);
      if (combat.outcome === 'capture') expect(isFainted(combat.captured!)).toBe(false);
      if (combat.outcome === 'defaite') expect(party.every(isFainted)).toBe(true);
    }
    for (const outcome of ['victoire', 'defaite', 'fuite', 'capture']) expect(outcomes.get(outcome) ?? 0, outcome).toBeGreaterThan(0);
  });
});
