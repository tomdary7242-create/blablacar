// La région du jeu : les zones qu'on atteint depuis le village, les Jinémon qu'on peut y
// obtenir et les insignes de ses deux arènes. Le reste du monde (Forêt Sacrée, Acte II…)
// dort dans les données, hors d'atteinte : la version complète est gardée sur la branche
// « sauvegarde/ginemon-complet ».
import { SPECIES } from './ginedex';
import { HAUNTS } from './hantises';
import { chaserOf, nightMobsOf, townMobs } from './nightMobs';
import { BADGE_ORDER, getTrainer, type BadgeId } from './trainers';
import { ZONES, type TownId, type ZoneId } from './zones';

/** Zones reliées au village (par leurs sorties et les portes de leurs maisons). */
function reachable(): ZoneId[] {
  const seen = new Set<ZoneId>(['village']);
  const queue: ZoneId[] = ['village'];
  for (let i = 0; i < queue.length; i++) {
    for (const w of ZONES[queue[i]].warps) {
      if (!seen.has(w.to)) {
        seen.add(w.to);
        queue.push(w.to);
      }
    }
  }
  return queue;
}

export const REGION_ZONES: readonly ZoneId[] = reachable();
const REGION = new Set<ZoneId>(REGION_ZONES);

export function inRegion(zone: ZoneId): boolean {
  return REGION.has(zone);
}

/** Les zones extérieures de la région, dans l'ordre où on les découvre. */
export const REGION_TOWNS: readonly TownId[] = REGION_ZONES.filter((id): id is TownId => !ZONES[id].interior);

/** Insignes des arènes de la région, dans l'ordre de l'aventure. */
export const REGION_BADGES: readonly BadgeId[] = BADGE_ORDER.filter((badge) =>
  REGION_ZONES.some((id) => ZONES[id].npcs.some((n) => n.script.kind === 'dresseur' && getTrainer(n.script.trainer).badge === badge)),
);

/** Les Jinémon qu'on peut obtenir dans la région : herbes, nuit, pêche, Hantises, Terreurs, bandits, cadeaux, évolutions. */
function obtainable(): number[] {
  const ids = new Set<number>([1, 4, 7]);
  for (const id of REGION_TOWNS) {
    const zone = ZONES[id];
    for (const e of [...zone.encounters, ...(zone.nightEncounters ?? []), ...(zone.fishing ?? [])]) ids.add(e.species);
    for (const n of zone.npcs) {
      if (n.script.kind === 'legendaire' || n.script.kind === 'compagnon') ids.add(n.script.species);
      if (n.script.kind === 'dresseur') {
        const t = getTrainer(n.script.trainer);
        // Un Jinémon affaibli peut être arraché à un bandit ; certains dresseurs offrent un Jinémon.
        if (t.bandit) t.team.forEach((m) => m.species > 0 && ids.add(m.species));
        if (t.gift) ids.add(t.gift.species);
      }
    }
    [...nightMobsOf(id), ...townMobs(id, 0), ...townMobs(id, 1)].forEach((m) => ids.add(m.species));
    const chaser = chaserOf(id);
    if (chaser) ids.add(chaser.species);
  }
  HAUNTS.filter((h) => REGION.has(h.zone)).forEach((h) => ids.add(h.species));
  for (let grew = true; grew; ) {
    grew = false;
    for (const s of SPECIES) {
      if (ids.has(s.id) && s.evolution && !ids.has(s.evolution.to)) {
        ids.add(s.evolution.to);
        grew = true;
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

/** Le Ginédex de la région (numéros d'origine, dans l'ordre). */
export const REGION_SPECIES: readonly number[] = obtainable();
