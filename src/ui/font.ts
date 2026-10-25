// Police bitmap pixel « Ginémon » : majuscules de 7 px, minuscules de 5 px,
// accents français composés automatiquement. Chaque glyphe est une grille de '#'.
//
// Cellule de 11 lignes : 0-1 accents des majuscules, 2-8 corps, 9-10 jambages.

export const LINE_H = 12;
const CELL_H = 11;

interface Glyph {
  w: number;
  top: number;
  rows: string[];
}

const GLYPHS = new Map<string, Glyph>();

function def(ch: string, top: number, rows: string[]): void {
  GLYPHS.set(ch, { w: rows.length ? rows[0].length : 0, top, rows });
}

// ── Majuscules ────────────────────────────────────────────────────────────
const CAPS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['.###', '...#', '...#', '...#', '#..#', '#..#', '.##.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  Œ: ['.######', '#..#...', '#..#...', '#..####', '#..#...', '#..#...', '.######'],
};
for (const [ch, rows] of Object.entries(CAPS)) def(ch, 2, rows);

// ── Minuscules ────────────────────────────────────────────────────────────
// x-height (5 lignes à partir de la ligne 4)
const SMALL: Record<string, string[]> = {
  a: ['.##.', '...#', '.###', '#..#', '.###'],
  c: ['.###', '#...', '#...', '#...', '.###'],
  e: ['.##.', '#..#', '####', '#...', '.###'],
  m: ['####.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['###.', '#..#', '#..#', '#..#', '#..#'],
  o: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  r: ['#.##', '##..', '#...', '#...', '#...'],
  s: ['.###', '#...', '.##.', '...#', '###.'],
  u: ['#..#', '#..#', '#..#', '#..#', '.###'],
  v: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  w: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['#..#', '#..#', '.##.', '#..#', '#..#'],
  z: ['####', '...#', '.##.', '#...', '####'],
  ı: ['#', '#', '#', '#', '#'],
  œ: ['.##.##.', '#..#..#', '#..####', '#..#...', '.##.###'],
};
for (const [ch, rows] of Object.entries(SMALL)) def(ch, 4, rows);

// Hampes montantes (7 lignes à partir de la ligne 2)
const TALL: Record<string, string[]> = {
  b: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'],
  d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
  f: ['.##', '#..', '###', '#..', '#..', '#..', '#..'],
  h: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'],
  i: ['#', '.', '#', '#', '#', '#', '#'],
  k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
  l: ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
};
for (const [ch, rows] of Object.entries(TALL)) def(ch, 2, rows);
def('t', 3, ['.#.', '###', '.#.', '.#.', '.#.', '..#']);

// Jambages descendants
def('g', 4, ['.###', '#..#', '#..#', '#..#', '.###', '...#', '###.']);
def('p', 4, ['###.', '#..#', '#..#', '#..#', '###.', '#...', '#...']);
def('q', 4, ['.###', '#..#', '#..#', '#..#', '.###', '...#', '...#']);
def('y', 4, ['#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.']);
def('j', 2, ['.#', '..', '.#', '.#', '.#', '.#', '.#', '.#', '#.']);

// ── Chiffres ──────────────────────────────────────────────────────────────
const DIGITS: Record<string, string[]> = {
  '0': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  '2': ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  '3': ['###.', '...#', '...#', '.##.', '...#', '...#', '###.'],
  '4': ['#..#', '#..#', '#..#', '####', '...#', '...#', '...#'],
  '5': ['####', '#...', '#...', '###.', '...#', '...#', '###.'],
  '6': ['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'],
  '7': ['####', '...#', '...#', '..#.', '..#.', '.#..', '.#..'],
  '8': ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'],
  '9': ['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'],
};
for (const [ch, rows] of Object.entries(DIGITS)) def(ch, 2, rows);

// ── Ponctuation et symboles ───────────────────────────────────────────────
GLYPHS.set(' ', { w: 3, top: 0, rows: [] });
def('.', 8, ['#']);
def(',', 8, ['.#', '#.']);
def(':', 5, ['#', '.', '.', '#']);
def(';', 5, ['.#', '..', '..', '.#', '#.']);
def('!', 2, ['#', '#', '#', '#', '#', '.', '#']);
def('?', 2, ['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..']);
def("'", 2, ['#', '#']);
def('’', 2, ['.#', '#.']);
def('"', 2, ['#.#', '#.#']);
def('-', 6, ['###']);
def('–', 6, ['####']);
def('—', 6, ['######']);
def('_', 9, ['####']);
def('(', 2, ['.#', '#.', '#.', '#.', '#.', '#.', '#.', '.#']);
def(')', 2, ['#.', '.#', '.#', '.#', '.#', '.#', '.#', '#.']);
def('/', 2, ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..']);
def('%', 2, ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##']);
def('+', 5, ['.#.', '###', '.#.']);
def('=', 5, ['####', '....', '####']);
def('×', 5, ['#.#', '.#.', '#.#']);
def('…', 8, ['#.#.#']);
def('«', 5, ['.#.#', '#.#.', '.#.#']);
def('»', 5, ['#.#.', '.#.#', '#.#.']);
def('°', 2, ['###', '#.#', '###']);
def('·', 6, ['#']);
def('◄', 2, ['...#', '..##', '.###', '####', '.###', '..##', '...#']);
def('►', 2, ['#...', '##..', '###.', '####', '###.', '##..', '#...']);
def('▲', 4, ['..#..', '.###.', '#####']);
def('▼', 4, ['#####', '.###.', '..#..']);
def('↑', 2, ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..']);
def('→', 4, ['..#..', '...#.', '#####', '...#.', '..#..']);
def('★', 2, ['..#..', '..#..', '#####', '.###.', '.#.#.', '#...#', '.....']);

// ── Accents composés ──────────────────────────────────────────────────────
const MARKS: Record<string, string[]> = {
  acute: ['.#', '#.'],
  grave: ['#.', '.#'],
  circ: ['.#.', '#.#'],
  diaer: ['..', '#.#'],
};

function compose(ch: string, base: string, mark: keyof typeof MARKS | 'cedilla'): void {
  const b = GLYPHS.get(base)!;
  const upper = base === base.toUpperCase() && base !== 'ı';
  if (mark === 'cedilla') {
    const rows = Array.from({ length: CELL_H }, () => '.'.repeat(b.w));
    b.rows.forEach((r, i) => (rows[b.top + i] = r));
    const cx = Math.floor((b.w - 2) / 2);
    rows[9] = '.'.repeat(cx) + '.#' + '.'.repeat(b.w - cx - 2);
    rows[10] = '.'.repeat(cx) + '#.' + '.'.repeat(b.w - cx - 2);
    GLYPHS.set(ch, { w: b.w, top: 0, rows });
    return;
  }
  const m = MARKS[mark].map((r) => (mark === 'diaer' ? r.padEnd(3, '.') : r));
  const w = Math.max(b.w, m[0].length);
  const rows = Array.from({ length: CELL_H }, () => '.'.repeat(w));
  const bx = Math.floor((w - b.w) / 2);
  b.rows.forEach((r, i) => (rows[b.top + i] = '.'.repeat(bx) + r + '.'.repeat(w - bx - b.w)));
  const mx = Math.floor((w - m[0].length) / 2) + (mark === 'acute' && w > 3 ? 1 : 0);
  const mTop = upper ? 0 : 2;
  m.forEach((r, i) => {
    const line = rows[mTop + i].split('');
    for (let x = 0; x < r.length; x++) if (r[x] === '#') line[mx + x] = '#';
    rows[mTop + i] = line.join('');
  });
  GLYPHS.set(ch, { w, top: 0, rows });
}

const ACCENTED: Array<[string, string, keyof typeof MARKS | 'cedilla']> = [
  ['é', 'e', 'acute'], ['è', 'e', 'grave'], ['ê', 'e', 'circ'], ['ë', 'e', 'diaer'],
  ['à', 'a', 'grave'], ['â', 'a', 'circ'], ['ä', 'a', 'diaer'],
  ['î', 'ı', 'circ'], ['ï', 'ı', 'diaer'],
  ['ô', 'o', 'circ'], ['ö', 'o', 'diaer'],
  ['ù', 'u', 'grave'], ['û', 'u', 'circ'], ['ü', 'u', 'diaer'],
  ['ç', 'c', 'cedilla'],
  ['É', 'E', 'acute'], ['È', 'E', 'grave'], ['Ê', 'E', 'circ'], ['Ë', 'E', 'diaer'],
  ['À', 'A', 'grave'], ['Â', 'A', 'circ'],
  ['Î', 'I', 'circ'], ['Ï', 'I', 'diaer'],
  ['Ô', 'O', 'circ'], ['Ù', 'U', 'grave'], ['Û', 'U', 'circ'], ['Ü', 'U', 'diaer'],
  ['Ç', 'C', 'cedilla'],
];
for (const [ch, base, mark] of ACCENTED) compose(ch, base, mark);

const ALIASES: Record<string, string> = {
  '\u2018': '’',
  '\u201c': '"',
  '\u201d': '"',
  '\u00a0': ' ',
  '\u202f': ' ',
  '\u02bc': '’',
};

function glyphOf(ch: string): Glyph {
  return GLYPHS.get(ALIASES[ch] ?? ch) ?? GLYPHS.get('?')!;
}

/** Caractères que la police ne sait pas dessiner (utilisé par les tests). */
export function unsupportedChars(text: string): string[] {
  return [...new Set([...text].filter((ch) => !GLYPHS.has(ALIASES[ch] ?? ch) && ch !== '\n'))];
}

// ── Rendu ─────────────────────────────────────────────────────────────────

interface Atlas {
  canvas: HTMLCanvasElement;
  x: Map<string, number>;
}

const atlases = new Map<string, Atlas>();
const ORDER = [...GLYPHS.keys()];

function atlas(color: string): Atlas {
  const cached = atlases.get(color);
  if (cached) return cached;
  const total = ORDER.reduce((s, ch) => s + glyphOf(ch).w + 1, 0);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, total);
  canvas.height = CELL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  const x = new Map<string, number>();
  let cx = 0;
  for (const ch of ORDER) {
    const g = glyphOf(ch);
    x.set(ch, cx);
    g.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(cx + c, g.top + r, 1, 1);
    });
    cx += g.w + 1;
  }
  const result = { canvas, x };
  atlases.set(color, result);
  return result;
}

export function textWidth(text: string, scale = 1): number {
  let w = 0;
  for (const ch of text) w += glyphOf(ch).w + 1;
  return Math.max(0, w - 1) * scale;
}

export interface TextOpts {
  align?: 'left' | 'center' | 'right';
  /** Couleur d'ombre portée (décalée d'un pixel en bas à droite). */
  shadow?: string;
  scale?: number;
}

function drawRaw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale: number): void {
  const a = atlas(color);
  let cx = x;
  for (const raw of text) {
    const ch = GLYPHS.has(ALIASES[raw] ?? raw) ? (ALIASES[raw] ?? raw) : '?';
    const g = GLYPHS.get(ch)!;
    if (g.rows.length) ctx.drawImage(a.canvas, a.x.get(ch)!, 0, g.w, CELL_H, cx, y, g.w * scale, CELL_H * scale);
    cx += (g.w + 1) * scale;
  }
}

/** Dessine du texte ; (x, y) est le coin haut-gauche de la cellule (les majuscules commencent 2 px plus bas). */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, opts: TextOpts = {}): void {
  const scale = opts.scale ?? 1;
  const w = textWidth(text, scale);
  let left = Math.round(x);
  if (opts.align === 'center') left = Math.round(x - w / 2);
  else if (opts.align === 'right') left = Math.round(x - w);
  const top = Math.round(y);
  if (opts.shadow) drawRaw(ctx, text, left + scale, top + scale, opts.shadow, scale);
  drawRaw(ctx, text, left, top, color, scale);
}

/** Texte entouré d'un contour d'un pixel (titres). */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  outline: string,
  opts: TextOpts = {},
): void {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    drawText(ctx, text, x + dx, y + dy, outline, opts);
  }
  drawText(ctx, text, x, y, color, opts);
}

/** Découpe un texte en lignes de largeur maximale `maxWidth` pixels. */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}
