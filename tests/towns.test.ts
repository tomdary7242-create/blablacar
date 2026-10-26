import { describe, expect, it } from 'vitest';
import { BUILDING_SIZE, doorOf } from '../src/data/interiors';
import { ZONES, tileAt, type TownId, type Zone } from '../src/data/zones';
import { START_POSITION, giveStarter, newGameState } from '../src/engine/gameState';
import { currentObjective, objectiveIndex } from '../src/engine/objective';
import { seededRng } from '../src/engine/rng';
import { standable } from '../src/engine/saveManager';

const zones = Object.values(ZONES);
const outdoor = zones.filter((z) => !z.interior);
const towns = outdoor.filter((z) => z.buildings?.length);

describe('Villes et bâtiments', () => {
  it('posent chaque bâtiment sur une emprise « @ » complète, porte comprise', () => {
    for (const z of outdoor) {
      const covered = new Set<string>();
      for (const b of z.buildings ?? []) {
        const size = BUILDING_SIZE[b.kind];
        const door = doorOf(b);
        for (let y = b.y; y < b.y + size.h; y++) {
          for (let x = b.x; x < b.x + size.w; x++) {
            const expected = x === door.x && y === door.y ? 'd' : '@';
            expect(tileAt(z, x, y), `${z.id} ${b.kind} ${x},${y}`).toBe(expected);
            covered.add(`${x},${y}`);
          }
        }
      }
      // Aucune emprise orpheline.
      z.map.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === '@' || c === 'd') expect(covered.has(`${x},${y}`), `${z.id} ${x},${y}`).toBe(true);
      }));
    }
  });

  it('ont une Case de Soins identique dans chaque ville, avec soigneur et grenier à Jinémon', () => {
    const villes: TownId[] = ['village', 'terresRouges', 'marigot', 'djenne', 'cote', 'tombouctou'];
    const soinsMaps = new Set<string>();
    for (const id of villes) {
      const town = ZONES[id];
      expect(town.buildings?.some((b) => b.kind === 'soins'), id).toBe(true);
      expect(town.buildings?.some((b) => b.kind === 'marche'), id).toBe(true);
      const inside = ZONES[`${id}:soins`];
      soinsMaps.add(inside.map.join('/'));
      expect(inside.parent).toBe(id);
      expect(inside.npcs.some((n) => n.script.kind === 'soin'), id).toBe(true);
      expect(inside.map.some((row) => row.includes('g')), id).toBe(true);
      // Plus aucun soigneur ni marchand dehors : on les trouve dans leurs bâtiments.
      expect(town.npcs.some((n) => ['soin', 'boutique', 'grenier'].includes(n.script.kind)), id).toBe(false);
      // On arrive en volant juste devant la porte de la Case de Soins.
      const soins = town.buildings!.find((b) => b.kind === 'soins')!;
      const door = doorOf(soins);
      expect(town.flyPoint).toEqual({ x: door.x, y: door.y + 1, dir: 'bas' });
      expect(standable({ zone: id, ...town.flyPoint! }), id).toBe(true);
    }
    expect(soinsMaps.size).toBe(1);
    for (const z of zones.filter((zone) => zone.interior === 'marche')) {
      expect(z.npcs.some((n) => n.script.kind === 'boutique'), z.id).toBe(true);
    }
  });

  it('remplacent les bâtiments par des stands dans les lieux sauvages', () => {
    const sauvages: TownId[] = ['foret', 'piste', 'falaise', 'desert', 'hombori', 'masques'];
    for (const id of sauvages) {
      const z = ZONES[id];
      expect(z.buildings ?? [], id).toEqual([]);
      // Le soigneur se tient derrière son stand vert ; on arrive en volant juste devant.
      const healer = z.npcs.find((n) => n.script.kind === 'soin')!;
      expect(healer, id).toBeDefined();
      expect(tileAt(z, healer.x, healer.y + 1), id).toBe('C');
      expect(z.flyPoint, id).toEqual({ x: healer.x, y: healer.y + 2, dir: 'haut' });
      expect(standable({ zone: id, ...z.flyPoint! }), id).toBe(true);
      // Un grenier à Jinémon tout près, et le marchand derrière son étal.
      expect(z.map.some((row) => row.includes('g')), id).toBe(true);
      for (const shop of z.npcs.filter((n) => n.script.kind === 'boutique')) expect(tileAt(z, shop.x, shop.y + 1), `${id} marchand`).toBe('E');
      expect(z.npcs.some((n) => n.script.kind === 'grenier'), id).toBe(false);
    }
  });

  it('relient chaque porte à son intérieur, et chaque seuil à sa porte', () => {
    for (const town of towns) {
      for (const b of town.buildings!) {
        const door = doorOf(b);
        const warp = town.warps.find((w) => w.x === door.x && w.y === door.y)!;
        expect(warp, `${town.id} ${b.kind}`).toBeDefined();
        const inside: Zone = ZONES[warp.to];
        expect(inside.interior, warp.to).toBeDefined();
        expect(tileAt(inside, warp.tx, warp.ty + 1)).toBe('x');
        const back = inside.warps.find((w) => w.to === town.id)!;
        expect({ x: back.tx, y: back.ty }).toEqual({ x: door.x, y: door.y + 1 });
        expect(standable({ zone: town.id, x: back.tx, y: back.ty, dir: 'bas' })).toBe(true);
      }
    }
  });

  it('font commencer la partie dans la chambre, avec le Hogon au sanctuaire et Maman au salon', () => {
    expect(START_POSITION.zone).toBe('chambre');
    expect(standable(START_POSITION)).toBe(true);
    expect(ZONES.maison.npcs.some((n) => n.script.kind === 'maman')).toBe(true);
    expect(ZONES.sanctuaire.npcs.some((n) => n.script.kind === 'starter')).toBe(true);
    expect(ZONES.village.npcs.some((n) => n.script.kind === 'starter')).toBe(false);
    expect(ZONES.village.signs.some((s) => s.plan)).toBe(true);
    expect(standable(newGameState('Awa').lastHeal)).toBe(true);
  });
});

describe('Objectif du moment', () => {
  it('guide pas à pas : Maman, le Hogon, Kady, puis les Maîtres de Piste', () => {
    const s = newGameState('Awa');
    expect(currentObjective(s).building).toBe('maison');
    s.flags.maman = true;
    expect(currentObjective(s)).toMatchObject({ zone: 'village', building: 'sanctuaire' });
    giveStarter(s, 1, seededRng(1));
    expect(currentObjective(s).zone).toBe('savane');
    s.flags['dresseur:rival1'] = true;
    expect(currentObjective(s).zone).toBe('terresRouges');
    const order = ['sirafa', 'aminata', 'simbon', 'assa', 'takama', 'dogo', 'tenin', 'ndiaga', 'kouma', 'kadyChampion'];
    let last = objectiveIndex(s);
    for (const id of order) {
      const zone = currentObjective(s).zone;
      // Le Maître de Piste désigné se trouve bien dans la zone indiquée.
      expect(ZONES[zone].npcs.some((n) => n.script.kind === 'dresseur' && (n.script.trainer === id || id === 'kadyChampion')), `${id} → ${zone}`).toBe(true);
      s.flags[`dresseur:${id}`] = true;
      expect(objectiveIndex(s)).toBeGreaterThan(last);
      last = objectiveIndex(s);
    }
    expect(currentObjective(s).text).toContain('Ginédex');
  });

  it('ne renvoie pas un joueur avancé vers Maman (anciennes sauvegardes)', () => {
    const s = newGameState('Awa');
    giveStarter(s, 4, seededRng(2));
    expect(currentObjective(s).building).not.toBe('maison');
  });
});
