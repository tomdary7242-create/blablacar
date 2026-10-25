// Boîte à outils du modelage des Jinémon : types partagés, matières et
// éléments récurrents (feuilles, flammes, ailes, cornes), squelettes humanoïde
// et saurien. Utilisée par creatures.ts et creaturesNouveaux.ts.
import type { Feature, SpeciesLook } from '../data/ginedex';
import { shade } from './draw';
import type { MaterialDef, Sculpt, V3 } from './sculpt';

export type EyeKind = 'rond' | 'feroce' | 'lueur' | 'perle' | 'doux' | 'clos';

export interface Anchors {
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

export interface Build {
  s: Sculpt;
  look: SpeciesLook;
  id: number;
  has: (f: Feature) => boolean;
  a: Anchors;
  m: (color: string, extra?: Omit<MaterialDef, 'color'>) => number;
}

export type Side = 1 | -1;
export const SIDES: Side[] = [1, -1];
export const lerp3 = (p: V3, q: V3, t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
export const add3 = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
export const rad = (deg: number) => (deg * Math.PI) / 180;

// ── Éléments communs ─────────────────────────────────────────────────────

/** Feuille : ellipsoïde aplati dont l'axe long part de `base` selon les angles (degrés). */
export function leaf(b: Build, base: V3, az: number, ay: number, len: number, mat: number, width = 0.32): void {
  const dir: V3 = [Math.cos(rad(az)) * Math.cos(rad(ay)), Math.sin(rad(az)), -Math.cos(rad(az)) * Math.sin(rad(ay))];
  const c = add3(base, [dir[0] * len * 0.5, dir[1] * len * 0.5, dir[2] * len * 0.5]);
  b.s.ellipsoid(c, [len * 0.5, 0.55, len * width], mat, { rot: [az, ay, 0] });
}

export function leafMat(b: Build, color = '#6cbc3c'): number {
  return b.m(color, { pattern: { kind: 'rayures', color: shade(color, -0.25), scale: 2.6, amount: 0.12, axis: 1 } });
}

/** Bouquet de feuilles dressé. */
export function leafTuft(b: Build, top: V3, size: number, n = 3, color?: string): void {
  const mat = leafMat(b, color);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    leaf(b, top, 60 + t * 60, -50 + t * 100, size * (i % 2 ? 0.85 : 1), mat);
  }
}

/** Flamme : cône lumineux au relief bruité étiré vers le haut. */
export function flame(b: Build, base: V3, h: number, r: number, color = '#ff8a2a', lean = 0): void {
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
export function featherWing(b: Build, root: V3, side: Side, span: number, color: string, opts: { up?: number; tip?: string; spread?: number } = {}): void {
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
export function batWing(b: Build, root: V3, side: Side, span: number, bone: string, skin: string, up = 50): void {
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
export function spikeRow(b: Build, from: V3, to: V3, n: number, h: number, r: number, mat: number, lean = 0.3): void {
  for (let i = 0; i < n; i++) {
    const p = lerp3(from, to, n === 1 ? 0.5 : i / (n - 1));
    const hh = h * (0.75 + 0.25 * Math.sin((i / Math.max(1, n - 1)) * Math.PI));
    b.s.cone(p, [p[0] + hh * lean, p[1] + hh, p[2]], r, 0.15, mat, { k: 0.6 });
  }
}

/** Corne en tube dont les points sont relatifs à la base (le z est inversé pour l'autre côté). */
export function horn(b: Build, base: V3, side: Side, pts: V3[], radii: number[], mat: number): void {
  b.s.tube(
    [base, ...pts.map((p): V3 => [base[0] + p[0], base[1] + p[1], base[2] + side * p[2]])],
    radii,
    mat,
    { k: 0.5 },
  );
}

export function hornMat(b: Build, color: string, ringed = true): number {
  return b.m(color, ringed ? { pattern: { kind: 'rayures', color: shade(color, -0.3), scale: 2.2, amount: 0.28, axis: 1 } } : {});
}

// ── Squelettes ──────────────────────────────────────────────────────────

export interface Humanoid {
  head: V3;
  headR: number;
  chest: V3;
  hips: V3;
  hands: V3[];
  shoulders: V3[];
}

export interface BipedShape {
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
export function humanoid(b: Build, p: BipedShape, mats: { body: number; legs?: number; arms?: number; hands?: number; feet?: number }): Humanoid {
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

export function frontEyes(b: Build, h: Humanoid, spread = 0.42, height = 0.1, kind: EyeKind = 'rond', size = 0.28): void {
  b.a.eyes = SIDES.map((side): V3 => [h.head[0] - h.headR * 0.8, h.head[1] + h.headR * height, side * h.headR * spread]);
  b.a.eyeR = h.headR * size;
  b.a.eyeKind = kind;
}

export const BIPED_DEFAULT: BipedShape = {
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

export interface Saurian {
  head: V3;
  headR: number;
  body: V3;
  len: number;
  girth: number;
  shoulder: V3;
}

export function saurian(
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

export function jointedLeg(b: Build, hip: V3, side: Side, reach: number, height: number, r: number, mat: number, back = 0): void {
  const knee: V3 = [hip[0] + back * 0.5, hip[1] + height * 0.45, hip[2] + side * reach * 0.6];
  const foot: V3 = [hip[0] + back, 0.6, hip[2] + side * reach];
  b.s.cone(hip, knee, r, r * 0.8, mat, { k: 0.5 });
  b.s.cone(knee, foot, r * 0.8, r * 0.45, mat, { k: 0.3 });
}

