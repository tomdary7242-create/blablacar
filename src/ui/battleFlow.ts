// Lancement des combats et conséquences : capture, récompenses, évolutions, défaite.
import { getSpecies } from '../data/ginedex';
import { BADGES, getTrainer, trainerTeam, type Trainer } from '../data/trainers';
import { Combat, type Outcome } from '../engine/combat';
import { createJinemon, evolutionTarget, type Jinemon } from '../engine/creature';
import { addJinemon, healParty, itemCount, markSeen } from '../engine/gameState';
import type { Game } from './game';
import type { TrackId } from './musicScore';
import { BattleScene } from './scenes/battle';
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
}

export function startWildBattle(game: Game, foe: Jinemon, opts: WildOptions = {}): void {
  const state = game.s;
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
  if (outcome === 'capture' && combat.captured) {
    const caught = combat.captured;
    const species = getSpecies(caught.speciesId);
    const firstTime = !state.dex.caught.includes(caught.speciesId);
    const where = addJinemon(state, caught);
    if (flag) state.flags[flag] = true;
    if (firstTime) lines.push(`Les données de ${species.name} sont ajoutées au Ginédex !`);
    if (where === 'grenier') lines.push(`Votre équipe est complète : ${species.name} est envoyé au Grenier.`);
  }
  const finish = () => evolutions(game, before, () => game.save(true));
  if (lines.length) game.say(lines, finish);
  else finish();
}

export function startTrainerBattle(game: Game, trainerId: string): void {
  const state = game.s;
  const trainer = getTrainer(trainerId);
  const team = trainerTeam(trainer, state.starter).map((m) => createJinemon(m.species, m.level, game.rng, 0, m.moves));
  team.forEach((j) => markSeen(state, j.speciesId));
  const before = levelsBefore(game);
  const combat = new Combat({
    kind: 'dresseur',
    player: state.party,
    foe: team,
    rng: game.rng,
    trainerName: `${trainer.title} ${trainer.name}`,
    ai: trainer.ai,
    xpShare: itemCount(state, 'amulettePartage') > 0,
  });
  game.scenes.push(
    new CoverScene(game, 'combat', () => {
      game.scenes.push(
        new BattleScene(game, combat, {
          theme: game.world?.zone.theme ?? 'savane',
          trainer,
          music: trainerMusic(trainer),
          onEnd: (outcome) => {
            if (outcome !== 'victoire') {
              blackout(game);
              return;
            }
            state.flags[`dresseur:${trainer.id}`] = true;
            state.cauris += trainer.reward;
            const lines = [...trainer.defeat, `Vous recevez ${trainer.reward} cauris.`];
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

/** Défaite : on perd une partie des cauris et on retourne au dernier lieu de soin. */
export function blackout(game: Game): void {
  const state = game.s;
  const lost = Math.floor(state.cauris / 4);
  state.cauris -= lost;
  game.say(
    [
      'Pris de vertige, vous ramenez en hâte vos Jinémon au dernier lieu de soin…',
      ...(lost > 0 ? [`Dans la panique, vous avez égaré ${lost} cauris.`] : []),
    ],
    () => {
      healParty(state);
      const pos = state.lastHeal;
      game.world?.teleport(pos.zone, pos.x, pos.y, pos.dir);
      game.say([`Vos Jinémon ont retrouvé toutes leurs forces. Courage, ${state.playerName} !`], () => game.save(true));
    },
  );
}
