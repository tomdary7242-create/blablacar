import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/ginedex';
import { TERRORS, chaserOf, mobKindOf, nightMobsOf, townMobs, type MobDef, type MobKind } from '../src/data/nightMobs';
import { SOLID_TILES, ZONES, type Dir, type ZoneId } from '../src/data/zones';
import { seededRng } from '../src/engine/rng';
import { Fugitive, NightMob, findPath, isHangTree, isPerch, lairsOf, type MobHost } from '../src/ui/nightMobs';

/**
 * Une plaine de 30 × 30 cases (avec, au besoin, quelques décors) ; le joueur se déplace à la main.
 * `still` compte les secondes depuis son dernier pas.
 */
function plain(decor: Record<string, string> = {}) {
  const player = { x: 15, y: 15, dir: 'bas' as Dir };
  const caught: NightMob[] = [];
  const sounds: string[] = [];
  const mobs: NightMob[] = [];
  const idle = { t: 99 };
  const tile = (x: number, y: number) => (x < 0 || y < 0 || x >= 30 || y >= 30 ? '' : (decor[`${x},${y}`] ?? '.'));
  const host: MobHost = {
    rng: seededRng(3),
    mapWidth: 30,
    mapHeight: 30,
    player: () => player,
    still: () => idle.t,
    tile,
    walkable: (x, y) => tile(x, y) !== '' && !SOLID_TILES.has(tile(x, y)) && !(x === player.x && y === player.y) && !mobs.some((m) => m.occupies(x, y)),
    sound: (kind) => void sounds.push(kind),
    caught: (mob) => void caught.push(mob),
  };
  /** Un pas du joueur. */
  const move = (dx: number, dy: number) => {
    player.x += dx;
    player.y += dy;
    idle.t = 0;
  };
  return { player, caught, sounds, mobs, host, idle, move };
}

const def = (kind: MobKind): MobDef => ({
  id: `test:${kind}`,
  zone: 'savane',
  species: TERRORS[kind],
  level: 8,
  kind,
  disguise: kind === 'imposteur' ? { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' } : undefined,
});

/** Fait tourner la créature `seconds` secondes (à 30 images par seconde). */
function run(mob: NightMob, seconds: number, each?: (t: number) => void, idle?: { t: number }): void {
  for (let f = 0; f < seconds * 30; f++) {
    if (idle) idle.t += 1 / 30;
    mob.update(1 / 30);
    each?.(f / 30);
  }
}

describe('Les Terreurs nocturnes (données)', () => {
  const wild = (Object.keys(ZONES) as ZoneId[]).filter((id) => nightMobsOf(id).length > 0);

  it('sept Terreurs, une par façon de chasser, qu’on ne croise jamais dans les herbes', () => {
    const kinds = Object.keys(TERRORS) as MobKind[];
    expect(kinds).toHaveLength(7);
    expect(new Set(Object.values(TERRORS)).size).toBe(7);
    for (const kind of kinds) {
      expect(getSpecies(TERRORS[kind]).terreur, kind).toBe(true);
      expect(mobKindOf(TERRORS[kind])).toBe(kind);
    }
    for (const z of Object.values(ZONES)) {
      for (const e of [...z.encounters, ...(z.nightEncounters ?? []), ...(z.fishing ?? [])]) {
        expect(getSpecies(e.species).terreur, `${z.id} : ${getSpecies(e.species).name}`).toBeFalsy();
      }
    }
  });

  it('chaque zone sauvage lâche trois Terreurs différentes, et seulement des Terreurs', () => {
    expect(wild.length).toBeGreaterThanOrEqual(10);
    const seen = new Set<MobKind>();
    for (const id of wild) {
      const mobs = nightMobsOf(id);
      expect(mobs, id).toHaveLength(3);
      expect(new Set(mobs.map((m) => m.kind)).size, id).toBe(3);
      const strongest = Math.max(...ZONES[id].nightEncounters!.map((e) => e.max));
      for (const m of mobs) {
        seen.add(m.kind);
        expect(getSpecies(m.species).terreur, `${id} ${m.id}`).toBe(true);
        expect(m.species).toBe(TERRORS[m.kind]);
        expect(m.level, `${id} ${m.id}`).toBe(strongest);
        expect(!!m.disguise).toBe(m.kind === 'imposteur');
      }
    }
    // Chaque Terreur chasse quelque part.
    expect(seen.size).toBe(7);
  });

  it('les araignées et les pendus ne chassent que là où il y a des toits ou des arbres', () => {
    for (const id of wild) {
      const zone = ZONES[id];
      const host = { tile: (x: number, y: number) => zone.map[y]?.[x] ?? '', mapWidth: zone.map[0].length, mapHeight: zone.map.length } as MobHost;
      for (const m of nightMobsOf(id)) {
        if (m.kind === 'guetteur' || m.kind === 'pendu') expect(lairsOf(m.kind, host)!.length, `${id} ${m.kind}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('en ville : l’araignée sur les toits, un faux villageois une nuit sur deux, le fauve aux trousses des attardés', () => {
    expect(chaserOf('village')).toEqual({ species: TERRORS.rodeur, level: 7 });
    const nights = Array.from({ length: 20 }, (_, n) => townMobs('village', n));
    for (const mobs of nights) expect(mobs[0].kind).toBe('guetteur');
    expect(nights.some((m) => m.some((d) => d.kind === 'imposteur'))).toBe(true);
    expect(nights.some((m) => m.length === 1)).toBe(true);
    expect(nightMobsOf('village')).toEqual([]);
    expect(nightMobsOf('village:soins')).toEqual([]);
    expect(townMobs('village:soins', 1)).toEqual([]);
    expect(townMobs('savane', 1)).toEqual([]);
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

  it('l’araignée guette sur le toit, se rapproche de toit en toit, et saute quand on passe trop près', () => {
    // Une rangée de toits de cases au nord de la place.
    const roofs: Record<string, string> = {};
    for (let x = 4; x <= 26; x++) roofs[`${x},8`] = 'R';
    const { player, caught, sounds, host, idle, move } = plain(roofs);
    expect(isPerch(host, 10, 8)).toBe(true);
    expect(isPerch(host, 10, 9)).toBe(false);
    player.x = 16;
    player.y = 11;
    const spider = new NightMob(def('guetteur'), host, 6, 8);
    expect(spider.phase).toBe('perche');
    expect(spider.occupies(6, 8)).toBe(false);
    // Elle file sur les toits vers vous… sans descendre.
    run(spider, 12, undefined, idle);
    expect(spider.y).toBe(8);
    expect(Math.abs(spider.x - 16)).toBeLessThan(6);
    expect(caught).toEqual([]);
    expect(sounds).toContain('cliquetis');
    // On passe sous le toit : elle se tapit, puis bondit.
    move(spider.x - player.x, 0);
    player.y = 10;
    let crouched = false;
    run(spider, 2, () => {
      if (spider.phase === 'tapi') crouched = true;
    }, idle);
    expect(crouched).toBe(true);
    expect(caught).toEqual([spider]);
  });

  it('en filant dès qu’elle se tapit, on esquive son bond ; elle finit par remonter sur un toit', () => {
    const roofs: Record<string, string> = {};
    for (let x = 4; x <= 26; x++) roofs[`${x},8`] = 'R';
    const { player, caught, host, idle } = plain(roofs);
    player.x = 12;
    player.y = 10;
    const spider = new NightMob(def('guetteur'), host, 12, 8);
    let dodged = false;
    let t = 0;
    run(spider, 12, () => {
      if (spider.phase === 'tapi') dodged = true;
      // Dès qu'elle se ramasse, vous courez vers le sud (une case toutes les 0,12 s).
      if (dodged && player.y < 29 && (t += 1 / 30) >= 0.12) {
        t = 0;
        player.y++;
        idle.t = 0;
      }
    }, idle);
    expect(dodged).toBe(true);
    expect(caught).toEqual([]);
    expect(spider.phase).toBe('perche');
    expect(spider.y).toBe(8);
  });

  it('le pendu attend qu’on passe sous ses branches ; à deux pas de côté, il ne fait que descendre un peu', () => {
    const { player, caught, sounds, host, idle, move } = plain({ '15,10': 'T', '14,10': 'T', '16,10': 'T' });
    expect(isHangTree(host, 15, 10)).toBe(true);
    const hanger = new NightMob(def('pendu'), host, 15, 10);
    expect(hanger.phase).toBe('pendu');
    expect(hanger.occupies(15, 11)).toBe(false);
    player.x = 18;
    player.y = 11;
    run(hanger, 1, undefined, idle);
    move(-1, 0);
    run(hanger, 4, undefined, idle);
    expect(hanger.hunting()).toBe(true);
    expect(caught).toEqual([]);
    expect(sounds).toContain('rire');
    // Un pas de plus, juste à côté du passage sous l'arbre : il lâche prise.
    move(-1, 0);
    run(hanger, 1, undefined, idle);
    expect(caught).toEqual([hanger]);
  });

  it('le ver des sables suit vos pas sous la terre ; immobile, vous disparaissez pour lui', () => {
    // Immobile : il tourne au hasard, sans jamais vous trouver.
    const calm = plain();
    const worm = new NightMob(def('fouisseur'), calm.host, 15, 9);
    calm.mobs.push(worm);
    run(worm, 25, undefined, calm.idle);
    expect(calm.caught).toEqual([]);
    expect(worm.tremor()).toBe(0);
    expect(worm.occupies(worm.x, worm.y)).toBe(false);

    // En faisant les cent pas, on attire le ver… qui jaillit.
    const pacing = plain();
    const hunter = new NightMob(def('fouisseur'), pacing.host, 15, 6);
    pacing.mobs.push(hunter);
    let t = 0;
    let dir = 1;
    let shook = false;
    run(hunter, 20, () => {
      if (hunter.tremor() > 0) shook = true;
      if ((t += 1 / 30) >= 0.25 && pacing.caught.length === 0) {
        t = 0;
        if (pacing.player.x >= 18 || pacing.player.x <= 12) dir = -dir;
        pacing.move(dir, 0);
      }
    }, pacing.idle);
    expect(shook).toBe(true);
    expect(pacing.sounds).toContain('grondement');
    expect(pacing.caught).toEqual([hunter]);
  });

  it('la clochette s’approche doucement en tintant, puis se rue ; en courant, on la sème', () => {
    const slow = plain();
    const bell = new NightMob(def('leurre'), slow.host, 15, 4);
    slow.mobs.push(bell);
    const start = bell.distance();
    run(bell, 6, undefined, slow.idle);
    expect(bell.distance()).toBeLessThan(start);
    expect(slow.sounds).toContain('clochette');
    expect(slow.caught).toEqual([]);
    // Elle est tout près : la bouche s'ouvre et elle fonce. En marchant, on se fait prendre.
    let t = 0;
    run(bell, 10, () => {
      if (bell.phase === 'ruee' && slow.player.y < 29 && (t += 1 / 30) >= 0.21) {
        t = 0;
        slow.move(0, 1);
      }
    }, slow.idle);
    expect(slow.caught).toEqual([bell]);

    // En courant, on la distance : elle renonce et sa lueur se rallume plus loin.
    const quick = plain();
    quick.player.y = 2;
    const lure = new NightMob(def('leurre'), quick.host, 15, 6);
    quick.mobs.push(lure);
    let rushed = false;
    let back = false;
    let relit = 0;
    t = 0;
    run(lure, 14, () => {
      if (lure.phase === 'ruee') rushed = true;
      if (rushed && !back && lure.phase === 'leurre') {
        back = true;
        relit = lure.distance();
      }
      if (rushed && !back && (t += 1 / 30) >= 0.12) {
        t = 0;
        quick.move(quick.player.x < 29 ? 1 : 0, quick.player.x >= 29 && quick.player.y < 29 ? 1 : 0);
      }
    }, quick.idle);
    expect(rushed).toBe(true);
    expect(quick.caught).toEqual([]);
    expect(back).toBe(true);
    expect(relit).toBeGreaterThanOrEqual(9);
  });
});
