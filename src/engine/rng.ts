// Générateurs aléatoires. Le moteur reçoit toujours un Rng pour rester testable.

export interface Rng {
  /** Nombre dans [0, 1). */
  next(): number;
}

export const mathRng: Rng = { next: () => Math.random() };

/** Générateur déterministe (mulberry32), utilisé par les tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Entier dans [min, max] (inclus). */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng.next() * list.length)];
}

export function weightedPick<T extends { weight: number }>(rng: Rng, list: readonly T[]): T {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = rng.next() * total;
  for (const entry of list) {
    r -= entry.weight;
    if (r < 0) return entry;
  }
  return list[list.length - 1];
}
