// Lancement des combats et conséquences : capture, récompenses, primes, évolutions.
// Perdre ne fait jamais de mal à l'héroïne : on ramène ses Jinémon au dernier lit où l'on a dormi.
import { getSpecies } from '../data/ginedex';
import { BADGES, getTrainer, trainerTeam, type Trainer } from '../data/trainers';
import { isNight, MORNING, advanceTo } from '../engine/clock';
import { Combat, type Outcome } from '../engine/combat';
import { createJinemon, evolutionTarget, maxHp, type Jinemon } from '../engine/creature';
import { addJinemon, hasUsableJinemon, itemCount, markSeen, removeItem, sleepHere } from '../engine/gameState';
import { banditFighter, catchBreath } from '../engine/hero';
import type { Game } from './game';
import type { TrackId } from './musicScore';
import { BattleScene, type BattleEnd } from './scenes/battle';
import { CreditsScene } from './scenes/credits';
import { EvolutionScene } from './scenes/evolution';
import { CoverScene } from './scenes/transition';

function levelsBefore(game: Game): Map<Jinemon, number> {
  return new Map(game.s.party.map((j) => [j, j.level]));
}

export interface WildOptions {
  /** Drapeau posé si le Jinémon est capturé (légendes, Hantises). */
  flag?: string;
  /** Message d'ouverture du combat. */
  intro?: string;
  /** Appelé dès la fin du combat, quelle qu'en soit l'issue. */
  onOutcome?: (outcome: Outcome) => void;
  /** Musique du combat (par défaut : combat sauvage, ou légende). */
  music?: TrackId;
  /** Hantise : apparition terrifiante (elle surgit des ténèbres). */
  haunt?: boolean;
  /** Entrée en scène (par défaut, surgie des ténèbres pour une Hantise). */
  entrance?: 'surgir' | 'chute';
}

/** Sans Jinémon en état de se battre, on ne cherche pas la bagarre. */
function tooWeak(game: Game): boolean {
  if (hasUsableJinemon(game.s)) return false;
  game.say(['Vos Jinémon sont à bout de forces. Il faut trouver un lit, et vite.']);
  return true;
}

export function startWildBattle(game: Game, foe: Jinemon, opts: WildOptions = {}): void {
  const state = game.s;
  if (tooWeak(game)) return;
  markSeen(state, foe.speciesId);
  const before = levelsBefore(game);
  const species = getSpecies(foe.speciesId);
  const combat = new Combat({
    kind: 'sauvage',
    player: state.party,
    foe: [foe],
    rng: game.rng,
    intro: opts.intro ?? (species.legendary ? `La Légende ${species.name} se dresse devant vous !` : undefined),
    xpShare: itemCount(state, 'amulettePartage') > 0,
  });
  game.scenes.push(
    new CoverScene(game, 'combat', () => {
      game.scenes.push(
        new BattleScene(game, combat, {
          theme: game.world?.zone.theme ?? 'savane',
          music: opts.music ?? (species.legendary ? 'legende' : 'combat'),
          entrance: opts.entrance ?? (opts.haunt ? 'surgir' : undefined),
          onEnd: (outcome) => {
            opts.onOutcome?.(outcome);
            afterWild(game, combat, outcome, before, opts.flag);
          },
        }),
      );
    }),
  );
}

function afterWild(game: Game, combat: Combat, outcome: Outcome, before: Map<Jinemon, number>, flag?: string): void {
  const state = game.s;
  if (outcome === 'defaite') {
    blackout(game);
    return;
  }
  const lines: string[] = [];
  if (outcome === 'victoire' || outcome === 'capture') breather(game, lines);
  if (outcome === 'capture' && combat.captured) {
    const caught = combat.captured;
    const species = getSpecies(caught.speciesId);
    const firstTime = !state.dex.caught.includes(caught.speciesId);
    const where = addJinemon(state, caught);
    if (flag) state.flags[flag] = true;
    if (firstTime) lines.push(`Les données de ${species.name} sont ajoutées au Ginédex !`);
    if (where === 'grenier') lines.push(`Votre équipe est complète : ${species.name} rejoint la Grande Jarre.`);
  }
  const finish = () => evolutions(game, before, () => game.save(true));
  if (lines.length) game.say(lines, finish);
  else finish();
}

export function startTrainerBattle(game: Game, trainerId: string): void {
  const state = game.s;
  const trainer = getTrainer(trainerId);
  if (tooWeak(game)) return;
  const team = trainerTeam(trainer, state.starter).map((m) => createJinemon(m.species, m.level, game.rng, 0, m.moves));
  team.forEach((j) => markSeen(state, j.speciesId));
  const before = levelsBefore(game);
  const combat = new Combat({
    kind: 'dresseur',
    player: state.party,
    foe: team,
    rng: game.rng,
    trainerName: trainer.bandit ? trainer.name : `${trainer.title} ${trainer.name}`,
    ai: trainer.ai,
    xpShare: itemCount(state, 'amulettePartage') > 0,
    bandit: !!trainer.bandit,
  });
  const top = Math.max(...team.map((j) => j.level));
  game.scenes.push(
    new CoverScene(game, 'combat', () => {
      game.scenes.push(
        new BattleScene(game, combat, {
          theme: game.world?.zone.theme ?? 'savane',
          trainer,
          music: trainerMusic(trainer),
          bandit: trainer.bandit ? { foe: banditFighter(trainer.name, top) } : undefined,
          onEnd: (outcome, end) => {
            // Les Jinémon arrachés au bandit sont à vous, quoi qu'il arrive ensuite.
            const freed = combat.stolen.map((j) => {
              const where = addJinemon(state, j);
              return `${getSpecies(j.speciesId).name} se joint à vous${where === 'grenier' ? ' (dans la Grande Jarre)' : ''}.`;
            });
            if (outcome !== 'victoire' || end.duel === 'defaite') {
              if (trainer.bandit) robbed(game, trainer);
              else blackout(game);
              return;
            }
            state.flags[`dresseur:${trainer.id}`] = true;
            const lines = trainer.bandit ? sentence(game, trainer, end) : [...trainer.defeat, `Vous recevez ${trainer.reward} cauris.`];
            state.cauris += trainer.reward;
            lines.push(...freed);
            breather(game, lines);
            if (trainer.badge && !state.badges.includes(trainer.badge)) {
              state.badges.push(trainer.badge);
              lines.push(`Vous obtenez l'${BADGES[trainer.badge].name} !`);
              game.jingle('insigne');
            }
            game.say(lines, () =>
              evolutions(game, before, () => {
                game.save(true);
                if (trainer.id === 'assa') game.scenes.push(new CreditsScene(game, 'acte1'));
                if (trainer.id === 'kadyChampion') game.scenes.push(new CreditsScene(game, 'final'));
              }),
            'victoire');
          },
        }),
      );
    }),
  );
}

/** Musique d'un combat de dresseur selon son rang. */
function trainerMusic(trainer: Trainer): TrackId {
  if (trainer.id === 'assa' || trainer.id === 'kadyChampion' || trainer.id === 'balla') return 'legende';
  if (['kandia', 'bazoumana', 'fanta'].includes(trainer.id)) return 'maitre';
  return trainer.badge ? 'maitre' : 'dresseur';
}

/** Fait évoluer, l'un après l'autre, les Jinémon qui ont progressé pendant le combat. */
function evolutions(game: Game, before: Map<Jinemon, number>, onDone: () => void): void {
  const queue = game.s.party.filter((j) => (before.get(j) ?? j.level) < j.level && evolutionTarget(j) !== null);
  const next = () => {
    const j = queue.shift();
    if (!j) {
      onDone();
      return;
    }
    game.scenes.push(new EvolutionScene(game, j, evolutionTarget(j)!, next));
  };
  next();
}

/** Le sort d'un bandit mis à terre : achevé, menotté (prime), ou laissé filer. */
function sentence(game: Game, trainer: Trainer, end: BattleEnd): string[] {
  const state = game.s;
  const outlaw = trainer.bandit!;
  const lines: string[] = [];
  if (end.verdict === 'achever') {
    state.outlaws[trainer.id] = 'mort';
    lines.push(`Vous fouillez ses affaires : ${trainer.reward} cauris.`);
    if (trainer.badge) lines.push(`Sur son corps, vous trouvez l'${BADGES[trainer.badge].name}.`);
    return lines;
  }
  if (outlaw.prime > 0 && removeItem(state, 'menottes')) {
    state.outlaws[trainer.id] = 'arrete';
    state.cauris += outlaw.prime;
    state.bounties += outlaw.prime;
    lines.push(...trainer.after);
    lines.push(`Une patrouille de la garde l'emmène. Prime touchée : ${outlaw.prime} cauris !`);
  } else {
    state.outlaws[trainer.id] = 'enfui';
    if (outlaw.prime === 0) lines.push(...trainer.after);
  }
  lines.push(`Dans sa fuite, il a laissé tomber sa bourse : ${trainer.reward} cauris.`);
  return lines;
}

/** Après une victoire, tout le monde reprend son souffle. */
function breather(game: Game, lines: string[]): void {
  if (catchBreath(game.s, maxHp)) lines.push('Le combat terminé, vous reprenez votre souffle, et vos Jinémon aussi.');
}

/** Battue par un bandit : il ricane et s'en va ; on ramène ses Jinémon se reposer. */
function robbed(game: Game, trainer: Trainer): void {
  blackout(game, [`${trainer.name} ricane et disparaît dans les hautes herbes.`, 'Vos Jinémon sont épuisés : vous les ramenez se reposer.']);
}

/** On rentre au dernier lit où l'on a dormi, au petit matin si c'était la nuit. */
function wakeInBed(game: Game, lines: string[]): void {
  const state = game.s;
  const pos = state.lastHeal;
  if (isNight(state.clock)) advanceTo(state.clock, MORNING);
  sleepHere(state, pos, state.bed);
  game.world?.teleport(pos.zone, pos.x, pos.y, pos.dir);
  game.say(lines, () => game.save(true));
}

/** Tous les Jinémon sont à terre : on les ramène au dernier lit, sans rien perdre. */
export function blackout(game: Game, cause?: string[]): void {
  const state = game.s;
  game.say(
    cause ?? ['Vos Jinémon sont épuisés… Vous les prenez dans vos bras et rentrez vous reposer.'],
    () =>
      wakeInBed(game, [
        `Vous voilà de retour dans ${state.bed}.`,
        `Vos Jinémon ont retrouvé leurs forces. Courage, ${state.playerName} !`,
      ]),
  );
}
