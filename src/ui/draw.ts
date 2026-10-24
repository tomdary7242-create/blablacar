// Primitives de dessin de l'interface : textes, cadres, barres, badges.
// Palette inspirée du bogolan (toile de boue) : ocre, rouille, brun, crème, indigo.
import { STATUS_LABELS, type StatusKind } from '../data/moves';
import { TYPE_COLORS, type ElementType } from '../data/types';

export const PAL = {
  ink: '#2a1a10',
  paper: '#f6ecd6',
  paperDark: '#e2cfa6',
  ochre: '#c8892a',
  rust: '#a8441e',
  indigo: '#26365e',
  night: '#141a2e',
  cream: '#fff8e8',
  grey: '#8a7a68',
  hpGreen: '#4cb84c',
  hpYellow: '#e8c030',
  hpRed: '#d83a2a',
  xp: '#3a8ae8',
};

const FAMILY = '"Trebuchet MS", "Segoe UI", Verdana, Arial, sans-serif';

export function font(size: number, bold = false): string {
  return `${bold ? 'bold ' : ''}${size}px ${FAMILY}`;
}

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  bold?: boolean;
  shadow?: string;
}

export function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, opts: TextOptions = {}): void {
  ctx.font = font(opts.size ?? 10, opts.bold);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'top';
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fillText(str, x + 1, y + 1);
  }
  ctx.fillStyle = opts.color ?? PAL.ink;
  ctx.fillText(str, x, y);
}

export function measure(ctx: CanvasRenderingContext2D, str: string, size = 10, bold = false): number {
  ctx.font = font(size, bold);
  return ctx.measureText(str).width;
}

/** Découpe un texte en lignes tenant dans `maxWidth`. */
export function wrap(ctx: CanvasRenderingContext2D, str: string, maxWidth: number, size = 10): string[] {
  ctx.font = font(size);
  const lines: string[] = [];
  for (const paragraph of str.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cadre décoré façon bogolan. */
export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: 'papier' | 'sombre' = 'papier',
): void {
  const dark = style === 'sombre';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = dark ? '#2a2018' : PAL.paper;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = dark ? PAL.ochre : PAL.paperDark;
  ctx.stroke();
  // Petits losanges aux coins.
  ctx.fillStyle = PAL.rust;
  for (const [cx, cy] of [
    [x + 4, y + 4],
    [x + w - 4, y + 4],
    [x + 4, y + h - 4],
    [x + w - 4, y + h - 4],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 2, cy);
    ctx.fill();
  }
}

export function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, color: string): void {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, ratio))), h);
}

export function hpColor(ratio: number): string {
  return ratio > 0.5 ? PAL.hpGreen : ratio > 0.2 ? PAL.hpYellow : PAL.hpRed;
}

export function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number): void {
  text(ctx, 'PV', x, y - 2, { size: 7, bold: true, color: PAL.rust });
  bar(ctx, x + 14, y, w - 14, 4, ratio, hpColor(ratio));
}

export function typeBadge(ctx: CanvasRenderingContext2D, type: ElementType, x: number, y: number, w = 44): void {
  roundRect(ctx, x, y, w, 11, 3);
  ctx.fillStyle = TYPE_COLORS[type];
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, type.toUpperCase(), x + w / 2, y + 1.5, { size: 7, bold: true, color: '#fff', align: 'center', shadow: 'rgba(0,0,0,0.45)' });
}

const STATUS_COLORS: Record<StatusKind, string> = {
  sommeil: '#8a8aa8',
  poison: '#9a4ab8',
  paralysie: '#d8b02a',
  confusion: '#e85a8f',
};

export function statusBadge(ctx: CanvasRenderingContext2D, status: StatusKind, x: number, y: number): void {
  roundRect(ctx, x, y, 24, 10, 2);
  ctx.fillStyle = STATUS_COLORS[status];
  ctx.fill();
  text(ctx, STATUS_LABELS[status], x + 12, y + 1, { size: 7, bold: true, color: '#fff', align: 'center' });
}

/** Curseur triangulaire. */
export function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, color = PAL.rust): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5, y + 4);
  ctx.lineTo(x, y + 8);
  ctx.fill();
}

export interface ListOptions {
  lineHeight?: number;
  size?: number;
  disabled?: boolean[];
  color?: string;
}

export function menuList(
  ctx: CanvasRenderingContext2D,
  items: string[],
  x: number,
  y: number,
  selected: number,
  opts: ListOptions = {},
): void {
  const lh = opts.lineHeight ?? 14;
  items.forEach((item, i) => {
    const color = opts.disabled?.[i] ? PAL.grey : (opts.color ?? PAL.ink);
    text(ctx, item, x + 10, y + i * lh, { size: opts.size ?? 10, color, bold: i === selected });
    if (i === selected) cursor(ctx, x, y + i * lh + 1);
  });
}

/** Petit indicateur clignotant « suite » en bas à droite d'une boîte de texte. */
export function continueMarker(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  if (Math.floor(time * 3) % 2 === 0) return;
  ctx.fillStyle = PAL.rust;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x + 3, y + 4);
  ctx.fill();
}

/** Fond plein écran en dégradé vertical. */
export function gradient(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Calebasse (icône d'objet de capture). */
export function calabash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#d8a040'): void {
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.25, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.25, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - r * 0.35, y - r * 0.9, r * 0.7, r * 0.8);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - r * 0.35, y - r * 0.9, r * 0.7, r * 0.8);
  ctx.strokeStyle = PAL.rust;
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.25);
  ctx.lineTo(x + r, y + r * 0.25);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.05, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}
