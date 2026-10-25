// Décors en pixel art : sols avec bordures automatiques, objets ombrés (arbres,
// baobabs, cases, greniers…) et rendu des cartes en deux couches.
//
// La couche « sol » est dessinée sous les personnages ; la couche « dessus »
// (cimes des arbres, toits) passe devant eux pour donner de la profondeur.
import type { Theme, Zone } from '../data/zones';
import { calabash, shade } from './draw';
import { noise3, shiftColor } from './sculpt';
import { altarProp, baobabProp, boulderProp, canopyProp, forgeProp, granaryProp, hutProp, signProp, stallProp, termiteProp, treeProp, wellProp, type Prop } from './props';

export const TILE = 16;

interface Palette {
  grass: string;
  path: string;
  ground: string;
  tree: string;
  trunk: string;
  rock: string;
  round: boolean;
}

export const THEMES: Record<Theme, Palette> = {
  village: { grass: '#7cc858', path: '#dcbc80', ground: '#d8c08a', tree: '#4ea038', trunk: '#7a5032', rock: '#9a8468', round: false },
  savane: { grass: '#c8c460', path: '#dcb878', ground: '#dcc078', tree: '#6a9a38', trunk: '#7a5032', rock: '#9a8468', round: false },
  laterite: { grass: '#b8a050', path: '#b4583a', ground: '#c8704a', tree: '#5e8c30', trunk: '#6a4028', rock: '#8a4a32', round: false },
  marigot: { grass: '#68c060', path: '#d8c08c', ground: '#b8c880', tree: '#3a8a3a', trunk: '#6a4a30', rock: '#8a8a78', round: true },
  foret: { grass: '#4c9a44', path: '#9a8458', ground: '#7a8a4a', tree: '#2e7030', trunk: '#5a3a24', rock: '#6a6a58', round: true },
  piste: { grass: '#b4c05c', path: '#d0a868', ground: '#d4ba78', tree: '#5a8a30', trunk: '#7a5032', rock: '#9a8468', round: false },
  falaise: { grass: '#b0a458', path: '#c8a068', ground: '#c8a070', tree: '#5a7a30', trunk: '#6a4a30', rock: '#a87048', round: false },
};

function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

function stamp(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, pal: Record<string, string>): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (c) px(ctx, x + i, y + j, c);
    }
  });
}

// ── Sols ─────────────────────────────────────────────────────────────────
//
// Les sols sont peints pixel par pixel à partir d'un bruit en coordonnées du
// monde : les plaques de tons se prolongent d'une tuile à l'autre sans couture,
// et une trame ordonnée adoucit leurs frontières.

type RGB = [number, number, number];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const toneCache = new Map<string, RGB[]>();

/** Quatre tons d'un sol : clair, base, sombre, profond. */
function tones(hex: string): RGB[] {
  let t = toneCache.get(hex);
  if (!t) {
    t = [shiftColor(hex, 0.12), shiftColor(hex, 0), shiftColor(hex, -0.1), shiftColor(hex, -0.2)];
    toneCache.set(hex, t);
  }
  return t;
}

const css = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;

/** Remplit une tuile pixel par pixel. */
function pixels(ctx: CanvasRenderingContext2D, x: number, y: number, color: (wx: number, wy: number) => RGB): void {
  const img = ctx.createImageData(TILE, TILE);
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const [r, g, b] = color(x + px, y + py);
      const i = (py * TILE + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

/** Valeur de plaque (−1 à 1) tramée, pour choisir un ton de sol. */
function patch(wx: number, wy: number, scale: number, seed: number): number {
  const n = noise3(wx * scale, wy * scale, seed) * 0.65 + noise3(wx * scale * 2.8, wy * scale * 2.8, seed + 7) * 0.35;
  return n + (BAYER4[(wy & 3) * 4 + (wx & 3)] / 16 - 0.47) * 0.2;
}

const BLADES = [
  ['L.L', 'DLD', '.D.'],
  ['.L.', 'LDL', 'D.D'],
  ['L..', 'DL.', '.D.'],
  ['..L', '.LD', '.D.'],
];

function grassGround(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, tx: number, ty: number): void {
  const t = tones(pal.grass);
  pixels(ctx, x, y, (wx, wy) => {
    const v = patch(wx, wy, 0.07, 1.7);
    return v > 0.34 ? t[0] : v > -0.14 ? t[1] : v > -0.46 ? t[2] : t[3];
  });
  const colors = { L: css(shiftColor(pal.grass, 0.24)), D: css(t[3]) };
  const n = 3 + Math.floor(hash(tx, ty, 4) * 3);
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(hash(tx, ty, i) * 13);
    const gy = Math.floor(hash(ty, tx, i + 9) * 13);
    stamp(ctx, BLADES[Math.floor(hash(tx + i, ty, 2) * BLADES.length)], x + gx, y + gy, colors);
  }
  const extra = hash(tx, ty, 77);
  if (extra > 0.86) {
    // Caillou
    const sx = x + 2 + Math.floor(hash(tx, ty, 5) * 11);
    const sy = y + 2 + Math.floor(hash(tx, ty, 6) * 11);
    stamp(ctx, ['.hs', 'ssd', '.dd'], sx, sy, { h: '#d8d0c0', s: '#a89c88', d: '#6e6658' });
  } else if (extra > 0.78) {
    const sx = x + 2 + Math.floor(hash(tx, ty, 5) * 11);
    const sy = y + 2 + Math.floor(hash(tx, ty, 6) * 11);
    stamp(ctx, ['.w.', 'wyw', '.g.'], sx, sy, { w: hash(tx, ty, 8) > 0.5 ? '#ffffff' : '#f8d848', y: '#f0a020', g: css(t[3]) });
  }
}

function dirtGround(ctx: CanvasRenderingContext2D, x: number, y: number, base: string, tx: number, ty: number): void {
  const t = tones(base);
  pixels(ctx, x, y, (wx, wy) => {
    const v = patch(wx, wy, 0.09, 4.2);
    return v > 0.4 ? t[0] : v > -0.3 ? t[1] : t[2];
  });
  // Gravillons
  for (let i = 0; i < 3; i++) {
    const gx = Math.floor(hash(tx, ty, i + 20) * 14);
    const gy = Math.floor(hash(ty, tx, i + 30) * 14);
    if (hash(tx, ty, i + 50) > 0.5) stamp(ctx, ['hs', 'sd'], x + gx, y + gy, { h: css(shiftColor(base, 0.3)), s: css(t[1]), d: css(t[3]) });
    else stamp(ctx, ['h', 'd'], x + gx, y + gy, { h: css(t[0]), d: css(t[3]) });
  }
}

/** Bordure irrégulière d'herbe sur un côté d'une tuile de terre, avec son ombre. */
function grassFringe(ctx: CanvasRenderingContext2D, x: number, y: number, side: 'n' | 's' | 'e' | 'w', pal: Palette, base: string, tx: number, ty: number): void {
  const g = tones(pal.grass);
  const shadow = css(tones(base)[3]);
  for (let i = 0; i < TILE; i++) {
    const r = hash(tx * 31 + i, ty * 17, side.charCodeAt(0));
    const depth = 1 + (r > 0.45 ? 1 : 0) + (r > 0.85 ? 1 : 0);
    for (let d = 0; d <= depth; d++) {
      const color = d === depth ? shadow : css(d === depth - 1 ? g[2] : g[1]);
      if (side === 'n') px(ctx, x + i, y + d, color);
      if (side === 's') px(ctx, x + i, y + TILE - 1 - d, d === depth ? shadow : css(g[d === 0 ? 2 : 1]));
      if (side === 'w') px(ctx, x + d, y + i, color);
      if (side === 'e') px(ctx, x + TILE - 1 - d, y + i, color);
    }
  }
}

/** Brins qui dépassent au-dessus d'une plaque d'herbes hautes (bord irrégulier). */
function tallGrassFringe(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette): void {
  const g = pal.grass;
  const colors = [css(shiftColor(g, -0.2)), css(shiftColor(g, 0.02)), css(shiftColor(g, 0.24)), css(shiftColor(g, 0.4))];
  for (let k = 0; k < 6; k++) {
    const bx = x + k * 3 + Math.floor(hash(x + k, y, 9) * 3) - 1;
    const h = 3 + Math.floor(hash(x + k, y, 10) * 4);
    const lean = (hash(x + k, y, 11) - 0.5) * 3;
    for (let s = 0; s < h; s++) {
      const px2 = bx + Math.round((lean * s) / h);
      if (px2 < x || px2 >= x + TILE) continue;
      px(ctx, px2, y + 1 - s, colors[Math.min(3, Math.floor((s / h) * 3) + (s === h - 1 ? 1 : 0))]);
    }
  }
}

/** Herbes hautes : brins irréguliers en trois rangées, du fond vers l'avant. */
function tallGrass(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, onlyLower = false): void {
  const g = pal.grass;
  const deep = css(shiftColor(g, -0.34));
  const dark = css(shiftColor(g, -0.2));
  const mid = css(shiftColor(g, 0.02));
  const light = css(shiftColor(g, 0.24));
  const tip = css(shiftColor(g, 0.4));
  if (!onlyLower) {
    ctx.fillStyle = deep;
    ctx.fillRect(x, y, TILE, TILE);
  }
  const rows = onlyLower ? [15] : [5, 10, 15];
  for (const row of rows) {
    for (let k = 0; k < 6; k++) {
      const seed = (x + k * 3) * 7 + (y + row) * 13;
      const bx = x + k * 3 - 1 + Math.floor(hash(seed, row, 1) * 3);
      const h = (row === 5 ? 5 : 7) + Math.floor(hash(seed, row, 2) * 4);
      const lean = (hash(seed, row, 3) - 0.5) * 4;
      for (let s = 0; s < h; s++) {
        const px2 = bx + Math.round((lean * s) / h);
        const py2 = y + row - s;
        if (px2 < x || px2 >= x + TILE || py2 < y) continue;
        const c = s === h - 1 ? tip : s < h * 0.35 ? dark : s < h * 0.7 ? mid : light;
        px(ctx, px2, py2, c);
        if (s < 2) px(ctx, Math.min(x + TILE - 1, px2 + 1), py2, dark);
      }
    }
  }
}

function sand(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number): void {
  const t = tones('#ecd8a0');
  pixels(ctx, x, y, (wx, wy) => {
    // Rides de sable obliques.
    const ripple = Math.sin(wx * 0.5 + wy * 0.9 + noise3(wx * 0.1, wy * 0.1, 2) * 3);
    const v = patch(wx, wy, 0.08, 6) + (ripple > 0.85 ? -0.5 : 0);
    return v > 0.42 ? t[0] : v > -0.3 ? t[1] : t[2];
  });
  if (hash(tx, ty, 3) > 0.7) stamp(ctx, ['hs', 'sd'], x + 4 + Math.floor(hash(tx, ty, 1) * 8), y + 4 + Math.floor(hash(ty, tx, 1) * 8), { h: '#f8f0d8', s: '#c8b088', d: '#8a7a60' });
}

const WATER = '#3c88d0';

function water(ctx: CanvasRenderingContext2D, x: number, y: number, land: { n: boolean; s: boolean; e: boolean; w: boolean }, shallow = false): void {
  const t = tones(shallow ? '#68b0e0' : WATER);
  const foam: RGB = [232, 246, 255];
  const light = shiftColor(shallow ? '#68b0e0' : WATER, 0.3);
  pixels(ctx, x, y, (wx, wy) => {
    const lx = wx - x;
    const ly = wy - y;
    // Distance à la rive la plus proche (dans la tuile), légèrement ondulée.
    const wob = hash(wx, wy, 1) > 0.5 ? 1 : 0;
    const shore = Math.min(land.n ? ly : 99, land.s ? TILE - 1 - ly : 99, land.w ? lx : 99, land.e ? TILE - 1 - lx : 99) - wob * 0.5;
    if (shore < 1) return foam;
    if (shore < 2.5) return light;
    if (shore < 4) return t[0];
    const ripple = Math.abs(noise3(wx * 0.09, wy * 0.24, 3.3));
    if (ripple < 0.045) return light;
    const v = patch(wx, wy, 0.05, 8.8);
    return v > 0.3 ? t[1] : v > -0.2 ? t[2] : t[3];
  });
  if (shallow) {
    for (const [sx, sy] of [[3, 8], [10, 3], [11, 11]]) {
      stamp(ctx, ['.ss.', 'sSSs', '.ss.'], x + sx - 1, y + sy - 1, { s: '#8a8070', S: '#b0a490' });
    }
  }
}

function cliff(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, tx: number, ty: number, open: { n: boolean; s: boolean; e: boolean; w: boolean }): void {
  const r = pal.rock;
  ctx.fillStyle = r;
  ctx.fillRect(x, y, TILE, TILE);
  const dark = shade(r, -0.25);
  const light = shade(r, 0.2);
  // Strates et fissures
  for (let row = 4; row < TILE; row += 5) {
    for (let i = 0; i < TILE; i++) if (hash(tx * 16 + i, ty * 3 + row) > 0.2) px(ctx, x + i, y + row, dark);
  }
  for (let i = 0; i < 3; i++) {
    const cx = Math.floor(hash(tx, ty, i + 60) * 14);
    const cy = Math.floor(hash(ty, tx, i + 61) * 12);
    px(ctx, x + cx, y + cy, light);
    px(ctx, x + cx + 1, y + cy, light);
    px(ctx, x + cx, y + cy + 1, dark);
  }
  if (open.n) {
    ctx.fillStyle = pal.grass;
    ctx.fillRect(x, y, TILE, 2);
    for (let i = 0; i < TILE; i++) if (hash(tx * 9 + i, ty) > 0.5) px(ctx, x + i, y + 2, pal.grass);
    ctx.fillStyle = light;
    ctx.fillRect(x, y + 3, TILE, 1);
  }
  if (open.s) {
    ctx.fillStyle = shade(r, -0.45);
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
  }
  if (open.w) {
    ctx.fillStyle = light;
    ctx.fillRect(x, y, 1, TILE);
  }
  if (open.e) {
    ctx.fillStyle = shade(r, -0.4);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
  }
}

function flowers(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number): void {
  const colors = ['#f04838', '#f8d040', '#f070b0', '#ffffff'];
  for (let i = 0; i < 4; i++) {
    const fx = 1 + Math.floor(hash(tx, ty, i + 80) * 12);
    const fy = 2 + Math.floor(hash(ty, tx, i + 81) * 11);
    const c = colors[(tx + ty + i) % colors.length];
    stamp(ctx, ['.c.', 'cyc', '.c.', '.g.'], x + fx, y + fy, { c, y: '#f8f0a0', g: '#3a8a2a' });
  }
}

// ── Objets sculptés ──────────────────────────────────────────────────────

/** Ombre portée au sol, ellipse pixel nette assombrissant le sol. */
function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(16, 24, 8, 0.22)';
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/**
 * Pose un objet dont le pied tombe en (x, y) : ce qui dépasse au-dessus de la
 * ligne `split` passe sur la couche « dessus », devant les personnages.
 */
function place(base: CanvasRenderingContext2D, over: CanvasRenderingContext2D, prop: Prop, x: number, y: number, split: number): void {
  const left = x - prop.ax;
  const top = y - prop.ay;
  const { img } = prop;
  const cut = Math.max(0, Math.min(img.height, split - top));
  if (cut > 0) over.drawImage(img, 0, 0, img.width, cut, left, top, img.width, cut);
  if (cut < img.height) base.drawImage(img, 0, cut, img.width, img.height - cut, left, top + cut, img.width, img.height - cut);
}

// ── Rendu des cartes ─────────────────────────────────────────────────────

const PATHLIKE = new Set(['=', '.', 'L', ':', 'P', 'S', 'E']);
const WATERY = new Set(['~', 'w', 'P']);

export interface ZoneLayers {
  base: HTMLCanvasElement;
  over: HTMLCanvasElement;
}

export function renderZoneLayers(zone: Zone, tileAt: (x: number, y: number) => string): ZoneLayers {
  const pal = THEMES[zone.theme];
  const h = zone.map.length;
  const w = zone.map[0].length;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = w * TILE;
    c.height = h * TILE;
    return c;
  };
  const baseCanvas = make();
  const overCanvas = make();
  const base = baseCanvas.getContext('2d')!;
  const over = overCanvas.getContext('2d')!;
  base.imageSmoothingEnabled = false;
  over.imageSmoothingEnabled = false;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '' : tileAt(x, y));
  const groundTheme = zone.theme === 'laterite' ? 'L' : zone.theme === 'foret' || zone.theme === 'falaise' ? '.' : '"';

  // 1. Sols
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      const ground = ['T', 'B', 'G', 'U', 'O', 'S', 'F', 'A', 'K', 'X', 'R', 'H', 'D', 'M'].includes(ch) ? groundTheme : ch;
      switch (ground) {
        case '"':
          grassGround(base, x, y, pal, tx, ty);
          break;
        case ',':
          if (zone.theme === 'laterite') dirtGround(base, x, y, pal.ground, tx, ty);
          tallGrass(base, x, y, pal, false);
          if (at(tx, ty - 1) !== ',') tallGrassFringe(base, x, y, pal);
          break;
        case '=':
        case '.':
        case 'L':
        case 'E': {
          const color = ground === '=' || ground === 'E' ? pal.path : ground === 'L' ? '#c8704a' : pal.ground;
          dirtGround(base, x, y, color, tx, ty);
          if (ground === '=' || ground === 'E') {
            const isPath = (c: string) => c === '=' || c === 'E' || c === 'S' || c === '' || c === 'P' || c === 'w';
            if (!isPath(at(tx, ty - 1)) && !PATHLIKE.has(at(tx, ty - 1))) grassFringe(base, x, y, 'n', pal, color, tx, ty);
            if (!isPath(at(tx, ty + 1)) && !PATHLIKE.has(at(tx, ty + 1))) grassFringe(base, x, y, 's', pal, color, tx, ty);
            if (!isPath(at(tx - 1, ty)) && !PATHLIKE.has(at(tx - 1, ty))) grassFringe(base, x, y, 'w', pal, color, tx, ty);
            if (!isPath(at(tx + 1, ty)) && !PATHLIKE.has(at(tx + 1, ty))) grassFringe(base, x, y, 'e', pal, color, tx, ty);
          }
          break;
        }
        case ':':
          sand(base, x, y, tx, ty);
          break;
        case '~':
        case 'w': {
          const land = (c: string) => !WATERY.has(c) && c !== '';
          water(base, x, y, { n: land(at(tx, ty - 1)), s: land(at(tx, ty + 1)), e: land(at(tx + 1, ty)), w: land(at(tx - 1, ty)) }, ground === 'w');
          break;
        }
        case 'P': {
          water(base, x, y, { n: false, s: false, e: false, w: false });
          base.fillStyle = '#9a6a3a';
          base.fillRect(x + 2, y, 12, TILE);
          for (let i = 0; i < 4; i++) {
            base.fillStyle = '#6a4424';
            base.fillRect(x + 2, y + i * 4 + 3, 12, 1);
            base.fillStyle = '#b8844a';
            base.fillRect(x + 2, y + i * 4, 12, 1);
          }
          base.fillStyle = '#4a2c14';
          base.fillRect(x + 1, y, 1, TILE);
          base.fillRect(x + 14, y, 1, TILE);
          break;
        }
        case '#': {
          const c = (cx: number, cy: number) => at(cx, cy) === '#' || at(cx, cy) === '';
          cliff(base, x, y, pal, tx, ty, { n: !c(tx, ty - 1), s: !c(tx, ty + 1), e: !c(tx + 1, ty), w: !c(tx - 1, ty) });
          break;
        }
        default:
          grassGround(base, x, y, pal, tx, ty);
      }
      if (ch === 'F') flowers(base, x, y, tx, ty);
    }
  }

  // 2. Ombres portées, puis objets du haut vers le bas pour que les plus proches recouvrent les plus lointains.
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      const cx = tx * TILE + 8;
      const cy = ty * TILE + 12;
      if (ch === 'T') groundShadow(base, cx + 2, cy + 1, pal.round ? 8 : 11, 3);
      else if (ch === 'B') groundShadow(base, cx + 3, cy + 1, 13, 4);
      else if (ch === 'R' && at(tx - 1, ty) !== 'R') groundShadow(base, tx * TILE + 26, (ty + 2) * TILE - 2, 22, 4);
      else if ('GUOX'.includes(ch) && ch) groundShadow(base, cx + 1, cy + 1, 6, 2);
    }
  }
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      const x = tx * TILE + 8;
      const y = ty * TILE + 12;
      const split = ty * TILE;
      switch (ch) {
        case 'T': {
          const surrounded = at(tx, ty + 1) === 'T' && at(tx - 1, ty) === 'T' && at(tx + 1, ty) === 'T' && pal.round;
          place(base, over, surrounded ? canopyProp(pal) : treeProp(pal, Math.floor(hash(tx, ty, 3) * 3)), x, y + (surrounded ? 2 : 0), split);
          break;
        }
        case 'B':
          place(base, over, baobabProp(), x, y, split);
          break;
        case 'G':
          place(base, over, granaryProp(), x, y, split);
          break;
        case 'U':
          place(base, over, termiteProp(), x, y, split);
          break;
        case 'O':
          place(base, over, wellProp(), x, y - 1, split);
          break;
        case 'A':
          place(base, over, altarProp(), x, y, split);
          break;
        case 'E':
          place(base, over, stallProp(), x, y, split);
          break;
        case 'S':
          place(base, over, signProp(), x, y, split);
          break;
        case 'K':
          place(base, over, forgeProp(), x, y - 1, split);
          break;
        case 'X':
          place(base, over, boulderProp(true, pal.rock), x, y, split);
          break;
        case 'M': {
          // Mur d'enceinte en banco avec chaperon clair.
          const mx = tx * TILE;
          const my = ty * TILE;
          base.fillStyle = '#b8784a';
          base.fillRect(mx, my + 3, TILE, TILE - 3);
          for (let i = 0; i < 9; i++) {
            const bx = mx + Math.floor(hash(tx, ty, i) * 14);
            const by = my + 5 + Math.floor(hash(ty, tx, i + 3) * 8);
            base.fillStyle = i % 3 ? '#a06840' : '#c88a5a';
            base.fillRect(bx, by, 2 + (i % 2), 1);
          }
          base.fillStyle = '#e0a878';
          base.fillRect(mx, my, TILE, 4);
          base.fillStyle = '#f0c094';
          base.fillRect(mx, my + 1, TILE, 1);
          base.fillStyle = '#8a5432';
          base.fillRect(mx, my + TILE - 2, TILE, 2);
          base.fillStyle = '#20140c';
          base.fillRect(mx, my, TILE, 1);
          break;
        }
        case 'R':
          // Une case ronde occupe trois tuiles de toit (R) au-dessus de trois tuiles de mur (H D H).
          if (at(tx - 1, ty) !== 'R') place(base, over, hutProp(), tx * TILE + 24, (ty + 2) * TILE - 3, split);
          break;
      }
    }
  }
  return { base: baseCanvas, over: overCanvas };
}

/** Animation de l'eau et des foyers, dessinée par-dessus la couche « sol ». */
export function animateTile(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, time: number): void {
  if (ch === '~' || ch === 'w') {
    const phase = Math.floor(time * 2 + (x + y) / 16) % 4;
    ctx.fillStyle = ch === 'w' ? '#c8e8f8' : '#7ab8e8';
    ctx.fillRect(x + 2 + phase * 2, y + 8, 3, 1);
  } else if (ch === 'K') {
    const f = Math.floor(time * 8) % 3;
    stamp(ctx, f === 0 ? ['..r..', '.ryr.', '.ryyr', 'ryyyr'] : f === 1 ? ['.r...', '.rr.r', 'ryyr.', 'ryyyr'] : ['...r.', 'r.rr.', '.ryyr', 'ryyyr'], x + 5, y + 5, {
      r: '#e8582a',
      y: '#ffd040',
    });
  }
}

/** Herbe haute dessinée par-dessus les pieds du joueur. */
export function grassOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme): void {
  tallGrass(ctx, x, y, THEMES[theme], true);
}

/** Calebasse posée au sol (objet à ramasser). */
export function itemBall(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.floor(time * 3) % 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 4, y + 13, 8, 2);
  calabash(ctx, x + 8, y + 8 - bob, 2);
}
