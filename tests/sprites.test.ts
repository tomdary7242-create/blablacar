import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/ginedex';
import { renderCreature } from '../src/ui/creatures';

/** Nombre de pixels opaques, et pixels opaques sur le bord de l'image. */
function coverage(id: number, size: number, pose: 'face' | 'dos'): { opaque: number; border: number } {
  const img = renderCreature(id, size, pose);
  let opaque = 0;
  let border = 0;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.rgba[(y * img.w + x) * 4 + 3] === 0) continue;
      opaque++;
      if (x === 0 || y === 0 || x === img.w - 1) border++;
    }
  }
  return { opaque, border };
}

describe('sprites sculptés', () => {
  it('chaque Jinémon remplit son cadre sans en déborder (face et dos)', () => {
    const problems: string[] = [];
    for (const s of SPECIES) {
      for (const pose of ['face', 'dos'] as const) {
        const { opaque, border } = coverage(s.id, 32, pose);
        if (opaque <= 80) problems.push(`${s.name} (${pose}) est presque vide`);
        if (border > 2) problems.push(`${s.name} (${pose}) touche le bord du cadre (${border} px)`);
      }
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('le rendu est déterministe', () => {
    const a = renderCreature(31, 32, 'face').rgba;
    const b = renderCreature(31, 32, 'face').rgba;
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
