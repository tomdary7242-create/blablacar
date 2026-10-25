// Modelage des Jinémon ajoutés au Ginédex (n° 074 à 128), dont les six Hantises.
// Les quadrupèdes réutilisent le plan commun (creatures.ts) avec des réglages
// et des finitions ; les autres familles ont chacune leur propre modèle.
import type { QuadFrame, QuadShape } from './creatures';
import { shade } from './draw';
import type { V3 } from './sculpt';
import {
  BIPED_DEFAULT,
  SIDES,
  add3,
  batWing,
  featherWing,
  flame,
  frontEyes,
  horn,
  hornMat,
  humanoid,
  jointedLeg,
  leaf,
  lerp3,
  rad,
  saurian,
  spikeRow,
  type Build,
  type Side,
} from './sculptKit';

// ── Quadrupèdes : réglages ───────────────────────────────────────────────

const scales = (color: string, scale = 2.6, amount = 0.2) => ({ kind: 'ecailles' as const, color, scale, amount });
const calico = { kind: 'taches' as const, color: '#3a3030', scale: 6, amount: 0.38 };

export const NEW_QUAD_TUNING: Record<number, Partial<QuadShape>> = {
  // Pangolins : dos arqué couvert d'écailles, longue queue, petite tête pointue.
  74: { len: 10, girth: 6.5, width: 5.5, legLen: 5.5, legR: 2.2, neck: 2.5, neckAngle: 12, headR: 4.6, snout: 5.5, snoutR: 1.4, snoutDrop: 0.45, ears: 'aucune', tail: 'aucune', fur: 0, slope: -1.5, eyeScale: 1.25, skin: { pattern: scales('#5a3a24'), belly: '#f0d8b0' } },
  75: { len: 13, girth: 8, width: 7, legLen: 7, legR: 2.8, neck: 3, neckAngle: 12, headR: 5.5, snout: 6, snoutR: 1.8, snoutDrop: 0.45, ears: 'aucune', tail: 'aucune', fur: 0, slope: -2, eye: 'feroce', skin: { gloss: true, pattern: scales('#3a3028', 3.2), belly: '#d8c0a0' } },
  // Hippopotames : tonneau sur pattes courtes, museau énorme, yeux hauts.
  78: { len: 12, girth: 9, width: 8, legLen: 5.5, legR: 3.2, neck: 2, neckAngle: 20, headR: 7, snout: 4.5, snoutR: 5, snoutDrop: 0.15, ears: 'rondes', earSize: 0.55, tail: 'courte', fur: 0, muzzle: '#d8a0a8', skin: { belly: '#f0c0c8', gloss: true } },
  79: { len: 15, girth: 11, width: 9.5, legLen: 7, legR: 4, neck: 2.5, neckAngle: 25, headR: 7.5, snout: 5.5, snoutR: 5.5, snoutDrop: 0.2, ears: 'rondes', earSize: 0.6, tail: 'courte', fur: 0, muzzle: '#c88a90', eye: 'doux', skin: { belly: '#e8b8c0', gloss: true } },
  // Dromadaires : hautes pattes, long cou en col de cygne, bosse.
  80: { len: 10, girth: 6.5, width: 5.5, legLen: 15, legR: 1.9, neck: 11, neckAngle: 35, headR: 4.6, snout: 5, snoutR: 2.4, snoutDrop: 0.55, ears: 'rondes', earSize: 0.5, tail: 'touffe', fur: 0.4, muzzle: '#e8c890', eyeScale: 1.15 },
  81: { len: 13, girth: 8, width: 6.5, legLen: 18, legR: 2.3, neck: 13, neckAngle: 38, headR: 5, snout: 6, snoutR: 2.8, snoutDrop: 0.55, ears: 'rondes', earSize: 0.5, tail: 'touffe', fur: 0.4, muzzle: '#e0b880', eye: 'feroce' },
  // Masques cracheurs de feu : corps de raphia, tête-masque à gueule de crocodile.
  86: { len: 10, girth: 7, width: 5.5, legLen: 7, legR: 2.3, neck: 3, neckAngle: 25, headR: 6, snout: 7, snoutR: 2.4, snoutDrop: 0.12, ears: 'pointues', earSize: 0.7, tail: 'touffe', fur: 1, muzzle: '#c8401a', horns: 'antilope', eye: 'lueur' },
  87: { len: 13, girth: 9, width: 7, legLen: 9, legR: 3, neck: 4, neckAngle: 25, headR: 7, snout: 9.5, snoutR: 2.8, snoutDrop: 0.12, ears: 'pointues', earSize: 0.8, tail: 'touffe', fur: 1, muzzle: '#d8501a', horns: 'antilope', eye: 'lueur' },
  // Okapi : long cou, grandes oreilles, pattes zébrées.
  88: { len: 12, girth: 7.5, width: 6, legLen: 15, legR: 2.2, neck: 9, neckAngle: 58, headR: 5.5, snout: 5.5, snoutR: 2.4, snoutDrop: 0.7, ears: 'pointues', earSize: 1.25, tail: 'fine', hooves: true, fur: 0.2, muzzle: '#e8dcd0', horns: 'bourgeons' },
  // Chats-fantômes : robe tricolore, longue queue dressée.
  98: { len: 9, girth: 5.5, width: 4.5, legLen: 8, legR: 1.7, neck: 3, neckAngle: 55, headR: 6, snout: 2, snoutR: 2, snoutDrop: 0.2, ears: 'renard', earSize: 0.85, tail: 'aucune', fur: 0.6, eye: 'feroce', eyeScale: 1.15, muzzle: '#ffffff', skin: { pattern: calico, belly: '#ffffff' } },
  99: { len: 11, girth: 6, width: 5, legLen: 10, legR: 1.9, neck: 4, neckAngle: 55, headR: 6.2, snout: 2.2, snoutR: 2.1, snoutDrop: 0.2, ears: 'renard', earSize: 0.95, tail: 'aucune', fur: 0.6, eye: 'lueur', muzzle: '#ffffff', skin: { pattern: calico, belly: '#ffffff' } },
  // Tanuki : tout rond, masque sombre, queue touffue.
  100: { len: 9, girth: 7.5, width: 6.5, legLen: 6, legR: 2, neck: 2, neckAngle: 40, headR: 6.5, snout: 3.4, snoutR: 2, snoutDrop: 0.25, ears: 'rondes', earSize: 0.85, tail: 'renard', fur: 0.8, muzzle: '#e8dcc8', eye: 'doux', eyeScale: 1.1, socks: '#3a2a22', skin: { belly: '#d8b888' } },
  // Qilin : cerf-dragon écailleux à crinière d'or.
  103: { len: 12, girth: 7.5, width: 6, legLen: 14, legR: 2.2, neck: 8, neckAngle: 55, headR: 6, snout: 5, snoutR: 2.6, snoutDrop: 0.45, ears: 'pointues', earSize: 0.8, tail: 'touffe', hooves: true, fur: 0.2, mane: 'crete', eye: 'feroce', skin: { pattern: scales('#2a8a74', 2.2, 0.18), belly: '#f0e0a0' } },
  // Pixiu : lion ailé doré.
  105: { len: 12, girth: 8, width: 6.5, legLen: 10, legR: 3, neck: 4, neckAngle: 45, headR: 7, snout: 3.5, snoutR: 3.4, snoutDrop: 0.3, ears: 'rondes', earSize: 0.7, tail: 'touffe', fur: 0.4, mane: 'lion', horns: 'bourgeons', eye: 'feroce', skin: { gloss: true } },
  // Griffons : corps de lion, tête et ailes d'aigle.
  112: { len: 10, girth: 6.5, width: 5.5, legLen: 9, legR: 2.2, neck: 5, neckAngle: 55, headR: 5.5, snout: 1, snoutR: 1, ears: 'aucune', tail: 'touffe', fur: 0.4, snoutless: true, eye: 'feroce', eyeScale: 1.15 },
  113: { len: 14, girth: 8.5, width: 7, legLen: 12, legR: 2.8, neck: 6, neckAngle: 55, headR: 6.2, snout: 1, snoutR: 1, ears: 'aucune', tail: 'touffe', fur: 0.4, snoutless: true, eye: 'feroce' },
  // Bunyip : chien-phoque des marais, crinière d'algues et défenses.
  114: { len: 13, girth: 8.5, width: 7, legLen: 5, legR: 2.6, neck: 4, neckAngle: 30, headR: 6.8, snout: 4.5, snoutR: 3, snoutDrop: 0.35, ears: 'tombantes', earSize: 0.9, tail: 'cheval', fur: 0.9, mane: 'algues', eye: 'lueur' },
  // Ahuizotl : chien d'eau au pelage hérissé, une main au bout de la queue.
  116: { len: 10, girth: 6, width: 5, legLen: 7, legR: 2, neck: 3, neckAngle: 35, headR: 6, snout: 4, snoutR: 2.2, ears: 'pointues', earSize: 0.9, tail: 'aucune', fur: 0.9, eye: 'feroce', skin: { gloss: true } },
  // Chupacabra : glabre, voûté, piquants sur l'échine.
  117: { len: 10, girth: 6.5, width: 5, legLen: 11, legR: 1.9, neck: 4, neckAngle: 45, headR: 6.5, snout: 3.2, snoutR: 2.2, snoutDrop: 0.25, ears: 'renard', earSize: 0.75, tail: 'fine', fur: 0, slope: 2, eye: 'lueur', skin: { pattern: scales('#3a4a2a', 2, 0.15) } },
  // Bélier de Shango : toison de laine, cornes enroulées.
  121: { len: 11, girth: 8, width: 6.5, legLen: 11, legR: 2.3, neck: 4, neckAngle: 40, headR: 5.5, snout: 4, snoutR: 2.6, snoutDrop: 0.6, ears: 'tombantes', earSize: 0.6, tail: 'courte', hooves: true, fur: 1, horns: 'chevre', muzzle: '#e8d8c8' },
  // Boudarou : hyène-forgeron massive, collier de fer et yeux de braise.
  124: { len: 14, girth: 9, width: 7, legLen: 13, legR: 3.2, neck: 6, neckAngle: 32, headR: 7.5, snout: 6.5, snoutR: 3.6, ears: 'rondes', earSize: 1.1, tail: 'touffe', fur: 0.9, slope: 5, mane: 'crete', eye: 'lueur', muzzle: '#2a2420', skin: { pattern: { kind: 'taches', color: '#2a2420', scale: 4.6, amount: 0.34 } } },
};

// ── Quadrupèdes : finitions ──────────────────────────────────────────────

/** Queue de pangolin, épaisse à la base et couverte d'écailles. */
function pangolinTail(b: Build, f: QuadFrame, big: number): void {
  const t = f.tb;
  b.s.tube([t, [t[0] + 5 * big, t[1] - 1, 0], [t[0] + 9 * big, 3, 0.5], [t[0] + 11.5 * big, 1.2, 1]], [f.q.girth * 0.7, f.q.girth * 0.55, 2.4 * big, 0.9], f.body, { k: 2 });
}

function hippoFace(b: Build, f: QuadFrame, crown: boolean): void {
  const { s, m } = b;
  const e = f.snoutEnd;
  const skin = m(f.q.muzzle ?? '#d8a0a8', { gloss: true });
  for (const side of SIDES) {
    s.sphere([e[0] + 1, e[1] + f.q.snoutR * 0.8, side * 2], 1.4, skin, { k: 0.8 });
    s.cone([e[0] + 0.5, e[1] - f.q.snoutR * 0.3, side * f.q.snoutR * 0.7], [e[0] - 0.2, e[1] - f.q.snoutR - 1.2, side * f.q.snoutR * 0.75], 0.8, 0.3, m('#f0ead8'));
  }
  b.a.eyes = SIDES.map((side): V3 => [f.hc[0] - f.q.headR * 0.35, f.hc[1] + f.q.headR * 0.62, side * f.q.headR * 0.55]);
  if (crown) {
    // Couronne de Taouret : mortier doré et deux hautes plumes.
    const gold = m('#f0c040', { gloss: true, edge: true });
    const top: V3 = [f.hc[0] + 1, f.hc[1] + f.q.headR * 0.85, 0];
    s.capped(top, [top[0], top[1] + 3, 0], 3.2, 3.6, gold, { round: 0.4 });
    for (const side of SIDES) s.ellipsoid([top[0] + 0.5, top[1] + 9, side * 1.4], [1.5, 6.5, 0.6], m('#f8f4e8', { edge: true, pattern: { kind: 'rayures', color: '#3a6ab8', scale: 2.6, amount: 0.2, axis: 1 } }), { rot: [0, 0, side * 6] });
  }
}

function camelTack(b: Build, f: QuadFrame): void {
  const { s, m } = b;
  const [, c2, c3] = b.look.colors;
  // Tapis de selle indigo à motifs, selle et pommeau en croix d'Agadez.
  const cloth = m(c2, { edge: true, pattern: { kind: 'rayures', color: c3, scale: 2.4, amount: 0.25, axis: 0 } });
  s.ellipsoid([0, f.by + f.q.girth * 0.55, 0], [f.q.len * 0.55, f.q.girth * 0.55, f.q.width * 1.12], cloth);
  s.box([f.q.len * 0.1, f.by + f.q.girth * 1.2, 0], [3.2, 1.2, f.q.width * 0.6], 0.6, m('#8a4a22', { edge: true }));
  const cross = m('#e8d8a0', { gloss: true });
  s.cone([-2.4, f.by + f.q.girth * 1.3, 0], [-2.8, f.by + f.q.girth * 1.3 + 5, 0], 0.7, 0.5, cross);
  s.cone([-2.8, f.by + f.q.girth * 1.3 + 4, -1.6], [-2.8, f.by + f.q.girth * 1.3 + 4, 1.6], 0.5, 0.5, cross);
  // Pompons rouges qui pendent.
  const red = m('#d83a2a', { fur: 1 });
  for (let i = 0; i < 4; i++) s.sphere([-f.q.len * 0.35 + i * f.q.len * 0.25, f.by - f.q.girth * 0.2, f.q.width * 1.05], 1, red, { amp: 0.3, freq: 1 });
  s.paint([f.hc[0] - 2, f.hc[1] - 1, 0], [f.q.headR * 1.1, 0.7, f.q.headR * 1.1], m(c3));
}

function maskHead(b: Build, f: QuadFrame): void {
  const { s, m } = b;
  const [, c2, c3] = b.look.colors;
  // La tête est un masque peint : rayures, dents, défenses de phacochère, langue de feu.
  const mask = m(c2, { pattern: { kind: 'rayures', color: c3, scale: 2.8, amount: 0.22, axis: 0 }, edge: true });
  s.paint(f.hc, [f.q.headR * 1.2, f.q.headR * 1.2, f.q.headR * 1.2], mask);
  const e = f.snoutEnd;
  const tooth = m('#f0ead8');
  for (let i = 0; i < 4; i++) {
    const p = lerp3([f.hc[0] - f.q.headR * 0.5, f.hc[1] - f.q.headR * 0.55, 0], e, i / 3.2);
    for (const side of SIDES) s.cone([p[0], p[1] - 1, side * f.q.snoutR * 0.8], [p[0], p[1] - 2.6, side * f.q.snoutR * 0.85], 0.55, 0.15, tooth);
  }
  for (const side of SIDES) {
    const base: V3 = [f.hc[0] - f.q.headR * 0.7, f.hc[1] - f.q.headR * 0.4, side * f.q.headR * 0.6];
    s.tube([base, [base[0] - 1, base[1] + 2.5, base[2] + side * 1.5], [base[0] + 0.5, base[1] + 4.5, base[2] + side * 1.8]], [1, 0.8, 0.25], tooth);
  }
  flame(b, [e[0] - 1, e[1] + 0.5, 0], 6, 2, '#ff8a2a', -3);
  // Costume de raphia qui couvre le corps.
  const raffia = m('#6a5232', { fur: 1 });
  s.ellipsoid([0, f.by - 1, 0], [f.q.len * 0.95, f.q.girth * 0.95, f.q.width * 1.1], raffia, { amp: 1.2, freq: 0.7, stretch: 3 });
}

function okapiStripes(b: Build, f: QuadFrame): void {
  const { s, m } = b;
  const stripes = m(b.look.colors[0], { pattern: { kind: 'rayures', color: b.look.colors[1], scale: 2.2, amount: 0.45, axis: 1 } });
  s.paint([f.q.len * 0.7, f.q.legLen * 0.75, 0], [f.q.len * 0.45, f.q.legLen * 0.8, f.q.width * 1.6], stripes);
  s.paint([-f.q.len * 0.5, f.q.legLen * 0.35, 0], [f.q.legR * 3.5, f.q.legLen * 0.38, f.q.width * 1.6], stripes);
}

function catTails(b: Build, f: QuadFrame, n: number): void {
  const t = f.tb;
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0 : (i - 0.5) * 4;
    b.s.tube([t, [t[0] + 3, t[1] + 5, z * 0.5], [t[0] + 1.5, t[1] + 11, z], [t[0] + 3.5, t[1] + 15, z * 1.2]], [1.1, 0.95, 0.85, 0.7], f.body, { k: 1 });
  }
}

function griffonHead(b: Build, f: QuadFrame): void {
  const { s, m } = b;
  const [, c2, c3] = b.look.colors;
  const feathers = m(c2, { pattern: { kind: 'plumes', color: shade(c2, -0.15), scale: 1.8 } });
  s.paint(f.hc, [f.q.headR * 1.3, f.q.headR * 1.3, f.q.headR * 1.3], feathers);
  s.paint(lerp3(f.neckBase, f.hc, 0.5), [f.q.neck * 0.7, f.q.girth * 0.8, f.q.girth * 0.9], feathers);
  const beak = m(c3, { gloss: true, edge: true });
  const h = f.hc;
  const r = f.q.headR;
  s.tube([[h[0] - r * 0.6, h[1] - r * 0.1, 0], [h[0] - r * 1.5, h[1] - r * 0.2, 0], [h[0] - r * 1.75, h[1] - r * 0.65, 0]], [r * 0.42, r * 0.22, 0.25], beak, { k: 0.6 });
  for (let i = 0; i < 3; i++) leaf(b, [h[0] + r * 0.4, h[1] + r * 0.5, 0], 120 + i * 15, 0, r * (1 - i * 0.15), feathers, 0.3);
  b.a.eyes = SIDES.map((side): V3 => [h[0] - r * 0.5, h[1] + r * 0.25, side * r * 0.62]);
}

export const QUAD_EXTRAS: Record<number, (b: Build, f: QuadFrame) => void> = {
  74: (b, f) => pangolinTail(b, f, 1),
  75: (b, f) => pangolinTail(b, f, 1.3),
  78: (b, f) => hippoFace(b, f, false),
  79: (b, f) => hippoFace(b, f, true),
  81: camelTack,
  86: maskHead,
  87: maskHead,
  88: okapiStripes,
  98: (b, f) => {
    catTails(b, f, 1);
    // Le bakeneko danse un foulard noué sur la tête.
    b.s.ellipsoid([f.hc[0] + 0.5, f.hc[1] + f.q.headR * 0.8, 0], [f.q.headR * 0.85, 1.6, f.q.headR * 0.9], b.m('#c83a3a', { edge: true, pattern: { kind: 'taches', color: '#f0e8d8', scale: 1.6, amount: 0.25 } }));
  },
  99: (b, f) => {
    catTails(b, f, 2);
    // Deux feux d'âmes errantes flottent autour de lui.
    const soul = b.m('#9a7aff', { glow: true });
    for (const [x, y, z] of [[f.hc[0] - 4, f.hc[1] + 8, 6], [f.tb[0] + 6, f.tb[1] + 12, -5]] as const) {
      b.s.sphere([x, y, z], 2.2, soul, { amp: 0.4, freq: 0.8 });
      b.s.cone([x + 1, y + 1, z], [x + 4, y + 5, z], 1.6, 0.2, soul, { k: 1 });
    }
  },
  100: (b, f) => {
    const { s, m } = b;
    // Masque sombre autour des yeux et gourde de saké à la ceinture.
    s.paint([f.hc[0] - f.q.headR * 0.6, f.hc[1] + f.q.headR * 0.1, 0], [f.q.headR * 0.5, f.q.headR * 0.35, f.q.headR * 1.2], m('#3a2a22', { fur: 0.5 }));
    const gourd = m('#d8b060', { gloss: true });
    s.sphere([0, f.by - f.q.girth * 0.3, f.q.width + 1.5], 2.4, gourd);
    s.sphere([0, f.by + 1.2, f.q.width + 1.5], 1.6, gourd, { k: 0.8 });
  },
  103: (b, f) => {
    const { s, m } = b;
    const gold = m('#f0c040', { gloss: true });
    s.tube([[f.hc[0] - 0.5, f.hc[1] + f.q.headR * 0.8, 0], [f.hc[0] + 1, f.hc[1] + f.q.headR + 4, 0], [f.hc[0] + 3, f.hc[1] + f.q.headR + 7, 0]], [1.2, 0.8, 0.2], gold);
    for (const side of SIDES) s.tube([[f.snoutEnd[0], f.snoutEnd[1], side * 1.5], [f.snoutEnd[0] - 1, f.snoutEnd[1] - 3, side * 4], [f.snoutEnd[0] + 2, f.snoutEnd[1] - 6, side * 5]], [0.45, 0.35, 0.2], gold);
    for (const x of [-f.q.len * 0.5, f.q.len * 0.6]) for (const side of SIDES) flame(b, [x, 0.5, side * f.q.width * 0.6], 4, 1.6, b.look.colors[2], 0.5);
  },
  112: griffonHead,
  113: griffonHead,
  114: (b, f) => {
    for (const side of SIDES) b.s.cone([f.snoutEnd[0] + 1, f.snoutEnd[1] - 1, side * 1.6], [f.snoutEnd[0] + 0.5, f.snoutEnd[1] - 5, side * 1.8], 0.8, 0.25, b.m('#e8e0c8'));
  },
  116: (b, f) => {
    const { s, m } = b;
    const t = f.tb;
    // La queue se termine par une main humaine aux doigts crochus.
    s.tube([t, [t[0] + 5, t[1] + 2, 0], [t[0] + 9, t[1] + 7, -1], [t[0] + 10, t[1] + 12, -1]], [1.4, 1.1, 0.9, 0.8], f.body, { k: 1 });
    const hand = m('#6a7a8a');
    const palm: V3 = [t[0] + 10, t[1] + 13.5, -1];
    s.ellipsoid(palm, [1.8, 2, 0.9], hand, { k: 0.5 });
    for (let i = 0; i < 4; i++) s.tube([[palm[0] - 1.2 + i * 0.8, palm[1] + 1.4, -1], [palm[0] - 1.6 + i * 1.1, palm[1] + 3.6, -1.4], [palm[0] - 2.4 + i * 1.2, palm[1] + 4.6, -2]], [0.45, 0.4, 0.2], hand);
    spikeRow(b, [-f.q.len * 0.5, f.front + f.q.girth * 0.9, 0], [f.q.len * 0.6, f.back + f.q.girth * 0.8, 0], 7, 2.4, 0.8, f.body, 0.6);
  },
  117: (b, f) => {
    for (const side of SIDES) b.s.cone([f.snoutEnd[0] + 1.5, f.snoutEnd[1] - 0.5, side * 1.2], [f.snoutEnd[0] + 1.3, f.snoutEnd[1] - 3.2, side * 1.3], 0.6, 0.15, b.m('#f0ead8'));
  },
  121: (b, f) => {
    const { s, m } = b;
    const wool = m('#f4ece0', { fur: 1 });
    s.ellipsoid([0, f.by + 0.8, 0], [f.q.len * 1.05, f.q.girth * 1.0, f.q.width * 1.15], wool, { amp: 1.4, freq: 0.75 });
    const bolt = m('#ffe040', { glow: true });
    for (const side of SIDES) {
      const x = f.hc[0] + 4;
      const y = f.hc[1] + 6;
      s.tube([[x, y, side * 7], [x + 2, y - 3, side * 8], [x - 0.5, y - 5, side * 8], [x + 1.5, y - 9, side * 9]], [0.8, 0.8, 0.8, 0.25], bolt);
    }
    const beads = m(b.look.colors[1], { gloss: true });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      s.sphere([f.neckBase[0] - 1 + Math.cos(a) * 0.5, f.neckBase[1] + Math.sin(a) * f.q.girth * 0.55, Math.cos(a) * f.q.girth * 0.6], 0.9, beads);
    }
  },
  124: (b, f) => {
    const { s, m } = b;
    // Collier de fer du forgeron, rivé autour du cou.
    const dir: V3 = [f.hc[0] - f.neckBase[0], f.hc[1] - f.neckBase[1], 0];
    const len = Math.hypot(dir[0], dir[1]);
    const a = add3(f.neckBase, [(dir[0] / len) * 1.5, (dir[1] / len) * 1.5, 0]);
    const c = add3(f.neckBase, [(dir[0] / len) * 3.6, (dir[1] / len) * 3.6, 0]);
    s.capped(a, c, f.q.girth * 0.68, f.q.girth * 0.64, m('#6a6e78', { gloss: true, edge: true }), { round: 0.5 });
    for (let i = 0; i < 4; i++) s.sphere([c[0] + 1 + i * 1.4, c[1] - 2 - i * 1.6, f.q.width * 0.2], 0.9, m('#8a8f98', { gloss: true }));
  },
};

// ── Autres familles ──────────────────────────────────────────────────────

/** Oiseau dressé : corps en œuf, tête ronde, ailes repliées, pattes à serres. */
function bird(
  b: Build,
  o: { r: number; head: number; neck?: number; legH: number; body: string; belly?: string; wing: string; head2?: string; upright?: number },
): { body: V3; head: V3; hr: number } {
  const { s, m } = b;
  const up = o.upright ?? 0.6;
  const body: V3 = [1, o.legH + o.r * 0.85, 0];
  const plumage = m(o.body, { pattern: { kind: 'plumes', color: shade(o.body, -0.18), scale: 2 }, belly: o.belly });
  const legMat = m('#5a4a3a');
  for (const side of SIDES) {
    const z = side * o.r * 0.38;
    s.tube([[body[0], body[1] - o.r * 0.5, z], [body[0] + 0.5, o.legH * 0.5, z], [body[0] - 0.5, 1, z]], [1.2, 0.7, 0.6], legMat, { k: 1 });
    for (const dz of [-1, 0, 1]) s.cone([body[0] - 0.5, 0.8, z], [body[0] - 3, 0.5, z + dz * 1.2], 0.5, 0.25, legMat);
  }
  s.ellipsoid(body, [o.r * (1 - up * 0.25), o.r * (0.85 + up * 0.25), o.r * 0.85], plumage, { rot: [-20 + up * 30, 0, 0] });
  for (const side of SIDES) {
    s.ellipsoid([body[0] + 2, body[1] + 1, side * o.r * 0.78], [o.r * 0.82, o.r * 0.6, 1.6], m(o.wing, { pattern: { kind: 'plumes', color: shade(o.wing, -0.22), scale: 2 }, edge: true }), { rot: [-30 + up * 20, side * -8, 0] });
  }
  const hr = o.head;
  const head: V3 = [body[0] - o.r * 0.35, body[1] + o.r * 0.85 + (o.neck ?? 0), 0];
  if (o.neck) s.cone([body[0] - o.r * 0.3, body[1] + o.r * 0.5, 0], head, hr * 0.5, hr * 0.4, m(o.head2 ?? o.body), { k: 1.5 });
  s.sphere(head, hr, m(o.head2 ?? o.body, { pattern: { kind: 'plumes', color: shade(o.head2 ?? o.body, -0.15), scale: 1.6 } }), { k: 2 });
  return { body, head, hr };
}

function owl(b: Build, big: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const r = big ? 10 : 8;
  const { head, hr } = bird(b, { r, head: big ? 8 : 7, legH: 3, body: c1, belly: c2, wing: shade(c1, -0.05), upright: 1 });
  // Disque facial clair et grands yeux de face.
  s.paint([head[0] - hr * 0.6, head[1] - hr * 0.05, 0], [hr * 0.5, hr * 0.85, hr * 1.1], m(c2));
  s.cone([head[0] - hr * 0.95, head[1] - hr * 0.15, 0], [head[0] - hr * 1.3, head[1] - hr * 0.55, 0], hr * 0.18, 0.2, m('#3a3030', { gloss: true }));
  if (big) for (const side of SIDES) s.cone([head[0] + 1, head[1] + hr * 0.75, side * hr * 0.55], [head[0] + 2.5, head[1] + hr + 4, side * hr * 0.75], 1.6, 0.2, m(c1, { fur: 0.6 }));
  a.eyes = SIDES.map((side): V3 => [head[0] - hr * 0.85, head[1] + hr * 0.15, side * hr * 0.42]);
  a.eyeR = hr * 0.36;
  a.eyeKind = big ? 'lueur' : 'rond';
  a.eyeColor = c3;
}

function bat(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  // Petit corps de renard volant, ailes membraneuses grandes ouvertes.
  const fur = m(c2, { fur: 0.8 });
  const body: V3 = [0, 14, 0];
  s.ellipsoid(body, [5, 6, 4.6], fur);
  const head: V3 = [-3, 21, 0];
  s.sphere(head, 4.6, fur, { k: 2 });
  s.cone([head[0] - 2, head[1] - 1, 0], [head[0] - 6, head[1] - 2, 0], 2.4, 1.1, fur, { k: 1 });
  s.sphere([head[0] - 6.4, head[1] - 1.6, 0], 0.9, m('#2a1e22', { gloss: true }));
  for (const side of SIDES) s.cone([head[0] + 0.5, head[1] + 3, side * 2.2], [head[0] + 1.5, head[1] + 8, side * 3], 1.8, 0.3, m(c1));
  for (const side of SIDES) batWing(b, [body[0] + 1, body[1] + 3, side * 3], side, 17, c1, shade(c1, 0.12), 40);
  for (const side of SIDES) s.cone([body[0] + 2, body[1] - 5, side * 1.5], [body[0] + 2.5, body[1] - 9, side * 1.8], 0.8, 0.5, m(c1));
  a.eyes = SIDES.map((side): V3 => [head[0] - 3.2, head[1] + 1, side * 2.1]);
  a.eyeR = 1.5;
  a.eyeKind = 'perle';
  a.eyeColor = c3;
}

function scorpion(b: Build, queen: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const shell = m(c1, { gloss: true, belly: shade(c1, 0.25), pattern: { kind: 'rayures', color: shade(c1, -0.22), scale: 2.6, amount: 0.18, axis: 0 } });
  const legMat = m(shade(c1, -0.15), { gloss: true });
  const k = queen ? 1.25 : 1;
  const ceph: V3 = [-5 * k, 4.5 * k, 0];
  s.ellipsoid(ceph, [5 * k, 3 * k, 5 * k], shell);
  s.ellipsoid([3 * k, 4.2 * k, 0], [6.5 * k, 3 * k, 5 * k], shell, { k: 1.5 });
  // Huit pattes.
  for (const side of SIDES) for (let i = 0; i < 4; i++) jointedLeg(b, [ceph[0] + 2 + i * 2.2 * k, 3.5 * k, side * 3 * k], side, 6.5 * k, 3.5 * k, 0.8 * k, legMat, i * 0.8);
  // Pinces.
  for (const side of SIDES) {
    const z = side * 3.5 * k;
    const elbow: V3 = [ceph[0] - 5 * k, 5 * k, z + side * 3 * k];
    const wrist: V3 = [ceph[0] - 9 * k, 4.5 * k, z + side * 2 * k];
    s.tube([[ceph[0] - 2, 4 * k, z], elbow, wrist], [1.1 * k, 1, 1.2 * k], legMat);
    s.ellipsoid([wrist[0] - 2 * k, wrist[1], wrist[2]], [2.6 * k, 1.6 * k, 1.5 * k], shell, { k: 0.5 });
    for (const dy of [0.9, -0.7]) s.cone([wrist[0] - 3.5 * k, wrist[1] + dy * k, wrist[2]], [wrist[0] - 6.5 * k, wrist[1] + dy * 0.6 * k, wrist[2] - side * 0.6], 0.9 * k, 0.2, shell);
  }
  // Queue segmentée recourbée au-dessus du dos, aiguillon au bout.
  const pts: V3[] = [[8 * k, 4.5 * k, 0], [12 * k, 7 * k, 0], [13.5 * k, 12 * k, 0], [11.5 * k, 16 * k, 0], [7.5 * k, 17 * k, 0], [4.5 * k, 15 * k, 0]];
  pts.forEach((p, i) => s.sphere(p, (2.2 - i * 0.18) * k, shell, { k: 0.5 }));
  s.ellipsoid([3.2 * k, 14 * k, 0], [1.8 * k, 1.5 * k, 1.4 * k], m(c3, { glow: queen }));
  s.cone([2.5 * k, 13.5 * k, 0], [1 * k, 11 * k, 0], 0.7 * k, 0.15, m('#2a1a14'));
  if (queen) {
    // Serket : diadème d'or et de lapis.
    const gold = m('#f0c040', { gloss: true, edge: true });
    s.capped([ceph[0] + 0.5, 6.8 * k, 0], [ceph[0] + 0.5, 8.4 * k, 0], 3.2, 2.8, gold, { round: 0.3 });
    s.sphere([ceph[0] - 2.2, 7.6 * k, 0], 1, m(c2, { gloss: true }));
  }
  a.eyes = SIDES.map((side): V3 => [ceph[0] - 4.2 * k, 5.6 * k, side * 1.6 * k]);
  a.eyeR = 1.4 * k;
  a.eyeKind = queen ? 'feroce' : 'rond';
}

function sandDjinn(b: Build, grown: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  const sand = m(c1, { fur: 1, pattern: { kind: 'rayures', color: shade(c1, -0.22), scale: 1.4, amount: 0.3, axis: 1 } });
  // Tourbillon : anneaux de sable inclinés, de plus en plus larges vers le haut,
  // avec des cailloux happés en orbite.
  const rings = grown ? 5 : 4;
  for (let i = 0; i < rings; i++) {
    const y = 2 + i * 3.2;
    const r = 1.8 + i * 1.6;
    s.ellipsoid([Math.sin(i * 1.3) * 1.2, y, Math.cos(i * 1.3) * 0.8], [r, 1.8, r], sand, { k: 1.6, amp: 0.9, freq: 0.6, stretch: 0.5, rot: [i % 2 ? 8 : -8, 0, i % 2 ? -6 : 6] });
  }
  const pebble = m(c2, { gloss: true });
  for (let i = 0; i < 5; i++) {
    const ang = rad(i * 72 + 20);
    const y = 4 + i * 2.6;
    const r = 3.5 + i * 1.5;
    s.sphere([Math.cos(ang) * r, y, Math.sin(ang) * r], 0.7 + (i % 2) * 0.3, pebble);
  }
  const topY = 2 + rings * 3.2;
  if (grown) {
    const skin = m(c2, { belly: shade(c2, 0.2) });
    const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 5.5, torsoH: 7, hipY: topY, legR: 0.01, armR: 1.7, armLen: 9, headR: 5.5, neck: 0, footLen: 0.01, armsUp: 0.45 }, { body: skin });
    s.ellipsoid([h.head[0] + 0.5, h.head[1] + h.headR * 0.55, 0], [h.headR * 1.05, h.headR * 0.6, h.headR * 1.05], m('#f0e8d0', { edge: true, pattern: { kind: 'rayures', color: '#c8b890', scale: 1.6, amount: 0.3, axis: 1 } }));
    s.sphere([h.head[0] - h.headR * 0.85, h.head[1] + h.headR * 0.5, 0], 1.3, m(c3, { gloss: true }));
    for (const hand of h.hands) s.sphere([hand[0] + 0.6, hand[1] + 1.4, hand[2]], 1, m(c3, { gloss: true }));
    frontEyes(b, h, 0.4, 0.05, 'lueur', 0.27);
    a.eyeColor = '#ff8a2a';
  } else {
    // Une tête-capuchon de sable, creusée d'un visage d'ombre.
    const head: V3 = [-0.5, topY + 3.5, 0];
    s.ellipsoid(head, [5.2, 4.6, 5.2], sand, { k: 2, amp: 0.6, freq: 0.6 });
    s.cone([head[0] + 1.5, head[1] + 2.5, 0], [head[0] + 5.5, head[1] + 6.5, 0], 3.2, 0.6, sand, { k: 1.5, amp: 0.5, freq: 0.7 });
    s.paint([head[0] - 4.6, head[1] - 0.4, 0], [1.6, 2.6, 3.4], m('#2a1a12'));
    for (const side of SIDES) s.tube([[1, topY - 2, side * 3], [-1.5, topY - 4, side * 6.5], [-4, topY - 3, side * 8]], [1.4, 1, 0.6], sand, { k: 1.2, amp: 0.5, freq: 0.8 });
    a.eyes = SIDES.map((side): V3 => [head[0] - 4.9, head[1] + 0.2, side * 1.8]);
    a.eyeR = 1.9;
    a.eyeKind = 'lueur';
    a.eyeColor = c3;
    a.mouth = [[head[0] - 5.2, head[1] - 2.2, -1.4], [head[0] - 5.4, head[1] - 2.8, 0], [head[0] - 5.2, head[1] - 2.2, 1.4]];
  }
}

function chameleon(b: Build, adult: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: c3, pattern: { kind: 'taches', color: c2, scale: 3.4, amount: 0.25 } });
  const g = saurian(b, { len: adult ? 13 : 10, girth: adult ? 6 : 5, legLen: adult ? 6 : 5, legR: 1.4, headR: adult ? 5 : 4.4, snout: 1.4, neck: 2, neckAngle: 20, tail: 0.01 }, { body: skin });
  // Corps aplati, casque sur la tête, queue enroulée en spirale.
  s.ellipsoid([g.body[0], g.body[1] + g.girth * 0.6, 0], [g.len * 0.7, g.girth * 0.7, g.girth * 0.55], skin, { k: 2 });
  s.cone([g.head[0] + 1, g.head[1] + 1.5, 0], [g.head[0] + 5, g.head[1] + 5.5, 0], g.headR * 0.7, 0.8, skin, { k: 1.5 });
  const spiral: V3[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * Math.PI * 2.4;
    const r = 6 - i * 0.33;
    spiral.push([g.len * 0.75 + 2 + Math.sin(t) * r, g.body[1] - 4 + Math.cos(t) * r * -1, 0]);
  }
  s.tube(spiral, spiral.map((_, i) => 2.2 - i * 0.12), skin, { k: 1.5 });
  spikeRow(b, [g.head[0] + 2, g.body[1] + g.girth * 1.1, 0], [g.len * 0.6, g.body[1] + g.girth * 0.9, 0], 7, 1.6, 0.6, m(c3), 0.2);
  // Yeux en tourelle.
  for (const side of SIDES) s.sphere([g.head[0] - 0.8, g.head[1] + 1, side * g.headR * 0.62], g.headR * 0.42, skin, { k: 0.8 });
  if (adult) {
    const hm = hornMat(b, '#e8e0c8', true);
    for (const z of [-1.2, 0, 1.2]) s.cone([g.head[0] - g.headR * 0.8, g.head[1] + 0.6, z], [g.head[0] - g.headR * 1.6, g.head[1] + 1.4, z * 1.4], 0.7, 0.2, hm);
  }
  a.eyes = SIDES.map((side): V3 => [g.head[0] - 1, g.head[1] + 1.2, side * (g.headR * 0.62 + g.headR * 0.38)]);
  a.eyeR = g.headR * 0.22;
  a.eyeKind = 'perle';
}

function crocodile(b: Build, god: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: c2, pattern: { kind: 'ecailles', color: shade(c1, -0.22), scale: 2.2, amount: 0.2 } });
  const g = saurian(b, { len: god ? 18 : 14, girth: god ? 6.5 : 5, legLen: god ? 5 : 3.5, legR: god ? 2.4 : 1.8, headR: god ? 5.5 : 4.5, snout: god ? 11 : 9, neck: 3, neckAngle: 10, tail: god ? 20 : 17 }, { body: skin, claws: m('#e8e0c8') });
  // Écailles dorsales en double rangée.
  const ridge = m(shade(c1, -0.1), { gloss: true });
  for (const side of SIDES) spikeRow(b, [-g.len * 0.4, g.body[1] + g.girth * 0.8, side * 1.4], [g.len * 0.9, g.body[1] + g.girth * 0.4, side * 1.4], god ? 9 : 7, 1.2, 0.7, ridge, 0.1);
  const tooth = m('#f0ead8');
  for (let i = 0; i < 5; i++) for (const side of SIDES) s.cone([g.head[0] - 3 - i * (god ? 2 : 1.6), g.head[1] - g.headR * 0.4, side * g.headR * 0.45], [g.head[0] - 3 - i * (god ? 2 : 1.6), g.head[1] - g.headR * 0.75, side * g.headR * 0.5], 0.45, 0.12, tooth);
  if (god) {
    // Disque solaire et uraeus de Sobek.
    const gold = m(c3, { gloss: true, edge: true });
    s.capped([g.head[0] + 1, g.head[1] + g.headR * 0.6, 0], [g.head[0] + 1, g.head[1] + g.headR * 0.6 + 2, 0], 2.2, 2.6, gold, { round: 0.3 });
    s.ellipsoid([g.head[0] + 1, g.head[1] + g.headR + 5, 0], [3.4, 3.4, 0.9], m('#e83a2a', { gloss: true, edge: true }));
    for (const side of SIDES) s.ellipsoid([g.head[0] + 2, g.head[1] + g.headR + 6, side * 2.2], [1, 4.5, 0.5], m('#f8f0e0', { edge: true }));
  }
  a.eyes = SIDES.map((side): V3 => [g.head[0] - g.headR * 0.2, g.head[1] + g.headR * 0.65, side * g.headR * 0.5]);
  a.eyeKind = god ? 'feroce' : 'rond';
  a.eyeColor = '#e8c040';
}

function mokele(b: Build): void {
  const { m, a } = b;
  const [c1, c2] = b.look.colors;
  const skin = m(c1, { belly: c2, pattern: { kind: 'craquelures', color: shade(c1, -0.2), scale: 4 } });
  saurian(b, { len: 18, girth: 8.5, legLen: 10, legR: 3.6, headR: 4, snout: 2.4, neck: 18, neckAngle: 62, tail: 22, upright: 2 }, { body: skin });
  a.eyeKind = 'doux';
  a.eyeColor = '#4a3a2a';
}

function seal(b: Build, grown: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const k = grown ? 1.25 : 1;
  const skin = m(c1, { gloss: true, belly: c3, pattern: { kind: 'taches', color: c2, scale: 2.6, amount: 0.22 } });
  // Corps fuselé, buste dressé, nageoires.
  s.ellipsoid([3 * k, 4.5 * k, 0], [9 * k, 4.5 * k, 5.5 * k], skin);
  s.ellipsoid([-3 * k, 8 * k, 0], [5 * k, 6.5 * k, 5 * k], skin, { k: 3, rot: [-30, 0, 0] });
  const head: V3 = [-5 * k, 15 * k, 0];
  s.sphere(head, 4.6 * k, skin, { k: 2 });
  s.cone([head[0] - 2, head[1] - 1.2 * k, 0], [head[0] - 5.5 * k, head[1] - 1.6 * k, 0], 3 * k, 2.2 * k, skin, { k: 1 });
  s.sphere([head[0] - 6.3 * k, head[1] - 1 * k, 0], 0.9 * k, m('#2a1e22', { gloss: true }));
  for (const side of SIDES) {
    s.ellipsoid([-3 * k, 3 * k, side * 5 * k], [3.4 * k, 1, 1.8 * k], skin, { rot: [-20, side * 30, 0], k: 1 });
    s.ellipsoid([12 * k, 1.5 * k, side * 2.2 * k], [3.2 * k, 0.9, 2 * k], skin, { rot: [0, side * -25, 0], k: 1 });
    // Moustaches.
    s.tube([[head[0] - 5.5 * k, head[1] - 2 * k, side * 1.6], [head[0] - 7 * k, head[1] - 2.5 * k, side * 4 * k]], [0.25, 0.2], m('#f0f0f0'));
  }
  if (grown) {
    // Collier de perles et peau drapée comme un manteau.
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI;
      s.sphere([head[0] + 2 - Math.sin(ang) * 3.5, 9.5 * k, Math.cos(ang) * 5 * k], 0.8, m('#f0ecf8', { gloss: true }));
    }
  }
  a.eyes = SIDES.map((side): V3 => [head[0] - 3.4 * k, head[1] + 0.8 * k, side * 2.3 * k]);
  a.eyeR = 1.9 * k;
  a.eyeKind = 'doux';
  a.eyeColor = '#2a2030';
}

function manatee(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: shade(c1, 0.3), pattern: { kind: 'craquelures', color: shade(c1, -0.15), scale: 3.4 } });
  s.ellipsoid([2, 7, 0], [12, 6.5, 7], skin);
  // Queue en pagaie arrondie, nageoires et museau ridé.
  s.ellipsoid([16, 4, 0], [4.5, 1.2, 5.5], skin, { k: 2 });
  for (const side of SIDES) s.ellipsoid([-5, 3, side * 6.5], [3.2, 1, 1.6], skin, { rot: [-30, side * 25, 0], k: 1 });
  const head: V3 = [-9, 9, 0];
  s.sphere(head, 5, skin, { k: 3 });
  s.ellipsoid([head[0] - 4, head[1] - 1.5, 0], [2.6, 3, 3.6], m(c2), { k: 1.2 });
  for (const side of SIDES) s.tube([[head[0] - 6, head[1] - 1.5, side * 2], [head[0] - 7.2, head[1] - 2.2, side * 3.4]], [0.2, 0.15], m('#e8e0d8'));
  s.sphere([head[0] - 1, head[1] + 6, 2], 1.4, m(c3, { gloss: true }));
  a.eyes = SIDES.map((side): V3 => [head[0] - 2.8, head[1] + 1.4, side * 3.4]);
  a.eyeR = 1.1;
  a.eyeKind = 'doux';
  a.eyeColor = '#2a2030';
}

function lindworm(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: c2, pattern: { kind: 'ecailles', color: shade(c1, -0.2), scale: 2 } });
  // Long corps qui serpente au sol, deux pattes avant griffues.
  const pts: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([22 - t * 30, 3 + t * 9 + Math.max(0, t - 0.7) * 20, Math.sin(t * Math.PI * 2.2) * 6]);
  }
  s.tube(pts, pts.map((_, i) => 1 + (i / 10) * 4.2), skin, { k: 1.5 });
  const neck = pts[10];
  for (const side of SIDES) {
    const hip: V3 = [neck[0] + 3, neck[1] - 4, side * 3];
    s.tube([hip, [hip[0] - 1, 5, side * 5], [hip[0] - 2.5, 1, side * 5.5]], [2.2, 1.6, 1.4], skin, { k: 1.5 });
    for (const dz of [-0.9, 0, 0.9]) s.cone([hip[0] - 3, 0.9, side * 5.5 + dz], [hip[0] - 5, 0.4, side * 5.5 + dz * 1.4], 0.45, 0.12, m('#f0e8d8'));
  }
  const head: V3 = [neck[0] - 4, neck[1] + 3, 0];
  s.ellipsoid(head, [5.5, 3.6, 4], skin, { k: 2 });
  s.cone([head[0] - 2, head[1] - 0.6, 0], [head[0] - 7, head[1] - 1.4, 0], 3, 1.8, skin, { k: 1.2 });
  const hm = hornMat(b, '#e8dcc0');
  for (const side of SIDES) horn(b, [head[0] + 2, head[1] + 2.4, side * 2], side, [[3, 1.5, 1], [6, 2, 1.5]], [1, 0.6, 0.15], hm);
  spikeRow(b, [head[0] + 3, head[1] + 3.5, 0], [pts[4][0], pts[4][1] + 4, pts[4][2]], 7, 2.6, 0.9, m(c3, { edge: true }), 0.5);
  a.eyes = SIDES.map((side): V3 => [head[0] - 2, head[1] + 1.6, side * 2.8]);
  a.eyeR = 1.5;
  a.eyeKind = 'feroce';
  a.eyeColor = c3;
}

function taniwha(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: c2, gloss: true, pattern: { kind: 'ecailles', color: shade(c1, -0.2), scale: 2 } });
  const g = saurian(b, { len: 16, girth: 6, legLen: 5, legR: 2.2, headR: 5.5, snout: 5, neck: 6, neckAngle: 25, tail: 18 }, { body: skin, claws: m('#f0e8d8') });
  // Motifs lumineux en spirale (koru) sur le corps et la tête.
  const glow = m(c3, { glow: true });
  for (const [x, y, z] of [[-4, g.body[1] + 3, g.girth * 0.9], [5, g.body[1] + 2.5, g.girth * 0.9], [-4, g.body[1] + 3, -g.girth * 0.9]] as const) s.paint([x, y, z], [2.4, 1.6, 1.2], glow);
  s.paint([g.head[0] + 1, g.head[1] + g.headR * 0.6, 0], [2.5, 0.8, g.headR * 0.6], glow);
  spikeRow(b, [g.head[0] + 2, g.head[1] + g.headR * 0.8, 0], [g.len * 0.8, g.body[1] + g.girth * 0.6, 0], 9, 2.4, 0.9, m(c2, { edge: true }), 0.6);
  const hm = hornMat(b, '#e8e0c8', false);
  for (const side of SIDES) horn(b, [g.head[0] + 1.5, g.head[1] + g.headR * 0.6, side * g.headR * 0.45], side, [[3, 2, 1], [6, 2.5, 1.5]], [1, 0.7, 0.2], hm);
  a.eyeKind = 'feroce';
  a.eyeColor = c3;
}

function grootslang(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { pattern: { kind: 'craquelures', color: c2, scale: 3.5 } });
  // Anneaux de serpent sous une tête d'éléphant : oreilles, trompe, défenses.
  const coil: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * Math.PI * 2.4;
    const r = 13 - i * 0.4;
    coil.push([Math.cos(t) * r + 2, 4 + i * 0.4, Math.sin(t) * r * 0.8]);
  }
  const rise: V3[] = [coil[16], [-4, 14, 2], [-5, 22, 1], [-7, 27, 0]];
  s.tube([...coil, ...rise.slice(1)], [...coil.map((_, i) => 2.5 + i * 0.22), 6, 6, 5.5], skin, { k: 1.5 });
  const head: V3 = [-9, 30, 0];
  s.sphere(head, 6.5, skin, { k: 2.5 });
  s.tube([[head[0] - 4, head[1] - 1, 0], [head[0] - 8, head[1] - 6, 0], [head[0] - 8.5, head[1] - 12, 0], [head[0] - 6.5, head[1] - 15, 0]], [3, 2.2, 1.6, 1.2], skin, { k: 1.5 });
  for (const side of SIDES) {
    s.ellipsoid([head[0] + 2.5, head[1] + 0.5, side * 6.5], [4.5, 6, 0.9], skin, { rot: [-10, side * 25, 0], k: 1 });
    s.tube([[head[0] - 4, head[1] - 3.5, side * 2.6], [head[0] - 8, head[1] - 6, side * 3.4], [head[0] - 10, head[1] - 4, side * 3.2]], [1.2, 1, 0.35], m(c3, { gloss: true }));
  }
  s.sphere([head[0] - 2, head[1] + 4.5, 0], 1.4, m('#a8e8ff', { gloss: true }));
  a.eyes = SIDES.map((side): V3 => [head[0] - 4.8, head[1] + 2, side * 3.2]);
  a.eyeR = 1.7;
  a.eyeKind = 'feroce';
  a.eyeColor = '#a8e8ff';
}

function phoenix(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const { body, head, hr } = bird(b, { r: 9, head: 5, neck: 4, legH: 6, body: c1, belly: c2, wing: c1, upright: 0.4 });
  // Longues plumes de queue aux cinq couleurs, crête et ailes déployées.
  const tails = [c2, c3, c1, '#3ab05a', '#f8f4e8'];
  tails.forEach((color, i) => {
    const len = 16 + i * 3;
    const ang = -10 - i * 7;
    const base: V3 = [body[0] + 7, body[1] - 1, (i - 2) * 1.2];
    s.ellipsoid(add3(base, [Math.cos(rad(ang)) * len * 0.5, Math.sin(rad(ang)) * len * 0.5, 0]), [len * 0.5, 1.4, 0.5], m(color, { edge: true }), { rot: [ang, 0, 0] });
    s.sphere(add3(base, [Math.cos(rad(ang)) * len, Math.sin(rad(ang)) * len, 0]), 1.6, m(c2, { glow: true }));
  });
  for (const side of SIDES) featherWing(b, [body[0] + 2, body[1] + 4, side * 4], side, 16, c1, { up: 65, tip: c2 });
  for (let i = 0; i < 3; i++) leaf(b, [head[0] + 1, head[1] + hr * 0.8, 0], 80 + i * 18, 0, 6, m(c2), 0.3);
  s.cone([head[0] - hr * 0.7, head[1] - 0.5, 0], [head[0] - hr * 1.7, head[1] - 1.5, 0], hr * 0.35, 0.2, m('#f0c040', { gloss: true }));
  a.eyes = SIDES.map((side): V3 => [head[0] - hr * 0.5, head[1] + hr * 0.25, side * hr * 0.75]);
  a.eyeR = hr * 0.3;
  a.eyeKind = 'feroce';
}

function simurgh(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const { body, head, hr } = bird(b, { r: 10, head: 5.5, neck: 3, legH: 7, body: c1, belly: c2, wing: c1, upright: 0.5 });
  // Éventail de queue à ocelles, comme un paon immense.
  for (let i = 0; i < 9; i++) {
    const ang = 30 + i * 15;
    const len = 18;
    const dir: V3 = [0.45, Math.sin(rad(ang)), Math.cos(rad(ang))];
    const base: V3 = [body[0] + 6, body[1] - 1, 0];
    s.ellipsoid(add3(base, [dir[0] * len * 0.5, dir[1] * len * 0.5, dir[2] * len * 0.5]), [len * 0.5, 2.2, 0.5], m(c1, { edge: true, pattern: { kind: 'plumes', color: shade(c1, -0.2), scale: 2 } }), { rot: [ang, -90 + ang * 0, 0] });
    s.sphere(add3(base, [dir[0] * len, dir[1] * len, dir[2] * len]), 2, m(c3, { gloss: true }));
  }
  for (const side of SIDES) featherWing(b, [body[0] + 2, body[1] + 4, side * 4.5], side, 18, c1, { up: 60, tip: c2 });
  for (let i = 0; i < 4; i++) leaf(b, [head[0] + 1, head[1] + hr * 0.7, 0], 70 + i * 20, 0, 7, m(c2), 0.28);
  s.cone([head[0] - hr * 0.7, head[1] - 0.5, 0], [head[0] - hr * 1.8, head[1] - 2, 0], hr * 0.38, 0.2, m('#e8c040', { gloss: true }));
  a.eyes = SIDES.map((side): V3 => [head[0] - hr * 0.5, head[1] + hr * 0.25, side * hr * 0.75]);
  a.eyeR = hr * 0.3;
  a.eyeKind = 'doux';
  a.eyeColor = '#3a2010';
}

function vulture(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const { body } = bird(b, { r: 10, head: 0.01, legH: 6, body: c1, wing: c1, upright: 0.3 });
  // Collerette blanche, long cou nu, tête chauve et bec crochu.
  s.ellipsoid([body[0] - 4, body[1] + 6, 0], [4.5, 3, 6], m(c2, { fur: 1 }), { amp: 0.8, freq: 0.8 });
  const skin = m(c3);
  const head: V3 = [body[0] - 9, body[1] + 12, 0];
  s.tube([[body[0] - 5, body[1] + 7, 0], [body[0] - 9, body[1] + 9, 0], head], [1.8, 1.4, 1.4], skin, { k: 1 });
  s.sphere(head, 3.2, skin, { k: 1 });
  s.tube([[head[0] - 2, head[1], 0], [head[0] - 5, head[1] - 0.5, 0], [head[0] - 5.8, head[1] - 2.2, 0]], [1.2, 0.8, 0.25], m('#e8dcc0', { gloss: true }));
  for (const side of SIDES) featherWing(b, [body[0] + 2, body[1] + 5, side * 6], side, 18, c1, { up: 35, tip: shade(c1, -0.2), spread: 35 });
  a.eyes = SIDES.map((side): V3 => [head[0] - 1.5, head[1] + 1, side * 2.4]);
  a.eyeR = 1;
  a.eyeKind = 'feroce';
}

function kodama(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2] = b.look.colors;
  a.floating = true;
  // Petit corps blanc, grosse tête ronde penchée, feuilles accrochées.
  const body = m(c1);
  s.ellipsoid([0, 5, 0], [3, 4.5, 3], body);
  for (const side of SIDES) s.cone([0, 6, side * 2.5], [-1.5, 3, side * 4], 1, 0.8, body, { k: 1 });
  const head: V3 = [-0.5, 13, 0];
  s.ellipsoid(head, [5.5, 5, 5.5], body, { k: 1.5, rot: [12, 0, 0] });
  leaf(b, [head[0] + 1, head[1] + 4.5, 1], 60, 20, 5, m(c2), 0.4);
  a.eyes = SIDES.map((side): V3 => [head[0] - 5, head[1] + 0.6, side * 2]);
  a.eyeR = 1.6;
  a.eyeKind = 'perle';
  a.mouth = [[head[0] - 5.3, head[1] - 2, -0.6], [head[0] - 5.3, head[1] - 2.4, 0.6]];
  a.mouthColor = '#2a2a2a';
}

// ── Bipèdes ──────────────────────────────────────────────────────────────

function primate(b: Build, scribe: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const fur = m(c1, { fur: 0.8, belly: shade(c1, 0.2) });
  // Voûté, longs bras qui frôlent le sol.
  const h = humanoid(
    b,
    { ...BIPED_DEFAULT, torsoR: scribe ? 6.5 : 5.5, torsoH: scribe ? 8 : 6.5, hipY: scribe ? 6 : 5, legR: 2.2, armR: 1.8, armLen: scribe ? 12 : 12.5, headR: scribe ? 5.5 : 5.2, neck: -0.5, footLen: 4, digitigrade: true },
    { body: fur, hands: m(shade(c1, -0.25)) },
  );
  // Museau de mandrill : arête rouge au milieu, joues bleues côtelées, barbe jaune.
  const R = h.headR;
  const root: V3 = [h.head[0] - R * 0.45, h.head[1] - R * 0.2, 0];
  const snoutEnd: V3 = [h.head[0] - R * 1.5, h.head[1] - R * 0.6, 0];
  s.cone(root, snoutEnd, R * 0.5, R * 0.34, m(c2, { pattern: { kind: 'rayures', color: shade(c2, -0.3), scale: 0.9, amount: 0.35, axis: 0 } }), { k: 1.2 });
  const ridge = m(c3, { gloss: true });
  s.cone([h.head[0] - R * 0.55, h.head[1] + R * 0.12, 0], [snoutEnd[0] + 0.2, snoutEnd[1] + R * 0.28, 0], R * 0.2, R * 0.2, ridge, { k: 0.5 });
  s.sphere([snoutEnd[0] - 0.2, snoutEnd[1] + R * 0.1, 0], R * 0.27, ridge, { k: 0.4 });
  s.ellipsoid([h.head[0] - R * 0.25, h.head[1] + R * 0.38, 0], [R * 0.45, R * 0.18, R * 0.75], m(shade(c1, -0.25), { fur: 0.6 }), { k: 0.6 });
  s.ellipsoid([h.head[0] - R * 0.55, h.head[1] - R * 0.95, 0], [R * 0.6, R * 0.4, R * 0.62], m('#e8c040', { fur: 1 }), { k: 0.8, amp: 0.4, freq: 0.9, stretch: 1.6 });
  s.ellipsoid([h.head[0] + R * 0.3, h.head[1] + R * 0.25, 0], [R * 0.8, R * 0.95, R * 1.15], m(shade(c1, 0.12), { fur: 1 }), { k: 1, amp: 0.5, freq: 0.8 });
  s.sphere([h.hips[0] + 4.5, h.hips[1] + 1, 0], 2.8, m(scribe ? c3 : '#7a6ac8', { gloss: true }), { k: 1 });
  if (scribe) {
    // Thot : disque de lune et palette de scribe.
    s.ellipsoid([h.head[0] + 1, h.head[1] + R + 4, 0], [3.6, 3.6, 0.8], m('#f0f0e0', { glow: true }));
    s.box([h.hands[0][0] - 1, h.hands[0][1] + 1.5, h.hands[0][2]], [2.6, 0.5, 1.6], 0.3, m('#c8a060', { edge: true }), { rot: [20, 0, 0] });
  }
  a.eyes = SIDES.map((side): V3 => [h.head[0] - R * 0.62, h.head[1] + R * 0.2, side * R * 0.38]);
  a.eyeR = R * 0.24;
  a.eyeKind = scribe ? 'doux' : 'feroce';
  a.eyeColor = '#c87a20';
}

function popobawa(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const body = m(c1, { fur: 0.7 });
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 6, torsoH: 9, hipY: 10, legR: 1.9, armR: 1.5, armLen: 12, headR: 6, neck: -1, digitigrade: true, footLen: 4.5 }, { body, hands: m('#1a1418'), feet: m('#1a1418') });
  for (const side of SIDES) batWing(b, [h.chest[0] + 2, h.chest[1] + 4, side * 4], side, 22, c1, c2, 55);
  for (const side of SIDES) s.cone([h.head[0] + 0.5, h.head[1] + h.headR * 0.5, side * h.headR * 0.55], [h.head[0] + 2, h.head[1] + h.headR + 5, side * h.headR * 0.9], 1.8, 0.2, body, { k: 0.8 });
  // Un seul œil, énorme, au milieu du front.
  b.a.eyes = [[h.head[0] - h.headR * 0.85, h.head[1] + h.headR * 0.15, 0]];
  a.eyeR = h.headR * 0.42;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
  a.mouth = [[h.head[0] - h.headR * 0.85, h.head[1] - h.headR * 0.45, -2], [h.head[0] - h.headR * 0.95, h.head[1] - h.headR * 0.6, 0], [h.head[0] - h.headR * 0.85, h.head[1] - h.headR * 0.45, 2]];
  a.mouthColor = '#e8e0d0';
}

function oni(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: shade(c1, 0.15) });
  const p = { ...BIPED_DEFAULT, torsoR: 8, torsoH: 11, hipY: 11, legR: 3, armR: 2.8, armLen: 12, headR: 6.2, neck: -0.5 };
  const h = humanoid(b, p, { body: skin });
  // Pagne en peau de tigre, cheveux en bataille, cornes et gourdin clouté.
  s.ellipsoid([0, p.hipY, 0], [p.torsoR * 0.85, 3.2, p.torsoR * 1.0], m(c3, { edge: true, pattern: { kind: 'rayures', color: '#2a2020', scale: 2, amount: 0.35, axis: 0 } }), { k: 0 });
  s.ellipsoid([h.head[0] + 1.5, h.head[1] + h.headR * 0.4, 0], [h.headR * 0.95, h.headR * 0.8, h.headR * 1.05], m(c2, { fur: 1 }), { amp: 1.2, freq: 0.7 });
  s.sphere([h.head[0] - 0.8, h.head[1] - 0.4, 0], h.headR * 0.9, skin);
  const hm = hornMat(b, '#f0ead0', true);
  for (const side of SIDES) horn(b, [h.head[0] - 0.5, h.head[1] + h.headR * 0.65, side * h.headR * 0.45], side, [[0.5, 3, 0.8], [2, 6, 1]], [1.3, 0.9, 0.2], hm);
  const hand = h.hands[0];
  const club = m('#3a3a44', { gloss: true });
  s.capped([hand[0], hand[1] - 2, hand[2]], [hand[0] + 2, hand[1] + 12, hand[2] + 1], 1.2, 2.4, club, { round: 0.6 });
  for (let i = 0; i < 6; i++) s.sphere([hand[0] + 0.3 + i * 0.35, hand[1] + 3 + i * 1.6, hand[2] + (i % 2 ? 2 : -2)], 0.7, m('#c8c8d0', { gloss: true }));
  for (const side of SIDES) s.cone([h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 0.5, side * 1.4], [h.head[0] - h.headR * 0.95, h.head[1] - h.headR * 0.85, side * 1.6], 0.5, 0.15, m('#f8f0e0'));
  frontEyes(b, h, 0.4, 0.05, 'feroce', 0.27);
  a.eyeColor = c3;
}

function gargoyle(b: Build, big: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const stone = m(c1, { pattern: { kind: 'craquelures', color: c2, scale: 3 } });
  const k = big ? 1.3 : 1;
  // Accroupie comme sur une corniche, ailes repliées, gueule de gouttière ouverte.
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 5.5 * k, torsoH: 7 * k, hipY: 5 * k, legR: 2.2 * k, armR: 1.7 * k, armLen: 7 * k, headR: 5.5 * k, neck: -1, digitigrade: true, footLen: 4 * k }, { body: stone });
  for (const side of SIDES) batWing(b, [h.chest[0] + 2, h.chest[1] + 3, side * 3.5 * k], side, 16 * k, c2, shade(c1, -0.1), 60);
  const hm = hornMat(b, shade(c1, -0.1), true);
  for (const side of SIDES) horn(b, [h.head[0] + 0.5, h.head[1] + h.headR * 0.6, side * h.headR * 0.5], side, [[2, 2.5, 1], [5, 3, 1.5], [6, 0.5, 1.6]], [1.2 * k, 0.9, 0.5, 0.15], hm);
  s.cone([h.head[0] - h.headR * 0.4, h.head[1] - h.headR * 0.3, 0], [h.head[0] - h.headR * 1.5, h.head[1] - h.headR * 0.5, 0], h.headR * 0.55, h.headR * 0.45, stone, { k: 1 });
  s.paint([h.head[0] - h.headR * 1.45, h.head[1] - h.headR * 0.55, 0], [0.9, 1.4, 1.6], m('#1a1a1a'));
  if (big) spikeRow(b, [h.chest[0] + 3, h.chest[1] + 6, 0], [h.hips[0] + 4, h.hips[1], 0], 5, 2.6, 1, stone, 0.6);
  frontEyes(b, h, 0.42, 0.15, big ? 'lueur' : 'feroce', 0.26);
  a.eyeColor = c3;
}

function kobold(b: Build): void {
  const { s, m } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m('#a88a6a');
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 5, torsoH: 6, hipY: 5, legR: 2, armR: 1.6, armLen: 7, headR: 6.5, neck: -1.5, footLen: 4 }, { body: m(c1, { fur: 0.3 }), legs: m('#5a4a3a'), hands: skin, feet: m('#3a2a20') });
  s.sphere([h.head[0] - 0.6, h.head[1] - 0.6, 0], h.headR * 0.92, skin);
  s.cone([h.head[0] - h.headR * 0.5, h.head[1] - h.headR * 0.5, 0], [h.head[0] - h.headR * 0.6, h.head[1] - h.headR * 1.9, 0], h.headR * 0.65, 1, m('#d8d0c0', { fur: 1 }), { amp: 0.7, freq: 0.7, stretch: 2 });
  for (const side of SIDES) s.cone([h.head[0] + 1, h.head[1], side * h.headR * 0.8], [h.head[0] + 3, h.head[1] + 2, side * (h.headR + 3)], 1.4, 0.2, skin, { k: 0.8 });
  // Casque de mineur à lampe et pioche sur l'épaule.
  const metal = m(c2, { gloss: true, edge: true });
  s.ellipsoid([h.head[0] + 0.5, h.head[1] + h.headR * 0.45, 0], [h.headR * 1.0, h.headR * 0.6, h.headR * 1.0], metal);
  s.sphere([h.head[0] - h.headR * 0.85, h.head[1] + h.headR * 0.5, 0], 1.4, m(c3, { glow: true }));
  const hand = h.hands[0];
  s.cone([hand[0] + 1, hand[1] - 1, hand[2] + 1], [hand[0] + 4, hand[1] + 9, hand[2] + 1], 0.6, 0.6, m('#7a4a22'));
  s.tube([[hand[0] + 0.5, hand[1] + 9.5, hand[2] + 1], [hand[0] + 4, hand[1] + 10.5, hand[2] + 1], [hand[0] + 7.5, hand[1] + 9, hand[2] + 1]], [0.6, 0.9, 0.2], metal);
  frontEyes(b, h, 0.4, 0.0, 'rond', 0.24);
}

function tikoloshe(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const fur = m(c1, { fur: 1 });
  // Petit, voûté, bras qui traînent jusqu'au sol, grandes oreilles, poil hirsute.
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 5, torsoH: 6, hipY: 5, legR: 1.8, armR: 1.5, armLen: 12, headR: 5.5, neck: -1, digitigrade: true, footLen: 4 }, { body: fur, hands: m(c2), feet: m(c2) });
  s.ellipsoid([h.chest[0] + 1, h.chest[1] + 1, 0], [5.5, 6.5, 6], fur, { amp: 1.3, freq: 0.7, stretch: 1.6 });
  for (const side of SIDES) s.ellipsoid([h.head[0] + 1.5, h.head[1] + 1.5, side * (h.headR + 2.5)], [2.2, 3.2, 0.8], m(c2), { rot: [-20, side * 20, side * 35], k: 0.8 });
  s.cone([h.head[0] - h.headR * 0.6, h.head[1] - h.headR * 0.4, 0], [h.head[0] - h.headR * 1.1, h.head[1] - h.headR * 0.6, 0], h.headR * 0.4, h.headR * 0.25, m(c2), { k: 0.8 });
  for (const side of SIDES) s.cone([h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 0.85, side * 1.1], [h.head[0] - h.headR * 0.95, h.head[1] - h.headR * 1.2, side * 1.2], 0.45, 0.12, m('#f0e8d8'));
  frontEyes(b, h, 0.42, 0.15, 'lueur', 0.3);
  a.eyeColor = c3;
}

function kishi(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  // Devant, un bel homme en boubou ; derrière le crâne, une gueule de hyène grande ouverte.
  const robe = m(c1, { edge: true, pattern: { kind: 'rayures', color: shade(c3, -0.35), scale: 3, amount: 0.12, axis: 1 } });
  const skin = m(c2);
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 6.5, torsoH: 10, hipY: 11, legR: 2.2, armR: 2, armLen: 14, headR: 5.6, neck: 0.5, footLen: 4.5 }, { body: robe, hands: skin, legs: m(shade(c1, -0.2)), feet: skin });
  // Boubou évasé jusqu'aux genoux, larges manches.
  s.cone([0, h.chest[1] + 2, 0], [0.6, 5.5, 0], 6, 8.5, robe, { k: 1.5 });
  for (const sh of h.shoulders) s.ellipsoid([sh[0] - 0.5, sh[1] - 5, sh[2] * 1.15], [2.8, 5, 2.2], robe, { k: 1.5 });
  // Des mains trop longues, aux ongles noirs.
  for (const hand of h.hands) for (const k of [-1, 0, 1]) s.cone([hand[0] - 0.5, hand[1] - 1, hand[2] + k * 0.8], [hand[0] - 1.5, hand[1] - 4, hand[2] + k * 1.1], 0.5, 0.15, m('#1a1418'));
  const R = h.headR;
  s.sphere(h.head, R, skin);
  s.ellipsoid([h.head[0] + 0.2, h.head[1] + R * 0.72, 0], [R * 0.9, R * 0.38, R * 0.98], m('#1a1418', { fur: 0.6 }));
  // L'arrière de la tête : crinière de hyène et mâchoires béantes.
  const hyena = m('#6a5a4a', { fur: 1, pattern: { kind: 'taches', color: '#2a1e18', scale: 2.2, amount: 0.32 } });
  const back: V3 = [h.head[0] + R * 0.75, h.head[1], 0];
  s.ellipsoid(back, [R * 0.6, R * 0.95, R * 0.92], hyena, { k: 1.2 });
  s.cone([back[0] + 1, back[1] + R * 0.25, 0], [back[0] + R * 2, back[1] + R * 0.85, 0], R * 0.55, R * 0.28, hyena, { k: 1 });
  s.cone([back[0] + 1, back[1] - R * 0.45, 0], [back[0] + R * 1.8, back[1] - R * 1.05, 0], R * 0.45, R * 0.22, hyena, { k: 1 });
  s.sphere([back[0] + R * 0.6, back[1] - R * 0.1, 0], R * 0.5, m('#7a1a20'), { k: 0.4 });
  const fang = m('#f0ead8');
  for (const side of SIDES) {
    for (let i = 0; i < 3; i++) {
      const t = 0.35 + i * 0.25;
      const up = lerp3([back[0] + 1, back[1] + R * 0.25, side * 1.6], [back[0] + R * 2, back[1] + R * 0.85, side * 0.8], t);
      s.cone(up, [up[0] - 0.2, up[1] - 1.8, up[2]], 0.45, 0.08, fang);
      const lo = lerp3([back[0] + 1, back[1] - R * 0.45, side * 1.4], [back[0] + R * 1.8, back[1] - R * 1.05, side * 0.7], t);
      s.cone(lo, [lo[0] - 0.2, lo[1] + 1.5, lo[2]], 0.4, 0.08, fang);
    }
    s.sphere([back[0] + R * 0.55, back[1] + R * 0.62, side * R * 0.5], 0.75, m(c3, { glow: true }));
  }
  spikeRow(b, [back[0] + 0.5, back[1] - R * 0.6, 0], [h.chest[0] + 4, h.chest[1] - 1, 0], 4, 2.4, 1, m('#2a1e18', { fur: 1 }), 0.8);
  frontEyes(b, h, 0.38, 0.1, 'doux', 0.22);
  a.eyeColor = c3;
  a.mouth = [[h.head[0] - R * 0.86, h.head[1] - R * 0.42, -1.4], [h.head[0] - R * 0.9, h.head[1] - R * 0.36, 0], [h.head[0] - R * 0.86, h.head[1] - R * 0.42, 1.4]];
}

function nkondi(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const wood = m(c1, { pattern: { kind: 'rayures', color: shade(c1, -0.25), scale: 1.6, amount: 0.25, axis: 0 } });
  // Statue raide, un bras levé, le ventre orné d'un miroir, hérissée de clous.
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 7, torsoH: 11, hipY: 11, legR: 2.8, armR: 2.2, armLen: 12, headR: 6.5, neck: -0.5, armsUp: 0 }, { body: wood });
  const raised = h.shoulders[1];
  s.tube([raised, [raised[0] - 2, raised[1] + 5, raised[2] - 3], [raised[0] - 3, raised[1] + 10, raised[2] - 3]], [2.2, 1.8, 1.8], wood, { k: 1.5 });
  s.cone([raised[0] - 3, raised[1] + 9, raised[2] - 3], [raised[0] - 3.5, raised[1] + 16, raised[2] - 3], 0.9, 0.4, m('#c8c8d0', { gloss: true }));
  s.ellipsoid([h.chest[0] - 5.6, h.chest[1] - 1.5, 0], [0.8, 3, 3], m('#d8e8f0', { gloss: true, edge: true }));
  const nail = m(c2, { gloss: true });
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const ang = t * Math.PI * 7;
    const y = h.hips[1] - 2 + t * (h.chest[1] - h.hips[1] + 8);
    const base: V3 = [Math.cos(ang) * 6.5 - 0.3, y, Math.sin(ang) * 6.8];
    const dir: V3 = [Math.cos(ang), 0.25, Math.sin(ang)];
    if (Math.cos(ang) < -0.85 && Math.abs(y - h.chest[1] + 1.5) < 3) continue;
    s.cone(base, add3(base, [dir[0] * 3.5, dir[1] * 3.5, dir[2] * 3.5]), 0.45, 0.25, nail);
    s.sphere(add3(base, [dir[0] * 3.6, dir[1] * 3.6, dir[2] * 3.6]), 0.6, nail);
  }
  s.ellipsoid([h.head[0] + 0.5, h.head[1] + h.headR * 0.85, 0], [h.headR * 0.9, 1.5, h.headR * 0.9], m('#3a2a20', { fur: 1 }), { amp: 0.6, freq: 0.9 });
  frontEyes(b, h, 0.38, 0.1, 'lueur', 0.26);
  a.eyeColor = c3;
  a.mouth = [[h.head[0] - h.headR * 0.85, h.head[1] - h.headR * 0.45, -2], [h.head[0] - h.headR * 0.88, h.head[1] - h.headR * 0.45, 2]];
}

function noppera(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  // Un spectre en kimono sans pieds, mains tombantes tendues vers vous,
  // longs cheveux noirs, et un visage lisse comme un œuf.
  const robe = m(c2, { edge: true, pattern: { kind: 'rayures', color: shade(c2, 0.15), scale: 4, amount: 0.1, axis: 1 } });
  const skin = m(c3);
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 5.5, torsoH: 10, hipY: 12, legR: 0.01, armR: 2, armLen: 10, headR: 5.8, neck: 1, armsUp: 0.55, footLen: 0.01 }, { body: robe, hands: skin });
  s.cone([0, h.chest[1] + 1, 0], [2.5, 0, 0], 5.5, 1.2, robe, { k: 2, amp: 0.6, freq: 0.5, stretch: 1.5 });
  s.box([h.chest[0], h.hips[1] + 2.5, 0], [5.2, 1.4, 6.2], 0.6, m(c1, { edge: true }));
  // Longues manches pendantes sous les bras tendus.
  for (const hand of h.hands) s.ellipsoid([hand[0] + 2.5, hand[1] - 3.5, hand[2]], [2.6, 4.5, 1.8], robe, { k: 1.5 });
  for (const hand of h.hands) for (const k of [-1, 0, 1]) s.cone([hand[0] - 0.4, hand[1] - 0.6, hand[2] + k * 0.6], [hand[0] - 0.9, hand[1] - 3, hand[2] + k * 0.7], 0.4, 0.15, skin);
  s.sphere(h.head, h.headR, skin);
  const hair = m('#141018', { fur: 1 });
  s.ellipsoid([h.head[0] + 1.6, h.head[1] + 0.8, 0], [h.headR * 0.95, h.headR * 1.05, h.headR * 1.1], hair, { amp: 0.6, freq: 0.6 });
  s.cone([h.head[0] + 2.5, h.head[1], 0], [h.head[0] + 4, h.head[1] - 15, 0], h.headR * 0.95, 3, hair, { k: 2, amp: 1, freq: 0.6, stretch: 2.5 });
  for (const side of SIDES) s.cone([h.head[0] - 1, h.head[1] + 1, side * h.headR * 0.9], [h.head[0] - 0.5, h.head[1] - 9, side * h.headR * 0.95], 1.6, 0.6, hair, { k: 1, amp: 0.5, freq: 0.8, stretch: 2.5 });
  // Le visage : un œuf lisse, sans yeux, sans bouche.
  s.ellipsoid([h.head[0] - 0.9, h.head[1] - 0.6, 0], [h.headR * 0.85, h.headR * 1.0, h.headR * 0.75], m(c3, { gloss: true }), { k: 0.6 });
  a.eyes = [];
}

function obayifo(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  // L'esprit de la sorcière a quitté son corps : une tête décharnée de vieille
  // femme, auréolée de flammes vertes, qui traîne des filaments de feu.
  const head: V3 = [0, 20, 0];
  const R = 6;
  for (let i = 0; i < 5; i++) flame(b, [head[0] + 3 + (i % 2), head[1] - 2 + i * 0.6, (i - 2) * 3], 9 + (i % 2) * 3, 3.2, i % 2 ? c1 : shade(c1, -0.15), 5);
  const skin = m('#b8bca0', { belly: '#8a9a7a', maxTone: 3 });
  s.sphere(head, R, skin);
  s.ellipsoid([head[0] - 1, head[1] - 4, 0], [R * 0.62, R * 0.5, R * 0.62], skin, { k: 1.5 });
  for (const side of SIDES) s.paint([head[0] - R * 0.65, head[1] - 1.8, side * R * 0.62], [1.4, 1.4, 1], m('#6a7a5a'));
  for (const side of SIDES) s.paint([head[0] - R * 0.82, head[1] + 0.6, side * R * 0.36], [1.2, 1.4, 1.4], m('#1a1a14'));
  // Bouche béante aux dents clairsemées.
  s.paint([head[0] - R * 0.82, head[1] - 4.2, 0], [1.4, 1.8, 2], m('#2a0a0a'));
  for (const z of [-1.2, 0.4, 1.4]) s.cone([head[0] - R * 0.86, head[1] - 2.6, z], [head[0] - R * 0.88, head[1] - 3.6, z], 0.35, 0.1, m('#e8e0c0'));
  const hair = m('#a8a8a8', { fur: 1 });
  for (let i = 0; i < 6; i++) {
    const z = (i - 2.5) * 1.8;
    s.tube([[head[0] + 1, head[1] + 4, z * 0.6], [head[0] + 6, head[1] + 6 + (i % 2) * 2, z], [head[0] + 12, head[1] + 3 + (i % 3) * 2, z * 1.3]], [1.6, 1.1, 0.4], hair, { k: 1.5, amp: 0.4, freq: 0.9 });
  }
  // Filaments de feu qui pendent sous le cou.
  for (let i = 0; i < 5; i++) {
    const ang = rad(i * 72);
    const x0 = head[0] + Math.cos(ang) * 1.5;
    const z0 = Math.sin(ang) * 1.8;
    s.tube([[x0, head[1] - 6, z0], [x0 + 1.5 + (i % 2) * 2, head[1] - 11, z0 * 2], [x0 + 3 + i, head[1] - 17 + (i % 2) * 2, z0 * 2.5]], [1.3, 0.9, 0.3], m(i % 2 ? c1 : c2, { glow: i % 2 === 1 }), { k: 1, amp: 0.4, freq: 0.8 });
  }
  a.eyes = SIDES.map((side): V3 => [head[0] - R * 0.85, head[1] + 0.6, side * R * 0.36]);
  a.eyeR = 1.5;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
}

export const NEW_DESIGNS: Partial<Record<number, (b: Build) => void>> = {
  76: (b) => chameleon(b, false),
  77: (b) => chameleon(b, true),
  82: (b) => scorpion(b, false),
  83: (b) => scorpion(b, true),
  84: (b) => sandDjinn(b, false),
  85: (b) => sandDjinn(b, true),
  89: (b) => primate(b, false),
  90: (b) => primate(b, true),
  91: (b) => crocodile(b, false),
  92: (b) => crocodile(b, true),
  93: manatee,
  94: (b) => owl(b, false),
  95: (b) => owl(b, true),
  96: bat,
  97: popobawa,
  101: kodama,
  102: oni,
  104: phoenix,
  106: (b) => gargoyle(b, false),
  107: (b) => gargoyle(b, true),
  108: kobold,
  109: (b) => seal(b, false),
  110: (b) => seal(b, true),
  111: lindworm,
  115: taniwha,
  118: simurgh,
  119: mokele,
  120: grootslang,
  122: vulture,
  123: tikoloshe,
  125: kishi,
  126: nkondi,
  127: noppera,
  128: obayifo,
};

// Garde les identifiants de côté utilisés par les aides importées.
export type { Side };
