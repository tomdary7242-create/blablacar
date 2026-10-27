// Terreurs nocturnes : dès que le soleil se couche, des Jinémon qu'on ne croise jamais
// dans les herbes sortent chasser sur la carte. Chacune a sa façon de surprendre, et
// son corps va avec :
//
//   rodeur     Mngwa, le fauve gris : rôde, vous flaire, se rapproche, et charge quand il vous voit
//   volant     Kongamato : tournoie dans le ciel (on ne voit que son ombre) et tombe en piqué
//   imposteur  Dodombre : un villageois à la lanterne… qui porte un visage volé
//   guetteur   Tissombre, l'araignée des toits : vous suit de ses huit yeux et saute quand on passe trop près
//   pendu      Yaramaya : pend tête en bas dans un arbre, et se laisse tomber sur qui passe dessous
//   fouisseur  Olgoïkhor, le ver de la mort : nage sous la terre vers vos pas ; immobile, il vous perd
//   leurre     Elokloche : une clochette et une petite lueur qui danse… jusqu'à ce que sa bouche s'ouvre
//
// Chaque zone sauvage en lâche trois ; dans les villes, l'araignée guette sur les toits,
// un faux villageois se mêle aux habitants une nuit sur deux, et des villageois traversent
// la place en hurlant, le fauve gris sur les talons.
import type { CharacterLook } from './trainers';
import { ZONES, type ZoneId } from './zones';

export type MobKind = 'rodeur' | 'volant' | 'imposteur' | 'guetteur' | 'pendu' | 'fouisseur' | 'leurre';

export interface MobDef {
  /** Identifiant stable (« savane:1 ») : une créature vaincue ne revient pas de la nuit. */
  id: string;
  zone: ZoneId;
  species: number;
  level: number;
  kind: MobKind;
  /** Apparence d'emprunt de l'imposteur. */
  disguise?: CharacterLook;
}

/** La Terreur qui chasse de chaque façon. */
export const TERRORS: Record<MobKind, number> = {
  rodeur: 144,
  volant: 141,
  imposteur: 142,
  guetteur: 138,
  pendu: 139,
  fouisseur: 140,
  leurre: 143,
};

/** Qui chasse où : selon le terrain (toits et arbres, sable, marais…). */
const HUNTERS: Partial<Record<ZoneId, MobKind[]>> = {
  savane: ['rodeur', 'guetteur', 'fouisseur'],
  terresRouges: ['fouisseur', 'volant', 'guetteur'],
  marigot: ['leurre', 'pendu', 'imposteur'],
  foret: ['pendu', 'guetteur', 'leurre'],
  piste: ['rodeur', 'volant', 'imposteur'],
  falaise: ['volant', 'fouisseur', 'rodeur'],
  desert: ['fouisseur', 'volant', 'imposteur'],
  djenne: ['imposteur', 'guetteur', 'leurre'],
  cote: ['volant', 'leurre', 'rodeur'],
  masques: ['pendu', 'guetteur', 'imposteur'],
};
/** Ailleurs (une zone ajoutée plus tard) : le fauve, l'oiseau et le faux villageois. */
const DEFAULT_HUNTERS: MobKind[] = ['rodeur', 'volant', 'imposteur'];

const DISGUISES: CharacterLook[] = [
  { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' },
  { skin: '#5a3420', outfit: '#c87a3a', accent: '#f0e0b0', headwear: 'chapeau' },
  { skin: '#6a4028', outfit: '#e85a8f', accent: '#f0c040', headwear: 'foulard' },
  { skin: '#4a2a1a', outfit: '#e8e0c8', accent: '#9c8a5a', headwear: 'bonnet' },
  { skin: '#7a4a30', outfit: '#5fa83a', accent: '#f0f0f0', headwear: 'turban' },
];

/** Façon de chasser d'une Terreur (une autre espèce, lancée sur un villageois, rôde). */
export function mobKindOf(speciesId: number): MobKind {
  const kind = (Object.keys(TERRORS) as MobKind[]).find((k) => TERRORS[k] === speciesId);
  return kind ?? 'rodeur';
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Les Terreurs, plus robustes que la faune, chassent au niveau des plus forts Jinémon nocturnes du coin. */
function huntingLevel(wild: ZoneId): number {
  return Math.max(...ZONES[wild].nightEncounters!.map((e) => e.max));
}

function mob(id: string, zone: ZoneId, kind: MobKind, level: number): MobDef {
  return {
    id,
    zone,
    species: TERRORS[kind],
    level,
    kind,
    disguise: kind === 'imposteur' ? DISGUISES[hash(id) % DISGUISES.length] : undefined,
  };
}

/** Les trois Terreurs qui chassent dans une zone sauvage, la nuit (aucune ailleurs). */
export function nightMobsOf(zoneId: ZoneId): MobDef[] {
  const zone = ZONES[zoneId];
  if (!zone || zone.interior || zone.dark || !zone.nightEncounters?.length) return [];
  const level = huntingLevel(zoneId);
  return (HUNTERS[zoneId] ?? DEFAULT_HUNTERS).map((kind, i) => mob(`${zoneId}:${i}`, zoneId, kind, level));
}

/** La brousse la plus proche d'une ville : celle qu'on rejoint par une de ses sorties. */
function wildNeighbour(zoneId: ZoneId): ZoneId | null {
  const zone = ZONES[zoneId];
  if (!zone || zone.interior || zone.dark) return null;
  if (zone.nightEncounters?.length) return zoneId;
  const exit = zone.warps.find((w) => ZONES[w.to]?.nightEncounters?.length);
  return exit ? exit.to : null;
}

/** Le fauve gris qui poursuit les villageois attardés (dans cette zone, ou venu de la brousse voisine). */
export function chaserOf(zoneId: ZoneId): { species: number; level: number } | null {
  const wild = wildNeighbour(zoneId);
  if (!wild) return null;
  return { species: TERRORS.rodeur, level: huntingLevel(wild) };
}

/**
 * Dans une ville, la nuit : l'araignée guette sur les toits, et un faux villageois se
 * glisse parmi les habitants une nuit sur deux.
 */
export function townMobs(zoneId: ZoneId, night: number): MobDef[] {
  const zone = ZONES[zoneId];
  if (!zone || zone.interior || zone.nightEncounters?.length) return [];
  const wild = wildNeighbour(zoneId);
  if (!wild) return [];
  const level = huntingLevel(wild);
  const mobs = [mob(`${zoneId}:guetteur`, zoneId, 'guetteur', level)];
  if (hash(`${zoneId}:${night}`) & 1) mobs.push(mob(`${zoneId}:imposteur`, zoneId, 'imposteur', level));
  return mobs;
}

/** Ce que le Ginédex dit de chaque façon de chasser. */
export const HUNT_HINTS: Record<MobKind, string> = {
  rodeur: 'rôde, vous flaire et charge',
  volant: 'tombe du ciel en piqué',
  imposteur: 'se fait passer pour un villageois',
  guetteur: 'guette sur les toits et les arbres',
  pendu: 'se laisse tomber des arbres',
  fouisseur: 'nage sous la terre vers vos pas',
  leurre: 'attire les voyageurs avec sa lueur',
};

/** Les zones où cette Terreur chasse la nuit (brousse et villes). */
export function huntingGrounds(speciesId: number): ZoneId[] {
  return (Object.keys(ZONES) as ZoneId[]).filter((id) =>
    [...nightMobsOf(id), ...[0, 1, 2, 3].flatMap((n) => townMobs(id, n))].some((m) => m.species === speciesId),
  );
}
