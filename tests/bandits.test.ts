import { describe, expect, it } from 'vitest';
import { TRAINERS } from '../src/data/trainers';
import { Combat, PLAYER_EDGE, computeDamage } from '../src/engine/combat';
import { XP_BOOST, createJinemon, maxHp, xpYield, type Jinemon } from '../src/engine/creature';
import { HOME_BED, newGameState, sleepHere } from '../src/engine/gameState';
import {
  Duel,
  banditFighter,
  catchBreath,
  heroFighter,
  heroHp,
  heroMaxHp,
  monsterFighter,
  setHeroHp,
  type DuelAction,
} from '../src/engine/hero';
import { seededRng } from '../src/engine/rng';
import { sanitize } from '../src/engine/saveManager';
import type { MoveId } from '../src/data/moves';

const neutral = { attack: 0, defense: 0, speed: 0 };

function mon(species: number, level: number, moves?: MoveId[], seed = 1): Jinemon {
  const j = createJinemon(species, level, seededRng(seed), 0, moves);
  j.ivs = { hp: 8, attack: 8, defense: 8, speed: 8 };
  j.hp = maxHp(j);
  return j;
}

/** Joue un duel jusqu'au bout avec la même action. */
function fight(duel: Duel, action: DuelAction): number {
  duel.start();
  let turns = 0;
  while (duel.phase === 'choix' && turns < 50) {
    duel.submit(action);
    turns++;
  }
  return turns;
}

describe('Un jeu un peu plus facile', () => {
  it('les coups du camp du joueur portent 25 % de plus', () => {
    expect(PLAYER_EDGE).toBe(1.25);
    const a = mon(7, 30);
    const b = mon(33, 30);
    const opts = { allowCrit: false, randomize: false };
    const base = computeDamage(a, neutral, b, neutral, { power: 60, type: 'Feu' }, seededRng(1), opts).damage;
    const edged = computeDamage(a, neutral, b, neutral, { power: 60, type: 'Feu' }, seededRng(1), { ...opts, edge: PLAYER_EDGE }).damage;
    expect(edged / base).toBeGreaterThan(1.2);
    expect(edged / base).toBeLessThan(1.3);
  });

  it('les niveaux montent plus vite', () => {
    expect(XP_BOOST).toBeGreaterThan(1);
    const foe = mon(14, 10);
    // 1.5 (dresseur) × 1.5 (bonus) : 2,25 fois l'expérience de base.
    expect(xpYield(foe, true)).toBeGreaterThan(xpYield(foe, false) * 1.4);
  });

  it('après un combat, le héros et ses Jinémon debout reprennent leur souffle', () => {
    const s = newGameState('Awa');
    const j = mon(1, 20);
    const ko = mon(4, 20);
    s.party.push(j, ko);
    j.hp = 10;
    ko.hp = 0;
    s.heroWounds = 40;
    expect(catchBreath(s, maxHp)).toBe(true);
    expect(j.hp).toBeGreaterThan(10);
    expect(ko.hp).toBe(0);
    expect(s.heroWounds).toBeLessThan(40);
  });
});

describe('Les bandits', () => {
  const masters = Object.values(TRAINERS).filter((t) => t.badge);
  const rivals = Object.values(TRAINERS).filter((t) => t.rivalStage);

  it('les dresseurs de route sont des bandits, souvent recherchés', () => {
    const bandits = Object.values(TRAINERS).filter((t) => t.bandit);
    expect(bandits.length).toBeGreaterThan(30);
    for (const t of bandits) {
      expect(t.bandit!.plea.length, t.id).toBeGreaterThan(0);
      expect(t.defeat.length, t.id).toBeGreaterThan(0);
      expect(t.after.length, t.id).toBeGreaterThan(0);
    }
    const wanted = bandits.filter((t) => t.bandit!.prime > 0);
    expect(wanted.length / bandits.length).toBeGreaterThan(0.7);
    // La rivale et le Conseil se battent loyalement ; parmi les Maîtres, seul le chef des Masques Brisés est un bandit.
    for (const t of rivals) expect(t.bandit, t.id).toBeUndefined();
    expect(masters.filter((t) => t.bandit).map((t) => t.id)).toEqual(['kouma']);
    expect(TRAINERS.balla.bandit).toBeUndefined();
  });

  it('on ne peut arracher un Jinémon à un bandit que s’il est affaibli', () => {
    const foes = [mon(14, 5), mon(16, 5)];
    const c = new Combat({ kind: 'dresseur', bandit: true, player: [mon(7, 30)], foe: foes, rng: seededRng(4), trainerName: 'Hamadou' });
    c.start();
    expect(c.captureRefusal()).toMatch(/Affaiblissez/);
    c.submit({ kind: 'capture', item: 'calebasseRoyale' });
    expect(c.turn).toBe(0);
    foes[0].hp = 1;
    expect(c.captureRefusal()).toBeNull();
    // Un Jinémon endormi ou paralysé se capture aussi, même en pleine forme.
    foes[1].status = { kind: 'sommeil', turns: 3 };
    expect(c.isWeakened()).toBe(true);
    // Un Maître, lui, garde ses Jinémon.
    const loyal = new Combat({ kind: 'dresseur', player: [mon(7, 30)], foe: [mon(14, 5)], rng: seededRng(4), trainerName: 'Sirafa' });
    loyal.start();
    expect(loyal.captureRefusal()).toMatch(/règles/);
  });

  it('un Jinémon arraché au bandit rejoint le joueur, et le combat continue', () => {
    let captured = false;
    for (let seed = 1; seed < 40 && !captured; seed++) {
      const foes = [mon(14, 3), mon(16, 3)];
      foes[0].hp = 1;
      const c = new Combat({ kind: 'dresseur', bandit: true, player: [mon(7, 30)], foe: foes, rng: seededRng(seed), trainerName: 'Hamadou' });
      c.start();
      const events = c.submit({ kind: 'capture', item: 'calebasseRoyale' });
      if (!events.some((e) => e.type === 'capture' && e.success)) continue;
      captured = true;
      expect(c.stolen).toEqual([foes[0]]);
      expect(c.isOver()).toBe(false);
      expect(c.foeActive).toBe(foes[1]);
      // Le dernier, mis à terre : le bandit n'a plus personne pour le protéger.
      foes[1].hp = 1;
      c.submit({ kind: 'attaque', moveIndex: 0 });
      expect(c.outcome).toBe('victoire');
    }
    expect(captured).toBe(true);
  });

  it('le duel : on met le bandit à terre, ou il nous y met', () => {
    const s = newGameState('Awa');
    s.party.push(mon(7, 20));
    const hero = heroFighter(s, 'Awa');
    expect(hero.maxHp).toBe(heroMaxHp(s));
    const duel = new Duel('bandit', hero, banditFighter('Hamadou', 20), seededRng(3));
    const turns = fight(duel, 'frapper');
    expect(duel.outcome).toBe('victoire');
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(turns).toBeLessThan(8);
    // Un héros à bout de forces face à un bandit bien plus fort finit à terre.
    const weak = { ...heroFighter(s, 'Awa'), hp: 5 };
    const lost = new Duel('bandit', weak, banditFighter('Sogo', 60), seededRng(3));
    fight(lost, 'parer');
    expect(lost.outcome).toBe('defaite');
    expect(lost.hero.hp).toBe(0);
  });

  it('parer encaisse bien moins qu’un coup reçu de plein fouet', () => {
    const taken = (action: DuelAction) => {
      let total = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const duel = new Duel('bandit', { name: 'Awa', level: 20, hp: 999, maxHp: 999, attack: 0.01 }, { ...banditFighter('B', 30), hp: 9999, maxHp: 9999 }, seededRng(seed));
        duel.start();
        duel.submit(action);
        total += 999 - duel.hero.hp;
      }
      return total;
    };
    expect(taken('parer')).toBeLessThan(taken('frapper') * 0.4);
  });
});

describe('La nuit', () => {
  it('le monstre s’en prend au héros : on peut fuir, mais il frappe fort et nos coups l’effleurent', () => {
    const s = newGameState('Awa');
    s.party.push(mon(7, 20));
    let fled = 0;
    let died = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const duel = new Duel('monstre', heroFighter(s, 'Awa'), monsterFighter('Boudarou', 20, 60, 60), seededRng(seed));
      expect(duel.actions).toEqual(['frapper', 'fuir']);
      fight(duel, seed % 2 ? 'fuir' : 'frapper');
      if (duel.outcome === 'fuite') fled++;
      if (duel.outcome === 'defaite') died++;
    }
    expect(fled).toBeGreaterThan(0);
    expect(died).toBeGreaterThan(0);
  });

  it('les PV du héros grandissent avec son équipe et se sauvegardent', () => {
    const s = newGameState('Awa');
    s.party.push(mon(7, 5));
    const low = heroMaxHp(s);
    s.party.push(mon(1, 40));
    expect(heroMaxHp(s)).toBeGreaterThan(low);
    setHeroHp(s, 30);
    expect(heroHp(s)).toBe(30);
    s.starter = 7;
    s.outlaws = { hamadou: 'arrete', sory: 'mort' };
    s.bounties = 300;
    const loaded = sanitize(JSON.parse(JSON.stringify({ ...s, outlaws: { ...s.outlaws, faux: 'pendu' } })))!;
    expect(heroHp(loaded)).toBe(30);
    expect(loaded.outlaws).toEqual({ hamadou: 'arrete', sory: 'mort' });
    expect(loaded.bounties).toBe(300);
  });

  it('dormir soigne tout le monde et fixe le point de réveil', () => {
    const s = newGameState('Awa');
    const j = mon(7, 10);
    j.hp = 1;
    s.party.push(j);
    s.heroWounds = 25;
    expect(s.lastHeal).toEqual(HOME_BED);
    const inn = { zone: 'village:soins' as const, x: 3, y: 5, dir: 'gauche' as const };
    sleepHere(s, inn, 'une chambre de l’auberge (Village des Greniers)');
    expect(j.hp).toBe(maxHp(j));
    expect(s.heroWounds).toBe(0);
    expect(s.lastHeal).toEqual(inn);
    expect(s.bed).toMatch(/auberge/);
  });
});
