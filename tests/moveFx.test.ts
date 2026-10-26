import { describe, expect, it } from 'vitest';
import { MOVES, type MoveId } from '../src/data/moves';
import type { Side } from '../src/engine/combat';
import { MoveAnim, specOf, type Anchor, type FxHost } from '../src/ui/battle/moveFx';
import { Particles } from '../src/ui/battle/particles';

/** Contexte de dessin factice : toutes les méthodes existent et ne font rien. */
function fakeCtx(): CanvasRenderingContext2D {
  const calls = { fill: 0 };
  return new Proxy({ calls } as unknown as CanvasRenderingContext2D, {
    get(target, prop) {
      if (prop === 'calls') return calls;
      if (prop in target) return (target as unknown as Record<string, unknown>)[prop as string];
      if (prop === 'fillRect') return () => calls.fill++;
      return () => undefined;
    },
    set(target, prop, value) {
      (target as unknown as Record<string, unknown>)[prop as string] = value;
      return true;
    },
  });
}

function host(): FxHost & { shakes: number; sounds: string[] } {
  const anchors: Record<Side, Anchor> = {
    joueur: { foot: { x: 66, y: 142 }, center: { x: 66, y: 110 }, head: { x: 70, y: 93 }, size: 72 },
    adversaire: { foot: { x: 186, y: 86 }, center: { x: 186, y: 57 }, head: { x: 180, y: 42 }, size: 64 },
  };
  const h = {
    particles: new Particles(),
    shakes: 0,
    sounds: [] as string[],
    anchor: (side: Side) => anchors[side],
    shake: () => void h.shakes++,
    flash: () => undefined,
    veil: () => undefined,
    warp: () => undefined,
    sound: (k: string) => void h.sounds.push(k),
    dark: () => false,
  };
  return h as FxHost & { shakes: number; sounds: string[] };
}

/** Joue une animation de bout en bout, à 60 images par seconde. */
function play(anim: MoveAnim, ctx: CanvasRenderingContext2D): number {
  let frames = 0;
  while (!anim.finished && frames < 600) {
    anim.update(1 / 60);
    anim.pose('joueur');
    anim.pose('adversaire');
    anim.renderBack(ctx);
    anim.renderFront(ctx);
    anim.host.particles.update(1 / 60);
    anim.host.particles.render(ctx);
    frames++;
  }
  return frames;
}

const ids = Object.keys(MOVES) as MoveId[];

describe('Chorégraphies des attaques', () => {
  it('chaque attaque a sa mise en scène', () => {
    for (const id of ids) expect(specOf(id), id).toBeDefined();
    // Les styles sont variés : une dizaine de façons différentes d'attaquer.
    expect(new Set(ids.map((id) => specOf(id).style)).size).toBeGreaterThanOrEqual(12);
  });

  it('se jouent sans erreur des deux côtés, et touchent avant de finir', () => {
    for (const id of ids) {
      for (const side of ['joueur', 'adversaire'] as const) {
        const h = host();
        const move = MOVES[id];
        const self = move.power === 0 && !move.status && (move.heal || move.stages?.every((st) => st.target === 'self'));
        const anim = new MoveAnim(h, id, side, self ? side : side === 'joueur' ? 'adversaire' : 'joueur');
        expect(anim.impact, id).toBeGreaterThan(0);
        expect(anim.impact, id).toBeLessThan(anim.duration);
        // Assez vif pour ne pas lasser, assez long pour être lisible.
        expect(anim.duration, id).toBeLessThan(move.tier === 'divin' ? 2.6 : 1.9);
        const frames = play(anim, fakeCtx());
        expect(anim.finished, id).toBe(true);
        expect(frames, id).toBeLessThan(600);
        expect(h.sounds.length, `${id} : au moins un bruitage`).toBeGreaterThan(0);
        expect(h.particles.count, id).toBeLessThan(900);
      }
    }
  });

  it('une attaque ratée ne fait pas trembler l’écran au contact', () => {
    const h = host();
    const anim = new MoveAnim(h, 'marteauForgeron', 'joueur', 'adversaire');
    anim.missed = true;
    play(anim, fakeCtx());
    expect(h.shakes).toBe(0);
    const hit = host();
    play(new MoveAnim(hit, 'marteauForgeron', 'joueur', 'adversaire'), fakeCtx());
    expect(hit.shakes).toBeGreaterThan(0);
  });

  it('les attaques divines commencent par une charge', () => {
    const divines = ids.filter((id) => MOVES[id].tier === 'divin');
    expect(divines.length).toBeGreaterThan(5);
    for (const id of divines) {
      const h = host();
      const anim = new MoveAnim(h, id, 'joueur', 'adversaire');
      anim.update(0.1);
      expect(h.sounds[0], id).toBe('charge');
      expect(anim.pose('joueur')?.glow, id).toBeDefined();
    }
  });
});
