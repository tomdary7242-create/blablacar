// Combattants humains sculptés en volume, pour les duels : le bandit (de face,
// machette levée, ou à genoux quand il implore) et le héros (de dos, en garde).
// Mêmes outils que les Jinémon (voir sculpt.ts), mais des proportions d'adulte.
import type { CharacterLook } from '../data/trainers';
import { shade } from './draw';
import { Sculpt, type SculptImage, type V3, type View } from './sculpt';

export type FighterPose = 'garde' | 'menace' | 'genoux';

const VIEWS: Record<'face' | 'dos', View> = { face: { yaw: 62, pitch: 10 }, dos: { yaw: 236, pitch: 12 } };

interface Built {
  s: Sculpt;
  eyes: V3[];
  brows: Array<[V3, V3]>;
  mouth: [V3, V3];
}

/** Modèle : regard vers −x, y vers le haut (sol en 0), z vers le flanc gauche. */
function build(look: CharacterLook, pose: FighterPose): Built {
  const s = new Sculpt();
  const skin = s.material({ color: look.skin });
  const cloth = s.material({ color: look.outfit, fur: 0.15 });
  const trousers = s.material({ color: shade(look.outfit, -0.45) });
  const accent = s.material({ color: look.accent, edge: true });
  const leather = s.material({ color: '#5a3a22', edge: true });
  const metal = s.material({ color: '#c8ccd0', gloss: true, edge: true });
  const hair = s.material({ color: '#1c1412', fur: 0.5 });

  const kneel = pose === 'genoux';
  const hipY = kneel ? 9.5 : 16;
  const lean = kneel ? 1.6 : 0;

  // Jambes : à genoux, l'une repose au sol et l'autre sert d'appui.
  for (const side of [1, -1]) {
    const z = side * 1.9;
    let knee: V3;
    let ankle: V3;
    if (!kneel) {
      knee = [-0.6 - (pose === 'garde' ? side * 0.8 : 0), 8.6, z * 1.12];
      ankle = [0.2 - (pose === 'garde' ? side * 1.6 : 0), 1.4, z * 1.2];
    } else if (side === 1) {
      knee = [-4.6, 8.2, z];
      ankle = [-4.4, 1.3, z];
    } else {
      knee = [-0.5, 1.4, z];
      ankle = [5.4, 1.2, z];
    }
    s.cone([0, hipY, z], knee, 2.1, 1.6, trousers, { k: 1.5 });
    s.cone(knee, ankle, 1.6, 1.15, trousers, { k: 0.6 });
    s.ellipsoid([ankle[0] - 1.1, 0.9, ankle[2]], [2.2, 0.9, 1.15], leather, { k: 0.4 });
  }

  // Tunique ample (boubou court) serrée à la taille.
  const chest: V3 = [lean * 0.4, hipY + 8.5, 0];
  const shoulderY = hipY + 12;
  s.cone([lean * 0.2, hipY - 2.5, 0], [0, hipY + 4, 0], 4.6, 3.5, cloth, { k: 1 });
  s.ellipsoid([lean * 0.3, hipY + 4.5, 0], [2.9, 3.8, 3.6], cloth, { k: 2 });
  s.ellipsoid(chest, [3.2, 4.8, 4.9], cloth, { k: 2.5 });
  s.ellipsoid([lean * 0.3, hipY + 1.2, 0], [3.05, 0.75, 3.75], accent, { k: 0.3 });

  // Bras : manches courtes, avant-bras nus.
  const shoulders: V3[] = [];
  for (const side of [1, -1]) {
    const sh: V3 = [lean * 0.4, shoulderY - 0.8, side * 4.9];
    shoulders.push(sh);
    let elbow: V3;
    let hand: V3;
    const weaponArm = side === -1 && pose === 'menace';
    if (weaponArm) {
      elbow = [0.4, shoulderY + 3.4, side * 7];
      hand = [-0.6, shoulderY + 7.4, side * 6.4];
    } else if (pose === 'garde') {
      elbow = [-2.6, shoulderY - 5.2, side * 5];
      hand = [-5.6, shoulderY - 2.4, side * 2.6];
    } else if (kneel) {
      // Mains jointes, tendues vers vous.
      elbow = [-2.8, shoulderY - 5.4, side * 4.4];
      hand = [-5.8, shoulderY - 4.2, side * 0.9];
    } else {
      elbow = [-0.8, shoulderY - 5.8, side * 5.1];
      hand = [-2.2, shoulderY - 10.5, side * 4.8];
    }
    const mid: V3 = [(sh[0] + elbow[0]) / 2, (sh[1] + elbow[1]) / 2, (sh[2] + elbow[2]) / 2];
    s.cone(sh, mid, 2.0, 1.75, cloth, { k: 1.2 });
    s.cone(mid, elbow, 1.55, 1.3, skin, { k: 0.4 });
    s.cone(elbow, hand, 1.3, 1.05, skin, { k: 0.4 });
    s.sphere(hand, 1.3, skin, { k: 0.5 });
    if (weaponArm) {
      // Machette levée au-dessus de la tête.
      s.cone([hand[0] + 0.2, hand[1] - 1, hand[2]], [hand[0] + 0.5, hand[1] + 1.6, hand[2]], 0.6, 0.6, leather);
      s.box([hand[0] + 2.4, hand[1] + 6.6, hand[2]], [1.15, 5.4, 0.3], 0.25, metal, { rot: [0, 0, -20] });
    }
  }

  // Cou et tête.
  const head: V3 = [lean * 1.2 - 0.3, shoulderY + 3.6, 0];
  const headR = 3.5;
  s.cone([lean * 0.5, shoulderY - 0.5, 0], [head[0], head[1] - 1.5, 0], 1.6, 1.3, skin, { k: 0.8 });
  s.ellipsoid(head, [headR * 0.98, headR * 1.12, headR * 0.92], skin, { k: 0.6 });
  // Nez et mâchoire.
  s.ellipsoid([head[0] - headR * 0.92, head[1] - 0.3, 0], [0.55, 0.8, 0.5], skin, { k: 0.4 });

  const hw = look.headwear;
  if (!hw || hw === 'masque') {
    s.ellipsoid([head[0] + 0.5, head[1] + 1.1, 0], [headR * 0.98, headR * 0.85, headR * 0.95], hair, { k: 0.3 });
  }
  if (hw === 'chapeau') {
    const straw = s.material({ color: '#c8a050', pattern: { kind: 'rayures', color: '#a07830', scale: 0.8, axis: 1 }, edge: true });
    s.capped([head[0], head[1] + 1.8, 0], [head[0], head[1] + 2.2, 0], 7, 7, straw, { round: 0.2 });
    s.cone([head[0], head[1] + 2, 0], [head[0] + 0.3, head[1] + 5.2, 0], 3.2, 0.9, straw, { k: 0.5 });
  } else if (hw === 'foulard') {
    s.ellipsoid([head[0] + 0.4, head[1] + 1.2, 0], [headR * 1.05, headR * 0.95, headR * 1.02], accent, { k: 0.4 });
    s.ellipsoid([head[0] + 3.3, head[1] - 0.2, 0], [1.4, 1.6, 1.2], accent, { k: 0.8 });
  } else if (hw === 'bonnet') {
    s.ellipsoid([head[0] + 0.2, head[1] + 1.6, 0], [headR * 1.02, headR * 0.82, headR * 1.0], accent, { k: 0.3 });
  } else if (hw === 'turban') {
    const cloth2 = s.material({ color: look.accent, pattern: { kind: 'rayures', color: shade(look.accent, -0.25), scale: 0.6, axis: 1 } });
    s.ellipsoid([head[0] + 0.3, head[1] + 1.8, 0], [headR * 1.12, headR * 0.9, headR * 1.1], cloth2, { k: 0.5 });
    // Voile du chèche sur le bas du visage.
    s.ellipsoid([head[0] - 0.6, head[1] - 1.2, 0], [headR * 0.78, headR * 0.6, headR * 0.98], cloth2, { k: 0.4 });
  } else if (hw === 'masque') {
    const wood = s.material({ color: '#7a4a2a', edge: true });
    const paint = s.material({ color: '#ece4d4' });
    s.box([head[0] - headR * 0.8, head[1] - 0.4, 0], [0.8, headR * 1.4, headR * 0.78], 0.6, wood, { k: 0.2 });
    s.box([head[0] - headR * 0.8, head[1] + headR * 1.25, 0], [0.5, 1.6, 0.35], 0.3, wood, { k: 0.3 });
    s.paint([head[0] - headR * 1.6, head[1] - 0.4, 0], [1.2, headR * 1.5, 0.42], paint);
    s.paint([head[0] - headR * 1.6, head[1] + 0.5, 0], [1.2, 0.4, headR * 0.9], paint);
  }

  const face = head[0] - headR * 0.92;
  const eyes: V3[] = [1, -1].map((side): V3 => [face + 0.4, head[1] + 0.35, side * 1.15]);
  const brows: Array<[V3, V3]> = [1, -1].map((side): [V3, V3] => [
    [face + 0.35, head[1] + 1.15, side * 0.55],
    [face + 0.45, head[1] + 1.45, side * 1.75],
  ]);
  const mouth: [V3, V3] = [
    [face + 0.3, head[1] - 1.55, 0.7],
    [face + 0.3, head[1] - 1.55, -0.7],
  ];
  return { s, eyes, brows, mouth };
}

const cache = new Map<string, HTMLCanvasElement>();
/** Hauteur mesurée d'un combattant debout : tous les combattants sont rendus à la même échelle. */
const STANDING = 37.5;

/**
 * Sprite d'un combattant, pied au bas de l'image et centré : `size` pixels de large,
 * un quart de plus en hauteur pour la machette levée. Un homme debout mesure environ `size`.
 */
export function fighterSprite(look: CharacterLook, facing: 'face' | 'dos', pose: FighterPose, size: number): HTMLCanvasElement {
  const key = `${look.skin}${look.outfit}${look.accent}${look.headwear}:${facing}:${pose}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { s, eyes, brows, mouth } = build(look, pose);
  const view = VIEWS[facing];
  const box = s.measure(view);
  const scale = (size - 6) / STANDING;
  const height = Math.round(size * 1.25);
  const img = s.render({ size, height, scale, ground: Math.round(height - 2 + box.y0 * scale), center: (box.x0 + box.x1) / 2, view });
  if (facing === 'face') {
    const masked = look.headwear === 'masque';
    const ink = '#140c08';
    for (const e of eyes) {
      const p = img.project(masked ? [e[0] - 0.9, e[1] - 0.2, e[2]] : e, masked ? 4 : 3);
      if (!p.visible) continue;
      img.put(p.x, p.y, ink);
      // Fentes du masque : deux pixels de haut.
      if (masked) img.put(p.x, p.y + 1, ink);
    }
    if (!masked) {
      for (const [a, b] of brows) line(img, a, b, shade(look.skin, -0.55));
      line(img, mouth[0], mouth[1], shade(look.skin, -0.5));
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.w;
  canvas.height = img.h;
  canvas.getContext('2d')!.putImageData(new ImageData(img.rgba, img.w, img.h), 0, 0);
  cache.set(key, canvas);
  return canvas;
}

function line(img: SculptImage, a: V3, b: V3, color: string): void {
  const p = img.project(a, 3);
  const q = img.project(b, 3);
  if (!p.visible || !q.visible) return;
  const n = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(p.x + ((q.x - p.x) * i) / n);
    const y = Math.round(p.y + ((q.y - p.y) * i) / n);
    if (img.filled(x, y)) img.put(x, y, color);
  }
}
