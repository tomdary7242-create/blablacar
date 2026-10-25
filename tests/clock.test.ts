import { describe, expect, it } from 'vitest';
import { advance, advanceTo, darknessOf, formatClock, isNight, newClock, nightId, phaseOf } from '../src/engine/clock';

describe('Horloge', () => {
  it('découpe la journée en quatre phases', () => {
    expect(phaseOf(4 * 60 + 59)).toBe('nuit');
    expect(phaseOf(5 * 60)).toBe('aube');
    expect(phaseOf(7 * 60)).toBe('jour');
    expect(phaseOf(18 * 60)).toBe('crepuscule');
    expect(phaseOf(20 * 60)).toBe('nuit');
    expect(phaseOf(23 * 60 + 59)).toBe('nuit');
  });

  it('commence de jour et passe minuit en changeant de jour', () => {
    const clock = newClock();
    expect(isNight(clock)).toBe(false);
    expect(advance(clock, 30)).toBe(false);
    advanceTo(clock, 23 * 60);
    expect(clock).toEqual({ day: 1, minute: 23 * 60 });
    advance(clock, 120);
    expect(clock).toEqual({ day: 2, minute: 60 });
    expect(formatClock(clock)).toBe('1h00');
  });

  it('signale les changements de phase', () => {
    const clock = { day: 1, minute: 19 * 60 + 59 };
    expect(advance(clock, 1)).toBe(true);
    expect(isNight(clock)).toBe(true);
  });

  it('avance au lendemain quand l’heure demandée est passée', () => {
    const clock = { day: 3, minute: 10 * 60 };
    advanceTo(clock, 7 * 60);
    expect(clock).toEqual({ day: 4, minute: 7 * 60 });
  });

  it('garde le même numéro de nuit du soir jusqu’à l’aube', () => {
    const evening = nightId({ day: 2, minute: 21 * 60 });
    expect(nightId({ day: 3, minute: 3 * 60 })).toBe(evening);
    expect(nightId({ day: 3, minute: 12 * 60 })).toBe(evening);
    expect(nightId({ day: 3, minute: 20 * 60 })).toBe(evening + 1);
  });

  it('assombrit progressivement la carte', () => {
    expect(darknessOf(12 * 60)).toBe(0);
    expect(darknessOf(23 * 60)).toBe(1);
    const dusk = darknessOf(19 * 60);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
  });
});
