// Objectif du moment : la prochaine étape de l'aventure, pour ne jamais être perdu.
// Il se déduit de la progression (drapeaux), sans rien ajouter à la sauvegarde.
import { SPECIES } from '../data/ginedex';
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
  { done: beaten('sirafa'), text: 'Défie Sirafa, Maître du Feu Sacré, à la Forge des Terres Rouges, à l’est de la savane.', zone: 'terresRouges' },
  {
    done: beaten('aminata'),
    text: 'Au nord des Terres Rouges, brise les rochers fissurés avec un Jinémon qui connaît une attaque Métal, puis défie Aminata au Marigot des Ancêtres.',
    zone: 'marigot',
  },
  {
    done: beaten('simbon'),
    text: 'Franchis le gué du Marigot avec un Jinémon qui connaît une attaque Eau, traverse la Forêt Sacrée et défie Simbon sur la Piste des Chasseurs.',
    zone: 'piste',
  },
  { done: beaten('assa'), text: 'Avec trois insignes, gravis la Falaise des Ancêtres, au nord de la Piste : la Doyenne Assa t’attend au Panthéon.', zone: 'falaise' },
  { done: beaten('takama'), text: 'Le Gardien du Nord t’ouvre le Désert des Djinns. Takama, la Reine des Sables, règne sur l’oasis.', zone: 'desert' },
  {
    done: beaten('dogo'),
    text: 'Au nord du désert, dissipe les mirages avec un Jinémon qui connaît une attaque Psy, puis défie Dogo dans les Monts de Hombori.',
    zone: 'hombori',
  },
  { done: beaten('tenin'), text: 'À l’est de Hombori s’étendent Djenné et le Delta : Ténin, Gardienne de Ninki Nanka, t’y attend.', zone: 'djenne' },
  { done: beaten('ndiaga'), text: 'Au sud de Djenné, sur la Côte des Alizés, Ndiaga règne sur les vents depuis son phare.', zone: 'cote' },
  { done: beaten('kouma'), text: 'À l’est de la côte, le Bois des Masques cache le dernier Maître de Piste : Kouma.', zone: 'masques' },
  {
    done: beaten('kadyChampion'),
    text: 'Huit insignes ! Monte jusqu’à Tombouctou, au nord du Bois des Masques : le Conseil des Griots t’attend.',
    zone: 'tombouctou',
  },
];

export function currentObjective(state: GameState): Objective {
  const step = STEPS.find((s) => !s.done(state));
  if (step) return { text: step.text, zone: step.zone, building: step.building };
  const caught = state.dex.caught.length;
  return {
    text: `Tu es Champion du Mandé ! Il te reste à compléter le Ginédex : ${caught} espèces capturées sur ${SPECIES.length}.`,
    zone: 'tombouctou',
  };
}

/** Rang de l'étape en cours (pour les tests et les indices). */
export function objectiveIndex(state: GameState): number {
  const i = STEPS.findIndex((s) => !s.done(state));
  return i < 0 ? STEPS.length : i;
}
