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
//   V  palmier                    Y  mirage (Insigne du Mirage)    Q  tour de banco à torons
//   J  pirogue                    N  tente touareg                 Z  masque sur poteau
//   I  phare
//   g  grenier à Jinémon          C  stand de soins (on parle par-dessus, comme à un étal)
//   @  bâtiment où l'on entre (maison, Case de Soins, Marché, sanctuaire : voir `buildings`)
//   d  sa porte (on la franchit pour entrer)
//
// Dans les grottes (thème « grotte »), « , » désigne les éboulis où rôdent les Jinémon.
// Les intérieurs ont leur propre légende (voir src/ui/interiors.ts).

import type { TrackId } from '../ui/musicScore';
import type { ItemId } from './items';
import type { MoveId } from './moves';
import type { CharacterLook } from './trainers';
import { chambre, linkBuildings, maison, sanctuaire } from './interiors';
import { ENFANT, T, VILLAGEOIS, boutique, caseDeSoins, dresseur, marche, objet, parole, soin } from './zoneKit';
import { cote, desert, djenne, hombori, masques, tombouctou } from './zonesActe2';

/** Zones extérieures : villages, routes, sites. */
export type TownId =
  | 'village'
  | 'savane'
  | 'terresRouges'
  | 'marigot'
  | 'foret'
  | 'piste'
  | 'falaise'
  | 'desert'
  | 'hombori'
  | 'djenne'
  | 'cote'
  | 'masques'
  | 'tombouctou';
/** Toutes les zones : extérieurs, intérieurs uniques et bâtiments de service de chaque ville. */
export type ZoneId = TownId | 'maison' | 'chambre' | 'sanctuaire' | `${TownId}:soins` | `${TownId}:marche`;
export type Dir = 'haut' | 'bas' | 'gauche' | 'droite';
export type Theme = 'village' | 'savane' | 'laterite' | 'marigot' | 'foret' | 'piste' | 'falaise' | 'desert' | 'grotte' | 'delta' | 'cote' | 'masques' | 'cite';

export const SOLID_TILES = new Set([
  'T', 'B', '~', '#', 'H', 'R', 'D', 'G', 'K', 'A', 'M', 'E', 'O', 'U', 'S', 'X', 'w', 'V', 'Y', 'Q', 'J', 'N', 'Z', 'I', '@',
  // Intérieurs : murs, fenêtres, tentures et meubles.
  'W', 'n', 'q', 'b', 'c', 'l', 't', 'j', 'p', 'k', 'f', 'h', 'u', 'v',
  // Grenier à Jinémon et stand de soins (aussi en plein air).
  'g', 'C',
]);
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

/** Condition d'ouverture d'un passage gardé : starter reçu, Gardienne du Panthéon battue, ou nombre d'insignes. */
export type Condition = 'starter' | 'pantheon' | { insignes: number };

export type NpcScript =
  | { kind: 'dialogue'; lines: string[] }
  | { kind: 'soin'; lines: string[] }
  | { kind: 'boutique'; items: ItemId[]; lines: string[] }
  | { kind: 'grenier'; lines: string[] }
  | { kind: 'dresseur'; trainer: string }
  | { kind: 'starter' }
  /** Maman : elle envoie le joueur au sanctuaire, puis soigne son équipe. */
  | { kind: 'maman' }
  | { kind: 'gardien'; condition: Condition; flag: string; blocked: string[]; open: string[] }
  | { kind: 'objet'; item: ItemId; quantity: number; flag: string }
  /** Un PNJ offre un objet une seule fois, puis répète `after`. */
  | { kind: 'don'; item: ItemId; quantity: number; flag: string; lines: string[]; after: string[] }
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
  /** « {nom} » est remplacé par le nom du joueur. */
  text: string[];
  /** Panneau du plan de la ville : affiche la carte des lieux. */
  plan?: boolean;
}

export type InteriorStyle = 'maison' | 'soins' | 'marche' | 'sanctuaire';
export type BuildingKind = InteriorStyle;

/** Bâtiment où l'on entre ; son emprise est marquée « @ » sur la carte, sa porte « d ». */
export interface Building {
  kind: BuildingKind;
  /** Coin haut-gauche de l'emprise. */
  x: number;
  y: number;
  /** Intérieur où mène la porte (par défaut, celui de la Case de Soins ou du Marché de la ville). */
  to?: ZoneId;
  /** Nom affiché sur le plan de la ville. */
  label?: string;
  /** Case de Soins : le soigneur de la ville (son apparence et ses mots). */
  healer?: Npc;
  /** Marché : marchandises et boniment. */
  items?: ItemId[];
  lines?: string[];
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
  /** Rencontres à la pêche (avec la nasse, face à l'eau). */
  fishing?: Encounter[];
  /** Grotte obscure : seule la lanterne éclaire, mieux avec un Jinémon Feu. */
  dark?: boolean;
  /** Point d'arrivée quand on y vole (devant le lieu de soin). */
  flyPoint?: { x: number; y: number; dir: Dir };
  /** Bâtiments où l'on peut entrer. */
  buildings?: Building[];
  /** Intérieur : zone extérieure où il se trouve (carte, musique). */
  parent?: TownId;
  /** Intérieur : toujours éclairé, rendu avec murs et meubles. */
  interior?: InteriorStyle;
  /** Musique propre au lieu (sinon celle de la zone extérieure). */
  music?: TrackId;
  /** Textes propres à ce lieu pour les objets du décor (lit, étagère…). */
  decor?: Record<string, string>;
}

// ── Zones ────────────────────────────────────────────────────────────────

const village: Zone = {
  id: 'village',
  name: 'Village des Greniers',
  theme: 'village',
  encounterRate: 0,
  encounters: [],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTT',
    'TTT"""""""""""""""""""""=""""""""TTT',
    'TT"RRR""""""""""""""""""="""""""""TT',
    'T""HDH""""""""@@@@@@@"""=S"""""""""T',
    'T""""""""""G""@@@@@@@"""=""""""""""T',
    'T""GG""T""""""@@@@@@@"""=""""FFF"""T',
    'T"""""""""""""@@@d@@@"""=""""FF""""T',
    'T""""""""""""""""=""""""=""""""""""T',
    'T"FFF""""""""""""=""""""="""""T""""T',
    'T"FF"""""""""""""=""""""="""""""B""T',
    'T""""""""""==============""""""""""T',
    'T""""@@@@""==B=======O===""@@@@@"""T',
    'T""""@@@@""==============""@@@@@""TT',
    'T""""@d@@""==============""@@d@@""TT',
    'T"""""========================"""""T',
    'T""EE""""""==============""""""""""T',
    'T"""""""E""==============""""""FF""T',
    'T"T"""""""""""S=""""""""""F""""""""T',
    'T"""""""""FF"""="""""""""""""""""""T',
    'T""""@@@@""""""="""RRR"GRRR""RRRG""T',
    'T""""@@@@""""""="""HDH""HDH""HDH"""T',
    'T""""@d@@S"""""="""""""""""""""""""T',
    'T"""""=========================="T"T',
    'T""""""""""""""""""""""""""""""""""T',
    'T""""""""RRR""""""G"""""""""G~~~~F"T',
    'TT"""""""HDHFF"""""T""FF""T"F~~~~"TT',
    'TTT""""""""""""""""""""""""""""""TTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { kind: 'sanctuaire', x: 14, y: 3, to: 'sanctuaire', label: 'Sanctuaire du Hogon' },
    { kind: 'soins', x: 27, y: 11 },
    {
      kind: 'marche', x: 5, y: 11,
      items: ['calebasse', 'karite', 'moringa'],
      lines: ['Marchande : Approche ! Calebasses, karité et moringa, tout ce qu’il faut pour ta première aventure !'],
    },
    { kind: 'maison', x: 5, y: 19, to: 'maison', label: 'Ta maison' },
  ],
  warps: [{ x: 24, y: 0, to: 'savane', tx: 8, ty: 26, dir: 'haut' }],
  signs: [
    { x: 14, y: 17, plan: true, text: ['Plan du Village des Greniers'] },
    { x: 9, y: 21, text: ['Maison de {nom}'] },
    { x: 25, y: 3, text: ['↑ Savane des Termitières', 'Au-delà : les Terres Rouges et la Forge.'] },
  ],
  npcs: [
    parole('conteur', 'Vieux Conteur', 14, 11, 'bas', { skin: '#3a2214', outfit: '#e8e0c8', accent: '#9c8a5a', headwear: 'chapeau' }, [
      'Conteur : Sous ce baobab, on raconte les légendes depuis des siècles.',
      'Conteur : Les Jinémon naissent des forces de la nature et des histoires que les peuples se transmettent.',
      'Conteur : Ici, ce sont les contes du fleuve et de la savane : Ci Wara, les Nommo, Leuk le Lièvre…',
      'Conteur : Mais les caravanes ont aussi apporté des légendes venues de très loin : dragons, renards à neuf queues, feux follets…',
      'Conteur : Tous ont trouvé leur place dans notre monde. Le Ginédex les recense tous.',
    ]),
    parole('enfant', 'Enfant', 20, 12, 'droite', ENFANT, [
      'Enfant : Au nord, il y a des termitières plus hautes que moi ! Et des Jinémon cachés dans les hautes herbes !',
    ]),
    parole('voisine', 'Voisine', 12, 22, 'gauche', { skin: '#6a4028', outfit: '#e85a8f', accent: '#f0c040', headwear: 'foulard' }, [
      'Voisine : Bonjour {nom} ! Tu cherches le sanctuaire du Hogon ? Remonte la rue jusqu’à la place : il est tout au nord.',
      'Voisine : Si tu te perds, le plan du village est affiché sur la place, près du chemin.',
    ]),
    parole('cultivateur', 'Cultivateur', 25, 15, 'bas', VILLAGEOIS, [
      'Cultivateur : Le bâtiment blanc au toit vert, c’est la Case de Soins. On y soigne les Jinémon, gratuitement.',
      'Cultivateur : Il y en a une dans chaque ville, toujours la même. Et le toit de chaume à l’ouest de la place, c’est le Marché.',
    ]),
    parole('grandMere', 'Grand-mère', 22, 21, 'bas', { skin: '#3a2214', outfit: '#3a86c8', accent: '#f0f0f0', headwear: 'foulard' }, [
      'Grand-mère : Les greniers du village ne désemplissent jamais. Les Jinémon des champs veillent sur le mil.',
    ]),
    {
      id: 'sidiki', name: 'Sidiki', x: 24, y: 2, dir: 'bas', look: { kind: 'personne', look: VILLAGEOIS },
      script: { kind: 'dialogue', lines: ['Sidiki : Attends ! Le Hogon veut te voir avant que tu partes. Son sanctuaire est au nord de la place.'] },
      hideFlag: 'starter',
    },
  ],
};

const savane: Zone = {
  id: 'savane',
  name: 'Savane des Termitières',
  fishing: [
    { species: 43, min: 4, max: 7, weight: 20 },
    { species: 109, min: 4, max: 6, weight: 10 },
    { species: 4, min: 5, max: 6, weight: 2 },
  ],
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
    { x: 8, y: 27, to: 'village', tx: 24, ty: 1, dir: 'bas' },
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
    '#TLLLLLLL@@@@LL=LLL@@@@@LLLLL#',
    '#LLRRRLEE@@@@GL=LLL@@@@@LLLTL#',
    '#LLHDHLLL@d@@LL=LLL@@d@@LLTLL#',
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
  buildings: [
    caseDeSoins(19, 4, soin('guerisseuseTR', 0, 0, 'bas', ['Les Terres Rouges sont rudes. Repose tes Jinémon ici.'])),
    marche(9, 4, ['calebasse', 'calebasseOrnee', 'karite', 'bissap', 'moringa'], ['Du solide, du forgé, du testé ! Que veux-tu ?']),
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
    parole('mineur', 'Mineur', 16, 4, 'bas', VILLAGEOIS, [
      'Mineur : Ces rochers fissurés bloquent la route du Marigot.',
      'Mineur : Seul un Jinémon maîtrisant le Métal pourrait les briser… avec la permission du Maître Sirafa et son Insigne de l’Enclume.',
    ]),
    {
      id: 'griotteVoyageuse', name: 'Griotte voyageuse', x: 20, y: 7, dir: 'bas',
      look: { kind: 'personne', look: { skin: '#5a3420', outfit: '#e85a8f', accent: '#f0c040', headwear: 'foulard' } },
      script: {
        kind: 'don', item: 'amulettePartage', quantity: 1, flag: 'don:amulette',
        lines: [
          'Griotte : Tu as battu Sirafa ? Les griots chantent déjà ta victoire !',
          'Griotte : Prends cette amulette. Ceux qui restent en réserve apprendront aussi de tes combats.',
        ],
        after: ['Griotte : Une équipe forte, c’est une équipe où chacun grandit. Pas seulement le plus fort.'],
      },
      showFlag: 'dresseur:sirafa',
    },
    dresseur('bakary', 23, 15, 'haut', T('bakary')),
    dresseur('sirafa', 23, 19, 'haut', T('sirafa')),
    objet('tr-moringa', 3, 19, 'moringa'),
  ],
};

const marigot: Zone = {
  id: 'marigot',
  name: 'Marigot des Ancêtres',
  fishing: [
    { species: 49, min: 14, max: 18, weight: 16 },
    { species: 38, min: 15, max: 18, weight: 12 },
    { species: 91, min: 14, max: 17, weight: 12 },
    { species: 78, min: 14, max: 17, weight: 10 },
    { species: 93, min: 16, max: 19, weight: 6 },
    { species: 37, min: 18, max: 20, weight: 2 },
  ],
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
    'T",@@@@@"~~~~~~~P~~~~~~~~""="~~~~T',
    'T""@@@@@"~~~~~~~P~~~~~~~~""="~~~~T',
    'T"T@@d@@"""""""S=""""""""""="~~~~T',
    'T""==========================~~~~T',
    'T""RRR""""""""""="""@@@@"""""~~~~T',
    'T""HDH""""GG""""="""@@@@EEE""~~~~T',
    'T"""""""T"""""""="""@d@@"""""~~~~T',
    'T",,,,,,,"""FF""======"""""""~~~~T',
    'T",,,,,,,"""""""="""F""""""""~~~~T',
    'TTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    caseDeSoins(3, 18, soin('pecheurSoin', 0, 0, 'bas', ['Vieux Pêcheur : Assieds-toi, petit. L’eau du marigot guérit bien des maux.'], {
        skin: '#4a2a1a', outfit: '#3a9ab0', accent: '#f0e0a0', headwear: 'chapeau',
      })),
    marche(20, 22, ['calebasse', 'calebasseOrnee', 'bissap', 'moringa', 'kola'], ['Poisson séché ? Non ? Alors des calebasses, peut-être !']),
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
  flyPoint: { x: 5, y: 22, dir: 'haut' },
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
    'TT"g"C"F"TTTTTTTTTTTT,,,,,,,,,TTTTTT',
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
    soin('pretresse', 5, 20, 'bas', ['Prêtresse : Les génies de l’autel veillent sur les voyageurs. Que tes Jinémon retrouvent leurs forces.'], {
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
  flyPoint: { x: 14, y: 18, dir: 'haut' },
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
    'T"""""""""""""C"g"T.........TT',
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
    soin('guerisseurDonzo', 14, 16, 'bas', ['Guérisseur : Les chasseurs connaissent les plantes de la brousse. Tes Jinémon seront vite sur pied.'], {
      skin: '#3a2214', outfit: '#9c7a4a', accent: '#e8e0c8', headwear: 'bonnet',
    }),
    boutique('marchandPiste', 9, 15, ['calebasseOrnee', 'calebasseAncetres', 'bissap', 'painDeSinge', 'moringa', 'kola'], [
      'Les chasseurs ne partent jamais sans provisions. Toi non plus, j’espère !',
    ]),
    {
      id: 'gardienFalaise', name: 'Gardien de la Falaise', x: 15, y: 2, dir: 'bas',
      look: { kind: 'personne', look: { skin: '#3a2214', outfit: '#f0ead8', accent: '#c8401a', headwear: 'masque' } },
      script: {
        kind: 'gardien', condition: { insignes: 3 }, flag: 'falaiseOuverte',
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
  fishing: [
    { species: 50, min: 37, max: 41, weight: 14 },
    { species: 44, min: 37, max: 40, weight: 12 },
    { species: 92, min: 38, max: 41, weight: 8 },
    { species: 39, min: 40, max: 42, weight: 2 },
  ],
  flyPoint: { x: 12, y: 25, dir: 'haut' },
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
    '####:###########################',
    '####:###########################',
    '####:###..A.A.A.A.A.A...########',
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
    '##########g.C.....EE.###########',
    '##########...........###########',
    '##########.T.......T.###########',
    '##########...........###########',
    '##########...........###########',
    '###############.################',
  ],
  warps: [
    { x: 15, y: 29, to: 'piste', tx: 15, ty: 1, dir: 'bas' },
    { x: 4, y: 0, to: 'desert', tx: 18, ty: 28, dir: 'haut' },
  ],
  signs: [{ x: 16, y: 21, text: ['Falaise des Ancêtres', 'Au sommet : le Panthéon des Légendes.'] }],
  npcs: [
    soin('ermite', 12, 23, 'bas', ['Ermite : L’air de la falaise est pur. Que tes Jinémon s’y reposent.'], {
      skin: '#3a2214', outfit: '#e8e0d0', accent: '#9c8a5a', headwear: 'turban',
    }),
    boutique('colporteur', 18, 23, ['calebasseAncetres', 'painDeSinge', 'moringa', 'kola'], [
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
    {
      id: 'gardienNord', name: 'Gardien du Nord', x: 4, y: 2, dir: 'bas',
      look: { kind: 'personne', look: { skin: '#3a2214', outfit: '#3a4a9a', accent: '#f0e0a0', headwear: 'turban' } },
      script: {
        kind: 'gardien', condition: 'pantheon', flag: 'nordOuvert',
        blocked: [
          'Gardien du Nord : Ce passage mène au grand désert, puis jusqu’à Tombouctou.',
          'Gardien du Nord : Seul celui que la Gardienne du Panthéon a reconnu peut l’emprunter.',
        ],
        open: [
          'Gardien du Nord : La Doyenne Assa t’a reconnu. Le Conseil des Griots de Tombouctou attend les plus grands Initiés.',
          'Gardien du Nord : Il te faudra huit insignes. Cinq Maîtres de Piste t’attendent sur la route du nord.',
        ],
      },
      hideFlag: 'nordOuvert',
    },
    objet('falaise-calebasse', 3, 12, 'calebasseAncetres'),
    objet('falaise-calebasse2', 28, 18, 'calebasseAncetres'),
    objet('falaise-kola', 20, 27, 'kola', 2),
  ],
};

const OUTDOOR = [village, savane, terresRouges, marigot, foret, piste, falaise, desert, hombori, djenne, cote, masques, tombouctou];
const UNIQUE = [maison, chambre, sanctuaire];
export const ZONES = Object.fromEntries([...OUTDOOR, ...UNIQUE, ...linkBuildings(OUTDOOR, UNIQUE)].map((z) => [z.id, z])) as Record<ZoneId, Zone>;

/** Lieux où l'on rencontre une espèce (« Savane des Termitières (nuit) »…). */
export function habitats(speciesId: number): string[] {
  const out: string[] = [];
  for (const z of Object.values(ZONES)) {
    const kinds: string[] = [];
    const day = z.encounters.some((e) => e.species === speciesId);
    const night = z.nightEncounters?.some((e) => e.species === speciesId);
    if (day && !night && z.nightEncounters?.length) kinds.push('jour');
    if (night && !day) kinds.push('nuit');
    if (z.fishing?.some((e) => e.species === speciesId)) kinds.push('pêche');
    if (day || night || kinds.length) out.push(kinds.length ? `${z.name} (${kinds.join(', ')})` : z.name);
  }
  return out;
}

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
