// Entrées clavier (QWERTY et AZERTY) et boutons tactiles, réduites à une manette virtuelle.

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'run';

const DIRECTIONS: Button[] = ['up', 'down', 'left', 'right'];

// `event.code` désigne la position physique : WASD couvre aussi ZQSD sur un clavier AZERTY.
const KEYMAP: Record<string, Button[]> = {
  ArrowUp: ['up'],
  ArrowDown: ['down'],
  ArrowLeft: ['left'],
  ArrowRight: ['right'],
  KeyW: ['up'],
  KeyS: ['down'],
  KeyA: ['left'],
  KeyD: ['right'],
  Enter: ['a'],
  NumpadEnter: ['a'],
  Space: ['a'],
  KeyJ: ['a'],
  Escape: ['b', 'start'],
  Backspace: ['b'],
  KeyK: ['b'],
  KeyX: ['b'],
  KeyM: ['start'],
  Semicolon: ['start'], // touche M d'un clavier AZERTY
  Tab: ['start'],
  ShiftLeft: ['run'],
  ShiftRight: ['run'],
};

const REPEAT_DELAY = 0.32;
const REPEAT_RATE = 0.09;

export class Input {
  private held = new Set<Button>();
  private pressedNow = new Set<Button>();
  private heldTime = new Map<Button, number>();
  private repeatTimer = new Map<Button, number>();
  /** Caractères tapés pendant l'image (saisie du nom). */
  typed: string[] = [];
  /** Codes des touches enfoncées pendant l'image. */
  codes: string[] = [];
  /** Vrai dès qu'une touche est pressée : sert à débloquer l'audio. */
  onFirstInteraction: (() => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.typed.push(e.key);
      if (e.code === 'Backspace') this.typed.push('\b');
      this.codes.push(e.code);
      const buttons = KEYMAP[e.code];
      if (buttons) {
        e.preventDefault();
        if (!e.repeat) buttons.forEach((b) => this.press(b));
      }
      this.interacted();
    });
    window.addEventListener('keyup', (e) => {
      KEYMAP[e.code]?.forEach((b) => this.release(b));
    });
    window.addEventListener('blur', () => {
      [...this.held].forEach((b) => this.release(b));
    });
  }

  private interacted(): void {
    if (this.onFirstInteraction) {
      this.onFirstInteraction();
      this.onFirstInteraction = null;
    }
  }

  press(b: Button): void {
    if (!this.held.has(b)) {
      this.held.add(b);
      this.pressedNow.add(b);
      this.heldTime.set(b, 0);
      this.repeatTimer.set(b, REPEAT_DELAY);
    }
  }

  release(b: Button): void {
    this.held.delete(b);
    this.heldTime.delete(b);
  }

  /** Branche un bouton tactile de l'interface HTML. */
  bindTouch(el: HTMLElement, button: Button): void {
    const down = (e: Event) => {
      e.preventDefault();
      this.press(button);
      el.classList.add('actif');
      this.interacted();
    };
    const up = (e: Event) => {
      e.preventDefault();
      this.release(button);
      el.classList.remove('actif');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  /**
   * Croix directionnelle tactile : la direction suit le doigt, qui peut glisser
   * d'une flèche à l'autre sans se relever.
   */
  bindDpad(el: HTMLElement): void {
    let current: Button | null = null;
    const show = (b: Button | null) => {
      el.querySelectorAll<HTMLElement>('[data-bouton]').forEach((btn) => btn.classList.toggle('actif', btn.dataset.bouton === b));
    };
    const set = (b: Button | null) => {
      if (b === current) return;
      if (current) this.release(current);
      current = b;
      if (b) this.press(b);
      show(b);
    };
    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return set(null);
      set(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.interacted();
      aim(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (current || e.buttons) aim(e);
    });
    const end = (e: Event) => {
      e.preventDefault();
      set(null);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  /** Vrai à l'image où le bouton est pressé (avec répétition pour les directions maintenues). */
  pressed(b: Button): boolean {
    return this.pressedNow.has(b);
  }

  isHeld(b: Button): boolean {
    return this.held.has(b);
  }

  /** Durée de maintien du bouton, en secondes. */
  holdTime(b: Button): number {
    return this.heldTime.get(b) ?? 0;
  }

  /** Direction maintenue (la plus récente en cas de conflit), ou null. */
  heldDirection(): Button | null {
    let best: Button | null = null;
    let bestTime = Infinity;
    for (const d of DIRECTIONS) {
      if (this.held.has(d) && this.holdTime(d) < bestTime) {
        best = d;
        bestTime = this.holdTime(d);
      }
    }
    return best;
  }

  /** À appeler en fin d'image. */
  endFrame(dt: number): void {
    this.pressedNow.clear();
    this.typed = [];
    this.codes = [];
    for (const b of this.held) {
      this.heldTime.set(b, (this.heldTime.get(b) ?? 0) + dt);
      if (!DIRECTIONS.includes(b)) continue;
      const t = (this.repeatTimer.get(b) ?? REPEAT_DELAY) - dt;
      if (t <= 0) {
        this.pressedNow.add(b);
        this.repeatTimer.set(b, REPEAT_RATE);
      } else {
        this.repeatTimer.set(b, t);
      }
    }
  }

  /** Oublie toutes les pressions en cours (changement de scène). */
  consume(): void {
    this.pressedNow.clear();
    this.typed = [];
    this.codes = [];
  }

  /** Direction pressée pendant l'image, même relâchée aussitôt (tape brève). */
  tappedDirection(): Button | null {
    return DIRECTIONS.find((d) => this.pressedNow.has(d)) ?? null;
  }
}
