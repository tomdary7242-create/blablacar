// Créatures de la nuit : dès que le soleil se couche, des Jinémon sortent de leurs
// terriers et chassent sur la carte. Trois façons de chasser :
//
//   rodeur     rôde puis vous flaire, se rapproche peu à peu, et fonce quand il vous voit
//   volant     tournoie dans le ciel (on ne voit que son ombre) puis tombe sur vous en piqué
//   imposteur  un villageois à la lanterne… qui n'en est pas un
//
// Chaque zone sauvage en lâche trois, tirés de ses rencontres nocturnes ; dans les villes,
// un imposteur se mêle parfois aux habitants, et des villageois traversent la place en
// hurlant, poursuivis par une bête venue de la brousse voisine.
import { getSpecies } from './ginedex';
import type { CharacterLook } from './trainers';
import { ZONES, type ZoneId } from './zones';

export type MobKind = 'rodeur' | 'volant' | 'imposteur';

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

/** Les chasseurs de la nuit sont un peu plus forts que la faune nocturne de leur zone. */
const HUNTER_BONUS = 2;

const DISGUISES: CharacterLook[] = [
  { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' },
  { skin: '#5a3420', outfit: '#c87a3a', accent: '#f0e0b0', headwear: 'chapeau' },
  { skin: '#6a4028', outfit: '#e85a8f', accent: '#f0c040', headwear: 'foulard' },
  { skin: '#4a2a1a', outfit: '#e8e0c8', accent: '#9c8a5a', headwear: 'bonnet' },
  { skin: '#7a4a30', outfit: '#5fa83a', accent: '#f0f0f0', headwear: 'turban' },
];

/** Volant s'il a des ailes (type Vol) ; imposteur s'il est esprit, spectre ou créature des ténèbres. */
export function mobKindOf(speciesId: number): MobKind {
  const types = getSpecies(speciesId).types;
  if (types.includes('Vol')) return 'volant';
  if (types.some((t) => t === 'Spectre' || t === 'Ténèbres' || t === 'Psy' || t === 'Esprit')) return 'imposteur';
  return 'rodeur';
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Les trois créatures qui chassent dans une zone sauvage, la nuit (aucune ailleurs). */
export function nightMobsOf(zoneId: ZoneId): MobDef[] {
  const zone = ZONES[zoneId];
  const table = zone?.nightEncounters ?? [];
  if (!zone || zone.interior || zone.dark || table.length === 0) return [];
  // Les plus forts d'abord : ce sont eux qui chassent.
  const pool = [...table].sort((a, b) => b.max - a.max || a.species - b.species);
  const used = new Set<number>();
  const pick = (accept: (k: MobKind) => boolean) => {
    const entry = pool.find((e) => !used.has(e.species) && accept(mobKindOf(e.species)));
    if (entry) used.add(entry.species);
    return entry;
  };
  const grounded = (k: MobKind) => k !== 'volant';
  const wanted: MobKind[] = ['rodeur', 'volant', 'imposteur'];
  return wanted.map((kind, i): MobDef => {
    // Le rôdeur marche (tout ce qui n'a pas d'ailes) ; faute de volant, un second rôdeur prend sa place.
    const entry =
      (kind === 'rodeur' ? pick(grounded) : pick((k) => k === kind)) ?? pick(grounded) ?? pick(() => true) ?? pool[i % pool.length];
    const actual = kind === 'imposteur' || mobKindOf(entry.species) === kind ? kind : 'rodeur';
    const id = `${zoneId}:${i}`;
    return {
      id,
      zone: zoneId,
      species: entry.species,
      level: entry.max + HUNTER_BONUS,
      kind: actual,
      disguise: actual === 'imposteur' ? DISGUISES[hash(id) % DISGUISES.length] : undefined,
    };
  });
}

/** La brousse la plus proche d'une ville : celle qu'on rejoint par une de ses sorties. */
function wildNeighbour(zoneId: ZoneId): ZoneId | null {
  const zone = ZONES[zoneId];
  if (!zone || zone.interior || zone.dark) return null;
  if (zone.nightEncounters?.length) return zoneId;
  const exit = zone.warps.find((w) => ZONES[w.to]?.nightEncounters?.length);
  return exit ? exit.to : null;
}

/** La bête qui poursuit les villageois attardés (dans cette zone, ou venue de la brousse voisine). */
export function chaserOf(zoneId: ZoneId): { species: number; level: number } | null {
  const wild = wildNeighbour(zoneId);
  if (!wild) return null;
  const table = ZONES[wild].nightEncounters!;
  const prowlers = table.filter((e) => mobKindOf(e.species) !== 'volant');
  const list = prowlers.length ? prowlers : table;
  const entry = list[hash(zoneId) % list.length];
  return { species: entry.species, level: entry.max + HUNTER_BONUS };
}

/** Dans une ville, la nuit, un imposteur se glisse parmi les habitants une nuit sur deux. */
export function townImpostor(zoneId: ZoneId, night: number): MobDef | null {
  const zone = ZONES[zoneId];
  if (!zone || zone.interior || zone.nightEncounters?.length) return null;
  const wild = wildNeighbour(zoneId);
  if (!wild || (hash(`${zoneId}:${night}`) & 1) === 0) return null;
  const table = ZONES[wild].nightEncounters!;
  const sneaky = table.filter((e) => mobKindOf(e.species) === 'imposteur');
  const entry = (sneaky.length ? sneaky : table)[0];
  const id = `${zoneId}:imposteur`;
  return { id, zone: zoneId, species: entry.species, level: entry.max + HUNTER_BONUS, kind: 'imposteur', disguise: DISGUISES[hash(id) % DISGUISES.length] };
}
