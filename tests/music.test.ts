import { describe, expect, it } from 'vitest';
import { cryOf } from '../src/ui/audio';
import { JINGLES, TRACKS, midiOf, parseVoice } from '../src/ui/musicScore';
import { SPECIES } from '../src/data/ginedex';

describe('Musique', () => {
  it('lit les notes', () => {
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('C#4')).toBe(61);
    expect(midiOf('Bb3')).toBe(58);
  });

  for (const [id, def] of [...Object.entries(TRACKS), ...Object.entries(JINGLES).map(([k, v]) => [`jingle ${k}`, v] as const)]) {
    it(`${id} : toutes les voix ont la même longueur, en mesures entières`, () => {
      const lengths = def.voices.map((v) => parseVoice(v.notes).length);
      expect(new Set(lengths).size).toBe(1);
      if (def.loop) expect(lengths[0] % 16).toBe(0);
      if (def.drums) expect(lengths[0] % def.drums.length).toBe(0);
      for (const v of def.voices) {
        for (const ev of parseVoice(v.notes).events) {
          expect(ev.midi).toBeGreaterThanOrEqual(midiOf('C1'));
          expect(ev.midi).toBeLessThanOrEqual(midiOf('C7'));
        }
      }
    });
  }

  it('chaque Jinémon a un cri audible', () => {
    for (const s of SPECIES) {
      const cry = cryOf(s.id);
      expect(cry.length).toBeGreaterThanOrEqual(2);
      for (const seg of cry) {
        expect(seg.f0).toBeGreaterThan(60);
        expect(seg.f0).toBeLessThan(3000);
        expect(seg.dur).toBeGreaterThan(0.04);
      }
    }
  });
});
