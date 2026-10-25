// Sculpteur de volumes pour les sprites de Jinémon.
//
// Chaque créature est modelée en 3D avec des primitives à champ de distance
// (sphères, ellipsoïdes, cônes arrondis, boîtes arrondies) fondues entre elles
// par union lisse : cou, épaules et membres se raccordent comme de la chair.
// Le volume est rendu par lancer de rayons orthographique, puis converti en
// pixel art : tons quantifiés et décalés en teinte (ombres froides, lumières
// chaudes), occlusion ambiante dans les creux, motifs posés sur le volume
// (taches, rayures, écailles), traits intérieurs aux ruptures de profondeur
// et contour sombre teinté par la matière voisine.
//
// Repère du modèle : x vers l'arrière de la créature (elle regarde vers -x),
// y vers le haut (le sol est en y = 0), z vers son flanc gauche.

export type V3 = [number, number, number];

export interface Pattern {
  kind: 'taches' | 'rayures' | 'ecailles' | 'craquelures' | 'plumes';
  color: string;
  /** Taille du motif en unités du modèle. */
  scale: number;
  /** Proportion couverte (0 à 1). */
  amount?: number;
  /** Axe des rayures (0 = x, 1 = y, 2 = z). */
  axis?: 0 | 1 | 2;
}

export interface MaterialDef {
  color: string;
  /** Ventre clair : couleur des faces tournées vers le bas. */
  belly?: string;
  pattern?: Pattern;
  /** Matière lumineuse (flamme, lueur) : cœur clair, pas d'ombre. */
  glow?: boolean;
  /** Reflet spéculaire (métal, carapace, gemme). */
  gloss?: boolean;
  /** Pelage : frontières de tons irrégulières (0 à 1). */
  fur?: number;
  /** Trait sombre aux frontières avec les autres matières (plaques, armures). */
  edge?: boolean;
  /** Pas de contour sombre autour (nuages, brume). */
  bare?: boolean;
  /** Ton le plus sombre autorisé (0 = reflet … 4 = ombre profonde). */
  maxTone?: number;
}

export interface PrimOpts {
  /** Rayon de fusion avec ce qui précède (0 = jonction franche). */
  k?: number;
  /** Relief bruité de la surface (fourrure, roche, flammes). */
  amp?: number;
  freq?: number;
  /** Étirement du bruit le long de y (flammes, poils tombants). */
  stretch?: number;
}

// ── Bruit ────────────────────────────────────────────────────────────────

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Bruit de valeur 3D lissé, dans [-1, 1]. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const a = hash3(xi, yi, zi);
  const b = hash3(xi + 1, yi, zi);
  const c = hash3(xi, yi + 1, zi);
  const d = hash3(xi + 1, yi + 1, zi);
  const e = hash3(xi, yi, zi + 1);
  const f = hash3(xi + 1, yi, zi + 1);
  const g = hash3(xi, yi + 1, zi + 1);
  const h = hash3(xi + 1, yi + 1, zi + 1);
  const x1 = a + (b - a) * u;
  const x2 = c + (d - c) * u;
  const x3 = e + (f - e) * u;
  const x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v;
  const y2 = x3 + (x4 - x3) * v;
  return (y1 + (y2 - y1) * w) * 2 - 1;
}

let cellF1 = 0;
let cellF2 = 0;
/** Bruit cellulaire : distances au premier et au second germe (cellF1, cellF2). */
function cells(x: number, y: number, z: number): void {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let f1 = 9;
  let f2 = 9;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        const cx = xi + i;
        const cy = yi + j;
        const cz = zi + k;
        const px = cx + hash3(cx, cy, cz);
        const py = cy + hash3(cx + 17, cy, cz);
        const pz = cz + hash3(cx, cy + 31, cz);
        const d = Math.hypot(px - x, py - y, pz - z);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) f2 = d;
      }
    }
  }
  cellF1 = f1;
  cellF2 = f2;
}

// ── Couleurs : rampes de tons décalées en teinte ─────────────────────────

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToRgb([h, s, l]: RGB): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Rapproche une teinte d'une teinte cible d'au plus `deg` degrés. */
function hueToward(h: number, target: number, deg: number): number {
  let diff = ((target - h + 540) % 360) - 180;
  if (Math.abs(diff) < deg) return target;
  diff = Math.sign(diff) * deg;
  return h + diff;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Éclaircit en réchauffant (amt > 0) ou assombrit en refroidissant (amt < 0), comme les rampes de tons. */
export function shiftColor(hex: string, amt: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const k = Math.min(1, s * 1.6);
  if (amt >= 0) return hslToRgb([hueToward(h, 52, 40 * amt * k), s * (1 - amt * 0.3), l + (1 - l) * amt]);
  return hslToRgb([hueToward(h, 252, -50 * amt * k), clamp01(s * (1 - amt * 0.2)), l * (1 + amt)]);
}

function rgbToHsv([r, g, b]: RGB): RGB {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, max === 0 ? 0 : d / max, max];
}

function hsvToRgb([h, s, v]: RGB): RGB {
  const c = v * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Cinq tons (reflet → ombre profonde) puis deux couleurs de trait (clair, sombre).
 * Calcul en TSV : on assombrit la valeur en saturant un peu et en glissant la
 * teinte vers le bleu ; les reflets se désaturent et glissent vers le jaune.
 */
function buildRamp(hex: string): RGB[] {
  const [h, s, v] = rgbToHsv(hexToRgb(hex));
  // Les gris gardent leur teinte : on décale moins.
  const k = Math.min(1, s * 2);
  const warm = 52;
  const cool = 252;
  return [
    hsvToRgb([hueToward(h, warm, 14 * k), s * 0.55, v + (1 - v) * 0.65]),
    hsvToRgb([hueToward(h, warm, 6 * k), s * 0.8, v + (1 - v) * 0.35]),
    [...hexToRgb(hex)] as RGB,
    hsvToRgb([hueToward(h, cool, 10 * k), clamp01(s * 1.12 + 0.05), v * 0.78]),
    hsvToRgb([hueToward(h, cool, 20 * k), clamp01(s * 1.2 + 0.1), v * 0.58]),
    hsvToRgb([hueToward(h, cool, 24 * k), clamp01(s * 1.15 + 0.12), v * 0.46]),
    hsvToRgb([hueToward(h, cool, 30 * k), clamp01(s * 0.9 + 0.2), Math.min(0.24, v * 0.3) + 0.04]),
  ];
}

const ramps = new Map<string, RGB[]>();
function ramp(hex: string): RGB[] {
  let r = ramps.get(hex);
  if (!r) {
    r = buildRamp(hex);
    ramps.set(hex, r);
  }
  return r;
}

function glowRamp(hex: string): RGB[] {
  const key = `g${hex}`;
  const cached = ramps.get(key);
  if (cached) return cached;
  const [h, s] = rgbToHsl(hexToRgb(hex));
  const r: RGB[] = [
    hslToRgb([hueToward(h, 55, 40), 0.6, 0.95]),
    hslToRgb([hueToward(h, 50, 22), Math.max(s, 0.85), 0.78]),
    hexToRgb(hex),
    hslToRgb([hueToward(h, 0, 18), Math.max(s, 0.8), 0.45]),
    hslToRgb([hueToward(h, 340, 30), 0.7, 0.32]),
    hslToRgb([hueToward(h, 340, 30), 0.7, 0.32]),
    hslToRgb([hueToward(h, 330, 40), 0.65, 0.2]),
  ];
  ramps.set(key, r);
  return r;
}

// ── Primitives ───────────────────────────────────────────────────────────

type M3 = [number, number, number, number, number, number, number, number, number];

/** Matrice de rotation (degrés) : inclinaison autour de z, puis lacet y, puis roulis x. */
function rotation(az: number, ay: number, ax: number): M3 {
  const [cz, sz] = [Math.cos((az * Math.PI) / 180), Math.sin((az * Math.PI) / 180)];
  const [cy, sy] = [Math.cos((ay * Math.PI) / 180), Math.sin((ay * Math.PI) / 180)];
  const [cx, sx] = [Math.cos((ax * Math.PI) / 180), Math.sin((ax * Math.PI) / 180)];
  // Rx · Ry · Rz
  const rz: M3 = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const ry: M3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rx: M3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  return mul(rx, mul(ry, rz));
}

function mul(a: M3, b: M3): M3 {
  const r = new Array(9).fill(0) as M3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

abstract class Prim {
  /** Pour une peinture : seules les matières créées avant elle sont recouvertes. */
  under = Infinity;
  k = 0;
  amp = 0;
  freq = 0.3;
  stretch = 1;
  cx = 0;
  cy = 0;
  cz = 0;
  br = 0;
  constructor(readonly mat: number) {}
  abstract d(x: number, y: number, z: number): number;
}

class Sphere extends Prim {
  constructor(
    mat: number,
    private readonly x: number,
    private readonly y: number,
    private readonly z: number,
    private readonly r: number,
  ) {
    super(mat);
    [this.cx, this.cy, this.cz, this.br] = [x, y, z, r];
  }
  d(x: number, y: number, z: number): number {
    return Math.hypot(x - this.x, y - this.y, z - this.z) - this.r;
  }
}

class Ellipsoid extends Prim {
  private readonly m: M3;
  constructor(
    mat: number,
    c: V3,
    private readonly r: V3,
    rot: V3,
  ) {
    super(mat);
    // Inverse (transposée) : modèle → repère local.
    const m = rotation(rot[0], rot[1], rot[2]);
    this.m = [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
    [this.cx, this.cy, this.cz] = c;
    this.br = Math.max(r[0], r[1], r[2]);
  }
  d(x: number, y: number, z: number): number {
    const m = this.m;
    const px = x - this.cx;
    const py = y - this.cy;
    const pz = z - this.cz;
    const lx = (m[0] * px + m[1] * py + m[2] * pz) / this.r[0];
    const ly = (m[3] * px + m[4] * py + m[5] * pz) / this.r[1];
    const lz = (m[6] * px + m[7] * py + m[8] * pz) / this.r[2];
    const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const k1 = Math.sqrt((lx * lx) / (this.r[0] * this.r[0]) + (ly * ly) / (this.r[1] * this.r[1]) + (lz * lz) / (this.r[2] * this.r[2]));
    return k1 === 0 ? -Math.min(this.r[0], this.r[1], this.r[2]) : (k0 * (k0 - 1)) / k1;
  }
}

/** Cône arrondi entre deux sphères de rayons différents (Inigo Quilez). */
class RoundCone extends Prim {
  private readonly ba: V3;
  private readonly l2: number;
  private readonly rr: number;
  private readonly a2: number;
  private readonly il2: number;
  constructor(
    mat: number,
    private readonly a: V3,
    b: V3,
    private readonly r1: number,
    private readonly r2: number,
  ) {
    super(mat);
    this.ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    this.l2 = Math.max(1e-6, this.ba[0] ** 2 + this.ba[1] ** 2 + this.ba[2] ** 2);
    this.rr = r1 - r2;
    this.a2 = this.l2 - this.rr * this.rr;
    this.il2 = 1 / this.l2;
    this.cx = (a[0] + b[0]) / 2;
    this.cy = (a[1] + b[1]) / 2;
    this.cz = (a[2] + b[2]) / 2;
    this.br = Math.sqrt(this.l2) / 2 + Math.max(r1, r2);
  }
  d(x: number, y: number, z: number): number {
    const [bx, by, bz] = this.ba;
    const pax = x - this.a[0];
    const pay = y - this.a[1];
    const paz = z - this.a[2];
    const l2 = this.l2;
    const yy = pax * bx + pay * by + paz * bz;
    const zz = yy - l2;
    const qx = pax * l2 - bx * yy;
    const qy = pay * l2 - by * yy;
    const qz = paz * l2 - bz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(this.rr) * this.rr * this.rr * x2;
    if (Math.sign(zz) * this.a2 * z2 > k) return Math.sqrt(x2 + z2) * this.il2 - this.r2;
    if (Math.sign(yy) * this.a2 * y2 < k) return Math.sqrt(x2 + y2) * this.il2 - this.r1;
    return (Math.sqrt(x2 * this.a2 * this.il2) + yy * this.rr) * this.il2 - this.r1;
  }
}

/** Cône tronqué à bases plates (murs, toits, margelles), arrondi de `r`. */
class CappedCone extends Prim {
  private readonly a: V3;
  private readonly ba: V3;
  private readonly baba: number;
  private readonly ra: number;
  private readonly rb: number;
  constructor(
    mat: number,
    a: V3,
    b: V3,
    ra: number,
    rb: number,
    private readonly r: number,
  ) {
    super(mat);
    // L'arrondi gonfle la forme : on raccourcit l'axe d'autant pour garder la hauteur voulue.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    const k = Math.min(r, len / 2 - 1e-3) / len;
    const d: V3 = [(b[0] - a[0]) * k, (b[1] - a[1]) * k, (b[2] - a[2]) * k];
    this.a = [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
    b = [b[0] - d[0], b[1] - d[1], b[2] - d[2]];
    this.ba = [b[0] - this.a[0], b[1] - this.a[1], b[2] - this.a[2]];
    this.baba = Math.max(1e-6, this.ba[0] ** 2 + this.ba[1] ** 2 + this.ba[2] ** 2);
    this.ra = Math.max(0, ra - r);
    this.rb = Math.max(0, rb - r);
    this.cx = (a[0] + b[0]) / 2;
    this.cy = (a[1] + b[1]) / 2;
    this.cz = (a[2] + b[2]) / 2;
    this.br = Math.sqrt(this.baba) / 2 + Math.max(ra, rb) + r;
  }
  d(x: number, y: number, z: number): number {
    const { ba, baba, ra, rb } = this;
    const pax = x - this.a[0];
    const pay = y - this.a[1];
    const paz = z - this.a[2];
    const rba = rb - ra;
    const papa = pax * pax + pay * pay + paz * paz;
    const paba = (pax * ba[0] + pay * ba[1] + paz * ba[2]) / baba;
    const xx = Math.sqrt(Math.max(0, papa - paba * paba * baba));
    const cax = Math.max(0, xx - (paba < 0.5 ? ra : rb));
    const cay = Math.abs(paba - 0.5) - 0.5;
    const k = rba * rba + baba;
    const f = Math.max(0, Math.min(1, (rba * (xx - ra) + paba * baba) / k));
    const cbx = xx - ra - f * rba;
    const cby = paba - f;
    const sgn = cbx < 0 && cay < 0 ? -1 : 1;
    return sgn * Math.sqrt(Math.min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba)) - this.r;
  }
}

class RoundBox extends Prim {
  private readonly m: M3;
  constructor(
    mat: number,
    c: V3,
    private readonly h: V3,
    private readonly r: number,
    rot: V3,
  ) {
    super(mat);
    const m = rotation(rot[0], rot[1], rot[2]);
    this.m = [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
    [this.cx, this.cy, this.cz] = c;
    this.br = Math.hypot(h[0], h[1], h[2]) + r;
  }
  d(x: number, y: number, z: number): number {
    const m = this.m;
    const px = x - this.cx;
    const py = y - this.cy;
    const pz = z - this.cz;
    const qx = Math.abs(m[0] * px + m[1] * py + m[2] * pz) - this.h[0];
    const qy = Math.abs(m[3] * px + m[4] * py + m[5] * pz) - this.h[1];
    const qz = Math.abs(m[6] * px + m[7] * py + m[8] * pz) - this.h[2];
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
    return outside + Math.min(Math.max(qx, qy, qz), 0) - this.r;
  }
}

// ── Rendu ────────────────────────────────────────────────────────────────

export interface View {
  /** Rotation de la créature autour de la verticale (degrés). */
  yaw: number;
  /** Inclinaison de la caméra vers le bas (degrés). */
  pitch: number;
}

export interface RenderOpts {
  size: number;
  /** Hauteur de l'image si elle n'est pas carrée. */
  height?: number;
  /** Pixels par unité du modèle. */
  scale: number;
  /** Ligne du sprite où tombe le sol (y = 0). */
  ground: number;
  /** Abscisse (unités caméra) placée au centre du sprite. */
  center?: number;
  view: View;
}

export interface Projected {
  x: number;
  y: number;
  /** L'ancre est-elle à la surface visible (non masquée) ? */
  visible: boolean;
  /** Orientation de la surface vers la caméra (0 = rasante, 1 = de face). */
  facing: number;
}

export class SculptImage {
  readonly rgba: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    readonly w: number,
    readonly h: number,
    /** Profondeur caméra par pixel (−Infinity = vide). */
    readonly depth: Float32Array,
    readonly facingBuf: Float32Array,
    private readonly toCam: (p: V3) => V3,
    readonly opts: RenderOpts,
  ) {
    this.rgba = new Uint8ClampedArray(w * h * 4);
  }

  project(p: V3, tolerance = 2.5): Projected {
    const [cx, cy, cz] = this.toCam(p);
    const x = Math.floor(this.w / 2 + (cx - (this.opts.center ?? 0)) * this.opts.scale);
    const y = Math.floor(this.opts.ground - cy * this.opts.scale);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return { x, y, visible: false, facing: 0 };
    const i = y * this.w + x;
    const visible = this.depth[i] !== -Infinity && this.depth[i] - cz < tolerance;
    return { x, y, visible, facing: this.facingBuf[i] };
  }

  put(x: number, y: number, hex: string | RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = typeof hex === 'string' ? hexToRgb(hex) : hex;
    const i = (y * this.w + x) * 4;
    this.rgba[i] = r;
    this.rgba[i + 1] = g;
    this.rgba[i + 2] = b;
    this.rgba[i + 3] = 255;
  }

  filled(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.rgba[(y * this.w + x) * 4 + 3] > 0;
  }
}

const BAYER = [0, 0.5, 0.75, 0.25];

export class Sculpt {
  private readonly mats: MaterialDef[] = [];
  private readonly prims: Prim[] = [];
  private readonly paints: Prim[] = [];

  material(def: MaterialDef): number {
    this.mats.push(def);
    return this.mats.length - 1;
  }

  private add<T extends Prim>(p: T, o: PrimOpts = {}, paint = false): T {
    p.k = o.k ?? 0;
    p.amp = o.amp ?? 0;
    p.freq = o.freq ?? 0.3;
    p.stretch = o.stretch ?? 1;
    p.br += p.amp;
    (paint ? this.paints : this.prims).push(p);
    return p;
  }

  sphere(c: V3, r: number, mat: number, o?: PrimOpts): void {
    this.add(new Sphere(mat, c[0], c[1], c[2], r), o);
  }

  ellipsoid(c: V3, r: V3, mat: number, o: PrimOpts & { rot?: V3 } = {}): void {
    this.add(new Ellipsoid(mat, c, r, o.rot ?? [0, 0, 0]), o);
  }

  cone(a: V3, b: V3, ra: number, rb: number, mat: number, o?: PrimOpts): void {
    this.add(new RoundCone(mat, a, b, ra, rb), o);
  }

  /** Cône tronqué à bases plates entre `a` et `b` (rayons `ra`, `rb`), bords arrondis de `round`. */
  capped(a: V3, b: V3, ra: number, rb: number, mat: number, o: PrimOpts & { round?: number } = {}): void {
    this.add(new CappedCone(mat, a, b, ra, rb, o.round ?? 0.5), o);
  }

  box(c: V3, half: V3, round: number, mat: number, o: PrimOpts & { rot?: V3 } = {}): void {
    this.add(new RoundBox(mat, c, half, round, o.rot ?? [0, 0, 0]), o);
  }

  /** Chaîne de cônes arrondis (cou, queue, cornes, pattes). */
  tube(points: V3[], radii: number[], mat: number, o: PrimOpts = {}): void {
    for (let i = 0; i + 1 < points.length; i++) {
      this.cone(points[i], points[i + 1], radii[i], radii[i + 1], mat, i === 0 ? o : { ...o, k: Math.min(o.k ?? 0, 0.6) });
    }
  }

  /** Volume de peinture : change la matière sans toucher à la forme (sauf les détails déjà posés par-dessus). */
  paint(c: V3, r: V3, mat: number, rot: V3 = [0, 0, 0]): void {
    const p = this.add(new Ellipsoid(mat, c, r, rot), {}, true);
    p.under = this.mats.length - 1;
  }

  // Champ de distance de la scène (union lisse dans l'ordre de création).
  /** Parties retenues pour le rayon en cours (celles qui se projettent près de lui). */
  private active: Prim[] = [];
  /** Marge de sélection des parties autour d'un rayon (unités). */
  private margin = Infinity;

  private map(x: number, y: number, z: number): number {
    return this.mapList(this.prims, x, y, z);
  }

  private mapList(prims: Prim[], x: number, y: number, z: number): number {
    let d = 1e9;
    for (let i = 0; i < prims.length; i++) {
      const p = prims[i];
      const bx = x - p.cx;
      const by = y - p.cy;
      const bz = z - p.cz;
      const bound = Math.sqrt(bx * bx + by * by + bz * bz) - p.br;
      if (bound > d + p.k) continue;
      let di = p.d(x, y, z);
      if (p.amp > 0 && di < d + p.k + p.amp) di += p.amp * noise3(x * p.freq, (y * p.freq) / p.stretch, z * p.freq);
      if (p.k > 0) {
        const h = Math.max(p.k - Math.abs(d - di), 0) / p.k;
        d = Math.min(d, di) - h * h * p.k * 0.25;
      } else if (di < d) d = di;
    }
    return d;
  }

  private materialAt(x: number, y: number, z: number, prims: Prim[]): number {
    let best = 1e9;
    let mat = 0;
    for (const p of prims) {
      const bx = x - p.cx;
      const by = y - p.cy;
      const bz = z - p.cz;
      if (Math.sqrt(bx * bx + by * by + bz * bz) - p.br > best + 0.15) continue;
      let di = p.d(x, y, z);
      if (p.amp > 0) di += p.amp * noise3(x * p.freq, (y * p.freq) / p.stretch, z * p.freq);
      // Les parties ajoutées plus tard l'emportent à égalité (détails par-dessus).
      if (di <= best + 0.15) {
        best = Math.min(best, di);
        mat = p.mat;
      }
    }
    for (const p of this.paints) if (p.d(x, y, z) < 0 && mat < p.under && !this.mats[mat].glow && !this.mats[mat].gloss) mat = p.mat;
    return mat;
  }

  private camera(view: View) {
    // Modèle → caméra : lacet puis tangage.
    const R = mul(rotation(0, 0, view.pitch), rotation(0, view.yaw, 0));
    const toCam = (p: V3): V3 => [
      R[0] * p[0] + R[1] * p[1] + R[2] * p[2],
      R[3] * p[0] + R[4] * p[1] + R[5] * p[2],
      R[6] * p[0] + R[7] * p[1] + R[8] * p[2],
    ];
    // Caméra → modèle : transposée.
    const toModel = (x: number, y: number, z: number): V3 => [
      R[0] * x + R[3] * y + R[6] * z,
      R[1] * x + R[4] * y + R[7] * z,
      R[2] * x + R[5] * y + R[8] * z,
    ];
    // Boîte englobante de la scène.
    const lo: V3 = [1e9, 1e9, 1e9];
    const hi: V3 = [-1e9, -1e9, -1e9];
    for (const p of this.prims) {
      const c = [p.cx, p.cy, p.cz];
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a], c[a] - p.br - 1);
        hi[a] = Math.max(hi[a], c[a] + p.br + 1);
      }
    }
    const zFar = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) + Math.hypot(...lo) + Math.hypot(...hi);
    const dir = toModel(0, 0, -1);
    /** Lance un rayon depuis le point (sx, sy) de l'écran ; renvoie le point touché ou null. */
    const cast = (sx: number, sy: number): V3 | null => {
      const o = toModel(sx, sy, zFar);
      // Intersection rayon / boîte (méthode des dalles).
      let t0 = 0;
      let t1 = zFar * 2;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(dir[a]) < 1e-9) {
          if (o[a] < lo[a] || o[a] > hi[a]) return null;
          continue;
        }
        let ta = (lo[a] - o[a]) / dir[a];
        let tb = (hi[a] - o[a]) / dir[a];
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
      }
      if (t0 > t1) return null;
      let t = t0;
      // Les parties écartées sont à plus de `margin` du rayon : le pas ne doit pas dépasser cette marge.
      const maxStep = this.margin * 0.9;
      const list = this.margin === Infinity ? this.prims : this.active;
      for (let step = 0; step < 96 && t <= t1; step++) {
        const d = this.mapList(list, o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t);
        if (d < 0.04) return [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t];
        t += Math.min(maxStep, Math.max(d * 0.8, 0.02));
      }
      return null;
    };
    return { toCam, cast, lo, hi };
  }

  /** Emprise de la silhouette à l'écran (unités du modèle), par un lancer grossier. */
  measure(view: View): { x0: number; x1: number; y0: number; y1: number } {
    const { toCam, cast, lo, hi } = this.camera(view);
    let [ax, bx, ay, by] = [1e9, -1e9, 1e9, -1e9];
    for (const x of [lo[0], hi[0]])
      for (const y of [lo[1], hi[1]])
        for (const z of [lo[2], hi[2]]) {
          const [cx, cy] = toCam([x, y, z]);
          [ax, bx, ay, by] = [Math.min(ax, cx), Math.max(bx, cx), Math.min(ay, cy), Math.max(by, cy)];
        }
    const N = 30;
    const step = Math.max(bx - ax, by - ay) / N;
    let [x0, x1, y0, y1] = [1e9, -1e9, 1e9, -1e9];
    for (let sy = ay; sy <= by; sy += step) {
      for (let sx = ax; sx <= bx; sx += step) {
        if (!cast(sx, sy)) continue;
        [x0, x1, y0, y1] = [Math.min(x0, sx), Math.max(x1, sx), Math.min(y0, sy), Math.max(y1, sy)];
      }
    }
    const m = step * 0.6;
    return { x0: x0 - m, x1: x1 + m, y0: y0 - m, y1: y1 + m };
  }

  render(opts: RenderOpts): SculptImage {
    const { size, scale, ground, view } = opts;
    const w = size;
    const h = opts.height ?? size;
    const center = opts.center ?? 0;
    const { toCam, cast } = this.camera(view);

    const n = w * h;
    const depth = new Float32Array(n).fill(-Infinity);
    const facing = new Float32Array(n);
    const keys = new Int32Array(n).fill(-1); // indice de couleur
    const tones = new Uint8Array(n);
    const palette: string[] = [];
    const glowKeys = new Set<number>();
    const edgeMat = new Int16Array(n).fill(-1);
    const bareKeys = new Set<number>();
    const keyOf = (hex: string, glow: boolean, bare: boolean) => {
      const name = `${glow ? 'g' : bare ? 'b' : 'n'}${hex}`;
      let i = palette.indexOf(name);
      if (i < 0) {
        palette.push(name);
        i = palette.length - 1;
        if (glow) glowKeys.add(i);
        if (bare) bareKeys.add(i);
      }
      return i;
    };

    const L = (() => {
      const v = [-0.55, 0.62, 0.56];
      const m = Math.hypot(v[0], v[1], v[2]);
      return v.map((c) => c / m);
    })();
    const pixel = 1 / scale;
    // Projection des sphères englobantes : chaque rayon ne teste que les parties proches.
    const screen = new Float64Array(this.prims.length * 3);
    let maxK = 0;
    this.prims.forEach((p, k) => {
      const [cx, cy] = toCam([p.cx, p.cy, p.cz]);
      screen[k * 3] = cx;
      screen[k * 3 + 1] = cy;
      screen[k * 3 + 2] = p.br;
      maxK = Math.max(maxK, p.k);
    });
    const margin = maxK + 2;
    const active = this.active;
    this.margin = margin;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const sx = (px + 0.5 - w / 2) * pixel + center;
        const sy = (ground - py - 0.5) * pixel;
        active.length = 0;
        for (let k = 0; k < this.prims.length; k++) {
          const dx = sx - screen[k * 3];
          const dy = sy - screen[k * 3 + 1];
          const r = screen[k * 3 + 2] + margin;
          if (dx * dx + dy * dy < r * r) active.push(this.prims[k]);
        }
        if (!active.length) continue;
        const hitPoint = cast(sx, sy);
        if (!hitPoint) continue;
        const [x, y, z] = hitPoint;
        const i = py * w + px;

        // Normale (tétraèdre) puis passage en repère caméra.
        const e = 0.12;
        const d1 = this.mapList(active, x + e, y - e, z - e);
        const d2 = this.mapList(active, x - e, y - e, z + e);
        const d3 = this.mapList(active, x - e, y + e, z - e);
        const d4 = this.mapList(active, x + e, y + e, z + e);
        let nx = d1 - d2 - d3 + d4;
        let ny = -d1 - d2 + d3 + d4;
        let nz = -d1 + d2 - d3 + d4;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const [cnx, cny, cnz] = toCam([nx, ny, nz]);

        // Occlusion ambiante : creux entre les membres, sous le ventre, au cou.
        let occ = 0;
        let sca = 1;
        for (let k = 1; k <= 4; k++) {
          const hk = 0.4 + 1.75 * k;
          occ += (hk - this.map(x + nx * hk, y + ny * hk, z + nz * hk)) * sca;
          sca *= 0.7;
        }
        const ao = clamp01(1 - occ * 0.06);

        const matIndex = this.materialAt(x, y, z, active);
        const mat = this.mats[matIndex];
        let color = mat.color;
        if (mat.belly && ny < -0.2 + 0.25 * noise3(x * 0.4, y * 0.4, z * 0.4)) color = mat.belly;
        if (mat.pattern && this.patternAt(mat.pattern, x, y, z)) color = mat.pattern.color;
        keys[i] = keyOf(color, !!mat.glow, !!mat.bare);
        if (mat.edge) edgeMat[i] = matIndex;
        depth[i] = toCam([x, y, z])[2];
        facing[i] = cnz;

        let tone: number;
        if (mat.glow) {
          const c = cnz + 0.15 * noise3(x * 0.5, y * 0.25, z * 0.5);
          tone = c > 0.8 ? 0 : c > 0.55 ? 1 : c > 0.3 ? 2 : 3;
        } else {
          const ndl = cnx * L[0] + cny * L[1] + cnz * L[2];
          let lum = clamp01((ndl + 0.25) / 1.25) * (0.45 + 0.55 * ao);
          if (mat.fur) lum += mat.fur * 0.14 * noise3(x * 0.55, y * 0.3, z * 0.55);
          lum += (BAYER[(py & 1) * 2 + (px & 1)] - 0.375) * 0.04;
          tone = lum > 0.84 ? 0 : lum > 0.6 ? 1 : lum > 0.36 ? 2 : lum > 0.17 ? 3 : 4;
          // Lumière réfléchie par le sol sur les bords dans l'ombre.
          if (tone === 4 && cny < -0.25 && cnz < 0.45 && ao > 0.55) tone = 3;
          if (mat.gloss) {
            // Reflet : direction de la lumière réfléchie vers la caméra.
            const rz = 2 * ndl * cnz - L[2];
            if (rz > 0.93) tone = 0;
          }
        }
        tones[i] = Math.min(tone, mat.maxTone ?? 4);
      }
    }

    this.margin = Infinity;

    // Nettoyage : pixels isolés retirés, encoches comblées.
    const has = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && keys[y * w + x] >= 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = py * w + px;
        const around = +has(px - 1, py) + +has(px + 1, py) + +has(px, py - 1) + +has(px, py + 1);
        if (keys[i] >= 0 && around === 0) keys[i] = -1;
        else if (keys[i] < 0 && around >= 3) {
          const j = has(px, py - 1) ? i - w : has(px - 1, py) ? i - 1 : i + 1;
          keys[i] = keys[j];
          tones[i] = Math.min(4, tones[j] + 1);
          depth[i] = depth[j];
          facing[i] = facing[j];
        }
      }
    }

    // Amas de tons : un pixel isolé prend le ton dominant de ses voisins.
    for (let py = 1; py < h - 1; py++) {
      for (let px = 1; px < w - 1; px++) {
        const i = py * w + px;
        if (keys[i] < 0) continue;
        const counts = [0, 0, 0, 0, 0];
        let same = 0;
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          if (keys[j] !== keys[i] || Math.abs(depth[j] - depth[i]) > 2) continue;
          counts[tones[j]]++;
          if (tones[j] === tones[i]) same++;
        }
        if (same > 0) continue;
        const top = counts.indexOf(Math.max(...counts));
        if (counts[top] >= 3) tones[i] = top;
      }
    }

    const img = new SculptImage(w, h, depth, facing, toCam, opts);
    const colorOf = (key: number, tone: number): RGB => {
      const name = palette[key];
      return glowKeys.has(key) ? glowRamp(name.slice(1))[tone] : ramp(name.slice(1))[tone];
    };
    // Seuil de rupture de profondeur pour les traits intérieurs (en unités).
    const gap = 3.2;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = py * w + px;
        if (keys[i] < 0) continue;
        let rgb = colorOf(keys[i], tones[i]);
        // Trait intérieur : un voisin passe nettement devant ce pixel.
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!has(px + dx, py + dy)) continue;
          const j = (py + dy) * w + px + dx;
          if (depth[j] - depth[i] > gap && !bareKeys.has(keys[j])) {
            rgb = colorOf(keys[j], glowKeys.has(keys[j]) ? 4 : 5);
            break;
          }
          if (edgeMat[i] >= 0 && edgeMat[j] !== edgeMat[i] && depth[j] >= depth[i] - 0.5) {
            rgb = colorOf(keys[i], 4);
            break;
          }
        }
        img.put(px, py, rgb);
      }
    }
    // Contour extérieur, teinté par la matière voisine.
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (has(px, py)) continue;
        let best = -1;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          if (has(px + dx, py + dy)) {
            const j = (py + dy) * w + px + dx;
            if (best < 0 || depth[j] > depth[best]) best = j;
          }
        }
        if (best < 0 || bareKeys.has(keys[best])) continue;
        const lit = tones[best] <= 1 && !glowKeys.has(keys[best]);
        img.put(px, py, colorOf(keys[best], glowKeys.has(keys[best]) ? 4 : lit ? 5 : 6));
      }
    }
    return img;
  }

  private patternAt(p: Pattern, x: number, y: number, z: number): boolean {
    const s = p.scale;
    switch (p.kind) {
      case 'taches': {
        cells(x / s, y / s, z / s);
        return cellF1 < (p.amount ?? 0.32);
      }
      case 'rayures': {
        const v = [x, y, z][p.axis ?? 0] / s + 0.35 * noise3(x * 0.12, y * 0.12, z * 0.12);
        return v - Math.floor(v) < (p.amount ?? 0.4);
      }
      case 'ecailles':
      case 'craquelures': {
        cells(x / s, y / s, z / s);
        return cellF2 - cellF1 < (p.amount ?? (p.kind === 'ecailles' ? 0.16 : 0.08));
      }
      case 'plumes': {
        cells((x / s) * 0.7, (y / s) * 1.5, (z / s) * 0.7);
        return cellF2 - cellF1 < (p.amount ?? 0.14);
      }
    }
  }
}
