// Zones écologiques du monde de Ginémon : cartes, rencontres, PNJ.
//
// Légende des tuiles :
//   .  sol de terre battue        ,  hautes herbes (rencontres)   "  herbe rase
//   =  chemin                     :  sable                         F  fleurs
//   P  pont                       L  latérite rouge                T  acacia
//   B  baobab / fromager          ~  eau profonde                  w  gué (Insigne de la Pluie)
//   #  falaise                    X  rocher fissuré (Insigne de l'Enclume)
//   R  toit de case               H  mur de case en banco          D  porte
//   G  grenier                    K  foyer / forge                 A  autel
//   M  mur d'enceinte             E  étal de marché                O  puits
//   U  termitière                 S  panneau

import type { ItemId } from './items';
import type { MoveId } from './moves';
import { TRAINERS, type CharacterLook } from './trainers';

export type ZoneId = 'village' | 'savane' | 'terresRouges' | 'marigot' | 'foret' | 'piste' | 'falaise';
export type Dir = 'haut' | 'bas' | 'gauche' | 'droite';
export type Theme = 'village' | 'savane' | 'laterite' | 'marigot' | 'foret' | 'piste' | 'falaise';

export const SOLID_TILES = new Set(['T', 'B', '~', '#', 'H', 'R', 'D', 'G', 'K', 'A', 'M', 'E', 'O', 'U', 'S', 'X', 'w']);
export const GRASS_TILE = ',';

export interface Warp {
  x: number;
  y: number;
  to: ZoneId;
  tx: number;
  ty: number;
  dir: Dir;
}

export interface Encounter {
  species: number;
  min: number;
  max: number;
  weight: number;
}

export type Condition = 'starter' | 'troisInsignes';

export type NpcScript =
  | { kind: 'dialogue'; lines: string[] }
  | { kind: 'soin'; lines: string[] }
  | { kind: 'boutique'; items: ItemId[]; lines: string[] }
  | { kind: 'grenier'; lines: string[] }
  | { kind: 'dresseur'; trainer: string }
  | { kind: 'starter' }
  | { kind: 'gardien'; condition: Condition; flag: string; blocked: string[]; open: string[] }
  | { kind: 'objet'; item: ItemId; quantity: number; flag: string }
  | { kind: 'legendaire'; species: number; level: number; moves: MoveId[]; flag: string; lines: string[] };

export type NpcLook =
  | { kind: 'personne'; look: CharacterLook }
  | { kind: 'creature'; species: number }
  | { kind: 'objet' };

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  look: NpcLook;
  script: NpcScript;
  /** Le PNJ disparaît quand ce drapeau est levé. */
  hideFlag?: string;
  /** Le PNJ n'apparaît qu'une fois ce drapeau levé. */
  showFlag?: string;
}

export interface Sign {
  x: number;
  y: number;
  text: string[];
}

export interface Zone {
  id: ZoneId;
  name: string;
  theme: Theme;
  map: string[];
  warps: Warp[];
  encounters: Encounter[];
  /** Rencontres de la nuit (créatures nocturnes) ; à défaut, celles du jour. */
  nightEncounters?: Encounter[];
  /** Probabilité de rencontre par pas dans les hautes herbes. */
  encounterRate: number;
  npcs: Npc[];
  signs: Sign[];
}

// ── Apparences ───────────────────────────────────────────────────────────
const ANCIEN: CharacterLook = { skin: '#4a2a1a', outfit: '#f0ead8', accent: '#c8a060', headwear: 'bonnet' };
const GUERISSEUSE: CharacterLook = { skin: '#5a3420', outfit: '#5fa83a', accent: '#f0f0f0', headwear: 'foulard' };
const MARCHANDE: CharacterLook = { skin: '#6a4028', outfit: '#e2582a', accent: '#f0c040', headwear: 'foulard' };
const GARDIEN: CharacterLook = { skin: '#5a3420', outfit: '#9c8a5a', accent: '#6b4a2a', headwear: 'chapeau' };
const VILLAGEOIS: CharacterLook = { skin: '#7a4a30', outfit: '#3a86c8', accent: '#f0f0f0' };
const ENFANT: CharacterLook = { skin: '#6a3a22', outfit: '#e8b84a', accent: '#5fa83a' };

const objet = (id: string, x: number, y: number, item: ItemId, quantity = 1): Npc => ({
  id, name: 'Objet', x, y, dir: 'bas', look: { kind: 'objet' },
  script: { kind: 'objet', item, quantity, flag: `objet:${id}` },
  hideFlag: `objet:${id}`,
});

const dresseur = (trainer: string, x: number, y: number, dir: Dir, look: CharacterLook, hideFlag?: string): Npc => ({
  id: trainer, name: trainer, x, y, dir, look: { kind: 'personne', look },
  script: { kind: 'dresseur', trainer }, hideFlag,
});

const soin = (id: string, x: number, y: number, dir: Dir, lines: string[], look = GUERISSEUSE): Npc => ({
  id, name: 'Guérisseuse', x, y, dir, look: { kind: 'personne', look }, script: { kind: 'soin', lines },
});

const boutique = (id: string, x: number, y: number, items: ItemId[], lines: string[]): Npc => ({
  id, name: 'Marchande', x, y, dir: 'bas', look: { kind: 'personne', look: MARCHANDE },
  script: { kind: 'boutique', items, lines },
});

const grenier = (id: string, x: number, y: number): Npc => ({
  id, name: 'Gardien du Grenier', x, y, dir: 'bas', look: { kind: 'personne', look: GARDIEN },
  script: { kind: 'grenier', lines: ['Je garde les Jinémon qui ne voyagent pas avec toi. Ils sont au frais dans le grenier.'] },
});

const parole = (id: string, name: string, x: number, y: number, dir: Dir, look: CharacterLook, lines: string[]): Npc => ({
  id, name, x, y, dir, look: { kind: 'personne', look }, script: { kind: 'dialogue', lines },
});

// Les dresseurs ont leur apparence définie dans trainers.ts : on la reprend.
const T = (id: string) => TRAINERS[id].look;

// ── Zones ────────────────────────────────────────────────────────────────

const village: Zone = {
  id: 'village',
  name: 'Village des Greniers',
  theme: 'village',
  encounterRate: 0,
  encounters: [],
  map: [
    'TTTTTTTTTTT=TTTTTTTTTTTT',
    'TT"""""""""=S""""""""""T',
    'T"""""GG"""=""""""""GG"T',
    'T""RRR"""""="""""RRR"""T',
    'T""HDH"""""="""""HDH"""T',
    'T"""=""""""=""""""=""""T',
    'T"""=""""""=""""""=""T"T',
    'T"T"=""""""="FF"""=""T"T',
    'T"T"=""B"""="""O""=""""T',
    'T"""=""""""=""""""=""""T',
    'T"""="F""""=""""F"="GG"T',
    'T"""=""""""=""""""=""""T',
    'T"""===============""""T',
    'T"F""""""""="""""RRR"""T',
    'T"""""""FF"="""""HDH"""T',
    'T""EEE"""""=""TT""=""""T',
    'T""""""""""========""""T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [{ x: 11, y: 0, to: 'savane', tx: 8, ty: 26, dir: 'haut' }],
  signs: [{ x: 12, y: 1, text: ['↑ Savane des Termitières', '→ Terres Rouges et la Forge'] }],
  npcs: [
    { id: 'ancien', name: 'Ancien', x: 4, y: 5, dir: 'bas', look: { kind: 'personne', look: ANCIEN }, script: { kind: 'starter' } },
    soin('guerisseuse', 18, 5, 'bas', ['Bienvenue dans ma case. Laisse-moi soigner tes Jinémon avec mes plantes.']),
    boutique('marchande', 4, 14, ['calebasse', 'karite', 'moringa'], ['Approche ! Calebasses et remèdes du marché !']),
    grenier('gardienGrenier', 8, 3),
    parole('maman', 'Maman', 20, 15, 'gauche', { skin: '#5a3420', outfit: '#b84ae8', accent: '#f0c040', headwear: 'foulard' }, [
      'Maman : Tu pars déjà ? Sois prudent dans les hautes herbes.',
      'Maman : Si tes Jinémon sont fatigués, la guérisseuse du village les soignera.',
    ]),
    parole('conteur', 'Vieux Conteur', 7, 9, 'bas', { skin: '#3a2214', outfit: '#e8e0c8', accent: '#9c8a5a', headwear: 'chapeau' }, [
      'Conteur : Sous ce baobab, on raconte les légendes depuis des siècles.',
      'Conteur : Les Jinémon naissent des forces de la nature et des histoires que les peuples se transmettent.',
      'Conteur : Ici, ce sont les contes du fleuve et de la savane : Ci Wara, les Nommo, Leuk le Lièvre…',
      'Conteur : Mais les caravanes ont aussi apporté des légendes venues de très loin : dragons, renards à neuf queues, feux follets…',
      'Conteur : Tous ont trouvé leur place dans notre monde. Le Ginédex les recense tous.',
    ]),
    parole('enfant', 'Enfant', 14, 11, 'gauche', ENFANT, [
      'Enfant : Au nord, il y a des termitières plus hautes que moi ! Et des Jinémon cachés dans les herbes !',
    ]),
    {
      id: 'sidiki', name: 'Sidiki', x: 11, y: 1, dir: 'bas', look: { kind: 'personne', look: VILLAGEOIS },
      script: { kind: 'dialogue', lines: ['Sidiki : Attends ! L’Ancien veut te voir avant que tu partes. Sa case est à l’ouest du village.'] },
      hideFlag: 'starter',
    },
  ],
};

const savane: Zone = {
  id: 'savane',
  name: 'Savane des Termitières',
  theme: 'savane',
  encounterRate: 0.1,
  encounters: [
    { species: 14, min: 2, max: 5, weight: 28 },
    { species: 16, min: 2, max: 5, weight: 24 },
    { species: 10, min: 3, max: 6, weight: 18 },
    { species: 18, min: 3, max: 5, weight: 10 },
    { species: 33, min: 3, max: 5, weight: 8 },
    { species: 43, min: 4, max: 6, weight: 6 },
    { species: 35, min: 4, max: 6, weight: 6 },
    { species: 72, min: 4, max: 6, weight: 6 },
    { species: 74, min: 3, max: 5, weight: 6 },
    { species: 80, min: 3, max: 6, weight: 6 },
    { species: 76, min: 3, max: 5, weight: 5 },
  ],
  nightEncounters: [
    { species: 94, min: 3, max: 6, weight: 22 },
    { species: 96, min: 3, max: 6, weight: 22 },
    { species: 20, min: 4, max: 6, weight: 14 },
    { species: 98, min: 4, max: 6, weight: 10 },
    { species: 10, min: 3, max: 5, weight: 12 },
    { species: 72, min: 4, max: 6, weight: 10 },
    { species: 47, min: 5, max: 7, weight: 8 },
  ],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T""""""""""""""""""""""""""""""T',
    'T""""""""",,,,,,,"""""""""~~~~"T',
    'T"T""""""",,,,,,,"UTT""U""~~~~"T',
    'T""U"""""",,,,,,,"""""""T"~~~~"T',
    'TT"""""""""""""""""""""""""""""T',
    'T"""""""========================',
    'T"""""""=""""""""""""""""""""""T',
    'T",,,,,"="""""""T""""B"""""""""T',
    'T",,,,,"=",,,,,,"""""",,,,,,,,"T',
    'T",,,,,"=",,,,,,"U"""",,,,,,,,"T',
    'T",,,,,"=",,,,,,"""""",,,,,,,,"T',
    'T",,,,,"=",,,,,,"""""",,,,,,,,"T',
    'T",,,,,"=",,,,,,"""""",,,,,,,,"T',
    'T",,,,,"=""""""""""""",,,,,,,,"T',
    'T"""""""=""T,,,,,,,,,"""""U""""T',
    'T"""U"""=""",,,,,,,,,U"""""""""T',
    'T",,,,,"=""",,,,,,,,,""",,,,,,"T',
    'T",,,,,"=""",U,,,,,,,""",,,,,,"T',
    'T",,,,,"=U"",,,,,,,,,""",,,,,,"T',
    'T",,,,,"=""",,,,,,,,,""",,,,,,TT',
    'T",,,,,"=""",,,,,,,,,"T",,,,,,"T',
    'T"""""""=""""""""""""""""""""""T',
    'TTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTT',
    'T"""""""="""""F""""""""""""""""T',
    'T"""B"""=S""""""""""FF"""""B"""T',
    'T"""""""=""""""""""""""""""""""T',
    'TTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 8, y: 27, to: 'village', tx: 11, ty: 1, dir: 'bas' },
    { x: 31, y: 6, to: 'terresRouges', tx: 1, ty: 8, dir: 'droite' },
  ],
  signs: [{ x: 9, y: 25, text: ['Savane des Termitières', 'Attention : des Jinémon sauvages se cachent dans les hautes herbes !'] }],
  npcs: [
    dresseur('rival1', 8, 23, 'bas', T('rival1'), 'dresseur:rival1'),
    dresseur('hamadou', 9, 12, 'gauche', T('hamadou')),
    dresseur('mariam', 15, 7, 'haut', T('mariam')),
    dresseur('moussa', 25, 7, 'haut', T('moussa')),
    objet('savane-karite', 3, 25, 'karite', 2),
    objet('savane-calebasse', 28, 20, 'calebasse', 2),
    objet('savane-calebasse2', 14, 3, 'calebasse'),
  ],
};

const terresRouges: Zone = {
  id: 'terresRouges',
  name: 'Terres Rouges',
  theme: 'laterite',
  encounterRate: 0.1,
  encounters: [
    { species: 12, min: 8, max: 11, weight: 25 },
    { species: 55, min: 8, max: 11, weight: 20 },
    { species: 10, min: 8, max: 10, weight: 15 },
    { species: 35, min: 8, max: 11, weight: 15 },
    { species: 20, min: 9, max: 11, weight: 10 },
    { species: 14, min: 8, max: 10, weight: 10 },
    { species: 30, min: 10, max: 12, weight: 5 },
    { species: 72, min: 9, max: 11, weight: 6 },
    { species: 82, min: 8, max: 11, weight: 12 },
    { species: 84, min: 9, max: 11, weight: 8 },
    { species: 74, min: 9, max: 11, weight: 6 },
  ],
  nightEncounters: [
    { species: 86, min: 9, max: 12, weight: 20 },
    { species: 82, min: 8, max: 11, weight: 15 },
    { species: 96, min: 8, max: 11, weight: 15 },
    { species: 94, min: 8, max: 11, weight: 15 },
    { species: 20, min: 9, max: 11, weight: 15 },
    { species: 55, min: 8, max: 11, weight: 10 },
    { species: 98, min: 9, max: 11, weight: 10 },
  ],
  map: [
    '###############=##############',
    '#LLLLRRRLLLLLLL=LLLLLLRRRLLLL#',
    '#LLLLHDHLLLLLLL=LLLLLLHDHLLLL#',
    '###############X##############',
    '#TLLLLLLLLLLLLL=LLLLLLLLLLLLL#',
    '#LLRRRLLEEELGGL=LLLFFLLLLLLTL#',
    '#LLHDHLLLLLLLLL=LLLLLLLLLLTLL#',
    '#LLLLLLLLLLLLLL=LLLLLLLLLLLLL#',
    '========================LLLLL#',
    '#LLLLLLLLLLLLLSLLLLLLLL=LLLLL#',
    '#LTLLLLLFLLLLLLLLLLLLLS=LLLLL#',
    '#LLLLLLLLLLLLLLLLLMMMMM=MMMMM#',
    '#L,,,,,,,,,,,LLLTLMLLLLLLLLLM#',
    '#L,,,,,,,,,#,LLLLLMLKLLLLLKLM#',
    '#L,,,#,,,,,,,LLLLLMLLLLLLLLLM#',
    '#L,,,,,,,,,,,LLLLLMLLLLLLLLLM#',
    '#L,,,,,,,,,,,LLLTLMLLLLLLLLLM#',
    '#L,,,,,,,#,,,LLLLLMLLLLLLLLLM#',
    '#L,#,,,,,,,,,LLLLLMLLLLLLLLLM#',
    '#L,,,,,,,,,,,LLLLLMLKLALALKLM#',
    '#L,,,,,,,,,,,LTLLLMLLLLLLLLLM#',
    '#LLLLLLLLLLLLLLLLLMMMMMMMMMMM#',
    '#LLLLLLLLLLLLLLLLLLLLLLLLLLLL#',
    '##############################',
  ],
  warps: [
    { x: 0, y: 8, to: 'savane', tx: 30, ty: 6, dir: 'gauche' },
    { x: 15, y: 0, to: 'marigot', tx: 16, ty: 26, dir: 'haut' },
  ],
  signs: [
    { x: 22, y: 10, text: ['La Forge des Terres Rouges', 'Maître de Piste : Sirafa, Maître du Feu Sacré (Feu / Métal)'] },
    { x: 14, y: 9, text: ['↑ Marigot des Ancêtres', 'Le passage est obstrué par des rochers fissurés.'] },
  ],
  npcs: [
    soin('guerisseuseTR', 4, 7, 'bas', ['Les Terres Rouges sont rudes. Repose tes Jinémon ici.']),
    boutique('marchandTR', 9, 6, ['calebasse', 'calebasseOrnee', 'karite', 'bissap', 'moringa'], ['Du solide, du forgé, du testé ! Que veux-tu ?']),
    grenier('grenierTR', 12, 6),
    parole('mineur', 'Mineur', 16, 4, 'bas', VILLAGEOIS, [
      'Mineur : Ces rochers fissurés bloquent la route du Marigot.',
      'Mineur : Seul un Jinémon maîtrisant le Métal pourrait les briser… avec la permission du Maître Sirafa et son Insigne de l’Enclume.',
    ]),
    dresseur('bakary', 23, 15, 'haut', T('bakary')),
    dresseur('sirafa', 23, 19, 'haut', T('sirafa')),
    objet('tr-moringa', 3, 19, 'moringa'),
  ],
};

const marigot: Zone = {
  id: 'marigot',
  name: 'Marigot des Ancêtres',
  theme: 'marigot',
  encounterRate: 0.1,
  encounters: [
    { species: 43, min: 13, max: 17, weight: 20 },
    { species: 49, min: 13, max: 17, weight: 15 },
    { species: 22, min: 13, max: 16, weight: 15 },
    { species: 47, min: 14, max: 17, weight: 12 },
    { species: 33, min: 13, max: 16, weight: 10 },
    { species: 16, min: 13, max: 15, weight: 10 },
    { species: 4, min: 13, max: 16, weight: 5 },
    { species: 38, min: 15, max: 18, weight: 4 },
    { species: 37, min: 17, max: 19, weight: 2 },
    { species: 72, min: 14, max: 17, weight: 10 },
    { species: 78, min: 13, max: 17, weight: 10 },
    { species: 91, min: 13, max: 17, weight: 10 },
    { species: 93, min: 15, max: 18, weight: 5 },
    { species: 109, min: 13, max: 16, weight: 8 },
    { species: 115, min: 19, max: 21, weight: 2 },
    { species: 119, min: 20, max: 22, weight: 1 },
  ],
  nightEncounters: [
    { species: 116, min: 15, max: 18, weight: 14 },
    { species: 114, min: 17, max: 20, weight: 8 },
    { species: 47, min: 14, max: 17, weight: 14 },
    { species: 38, min: 15, max: 18, weight: 10 },
    { species: 49, min: 14, max: 17, weight: 12 },
    { species: 94, min: 14, max: 17, weight: 14 },
    { species: 96, min: 14, max: 17, weight: 14 },
    { species: 72, min: 14, max: 17, weight: 12 },
  ],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T""""""""""""""""""""""""""""~~~~T',
    'T",,,,,,"",,,,,,,,,,,,,,,,,,,~~~~T',
    'T",,,,,,"",,,,,,,,,,,,,,,,,,,~~~~T',
    'T",,,,,,"",,,,,,,,,,,,,,,,,,,~~~~T',
    'T",,,,,,"",,,,,,,,,,,,,,,,,,,~~~~T',
    'T",,,,,,"""""""""""""""T",,,,~~~~T',
    'T",,,,,,""""""""""""""""",,,,~~~~T',
    'T",,,,,,"~~~~~~~~~~~~~~~~,,,,~~~~T',
    'T",,,,,,"~~~~~~~~~~~~~~~~"""S~~~~T',
    'T",,,,,,"~~~~~~~~~~~~~~~~====wwww=',
    'T",,,,,,"~~~~~B"AA"B~~~~~""="~~~~T',
    'T",,,,,,"~~~~~""""""~~~~~""="~~~~T',
    'T",,,,,,"~~~~~""""""~~~~~""="~~~~T',
    'T",,,,,,"~~~~~""""""~~~~~""="~~~~T',
    'T",,,,,,"~~~~~""""""~~~~~""="~~~~T',
    'T",,,,,,"~~~~~B""""B~~~~~""="~~~~T',
    'T",,,,,,"~~~~~~~P~~~~~~~~""="~~~~T',
    'T",,,,,,"~~~~~~~P~~~~~~~~""="~~~~T',
    'T""""""""~~~~~~~P~~~~~~~~""="~~~~T',
    'T"T""""""""""""S=""""""""""="~~~~T',
    'T""==========================~~~~T',
    'T""RRR""""""""""=""""""""""""~~~~T',
    'T""HDH""""GG""""="""""""EEE""~~~~T',
    'T"""""""T"""""""="""""T""""""~~~~T',
    'T",,,,,,,"""FF""=""""F"""""""~~~~T',
    'T",,,,,,,"""""""="""F""""""""~~~~T',
    'TTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 16, y: 27, to: 'terresRouges', tx: 15, ty: 1, dir: 'bas' },
    { x: 33, y: 10, to: 'foret', tx: 1, ty: 12, dir: 'droite' },
  ],
  signs: [
    { x: 15, y: 20, text: ['Sanctuaire du Marigot des Ancêtres', 'Maîtresse de Piste : Aminata, Gardienne des Eaux Dormantes (Eau / Esprit)'] },
    { x: 28, y: 9, text: ['Gué du Marigot', 'Seul un Jinémon Eau, guidé par l’Insigne de la Pluie, peut vous faire traverser.'] },
  ],
  npcs: [
    soin('pecheurSoin', 4, 24, 'bas', ['Vieux Pêcheur : Assieds-toi, petit. L’eau du marigot guérit bien des maux.'], {
      skin: '#4a2a1a', outfit: '#3a9ab0', accent: '#f0e0a0', headwear: 'chapeau',
    }),
    boutique('marchandeMarigot', 25, 22, ['calebasse', 'calebasseOrnee', 'bissap', 'moringa', 'kola'], ['Poisson séché ? Non ? Alors des calebasses, peut-être !']),
    grenier('grenierMarigot', 10, 22),
    parole('passeuse', 'Passeuse', 28, 11, 'haut', VILLAGEOIS, [
      'Passeuse : Le gué mène à la Forêt Sacrée. Le courant y est trop fort pour traverser à pied.',
      'Passeuse : Avec l’Insigne de la Pluie, un Jinémon Eau pourra te porter de l’autre côté.',
    ]),
    dresseur('sory', 8, 12, 'droite', T('sory')),
    dresseur('aissata', 26, 15, 'droite', T('aissata')),
    dresseur('binta', 17, 15, 'gauche', T('binta')),
    dresseur('aminata', 16, 12, 'bas', T('aminata')),
    objet('marigot-calebasse', 3, 3, 'calebasseOrnee'),
    objet('marigot-bissap', 23, 3, 'bissap', 2),
  ],
};

const foret: Zone = {
  id: 'foret',
  name: 'Forêt Sacrée',
  theme: 'foret',
  encounterRate: 0.11,
  encounters: [
    { species: 27, min: 18, max: 23, weight: 14 },
    { species: 24, min: 18, max: 22, weight: 14 },
    { species: 26, min: 20, max: 24, weight: 10 },
    { species: 41, min: 19, max: 23, weight: 10 },
    { species: 47, min: 19, max: 23, weight: 9 },
    { species: 22, min: 19, max: 22, weight: 8 },
    { species: 29, min: 22, max: 25, weight: 6 },
    { species: 51, min: 22, max: 25, weight: 6 },
    { species: 69, min: 22, max: 25, weight: 5 },
    { species: 46, min: 21, max: 24, weight: 5 },
    { species: 53, min: 20, max: 24, weight: 6 },
    { species: 1, min: 18, max: 20, weight: 2 },
    { species: 4, min: 18, max: 20, weight: 2 },
    { species: 7, min: 18, max: 20, weight: 2 },
    { species: 88, min: 21, max: 24, weight: 6 },
    { species: 89, min: 19, max: 23, weight: 10 },
    { species: 100, min: 20, max: 23, weight: 8 },
    { species: 101, min: 19, max: 23, weight: 8 },
  ],
  nightEncounters: [
    { species: 101, min: 20, max: 23, weight: 12 },
    { species: 98, min: 20, max: 23, weight: 12 },
    { species: 51, min: 22, max: 25, weight: 10 },
    { species: 29, min: 22, max: 25, weight: 10 },
    { species: 26, min: 20, max: 24, weight: 12 },
    { species: 96, min: 20, max: 23, weight: 10 },
    { species: 95, min: 24, max: 26, weight: 5 },
    { species: 86, min: 20, max: 23, weight: 8 },
    { species: 53, min: 20, max: 24, weight: 10 },
    { species: 47, min: 20, max: 24, weight: 10 },
  ],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTT,,,,,,,,,TTTT,,,,,,,,,,,T',
    'TTTTTTTTTTT,,,B,,,,,TTTT,,,,,,,,,,,T',
    'TTTTTTTTTTT,,,,,,,,,TTTT,,B,,,,,,,,T',
    'TTTTTTTTTT...........TTT,,,,,,,,,,,T',
    'TTTTTTTTTT.,,,,,,,,,.TTT,,,,,,......',
    'TTTTTTTTTT.,,,,,,B,,.TTT,,,,,,.,,,,T',
    'TTTTTTTTTT.,B,,,,,,,.TTT,,,,,,.,,,,T',
    'TT,,B,,,,,.,,,,,,,,,.TTT,,,,,,.,,B,T',
    'TT,,,,,,,,.TTTTTTTTT.TTT,,,,,,.,,,,T',
    'TT,,,,,,,,.TTTTTTTTT.TTTTTTTTT.TTTTT',
    '...........STTTTTTTT.TTTTTTTTT.TTTTT',
    'TT,,,,,,,,TTTTTTTTTT.,,,,,,,,,.TTTTT',
    'TT,,,,,B,,TTTTTTTTTT.,,,,,,,,,.TTTTT',
    'TT,,,,,,,,TTTTTTTTTT.,,,,,,,,,.TTTTT',
    'TT,,,.,,,,TTTTTTTTTT.,,B,,,,,,.TTTTT',
    'TTTTT.TTTTTTTTTTTTTT.,,,,,,,,,.TTTTT',
    'TT"""."""TTTTTTTTTTT...........TTTTT',
    'TTF""A"""TTTTTTTTTTTT,,,,,,B,,TTTTTT',
    'TT"""""""TTTTTTTTTTTT,,,,,,,,,TTTTTT',
    'TT"""""F"TTTTTTTTTTTT,,,,,,,,,TTTTTT',
    'TT"F"""""TTTTTTTTTTTT,,,,,,,,,TTTTTT',
    'TT"""""""TTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 0, y: 12, to: 'marigot', tx: 32, ty: 10, dir: 'gauche' },
    { x: 35, y: 6, to: 'piste', tx: 1, ty: 12, dir: 'droite' },
  ],
  signs: [{ x: 11, y: 12, text: ['Forêt Sacrée', 'Ne cueillez rien sans demander la permission aux génies.'] }],
  npcs: [
    soin('pretresse', 5, 21, 'haut', ['Prêtresse : Les génies de l’autel veillent sur les voyageurs. Que tes Jinémon retrouvent leurs forces.'], {
      skin: '#3a2214', outfit: '#e4b6e8', accent: '#f0f0f0', headwear: 'turban',
    }),
    dresseur('rival2', 20, 11, 'haut', T('rival2'), 'dresseur:rival2'),
    dresseur('seydou', 14, 6, 'bas', T('seydou')),
    dresseur('ali', 25, 17, 'gauche', T('ali')),
    dresseur('ingrid', 27, 20, 'haut', T('ingrid')),
    dresseur('kenji', 32, 8, 'gauche', T('kenji')),
    objet('foret-kola', 7, 22, 'kola'),
    objet('foret-calebasse', 12, 3, 'calebasseOrnee', 2),
    objet('foret-calebasse2', 33, 3, 'calebasseOrnee'),
  ],
};

const piste: Zone = {
  id: 'piste',
  name: 'Piste des Chasseurs Donzos',
  theme: 'piste',
  encounterRate: 0.1,
  encounters: [
    { species: 30, min: 26, max: 30, weight: 18 },
    { species: 20, min: 26, max: 30, weight: 15 },
    { species: 33, min: 26, max: 29, weight: 14 },
    { species: 18, min: 26, max: 29, weight: 10 },
    { species: 15, min: 28, max: 31, weight: 10 },
    { species: 17, min: 28, max: 31, weight: 8 },
    { species: 12, min: 27, max: 30, weight: 8 },
    { species: 45, min: 28, max: 31, weight: 5 },
    { species: 67, min: 28, max: 31, weight: 5 },
    { species: 40, min: 29, max: 32, weight: 4 },
    { species: 32, min: 30, max: 32, weight: 2 },
    { species: 112, min: 26, max: 30, weight: 8 },
    { species: 122, min: 28, max: 31, weight: 8 },
    { species: 121, min: 30, max: 32, weight: 3 },
    { species: 80, min: 26, max: 29, weight: 6 },
  ],
  nightEncounters: [
    { species: 117, min: 28, max: 31, weight: 12 },
    { species: 106, min: 26, max: 30, weight: 10 },
    { species: 53, min: 26, max: 30, weight: 14 },
    { species: 67, min: 28, max: 31, weight: 10 },
    { species: 95, min: 30, max: 31, weight: 10 },
    { species: 97, min: 32, max: 33, weight: 4 },
    { species: 20, min: 26, max: 30, weight: 14 },
    { species: 87, min: 30, max: 32, weight: 4 },
    { species: 99, min: 32, max: 33, weight: 4 },
  ],
  map: [
    'TTTTTTTTTTTTTTT=TTTTTTTTTTTTTT',
    'T"""""""""""""T=T""""""""""""T',
    'T",,,,,,,,,,,,"="""""""""""""T',
    'T",,,,,,,,,,,,"=S""""""""""""T',
    'T",,,,,U,,,,,,"=""TTTTTTTTTTTT',
    'T",,,,,,,,,,,,"=""TB.......BTT',
    'T",,,,,,,,,,,,U=""T.........TT',
    'T",,,,,,,,,,,,"=""T.........TT',
    'T",,,,,,,,U,,,"=""T....K....TT',
    'T",,,,,,,,,,,,"=""T.........TT',
    'T",,,,,,,,,,,,"=""T.........TT',
    'T"""""""""""""S=""T.........TT',
    '==================..........TT',
    'T""""FF"="""""""""T.........TT',
    'T""===========""""T.........TT',
    'T""RRR""""""""""""T.........TT',
    'T""HDH""EEE"G"""""T....K....TT',
    'T"""""""""""""""""T.........TT',
    'T""""""""""F""""U"T.........TT',
    'T",,,,,,,,,,,"""""TB.......BTT',
    'T",,U,,,,,,,,"""""TTTTTTTTTTTT',
    'T",,,,,,,,,,,""""""""""""""""T',
    'T",,,,,,,,,,,""""""""""""""""T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 0, y: 12, to: 'foret', tx: 34, ty: 6, dir: 'gauche' },
    { x: 15, y: 0, to: 'falaise', tx: 15, ty: 28, dir: 'haut' },
  ],
  signs: [
    { x: 14, y: 11, text: ['Piste des Chasseurs Donzos', 'Maître de Piste : Simbon, Grand Chasseur (Bête / Terre)'] },
    { x: 16, y: 3, text: ['↑ Falaise des Ancêtres', 'Accès réservé aux porteurs des trois insignes.'] },
  ],
  npcs: [
    soin('guerisseurDonzo', 4, 17, 'bas', ['Guérisseur : Les chasseurs connaissent les plantes de la brousse. Tes Jinémon seront vite sur pied.'], {
      skin: '#3a2214', outfit: '#9c7a4a', accent: '#e8e0c8', headwear: 'bonnet',
    }),
    boutique('marchandPiste', 9, 15, ['calebasseOrnee', 'calebasseAncetres', 'bissap', 'painDeSinge', 'moringa', 'kola'], [
      'Les chasseurs ne partent jamais sans provisions. Toi non plus, j’espère !',
    ]),
    grenier('grenierPiste', 12, 15),
    {
      id: 'gardienFalaise', name: 'Gardien de la Falaise', x: 15, y: 2, dir: 'bas',
      look: { kind: 'personne', look: { skin: '#3a2214', outfit: '#f0ead8', accent: '#c8401a', headwear: 'masque' } },
      script: {
        kind: 'gardien', condition: 'troisInsignes', flag: 'falaiseOuverte',
        blocked: [
          'Gardien : Halte. Au-delà s’élève la Falaise des Ancêtres et le Panthéon des Légendes.',
          'Gardien : Seul un Initié portant les trois insignes peut gravir ce chemin.',
        ],
        open: [
          'Gardien : L’Enclume, la Pluie et le Traqueur… Tu portes les trois insignes.',
          'Gardien : Les ancêtres t’attendent. Le chemin t’est ouvert.',
        ],
      },
      hideFlag: 'falaiseOuverte',
    },
    dresseur('fode', 21, 9, 'bas', T('fode')),
    dresseur('nantenin', 21, 15, 'haut', T('nantenin')),
    dresseur('simbon', 26, 12, 'gauche', T('simbon')),
    objet('piste-pain', 3, 21, 'painDeSinge'),
  ],
};

const falaise: Zone = {
  id: 'falaise',
  name: 'Falaise des Ancêtres',
  theme: 'falaise',
  encounterRate: 0.1,
  encounters: [
    { species: 58, min: 36, max: 40, weight: 14 },
    { species: 13, min: 36, max: 40, weight: 9 },
    { species: 57, min: 37, max: 41, weight: 9 },
    { species: 66, min: 38, max: 41, weight: 7 },
    { species: 62, min: 36, max: 38, weight: 6 },
    { species: 63, min: 38, max: 42, weight: 4 },
    { species: 59, min: 36, max: 38, weight: 8 },
    { species: 61, min: 40, max: 43, weight: 3 },
    { species: 52, min: 37, max: 41, weight: 8 },
    { species: 54, min: 38, max: 42, weight: 5 },
    { species: 65, min: 37, max: 40, weight: 8 },
    { species: 50, min: 38, max: 41, weight: 5 },
    { species: 56, min: 37, max: 40, weight: 7 },
    { species: 68, min: 42, max: 45, weight: 2 },
    { species: 103, min: 40, max: 43, weight: 3 },
    { species: 104, min: 40, max: 43, weight: 3 },
    { species: 105, min: 38, max: 41, weight: 5 },
    { species: 111, min: 39, max: 42, weight: 4 },
    { species: 108, min: 36, max: 40, weight: 8 },
    { species: 113, min: 39, max: 42, weight: 4 },
    { species: 118, min: 44, max: 46, weight: 1 },
    { species: 120, min: 43, max: 45, weight: 1 },
    { species: 85, min: 37, max: 40, weight: 4 },
    { species: 83, min: 37, max: 40, weight: 4 },
  ],
  nightEncounters: [
    { species: 102, min: 38, max: 42, weight: 10 },
    { species: 107, min: 42, max: 44, weight: 6 },
    { species: 106, min: 36, max: 40, weight: 12 },
    { species: 52, min: 37, max: 41, weight: 12 },
    { species: 54, min: 38, max: 42, weight: 8 },
    { species: 67, min: 37, max: 40, weight: 10 },
    { species: 99, min: 37, max: 40, weight: 8 },
    { species: 97, min: 37, max: 40, weight: 8 },
    { species: 95, min: 37, max: 40, weight: 10 },
    { species: 87, min: 37, max: 40, weight: 8 },
  ],
  map: [
    '################################',
    '################################',
    '########..A.A.A.A.A.A...########',
    '##:::::#................#~...~##',
    '##:::::#................#.....##',
    '##:::::#................#.....##',
    '##:::::#................#.....##',
    '##:::::#................#~...~##',
    '####.##########.###########.####',
    '####.##########.###########.####',
    '###,,,,,,,,,,,,.,,,,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,,,#,,,,,,,,###',
    '###,,,,##,,,,,,.,,,,,,,,,,,#,###',
    '###,,,,,,,,,,,,.,,,,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,,,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,,,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,,,,,,,##,,,###',
    '###,,,,,,,,,#,,.,,,,,,,,,,,,,###',
    '###,,#,,,,,,,,,.,,,,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,#,,,,,,,,,,###',
    '###,,,,,,,,,,,,.,,,,,,,,,,,,,###',
    '###############.S###############',
    '##########...........###########',
    '##########...........###########',
    '##########...........###########',
    '##########...........###########',
    '##########.T.......T.###########',
    '##########...........###########',
    '##########...........###########',
    '###############.################',
  ],
  warps: [{ x: 15, y: 29, to: 'piste', tx: 15, ty: 1, dir: 'bas' }],
  signs: [{ x: 16, y: 21, text: ['Falaise des Ancêtres', 'Au sommet : le Panthéon des Légendes.'] }],
  npcs: [
    soin('ermite', 12, 24, 'droite', ['Ermite : L’air de la falaise est pur. Que tes Jinémon s’y reposent.'], {
      skin: '#3a2214', outfit: '#e8e0d0', accent: '#9c8a5a', headwear: 'turban',
    }),
    boutique('colporteur', 18, 24, ['calebasseAncetres', 'painDeSinge', 'moringa', 'kola'], [
      'Colporteur : J’ai traîné ma charrette jusqu’ici. Mes prix tiennent compte de l’altitude !',
    ]),
    dresseur('moctar', 10, 15, 'droite', T('moctar')),
    dresseur('itzel', 21, 13, 'gauche', T('itzel')),
    dresseur('assa', 15, 4, 'bas', T('assa')),
    {
      id: 'yurugal', name: 'Yurugal', x: 4, y: 5, dir: 'bas', look: { kind: 'creature', species: 70 },
      script: {
        kind: 'legendaire', species: 70, level: 50, flag: 'legendaire:yurugal',
        moves: ['jugementRenardPale', 'eclipseDevorante', 'lectureSable', 'chocPsychique'],
        lines: ['Des empreintes de renard s’effacent et se redessinent dans le sable…', 'Le Renard Pâle lève les yeux vers vous !'],
      },
      showFlag: 'dresseur:assa', hideFlag: 'legendaire:yurugal',
    },
    {
      id: 'bidawa', name: 'Bidawa', x: 27, y: 5, dir: 'bas', look: { kind: 'creature', species: 71 },
      script: {
        kind: 'legendaire', species: 71, level: 50, flag: 'legendaire:bidawa',
        moves: ['colereAncetres', 'courrouxDraconique', 'grondementFalaise', 'pluieHivernage'],
        lines: ['Une fine pluie dorée se met à tomber…', 'Le Serpent d’Or du Wagadou se dresse devant vous !'],
      },
      showFlag: 'dresseur:assa', hideFlag: 'legendaire:bidawa',
    },
    objet('falaise-calebasse', 3, 12, 'calebasseAncetres'),
    objet('falaise-calebasse2', 28, 18, 'calebasseAncetres'),
    objet('falaise-kola', 20, 27, 'kola', 2),
  ],
};

export const ZONES: Record<ZoneId, Zone> = { village, savane, terresRouges, marigot, foret, piste, falaise };

export function getZone(id: ZoneId): Zone {
  return ZONES[id];
}

export function tileAt(zone: Zone, x: number, y: number): string {
  if (y < 0 || y >= zone.map.length || x < 0 || x >= zone.map[0].length) return '#';
  return zone.map[y][x];
}

export const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  haut: { dx: 0, dy: -1 },
  bas: { dx: 0, dy: 1 },
  gauche: { dx: -1, dy: 0 },
  droite: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };
