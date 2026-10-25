// Décors en pixel art : sols avec bordures automatiques, objets ombrés (arbres,
// baobabs, cases, greniers…) et rendu des cartes en deux couches.
//
// La couche « sol » est dessinée sous les personnages ; la couche « dessus »
// (cimes des arbres, toits) passe devant eux pour donner de la profondeur.
import type { Theme, Zone } from '../data/zones';
import { calabash, shade } from './draw';
import { Painter } from './pixel';

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

function grassGround(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, tx: number, ty: number): void {
  const g = pal.grass;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE, TILE);
  const colors = { h: shade(g, 0.22), d: shade(g, -0.2) };
  // Petites touffes en « v » disposées de façon irrégulière mais stable.
  for (let i = 0; i < 4; i++) {
    const gx = Math.floor(hash(tx, ty, i) * 13);
    const gy = Math.floor(hash(ty, tx, i + 9) * 13);
    stamp(ctx, ['h.h', '.d.'], x + gx, y + gy + 1, colors);
  }
  if (hash(tx, ty, 77) > 0.7) px(ctx, x + Math.floor(hash(tx, ty, 5) * 15), y + Math.floor(hash(tx, ty, 6) * 15), colors.h);
}

function dirtGround(ctx: CanvasRenderingContext2D, x: number, y: number, base: string, tx: number, ty: number): void {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 5; i++) {
    const gx = Math.floor(hash(tx, ty, i + 20) * 15);
    const gy = Math.floor(hash(ty, tx, i + 30) * 15);
    px(ctx, x + gx, y + gy, shade(base, i % 2 ? -0.16 : 0.14));
    if (i === 0) px(ctx, x + gx + 1, y + gy, shade(base, -0.16));
  }
}

/** Bordure irrégulière d'herbe sur un côté d'une tuile de terre (transition douce). */
function grassFringe(ctx: CanvasRenderingContext2D, x: number, y: number, side: 'n' | 's' | 'e' | 'w', pal: Palette, base: string, tx: number, ty: number): void {
  const g = pal.grass;
  const dark = shade(base, -0.18);
  for (let i = 0; i < TILE; i++) {
    const depth = 1 + (hash(tx * 31 + i, ty, side.charCodeAt(0)) > 0.55 ? 1 : 0);
    for (let d = 0; d <= depth; d++) {
      const color = d < depth ? g : dark;
      if (side === 'n') px(ctx, x + i, y + d, color);
      if (side === 's') px(ctx, x + i, y + TILE - 1 - d, color);
      if (side === 'w') px(ctx, x + d, y + i, color);
      if (side === 'e') px(ctx, x + TILE - 1 - d, y + i, color);
    }
  }
}

/** Touffe d'herbe haute (8×8) : trois feuilles pointues ombrées. */
const TUFT = ['...U....', '..UTK...', '.UTTKUK.', 'UTTVKTTK', 'UTVVKTVK', 'TVVK.VVK', 'VVK..VK.', 'KK...K..'];

function tallGrass(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Palette, onlyLower = false): void {
  const g = pal.grass;
  const colors = { U: shade(g, 0.3), T: shade(g, 0.05), V: shade(g, -0.22), K: shade(g, -0.5) };
  if (!onlyLower) {
    ctx.fillStyle = shade(g, -0.3);
    ctx.fillRect(x, y, TILE, TILE);
  }
  const positions: Array<[number, number]> = onlyLower
    ? [[0, 8], [8, 8]]
    : [[0, 0], [8, 0], [4, 8], [-4, 8], [12, 8]];
  for (const [ox, oy] of positions) {
    TUFT.forEach((row, j) => {
      for (let i = 0; i < 8; i++) {
        const c = colors[row[i] as keyof typeof colors];
        const pxX = ox + i;
        if (c && pxX >= 0 && pxX < TILE) px(ctx, x + pxX, y + oy + j, c);
      }
    });
  }
}

function sand(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number): void {
  dirtGround(ctx, x, y, '#ecd8a0', tx, ty);
  const r = shade('#ecd8a0', -0.12);
  for (let i = 0; i < 6; i++) px(ctx, x + 2 + i, y + 5, r);
  for (let i = 0; i < 5; i++) px(ctx, x + 9 + i, y + 11, r);
}

const WATER = '#3c88d0';

function water(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, land: { n: boolean; s: boolean; e: boolean; w: boolean }, shallow = false): void {
  const base = shallow ? '#68b0e0' : WATER;
  ctx.fillStyle = base;
  ctx.fillRect(x, y, TILE, TILE);
  const light = shade(base, 0.3);
  for (let i = 0; i < 2; i++) {
    const wx = Math.floor(hash(tx, ty, i + 40) * 10);
    const wy = 3 + i * 7 + Math.floor(hash(ty, tx, i) * 3);
    for (let k = 0; k < 4; k++) px(ctx, x + wx + k, y + wy, light);
  }
  // Rive : écume claire et eau plus sombre au bord.
  const foam = '#e0f4ff';
  const deep = shade(base, -0.18);
  for (let i = 0; i < TILE; i++) {
    const d = hash(tx * 7 + i, ty) > 0.5 ? 1 : 0;
    if (land.n) {
      px(ctx, x + i, y, foam);
      if (d) px(ctx, x + i, y + 1, foam);
      px(ctx, x + i, y + 1 + d, deep);
    }
    if (land.s) {
      px(ctx, x + i, y + TILE - 1, foam);
      px(ctx, x + i, y + TILE - 2, deep);
    }
    if (land.w) {
      px(ctx, x, y + i, foam);
      if (d) px(ctx, x + 1, y + i, foam);
    }
    if (land.e) {
      px(ctx, x + TILE - 1, y + i, foam);
      if (d) px(ctx, x + TILE - 2, y + i, foam);
    }
  }
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

// ── Objets peints (ombrés comme les créatures) ───────────────────────────

const objectCache = new Map<string, HTMLCanvasElement>();

function painted(key: string, w: number, h: number, draw: (p: Painter) => void): HTMLCanvasElement {
  const cached = objectCache.get(key);
  if (cached) return cached;
  const p = new Painter(w, h);
  draw(p);
  const canvas = p.render();
  objectCache.set(key, canvas);
  return canvas;
}

/** Arbre (acacia à cime plate ou arbre feuillu), 22×30, pied en bas au centre. */
function treeImage(pal: Palette, variant: number): HTMLCanvasElement {
  return painted(`arbre:${pal.tree}:${pal.round}:${variant}`, 22, 30, (p) => {
    p.setTransform(11, 29, 1);
    p.line([0, 0, 0, -9], pal.trunk, 3.2);
    if (pal.round) {
      p.ell(0, -16, 9.5, 9, shade(pal.tree, -0.08));
      p.ell(-3, -18, 6, 6, pal.tree);
      p.ell(3.5, -14, 5.5, 5, pal.tree);
      p.ell(-1, -21, 5, 4.5, shade(pal.tree, 0.1));
    } else {
      // Acacia : branches en V et large ombrelle plate.
      p.line([0, -7, -5, -13], pal.trunk, 1.8);
      p.line([0, -7, 5, -14], pal.trunk, 1.8);
      p.ell(0, -17, 10.5, 4.5 + (variant % 2), shade(pal.tree, -0.05));
      p.ell(-3, -19, 6, 3, pal.tree, 0, false);
      p.ell(4, -18, 5, 2.5, shade(pal.tree, 0.12), 0, false);
    }
  });
}

/** Cime dense pour l'intérieur d'une forêt (arbre entouré d'autres arbres). */
function canopyImage(pal: Palette): HTMLCanvasElement {
  return painted(`canopee:${pal.tree}`, 20, 24, (p) => {
    p.setTransform(10, 22, 1);
    p.ell(0, -11, 10, 11, shade(pal.tree, -0.1));
    p.ell(-3, -14, 6, 6, pal.tree);
    p.ell(4, -9, 5, 5, pal.tree);
  });
}

function baobabImage(): HTMLCanvasElement {
  return painted('baobab', 40, 44, (p) => {
    p.setTransform(20, 43, 1);
    p.poly([-8, 0, -6, -6, -5, -22, -2, -26, 2, -26, 5, -22, 6, -6, 9, 0], '#8a7464');
    p.line([-4, -24, -11, -31, -15, -30], '#8a7464', 2.4);
    p.line([3, -25, 10, -33, 15, -32], '#8a7464', 2.4);
    p.line([0, -26, 0, -36], '#8a7464', 2.2);
    for (const [x, y, rx] of [[-15, -32, 6], [15, -34, 6], [0, -38, 7], [-6, -36, 4], [7, -38, 4]] as const) {
      p.ell(x, y, rx, rx * 0.6, '#5a9a38');
    }
    p.inkLine([-3, -20, -3, -4], '#6a5446');
    p.inkLine([3, -18, 3, -3], '#6a5446');
  });
}

/** Case ronde en banco coiffée d'un toit conique de chaume (48×44). */
function hutImage(): HTMLCanvasElement {
  return painted('case', 48, 44, (p) => {
    p.setTransform(24, 43, 1);
    p.rect(-19, -18, 38, 18, '#c08058');
    p.inkLine([-18, -10, 18, -10], '#a06844');
    p.rect(-4, -14, 8, 14, '#4a2c18');
    p.inkLine([-3, -14, 3, -14], '#2a180c');
    p.poly([-24, -16, 0, -42, 24, -16, 18, -13, -18, -13], '#d8b060');
    for (let i = -18; i <= 18; i += 4) p.inkLine([i * 0.12, -40, i, -15], '#b08838');
    p.inkLine([-22, -16, 22, -16], '#a07830');
    p.ell(0, -41, 2.5, 2, '#b08838');
  });
}

function granaryImage(): HTMLCanvasElement {
  return painted('grenier', 18, 30, (p) => {
    p.setTransform(9, 29, 1);
    p.rect(-6, -14, 12, 14, '#b87850');
    p.rect(-2, -10, 4, 5, '#5a3420');
    p.poly([-9, -12, 0, -27, 9, -12], '#d8b060');
    p.inkLine([0, -26, -5, -13], '#b08838');
    p.inkLine([0, -26, 4, -13], '#b08838');
  });
}

function termiteImage(): HTMLCanvasElement {
  return painted('termitiere', 18, 30, (p) => {
    p.setTransform(9, 29, 1);
    p.poly([-8, 0, -5, -12, -3, -22, 0, -27, 2, -20, 4, -14, 8, 0], '#b06a3a');
    p.poly([2, -16, 5, -21, 6, -8], '#a05c32');
    p.inkLine([-2, -18, -3, -4], '#8a4a28');
    p.ink(2, -10, '#5a2c14');
    p.ink(-4, -6, '#5a2c14');
  });
}

function boulderImage(cracked: boolean, pal: Palette): HTMLCanvasElement {
  return painted(`rocher:${cracked}:${pal.rock}`, 16, 16, (p) => {
    p.setTransform(8, 15, 1);
    p.ell(0, -6, 7, 6, cracked ? '#a8704c' : pal.rock);
    if (cracked) {
      p.inkLine([-3, -11, -1, -7, -3, -3], '#3a2014');
      p.inkLine([-1, -7, 3, -6], '#3a2014');
    }
  });
}

function wellImage(): HTMLCanvasElement {
  return painted('puits', 16, 20, (p) => {
    p.setTransform(8, 18, 1);
    p.line([-6, -6, -6, -16], '#7a5032', 1.6);
    p.line([6, -6, 6, -16], '#7a5032', 1.6);
    p.line([-7, -16, 7, -16], '#7a5032', 1.6);
    p.ell(0, -4, 7.5, 4.5, '#9a9488');
    p.ell(0, -5, 5, 2.5, '#28486a', 0, false);
  });
}

function altarImage(): HTMLCanvasElement {
  return painted('autel', 16, 16, (p) => {
    p.setTransform(8, 15, 1);
    p.rect(-7, -8, 14, 8, '#9a9080');
    p.rect(-6, -10, 3, 2, '#c84020');
    p.ell(3, -10, 2.5, 1.5, '#f0e8c8');
  });
}

function stallImage(): HTMLCanvasElement {
  return painted('etal', 16, 22, (p) => {
    p.setTransform(8, 21, 1);
    p.line([-7, 0, -7, -18], '#6a4024', 1.4);
    p.line([7, 0, 7, -18], '#6a4024', 1.4);
    p.rect(-8, -8, 16, 4, '#8a5a32');
    p.ell(-4, -9, 2.5, 1.6, '#e85a2a');
    p.ell(1, -9, 2.5, 1.6, '#f0c040');
    p.ell(5, -9, 2, 1.6, '#5fa83a');
    p.poly([-9, -20, 9, -20, 8, -15, -8, -15], '#3a86c8');
    for (let i = -7; i <= 7; i += 4) p.rect(i, -20, 2, 5, '#f0f0f0', false);
  });
}

function signImage(): HTMLCanvasElement {
  return painted('panneau', 16, 16, (p) => {
    p.setTransform(8, 15, 1);
    p.line([0, 0, 0, -6], '#6a4024', 1.6);
    p.rect(-6, -12, 12, 7, '#c8a060');
    p.inkLine([-4, -10, 4, -10], '#7a5a30');
    p.inkLine([-4, -8, 2, -8], '#7a5a30');
  });
}

function forgeImage(): HTMLCanvasElement {
  return painted('forge', 16, 16, (p) => {
    p.setTransform(8, 15, 1);
    p.ell(0, -4, 7, 4, '#6a6060');
    p.ell(0, -5, 4.5, 2, '#2a1a14', 0, false);
  });
}

// ── Rendu des cartes ─────────────────────────────────────────────────────

const PATHLIKE = new Set(['=', '.', 'L', ':', 'P', 'S', 'E']);
const WATERY = new Set(['~', 'w', 'P']);

export interface ZoneLayers {
  base: HTMLCanvasElement;
  over: HTMLCanvasElement;
}

/** Dessine une image d'objet : la partie dans la case va au sol, le dépassement vers le haut à la couche « dessus ». */
function placeObject(
  base: CanvasRenderingContext2D,
  over: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  tileX: number,
  tileY: number,
  rowsInTile = TILE,
): void {
  const left = tileX * TILE + Math.round((TILE - img.width) / 2);
  const bottom = (tileY + 1) * TILE;
  const top = bottom - img.height;
  const split = bottom - rowsInTile;
  if (top < split) over.drawImage(img, 0, 0, img.width, split - top, left, top, img.width, split - top);
  const h = Math.min(img.height, rowsInTile);
  base.drawImage(img, 0, img.height - h, img.width, h, left, bottom - h, img.width, h);
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
          water(base, x, y, tx, ty, { n: land(at(tx, ty - 1)), s: land(at(tx, ty + 1)), e: land(at(tx + 1, ty)), w: land(at(tx - 1, ty)) }, ground === 'w');
          break;
        }
        case 'P': {
          water(base, x, y, tx, ty, { n: false, s: false, e: false, w: false });
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

  // 2. Objets, du haut vers le bas pour que les plus proches recouvrent les plus lointains.
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      switch (ch) {
        case 'T': {
          const surrounded = at(tx, ty + 1) === 'T' && at(tx - 1, ty) === 'T' && at(tx + 1, ty) === 'T' && pal.round;
          placeObject(base, over, surrounded ? canopyImage(pal) : treeImage(pal, (tx + ty) % 3), tx, ty);
          break;
        }
        case 'B':
          placeObject(base, over, baobabImage(), tx, ty);
          break;
        case 'G':
          placeObject(base, over, granaryImage(), tx, ty);
          break;
        case 'U':
          placeObject(base, over, termiteImage(), tx, ty);
          break;
        case 'O':
          placeObject(base, over, wellImage(), tx, ty);
          break;
        case 'A':
          placeObject(base, over, altarImage(), tx, ty);
          break;
        case 'E':
          placeObject(base, over, stallImage(), tx, ty);
          break;
        case 'S':
          placeObject(base, over, signImage(), tx, ty);
          break;
        case 'K':
          placeObject(base, over, forgeImage(), tx, ty);
          break;
        case 'X':
          placeObject(base, over, boulderImage(true, pal), tx, ty);
          break;
        case 'M': {
          // Mur d'enceinte en banco avec chaperon clair.
          const x = tx * TILE;
          const y = ty * TILE;
          base.fillStyle = '#b8784a';
          base.fillRect(x, y + 3, TILE, TILE - 3);
          base.fillStyle = '#e0a878';
          base.fillRect(x, y, TILE, 4);
          base.fillStyle = '#8a5432';
          base.fillRect(x, y + TILE - 2, TILE, 2);
          for (let i = 0; i < 3; i++) {
            base.fillStyle = '#a06840';
            base.fillRect(x + Math.floor(hash(tx, ty, i) * 13), y + 6 + i * 3, 3, 1);
          }
          base.fillStyle = '#20140c';
          base.fillRect(x, y, TILE, 1);
          break;
        }
        case 'R':
          // Une case ronde occupe trois tuiles de toit (R) au-dessus de trois tuiles de mur (H D H).
          if (at(tx - 1, ty) !== 'R') {
            const img = hutImage();
            const left = tx * TILE;
            const bottom = (ty + 2) * TILE;
            const top = bottom - img.height;
            const split = ty * TILE;
            over.drawImage(img, 0, 0, img.width, split - top, left, top, img.width, split - top);
            base.drawImage(img, 0, split - top, img.width, bottom - split, left, split, img.width, bottom - split);
          }
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
