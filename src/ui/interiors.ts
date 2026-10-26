// Rendu des intérieurs : murs enduits, sols, nattes, escaliers, comptoirs et meubles.
//
// Légende des tuiles d'intérieur :
//   W  mur            n  fenêtre        q  tenture ou masque au mur   b  étagère (contre le mur)
//   _  sol            r  natte          e  escalier qui monte         y  escalier qui descend
//   x  seuil (sortie) c  comptoir       l  lit (deux cases en hauteur)
//   t  table basse    j  canari (jarre) p  plante        k  coffre    f  foyer et marmite
//   h  étal           u  statue         v  brasero       A  autel
//   g  Grande Jarre (on y range et échange ses Jinémon)
import type { InteriorStyle, Zone } from '../data/zones';
import {
  braseroProp,
  coffreProp,
  etagereProp,
  etalProp,
  foyerProp,
  grandeJarreProp,
  jarreProp,
  litProp,
  planteProp,
  statueProp,
  tableProp,
} from './buildings';
import { altarProp, type Prop } from './props';
import { shiftColor } from './sculpt';
import { TILE, css, groundShadow, hash, patch, pixels, place, stamp, tones, type ZoneLayers } from './tiles';

interface Style {
  wall: string;
  /** Plinthe au pied du mur. */
  base: string;
  /** Frise en haut du mur. */
  frieze: string;
  floor: 'terre' | 'carreaux' | 'planches' | 'dalles';
  floorColor: string;
}

const STYLES: Record<InteriorStyle, Style> = {
  maison: { wall: '#d49a68', base: '#8a5030', frieze: '#6a3a1e', floor: 'terre', floorColor: '#b88a5a' },
  soins: { wall: '#eee6d6', base: '#3d9a4c', frieze: '#3d9a4c', floor: 'carreaux', floorColor: '#e6dfcb' },
  marche: { wall: '#e0a060', base: '#8a4a28', frieze: '#c8401a', floor: 'planches', floorColor: '#a8743e' },
  sanctuaire: { wall: '#a85a3a', base: '#5a2a18', frieze: '#f0e0c0', floor: 'dalles', floorColor: '#9a8a78' },
};

/** Tuiles qui font partie du mur du fond (fenêtres, tentures, étagères posées contre lui). */
const WALLISH = new Set(['W', 'n', 'q', 'b']);

const FURNITURE: Record<string, () => Prop> = {
  t: tableProp,
  j: jarreProp,
  p: planteProp,
  k: coffreProp,
  f: foyerProp,
  h: etalProp,
  u: statueProp,
  v: braseroProp,
  A: altarProp,
  b: etagereProp,
  g: grandeJarreProp,
};

export function renderInteriorLayers(zone: Zone, tileAt: (x: number, y: number) => string): ZoneLayers {
  const style = STYLES[zone.interior ?? 'maison'];
  const h = zone.map.length;
  const w = zone.map[0].length;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = w * TILE;
    c.height = h * TILE;
    return c;
  };
  const baseCanvas = make();
  const overCanvas = make();
  const base = baseCanvas.getContext('2d')!;
  const over = overCanvas.getContext('2d')!;
  base.imageSmoothingEnabled = false;
  over.imageSmoothingEnabled = false;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '' : tileAt(x, y));
  const wallish = (x: number, y: number) => WALLISH.has(at(x, y));

  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      const x = tx * TILE;
      const y = ty * TILE;
      if (WALLISH.has(ch)) {
        // Face du mur si le sol commence juste dessous (ou deux cases plus bas) ; sinon, dessus du mur.
        const below = at(tx, ty + 1);
        if (below !== '' && !wallish(tx, ty + 1)) wallFace(base, x, y, style, 'bas', tx);
        else if (below !== '' && at(tx, ty + 2) !== '' && !wallish(tx, ty + 2)) wallFace(base, x, y, style, 'haut', tx);
        else wallTop(base, x, y, at(tx, ty - 1) === 'x', !wallish(tx - 1, ty) && at(tx - 1, ty) !== '', !wallish(tx + 1, ty) && at(tx + 1, ty) !== '', !wallish(tx, ty - 1) && at(tx, ty - 1) !== '');
        if (ch === 'n') windowOn(base, x, y);
        if (ch === 'q') hangingOn(base, x, y, zone.interior ?? 'maison', tx);
        continue;
      }
      floor(base, x, y, style, tx, ty);
      // Ombre du mur du fond sur le sol.
      if (wallish(tx, ty - 1)) {
        base.fillStyle = 'rgba(40, 20, 8, 0.28)';
        base.fillRect(x, y, TILE, 3);
        base.fillStyle = 'rgba(40, 20, 8, 0.14)';
        base.fillRect(x, y + 3, TILE, 2);
      }
      if (ch === 'r') mat(base, x, y, at(tx, ty - 1) !== 'r', at(tx, ty + 1) !== 'r', at(tx - 1, ty) !== 'r', at(tx + 1, ty) !== 'r');
      else if (ch === 'x') doormat(base, x, y);
      else if (ch === 'e') stairs(base, x, y, true);
      else if (ch === 'y') stairs(base, x, y, false);
      else if (ch === 'c') counter(base, over, x, y, at(tx - 1, ty) !== 'c', at(tx + 1, ty) !== 'c');
    }
  }

  // Meubles, du fond vers l'avant.
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const ch = at(tx, ty);
      const x = tx * TILE + 8;
      const y = ty * TILE + 12;
      const split = ty * TILE;
      if (ch === 'l' && at(tx, ty - 1) !== 'l') {
        groundShadow(base, x + 1, (ty + 1) * TILE + 12, 7, 3);
        place(base, over, litProp(), x, (ty + 2) * TILE - 3, split);
        continue;
      }
      const make = FURNITURE[ch];
      if (!make) continue;
      if (ch !== 'b') groundShadow(base, x + 1, y + 1, ch === 'h' || ch === 't' || ch === 'g' ? 8 : 6, 2);
      place(base, over, make(), x, ch === 'b' ? ty * TILE + 15 : y, split);
    }
  }
  return { base: baseCanvas, over: overCanvas };
}

/** Face d'un mur enduit : moitié haute avec la frise, moitié basse avec la plinthe. */
function wallFace(ctx: CanvasRenderingContext2D, x: number, y: number, s: Style, part: 'haut' | 'bas', tx: number): void {
  const t = tones(s.wall);
  pixels(ctx, x, y, (wx, wy) => {
    const ly = wy - y;
    if (part === 'haut' && ly < 2) return ly === 0 ? [30, 18, 10] : shiftColor(s.frieze, -0.1);
    if (part === 'haut' && ly < 5) return shiftColor(s.frieze, (ly === 2 ? 0.08 : 0) - ((wx + ly) % 6 === 0 ? 0.15 : 0));
    if (part === 'bas' && ly >= 13) return ly === 15 ? shiftColor(s.base, -0.25) : shiftColor(s.base, ly === 13 ? 0.1 : 0);
    const v = patch(wx, wy, 0.12, 31);
    return v > 0.38 ? t[0] : v > -0.42 ? t[1] : t[2];
  });
  // Motif de la frise : triangles (sanctuaire), losanges (marché), simple filet ailleurs.
  if (part === 'haut' && s.floor === 'dalles') {
    for (let i = 0; i < 4; i++) stamp(ctx, ['.c.', 'ccc'], x + i * 4, y + 5, { c: css(shiftColor(s.frieze, 0)) });
  } else if (part === 'haut' && s.floor === 'planches') {
    for (let i = 0; i < 2; i++) stamp(ctx, ['.c.', 'c.c', '.c.'], x + 2 + i * 8 + (tx % 2), y + 5, { c: '#f0c040' });
  }
}

/** Dessus d'un mur vu d'en haut (bords de la pièce) ; sous le seuil, l'ouverture lumineuse de la porte. */
function wallTop(ctx: CanvasRenderingContext2D, x: number, y: number, doorway: boolean, w: boolean, e: boolean, n: boolean): void {
  if (doorway) {
    for (let i = 0; i < TILE; i++) {
      ctx.fillStyle = css(shiftColor('#f6dca0', -i * 0.03));
      ctx.fillRect(x + 1, y + i, TILE - 2, 1);
    }
    ctx.fillStyle = '#3a2214';
    ctx.fillRect(x, y, 1, TILE);
    ctx.fillRect(x + TILE - 1, y, 1, TILE);
    return;
  }
  ctx.fillStyle = '#24160c';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#4a2e1a';
  if (w) ctx.fillRect(x, y, 2, TILE);
  if (e) ctx.fillRect(x + TILE - 2, y, 2, TILE);
  if (n) ctx.fillRect(x, y, TILE, 2);
}

function floor(ctx: CanvasRenderingContext2D, x: number, y: number, s: Style, tx: number, ty: number): void {
  const t = tones(s.floorColor);
  switch (s.floor) {
    case 'terre':
      pixels(ctx, x, y, (wx, wy) => {
        const v = patch(wx, wy, 0.1, 41);
        return v > 0.42 ? t[0] : v > -0.36 ? t[1] : t[2];
      });
      break;
    case 'carreaux': {
      // Carreaux crème et vert pâle, joints fins.
      const alt = tones('#d6e6cc');
      pixels(ctx, x, y, (wx, wy) => {
        if (wx % 8 === 0 || wy % 8 === 0) return t[2];
        const cell = (Math.floor(wx / 8) + Math.floor(wy / 8)) % 2;
        const shine = (wx % 8) + (wy % 8) < 3 ? 0 : 1;
        return (cell ? alt : t)[shine];
      });
      break;
    }
    case 'planches':
      pixels(ctx, x, y, (wx, wy) => {
        const board = Math.floor(wy / 4);
        if (wy % 4 === 3) return t[3];
        const seam = (wx + board * 7) % 24 === 0;
        if (seam) return t[2];
        const grain = patch(wx * 0.5, wy * 3, 0.3, 51 + board);
        return grain > 0.35 ? t[0] : grain < -0.4 ? t[2] : t[1];
      });
      break;
    case 'dalles':
      pixels(ctx, x, y, (wx, wy) => {
        const jx = (wx + Math.floor(wy / 8) * 5) % 10;
        if (wy % 8 === 0 || jx === 0) return t[3];
        const v = patch(wx, wy, 0.14, 61);
        return v > 0.4 ? t[0] : v > -0.3 ? t[1] : t[2];
      });
      break;
  }
  if (s.floor === 'terre' && hash(tx, ty, 3) > 0.8) {
    stamp(ctx, ['hs', 'sd'], x + 3 + Math.floor(hash(tx, ty, 4) * 9), y + 3 + Math.floor(hash(ty, tx, 5) * 9), { h: css(t[0]), s: css(t[2]), d: css(t[3]) });
  }
}

/** Natte tressée, bordée d'un liseré rouge et noir sur ses bords. */
function mat(ctx: CanvasRenderingContext2D, x: number, y: number, n: boolean, s: boolean, w: boolean, e: boolean): void {
  const t = tones('#d8b468');
  pixels(ctx, x, y, (wx, wy) => {
    const lx = wx - x;
    const ly = wy - y;
    const edge = (n && ly < 2) || (s && ly > 13) || (w && lx < 2) || (e && lx > 13);
    if (edge) return (lx + ly) % 4 < 2 ? [176, 52, 30] : [44, 26, 16];
    const weave = (Math.floor(wx / 2) + Math.floor(wy / 2)) % 2;
    return weave ? t[0] : (wx + wy) % 4 === 0 ? t[2] : t[1];
  });
}

/** Paillasson rouge devant la porte de sortie. */
function doormat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#7a2a18';
  ctx.fillRect(x + 1, y + 4, TILE - 2, 11);
  ctx.fillStyle = '#b8402a';
  ctx.fillRect(x + 2, y + 5, TILE - 4, 9);
  ctx.fillStyle = '#e0a040';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 3, y + 7 + i * 3, TILE - 6, 1);
}

/** Escalier de bois : il monte vers le mur du fond, ou descend dans une trémie sombre. */
function stairs(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean): void {
  ctx.fillStyle = '#2a180c';
  ctx.fillRect(x, y, TILE, TILE);
  for (let i = 0; i < 4; i++) {
    // En montant, les marches du haut sont plus claires (éclairées) ; en descendant, elles s'enfoncent dans l'ombre.
    const k = up ? 0.12 - i * 0.07 : -0.25 + i * 0.1;
    const sy = y + (up ? i * 4 : 15 - (i + 1) * 4);
    ctx.fillStyle = css(shiftColor('#a8743e', k));
    ctx.fillRect(x + 2, sy, TILE - 4, 3);
    ctx.fillStyle = css(shiftColor('#a8743e', k - 0.25));
    ctx.fillRect(x + 2, sy + 3, TILE - 4, 1);
  }
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x, y, 2, TILE);
  ctx.fillRect(x + TILE - 2, y, 2, TILE);
}

/** Comptoir de bois : plateau clair (qui passe devant les personnages derrière) et façade tendue d'un pagne. */
function counter(base: CanvasRenderingContext2D, over: CanvasRenderingContext2D, x: number, y: number, left: boolean, right: boolean): void {
  const top = tones('#c8a060');
  const front = tones('#8a5a30');
  pixels(base, x, y, (wx, wy) => {
    const ly = wy - y;
    if (ly < 7) return ly === 0 ? top[3] : ly === 6 ? top[2] : top[(wx + ly) % 9 === 0 ? 2 : ly < 2 ? 0 : 1];
    if (ly >= 9 && ly <= 11) return (wx >> 1) % 2 ? [46, 122, 138] : [240, 192, 64];
    return ly === 15 ? front[3] : front[(wx % 5 === 0) ? 2 : 1];
  });
  // Le plateau se raccorde aux voisins ; aux extrémités, un montant plus sombre.
  base.fillStyle = css(front[3]);
  if (left) base.fillRect(x, y, 1, TILE);
  if (right) base.fillRect(x + TILE - 1, y, 1, TILE);
  // Rebord du plateau sur la couche du dessus : les personnages derrière le comptoir y sont à demi cachés.
  over.fillStyle = css(top[1]);
  over.fillRect(x, y - 2, TILE, 2);
  over.fillStyle = css(top[0]);
  over.fillRect(x, y - 2, TILE, 1);
}

function windowOn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(x + 3, y + 1, 10, 10);
  ctx.fillStyle = '#9ad0f0';
  ctx.fillRect(x + 4, y + 2, 8, 8);
  ctx.fillStyle = '#d8f0ff';
  ctx.fillRect(x + 4, y + 2, 8, 3);
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(x + 7, y + 2, 2, 8);
  ctx.fillRect(x + 4, y + 6, 8, 1);
  // Volets entrouverts.
  ctx.fillStyle = '#3d9a4c';
  ctx.fillRect(x + 1, y + 1, 2, 10);
  ctx.fillRect(x + 13, y + 1, 2, 10);
}

/** Tenture en pagne, ou masque sculpté (sanctuaire). */
function hangingOn(ctx: CanvasRenderingContext2D, x: number, y: number, style: InteriorStyle, tx: number): void {
  if (style === 'sanctuaire') {
    stamp(ctx, [
      '..wwwww..',
      '.wwwwwww.',
      '.wkkwkkw.',
      '.wwwwwww.',
      '..wwrww..',
      '..wwwww..',
      '...w.w...',
      '...w.w...',
    ], x + 3, y + 2, { w: tx % 4 === 1 ? '#e8e0d0' : '#c8401a', k: '#140c08', r: '#3a2a20' });
    return;
  }
  // Pagne tendu sur une baguette, à pois dorés.
  const cloth = ['#2e6ab8', '#c8401a', '#3d9a4c'][tx % 3];
  const hem = css(shiftColor(cloth, -0.12));
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(x + 2, y + 1, 12, 1);
  for (let ly = 0; ly < 10; ly++) {
    for (let lx = 0; lx < 10; lx++) {
      ctx.fillStyle = (lx + ly * 2) % 5 === 0 ? '#f0c040' : ly > 7 ? hem : cloth;
      ctx.fillRect(x + 3 + lx, y + 2 + ly, 1, 1);
    }
  }
}

