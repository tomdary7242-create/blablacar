// Objectif du moment : la prochaine étape de l'aventure, pour ne jamais être perdu.
// Il se déduit de la progression (drapeaux), sans rien ajouter à la sauvegarde.
import { REGION_SPECIES } from '../data/region';
import type { BuildingKind, TownId } from '../data/zones';
import type { GameState } from './gameState';

export interface Objective {
  text: string;
  /** Zone à rejoindre (marquée d'une étoile sur la carte). */
  zone: TownId;
  /** Bâtiment à rejoindre dans cette zone, s'il y en a un. */
  building?: BuildingKind;
}

interface Step extends Objective {
  done: (s: GameState) => boolean;
}

const beaten = (id: string) => (s: GameState) => !!s.flags[`dresseur:${id}`];

const STEPS: Step[] = [
  // Les parties commencées avant l'arrivée de Maman ont déjà leur starter : l'étape est acquise.
  { done: (s) => !!s.flags.maman || !!s.flags.starter, text: 'Descends au salon par l’escalier : Maman t’attend.', zone: 'village', building: 'maison' },
  { done: (s) => !!s.flags.starter, text: 'Va voir le Hogon au sanctuaire, tout au nord de la place du village.', zone: 'village', building: 'sanctuaire' },
  { done: beaten('rival1'), text: 'Kady t’attend dans la Savane des Termitières, au nord du village.', zone: 'savane' },
  {
    done: beaten('sirafa'),
    text: 'Les Sandales Noires tiennent la Forge, à l’est de la savane. Parle au vieux forgeron, puis bats Sirafa.',
    zone: 'terresRouges',
  },
  {
    done: beaten('aminata'),
    text: 'Brise les rochers au nord des Terres Rouges. Au Marigot, vois l’herboriste, puis bats Aminata.',
    zone: 'marigot',
  },
  { done: (s) => !!s.flags.fin, text: 'Thomas est derrière l’autel du Sanctuaire du Marigot. Va le libérer !', zone: 'marigot' },
];

export function currentObjective(state: GameState): Objective {
  const step = STEPS.find((s) => !s.done(state));
  if (step) return { text: step.text, zone: step.zone, building: step.building };
  const caught = REGION_SPECIES.filter((id) => state.dex.caught.includes(id)).length;
  return {
    text: `Thomas est libre ! Explore la région et complète ton Ginédex : ${caught}/${REGION_SPECIES.length}.`,
    zone: 'village',
  };
}

/** Rang de l'étape en cours (pour les tests et les indices). */
export function objectiveIndex(state: GameState): number {
  const i = STEPS.findIndex((s) => !s.done(state));
  return i < 0 ? STEPS.length : i;
}
