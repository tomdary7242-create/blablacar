// Les 14 types élémentaires de Ginémon et leur table d'efficacité.

export const TYPES = [
  'Normal',
  'Plante',
  'Terre',
  'Eau',
  'Esprit',
  'Feu',
  'Métal',
  'Vol',
  'Dragon',
  'Ténèbres',
  'Roche',
  'Insecte',
  'Spectre',
  'Psy',
] as const;

export type ElementType = (typeof TYPES)[number];

/** Couleur principale de chaque type (badges, barres, sprites). */
export const TYPE_COLORS: Record<ElementType, string> = {
  Normal: '#b8a88a',
  Plante: '#5fa83a',
  Terre: '#b5733a',
  Eau: '#3a86c8',
  Esprit: '#e4b6e8',
  Feu: '#e2582a',
  Métal: '#9aa7b0',
  Vol: '#8fb8e8',
  Dragon: '#6a4fc8',
  Ténèbres: '#4a3b4f',
  Roche: '#9c8a5a',
  Insecte: '#a3b52a',
  Spectre: '#6d5a9c',
  Psy: '#e85a8f',
};

type Chart = Partial<Record<ElementType, number>>;

/**
 * Multiplicateurs attaque → défense. Absent = ×1.
 * Triangle des starters : Plante > Eau > Feu > Plante.
 */
const CHART: Record<ElementType, Chart> = {
  Normal: { Roche: 0.5, Métal: 0.5, Spectre: 0 },
  Plante: { Eau: 2, Terre: 2, Roche: 2, Feu: 0.5, Plante: 0.5, Vol: 0.5, Insecte: 0.5, Métal: 0.5, Dragon: 0.5 },
  Terre: { Feu: 2, Métal: 2, Roche: 2, Plante: 0.5, Insecte: 0.5, Vol: 0 },
  Eau: { Feu: 2, Terre: 2, Roche: 2, Eau: 0.5, Plante: 0.5, Dragon: 0.5 },
  Esprit: { Dragon: 2, Ténèbres: 2, Spectre: 2, Feu: 0.5, Métal: 0.5 },
  Feu: { Plante: 2, Insecte: 2, Métal: 2, Feu: 0.5, Eau: 0.5, Roche: 0.5, Dragon: 0.5 },
  Métal: { Roche: 2, Esprit: 2, Feu: 0.5, Eau: 0.5, Métal: 0.5 },
  Vol: { Plante: 2, Insecte: 2, Roche: 0.5, Métal: 0.5 },
  Dragon: { Dragon: 2, Métal: 0.5, Esprit: 0 },
  Ténèbres: { Psy: 2, Spectre: 2, Esprit: 2, Ténèbres: 0.5 },
  Roche: { Feu: 2, Vol: 2, Insecte: 2, Terre: 0.5, Métal: 0.5 },
  Insecte: { Plante: 2, Psy: 2, Ténèbres: 2, Feu: 0.5, Vol: 0.5, Métal: 0.5, Spectre: 0.5, Esprit: 0.5 },
  Spectre: { Psy: 2, Spectre: 2, Ténèbres: 0.5, Normal: 0 },
  Psy: { Normal: 2, Dragon: 2, Psy: 0.5, Métal: 0.5, Ténèbres: 0 },
};

/** Multiplicateur d'un type d'attaque contre un type défensif simple. */
export function typeMultiplier(attack: ElementType, defense: ElementType): number {
  return CHART[attack][defense] ?? 1;
}

/** Multiplicateur total contre une créature à un ou deux types. */
export function effectiveness(attack: ElementType, defenseTypes: readonly ElementType[]): number {
  return defenseTypes.reduce((m, t) => m * typeMultiplier(attack, t), 1);
}

export function effectivenessLabel(mult: number): string | null {
  if (mult === 0) return "Ça n'a aucun effet…";
  if (mult >= 2) return "C'est super efficace !";
  if (mult < 1) return "Ce n'est pas très efficace…";
  return null;
}
