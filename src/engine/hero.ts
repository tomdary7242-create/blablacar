// Le héros lui-même : ses points de vie, sa force, et les corps-à-corps.
//
// Quand un bandit n'a plus de Jinémon, c'est à poings nus (ou presque) qu'on
// le met à terre. Et la nuit, si toute l'équipe tombe devant un monstre, c'est
// le héros qu'il attaque. Comme les combats de Jinémon, le duel est une machine
// synchrone : chaque action renvoie la liste des événements à rejouer.
import { PLAYER_EDGE } from './combat';
import { isFainted, type Jinemon } from './creature';
import { chance, type Rng } from './rng';

export interface HeroState {
  party: Jinemon[];
  badges: string[];
  /** Points de vie perdus par le héros (0 = en pleine forme). */
  heroWounds: number;
}

export interface Fighter {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  /** Dégâts d'un coup ordinaire, avant variation. */
  attack: number;
}

/** Le héros grandit avec son équipe : son niveau est celui de son meilleur Jinémon. */
export function heroLevel(state: Pick<HeroState, 'party'>): number {
  return Math.max(5, ...state.party.map((j) => j.level));
}

export function heroMaxHp(state: Pick<HeroState, 'party' | 'badges'>): number {
  return 40 + heroLevel(state) * 3 + state.badges.length * 4;
}

export function heroHp(state: HeroState): number {
  return Math.max(0, heroMaxHp(state) - state.heroWounds);
}

export function setHeroHp(state: HeroState, hp: number): void {
  state.heroWounds = Math.max(0, heroMaxHp(state) - Math.max(0, Math.round(hp)));
}

/** Soigne le héros d'une fraction de ses PV maximum ; renvoie les PV regagnés. */
export function restHero(state: HeroState, fraction: number): number {
  const before = state.heroWounds;
  state.heroWounds = Math.max(0, Math.round(before - heroMaxHp(state) * fraction));
  return before - state.heroWounds;
}

/** Après une victoire, tout le monde reprend son souffle : le héros et les Jinémon debout. */
export const AFTER_BATTLE = { hero: 0.25, jinemon: 0.1 };

export function catchBreath(state: HeroState, maxHpOf: (j: Jinemon) => number): boolean {
  let healed = restHero(state, AFTER_BATTLE.hero) > 0;
  for (const j of state.party) {
    if (isFainted(j)) continue;
    const max = maxHpOf(j);
    const gain = Math.min(max - j.hp, Math.max(1, Math.round(max * AFTER_BATTLE.jinemon)));
    if (gain > 0) {
      j.hp += gain;
      healed = true;
    }
  }
  return healed;
}

/** Le héros au moment du duel. */
export function heroFighter(state: HeroState, name: string): Fighter {
  const level = heroLevel(state);
  return { name, level, hp: heroHp(state), maxHp: heroMaxHp(state), attack: 6 + level * 0.9 };
}

/** Un bandit à mains nues (ou à la machette), d'après le niveau de ses Jinémon. */
export function banditFighter(name: string, level: number): Fighter {
  const maxHp = Math.round(24 + level * 2.8);
  return { name, level, hp: maxHp, maxHp, attack: 5 + level * 0.55 };
}

/** Un monstre de la nuit : il garde les PV qui lui restaient, et frappe très fort. */
export function monsterFighter(name: string, level: number, hp: number, maxHp: number): Fighter {
  return { name, level, hp, maxHp, attack: 10 + level };
}

export type DuelKind = 'bandit' | 'monstre';
export type DuelSide = 'heros' | 'adversaire';

/** Actions du héros : contre un bandit, on frappe, on assomme ou on pare ; contre un monstre, on se débat ou on fuit. */
export type DuelAction = 'frapper' | 'assommer' | 'parer' | 'fuir';
export type DuelBlow = DuelAction | 'machette' | 'coupBas' | 'griffes' | 'devorer';

export type DuelOutcome = 'victoire' | 'defaite' | 'fuite';

export type DuelEvent =
  | { type: 'message'; text: string }
  /** Un coup part : `side` est celui qui frappe. */
  | { type: 'coup'; side: DuelSide; blow: DuelBlow }
  | { type: 'pv'; side: DuelSide; hp: number; maxHp: number; damage: number; critical: boolean; blocked: boolean }
  | { type: 'rate'; side: DuelSide }
  | { type: 'garde'; side: DuelSide }
  | { type: 'fin'; outcome: DuelOutcome };

export const DUEL_ACTIONS: Record<DuelKind, DuelAction[]> = {
  bandit: ['frapper', 'assommer', 'parer'],
  monstre: ['frapper', 'fuir'],
};

export const ACTION_LABELS: Record<DuelAction, string> = {
  frapper: 'FRAPPER',
  assommer: 'ASSOMMER',
  parer: 'PARER',
  fuir: 'FUIR',
};

export const ACTION_HINTS: Record<DuelAction, string> = {
  frapper: 'Un coup sûr.',
  assommer: 'Très puissant, mais peut manquer.',
  parer: 'Encaisse à peine, puis riposte.',
  fuir: 'Courir dans la nuit… si vous le pouvez.',
};

/** Vos poings ne font qu'effleurer la chair d'ombre des monstres de la nuit. */
const SHADOW_FLESH = 0.5;

export class Duel {
  phase: 'choix' | 'fini' = 'choix';
  outcome: DuelOutcome | null = null;
  turn = 0;
  private guard = false;
  private fleeAttempts = 0;
  private log: DuelEvent[] = [];

  constructor(
    readonly kind: DuelKind,
    readonly hero: Fighter,
    readonly foe: Fighter,
    private readonly rng: Rng,
  ) {}

  get actions(): DuelAction[] {
    return DUEL_ACTIONS[this.kind];
  }

  start(): DuelEvent[] {
    if (this.kind === 'bandit') {
      this.say(`${this.foe.name} dégaine sa machette et s’avance vers vous !`);
      this.say('Plus de Jinémon entre vous : c’est à vous de le mettre à terre.');
    } else {
      this.say(`${this.foe.name} se détourne de vos Jinémon… et vous fixe.`);
      this.say('Il n’y a plus personne entre vous et lui.');
    }
    return this.flush();
  }

  submit(action: DuelAction): DuelEvent[] {
    if (this.phase !== 'choix') throw new Error('Le duel est terminé');
    if (!this.actions.includes(action)) throw new Error(`Action impossible : ${action}`);
    this.turn += 1;
    this.guard = false;
    switch (action) {
      case 'fuir':
        this.fleeAttempts += 1;
        this.emit({ type: 'coup', side: 'heros', blow: 'fuir' });
        if (chance(this.rng, Math.min(0.8, 0.25 + 0.1 * (this.fleeAttempts - 1)))) {
          this.say('Vous courez à perdre haleine dans la nuit, sans jamais vous retourner…');
          this.end('fuite');
          return this.flush();
        }
        this.say('Vous trébuchez dans le noir : il est déjà sur vous !');
        break;
      case 'parer':
        this.guard = true;
        this.emit({ type: 'garde', side: 'heros' });
        this.say('Vous levez la garde et attendez son coup.');
        break;
      default:
        this.heroStrikes(action);
        break;
    }
    if (this.phase === 'choix') this.foeStrikes();
    return this.flush();
  }

  private heroStrikes(action: 'frapper' | 'assommer', riposte = false): void {
    const heavy = action === 'assommer';
    this.emit({ type: 'coup', side: 'heros', blow: action });
    if (!riposte) this.say(heavy ? 'Vous prenez votre élan pour l’assommer !' : 'Vous frappez !');
    if (heavy && !chance(this.rng, 0.7)) {
      this.emit({ type: 'rate', side: 'adversaire' });
      this.say(`${this.foe.name} esquive de justesse !`);
      return;
    }
    const critical = chance(this.rng, 1 / 10);
    let damage = this.hero.attack * PLAYER_EDGE * (heavy ? 1.8 : riposte ? 0.8 : 1) * (critical ? 1.5 : 1) * this.spread();
    if (this.kind === 'monstre') damage *= SHADOW_FLESH;
    this.hit('adversaire', damage, critical, false);
    if (critical) this.say('Un coup terrible !');
    if (this.kind === 'monstre' && !riposte && this.turn === 1) this.say('Vos coups ne font qu’effleurer sa chair d’ombre…');
    if (this.foe.hp <= 0) {
      this.say(this.kind === 'bandit' ? `${this.foe.name} s’effondre à genoux !` : `${this.foe.name} se disloque dans un hurlement !`);
      this.end('victoire');
    }
  }

  private foeStrikes(): void {
    const bandit = this.kind === 'bandit';
    const strong = chance(this.rng, 0.3);
    const blow: DuelBlow = bandit ? (strong ? 'coupBas' : 'machette') : strong ? 'devorer' : 'griffes';
    this.emit({ type: 'coup', side: 'adversaire', blow });
    const names: Record<string, string> = {
      machette: `${this.foe.name} frappe de sa machette !`,
      coupBas: `${this.foe.name} tente un coup bas !`,
      griffes: `${this.foe.name} vous lacère de ses griffes !`,
      devorer: `${this.foe.name} se jette sur vous, la gueule grande ouverte !`,
    };
    this.say(names[blow]);
    if (strong && !chance(this.rng, bandit ? 0.65 : 0.8)) {
      this.emit({ type: 'rate', side: 'heros' });
      this.say('Vous l’évitez d’un bond !');
      return;
    }
    const critical = chance(this.rng, 1 / 16);
    let damage = this.foe.attack * (strong ? 1.6 : 1) * (critical ? 1.5 : 1) * this.spread();
    if (this.guard) damage *= 0.25;
    this.hit('heros', damage, critical, this.guard);
    if (this.guard) this.say('Vous encaissez le coup sans broncher.');
    if (this.hero.hp <= 0) {
      this.say(bandit ? 'Vous vous effondrez dans la poussière…' : 'Vos forces vous abandonnent. Tout devient noir…');
      this.end('defaite');
      return;
    }
    if (this.guard) {
      this.say('Riposte !');
      this.heroStrikes('frapper', true);
    }
  }

  private hit(side: DuelSide, amount: number, critical: boolean, blocked: boolean): void {
    const target = side === 'heros' ? this.hero : this.foe;
    const damage = Math.min(target.hp, Math.max(1, Math.round(amount)));
    target.hp -= damage;
    this.emit({ type: 'pv', side, hp: target.hp, maxHp: target.maxHp, damage, critical, blocked });
  }

  private spread(): number {
    return 0.85 + this.rng.next() * 0.15;
  }

  private end(outcome: DuelOutcome): void {
    this.phase = 'fini';
    this.outcome = outcome;
    this.emit({ type: 'fin', outcome });
  }

  private say(text: string): void {
    this.emit({ type: 'message', text });
  }

  private emit(event: DuelEvent): void {
    this.log.push(event);
  }

  private flush(): DuelEvent[] {
    const out = this.log;
    this.log = [];
    return out;
  }
}
