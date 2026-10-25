// Effets visuels des attaques, un par type élémentaire, en particules pixel art.
// Chaque effet est une fonction déterministe du temps normalisé t (0 → 1).
import type { ElementType } from '../data/types';

type Ctx = CanvasRenderingContext2D;

function stamp(ctx: Ctx, rows: string[], x: number, y: number, pal: Record<string, string>): void {
  const x0 = Math.round(x - rows[0].length / 2);
  const y0 = Math.round(y - rows.length / 2);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x0 + i, y0 + j, 1, 1);
    }
  });
}

/** Pseudo-hasard stable par particule. */
const rnd = (i: number, k: number) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const FLAME = ['...y...', '..yy...', '..yoy..', '.yooy..', '.yoroy.', 'yorrroy', 'orrrrro', '.orrro.', '..ooo..'];
const FLAME_S = ['..y..', '.yoy.', 'yoroy', 'orrro', '.ooo.'];
const LEAF = ['...gGG', '..gGGG', '.gGGG.', 'gGGG..', 'GG....'];
const DROP = ['..b..', '.bwb.', 'bwwbb', 'bbbbb', 'bbbbd', '.bbd.'];
const ROCK = ['.rRRr..', 'rRRRRr.', 'rRRRRRd', 'rRRRRdd', '.rRddd.', '..ddd..'];
const SPARK = ['...w...', '...y...', '..yWy..', 'wyWWWyw', '..yWy..', '...y...', '...w...'];
const ORB = ['.pPPp.', 'pPPPPp', 'PPPPPP', 'PPPPPP', 'pPPPPp', '.pPPp.'];

function ring(ctx: Ctx, x: number, y: number, r: number, color: string, dots = 24): void {
  ctx.fillStyle = color;
  const n = Math.max(dots, Math.round(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.75), 2, 2);
  }
}

function burst(ctx: Ctx, x: number, y: number, t: number, colors: [string, string]): void {
  const len = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 20;
  if (t < 0.25) stamp(ctx, ['..www..', '.wwwww.', 'wwwwwww', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..'], x, y, { w: '#ffffff' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    for (let s = 4; s < 4 + len; s++) {
      ctx.fillStyle = s > len ? colors[1] : colors[0];
      ctx.fillRect(Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), 2, 2);
    }
  }
}

const EFFECTS: Record<ElementType, (ctx: Ctx, x: number, y: number, t: number) => void> = {
  Normal: (ctx, x, y, t) => burst(ctx, x, y, t, ['#ffffff', '#f8d848']),
  Plante: (ctx, x, y, t) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 7;
      const r = 34 * (1 - t) + 4;
      stamp(ctx, LEAF, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, { g: '#78c848', G: '#3a8a28' });
    }
  },
  Terre: (ctx, x, y, t) => {
    for (let i = 0; i < 7; i++) {
      const delay = rnd(i, 1) * 0.4;
      const u = Math.max(0, Math.min(1, (t - delay) / 0.5));
      if (u <= 0) continue;
      const px = x - 22 + rnd(i, 2) * 44;
      const py = y - 46 + u * u * 54;
      if (u < 1) stamp(ctx, ROCK, px, py, { r: '#b5733a', R: '#d89858', d: '#6a3a1a' });
      else stamp(ctx, ['.dd.', 'dDDd'], px, y + 10 - (t - delay - 0.5) * 10, { d: '#c8a878', D: '#e8d0a8' });
    }
  },
  Roche: (ctx, x, y, t) => {
    for (let i = 0; i < 5; i++) {
      const delay = rnd(i, 3) * 0.35;
      const u = Math.max(0, Math.min(1, (t - delay) / 0.55));
      if (u <= 0 || u >= 1) continue;
      stamp(ctx, ['.rRr.', 'rRRRr', 'rRRRd', 'rRRdd', '.ddd.'], x - 20 + rnd(i, 4) * 40, y - 50 + u * u * 56, { r: '#8a8070', R: '#b8ac98', d: '#5a5246' });
    }
  },
  Eau: (ctx, x, y, t) => {
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (rnd(i, 5) - 0.5) * 2.4;
      const v = 30 + rnd(i, 6) * 20;
      const px = x + Math.cos(a) * v * t;
      const py = y + 10 + Math.sin(a) * v * t + 60 * t * t;
      stamp(ctx, DROP, px, py, { b: '#3a86c8', w: '#c8ecff' });
    }
    if (t > 0.3) ring(ctx, x, y + 14, 8 + (t - 0.3) * 40, '#a8dcf8');
  },
  Feu: (ctx, x, y, t) => {
    for (let i = 0; i < 12; i++) {
      const life = (t * 2 + rnd(i, 7)) % 1;
      const px = x - 20 + rnd(i, 8) * 40 + Math.sin(life * 9 + i) * 3;
      const py = y + 16 - life * 40;
      stamp(ctx, life < 0.6 ? FLAME : FLAME_S, px, py, { y: '#fff0a0', o: '#ffb030', r: '#e84a1a' });
    }
  },
  Esprit: (ctx, x, y, t) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + t * 5;
      const r = 26 - t * 10;
      const py = y + 16 - t * 36 + Math.sin(a) * 6;
      if ((i + Math.floor(t * 12)) % 3 !== 0) stamp(ctx, SPARK, x + Math.cos(a) * r, py, { w: '#ffffff', y: '#f8e070', W: '#ffffff' });
    }
  },
  Métal: (ctx, x, y, t) => {
    for (let k = 0; k < 3; k++) {
      const u = Math.max(0, Math.min(1, (t - k * 0.18) / 0.35));
      if (u <= 0 || u >= 1) continue;
      for (let s = -18; s < -18 + u * 36; s++) {
        const px = Math.round(x + s + (k - 1) * 8);
        const py = Math.round(y - s * 0.9 + (k - 1) * 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 2, 1);
        ctx.fillStyle = '#a8b4c0';
        ctx.fillRect(px + 2, py, 1, 1);
        ctx.fillRect(px, py + 1, 2, 1);
      }
    }
  },
  Vol: (ctx, x, y, t) => {
    for (let k = 0; k < 4; k++) {
      const u = (t * 1.6 + k * 0.22) % 1;
      const cx = x - 40 + u * 80;
      for (let s = 0; s < 14; s++) {
        const a = (s / 14) * Math.PI;
        ctx.fillStyle = s % 3 === 0 ? '#ffffff' : '#c8e4f8';
        ctx.fillRect(Math.round(cx + Math.cos(a) * 10), Math.round(y - 14 + k * 10 - Math.sin(a) * 6), 2, 2);
      }
    }
  },
  Dragon: (ctx, x, y, t) => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 4 + t * 9;
      const r = 6 + (i / 14) * 24 * (1 - t * 0.5);
      stamp(ctx, FLAME_S, x + Math.cos(a) * r, y - 4 + Math.sin(a) * r * 0.6 - i, { y: '#e8d0ff', o: '#9a6ae8', r: '#4a2a9a' });
    }
  },
  Ténèbres: (ctx, x, y, t) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 40 * (1 - t);
      stamp(ctx, ORB, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, { p: '#3a2448', P: '#7a4a9a' });
    }
    if (t > 0.75) ring(ctx, x, y, 6 + (t - 0.75) * 60, '#2a1830', 32);
  },
  Insecte: (ctx, x, y, t) => {
    for (let i = 0; i < 18; i++) {
      const a = t * 20 * (0.5 + rnd(i, 9)) + i;
      const r = 8 + rnd(i, 10) * 22;
      stamp(ctx, ['w.w', '.b.'], x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r * 0.7, { w: '#e0f0c0', b: i % 2 ? '#8aa020' : '#4a5a14' });
    }
  },
  Spectre: (ctx, x, y, t) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 4;
      const px = x + Math.cos(a) * 22;
      const py = y + Math.sin(a) * 12 - t * 10;
      if ((Math.floor(t * 16) + i) % 4 !== 0) stamp(ctx, ['..ppp..', '.pPPPp.', 'pPwPwPp', 'pPPPPPp', 'pPPPPPp', 'pPpPpPp', 'p.p.p.p'], px, py, { p: '#6a4aa8', P: '#c8b0f8', w: '#2a1838' });
    }
  },
  Psy: (ctx, x, y, t) => {
    for (let k = 0; k < 3; k++) {
      const u = (t * 1.5 + k / 3) % 1;
      ring(ctx, x, y, 4 + u * 34, k % 2 ? '#f070c0' : '#c8a0f8', 36);
    }
  },
};

/** Dessine l'effet d'une attaque centré sur (x, y), au temps normalisé t. */
export function drawMoveEffect(ctx: Ctx, type: ElementType, x: number, y: number, t: number): void {
  EFFECTS[type](ctx, x, y, Math.max(0, Math.min(1, t)));
}
