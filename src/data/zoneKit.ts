// Aides pour décrire les zones : apparences des PNJ et fabriques de PNJ courants.
import type { ItemId } from './items';
import { TRAINERS, type CharacterLook } from './trainers';
import type { Building, Dir, Npc } from './zones';

// ── Apparences ───────────────────────────────────────────────────────────
export const ANCIEN: CharacterLook = { skin: '#4a2a1a', outfit: '#f0ead8', accent: '#c8a060', headwear: 'bonnet' };
export const GUERISSEUSE: CharacterLook = { skin: '#5a3420', outfit: '#5fa83a', accent: '#f0f0f0', headwear: 'foulard' };
export const MARCHANDE: CharacterLook = { skin: '#6a4028', outfit: '#e2582a', accent: '#f0c040', headwear: 'foulard' };
export const GARDIEN: CharacterLook = { skin: '#5a3420', outfit: '#9c8a5a', accent: '#6b4a2a', headwear: 'chapeau' };
export const VILLAGEOIS: CharacterLook = { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' };
export const ENFANT: CharacterLook = { skin: '#6a3a22', outfit: '#e8b84a', accent: '#5fa83a' };

export const objet = (id: string, x: number, y: number, item: ItemId, quantity = 1): Npc => ({
  id, name: 'Objet', x, y, dir: 'bas', look: { kind: 'objet' },
  script: { kind: 'objet', item, quantity, flag: `objet:${id}` },
  hideFlag: `objet:${id}`,
});

export const dresseur = (trainer: string, x: number, y: number, dir: Dir, look: CharacterLook, hideFlag?: string): Npc => ({
  id: trainer, name: trainer, x, y, dir, look: { kind: 'personne', look },
  script: { kind: 'dresseur', trainer }, hideFlag,
});

export const soin = (id: string, x: number, y: number, dir: Dir, lines: string[], look = GUERISSEUSE): Npc => ({
  id, name: 'Guérisseuse', x, y, dir, look: { kind: 'personne', look }, script: { kind: 'soin', lines },
});

export const boutique = (id: string, x: number, y: number, items: ItemId[], lines: string[]): Npc => ({
  id, name: 'Marchande', x, y, dir: 'bas', look: { kind: 'personne', look: MARCHANDE },
  script: { kind: 'boutique', items, lines },
});

export const parole = (id: string, name: string, x: number, y: number, dir: Dir, look: CharacterLook, lines: string[]): Npc => ({
  id, name, x, y, dir, look: { kind: 'personne', look }, script: { kind: 'dialogue', lines },
});

// Les dresseurs ont leur apparence définie dans trainers.ts : on la reprend.
export const T = (id: string) => TRAINERS[id].look;

/** Auberge (5 × 3 cases, porte au milieu) ; `healer` : l’aubergiste de la ville, s’il a son propre visage. */
export const caseDeSoins = (x: number, y: number, healer?: Npc): Building => ({ kind: 'soins', x, y, healer });

/** Marché (4 × 3 cases, porte en 2e colonne) et ses marchandises. */
export const marche = (x: number, y: number, items: ItemId[], lines: string[]): Building => ({ kind: 'marche', x, y, items, lines });
