// Sprites pixel art : Jinémon (sculptés en volume, voir creatures.ts) et personnages (dessinés à la main).
import type { CharacterLook } from '../data/trainers';
import type { Dir } from '../data/zones';
import { renderCreature, type Pose } from './creatures';
import { shade } from './draw';

export { shade };

// ── Jinémon ──────────────────────────────────────────────────────────────

const creatureCache = new Map<string, HTMLCanvasElement>();

function tint(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Sprite d'un Jinémon, carré de `size` pixels : de trois quarts face (tourné vers la gauche) ou de dos. */
export function creatureSprite(speciesId: number, size = 64, variant: 'normal' | 'silhouette' | 'blanc' = 'normal', pose: Pose = 'face'): HTMLCanvasElement {
  const key = `${speciesId}:${size}:${variant}:${pose}`;
  const cached = creatureCache.get(key);
  if (cached) return cached;
  let canvas: HTMLCanvasElement;
  if (variant !== 'normal') {
    canvas = tint(creatureSprite(speciesId, size, 'normal', pose), variant === 'silhouette' ? '#201828' : '#ffffff');
  } else {
    const img = renderCreature(speciesId, size, pose);
    canvas = document.createElement('canvas');
    canvas.width = img.w;
    canvas.height = img.h;
    canvas.getContext('2d')!.putImageData(new ImageData(img.rgba, img.w, img.h), 0, 0);
  }
  creatureCache.set(key, canvas);
  return canvas;
}

/** Prépare à l'avance des sprites (pendant les temps morts) pour éviter les saccades. */
export function prewarmCreatures(requests: Array<[speciesId: number, size: number, pose?: Pose]>): void {
  const queue = requests.filter(([id, size, pose]) => !creatureCache.has(`${id}:${size}:normal:${pose ?? 'face'}`));
  const step = () => {
    const next = queue.shift();
    if (!next) return;
    creatureSprite(next[0], next[1], 'normal', next[2] ?? 'face');
    setTimeout(step, 16);
  };
  setTimeout(step, 16);
}

/** Dessine un Jinémon dont (x, y) est le point au sol. `back` le montre de dos (côté joueur en combat). */
export function drawCreature(
  ctx: CanvasRenderingContext2D,
  speciesId: number,
  x: number,
  y: number,
  size = 64,
  opts: { flip?: boolean; back?: boolean; silhouette?: boolean; alpha?: number; white?: number; scale?: number } = {},
): void {
  const scale = opts.scale ?? 1;
  const w = size * scale;
  const left = Math.round(x - w / 2);
  const top = Math.round(y - w + 2 * scale);
  const pose: Pose = opts.back ? 'dos' : 'face';
  const blit = (img: HTMLCanvasElement, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (opts.flip) {
      ctx.translate(left + w, top);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, w);
    } else {
      ctx.drawImage(img, left, top, w, w);
    }
    ctx.restore();
  };
  blit(creatureSprite(speciesId, size, opts.silhouette ? 'silhouette' : 'normal', pose), opts.alpha ?? 1);
  if (opts.white && opts.white > 0) blit(creatureSprite(speciesId, size, 'blanc', pose), Math.min(1, opts.white));
}

// ── Personnages (16×24, dessinés à la main) ──────────────────────────────

/** L'Initié : boubou indigo et chapeau conique peul. */
export const PLAYER_LOOK: CharacterLook = { skin: '#8a5434', outfit: '#2c4c94', accent: '#f0c040', headwear: 'chapeau' };

type Facing = 'bas' | 'haut' | 'gauche';

const HEAD: Record<Facing, string[]> = {
  bas: [
    '................',
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHhhHHHHO...',
    '...OHHHHHHHHO...',
    '...OHSSSSSSHO...',
    '...OSSSSSSSSO...',
    '...OSSESSESSO...',
    '...OSSESSESSO...',
    '....OSSSSSSO....',
    '.....OSssSO.....',
  ],
  haut: [
    '................',
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHhhHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '....OHHHHHHO....',
    '.....OsSSsO.....',
  ],
  gauche: [
    '................',
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHhhHHHO...',
    '...OHHHHHHHHO...',
    '...OSSSSHHHHO...',
    '..OSSSSSSHHHO...',
    '..OSESSSSSHHO...',
    '..OSESSSSSSHO...',
    '...OSSSSSSSO....',
    '....OOsSSsO.....',
  ],
};

const BODY: Record<Facing, string[]> = {
  bas: [
    '....OOCCCCOO....',
    '...OCCCAACCCO...',
    '..OSOLCAACCOSO..',
    '..OSOLCAACCOSO..',
    '..OSOCCAACCOSO..',
    '..OOOCCCCCCOOO..',
    '...OCCCCCCCCO...',
    '...OccccccccO...',
  ],
  haut: [
    '....OOCCCCOO....',
    '...OCCCCCCCCO...',
    '..OSOCCCCCLOSO..',
    '..OSOCCCCCLOSO..',
    '..OSOCCCCCCOSO..',
    '..OOOAAAAAAOOO..',
    '...OCCCCCCCCO...',
    '...OccccccccO...',
  ],
  gauche: [
    '....OOCCCCO.....',
    '...OCCCCCCCO....',
    '...OLCCCCCCO....',
    '...OLCOSOCCO....',
    '...OCCOSOCCO....',
    '...OCCCOCCCO....',
    '...OCCCCCCCO....',
    '...OcccccccO....',
  ],
};

const LEGS: Record<Facing, string[][]> = {
  bas: [
    ['....OPPOOPPO....', '....OPPOOPPO....', '....OFFOOFFO....', '.....OO..OO.....'],
    ['....OPPOOPPO....', '....OPPO.OPPO...', '....OFFO.OFFO...', '.....OO...OO....'],
    ['....OPPOOPPO....', '...OPPO.OPPO....', '...OFFO.OFFO....', '....OO...OO.....'],
  ],
  haut: [
    ['....OPPOOPPO....', '....OPPOOPPO....', '....OFFOOFFO....', '.....OO..OO.....'],
    ['....OPPOOPPO....', '....OPPO.OPPO...', '....OFFO.OFFO...', '.....OO...OO....'],
    ['....OPPOOPPO....', '...OPPO.OPPO....', '...OFFO.OFFO....', '....OO...OO.....'],
  ],
  gauche: [
    ['....OPPPPO......', '....OPPPPO......', '...OFFFFFO......', '....OOOOO.......'],
    ['...OPPOOPPO.....', '..OPPO..OPPO....', '.OFFFO..OFFO....', '..OOO....OO.....'],
    ['...OPPOOPPO.....', '...OPPOOPPO.....', '..OFFFOOFFFO....', '...OOO..OOO.....'],
  ],
};

const HATS: Record<NonNullable<CharacterLook['headwear']>, Partial<Record<Facing, string[]>>> = {
  chapeau: {
    bas: ['.......OO.......', '......OYYO......', '.....OYYyYO.....', '....OYYYYyyO....', '..OOYYYYYYyyOO..', '.OYYAAAAAAAAyyO.', '..OOOOOOOOOOOO..'],
    haut: ['.......OO.......', '......OYYO......', '.....OYYyYO.....', '....OYYYYyyO....', '..OOYYYYYYyyOO..', '.OYYYYYYYYYYyyO.', '..OOOOOOOOOOOO..'],
    gauche: ['......OO........', '.....OYYO.......', '....OYYyYO......', '...OYYYYyyO.....', '.OOYYYYYYyyOO...', 'OYYAAAAAAAAyyO..', '.OOOOOOOOOOOO...'],
  },
  foulard: {
    bas: ['................', '.......OO.......', '.....OOAAOO.....', '....OAAAAaaO....', '...OAaAAAAaAO...', '...OAAAAAAAAO...'],
    haut: ['................', '.......OO.......', '.....OOAAOO.....', '....OAAAAaaO....', '...OAaAAAAaAO...', '...OAAAAAAAAO...'],
    gauche: ['................', '...........OO...', '.....OOOOOOAAO..', '....OAAAAaaAAO..', '...OAAaAAAAaAO..', '...OAAAAAAAAO...'],
  },
  bonnet: {
    bas: ['................', '................', '.....OOOOOO.....', '....OAAAAAAO....', '...OAAaAAAAAO...', '...OaaaaaaaaO...'],
    haut: ['................', '................', '.....OOOOOO.....', '....OAAAAAAO....', '...OAAaAAAAAO...', '...OaaaaaaaaO...'],
    gauche: ['................', '................', '.....OOOOOO.....', '....OAAAAAAO....', '...OAAaAAAAAO...', '...OaaaaaaaaO...'],
  },
  turban: {
    bas: ['................', '....OOOOOOOO....', '...OAAAAaAAAO...', '..OAaAAAAAaAAO..', '..OAAAaAAAAAaO..', '...OAAAAAAAAO...'],
    haut: ['................', '....OOOOOOOO....', '...OAAAAaAAAO...', '..OAaAAAAAaAAO..', '..OAAAaAAAAAaO..', '...OAAAAAAAAO...'],
    gauche: ['................', '....OOOOOOOO....', '...OAAAAaAAAO...', '..OAaAAAAAaAAO..', '..OAAAaAAAAAaO..', '...OAAAAAAAAO...'],
  },
  masque: {
    bas: [
      '......OOOO......',
      '......OMMO......',
      '....OOOMMOOO....',
      '...OMMMMMMMMO...',
      '...OMMmMMmMMO...',
      '...OMMMMMMMMO...',
      '...OMMMMMMMMO...',
      '...OMOOMMOOMO...',
      '...OMMMMMMMMO...',
      '...OMMMmmMMMO...',
      '....OMMMMMMO....',
      '.....OAAAAO.....',
    ],
    gauche: [
      '......OOOO......',
      '......OMMO......',
      '....OOOMMOOO....',
      '...OMMMMMMMMO...',
      '..OMMmMMMMMMO...',
      '..OMMMMMMMMMO...',
      '..OMMMMMMMMMO...',
      '..OMOOMMMMMMO...',
      '..OMMMMMMMMMO...',
      '...OMmmMMMMO....',
      '....OMMMMMO.....',
      '.....OAAAAO.....',
    ],
  },
};

const charCache = new Map<string, HTMLCanvasElement>();

function overlay(base: string[], top: string[] | undefined): string[] {
  if (!top) return base;
  return base.map((row, y) => {
    const t = top[y];
    if (!t) return row;
    return row
      .split('')
      .map((c, x) => (t[x] && t[x] !== '.' ? t[x] : c))
      .join('');
  });
}

/** Sprite de personnage 16×24 ; `frame` 0 = immobile, 1 et 2 = pas alternés. */
export function characterSprite(look: CharacterLook, dir: Dir, frame: number): HTMLCanvasElement {
  const key = `${look.skin}${look.outfit}${look.accent}${look.headwear}:${dir}:${frame}`;
  const cached = charCache.get(key);
  if (cached) return cached;
  const facing: Facing = dir === 'bas' ? 'bas' : dir === 'haut' ? 'haut' : 'gauche';
  const head = overlay(HEAD[facing], look.headwear ? HATS[look.headwear][facing] : undefined);
  const rows = [...head, ...BODY[facing], ...LEGS[facing][frame % 3]];
  const pal: Record<string, string> = {
    O: '#20140c',
    S: look.skin,
    s: shade(look.skin, -0.25),
    H: '#1c1412',
    h: '#4a3a34',
    E: '#140c08',
    C: look.outfit,
    c: shade(look.outfit, -0.28),
    L: shade(look.outfit, 0.28),
    A: look.accent,
    a: shade(look.accent, -0.28),
    P: shade(look.outfit, -0.5),
    F: '#5a3a22',
    Y: '#e8c070',
    y: '#b08840',
    M: '#9a6438',
    m: '#5a3a20',
  };
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const c = pal[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(dir === 'droite' ? 15 - x : x, y, 1, 1);
    }
  });
  charCache.set(key, canvas);
  return canvas;
}
