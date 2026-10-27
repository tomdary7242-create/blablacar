// Modelage des Jinémon de l'Acte II (n° 129 à 137) : faune du désert, figurines
// des falaises, masque dogon, et les deux Légendes, Faro et Aïdohwedo.
import type { QuadFrame, QuadShape } from './creatures';
import { shade } from './draw';
import type { V3 } from './sculpt';
import { BIPED_DEFAULT, SIDES, add3, featherWing, frontEyes, horn, hornMat, humanoid, rad, spikeRow, type Build } from './sculptKit';

export const ACTE2_QUAD_TUNING: Record<number, Partial<QuadShape>> = {
  // Fennec : tout petit, oreilles démesurées, queue touffue.
  129: { len: 8, girth: 5.5, width: 4.5, legLen: 8, legR: 1.5, neck: 3, neckAngle: 45, headR: 6, snout: 3.5, snoutR: 1.6, snoutDrop: 0.3, ears: 'renard', earSize: 1.9, tail: 'renard', fur: 0.7, muzzle: '#fff8e8', eyeScale: 1.25 },
  130: { len: 11, girth: 6.5, width: 5.5, legLen: 11, legR: 1.9, neck: 5, neckAngle: 50, headR: 6.5, snout: 4.5, snoutR: 1.9, snoutDrop: 0.3, ears: 'renard', earSize: 1.8, tail: 'renard', fur: 0.6, muzzle: '#fff8e8', eye: 'feroce' },
  // Addax : antilope pâle, longues pattes, toupet brun.
  131: { len: 12, girth: 7.5, width: 6, legLen: 13, legR: 2.1, neck: 6, neckAngle: 45, headR: 6, snout: 5, snoutR: 2.5, snoutDrop: 0.5, ears: 'pointues', earSize: 0.8, tail: 'touffe', hooves: true, fur: 0.4, muzzle: '#f8f4e8', pose: 'couche' },
};

export const ACTE2_QUAD_EXTRAS: Record<number, (b: Build, f: QuadFrame) => void> = {
  130: (b, f) => {
    const { s, m } = b;
    // Joyau frontal et ondes de mirage qui tremblent au ras du sol.
    s.sphere([f.hc[0] - f.q.headR * 0.55, f.hc[1] + f.q.headR * 0.55, 0], 1.1, m(b.look.colors[2], { gloss: true }));
    const haze = m('#d8c0ff', { glow: true });
    for (let ring = 0; ring < 2; ring++) {
      const pts: V3[] = [];
      const r = f.q.len * (0.8 + ring * 0.35);
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        pts.push([Math.cos(a) * r, 0.6 + ring * 1.2 + Math.sin(a * 3) * 0.4, Math.sin(a) * r * 0.7]);
      }
      s.tube(pts, pts.map(() => 0.35), haze);
    }
  },
  131: (b, f) => {
    const { s, m } = b;
    // Cornes en tire-bouchon, longues et torsadées.
    const mat = hornMat(b, '#e8dcc0');
    for (const side of SIDES) {
      const base: V3 = [f.hc[0] + 0.5, f.hc[1] + f.q.headR * 0.7, side * f.q.headR * 0.4];
      const pts: V3[] = [];
      const radii: number[] = [1.3];
      for (let i = 1; i <= 14; i++) {
        const t = i / 14;
        const twist = t * Math.PI * 5;
        pts.push([t * 7 + Math.cos(twist) * 1.3, t * 16, 1 + t * 2.5 + Math.sin(twist) * 1.3]);
        radii.push(1.5 - t * 1.2);
      }
      horn(b, base, side, pts, radii, mat);
    }
    // Toupet brun entre les cornes.
    s.ellipsoid([f.hc[0] - 0.5, f.hc[1] + f.q.headR * 0.75, 0], [2.4, 1.6, f.q.headR * 0.5], m(b.look.colors[2], { fur: 1 }), { k: 1 });
  },
};

/** Kel Essuf : silhouette voilée d'indigo qui flotte, robe effilochée par le vent. */
function kelEssuf(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  const robe = m(c1, { fur: 0.6, edge: true });
  s.cone([0, 21, 0], [1.5, 2, 0], 4.5, 8.5, robe, { k: 1.5, amp: 1.2, freq: 0.45, stretch: 2.2 });
  // Pans de robe qui flottent derrière.
  for (const side of SIDES) s.tube([[2, 16, side * 3], [7, 11, side * 6], [12, 7, side * 5], [15, 2, side * 4]], [2.2, 1.8, 1.1, 0.3], robe, { k: 1, amp: 0.6, freq: 0.6 });
  const head: V3 = [-0.5, 25.5, 0];
  const veil = m(c2, { pattern: { kind: 'rayures', color: shade(c2, -0.25), scale: 1.6, amount: 0.2, axis: 1 } });
  s.sphere(head, 5.5, veil, { k: 2 });
  s.cone([head[0] + 2.5, head[1] + 1, 0], [head[0] + 9, head[1] - 4, 0], 3.2, 0.8, veil, { k: 1.5, amp: 0.5, freq: 0.7 });
  // Fente du voile, d'où luisent les yeux.
  s.paint([head[0] - 5.4, head[1] + 0.8, 0], [1.1, 0.95, 3.2], m('#0a0814'));
  // Bras décharnés aux longs doigts.
  for (const side of SIDES) {
    const sh: V3 = [-0.5, 18.5, side * 4.5];
    const hand: V3 = [-8, 14, side * 6];
    s.tube([sh, [-4, 15, side * 6], hand], [1.8, 1.2, 0.9], robe, { k: 1 });
    for (const k of [-1, 0, 1]) s.cone(hand, [hand[0] - 3.5, hand[1] - 1.5 + k, hand[2] + k * 0.9], 0.45, 0.12, m('#5a4a6a'));
  }
  // Poussière de sable qui tourbillonne au pied.
  const dust = m('#d8c098', { bare: true, maxTone: 2 });
  for (let i = 0; i < 6; i++) {
    const ang = rad(i * 60 + 15);
    s.sphere([Math.cos(ang) * 7 + 1, 1.5 + (i % 3), Math.sin(ang) * 6], 1 + (i % 2) * 0.6, dust);
  }
  a.eyes = SIDES.map((side): V3 => [head[0] - 5.7, head[1] + 0.8, side * 1.4]);
  a.eyeR = 1.4;
  a.eyeKind = 'lueur';
  a.eyeColor = '#7af0ff';
  void c3;
}

/** Figurine tellem : corps d'argile allongé, bras levés vers le ciel. */
function tellem(b: Build, elder: boolean): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const clay = m(c1, elder ? { pattern: { kind: 'craquelures', color: c2, scale: 3, amount: 0.35 } } : { pattern: { kind: 'craquelures', color: shade(c1, -0.2), scale: 2.4, amount: 0.15 } });
  const h = humanoid(
    b,
    elder
      ? { ...BIPED_DEFAULT, torsoR: 5.5, torsoH: 12, hipY: 9, legR: 2.4, armR: 1.8, armLen: 13, headR: 5, neck: 1.5, armsUp: 1, footLen: 4 }
      : { ...BIPED_DEFAULT, torsoR: 4, torsoH: 8, hipY: 5, legR: 1.7, armR: 1.3, armLen: 9, headR: 4.5, neck: 1, armsUp: 1, footLen: 3 },
    { body: clay },
  );
  // Crête sagittale et barbe en pointe des statues tellem.
  s.ellipsoid([h.head[0] + 0.5, h.head[1] + h.headR * 0.8, 0], [h.headR * 0.8, h.headR * 0.45, 1.2], clay, { k: 1 });
  s.cone([h.head[0] - h.headR * 0.6, h.head[1] - h.headR * 0.6, 0], [h.head[0] - h.headR * 0.9, h.head[1] - h.headR * 1.5, 0], h.headR * 0.32, 0.2, clay, { k: 0.8 });
  // Mains ouvertes, paumes vers le ciel.
  for (const hand of h.hands) s.ellipsoid([hand[0], hand[1] + 1, hand[2]], [1.6, 0.8, 1.4], clay, { k: 0.6 });
  if (elder) {
    // Croûte de libations, colliers de cauris et pluie qui commence à tomber.
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI;
      s.sphere([h.chest[0] - Math.sin(ang) * 4.2, h.chest[1] + 3.5 - Math.sin(ang) * 1.2, Math.cos(ang) * 4.6], 0.75, m('#f0ecd8', { gloss: true }));
    }
    s.paint([h.chest[0] - 4, h.chest[1] - 2, 0], [2.5, 4, 3.5], m(shade(c2, -0.2)));
    const drop = m('#8ad0ff', { glow: true });
    for (const [x, y, z] of [[-6, 30, 3], [3, 33, -4], [-2, 35, 0], [6, 29, 4]] as const) s.cone([x, y, z], [x, y - 2.2, z], 0.5, 0.1, drop);
  }
  s.sphere([h.head[0] - h.headR * 0.2, h.head[1] + h.headR * 1.25, 0], elder ? 1.1 : 0.8, m(c3, { glow: true }));
  frontEyes(b, h, 0.36, 0.05, elder ? 'lueur' : 'clos', 0.22);
  a.eyeColor = c3;
}

/** Kanaga : danseur à jupe de raphia, masque blanc surmonté de la double croix. */
function kanaga(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  // Jupe et collerette de raphia rouge et noir.
  const raffia = m(shade(c3, -0.15), { fur: 1, pattern: { kind: 'rayures', color: c2, scale: 1.4, amount: 0.3, axis: 0 } });
  s.cone([0, 10, 0], [0.5, 1.5, 0], 3.2, 5.5, raffia, { k: 1, amp: 0.7, freq: 0.9, stretch: 3 });
  s.ellipsoid([0, 12, 0], [3.8, 2.4, 3.8], m(c2, { fur: 0.6 }), { k: 2 });
  // Ailes-bras déployées pour la danse.
  for (const side of SIDES) featherWing(b, [0, 13, side * 3], side, 17, c1, { tip: c2, up: 25 });
  // Le masque : visage rectangulaire creusé, la double croix au-dessus.
  const mask = m(c1, { edge: true, pattern: { kind: 'rayures', color: c3, scale: 2.2, amount: 0.18, axis: 1 } });
  const face: V3 = [-1, 18.5, 0];
  s.box(face, [2.4, 4.8, 3.2], 0.6, mask, { k: 1 });
  s.box([face[0] - 2, face[1] - 0.5, 0], [0.7, 2.4, 0.7], 0.2, mask);
  const wood = m(c1, { edge: true });
  const top: V3 = [face[0] + 0.5, face[1] + 15, 0];
  s.cone([face[0] + 0.5, face[1] + 4, 0], top, 1, 0.9, wood);
  for (const [y, w, tip] of [[face[1] + 9, 7.5, 3], [face[1] + 14, 6, -3]] as const) {
    s.cone([face[0] + 0.5, y, -w], [face[0] + 0.5, y, w], 1, 1, wood);
    for (const side of SIDES) s.cone([face[0] + 0.5, y, side * w], [face[0] + 0.5, y + tip, side * w], 1, 0.7, wood);
  }
  s.paint([face[0] - 2.2, face[1] + 1.6, 0], [0.8, 1.2, 2.4], m(c2));
  a.eyes = SIDES.map((side): V3 => [face[0] - 2.3, face[1] + 1.6, side * 1.4]);
  a.eyeR = 0.9;
  a.eyeKind = 'lueur';
  a.eyeColor = '#ffe8a0';
}

/** Faro : génie du fleuve, buste aux tresses ornées de cuivre, longue queue de poisson. */
function faro(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c1, { gloss: true, belly: shade(c1, 0.25) });
  const scales = m(c1, { gloss: true, belly: c3, pattern: { kind: 'ecailles', color: shade(c1, -0.25), scale: 2.2 } });
  const copper = m(c2, { gloss: true, edge: true });
  // Queue enroulée sur le sol, nageoire caudale relevée.
  const tail: V3[] = [[1, 12, 0], [5, 6, 1], [6, 2.5, 3], [1, 1.5, 6], [-5, 2, 5], [-8, 4, 2]];
  s.tube(tail, [5.5, 5, 4.2, 3.4, 2.4, 1.4], scales, { k: 2 });
  for (const side of SIDES) s.ellipsoid([-10, 6, 2 + side * 2.5], [3.5, 1.2, 2.4], m(c3, { edge: true }), { rot: [side * 30, 0, 40], k: 0.8 });
  // Buste et bras.
  s.ellipsoid([0, 17, 0], [4.2, 6, 4.8], skin, { k: 3 });
  const head: V3 = [-0.8, 26, 0];
  s.cone([0, 21, 0], head, 2.4, 2.8, skin, { k: 1.5 });
  s.sphere(head, 4.8, skin, { k: 1.5 });
  for (const side of SIDES) {
    const sh: V3 = [-0.3, 20.5, side * 4.3];
    const hand: V3 = [-5.5, 15, side * 6.5];
    s.tube([sh, [-2.5, 16.5, side * 6.2], hand], [1.5, 1.2, 1.1], skin, { k: 1.2 });
    s.capped([hand[0] + 1.6, hand[1] + 0.8, hand[2]], [hand[0] + 0.6, hand[1] + 0.2, hand[2]], 1.5, 1.4, copper, { round: 0.3 });
    // Nageoires aux coudes.
    s.ellipsoid([-1.5, 17.5, side * 7], [2.5, 0.8, 1.6], m(c3, { edge: true }), { rot: [0, side * 20, -30] });
  }
  // Tresses tombantes, chacune terminée par une perle de cuivre.
  const hair = m('#1a2a3a', { pattern: { kind: 'rayures', color: '#2a3a4a', scale: 1, amount: 0.4, axis: 1 } });
  for (let i = 0; i < 7; i++) {
    const ang = rad(-80 + i * 27);
    const root: V3 = [head[0] + 1.5 + Math.cos(ang) * 1.5, head[1] + 3, Math.sin(ang) * 4];
    const end: V3 = [root[0] + 4 + (i % 2), root[1] - 11 - (i % 3), root[2] * 1.5];
    s.cone(root, end, 0.9, 0.6, hair, { k: 0.8 });
    s.sphere(end, 0.9, copper);
  }
  s.ellipsoid([head[0] + 1, head[1] + 3.2, 0], [4, 1.8, 4.4], hair, { k: 1 });
  // Collier de cuivre et cauris.
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI;
    s.sphere([-Math.sin(ang) * 3.8, 21.5 - Math.sin(ang) * 1.6, Math.cos(ang) * 4.4], 0.8, i % 2 ? copper : m('#f8f4e8', { gloss: true }));
  }
  frontEyes(b, { head, headR: 4.8, chest: [0, 17, 0], hips: [0, 12, 0], hands: [], shoulders: [] }, 0.38, 0.12, 'doux', 0.26);
  a.eyeColor = '#2a6a98';
}

/** Aïdohwedo : grand serpent lové, anneaux aux couleurs de l'arc-en-ciel. */
function aidoHwedo(b: Build): void {
  const { s, m, a } = b;
  const [, , c3] = b.look.colors;
  const RAINBOW = ['#d8402a', '#e8902a', '#f0d040', '#4ab048', '#3a8ac8', '#7a4ab8'];
  const mats = RAINBOW.map((c) => m(c, { gloss: true, pattern: { kind: 'ecailles', color: shade(c, -0.22), scale: 2 } }));
  // Les spires, posées l'une sur l'autre.
  const pts: V3[] = [];
  for (let i = 0; i <= 30; i++) {
    const t = (i / 30) * Math.PI * 3.2;
    const r = 13 - i * 0.22;
    pts.push([Math.cos(t) * r + 1, 3 + i * 0.42, Math.sin(t) * r * 0.75]);
  }
  for (let k = 0; k < 6; k++) {
    const seg = pts.slice(k * 5, k * 5 + 6);
    s.tube(seg, seg.map((_, i) => 3.4 - (k * 5 + i) * 0.03), mats[k], { k: 1.2 });
  }
  // Cou dressé et tête de dragon couronnée.
  const neck: V3[] = [pts[30], [-5, 18, 1], [-7, 25, 0], [-8, 30, 0]];
  s.tube(neck, [2.6, 3, 3.2, 3.4], mats[5], { k: 1.5 });
  const head: V3 = [-10, 32.5, 0];
  const skin = m('#7a4ab8', { gloss: true, belly: '#f0e0a0', pattern: { kind: 'ecailles', color: '#5a3a8a', scale: 1.8 } });
  s.sphere(head, 4.6, skin, { k: 1.5 });
  s.cone([head[0] - 2, head[1] - 0.5, 0], [head[0] - 8, head[1] - 1.5, 0], 3, 1.8, skin, { k: 1.2 });
  for (const side of SIDES) horn(b, [head[0] + 1.5, head[1] + 3, side * 2], side, [[3, 3, 1], [6, 4.5, 2], [8.5, 4, 2.5]], [1.1, 0.9, 0.6, 0.2], hornMat(b, c3));
  spikeRow(b, [head[0] + 3, head[1] + 2, 0], [-4, 20, 0], 6, 2.6, 0.8, m(c3, { glow: true }), 0.7);
  // Halo d'arc-en-ciel derrière la tête.
  RAINBOW.forEach((c, i) => {
    const r = 9 + i * 0.9;
    const arc: V3[] = [];
    for (let j = 0; j <= 8; j++) {
      const ang = rad(10 + j * 20);
      arc.push(add3([head[0] + 6, head[1] - 4, 0], [0, Math.sin(ang) * r, -Math.cos(ang) * r]));
    }
    s.tube(arc, arc.map(() => 0.45), m(c, { glow: true }));
  });
  a.eyes = SIDES.map((side): V3 => [head[0] - 3.8, head[1] + 1.4, side * 2.4]);
  a.eyeR = 1.5;
  a.eyeKind = 'feroce';
  a.eyeColor = c3;
  a.mouth = [[head[0] - 7.8, head[1] - 2.2, -1.5], [head[0] - 4.5, head[1] - 2.6, -2.5]];
}

export const ACTE2_DESIGNS: Partial<Record<number, (b: Build) => void>> = {
  132: kelEssuf,
  133: (b) => tellem(b, false),
  134: (b) => tellem(b, true),
  135: kanaga,
  136: faro,
  137: aidoHwedo,
};
