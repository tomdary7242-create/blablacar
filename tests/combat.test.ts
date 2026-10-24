import { describe, expect, it } from 'vitest';
import { Combat, computeDamage, stageMultiplier, type CombatEvent } from '../src/engine/combat';
import { createJinemon, getStats, maxHp, type Jinemon } from '../src/engine/creature';
import { seededRng, type Rng } from '../src/engine/rng';
import type { MoveId } from '../src/data/moves';

const neutral = { attack: 0, defense: 0, speed: 0 };

/** Rng qui rejoue une séquence fixe (puis 0.5). */
function scripted(values: number[]): Rng {
  let i = 0;
  return { next: () => (i < values.length ? values[i++] : 0.5) };
}

function mon(species: number, level: number, moves?: MoveId[], seed = 1): Jinemon {
  const j = createJinemon(species, level, seededRng(seed), 0, moves);
  j.ivs = { hp: 8, attack: 8, defense: 8, speed: 8 };
  j.hp = maxHp(j);
  return j;
}

const texts = (events: CombatEvent[]) => events.filter((e) => e.type === 'message').map((e) => (e as { text: string }).text);

describe('Formule de dégâts', () => {
  const opts = { allowCrit: false, randomize: false };

  it('applique faiblesses, résistances et immunités', () => {
    const feu = mon(7, 20);
    const plante = mon(1, 20);
    const eau = mon(4, 20);
    const move = { power: 60, type: 'Feu' as const };
    const vsPlante = computeDamage(feu, neutral, plante, neutral, move, seededRng(1), opts);
    const vsEau = computeDamage(feu, neutral, eau, neutral, move, seededRng(1), opts);
    expect(vsPlante.multiplier).toBe(2);
    expect(vsEau.multiplier).toBe(0.5);
    expect(vsPlante.damage).toBeGreaterThan(vsEau.damage * 3);
    const spectre = mon(47, 20);
    expect(computeDamage(feu, neutral, spectre, neutral, { power: 60, type: 'Normal' }, seededRng(1), opts).damage).toBe(0);
  });

  it('donne un bonus au type identique (STAB) et suit les paliers', () => {
    const feu = mon(7, 30);
    const cible = mon(33, 30);
    const stab = computeDamage(feu, neutral, cible, neutral, { power: 60, type: 'Feu' }, seededRng(1), opts).damage;
    const sans = computeDamage(feu, neutral, cible, neutral, { power: 60, type: 'Vol' }, seededRng(1), opts).damage;
    expect(stab).toBeGreaterThan(sans);
    const boosted = computeDamage(feu, { ...neutral, attack: 2 }, cible, neutral, { power: 60, type: 'Vol' }, seededRng(1), opts);
    expect(boosted.damage).toBeGreaterThan(sans * 1.8);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
  });

  it('respecte les talents Lévitation et Ignifuge', () => {
    const terre = mon(35, 30);
    const opts2 = { allowCrit: false, randomize: false };
    expect(computeDamage(terre, neutral, mon(47, 30), neutral, { power: 80, type: 'Terre' }, seededRng(1), opts2).multiplier).toBe(0);
    expect(computeDamage(mon(7, 30), neutral, mon(55, 30), neutral, { power: 80, type: 'Feu' }, seededRng(1), opts2).multiplier).toBe(0);
  });
});

describe('Combat', () => {
  it("fait agir le plus rapide en premier, sauf attaque prioritaire", () => {
    const lent = mon(35, 10, ['griffeArgile']);
    const rapide = mon(18, 10, ['coupDePatte', 'bondLievre']);
    const c1 = new Combat({ kind: 'sauvage', player: [lent], foe: [mon(18, 10, ['coupDePatte'])], rng: seededRng(3) });
    c1.start();
    const order1 = c1.submit({ kind: 'attaque', moveIndex: 0 }).filter((e) => e.type === 'attaque').map((e) => (e as { side: string }).side);
    expect(order1[0]).toBe('adversaire');

    const c2 = new Combat({ kind: 'sauvage', player: [rapide], foe: [mon(33, 10, ['chargeBrousse'])], rng: seededRng(3) });
    c2.start();
    const order2 = c2.submit({ kind: 'attaque', moveIndex: 1 }).filter((e) => e.type === 'attaque').map((e) => (e as { side: string }).side);
    expect(order2[0]).toBe('joueur');
  });

  it('endort la cible pendant 1 à 3 tours', () => {
    const player = mon(1, 30, ['berceuseFeuilles']);
    const foe = mon(33, 30, ['criDeGuerre']);
    const c = new Combat({ kind: 'sauvage', player: [player], foe: [foe], rng: seededRng(11) });
    c.start();
    let events: CombatEvent[] = [];
    for (let i = 0; i < 6 && foe.status?.kind !== 'sommeil'; i++) events = c.submit({ kind: 'attaque', moveIndex: 0 });
    expect(foe.status?.kind).toBe('sommeil');
    const turns = (foe.status as { turns: number }).turns;
    expect(turns).toBeGreaterThanOrEqual(1);
    expect(turns).toBeLessThanOrEqual(3);
    let asleepTurns = 0;
    for (let i = 0; i < 5; i++) {
      events = c.submit({ kind: 'attaque', moveIndex: 0 });
      if (texts(events).some((t) => t.includes('dort profondément'))) asleepTurns++;
      if (texts(events).some((t) => t.includes('se réveille'))) break;
    }
    expect(asleepTurns).toBe(turns);
  });

  it("fait monter les dégâts du poison à chaque tour", () => {
    const player = mon(36, 40, ['armureBanco']);
    player.status = { kind: 'poison' };
    const foe = mon(33, 5, ['criDeGuerre']);
    const c = new Combat({ kind: 'sauvage', player: [player], foe: [foe], rng: seededRng(5) });
    c.start();
    const max = maxHp(player);
    const losses: number[] = [];
    for (let i = 0; i < 3; i++) {
      const before = player.hp;
      c.submit({ kind: 'attaque', moveIndex: 0 });
      losses.push(before - player.hp);
    }
    expect(losses[0]).toBe(Math.floor(max / 16));
    expect(losses[1]).toBe(Math.floor((max * 2) / 16));
    expect(losses[2]).toBe(Math.floor((max * 3) / 16));
  });

  it('ralentit fortement un Jinémon paralysé et peut annuler son action', () => {
    const player = mon(18, 20, ['coupDePatte']);
    const foe = mon(35, 20, ['griffeArgile']);
    expect(getStats(player).speed).toBeGreaterThan(getStats(foe).speed);
    let blocked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      player.hp = maxHp(player);
      player.status = { kind: 'paralysie' };
      const c = new Combat({ kind: 'sauvage', player: [player], foe: [mon(35, 20, ['griffeArgile'])], rng: seededRng(seed) });
      c.start();
      const events = c.submit({ kind: 'attaque', moveIndex: 0 });
      const attacks = events.filter((e) => e.type === 'attaque').map((e) => (e as { side: string }).side);
      // Vitesse ×0.25 : l'adversaire, plus lent d'ordinaire, agit désormais en premier.
      expect(attacks[0]).toBe('adversaire');
      if (texts(events).some((t) => t.includes('La paralysie empêche'))) blocked++;
    }
    // Une chance sur deux d'annuler l'action.
    expect(blocked).toBeGreaterThan(10);
    expect(blocked).toBeLessThan(30);
  });

  it('suit un aléa scripté', () => {
    const rng = scripted([0.1, 0.2]);
    expect([rng.next(), rng.next(), rng.next()]).toEqual([0.1, 0.2, 0.5]);
  });

  it('peut faire se blesser un Jinémon confus', () => {
    const player = mon(18, 20, ['coupDePatte']);
    const foe = mon(41, 20, ['paroleGriot']);
    let hurt = false;
    for (let seed = 1; seed < 40 && !hurt; seed++) {
      player.hp = maxHp(player);
      const c = new Combat({ kind: 'sauvage', player: [player], foe: [mon(41, 20, ['paroleGriot'])], rng: seededRng(seed) });
      c.start();
      for (let i = 0; i < 4 && !c.isOver(); i++) {
        if (texts(c.submit({ kind: 'attaque', moveIndex: 0 })).some((t) => t.includes('se blesse'))) hurt = true;
      }
    }
    expect(foe.speciesId).toBe(41);
    expect(hurt).toBe(true);
  });

  it('gagne un combat sauvage et distribue l’expérience', () => {
    const player = mon(7, 15, ['brulureSahel']);
    const foe = mon(1, 5);
    const xpBefore = player.xp;
    const c = new Combat({ kind: 'sauvage', player: [player], foe: [foe], rng: seededRng(2) });
    c.start();
    const events = c.submit({ kind: 'attaque', moveIndex: 0 });
    expect(c.outcome).toBe('victoire');
    expect(events.some((e) => e.type === 'ko' && e.side === 'adversaire')).toBe(true);
    expect(player.xp).toBeGreaterThan(xpBefore);
    expect(events.at(-1)).toEqual({ type: 'fin', outcome: 'victoire' });
  });

  it("envoie le Jinémon suivant d'un dresseur et exige un remplacement", () => {
    const fort = mon(9, 50, ['fournaiseSacree']);
    const faible = mon(14, 3, ['coupDeBec']);
    const p1 = mon(1, 5, ['coupDePatte']);
    const p2 = mon(4, 5, ['coupDePatte']);
    const c = new Combat({ kind: 'dresseur', player: [p1, p2], foe: [fort, faible], rng: seededRng(4), trainerName: 'Sirafa' });
    c.start();
    c.submit({ kind: 'attaque', moveIndex: 0 });
    expect(c.phase).toBe('remplacement');
    expect(() => c.submit({ kind: 'attaque', moveIndex: 0 })).toThrow();
    c.submitReplacement(1);
    expect(c.playerActive).toBe(p2);
    expect(c.phase).toBe('choix');
    expect(texts(c.submit({ kind: 'fuite' }))).toContain('Impossible de fuir un combat contre un dresseur !');
  });

  it('capture un Jinémon sauvage affaibli', () => {
    const foe = mon(14, 3);
    foe.hp = 1;
    const c = new Combat({ kind: 'sauvage', player: [mon(1, 10)], foe: [foe], rng: seededRng(9) });
    c.start();
    const events = c.submit({ kind: 'capture', item: 'calebasseAncetres' });
    expect(events.find((e) => e.type === 'capture')).toMatchObject({ success: true });
    expect(c.outcome).toBe('capture');
    expect(c.captured).toBe(foe);
  });

  it('refuse les captures en combat de dresseur', () => {
    const c = new Combat({ kind: 'dresseur', player: [mon(1, 10)], foe: [mon(14, 3)], rng: seededRng(9), trainerName: 'Kady' });
    c.start();
    c.submit({ kind: 'capture', item: 'calebasse' });
    expect(c.outcome).toBeNull();
    expect(c.turn).toBe(0);
  });

  it('applique Prestance et Ruse du Conteur', () => {
    const lion = mon(30, 20, ['coupDePatte']);
    const lievre = mon(18, 20, ['coupDePatte']);
    const c1 = new Combat({ kind: 'sauvage', player: [mon(33, 20, ['coupDePatte'])], foe: [lion], rng: seededRng(1) });
    c1.start();
    expect(c1.stagesOf('joueur').attack).toBe(-1);
    const c2 = new Combat({ kind: 'sauvage', player: [lievre], foe: [mon(30, 20, ['criDeGuerre'])], rng: seededRng(1) });
    c2.start();
    expect(c2.stagesOf('joueur').attack).toBe(0);
  });

  it('fuit à coup sûr quand le joueur est plus rapide', () => {
    const c = new Combat({ kind: 'sauvage', player: [mon(18, 30)], foe: [mon(35, 5)], rng: seededRng(1) });
    c.start();
    c.submit({ kind: 'fuite' });
    expect(c.outcome).toBe('fuite');
  });

  it('utilise la Lutte Désespérée sans PP', () => {
    const player = mon(1, 10, ['coupDePatte']);
    player.moves[0].pp = 0;
    const c = new Combat({ kind: 'sauvage', player: [player], foe: [mon(33, 10, ['criDeGuerre'])], rng: seededRng(1) });
    c.start();
    const before = player.hp;
    const events = c.submit({ kind: 'attaque', moveIndex: -1 });
    expect(texts(events).some((t) => t.includes('Lutte Désespérée'))).toBe(true);
    expect(player.hp).toBeLessThan(before);
  });
});
