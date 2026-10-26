// Partitions de la musique du jeu, écrites en notation compacte.
//
// Une voix est une suite de jetons « note:durée » séparés par des espaces : `E5:4`
// (mi de l'octave 5 pendant 4 doubles-croches), `.:2` (silence), `C#4`, `Bb3`.
// Sans durée, une note vaut une double-croche. Les basses et arpèges sont générés
// à partir d'une grille d'accords (un accord par mesure, ou « G|C » pour deux
// accords par mesure) et d'un motif de 16 pas.
//
// Motifs de basse : R fondamentale, T tierce, F quinte, X triton, O octave,
//                   - prolonge la note précédente, . silence.
// Motifs d'arpège : 0 à 6 désignent les notes de l'accord en montant
//                   (0 fondamentale, 1 tierce, 2 quinte, 3 octave…), - et . idem.
// Batterie (un caractère par pas) : B djembé grave, T djembé tonique, S claqué,
//                   h maracas, k grosse caisse, s caisse claire, c cymbale.

export type Instrument = 'pulse' | 'pulse12' | 'kora' | 'balafon' | 'basse' | 'flute' | 'drone';

export interface Voice {
  inst: Instrument;
  notes: string;
  /** Volume relatif (1 par défaut). */
  gain?: number;
}

export interface TrackDef {
  bpm: number;
  voices: Voice[];
  /** Motif de batterie, répété sur toute la longueur. */
  drums?: string;
  /** Faux pour un jingle joué une seule fois. */
  loop: boolean;
}

export type TrackId =
  | 'titre'
  | 'village'
  | 'route'
  | 'foret'
  | 'falaise'
  | 'ville'
  | 'desert'
  | 'grotte'
  | 'cote'
  | 'masques'
  | 'nuit'
  | 'conseil'
  | 'combat'
  | 'dresseur'
  | 'maitre'
  | 'hantise'
  | 'legende'
  | 'victoire'
  | 'evolution'
  | 'soins'
  | 'maison';

export type JingleId = 'soin' | 'capture' | 'insigne' | 'evolue' | 'objet';

// ── Théorie ──────────────────────────────────────────────────────────────

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Numéro MIDI d'une note (« C#4 » → 61). */
export function midiOf(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Note invalide : ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + LETTERS[m[1]] + acc;
}

const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
};

/** Notes d'un accord à partir d'une octave donnée (« Am », 3 → [A3, C4, E4]). */
function chord(sym: string, octave: number): number[] {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  if (!m || !(m[2] in QUALITIES)) throw new Error(`Accord invalide : ${sym}`);
  const root = midiOf(`${m[1]}${octave}`);
  return QUALITIES[m[2]].map((i) => root + i);
}

/** Accord en vigueur au pas `step` d'une mesure (« G|C » : deux accords). */
function chordAt(bar: string, step: number): string {
  const parts = bar.split('|');
  return parts[Math.min(parts.length - 1, Math.floor((step * parts.length) / 16))];
}

/** Transforme un motif de 16 pas en jetons, mesure par mesure. */
function fromPattern(chords: string[], pattern: string, pick: (tones: number[], c: string) => number | null, octave: number): string {
  const tokens: string[] = [];
  for (const bar of chords) {
    for (let i = 0; i < 16; i++) {
      const c = pattern[i % pattern.length];
      if (c === '-' && tokens.length) {
        const last = tokens.pop()!;
        const [n, len] = last.split(':');
        tokens.push(`${n}:${Number(len) + 1}`);
        continue;
      }
      const midi = c === '.' || c === '-' ? null : pick(chord(chordAt(bar, i), octave), c);
      tokens.push(midi === null ? '.:1' : `${noteName(midi)}:1`);
    }
  }
  return tokens.join(' ');
}

export function bass(chords: string[], pattern: string, octave = 2): string {
  return fromPattern(chords, pattern, (t, c) => {
    const root = t[0];
    switch (c) {
      case 'R': return root;
      case 'T': return t[1];
      case 'F': return root + 7;
      case 'X': return root + 6;
      case 'O': return root + 12;
      default: return null;
    }
  }, octave);
}

export function arp(chords: string[], pattern: string, octave = 4): string {
  return fromPattern(chords, pattern, (t, c) => {
    const k = Number(c);
    if (Number.isNaN(k)) return null;
    const triad = t.slice(0, 3);
    return triad[k % 3] + 12 * Math.floor(k / 3);
  }, octave);
}

const bars = (...b: string[]) => b.join(' ');

// ── Pistes ───────────────────────────────────────────────────────────────

const TITRE_CH = ['Em', 'C', 'Em', 'D', 'C', 'D', 'Em|C', 'B'];
const VILLAGE_CH = ['C', 'G', 'Am', 'F', 'C', 'Am', 'F', 'G|C'];
const ROUTE_CH = ['G|C', 'G', 'G|F', 'F|G', 'C', 'Am|D', 'G|F', 'D|G'];
const FORET_CH = ['Dm', 'C', 'Dm|G', 'Am', 'G|C', 'Dm', 'G|Am', 'Dm'];
const NUIT_CH = ['Am', 'Dm', 'F', 'E', 'Am', 'E', 'Dm', 'E'];
const FALAISE_CH = ['D', 'C', 'G', 'D', 'Bm', 'G', 'A', 'D'];
const VILLE_CH = ['Am', 'G', 'Am', 'Em', 'F', 'G', 'Am', 'E'];
const DESERT_CH = ['Dm', 'Dm', 'C', 'Dm', 'Bb', 'C', 'Dm|A', 'Dm'];
const GROTTE_CH = ['Em', 'F', 'Am', 'G|Em', 'Em', 'F|Am', 'Dm|G', 'Em'];
const CONSEIL_CH = ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Fm', 'G', 'Cm|G'];
const COTE_CH = ['F', 'C', 'G', 'Am', 'F', 'C', 'Dm|G', 'C'];
const MASQUES_CH = ['Em', 'Em', 'C', 'B', 'Em', 'Em', 'Am|B', 'Em'];
const COMBAT_CH = ['Em', 'C', 'Em', 'D|Em', 'C', 'D', 'Am', 'B'];
const DRESSEUR_CH = ['Am', 'Dm', 'Am', 'Am|C', 'F', 'Dm|E', 'Am|C', 'E'];
const MAITRE_CH = ['Dm', 'Dm', 'Bb', 'Dm|A', 'F', 'Bb|C', 'C', 'A'];
const HANTISE_CH = ['Em', 'Em', 'Em', 'Bb', 'Em', 'Em', 'Bdim', 'Bb'];
const LEGENDE_CH = ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm|G', 'G'];
const VICTOIRE_CH = ['C', 'F|G', 'C|G', 'C'];
const EVOLUTION_CH = ['Am', 'F', 'G', 'E'];
const SOINS_CH = ['F', 'C', 'Dm', 'Bb', 'F', 'Am|Dm', 'Gm|C', 'F'];
const MAISON_CH = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am|D', 'G'];

export const TRACKS: Record<TrackId, TrackDef> = {
  // Écran titre : la kora égrène, la mélodie s'élève sur la savane.
  titre: {
    bpm: 92,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'E5:6 B4:2 E5:4 F#5:4', 'G5:6 F#5:2 E5:4 D5:4', 'E5:6 B4:2 E5:4 G5:4', 'A5:12 B5:4',
        'C6:6 B5:2 A5:4 G5:4', 'A5:6 G5:2 F#5:4 D5:4', 'E5:4 G5:4 B5:4 A5:2 G5:2', 'F#5:12 .:4',
      ) },
      { inst: 'kora', notes: arp(TITRE_CH, '0212321202123212', 4), gain: 0.8 },
      { inst: 'basse', notes: bass(TITRE_CH, 'R---------R-F---') },
    ],
    drums: 'B...h...B.T.S...',
  },
  // Auberge : flûte apaisante sur la kora, comme une berceuse.
  soins: {
    bpm: 96,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'A5:4 C6:4 A5:2 G5:2 F5:4', 'G5:4 E5:4 C5:8', 'F5:4 A5:4 D6:4 C6:4', 'Bb5:6 A5:2 F5:8',
        'A5:4 C6:4 F6:4 E6:2 D6:2', 'C6:4 A5:4 D6:4 A5:4', 'Bb5:4 G5:4 E5:4 G5:4', 'F5:12 .:4',
      ), gain: 0.85 },
      { inst: 'kora', notes: arp(SOINS_CH, '0.1.2.3.2.1.2.1.', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(SOINS_CH, 'R-------F-------'), gain: 0.8 },
    ],
    drums: '....h.......h...',
  },
  // Maison : balafon tranquille, le matin au village.
  maison: {
    bpm: 88,
    loop: true,
    voices: [
      { inst: 'balafon', notes: bars(
        'B4:2 D5:2 G5:4 F#5:2 E5:2 D5:4', 'E5:2 G5:2 B5:4 A5:2 G5:2 E5:4',
        'C5:2 E5:2 G5:4 E5:2 D5:2 C5:4', 'D5:4 F#5:4 A5:8',
        'B5:2 A5:2 G5:4 D5:2 E5:2 G5:4', 'E5:2 F#5:2 G5:4 B5:4 A5:4',
        'A5:2 G5:2 E5:4 F#5:2 E5:2 D5:4', 'G5:12 .:4',
      ) },
      { inst: 'kora', notes: arp(MAISON_CH, '0.2.1.2.0.2.1.2.', 4), gain: 0.55 },
      { inst: 'basse', notes: bass(MAISON_CH, 'R...F...R...F...'), gain: 0.8 },
    ],
    drums: 'B.......T...h...',
  },
  // Village : balafon guilleret en gamme pentatonique.
  village: {
    bpm: 104,
    loop: true,
    voices: [
      { inst: 'balafon', notes: bars(
        'E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:4', 'D5:2 E5:2 G5:2 E5:2 D5:4 .:4',
        'E5:2 G5:2 A5:2 C6:2 A5:2 G5:2 E5:4', 'D5:2 E5:2 D5:2 A4:2 C5:8',
        'A5:2 A5:2 G5:2 E5:2 G5:4 E5:2 D5:2', 'C5:2 D5:2 E5:2 G5:2 E5:4 .:4',
        'A5:2 C6:2 A5:2 G5:2 E5:2 G5:2 A5:4', 'G5:2 E5:2 D5:2 E5:2 C5:8',
      ) },
      { inst: 'kora', notes: arp(VILLAGE_CH, '0.2.3.2.1.2.3.2.', 4), gain: 0.7 },
      { inst: 'basse', notes: bass(VILLAGE_CH, 'R...F...R...F...') },
    ],
    drums: 'B...T.h.B...T.hh',
  },
  // Routes : l'aventure, au pas de course.
  route: {
    bpm: 126,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'G4:2 B4:2 D5:3 B4:1 C5:2 D5:2 E5:4', 'D5:2 B4:2 G4:2 A4:2 B4:6 .:2',
        'G4:2 B4:2 D5:3 G5:1 F5:2 D5:2 C5:4', 'B4:2 C5:2 A4:2 F4:2 G4:6 .:2',
        'E5:2 E5:2 D5:2 E5:2 G5:4 E5:2 D5:2', 'C5:2 C5:2 B4:2 C5:2 E5:4 D5:4',
        'B4:2 D5:2 G5:4 F5:2 D5:2 C5:2 A4:2', 'B4:4 A4:2 F#4:2 G4:8',
      ) },
      { inst: 'kora', notes: arp(ROUTE_CH, '0.1.2.1.0.1.2.1.', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(ROUTE_CH, 'R.O.R.O.R.O.F.O.') },
    ],
    drums: 'B.h.S.h.B.BhS.hT',
  },
  // Forêt Sacrée et Marigot : flûte peule et balafon, en mode dorien.
  foret: {
    bpm: 90,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'D5:2 F5:2 A5:2 G5:2 F5:2 E5:2 D5:4', 'C5:2 D5:2 E5:2 G5:2 F5:4 E5:4',
        'D5:2 F5:2 A5:2 C6:2 B5:2 A5:2 G5:4', 'A5:12 .:4',
        'B5:2 A5:2 G5:2 F5:2 E5:4 G5:4', 'F5:2 E5:2 D5:2 C5:2 D5:4 A4:4',
        'B4:2 C5:2 D5:2 E5:2 F5:2 G5:2 A5:4', 'D5:12 .:4',
      ) },
      { inst: 'balafon', notes: arp(FORET_CH, '0..2..3.1..2..3.', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(FORET_CH, 'R-------R---F---') },
    ],
    drums: 'T.......h...T.h.',
  },
  // Falaise des Ancêtres : majestueux, en ré majeur.
  falaise: {
    bpm: 80,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'D5:4 A4:4 D5:4 E5:4', 'E5:4 G5:4 E5:4 C5:4', 'D5:4 B4:4 G4:8', 'A4:4 D5:4 F#5:8',
        'F#5:6 E5:2 D5:4 B4:4', 'G5:6 F#5:2 E5:4 D5:4', 'C#5:4 E5:4 A5:8', 'F#5:8 D5:8',
      ) },
      { inst: 'pulse12', notes: bars(
        '.:8 A5:4 E5:4', '.:8 C6:4 G5:4', '.:8 D6:4 B5:4', '.:8 A5:4 D6:4',
        '.:8 B5:4 F#5:4', '.:8 B5:4 G5:4', '.:8 E6:4 C#6:4', '.:8 A5:4 F#5:4',
      ), gain: 0.5 },
      { inst: 'kora', notes: arp(FALAISE_CH, '0.2.3.4.3.2.3.2.', 3), gain: 0.7 },
      { inst: 'basse', notes: bass(FALAISE_CH, 'R-------F-------') },
    ],
    drums: 'B.......S.......',
  },
  // Grande cité sahélienne : ngoni nerveux et percussions de marché.
  ville: {
    bpm: 110,
    loop: true,
    voices: [
      { inst: 'pulse12', notes: bars(
        'A4:2 C5:2 D5:2 E5:4 D5:2 C5:2 A4:2', 'G4:2 A4:2 B4:2 D5:4 B4:2 A4:2 G4:2',
        'A4:2 C5:2 D5:2 E5:2 G5:2 E5:2 D5:4', 'E5:4 B4:4 E5:8',
        'F5:2 E5:2 D5:2 C5:2 A4:4 C5:4', 'D5:2 C5:2 B4:2 G4:2 B4:4 D5:4',
        'E5:2 D5:2 C5:2 D5:2 E5:2 G5:2 A5:4', 'G#5:4 E5:4 B4:8',
      ) },
      { inst: 'kora', notes: arp(VILLE_CH, '0212021202120212', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(VILLE_CH, 'R..R..F.R..R..O.') },
    ],
    drums: 'B.hTS.hTB.hTS.hT',
  },
  // Désert : longues notes ornées sur un bourdon, rythme de caravane.
  desert: {
    bpm: 96,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'D5:4 E5:2 F5:2 E5:4 D5:4', 'A5:6 G5:2 F5:4 E5:4', 'E5:4 G5:2 E5:2 C5:8', 'D5:12 .:4',
        'F5:4 D5:2 F5:2 Bb5:4 A5:4', 'G5:4 E5:2 G5:2 C6:4 Bb5:4', 'A5:4 G5:2 F5:2 E5:4 C#5:4', 'D5:12 .:4',
      ) },
      { inst: 'drone', notes: bass(DESERT_CH, 'R---------------', 2), gain: 0.8 },
      { inst: 'kora', notes: arp(DESERT_CH, '0..1..2.0..1..2.', 4), gain: 0.5 },
      { inst: 'basse', notes: bass(DESERT_CH, 'R..R..F.R.......') },
    ],
    drums: 'B..T..S.B..T..hh',
  },
  // Grottes : gouttes d'eau et mode phrygien.
  grotte: {
    bpm: 76,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'E5:4 .:2 F5:2 E5:8', '.:4 A5:4 G5:4 F5:4', 'E5:4 .:2 B4:2 C5:8', 'D5:4 C5:4 B4:8',
        'E5:2 F5:2 G5:4 A5:4 B5:4', 'C6:8 B5:4 A5:4', 'G5:4 F5:4 E5:4 D5:4', 'E5:16',
      ), gain: 0.8 },
      { inst: 'drone', notes: bass(GROTTE_CH, 'R---------------', 2), gain: 0.7 },
      { inst: 'balafon', notes: arp(GROTTE_CH, '0...3...2...1...', 5), gain: 0.5 },
    ],
    drums: '....T.......h...',
  },
  // Côte des Alizés : flûte légère, vent du large et pirogues.
  cote: {
    bpm: 112,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars(
        'A5:4 G5:2 F5:2 C5:4 F5:4', 'E5:4 D5:2 C5:2 G4:8', 'B4:2 C5:2 D5:4 G5:4 F5:2 D5:2', 'E5:6 C5:2 A4:8',
        'F5:2 G5:2 A5:4 C6:4 A5:2 F5:2', 'G5:4 E5:2 C5:2 E5:8', 'F5:4 D5:2 A4:2 B4:4 D5:4', 'C5:12 .:4',
      ) },
      { inst: 'kora', notes: arp(COTE_CH, '0.2.3.2.1.2.3.2.', 4), gain: 0.65 },
      { inst: 'basse', notes: bass(COTE_CH, 'R...F...R.R.F...') },
    ],
    drums: 'B..hT.h.B..hT.hh',
  },
  // Bois des Masques : tambours rituels, ostinato sombre.
  masques: {
    bpm: 104,
    loop: true,
    voices: [
      { inst: 'pulse12', notes: bars(
        'E5:2 .:2 E5:2 G5:2 F#5:4 E5:4', 'B4:8 .:8', 'C5:2 .:2 C5:2 E5:2 D#5:4 C5:4', 'B4:12 .:4',
        'G5:2 F#5:2 E5:2 D#5:2 E5:4 B4:4', 'C5:4 B4:4 A4:4 G4:4', 'A4:2 C5:2 E5:4 D#5:4 B4:4', 'E4:12 .:4',
      ), gain: 0.9 },
      { inst: 'drone', notes: bass(MASQUES_CH, 'R---------------', 2), gain: 0.8 },
      { inst: 'basse', notes: bass(MASQUES_CH, 'R..R..R.R..O..R.') },
    ],
    drums: 'B.TBS.T.B.TBS.TT',
  },
  // La nuit : boîte à musique et bourdon, un cœur qui bat au loin.
  nuit: {
    bpm: 66,
    loop: true,
    voices: [
      { inst: 'kora', notes: bars(
        'A5:4 .:4 E5:4 .:4', 'G5:4 F5:4 E5:8', 'C5:4 .:4 D5:4 E5:4', 'B4:12 .:4',
        'A5:4 .:4 C6:4 B5:4', 'G#5:8 E5:8', 'F5:4 E5:4 D5:4 C5:4', 'B4:8 .:8',
      ) },
      { inst: 'drone', notes: bass(NUIT_CH, 'R---------------', 2), gain: 0.6 },
      { inst: 'kora', notes: arp(NUIT_CH, '0...2...3...2...', 3), gain: 0.35 },
    ],
    drums: 'B..B............',
  },
  // Salle du Conseil des Griots : solennel, en ut mineur.
  conseil: {
    bpm: 100,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'C5:4 Eb5:4 G5:4 F5:2 Eb5:2', 'Ab5:6 G5:2 F5:4 Eb5:4', 'D5:4 F5:4 Bb5:4 Ab5:2 G5:2', 'G5:12 .:4',
        'C6:4 Bb5:2 Ab5:2 G5:4 Eb5:4', 'F5:4 Ab5:4 C6:4 Bb5:2 Ab5:2', 'G5:4 F5:2 Eb5:2 D5:4 B4:4', 'C5:8 D5:4 B4:4',
      ) },
      { inst: 'kora', notes: arp(CONSEIL_CH, '0.1.2.3.2.1.2.1.', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(CONSEIL_CH, 'R---R---F---R---') },
    ],
    drums: 'B.......B.S.....',
  },
  // Combat contre un Jinémon sauvage.
  combat: {
    bpm: 152,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'E5:2 .:1 E5:1 D5:2 E5:2 G5:2 E5:2 B4:4', 'C5:2 .:1 C5:1 B4:2 C5:2 E5:2 C5:2 A4:4',
        'E5:2 .:1 E5:1 D5:2 E5:2 G5:2 A5:2 B5:4', 'A5:2 G5:2 F#5:2 D5:2 E5:8',
        'G5:3 F#5:3 E5:2 D5:3 E5:3 G5:2', 'A5:3 G5:3 F#5:2 E5:4 D5:4',
        'C5:3 D5:3 E5:2 F#5:3 G5:3 A5:2', 'B5:4 A5:2 G5:2 F#5:8',
      ) },
      { inst: 'pulse12', notes: arp(COMBAT_CH, '0.3.2.3.0.3.2.3.', 4), gain: 0.45 },
      { inst: 'basse', notes: bass(COMBAT_CH, 'R.O.R.O.R.O.R.O.') },
    ],
    drums: 'k.h.s.hkk.h.s.hs',
  },
  // Combat contre un dresseur.
  dresseur: {
    bpm: 160,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2', 'D5:2 F5:2 A5:2 F5:2 E5:4 C5:4',
        'A4:2 C5:2 E5:2 A5:2 B5:2 C6:2 B5:2 G5:2', 'A5:8 G5:4 E5:4',
        'F5:3 E5:3 D5:2 F5:3 E5:3 C5:2', 'D5:3 C5:3 B4:2 G#4:4 B4:4',
        'C5:2 D5:2 E5:2 F5:2 G5:2 A5:2 B5:2 C6:2', 'B5:4 G#5:4 E5:8',
      ) },
      { inst: 'pulse12', notes: arp(DRESSEUR_CH, '0.1.2.1.0.1.2.1.', 4), gain: 0.45 },
      { inst: 'basse', notes: bass(DRESSEUR_CH, 'R.O.R.O.R.O.F.O.') },
    ],
    drums: 'k.hsk.hsk.hsk.ss',
  },
  // Combat contre un Maître de Piste.
  maitre: {
    bpm: 166,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'D5:2 D5:1 D5:1 F5:2 D5:2 G5:2 F5:2 D5:2 C5:2', 'D5:2 D5:1 D5:1 F5:2 D5:2 A5:4 G5:4',
        'Bb5:2 A5:2 G5:2 F5:2 G5:2 F5:2 E5:2 C5:2', 'D5:8 A4:4 C#5:4',
        'F5:4 E5:2 D5:2 C5:4 A4:4', 'Bb4:4 C5:2 D5:2 E5:4 G5:4',
        'F5:2 G5:2 A5:2 C6:2 Bb5:2 A5:2 G5:2 E5:2', 'A5:4 G5:2 E5:2 C#5:8',
      ) },
      { inst: 'kora', notes: arp(MAITRE_CH, '0123012301230123', 4), gain: 0.55 },
      { inst: 'basse', notes: bass(MAITRE_CH, 'R.R.O.R.R.R.O.F.') },
    ],
    drums: 'k.sk.hs.k.sk.hss',
  },
  // Combat contre une Hantise : tritons, chromatismes et bourdon.
  hantise: {
    bpm: 136,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'E5:4 F5:4 E5:2 D#5:2 E5:4', 'Bb4:6 A4:2 .:8', 'E5:4 G5:4 F#5:2 F5:2 E5:4', 'Bb5:6 A5:2 .:8',
        'B4:2 C5:2 B4:2 Bb4:2 B4:4 F5:4', 'E5:2 F5:2 E5:2 D#5:2 E5:8',
        'G5:2 F#5:2 F5:2 E5:2 D#5:2 D5:2 C#5:2 C5:2', 'B4:8 Bb4:8',
      ) },
      { inst: 'drone', notes: bass(HANTISE_CH, 'R---------------', 2), gain: 0.9 },
      { inst: 'pulse12', notes: arp(HANTISE_CH, '0.1.2.1.0.1.2.1.', 5), gain: 0.3 },
      { inst: 'basse', notes: bass(HANTISE_CH, 'R..R..X.R..R..X.') },
    ],
    drums: 'k...s..kk...s.k.',
  },
  // Légendes et Champion : épique.
  legende: {
    bpm: 144,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars(
        'C5:4 G5:4 Eb5:2 F5:2 G5:4', 'Ab5:4 G5:2 F5:2 Eb5:4 C5:4', 'Bb4:2 Eb5:2 G5:4 Bb5:4 Ab5:2 G5:2', 'F5:8 D5:8',
        'C6:4 Bb5:2 Ab5:2 G5:4 Eb5:4', 'Ab5:4 C6:4 Eb6:4 D6:2 C6:2', 'Ab5:4 G5:4 F5:4 D5:4', 'B4:4 D5:4 G5:8',
      ) },
      { inst: 'kora', notes: arp(LEGENDE_CH, '0123012301230123', 4), gain: 0.5 },
      { inst: 'basse', notes: bass(LEGENDE_CH, 'R.R.R.O.R.R.F.O.') },
    ],
    drums: 'c.hsk.hsk.hsk.ss',
  },
  // Victoire contre un dresseur.
  victoire: {
    bpm: 132,
    loop: true,
    voices: [
      { inst: 'pulse', notes: bars('G4:2 C5:2 E5:2 G5:4 E5:2 G5:4', 'A5:2 G5:2 F5:2 E5:2 D5:4 G4:4', 'G4:2 C5:2 E5:2 G5:4 A5:2 B5:4', 'C6:8 G5:4 E5:4') },
      { inst: 'kora', notes: arp(VICTOIRE_CH, '0.1.2.3.2.1.2.1.', 4), gain: 0.6 },
      { inst: 'basse', notes: bass(VICTOIRE_CH, 'R...F...R.R.F...') },
    ],
    drums: 'B.h.T.h.B.h.S.hh',
  },
  // Évolution en cours.
  evolution: {
    bpm: 120,
    loop: true,
    voices: [
      { inst: 'flute', notes: bars('A5:16', 'C6:16', 'B5:16', 'G#5:16'), gain: 0.7 },
      { inst: 'kora', notes: arp(EVOLUTION_CH, '0123012301230123', 4), gain: 0.6 },
      { inst: 'drone', notes: bass(EVOLUTION_CH, 'R---------------', 2), gain: 0.6 },
    ],
    drums: 'B...B...B...B...',
  },
};

export const JINGLES: Record<JingleId, TrackDef> = {
  soin: {
    bpm: 120,
    loop: false,
    voices: [
      { inst: 'kora', notes: 'C5:2 E5:2 G5:2 E5:2 C6:4 G5:4 C6:8' },
      { inst: 'balafon', notes: 'C4:4 G4:4 E4:4 G4:4 C5:8', gain: 0.7 },
    ],
  },
  capture: {
    bpm: 140,
    loop: false,
    voices: [
      { inst: 'pulse', notes: 'G4:2 C5:2 E5:2 G5:2 C6:8 .:4' },
      { inst: 'basse', notes: 'C3:4 E3:4 C3:8 .:4' },
    ],
    drums: 'B.T.B.T.S.......c...',
  },
  insigne: {
    bpm: 132,
    loop: false,
    voices: [
      { inst: 'pulse', notes: 'C5:2 E5:2 G5:2 C6:6 B5:2 A5:2 G5:2 A5:2 B5:2 C6:10' },
      { inst: 'kora', notes: arp(['C', 'G|C'], '0.1.2.3.2.1.2.1.', 4), gain: 0.6 },
      { inst: 'basse', notes: 'C3:8 G2:4 C3:4 G2:8 C3:8' },
    ],
    drums: 'k...s...k...s...k.k.s...c.......',
  },
  evolue: {
    bpm: 120,
    loop: false,
    voices: [
      { inst: 'pulse', notes: 'E5:2 G#5:2 B5:2 E6:10' },
      { inst: 'kora', notes: 'E4:2 B4:2 E5:2 G#5:10' },
    ],
  },
  objet: {
    bpm: 140,
    loop: false,
    voices: [{ inst: 'pulse', notes: 'C5:2 E5:2 G5:2 C6:6 .:4' }, { inst: 'basse', notes: 'C3:6 G3:6 .:4' }],
  },
};

// ── Analyse ──────────────────────────────────────────────────────────────

export interface NoteEvent {
  step: number;
  len: number;
  midi: number;
}

/** Découpe une voix en notes (position et durée en doubles-croches). */
export function parseVoice(notes: string): { events: NoteEvent[]; length: number } {
  const events: NoteEvent[] = [];
  let step = 0;
  for (const token of notes.trim().split(/\s+/)) {
    const [name, len] = token.split(':');
    const n = len === undefined ? 1 : Number(len);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`Durée invalide : ${token}`);
    if (name !== '.') events.push({ step, len: n, midi: midiOf(name) });
    step += n;
  }
  return { events, length: step };
}
