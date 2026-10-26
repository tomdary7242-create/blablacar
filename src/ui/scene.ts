// Pile de scènes : la scène du dessus reçoit les entrées, les scènes
// transparentes laissent voir celles du dessous (menus, dialogues).
import type { TrackId } from './musicScore';

export interface Scene {
  /** Vrai : les scènes inférieures ne sont pas dessinées. */
  readonly opaque?: boolean;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Appelé quand la scène redevient celle du dessus. */
  resume?(): void;
  /** Musique voulue par la scène (`null` : silence ; absente : celle de dessous). */
  readonly music?: TrackId | null;
}

export class SceneManager {
  private stack: Scene[] = [];

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get size(): number {
    return this.stack.length;
  }

  push(scene: Scene): void {
    this.stack.push(scene);
  }

  /** Retire une scène précise (par défaut celle du dessus). */
  pop(scene?: Scene): void {
    const target = scene ?? this.top;
    const index = target ? this.stack.lastIndexOf(target) : -1;
    if (index < 0) return;
    const wasTop = index === this.stack.length - 1;
    this.stack.splice(index, 1);
    if (wasTop) this.top?.resume?.();
  }

  /** Retire toutes les scènes posées au-dessus de `scene` (menus, sac…). */
  popAbove(scene: Scene): void {
    const index = this.stack.lastIndexOf(scene);
    if (index < 0 || index === this.stack.length - 1) return;
    this.stack.length = index + 1;
    scene.resume?.();
  }

  replace(scene: Scene): void {
    this.stack.pop();
    this.stack.push(scene);
  }

  reset(scene: Scene): void {
    this.stack = [scene];
  }

  contains(predicate: (s: Scene) => boolean): boolean {
    return this.stack.some(predicate);
  }

  update(dt: number): void {
    this.top?.update(dt);
  }

  /** Musique de la scène la plus haute qui en demande une. */
  music(): TrackId | null | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const m = this.stack[i].music;
      if (m !== undefined) return m;
    }
    return undefined;
  }

  render(ctx: CanvasRenderingContext2D): void {
    let start = this.stack.length - 1;
    while (start > 0 && !this.stack[start].opaque) start--;
    for (let i = Math.max(0, start); i < this.stack.length; i++) this.stack[i].render(ctx);
  }
}
