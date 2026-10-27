import { describe, expect, it } from 'vitest';
import { REGION_TOWNS } from '../src/data/region';
import { TRAINERS, type BadgeId } from '../src/data/trainers';
import { DIR_DELTA, SOLID_TILES, ZONES, tileAt, type Npc, type Zone, type ZoneId } from '../src/data/zones';
import { START_POSITION } from '../src/engine/gameState';

/**
 * Parcourt le monde comme un joueur : on bat tous les dresseurs accessibles,
 * on gagne leurs insignes, on franchit les passages qu'ils ouvrent, jusqu'à
 * ce que plus rien ne change. Vérifie que le jeu peut être terminé (Thomas retrouvé).
 */
function playThrough(): { flags: Set<string>; badges: Set<BadgeId>; order: string[] } {
  const flags = new Set<string>(['starter']);
  const badges = new Set<BadgeId>();
  const order: string[] = [];
  const visible = (n: Npc) => (!n.hideFlag || !flags.has(n.hideFlag)) && (!n.showFlag || flags.has(n.showFlag));
  const passable = (zone: Zone, x: number, y: number) => {
    const t = tileAt(zone, x, y);
    if (t === 'X') return badges.has('enclume');
    if (t === 'w') return badges.has('pluie');
    if (t === 'Y') return badges.has('mirage');
    return !SOLID_TILES.has(t);
  };
  let changed = true;
  while (changed) {
    changed = false;
    const seen = new Set<string>();
    const queue: Array<[ZoneId, number, number]> = [[START_POSITION.zone, START_POSITION.x, START_POSITION.y]];
    const touched: Array<[Zone, Npc]> = [];
    while (queue.length) {
      const [id, x, y] = queue.shift()!;
      const key = `${id}:${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const zone = ZONES[id];
      const warp = zone.warps.find((w) => w.x === x && w.y === y);
      if (warp) queue.push([warp.to, warp.tx, warp.ty]);
      for (const { dx, dy } of Object.values(DIR_DELTA)) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= zone.map[0].length || ny >= zone.map.length) continue;
        const npc = zone.npcs.find((n) => n.x === nx && n.y === ny && visible(n));
        if (npc) {
          touched.push([zone, npc]);
          continue;
        }
        if (passable(zone, nx, ny)) queue.push([id, nx, ny]);
      }
    }
    for (const [, npc] of touched) {
      const s = npc.script;
      if (s.kind === 'dresseur' && !flags.has(`dresseur:${s.trainer}`)) {
        flags.add(`dresseur:${s.trainer}`);
        order.push(s.trainer);
        const badge = TRAINERS[s.trainer].badge;
        if (badge) badges.add(badge);
        changed = true;
      } else if (s.kind === 'gardien' && !flags.has(s.flag)) {
        const c = s.condition;
        const ok = c === 'starter' ? flags.has('starter') : c === 'pantheon' ? flags.has('dresseur:assa') : badges.size >= c.insignes;
        if (ok) {
          flags.add(s.flag);
          changed = true;
        }
      } else if (s.kind === 'thomas' && !flags.has('fin')) {
        flags.add('fin');
        changed = true;
      } else if (s.kind === 'legendaire' && !flags.has(s.flag)) {
        flags.add(s.flag);
        changed = true;
      }
    }
  }
  return { flags, badges, order };
}

describe('Progression', () => {
  const { flags, badges, order } = playThrough();

  it('permet de gagner les deux insignes et de retrouver Thomas', () => {
    expect([...badges].sort()).toEqual(['enclume', 'pluie']);
    expect(flags.has('fin')).toBe(true);
    // Thomas n'apparaît qu'une fois la seconde Arène libérée.
    expect(order.indexOf('aminata')).toBeGreaterThanOrEqual(0);
  });

  it('permet d’affronter chaque dresseur de la région, et aucun autre', () => {
    const regional = REGION_TOWNS.flatMap((id) => ZONES[id].npcs.flatMap((n) => (n.script.kind === 'dresseur' ? [n.script.trainer] : [])));
    for (const id of regional) expect(flags.has(`dresseur:${id}`), id).toBe(true);
    expect([...order].sort()).toEqual([...regional].sort());
  });

  it('fait affronter les deux Arènes des Sandales Noires dans l’ordre, de plus en plus fortes', () => {
    const leaders = order.filter((id) => TRAINERS[id].badge);
    expect(leaders).toEqual(['sirafa', 'aminata']);
    const levels = leaders.map((id) => Math.max(...TRAINERS[id].team.map((m) => m.level)));
    expect(levels[1]).toBeGreaterThan(levels[0]);
  });
});
