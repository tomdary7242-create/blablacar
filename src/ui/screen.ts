// Écran en pixel art : tout est dessiné dans un tampon de 256×192 pixels, puis agrandi
// pour occuper toute la place disponible. Quand le facteur n'est pas entier, on agrandit
// d'abord d'un facteur entier sans lissage, puis on ajuste à la taille finale avec un
// léger lissage : les pixels restent nets et tous de la même taille.

export const W = 256;
export const H = 192;

export class Screen {
  /** Tampon basse résolution dans lequel dessinent toutes les scènes. */
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly display: CanvasRenderingContext2D;
  /** Tampon intermédiaire agrandi d'un facteur entier. */
  private readonly sharp: HTMLCanvasElement;
  private readonly sharpCtx: CanvasRenderingContext2D;
  private integer = true;

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
    this.sharp = document.createElement('canvas');
    this.sharpCtx = this.sharp.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(container);
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const style = getComputedStyle(this.container);
    const availW = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const dpr = window.devicePixelRatio || 1;
    // Plus grande taille qui tient dans la place disponible, au pixel CSS près.
    const fit = Math.max(0.5, Math.min(availW / W, availH / H));
    const cssW = Math.floor(W * fit);
    const cssH = Math.floor(H * fit);
    const physical = (cssW * dpr) / W;
    // Si le facteur physique est presque entier, on s'y cale pour des pixels parfaits.
    const near = Math.round(physical);
    this.integer = Math.abs(physical - near) < 0.04 || physical >= 6;
    const factor = this.integer ? Math.max(1, near) : physical;
    this.canvas.width = Math.round(W * factor);
    this.canvas.height = Math.round(H * factor);
    this.canvas.style.width = `${this.integer ? (W * factor) / dpr : cssW}px`;
    this.canvas.style.height = `${this.integer ? (H * factor) / dpr : cssH}px`;
    if (!this.integer) {
      const k = Math.ceil(physical);
      this.sharp.width = W * k;
      this.sharp.height = H * k;
    }
  }

  /** Recopie le tampon à l'écran. */
  present(): void {
    const { width, height } = this.canvas;
    if (this.integer) {
      this.display.imageSmoothingEnabled = false;
      this.display.drawImage(this.buffer, 0, 0, width, height);
      return;
    }
    this.sharpCtx.imageSmoothingEnabled = false;
    this.sharpCtx.drawImage(this.buffer, 0, 0, this.sharp.width, this.sharp.height);
    this.display.imageSmoothingEnabled = true;
    this.display.imageSmoothingQuality = 'high';
    this.display.drawImage(this.sharp, 0, 0, width, height);
  }
}
