// Éclairage de la carte : teinte chaude au lever et au coucher du soleil,
// obscurité tramée la nuit, percée par les lumières (lanterne du joueur,
// forges, portes des cases, lueurs des Hantises).
import { H, W } from './screen';

export interface Light {
  /** Centre en pixels écran. */
  x: number;
  y: number;
  /** Rayon en pixels. */
  r: number;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
/** Opacité des paliers d'obscurité (du plus clair au plus noir). */
const LEVELS = [0, 0.3, 0.52, 0.72, 0.84];
const NIGHT_RGB: [number, number, number] = [6, 8, 28];

export class NightLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly img: ImageData;
  private readonly light = new Float32Array(W * H);

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(W, H);
  }

  /**
   * Dessine l'éclairage par-dessus la scène.
   * `darkness` : 0 (jour) à 1 (nuit noire) ; `warmth` : teinte du crépuscule.
   */
  draw(target: CanvasRenderingContext2D, darkness: number, warmth: number, lights: Light[]): void {
    if (warmth > 0.01) {
      target.save();
      target.globalCompositeOperation = 'multiply';
      target.globalAlpha = Math.min(1, warmth * 0.55);
      target.fillStyle = 'rgb(255, 176, 128)';
      target.fillRect(0, 0, W, H);
      target.restore();
    }
    if (darkness < 0.02) return;
    const light = this.light;
    light.fill(0);
    for (const l of lights) {
      const x0 = Math.max(0, Math.floor(l.x - l.r));
      const x1 = Math.min(W - 1, Math.ceil(l.x + l.r));
      const y0 = Math.max(0, Math.floor(l.y - l.r));
      const y1 = Math.min(H - 1, Math.ceil(l.y + l.r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x - l.x, (y - l.y) * 1.1) / l.r;
          if (d >= 1) continue;
          const v = Math.min(1, (1 - d) * 1.7);
          const i = y * W + x;
          if (v > light[i]) light[i] = v;
        }
      }
    }
    const data = this.img.data;
    const steps = LEVELS.length - 1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const dark = darkness * (1 - light[i]);
        const t = dark * steps;
        const k = Math.floor(t);
        const level = Math.min(steps, k + (t - k > BAYER4[(y & 3) * 4 + (x & 3)] ? 1 : 0));
        const o = i * 4;
        data[o] = NIGHT_RGB[0];
        data[o + 1] = NIGHT_RGB[1];
        data[o + 2] = NIGHT_RGB[2];
        data[o + 3] = Math.round(LEVELS[level] * 255);
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    target.drawImage(this.canvas, 0, 0);
  }
}
