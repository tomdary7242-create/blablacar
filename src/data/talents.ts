// Talents : capacités passives propres à certains Jinémon.
// Leurs effets sont appliqués par le moteur de combat (src/engine/combat.ts).

export type TalentId =
  | 'auraMoissons'
  | 'benedictionPluvieuse'
  | 'coeurForge'
  | 'ecaillesAntiques'
  | 'levitation'
  | 'ruse'
  | 'carapace'
  | 'prestance'
  | 'oeilVigilant'
  | 'toucherToxique'
  | 'ignifuge';

export interface Talent {
  id: TalentId;
  name: string;
  description: string;
}

const DEFS: Record<TalentId, Omit<Talent, 'id'>> = {
  auraMoissons: {
    name: 'Aura des Moissons',
    description: 'Récupère 1/16 de ses PV max à la fin de chaque tour.',
  },
  benedictionPluvieuse: {
    name: 'Bénédiction Pluvieuse',
    description: 'A une chance sur trois de guérir ses altérations de statut à la fin de chaque tour.',
  },
  coeurForge: {
    name: 'Cœur de Forge',
    description: 'Quand ses PV tombent sous le tiers, ses attaques Feu et Métal sont 50 % plus puissantes.',
  },
  ecaillesAntiques: {
    name: 'Écailles Antiques',
    description: 'Réduit d’un quart les dégâts des attaques super efficaces.',
  },
  levitation: {
    name: 'Lévitation',
    description: 'Flotte au-dessus du sol : immunisé contre les attaques Terre.',
  },
  ruse: {
    name: 'Ruse du Conteur',
    description: 'Les baisses de statistiques infligées par l’adversaire n’ont aucun effet.',
  },
  carapace: {
    name: 'Carapace',
    description: 'Une protection si dure qu’aucun coup critique ne peut la percer.',
  },
  prestance: {
    name: 'Prestance du Chasseur',
    description: "En entrant au combat, impressionne l'adversaire et baisse son Attaque.",
  },
  oeilVigilant: {
    name: 'Œil Vigilant',
    description: 'Toujours aux aguets : ne peut pas être endormi.',
  },
  toucherToxique: {
    name: 'Toucher Toxique',
    description: 'Ses attaques ont 30 % de chances d’empoisonner la cible.',
  },
  ignifuge: {
    name: 'Ignifuge',
    description: 'Né dans les flammes : immunisé contre les attaques Feu.',
  },
};

export const TALENTS: Record<TalentId, Talent> = Object.fromEntries(
  Object.entries(DEFS).map(([id, def]) => [id, { id, ...def }]),
) as Record<TalentId, Talent>;
