// Primitives de dessin pixel art de l'interface : cadres, barres, badges, icônes.
// Tout est dessiné au pixel près dans le tampon basse résolution (aucun anticrénelage).
import { STATUS_LABELS, type StatusKind } from '../data/moves';
import { TYPE_COLORS, type ElementType } from '../data/types';
import { drawText, type TextOpts } from './font';

export const PAL = {
  ink: '#28180e',
  paper: '#f8f0dc',
  paperDark: '#e0cca0',
  ochre: '#d0902c',
  rust: '#b04a20',
  indigo: '#28407a',
  night: '#141a2e',
  cream: '#fff8e8',
  grey: '#8a7a68',
  shadow: '#d8c8a8',
  hpGreen: '#48c048',
  hpYellow: '#f0c028',
  hpRed: '#e03828',
  xp: '#3890f0',
};

/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur hexadécimale. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Texte en police pixel (raccourci). */
export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  opts: TextOpts & { color?: string } = {},
): void {
  drawText(ctx, str, x, y, opts.color ?? PAL.ink, opts);
}

/** Dessine une petite image définie par des lignes de caractères et une palette ('.' = transparent). */
export function stamp(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, pal: Record<string, string>, scale = 1): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x) + i * scale, Math.round(y) + j * scale, scale, scale);
      }
    }
  });
}

/** Ellipse pleine au pixel près. */
export function fillEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/** Cadre de fenêtre façon bogolan : bord sombre, liseré clair, filet ocre et losanges aux coins. */
export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: 'papier' | 'sombre' | 'actif' = 'papier',
): void {
  const fill = style === 'sombre' ? '#3a2818' : style === 'actif' ? '#fff4c8' : PAL.paper;
  const ring = style === 'sombre' ? '#8a6038' : '#ffffff';
  const inner = style === 'sombre' ? PAL.ochre : PAL.ochre;
  // Bord extérieur aux coins arrondis
  rect(ctx, x + 2, y, w - 4, 1, PAL.ink);
  rect(ctx, x + 2, y + h - 1, w - 4, 1, PAL.ink);
  rect(ctx, x, y + 2, 1, h - 4, PAL.ink);
  rect(ctx, x + w - 1, y + 2, 1, h - 4, PAL.ink);
  rect(ctx, x + 1, y + 1, 1, 1, PAL.ink);
  rect(ctx, x + w - 2, y + 1, 1, 1, PAL.ink);
  rect(ctx, x + 1, y + h - 2, 1, 1, PAL.ink);
  rect(ctx, x + w - 2, y + h - 2, 1, 1, PAL.ink);
  // Liseré clair puis filet ocre
  rect(ctx, x + 2, y + 1, w - 4, 1, ring);
  rect(ctx, x + 1, y + 2, w - 2, h - 4, ring);
  rect(ctx, x + 2, y + h - 2, w - 4, 1, ring);
  rect(ctx, x + 2, y + 2, w - 4, h - 4, inner);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, fill);
  // Ombre intérieure légère
  rect(ctx, x + 3, y + h - 4, w - 6, 1, style === 'sombre' ? '#2a1c10' : PAL.shadow);
  // Losanges
  for (const [cx, cy] of [
    [x + 3, y + 3],
    [x + w - 4, y + 3],
    [x + 3, y + h - 4],
    [x + w - 4, y + h - 4],
  ]) {
    rect(ctx, cx, cy - 1, 1, 3, PAL.rust);
    rect(ctx, cx - 1, cy, 3, 1, PAL.rust);
  }
}

export function hpColor(ratio: number): string {
  return ratio > 0.5 ? PAL.hpGreen : ratio > 0.2 ? PAL.hpYellow : PAL.hpRed;
}

/** Barre de progression avec reflet. */
export function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, color: string): void {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, PAL.ink);
  rect(ctx, x, y, w, h, '#4a4038');
  const fill = Math.round(w * Math.max(0, Math.min(1, ratio)));
  if (fill > 0) {
    rect(ctx, x, y, fill, h, color);
    rect(ctx, x, y, fill, 1, shade(color, 0.45));
    if (h > 2) rect(ctx, x, y + h - 1, fill, 1, shade(color, -0.25));
  }
}

/** Barre de PV façon console : étiquette « PV » sur fond sombre puis jauge. */
export function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number): void {
  rect(ctx, x, y - 1, 15, 5, PAL.ink);
  stamp(ctx, ['###.#.#', '#.#.#.#', '###.#.#', '#...#.#', '#....#.'], x + 4, y - 1, { '#': PAL.ochre });
  bar(ctx, x + 16, y, w - 16, 3, ratio, hpColor(ratio));
}

export function typeBadge(ctx: CanvasRenderingContext2D, type: ElementType, x: number, y: number, w = 40): void {
  const c = TYPE_COLORS[type];
  rect(ctx, x + 1, y, w - 2, 11, shade(c, -0.55));
  rect(ctx, x, y + 1, w, 9, shade(c, -0.55));
  rect(ctx, x + 1, y + 1, w - 2, 9, c);
  rect(ctx, x + 1, y + 1, w - 2, 1, shade(c, 0.35));
  rect(ctx, x + 1, y + 9, w - 2, 1, shade(c, -0.25));
  text(ctx, type.toUpperCase(), x + w / 2, y - 1, { color: '#ffffff', align: 'center', shadow: shade(c, -0.6) });
}

const STATUS_COLORS: Record<StatusKind, string> = {
  sommeil: '#8888a8',
  poison: '#a048c0',
  paralysie: '#d8a820',
  confusion: '#e05890',
};

export function statusBadge(ctx: CanvasRenderingContext2D, status: StatusKind, x: number, y: number): void {
  const c = STATUS_COLORS[status];
  rect(ctx, x + 1, y, 22, 10, PAL.ink);
  rect(ctx, x, y + 1, 24, 8, PAL.ink);
  rect(ctx, x + 1, y + 1, 22, 8, c);
  text(ctx, STATUS_LABELS[status], x + 12, y - 1, { color: '#ffffff', align: 'center', shadow: shade(c, -0.5) });
}

/** Curseur en forme de flèche. */
export function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, color = PAL.rust): void {
  stamp(ctx, ['#...', '##..', '###.', '####', '###.', '##..', '#...'], x, y, { '#': color });
}

export interface ListOptions {
  lineHeight?: number;
  disabled?: boolean[];
  color?: string;
}

export function menuList(ctx: CanvasRenderingContext2D, items: string[], x: number, y: number, selected: number, opts: ListOptions = {}): void {
  const lh = opts.lineHeight ?? 12;
  items.forEach((item, i) => {
    const color = opts.disabled?.[i] ? PAL.grey : (opts.color ?? PAL.ink);
    text(ctx, item, x + 8, y + i * lh, { color, shadow: opts.disabled?.[i] ? undefined : PAL.shadow });
    if (i === selected) cursor(ctx, x, y + i * lh + 2);
  });
}

/** Petite flèche clignotante « suite ». */
export function continueMarker(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const dy = Math.floor(time * 3) % 2;
  stamp(ctx, ['#####', '.###.', '..#..'], x, y + dy, { '#': PAL.rust });
}

/** Dégradé vertical en bandes de couleurs, avec une ligne tramée entre deux bandes. */
export function bandGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colors: string[]): void {
  const band = h / colors.length;
  colors.forEach((c, i) => {
    const top = Math.round(y + i * band);
    const bottom = Math.round(y + (i + 1) * band);
    rect(ctx, x, top, w, bottom - top, c);
    if (i > 0) {
      // Trame d'une ligne avec la couleur précédente pour adoucir la transition.
      ctx.fillStyle = colors[i - 1];
      for (let px = x + (i % 2); px < x + w; px += 2) ctx.fillRect(px, top, 1, 1);
    }
  });
}

/** Calebasse en pixel art (taille 1 : 6×8, taille 2 : 11×12, taille 3 : 22×24), centrée sur (x, y). */
export function calabash(ctx: CanvasRenderingContext2D, x: number, y: number, size: 1 | 2 | 3 = 1, color = '#d8a040'): void {
  const pal = { k: PAL.ink, c: color, h: shade(color, 0.4), d: shade(color, -0.3), r: PAL.rust };
  if (size === 1) {
    stamp(ctx, ['..kk..', '..ck..', '.kcck.', 'kchcck', 'kcccck', 'krrrrk', 'kdccdk', '.kkkk.'], x - 3, y - 4, pal);
  } else {
    const k = size === 3 ? 2 : 1;
    stamp(
      ctx,
      [
        '....kkk....',
        '....kck....',
        '....kck....',
        '..kkkckkk..',
        '.kchhcccck.',
        'kchhcccccck',
        'kcccccccdck',
        'krrrrrrrrrk',
        'kccccccccdk',
        'kdcccccddk.',
        '.kddddddk..',
        '..kkkkkkk..',
      ],
      x - 5 * k,
      y - 6 * k,
      pal,
      k,
    );
  }
}
