// Écran logique 320×240, mis à l'échelle pour remplir la fenêtre en restant net.

export const W = 320;
export const H = 240;

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;

  constructor(canvas: HTMLCanvasElement, private readonly container: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const fit = Math.min(rect.width / W, rect.height / H);
    // Échelle entière quand c'est possible (pixels réguliers), libre sur petit écran.
    this.scale = fit >= 2 ? Math.floor(fit) : Math.max(0.5, fit);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${Math.round(W * this.scale)}px`;
    this.canvas.style.height = `${Math.round(H * this.scale)}px`;
    this.canvas.width = Math.round(W * this.scale * dpr);
    this.canvas.height = Math.round(H * this.scale * dpr);
    this.ctx.setTransform(this.scale * dpr, 0, 0, this.scale * dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }
}
