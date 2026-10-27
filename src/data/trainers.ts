// Dresseurs, rivale et Maîtres de Piste (les Arènes).
import type { MoveId } from './moves';
import { ACTE2_TRAINERS } from './trainersActe2';

export type BadgeId = 'enclume' | 'pluie' | 'traqueur' | 'mirage' | 'pierre' | 'dragon' | 'vent' | 'masque';

export interface Badge {
  id: BadgeId;
  name: string;
  arena: string;
  description: string;
  color: string;
}

export const BADGES: Record<BadgeId, Badge> = {
  enclume: {
    id: 'enclume', name: "Insigne de l'Enclume", arena: 'La Forge des Terres Rouges', color: '#c8401a',
    description: 'Permet aux Jinémon connaissant une attaque Métal de briser les rochers fissurés hors combat.',
  },
  pluie: {
    id: 'pluie', name: 'Insigne de la Pluie', arena: 'Le Marigot des Ancêtres', color: '#3a86c8',
    description: 'Permet aux Jinémon connaissant une attaque Eau de faire traverser les gués.',
  },
  traqueur: {
    id: 'traqueur', name: 'Insigne du Traqueur', arena: 'La Piste des Chasseurs Donzos', color: '#b5733a',
    description: 'Prouve votre valeur aux yeux des chasseurs. Avec trois insignes, la Falaise des Ancêtres vous est ouverte.',
  },
  mirage: {
    id: 'mirage', name: 'Insigne du Mirage', arena: "L'Oasis de Tin-Hinan", color: '#e0a830',
    description: 'Permet à un Jinémon connaissant une attaque Psy de dissiper les mirages du désert.',
  },
  pierre: {
    id: 'pierre', name: 'Insigne de la Pierre', arena: 'La Main de Fatma (Hombori)', color: '#8a7a6a',
    description: 'Les guides de Hombori reconnaissent votre valeur : la route du Delta vous est ouverte.',
  },
  dragon: {
    id: 'dragon', name: 'Insigne du Dragon', arena: 'Le Fleuve de Djenné', color: '#2a9a7a',
    description: 'Les passeurs du fleuve acceptent de vous conduire jusqu’à la Côte des Alizés.',
  },
  vent: {
    id: 'vent', name: 'Insigne du Vent', arena: 'Le Phare des Alizés', color: '#5ab8e0',
    description: 'Un Jinémon connaissant une attaque Vol peut vous porter vers les lieux de soin déjà visités (menu → Voler).',
  },
  masque: {
    id: 'masque', name: 'Insigne du Masque', arena: 'Le Bois des Masques', color: '#7a3a9a',
    description: 'Avec les huit insignes, les portes du Conseil des Griots de Tombouctou s’ouvrent à vous.',
  },
};

export const BADGE_ORDER: BadgeId[] = ['enclume', 'pluie', 'traqueur', 'mirage', 'pierre', 'dragon', 'vent', 'masque'];

export interface CharacterLook {
  skin: string;
  outfit: string;
  accent: string;
  headwear?: 'chapeau' | 'foulard' | 'bonnet' | 'turban' | 'masque';
  /** Visage lisse, sans yeux ni bouche (nopperabō). */
  faceless?: boolean;
}

export interface TrainerMon {
  species: number;
  level: number;
  moves?: MoveId[];
}

export interface Trainer {
  id: string;
  name: string;
  /** Titre affiché en combat (« Maître de Piste », « Chasseur Donzo »…). */
  title: string;
  team: TrainerMon[];
  reward: number;
  /** Paroles avant le combat. */
  intro: string[];
  /** Paroles prononcées à la fin du combat (défaite du dresseur). */
  defeat: string[];
  /** Paroles quand on revient lui parler après l'avoir battu. */
  after: string[];
  badge?: BadgeId;
  look: CharacterLook;
  /** IA : « malin » choisit l'attaque la plus adaptée, « simple » joue plus au hasard. */
  ai: 'simple' | 'malin';
  /** Le Jinémon n° 0 de l'équipe est le starter de la rivale, plus ou moins évolué selon l'étape. */
  rivalStage?: 1 | 2 | 3 | 4 | 5;
  /** Portée du regard en cases (0 : attend qu'on vienne lui parler). Par défaut, 4, ou 0 pour un Maître. */
  sight?: number;
  /**
   * Hors-la-loi : il veut votre argent. Quand ses Jinémon sont à terre, il faut le
   * mettre à terre lui-même, puis l'achever ou le livrer à la garde. Pour un bandit,
   * `defeat` est ce qu'il crie quand son dernier Jinémon tombe, et `after` ce qu'il
   * avoue une fois menotté (ou épargné).
   */
  bandit?: Outlaw;
}

export interface Outlaw {
  /** Tête mise à prix, en cauris (0 : personne ne la réclame). */
  prime: number;
  /** Ce qu'il implore, à genoux. */
  plea: string[];
}

/** Starter choisi par la rivale : celui qui a l'avantage sur le vôtre. */
export function rivalStarter(playerStarter: number): number {
  if (playerStarter === 1) return 7; // Plante → la rivale prend Feu
  if (playerStarter === 4) return 1; // Eau → Plante
  return 4; // Feu → Eau
}

const RIVAL_LOOK: CharacterLook = { skin: '#8a5a3a', outfit: '#e8a030', accent: '#3a6ab8', headwear: 'foulard' };

const ACTE1: Trainer[] = [
  // ── Rivale ──
  {
    id: 'rival1', name: 'Kady', title: 'Rivale', rivalStage: 1, ai: 'simple', reward: 300,
    // Comme le veut la tradition, la rivale ne connaît encore que des attaques de base.
    team: [{ species: 0, level: 4, moves: ['coupDePatte', 'criDeGuerre'] }],
    intro: [
      'Kady : Te voilà enfin ! Grand-père m’a confié un Jinémon, à moi aussi.',
      'Kady : Voyons lequel de nous deux a été le mieux choisi !',
    ],
    defeat: ['Kady : Pas mal… Mais la route est longue jusqu’au Panthéon !'],
    after: ['Kady : On se reverra plus loin. Je deviendrai plus forte !'],
    look: RIVAL_LOOK,
  },
  {
    id: 'rival2', name: 'Kady', title: 'Rivale', rivalStage: 2, ai: 'malin', reward: 1400,
    team: [{ species: 15, level: 25 }, { species: 41, level: 26 }, { species: 0, level: 28 }],
    intro: [
      'Kady : Halte ! La Forêt Sacrée m’a appris beaucoup de choses.',
      'Kady : Les génies m’ont mise à l’épreuve. À ton tour !',
    ],
    defeat: ['Kady : Toujours un pas devant moi… Le Grand Chasseur t’attend à l’est.'],
    after: ['Kady : Je vais méditer près de l’autel. Va, et ne t’arrête pas !'],
    look: RIVAL_LOOK,
  },

  // ── Savane des Termitières ──
  {
    id: 'hamadou', name: 'Hamadou', title: 'Racketteur des Termitières', ai: 'simple', reward: 120,
    team: [{ species: 33, level: 3 }, { species: 14, level: 4 }],
    intro: [
      'Hamadou : Halte. Cette piste est à moi, et on paie pour passer.',
      'Hamadou : Ta bourse. Ou mes bêtes te piétinent.',
    ],
    defeat: ['Hamadou : Mes bêtes… tu les as massacrées ! Tu vas me le payer de ta peau !'],
    after: [
      'Hamadou : D’accord, d’accord… On est toute une bande sur la savane. On guette les Initiés qui quittent le village : leurs cauris sont faciles à prendre.',
    ],
    bandit: { prime: 300, plea: ['Hamadou : Arrête ! Je me rends ! Je n’ai jamais tué personne, je le jure…'] },
    look: { skin: '#9a6a44', outfit: '#7a6238', accent: '#b83a1a', headwear: 'foulard' },
  },
  {
    id: 'mariam', name: 'Mariam', title: 'Arnaqueuse des Pistes', ai: 'simple', reward: 150,
    team: [{ species: 18, level: 3 }, { species: 24, level: 4 }],
    intro: [
      'Mariam : Tu connais l’histoire du voyageur qui gardait sa bourse ? Moi non plus. Ils finissent tous par me la donner.',
      'Mariam : Allez. Sois raisonnable.',
    ],
    defeat: ['Mariam : Mes Jinémon… Petite brute ! Je vais t’arracher les yeux !'],
    after: [
      'Mariam : Anansi l’araignée a volé toutes les histoires du monde. Moi, je volais seulement les bourses. Les juges vont me faire croupir au cachot…',
    ],
    bandit: { prime: 450, plea: ['Mariam : Pitié ! Je ne faisais que raconter des histoires…'] },
    look: { skin: '#7a4a2a', outfit: '#b84ae8', accent: '#f0c040', headwear: 'foulard' },
  },
  {
    id: 'moussa', name: 'Moussa', title: 'Voleur à la Tire', ai: 'simple', reward: 100,
    team: [{ species: 16, level: 3 }, { species: 10, level: 4 }],
    intro: ['Moussa : Pas un geste. Tu vides ton sac par terre, et tu repars sans te retourner.'],
    defeat: ['Moussa : Non… Non ! Tu les as tués ! Je vais te planter !'],
    after: [
      'Moussa : … Merci. Les Termiton évoluent quand ils deviennent forts : ils bâtissent alors des forteresses. C’est tout ce que je sais. Je m’en vais.',
    ],
    bandit: { prime: 0, plea: ['Moussa : Lâche-moi ! Je volais juste pour manger !'] },
    look: { skin: '#6a3a22', outfit: '#e8582a', accent: '#f0f0f0' },
  },

  // ── Terres Rouges ──
  {
    id: 'bakary', name: 'Bakary', title: 'Racketteur de la Forge', ai: 'simple', reward: 350,
    team: [{ species: 55, level: 8 }, { species: 12, level: 9 }],
    intro: [
      'Bakary : Le Maître ne reçoit que ceux qui paient le droit d’entrée.',
      'Bakary : Cinq cents cauris. Tu ne les as pas ? Alors je me servirai sur ton cadavre.',
    ],
    defeat: ['Bakary : Tu crois que j’ai besoin de Jinémon pour te briser les os ?'],
    after: [
      'Bakary : Le Maître dit que le feu craint l’eau et la roche. Prends ce conseil, et laisse-moi la vie sauve.',
    ],
    bandit: { prime: 700, plea: [
      'Bakary : Assez ! Le Maître Sirafa ne sait rien de mon petit commerce… Ne lui dis rien, je t’en supplie !',
    ] },
    look: { skin: '#5a3420', outfit: '#6a6f78', accent: '#e2582a', headwear: 'bonnet' },
  },
  {
    id: 'sirafa', name: 'Sirafa', title: 'Maître du Feu Sacré', ai: 'malin', reward: 1500, badge: 'enclume',
    team: [{ species: 7, level: 11 }, { species: 55, level: 12 }, { species: 8, level: 14 }],
    intro: [
      'Sirafa : Bienvenue à la Forge des Terres Rouges, jeune Initié.',
      'Sirafa : Depuis des générations, ma famille garde le secret du feu et du fer.',
      'Sirafa : Montre-moi si ton cœur est assez solide pour être forgé !',
    ],
    defeat: [
      'Sirafa : Le fer a parlé : tu es digne.',
      "Sirafa : Reçois l'Insigne de l'Enclume. Avec lui, tes Jinémon qui maîtrisent le Métal pourront briser les rochers fissurés.",
      'Sirafa : Les rochers au nord mènent au Marigot des Ancêtres. La Gardienne des Eaux Dormantes t’y attend.',
    ],
    after: ['Sirafa : Le feu purifie, l’enclume façonne. N’oublie jamais d’où vient ta force.'],
    look: { skin: '#4a2a1a', outfit: '#8a3a1a', accent: '#ffcf3a', headwear: 'bonnet' },
  },

  // ── Marigot des Ancêtres ──
  {
    id: 'sory', name: 'Sory', title: 'Pirate du Fleuve', ai: 'simple', reward: 450,
    team: [{ species: 43, level: 15 }, { species: 49, level: 16 }],
    intro: ['Sory : Personne ne traverse le marigot sans payer le péage. Mon péage à moi.'],
    defeat: ['Sory : Le fleuve a emporté mes Jinémon. Il va t’emporter aussi !'],
    after: [
      'Sory : Il y a un Ninkinou dans les eaux du marigot. On voulait le vendre à un riche marchand de Djenné… Il devient un dragon en vieillissant.',
    ],
    bandit: { prime: 900, plea: ['Sory : Je me rends ! Ne me jette pas aux crocodiles !'] },
    look: { skin: '#6a4028', outfit: '#3a9ab0', accent: '#f0e0a0', headwear: 'chapeau' },
  },
  {
    id: 'aissata', name: 'Aïssata', title: 'Braconnière', ai: 'simple', reward: 450,
    team: [{ species: 47, level: 16 }, { species: 43, level: 17 }],
    intro: [
      'Aïssata : Les feux follets du marigot se vendent une fortune. Et toi, tu m’as vue les chasser.',
      'Aïssata : Mauvaise idée.',
    ],
    defeat: ['Aïssata : Tu as éteint mon Feufolet… Tu vas finir au fond de l’eau !'],
    after: [
      'Aïssata : Les feux follets viennent de très loin, au-delà du désert. Je les attrapais pour les marchands du Nord. Voilà, tu sais tout.',
    ],
    bandit: { prime: 800, plea: ['Aïssata : Tu as gagné ! Prends tout, mais laisse-moi vivre !'] },
    look: { skin: '#7a4a30', outfit: '#e85a8f', accent: '#f0f0f0', headwear: 'foulard' },
  },
  {
    id: 'binta', name: 'Binta', title: 'Pilleuse d’Offrandes', ai: 'simple', reward: 600,
    team: [{ species: 49, level: 19 }, { species: 43, level: 20 }],
    intro: [
      'Binta : Les pèlerins laissent des offrandes à la Gardienne. Moi, je les ramasse.',
      'Binta : Et les tiennes, je vais les ramasser aussi.',
    ],
    defeat: ['Binta : Ma dernière bête… Je vais te noyer dans la mare sacrée !'],
    after: [
      'Binta : L’eau éteint le feu, mais la plante boit l’eau : c’est ce que dit la Gardienne. Je ne volerai plus ses offrandes, je le jure.',
    ],
    bandit: { prime: 1000, plea: ['Binta : Pitié ! La Gardienne me maudira si je meurs sur son seuil !'] },
    look: { skin: '#5a3420', outfit: '#2a7ab8', accent: '#c8f0ff', headwear: 'foulard' },
  },
  {
    id: 'aminata', name: 'Aminata', title: 'Gardienne des Eaux Dormantes', ai: 'malin', reward: 2200, badge: 'pluie',
    team: [{ species: 4, level: 19 }, { species: 43, level: 20 }, { species: 37, level: 21 }, { species: 5, level: 23 }],
    intro: [
      'Aminata : … Les fromagers m’ont annoncé ta venue.',
      'Aminata : Cette mare est sacrée. Les esprits des eaux y dorment depuis l’origine du monde.',
      'Aminata : Voyons si le courant de ton âme est assez fort pour les réveiller.',
    ],
    defeat: [
      'Aminata : Le courant t’a porté jusqu’à la victoire.',
      "Aminata : Voici l'Insigne de la Pluie. Grâce à lui, tes Jinémon Eau pourront te faire franchir les gués.",
      'Aminata : À l’est, au-delà du gué, s’étend la Forêt Sacrée. Respecte ses génies.',
    ],
    after: ['Aminata : L’eau a de la mémoire. Elle se souviendra de ton passage.'],
    look: { skin: '#5a3420', outfit: '#2a6a98', accent: '#e4b6e8', headwear: 'turban' },
  },

  // ── Forêt Sacrée ──
  {
    id: 'seydou', name: 'Séydou', title: 'Profanateur du Bois Sacré', ai: 'simple', reward: 700,
    team: [{ species: 27, level: 22 }, { species: 26, level: 23 }],
    intro: [
      'Séydou : Les fétiches de ce bois valent leur pesant d’or. Tu n’as rien vu, d’accord ?',
      'Séydou : Non ? Alors tu ne verras plus rien du tout.',
    ],
    defeat: ['Séydou : Les génies ne me protègent plus… Je vais te tuer de mes mains !'],
    after: [
      'Séydou : Les Kontomblin vivent au pied des baobabs. On les chassait pour leurs cheveux, qui portent chance… Je ne recommencerai plus.',
    ],
    bandit: { prime: 1200, plea: ['Séydou : Je rendrai les fétiches ! Tous ! Mais épargne-moi !'] },
    look: { skin: '#5a3420', outfit: '#e8e0c8', accent: '#5fa83a' },
  },
  {
    id: 'ali', name: 'Ali', title: 'Trafiquant de Masques', ai: 'malin', reward: 750,
    team: [{ species: 47, level: 23 }, { species: 51, level: 24 }],
    intro: [
      'Ali : Les âmes errantes de cette forêt m’obéissent. Et elles ont faim.',
      'Ali : Pose ta bourse et recule. Lentement.',
    ],
    defeat: ['Ali : Mes esprits retournent au silence… Il ne me reste que ma lame.'],
    after: [
      'Ali : Les Spectre craignent l’Esprit et les Ténèbres, et les attaques Normal les traversent. Voilà… c’est tout ce que je sais.',
    ],
    bandit: { prime: 1400, plea: ['Ali : Arrête ! Je connais des secrets ! Laisse-moi vivre et je te dis tout !'] },
    look: { skin: '#4a2a1a', outfit: '#6d5a9c', accent: '#f0c040', headwear: 'masque' },
  },
  {
    id: 'ingrid', name: 'Ingrid', title: 'Mercenaire du Grand Nord', ai: 'malin', reward: 800,
    team: [{ species: 53, level: 22 }, { species: 49, level: 23 }, { species: 52, level: 24 }],
    intro: [
      'Ingrid : J’ai traversé la mer et le désert pour la paye. On m’a payée pour te ralentir.',
      'Ingrid : Rien de personnel.',
    ],
    defeat: ['Ingrid : Mes loups… Tu les as abattus. Alors finissons-en à l’ancienne.'],
    after: [
      'Ingrid : Chez moi, on raconte que le loup Fenrir finira par dévorer le soleil. Ici, c’est l’Éclipse Dévorante. Méfie-toi de ceux qui la cherchent.',
    ],
    bandit: { prime: 1600, plea: ['Ingrid : C’est bon. Je me rends. Un mercenaire sait quand le contrat est perdu.'] },
    look: { skin: '#f0c8a8', outfit: '#3a5a8a', accent: '#f0f0f0', headwear: 'bonnet' },
  },
  {
    id: 'kenji', name: 'Kenji', title: 'Rônin d’Orient', ai: 'malin', reward: 800,
    team: [{ species: 41, level: 24 }, { species: 43, level: 25 }, { species: 45, level: 26 }],
    intro: [
      'Kenji : Mon seigneur est mort. Mon sabre se vend au plus offrant.',
      'Kenji : Aujourd’hui, le plus offrant veut ta bourse.',
    ],
    defeat: ['Kenji : Mes esprits sont tombés avec honneur. À mon tour.'],
    after: [
      'Kenji : Un kitsune gagne une queue tous les cent ans. Le mien n’en avait que trois… Emmène-moi. Je paierai ma dette.',
    ],
    bandit: { prime: 1600, plea: ['Kenji : Achève-moi, ou fais de moi ton prisonnier. Je ne supplierai pas.'] },
    look: { skin: '#e8c098', outfit: '#c83a3a', accent: '#2a2a3a', headwear: 'chapeau' },
  },

  // ── Piste des Chasseurs Donzos ──
  {
    id: 'fode', name: 'Fodé', title: 'Braconnier', ai: 'malin', reward: 1000,
    team: [{ species: 30, level: 28 }, { species: 20, level: 29 }],
    intro: [
      'Fodé : Je porte l’habit des Donzo, mais je chasse pour moi.',
      'Fodé : Et toi, tu as l’air d’un beau gibier bien gras.',
    ],
    defeat: ['Fodé : Le gibier mord… On va voir s’il saigne.'],
    after: [
      'Fodé : Le Grand Chasseur porte un gri-gri pour chaque bête qu’il a affrontée. Moi, je n’en ai aucun. Je n’ai jamais été un vrai chasseur…',
    ],
    bandit: { prime: 1800, plea: ['Fodé : Pitié ! Si les vrais Donzo apprennent ce que j’ai fait, ils me tueront !'] },
    look: { skin: '#5a3420', outfit: '#9c7a4a', accent: '#e8e0c8', headwear: 'bonnet' },
  },
  {
    id: 'nantenin', name: 'Nanténin', title: 'Braconnière', ai: 'malin', reward: 1000,
    team: [{ species: 34, level: 28 }, { species: 21, level: 29 }],
    intro: [
      'Nanténin : Les peaux de Jinémon rares se vendent bien, à la côte.',
      'Nanténin : La tienne aussi, peut-être.',
    ],
    defeat: ['Nanténin : Mes Jinémon… Bon. Je vais devoir te dépecer moi-même.'],
    after: [
      'Nanténin : Le Buffle de Dô rôde dans les hautes herbes de la piste. Une légende. Si tu le croises, sois prudent.',
    ],
    bandit: { prime: 1800, plea: ['Nanténin : Arrête ! Je te dirai où se cache le Buffle de Dô !'] },
    look: { skin: '#6a4028', outfit: '#7a5a32', accent: '#e8c040', headwear: 'foulard' },
  },
  {
    id: 'simbon', name: 'Simbon', title: 'Grand Chasseur', ai: 'malin', reward: 3200, badge: 'traqueur',
    team: [{ species: 31, level: 31 }, { species: 21, level: 32 }, { species: 34, level: 32 }, { species: 32, level: 34 }],
    intro: [
      'Simbon : Je suis Simbon, Grand Chasseur de la confrérie.',
      'Simbon : Chacun de ces gris-gris raconte une traque. Chacune de mes bêtes, une victoire.',
      'Simbon : Ce soir, c’est toi le gibier. Défends-toi !',
    ],
    defeat: [
      'Simbon : Ha ! La traque s’achève et c’est toi le vainqueur.',
      "Simbon : Prends l'Insigne du Traqueur. Avec trois insignes, la Falaise des Ancêtres t’est ouverte.",
      'Simbon : Au sommet t’attend la Gardienne du Panthéon. Que les ancêtres guident tes pas.',
    ],
    after: ['Simbon : Un chasseur respecte toujours sa proie. Respecte tes Jinémon, et ils te suivront partout.'],
    look: { skin: '#3a2214', outfit: '#8a6a3a', accent: '#e8e0c8', headwear: 'chapeau' },
  },

  // ── Falaise des Ancêtres ──
  {
    id: 'moctar', name: 'Moctar', title: 'Pilleur de Tombes', ai: 'malin', reward: 1800,
    team: [{ species: 66, level: 39 }, { species: 57, level: 40 }],
    intro: [
      'Moctar : Les Tellem enterraient leurs morts avec de l’or, dans ces falaises.',
      'Moctar : Tu tombes mal. Les témoins finissent dans les grottes, avec eux.',
    ],
    defeat: ['Moctar : Les morts ne me protègent plus… Je vais t’ajouter à leur collection !'],
    after: [
      'Moctar : La Sphynge garde ces falaises depuis que les caravanes ont relié le Nil au Niger. Elle nous a vus piller… Elle n’oublie rien.',
    ],
    bandit: { prime: 2600, plea: ['Moctar : Laisse-moi vivre ! Je rendrai tout aux Dogon, je le jure sur mes ancêtres !'] },
    look: { skin: '#4a2a1a', outfit: '#e8e0d0', accent: '#4a7ab8', headwear: 'turban' },
  },
  {
    id: 'itzel', name: 'Itzel', title: 'Chasseuse de Reliques', ai: 'malin', reward: 1800,
    team: [{ species: 67, level: 40 }, { species: 63, level: 41 }],
    intro: [
      'Itzel : Mon Xolombre guide les âmes vers le monde des morts.',
      'Itzel : Ton âme, et ta bourse, il les guidera vers moi.',
    ],
    defeat: ['Itzel : Mon guide s’est perdu… Alors je te conduirai moi-même jusqu’à la tombe.'],
    after: [
      'Itzel : Chez moi, le serpent à plumes apporte le vent et la pluie. On dit qu’il en vole un sur ces falaises… Je voulais le capturer pour le vendre.',
    ],
    bandit: { prime: 2600, plea: ['Itzel : Assez ! Je quitte ton pays, je le jure !'] },
    look: { skin: '#b07a50', outfit: '#3ab05a', accent: '#e8403a', headwear: 'foulard' },
  },
  {
    id: 'assa', name: 'Doyenne Assa', title: 'Gardienne du Panthéon', ai: 'malin', reward: 8000, sight: 0,
    team: [
      { species: 23, level: 41 },
      { species: 42, level: 42 },
      { species: 13, level: 42 },
      { species: 37, level: 43 },
      { species: 64, level: 45 },
    ],
    intro: [
      'Assa : Te voici au Panthéon des Légendes, là où dorment les mémoires de tous les peuples.',
      'Assa : J’ai vu passer bien des Initiés. Peu sont arrivés jusqu’ici.',
      'Assa : Ici se rejoignent les contes du fleuve, du désert et des terres lointaines.',
      'Assa : Montre-moi que tu es digne d’y inscrire ton nom !',
    ],
    defeat: [
      'Assa : … Les ancêtres ont parlé. Ton nom sera chanté par les griots.',
      'Assa : Tu es désormais un Maître des Légendes.',
      'Assa : Mais ton voyage ne s’arrête pas ici. Au nord, par-delà le désert, le Conseil des Griots de Tombouctou attend les plus grands Initiés.',
    ],
    after: [
      'Assa : Les Légendes du Panthéon se sont éveillées. Le Renard Pâle et le Serpent d’Or t’attendent sur les autels.',
      'Assa : Le Gardien du Nord te laissera passer. Huit insignes t’ouvriront les portes du Conseil des Griots.',
    ],
    look: { skin: '#3a2214', outfit: '#f0e8d8', accent: '#e85a8f', headwear: 'turban' },
  },
];

const LIST: Trainer[] = [...ACTE1, ...ACTE2_TRAINERS];

export const TRAINERS: Record<string, Trainer> = Object.fromEntries(LIST.map((t) => [t.id, t]));

export function getTrainer(id: string): Trainer {
  const t = TRAINERS[id];
  if (!t) throw new Error(`Dresseur inconnu : ${id}`);
  return t;
}

/** Équipe réelle d'un dresseur (résout le starter de la rivale). */
export function trainerTeam(trainer: Trainer, playerStarter: number): TrainerMon[] {
  return trainer.team.map((mon) => {
    if (mon.species !== 0) return mon;
    const base = rivalStarter(playerStarter);
    const stage = trainer.rivalStage ?? 1;
    const species = base + (stage >= 3 ? 2 : stage === 2 ? 1 : 0);
    return { ...mon, species };
  });
}
