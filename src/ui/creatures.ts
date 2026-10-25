// Modelage des Jinémon : un plan corporel par famille, réglé espèce par espèce,
// sculpté en volumes (voir sculpt.ts) puis rendu en pixel art.
import { getSpecies, type Feature, type SpeciesLook } from '../data/ginedex';
import { shade } from './draw';
import { Sculpt, type MaterialDef, type SculptImage, type V3 } from './sculpt';

export type EyeKind = 'rond' | 'feroce' | 'lueur' | 'perle' | 'doux' | 'clos';

interface Anchors {
  eyes: V3[];
  /** Rayon de l'œil en unités du modèle. */
  eyeR: number;
  eyeKind: EyeKind;
  eyeColor?: string;
  mouth?: V3[];
  mouthColor?: string;
  /** La créature flotte au-dessus du sol. */
  floating?: boolean;
}

interface Build {
  s: Sculpt;
  look: SpeciesLook;
  id: number;
  has: (f: Feature) => boolean;
  a: Anchors;
  m: (color: string, extra?: Omit<MaterialDef, 'color'>) => number;
}

type Side = 1 | -1;
const SIDES: Side[] = [1, -1];
const lerp3 = (p: V3, q: V3, t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
const add3 = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const rad = (deg: number) => (deg * Math.PI) / 180;

// ── Éléments communs ─────────────────────────────────────────────────────

/** Feuille : ellipsoïde aplati dont l'axe long part de `base` selon les angles (degrés). */
function leaf(b: Build, base: V3, az: number, ay: number, len: number, mat: number, width = 0.32): void {
  const dir: V3 = [Math.cos(rad(az)) * Math.cos(rad(ay)), Math.sin(rad(az)), -Math.cos(rad(az)) * Math.sin(rad(ay))];
  const c = add3(base, [dir[0] * len * 0.5, dir[1] * len * 0.5, dir[2] * len * 0.5]);
  b.s.ellipsoid(c, [len * 0.5, 0.55, len * width], mat, { rot: [az, ay, 0] });
}

function leafMat(b: Build, color = '#6cbc3c'): number {
  return b.m(color, { pattern: { kind: 'rayures', color: shade(color, -0.25), scale: 2.6, amount: 0.12, axis: 1 } });
}

/** Bouquet de feuilles dressé. */
function leafTuft(b: Build, top: V3, size: number, n = 3, color?: string): void {
  const mat = leafMat(b, color);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    leaf(b, top, 60 + t * 60, -50 + t * 100, size * (i % 2 ? 0.85 : 1), mat);
  }
}

/** Flamme : cône lumineux au relief bruité étiré vers le haut. */
function flame(b: Build, base: V3, h: number, r: number, color = '#ff8a2a', lean = 0): void {
  const mat = b.m(color, { glow: true });
  b.s.cone(base, [base[0] + lean, base[1] + h, base[2]], r, r * 0.12, mat, { amp: r * 0.32, freq: 0.5, stretch: 2.4 });
  for (const side of SIDES) {
    b.s.cone(
      [base[0] + r * 0.4, base[1] + r * 0.3, base[2] + side * r * 0.5],
      [base[0] + r * 0.7 + lean * 0.6, base[1] + h * 0.6, base[2] + side * r * 0.8],
      r * 0.5,
      r * 0.08,
      mat,
      { amp: r * 0.2, freq: 0.6, stretch: 2 },
    );
  }
}

/** Aile à plumes : bras levé, couvertures puis rémiges qui retombent vers l'arrière. */
function featherWing(b: Build, root: V3, side: Side, span: number, color: string, opts: { up?: number; tip?: string; spread?: number } = {}): void {
  const cov = b.m(shade(color, 0.08), { pattern: { kind: 'plumes', color: shade(color, -0.2), scale: 1.8 }, edge: true });
  const mat = b.m(color, { pattern: { kind: 'plumes', color: shade(color, -0.25), scale: 2.2 }, edge: true });
  const tipMat = opts.tip ? b.m(opts.tip, { pattern: { kind: 'plumes', color: shade(opts.tip, -0.25), scale: 2.2 }, edge: true }) : mat;
  const up = opts.up ?? 55;
  const ay = -side * (opts.spread ?? 22);
  const out = Math.sin(rad(opts.spread ?? 22));
  const dir = (deg: number, len: number): V3 => [Math.cos(rad(deg)) * len, Math.sin(rad(deg)) * len, side * out * len];
  const wrist = add3(root, dir(up, span * 0.55));
  // Rémiges : des plus internes (vers l'arrière) aux primaires (dans l'axe du bras).
  for (let i = 0; i < 6; i++) {
    const t = 0.25 + i * 0.15;
    const base = lerp3(root, wrist, t);
    const ang = up - 72 + i * 12;
    const len = span * (0.45 + i * 0.1);
    const c = add3(base, dir(ang, len * 0.5));
    b.s.ellipsoid([c[0], c[1], c[2] + side * (0.4 - i * 0.12)], [len * 0.5, span * 0.13, 0.6], i >= 4 ? tipMat : mat, { rot: [ang, ay, 0] });
  }
  // Couvertures et bras par-dessus.
  b.s.cone(root, wrist, span * 0.12, span * 0.07, cov, { k: 1 });
  const mid = lerp3(root, wrist, 0.5);
  b.s.ellipsoid(add3(mid, dir(up - 70, span * 0.14)), [span * 0.36, span * 0.22, 0.9], cov, { rot: [up - 10, ay, 0] });
}

/** Aile membraneuse (chauve-souris, dragon) : doigts et voile festonné entre eux. */
function batWing(b: Build, root: V3, side: Side, span: number, bone: string, skin: string, up = 50): void {
  const boneMat = b.m(bone);
  const skinMat = b.m(skin);
  const spread = Math.sin(rad(20));
  const dir = (deg: number, len: number): V3 => [Math.cos(rad(deg)) * len, Math.sin(rad(deg)) * len, side * spread * len];
  const wrist = add3(root, dir(up, span * 0.5));
  const tips = [0, 1, 2, 3].map((i) => add3(wrist, dir(up + 10 - i * 35, span * (0.62 - i * 0.08))));
  const anchors = [...tips, add3(root, dir(up - 140, span * 0.15))];
  // Voile : un pan par intervalle entre deux doigts ; les creux dessinent le feston.
  for (let i = 0; i + 1 < anchors.length; i++) {
    const p = anchors[i];
    const q = anchors[i + 1];
    const c: V3 = [(wrist[0] + p[0] + q[0]) / 3, (wrist[1] + p[1] + q[1]) / 3, (wrist[2] + p[2] + q[2]) / 3];
    const mid = lerp3(p, q, 0.5);
    const ang = (Math.atan2(mid[1] - wrist[1], mid[0] - wrist[0]) * 180) / Math.PI;
    const len = Math.hypot(mid[0] - wrist[0], mid[1] - wrist[1]);
    const wid = Math.hypot(p[0] - q[0], p[1] - q[1]) * 0.5;
    b.s.ellipsoid(c, [len * 0.62, wid * 0.95, 0.45], skinMat, { rot: [ang, -side * 20, 0] });
  }
  b.s.cone(root, wrist, span * 0.08, span * 0.055, boneMat, { k: 1 });
  for (const t of tips) b.s.cone(wrist, t, span * 0.04, span * 0.018, boneMat, { k: 0.3 });
  b.s.cone(wrist, add3(wrist, dir(up + 60, span * 0.12)), span * 0.04, 0.2, boneMat);
}

/** Rangée de piques le long d'une ligne. */
function spikeRow(b: Build, from: V3, to: V3, n: number, h: number, r: number, mat: number, lean = 0.3): void {
  for (let i = 0; i < n; i++) {
    const p = lerp3(from, to, n === 1 ? 0.5 : i / (n - 1));
    const hh = h * (0.75 + 0.25 * Math.sin((i / Math.max(1, n - 1)) * Math.PI));
    b.s.cone(p, [p[0] + hh * lean, p[1] + hh, p[2]], r, 0.15, mat, { k: 0.6 });
  }
}

/** Corne en tube dont les points sont relatifs à la base (le z est inversé pour l'autre côté). */
function horn(b: Build, base: V3, side: Side, pts: V3[], radii: number[], mat: number): void {
  b.s.tube(
    [base, ...pts.map((p): V3 => [base[0] + p[0], base[1] + p[1], base[2] + side * p[2]])],
    radii,
    mat,
    { k: 0.5 },
  );
}

function hornMat(b: Build, color: string, ringed = true): number {
  return b.m(color, ringed ? { pattern: { kind: 'rayures', color: shade(color, -0.3), scale: 2.2, amount: 0.28, axis: 1 } } : {});
}

// ── Quadrupède ───────────────────────────────────────────────────────────

interface QuadShape {
  len: number;
  girth: number;
  width: number;
  legLen: number;
  legR: number;
  neck: number;
  neckAngle: number;
  headR: number;
  snout: number;
  snoutR: number;
  /** Le museau pique vers le bas (cheval, bovin). */
  snoutDrop: number;
  ears: 'pointues' | 'rondes' | 'longues' | 'tombantes' | 'renard' | 'aucune';
  earSize: number;
  tail: 'fine' | 'touffe' | 'renard' | 'courte' | 'cheval' | 'aucune';
  horns?: 'bourgeons' | 'antilope' | 'ciwara' | 'buffle' | 'zebu' | 'chevre';
  mane?: 'lion' | 'crete' | 'collerette' | 'ciwara' | 'algues';
  hooves: boolean;
  fur: number;
  /** Dos incliné : épaules plus hautes que la croupe (hyène). */
  slope: number;
  socks?: string;
  muzzle?: string;
  eye: EyeKind;
  eyeScale: number;
}

const QUAD_DEFAULT: QuadShape = {
  len: 12,
  girth: 7.5,
  width: 6.5,
  legLen: 12,
  legR: 2.5,
  neck: 8,
  neckAngle: 55,
  headR: 6.5,
  snout: 5,
  snoutR: 3,
  snoutDrop: 0.35,
  ears: 'pointues',
  earSize: 1,
  tail: 'fine',
  hooves: false,
  fur: 0.5,
  slope: 0,
  eye: 'rond',
  eyeScale: 1,
};

const QUAD_TUNING: Record<number, Partial<QuadShape>> = {
  // Poussilope : faon aux jambes graciles, grosse tête.
  1: { len: 9, girth: 6, width: 5, legLen: 11, legR: 1.7, neck: 6, headR: 7, snout: 3.5, snoutR: 2.6, earSize: 1.1, hooves: true, tail: 'courte', fur: 0.25, horns: 'bourgeons', muzzle: '#d8f0a8', eyeScale: 1.15 },
  2: { len: 11, girth: 6.5, width: 5.5, legLen: 13, legR: 2, neck: 8, headR: 6.5, snout: 4.5, snoutR: 2.6, hooves: true, tail: 'courte', fur: 0.3, horns: 'antilope', mane: 'crete', muzzle: '#c8e890' },
  // Chiwate : l'antilope Ci Wara, cou arqué, crinière ajourée et cornes en zigzag.
  3: { len: 13, girth: 7, width: 6, legLen: 15, legR: 2.2, neck: 11, neckAngle: 62, headR: 6, snout: 5.5, snoutR: 2.6, hooves: true, tail: 'touffe', fur: 0.2, horns: 'ciwara', mane: 'ciwara', muzzle: '#b8d880', eye: 'feroce' },
  // Leukin : lièvre, longues oreilles, grosses pattes arrière.
  18: { len: 8, girth: 7, width: 6, legLen: 6, legR: 2.4, neck: 3, neckAngle: 70, headR: 7, snout: 2.8, snoutR: 2.8, ears: 'longues', earSize: 1.25, tail: 'courte', fur: 0.5, muzzle: '#ffffff', eyeScale: 1.15 },
  // Boukyène : jeune hyène tachetée, dos en pente.
  20: { len: 11, girth: 7.5, width: 6, legLen: 11, legR: 2.6, neck: 5, neckAngle: 35, headR: 7, snout: 4.5, snoutR: 3.2, ears: 'rondes', earSize: 1.2, tail: 'touffe', fur: 0.7, slope: 3, mane: 'crete', muzzle: '#4a3a2e', eyeScale: 1.1 },
  21: { len: 14, girth: 9, width: 7, legLen: 14, legR: 3.2, neck: 6, neckAngle: 32, headR: 7.5, snout: 6, snoutR: 3.6, ears: 'rondes', tail: 'touffe', fur: 0.8, slope: 4.5, mane: 'crete', muzzle: '#3a2e28', eye: 'feroce' },
  // Warabé : lionceau tout rond.
  30: { len: 9, girth: 7, width: 6, legLen: 9, legR: 2.8, neck: 4, neckAngle: 45, headR: 7.8, snout: 3.2, snoutR: 3.4, ears: 'rondes', earSize: 1.1, tail: 'touffe', fur: 0.5, muzzle: '#fff0d0', eyeScale: 1.15 },
  31: { len: 14, girth: 9, width: 7.5, legLen: 14, legR: 3.4, neck: 6, neckAngle: 40, headR: 7.5, snout: 4.5, snoutR: 3.8, ears: 'rondes', tail: 'touffe', fur: 0.5, mane: 'lion', muzzle: '#fff0d0', eye: 'feroce' },
  // Buffadô : buffle massif, tête basse, cornes en casque.
  32: { len: 15, girth: 10, width: 8.5, legLen: 11, legR: 3.6, neck: 5, neckAngle: 15, headR: 7, snout: 5, snoutR: 4, snoutDrop: 0.9, ears: 'tombantes', tail: 'touffe', hooves: true, fur: 0.4, horns: 'buffle', slope: 2, muzzle: '#3a3030', eye: 'feroce' },
  // Zébulle et Zébourou : zébus à bosse.
  33: { len: 11, girth: 7.5, width: 6, legLen: 11, legR: 2.4, neck: 5, neckAngle: 35, headR: 6.5, snout: 4.5, snoutR: 3.2, snoutDrop: 0.6, ears: 'tombantes', tail: 'touffe', hooves: true, fur: 0.25, horns: 'zebu', muzzle: '#d8c8c0' },
  34: { len: 15, girth: 9.5, width: 7.5, legLen: 14, legR: 3, neck: 6, neckAngle: 35, headR: 7, snout: 5.5, snoutR: 3.6, snoutDrop: 0.6, ears: 'tombantes', tail: 'touffe', hooves: true, fur: 0.25, horns: 'zebu', muzzle: '#d8c8c0', eye: 'doux' },
  // Kitsunaï et Kyûbirei : renards à queues multiples.
  41: { len: 10, girth: 6.5, width: 5.5, legLen: 10, legR: 2, neck: 5, neckAngle: 50, headR: 7, snout: 5, snoutR: 2.2, ears: 'renard', earSize: 1.2, tail: 'aucune', fur: 0.6, socks: '#5a3a2a', muzzle: '#ffffff', eyeScale: 1.1 },
  42: { len: 13, girth: 7.5, width: 6.5, legLen: 13, legR: 2.4, neck: 7, neckAngle: 55, headR: 6.5, snout: 5.5, snoutR: 2.3, ears: 'renard', earSize: 1.1, tail: 'aucune', fur: 0.6, muzzle: '#ffffff', eye: 'feroce' },
  // Kelpoulain et Kelpestre : chevaux d'eau à crinière d'algues.
  49: { len: 11, girth: 7, width: 5.5, legLen: 13, legR: 2.1, neck: 9, neckAngle: 58, headR: 5.5, snout: 6, snoutR: 2.8, snoutDrop: 0.8, earSize: 0.8, tail: 'cheval', hooves: true, fur: 0.2, mane: 'algues', muzzle: '#a8d0e8', eyeScale: 1.15 },
  50: { len: 15, girth: 9, width: 7, legLen: 16, legR: 2.8, neck: 12, neckAngle: 60, headR: 6, snout: 7.5, snoutR: 3.2, snoutDrop: 0.9, earSize: 0.9, tail: 'cheval', hooves: true, fur: 0.2, mane: 'algues', eye: 'lueur' },
  // Fenrikin et Fenrisgrim : loups.
  53: { len: 10, girth: 7, width: 6, legLen: 10, legR: 2.4, neck: 5, neckAngle: 45, headR: 7, snout: 4.5, snoutR: 2.6, earSize: 1.2, tail: 'renard', fur: 0.7, muzzle: '#d8d8e0', eyeScale: 1.1 },
  54: { len: 15, girth: 9.5, width: 7.5, legLen: 15, legR: 3.4, neck: 6, neckAngle: 38, headR: 7.5, snout: 7, snoutR: 3.4, earSize: 1.1, tail: 'renard', fur: 0.9, mane: 'collerette', eye: 'feroce' },
  // Dahuon : le dahu, pattes plus courtes d'un côté.
  58: { len: 11, girth: 7.5, width: 6, legLen: 11, legR: 2.4, neck: 6, neckAngle: 50, headR: 6.5, snout: 4.5, snoutR: 2.8, snoutDrop: 0.5, earSize: 0.9, tail: 'courte', hooves: true, fur: 0.8, horns: 'chevre', muzzle: '#f0e8e0', eyeScale: 1.1 },
  // Sphynge : corps de lion, coiffe némès et ailes.
  66: { len: 14, girth: 8.5, width: 7, legLen: 12, legR: 3, neck: 5, neckAngle: 60, headR: 6.5, snout: 2.5, snoutR: 3.6, snoutDrop: 0.2, ears: 'aucune', tail: 'touffe', fur: 0.2, eye: 'feroce' },
  // Xolombre : chien nu, oreilles immenses.
  67: { len: 11, girth: 6.5, width: 5.5, legLen: 13, legR: 2, neck: 7, neckAngle: 55, headR: 6, snout: 5, snoutR: 2.4, ears: 'renard', earSize: 1.35, tail: 'fine', fur: 0, eye: 'lueur' },
  // Yurugal : le Renard Pâle.
  70: { len: 14, girth: 8, width: 6.5, legLen: 14, legR: 2.5, neck: 8, neckAngle: 55, headR: 6.5, snout: 6, snoutR: 2.4, ears: 'renard', earSize: 1.35, tail: 'renard', fur: 0.6, muzzle: '#ffffff', eye: 'feroce' },
};

function quadrupede(b: Build): void {
  const q = { ...QUAD_DEFAULT, ...(QUAD_TUNING[b.id] ?? {}) };
  const { s, has, a, m } = b;
  const [c1, c2, c3] = b.look.colors;
  const spots = has('points');
  const body = m(c1, {
    belly: b.id === 67 ? undefined : shade(c1, 0.38),
    fur: q.fur,
    pattern: spots ? { kind: 'taches', color: shade(c2, -0.05), scale: 4.6, amount: 0.36 } : undefined,
  });
  const by = q.legLen + q.girth * 0.72;
  const front = by + q.slope;
  const back = by - q.slope * 0.5;

  // Tronc : poitrail, ventre et croupe fondus.
  s.ellipsoid([-q.len * 0.48, front + 0.5, 0], [q.girth * 1.02, q.girth * 1.05, q.width], body);
  s.ellipsoid([0, (front + back) / 2 - q.girth * 0.05, 0], [q.len * 0.85, q.girth * 0.84, q.width * 0.93], body, { k: 5 });
  s.ellipsoid([q.len * 0.55, back + 0.3, 0], [q.girth * 0.92, q.girth * 0.95, q.width * 0.95], body, { k: 5 });
  if (has('bosse')) s.ellipsoid([-q.len * 0.38, front + q.girth * 0.92, 0], [q.girth * 0.68, q.girth * 0.72, q.width * 0.6], body, { k: 2.5 });

  // Pattes
  const hoof = m(shade(c2, -0.35), { gloss: true });
  const sock = q.socks ? m(q.socks, { fur: q.fur }) : -1;
  const legs = [
    { x: -q.len * 0.52, z: 1, back: false, stride: -2.2 },
    { x: -q.len * 0.46, z: -1, back: false, stride: 1.6 },
    { x: q.len * 0.6, z: 1, back: true, stride: 1.4 },
    { x: q.len * 0.64, z: -1, back: true, stride: -1.4 },
  ];
  for (const l of legs) {
    const z = l.z * q.width * 0.55;
    // Le dahu a les pattes du côté proche plus courtes : il se tient sur un talus.
    const lift = b.id === 58 && l.z > 0 ? q.legLen * 0.32 : 0;
    const top: V3 = [l.x, (l.back ? back : front) - q.girth * 0.15, z];
    const footX = l.x + l.stride;
    const footY = (q.hooves ? 1.5 : 1.2) + lift;
    if (l.back) {
      const knee: V3 = [l.x - q.legR * 0.6, (q.legLen + lift) * 0.62 + lift * 0.3, z];
      const hock: V3 = [l.x + q.legR * 1.1 + l.stride * 0.3, q.legLen * 0.32 + lift, z];
      s.cone(top, knee, q.legR * 1.75, q.legR * 0.95, body, { k: 3 });
      s.cone(knee, hock, q.legR * 0.95, q.legR * 0.62, body, { k: 1 });
      s.cone(hock, [footX, footY, z], q.legR * 0.62, q.legR * 0.58, body, { k: 0.8 });
    } else {
      const knee: V3 = [l.x + l.stride * 0.35 + 0.4, q.legLen * 0.48 + lift, z];
      s.cone(top, knee, q.legR * 1.35, q.legR * 0.78, body, { k: 3 });
      s.cone(knee, [footX, footY, z], q.legR * 0.78, q.legR * 0.62, body, { k: 0.8 });
    }
    if (q.hooves) s.cone([footX, footY + 0.8, z], [footX - 0.3, footY - 1.2, z], q.legR * 0.66, q.legR * 0.82, hoof);
    else s.ellipsoid([footX - 0.7, footY - 0.2, z], [q.legR * 1.05, 1.3, q.legR * 0.85], body, { k: 1.2 });
    if (sock >= 0) s.paint([footX, footY + q.legLen * 0.12, z], [q.legR * 1.6, q.legLen * 0.25, q.legR * 1.6], sock);
  }
  if (b.id === 58) {
    // Talus rocheux sous les pattes courtes.
    const lift = q.legLen * 0.32;
    const rock = m('#8a7a6a', { pattern: { kind: 'craquelures', color: '#6a5a4e', scale: 3.5 } });
    s.box([0, lift / 2 - 0.4, q.width * 0.75], [q.len * 0.95, lift / 2, 3.2], 1.2, rock, { amp: 0.4, freq: 0.5 });
  }

  // Queue
  const tb: V3 = [q.len * 0.95 + q.girth * 0.25, back + q.girth * 0.35, 0];
  if (q.tail === 'renard') {
    const tail = m(c1, { fur: 0.9 });
    s.tube([tb, [tb[0] + 5, tb[1] + 1, -1], [tb[0] + 9, tb[1] + 6, -2], [tb[0] + 10, tb[1] + 12, -2.5]], [1.5, 3.6, 3.8, 1.6], tail, { k: 2, amp: 0.7, freq: 0.55 });
    s.paint([tb[0] + 10, tb[1] + 11.5, -2.5], [3.4, 3.4, 3.4], m(b.id === 54 || b.id === 53 ? shade(c1, 0.5) : '#ffffff', { fur: 0.9 }));
  } else if (q.tail === 'courte') {
    s.sphere([tb[0] - 0.6, tb[1] + 1, 0], 2.4, m(b.id === 18 ? '#ffffff' : c1, { fur: 0.8 }), { k: 1.2, amp: 0.4, freq: 0.8 });
  } else if (q.tail === 'cheval') {
    const hair = m(c3 === '#5ae8a0' ? shade(c2, 0.2) : shade(c2, 0.35), { fur: 1 });
    s.tube([tb, [tb[0] + 3.5, tb[1] - 1, 0], [tb[0] + 5, tb[1] - 7, 0.5], [tb[0] + 4.2, tb[1] - 13, 0.5]], [1.8, 2.6, 2.2, 0.8], hair, { k: 1, amp: 0.7, freq: 0.7, stretch: 3 });
  } else if (q.tail !== 'aucune') {
    s.tube([tb, [tb[0] + 3.5, tb[1] - 2.5, 0], [tb[0] + 5.5, tb[1] - 8, 0.5]], [1, 0.75, 0.65], body, { k: 1 });
    if (q.tail === 'touffe') s.ellipsoid([tb[0] + 5.8, tb[1] - 10, 0.5], [1.6, 2.6, 1.6], m(shade(c2, -0.1), { fur: 1 }), { k: 0.6, amp: 0.5, freq: 0.9 });
  }
  if (has('queues3') || has('queues9')) {
    // Queues en éventail derrière la croupe.
    const n = has('queues9') ? 9 : 3;
    const tail = m(c1, { fur: 0.8 });
    const tip = m(c2, { fur: 0.8 });
    const len = n > 3 ? 19 : 14;
    for (let i = 0; i < n; i++) {
      const th = rad(n > 3 ? 14 + (i / (n - 1)) * 152 : 50 + i * 40);
      const d: V3 = [0.5, Math.sin(th), Math.cos(th) * 0.95];
      // Chaque queue s'évase puis se recourbe vers le haut, pointe claire.
      const p1: V3 = [tb[0] + d[0] * len * 0.35 + 1, tb[1] + d[1] * len * 0.3, d[2] * len * 0.35];
      const p2: V3 = [tb[0] + d[0] * len * 0.75 + 1.5, tb[1] + d[1] * len * 0.65 + 2, d[2] * len * 0.7];
      const end: V3 = [tb[0] + d[0] * len * 0.85, tb[1] + d[1] * len * 0.8 + 5, d[2] * len * 0.8];
      s.tube([tb, p1, p2, end], n > 3 ? [0.9, 2, 2.2, 1] : [1.2, 2.8, 3, 1.4], tail, { k: 1, amp: 0.5, freq: 0.6 });
      s.paint(end, n > 3 ? [2.4, 2.6, 2.4] : [3, 3, 3], tip);
    }
  }

  // Cou et tête
  const ang = rad(q.neckAngle);
  const neckBase: V3 = [-q.len * 0.62, front + q.girth * 0.35, 0];
  const hc: V3 = [neckBase[0] - Math.cos(ang) * q.neck, neckBase[1] + Math.sin(ang) * q.neck, 0];
  s.cone(neckBase, hc, q.girth * 0.62, q.headR * 0.62, body, { k: 4 });
  s.sphere(hc, q.headR, body, { k: 2.5 });
  // Joues : élargissent la tête à hauteur des yeux.
  s.ellipsoid([hc[0] - q.headR * 0.1, hc[1] - q.headR * 0.2, 0], [q.headR * 0.85, q.headR * 0.75, q.headR * 1.08], body, { k: 1.5 });
  const snoutStart: V3 = [hc[0] - q.headR * 0.35, hc[1] - q.headR * 0.25, 0];
  const snoutEnd: V3 = [hc[0] - q.headR * 0.6 - q.snout, hc[1] - q.headR * 0.25 - q.snout * q.snoutDrop, 0];
  const muzzle = q.muzzle ? m(q.muzzle, { fur: q.fur * 0.5 }) : body;
  s.cone(snoutStart, snoutEnd, q.headR * 0.62, q.snoutR, muzzle, { k: 2 });
  const nose = m('#2a1e22', { gloss: true });
  s.sphere([snoutEnd[0] - q.snoutR * 0.5, snoutEnd[1] + q.snoutR * 0.35, 0], q.snoutR * 0.5, nose, { k: 0.4 });
  if (q.muzzle && muzzle !== body) s.paint(lerp3(snoutStart, snoutEnd, 0.6), [q.snout * 0.7 + 1, q.snoutR * 1.2, q.snoutR * 1.4], muzzle);

  // Oreilles
  const earMat = m(c1, { fur: q.fur });
  const inner = m(shade(c3 === '#ffffff' ? '#f0b0a0' : c3, 0.25));
  for (const side of SIDES) {
    const ez = side * q.headR * 0.55;
    const e = q.earSize;
    if (q.ears === 'aucune') break;
    if (q.ears === 'longues') {
      s.ellipsoid([hc[0] + 2.2, hc[1] + q.headR + 5.5 * e, ez * 0.75], [1.9 * e, 7 * e, 0.9 * e], earMat, { rot: [-10, side * 15, side * -12], k: 1 });
      s.paint([hc[0] + 1.8, hc[1] + q.headR + 5.5 * e, ez * 0.75 + side * 0.8], [1.1 * e, 5.5 * e, 0.8], inner, [-10, side * 15, side * -12]);
    } else if (q.ears === 'tombantes') {
      s.ellipsoid([hc[0] + 1, hc[1] + q.headR * 0.15, ez * 1.75], [1.6 * e, 4.2 * e, 1 * e], earMat, { rot: [25, 0, side * 60], k: 0.6 });
    } else if (q.ears === 'rondes') {
      s.ellipsoid([hc[0] + 1.5, hc[1] + q.headR * 0.85, ez * 1.2], [2.4 * e, 2.4 * e, 1.1 * e], earMat, { rot: [0, side * 20, side * -25], k: 1 });
      s.paint([hc[0] + 1.3, hc[1] + q.headR * 0.85, ez * 1.2 + side * 0.6], [1.4 * e, 1.4 * e, 0.8], inner);
    } else {
      const big = q.ears === 'renard' ? 1.3 : 1;
      const tip: V3 = [hc[0] + 2.5, hc[1] + q.headR + 5.5 * e * big, ez * 1.35];
      s.cone([hc[0] + 1.5, hc[1] + q.headR * 0.55, ez], tip, 2.5 * e * big, 0.35, earMat, { k: 1 });
      s.paint(lerp3([hc[0] + 1.2, hc[1] + q.headR * 0.8, ez + side], tip, 0.45), [1.1 * e * big, 2.4 * e * big, 1], inner);
    }
  }

  a.eyes = SIDES.map((side): V3 => [hc[0] - q.headR * 0.62, hc[1] + q.headR * 0.18, side * q.headR * 0.66]);
  a.eyeR = q.headR * 0.3 * q.eyeScale;
  a.eyeKind = q.eye;
  a.eyeColor = c3;
  a.mouth = [
    [snoutEnd[0] + 0.2, snoutEnd[1] - q.snoutR * 0.55, q.snoutR * 0.5],
    [snoutEnd[0] + q.snout * 0.45, snoutEnd[1] - q.snoutR * 0.35, q.snoutR * 0.85],
  ];

  // Crinières
  if (q.mane === 'lion') {
    const mane = m(c2, { fur: 1 });
    s.sphere([hc[0] + q.headR * 0.55, hc[1] - 0.8, 0], q.headR * 1.45, mane, { amp: 1.7, freq: 0.5 });
    s.cone([hc[0] + q.headR * 0.6, hc[1] - 1, 0], [neckBase[0] + 2, neckBase[1], 0], q.headR * 1.15, q.girth * 0.75, mane, { k: 2, amp: 1.5, freq: 0.5 });
    // Le visage repasse devant la crinière.
    s.sphere([hc[0] - 1, hc[1], 0], q.headR * 0.92, body);
    s.ellipsoid([hc[0] - 0.9, hc[1] - q.headR * 0.2, 0], [q.headR * 0.8, q.headR * 0.72, q.headR * 1.05], body, { k: 1.5 });
    s.cone(snoutStart, snoutEnd, q.headR * 0.62, q.snoutR, muzzle, { k: 2 });
    s.sphere([snoutEnd[0] - q.snoutR * 0.5, snoutEnd[1] + q.snoutR * 0.35, 0], q.snoutR * 0.5, nose, { k: 0.4 });
    for (const side of SIDES) {
      s.ellipsoid([hc[0] + 1.5, hc[1] + q.headR * 0.85, side * q.headR * 0.66], [2.2, 2.2, 1.1], earMat, { rot: [0, side * 20, side * -25], k: 1 });
    }
  } else if (q.mane === 'collerette') {
    const ruff = m(shade(c1, 0.25), { fur: 1 });
    s.ellipsoid([neckBase[0] + 1, neckBase[1] + 1, 0], [q.girth * 0.75, q.girth * 0.95, q.width * 1.15], ruff, { k: 2, amp: 1.5, freq: 0.55, stretch: 1.6 });
  } else if (q.mane === 'crete' || q.mane === 'algues') {
    const algae = q.mane === 'algues';
    const crest = m(algae ? (b.id === 50 ? '#2a8a6a' : '#5ac8a0') : c2, { fur: 1 });
    const from: V3 = [hc[0] + q.headR * 0.5, hc[1] + q.headR * 0.75, 0];
    const to: V3 = algae ? [neckBase[0] + 3, neckBase[1] + q.girth * 0.4, 0] : [q.len * 0.4, back + q.girth * 0.8, 0];
    s.cone(from, to, algae ? 2.6 : 1.8, algae ? 2.2 : 1.4, crest, { k: 1, amp: algae ? 1.4 : 1, freq: 0.7, stretch: algae ? 2.5 : 1 });
    if (algae) {
      for (const side of SIDES) s.cone(lerp3(from, to, 0.3), [to[0] - 2, to[1] - 6, side * q.width * 0.7], 1.8, 0.8, crest, { k: 1, amp: 0.9, freq: 0.7, stretch: 3 });
    }
  } else if (q.mane === 'ciwara') {
    // Crinière ajourée en dents de scie, comme les cimiers sculptés.
    const wood = m(c2, { pattern: { kind: 'rayures', color: shade(c2, -0.3), scale: 1.6, amount: 0.3, axis: 0 } });
    const from: V3 = [hc[0] + q.headR * 0.7, hc[1] + q.headR * 0.4, 0];
    const to: V3 = [neckBase[0] + 3, neckBase[1] + q.girth * 0.55, 0];
    for (let i = 0; i < 5; i++) {
      const p = lerp3(from, to, i / 4);
      s.cone(p, [p[0] + 3.5, p[1] + 3.2, 0], 1.3, 0.2, wood, { k: 0.5 });
    }
    s.cone(from, to, 1, 1, wood, { k: 1 });
  }

  // Cornes
  if (q.horns) {
    const color = q.horns === 'buffle' ? '#9a8c7a' : q.horns === 'ciwara' ? shade(c2, 0.25) : c3 === '#ffffff' || c3 === '#e4b6e8' ? '#e8dcc0' : shade(c3, -0.08);
    const mat = hornMat(b, color, q.horns !== 'buffle');
    for (const side of SIDES) {
      const base: V3 = [hc[0] - 0.5, hc[1] + q.headR * 0.75, side * q.headR * 0.42];
      switch (q.horns) {
        case 'bourgeons':
          horn(b, base, side, [[0.8, 2.2, 0.4]], [1.2, 0.6], mat);
          break;
        case 'antilope':
          horn(b, base, side, [[1.5, 4.5, 0.6], [4, 8, 1], [7.5, 9.5, 1.3]], [1.2, 1, 0.7, 0.25], mat);
          break;
        case 'ciwara':
          horn(b, base, side, [[1.5, 5, 0.5], [-0.5, 10, 0.8], [2.5, 15, 1], [0.5, 20, 1.2], [2.5, 25, 1.3]], [1.5, 1.3, 1.1, 0.9, 0.6, 0.2], mat);
          break;
        case 'buffle':
          // Bossage frontal puis cornes en anse.
          s.ellipsoid([base[0] + 1, base[1] - 0.5, 0], [3.2, 1.8, q.headR * 0.9], mat, { k: 1 });
          horn(b, [base[0] + 1, base[1] - 0.5, side * q.headR * 0.8], side, [[1, -2.5, 4], [-0.5, -1.5, 7.5], [-1.5, 2.5, 9]], [2, 1.6, 1, 0.3], mat);
          break;
        case 'zebu':
          horn(b, base, side, [[0.5, 2, 2.5], [0, 6, 4], [-1, 9.5, 3.2]], [1.4, 1.1, 0.7, 0.25], mat);
          break;
        case 'chevre':
          horn(b, base, side, [[2, 3.5, 1], [5.5, 4, 1.8], [7, 0.5, 2.2], [5, -1.5, 2.4]], [1.6, 1.4, 1.1, 0.7, 0.3], mat);
          break;
      }
    }
  }

  // Attributs
  if (has('feuilles')) leafTuft(b, [hc[0] + 1.5, hc[1] + q.headR * 0.9, 0], b.id === 1 ? 5.5 : 6, 3);
  if (has('epines')) spikeRow(b, [-q.len * 0.4, front + q.girth * 0.95, 0], [q.len * 0.6, back + q.girth * 0.85, 0], 5, 4, 1.2, m(shade(c3, -0.3)), 0.4);
  if (has('ailes')) for (const side of SIDES) featherWing(b, [-q.len * 0.2, front + q.girth * 0.7, side * q.width * 0.6], side, 22, shade(c1, 0.15), { tip: c2, up: 70 });
  if (has('coiffe')) {
    // Némès rayé : capuche, pans sur la poitrine et uraeus.
    const cloth = m(c1, { pattern: { kind: 'rayures', color: c2, scale: 2.4, amount: 0.45, axis: 1 }, edge: true });
    s.ellipsoid([hc[0] + 0.8, hc[1] + 1, 0], [q.headR * 1.05, q.headR * 1.0, q.headR * 1.12], cloth);
    for (const side of SIDES) s.box([hc[0] + 1.8, hc[1] - q.headR * 0.9, side * q.headR * 0.95], [2, q.headR * 0.9, 0.9], 0.6, cloth, { rot: [-8, 0, 0] });
    s.sphere([hc[0] - 0.6, hc[1] - 0.6, 0], q.headR * 0.84, m('#c89060'));
    s.cone([hc[0] - q.headR * 0.8, hc[1] + q.headR * 0.8, 0], [hc[0] - q.headR * 0.95, hc[1] + q.headR * 1.4, 0], 0.9, 0.5, m(c3, { gloss: true }));
    a.eyes = SIDES.map((side): V3 => [hc[0] - q.headR * 0.62, hc[1] + q.headR * 0.05, side * q.headR * 0.5]);
    a.mouth = [
      [hc[0] - q.headR * 0.76, hc[1] - q.headR * 0.45, q.headR * 0.2],
      [hc[0] - q.headR * 0.62, hc[1] - q.headR * 0.48, q.headR * 0.5],
    ];
  }
  if (has('chaines')) {
    const metal = m('#a8b0b8', { gloss: true });
    for (const l of legs.slice(0, 2)) {
      const z = l.z * q.width * 0.55;
      const y = q.legLen * 0.3;
      s.cone([l.x + l.stride * 0.7, y + 1, z], [l.x + l.stride * 0.75, y - 1, z], q.legR * 1.05, q.legR * 1.05, metal, { k: 0 });
      for (let i = 0; i < 3; i++) s.ellipsoid([l.x + l.stride * 0.7 + 1 + i * 1.6, y - 2 - i * 1.3, z + l.z * 1.2], [1, 0.7, 0.5], metal, { rot: [i % 2 ? 40 : -20, 0, i % 2 ? 90 : 0] });
    }
  }
  if (has('lueur')) {
    const glow = m(c3, { glow: true });
    s.paint([hc[0] - q.headR * 0.3, hc[1] + q.headR * 0.75, 0], [2.5, 1, q.headR * 0.3], glow);
    s.paint([-q.len * 0.1, front + q.girth * 0.8, 0], [q.len * 0.6, 1.2, q.width * 0.4], glow);
  }
  if (has('yeux')) a.eyeKind = 'lueur';
}

// ── Bipède ───────────────────────────────────────────────────────────────

interface Humanoid {
  head: V3;
  headR: number;
  chest: V3;
  hips: V3;
  hands: V3[];
  shoulders: V3[];
}

interface BipedShape {
  torsoR: number;
  torsoH: number;
  hipY: number;
  legR: number;
  armR: number;
  armLen: number;
  headR: number;
  neck: number;
  /** Bras levés (0 = le long du corps, 1 = levés). */
  armsUp: number;
  footLen: number;
  digitigrade: boolean;
}

/** Squelette humanoïde trapu : jambes, bassin, torse, bras et tête. */
function humanoid(b: Build, p: BipedShape, mats: { body: number; legs?: number; arms?: number; hands?: number; feet?: number }): Humanoid {
  const { s } = b;
  const legs = mats.legs ?? mats.body;
  const arms = mats.arms ?? mats.body;
  const hips: V3 = [0, p.hipY, 0];
  const chest: V3 = [-0.3, p.hipY + p.torsoH * 0.6, 0];
  for (const side of SIDES) {
    const z = side * p.torsoR * 0.5;
    const knee: V3 = p.digitigrade ? [-1.5, p.hipY * 0.55, z * 1.05] : [-0.6, p.hipY * 0.5, z * 1.05];
    const ankle: V3 = p.digitigrade ? [1.2, p.hipY * 0.18, z * 1.05] : [0, 1.4, z * 1.05];
    s.cone([0, p.hipY, z], knee, p.legR * 1.3, p.legR * 0.95, legs, { k: 2.5 });
    s.cone(knee, ankle, p.legR * 0.95, p.legR * 0.75, legs, { k: 1 });
    s.ellipsoid([ankle[0] - p.footLen * 0.45, 1.1, z * 1.1], [p.footLen * 0.62, 1.3, p.legR * 0.9], mats.feet ?? legs, { k: 1 });
  }
  s.ellipsoid([0, p.hipY + 0.5, 0], [p.torsoR * 0.8, p.torsoR * 0.6, p.torsoR * 0.85], mats.body, { k: 2 });
  s.ellipsoid(chest, [p.torsoR * 0.82, p.torsoH * 0.62, p.torsoR], mats.body, { k: 4 });
  const shoulderY = p.hipY + p.torsoH * 1.0;
  const shoulders: V3[] = [];
  const hands: V3[] = [];
  for (const side of SIDES) {
    const sh: V3 = [-0.2, shoulderY - p.armR * 0.6, side * (p.torsoR * 0.95)];
    const up = p.armsUp;
    const elbow: V3 = [sh[0] - 1.5 - up * 2, sh[1] - p.armLen * 0.5 * (1 - up * 1.3), sh[2] + side * (1.5 + up * 2)];
    const hand: V3 = [elbow[0] - 1.5 - up * 2.5, elbow[1] - p.armLen * 0.5 * (1 - up * 2.2), elbow[2] + side * 0.5];
    s.cone(sh, elbow, p.armR * 1.15, p.armR * 0.85, arms, { k: 2 });
    s.cone(elbow, hand, p.armR * 0.85, p.armR * 0.75, arms, { k: 0.6 });
    s.sphere(hand, p.armR * 1.05, mats.hands ?? arms, { k: 0.8 });
    shoulders.push(sh);
    hands.push(hand);
  }
  const head: V3 = [-0.6, shoulderY + p.neck + p.headR * 0.85, 0];
  s.cone([0, shoulderY - 1, 0], head, p.torsoR * 0.45, p.headR * 0.5, mats.body, { k: 2 });
  s.sphere(head, p.headR, mats.body, { k: 1.5 });
  return { head, headR: p.headR, chest, hips, hands, shoulders };
}

function frontEyes(b: Build, h: Humanoid, spread = 0.42, height = 0.1, kind: EyeKind = 'rond', size = 0.28): void {
  b.a.eyes = SIDES.map((side): V3 => [h.head[0] - h.headR * 0.8, h.head[1] + h.headR * height, side * h.headR * spread]);
  b.a.eyeR = h.headR * size;
  b.a.eyeKind = kind;
}

const BIPED_DEFAULT: BipedShape = {
  torsoR: 6,
  torsoH: 9,
  hipY: 10,
  legR: 2.3,
  armR: 1.8,
  armLen: 10,
  headR: 6.5,
  neck: 1,
  armsUp: 0,
  footLen: 4,
  digitigrade: false,
};

function bipede(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const shape = (o: Partial<BipedShape>): BipedShape => ({ ...BIPED_DEFAULT, ...o });
  switch (id) {
    case 7: {
      // Étincel : diablotin de braise tout rond, mèche de feu sur la tête.
      const body = m(c1, { belly: '#ffd080' });
      const h = humanoid(b, shape({ torsoR: 7, torsoH: 8, hipY: 5, legR: 2.4, armR: 1.8, armLen: 6, headR: 7.5, neck: -3, footLen: 3.4 }), { body, hands: m(c2), feet: m(c2) });
      flame(b, [h.head[0] + 2.5, h.head[1] + h.headR * 0.6, 0], 8, 3.4, c3, 3);
      s.paint([h.head[0] - 3, h.head[1] - 2.5, 0], [4.5, 3.5, 6], m(shade(c1, 0.3)));
      frontEyes(b, h, 0.42, 0.12, 'rond', 0.3);
      a.mouth = [[h.head[0] - h.headR * 0.92, h.head[1] - h.headR * 0.35, -1.5], [h.head[0] - h.headR * 0.88, h.head[1] - h.headR * 0.42, 2]];
      break;
    }
    case 8: {
      // Forgeron-Feu : artisan trapu, plastron de fer, chevelure de flammes et marteau.
      const body = m(c1, { belly: shade(c1, 0.25) });
      const iron = m(c2, { gloss: true, edge: true });
      const p = shape({ torsoR: 7, torsoH: 9, hipY: 9, legR: 2.8, armR: 2.5, armLen: 10, headR: 6.8, neck: -0.5 });
      const h = humanoid(b, p, { body, legs: m(shade(c2, -0.2)), hands: m(shade(c1, -0.25)), feet: m(shade(c2, -0.35), { gloss: true }) });
      s.ellipsoid([h.chest[0] - 1.2, h.chest[1] + 0.5, 0], [p.torsoR * 0.72, p.torsoH * 0.5, p.torsoR * 1.02], iron);
      for (const sh of h.shoulders) s.sphere([sh[0] + 0.5, sh[1] + 1, sh[2]], p.armR * 1.25, iron);
      s.box([0, p.hipY + 1, 0], [p.torsoR * 0.7, 1.2, p.torsoR * 0.95], 0.6, m('#5a3a22', { edge: true }));
      flame(b, [h.head[0] + 2.5, h.head[1] + h.headR * 0.45, 0], 9, 4, c3, 4);
      // Marteau de forge levé.
      const hand = h.hands[0];
      s.cone([hand[0] + 0.5, hand[1] - 1, hand[2] + 1.5], [hand[0] - 3, hand[1] + 7, hand[2] + 2], 0.8, 0.8, m('#7a4a22'));
      s.box([hand[0] - 3.4, hand[1] + 8, hand[2] + 2], [2.2, 3.6, 2.2], 0.5, iron, { rot: [-25, 0, 0] });
      frontEyes(b, h, 0.4, 0.1, 'feroce', 0.27);
      a.mouth = [[h.head[0] - h.headR * 0.92, h.head[1] - h.headR * 0.4, -1.5], [h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 0.4, 1.8]];
      break;
    }
    case 9: {
      // Vulcanis-Djinn : djinn de la fournaise, le bas du corps est un tourbillon de feu.
      a.floating = true;
      const body = m(c1, { belly: shade(c1, 0.22) });
      const iron = m(c2, { gloss: true, edge: true });
      const p = shape({ torsoR: 8.5, torsoH: 11, hipY: 15, legR: 0.01, armR: 3, armLen: 12, headR: 6.2, neck: -0.5, footLen: 0.01 });
      const h = humanoid(b, p, { body, hands: m(shade(c1, -0.25)) });
      const fire = m(c3, { glow: true });
      s.cone([0, 15, 0], [4, 6, 1], 6.5, 3.5, fire, { k: 2, amp: 1.2, freq: 0.45, stretch: 1.6 });
      s.cone([4, 6, 1], [10, 2, -1], 3.5, 0.6, fire, { k: 1.5, amp: 0.8, freq: 0.6 });
      s.ellipsoid([h.chest[0] - 1, h.chest[1] + 1, 0], [p.torsoR * 0.7, p.torsoH * 0.45, p.torsoR * 1.02], iron);
      for (const sh of h.shoulders) s.ellipsoid([sh[0] + 0.5, sh[1] + 1.5, sh[2]], [4.2, 3, 4.5], iron, { rot: [0, 0, Math.sign(sh[2]) * 20] });
      for (const hand of h.hands) s.cone([hand[0] + 1, hand[1] + 3, hand[2]], [hand[0] + 0.5, hand[1] + 0.5, hand[2]], 2.6, 2.4, m('#f0c040', { gloss: true }));
      flame(b, [h.head[0] + 2, h.head[1] + h.headR * 0.55, 0], 12, 4.8, c3, 4);
      const hm = hornMat(b, '#3a3230', false);
      for (const side of SIDES) horn(b, [h.head[0] + 0.5, h.head[1] + h.headR * 0.55, side * h.headR * 0.6], side, [[0.5, 2.5, 3], [2.5, 6, 4], [5.5, 8, 3.5]], [1.7, 1.3, 0.8, 0.2], hm);
      frontEyes(b, h, 0.4, 0.1, 'lueur', 0.27);
      a.eyeColor = '#fff8a0';
      a.mouth = [[h.head[0] - h.headR * 0.92, h.head[1] - h.headR * 0.4, -2], [h.head[0] - h.headR * 0.95, h.head[1] - h.headR * 0.48, 0], [h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 0.4, 2.2]];
      break;
    }
    case 19: {
      // Leukmalin : lièvre conteur debout, écharpe et bâton.
      const body = m(c1, { belly: '#f8f0e0', fur: 0.5 });
      const h = humanoid(b, shape({ torsoR: 5.5, torsoH: 8, hipY: 9, legR: 2.2, armR: 1.5, armLen: 9, headR: 6.5, neck: 0, footLen: 5.5, digitigrade: true }), { body });
      for (const side of SIDES) {
        s.ellipsoid([h.head[0] + 1.5, h.head[1] + h.headR + 6.5, side * h.headR * 0.42], [1.9, 7.5, 0.9], body, { rot: [-14, side * 18, side * -10], k: 1 });
        s.paint([h.head[0] + 1.1, h.head[1] + h.headR + 6.5, side * (h.headR * 0.42 + 0.8)], [1.1, 6, 0.8], m('#e8b0b8'), [-14, side * 18, side * -10]);
      }
      s.ellipsoid([h.head[0] - h.headR * 0.65, h.head[1] - h.headR * 0.35, 0], [h.headR * 0.45, h.headR * 0.38, h.headR * 0.6], m('#ffffff', { fur: 0.4 }), { k: 1.5 });
      s.sphere([h.head[0] - h.headR * 1.02, h.head[1] - h.headR * 0.12, 0], 0.9, m('#e86a8a', { gloss: true }));
      const scarf = m(c3, { edge: true, pattern: { kind: 'rayures', color: shade(c3, -0.3), scale: 2, amount: 0.3, axis: 0 } });
      s.cone([h.chest[0], h.chest[1] + 5, -4], [h.chest[0], h.chest[1] + 5, 4], 2.6, 2.6, scarf, { k: 0 });
      s.cone([h.chest[0] + 1, h.chest[1] + 4, 3], [h.chest[0] + 3.5, h.chest[1] - 3, 4.5], 1.8, 1.4, scarf);
      const hand = h.hands[1];
      s.cone([hand[0], hand[1] - 9, hand[2]], [hand[0] - 0.5, hand[1] + 8, hand[2]], 0.7, 0.7, m('#8a5a32'));
      s.sphere([hand[0] - 0.5, hand[1] + 9, hand[2]], 1.6, m(c3, { glow: true }));
      frontEyes(b, h, 0.45, 0.12, 'rond', 0.28);
      break;
    }
    case 29: {
      // Sasabois : le Sasabonsam, voûté, ailes de chauve-souris et pieds en crochet.
      const body = m(c1, { fur: 0.6 });
      const h = humanoid(b, shape({ torsoR: 6, torsoH: 10, hipY: 12, legR: 1.9, armR: 1.6, armLen: 15, headR: 5.5, neck: -0.5, digitigrade: true, footLen: 5 }), { body, hands: m('#2a2420'), feet: m('#2a2420') });
      for (const side of SIDES) batWing(b, [h.chest[0] + 2.5, h.chest[1] + 4, side * 4], side, 20, shade(c1, -0.15), '#5a2a2e', 40);
      for (const side of SIDES) s.cone([h.head[0] + 1, h.head[1] + h.headR * 0.5, side * h.headR * 0.5], [h.head[0] + 3, h.head[1] + h.headR + 4, side * h.headR * 0.9], 1.6, 0.2, body, { k: 0.8 });
      s.cone([h.head[0] - h.headR * 0.6, h.head[1] - h.headR * 0.4, 0], [h.head[0] - h.headR * 1.2, h.head[1] - h.headR * 0.6, 0], h.headR * 0.45, h.headR * 0.3, body, { k: 1 });
      for (const side of SIDES) s.cone([h.head[0] - h.headR * 1.0, h.head[1] - h.headR * 0.85, side * 1.2], [h.head[0] - h.headR * 1.05, h.head[1] - h.headR * 1.25, side * 1.2], 0.5, 0.1, m('#f0e8d8'));
      frontEyes(b, h, 0.4, 0.1, 'lueur', 0.26);
      a.eyeColor = c3;
      break;
    }
    case 45: {
      // Tengaru : tengu corbeau, bec, ailes et habit rouge.
      const feathers = m(c1, { pattern: { kind: 'plumes', color: shade(c1, 0.15), scale: 2.2 } });
      const robe = m(c2, { edge: true, belly: shade(c2, -0.1) });
      const h = humanoid(b, shape({ torsoR: 6.5, torsoH: 10, hipY: 10, legR: 2, armR: 1.8, armLen: 10, headR: 6, footLen: 4 }), { body: robe, legs: m('#e8b040'), arms: robe, hands: m('#e8b040'), feet: m('#e8b040') });
      for (const side of SIDES) featherWing(b, [h.chest[0] + 3, h.chest[1] + 4, side * 4], side, 24, c1, { up: 65, tip: shade(c1, 0.2) });
      s.sphere(h.head, h.headR, feathers);
      s.cone([h.head[0] - h.headR * 0.6, h.head[1] - 0.5, 0], [h.head[0] - h.headR * 1.9, h.head[1] - 2.5, 0], h.headR * 0.42, 0.4, m('#f0c040', { gloss: true }));
      s.ellipsoid([h.head[0] + 0.5, h.head[1] + h.headR * 0.95, 0], [2, 1.5, 2], m('#2a2a2a'));
      s.cone([h.chest[0] - 2, h.chest[1] + 4, 0], [h.chest[0] - 4, h.chest[1] - 4, 0], 1.6, 1.2, m(c3, { edge: true }));
      // Éventail de plumes.
      const hand = h.hands[0];
      for (let i = 0; i < 4; i++) leaf(b, hand, 70 + i * 22, -20, 7, m(c3), 0.25);
      frontEyes(b, h, 0.48, 0.15, 'feroce', 0.26);
      break;
    }
    case 52: {
      // Draugmont : revenant en armure, casque à nasal et yeux de glace.
      const skin = m(c1, { pattern: { kind: 'craquelures', color: shade(c1, -0.25), scale: 3 } });
      const mail = m(c2, { pattern: { kind: 'ecailles', color: shade(c2, -0.3), scale: 1.4, amount: 0.25 } });
      const p = shape({ torsoR: 7.5, torsoH: 11, hipY: 12, legR: 2.8, armR: 2.4, armLen: 13, headR: 5.5, neck: 0 });
      const h = humanoid(b, p, { body: mail, legs: mail, arms: skin, hands: skin, feet: m('#3a3028') });
      s.sphere(h.head, h.headR, skin);
      const iron = m('#8a9098', { gloss: true, edge: true });
      // Casque : calotte haute, le visage reste visible dessous.
      s.ellipsoid([h.head[0] + 0.6, h.head[1] + h.headR * 0.45, 0], [h.headR * 1.08, h.headR * 0.72, h.headR * 1.1], iron);
      s.cone([h.head[0] + 0.6, h.head[1] + h.headR * 0.9, 0], [h.head[0] + 1, h.head[1] + h.headR * 1.5, 0], 1.2, 0.3, iron);
      s.box([h.head[0] - h.headR * 0.98, h.head[1] - 0.2, 0], [0.5, 2.2, 0.6], 0.3, iron);
      // Barbe hirsute du revenant.
      s.cone([h.head[0] - h.headR * 0.6, h.head[1] - h.headR * 0.5, 0], [h.head[0] - 1, h.head[1] - h.headR * 1.7, 0], h.headR * 0.65, 1, m('#a8a090', { fur: 1 }), { amp: 0.7, freq: 0.7, stretch: 2 });
      for (const sh of h.shoulders) s.sphere([sh[0], sh[1] + 1, sh[2]], p.armR * 1.35, iron);
      s.ellipsoid([h.chest[0] - 1, h.chest[1] - 6, 0], [p.torsoR * 0.85, 4, p.torsoR * 1.05], m('#5a4a3a', { edge: true }));
      // Bouclier rond.
      const hand = h.hands[0];
      s.ellipsoid([hand[0] - 1, hand[1] + 2, hand[2] + 2], [5.5, 5.5, 1], m('#7a5a3a', { edge: true, pattern: { kind: 'rayures', color: '#5a3a22', scale: 2.4, amount: 0.15, axis: 0 } }), { rot: [0, -25, 0] });
      s.sphere([hand[0] - 1.5, hand[1] + 2, hand[2] + 3.2], 1.4, iron);
      frontEyes(b, h, 0.38, -0.05, 'lueur', 0.26);
      a.eyeColor = c3;
      break;
    }
    case 69: {
      // Lechivert : seigneur des bois, écorce, bois de cerf et barbe de mousse.
      const bark = m(c2, { pattern: { kind: 'rayures', color: shade(c2, -0.3), scale: 1.6, amount: 0.3, axis: 0 } });
      const moss = m(c1, { fur: 1 });
      const p = shape({ torsoR: 6.5, torsoH: 12, hipY: 13, legR: 2.4, armR: 1.9, armLen: 14, headR: 5.5, neck: 0.5 });
      const h = humanoid(b, p, { body: bark, hands: m(shade(c2, -0.2)) });
      s.cone([h.head[0] - h.headR * 0.5, h.head[1] - 1, 0], [h.head[0] - 1, h.head[1] - h.headR * 2.4, 0], h.headR * 0.9, 1.2, moss, { amp: 1.1, freq: 0.6, stretch: 2.5 });
      s.ellipsoid([h.chest[0], h.chest[1] + 4, 0], [p.torsoR * 0.9, 3, p.torsoR * 1.15], moss, { amp: 1, freq: 0.6 });
      const antler = hornMat(b, '#d8c8a0', false);
      for (const side of SIDES) {
        const base: V3 = [h.head[0] + 0.5, h.head[1] + h.headR * 0.7, side * h.headR * 0.5];
        horn(b, base, side, [[1, 4, 2], [3, 9, 4], [5, 14, 5]], [1.1, 0.9, 0.6, 0.2], antler);
        horn(b, [base[0] + 1.6, base[1] + 6, base[2] + side * 2.2], side, [[-2.5, 3.5, 0.5]], [0.6, 0.2], antler);
        horn(b, [base[0] + 3.2, base[1] + 10, base[2] + side * 3.5], side, [[-2, 3.5, 0]], [0.5, 0.2], antler);
      }
      leafTuft(b, [h.head[0] + 1, h.head[1] + h.headR * 0.7, 0], 5, 3, '#8ac848');
      for (const sh of h.shoulders) leafTuft(b, [sh[0], sh[1] + 1.5, sh[2]], 4, 2, '#5aa83a');
      frontEyes(b, h, 0.42, 0.1, 'lueur', 0.24);
      a.eyeColor = c3;
      break;
    }
    case 72:
    case 73: {
      // Mandragorin et Mandracri : racines vivantes.
      const big = id === 73;
      const root = m(c1, { pattern: { kind: 'rayures', color: shade(c1, -0.22), scale: 2.2, amount: 0.18, axis: 1 } });
      const r = big ? 8.5 : 7;
      const body: V3 = [0, r + (big ? 6 : 4.5), 0];
      s.ellipsoid(body, [r * 0.95, r * 1.15, r * 0.95], root);
      s.cone([body[0], body[1] + r * 0.6, 0], [body[0] + 0.5, body[1] + r * 1.4, 0], r * 0.5, r * 0.25, root, { k: 2 });
      for (const side of SIDES) {
        s.tube([[body[0], body[1] - r * 0.7, side * r * 0.4], [body[0] - 1, (big ? 4 : 3), side * r * 0.6], [body[0] - 3, 0.8, side * r * 0.7]], [r * 0.32, r * 0.2, r * 0.12], root, { k: 2 });
        s.tube([[body[0], body[1], side * r * 0.8], [body[0] - 2, body[1] - 1 + (big ? 6 : 0), side * (r + 3)], [body[0] - 4, body[1] + (big ? 9 : -2), side * (r + 4)]], [r * 0.2, r * 0.14, r * 0.08], root, { k: 1.5 });
      }
      const top: V3 = [body[0] + 0.5, body[1] + r * 1.35, 0];
      leafTuft(b, top, big ? 9 : 7, big ? 5 : 3, big ? c2 : c3);
      a.eyes = SIDES.map((side): V3 => [body[0] - r * 0.85, body[1] + r * 0.25, side * r * 0.36]);
      a.eyeR = r * 0.24;
      a.eyeKind = big || has('yeux') ? 'lueur' : 'rond';
      a.eyeColor = c3;
      if (big) {
        s.paint([body[0] - r * 0.9, body[1] - r * 0.35, 0], [2, 2.6, 2], m('#2a1018'));
      } else {
        a.mouth = [[body[0] - r * 0.92, body[1] - r * 0.25, -1], [body[0] - r * 0.92, body[1] - r * 0.25, 1.5]];
      }
      break;
    }
    default: {
      const body = m(c1, { belly: shade(c1, 0.3) });
      const h = humanoid(b, BIPED_DEFAULT, { body });
      frontEyes(b, h);
    }
  }
  a.eyeColor = a.eyeColor ?? c3;
}

// ── Esprits ──────────────────────────────────────────────────────────────

function esprit(b: Build): void {
  const { s, a, m, id, has } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  switch (id) {
    case 27: {
      // Kontomblin : petit génie de la brousse, chapeau de feuilles, pieds retournés.
      const skin = m(c1, { belly: shade(c1, 0.3) });
      const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 4.5, torsoH: 6, hipY: 9, legR: 1.6, armR: 1.3, armLen: 7, headR: 7, neck: -1, footLen: 3.5 }, { body: skin, legs: skin, feet: skin });
      s.ellipsoid([0, 10, 0], [4.6, 2.5, 4.8], m(c2, { edge: true }));
      const hat = leafMat(b, '#5aa83a');
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * 360;
        leaf(b, [h.head[0] + 0.5, h.head[1] + h.headR * 0.6, 0], 25, ang, 8, hat, 0.4);
      }
      s.cone([h.head[0] + 0.5, h.head[1] + h.headR * 0.6, 0], [h.head[0] + 1, h.head[1] + h.headR + 3, 0], 1.2, 0.4, m('#7a5a3a'));
      for (const side of SIDES) s.cone([h.head[0], h.head[1], side * h.headR * 0.8], [h.head[0] + 2.5, h.head[1] + 1.5, side * (h.headR + 3)], 1.6, 0.3, skin, { k: 1 });
      frontEyes(b, h, 0.42, 0.05, 'rond', 0.3);
      a.mouth = [[h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 0.4, -1.5], [h.head[0] - h.headR * 0.85, h.head[1] - h.headR * 0.45, 1.5]];
      break;
    }
    case 37: {
      // Mamiwa : Mami Wata, queue de poisson lovée, chevelure, bijoux d'or et serpent.
      const skin = m('#8a5434', { belly: '#a86a44' });
      const tail = m(c1, { pattern: { kind: 'ecailles', color: shade(c1, -0.25), scale: 1.6 }, belly: shade(c1, 0.4) });
      const fin = m(c3, { pattern: { kind: 'rayures', color: shade(c3, -0.25), scale: 1.5, amount: 0.3, axis: 0 } });
      s.tube([[0, 14, 0], [1.5, 7, 0], [6, 3, 0.5], [12, 3, 0], [16, 7, -1]], [4.6, 4.8, 3.6, 2.2, 1.2], tail, { k: 2 });
      for (const side of SIDES) leaf(b, [16, 7, -1], 60 + side * 32, 0, 7, fin, 0.5);
      const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 4.8, torsoH: 7.5, hipY: 14, legR: 0.01, armR: 1.4, armLen: 8, headR: 6.4, neck: -0.3, footLen: 0.01, armsUp: 0.25 }, { body: skin, legs: tail, feet: tail });
      const hair = m(c2, { fur: 0.9 });
      s.ellipsoid([h.head[0] + 1.2, h.head[1] + 1, 0], [h.headR * 1.0, h.headR * 1.05, h.headR * 1.1], hair, { amp: 0.6, freq: 0.6 });
      s.cone([h.head[0] + 3, h.head[1] - 1, 0], [h.head[0] + 6, h.head[1] - 13, 0], h.headR * 0.95, 2.8, hair, { k: 2, amp: 1, freq: 0.6, stretch: 2.5 });
      s.sphere([h.head[0] - 0.9, h.head[1] - 0.5, 0], h.headR * 0.88, skin);
      const gold = m('#f0c040', { gloss: true });
      s.cone([h.chest[0] - 1, h.chest[1] + 3.8, -4], [h.chest[0] - 1, h.chest[1] + 3.8, 4], 0.7, 0.7, gold);
      s.sphere([h.chest[0] - 4.2, h.chest[1] + 2.5, 0], 1, gold);
      for (const hand of h.hands) s.sphere([hand[0] + 0.6, hand[1] + 1.5, hand[2]], 1, gold);
      const snake = m('#58b048', { pattern: { kind: 'taches', color: '#f0d848', scale: 1.4, amount: 0.3 } });
      s.tube([[h.chest[0] + 2, h.chest[1] + 4, -5.5], [h.chest[0] - 1, h.chest[1] + 6, -2], [h.chest[0] - 1, h.chest[1] + 6, 2.5], [h.chest[0] + 1, h.chest[1] + 4.5, 5.5], [h.chest[0] - 2, h.chest[1] + 7, 7.5]], [0.9, 1.1, 1.1, 1.1, 1.3], snake);
      s.ellipsoid([h.chest[0] - 3.2, h.chest[1] + 7.6, 7.8], [2, 1.2, 1.3], snake);
      frontEyes(b, h, 0.4, 0.05, 'doux', 0.27);
      a.eyeColor = '#5a3020';
      a.mouth = [[h.head[0] - h.headR * 0.85, h.head[1] - h.headR * 0.42, -1], [h.head[0] - h.headR * 0.82, h.head[1] - h.headR * 0.45, 1.2]];
      break;
    }
    case 47:
    case 48: {
      // Feufolet et Fol-Ardent : feux follets.
      const big = id === 48;
      const r = big ? 9 : 7.5;
      const c: V3 = [0, r + 5, 0];
      const core = m(c1, { glow: true });
      s.sphere(c, r, core, { amp: 0.6, freq: 0.5 });
      s.cone([c[0] + 1, c[1] + r * 0.2, 0], [c[0] + 4, c[1] + r * 2.2, 0], r * 0.85, 0.2, core, { k: 3, amp: r * 0.18, freq: 0.5, stretch: 2.5 });
      for (const side of SIDES) s.cone([c[0], c[1] - r * 0.4, side * r * 0.4], [c[0] + 7, c[1] - r * 0.9, side * (r + 1)], r * 0.35, 0.2, core, { k: 2, amp: 0.7, freq: 0.6 });
      if (big) {
        const ember = m(c2, { glow: true });
        for (let i = 0; i < 3; i++) {
          const ang = rad(40 + i * 120);
          s.sphere([c[0] + Math.cos(ang) * (r + 6), c[1] + Math.sin(ang) * 6, Math.sin(ang) * (r + 4)], 2, ember, { amp: 0.4, freq: 0.8 });
        }
      }
      a.eyes = SIDES.map((side): V3 => [c[0] - r * 0.85, c[1] + r * 0.05, side * r * 0.32]);
      a.eyeR = r * 0.26;
      a.eyeKind = 'perle';
      a.mouth = [[c[0] - r * 0.9, c[1] - r * 0.38, -1.5], [c[0] - r * 0.92, c[1] - r * 0.42, 0], [c[0] - r * 0.9, c[1] - r * 0.38, 1.5]];
      a.mouthColor = '#1c1018';
      break;
    }
    case 51: {
      // Banshéa : dame blanche en robe vaporeuse, cheveux au vent, mains au visage.
      const gown = m(c1, { belly: shade(c1, -0.12) });
      s.cone([0, 21, 0], [2.5, 4, 0], 4.5, 8, gown, { amp: 0.9, freq: 0.32, stretch: 2.4 });
      for (const side of SIDES) s.cone([3, 5, side * 3], [13, 1.5, side * 5], 3, 0.4, gown, { k: 2, amp: 0.7, freq: 0.5 });
      const face = m(shade(c1, 0.35));
      const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 4.6, torsoH: 7, hipY: 17, legR: 0.01, armR: 1.3, armLen: 9, headR: 5.8, neck: 0, footLen: 0.01, armsUp: 0.8 }, { body: gown, legs: gown, feet: gown, hands: face });
      const hair = m(c2, { fur: 1 });
      s.ellipsoid([h.head[0] + 1, h.head[1] + 1, 0], [h.headR * 1.0, h.headR * 1.0, h.headR * 1.1], hair, { amp: 0.6, freq: 0.6 });
      s.cone([h.head[0] + 2, h.head[1] + 1, 0], [h.head[0] + 12, h.head[1] - 10, 0], h.headR * 1.0, 2, hair, { k: 2, amp: 1.2, freq: 0.5, stretch: 2.2 });
      s.sphere([h.head[0] - 0.9, h.head[1] - 0.6, 0], h.headR * 0.86, face);
      s.paint([h.head[0] - h.headR * 0.82, h.head[1] - h.headR * 0.45, 0], [1.3, 1.9, 1.3], m('#2a1828'));
      frontEyes(b, h, 0.38, 0.1, 'lueur', 0.25);
      a.eyeColor = c3;
      break;
    }
    default: {
      const body = m(c1, { glow: has('flamme') });
      s.sphere([0, 14, 0], 9, body);
      a.eyes = SIDES.map((side): V3 => [-8, 15, side * 3]);
      a.eyeR = 2.4;
    }
  }
}

// ── Lézards et dragons ───────────────────────────────────────────────────

interface Saurian {
  head: V3;
  headR: number;
  body: V3;
  len: number;
  girth: number;
  shoulder: V3;
}

function saurian(
  b: Build,
  p: { len: number; girth: number; legLen: number; legR: number; headR: number; snout: number; neck: number; neckAngle: number; tail: number; upright?: number },
  mats: { body: number; head?: number; claws?: number },
): Saurian {
  const { s } = b;
  const by = p.legLen + p.girth * 0.55;
  const up = p.upright ?? 0;
  const body: V3 = [0, by, 0];
  s.ellipsoid([-p.len * 0.35, by + up * 0.5, 0], [p.len * 0.55, p.girth * (1 + up * 0.04), p.girth * 1.05], mats.body);
  s.ellipsoid([p.len * 0.35, by - 0.3, 0], [p.len * 0.55, p.girth * 0.92, p.girth * 0.98], mats.body, { k: 4 });
  // Queue effilée qui traîne au sol.
  const t0: V3 = [p.len * 0.8, by - 0.5, 0];
  s.tube([t0, [t0[0] + p.tail * 0.4, by * 0.55, -1.5], [t0[0] + p.tail * 0.8, 1.8, -3.5], [t0[0] + p.tail * 1.05, 1.4, -1]], [p.girth * 0.75, p.girth * 0.45, p.girth * 0.22, 0.3], mats.body, { k: 3 });
  // Pattes écartées, coudes vers l'extérieur.
  for (const [x, back] of [[-p.len * 0.55, false], [p.len * 0.5, true]] as const) {
    for (const side of SIDES) {
      const z = side * p.girth * 0.7;
      const hip: V3 = [x, by - p.girth * 0.2, z];
      const knee: V3 = [x + (back ? 1.5 : -1), p.legLen * 0.75, z + side * p.legR * 1.6];
      const foot: V3 = [x + (back ? 0.5 : -2) + (side > 0 ? -1 : 1), 1.1, z + side * p.legR * 1.4];
      s.cone(hip, knee, p.legR * 1.5, p.legR, mats.body, { k: 2.5 });
      s.cone(knee, foot, p.legR, p.legR * 0.8, mats.body, { k: 1 });
      s.ellipsoid([foot[0] - 1.2, 0.9, foot[2]], [p.legR * 1.3, 1, p.legR * 1.1], mats.body, { k: 1 });
      if (mats.claws !== undefined) for (const dz of [-0.8, 0.8]) s.cone([foot[0] - 2, 0.9, foot[2] + dz], [foot[0] - 3.4, 0.4, foot[2] + dz * 1.3], 0.45, 0.15, mats.claws);
    }
  }
  const ang = rad(p.neckAngle);
  const shoulder: V3 = [-p.len * 0.75, by + p.girth * 0.3 + up, 0];
  const head: V3 = [shoulder[0] - Math.cos(ang) * p.neck, shoulder[1] + Math.sin(ang) * p.neck, 0];
  s.cone(shoulder, head, p.girth * 0.7, p.headR * 0.7, mats.body, { k: 3 });
  const hm = mats.head ?? mats.body;
  s.ellipsoid(head, [p.headR * 1.05, p.headR * 0.85, p.headR * 0.95], hm, { k: 2 });
  const snoutEnd: V3 = [head[0] - p.headR * 0.6 - p.snout, head[1] - p.headR * 0.25, 0];
  s.cone([head[0] - p.headR * 0.3, head[1] - p.headR * 0.1, 0], snoutEnd, p.headR * 0.75, p.headR * 0.45, hm, { k: 1.5 });
  b.a.eyes = SIDES.map((side): V3 => [head[0] - p.headR * 0.5, head[1] + p.headR * 0.35, side * p.headR * 0.62]);
  b.a.eyeR = p.headR * 0.3;
  b.a.mouth = [
    [snoutEnd[0] - p.headR * 0.35, snoutEnd[1] - p.headR * 0.3, p.headR * 0.3],
    [head[0] - p.headR * 0.2, head[1] - p.headR * 0.45, p.headR * 0.75],
  ];
  return { head, headR: p.headR, body, len: p.len, girth: p.girth, shoulder };
}

function lezard(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const big = b.look.size > 0.8;
  const tune: Record<number, Parameters<typeof saurian>[1]> = {
    12: { len: 12, girth: 5, legLen: 4.5, legR: 1.7, headR: 5.5, snout: 3, neck: 4, neckAngle: 35, tail: 16 },
    13: { len: 17, girth: 7.5, legLen: 7, legR: 2.6, headR: 6.5, snout: 4, neck: 6, neckAngle: 30, tail: 18 },
    55: { len: 12, girth: 4.8, legLen: 4, legR: 1.7, headR: 5.8, snout: 2.4, neck: 3, neckAngle: 25, tail: 15 },
    56: { len: 16, girth: 6.5, legLen: 6, legR: 2.4, headR: 6.5, snout: 3, neck: 4, neckAngle: 25, tail: 18 },
    59: { len: 11, girth: 6, legLen: 4.5, legR: 2.2, headR: 5.2, snout: 2.5, neck: 5, neckAngle: 35, tail: 9 },
  };
  const p = tune[id] ?? tune[12];
  const skin =
    id === 55 || id === 56
      ? m(c1, { gloss: true, belly: shade(c3, 0.1), pattern: { kind: 'taches', color: c2, scale: 3, amount: 0.33 } })
      : m(c1, { belly: shade(c1, 0.35), pattern: { kind: 'ecailles', color: shade(c1, -0.2), scale: 1.8 } });
  const headMat = id === 12 ? m(c3, { pattern: { kind: 'ecailles', color: shade(c3, -0.2), scale: 1.6 } }) : skin;
  const g = saurian(b, p, { body: skin, head: headMat, claws: m('#f0e8d8') });
  a.eyeKind = big ? 'feroce' : 'rond';
  a.eyeColor = c3;
  if (has('crete')) {
    const crest = m(id === 12 ? c3 : shade(c3, -0.1), { edge: true });
    spikeRow(b, [g.head[0] + 1, g.head[1] + g.headR * 0.7, 0], [g.len * 0.6, g.body[1] + g.girth * 0.75, 0], big ? 8 : 6, big ? 5 : 3.5, big ? 1.8 : 1.2, crest, 0.5);
  }
  if (has('carapace')) {
    const shell = m(c2, { gloss: true, edge: true, pattern: { kind: 'ecailles', color: shade(c2, -0.3), scale: 3.4, amount: 0.12 } });
    s.ellipsoid([g.body[0] + 0.5, g.body[1] + g.girth * 0.35, 0], [g.len * 0.75, g.girth * 1.0, g.girth * 1.25], shell);
    s.ellipsoid([g.body[0] + 0.5, g.body[1] - g.girth * 0.2, 0], [g.len * 0.78, g.girth * 0.25, g.girth * 1.3], m(shade(c2, 0.2), { edge: true }));
  }
  if (has('epines')) {
    const spike = m(shade(c2, 0.2), { gloss: true });
    spikeRow(b, [-g.len * 0.5, g.body[1] + g.girth * 0.85, g.girth * 0.45], [g.len * 0.6, g.body[1] + g.girth * 0.7, g.girth * 0.45], 4, 3.5, 1.1, spike, 0.3);
    spikeRow(b, [-g.len * 0.5, g.body[1] + g.girth * 0.85, -g.girth * 0.45], [g.len * 0.6, g.body[1] + g.girth * 0.7, -g.girth * 0.45], 4, 3.5, 1.1, spike, 0.3);
  }
  if (has('cornes')) {
    const hm = hornMat(b, '#e8dcc0');
    for (const side of SIDES) horn(b, [g.head[0] + 1, g.head[1] + g.headR * 0.6, side * g.headR * 0.5], side, [[2.5, 2.5, 1], [5.5, 3.5, 1.5]], [1.2, 0.8, 0.2], hm);
  }
  if (has('flamme')) {
    for (let i = 0; i < 3; i++) flame(b, [-g.len * 0.3 + i * g.len * 0.4, g.body[1] + g.girth * 0.9, 0], 6 - i, 2.4, '#ff7a2a', 1);
    flame(b, [g.len * 0.8 + 16, 2.5, -1], 8, 2.6, '#ff8a2a', 1.5);
  }
}

function dragon(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { belly: shade(c3, 0.3), pattern: { kind: 'ecailles', color: shade(c1, -0.2), scale: 2 } });
  if (id === 60) {
    // Tarasquor : la Tarasque, carapace hérissée et tête de lion.
    const g = saurian(b, { len: 16, girth: 8, legLen: 8, legR: 3, headR: 6.5, snout: 2.5, neck: 5, neckAngle: 35, tail: 14 }, { body: skin, claws: m('#f0e8d8') });
    const shell = m(c2, { gloss: true, edge: true, pattern: { kind: 'ecailles', color: shade(c2, -0.3), scale: 4, amount: 0.1 } });
    s.ellipsoid([g.body[0] + 1, g.body[1] + g.girth * 0.45, 0], [g.len * 0.78, g.girth * 1.1, g.girth * 1.3], shell);
    const spike = m(c3, { gloss: true });
    for (const [x, z] of [[-6, 0], [0, 4], [0, -4], [6, 0], [-3, -6], [-3, 6], [4, 7], [4, -7]] as const) {
      const base: V3 = [g.body[0] + x, g.body[1] + g.girth * 1.35 - Math.abs(z) * 0.35 - Math.abs(x) * 0.08, z];
      s.cone(base, [base[0] + 1.5, base[1] + 5, base[2] * 1.2], 1.6, 0.2, spike);
    }
    const mane = m(c2, { fur: 1 });
    s.sphere([g.head[0] + 2.5, g.head[1], 0], g.headR * 1.35, mane, { amp: 1.4, freq: 0.55 });
    s.ellipsoid(g.head, [g.headR * 0.95, g.headR * 0.85, g.headR * 0.95], skin);
    s.cone([g.head[0] - 2, g.head[1] - 1, 0], [g.head[0] - g.headR - 2.5, g.head[1] - 1.5, 0], g.headR * 0.7, g.headR * 0.5, skin, { k: 1.5 });
    a.eyeKind = 'feroce';
    a.eyeColor = c3;
    return;
  }
  // Ninki-Nanka : dragon des marais au long cou, crête et cornes.
  const g = saurian(b, { len: 15, girth: 6.5, legLen: 9, legR: 2.4, headR: 5.5, snout: 4.5, neck: 13, neckAngle: 62, tail: 18, upright: 1.5 }, { body: skin, claws: m('#f0e8d8') });
  if (has('ailes')) for (const side of SIDES) batWing(b, [g.shoulder[0] + 6, g.body[1] + g.girth * 0.8, side * g.girth * 0.6], side, 22, shade(c1, -0.1), shade(c2, 0.35), 45);
  if (has('crete')) {
    const crest = m(c3, { edge: true });
    spikeRow(b, [g.head[0] + 1.5, g.head[1] + g.headR * 0.8, 0], [g.shoulder[0] + 2, g.shoulder[1] + g.girth * 0.6, 0], 6, 3.5, 1.2, crest, 0.5);
    spikeRow(b, [-g.len * 0.4, g.body[1] + g.girth * 0.9, 0], [g.len * 0.7, g.body[1] + g.girth * 0.7, 0], 5, 3, 1.2, crest, 0.5);
  }
  if (has('cornes')) {
    const hm = hornMat(b, '#e8dcc0');
    for (const side of SIDES) horn(b, [g.head[0] + 1, g.head[1] + g.headR * 0.6, side * g.headR * 0.45], side, [[3, 2, 0.8], [6.5, 3.5, 1.2], [8.5, 6, 1.4]], [1.2, 0.9, 0.5, 0.15], hm);
  }
  a.eyeKind = 'feroce';
  a.eyeColor = c3;
}

// ── Serpents et dragons serpentins ───────────────────────────────────────

function serpent(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const lung = has('moustaches');
  const feathered = id === 68;
  const skin = m(c1, {
    belly: lung ? c2 : feathered ? '#e8d870' : shade(c2 === '#2a5a4a' ? c1 : c2, 0.25),
    gloss: !lung && !feathered,
    pattern: feathered ? { kind: 'plumes', color: shade(c1, -0.22), scale: 2.2 } : { kind: 'ecailles', color: shade(c1, -0.2), scale: 1.6 },
  });
  const big = b.look.size;
  const R = 3.2 + big * 1.8;
  let neckTop: V3;
  let headDir: V3;
  if (lung || id === 61 || id === 68) {
    // Corps ondoyant qui flotte, en S dans l'espace.
    a.floating = true;
    const pts: V3[] = [];
    const radii: number[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push([22 - t * 34, 6 + t * 16 + Math.sin(t * Math.PI * 2.2) * 5, Math.cos(t * Math.PI * 2) * 5]);
      radii.push(0.6 + R * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5)));
    }
    s.tube(pts, radii, skin, { k: 1.5 });
    neckTop = pts[n - 1];
    headDir = [-1, 0.25, 0];
    if (lung) {
      // Petites pattes griffues des dragons d'Orient.
      const claw = m(shade(c2, -0.1));
      for (const i of [3, 6]) {
        const p = pts[i];
        for (const side of SIDES) s.tube([[p[0], p[1] - radii[i] * 0.4, p[2] + side * radii[i] * 0.6], [p[0] - 2, p[1] - radii[i] - 2.5, p[2] + side * (radii[i] + 1.5)], [p[0] - 4, p[1] - radii[i] - 3.5, p[2] + side * (radii[i] + 1.5)]], [1.1, 0.8, 0.6], skin, { k: 1 });
        s.sphere([p[0] - 4.3, p[1] - radii[i] - 3.6, p[2] + radii[i] + 1.5], 0.9, claw);
      }
      if (has('criniere')) {
        const mane = m(c3 === '#f0c040' ? '#f0c040' : c2, { fur: 1 });
        for (let i = 2; i < n; i++) s.sphere([pts[i][0], pts[i][1] + radii[i] * 0.85, pts[i][2]], radii[i] * 0.55, mane, { amp: 0.7, freq: 0.6 });
      }
    }
  } else {
    // Serpent lové au sol, buste dressé.
    const coil: V3[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = (i / 14) * Math.PI * 2.4;
      const r = 13 - i * 0.45;
      coil.push([Math.cos(t) * r + 2, R + i * 0.35, Math.sin(t) * r * 0.8]);
    }
    const rise: V3[] = [coil[coil.length - 1], [-4, R + 9, 2], [-5, R + 17, 1], [-8, R + 22, 0]];
    s.tube([...coil, ...rise.slice(1)], [...coil.map((_, i) => R * (0.45 + 0.55 * (i / 14))), R * 1.05, R * 0.95, R * 0.85], skin, { k: 1.5 });
    neckTop = rise[rise.length - 1];
    headDir = [-1, 0.1, 0];
    if (id === 57 || id === 71) {
      // Capuchon de cobra.
      s.ellipsoid([neckTop[0] + 2, neckTop[1] - 4, 0], [R * 0.8, R * 2.2, R * 1.9], skin, { k: 2 });
    }
  }
  const hr = R * 1.25;
  const head: V3 = [neckTop[0] - hr * 0.6, neckTop[1] + hr * 0.25, neckTop[2]];
  s.ellipsoid(head, [hr * 1.2, hr * 0.8, hr * 0.95], skin, { k: 2 });
  const snout: V3 = [head[0] - hr * 1.2, head[1] - hr * 0.1 + headDir[1], head[2]];
  s.cone([head[0] - hr * 0.3, head[1] - hr * 0.05, head[2]], snout, hr * 0.75, hr * 0.5, skin, { k: 1.5 });
  a.eyes = SIDES.map((side): V3 => [head[0] - hr * 0.45, head[1] + hr * 0.42, head[2] + side * hr * 0.6]);
  a.eyeR = hr * 0.3;
  a.eyeKind = big > 0.8 ? 'feroce' : 'rond';
  a.eyeColor = c3;
  a.mouth = [
    [snout[0] - hr * 0.4, snout[1] - hr * 0.3, head[2] + hr * 0.3],
    [head[0] - hr * 0.3, head[1] - hr * 0.42, head[2] + hr * 0.75],
  ];
  if (lung) {
    // Moustaches de dragon et nez épaté.
    const whisk = m(c3 === '#ffffff' ? '#f0e8d0' : c3);
    for (const side of SIDES) s.tube([[snout[0] + 0.5, snout[1], head[2] + side * hr * 0.4], [snout[0] - 1, snout[1] - 2, head[2] + side * (hr + 2)], [snout[0] + 2, snout[1] - 6, head[2] + side * (hr + 4)], [snout[0] + 5, snout[1] - 7, head[2] + side * (hr + 3)]], [0.55, 0.45, 0.35, 0.2], whisk);
    s.sphere([snout[0] - hr * 0.3, snout[1] + hr * 0.3, head[2]], hr * 0.45, skin, { k: 0.8 });
  }
  if (has('cornes')) {
    const hm = hornMat(b, lung ? '#f0e0a0' : '#e8dcc0', !lung);
    for (const side of SIDES) {
      const base: V3 = [head[0] + hr * 0.4, head[1] + hr * 0.6, head[2] + side * hr * 0.45];
      horn(b, base, side, [[2.5, 3, 0.8], [5, 6, 1.2], [8, 7, 1.4]], [1, 0.8, 0.5, 0.15], hm);
      if (lung) horn(b, [base[0] + 3.2, base[1] + 4.5, base[2] + side], side, [[-1, 3, 0.4]], [0.5, 0.15], hm);
    }
  }
  if (has('crete')) {
    const crest = m(id === 68 ? c2 : c3, { edge: true });
    if (id === 68) {
      // Collerette de plumes du serpent à plumes, rouges et vertes en alternance.
      const green = m('#4ac868', { edge: true });
      const base: V3 = [head[0] + hr * 0.9, head[1], head[2]];
      for (let i = 0; i < 9; i++) {
        const th = rad(-100 + i * 25);
        const tip: V3 = [base[0] + 3, base[1] + Math.sin(th + Math.PI / 2) * 8.5, base[2] + Math.cos(th + Math.PI / 2) * 8.5];
        s.cone(base, tip, 1.8, 0.5, i % 2 ? green : crest, { k: 0.3 });
      }
    } else {
      for (let i = 0; i < 3; i++) leaf(b, [head[0] + hr * 0.2 + i * 1.5, head[1] + hr * 0.5, head[2]], 75 - i * 15, 0, 6 - i, crest, 0.4);
    }
  }
  if (has('couronne')) {
    const gold = m('#f0c040', { gloss: true, edge: true });
    const top: V3 = [head[0] + hr * 0.1, head[1] + hr * 0.6, head[2]];
    s.capped([top[0], top[1] - 0.8, top[2]], [top[0], top[1] + 1.2, top[2]], hr * 0.62, hr * 0.7, gold, { round: 0.3 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const p: V3 = [top[0] + Math.cos(ang) * hr * 0.6, top[1] + 1, top[2] + Math.sin(ang) * hr * 0.6];
      s.cone(p, [p[0] + Math.cos(ang) * 0.6, p[1] + 3.2, p[2] + Math.sin(ang) * 0.6], 0.9, 0.25, gold);
    }
    s.sphere([top[0] - hr * 0.65, top[1] + 0.4, top[2]], 1, m(id === 57 ? '#e83a3a' : c3, { gloss: true }));
  }
  if (has('gemme')) s.sphere([head[0] - hr * 0.35, head[1] + hr * 0.7, head[2]], hr * 0.32, m(c3, { gloss: true }));
  if (has('ailes')) {
    const root: V3 = [neckTop[0] + 9, neckTop[1] - 9, 0];
    for (const side of SIDES) {
      if (id === 68) featherWing(b, [root[0], root[1], side * R], side, 18, '#3ab05a', { up: 55, tip: c2, spread: 30 });
      else batWing(b, [root[0] + 1, root[1] + 1, side * R], side, 16, shade(c1, -0.15), shade(c2, -0.1), 62);
    }
  }
  if (has('yeux')) a.eyeKind = 'lueur';
}

// ── Oiseaux ──────────────────────────────────────────────────────────────

function oiseau(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const guinea = id === 14 || id === 15;
  const r = 9 + b.look.size * 2;
  const plumage = m(c1, {
    pattern: has('points') ? { kind: 'taches', color: c2, scale: 1.7, amount: 0.22 } : { kind: 'plumes', color: shade(c1, 0.12), scale: 2.2 },
    belly: has('points') ? undefined : shade(c2, 0.05),
  });
  const legY = guinea ? 6 : 8;
  const body: V3 = [1, legY + r * 0.8, 0];
  // Pattes fines et doigts.
  const legMat = m(guinea ? '#4a4a5a' : '#3a3030');
  for (const side of SIDES) {
    const z = side * r * 0.35;
    s.tube([[body[0] + 1, body[1] - r * 0.4, z], [body[0] + 1.5, legY * 0.5, z], [body[0], 1, z]], [1.2, 0.7, 0.6], legMat, { k: 1 });
    for (const dz of [-1, 0, 1]) s.cone([body[0], 0.7, z], [body[0] - 2.5, 0.5, z + dz * 1.2], 0.5, 0.3, legMat);
  }
  s.ellipsoid(body, [r * 1.05, r * 0.85, r * 0.85], plumage, { rot: [-12, 0, 0] });
  // Queue
  const tail = m(guinea ? c1 : c1 === '#f0f0f0' ? '#d8d8e8' : c1, { pattern: { kind: 'plumes', color: shade(c1, -0.2), scale: 2 } });
  for (const dz of [-1.5, 0, 1.5]) s.ellipsoid([body[0] + r * 1.15, body[1] + (guinea ? -1 : 2), dz], [r * 0.55, 1.6, 1.4], tail, { rot: [guinea ? -25 : 20, dz * 8, 0] });
  // Ailes repliées.
  for (const side of SIDES) {
    const wingCol = id === 22 || id === 23 ? c1 : guinea ? c1 : shade(c1, -0.08);
    const wing = m(wingCol, { pattern: has('points') ? { kind: 'taches', color: c2, scale: 1.6, amount: 0.24 } : { kind: 'plumes', color: shade(wingCol, -0.25), scale: 2 }, edge: true });
    s.ellipsoid([body[0] + 2, body[1] + 1, side * r * 0.75], [r * 0.85, r * 0.55, 1.6], wing, { rot: [-15, side * -10, 0] });
    if (id === 22 || id === 23 || id === 40) s.paint([body[0] + r * 0.7, body[1] + 1, side * r * 0.8], [r * 0.4, r * 0.5, 2.5], m(c2), [-15, 0, 0]);
  }
  // Tête
  const head: V3 = [body[0] - r * 0.85, body[1] + r * 0.85, 0];
  const hr = r * (guinea ? 0.48 : 0.55);
  const headMat = guinea ? m(c3, { gloss: true }) : plumage;
  s.cone([body[0] - r * 0.5, body[1] + r * 0.3, 0], head, r * 0.55, hr * 0.7, guinea ? m(c1) : plumage, { k: 2 });
  s.sphere(head, hr, headMat, { k: 1.5 });
  const beakCol = id === 23 ? c3 : id === 22 ? c3 : guinea ? '#e8d8b0' : c3;
  const beak = m(beakCol, { gloss: true, edge: true });
  const beakLen = id === 22 || id === 23 ? hr * 2.2 : hr * 1.1;
  const tip: V3 = [head[0] - hr * 0.7 - beakLen, head[1] - hr * (id === 22 || id === 23 ? 1 : 0.4), 0];
  s.cone([head[0] - hr * 0.6, head[1] - hr * 0.1, 0], tip, hr * (id === 22 || id === 23 ? 0.55 : 0.4), 0.3, beak);
  if (has('casque')) {
    // Casque du calao au-dessus du bec.
    s.ellipsoid([head[0] - hr * 1.2, head[1] + hr * 0.45, 0], [hr * 1.0, hr * 0.42, hr * 0.32], beak, { rot: [-15, 0, 0] });
    if (id === 22 || id === 23) s.ellipsoid([head[0] - hr * 0.2, head[1] - hr * 0.9, 0], [hr * 0.45, hr * 0.5, hr * 0.4], m('#d83a3a'), { k: 0.5 });
  }
  if (guinea) {
    // Casque osseux et barbillons rouges de la pintade.
    s.cone([head[0] + 0.5, head[1] + hr * 0.7, 0], [head[0] + 1.5, head[1] + hr * (id === 15 ? 2.2 : 1.5), 0], hr * 0.35, hr * 0.2, m(id === 15 ? c3 : '#c8a070', { gloss: true }));
    for (const side of SIDES) s.ellipsoid([head[0] - hr * 0.5, head[1] - hr * 0.6, side * hr * 0.4], [0.9, 1.4, 0.7], m('#d83a3a'));
  }
  if (has('crete') && !guinea) {
    const crest = m(c3, { edge: true });
    for (let i = 0; i < 4; i++) leaf(b, [head[0] + hr * 0.3, head[1] + hr * 0.6, 0], 70 + i * 22, 0, 7 - i, crest, 0.3);
  }
  if (has('eclairs')) {
    const bolt = m('#ffe040', { glow: true });
    for (const [x, y, z] of [[-14, 30, 4], [16, 26, -3]] as const) {
      s.tube([[x, y, z], [x + 2, y - 4, z], [x - 1, y - 6, z], [x + 1.5, y - 11, z]], [0.9, 0.9, 0.9, 0.3], bolt);
    }
  }
  a.eyes = SIDES.map((side): V3 => [head[0] - hr * 0.45, head[1] + hr * 0.2, side * hr * 0.78]);
  a.eyeR = hr * 0.32;
  a.eyeKind = id === 40 || id === 23 ? 'feroce' : 'perle';
}

// ── Insectes et araignées ────────────────────────────────────────────────

function jointedLeg(b: Build, hip: V3, side: Side, reach: number, height: number, r: number, mat: number, back = 0): void {
  const knee: V3 = [hip[0] + back * 0.5, hip[1] + height * 0.45, hip[2] + side * reach * 0.6];
  const foot: V3 = [hip[0] + back, 0.6, hip[2] + side * reach];
  b.s.cone(hip, knee, r, r * 0.8, mat, { k: 0.5 });
  b.s.cone(knee, foot, r * 0.8, r * 0.45, mat, { k: 0.3 });
}

function insecte(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const chitin = m(c1, { gloss: true, belly: shade(c1, 0.25) });
  const segs = m(c1, { gloss: true, pattern: { kind: 'rayures', color: shade(c1, -0.22), scale: 2.6, amount: 0.25, axis: 0 } });
  const legMat = m(shade(c1, -0.3));
  const hopper = id === 16 || id === 17;
  const firefly = id === 26;
  const beetle = id === 65;
  const lift = firefly ? 6 : 0;
  a.floating = firefly;
  const hy = (hopper ? 7 : 6) + lift;
  // Abdomen, thorax, tête.
  const abd: V3 = [beetle ? 4 : 9, hy + (beetle ? 2 : 1), 0];
  const thx: V3 = [-1, hy + 2, 0];
  const hd: V3 = [beetle ? -9 : -8, hy + (hopper ? 5 : 3), 0];
  const hr = id === 10 || id === 11 ? 6 : beetle ? 4.5 : 5;
  if (!beetle) s.ellipsoid(abd, [8.5, 5.2, 5.4], firefly ? m(c3, { glow: true }) : segs, { rot: [hopper ? 8 : -6, 0, 0] });
  s.ellipsoid(thx, [4.2, 4.2, 4.2], chitin, { k: 1 });
  s.sphere(hd, hr, id === 11 ? m(c2, { gloss: true, edge: true }) : chitin, { k: 1 });
  // Pattes : trois paires, la dernière très longue chez les criquets.
  for (const side of SIDES) {
    jointedLeg(b, [thx[0] - 2.5, thx[1] - 1.5, side * 2], side, 5.5, 5, 0.9, legMat, -2.5);
    jointedLeg(b, [thx[0], thx[1] - 2, side * 2.3], side, 6.5, 5, 0.9, legMat, 0);
    if (hopper) {
      const hip: V3 = [thx[0] + 3, thx[1] - 1, side * 3];
      const knee: V3 = [thx[0] + 9, hy + 9, side * 5.5];
      s.cone(hip, knee, 2, 1.2, chitin, { k: 0.5 });
      s.cone(knee, [thx[0] + 13, 0.8, side * 5.5], 0.9, 0.5, legMat);
    } else jointedLeg(b, [thx[0] + 2.5, thx[1] - 1.5, side * 2.3], side, 6, 5, 0.9, legMat, 3);
  }
  if (beetle) {
    // Élytres bombés et corne de scarabée.
    const shell = m(c1, { gloss: true, edge: true });
    for (const side of SIDES) s.ellipsoid([abd[0], abd[1] + 2, side * 3.2], [10, 6.5, 3.6], shell, { rot: [-4, 0, 0] });
    s.cone([hd[0] - 2, hd[1] + 2, 0], [hd[0] - 5, hd[1] + 8, 0], 1.6, 0.3, m(c3, { gloss: true }));
    s.cone([hd[0] - 3.5, hd[1] - 1, 0], [hd[0] - 7.5, hd[1] - 1.5, 0], 1.5, 0.6, m(c2, { gloss: true }), { k: 0.5 });
  }
  // Mandibules
  if (id === 10 || id === 11) {
    const jaw = m(id === 11 ? '#5a2a1a' : shade(c2, -0.1), { gloss: true });
    for (const side of SIDES) s.tube([[hd[0] - hr * 0.7, hd[1] - hr * 0.5, side * 1.6], [hd[0] - hr * 1.3, hd[1] - hr * 0.6, side * 2.2], [hd[0] - hr * 1.7, hd[1] - hr * 0.5, side * 0.6]], [1, 0.8, 0.25], jaw);
  }
  if (has('antennes') || firefly) {
    const ant = m(shade(c1, -0.35));
    for (const side of SIDES) {
      const long = hopper ? 1.6 : 1;
      s.tube([[hd[0] - hr * 0.3, hd[1] + hr * 0.7, side * 1.4], [hd[0] - 2, hd[1] + hr + 4 * long, side * 3], [hd[0] + 2 * long, hd[1] + hr + 8 * long, side * 4.5]], [0.5, 0.4, 0.3], ant);
      if (!hopper) s.sphere([hd[0] + 2, hd[1] + hr + 8, side * 4.5], 0.8, ant);
    }
  }
  if (has('ailes')) {
    const wing = m(id === 17 ? c2 : '#d8ecf8', { edge: true, pattern: { kind: 'craquelures', color: id === 17 ? shade(c2, -0.3) : '#a0c0e0', scale: 2.4 } });
    for (const side of SIDES) {
      if (firefly) s.ellipsoid([thx[0] + 4, thx[1] + 8, side * 5], [7, 2.8, 0.5], wing, { rot: [35, side * -20, side * 30] });
      else s.ellipsoid([abd[0] + 1, abd[1] + 4, side * 3.2], [11, 2.6, 0.6], wing, { rot: [-6, 0, side * 20] });
    }
  }
  if (id === 11) s.paint([hd[0] - 1, hd[1] + 2, 0], [hr, hr * 0.7, hr * 1.1], m(c2, { gloss: true, edge: true }));
  a.eyes = SIDES.map((side): V3 => [hd[0] - hr * 0.55, hd[1] + hr * 0.25, side * hr * 0.65]);
  a.eyeR = hr * 0.32;
  a.eyeKind = id === 11 ? 'feroce' : 'rond';
}

function araignee(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const big = id === 25;
  const body = m(c1, { fur: 0.4, belly: shade(c1, -0.1) });
  const abdMat = m(c1, { fur: 0.3, pattern: { kind: 'rayures', color: c2, scale: 3.2, amount: 0.25, axis: 0 } });
  const legMat = m(shade(c1, -0.1), { pattern: { kind: 'rayures', color: c2, scale: 2.4, amount: 0.25, axis: 1 } });
  const ceph: V3 = [-4, 9, 0];
  s.ellipsoid([8, 12, 0], [9.5, 8.5, 8.5], abdMat);
  s.ellipsoid(ceph, [6, 5, 5.5], body, { k: 1.5 });
  for (const side of SIDES) {
    for (let i = 0; i < 4; i++) {
      const hip: V3 = [ceph[0] - 3 + i * 2.2, ceph[1] - 1, side * 3.5];
      const ang = rad(-50 + i * 33);
      const reach = 13 - Math.abs(i - 1.5) * 1.5;
      const knee: V3 = [hip[0] + Math.sin(ang) * reach * 0.5, ceph[1] + 8, side * (6 + Math.cos(ang) * reach * 0.45)];
      const foot: V3 = [hip[0] + Math.sin(ang) * reach * 1.1, 0.6, side * (5 + Math.cos(ang) * reach * 0.85)];
      s.cone(hip, knee, 1.4, 1.1, legMat, { k: 0.5 });
      s.cone(knee, foot, 1.1, 0.5, legMat);
    }
  }
  s.cone([ceph[0] - 5, ceph[1] - 2, 1.2], [ceph[0] - 7, ceph[1] - 4.5, 0.8], 1, 0.4, m(shade(c2, -0.2), { gloss: true }));
  s.cone([ceph[0] - 5, ceph[1] - 2, -1.2], [ceph[0] - 7, ceph[1] - 4.5, -0.8], 1, 0.4, m(shade(c2, -0.2), { gloss: true }));
  if (big) {
    // Anansage, le conteur : petit chapeau de feutre.
    const hat = m(c2, { edge: true });
    s.cone([ceph[0] + 0.5, ceph[1] + 4.2, 0], [ceph[0] + 0.5, ceph[1] + 4.6, 0], 5, 5, hat);
    s.cone([ceph[0] + 0.5, ceph[1] + 4.5, 0], [ceph[0] + 1, ceph[1] + 9, 0], 3.2, 2.6, hat, { k: 0.5 });
    s.paint([ceph[0] + 0.6, ceph[1] + 5.6, 0], [3.5, 0.8, 3.5], m(c3));
  }
  a.eyes = SIDES.map((side): V3 => [ceph[0] - 5.2, ceph[1] + 1.2, side * 2.2]);
  a.eyeR = 1.6;
  a.eyeKind = has('yeux') ? 'lueur' : 'rond';
  a.eyeColor = c3;
}

// ── Amphibiens ───────────────────────────────────────────────────────────

function amphibien(b: Build): void {
  const { s, has, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { gloss: true, belly: id === 43 || id === 44 ? '#c8d878' : shade(c3, 0.1) });
  const fin = m(c3 === '#f0f0a0' ? '#a8e0f0' : shade(c3, -0.1), { pattern: { kind: 'rayures', color: shade(c2, 0.2), scale: 1.6, amount: 0.25, axis: 0 } });
  if (id === 4) {
    // Têtuanom : têtard à grosse tête.
    const hd: V3 = [-3, 9, 0];
    s.ellipsoid(hd, [9, 8, 8], skin);
    s.tube([[4, 9, 0], [12, 10, 0], [20, 13, 0]], [5, 3, 0.8], skin, { k: 3 });
    s.ellipsoid([14, 11, 0], [8, 5.5, 0.8], fin, { rot: [12, 0, 0], k: 1 });
    for (const side of SIDES) leaf(b, [0, 5, side * 6], -40, side * 40, 6, fin, 0.45);
    s.paint([-6, 4.5, 0], [6, 3, 6.5], m(shade(c3, -0.05)));
    a.eyes = SIDES.map((side): V3 => [-9.5, 11.5, side * 4.2]);
    a.eyeR = 2.6;
    a.eyeKind = 'rond';
    a.mouth = [[-11.5, 7, -2], [-12, 6.6, 0], [-11.5, 7, 2]];
    return;
  }
  const kappa = id === 43 || id === 44;
  const big = b.look.size > 0.8;
  if (kappa) {
    // Kappa : posture accroupie, carapace, bec et assiette d'eau sur la tête.
    const h = humanoid(
      b,
      { ...BIPED_DEFAULT, torsoR: big ? 7 : 5.5, torsoH: big ? 9 : 7, hipY: big ? 9 : 7, legR: big ? 2.6 : 2, armR: big ? 2.2 : 1.6, armLen: big ? 10 : 8, headR: big ? 6 : 6.5, neck: -0.5, footLen: 4.5 },
      { body: skin },
    );
    const shell = m(c2, { gloss: true, edge: true, pattern: { kind: 'ecailles', color: shade(c2, -0.3), scale: 3.2, amount: 0.12 } });
    s.ellipsoid([h.chest[0] + 4.5, h.chest[1], 0], [4.5, (big ? 9 : 7.5), (big ? 8 : 6.5)], shell);
    if (has('epines')) for (const [y, z] of [[3, 0], [-1, 4], [-1, -4], [-5, 0]] as const) s.cone([h.chest[0] + 8, h.chest[1] + y, z], [h.chest[0] + 12, h.chest[1] + y + 1, z * 1.3], 1.6, 0.2, m('#9a8a7a', { gloss: true }));
    s.cone([h.head[0] - h.headR * 0.6, h.head[1] - 1, 0], [h.head[0] - h.headR * 1.4, h.head[1] - 2, 0], h.headR * 0.5, h.headR * 0.25, m('#e8c040', { gloss: true }));
    const hair = m('#3a5a3a', { fur: 1 });
    s.ellipsoid([h.head[0] + 0.8, h.head[1] + h.headR * 0.72, 0], [h.headR * 1.0, h.headR * 0.38, h.headR * 1.02], hair, { amp: 0.7, freq: 0.7 });
    s.cone([h.head[0] + 0.5, h.head[1] + h.headR * 0.85, 0], [h.head[0] + 0.5, h.head[1] + h.headR * 0.95, 0], h.headR * 0.62, h.headR * 0.62, m('#e8f0f0', { gloss: true }));
    s.paint([h.head[0] + 0.5, h.head[1] + h.headR * 0.98, 0], [h.headR * 0.45, 0.4, h.headR * 0.45], m('#7ab8e8', { gloss: true }));
    frontEyes(b, h, 0.45, 0.05, big ? 'feroce' : 'rond', 0.28);
    return;
  }
  // Nommo : amphibien primordial, queue de poisson et nageoires-crêtes.
  const r = big ? 10 : 8;
  const body: V3 = [1, r * 0.9, 0];
  s.ellipsoid(body, [r * 1.1, r * 0.85, r * 0.95], skin);
  const hd: V3 = [body[0] - r * 0.75, body[1] + r * 0.85, 0];
  s.ellipsoid(hd, [r * 0.75, r * 0.6, r * 0.8], skin, { k: 3 });
  for (const side of SIDES) {
    // Pattes de grenouille repliées.
    s.ellipsoid([body[0] + r * 0.5, r * 0.45, side * r * 0.8], [r * 0.6, r * 0.42, r * 0.38], skin, { k: 2 });
    s.ellipsoid([body[0] + r * 0.1, 1, side * r * 0.95], [r * 0.5, 1, r * 0.3], skin, { k: 1 });
    s.cone([body[0] - r * 0.6, body[1] - r * 0.2, side * r * 0.6], [body[0] - r * 0.9, 1.2, side * r * 0.75], r * 0.24, r * 0.2, skin, { k: 2 });
    s.ellipsoid([body[0] - r * 1.05, 0.9, side * r * 0.8], [2, 0.9, 1.6], skin, { k: 0.8 });
    // Yeux saillants.
    s.sphere([hd[0] - r * 0.15, hd[1] + r * 0.5, side * r * 0.42], r * 0.3, skin, { k: 1.5 });
  }
  if (has('queue')) s.tube([[body[0] + r * 0.8, body[1], 0], [body[0] + r * 1.6, body[1] + 2, 0], [body[0] + r * 2.2, body[1] + 6, 0]], [r * 0.45, r * 0.3, 0.6], skin, { k: 2 });
  if (has('queue')) leaf(b, [body[0] + r * 2.1, body[1] + 5.5, 0], 70, 0, r * 0.9, fin, 0.5);
  if (has('nageoires')) {
    leaf(b, [hd[0] + r * 0.3, hd[1] + r * 0.5, 0], 70, 0, r * 0.9, fin, 0.5);
    leaf(b, [body[0], body[1] + r * 0.75, 0], 60, 0, r * 0.8, fin, 0.5);
    for (const side of SIDES) leaf(b, [hd[0] + r * 0.2, hd[1], side * r * 0.65], 20, side * 70, r * 0.6, fin, 0.45);
  }
  // Barbillons
  const barb = m(c2);
  for (const side of SIDES) s.tube([[hd[0] - r * 0.6, hd[1] - r * 0.3, side * r * 0.3], [hd[0] - r * 0.8, hd[1] - r * 0.7, side * r * 0.5], [hd[0] - r * 0.6, hd[1] - r * 1.1, side * r * 0.55]], [0.6, 0.45, 0.25], barb);
  a.eyes = SIDES.map((side): V3 => [hd[0] - r * 0.3, hd[1] + r * 0.55, side * r * 0.5]);
  a.eyeR = r * 0.24;
  a.eyeKind = big ? 'feroce' : 'rond';
  a.mouth = [[hd[0] - r * 0.7, hd[1] - r * 0.2, -r * 0.3], [hd[0] - r * 0.75, hd[1] - r * 0.25, 0], [hd[0] - r * 0.7, hd[1] - r * 0.2, r * 0.45]];
}

// ── Golems, arbre et lanterne ────────────────────────────────────────────

function golem(b: Build): void {
  const { s, a, m, id } = b;
  const [c1, c2, c3] = b.look.colors;
  const big = id === 36;
  const banco = m(c1, { pattern: { kind: 'craquelures', color: shade(c1, -0.25), scale: 3.5 }, belly: shade(c1, -0.08) });
  const wood = m('#7a5030');
  if (!big) {
    // Bancolin : petite brique de banco sur pattes courtes, hérissée de torons.
    s.box([0, 10.5, 0], [4.5, 5, 4.5], 2.2, banco);
    for (const side of SIDES) {
      s.cone([1, 4.5, side * 3.5], [0.5, 1.4, side * 4], 2.4, 2.1, m(c2), { k: 1.5 });
      s.ellipsoid([0, 0.9, side * 4], [3, 1, 2.4], m(c2), { k: 1 });
      s.cone([-1, 11, side * 6], [-3.5, 6, side * 8], 2, 1.7, banco, { k: 1.5 });
    }
    s.cone([0.5, 16.5, 0], [1, 21, 0], 4, 1, banco, { k: 2 });
    for (const [x, y, z] of [[2, 14, 6], [4, 9, 6], [2, 14, -6], [0, 18.5, 2.5], [5, 13, 0]] as const) s.cone([x - 1, y, z * 0.6], [x + 1.5, y, z * 1.2 + (z === 0 ? 0 : 0)], 0.6, 0.6, wood);
    s.paint([-6.5, 7.5, 0], [1.2, 1, 2.5], m('#3a2418'));
    a.eyes = SIDES.map((side): V3 => [-6.4, 12, side * 2.4]);
    a.eyeR = 1.8;
    a.eyeKind = 'lueur';
    a.eyeColor = c3;
    return;
  }
  // Bancogolem : rempart vivant, tours coniques hérissées de torons comme à Djenné.
  s.box([1, 9, 0], [6, 7, 7.5], 2, banco);
  s.box([0, 23, 0], [5.5, 6, 7], 2, banco, { k: 2 });
  for (const side of SIDES) {
    s.cone([0, 17, side * 9], [-1, 27, side * 10], 3, 2.2, banco, { k: 1 });
    s.cone([-1, 27, side * 10], [-1, 33, side * 10], 2.4, 0.8, banco, { k: 0.5 });
    s.tube([[0, 26, side * 8], [-3, 18, side * 13], [-5, 9, side * 13]], [3.2, 2.8, 3.4], banco, { k: 1.5 });
    s.cone([0, 3, side * 4.5], [-1, 0.8, side * 5], 3.4, 3.6, m(c2), { k: 1.5 });
  }
  s.cone([0, 30, 0], [0.5, 39, 0], 5, 1.2, banco, { k: 2 });
  for (const [x, y, z] of [[-4, 6, 5], [-4, 6, -5], [-4, 13, 2], [-4, 20, -4], [-4, 20, 4], [2, 28, 8], [2, 28, -8], [-2, 31, 0], [-2, 34, 0]] as const) {
    s.cone([x + 2, y, z], [x - 2.5, y + 0.4, z * 1.05], 0.6, 0.6, wood);
  }
  s.paint([-7.6, 20, 0], [1.2, 1.1, 3.5], m('#3a2418'));
  a.eyes = SIDES.map((side): V3 => [-7.4, 24.5, side * 3]);
  a.eyeR = 1.9;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
}

function arbre(b: Build): void {
  const { s, a, m } = b;
  const [c1, c2, c3] = b.look.colors;
  // Kontombaobab : tronc ventru, branches courtes, feuillage et fleurs.
  const bark = m(c1, { pattern: { kind: 'rayures', color: shade(c1, -0.22), scale: 2.2, amount: 0.25, axis: 0 }, belly: shade(c1, -0.1) });
  s.ellipsoid([0, 14, 0], [10, 14, 10], bark);
  s.cone([0, 22, 0], [0, 30, 0], 7, 5, bark, { k: 3 });
  for (const side of SIDES) {
    s.cone([1, 4, side * 7], [-1, 0.5, side * 11], 3, 1.5, bark, { k: 2 });
    s.cone([4, 3, side * 5], [8, 0.5, side * 9], 2.5, 1.2, bark, { k: 2 });
  }
  const crown = m(c2, { fur: 1 });
  const branches: V3[] = [[-7, 37, 4], [6, 38, -5], [0, 40, 8], [2, 37, -9], [-4, 39, -3]];
  for (const p of branches) {
    s.cone([0, 29, 0], p, 2.4, 1.2, bark, { k: 1.5 });
    s.sphere([p[0], p[1] + 2.5, p[2]], 4.5, crown, { amp: 1.3, freq: 0.6 });
  }
  const flower = m(c3);
  for (const p of branches.slice(0, 3)) s.sphere([p[0] - 2, p[1] + 5, p[2] + 2], 1.4, flower);
  a.eyes = SIDES.map((side): V3 => [-9, 17, side * 3.8]);
  a.eyeR = 2.4;
  a.eyeKind = 'doux';
  a.mouth = [[-9.8, 11, -2.5], [-10.2, 10.3, 0], [-9.8, 11, 2.5]];
}

function lanterne(b: Build): void {
  const { s, a, m } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  // Tsukumoji : lanterne de papier à un œil, langue pendante.
  const paper = m(c1, { pattern: { kind: 'rayures', color: shade(c1, -0.25), scale: 3.2, amount: 0.12, axis: 1 } });
  const metal = m(c2, { gloss: true, edge: true });
  s.ellipsoid([0, 18, 0], [10, 13, 10], paper);
  s.cone([0, 30, 0], [0, 33, 0], 5.5, 5.5, metal);
  s.cone([0, 6, 0], [0, 3.5, 0], 5, 5, metal);
  s.cone([0, 33, 0], [1.5, 37, 0], 0.7, 0.7, metal);
  s.sphere([0, 18, 0], 6, m(c3, { glow: true }));
  s.paint([-9.5, 12, 0], [2.5, 3, 4.5], m('#4a1018'));
  s.cone([-9.5, 11, 0.5], [-12, 4, 1.5], 1.8, 1.2, m('#e83a5a', { gloss: true }));
  for (const side of SIDES) s.cone([2, 4, side * 3], [0, -2, side * 4.5], 0.8, 0.5, m(shade(c2, -0.2)));
  a.eyes = [[-9.5, 20, 0]];
  a.eyeR = 3.6;
  a.eyeKind = 'rond';
}

// ── Rendu final ──────────────────────────────────────────────────────────

const PLANS: Record<SpeciesLook['plan'], (b: Build) => void> = {
  quadrupede,
  bipede,
  esprit,
  lezard,
  dragon,
  serpent,
  oiseau,
  insecte,
  araignee,
  amphibien,
  golem,
  arbre,
  lanterne,
};

// Yeux dessinés à la main, du plus petit au plus grand ; regard vers la gauche.
const EYES: Record<EyeKind, string[][]> = {
  rond: [['p'], ['hp', 'pp'], ['.oo.', 'ohpo', 'oppo', '.oo.'], ['.ooo.', 'ohhpo', 'ohppo', 'opppo', '.ooo.']],
  doux: [['p'], ['pp'], ['.oo.', 'ohpo', 'oppo', '.oo.'], ['.ooo.', 'ohhpo', 'oiipo', 'opppo', '.ooo.']],
  feroce: [['p'], ['pp'], ['ooo', 'wpo', '.o.'], ['oooo.', 'owhpo', 'owppo', '.ooo.']],
  perle: [['p'], ['hp', 'pp'], ['hp', 'pp'], ['.oo.', 'ohpo', 'oppo', '.oo.']],
  lueur: [['i'], ['wi'], ['.i.', 'iwi', '.i.'], ['.ii.', 'iwwi', 'iwwi', '.ii.']],
  clos: [['p'], ['pp'], ['ppp'], ['.pp.', 'p..p']],
};

function stampFeatures(img: SculptImage, a: Anchors, scale: number): void {
  const px = a.eyeR * scale;
  const level = px < 0.9 ? 0 : px < 1.5 ? 1 : px < 2.4 ? 2 : 3;
  const glyph = EYES[a.eyeKind][level];
  const pal: Record<string, string> = {
    o: '#1c1018',
    p: '#1c1018',
    h: '#ffffff',
    w: a.eyeKind === 'lueur' ? '#ffffff' : '#f4f0e8',
    i: a.eyeColor ?? '#ffe860',
  };
  if (a.eyeKind === 'doux') pal.i = shade(a.eyeColor ?? '#806040', -0.1);
  // Bouche : trait sombre entre ancres visibles.
  if (a.mouth && scale * 8 > 4) {
    const pts = a.mouth.map((p) => img.project(p, 3));
    if (pts.every((p) => p.visible && p.facing > 0.15)) {
      for (let i = 0; i + 1 < pts.length; i++) line(img, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, a.mouthColor ?? '#2a1418');
    }
  }
  for (const e of a.eyes) {
    const p = img.project(e, 3.5);
    if (!p.visible || p.facing < 0.18) continue;
    // Œil vu de biais : on retire une colonne.
    const narrow = p.facing < 0.5 && glyph[0].length > 2;
    const rows = narrow ? glyph.map((r) => r.slice(0, -1)) : glyph;
    const x0 = p.x - Math.floor(rows[0].length / 2);
    const y0 = p.y - Math.floor(rows.length / 2);
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]];
        if (c && img.filled(x0 + i, y0 + j)) img.put(x0 + i, y0 + j, c);
      }
    });
  }
}

function line(img: SculptImage, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (img.filled(x0, y0)) img.put(x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Petites étincelles autour des créatures mystiques. */
function sparkles(img: SculptImage, color: string, seed: number): void {
  const light = shade(color, 0.55);
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const w = img.w;
  for (let n = 0, tries = 0; n < 5 && tries < 200; tries++) {
    const x = Math.floor(rnd() * (w - 6)) + 3;
    const y = Math.floor(rnd() * (img.h * 0.75)) + 3;
    if (img.filled(x, y)) continue;
    let near = false;
    for (let d = 2; d <= 5 && !near; d++) near = img.filled(x + d, y) || img.filled(x - d, y) || img.filled(x, y + d) || img.filled(x, y - d);
    if (!near) continue;
    img.put(x, y, '#ffffff');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!img.filled(x + dx, y + dy)) img.put(x + dx, y + dy, light);
    n++;
  }
}

export type Pose = 'face' | 'dos';

const VIEWS = { face: { yaw: 32, pitch: 14 }, dos: { yaw: 212, pitch: 16 } };
const measures = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();

function build(speciesId: number): { s: Sculpt; a: Anchors; look: SpeciesLook } {
  const look = getSpecies(speciesId).look;
  const s = new Sculpt();
  const a: Anchors = { eyes: [], eyeR: 2, eyeKind: 'rond' };
  const b: Build = { s, look, id: speciesId, has: (f) => look.features.includes(f), a, m: (color, extra = {}) => s.material({ color, ...extra }) };
  PLANS[look.plan](b);
  return { s, a, look };
}

/** Rend un Jinémon en pixel art (`size` × `size`), de trois quarts face ou de dos. */
export function renderCreature(speciesId: number, size: number, pose: Pose = 'face'): SculptImage {
  const { s, a, look } = build(speciesId);
  const view = VIEWS[pose];
  const key = `${speciesId}:${pose}`;
  let box = measures.get(key);
  if (!box) {
    box = s.measure(view);
    measures.set(key, box);
  }
  // Les petits Jinémon occupent moins le cadre que les grands.
  const fill = 0.6 + 0.36 * look.size;
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const lift = a.floating ? Math.round(size * 0.06) : 0;
  const scale = Math.min((fill * size) / Math.max(bw, bh * 0.92), (size - 4) / bw, (size - 4 - lift) / bh);
  const bottom = size - 2 - lift;
  const ground = Math.round(bottom + box.y0 * scale);
  const img = s.render({ size, scale, ground, center: (box.x0 + box.x1) / 2, view });
  if (pose === 'face') stampFeatures(img, a, scale);
  if (look.features.includes('aura')) sparkles(img, look.colors[2], speciesId * 31 + (pose === 'face' ? 1 : 2));
  return img;
}
