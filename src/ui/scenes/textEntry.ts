// Saisie d'un nom : celui de l'héroïne, ou le surnom d'un Jinémon. Le nom proposé est déjà
// écrit : on valide, ou on tape un autre nom (la première lettre tapée remplace le nom
// proposé). Au clavier de l'ordinateur ; sur téléphone, toucher l'écran ouvre le clavier.
import { PAL, box, text } from '../draw';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { drawCreature } from '../sprites';
import { menuBackground } from '../widgets';

export interface TextEntryOptions {
  /** La question posée (« Comment t'appelles-tu ? »). */
  title: string;
  /** Le nom proposé d'office. */
  initial: string;
  /** Autres noms proposés avec ◄ ►. */
  suggestions?: string[];
  /** Le Jinémon à surnommer, dessiné au-dessus du nom. */
  speciesId?: number;
  maxLength?: number;
  /** Fond de l'écran (par défaut, celui des menus). */
  backdrop?: (ctx: CanvasRenderingContext2D) => void;
  /** Le nom validé (le nom proposé si le champ est vide). */
  onDone: (name: string) => void;
  /** B sur un champ vide : on renonce. */
  onCancel?: () => void;
}

const LETTER = /^[\p{L}\p{N} '-]$/u;
const touchScreen = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

/** Le champ invisible qui fait apparaître le clavier du téléphone (un seul pour tout le jeu). */
let field: HTMLInputElement | null = null;
/** La saisie en cours (celle qui reçoit les lettres du téléphone). */
let active: TextEntryScene | null = null;

function phoneField(): HTMLInputElement {
  if (field) return field;
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('enterkeyhint', 'done');
  input.setAttribute('aria-label', 'Nom');
  // Invisible, mais assez grand pour que le téléphone n'agrandisse pas la page.
  Object.assign(input.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', border: '0', padding: '0', fontSize: '16px' });
  input.addEventListener('input', () => active?.typedOnPhone(input.value));
  input.addEventListener('keydown', (e) => {
    // Les lettres vont dans le champ, pas aux commandes du jeu.
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      active?.confirm();
    }
  });
  document.body.append(input);
  // Toucher l'écran du jeu pendant une saisie ouvre le clavier (au toucher, ou au « clic » qui suit).
  const open = (e: Event) => {
    if (!active || document.activeElement === input || (e instanceof PointerEvent && e.pointerType === 'mouse')) return;
    input.value = '';
    input.focus();
  };
  const screen = document.getElementById('ecran');
  screen?.addEventListener('pointerdown', open);
  screen?.addEventListener('click', open);
  field = input;
  return input;
}

export class TextEntryScene implements Scene {
  readonly opaque = true;
  private name: string;
  private suggestion = -1;
  /** Le nom proposé n'a pas encore été touché : la première lettre tapée le remplace. */
  private pristine = true;
  private readonly max: number;
  private done = false;

  constructor(
    private readonly game: Game,
    private readonly opts: TextEntryOptions,
  ) {
    this.name = opts.initial;
    // ◄ ► part du nom proposé s'il fait partie des suggestions.
    this.suggestion = opts.suggestions?.indexOf(opts.initial) ?? -1;
    this.max = opts.maxLength ?? 10;
    active = this;
    phoneField();
  }

  /** Ce que contient le champ du téléphone (on y repart de zéro à chaque toucher). */
  typedOnPhone(value: string): void {
    this.name = [...value].filter((ch) => LETTER.test(ch)).join('').slice(0, this.max);
    this.pristine = false;
  }

  update(): void {
    if (this.done) return;
    active = this;
    const input = this.game.input;
    const enter = input.codes.includes('Enter') || input.codes.includes('NumpadEnter');
    if (input.typed.length) {
      for (const ch of input.typed) {
        const letter = LETTER.test(ch);
        if (this.pristine && letter) this.name = '';
        if (letter || ch === '\b') this.pristine = false;
        if (ch === '\b') this.name = this.name.slice(0, -1);
        else if (letter && this.name.length < this.max) this.name += ch;
      }
      this.suggestion = -1;
      // Les lettres tapées déclenchent aussi des boutons (ZQSD, J, K…) : seule Entrée valide.
      if (enter) this.confirm();
      return;
    }
    const suggestions = this.opts.suggestions ?? [];
    if (suggestions.length && (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down'))) {
      const delta = input.pressed('left') || input.pressed('up') ? -1 : 1;
      this.suggestion = (this.suggestion + delta + suggestions.length) % suggestions.length;
      this.name = suggestions[this.suggestion];
      this.pristine = true;
      this.game.sfx('curseur');
    }
    if (input.pressed('b')) {
      if (this.name) {
        this.name = this.name.slice(0, -1);
        this.pristine = false;
      } else {
        this.close();
        this.opts.onCancel?.();
      }
    }
    if (input.pressed('a')) this.confirm();
  }

  confirm(): void {
    if (this.done) return;
    this.game.sfx('valider');
    const name = this.name.trim() || this.opts.initial;
    this.close();
    this.opts.onDone(name);
  }

  private close(): void {
    this.done = true;
    if (active === this) active = null;
    field?.blur();
    this.game.scenes.pop(this);
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const creature = this.opts.speciesId !== undefined;
    if (this.opts.backdrop) this.opts.backdrop(ctx);
    else menuBackground(ctx, W, H);
    const top = creature ? 70 : 36;
    if (creature) drawCreature(ctx, this.opts.speciesId!, W / 2, 66, 64);
    box(ctx, 14, top, 228, 92);
    text(ctx, this.opts.title, W / 2, top + 6, { align: 'center', shadow: PAL.shadow });
    box(ctx, 58, top + 22, 140, 26, 'sombre');
    const caret = Math.floor(this.game.time * 2) % 2 === 0 ? '_' : ' ';
    text(ctx, this.name + caret, W / 2, top + 26, { align: 'center', color: PAL.cream });
    const phone = touchScreen();
    const what = creature ? 'un surnom' : 'ton nom';
    text(ctx, phone ? `Touche l’écran pour écrire ${what},` : `Tape ${what} au clavier,`, W / 2, top + 56, { align: 'center' });
    text(ctx, this.opts.suggestions?.length ? 'ou ◄ ► pour une suggestion.' : 'B : effacer une lettre.', W / 2, top + 66, { align: 'center' });
    text(ctx, phone ? 'A : valider' : 'Entrée / A : valider', W / 2, top + 78, { align: 'center', color: PAL.grey });
  }
}
