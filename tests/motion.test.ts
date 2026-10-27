import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/ginedex';
import { creatureMotion, renderCreature } from '../src/ui/creatures';

describe('Jinémon vivants en combat', () => {
  it('chacun bouge selon son corps', () => {
    for (const s of SPECIES) {
      const m = creatureMotion(s.id);
      expect(m.breath, s.name).toBeGreaterThan(0);
      expect(m.sway + m.wave + m.flap + m.bob, s.name).toBeGreaterThan(0);
    }
    const byPlan = (plan: string) => SPECIES.filter((s) => s.look.plan === plan).map((s) => creatureMotion(s.id));
    expect(byPlan('serpent').every((m) => m.wave > 0)).toBe(true);
    expect(byPlan('oiseau').every((m) => m.flap > 0 && m.bob > 0)).toBe(true);
    expect(byPlan('esprit').every((m) => m.bob > 0)).toBe(true);
  });

  it('les yeux fermés sont rendus avec l’image, sans sculpter deux fois', () => {
    const blink: { rgba?: Uint8ClampedArray } = {};
    const open = renderCreature(1, 64, 'face', blink);
    expect(blink.rgba).toBeDefined();
    let differ = 0;
    for (let i = 0; i < open.rgba.length; i++) if (open.rgba[i] !== blink.rgba![i]) differ++;
    // Seuls les yeux changent : quelques pixels, pas l'image entière.
    expect(differ).toBeGreaterThan(0);
    expect(differ).toBeLessThan(open.rgba.length * 0.02);
  });
});
