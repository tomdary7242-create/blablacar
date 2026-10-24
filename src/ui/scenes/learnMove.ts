// Apprentissage d'une attaque lors d'une montée de niveau, avec choix de l'attaque à oublier.
import { MOVES, type MoveId } from '../../data/moves';
import { displayName, learnMove, type Jinemon } from '../../engine/creature';
import type { Game } from '../game';
import { MoveListScene } from './moves';

export function promptLearnMove(game: Game, j: Jinemon, moveId: MoveId, onDone: () => void): void {
  const name = displayName(j);
  const move = MOVES[moveId].name;
  const giveUp = () => game.say([`${name} n'apprend pas ${move}.`], onDone);
  game.ask(
    [`${name} veut apprendre ${move}.`, `Mais ${name} connaît déjà quatre attaques.`, `Oublier une attaque pour apprendre ${move} ?`],
    ['Oui', 'Non'],
    (choice) => {
      if (choice !== 0) {
        giveUp();
        return;
      }
      const entries = [...j.moves.map((m) => ({ id: m.id })), { id: moveId, tag: 'NOUVELLE' }];
      game.scenes.push(
        new MoveListScene(game, 'Quelle attaque faut-il oublier ?', entries, (picked) => {
          if (picked === null || picked >= j.moves.length) {
            giveUp();
            return;
          }
          const old = MOVES[j.moves[picked].id].name;
          learnMove(j, moveId, picked);
          game.sfx('niveau');
          game.say(['1, 2, et… Tadaa !', `${name} oublie ${old} et apprend ${move} !`], onDone);
        }),
      );
    },
  );
}
