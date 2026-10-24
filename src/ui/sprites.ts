// Sprites procéduraux : Jinémon, personnages et tuiles, dessinés une fois puis mis en cache.
import { getSpecies, type Feature, type SpeciesLook } from '../data/ginedex';
import type { CharacterLook } from '../data/trainers';
import type { Dir, Theme } from '../data/zones';
import { PAL } from './draw';

type Ctx = CanvasRenderingContext2D;

const OUTLINE = '#1e140c';
export const CREATURE_SIZE = 64;
export const TILE = 16;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur hexadécimale. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Primitives ───────────────────────────────────────────────────────────

function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, stroke = true): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function poly(ctx: Ctx, points: number[], fill: string, stroke = true): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke = true): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }
}

function line(ctx: Ctx, points: number[], color: string, width = 2): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function eye(ctx: Ctx, x: number, y: number, r: number, glow?: string): void {
  ell(ctx, x, y, r, r, glow ?? '#ffffff', 0, true);
  if (!glow) {
    ell(ctx, x - r * 0.25, y, r * 0.55, r * 0.6, '#1a1010', 0, false);
    ell(ctx, x - r * 0.45, y - r * 0.35, r * 0.25, r * 0.25, '#ffffff', 0, false);
  }
}

function flame(ctx: Ctx, x: number, y: number, h: number, c1: string, c2: string): void {
  poly(ctx, [x - h * 0.35, y, x - h * 0.25, y - h * 0.6, x - h * 0.05, y - h * 0.4, x, y - h, x + h * 0.15, y - h * 0.45, x + h * 0.3, y - h * 0.65, x + h * 0.35, y], c1);
  poly(ctx, [x - h * 0.18, y, x - h * 0.05, y - h * 0.5, x + h * 0.18, y], c2, false);
}

function wing(ctx: Ctx, x: number, y: number, span: number, color: string, feathered: boolean): void {
  if (feathered) {
    poly(ctx, [x, y, x + span * 0.4, y - span * 0.9, x + span, y - span * 0.7, x + span * 0.8, y - span * 0.35, x + span * 0.9, y - span * 0.05, x + span * 0.35, y + span * 0.15], color);
    line(ctx, [x + span * 0.3, y - span * 0.2, x + span * 0.75, y - span * 0.55], shade(color, -0.3), 1);
  } else {
    poly(ctx, [x, y, x + span * 0.3, y - span, x + span * 0.55, y - span * 0.55, x + span * 0.8, y - span * 0.85, x + span, y - span * 0.25, x + span * 0.6, y - span * 0.1, x + span * 0.35, y + span * 0.1], color);
  }
}

function hasF(look: SpeciesLook, f: Feature): boolean {
  return look.features.includes(f);
}

// ── Attributs communs ────────────────────────────────────────────────────

function aura(ctx: Ctx, color: string, cy: number, r: number): void {
  const g = ctx.createRadialGradient(0, cy, r * 0.2, 0, cy, r);
  g.addColorStop(0, shade(color, 0.3) + 'aa');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function horns(ctx: Ctx, look: SpeciesLook, hx: number, hy: number): void {
  const c = shade(look.colors[2], -0.1);
  if (hasF(look, 'grandesCornes')) {
    // Cornes en zigzag, comme les cimiers Ci Wara.
    line(ctx, [hx + 2, hy, hx + 5, hy - 8, hx + 1, hy - 14, hx + 6, hy - 20, hx + 2, hy - 27], OUTLINE, 4.5);
    line(ctx, [hx + 2, hy, hx + 5, hy - 8, hx + 1, hy - 14, hx + 6, hy - 20, hx + 2, hy - 27], c, 2.5);
    line(ctx, [hx - 3, hy, hx - 1, hy - 7, hx - 5, hy - 13, hx - 1, hy - 19, hx - 4, hy - 25], OUTLINE, 4.5);
    line(ctx, [hx - 3, hy, hx - 1, hy - 7, hx - 5, hy - 13, hx - 1, hy - 19, hx - 4, hy - 25], shade(c, -0.15), 2.5);
  } else if (hasF(look, 'cornes')) {
    line(ctx, [hx + 2, hy, hx + 5, hy - 6, hx + 3, hy - 10], OUTLINE, 4);
    line(ctx, [hx + 2, hy, hx + 5, hy - 6, hx + 3, hy - 10], c, 2);
    line(ctx, [hx - 3, hy, hx - 4, hy - 6, hx - 7, hy - 9], OUTLINE, 4);
    line(ctx, [hx - 3, hy, hx - 4, hy - 6, hx - 7, hy - 9], shade(c, -0.15), 2);
  }
}

function leaves(ctx: Ctx, x: number, y: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const a = -1.2 + i * 0.8;
    ell(ctx, x + Math.cos(a) * 5, y - 3 + Math.sin(a) * 3, 4, 2, i % 2 ? '#5fa83a' : '#7ac84a', a, true);
  }
}

function spikes(ctx: Ctx, x0: number, x1: number, y: number, color: string, n = 4, h = 5): void {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    poly(ctx, [x, y, x + step / 2, y - h, x + step, y], color);
  }
}

function dots(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, n = 7, seed = 1): void {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 0.75;
    ell(ctx, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 1.4, 1.4, color, 0, false);
  }
}

function tails(ctx: Ctx, look: SpeciesLook, x: number, y: number): void {
  const [c1, , c3] = look.colors;
  const count = hasF(look, 'queues9') ? 9 : hasF(look, 'queues3') ? 3 : 0;
  if (count) {
    for (let i = 0; i < count; i++) {
      const a = -0.3 - (i / Math.max(1, count - 1)) * 1.4;
      const len = 16 + (count > 3 ? 4 : 0);
      ell(ctx, x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55, len * 0.55, 3.2, c1, a, true);
      ell(ctx, x + Math.cos(a) * len * 0.95, y + Math.sin(a) * len * 0.95, 2.5, 2.5, '#ffffff', 0, false);
    }
    return;
  }
  if (hasF(look, 'queue')) {
    line(ctx, [x, y, x + 8, y - 6, x + 12, y - 14], OUTLINE, 6);
    line(ctx, [x, y, x + 8, y - 6, x + 12, y - 14], c1, 4);
    ell(ctx, x + 12, y - 15, 3.5, 3.5, c3);
    return;
  }
  line(ctx, [x, y, x + 6, y - 5, x + 9, y - 11], OUTLINE, 3.5);
  line(ctx, [x, y, x + 6, y - 5, x + 9, y - 11], c1, 2);
}

// ── Plans corporels (origine : sol au centre, regard vers la gauche) ─────

function drawQuadrupede(ctx: Ctx, look: SpeciesLook, seed: number): void {
  const [c1, c2, c3] = look.colors;
  const dark = shade(c1, -0.25);
  tails(ctx, look, 20, -24);
  if (hasF(look, 'ailes')) wing(ctx, 4, -30, 22, shade(c2, 0.1), true);
  rect(ctx, 11, -16, 5, 16, dark);
  rect(ctx, 17, -16, 5, 15, dark);
  ell(ctx, 5, -23, 19, 11, c1);
  ell(ctx, 4, -18, 13, 5, shade(c1, 0.25), 0, false);
  if (hasF(look, 'points')) dots(ctx, 6, -25, 15, 7, c2, 8, seed);
  if (hasF(look, 'bosse')) ell(ctx, -3, -33, 7, 5, shade(c1, -0.08));
  if (hasF(look, 'epines')) spikes(ctx, -2, 18, -32, c3, 4, 5);
  rect(ctx, -11, -16, 5, 16, c1);
  rect(ctx, -4, -16, 5, 16, c1);
  if (hasF(look, 'chaines')) {
    for (const lx of [-9, -2]) {
      ell(ctx, lx + 0.5, -5, 3, 2, '#9aa7b0');
    }
  }
  // Cou et tête
  ell(ctx, -11, -30, 6, 9, c1, 0.5);
  if (hasF(look, 'criniere')) {
    ell(ctx, -12, -35, 12, 12, c2);
    ell(ctx, -8, -30, 8, 9, shade(c2, -0.15), 0.3);
  }
  if (hasF(look, 'coiffe')) {
    poly(ctx, [-24, -30, -20, -48, -8, -48, -4, -30], c2);
    for (let i = 0; i < 4; i++) line(ctx, [-21 + i * 0.5, -44 + i * 4, -6 - i * 0.5, -44 + i * 4], c3, 1);
  }
  ell(ctx, -16, -38, 9, 8.5, c1);
  if (hasF(look, 'oreilles')) {
    poly(ctx, [-13, -44, -8, -58, -6, -42], c1);
    poly(ctx, [-11, -45, -8, -54, -7, -44], shade(c3, 0.3), false);
    poly(ctx, [-19, -45, -18, -57, -13, -45], dark);
  } else {
    poly(ctx, [-13, -44, -9, -50, -8, -42], c1);
  }
  horns(ctx, look, -14, -45);
  ell(ctx, -23, -35, 6, 4.5, shade(c1, 0.2));
  ell(ctx, -28, -36, 1.5, 1.5, OUTLINE, 0, false);
  if (hasF(look, 'feuilles')) leaves(ctx, -10, -47);
  const glow = hasF(look, 'lueur') || hasF(look, 'yeux') ? c3 : undefined;
  eye(ctx, -18, -40, 2.6, glow);
  if (hasF(look, 'aura')) {
    ell(ctx, -4, -26, 2, 2, c3, 0, false);
    ell(ctx, 12, -28, 1.5, 1.5, c3, 0, false);
  }
}

function drawLezard(ctx: Ctx, look: SpeciesLook, seed: number): void {
  const [c1, c2, c3] = look.colors;
  const dark = shade(c1, -0.25);
  poly(ctx, [8, -14, 30, -6, 31, -3, 8, -6], c1);
  if (hasF(look, 'flamme')) flame(ctx, 30, -4, 12, '#ff7a2a', '#ffe066');
  for (const [lx, ly, d] of [[-10, -8, -1], [10, -8, 1]] as const) {
    line(ctx, [lx, ly, lx + d * 4, ly + 6, lx + d * 7, ly + 7], OUTLINE, 4);
    line(ctx, [lx, ly, lx + d * 4, ly + 6, lx + d * 7, ly + 7], dark, 2.5);
  }
  ell(ctx, 0, -13, 17, 8, c1);
  ell(ctx, 0, -9, 12, 3, shade(c1, 0.25), 0, false);
  if (hasF(look, 'points')) dots(ctx, 2, -15, 14, 5, c3, 7, seed);
  if (hasF(look, 'carapace')) {
    ell(ctx, 3, -18, 15, 10, c2);
    for (const px of [-6, 2, 10]) ell(ctx, px, -20, 3, 3, shade(c2, -0.2), 0, true);
    if (hasF(look, 'epines') || look.size > 0.8) spikes(ctx, -8, 14, -26, c3, 4, 4);
  }
  if (hasF(look, 'crete')) spikes(ctx, -10, 12, -20, c3, 5, 5);
  if (hasF(look, 'epines') && !hasF(look, 'carapace')) spikes(ctx, -6, 16, -19, shade(c2, 0.1), 4, 6);
  for (const [lx, ly, d] of [[-6, -8, -1], [14, -8, 1]] as const) {
    line(ctx, [lx, ly, lx + d * 3, ly + 6, lx + d * 7, ly + 7], OUTLINE, 4);
    line(ctx, [lx, ly, lx + d * 3, ly + 6, lx + d * 7, ly + 7], c1, 2.5);
  }
  ell(ctx, -19, -16, 9, 6.5, c1, -0.15);
  ell(ctx, -26, -14, 4, 3, shade(c1, 0.15), 0, false);
  horns(ctx, look, -17, -21);
  eye(ctx, -20, -19, 2.4);
  if (hasF(look, 'flamme') && !hasF(look, 'points')) flame(ctx, 0, -20, 10, '#ff7a2a', '#ffe066');
  if (hasF(look, 'flamme') && hasF(look, 'points')) flame(ctx, -2, -20, 9, '#ff7a2a', '#ffd040');
}

function drawOiseau(ctx: Ctx, look: SpeciesLook, seed: number): void {
  const [c1, c2, c3] = look.colors;
  if (hasF(look, 'eclairs')) {
    line(ctx, [18, -48, 13, -40, 19, -36, 12, -26], '#ffe040', 2.5);
    line(ctx, [-26, -20, -21, -14, -26, -10, -20, -2], '#ffe040', 2);
  }
  line(ctx, [-2, -12, -3, 0], c3, 2);
  line(ctx, [4, -12, 5, 0], c3, 2);
  poly(ctx, [10, -26, 26, -34, 24, -18, 10, -16], shade(c1, -0.2));
  ell(ctx, 2, -22, 14, 12, c1);
  ell(ctx, -1, -19, 9, 6, shade(c2, 0.15), 0, false);
  if (hasF(look, 'points')) dots(ctx, 3, -24, 11, 8, c2, 10, seed);
  wing(ctx, 0, -24, 16, shade(c1, -0.12), true);
  ell(ctx, -10, -36, 8.5, 8, c1);
  if (hasF(look, 'crete')) {
    poly(ctx, [-12, -43, -15, -53, -9, -45, -7, -54, -5, -44], c3);
  }
  if (hasF(look, 'casque')) {
    poly(ctx, [-16, -40, -12, -47, -28, -44, -30, -40], c3);
  }
  poly(ctx, [-17, -38, -32, -34, -17, -32], c3);
  line(ctx, [-17, -35, -28, -34], OUTLINE, 1);
  eye(ctx, -12, -38, 2.5);
  if (hasF(look, 'aura')) aura(ctx, c3, -36, 6);
}

function serpentPath(look: SpeciesLook): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  const long = hasF(look, 'moustaches') || hasF(look, 'ailes');
  const n = long ? 16 : 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 24 - t * 34 + Math.sin(t * Math.PI * (long ? 3 : 2)) * 6;
    const y = -5 - t * 28 + Math.cos(t * Math.PI * (long ? 3 : 2)) * 3;
    const r = 3 + t * 4.5;
    pts.push([x, y, r]);
  }
  return pts;
}

function drawSerpent(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  const pts = serpentPath(look);
  if (hasF(look, 'ailes')) {
    const [wx, wy] = pts[Math.floor(pts.length * 0.55)];
    wing(ctx, wx, wy - 2, 22, hasF(look, 'crete') ? '#3ab05a' : shade(c2, 0.1), hasF(look, 'crete'));
  }
  for (const [x, y, r] of pts) ell(ctx, x, y, r + 0.8, r + 0.8, OUTLINE, 0, false);
  pts.forEach(([x, y, r], i) => {
    ell(ctx, x, y, r, r, i % 2 ? c1 : shade(c1, -0.08), 0, false);
    ell(ctx, x, y + r * 0.45, r * 0.6, r * 0.35, c2, 0, false);
  });
  if (hasF(look, 'criniere')) {
    for (let i = 6; i < pts.length; i += 2) {
      const [x, y, r] = pts[i];
      ell(ctx, x + 2, y - r, 3, 4, c3, 0.5, true);
    }
  }
  const [hx, hy] = pts[pts.length - 1];
  const head = { x: hx - 6, y: hy - 4 };
  if (hasF(look, 'crete')) poly(ctx, [head.x + 4, head.y - 4, head.x + 12, head.y - 14, head.x + 10, head.y - 2], c3);
  ell(ctx, head.x, head.y, 10, 7, c1, -0.2);
  ell(ctx, head.x - 6, head.y + 2, 5, 3.5, shade(c1, 0.15), -0.2, false);
  if (hasF(look, 'moustaches')) {
    line(ctx, [head.x - 9, head.y + 1, head.x - 16, head.y + 6, head.x - 20, head.y + 4], c3, 1.5);
    line(ctx, [head.x - 8, head.y + 3, head.x - 12, head.y + 11, head.x - 17, head.y + 12], c3, 1.5);
  }
  if (hasF(look, 'cornes')) {
    line(ctx, [head.x + 3, head.y - 5, head.x + 6, head.y - 13, head.x + 10, head.y - 15], OUTLINE, 4);
    line(ctx, [head.x + 3, head.y - 5, head.x + 6, head.y - 13, head.x + 10, head.y - 15], '#f0e0a0', 2);
    line(ctx, [head.x + 6, head.y - 11, head.x + 2, head.y - 15], '#f0e0a0', 1.5);
  }
  if (hasF(look, 'couronne')) {
    poly(ctx, [head.x - 3, head.y - 5, head.x - 3, head.y - 12, head.x, head.y - 8, head.x + 3, head.y - 13, head.x + 5, head.y - 8, head.x + 8, head.y - 12, head.x + 8, head.y - 4], '#f0c040');
  }
  if (hasF(look, 'gemme')) ell(ctx, head.x - 1, head.y - 5, 2.5, 2.5, c3);
  const glow = hasF(look, 'yeux') ? c3 : undefined;
  eye(ctx, head.x - 3, head.y - 2, 2.4, glow);
  line(ctx, [head.x - 10, head.y + 3, head.x - 15, head.y + 4, head.x - 17, head.y + 2], '#e83a3a', 1);
  if (hasF(look, 'aura')) {
    for (const [x, y] of [[-18, -48], [18, -40], [-24, -12]]) ell(ctx, x, y, 2, 2, c3, 0, false);
  }
}

function drawInsecte(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  if (hasF(look, 'ailes')) {
    ctx.globalAlpha = 0.6;
    ell(ctx, 6, -32, 12, 6, '#e8f4ff', -0.5);
    ell(ctx, 12, -28, 10, 5, '#e8f4ff', -0.2);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 3; i++) {
    const x = -6 + i * 7;
    line(ctx, [x, -14, x - 3, -6, x - 5, 0], OUTLINE, 2);
  }
  ell(ctx, 10, -16, 12, 8.5, c1);
  if (hasF(look, 'lueur')) {
    aura(ctx, c3, -16, 0);
    ell(ctx, 18, -14, 5, 5, c3);
  }
  for (let i = 0; i < 3; i++) line(ctx, [4 + i * 5, -23, 4 + i * 5, -9], shade(c1, -0.2), 1);
  if (hasF(look, 'carapace')) {
    ell(ctx, 9, -19, 12, 8, c2, -0.1);
    line(ctx, [9, -27, 9, -11], OUTLINE, 1);
  }
  ell(ctx, -3, -18, 6, 6, shade(c1, -0.1));
  ell(ctx, -12, -20, 6.5, 6, c1);
  if (hasF(look, 'antennes')) {
    line(ctx, [-14, -25, -18, -34, -23, -36], OUTLINE, 1.5);
    line(ctx, [-11, -25, -11, -35, -6, -38], OUTLINE, 1.5);
  }
  if (hasF(look, 'aura')) {
    ell(ctx, 10, -36, 7, 7, c3);
    ell(ctx, 10, -36, 4, 4, shade(c3, 0.4), 0, false);
  }
  eye(ctx, -15, -21, 2.6);
  line(ctx, [-17, -16, -20, -13], OUTLINE, 1.5);
  for (let i = 0; i < 3; i++) {
    const x = -4 + i * 7;
    line(ctx, [x, -13, x + 2, -6, x + 1, 0], OUTLINE, 2);
  }
}

function drawAraignee(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  for (let i = 0; i < 4; i++) {
    const x = -8 + i * 5;
    line(ctx, [x, -16, x - 8 + i, -26, x - 12 + i * 2, 0], OUTLINE, 2.5);
    line(ctx, [x, -16, x - 8 + i, -26, x - 12 + i * 2, 0], shade(c1, -0.2), 1.2);
  }
  ell(ctx, 8, -19, 14, 12, c1);
  line(ctx, [0, -22, 4, -18, 8, -22, 12, -18, 16, -22, 20, -18], c2, 2);
  line(ctx, [2, -14, 6, -10, 10, -14, 14, -10, 18, -14], c2, 2);
  ell(ctx, -9, -16, 8, 7, shade(c1, -0.05));
  for (let i = 0; i < 4; i++) {
    const x = -8 + i * 5;
    line(ctx, [x, -14, x + 6 - i, -24, x + 10 - i * 2, 0], OUTLINE, 2.5);
    line(ctx, [x, -14, x + 6 - i, -24, x + 10 - i * 2, 0], c1, 1.2);
  }
  eye(ctx, -13, -19, 2.3);
  eye(ctx, -8, -20, 2);
  if (hasF(look, 'yeux')) {
    ell(ctx, -15, -14, 1.2, 1.2, c3, 0, false);
    ell(ctx, -10, -13, 1.2, 1.2, c3, 0, false);
    ell(ctx, -5, -15, 1.2, 1.2, c3, 0, false);
  }
}

function drawEsprit(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  if (hasF(look, 'aura')) aura(ctx, c3, -30, 26);
  if (hasF(look, 'cheveux')) {
    for (let i = 0; i < 5; i++) {
      line(ctx, [2 + i * 2, -40, 10 + i * 3, -26, 6 + i * 4, -10, 12 + i * 3, -4], OUTLINE, 3);
      line(ctx, [2 + i * 2, -40, 10 + i * 3, -26, 6 + i * 4, -10, 12 + i * 3, -4], c2, 1.8);
    }
  }
  if (hasF(look, 'nageoires')) {
    poly(ctx, [-2, -24, 12, -8, 20, -4, 26, -10, 22, 0, 14, 2, 4, -6], shade(c1, -0.1));
    poly(ctx, [20, -4, 30, -12, 28, 4], c3);
  } else {
    poly(ctx, [-10, -26, -6, -12, 0, -16, 4, -4, 8, -12, 14, -6, 12, -22], c1);
  }
  ell(ctx, 0, -30, 13, 13, c1);
  ell(ctx, -3, -26, 7, 6, shade(c1, 0.3), 0, false);
  if (hasF(look, 'flamme')) flame(ctx, 2, -40, 18, c1, shade(c3, 0.2));
  if (hasF(look, 'feuilles')) leaves(ctx, 1, -42, 3);
  if (hasF(look, 'cheveux')) ell(ctx, 3, -38, 11, 6, c2, -0.2);
  ell(ctx, -12, -24, 3.5, 2.5, c1, 0.6);
  ell(ctx, 11, -24, 3.5, 2.5, c1, -0.6);
  eye(ctx, -6, -32, 2.8);
  eye(ctx, 2, -32, 2.6);
  line(ctx, [-5, -25, -2, -24, 1, -25], OUTLINE, 1);
}

function drawBipede(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  const dark = shade(c1, -0.25);
  if (hasF(look, 'aura')) aura(ctx, c3, -30, 26);
  if (hasF(look, 'ailes')) {
    wing(ctx, 4, -34, 26, shade(c2, -0.1), hasF(look, 'bec'));
  }
  rect(ctx, -7, -14, 6, 14, look.size > 0.7 ? c2 : dark);
  rect(ctx, 2, -14, 6, 14, look.size > 0.7 ? shade(c2, -0.1) : dark);
  ell(ctx, 0, -25, 11, 13, c1);
  if (hasF(look, 'armure')) {
    rect(ctx, -9, -32, 18, 12, c2);
    line(ctx, [-9, -26, 9, -26], shade(c2, -0.3), 1);
    ell(ctx, -10, -33, 5, 4, shade(c2, 0.15));
    ell(ctx, 10, -33, 5, 4, shade(c2, 0.15));
  } else {
    ell(ctx, -1, -22, 6, 7, shade(c1, 0.25), 0, false);
  }
  if (hasF(look, 'feuilles')) leaves(ctx, 6, -30, 2);
  ell(ctx, -12, -24, 3.5, 8, c1, 0.3);
  ell(ctx, 12, -24, 3.5, 8, c1, -0.3);
  if (hasF(look, 'flamme')) flame(ctx, 0, -46, 16, '#ff7a2a', '#ffe066');
  ell(ctx, -1, -42, 9, 9, c1);
  if (hasF(look, 'casque')) {
    poly(ctx, [-11, -42, -9, -52, 7, -52, 9, -42], c2);
    rect(ctx, -2, -44, 2, 7, c2);
  }
  if (hasF(look, 'oreilles')) {
    poly(ctx, [-4, -50, -2, -66, 2, -50], c1);
    poly(ctx, [1, -50, 6, -64, 6, -49], shade(c1, -0.1));
  }
  horns(ctx, look, -1, -49);
  const glow = hasF(look, 'yeux') || hasF(look, 'casque') ? c3 : undefined;
  eye(ctx, -5, -43, 2.5, glow);
  eye(ctx, 2, -43, 2.3, glow);
  if (hasF(look, 'bec')) poly(ctx, [-8, -41, -20, -38, -8, -36], '#f0c040');
}

function drawAmphibien(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  if (hasF(look, 'aura')) aura(ctx, c3, -22, 28);
  if (hasF(look, 'queue')) poly(ctx, [10, -12, 30, -18, 32, -10, 12, -4], c1);
  if (hasF(look, 'carapace')) {
    ell(ctx, 6, -20, 15, 12, c2);
    for (const [x, y] of [[0, -24], [8, -26], [12, -18], [4, -16]]) ell(ctx, x, y, 3, 2.5, shade(c2, -0.2), 0, true);
    if (hasF(look, 'epines')) spikes(ctx, -4, 18, -31, '#9a8a7a', 4, 4);
  }
  ell(ctx, 2, -13, 16, 11, c1);
  ell(ctx, -1, -9, 11, 5, shade(c1, 0.3), 0, false);
  ell(ctx, 12, -6, 6, 5, shade(c1, -0.15));
  ell(ctx, -10, -5, 5, 4, shade(c1, -0.15));
  ell(ctx, -12, -19, 10, 8, c1);
  if (hasF(look, 'nageoires')) {
    // Nageoire dorsale sur le dos et petites ouïes derrière la tête.
    poly(ctx, [2, -22, 9, -31, 15, -21], c3);
    poly(ctx, [-4, -21, -1, -27, 1, -19], shade(c3, -0.1));
  }
  if (hasF(look, 'assiette')) {
    ell(ctx, -11, -27, 7, 2.5, '#d8e8f0');
    ell(ctx, -11, -27.5, 4.5, 1.2, '#7ab8e8', 0, false);
  }
  // Yeux globuleux posés sur le dessus de la tête, bien séparés.
  ell(ctx, -18, -24, 3.8, 3.8, c1);
  ell(ctx, -8, -26, 3.8, 3.8, c1);
  eye(ctx, -18, -25, 2.6);
  eye(ctx, -8, -27, 2.6);
  line(ctx, [-21, -15, -15, -13, -8, -14], OUTLINE, 1.2);
}

function drawGolem(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  rect(ctx, -10, -12, 8, 12, c2);
  rect(ctx, 3, -12, 8, 12, c2);
  rect(ctx, -14, -38, 28, 27, c1);
  for (let i = 0; i < 4; i++) line(ctx, [-12, -34 + i * 6, 12, -34 + i * 6], shade(c1, -0.12), 1);
  rect(ctx, -22, -36, 8, 22, shade(c1, -0.08));
  rect(ctx, 14, -36, 8, 22, shade(c1, -0.08));
  rect(ctx, -9, -50, 18, 13, c1);
  if (hasF(look, 'epines')) {
    for (const [x, y, dx] of [[-14, -30, -6], [-14, -20, -6], [14, -30, 6], [14, -20, 6], [-4, -50, 0], [4, -50, 0]] as const) {
      line(ctx, [x, y, x + dx, y - (dx === 0 ? 7 : 0)], OUTLINE, 3);
      line(ctx, [x, y, x + dx, y - (dx === 0 ? 7 : 0)], '#9a7a50', 1.5);
    }
  }
  rect(ctx, -7, -46, 5, 2, c3, false);
  rect(ctx, 1, -46, 5, 2, c3, false);
  line(ctx, [-4, -41, 4, -41], OUTLINE, 1.2);
}

function drawDragon(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  const dark = shade(c1, -0.25);
  poly(ctx, [14, -20, 34, -26, 30, -12, 14, -12], c1);
  spikes(ctx, 18, 32, -24, c3, 3, 4);
  if (hasF(look, 'ailes')) wing(ctx, 4, -32, 28, shade(c2, 0.15), false);
  rect(ctx, 10, -16, 6, 16, dark);
  rect(ctx, 17, -16, 6, 15, dark);
  ell(ctx, 6, -23, 18, 11, c1);
  ell(ctx, 4, -17, 13, 5, shade(c1, 0.3), 0, false);
  if (hasF(look, 'carapace')) {
    ell(ctx, 7, -28, 16, 9, c2);
    spikes(ctx, -6, 20, -35, '#e8c040', 5, 5);
  }
  rect(ctx, -10, -16, 6, 16, c1);
  rect(ctx, -3, -16, 6, 16, c1);
  ell(ctx, -10, -32, 7, 11, c1, 0.4);
  if (hasF(look, 'criniere')) ell(ctx, -12, -42, 10, 8, c3);
  if (hasF(look, 'crete')) poly(ctx, [-12, -48, -6, -58, -4, -46], c3);
  ell(ctx, -17, -42, 10, 7.5, c1, -0.1);
  ell(ctx, -25, -39, 6, 4.5, shade(c1, 0.15));
  horns(ctx, look, -15, -48);
  eye(ctx, -19, -44, 2.6, c3);
  line(ctx, [-30, -38, -27, -37], OUTLINE, 1.2);
}

function drawArbre(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  poly(ctx, [-16, 0, -12, -10, -12, -34, 12, -34, 12, -10, 16, 0], c1);
  for (const x of [-6, 2, 8]) line(ctx, [x, -30, x - 1, -6], shade(c1, -0.2), 1);
  for (const [x, y, r] of [[-14, -40, 9], [0, -46, 11], [14, -40, 9], [-6, -52, 7], [8, -52, 7]]) ell(ctx, x, y, r, r * 0.8, c2);
  leaves(ctx, 14, -48, 2);
  eye(ctx, -5, -22, 2.5, c3);
  eye(ctx, 4, -22, 2.5, c3);
  line(ctx, [-4, -14, 0, -12, 4, -14], OUTLINE, 1.5);
}

function drawLanterne(ctx: Ctx, look: SpeciesLook): void {
  const [c1, c2, c3] = look.colors;
  aura(ctx, c3, -28, 22);
  flame(ctx, 0, -50, 8, c3, '#ffe066');
  rect(ctx, -6, -50, 12, 4, c2);
  ell(ctx, 0, -30, 14, 17, c1);
  for (let i = 0; i < 4; i++) line(ctx, [-13, -40 + i * 7, 13, -40 + i * 7], shade(c1, -0.25), 1);
  rect(ctx, -6, -14, 12, 4, c2);
  ell(ctx, 0, -33, 6, 6, '#ffffff');
  ell(ctx, -1, -33, 3, 3.5, '#1a1010', 0, false);
  poly(ctx, [-4, -22, 4, -22, 2, -12, 6, -6, -1, -14], '#e83a5a');
  line(ctx, [-10, -10, -14, -2], OUTLINE, 2);
  line(ctx, [10, -10, 14, -2], OUTLINE, 2);
}

const PLANS: Record<SpeciesLook['plan'], (ctx: Ctx, look: SpeciesLook, seed: number) => void> = {
  quadrupede: drawQuadrupede,
  lezard: drawLezard,
  oiseau: drawOiseau,
  serpent: drawSerpent,
  insecte: drawInsecte,
  araignee: drawAraignee,
  esprit: drawEsprit,
  bipede: drawBipede,
  amphibien: drawAmphibien,
  golem: drawGolem,
  dragon: drawDragon,
  arbre: drawArbre,
  lanterne: drawLanterne,
};

const creatureCache = new Map<string, HTMLCanvasElement>();

/** Sprite d'un Jinémon (64×64, tourné vers la gauche). `silhouette` le noircit. */
export function creatureSprite(speciesId: number, silhouette = false): HTMLCanvasElement {
  const key = `${speciesId}:${silhouette ? 's' : 'n'}`;
  const cached = creatureCache.get(key);
  if (cached) return cached;
  const look = getSpecies(speciesId).look;
  const [canvas, ctx] = makeCanvas(CREATURE_SIZE, CREATURE_SIZE);
  const floating = ['esprit', 'lanterne'].includes(look.plan);
  const scale = 0.62 + 0.4 * look.size;
  ctx.translate(32, floating ? 56 : 61);
  ctx.scale(scale, scale);
  if (hasF(look, 'aura') && !['esprit', 'bipede', 'amphibien', 'lanterne'].includes(look.plan)) aura(ctx, look.colors[2], -28, 30);
  PLANS[look.plan](ctx, look, speciesId * 7 + 3);
  if (silhouette) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(0, 0, CREATURE_SIZE, CREATURE_SIZE);
    ctx.globalCompositeOperation = 'source-over';
  }
  creatureCache.set(key, canvas);
  return canvas;
}

/** Dessine un Jinémon centré sur (x, y) = point au sol. `flip` le tourne vers la droite. */
export function drawCreature(
  ctx: Ctx,
  speciesId: number,
  x: number,
  y: number,
  size = CREATURE_SIZE,
  opts: { flip?: boolean; silhouette?: boolean; alpha?: number; white?: number } = {},
): void {
  const sprite = creatureSprite(speciesId, opts.silhouette);
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(x, y);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -size / 2, -size + size * (4 / CREATURE_SIZE), size, size);
  ctx.restore();
  if (opts.white && opts.white > 0) {
    // Éclat blanc (évolution, capture) : on redessine en silhouette claire.
    ctx.save();
    ctx.globalAlpha = Math.min(1, opts.white);
    ctx.translate(x, y);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.drawImage(whiteSprite(speciesId), -size / 2, -size + size * (4 / CREATURE_SIZE), size, size);
    ctx.restore();
  }
}

const whiteCache = new Map<number, HTMLCanvasElement>();
function whiteSprite(speciesId: number): HTMLCanvasElement {
  const cached = whiteCache.get(speciesId);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(CREATURE_SIZE, CREATURE_SIZE);
  ctx.drawImage(creatureSprite(speciesId), 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CREATURE_SIZE, CREATURE_SIZE);
  whiteCache.set(speciesId, canvas);
  return canvas;
}

// ── Personnages (16×16) ──────────────────────────────────────────────────

/** L'Initié : boubou indigo et chapeau conique peul. */
export const PLAYER_LOOK: CharacterLook = { skin: '#7a4a2a', outfit: '#2a4a8a', accent: '#f0c040', headwear: 'chapeau' };

const charCache = new Map<string, HTMLCanvasElement>();

export function characterSprite(look: CharacterLook, dir: Dir, frame: number): HTMLCanvasElement {
  const key = `${look.skin}${look.outfit}${look.accent}${look.headwear}:${dir}:${frame}`;
  const cached = charCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(16, 20);
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const side = dir === 'gauche' || dir === 'droite';
  // 0 : immobile, 1 et 2 : pas alternés.
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(8, 18.5, 5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // jambes
  const legC = shade(look.outfit, -0.45);
  if (side) {
    px(6 - step, 15, 2, 3, legC);
    px(8 + step, 15, 2, 3, legC);
  } else {
    px(5, 15, 2, 3 - Math.max(0, step), legC);
    px(9, 15, 2, 3 - Math.max(0, -step), legC);
  }
  // boubou
  px(4, 9, 8, 7, OUTLINE);
  px(5, 9, 6, 6, look.outfit);
  px(4, 10, 8, 5, look.outfit);
  px(5, 12, 6, 1, look.accent);
  if (dir === 'bas') px(7, 9, 2, 3, look.accent);
  // bras
  if (side) {
    px(dir === 'gauche' ? 7 + step : 7 - step, 10, 2, 4, look.skin);
  } else {
    px(3, 10 + Math.max(0, step), 1, 4, look.skin);
    px(12, 10 + Math.max(0, -step), 1, 4, look.skin);
  }
  // tête
  px(5, 3, 6, 6, OUTLINE);
  px(5, 4, 6, 5, look.skin);
  px(6, 3, 4, 1, look.skin);
  const hair = '#1a1010';
  px(5, 3, 6, 2, hair);
  if (dir === 'haut') px(5, 3, 6, 5, hair);
  if (dir === 'bas') {
    px(6, 6, 1, 1, OUTLINE);
    px(9, 6, 1, 1, OUTLINE);
  } else if (dir === 'gauche') {
    px(5, 6, 1, 1, OUTLINE);
    px(5, 4, 3, 1, hair);
  } else if (dir === 'droite') {
    px(10, 6, 1, 1, OUTLINE);
    px(8, 4, 3, 1, hair);
  }
  // couvre-chef
  switch (look.headwear) {
    case 'chapeau':
      // chapeau conique peul
      px(2, 3, 12, 1, '#c89a50');
      px(3, 2, 10, 1, '#d8b060');
      px(5, 1, 6, 1, '#d8b060');
      px(7, 0, 2, 1, '#a87a40');
      px(4, 2, 8, 1, look.accent);
      break;
    case 'foulard':
      px(4, 1, 8, 3, look.accent);
      px(5, 0, 6, 1, look.accent);
      if (dir !== 'bas') px(dir === 'gauche' ? 11 : 3, 2, 2, 3, shade(look.accent, -0.2));
      break;
    case 'bonnet':
      px(5, 1, 6, 3, look.accent);
      px(5, 3, 6, 1, shade(look.accent, -0.25));
      break;
    case 'turban':
      px(4, 1, 8, 3, look.accent);
      px(3, 2, 10, 2, look.accent);
      px(5, 2, 6, 1, shade(look.accent, -0.2));
      break;
    case 'masque':
      if (dir !== 'haut') {
        px(5, 2, 6, 7, '#8a5a32');
        px(6, 5, 1, 1, OUTLINE);
        px(9, 5, 1, 1, OUTLINE);
        px(7, 0, 2, 2, '#8a5a32');
        px(5, 8, 6, 1, look.accent);
      } else {
        px(5, 1, 6, 3, '#8a5a32');
      }
      break;
    default:
      break;
  }
  charCache.set(key, canvas);
  return canvas;
}

// ── Tuiles ───────────────────────────────────────────────────────────────

interface Palette {
  ground: string;
  grass: string;
  tall: string;
  path: string;
  tree: string;
  rock: string;
}

export const THEMES: Record<Theme, Palette> = {
  village: { ground: '#d8c08a', grass: '#b0c468', tall: '#6a9a3a', path: '#c8a870', tree: '#4a7a2a', rock: '#8a7458' },
  savane: { ground: '#dcbf78', grass: '#cdb85a', tall: '#a09030', path: '#c8a060', tree: '#6a8a3a', rock: '#8a7458' },
  laterite: { ground: '#c8744a', grass: '#b08048', tall: '#8a8a30', path: '#b05a38', tree: '#5a7a2a', rock: '#7a4a32' },
  marigot: { ground: '#a8c878', grass: '#94be60', tall: '#4a8a3a', path: '#c8b080', tree: '#3a6a2a', rock: '#7a7a68' },
  foret: { ground: '#7a8a4a', grass: '#62803e', tall: '#3a6a2a', path: '#8a7650', tree: '#244a1c', rock: '#5a5a48' },
  piste: { ground: '#d4ba78', grass: '#bcae5a', tall: '#98a040', path: '#c09860', tree: '#5a7a30', rock: '#8a7458' },
  falaise: { ground: '#c8a070', grass: '#aaa060', tall: '#8a8a48', path: '#b89060', tree: '#5a6a30', rock: '#9a6a42' },
};

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function speckle(ctx: Ctx, x: number, y: number, color: string, n: number, seedX: number, seedY: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const rx = Math.floor(hash(seedX * 31 + i, seedY) * 15);
    const ry = Math.floor(hash(seedX, seedY * 17 + i) * 15);
    ctx.fillRect(x + rx, y + ry, 1, 1);
  }
}

function groundTile(ctx: Ctx, x: number, y: number, pal: Palette, tx: number, ty: number, base?: string): void {
  ctx.fillStyle = base ?? pal.ground;
  ctx.fillRect(x, y, TILE, TILE);
  speckle(ctx, x, y, shade(base ?? pal.ground, -0.12), 5, tx, ty);
  speckle(ctx, x, y, shade(base ?? pal.ground, 0.12), 3, ty, tx);
}

function grassTile(ctx: Ctx, x: number, y: number, pal: Palette, tx: number, ty: number): void {
  ctx.fillStyle = pal.grass;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = shade(pal.grass, -0.18);
  for (let i = 0; i < 3; i++) {
    const gx = x + 2 + Math.floor(hash(tx + i, ty) * 11);
    const gy = y + 3 + Math.floor(hash(tx, ty + i) * 10);
    ctx.fillRect(gx, gy, 1, 2);
    ctx.fillRect(gx + 2, gy, 1, 2);
    ctx.fillRect(gx + 1, gy + 1, 1, 1);
  }
}

/** Touffe d'herbe haute, aussi utilisée par-dessus les pieds du joueur. */
export function tallGrass(ctx: Ctx, x: number, y: number, pal: Palette, onlyTop = false): void {
  if (!onlyTop) {
    ctx.fillStyle = shade(pal.tall, -0.15);
    ctx.fillRect(x, y, TILE, TILE);
  }
  for (let row = onlyTop ? 1 : 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = x + col * 5 + (row % 2) * 2;
      const by = y + row * 8 + 1;
      ctx.fillStyle = shade(pal.tall, -0.35);
      ctx.fillRect(bx, by + 6, 5, 1);
      ctx.fillStyle = pal.tall;
      ctx.beginPath();
      ctx.moveTo(bx, by + 7);
      ctx.lineTo(bx + 1, by);
      ctx.lineTo(bx + 2.5, by + 4);
      ctx.lineTo(bx + 4, by - 1);
      ctx.lineTo(bx + 5, by + 7);
      ctx.fill();
      ctx.fillStyle = shade(pal.tall, 0.2);
      ctx.fillRect(bx + 1, by + 2, 1, 3);
    }
  }
}

function water(ctx: Ctx, x: number, y: number, shallow: boolean): void {
  ctx.fillStyle = shallow ? '#6ab0d8' : '#3a7ab8';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = shallow ? '#9ad0f0' : '#5a9ad0';
  ctx.fillRect(x + 2, y + 4, 5, 1);
  ctx.fillRect(x + 9, y + 10, 5, 1);
  if (shallow) {
    ctx.fillStyle = '#9a8a70';
    ctx.fillRect(x + 3, y + 8, 3, 2);
    ctx.fillRect(x + 10, y + 3, 3, 2);
  }
}

function drawTileAt(ctx: Ctx, ch: string, x: number, y: number, theme: Theme, tx: number, ty: number): void {
  const pal = THEMES[theme];
  switch (ch) {
    case '.':
      groundTile(ctx, x, y, pal, tx, ty);
      break;
    case 'L':
      groundTile(ctx, x, y, pal, tx, ty, '#c8744a');
      break;
    case '"':
      grassTile(ctx, x, y, pal, tx, ty);
      break;
    case ',':
      tallGrass(ctx, x, y, pal);
      break;
    case 'F':
      grassTile(ctx, x, y, pal, tx, ty);
      for (let i = 0; i < 3; i++) {
        const fx = x + 2 + Math.floor(hash(tx * 3 + i, ty) * 11);
        const fy = y + 2 + Math.floor(hash(tx, ty * 3 + i) * 11);
        ctx.fillStyle = ['#e8403a', '#f0c040', '#e85a8f'][i];
        ctx.fillRect(fx, fy, 2, 2);
        ctx.fillStyle = '#fff4c0';
        ctx.fillRect(fx, fy, 1, 1);
      }
      break;
    case '=':
      groundTile(ctx, x, y, pal, tx, ty, pal.path);
      ctx.fillStyle = shade(pal.path, -0.2);
      ctx.fillRect(x + Math.floor(hash(tx, ty) * 12), y + Math.floor(hash(ty, tx) * 12), 2, 1);
      break;
    case ':':
      groundTile(ctx, x, y, pal, tx, ty, '#e8d4a0');
      ctx.fillStyle = '#c8b480';
      ctx.fillRect(x + 1, y + 5, 6, 1);
      ctx.fillRect(x + 8, y + 11, 6, 1);
      break;
    case 'P':
      water(ctx, x, y, false);
      ctx.fillStyle = '#8a5a32';
      ctx.fillRect(x + 1, y, 14, TILE);
      ctx.fillStyle = '#6a4024';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 1, y + i * 4 + 3, 14, 1);
      ctx.fillRect(x + 1, y, 1, TILE);
      ctx.fillRect(x + 14, y, 1, TILE);
      break;
    case '~':
      water(ctx, x, y, false);
      break;
    case 'w':
      water(ctx, x, y, true);
      break;
    case 'T': {
      grassTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(x + 7, y + 7, 2, 9);
      ctx.fillRect(x + 5, y + 7, 2, 1);
      ctx.fillRect(x + 9, y + 6, 2, 1);
      ctx.fillStyle = shade(pal.tree, -0.3);
      ctx.fillRect(x, y + 3, 16, 5);
      ctx.fillStyle = pal.tree;
      ctx.fillRect(x + 1, y + 1, 14, 5);
      ctx.fillRect(x, y + 3, 16, 3);
      ctx.fillStyle = shade(pal.tree, 0.2);
      ctx.fillRect(x + 3, y + 1, 5, 2);
      ctx.fillRect(x + 10, y + 2, 3, 1);
      break;
    }
    case 'B': {
      grassTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = '#7a6a5a';
      ctx.fillRect(x + 4, y + 6, 8, 10);
      ctx.fillRect(x + 3, y + 14, 10, 2);
      ctx.fillStyle = '#5a4a3e';
      ctx.fillRect(x + 6, y + 8, 1, 7);
      ctx.fillRect(x + 9, y + 7, 1, 8);
      ctx.fillStyle = '#7a6a5a';
      ctx.fillRect(x + 2, y + 4, 3, 2);
      ctx.fillRect(x + 11, y + 3, 3, 2);
      ctx.fillStyle = shade(pal.tree, 0.05);
      ctx.fillRect(x, y, 6, 4);
      ctx.fillRect(x + 6, y - 0, 5, 3);
      ctx.fillRect(x + 10, y, 6, 4);
      break;
    }
    case '#': {
      ctx.fillStyle = pal.rock;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = shade(pal.rock, -0.2);
      ctx.fillRect(x, y + 5, TILE, 1);
      ctx.fillRect(x, y + 11, TILE, 1);
      ctx.fillRect(x + Math.floor(hash(tx, ty) * 14), y, 1, 5);
      ctx.fillRect(x + Math.floor(hash(ty, tx) * 14), y + 6, 1, 5);
      ctx.fillStyle = shade(pal.rock, 0.15);
      ctx.fillRect(x, y, TILE, 1);
      break;
    }
    case 'X': {
      groundTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 9, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9a6a4a';
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 9, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 4);
      ctx.lineTo(x + 8, y + 9);
      ctx.lineTo(x + 6, y + 13);
      ctx.moveTo(x + 8, y + 9);
      ctx.lineTo(x + 12, y + 8);
      ctx.stroke();
      break;
    }
    case 'R': {
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#a87a38';
      for (let i = -16; i < 16; i += 4) {
        ctx.fillRect(x + Math.max(0, i), y + Math.max(0, -i), 1, 1);
      }
      for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 4 + 2, TILE, 1);
      ctx.fillStyle = '#e0c070';
      ctx.fillRect(x, y, TILE, 1);
      break;
    }
    case 'H':
    case 'D':
    case 'M': {
      ctx.fillStyle = '#b8784a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#9a6038';
      ctx.fillRect(x, y + 7, TILE, 1);
      speckle(ctx, x, y, '#a86a40', 6, tx, ty);
      if (ch === 'M') {
        ctx.fillStyle = '#d8a070';
        ctx.fillRect(x, y, TILE, 2);
      } else {
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(x + 3, y + 2, 2, 2);
        ctx.fillRect(x + 11, y + 2, 2, 2);
      }
      if (ch === 'D') {
        ctx.fillStyle = '#3a2414';
        ctx.fillRect(x + 4, y + 4, 8, 12);
        ctx.fillStyle = '#6a4024';
        ctx.fillRect(x + 5, y + 5, 6, 11);
        ctx.fillStyle = '#c8a050';
        ctx.fillRect(x + 9, y + 10, 1, 1);
      }
      break;
    }
    case 'G': {
      grassTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = '#a86a40';
      ctx.fillRect(x + 3, y + 6, 10, 10);
      ctx.fillStyle = '#8a5030';
      ctx.fillRect(x + 7, y + 10, 2, 3);
      ctx.fillStyle = '#d8b060';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 7);
      ctx.lineTo(x + 8, y - 1);
      ctx.lineTo(x + 15, y + 7);
      ctx.fill();
      ctx.fillStyle = '#b08a40';
      ctx.fillRect(x + 2, y + 6, 12, 1);
      break;
    }
    case 'K': {
      groundTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = '#5a5050';
      ctx.fillRect(x + 2, y + 9, 12, 6);
      ctx.fillStyle = '#3a2a22';
      ctx.fillRect(x + 4, y + 9, 8, 3);
      break;
    }
    case 'A': {
      groundTile(ctx, x, y, pal, tx, ty, theme === 'falaise' ? '#c8a070' : undefined);
      ctx.fillStyle = '#8a8070';
      ctx.fillRect(x + 1, y + 6, 14, 9);
      ctx.fillStyle = '#aaa090';
      ctx.fillRect(x + 1, y + 6, 14, 2);
      ctx.fillStyle = '#c8401a';
      ctx.fillRect(x + 4, y + 4, 3, 2);
      ctx.fillStyle = '#f0e0a0';
      ctx.fillRect(x + 9, y + 4, 3, 2);
      break;
    }
    case 'E': {
      groundTile(ctx, x, y, pal, tx, ty, pal.path);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x, y + 7, TILE, 6);
      ctx.fillRect(x + 1, y + 13, 2, 3);
      ctx.fillRect(x + 13, y + 13, 2, 3);
      ctx.fillStyle = '#e2582a';
      ctx.fillRect(x + 1, y + 5, 4, 3);
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(x + 6, y + 5, 4, 3);
      ctx.fillStyle = '#5fa83a';
      ctx.fillRect(x + 11, y + 5, 4, 3);
      ctx.fillStyle = '#3a86c8';
      ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = '#f0f0f0';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 4, y, 2, 3);
      break;
    }
    case 'O': {
      grassTile(ctx, x, y, pal, tx, ty);
      ctx.fillStyle = '#8a8070';
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 9, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a4a6a';
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 9, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'U': {
      groundTile(ctx, x, y, pal, tx, ty, theme === 'laterite' ? undefined : pal.grass);
      ctx.fillStyle = '#a8643a';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 16);
      ctx.lineTo(x + 5, y + 4);
      ctx.lineTo(x + 7, y + 1);
      ctx.lineTo(x + 10, y + 3);
      ctx.lineTo(x + 11, y + 8);
      ctx.lineTo(x + 14, y + 16);
      ctx.fill();
      ctx.fillStyle = '#c8804a';
      ctx.fillRect(x + 6, y + 3, 2, 10);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x + 9, y + 9, 2, 2);
      ctx.fillRect(x + 4, y + 12, 2, 2);
      break;
    }
    case 'S': {
      groundTile(ctx, x, y, pal, tx, ty, pal.path);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(x + 7, y + 8, 2, 8);
      ctx.fillStyle = '#3a2414';
      ctx.fillRect(x + 1, y + 2, 14, 8);
      ctx.fillStyle = '#c8a060';
      ctx.fillRect(x + 2, y + 3, 12, 6);
      ctx.fillStyle = '#8a6a40';
      ctx.fillRect(x + 4, y + 5, 8, 1);
      ctx.fillRect(x + 4, y + 7, 6, 1);
      break;
    }
    default:
      groundTile(ctx, x, y, pal, tx, ty);
  }
}

/** Pré-rend une carte complète sur un canevas. */
export function renderMap(map: string[], theme: Theme, override?: (x: number, y: number) => string | null): HTMLCanvasElement {
  const h = map.length;
  const w = map[0].length;
  const [canvas, ctx] = makeCanvas(w * TILE, h * TILE);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = override?.(x, y) ?? map[y][x];
      drawTileAt(ctx, ch, x * TILE, y * TILE, theme, x, y);
    }
  }
  return canvas;
}

/** Animation des tuiles vivantes (eau, feu) dessinée par-dessus la carte. */
export function animateTile(ctx: Ctx, ch: string, x: number, y: number, time: number): void {
  if (ch === '~' || ch === 'w') {
    const phase = Math.floor(time * 2 + (x + y) / 16) % 4;
    ctx.fillStyle = ch === 'w' ? '#c0e4f8' : '#7ab4e0';
    ctx.fillRect(x + 1 + phase * 2, y + 7, 4, 1);
  } else if (ch === 'K') {
    const f = Math.floor(time * 8) % 3;
    ctx.fillStyle = '#e2582a';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 10);
    ctx.lineTo(x + 6 + f, y + 2 + f);
    ctx.lineTo(x + 8, y + 6);
    ctx.lineTo(x + 10 - f, y + 1 + f);
    ctx.lineTo(x + 12, y + 10);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(x + 7, y + 6 + f, 2, 4 - f);
  }
}

/** Petite calebasse posée au sol (objet à ramasser). */
export function itemBall(ctx: Ctx, x: number, y: number, time: number): void {
  const bob = Math.round(Math.sin(time * 4) * 1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 14, 5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(x + 8, y + 10 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8a040';
  ctx.beginPath();
  ctx.arc(x + 8, y + 10 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 7, y + 4 + bob, 2, 3);
  ctx.fillStyle = PAL.rust;
  ctx.fillRect(x + 4, y + 10 + bob, 8, 1);
  ctx.fillStyle = '#fff4c0';
  ctx.fillRect(x + 6, y + 8 + bob, 1, 1);
}
