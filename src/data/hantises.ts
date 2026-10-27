// Les Hantises : six Jinémon nocturnes, plus puissants que la faune de leur zone,
// qui rôdent sur la carte une fois la nuit tombée. Chacune a sa façon de traquer :
//
//   herbes      se tapit dans les hautes herbes ; seul le froissement des tiges la trahit
//   traqueur    suit tes traces pas à pas, et continue d'avancer quand tu t'arrêtes
//   miroir      reproduit tes mouvements comme un reflet ; vous vous croisez au centre
//   statue      ne bouge que lorsque tu ne la regardes pas
//   imitateur   se fait passer pour un villageois, puis se retourne… sans visage
//   teleporteur disparaît et reparaît, toujours un peu plus près, souvent dans ton dos
import type { CharacterLook } from './trainers';
import type { ZoneId } from './zones';

export type HauntBehavior = 'herbes' | 'traqueur' | 'miroir' | 'statue' | 'imitateur' | 'teleporteur';

export interface Haunt {
  zone: ZoneId;
  species: number;
  level: number;
  behavior: HauntBehavior;
  /** Cases d'apparition possibles (on choisit la plus éloignée du joueur). */
  spawns: Array<[number, number]>;
  /** Secondes entre deux pas. */
  step: number;
  /** Ce qu'on lit quand elle surgit. */
  cry: string[];
  /** Murmure affiché quand on entre dans la zone la nuit. */
  omen: string;
  /** Apparence d'emprunt de l'imitateur. */
  disguise?: CharacterLook;
  /** Ligne de symétrie du miroir (rangée de la carte). */
  axis?: number;
}

export const HAUNTS: Haunt[] = [
  {
    zone: 'savane',
    species: 123,
    level: 8,
    behavior: 'herbes',
    spawns: [[12, 11], [25, 11], [16, 18], [27, 18], [4, 19], [4, 10]],
    step: 0.55,
    omen: 'Les hautes herbes frémissent… pourtant, il n’y a pas un souffle de vent.',
    cry: ['Les herbes s’écartent d’un coup !', 'Un petit être velu aux yeux jaunes bondit sur vous en ricanant !'],
  },
  {
    zone: 'terresRouges',
    species: 124,
    level: 13,
    behavior: 'traqueur',
    spawns: [[1, 8], [15, 1], [28, 22]],
    step: 0.85,
    omen: 'Derrière vous, des pas lourds font crisser la latérite. Ils s’arrêtent quand vous vous retournez.',
    cry: ['Une haleine chaude vous frôle la nuque…', 'Le forgeron-hyène vous a rattrapée !'],
  },
  {
    zone: 'marigot',
    species: 125,
    level: 18,
    behavior: 'miroir',
    spawns: [[16, 5]],
    axis: 13,
    step: 0.22,
    omen: 'Dans l’eau noire du marigot, votre reflet a un temps de retard sur vous.',
    cry: ['Votre reflet sort de l’eau et vous sourit…', 'Il se retourne : à l’arrière de sa tête, une gueule de hyène !'],
  },
  {
    zone: 'foret',
    species: 126,
    level: 29,
    behavior: 'statue',
    spawns: [[20, 16], [30, 12], [15, 5], [5, 17], [25, 18]],
    step: 0.32,
    omen: 'Une statue hérissée de clous se dresse sur le sentier. Vous êtes sûre qu’elle n’était pas là avant.',
    cry: ['Vous vous retournez : la statue est juste devant vous.', 'Ses clous tintent tous ensemble. Le fétiche attaque !'],
  },
  {
    zone: 'piste',
    species: 127,
    level: 35,
    behavior: 'imitateur',
    spawns: [[6, 12], [25, 21]],
    step: 0.17,
    disguise: { skin: '#5a3420', outfit: '#8a7a6a', accent: '#d8d0c0', headwear: 'foulard' },
    omen: 'Un passant attend seul au bord de la piste, dos tourné. À cette heure-ci ?',
    cry: ['Le passant se retourne lentement…', 'Il n’a pas de visage !'],
  },
  {
    zone: 'falaise',
    species: 128,
    level: 48,
    behavior: 'teleporteur',
    spawns: [[15, 14], [5, 13], [25, 15]],
    step: 2.4,
    omen: 'Une lueur verdâtre danse entre les rochers. Elle s’éteint, puis se rallume ailleurs.',
    cry: ['La lueur s’allume juste derrière votre épaule…', 'La sorcière de lumière fond sur vous !'],
  },
];

export function hauntOf(zone: ZoneId): Haunt | undefined {
  return HAUNTS.find((h) => h.zone === zone);
}

/** Drapeau posé quand la Hantise d'une zone a été capturée : elle ne revient plus. */
export const hauntCapturedFlag = (zone: ZoneId) => `hantise:${zone}:capturee`;
