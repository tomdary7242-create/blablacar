// Dresseurs, rivale et Maîtres de Piste (les Arènes).
import type { MoveId } from './moves';

export type BadgeId = 'enclume' | 'pluie' | 'traqueur';

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
};

export const BADGE_ORDER: BadgeId[] = ['enclume', 'pluie', 'traqueur'];

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
  /** Le premier Jinémon du dresseur dépend du starter du joueur (rivale). */
  rivalStage?: 1 | 2;
  /** Portée du regard en cases (0 : attend qu'on vienne lui parler). Par défaut, 4, ou 0 pour un Maître. */
  sight?: number;
}

/** Starter choisi par la rivale : celui qui a l'avantage sur le vôtre. */
export function rivalStarter(playerStarter: number): number {
  if (playerStarter === 1) return 7; // Plante → la rivale prend Feu
  if (playerStarter === 4) return 1; // Eau → Plante
  return 4; // Feu → Eau
}

const RIVAL_LOOK: CharacterLook = { skin: '#8a5a3a', outfit: '#e8a030', accent: '#3a6ab8', headwear: 'foulard' };

const LIST: Trainer[] = [
  // ── Rivale ──
  {
    id: 'rival1', name: 'Kady', title: 'Rivale', rivalStage: 1, ai: 'simple', reward: 300,
    // Comme le veut la tradition, la rivale ne connaît encore que des attaques de base.
    team: [{ species: 0, level: 4, moves: ['coupDePatte', 'criDeGuerre'] }],
    intro: [
      'Kady : Te voilà enfin ! L’Ancien m’a confié un Jinémon, à moi aussi.',
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
    id: 'hamadou', name: 'Hamadou', title: 'Jeune Berger Peul', ai: 'simple', reward: 120,
    team: [{ species: 33, level: 5 }, { species: 14, level: 6 }],
    intro: ['Hamadou : Mon troupeau broute ici depuis l’aube. Tu veux te mesurer à nous ?'],
    defeat: ['Hamadou : Mes zébus vont se moquer de moi…'],
    after: ['Hamadou : Les Zébulle suivent la transhumance jusqu’au fleuve. Ils sont plus robustes qu’ils n’en ont l’air.'],
    look: { skin: '#9a6a44', outfit: '#3a6ab8', accent: '#e8e0c8', headwear: 'chapeau' },
  },
  {
    id: 'mariam', name: 'Mariam', title: 'Conteuse', ai: 'simple', reward: 150,
    team: [{ species: 18, level: 6 }, { species: 24, level: 7 }],
    intro: ['Mariam : Connais-tu l’histoire de Leuk le Lièvre ? Laisse-moi te la raconter… en combat !'],
    defeat: ['Mariam : Ton histoire se termine mieux que la mienne.'],
    after: ['Mariam : Anansi l’araignée a acheté toutes les histoires du monde. Depuis, les conteurs les lui empruntent.'],
    look: { skin: '#7a4a2a', outfit: '#b84ae8', accent: '#f0c040', headwear: 'foulard' },
  },
  {
    id: 'moussa', name: 'Moussa', title: 'Gamin des Termitières', ai: 'simple', reward: 100,
    team: [{ species: 16, level: 5 }, { species: 10, level: 5 }, { species: 16, level: 6 }],
    intro: ['Moussa : J’ai attrapé plein de bestioles dans les termitières ! Regarde !'],
    defeat: ['Moussa : Ouin ! Je retourne fouiller les termitières…'],
    after: ['Moussa : Les Termiton évoluent quand ils deviennent forts. Ils construisent alors des forteresses !'],
    look: { skin: '#6a3a22', outfit: '#e8582a', accent: '#f0f0f0' },
  },

  // ── Terres Rouges ──
  {
    id: 'bakary', name: 'Bakary', title: 'Apprenti Forgeron', ai: 'simple', reward: 350,
    team: [{ species: 55, level: 10 }, { species: 12, level: 11 }],
    intro: ['Bakary : Avant de voir le Maître, il faudra passer par mon enclume !'],
    defeat: ['Bakary : Mon métal n’était pas assez trempé…'],
    after: ['Bakary : Le Maître dit que le feu craint l’eau et la roche. Retiens-le !'],
    look: { skin: '#5a3420', outfit: '#6a6f78', accent: '#e2582a', headwear: 'bonnet' },
  },
  {
    id: 'sirafa', name: 'Sirafa', title: 'Maître du Feu Sacré', ai: 'malin', reward: 1500, badge: 'enclume',
    team: [{ species: 7, level: 12 }, { species: 55, level: 13 }, { species: 8, level: 16 }],
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
    id: 'sory', name: 'Sory', title: 'Pêcheur Bozo', ai: 'simple', reward: 450,
    team: [{ species: 43, level: 15 }, { species: 49, level: 16 }],
    intro: ['Sory : Mon peuple pêche ce fleuve depuis toujours. Tu ne m’effraies pas !'],
    defeat: ['Sory : Le fleuve donne, le fleuve reprend…'],
    after: ['Sory : On dit qu’un Ninkinou vit dans les eaux du marigot. Il devient un dragon quand il vieillit.'],
    look: { skin: '#6a4028', outfit: '#3a9ab0', accent: '#f0e0a0', headwear: 'chapeau' },
  },
  {
    id: 'aissata', name: 'Aïssata', title: 'Pêcheuse', ai: 'simple', reward: 450,
    team: [{ species: 47, level: 16 }, { species: 43, level: 17 }],
    intro: ['Aïssata : Des feux follets dansent sur l’eau à la tombée de la nuit. Le mien est très joueur !'],
    defeat: ['Aïssata : Mon Feufolet s’est égaré… comme moi.'],
    after: ['Aïssata : Les feux follets viennent de très loin, au-delà du désert. Comme beaucoup de Jinémon de cette région.'],
    look: { skin: '#7a4a30', outfit: '#e85a8f', accent: '#f0f0f0', headwear: 'foulard' },
  },
  {
    id: 'binta', name: 'Binta', title: 'Novice des Eaux', ai: 'simple', reward: 600,
    team: [{ species: 49, level: 19 }, { species: 43, level: 20 }],
    intro: ['Binta : La Gardienne médite. Seuls ceux qui me battent peuvent troubler son silence.'],
    defeat: ['Binta : L’eau dormante se réveille… Va, la Gardienne t’attend.'],
    after: ['Binta : L’eau éteint le feu, mais la plante boit l’eau. Pense à tes Jinémon Plante !'],
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
    id: 'seydou', name: 'Séydou', title: 'Initié du Bois Sacré', ai: 'simple', reward: 700,
    team: [{ species: 27, level: 22 }, { species: 26, level: 23 }],
    intro: ['Séydou : Tu foules un sol sacré. Les génies veulent savoir qui tu es.'],
    defeat: ['Séydou : Les génies sont satisfaits. Passe ton chemin en paix.'],
    after: ['Séydou : Les Kontomblin vivent au pied des baobabs. Ils deviennent un avec l’arbre en grandissant.'],
    look: { skin: '#5a3420', outfit: '#e8e0c8', accent: '#5fa83a' },
  },
  {
    id: 'ali', name: 'Ali', title: 'Gardien des Masques', ai: 'malin', reward: 750,
    team: [{ species: 47, level: 23 }, { species: 51, level: 24 }],
    intro: ['Ali : Les âmes errantes de cette forêt viennent de partout. Elles m’obéissent !'],
    defeat: ['Ali : Mes esprits retournent au silence…'],
    after: ['Ali : Les Spectre craignent l’Esprit et les Ténèbres. Mais les Normal ne peuvent pas les toucher.'],
    look: { skin: '#4a2a1a', outfit: '#6d5a9c', accent: '#f0c040', headwear: 'masque' },
  },
  {
    id: 'ingrid', name: 'Ingrid', title: 'Voyageuse du Grand Nord', ai: 'malin', reward: 800,
    team: [{ species: 53, level: 22 }, { species: 49, level: 23 }, { species: 52, level: 24 }],
    intro: [
      'Ingrid : J’ai traversé la mer et le désert pour étudier les Jinémon d’ici.',
      'Ingrid : Les miens viennent des fjords glacés. Prêt ?',
    ],
    defeat: ['Ingrid : Les légendes de ton pays sont puissantes !'],
    after: ['Ingrid : Chez moi, on raconte que le loup Fenrir finira par dévorer le soleil. Ici, c’est l’Éclipse Dévorante !'],
    look: { skin: '#f0c8a8', outfit: '#3a5a8a', accent: '#f0f0f0', headwear: 'bonnet' },
  },
  {
    id: 'kenji', name: 'Kenji', title: 'Pèlerin d’Orient', ai: 'malin', reward: 800,
    team: [{ species: 41, level: 24 }, { species: 43, level: 25 }, { species: 45, level: 26 }],
    intro: ['Kenji : Les esprits de mon archipel se plaisent dans cette forêt. Combattons avec honneur !'],
    defeat: ['Kenji : Une défaite honorable est aussi une leçon.'],
    after: ['Kenji : Un kitsune gagne une queue tous les cent ans. Le mien n’en a que trois, il est encore jeune.'],
    look: { skin: '#e8c098', outfit: '#c83a3a', accent: '#2a2a3a', headwear: 'chapeau' },
  },

  // ── Piste des Chasseurs Donzos ──
  {
    id: 'fode', name: 'Fodé', title: 'Chasseur Donzo', ai: 'malin', reward: 1000,
    team: [{ species: 30, level: 28 }, { species: 20, level: 29 }],
    intro: ['Fodé : Les chasseurs ne laissent entrer dans la clairière que ceux qui ont prouvé leur courage.'],
    defeat: ['Fodé : Tu as l’œil du chasseur.'],
    after: ['Fodé : Le Grand Chasseur porte des gris-gris pour chaque bête qu’il a affrontée.'],
    look: { skin: '#5a3420', outfit: '#9c7a4a', accent: '#e8e0c8', headwear: 'bonnet' },
  },
  {
    id: 'nantenin', name: 'Nanténin', title: 'Chasseuse Donzo', ai: 'malin', reward: 1000,
    team: [{ species: 34, level: 28 }, { species: 21, level: 29 }],
    intro: ['Nanténin : On dit que Soundiata lui-même a été protégé par les chasseurs. Montre-moi ta force !'],
    defeat: ['Nanténin : Le Grand Chasseur sera fier de toi… ou furieux.'],
    after: ['Nanténin : Le Buffle de Dô est une légende. Si tu en croises un dans les herbes, sois prudent !'],
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
    id: 'moctar', name: 'Moctar', title: 'Ascète de la Falaise', ai: 'malin', reward: 1800,
    team: [{ species: 66, level: 39 }, { species: 57, level: 40 }],
    intro: ['Moctar : Résous l’énigme de mon combat, et tu pourras monter plus haut.'],
    defeat: ['Moctar : La réponse était en toi depuis le début.'],
    after: ['Moctar : La Sphynge garde ces falaises depuis que les caravanes ont relié le Nil au Niger.'],
    look: { skin: '#4a2a1a', outfit: '#e8e0d0', accent: '#4a7ab8', headwear: 'turban' },
  },
  {
    id: 'itzel', name: 'Itzel', title: 'Voyageuse de l’Ouest Lointain', ai: 'malin', reward: 1800,
    team: [{ species: 67, level: 40 }, { species: 63, level: 41 }],
    intro: ['Itzel : Mon Xolombre guide les âmes. Aujourd’hui, il va guider la tienne vers la défaite !'],
    defeat: ['Itzel : Mon guide s’est perdu en chemin…'],
    after: ['Itzel : Chez moi, le serpent à plumes apporte le vent et la pluie. On dit qu’il en vole un sur ces falaises.'],
    look: { skin: '#b07a50', outfit: '#3ab05a', accent: '#e8403a', headwear: 'foulard' },
  },
  {
    id: 'assa', name: 'Doyenne Assa', title: 'Gardienne du Panthéon', ai: 'malin', reward: 8000, sight: 0,
    team: [
      { species: 23, level: 43 },
      { species: 42, level: 44 },
      { species: 13, level: 44 },
      { species: 37, level: 45 },
      { species: 64, level: 47 },
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
    ],
    after: ['Assa : Les Légendes du Panthéon se sont éveillées. Le Renard Pâle et le Serpent d’Or t’attendent sur les autels.'],
    look: { skin: '#3a2214', outfit: '#f0e8d8', accent: '#e85a8f', headwear: 'turban' },
  },
];

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
    const species = trainer.rivalStage === 2 ? base + 1 : base;
    return { ...mon, species };
  });
}
