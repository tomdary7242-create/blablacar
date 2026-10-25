// Écran en pixel art : tout est dessiné dans un tampon de 256×192 pixels,
// puis agrandi d'un facteur entier (en pixels physiques) pour rester parfaitement net.

export const W = 256;
export const H = 192;

export class Screen {
  /** Tampon basse résolution dans lequel dessinent toutes les scènes. */
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly display: CanvasRenderingContext2D;
  private factor = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
  ) {
    this.buffer = document.createElement('canvas');
    this.buffer.width = W;
    this.buffer.height = H;
    this.ctx = this.buffer.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.display = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Plus grand facteur entier qui tient dans la place disponible, en pixels physiques.
    this.factor = Math.max(1, Math.floor(Math.min((rect.width * dpr) / W, (rect.height * dpr) / H)));
    this.canvas.width = W * this.factor;
    this.canvas.height = H * this.factor;
    this.canvas.style.width = `${(W * this.factor) / dpr}px`;
    this.canvas.style.height = `${(H * this.factor) / dpr}px`;
    this.display.imageSmoothingEnabled = false;
  }

  /** Recopie le tampon à l'écran. */
  present(): void {
    this.display.imageSmoothingEnabled = false;
    this.display.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
  }
}
