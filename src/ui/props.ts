// Objets du décor sculptés en volume (arbres, baobabs, cases, greniers…),
// vus en plongée comme la carte, puis rendus en pixel art comme les Jinémon.
import { shade } from './draw';
import { Sculpt, type MaterialDef, type V3 } from './sculpt';

export interface Prop {
  img: HTMLCanvasElement;
  /** Pixels RGBA de l'image (évite de relire le canevas). */
  data: Uint8ClampedArray<ArrayBuffer>;
  /** Position du pied de l'objet (origine du modèle) dans l'image. */
  ax: number;
  ay: number;
}

export interface PropPalette {
  tree: string;
  trunk: string;
  rock: string;
  round: boolean;
}

/** Angle de vue : plongée de la carte par défaut, presque à hauteur d'yeux pour les fonds de combat. */
export interface PropView {
  pitch: number;
  scale: number;
}

const MAP_VIEW: PropView = { pitch: 34, scale: 1 };
const cache = new Map<string, Prop>();

export type Builder = (s: Sculpt, m: (color: string, extra?: Omit<MaterialDef, 'color'>) => number) => void;

export function sculpted(key: string, build: Builder, pv: PropView = MAP_VIEW): Prop {
  const fullKey = `${key}@${pv.pitch}:${pv.scale}`;
  const hit = cache.get(fullKey);
  if (hit) return hit;
  const s = new Sculpt();
  build(s, (color, extra = {}) => s.material({ color, ...extra }));
  const view = { yaw: 0, pitch: pv.pitch };
  const box = s.measure(view);
  const k = pv.scale;
  const w = Math.ceil((box.x1 - box.x0) * k) + 3;
  const h = Math.ceil((box.y1 - box.y0) * k) + 3;
  const center = (box.x0 + box.x1) / 2;
  const ground = Math.round(h - 2 + box.y0 * k);
  const out = s.render({ size: w, height: h, scale: k, ground, center, view });
  const img = document.createElement('canvas');
  img.width = w;
  img.height = h;
  img.getContext('2d')!.putImageData(new ImageData(out.rgba, w, h), 0, 0);
  const prop = { img, data: out.rgba, ax: Math.round(w / 2 - center * k), ay: ground };
  cache.set(fullKey, prop);
  return prop;
}

const leafy = (m: (c: string, e?: Omit<MaterialDef, 'color'>) => number, color: string) => m(color, { fur: 1 });
const barkMat = (m: (c: string, e?: Omit<MaterialDef, 'color'>) => number, color: string) =>
  m(color, { pattern: { kind: 'rayures', color: shade(color, -0.25), scale: 1.8, amount: 0.3, axis: 0 } });

/** Acacia à cime plate (savane) ou arbre feuillu (forêt, marigot). */
export function treeProp(pal: PropPalette, variant: number, pv?: PropView): Prop {
  return sculpted(`arbre:${pal.tree}:${pal.round}:${variant}`, (s, m) => {
    const bark = barkMat(m, pal.trunk);
    const crown = leafy(m, pal.tree);
    const light = leafy(m, shade(pal.tree, 0.08));
    const flip = variant % 2 ? -1 : 1;
    if (pal.round) {
      s.cone([0, 0, 0], [0, 9, 0], 2.2, 1.6, bark);
      s.cone([0.5, 0, 1], [3, 0, 3], 1.4, 0.4, bark, { k: 1 });
      s.cone([-0.5, 0, 1], [-3, 0, 2.5], 1.3, 0.4, bark, { k: 1 });
      s.sphere([0, 15, 0], 7.8, crown, { amp: 1.3, freq: 0.5 });
      s.sphere([-4.5 * flip, 12.5, 2.5], 5, crown, { amp: 1.1, freq: 0.55 });
      s.sphere([4.5 * flip, 12, 1.5], 5.2, crown, { amp: 1.1, freq: 0.55 });
      s.sphere([-2 * flip, 19, 0.5], 5, light, { amp: 1, freq: 0.6 });
      s.sphere([3 * flip, 18.5, -1.5], 4.5, light, { amp: 1, freq: 0.6 });
      if (variant === 2) s.sphere([0, 21.5, 1], 3.6, light, { amp: 0.8, freq: 0.6 });
    } else {
      // Acacia : tronc fin, branches en V, large ombrelle plate.
      s.cone([0, 0, 0], [0.5 * flip, 7, 0], 1.7, 1.2, bark);
      s.tube([[0.5 * flip, 6, 0], [-4 * flip, 11, 1], [-7.5 * flip, 14.5, 0.5]], [1.1, 0.8, 0.6], bark, { k: 0.6 });
      s.tube([[0.5 * flip, 6, 0], [4.5 * flip, 12, -1], [7 * flip, 15.5, -0.5]], [1.1, 0.8, 0.6], bark, { k: 0.6 });
      s.ellipsoid([0, 17, 0], [12.5, 3.2, 8], crown, { amp: 1.2, freq: 0.45 });
      s.ellipsoid([-6 * flip, 18.5, 2], [6.5, 2.6, 5], light, { amp: 1, freq: 0.55 });
      s.ellipsoid([6 * flip, 18.2, -1.5], [6, 2.4, 4.5], light, { amp: 1, freq: 0.55 });
      if (variant === 2) s.ellipsoid([0, 19.5, -2], [5, 2.2, 4], light, { amp: 0.9, freq: 0.55 });
    }
  }, pv);
}

/** Cime dense au cœur d'une forêt. */
export function canopyProp(pal: PropPalette): Prop {
  return sculpted(`canopee:${pal.tree}`, (s, m) => {
    const crown = leafy(m, shade(pal.tree, -0.06));
    const light = leafy(m, pal.tree);
    s.sphere([0, 9, 0], 9, crown, { amp: 1.4, freq: 0.45 });
    s.sphere([-4, 13, 2], 5.5, light, { amp: 1.1, freq: 0.55 });
    s.sphere([4, 11, 3], 5, light, { amp: 1.1, freq: 0.55 });
  });
}

export function baobabProp(pv?: PropView): Prop {
  return sculpted('baobab', (s, m) => {
    const bark = barkMat(m, '#9a8270');
    const foliage = leafy(m, '#5a9a38');
    s.ellipsoid([0, 11, 0], [8, 12, 8], bark);
    s.cone([0, 16, 0], [0, 26, 0], 6, 4.2, bark, { k: 3 });
    for (const side of [-1, 1]) s.cone([side * 3, 1, 3], [side * 9, 0, 6], 2.6, 0.6, bark, { k: 2 });
    const tips: V3[] = [[-12, 33, 1], [11, 34, -1], [0, 36, -4], [-5, 35, 4], [6, 33, 4]];
    for (const t of tips) {
      s.tube([[t[0] * 0.25, 25, t[2] * 0.3], [t[0] * 0.7, t[1] - 2, t[2] * 0.8], t], [2.2, 1.3, 0.8], bark, { k: 1.2 });
      s.sphere([t[0], t[1] + 1.5, t[2]], 4.2, foliage, { amp: 1.1, freq: 0.6 });
    }
  }, pv);
}

/** Case ronde en banco coiffée d'un toit conique de chaume. */
export function hutProp(pv?: PropView): Prop {
  return sculpted('case', (s, m) => {
    const banco = m('#c88a5e', { pattern: { kind: 'craquelures', color: '#a86c44', scale: 4 } });
    const straw = m('#d8b468', { pattern: { kind: 'rayures', color: '#b08a40', scale: 1.4, amount: 0.35, axis: 0 } });
    const rim = m('#a88038', { pattern: { kind: 'rayures', color: '#806028', scale: 1.2, amount: 0.4, axis: 0 } });
    s.capped([0, 0, 0], [0, 13, 0], 14.5, 14, banco, { round: 1 });
    s.paint([0, 5, 14.2], [3.6, 6.5, 2.4], m('#3a2214'));
    s.paint([0, 12, 14], [5, 1.2, 2], m('#e0a878'));
    s.capped([0, 11.5, 0], [0, 14, 0], 18.5, 18, rim, { round: 1, amp: 0.6, freq: 0.8 });
    s.capped([0, 13.5, 0], [0, 32, 0], 18, 0.8, straw, { round: 0.8, amp: 0.7, freq: 0.7, stretch: 0.4 });
    s.capped([0, 30, 0], [0, 34, 0], 1.6, 0.6, rim);
  }, pv);
}

export function granaryProp(pv?: PropView): Prop {
  return sculpted('grenier', (s, m) => {
    const banco = m('#c08058', { pattern: { kind: 'craquelures', color: '#9a6040', scale: 3 } });
    const straw = m('#d8b468', { pattern: { kind: 'rayures', color: '#b08a40', scale: 1.3, amount: 0.35, axis: 0 } });
    const stone = m('#8a8070');
    for (const [x, z] of [[-3.5, 2], [3.5, 2], [0, -3.5]] as const) s.sphere([x, 1.2, z], 1.8, stone, { amp: 0.4, freq: 0.8 });
    s.capped([0, 2.5, 0], [0, 12, 0], 5.5, 6, banco, { round: 0.8 });
    s.paint([0, 8, 5.8], [1.8, 2, 1.5], m('#4a2a18'));
    s.capped([0, 11.5, 0], [0, 23, 0], 8.5, 0.5, straw, { round: 0.6, amp: 0.6, freq: 0.8, stretch: 0.4 });
  }, pv);
}

export function termiteProp(pv?: PropView): Prop {
  return sculpted('termitiere', (s, m) => {
    const earth = m('#b8683a', { pattern: { kind: 'craquelures', color: '#8a4a28', scale: 2.6 } });
    s.capped([0, 0, 0], [0.5, 24, 0], 7, 1.2, earth, { round: 1, amp: 1.2, freq: 0.5 });
    s.capped([4.5, 0, 1.5], [5, 15, 1], 4, 0.8, earth, { round: 0.8, k: 2, amp: 1, freq: 0.6 });
    s.capped([-4.5, 0, -1], [-5, 11, -1], 3.6, 0.8, earth, { round: 0.8, k: 2, amp: 1, freq: 0.6 });
    s.paint([1, 9, 5.5], [1.4, 1.4, 1.5], m('#4a2410'));
  }, pv);
}

export function boulderProp(cracked: boolean, rock: string, pv?: PropView): Prop {
  return sculpted(`rocher:${cracked}:${rock}`, (s, m) => {
    const mat = m(cracked ? '#b07a52' : rock, { pattern: { kind: 'craquelures', color: cracked ? '#3a2014' : shade(rock, -0.2), scale: cracked ? 4 : 3, amount: cracked ? 0.1 : 0.06 } });
    s.ellipsoid([0, 4.8, 0], [6.5, 5.5, 5.5], mat, { amp: 1, freq: 0.35 });
    s.sphere([4, 2.5, 2.5], 3, mat, { k: 1.5, amp: 0.6, freq: 0.5 });
  }, pv);
}

export function wellProp(): Prop {
  return sculpted('puits', (s, m) => {
    const stone = m('#a8a090', { pattern: { kind: 'ecailles', color: '#7a7466', scale: 2.4, amount: 0.12 } });
    const wood = barkMat(m, '#7a5032');
    s.capped([0, 0, 0], [0, 5, 0], 7.5, 7.2, stone, { round: 0.8 });
    s.paint([0, 5, 0], [5.6, 0.8, 5.6], m('#28486a', { gloss: true }));
    for (const side of [-1, 1]) s.cone([side * 6.5, 4, 0], [side * 6.5, 15, 0], 0.9, 0.8, wood);
    s.cone([-7.5, 15, 0], [7.5, 15, 0], 0.9, 0.9, wood);
    s.cone([0, 14.5, 0], [0, 9.5, 0], 0.25, 0.25, m('#c8b080'));
    s.capped([0, 9.5, 0], [0, 7.5, 0], 1.4, 1.2, m('#8a6034'), { round: 0.3 });
  });
}

export function altarProp(): Prop {
  return sculpted('autel', (s, m) => {
    const stone = m('#9a9080', { pattern: { kind: 'craquelures', color: '#7a7060', scale: 3 } });
    s.box([0, 3, 0], [5.5, 3, 4], 1, stone);
    s.paint([0, 6, 0], [6.5, 1, 3], m('#c84020'));
    s.sphere([2.5, 7.8, 0], 2.2, m('#e0b060', { gloss: true }));
    s.cone([2.5, 9.7, 0], [2.5, 10.8, 0], 0.6, 0.4, m('#8a6030'));
    s.sphere([-2.5, 6.8, 1], 1, m('#a83a2a'));
    s.sphere([-1, 6.8, 1.5], 0.9, m('#c8a040'));
  });
}

export function stallProp(): Prop {
  return sculpted('etal', (s, m) => {
    const wood = barkMat(m, '#7a4a28');
    const cloth = m('#3a86c8', { pattern: { kind: 'rayures', color: '#f0f0f0', scale: 3, amount: 0.45, axis: 0 } });
    for (const x of [-6.5, 6.5]) for (const z of [-3, 3]) s.cone([x, 0, z], [x, 15, z], 0.7, 0.6, wood);
    s.box([0, 6, 0], [7.5, 1, 4], 0.4, wood);
    const fruits: Array<[number, number, string]> = [[-4.5, 1.5, '#e85a2a'], [-2, 0.5, '#f0c040'], [0.5, 1.8, '#e85a2a'], [3, 0.4, '#5fa83a'], [5, 1.6, '#f0c040'], [-3, -1.5, '#5fa83a'], [2, -1.6, '#c83a3a']];
    for (const [x, z, c] of fruits) s.sphere([x, 8, z], 1.4, m(c, { gloss: true }));
    s.box([0, 15.5, 0.5], [8.5, 0.6, 5], 0.3, cloth, { rot: [0, 0, -14] });
  });
}

export function signProp(): Prop {
  return sculpted('panneau', (s, m) => {
    const wood = barkMat(m, '#7a4a28');
    s.cone([0, 0, 0], [0, 7, 0], 1, 0.9, wood);
    s.box([0, 9, 0.5], [6, 3, 0.7], 0.4, m('#c8a060', { pattern: { kind: 'rayures', color: '#8a6a38', scale: 2, amount: 0.2, axis: 1 }, edge: true }));
  });
}

export function forgeProp(): Prop {
  return sculpted('forge', (s, m) => {
    const stone = m('#6a6060', { pattern: { kind: 'ecailles', color: '#4a4242', scale: 2.2, amount: 0.12 } });
    s.capped([0, 0, 0], [0, 4, 0], 7, 6.5, stone, { round: 0.8 });
    s.paint([0, 4, 0], [5, 0.8, 5], m('#ff7a2a', { glow: true }));
  });
}
