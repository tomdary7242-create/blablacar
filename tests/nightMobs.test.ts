import { describe, expect, it } from 'vitest';
import { chaserOf, mobKindOf, nightMobsOf, townImpostor, type MobDef } from '../src/data/nightMobs';
import { ZONES, type Dir, type ZoneId } from '../src/data/zones';
import { seededRng } from '../src/engine/rng';
import { Fugitive, NightMob, findPath, type MobHost } from '../src/ui/nightMobs';

/** Une plaine dégagée de 30 × 30 cases ; le joueur se déplace à la main. */
function plain() {
  const player = { x: 15, y: 15, dir: 'bas' as Dir };
  const caught: NightMob[] = [];
  const sounds: string[] = [];
  const mobs: NightMob[] = [];
  const host: MobHost = {
    rng: seededRng(3),
    mapWidth: 30,
    mapHeight: 30,
    player: () => player,
    walkable: (x, y) => x >= 0 && y >= 0 && x < 30 && y < 30 && !(x === player.x && y === player.y) && !mobs.some((m) => m.occupies(x, y)),
    sound: (kind) => void sounds.push(kind),
    caught: (mob) => void caught.push(mob),
  };
  return { player, caught, sounds, mobs, host };
}

const def = (kind: MobDef['kind']): MobDef => ({
  id: `test:${kind}`,
  zone: 'savane',
  species: 20,
  level: 8,
  kind,
  disguise: kind === 'imposteur' ? { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' } : undefined,
});

/** Fait tourner la créature `seconds` secondes (à 30 images par seconde). */
function run(mob: NightMob, seconds: number, each?: (t: number) => void): void {
  for (let f = 0; f < seconds * 30; f++) {
    mob.update(1 / 30);
    each?.(f / 30);
  }
}

describe('Les créatures de la nuit (données)', () => {
  const wild = (Object.keys(ZONES) as ZoneId[]).filter((id) => nightMobsOf(id).length > 0);

  it('chaque zone sauvage lâche trois chasseurs la nuit, dont un rôdeur et un imposteur', () => {
    expect(wild.length).toBeGreaterThanOrEqual(10);
    for (const id of wild) {
      const mobs = nightMobsOf(id);
      expect(mobs, id).toHaveLength(3);
      expect(mobs.some((m) => m.kind === 'rodeur'), id).toBe(true);
      expect(mobs.some((m) => m.kind === 'imposteur' && m.disguise), id).toBe(true);
      // Le rôdeur marche : jamais une espèce ailée.
      expect(mobKindOf(mobs[0].species), id).not.toBe('volant');
      const strongest = Math.max(...ZONES[id].nightEncounters!.map((e) => e.max));
      for (const m of mobs) expect(m.level, `${id} ${m.id}`).toBeLessThanOrEqual(strongest + 2);
    }
    // La plupart des zones ont aussi un volant.
    expect(wild.filter((id) => nightMobsOf(id).some((m) => m.kind === 'volant')).length).toBeGreaterThanOrEqual(8);
  });

  it('les villes ont leurs poursuites et, une nuit sur deux, un imposteur ; jamais à l’intérieur', () => {
    expect(chaserOf('village')).not.toBeNull();
    expect(mobKindOf(chaserOf('village')!.species)).not.toBe('volant');
    const nights = Array.from({ length: 20 }, (_, n) => townImpostor('village', n));
    expect(nights.some((m) => m)).toBe(true);
    expect(nights.some((m) => !m)).toBe(true);
    expect(nightMobsOf('village')).toEqual([]);
    expect(nightMobsOf('village:soins')).toEqual([]);
    expect(chaserOf('village:soins')).toBeNull();
    expect(chaserOf('hombori')).toBeNull();
  });
});

describe('Les créatures de la nuit (sur la carte)', () => {
  it('le rôdeur vous flaire de loin, se rapproche, puis fonce et vous attrape', () => {
    const { player, caught, mobs, host } = plain();
    const mob = new NightMob(def('rodeur'), host, 2, 2);
    mobs.push(mob);
    const start = mob.distance();
    run(mob, 60, () => undefined);
    expect(caught).toEqual([mob]);
    expect(start).toBeGreaterThan(20);
    expect(player).toEqual({ x: 15, y: 15, dir: 'bas' });
  });

  it('en courant, on le sème', () => {
    const { player, caught, mobs, host } = plain();
    const mob = new NightMob(def('rodeur'), host, 15, 9);
    mobs.push(mob);
    // Il vous repère, et vous courez droit devant (une case toutes les 0,12 s).
    let t = 0;
    run(mob, 1.5, () => {
      t += 1 / 30;
      if (t >= 0.12 && player.y < 29) {
        t = 0;
        player.y++;
      }
    });
    expect(mob.phase).toBe('chasse');
    expect(caught).toEqual([]);
    expect(mob.distance()).toBeGreaterThan(9);
  });

  it('le volant tournoie, puis pique sur vous… sauf si vous vous écartez à temps', () => {
    const still = plain();
    const hawk = new NightMob(def('volant'), still.host, 12, 12);
    expect(hawk.occupies(12, 12)).toBe(false);
    let dived = false;
    run(hawk, 15, () => {
      if (hawk.phase === 'pique') dived = true;
    });
    expect(dived).toBe(true);
    expect(still.caught).toEqual([hawk]);

    const quick = plain();
    const miss = new NightMob(def('volant'), quick.host, 12, 12);
    let moved = false;
    let landed = false;
    run(miss, 12, () => {
      // Dès que l'ombre fond sur vous, vous filez de trois cases : il s'écrase à côté.
      if (miss.phase === 'pique' && !moved) {
        moved = true;
        quick.player.x += 3;
      }
      if (miss.phase === 'pose') landed = true;
    });
    expect(moved).toBe(true);
    expect(landed).toBe(true);
    expect(quick.sounds).toContain('chute');
  });

  it('l’imposteur attend à la lanterne, se retourne quand on approche, et attaque', () => {
    const { player, caught, mobs, host } = plain();
    const mob = new NightMob(def('imposteur'), host, 15, 8);
    mobs.push(mob);
    run(mob, 3);
    expect(mob.disguised()).toBe(true);
    expect(caught).toEqual([]);
    player.y = 10;
    run(mob, 3);
    expect(caught).toEqual([mob]);
  });

  it('le villageois fuit jusqu’à l’abri, et la bête se tourne alors vers vous', () => {
    const { player, caught, mobs, host } = plain();
    // Le joueur attend près de l'abri, à l'écart du chemin.
    player.x = 25;
    player.y = 9;
    const path = findPath(0, 5, 29, 5, () => true, 30, 30)!;
    expect(path).toHaveLength(30);
    const villager = new Fugitive(host, path, { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' });
    const beast = new NightMob(def('rodeur'), host, 0, 5);
    beast.follow(path);
    mobs.push(beast);
    let turned = false;
    for (let f = 0; f < 30 * 30 && caught.length === 0; f++) {
      villager.update(1 / 30);
      beast.update(1 / 30);
      if (beast.phase === 'chasse') turned = true;
      // Tant qu'il le poursuit, la bête ne lâche pas le villageois pour vous.
      if (!turned) expect(beast.y).toBe(5);
    }
    expect(villager.safe).toBe(true);
    expect(turned).toBe(true);
    expect(caught).toEqual([beast]);
  });
});
