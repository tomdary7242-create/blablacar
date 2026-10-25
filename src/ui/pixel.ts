// Peintre pixel art procédural.
//
// Les formes (ellipses, polygones, traits épais) sont rastérisées au pixel près
// dans une grille d'identifiants de « parties ». Un second passage applique
// ensuite les règles du pixel art :
//   - ombrage en tons quantifiés, lumière venant d'en haut à gauche ;
//   - contour extérieur sombre teinté de la couleur voisine ;
//   - trait intérieur là où une partie passe devant une autre ;
//   - détails (yeux, bouche) posés pixel par pixel par-dessus.

import { shade } from './draw';

type Shape =
  | { t: 'ell'; cx: number; cy: number; rx: number; ry: number; rot: number }
  | { t: 'line'; segs: Array<[number, number, number, number]>; hw: number }
  | { t: 'halo' };

interface Part {
  color: string;
  outline: boolean;
  shape: Shape;
  ramp: string[];
}

// Direction de la lumière (normalisée) : en haut à gauche, vers l'avant.
const L = (() => {
  const v = [-0.55, -0.7, 0.55];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();

function ramp(color: string): string[] {
  return [shade(color, 0.5), shade(color, 0.22), color, shade(color, -0.22), shade(color, -0.42)];
}

export class Painter {
  private readonly ids: Int16Array;
  private readonly parts: Part[] = [];
  private readonly inks: Array<[number, number, string]> = [];
  private tx = 0;
  private ty = 0;
  private s = 1;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.ids = new Int16Array(w * h).fill(-1);
  }

  /** Repère local : (0, 0) est placé en (tx, ty) et l'unité vaut `s` pixels. */
  setTransform(tx: number, ty: number, s: number): void {
    this.tx = tx;
    this.ty = ty;
    this.s = s;
  }

  get scale(): number {
    return this.s;
  }

  private local(px: number, py: number): [number, number] {
    return [(px + 0.5 - this.tx) / this.s, (py + 0.5 - this.ty) / this.s];
  }

  private addPart(color: string, outline: boolean, shape: Shape): number {
    this.parts.push({ color, outline, shape, ramp: ramp(color) });
    return this.parts.length - 1;
  }

  private fill(id: number, x0: number, y0: number, x1: number, y1: number, inside: (lx: number, ly: number) => boolean): void {
    const minX = Math.max(0, Math.floor(this.tx + x0 * this.s) - 1);
    const maxX = Math.min(this.w - 1, Math.ceil(this.tx + x1 * this.s) + 1);
    const minY = Math.max(0, Math.floor(this.ty + y0 * this.s) - 1);
    const maxY = Math.min(this.h - 1, Math.ceil(this.ty + y1 * this.s) + 1);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const [lx, ly] = this.local(px, py);
        if (inside(lx, ly)) this.ids[py * this.w + px] = id;
      }
    }
  }

  ell(x: number, y: number, rx: number, ry: number, color: string, rot = 0, outline = true): void {
    rx = Math.max(rx, 0.6 / this.s);
    ry = Math.max(ry, 0.6 / this.s);
    const id = this.addPart(color, outline, { t: 'ell', cx: x, cy: y, rx, ry, rot });
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const r = Math.max(rx, ry);
    this.fill(id, x - r, y - r, x + r, y + r, (lx, ly) => {
      const dx = lx - x;
      const dy = ly - y;
      const u = dx * cos - dy * sin;
      const v = dx * sin + dy * cos;
      return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
    });
  }

  poly(points: number[], color: string, outline = true): void {
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const id = this.addPart(color, outline, {
      t: 'ell',
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
      rx: Math.max(0.5, (x1 - x0) / 2),
      ry: Math.max(0.5, (y1 - y0) / 2),
      rot: 0,
    });
    const n = points.length / 2;
    this.fill(id, x0, y0, x1, y1, (lx, ly) => {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = points[i * 2];
        const yi = points[i * 2 + 1];
        const xj = points[j * 2];
        const yj = points[j * 2 + 1];
        if (yi > ly !== yj > ly && lx < ((xj - xi) * (ly - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    });
  }

  rect(x: number, y: number, w: number, h: number, color: string, outline = true): void {
    this.poly([x, y, x + w, y, x + w, y + h, x, y + h], color, outline);
  }

  /** Trait épais (pattes, cornes, queues) ; `width` en unités locales. */
  line(points: number[], color: string, width = 2, outline = true): void {
    const hw = Math.max(width / 2, 0.55 / this.s);
    const segs: Array<[number, number, number, number]> = [];
    for (let i = 0; i + 3 < points.length; i += 2) segs.push([points[i], points[i + 1], points[i + 2], points[i + 3]]);
    const id = this.addPart(color, outline, { t: 'line', segs, hw });
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    this.fill(id, Math.min(...xs) - hw, Math.min(...ys) - hw, Math.max(...xs) + hw, Math.max(...ys) + hw, (lx, ly) =>
      segs.some(([ax, ay, bx, by]) => distToSeg(lx, ly, ax, ay, bx, by) <= hw),
    );
  }

  /** Halo tramé derrière la créature (légendes, esprits). */
  halo(x: number, y: number, r: number, color: string): void {
    const id = this.addPart(color, false, { t: 'halo' });
    this.fill(id, x - r, y - r, x + r, y + r, (lx, ly) => {
      const d = Math.hypot(lx - x, ly - y) / r;
      if (d > 1) return false;
      const px = Math.floor(this.tx + lx * this.s);
      const py = Math.floor(this.ty + ly * this.s);
      // Trame plus dense au centre, clairsemée au bord.
      return d < 0.45 ? (px + py) % 2 === 0 : d < 0.75 ? px % 2 === 0 && py % 2 === 0 : (px + py * 3) % 6 === 0;
    });
  }

  /** Pixel de détail posé après l'ombrage (coordonnées locales). */
  ink(x: number, y: number, color: string): void {
    const px = Math.floor(this.tx + x * this.s);
    const py = Math.floor(this.ty + y * this.s);
    if (px >= 0 && py >= 0 && px < this.w && py < this.h) this.inks.push([px, py, color]);
  }

  /** Trait de détail d'un pixel d'épaisseur. */
  inkLine(points: number[], color: string): void {
    for (let i = 0; i + 3 < points.length; i += 2) {
      let x0 = Math.floor(this.tx + points[i] * this.s);
      let y0 = Math.floor(this.ty + points[i + 1] * this.s);
      const x1 = Math.floor(this.tx + points[i + 2] * this.s);
      const y1 = Math.floor(this.ty + points[i + 3] * this.s);
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (x0 >= 0 && y0 >= 0 && x0 < this.w && y0 < this.h) this.inks.push([x0, y0, color]);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    }
  }

  /** Œil en pixel art : blanc, pupille tournée vers l'avant (gauche), reflet. */
  eye(x: number, y: number, r: number, glow?: string): void {
    const px = Math.floor(this.tx + x * this.s);
    const py = Math.floor(this.ty + y * this.s);
    const pr = r * this.s;
    const put = (dx: number, dy: number, c: string) => {
      const ex = px + dx;
      const ey = py + dy;
      if (ex >= 0 && ey >= 0 && ex < this.w && ey < this.h) this.inks.push([ex, ey, c]);
    };
    const dark = '#1a1010';
    if (glow) {
      if (pr < 2) {
        put(0, 0, glow);
        put(-1, 0, glow);
        put(0, -1, shade(glow, 0.5));
      } else {
        for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0]]) put(dx, dy, glow);
        put(0, -1, '#ffffff');
        for (const dx of [-2, -1, 0, 1, 2]) put(dx, 1, dark);
      }
      return;
    }
    if (pr < 1.7) {
      put(0, 0, dark);
      put(-1, 0, dark);
      put(0, -1, dark);
      put(-1, -1, '#ffffff');
      return;
    }
    if (pr < 2.6) {
      // 3×3 : contour, blanc, pupille
      for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-1, 1], [0, 1], [1, 1]]) put(dx, dy, dark);
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0]]) put(dx, dy, '#ffffff');
      put(-1, 0, dark);
      put(-1, -1, dark);
      put(0, 0, dark);
      put(-1, -1, '#c8e0ff');
      return;
    }
    // Grand œil 5×4
    for (let dx = -2; dx <= 2; dx++) {
      put(dx, -3, dark);
      put(dx, 2, dark);
    }
    for (let dy = -2; dy <= 1; dy++) {
      put(-3, dy, dark);
      put(3, dy, dark);
    }
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 1; dy++) put(dx, dy, '#ffffff');
    for (let dx = -2; dx <= 0; dx++) for (let dy = -2; dy <= 1; dy++) put(dx, dy, dark);
    put(-1, -2, '#ffffff');
    put(1, 1, '#d8e0f0');
  }

  /** Applique ombrage, contours et détails puis renvoie l'image. */
  render(): HTMLCanvasElement {
    const { w, h, ids, parts } = this;
    const out = new Array<string | null>(w * h).fill(null);
    // Ombrage
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const id = ids[py * w + px];
        if (id < 0) continue;
        const part = parts[id];
        if (part.shape.t === 'halo') {
          out[py * w + px] = part.color;
          continue;
        }
        const [lx, ly] = this.local(px, py);
        out[py * w + px] = part.ramp[this.tone(part.shape, lx, ly)];
      }
    }
    const filled = (px: number, py: number) => px >= 0 && py >= 0 && px < w && py < h && ids[py * w + px] >= 0;
    const solid = (px: number, py: number) => filled(px, py) && parts[ids[py * w + px]].shape.t !== 'halo';
    // Traits intérieurs : bord d'une partie qui passe devant une partie plus ancienne.
    const result = out.slice();
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const id = ids[py * w + px];
        if (id < 0 || !parts[id].outline || parts[id].shape.t === 'halo') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx;
          const ny = py + dy;
          if (!solid(nx, ny)) continue;
          const other = ids[ny * w + nx];
          if (other < id && parts[other].color !== parts[id].color) {
            result[py * w + px] = shade(parts[id].color, -0.55);
            break;
          }
        }
      }
    }
    // Contour extérieur teinté
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (solid(px, py)) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (solid(px + dx, py + dy)) {
            result[py * w + px] = shade(parts[ids[(py + dy) * w + px + dx]].color, -0.72);
            break;
          }
        }
      }
    }
    for (const [px, py, c] of this.inks) result[py * w + px] = c;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    result.forEach((c, i) => {
      if (!c) return;
      const n = parseInt(c.slice(1), 16);
      img.data[i * 4] = (n >> 16) & 255;
      img.data[i * 4 + 1] = (n >> 8) & 255;
      img.data[i * 4 + 2] = n & 255;
      img.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /** Indice de ton (0 = reflet … 4 = ombre profonde) selon la normale estimée. */
  private tone(shape: Shape, lx: number, ly: number): number {
    let nx = 0;
    let ny = 0;
    if (shape.t === 'ell') {
      const dx = lx - shape.cx;
      const dy = ly - shape.cy;
      const cos = Math.cos(-shape.rot);
      const sin = Math.sin(-shape.rot);
      const u = (dx * cos - dy * sin) / shape.rx;
      const v = (dx * sin + dy * cos) / shape.ry;
      // Retour dans le repère de l'écran
      const c2 = Math.cos(shape.rot);
      const s2 = Math.sin(shape.rot);
      nx = u * c2 - v * s2;
      ny = u * s2 + v * c2;
    } else if (shape.t === 'line') {
      let best = Infinity;
      for (const [ax, ay, bx, by] of shape.segs) {
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const px = -(by - ay) / len;
        const py = (bx - ax) / len;
        const d = distToSeg(lx, ly, ax, ay, bx, by);
        if (d < best) {
          best = d;
          const side = (lx - ax) * px + (ly - ay) * py;
          const k = Math.max(-1, Math.min(1, side / shape.hw));
          nx = px * k;
          ny = py * k;
        }
      }
    }
    const len2 = nx * nx + ny * ny;
    if (len2 > 1) {
      const len = Math.sqrt(len2);
      nx /= len;
      ny /= len;
    }
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const i = nx * L[0] + ny * L[1] + nz * L[2];
    if (i > 0.93) return 0;
    if (i > 0.7) return 1;
    if (i > 0.25) return 2;
    if (i > -0.15) return 3;
    return 4;
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
