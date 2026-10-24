import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/ginedex';
import { ITEMS } from '../src/data/items';
import { TRAINERS } from '../src/data/trainers';
import { DIR_DELTA, SOLID_TILES, ZONES, tileAt, type Zone, type ZoneId } from '../src/data/zones';
import { START_POSITION } from '../src/engine/gameState';

const zones = Object.values(ZONES);

/** Cases atteignables depuis un point (rochers fissurés et gués considérés franchissables). */
function reachable(zone: Zone, sx: number, sy: number): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const queue: Array<[number, number]> = [[sx, sy]];
  const blockers = new Set(
    zone.npcs.filter((n) => n.script.kind !== 'dresseur' && n.script.kind !== 'gardien' && !n.hideFlag).map((n) => `${n.x},${n.y}`),
  );
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const { dx, dy } of Object.values(DIR_DELTA)) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      const tile = tileAt(zone, nx, ny);
      if (seen.has(key) || blockers.has(key)) continue;
      if (SOLID_TILES.has(tile) && tile !== 'X' && tile !== 'w') continue;
      if (nx < 0 || ny < 0 || nx >= zone.map[0].length || ny >= zone.map.length) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

describe('Cartes des zones', () => {
  it('ont des lignes de largeur constante', () => {
    for (const z of zones) {
      const width = z.map[0].length;
      z.map.forEach((row, y) => expect(row.length, `${z.id} ligne ${y}`).toBe(width));
    }
  });

  it('ont des téléporteurs valides et réciproques', () => {
    for (const z of zones) {
      for (const w of z.warps) {
        expect(SOLID_TILES.has(tileAt(z, w.x, w.y)), `${z.id} sortie ${w.x},${w.y}`).toBe(false);
        const target = ZONES[w.to];
        const arrival = tileAt(target, w.tx, w.ty);
        expect(SOLID_TILES.has(arrival) && arrival !== 'w', `${z.id} → ${w.to} (${w.tx},${w.ty})`).toBe(false);
        expect(target.warps.some((back) => back.to === z.id), `${w.to} → ${z.id}`).toBe(true);
        expect(target.warps.some((back) => back.x === w.tx && back.y === w.ty), 'arrivée sur une sortie').toBe(false);
      }
    }
  });

  it('placent les PNJ et panneaux sur des cases cohérentes', () => {
    for (const z of zones) {
      const positions = new Set<string>();
      for (const npc of z.npcs) {
        const key = `${npc.x},${npc.y}`;
        expect(SOLID_TILES.has(tileAt(z, npc.x, npc.y)), `${z.id}/${npc.id}`).toBe(false);
        expect(positions.has(key), `${z.id}/${npc.id} superposé`).toBe(false);
        positions.add(key);
        const s = npc.script;
        if (s.kind === 'dresseur') expect(TRAINERS[s.trainer], s.trainer).toBeDefined();
        if (s.kind === 'boutique') s.items.forEach((i) => expect(ITEMS[i]).toBeDefined());
        if (s.kind === 'objet') expect(ITEMS[s.item]).toBeDefined();
        if (s.kind === 'legendaire') expect(getSpecies(s.species).legendary).toBe(true);
      }
      for (const sign of z.signs) expect(tileAt(z, sign.x, sign.y), `${z.id} panneau`).toBe('S');
    }
  });

  it('ont des rencontres valides là où poussent les hautes herbes', () => {
    for (const z of zones) {
      const hasGrass = z.map.some((row) => row.includes(','));
      expect(hasGrass, z.id).toBe(z.encounters.length > 0);
      for (const e of z.encounters) {
        expect(() => getSpecies(e.species)).not.toThrow();
        expect(e.min).toBeLessThanOrEqual(e.max);
      }
    }
  });

  it('rendent tous les PNJ et sorties accessibles', () => {
    // On parcourt le monde depuis le départ en suivant les téléporteurs.
    const visited = new Map<ZoneId, Set<string>>();
    const queue: Array<[ZoneId, number, number]> = [[START_POSITION.zone, START_POSITION.x, START_POSITION.y]];
    while (queue.length) {
      const [id, x, y] = queue.shift()!;
      const zone = ZONES[id];
      const known = visited.get(id) ?? new Set<string>();
      if (known.has(`${x},${y}`)) continue;
      const area = reachable(zone, x, y);
      area.forEach((k) => known.add(k));
      visited.set(id, known);
      for (const w of zone.warps) {
        if (area.has(`${w.x},${w.y}`)) queue.push([w.to, w.tx, w.ty]);
      }
    }
    for (const z of zones) {
      const area = visited.get(z.id);
      expect(area, z.id).toBeDefined();
      for (const npc of z.npcs) {
        const adjacent = Object.values(DIR_DELTA).some(({ dx, dy }) => area!.has(`${npc.x + dx},${npc.y + dy}`));
        expect(adjacent, `${z.id}/${npc.id}`).toBe(true);
      }
      for (const w of z.warps) expect(area!.has(`${w.x},${w.y}`), `${z.id} sortie vers ${w.to}`).toBe(true);
    }
  });

  it('permet d’obtenir chaque espèce du Ginédex', () => {
    const obtainable = new Set<number>([1, 4, 7]);
    for (const z of zones) {
      z.encounters.forEach((e) => obtainable.add(e.species));
      z.npcs.forEach((n) => n.script.kind === 'legendaire' && obtainable.add(n.script.species));
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of SPECIES) {
        if (obtainable.has(s.id) && s.evolution && !obtainable.has(s.evolution.to)) {
          obtainable.add(s.evolution.to);
          grew = true;
        }
      }
    }
    expect(SPECIES.filter((s) => !obtainable.has(s.id)).map((s) => s.name)).toEqual([]);
  });
});
