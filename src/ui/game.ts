// Contexte partagé par toutes les scènes : état de partie, entrées, sons, sauvegarde.
import type { Dir, Zone, ZoneId } from '../data/zones';
import { saveGame } from '../engine/saveManager';
import { type GameState } from '../engine/gameState';
import { mathRng, type Rng } from '../engine/rng';
import type { Audio, Sfx } from './audio';
import type { JingleId, TrackId } from './musicScore';
import { box, text } from './draw';
import type { Input } from './input';
import { SceneManager } from './scene';
import { DialogScene } from './scenes/dialog';
import { H } from './screen';

/** Ce que les autres scènes ont besoin de connaître de l'exploration. */
export interface World {
  readonly zone: Zone;
  teleport(zone: ZoneId, x: number, y: number, dir: Dir): void;
}

export class Game {
  readonly scenes = new SceneManager();
  readonly rng: Rng = mathRng;
  state: GameState | null = null;
  world: World | null = null;
  time = 0;
  private toastText = '';
  private toastTimer = 0;
  /** Erreurs rattrapées par la boucle de jeu (consultées par les tests automatisés). */
  readonly errors: string[] = [];

  constructor(
    readonly input: Input,
    readonly audio: Audio,
  ) {}

  /** État de la partie en cours (erreur si aucune partie n'est chargée). */
  get s(): GameState {
    if (!this.state) throw new Error('Aucune partie en cours');
    return this.state;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.state) this.state.playTimeMs += dt * 1000;
    this.scenes.update(dt);
    const music = this.scenes.music();
    if (music !== undefined) this.audio.music.play(music);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.input.endFrame(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.scenes.render(ctx);
    if (this.toastTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.toastTimer * 2);
      // En bas à gauche : la zone la moins utilisée par les menus.
      const w = 116;
      box(ctx, 2, H - 21, w, 19, 'sombre');
      text(ctx, this.toastText, 2 + w / 2, H - 18, { color: '#fff8e8', align: 'center' });
      ctx.restore();
    }
  }

  sfx(name: Sfx): void {
    this.audio.play(name);
  }

  /** Jingle (soin, capture, insigne…) : la musique reprend ensuite. */
  jingle(id: JingleId, onDone?: () => void): void {
    this.audio.music.jingle(id, onDone);
  }

  /**
   * Filet de sécurité : si une scène plante, on la referme et on revient à la
   * précédente plutôt que de laisser le jeu figé.
   */
  recover(error: unknown): void {
    this.errors.push(error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error));
    console.error(error);
    if (this.scenes.size > 1) this.scenes.pop();
    this.input.consume();
    this.toast('Oups ! Retour en arrière.');
  }

  toast(message: string): void {
    this.toastText = message;
    this.toastTimer = 1.6;
  }

  /** Sauvegarde automatique (silencieuse si `quiet`). */
  save(quiet = false): boolean {
    if (!this.state) return false;
    const ok = saveGame(this.state);
    if (!quiet) this.toast(ok ? 'Partie sauvegardée' : 'Sauvegarde impossible');
    return ok;
  }

  /** Vitesse d'affichage du texte, en caractères par seconde. */
  get textSpeed(): number {
    const speed = this.state?.options.textSpeed ?? 'normal';
    return speed === 'lent' ? 28 : speed === 'rapide' ? 140 : 60;
  }

  say(lines: string[], onDone?: () => void, music?: TrackId): void {
    this.scenes.push(new DialogScene(this, lines, { onDone, music }));
  }

  ask(lines: string[], choices: string[], onChoice: (index: number) => void, cancelIndex = choices.length - 1): void {
    this.scenes.push(new DialogScene(this, lines, { choices, onChoice, cancelIndex }));
  }
}
