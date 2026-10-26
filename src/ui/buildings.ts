// Bâtiments où l'on entre (maison, Case de Soins, Marché, sanctuaire) et
// meubles des intérieurs, sculptés comme le reste du décor.
//
// Chaque bâtiment a une silhouette et des couleurs propres à sa fonction, les
// mêmes dans toutes les villes : la Case de Soins blanche au toit vert, le
// Marché ocre à l'auvent rayé orange… On les reconnaît de loin.
import { sculpted, type Prop } from './props';
import { shade } from './draw';
import type { MaterialDef } from './sculpt';

type Mat = (color: string, extra?: Omit<MaterialDef, 'color'>) => number;

const banco = (m: Mat, color: string) => m(color, { pattern: { kind: 'craquelures', color: shade(color, -0.16), scale: 4, amount: 0.07 } });
const planks = (m: Mat, color: string) => m(color, { edge: true, pattern: { kind: 'rayures', color: shade(color, -0.28), scale: 1.6, amount: 0.3, axis: 0 } });
const wood = (m: Mat, color: string) => m(color, { pattern: { kind: 'rayures', color: shade(color, -0.25), scale: 1.8, amount: 0.3, axis: 1 } });

/** Position horizontale (unités du modèle) du centre de la colonne `col` d'un bâtiment large de `width` cases. */
const column = (col: number, width: number) => (col + 0.5 - width / 2) * 16;

/** Maison familiale à étage, en banco, à la mode soudano-sahélienne (4 × 3 cases, porte en 2e colonne). */
export function maisonProp(): Prop {
  return sculpted('batiment:maison', (s, m) => {
    const wall = banco(m, '#c9875a');
    const light = banco(m, '#dca070');
    const door = planks(m, '#6a3a1e');
    const pole = m('#5a3a1e');
    const dark = m('#2a1810');
    // Rez-de-chaussée, puis étage en retrait sur la gauche et terrasse à droite.
    s.box([0, 13, 0], [28, 13, 10], 1.4, wall);
    s.box([-11, 32, -2], [15, 7, 7.5], 1.2, light);
    // Acrotères arrondis aux angles et au-dessus de la porte.
    for (const x of [-27, 27]) s.capped([x, 25, 9], [x, 31, 9], 2.2, 1.2, wall, { round: 0.8 });
    for (const x of [-25, 3]) s.capped([x, 38, 4.5], [x, 43, 4.5], 1.8, 1, light, { round: 0.6 });
    s.box([14, 27, 9.4], [12, 1.6, 0.8], 0.6, light);
    // Torons (pieux de palmier) qui dépassent de la façade.
    for (const x of [-20, -6, 8, 22]) s.cone([x, 21, 9], [x, 21.5, 13.5], 0.9, 0.7, pole);
    // Porte en bois et fenêtres à volets.
    const dx = column(1, 4);
    s.box([dx, 7.5, 10.4], [4.6, 7.5, 0.8], 0.5, door);
    s.box([dx, 15.5, 10.6], [5.4, 0.9, 0.9], 0.4, pole);
    for (const wx of [8, 20]) {
      s.box([wx, 13, 10.4], [3.2, 3.4, 0.6], 0.4, dark);
      s.box([wx, 13, 10.9], [3.6, 0.6, 0.5], 0.2, pole);
    }
    s.box([-11, 33, 5.7], [3, 3, 0.6], 0.4, dark);
    // Jarre devant la maison.
    s.ellipsoid([-20, 4, 13], [3.4, 4, 3.4], m('#a85a32', { gloss: true }));
  });
}

/** Case de Soins : murs blanchis à la chaux, toit et auvent verts, enseigne à la feuille (5 × 3 cases, porte au centre). */
export function soinsProp(): Prop {
  return sculpted('batiment:soins', (s, m) => {
    const lime = m('#eee6d6', { pattern: { kind: 'craquelures', color: '#d8ccb6', scale: 5, amount: 0.05 } });
    const green = m('#3d9a4c', { edge: true });
    const deep = m('#2a6a36');
    const door = planks(m, '#c8a060');
    const glass = m('#3a5a6a', { gloss: true });
    const white = m('#fbf8f0');
    s.box([0, 13, 0], [35, 13, 11], 1.4, lime);
    // Toit plat débordant, vert, coiffé d'un petit dôme.
    s.box([0, 28, 0], [37, 2.2, 13], 1, green);
    s.capped([0, 30, -2], [0, 35, -2], 8, 7, lime, { round: 1 });
    s.capped([0, 34.5, -2], [0, 40, -2], 7, 0.8, green, { round: 1.5 });
    // Bandeau vert au pied des murs.
    s.paint([0, 1.5, 11], [36, 1.8, 2], deep);
    // Auvent au-dessus de la porte, et enseigne sur le bord du toit : feuille verte dans un disque blanc.
    s.box([0, 19.5, 14], [10, 1, 4.5], 0.5, green, { rot: [0, 0, -12] });
    s.box([0, 27, 13.6], [7, 4, 1], 0.6, green);
    s.paint([0, 27, 14.4], [3.8, 3.4, 1.4], white);
    s.paint([0, 27, 14.8], [1.3, 2.6, 1.4], m('#2e8a3e'), [35, 0, 0]);
    s.box([0, 7.5, 11.4], [5, 7.5, 0.7], 0.5, door);
    // Fenêtres à volets verts de part et d'autre.
    for (const wx of [-22, 22]) {
      s.box([wx, 14, 11.3], [4, 4, 0.6], 0.4, glass);
      for (const side of [-1, 1]) s.box([wx + side * 6, 14, 11.5], [1.6, 4.4, 0.6], 0.3, green);
    }
    // Plantes en pot qui encadrent l'entrée.
    for (const px of [-11.5, 11.5]) {
      s.capped([px, 0, 14], [px, 5, 14], 2.6, 3.2, m('#b8603a'), { round: 0.6 });
      s.sphere([px, 8, 14], 3.6, m('#4ea83a', { fur: 1 }), { amp: 0.9, freq: 0.7 });
    }
  });
}

/** Marché couvert : murs ocre, auvent rayé orange et jaune, étal de fruits (4 × 3 cases, porte en 2e colonne). */
export function marcheProp(): Prop {
  return sculpted('batiment:marche', (s, m) => {
    const wall = banco(m, '#d49250');
    const awning = m('#e8742a', { pattern: { kind: 'rayures', color: '#f6d050', scale: 2.4, amount: 0.5, axis: 0 } });
    const door = planks(m, '#7a4a28');
    const board = wood(m, '#8a5a30');
    const straw = m('#d8b468', { pattern: { kind: 'rayures', color: '#b08a40', scale: 1.4, amount: 0.35, axis: 2 } });
    s.box([0, 12.5, 0], [28, 12.5, 10], 1.4, wall);
    // Toit de chaume à faible pente, débordant : la silhouette des halles de marché.
    s.box([0, 27.5, -1], [31, 3, 12.5], 2, straw, { amp: 0.5, freq: 0.8 });
    s.box([0, 31, -2], [27, 2, 9], 2, straw, { k: 2, amp: 0.5, freq: 0.8 });
    // Grand auvent rayé sur toute la façade, sur poteaux.
    s.box([0, 20, 16], [29, 1, 7.5], 0.5, awning, { rot: [0, 0, -24] });
    for (const x of [-27, 27]) s.cone([x, 0, 19], [x, 19, 19], 0.8, 0.7, board);
    const dx = column(1, 4);
    s.box([dx, 7.5, 10.4], [4.6, 7.5, 0.8], 0.5, door);
    // Enseigne à la calebasse au-dessus de la porte.
    s.box([dx, 17, 10.8], [5.5, 2.4, 0.6], 0.4, board);
    s.paint([dx, 17, 11.4], [2.4, 1.7, 1], m('#f0c040'));
    // Étal de fruits et de calebasses à droite de la porte.
    s.box([12, 5, 15], [10, 1, 4], 0.4, board);
    for (const x of [-10, 10]) s.cone([12 + x * 0.9, 0, 15], [12 + x * 0.9, 4.5, 15], 0.7, 0.6, board);
    const fruits: Array<[number, number, string]> = [[4, 14, '#e85a2a'], [7, 16.5, '#f0c040'], [10, 14, '#5fa83a'], [13, 16.5, '#e85a2a'], [16, 14, '#f0c040'], [19, 16, '#c83a3a']];
    for (const [x, z, c] of fruits) s.sphere([x, 7.2, z], 1.7, m(c, { gloss: true }));
  });
}

/** Sanctuaire du Hogon : façade de banco hérissée de torons et de trois tours (7 × 4 cases, porte au centre). */
export function sanctuaireProp(): Prop {
  return sculpted('batiment:sanctuaire', (s, m) => {
    const wall = banco(m, '#d8a676');
    const tower = banco(m, '#e2b484');
    const pole = m('#5a3a1e');
    const egg = m('#f6efe2', { gloss: true });
    const door = planks(m, '#5a3018');
    s.box([0, 17, -2], [50, 17, 14], 1.8, wall);
    // Créneaux arrondis le long du toit.
    for (let x = -46; x <= 46; x += 11.5) s.capped([x, 33, 11], [x, 39, 11], 2.4, 1.2, wall, { round: 0.8 });
    // Trois tours massives sur la façade.
    for (const [x, h] of [[-38, 40], [0, 50], [38, 40]] as const) {
      s.box([x, h / 2, 13], [7, h / 2, 5], 1.6, tower, { amp: 0.25, freq: 0.6 });
      s.capped([x, h - 0.5, 13], [x, h + 6, 13], 4.2, 1.2, tower, { round: 0.6 });
      s.sphere([x, h + 7, 13], 1.6, egg);
      for (let row = 0; row < Math.floor(h / 9); row++) {
        const y = 8 + row * 9;
        for (const off of [-4, 4]) s.cone([x + off, y, 17.5], [x + off, y + 0.4, 21.5], 0.8, 0.6, pole);
      }
    }
    // Grande porte sous la tour centrale, encadrée de banco clair.
    s.box([0, 10, 18.4], [6, 10, 0.8], 0.8, door);
    s.box([0, 21, 18.6], [7.5, 1.4, 0.8], 0.6, tower);
    // Petites fenêtres en meurtrière.
    for (const x of [-20, 20]) s.box([x, 20, 12.2], [1.4, 4, 0.6], 0.4, m('#2a1810'));
  });
}

// ── Meubles ──────────────────────────────────────────────────────────────

/** Lit en bois couvert d'un pagne coloré (une case de large, deux de long). */
export function litProp(): Prop {
  return sculpted('meuble:lit', (s, m) => {
    const frame = wood(m, '#7a4a28');
    s.box([0, 3, 0], [5.6, 3, 17], 0.8, frame);
    s.box([0, 7, 1], [5.2, 1.6, 15.5], 1.2, m('#2e6ab8', { pattern: { kind: 'rayures', color: '#f0c040', scale: 2.2, amount: 0.4, axis: 2 } }));
    s.ellipsoid([0, 8.5, -12.5], [4, 1.8, 3], m('#f4ecdc'));
    s.box([0, 7, -17], [5.6, 6, 1], 0.6, frame);
  });
}

/** Table basse en bois avec une calebasse et des bols. */
export function tableProp(): Prop {
  return sculpted('meuble:table', (s, m) => {
    const top = wood(m, '#8a5a30');
    s.box([0, 6, 0], [7, 1, 6], 0.5, top);
    for (const [x, z] of [[-5.5, -4.5], [5.5, -4.5], [-5.5, 4.5], [5.5, 4.5]] as const) s.cone([x, 0, z], [x, 6, z], 0.9, 0.8, top);
    s.ellipsoid([-2, 9, 0], [3, 2.6, 3], m('#e0b060', { gloss: true }));
    s.capped([3.5, 7, 1.5], [3.5, 8.5, 1.5], 1.8, 2.2, m('#c86a3a'), { round: 0.4 });
  });
}

/** Canari : grande jarre d'eau en terre cuite. */
export function jarreProp(): Prop {
  return sculpted('meuble:jarre', (s, m) => {
    const clay = m('#b86a3a', { gloss: true, pattern: { kind: 'rayures', color: '#8a4a28', scale: 2, amount: 0.15, axis: 1 } });
    s.ellipsoid([0, 6, 0], [5.6, 6, 5.6], clay);
    s.capped([0, 11, 0], [0, 13.5, 0], 2.8, 3.2, clay, { round: 0.4 });
    s.paint([0, 13.4, 0], [2.4, 0.5, 2.4], m('#28486a'));
  });
}

/** Étagère murale chargée de pots, de calebasses et de tissus. */
export function etagereProp(): Prop {
  return sculpted('meuble:etagere', (s, m) => {
    const board = wood(m, '#7a4a28');
    s.box([0, 11, 0], [7.4, 11, 3], 0.6, board);
    s.paint([0, 11, 3], [6.4, 10, 1.4], m('#4a2a16'));
    for (const y of [7, 14.5]) s.box([0, y, 1.5], [6.6, 0.5, 2.4], 0.2, board);
    s.ellipsoid([-3.5, 9.5, 2.4], [2, 2, 1.6], m('#e0b060', { gloss: true }));
    s.capped([1, 7.5, 2.4], [1, 11, 2.4], 1.5, 1.2, m('#5a8ac8'), { round: 0.4 });
    s.capped([4.2, 7.5, 2.4], [4.2, 10, 2.4], 1.6, 1.6, m('#c84a2a'), { round: 0.4 });
    s.box([-2.5, 16.5, 2], [3.2, 1.6, 1.6], 0.5, m('#e8b84a', { pattern: { kind: 'rayures', color: '#c8401a', scale: 1.4, amount: 0.4, axis: 0 } }));
    s.sphere([3.5, 16.8, 2.2], 1.8, m('#f0ead8'));
  });
}

/** Comptoir en bois recouvert d'un pagne (une case, se raccorde à ses voisins). */
export function comptoirProp(): Prop {
  return sculpted('meuble:comptoir', (s, m) => {
    const board = wood(m, '#8a5a30');
    s.box([0, 5.5, 0], [8.2, 5.5, 5], 0.4, board);
    s.box([0, 11.2, 0], [8.4, 0.8, 5.6], 0.3, m('#c8a060', { edge: true }));
    s.paint([0, 5.5, 5], [8.6, 2.6, 1], m('#2e7a8a', { pattern: { kind: 'rayures', color: '#f0c040', scale: 1.6, amount: 0.35, axis: 0 } }));
  });
}

/** Plante en pot. */
export function planteProp(): Prop {
  return sculpted('meuble:plante', (s, m) => {
    s.capped([0, 0, 0], [0, 6, 0], 3, 3.8, m('#b8603a'), { round: 0.6 });
    const leaf = m('#4ea83a', { fur: 1 });
    s.sphere([0, 10, 0], 4.2, leaf, { amp: 1, freq: 0.6 });
    s.sphere([-3, 13, 1], 2.8, leaf, { amp: 0.8, freq: 0.7 });
    s.sphere([3, 13.5, -0.5], 2.6, m('#6ac848', { fur: 1 }), { amp: 0.8, freq: 0.7 });
  });
}

/** Coffre de bois cerclé de métal. */
export function coffreProp(): Prop {
  return sculpted('meuble:coffre', (s, m) => {
    const board = planks(m, '#8a5028');
    s.box([0, 4.5, 0], [6.5, 4.5, 4.5], 0.6, board);
    s.box([0, 9.2, 0], [6.8, 0.8, 4.8], 0.5, m('#6a3a1a'));
    for (const x of [-4, 4]) s.box([x, 4.8, 4.6], [0.7, 4.8, 0.4], 0.2, m('#b0a080', { gloss: true }));
  });
}

/** Foyer de trois pierres et sa marmite. */
export function foyerProp(): Prop {
  return sculpted('meuble:foyer', (s, m) => {
    const stone = m('#8a8070');
    for (const [x, z] of [[-4.5, 3], [4.5, 3], [0, -4.5]] as const) s.sphere([x, 1.4, z], 1.8, stone, { amp: 0.3, freq: 0.8 });
    const iron = m('#2e2a2a', { gloss: true });
    s.ellipsoid([0, 6, 0], [4.6, 3.6, 4.6], iron);
    s.capped([0, 8.5, 0], [0, 10, 0], 3.4, 3.8, iron, { round: 0.4 });
    s.paint([0, 10, 0], [2.8, 0.5, 2.8], m('#c88a3a'));
  });
}

/** Étal intérieur : table basse chargée de marchandises. */
export function etalProp(): Prop {
  return sculpted('meuble:etal', (s, m) => {
    const board = wood(m, '#7a4a28');
    s.box([0, 4, 0], [7.4, 4, 5], 0.6, board);
    s.paint([0, 4, 5], [7.8, 2, 1], m('#c8401a', { pattern: { kind: 'rayures', color: '#f0c040', scale: 1.4, amount: 0.4, axis: 0 } }));
    const goods: Array<[number, number, string, number]> = [[-4, -2, '#e0b060', 2.2], [0, -2.5, '#f0c040', 1.6], [4, -2, '#e0b060', 2], [-3, 2, '#5fa83a', 1.6], [1, 2.2, '#e85a2a', 1.6], [4.5, 2, '#c8a0e0', 1.5]];
    for (const [x, z, c, r] of goods) s.sphere([x, 8 + r * 0.6, z], r, m(c, { gloss: true }));
  });
}

/** Statue d'ancêtre sculptée (sanctuaire). */
export function statueProp(): Prop {
  return sculpted('meuble:statue', (s, m) => {
    const ebony = m('#4a3022', { gloss: true });
    s.box([0, 1.5, 0], [4.5, 1.5, 4], 0.6, m('#8a8070'));
    s.capped([0, 3, 0], [0, 13, 0], 2.6, 2.2, ebony, { round: 0.6 });
    s.ellipsoid([0, 17, 0.5], [2.6, 3.6, 2.4], ebony);
    s.cone([0, 20, 0], [0, 24, -0.5], 2, 0.6, ebony, { k: 0.8 });
    for (const side of [-1, 1]) s.cone([side * 2.6, 11.5, 0.6], [side * 1.4, 6, 2.4], 0.9, 0.7, ebony, { k: 0.5 });
    s.paint([0, 17.5, 2.8], [1.8, 0.6, 0.8], m('#f0e0b0'));
  });
}

/** Brasero allumé (sanctuaire). */
export function braseroProp(): Prop {
  return sculpted('meuble:brasero', (s, m) => {
    const iron = m('#4a4040', { gloss: true });
    s.cone([0, 0, 0], [0, 7, 0], 1.2, 1, iron);
    s.capped([0, 7, 0], [0, 10, 0], 2.6, 4.2, iron, { round: 0.6 });
    s.paint([0, 10, 0], [3.4, 0.6, 3.4], m('#ff8a2a', { glow: true }));
  });
}

/**
 * Grande Jarre : un canari géant en terre cuite, cerclé de bandes peintes. Son ouverture
 * plonge dans un tourbillon magique (animé par-dessus, voir `jarVortex`) où se reposent
 * les Jinémon qui ne voyagent pas avec le joueur (une case).
 */
export function grandeJarreProp(): Prop {
  return sculpted('meuble:jarre-magique', (s, m) => {
    const clay = m('#b8643a', { pattern: { kind: 'craquelures', color: '#94482a', scale: 4, amount: 0.05 } });
    s.ellipsoid([0, 9.5, 0], [8.6, 9.6, 8.6], clay);
    s.capped([0, 16.5, 0], [0, 20, 0], 5.6, 6.6, clay, { round: 0.6, k: 1.2 });
    s.capped([0, 19.4, 0], [0, 20.6, 0], 7.2, 7.2, m('#a85430'), { round: 0.6 });
    // Bandes peintes : ocre clair, puis une frise sombre ponctuée de vert et de violet.
    s.paint([0, 5, 0], [9.4, 1, 9.4], m('#e8a868'));
    s.paint([0, 12.4, 0], [9.6, 1.5, 9.6], m('#3a1a14'));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      s.paint([Math.cos(a) * 8.4, 12.4, Math.sin(a) * 8.4], [1.2, 1, 1.2], m(i % 2 ? '#9a5ae8' : '#4ad888'));
    }
    // L'ouverture, sombre : le tourbillon y est dessiné à part, pour pouvoir tourner.
    s.paint([0, 20.8, 0], [6, 0.7, 6], m('#1a0a24'));
  });
}

/** Stand de soins en plein air : tréteaux, auvent vert à la feuille, herbes et calebasses (une case). */
export function standSoinsProp(): Prop {
  return sculpted('stand:soins', (s, m) => {
    const board = wood(m, '#7a4a28');
    const cloth = m('#3d9a4c', { pattern: { kind: 'rayures', color: '#f0f0e0', scale: 3, amount: 0.3, axis: 0 } });
    for (const x of [-6.5, 6.5]) for (const z of [-3, 3]) s.cone([x, 0, z], [x, 15, z], 0.7, 0.6, board);
    s.box([0, 6, 0], [7.5, 1, 4], 0.4, board);
    s.paint([0, 5, 4], [7.8, 1.5, 0.8], m('#f0ead8'));
    s.ellipsoid([-4, 8.4, 0], [2.2, 2, 2], m('#e0b060', { gloss: true }));
    s.capped([0.5, 7, 1], [0.5, 9.5, 1], 1.4, 1.2, m('#c86a3a'), { round: 0.4 });
    s.sphere([4, 8.4, 0], 1.8, m('#4ea83a', { fur: 1 }), { amp: 0.6, freq: 0.8 });
    s.box([0, 15.5, 0.5], [8.5, 0.6, 5], 0.3, cloth, { rot: [0, 0, -14] });
    s.box([0, 18, -3.8], [3.5, 2.2, 0.5], 0.4, m('#3d9a4c', { edge: true }));
    s.paint([0, 18, -3.2], [1.6, 1.6, 0.8], m('#fbf8f0'));
  });
}
