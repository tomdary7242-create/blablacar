// Surnoms : chaque Jinémon qui rejoint l'équipe (capturé, offert, arraché à un bandit, ou
// le tout premier) peut recevoir un surnom.
import { getSpecies } from '../data/ginedex';
import type { Jinemon } from '../engine/creature';
import type { Game } from './game';
import { TextEntryScene } from './scenes/textEntry';

/** Propose de surnommer ce Jinémon, puis continue. */
export function offerNickname(game: Game, j: Jinemon, next: () => void): void {
  const name = getSpecies(j.speciesId).name;
  game.ask([`Donner un surnom à ${name} ?`], ['Oui', 'Non'], (choice) => {
    if (choice !== 0) {
      next();
      return;
    }
    game.scenes.push(
      new TextEntryScene(game, {
        title: `Quel surnom pour ${name} ?`,
        initial: name,
        speciesId: j.speciesId,
        onDone: (nick) => {
          j.nickname = nick === name ? undefined : nick;
          next();
        },
        onCancel: next,
      }),
    );
  });
}

/** Propose un surnom à chacun, l'un après l'autre. */
export function offerNicknames(game: Game, list: Jinemon[], next: () => void): void {
  const [first, ...rest] = list;
  if (!first) next();
  else offerNickname(game, first, () => offerNicknames(game, rest, next));
}
