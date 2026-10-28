import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/ginedex';
import { ITEMS } from '../src/data/items';
import { REGION_SPECIES } from '../src/data/region';
import { TRAINERS } from '../src/data/trainers';
import { ZONES } from '../src/data/zones';
import { captureChance } from '../src/engine/combat';
import { applyItem, createJinemon, maxHp } from '../src/engine/creature';
import { seededRng } from '../src/engine/rng';

describe('Djenna, la petite sœur de l’héroïne', () => {
  it('accourt à la sortie de la Forge, une fois Sirafa battu, et offre ses cadeaux une seule fois', () => {
    const visit = ZONES.terresRouges.npcs.find((n) => n.id === 'djennaVisite')!;
    expect(visit.showFlag).toBe('dresseur:sirafa');
    expect(visit.script.kind).toBe('visite');
    if (visit.script.kind !== 'visite') return;
    expect(visit.hideFlag).toBe(visit.script.flag);
    expect(visit.script.sight).toBeGreaterThan(0);
    expect(visit.script.gifts.map((g) => [g.item, g.quantity])).toEqual([
      ['calebasseMaster', 5],
      ['gateauFraise', 1],
    ]);
  });

  it('défie sa sœur pour de rire au Marigot : perdre ne coûte rien, gagner rapporte un chiot', () => {
    const djenna = TRAINERS.djenna;
    expect(ZONES.marigot.npcs.some((n) => n.script.kind === 'dresseur' && n.script.trainer === 'djenna')).toBe(true);
    expect(djenna.bandit).toBeUndefined();
    expect(djenna.badge).toBeUndefined();
    expect(djenna.friendly?.lost.length).toBeGreaterThan(0);
    expect(djenna.gift?.species).toBe(145);
    expect(REGION_SPECIES).toContain(145);
    // Plus douce que le bras droit du Chef.
    const top = (id: string) => Math.max(...TRAINERS[id].team.map((m) => m.level));
    expect(top('djenna')).toBeLessThanOrEqual(top('aminata'));
  });

  it('ne parle jamais d’anniversaire (c’est Thomas qui s’en charge, à la toute fin)', () => {
    const visit = ZONES.terresRouges.npcs.find((n) => n.id === 'djennaVisite')!;
    const djenna = TRAINERS.djenna;
    const words = [
      ...(visit.script.kind === 'visite' ? [...visit.script.lines, ...visit.script.gifts.flatMap((g) => [...g.lines, ...(g.after ?? [])]), ...visit.script.farewell] : []),
      ...djenna.intro,
      ...djenna.defeat,
      ...djenna.after,
      ...djenna.friendly!.lost,
      ...djenna.gift!.lines,
      ITEMS.gateauFraise.description,
    ].join(' ');
    expect(words).not.toMatch(/anniv|birthday/i);
  });

  it('les Calebasses Master capturent à coup sûr, même un Jinémon en pleine forme', () => {
    const bonus = ITEMS.calebasseMaster.effect.kind === 'capture' ? ITEMS.calebasseMaster.effect.bonus : 0;
    for (const [species, level] of [[144, 20], [70, 60], [14, 3]] as const) {
      const foe = createJinemon(species, level, seededRng(1));
      expect(captureChance(foe, bonus), getSpecies(species).name).toBe(1);
    }
  });

  it('le Gâteau à la Fraise remet un Jinémon sur pied', () => {
    const j = createJinemon(7, 12, seededRng(2));
    j.hp = 1;
    j.status = { kind: 'poison' };
    applyItem(j, 'gateauFraise');
    expect(j.hp).toBe(maxHp(j));
    expect(j.status).toBeNull();
  });
});
