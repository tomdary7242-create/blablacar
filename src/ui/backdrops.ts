// Fonds de combat peints, un par décor : ciel dégradé et tramé, nuages et
// végétation sculptés, reliefs en plans successifs, sol texturé et socles en volume.
import type { Theme } from '../data/zones';
import { baobabProp, granaryProp, hutProp, sculpted, termiteProp, treeProp, type Prop, type PropView } from './props';
import { noise3, shiftColor } from './sculpt';
import { THEMES } from './tiles';

export const BACKDROP_W = 256;
export const BACKDROP_H = 144;
const HORIZON = 78;

type RGB = [number, number, number];
type Scenery = 'acacia' | 'arbre' | 'baobab' | 'case' | 'grenier' | 'termitiere';

interface Design {
  /** Ciel, du zénith à l'horizon. */
  sky: string[];
  /** Relief lointain puis proche. */
  far: string;
  near: string;
  ground: string;
  platform: { top: string; rim: string };
  clouds: { color: string; count: number };
  scenery: Array<[Scenery, number, number]>;
  /** Plan d'eau à l'horizon (marigot). */
  lake?: boolean;
  /** Falaise en toile de fond (Bandiagara). */
  cliff?: boolean;
  /** Voûte de feuillage (forêt). */
  canopy?: boolean;
}

const DESIGNS: Record<Theme, Design> = {
  village: {
    sky: ['#4a8ad8', '#62a2e4', '#80b8ec', '#a0ccf0', '#c4def2', '#e2eef0'],
    far: '#86a8a8',
    near: '#5e9a52',
    ground: '#7cc858',
    platform: { top: '#d8b880', rim: '#5aa840' },
    clouds: { color: '#f8faff', count: 3 },
    scenery: [['case', 30, 0.55], ['grenier', 62, 0.55], ['baobab', 120, 0.6], ['arbre', 200, 0.5], ['case', 232, 0.5]],
  },
  savane: {
    sky: ['#d87858', '#e68e5e', '#f0a466', '#f6ba74', '#f8ce8a', '#fae0aa'],
    far: '#b88a78',
    near: '#9a9048',
    ground: '#c8c460',
    platform: { top: '#dcbc80', rim: '#a8a848' },
    clouds: { color: '#fff0e0', count: 2 },
    scenery: [['acacia', 22, 0.6], ['termitiere', 70, 0.55], ['acacia', 120, 0.45], ['baobab', 214, 0.55]],
  },
  laterite: {
    sky: ['#c85840', '#d86c48', '#e68452', '#f09c5e', '#f4b46e', '#f8ca88'],
    far: '#a85848',
    near: '#8a4a30',
    ground: '#c87a4e',
    platform: { top: '#c86a44', rim: '#9a8a40' },
    clouds: { color: '#ffe8d8', count: 1 },
    scenery: [['termitiere', 28, 0.6], ['acacia', 90, 0.5], ['termitiere', 150, 0.45], ['acacia', 226, 0.55]],
  },
  marigot: {
    sky: ['#5a9adc', '#74b0e6', '#90c4ec', '#acd6f0', '#c8e4f0', '#e0f0ee'],
    far: '#7ea8b4',
    near: '#4e8a58',
    ground: '#68c060',
    platform: { top: '#d0c08c', rim: '#4aa040' },
    clouds: { color: '#f8faff', count: 4 },
    scenery: [['arbre', 18, 0.5], ['arbre', 44, 0.42], ['arbre', 214, 0.5], ['arbre', 240, 0.42]],
    lake: true,
  },
  foret: {
    sky: ['#14281c', '#1c3424', '#26402c', '#324e34', '#405c3c', '#506a44'],
    far: '#2c4a30',
    near: '#2a5a2e',
    ground: '#4c9a44',
    platform: { top: '#8a7a52', rim: '#3a8a3a' },
    clouds: { color: '#fff', count: 0 },
    scenery: [],
    canopy: true,
  },
  piste: {
    sky: ['#4a86d4', '#64a0e0', '#82b8ea', '#a2ccf0', '#c4def2', '#e4eef0'],
    far: '#a09484',
    near: '#848a48',
    ground: '#b4c05c',
    platform: { top: '#d4b070', rim: '#8aa040' },
    clouds: { color: '#ffffff', count: 3 },
    scenery: [['acacia', 34, 0.5], ['grenier', 84, 0.5], ['acacia', 180, 0.6], ['termitiere', 236, 0.45]],
  },
  falaise: {
    sky: ['#2e2a52', '#463a66', '#6a4a72', '#965a72', '#c07070', '#e49470'],
    far: '#8a5a50',
    near: '#7a6a3a',
    ground: '#b0a458',
    platform: { top: '#c8a070', rim: '#8a8a40' },
    clouds: { color: '#f0d0d8', count: 2 },
    scenery: [['grenier', 196, 0.5], ['acacia', 236, 0.5]],
    cliff: true,
  },
};

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)] / 16;
const hexRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

class Canvas {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  set(x: number, y: number, [r, g, b]: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = 255;
  }
}

/** Dégradé vertical tramé (pas de demi-teintes : uniquement les couleurs données). */
function dithered(c: Canvas, y0: number, y1: number, colors: string[]): void {
  const rgb = colors.map(hexRgb);
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < c.w; x++) c.set(x, y, f > bayer(x, y) ? rgb[i + 1] : rgb[i]);
  }
}

/** Ligne de relief : hauteur bruitée, arête éclairée d'un pixel. */
function ridge(c: Canvas, base: number, amp: number, freq: number, seed: number, color: string): void {
  const col = hexRgb(color);
  const lit = shiftColor(color, 0.14);
  const shadeC = shiftColor(color, -0.08);
  for (let x = 0; x < c.w; x++) {
    const h = base + amp * (noise3(x * freq, seed, 0.5) * 0.7 + noise3(x * freq * 3, seed + 4, 1.5) * 0.3);
    const top = Math.round(HORIZON - h);
    for (let y = Math.max(0, top); y < HORIZON + 2; y++) {
      const v = noise3(x * 0.08, y * 0.2, seed + 9) + (bayer(x, y) - 0.5) * 0.3;
      c.set(x, y, y === top ? lit : v < -0.35 ? shadeC : col);
    }
  }
}

function blit(ctx: CanvasRenderingContext2D, prop: Prop, x: number, y: number, tint?: string): void {
  if (!tint) {
    ctx.drawImage(prop.img, Math.round(x - prop.ax), Math.round(y - prop.ay));
    return;
  }
  const t = document.createElement('canvas');
  t.width = prop.img.width;
  t.height = prop.img.height;
  const tc = t.getContext('2d')!;
  tc.drawImage(prop.img, 0, 0);
  tc.globalCompositeOperation = 'source-atop';
  tc.fillStyle = tint;
  tc.globalAlpha = 0.55;
  tc.fillRect(0, 0, t.width, t.height);
  ctx.drawImage(t, Math.round(x - prop.ax), Math.round(y - prop.ay));
}

function cloud(color: string, variant: number): Prop {
  return sculpted(
    `nuage:${color}:${variant}`,
    (s, m) => {
      const c = m(color, { bare: true, maxTone: 2 });
      const puffs: Array<[number, number, number, number]> = [
        [0, 6, 0, 7],
        [-9, 4, 1, 5],
        [9, 4, -1, 5.5],
        [-4 + variant * 2, 10, -1, 5],
        [16, 2.5, 0, 3.5],
        [-16, 2.5, 0, 3.5],
      ];
      for (const [x, y, z, r] of puffs.slice(0, 4 + (variant % 3))) s.sphere([x, y, z], r, c, { k: 2, amp: 0.6, freq: 0.4 });
      s.ellipsoid([0, 2.5, 0], [20, 2.5, 6], c, { k: 2 });
    },
    { pitch: 0, scale: 1 },
  );
}

function platform(top: string, rim: string, r: number): Prop {
  return sculpted(
    `socle:${top}:${rim}:${r}`,
    (s, m) => {
      const grass = m(rim, { fur: 1 });
      const dirt = m(top);
      s.capped([0, -5, 0], [0, 0, 0], r, r - 1.5, grass, { round: 1.5, amp: 1, freq: 0.45 });
      s.paint([0, 0.5, 0], [r * 0.8, 1.6, r * 0.8], dirt);
    },
    { pitch: 13, scale: 1 },
  );
}

function sceneryProp(kind: Scenery, theme: Theme, pv: PropView, variant: number): Prop {
  const pal = THEMES[theme];
  switch (kind) {
    case 'acacia':
      return treeProp({ ...pal, round: false }, variant, pv);
    case 'arbre':
      return treeProp({ ...pal, round: true }, variant, pv);
    case 'baobab':
      return baobabProp(pv);
    case 'case':
      return hutProp(pv);
    case 'grenier':
      return granaryProp(pv);
    case 'termitiere':
      return termiteProp(pv);
  }
}

const cache = new Map<Theme, HTMLCanvasElement>();

/** Fond de combat (256×144) pour un décor ; les socles sont inclus. */
export function battleBackdrop(theme: Theme): HTMLCanvasElement {
  const hit = cache.get(theme);
  if (hit) return hit;
  const d = DESIGNS[theme];
  const c = new Canvas(BACKDROP_W, BACKDROP_H);

  // Ciel
  dithered(c, 0, HORIZON + 2, d.sky);
  if (d.canopy) {
    // Rais de lumière obliques à travers le feuillage.
    const ray = shiftColor(d.sky[4], 0.12);
    for (let y = 0; y < HORIZON; y++) {
      for (let x = 0; x < c.w; x++) {
        const u = (x + y * 0.6) % 70;
        if (u > 10 && u < 18 && bayer(x, y) < 0.35 + (y / HORIZON) * 0.2) c.set(x, y, ray);
      }
    }
  }
  // Reliefs
  if (d.cliff) {
    // Falaise de Bandiagara : paroi stratifiée et entailles d'habitations troglodytes.
    const rock = hexRgb('#a8704c');
    const dark = shiftColor('#a8704c', -0.18);
    const lit = shiftColor('#a8704c', 0.14);
    for (let x = 0; x < c.w; x++) {
      const top = Math.round(14 + noise3(x * 0.03, 2, 0) * 8 + noise3(x * 0.15, 5, 0) * 2);
      for (let y = top; y < HORIZON + 2; y++) {
        const strata = Math.sin(y * 0.55 + noise3(x * 0.05, y * 0.05, 3) * 2.5);
        const crack = Math.abs(noise3(x * 0.12, y * 0.02, 7)) < 0.04;
        c.set(x, y, y === top ? lit : crack || strata > 0.82 ? dark : strata < -0.85 ? lit : rock);
      }
    }
    for (const [x, y] of [[40, 34], [58, 38], [76, 32], [150, 40], [168, 36], [102, 46]] as const) {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) c.set(x + i, y + j, j === 0 || i === 0 ? hexRgb('#4a2c20') : hexRgb('#2a1810'));
    }
  } else if (!d.canopy) {
    ridge(c, 18, 9, 0.012, 1.3, d.far);
  }
  ridge(c, d.canopy ? 4 : 6, 5, 0.02, 4.1, d.near);

  // Plan d'eau
  if (d.lake) {
    const water = [hexRgb('#5a9ad8'), shiftColor('#5a9ad8', 0.2), shiftColor('#5a9ad8', -0.12)];
    for (let y = HORIZON - 1; y < HORIZON + 13; y++) {
      for (let x = 0; x < c.w; x++) {
        const rip = Math.abs(noise3(x * 0.06, y * 0.6, 2.2));
        c.set(x, y, rip < 0.05 ? water[1] : (y - HORIZON) % 5 === 4 && bayer(x, y) < 0.4 ? water[2] : water[0]);
      }
    }
  }

  // Sol en perspective : plaques étirées, plus claires vers l'horizon.
  const g = [shiftColor(d.ground, 0.16), shiftColor(d.ground, 0.06), hexRgb(d.ground), shiftColor(d.ground, -0.1), shiftColor(d.ground, -0.2)];
  const groundTop = d.lake ? HORIZON + 13 : HORIZON + 2;
  for (let y = groundTop; y < BACKDROP_H; y++) {
    const depth = (y - HORIZON) / (BACKDROP_H - HORIZON);
    for (let x = 0; x < c.w; x++) {
      const v = noise3(x * 0.03, y * (0.1 + depth * 0.05), 5.5) * 0.7 + noise3(x * 0.1, y * 0.3, 8) * 0.3 + (bayer(x, y) - 0.5) * 0.25 + (1 - depth) * 0.35 - 0.1;
      c.set(x, y, v > 0.45 ? g[0] : v > 0.15 ? g[1] : v > -0.2 ? g[2] : v > -0.5 ? g[3] : g[4]);
    }
  }

  const out = document.createElement('canvas');
  out.width = BACKDROP_W;
  out.height = BACKDROP_H;
  const ctx = out.getContext('2d')!;
  ctx.putImageData(new ImageData(c.data, c.w, c.h), 0, 0);

  // Nuages
  for (let i = 0; i < d.clouds.count; i++) {
    const p = cloud(d.clouds.color, i);
    blit(ctx, p, 30 + ((i * 97) % 200), 14 + ((i * 23) % 26));
  }
  // Voûte de la forêt : rangées de cimes sombres puis plus claires.
  if (d.canopy) {
    const pal = { ...THEMES.foret, round: true };
    for (let row = 0; row < 2; row++) {
      for (let x = -10 + row * 14; x < BACKDROP_W + 20; x += 28) {
        blit(ctx, treeProp(pal, (x + row) % 3, { pitch: 8, scale: 0.9 }), x, HORIZON + 4 + row * 2, row === 0 ? '#14281c' : '#203c24');
      }
    }
  }
  // Silhouettes et décors à l'horizon
  d.scenery.forEach(([kind, x, scale], i) => {
    blit(ctx, sceneryProp(kind, theme, { pitch: 8, scale }, i % 3), x, HORIZON + 4);
  });
  // Brins d'herbe dont la taille croît vers le premier plan.
  const blade = { l: `rgb(${g[0].join(',')})`, d: `rgb(${g[4].join(',')})` };
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(((i * 137) % 256) + noise3(i, 3, 3) * 8);
    const y = Math.floor(groundTop + 4 + ((i * 53) % (BACKDROP_H - groundTop - 6)));
    const big = y > 110;
    ctx.fillStyle = blade.d;
    ctx.fillRect(x, y, 1, big ? 2 : 1);
    ctx.fillRect(x + 2, y, 1, big ? 2 : 1);
    ctx.fillStyle = blade.l;
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillRect(x + 2, y - 1, 1, 1);
    if (big) ctx.fillRect(x + 1, y - 2, 1, 2);
  }
  // Socles
  const foe = platform(d.platform.top, d.platform.rim, 38);
  const player = platform(d.platform.top, d.platform.rim, 50);
  blit(ctx, foe, 186, 82);
  blit(ctx, player, 66, 138);
  cache.set(theme, out);
  return out;
}

/** Silhouette en contre-jour : aplat sombre et liseré lumineux du côté du soleil. */
function silhouette(prop: Prop, color: string, rim: string, sunSide: -1 | 1): HTMLCanvasElement {
  const { img } = prop;
  const w = img.width;
  const h = img.height;
  const src = prop.data;
  const out = new Canvas(w, h);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  const body = hexRgb(color);
  const lit = hexRgb(rim);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      out.set(x, y, !solid(x, y - 1) || !solid(x + sunSide, y) ? lit : body);
    }
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(out.data, w, h), 0, 0);
  return c;
}

let title: HTMLCanvasElement | null = null;

/** Paysage sahélien au coucher du soleil pour l'écran titre (256×192). */
export function titleBackdrop(): HTMLCanvasElement {
  if (title) return title;
  const W = 256;
  const H = 192;
  const c = new Canvas(W, H);
  const groundY = 150;
  dithered(c, 0, groundY, ['#1e1838', '#2c1c44', '#48224a', '#6e2a4c', '#9a3a46', '#c25040', '#de6c3e', '#ee8c46', '#f6ae5a', '#fad07a']);
  // Soleil et halo tramé
  const sx = W / 2;
  const sy = 120;
  const sun = [hexRgb('#fff4c8'), hexRgb('#ffe08a'), hexRgb('#fcc468'), hexRgb('#f8ac58')];
  for (let y = 60; y < groundY; y++) {
    for (let x = 40; x < W - 40; x++) {
      const d = Math.hypot(x - sx, (y - sy) * 1.05);
      const haze = (y - 92) % 7 === 0 && y > 96 && d < 34;
      if (d < 26) c.set(x, y, haze ? sun[2] : d < 18 ? sun[0] : sun[1]);
      else if (d < 34) c.set(x, y, haze || (d - 26) / 8 > bayer(x, y) ? sun[3] : sun[1]);
      else if (d < 52 && (d - 34) / 18 < bayer(x, y) * 0.9) c.set(x, y, sun[3]);
    }
  }
  // Oiseaux
  for (const [bx, by] of [[60, 40], [70, 46], [182, 30], [190, 36], [176, 38]] as const) {
    for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] as const) c.set(bx + dx, by + dy, hexRgb('#2a1428'));
  }
  // Falaise de Bandiagara à gauche, arêtes rougeoyantes.
  const cliff = hexRgb('#2e1620');
  const cliffLit = hexRgb('#b04a38');
  const strata = hexRgb('#3a1c24');
  for (let x = 0; x < 132; x++) {
    const top = Math.round(groundY - (44 + noise3(x * 0.05, 1, 1) * 6 + noise3(x * 0.2, 2, 2) * 2 - Math.max(0, x - 86) * 1.1));
    for (let y = top; y < groundY; y++) c.set(x, y, y <= top + (x > 70 ? 1 : 0) ? cliffLit : Math.sin(y * 0.7 + noise3(x * 0.06, y * 0.06, 4) * 2) > 0.85 ? strata : cliff);
  }
  // Sol
  dithered(c, groundY, H, ['#2a1418', '#1c0e12']);
  const ctx = document.createElement('canvas');
  ctx.width = W;
  ctx.height = H;
  const g = ctx.getContext('2d')!;
  g.putImageData(new ImageData(c.data, W, H), 0, 0);
  const pv = { pitch: 6, scale: 0.75 };
  for (const [x, y] of [[26, 108], [42, 112], [58, 109]] as const) g.drawImage(silhouette(granaryProp(pv), '#2a1210', '#c85a3a', 1), x - 9, y - 18);
  const baobab = baobabProp({ pitch: 6, scale: 1 });
  g.drawImage(silhouette(baobab, '#24100c', '#e07a40', -1), 214 - baobab.ax, groundY + 2 - baobab.ay);
  const acacia = treeProp({ ...THEMES.savane, round: false }, 1, { pitch: 6, scale: 0.8 });
  g.drawImage(silhouette(acacia, '#2a1210', '#e8864a', -1), 168 - acacia.ax, groundY + 1 - acacia.ay);
  // Herbes sèches au premier plan
  g.fillStyle = '#140a0c';
  for (let i = 0; i < 90; i++) {
    const x = (i * 59) % W;
    const hgt = 2 + ((i * 7) % 4);
    g.fillRect(x, groundY - hgt + 1, 1, hgt);
  }
  title = ctx;
  return ctx;
}
