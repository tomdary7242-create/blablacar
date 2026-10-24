// Point d'entrée : écran, entrées, boucle de jeu et sauvegarde automatique.
import './style.css';
import { Audio } from './ui/audio';
import { Game } from './ui/game';
import { Input, type Button } from './ui/input';
import { TitleScene } from './ui/scenes/title';
import { Screen } from './ui/screen';

const canvas = document.getElementById('ecran') as HTMLCanvasElement;
const container = document.getElementById('cadre') as HTMLElement;
const screen = new Screen(canvas, container);
const input = new Input();
const audio = new Audio();
const game = new Game(input, audio);
input.onFirstInteraction = () => audio.unlock();

// Manette tactile
document.querySelectorAll<HTMLElement>('[data-bouton]').forEach((el) => {
  input.bindTouch(el, el.dataset.bouton as Button);
});
const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('tactile', touch);
screen.resize();

game.scenes.push(new TitleScene(game));

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  screen.ctx.clearRect(0, 0, 320, 240);
  game.render(screen.ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Sauvegarde automatique quand on quitte ou masque la page.
const autosave = () => {
  if (game.state?.flags.starter || game.state?.party.length) game.save(true);
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') autosave();
});
window.addEventListener('pagehide', autosave);
setInterval(autosave, 30_000);

// Accès pour le débogage et les tests automatisés.
(window as unknown as { ginemon: Game }).ginemon = game;
