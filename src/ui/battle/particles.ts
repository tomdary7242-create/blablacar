// Système de particules du combat : étincelles, braises, gouttes, feuilles, poussière…
// Chaque particule a sa vitesse, sa gravité, son frottement et une rampe de couleurs
// parcourue au fil de sa vie. Les particules « lumineuses » s'additionnent (halo).

type Ctx = CanvasRenderingContext2D;

export type Shape =
  /** Carré plein de `size` pixels. */
  | 'point'
  /** Trait orienté selon la vitesse (vitesse, pluie, éclats). */
  | 'trait'
  /** Petite croix scintillante. */
  | 'etoile'
  /** Disque plein. */
  | 'disque'
  /** Motif pixel art (`rows` + palette indexée par les lettres). */
  | 'motif'
  /** Caractère du texte (Z du sommeil, notes de musique…). */
  | 'glyphe';

export interface ParticleDef {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  /** Accélération (gravité : ay > 0). */
  ax?: number;
  ay?: number;
  /** Frottement de l'air, par seconde (0 : aucun). */
  drag?: number;
  /** Durée de vie (s). */
  life: number;
  /** Retard avant l'apparition (s). */
  delay?: number;
  size?: number;
  /** Taille finale (interpolée), pour grossir ou rétrécir. */
  sizeEnd?: number;
  /** Couleurs parcourues du début à la fin de la vie. */
  colors: string[];
  shape?: Shape;
  rows?: string[];
  palette?: Record<string, string>;
  glyph?: string;
  /** Mélange additif : la particule éclaire ce qu'elle recouvre. */
  glow?: boolean;
  /** Ondulation latérale (amplitude en px, fréquence en Hz). */
  wobble?: number;
  wobbleFreq?: number;
  /** Clignote (scintillement). */
  flicker?: boolean;
  /** Opacité qui décroît en fin de vie (par défaut : vrai). */
  fade?: boolean;
}

interface Particle extends Required<Omit<ParticleDef, 'rows' | 'palette' | 'glyph' | 'sizeEnd'>> {
  rows?: string[];
  palette?: Record<string, string>;
  glyph?: string;
  sizeEnd: number;
  age: number;
  seed: number;
}

let seedCounter = 1;

export class Particles {
  private list: Particle[] = [];
  /** Mélange additif des particules lumineuses (scène sombre) ; sinon, couleurs franches. */
  additive = true;

  /** Nombre de particules actives (tests, réglages). */
  get count(): number {
    return this.list.length;
  }

  add(def: ParticleDef): void {
    if (this.list.length > 900) return;
    const size = def.size ?? 1;
    this.list.push({
      vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, delay: 0, shape: 'point', glow: false, wobble: 0, wobbleFreq: 3, flicker: false, fade: true,
      ...def,
      size,
      sizeEnd: def.sizeEnd ?? size,
      age: 0,
      seed: seedCounter++ * 0.6180339,
    });
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    for (const p of this.list) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.age += dt;
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  render(ctx: Ctx): void {
    for (const p of this.list) {
      if (p.delay > 0) continue;
      const u = Math.min(1, p.age / p.life);
      if (p.flicker && Math.sin(p.age * 40 + p.seed * 10) < -0.3) continue;
      const color = p.colors[Math.min(p.colors.length - 1, Math.floor(u * p.colors.length))];
      const alpha = p.fade ? Math.min(1, (1 - u) * 3) : 1;
      const size = p.size + (p.sizeEnd - p.size) * u;
      const x = p.x + (p.wobble ? Math.sin(p.age * p.wobbleFreq * Math.PI * 2 + p.seed * 7) * p.wobble : 0);
      const y = p.y;
      ctx.globalAlpha = alpha;
      if (p.glow && this.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = color;
      switch (p.shape) {
        case 'point': {
          const s = Math.max(1, Math.round(size));
          ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
          break;
        }
        case 'trait': {
          const speed = Math.hypot(p.vx, p.vy) || 1;
          const len = Math.max(2, size * 3);
          const dx = (p.vx / speed) * len;
          const dy = (p.vy / speed) * len;
          const steps = Math.ceil(len);
          for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(x - (dx * i) / steps), Math.round(y - (dy * i) / steps), 1, 1);
          break;
        }
        case 'etoile': {
          const s = Math.max(1, Math.round(size));
          ctx.fillRect(Math.round(x) - s, Math.round(y), s * 2 + 1, 1);
          ctx.fillRect(Math.round(x), Math.round(y) - s, 1, s * 2 + 1);
          break;
        }
        case 'disque': {
          const r = Math.max(0.5, size);
          for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
            const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
            ctx.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
          }
          break;
        }
        case 'motif': {
          const rows = p.rows!;
          const x0 = Math.round(x - rows[0].length / 2);
          const y0 = Math.round(y - rows.length / 2);
          rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i++) {
              const c = p.palette![row[i]];
              if (!c) continue;
              ctx.fillStyle = c;
              ctx.fillRect(x0 + i, y0 + j, 1, 1);
            }
          });
          break;
        }
        case 'glyphe':
          drawGlyph(ctx, p.glyph!, Math.round(x), Math.round(y), color);
          break;
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
}

/** Petits pictogrammes pixel art pour les particules « glyphe ». */
const GLYPHS: Record<string, string[]> = {
  Z: ['####', '..#.', '.#..', '####'],
  z: ['###', '.#.', '###'],
  note: ['..##', '..#.', '..#.', '###.', '##..'],
  plus: ['.#.', '###', '.#.'],
  coeur: ['#.#', '###', '.#.'],
  etoile: ['..#..', '.###.', '#####', '.###.', '.#.#.'],
  bulle: ['.##.', '#..#', '#..#', '.##.'],
  eclair: ['..#', '.#.', '###', '.#.', '#..'],
  question: ['.##.', '#..#', '..#.', '.#..', '....', '.#..'],
  ha: ['#.#.###', '###.#.#', '#.#.###', '#.#.#.#'],
};

function drawGlyph(ctx: Ctx, glyph: string, x: number, y: number, color: string): void {
  const rows = GLYPHS[glyph] ?? GLYPHS.etoile;
  const x0 = x - Math.floor(rows[0].length / 2);
  const y0 = y - Math.floor(rows.length / 2);
  ctx.fillStyle = color;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(x0 + i, y0 + j, 1, 1);
  });
}

/** Pseudo-hasard stable (même résultat pour mêmes entrées). */
export function rnd(i: number, k = 0): number {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
