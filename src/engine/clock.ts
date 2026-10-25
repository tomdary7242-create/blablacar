// Horloge du monde : une journée de jeu dure 24 minutes réelles (1 s = 1 min).
// La nuit change les rencontres et réveille les Hantises.

export type Phase = 'aube' | 'jour' | 'crepuscule' | 'nuit';

export interface Clock {
  /** Nombre de jours écoulés depuis le début de l'aventure (1 = premier jour). */
  day: number;
  /** Minute de la journée (0 à 1439). */
  minute: number;
}

export const DAY_MINUTES = 24 * 60;
/** Minutes de jeu par seconde réelle. */
export const MINUTES_PER_SECOND = 1;
export const DAWN = 5 * 60;
export const MORNING = 7 * 60;
export const DUSK = 18 * 60;
export const NIGHT = 20 * 60;

export function newClock(): Clock {
  return { day: 1, minute: 8 * 60 };
}

export function phaseOf(minute: number): Phase {
  if (minute >= DAWN && minute < MORNING) return 'aube';
  if (minute >= MORNING && minute < DUSK) return 'jour';
  if (minute >= DUSK && minute < NIGHT) return 'crepuscule';
  return 'nuit';
}

export function isNight(clock: Clock): boolean {
  return phaseOf(clock.minute) === 'nuit';
}

/**
 * Identifiant de la nuit en cours (ou de la dernière nuit) : change à chaque
 * tombée de la nuit, ce qui permet aux Hantises repoussées de revenir.
 */
export function nightId(clock: Clock): number {
  return clock.minute >= NIGHT ? clock.day : clock.day - 1;
}

/** Fait avancer l'horloge ; renvoie vrai si la phase a changé. */
export function advance(clock: Clock, minutes: number): boolean {
  const before = phaseOf(clock.minute);
  clock.minute += minutes;
  while (clock.minute >= DAY_MINUTES) {
    clock.minute -= DAY_MINUTES;
    clock.day += 1;
  }
  return phaseOf(clock.minute) !== before;
}

/** Avance jusqu'à une heure donnée (le lendemain si elle est déjà passée). */
export function advanceTo(clock: Clock, minute: number): void {
  const delta = (minute - clock.minute + DAY_MINUTES) % DAY_MINUTES || DAY_MINUTES;
  advance(clock, delta);
}

/** Obscurité de 0 (plein jour) à 1 (nuit noire), avec transitions douces. */
export function darknessOf(minute: number): number {
  const h = minute / 60;
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 21) return (h - 18) / 3;
  if (h >= 4 && h < 7) return 1 - (h - 4) / 3;
  return 1;
}

/** Teinte chaude du lever et du coucher du soleil (0 à 1). */
export function warmthOf(minute: number): number {
  const h = minute / 60;
  const bump = (center: number, width: number) => Math.max(0, 1 - Math.abs(h - center) / width);
  return Math.max(bump(18.6, 1.4), bump(6, 1.2));
}

export function formatClock(clock: Clock): string {
  const m = Math.floor(clock.minute);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

export const PHASE_LABELS: Record<Phase, string> = {
  aube: 'Aube',
  jour: 'Jour',
  crepuscule: 'Crépuscule',
  nuit: 'Nuit',
};
