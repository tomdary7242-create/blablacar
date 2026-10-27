// Modelage des Terreurs nocturnes (n° 138 à 144) : chaque corps dit comment la bête chasse.
// L'araignée se ramasse pour bondir, le pendu tient sa branche à l'envers, le ver aveugle
// sort de son trou de sable, l'oiseau-dragon déploie ses ailes de cuir, le faux villageois
// porte sa lanterne et un visage volé, la clochette cache sa bouche derrière sa lueur, et
// le fauve gris avance tête basse.
import type { QuadFrame, QuadShape } from './creatures';
import { shade } from './draw';
import type { V3 } from './sculpt';
import { BIPED_DEFAULT, SIDES, add3, batWing, frontEyes, humanoid, leaf, leafMat, rad, spikeRow, type Build } from './sculptKit';

/** Tissombre : araignée noire des toits, ramassée pour bondir, pattes avant levées, huit yeux rouges. */
function tissombre(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const body = m(c1, { fur: 0.7, belly: shade(c1, -0.15) });
  const legMat = m(shade(c1, 0.08), { fur: 0.5, pattern: { kind: 'rayures', color: c2, scale: 2, amount: 0.3, axis: 1 } });
  const ceph: V3 = [-3, 10, 0];
  // Abdomen bombé, marqué d'un sablier rouge sombre, avec des brins de chaume restés accrochés.
  s.ellipsoid([7, 12.5, 0], [8, 7, 7], m(c1, { fur: 0.8, pattern: { kind: 'taches', color: shade(c2, -0.1), scale: 3.5, amount: 0.22 } }), { amp: 0.4, freq: 0.9 });
  s.paint([6.5, 19.2, 0], [2.6, 0.8, 1.2], m('#a8202a'));
  s.paint([9.5, 18.5, 0], [1.6, 0.8, 0.9], m('#a8202a'));
  const straw = m('#c8a860', { edge: true });
  for (const [x, z, lean] of [[4, -2.5, -3], [8, 1.8, 2], [10.5, -1, 3], [6, 3.5, -1]] as const) s.cone([x, 18.5, z], [x + lean, 23, z + lean * 0.4], 0.35, 0.15, straw);
  s.ellipsoid(ceph, [5.5, 4.4, 5], body, { k: 1.5 });
  // Pattes : la paire avant levée, griffes en avant ; les autres, genoux très hauts, prêtes à détendre.
  for (const side of SIDES) {
    s.tube([[ceph[0] - 3, ceph[1], side * 3], [-8, 20, side * 6.5], [-13.5, 17, side * 5], [-15.5, 13.5, side * 4]], [1.3, 1.1, 0.8, 0.35], legMat, { k: 0.4 });
    for (let i = 0; i < 3; i++) {
      const hip: V3 = [ceph[0] - 1 + i * 2.4, ceph[1] - 0.5, side * 3.6];
      const ang = rad(-25 + i * 38);
      const reach = 13.5 - i * 0.8;
      const knee: V3 = [hip[0] + Math.sin(ang) * reach * 0.45, ceph[1] + 10 - i, side * (7 + Math.cos(ang) * reach * 0.35)];
      const foot: V3 = [hip[0] + Math.sin(ang) * reach * 1.15, 0.6, side * (6.5 + Math.cos(ang) * reach * 0.8)];
      s.cone(hip, knee, 1.35, 1, legMat, { k: 0.5 });
      s.cone(knee, foot, 1, 0.4, legMat);
    }
  }
  // Chélicères et crochets luisants.
  const fang = m('#e8d8c8', { gloss: true });
  for (const side of SIDES) {
    s.cone([ceph[0] - 4.5, ceph[1] - 1.5, side * 1.4], [ceph[0] - 6, ceph[1] - 3.8, side * 1.2], 1.1, 0.7, body);
    s.cone([ceph[0] - 6, ceph[1] - 3.8, side * 1.2], [ceph[0] - 5.2, ceph[1] - 5.6, side * 0.7], 0.55, 0.12, fang);
  }
  // Huit yeux : la grande paire (les yeux « vivants »), et six petits qui luisent autour.
  const glint = m(c3, { glow: true });
  for (const [dx, dy, dz, r] of [[0.4, 2.8, 0.8, 0.55], [0.8, 3.4, 2.3, 0.5], [0.3, -0.3, 2.9, 0.5]] as const) {
    for (const side of SIDES) s.sphere([ceph[0] - 5 + dx, ceph[1] + dy, side * dz], r, glint);
  }
  a.eyes = SIDES.map((side): V3 => [ceph[0] - 5.2, ceph[1] + 1.2, side * 1.5]);
  a.eyeR = 1.25;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
}

/** Yaramaya : petit homme rouge pendu tête en bas à une branche de figuier, bras ballants, bouche ouverte. */
function yaramaya(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  const skin = m(c1, { fur: 0.2, belly: shade(c1, 0.15) });
  // La branche, en travers du haut de l'image, et ses feuilles de figuier.
  const wood = m('#5a4030', { pattern: { kind: 'rayures', color: '#3a2a20', scale: 1.4, amount: 0.3, axis: 0 } });
  s.tube([[-13, 35, -2], [-3, 36, 0], [7, 35.5, 1], [14, 37, 2]], [1.8, 2, 1.8, 1.3], wood, { k: 1 });
  const leaves = leafMat(b, c2);
  for (const [x, az, ay] of [[-10, 70, -40], [-6, 110, 30], [3, 80, 60], [9, 120, -20], [12, 60, 20]] as const) leaf(b, [x, 37, 0], az, ay, 4.2, leaves, 0.36);
  // Jambes crochées par-dessus la branche, orteils en crochets.
  for (const side of SIDES) {
    s.tube([[1, 26, side * 2], [0, 31, side * 2.4], [-1.5, 35.5, side * 2.2], [-3, 37.5, side * 2]], [1.6, 1.3, 1, 0.8], skin, { k: 1 });
    s.cone([-3, 37.5, side * 2], [-4.2, 35.5, side * 2], 0.6, 0.2, m('#2a1a10'));
  }
  // Corps qui pend, puis l'énorme tête en bas.
  s.ellipsoid([0.5, 21, 0], [3.4, 5.5, 3.6], skin, { k: 2 });
  const head: V3 = [-0.5, 11, 0];
  s.sphere(head, 7.2, skin, { k: 1.5 });
  // Tête à l'envers : la bouche, immense, au-dessus des yeux.
  s.paint([head[0] - 6.4, head[1] + 2.2, 0], [2, 2, 5.4], m('#3a0a08'));
  const tooth = m('#f0e8d0');
  for (let i = -4; i <= 4; i++) {
    const x = head[0] - Math.sqrt(Math.max(0, 51.8 - i * i * 1.44)) * 0.95;
    s.cone([x, head[1] + 3.8, i * 1.2], [x - 0.2, head[1] + 2.2, i * 1.2], 0.42, 0.08, tooth);
  }
  // Bras démesurés qui pendent sous la tête, doigts à ventouses.
  const sucker = m('#f0c0a0', { gloss: true });
  for (const side of SIDES) {
    const hand: V3 = [-3, 0.5, side * 6.5];
    s.tube([[0, 18, side * 3.2], [-1.5, 10, side * 6], hand], [1.2, 1, 0.9], skin, { k: 1 });
    for (const k of [-1, 0, 1]) {
      const tip: V3 = [hand[0] - 1 + k * 0.4, hand[1] - 2.2, hand[2] + k * 0.9];
      s.cone(hand, tip, 0.45, 0.35, skin);
      s.sphere(tip, 0.5, sucker);
    }
  }
  a.eyes = SIDES.map((side): V3 => [head[0] - 7, head[1] - 2.2, side * 2.5]);
  a.eyeR = 1.6;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
}

/** Olgoïkhor : ver aveugle rouge sang dressé hors de son trou de sable, gueule ronde cerclée de dents. */
function olgoikhor(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const sand = m('#d8b880', { fur: 0.5, pattern: { kind: 'taches', color: '#b89860', scale: 3, amount: 0.3 } });
  // Le trou de sable d'où il jaillit.
  s.ellipsoid([3, 1, 0], [11, 2.6, 9], sand, { amp: 0.6, freq: 0.6 });
  for (const [x, z] of [[-6, 4], [10, -5], [12, 4], [-3, -6]] as const) s.sphere([x, 1.5, z], 1.4, sand);
  // Corps annelé, rouge sang, dressé ; plaques sombres et soies raides sur le dos.
  const flesh = m(c1, { belly: shade(c1, 0.2), pattern: { kind: 'taches', color: shade(c1, -0.22), scale: 2.5, amount: 0.25 } });
  const plate = m(c2, { edge: true, gloss: true });
  const spine: V3[] = [[6, 1, 0], [6.5, 8, 0.5], [3.5, 14, 0.5], [-1, 19, 0], [-5, 22.5, 0]];
  s.tube(spine, [6.4, 5.8, 5.3, 5, 4.9], flesh, { k: 2 });
  // Anneaux : bourrelets sombres, perpendiculaires au corps.
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const k = Math.min(3, Math.floor(t * 4));
    const [p, q] = [spine[k], spine[k + 1]];
    const u = t * 4 - k;
    const c: V3 = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, 0];
    const ang = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
    s.ellipsoid(c, [0.8, 6.3 - t * 1.3, 6.3 - t * 1.3], plate, { rot: [ang, 0, 0], k: 0.4 });
  }
  spikeRow(b, [7, 9, 0], [-2, 22, 0], 7, 1.8, 0.45, m('#e8d8b8', { gloss: true }), 0.7);
  // La tête : une collerette évasée, levée vers vous, gueule ronde ouverte, couronnes de crocs.
  const dir: V3 = [-0.62, 0.78, 0];
  const across: V3 = [0.78, 0.62, 0];
  const mouth: V3 = [-8.5, 27, 0];
  const at = (r: number, ang: number, depth = 0): V3 => [
    mouth[0] + across[0] * Math.sin(ang) * r - dir[0] * depth,
    mouth[1] + across[1] * Math.sin(ang) * r - dir[1] * depth,
    Math.cos(ang) * r,
  ];
  s.capped(spine[4], mouth, 4.9, 6.8, flesh, { round: 0.6, k: 1.5 });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.5;
    s.cone(at(6, ang, 1.2), add3(at(9, ang, 3.5), [0, 0, 0]), 1.6, 0.2, plate, { k: 0.5 });
  }
  const tilt = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  s.paint(mouth, [1.4, 5.8, 5.8], m('#1e0406'), [tilt, 0, 0]);
  s.paint(add3(mouth, [-dir[0] * 0.6, -dir[1] * 0.6, 0]), [1.4, 3, 3], m('#6a0e16'), [tilt, 0, 0]);
  const tooth = m(c3, { gloss: true });
  for (const [r, n, inner] of [[5.4, 12, 3.2], [3, 8, 1.4]] as const) {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      s.cone(at(r, ang, 0.2), at(inner, ang, 1), 0.7, 0.1, tooth);
    }
  }
  // Le venin qui goutte de la lèvre.
  const venom = m('#c8f04a', { glow: true });
  const lip = at(5.6, -Math.PI / 2, 0.5);
  s.cone(lip, [lip[0] - 0.3, lip[1] - 4, lip[2]], 0.6, 0.2, venom);
  s.sphere([lip[0] - 0.3, lip[1] - 6, lip[2]], 0.7, venom);
  s.sphere([-6, 1.6, 4], 1.2, venom);
  // Aveugle : il ne vous voit pas, il vous sent.
  a.eyes = [];
  a.mouth = [at(4, -0.6, 0.5), at(4, 0.6, 0.5)];
}

/** Kongamato : reptile volant aux ailes de cuir, long bec denté, crête et queue en losange. */
function kongamato(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  a.floating = true;
  const hide = m(c1, { belly: shade(c1, 0.25), pattern: { kind: 'taches', color: shade(c1, -0.18), scale: 3, amount: 0.2 } });
  // Corps fuselé, cou en S.
  s.ellipsoid([1, 15, 0], [5.5, 3.6, 3.6], hide, { k: 2 });
  s.tube([[-3, 16, 0], [-6, 20, 0], [-8, 22.5, 0]], [2.4, 1.8, 2], hide, { k: 1.5 });
  // Ailes de cuir déployées, voile sombre.
  for (const side of SIDES) batWing(b, [0, 17, side * 2.6], side, 21, shade(c1, -0.1), c2, 40);
  // Tête : crête osseuse vers l'arrière, long bec garni de dents.
  const head: V3 = [-10, 23.5, 0];
  s.sphere(head, 3, hide, { k: 1 });
  s.cone([head[0] + 1, head[1] + 1.5, 0], [head[0] + 9, head[1] + 4, 0], 1.6, 0.2, m(c3, { edge: true }));
  const beak = m(shade(c1, 0.1), { gloss: true });
  s.cone([head[0] - 2, head[1] - 0.2, 0], [head[0] - 12, head[1] - 2, 0], 1.7, 0.35, beak, { k: 0.6 });
  s.cone([head[0] - 2, head[1] - 1.6, 0], [head[0] - 10, head[1] - 2.8, 0], 1.1, 0.3, beak, { k: 0.4 });
  const tooth = m('#f0e8d0');
  for (let i = 0; i < 5; i++) for (const side of SIDES) s.cone([head[0] - 4 - i * 1.5, head[1] - 1.4 - i * 0.18, side * 0.7], [head[0] - 4.3 - i * 1.5, head[1] - 2.6 - i * 0.18, side * 0.8], 0.28, 0.06, tooth);
  // Pattes griffues repliées, et la longue queue terminée par un losange.
  for (const side of SIDES) s.tube([[2, 12.5, side * 2], [1, 8.5, side * 2.6], [-1, 6.5, side * 2.4]], [1.1, 0.8, 0.5], hide);
  s.tube([[5.5, 14.5, 0], [11, 12.5, 0], [17, 11.5, 0], [21, 12.5, 0]], [1.5, 0.9, 0.6, 0.4], hide, { k: 0.8 });
  s.ellipsoid([22.5, 13, 0], [2.2, 1.8, 0.4], m(c3, { edge: true }), { rot: [45, 0, 0] });
  a.eyes = SIDES.map((side): V3 => [head[0] - 1.2, head[1] + 1, side * 2]);
  a.eyeR = 1.2;
  a.eyeKind = 'feroce';
  a.eyeColor = c3;
}

/** Dodombre : grande silhouette voûtée en haillons, lanterne au poing, visage de villageois volé. */
function dodombre(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const rags = m(c1, { fur: 0.8, pattern: { kind: 'rayures', color: shade(c1, 0.12), scale: 1.2, amount: 0.25, axis: 1 } });
  // Long manteau effiloché jusqu'au sol, trop grand pour un homme.
  s.cone([0, 24, 0], [1, 1, 0], 4, 8, rags, { k: 1.5, amp: 1, freq: 0.5, stretch: 2.5 });
  for (const side of SIDES) s.cone([2, 6, side * 5], [4, 0.5, side * 6.5], 2, 1, rags, { amp: 0.6, freq: 0.8 });
  // Épaules hautes et voûtées, cou qui penche en avant.
  s.ellipsoid([0.5, 25, 0], [4, 3.4, 6], rags, { k: 2 });
  s.cone([0, 26, 0], [-3.5, 29.5, 0], 1.6, 1.4, m('#1a161e'), { k: 1 });
  const head: V3 = [-4.5, 30.5, 0];
  s.sphere(head, 3.6, m('#141018'), { k: 1 });
  // Le visage volé : un masque pâle, légèrement de travers, aux traits trop calmes.
  const mask = m(c2, { edge: true });
  s.ellipsoid([head[0] - 2.6, head[1] - 0.3, 0.3], [1.2, 4.3, 3.3], mask, { rot: [8, 0, 0] });
  s.paint([head[0] - 3.7, head[1] - 2.4, 0.5], [0.6, 0.35, 1.3], m('#7a5a50'));
  s.paint([head[0] - 3.7, head[1] + 0.8, 1.5], [0.7, 0.6, 0.75], m('#0a080c'));
  s.paint([head[0] - 3.7, head[1] + 0.8, -1], [0.7, 0.6, 0.75], m('#0a080c'));
  // Bras interminables : l'un tient la lanterne, l'autre tend ses longs doigts.
  const arm = m('#1a161e');
  const lanternHand: V3 = [-9, 17, 4];
  s.tube([[0, 24.5, 5], [-3, 19.5, 7], lanternHand], [1.4, 1, 0.8], rags, { k: 1 });
  const reach: V3 = [-9.5, 20, -5];
  s.tube([[0, 24.5, -5], [-4, 22, -6.5], reach], [1.4, 1, 0.8], rags, { k: 1 });
  for (const k of [-1, 0, 1]) s.cone(reach, [reach[0] - 4.5, reach[1] - 1.5 + k * 1.2, reach[2] - k * 0.6], 0.35, 0.1, arm);
  // La lanterne : une flamme dans une cage de fer, au bout d'une anse.
  const iron = m('#3a3434', { gloss: true, edge: true });
  const lamp: V3 = [lanternHand[0] - 0.5, lanternHand[1] - 6, lanternHand[2] + 0.5];
  s.cone(lanternHand, [lamp[0], lamp[1] + 3.2, lamp[2]], 0.25, 0.25, iron);
  s.sphere(lamp, 2.7, m('#ffc860', { glow: true }));
  s.cone([lamp[0], lamp[1] + 3, lamp[2]], [lamp[0], lamp[1] + 4.2, lamp[2]], 2.6, 0.6, iron);
  s.cone([lamp[0], lamp[1] - 3, lamp[2]], [lamp[0], lamp[1] - 3.6, lamp[2]], 2.6, 2.6, iron);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.4;
    s.cone([lamp[0] + Math.cos(ang) * 2.8, lamp[1] - 3, lamp[2] + Math.sin(ang) * 2.8], [lamp[0] + Math.cos(ang) * 2.8, lamp[1] + 3, lamp[2] + Math.sin(ang) * 2.8], 0.28, 0.28, iron);
  }
  // Par les trous du masque, deux lueurs froides.
  a.eyes = SIDES.map((side): V3 => [head[0] - 3.8, head[1] + 0.8, 0.25 + side * 1.25]);
  a.eyeR = 0.65;
  a.eyeKind = 'lueur';
  a.eyeColor = c3;
}

/** Elokloche : nain des bois vêtu de feuilles, clochette de cuivre à la main, bouche fendue jusqu'aux oreilles. */
function elokloche(b: Build): void {
  const { s, m, a } = b;
  const [c1, c2, c3] = b.look.colors;
  const skin = m(c2, { fur: 0.3 });
  const h = humanoid(b, { ...BIPED_DEFAULT, torsoR: 4.6, torsoH: 6, hipY: 5.5, legR: 1.6, armR: 1.2, armLen: 9, headR: 6.2, neck: 0.5, armsUp: 0.3, footLen: 3 }, { body: skin });
  // Manteau de feuilles et chevelure d'herbes.
  const leaves = leafMat(b, c1);
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * 360;
    leaf(b, [h.chest[0], h.chest[1] + 2.5, 0], 255 + Math.sin(rad(ang)) * 25, ang, 5.2, leaves, 0.4);
  }
  const grass = m(shade(c1, 0.15), { edge: true });
  for (let i = 0; i < 7; i++) {
    const ang = rad(-70 + i * 23);
    const root: V3 = [h.head[0] + 1.5 + Math.cos(ang) * 2, h.head[1] + h.headR * 0.8, Math.sin(ang) * 4];
    s.cone(root, [root[0] + 2 + (i % 2) * 2, root[1] + 5 + (i % 3), root[2] * 1.4], 0.6, 0.1, grass);
  }
  // La bouche, fendue d'une oreille à l'autre, pleine de petites dents.
  const head = h.head;
  s.paint([head[0] - h.headR * 0.85, head[1] - 1.5, 0], [1.6, 1.4, h.headR * 0.85], m('#2a0a0a'));
  const tooth = m('#f4ecd8');
  for (let i = -4; i <= 4; i++) {
    const z = i * 1.15;
    const x = head[0] - Math.sqrt(Math.max(0, h.headR * h.headR - z * z)) * 0.92;
    s.cone([x, head[1] - 0.4, z], [x - 0.2, head[1] - 1.5, z], 0.35, 0.06, tooth);
    s.cone([x, head[1] - 2.7, z + 0.5], [x - 0.2, head[1] - 1.7, z + 0.5], 0.3, 0.06, tooth);
  }
  // Clochette de cuivre dans une main ; dans l'autre, la petite lueur qui attire les voyageurs.
  const copper = m('#c8902a', { gloss: true, edge: true });
  const [left, right] = h.hands;
  s.cone([left[0], left[1] - 0.5, left[2]], [left[0], left[1] - 2.2, left[2]], 0.25, 0.25, m('#5a3a20'));
  s.cone([left[0], left[1] - 2.2, left[2]], [left[0], left[1] - 5.2, left[2]], 0.6, 2, copper, { k: 0.3 });
  s.sphere([left[0], left[1] - 5.4, left[2]], 0.6, m('#5a3a10'));
  s.sphere([right[0] - 1.5, right[1] + 3.5, right[2]], 1.5, m(c3, { glow: true }));
  // Griffes au bout des doigts.
  for (const hand of h.hands) for (const k of [-1, 1]) s.cone(hand, add3(hand, [-1.6, -1, k * 0.7]), 0.3, 0.06, m('#2a2018'));
  frontEyes(b, h, 0.4, 0.3, 'lueur', 0.17);
  a.eyeColor = c3;
}

/** Mngwa : grand chat gris, maigre et rayé de sombre, tête basse, longue queue. */
export const NUIT_QUAD_TUNING: Record<number, Partial<QuadShape>> = {
  144: {
    len: 16,
    girth: 7,
    width: 5.5,
    legLen: 14,
    legR: 2.2,
    neck: 4.5,
    neckAngle: 18,
    headR: 6,
    snout: 3.5,
    snoutR: 2.6,
    snoutDrop: 0.2,
    ears: 'rondes',
    earSize: 0.85,
    tail: 'aucune',
    fur: 0.6,
    slope: -1.5,
    muzzle: '#c8c4b8',
    eye: 'feroce',
    eyeScale: 1.1,
    skin: { pattern: { kind: 'rayures', color: '#2a2826', scale: 2.4, amount: 0.32, axis: 0 }, belly: '#b8b4a8' },
  },
};

export const NUIT_QUAD_EXTRAS: Record<number, (b: Build, f: QuadFrame) => void> = {
  144: (b, f) => {
    const { s, m } = b;
    // Crocs qui dépassent, et la longue queue rayée relevée en crochet, prête à fouetter.
    const fang = m('#f0ecd8', { gloss: true });
    for (const side of SIDES) s.cone([f.snoutEnd[0] + 0.8, f.snoutEnd[1] - 0.6, side * 1], [f.snoutEnd[0] + 0.6, f.snoutEnd[1] - 2.6, side * 1.1], 0.45, 0.1, fang);
    const tail = m(b.look.colors[0], { fur: 0.6, pattern: { kind: 'rayures', color: '#2a2826', scale: 1.6, amount: 0.35, axis: 0 } });
    const curl: V3[] = [f.tb, add3(f.tb, [5, 0.5, 0]), add3(f.tb, [9.5, 2.5, 0.5]), add3(f.tb, [12, 6.5, 1]), add3(f.tb, [11, 10, 1])];
    s.tube(curl, [1.5, 1.3, 1.1, 1, 1.1], tail, { k: 1 });
    s.sphere(curl[4], 1.3, m('#2a2826', { fur: 1 }));
  },
};

export const NUIT_DESIGNS: Partial<Record<number, (b: Build) => void>> = {
  138: tissombre,
  139: yaramaya,
  140: olgoikhor,
  141: kongamato,
  142: dodombre,
  143: elokloche,
};
