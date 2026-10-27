// Lancement des combats et conséquences : capture, récompenses, primes, évolutions,
// évanouissement (on se réveille dans le dernier lit où l'on a dormi).
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
  /** Hantise : apparition terrifiante, et le monstre s'en prend au héros si l'équipe tombe. */
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

/** La nuit, dehors (ou face à une Hantise), un monstre s'en prend au héros quand l'équipe tombe. */
function preysOnHero(game: Game, opts: WildOptions): boolean {
  const zone = game.world?.zone;
  return !!opts.haunt || (isNight(game.s.clock) && !!zone && !zone.interior);
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
          prey: preysOnHero(game, opts),
          entrance: opts.entrance ?? (opts.haunt ? 'surgir' : undefined),
          onEnd: (outcome, end) => {
            opts.onOutcome?.(outcome);
            afterWild(game, combat, outcome, end, before, opts.flag);
          },
        }),
      );
    }),
  );
}

function afterWild(game: Game, combat: Combat, outcome: Outcome, end: BattleEnd, before: Map<Jinemon, number>, flag?: string): void {
  const state = game.s;
  if (outcome === 'defaite') {
    const name = getSpecies(combat.foeActive.speciesId).name;
    if (end.duel === 'victoire') {
      stumbleHome(game, [`${name} s’est dissipé dans la nuit. Épuisé, vous rentrez vous coucher en titubant…`]);
    } else if (end.duel === 'fuite') {
      stumbleHome(game, ['Vous courez jusqu’à votre lit sans jamais vous retourner…']);
    } else {
      blackout(game, end.duel ? [`${name} s’acharne sur vous… Vous perdez connaissance.`] : undefined);
    }
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

/** Vaincu par un bandit : il vous dépouille et vous laisse pour mort. */
function robbed(game: Game, trainer: Trainer): void {
  const state = game.s;
  const lost = Math.floor(state.cauris / 3);
  state.cauris -= lost;
  blackout(game, [
    `${trainer.name} vous fait les poches pendant que vous gisez à terre${lost > 0 ? ` : ${lost} cauris envolés` : ''}…`,
  ]);
}

/** On reprend connaissance dans le dernier lit où l'on a dormi, au petit matin si c'était la nuit. */
function wakeInBed(game: Game, lines: string[]): void {
  const state = game.s;
  const pos = state.lastHeal;
  if (isNight(state.clock)) advanceTo(state.clock, MORNING);
  sleepHere(state, pos, state.bed);
  game.world?.teleport(pos.zone, pos.x, pos.y, pos.dir);
  game.say(lines, () => game.save(true));
}

/** Rentrer se coucher sans avoir perdu connaissance (Hantise repoussée, ou fuite). */
function stumbleHome(game: Game, lines: string[]): void {
  game.say(lines, () => wakeInBed(game, [`Vous vous réveillez dans ${game.s.bed}. Vos Jinémon ont repris des forces.`]));
}

/** Évanouissement : on perd une partie des cauris et l'on se réveille dans le dernier lit. */
export function blackout(game: Game, cause?: string[]): void {
  const state = game.s;
  const lost = cause ? 0 : Math.floor(state.cauris / 4);
  state.cauris -= lost;
  game.say(
    [
      ...(cause ?? ['Vos Jinémon s’effondrent… La tête vous tourne, et vous vous évanouissez.']),
      ...(lost > 0 ? [`Dans la panique, vous avez égaré ${lost} cauris.`] : []),
    ],
    () =>
      wakeInBed(game, [
        `Vous reprenez connaissance dans ${state.bed}.`,
        `Vos Jinémon ont retrouvé leurs forces. Courage, ${state.playerName} !`,
      ]),
  );
}
