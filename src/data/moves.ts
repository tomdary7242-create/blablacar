// Répertoire central des 100 attaques de Ginémon.
import type { ElementType } from './types';

export type StatusKind = 'sommeil' | 'poison' | 'paralysie' | 'confusion';
export type StatKey = 'attack' | 'defense' | 'speed';

/**
 * Paliers du GDD :
 *  - base        : attaques physiques de départ (niv. 1 à 20)
 *  - elementaire : attaques élémentaires primaires (niv. 20 à 45)
 *  - statut      : contrôle, soin et modificateurs (tous niveaux)
 *  - divin       : attaques divines / légendaires (niv. 50 à 70)
 */
export type MoveTier = 'base' | 'elementaire' | 'statut' | 'divin';

export interface StageChange {
  stat: StatKey;
  delta: number;
  target: 'self' | 'foe';
  /** Probabilité d'application (1 par défaut). */
  chance?: number;
}

interface MoveDef {
  name: string;
  type: ElementType;
  /** 0 = attaque de statut (aucun dégât). */
  power: number;
  /** Précision en %. */
  accuracy: number;
  pp: number;
  tier: MoveTier;
  description: string;
  priority?: number;
  /** Altération infligée à la cible. */
  status?: { kind: StatusKind; chance: number };
  stages?: StageChange[];
  /** Fraction des PV max du lanceur restaurée. */
  heal?: number;
  /** Fraction des dégâts infligés récupérée en PV. */
  drain?: number;
  /** Fraction des dégâts infligés subie en retour. */
  recoil?: number;
  highCrit?: boolean;
  /** Le lanceur guérit ses propres altérations. */
  cureSelf?: boolean;
}

const DEFS = {
  // ───────────── Normal (11) ─────────────
  coupDePatte: {
    name: 'Coup de Patte', type: 'Normal', power: 40, accuracy: 100, pp: 35, tier: 'base',
    description: 'Un coup de patte vif : la toute première leçon de chaque Jinémon.',
  },
  chargeBrousse: {
    name: 'Charge de Brousse', type: 'Normal', power: 50, accuracy: 95, pp: 30, tier: 'base',
    description: 'Le lanceur fonce tête baissée à travers les hautes herbes.',
  },
  criDeGuerre: {
    name: 'Cri de Guerre', type: 'Normal', power: 0, accuracy: 100, pp: 40, tier: 'statut',
    description: "Un cri qui résonne dans la brousse et fait baisser l'Attaque adverse.",
    stages: [{ stat: 'attack', delta: -1, target: 'foe' }],
  },
  regardPenetrant: {
    name: 'Regard Pénétrant', type: 'Normal', power: 0, accuracy: 100, pp: 30, tier: 'statut',
    description: 'Un regard qui perce les défenses. Baisse la Défense de la cible.',
    stages: [{ stat: 'defense', delta: -1, target: 'foe' }],
  },
  ruseLievre: {
    name: 'Ruse du Lièvre', type: 'Normal', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: "Comme Leuk dans les contes, le lanceur embrouille sa cible : Attaque et Défense baissent.",
    stages: [
      { stat: 'attack', delta: -1, target: 'foe' },
      { stat: 'defense', delta: -1, target: 'foe' },
    ],
  },
  bondLievre: {
    name: 'Bond du Lièvre', type: 'Normal', power: 40, accuracy: 100, pp: 30, tier: 'base', priority: 1,
    description: 'Un bond si rapide qu’il frappe toujours en premier.',
  },
  coupDeCorne: {
    name: 'Coup de Corne', type: 'Normal', power: 65, accuracy: 100, pp: 25, tier: 'elementaire',
    description: 'Un violent coup de cornes, digne des grands troupeaux.',
  },
  ruadeZebu: {
    name: 'Ruade du Zébu', type: 'Normal', power: 85, accuracy: 90, pp: 15, tier: 'elementaire',
    description: 'Une ruade puissante. Peut baisser la Défense de la cible.',
    stages: [{ stat: 'defense', delta: -1, target: 'foe', chance: 0.2 }],
  },
  danseChasseurs: {
    name: 'Danse des Chasseurs', type: 'Normal', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: 'La danse des confréries de chasseurs. Augmente fortement l’Attaque.',
    stages: [{ stat: 'attack', delta: 2, target: 'self' }],
  },
  palabre: {
    name: 'Palabre Apaisante', type: 'Normal', power: 0, accuracy: 100, pp: 10, tier: 'statut',
    description: "Sous l'arbre à palabres, la parole apaise les blessures. Restaure la moitié des PV.",
    heal: 0.5,
  },
  rueeSauvage: {
    name: 'Ruée Sauvage', type: 'Normal', power: 110, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Une charge dévastatrice qui blesse aussi le lanceur.',
    recoil: 1 / 3,
  },

  // ───────────── Plante (9) ─────────────
  pousseMil: {
    name: 'Pousse de Mil', type: 'Plante', power: 45, accuracy: 100, pp: 30, tier: 'base',
    description: 'Des pousses de mil jaillissent du sol et fouettent la cible.',
  },
  racineEpineuse: {
    name: 'Racine Épineuse', type: 'Plante', power: 65, accuracy: 100, pp: 25, tier: 'elementaire',
    description: 'Une racine couverte d’épines s’enroule autour de la cible.',
  },
  etreinteBaobab: {
    name: 'Étreinte du Baobab', type: 'Plante', power: 90, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Les branches du vieux baobab broient la cible. Peut baisser sa Vitesse.',
    stages: [{ stat: 'speed', delta: -1, target: 'foe', chance: 0.2 }],
  },
  berceuseFeuilles: {
    name: 'Berceuse des Feuilles', type: 'Plante', power: 0, accuracy: 75, pp: 15, tier: 'statut',
    description: 'Le bruissement des feuilles endort la cible.',
    status: { kind: 'sommeil', chance: 1 },
  },
  sporesToxiques: {
    name: 'Spores Toxiques', type: 'Plante', power: 0, accuracy: 90, pp: 25, tier: 'statut',
    description: 'Un nuage de spores qui empoisonne la cible.',
    status: { kind: 'poison', chance: 1 },
  },
  seveCollante: {
    name: 'Sève Collante', type: 'Plante', power: 0, accuracy: 75, pp: 20, tier: 'statut',
    description: 'Une sève poisseuse qui entrave la cible et la paralyse.',
    status: { kind: 'paralysie', chance: 1 },
  },
  seveNourriciere: {
    name: 'Sève Nourricière', type: 'Plante', power: 60, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Aspire la sève vitale de la cible. Rend la moitié des dégâts en PV.',
    drain: 0.5,
  },
  lameRonier: {
    name: 'Lame de Rônier', type: 'Plante', power: 70, accuracy: 95, pp: 20, tier: 'elementaire', highCrit: true,
    description: 'Une feuille de rônier tranchante comme une lame. Taux de critique élevé.',
  },
  moissonSacree: {
    name: 'Moisson Sacrée', type: 'Plante', power: 120, accuracy: 90, pp: 5, tier: 'divin',
    description: 'La bénédiction de Ci Wara : une moisson qui nourrit le lanceur.',
    drain: 0.3,
  },

  // ───────────── Terre (6) ─────────────
  griffeArgile: {
    name: "Griffe d'Argile", type: 'Terre', power: 40, accuracy: 100, pp: 35, tier: 'base',
    description: "Des griffes enduites d'argile lacèrent la cible.",
  },
  piegeBoue: {
    name: 'Piège de Boue', type: 'Terre', power: 55, accuracy: 95, pp: 20, tier: 'base',
    description: 'Projette une boue épaisse qui baisse la Vitesse de la cible.',
    stages: [{ stat: 'speed', delta: -1, target: 'foe' }],
  },
  armureBanco: {
    name: 'Armure de Banco', type: 'Terre', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: 'Le lanceur se couvre de banco, la terre crue des greniers. Défense fortement augmentée.',
    stages: [{ stat: 'defense', delta: 2, target: 'self' }],
  },
  fissureLaterite: {
    name: 'Fissure Latéritique', type: 'Terre', power: 80, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Le sol rouge se fend sous les pieds de la cible.',
  },
  assautTermitiere: {
    name: 'Assaut de la Termitière', type: 'Terre', power: 75, accuracy: 95, pp: 15, tier: 'elementaire', highCrit: true,
    description: "Une termitière entière s'abat sur la cible. Taux de critique élevé.",
  },
  grondementFalaise: {
    name: 'Grondement de la Falaise', type: 'Terre', power: 100, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'La grande falaise gronde et la terre tremble violemment.',
  },

  // ───────────── Eau (7) ─────────────
  gicleeSource: {
    name: 'Giclée de Source', type: 'Eau', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Un jet d’eau fraîche jaillit comme une source.',
  },
  vagueFleuve: {
    name: 'Vague du Fleuve', type: 'Eau', power: 70, accuracy: 100, pp: 20, tier: 'elementaire',
    description: 'Une vague du grand fleuve submerge la cible.',
  },
  chantAbysses: {
    name: 'Chant des Abysses', type: 'Eau', power: 85, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Un chant venu des eaux profondes. Peut rendre la cible confuse.',
    status: { kind: 'confusion', chance: 0.3 },
  },
  brumeSoporifique: {
    name: 'Brume Soporifique', type: 'Eau', power: 0, accuracy: 70, pp: 15, tier: 'statut',
    description: 'Une brume tiède monte du marigot et endort la cible.',
    status: { kind: 'sommeil', chance: 1 },
  },
  pluieHivernage: {
    name: "Pluie d'Hivernage", type: 'Eau', power: 0, accuracy: 100, pp: 10, tier: 'statut',
    description: 'La pluie de la saison des pluies ravive le lanceur. Restaure la moitié des PV.',
    heal: 0.5,
  },
  tourbillonMarigot: {
    name: 'Tourbillon du Marigot', type: 'Eau', power: 60, accuracy: 95, pp: 20, tier: 'elementaire',
    description: 'Un tourbillon boueux. Peut baisser la Vitesse de la cible.',
    stages: [{ stat: 'speed', delta: -1, target: 'foe', chance: 0.3 }],
  },
  crueGrandFleuve: {
    name: 'Crue du Grand Fleuve', type: 'Eau', power: 115, accuracy: 85, pp: 5, tier: 'elementaire',
    description: 'Le fleuve sort de son lit et emporte tout sur son passage.',
  },

  // ───────────── Esprit (8) ─────────────
  murmureAncetres: {
    name: 'Murmure des Ancêtres', type: 'Esprit', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Les voix des anciens frappent l’esprit de la cible.',
  },
  miroirEmeraude: {
    name: "Miroir d'Émeraude", type: 'Esprit', power: 70, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Un reflet vert aveuglant. Peut baisser l’Attaque de la cible.',
    stages: [{ stat: 'attack', delta: -1, target: 'foe', chance: 0.3 }],
  },
  danseMasques: {
    name: 'Danse des Masques', type: 'Esprit', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: 'Une danse rituelle qui augmente l’Attaque et la Défense.',
    stages: [
      { stat: 'attack', delta: 1, target: 'self' },
      { stat: 'defense', delta: 1, target: 'self' },
    ],
  },
  paroleGriot: {
    name: 'Parole du Griot', type: 'Esprit', power: 0, accuracy: 90, pp: 15, tier: 'statut',
    description: 'Le récit des généalogies étourdit la cible et la rend confuse.',
    status: { kind: 'confusion', chance: 1 },
  },
  souffleVital: {
    name: 'Souffle Vital', type: 'Esprit', power: 0, accuracy: 100, pp: 10, tier: 'statut',
    description: 'Le souffle des ancêtres purifie le lanceur : soigne ses altérations et la moitié de ses PV.',
    heal: 0.5,
    cureSelf: true,
  },
  voileGenies: {
    name: 'Voile des Génies', type: 'Esprit', power: 65, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Un voile mystique draine l’énergie de la cible.',
    drain: 0.5,
  },
  lueurSacree: {
    name: 'Lueur Sacrée', type: 'Esprit', power: 90, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Une lumière pure jaillit des lieux sacrés.',
  },
  colereAncetres: {
    name: 'Colère des Ancêtres', type: 'Esprit', power: 120, accuracy: 90, pp: 5, tier: 'divin',
    description: 'Les ancêtres déchaînent leur colère contre ceux qui oublient les traditions.',
  },

  // ───────────── Feu (7) ─────────────
  etincelleForge: {
    name: 'Étincelle de Forge', type: 'Feu', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: "Une gerbe d'étincelles jaillie de l'enclume.",
  },
  feuBrousse: {
    name: 'Feu de Brousse', type: 'Feu', power: 65, accuracy: 100, pp: 25, tier: 'elementaire',
    description: 'Les flammes courent dans les herbes sèches.',
  },
  flammeFollette: {
    name: 'Flamme Follette', type: 'Feu', power: 55, accuracy: 100, pp: 20, tier: 'base',
    description: 'Une petite flamme dansante qui égare. Peut rendre la cible confuse.',
    status: { kind: 'confusion', chance: 0.3 },
  },
  souffletForge: {
    name: 'Soufflet de Forge', type: 'Feu', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: "Le soufflet attise le feu intérieur : Attaque et Vitesse augmentent.",
    stages: [
      { stat: 'attack', delta: 1, target: 'self' },
      { stat: 'speed', delta: 1, target: 'self' },
    ],
  },
  brulureSahel: {
    name: 'Brûlure du Sahel', type: 'Feu', power: 90, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'La chaleur écrasante du soleil sahélien à midi.',
  },
  braiseAncestrale: {
    name: 'Braise Ancestrale', type: 'Feu', power: 75, accuracy: 100, pp: 15, tier: 'elementaire', highCrit: true,
    description: 'Une braise jamais éteinte depuis la première forge. Taux de critique élevé.',
  },
  fournaiseSacree: {
    name: 'Fournaise Sacrée', type: 'Feu', power: 120, accuracy: 85, pp: 5, tier: 'divin',
    description: 'Le cœur de la forge originelle se déverse sur la cible.',
  },

  // ───────────── Métal (6) ─────────────
  limaille: {
    name: 'Pluie de Limaille', type: 'Métal', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Une pluie de fines particules de fer.',
  },
  vifArgent: {
    name: 'Vif-Argent', type: 'Métal', power: 40, accuracy: 100, pp: 30, tier: 'base', priority: 1,
    description: 'Un éclair métallique qui frappe toujours en premier.',
  },
  griffeLaiton: {
    name: 'Griffe de Laiton', type: 'Métal', power: 65, accuracy: 95, pp: 25, tier: 'elementaire', highCrit: true,
    description: 'Des griffes de laiton martelé. Taux de critique élevé.',
  },
  lameFerForge: {
    name: 'Lame de Fer Forgé', type: 'Métal', power: 80, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Une lame trempée dans l’eau sacrée.',
  },
  marteauForgeron: {
    name: 'Marteau du Forgeron', type: 'Métal', power: 95, accuracy: 90, pp: 10, tier: 'elementaire',
    description: 'Le lourd marteau du forgeron s’abat sur la cible.',
  },
  chuteEnclume: {
    name: "Chute d'Enclume", type: 'Métal', power: 120, accuracy: 85, pp: 5, tier: 'divin',
    description: "Une enclume ancestrale tombe du ciel. L'Insigne de l'Enclume en porte l'empreinte.",
  },

  // ───────────── Vol (7) ─────────────
  coupDeBec: {
    name: 'Coup de Bec', type: 'Vol', power: 40, accuracy: 100, pp: 35, tier: 'base',
    description: 'Un coup de bec rapide et précis.',
  },
  ventHarmattan: {
    name: "Vent d'Harmattan", type: 'Vol', power: 60, accuracy: 100, pp: 25, tier: 'elementaire',
    description: "Le vent sec et poussiéreux du désert. Peut baisser la Vitesse de la cible.",
    stages: [{ stat: 'speed', delta: -1, target: 'foe', chance: 0.1 }],
  },
  piqueCalao: {
    name: 'Piqué du Calao', type: 'Vol', power: 80, accuracy: 95, pp: 15, tier: 'elementaire',
    description: 'Le lanceur plonge du ciel comme le calao sacré.',
  },
  ailesTonnerre: {
    name: 'Ailes du Tonnerre', type: 'Vol', power: 90, accuracy: 90, pp: 10, tier: 'elementaire',
    description: "Des ailes qui grondent comme l'orage. Peut paralyser la cible.",
    status: { kind: 'paralysie', chance: 0.3 },
  },
  plumesVirevoltantes: {
    name: 'Plumes Virevoltantes', type: 'Vol', power: 0, accuracy: 100, pp: 15, tier: 'statut',
    description: 'Un tourbillon de plumes qui baisse fortement l’Attaque de la cible.',
    stages: [{ stat: 'attack', delta: -2, target: 'foe' }],
  },
  ventArriere: {
    name: 'Vent Arrière', type: 'Vol', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: 'Le lanceur se laisse porter par le vent. Vitesse fortement augmentée.',
    stages: [{ stat: 'speed', delta: 2, target: 'self' }],
  },
  cycloneCeleste: {
    name: 'Cyclone Céleste', type: 'Vol', power: 120, accuracy: 85, pp: 5, tier: 'divin',
    description: 'Un cyclone descendu des cieux ancestraux.',
  },

  // ───────────── Dragon (6) ─────────────
  queueFouettante: {
    name: 'Queue Fouettante', type: 'Dragon', power: 45, accuracy: 100, pp: 25, tier: 'base',
    description: 'Un coup de queue écailleuse.',
  },
  souffleDragon: {
    name: 'Souffle du Dragon', type: 'Dragon', power: 60, accuracy: 100, pp: 20, tier: 'elementaire',
    description: 'Un souffle brûlant et âcre. Peut paralyser la cible.',
    status: { kind: 'paralysie', chance: 0.3 },
  },
  griffeDraconique: {
    name: 'Griffe Draconique', type: 'Dragon', power: 80, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Des griffes acérées chargées d’une énergie antique.',
  },
  danseEcailles: {
    name: 'Danse des Écailles', type: 'Dragon', power: 0, accuracy: 100, pp: 10, tier: 'statut',
    description: 'Une danse mystique : Attaque, Défense et Vitesse augmentent.',
    stages: [
      { stat: 'attack', delta: 1, target: 'self' },
      { stat: 'defense', delta: 1, target: 'self' },
      { stat: 'speed', delta: 1, target: 'self' },
    ],
  },
  courrouxDraconique: {
    name: 'Courroux Draconique', type: 'Dragon', power: 110, accuracy: 90, pp: 5, tier: 'elementaire',
    description: "Un déchaînement de fureur qui épuise le lanceur : son Attaque baisse ensuite.",
    stages: [{ stat: 'attack', delta: -1, target: 'self' }],
  },
  souffleNinkiNanka: {
    name: 'Souffle du Ninki Nanka', type: 'Dragon', power: 130, accuracy: 90, pp: 5, tier: 'divin',
    description: 'Le souffle du dragon des marais, dont on dit que le seul regard pétrifie. Peut paralyser.',
    status: { kind: 'paralysie', chance: 0.3 },
  },

  // ───────────── Ténèbres (7) ─────────────
  larcin: {
    name: 'Larcin', type: 'Ténèbres', power: 40, accuracy: 100, pp: 35, tier: 'base',
    description: 'Une attaque sournoise de petit voleur.',
  },
  morsureHyene: {
    name: "Morsure de l'Hyène", type: 'Ténèbres', power: 60, accuracy: 100, pp: 25, tier: 'elementaire',
    description: "Une morsure qui ne lâche pas. Peut baisser la Défense de la cible.",
    stages: [{ stat: 'defense', delta: -1, target: 'foe', chance: 0.2 }],
  },
  ricanement: {
    name: "Ricanement de l'Hyène", type: 'Ténèbres', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: 'Un rire glaçant qui baisse fortement la Défense de la cible.',
    stages: [{ stat: 'defense', delta: -2, target: 'foe' }],
  },
  embuscadeNocturne: {
    name: 'Embuscade Nocturne', type: 'Ténèbres', power: 75, accuracy: 100, pp: 15, tier: 'elementaire', highCrit: true,
    description: "Le lanceur surgit de l'ombre. Taux de critique élevé.",
  },
  regardMalefique: {
    name: 'Regard Maléfique', type: 'Ténèbres', power: 0, accuracy: 75, pp: 20, tier: 'statut',
    description: 'Un mauvais œil qui paralyse la cible.',
    status: { kind: 'paralysie', chance: 1 },
  },
  crocsNuit: {
    name: 'Crocs de la Nuit', type: 'Ténèbres', power: 85, accuracy: 95, pp: 15, tier: 'elementaire',
    description: 'Des crocs plus noirs que la nuit sans lune.',
  },
  eclipseDevorante: {
    name: 'Éclipse Dévorante', type: 'Ténèbres', power: 120, accuracy: 90, pp: 5, tier: 'divin',
    description: "L'astre est dévoré et les ténèbres s'abattent. Peut baisser la Défense de la cible.",
    stages: [{ stat: 'defense', delta: -1, target: 'foe', chance: 0.2 }],
  },

  // ───────────── Roche (6) ─────────────
  jetCaillou: {
    name: 'Jet de Caillou', type: 'Roche', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Un caillou lancé avec précision.',
  },
  tombeauPierre: {
    name: 'Tombeau de Pierre', type: 'Roche', power: 60, accuracy: 95, pp: 15, tier: 'elementaire',
    description: 'Des pierres emprisonnent la cible et baissent sa Vitesse.',
    stages: [{ stat: 'speed', delta: -1, target: 'foe' }],
  },
  regardPetrifiant: {
    name: 'Regard Pétrifiant', type: 'Roche', power: 70, accuracy: 90, pp: 15, tier: 'elementaire',
    description: 'Un regard de basilic qui change la chair en pierre. Peut paralyser.',
    status: { kind: 'paralysie', chance: 0.3 },
  },
  eboulement: {
    name: 'Éboulement', type: 'Roche', power: 75, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Des blocs se détachent de la falaise.',
  },
  dalleLaterite: {
    name: 'Dalle de Latérite', type: 'Roche', power: 100, accuracy: 80, pp: 10, tier: 'elementaire',
    description: 'Une lourde dalle de latérite rouge écrase la cible.',
  },
  pluieMeteores: {
    name: 'Pluie de Météores', type: 'Roche', power: 120, accuracy: 85, pp: 5, tier: 'divin',
    description: "Les pierres du ciel tombent, comme au temps où les étoiles parlaient aux hommes.",
  },

  // ───────────── Insecte (7) ─────────────
  piqureTermite: {
    name: 'Piqûre de Termite', type: 'Insecte', power: 35, accuracy: 100, pp: 35, tier: 'base',
    description: 'Une piqûre d’ouvrière infatigable.',
  },
  dardVenimeux: {
    name: 'Dard Venimeux', type: 'Insecte', power: 50, accuracy: 100, pp: 25, tier: 'base',
    description: 'Un dard empoisonné. Peut empoisonner la cible.',
    status: { kind: 'poison', chance: 0.3 },
  },
  toileAnansi: {
    name: "Toile d'Anansi", type: 'Insecte', power: 0, accuracy: 95, pp: 30, tier: 'statut',
    description: "La toile de l'araignée conteuse. Baisse fortement la Vitesse de la cible.",
    stages: [{ stat: 'speed', delta: -2, target: 'foe' }],
  },
  lumiereAdze: {
    name: "Lumière de l'Adzé", type: 'Insecte', power: 70, accuracy: 100, pp: 15, tier: 'elementaire',
    description: "La lueur de la luciole Adzé, qui aspire la force vitale. Rend la moitié des dégâts.",
    drain: 0.5,
  },
  nueeCriquets: {
    name: 'Nuée de Criquets', type: 'Insecte', power: 80, accuracy: 95, pp: 15, tier: 'elementaire',
    description: 'Une nuée de criquets pèlerins obscurcit le ciel.',
  },
  mandibules: {
    name: 'Mandibules Broyeuses', type: 'Insecte', power: 90, accuracy: 90, pp: 10, tier: 'elementaire',
    description: 'Des mandibules puissantes. Peut baisser la Défense de la cible.',
    stages: [{ stat: 'defense', delta: -1, target: 'foe', chance: 0.2 }],
  },
  essaimDevastateur: {
    name: 'Essaim Dévastateur', type: 'Insecte', power: 120, accuracy: 85, pp: 5, tier: 'divin',
    description: 'Un essaim si dense qu’il dévore une récolte entière.',
  },

  // ───────────── Spectre (6) ─────────────
  frissonTombe: {
    name: "Frisson d'Outre-Tombe", type: 'Spectre', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Un souffle glacé venu de l’au-delà.',
  },
  ombreRampante: {
    name: 'Ombre Rampante', type: 'Spectre', power: 70, accuracy: 100, pp: 20, tier: 'elementaire',
    description: "L'ombre du lanceur s'étire et frappe par en dessous.",
  },
  maledictionTertre: {
    name: 'Malédiction du Tertre', type: 'Spectre', power: 0, accuracy: 85, pp: 15, tier: 'statut',
    description: 'Une malédiction des tertres funéraires qui empoisonne la cible.',
    status: { kind: 'poison', chance: 1 },
  },
  lamentation: {
    name: 'Lamentation', type: 'Spectre', power: 80, accuracy: 100, pp: 15, tier: 'elementaire',
    description: "Une plainte déchirante. Peut baisser l'Attaque de la cible.",
    stages: [{ stat: 'attack', delta: -1, target: 'foe', chance: 0.3 }],
  },
  rondeAmes: {
    name: 'Ronde des Âmes', type: 'Spectre', power: 95, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Les âmes errantes tourbillonnent autour de la cible.',
  },
  appelMictlan: {
    name: 'Appel du Mictlan', type: 'Spectre', power: 120, accuracy: 90, pp: 5, tier: 'divin',
    description: "L'appel du monde des morts aspire l'énergie de la cible.",
    drain: 0.3,
  },

  // ───────────── Psy (7) ─────────────
  ondeMentale: {
    name: 'Onde Mentale', type: 'Psy', power: 40, accuracy: 100, pp: 30, tier: 'base',
    description: 'Une onde psychique. Peut rendre la cible confuse.',
    status: { kind: 'confusion', chance: 0.1 },
  },
  regardHypnotique: {
    name: 'Regard Hypnotique', type: 'Psy', power: 0, accuracy: 70, pp: 20, tier: 'statut',
    description: 'Des yeux tournoyants plongent la cible dans le sommeil.',
    status: { kind: 'sommeil', chance: 1 },
  },
  illusionKitsune: {
    name: 'Illusion du Kitsune', type: 'Psy', power: 65, accuracy: 100, pp: 20, tier: 'elementaire',
    description: 'Une illusion de renard trompeur. Peut rendre la cible confuse.',
    status: { kind: 'confusion', chance: 0.3 },
  },
  lectureSable: {
    name: 'Lecture du Sable', type: 'Psy', power: 0, accuracy: 100, pp: 20, tier: 'statut',
    description: "Le lanceur lit l'avenir dans le sable, comme le Renard Pâle : Défense et Vitesse augmentent.",
    stages: [
      { stat: 'defense', delta: 1, target: 'self' },
      { stat: 'speed', delta: 1, target: 'self' },
    ],
  },
  enigmeSphinx: {
    name: 'Énigme du Sphinx', type: 'Psy', power: 80, accuracy: 100, pp: 15, tier: 'elementaire',
    description: 'Une énigme insoluble. Peut baisser la Défense de la cible.',
    stages: [{ stat: 'defense', delta: -1, target: 'foe', chance: 0.3 }],
  },
  chocPsychique: {
    name: 'Choc Psychique', type: 'Psy', power: 90, accuracy: 100, pp: 10, tier: 'elementaire',
    description: 'Une puissante onde mentale frappe la cible.',
  },
  jugementRenardPale: {
    name: 'Jugement du Renard Pâle', type: 'Psy', power: 130, accuracy: 90, pp: 5, tier: 'divin',
    description: 'Le Renard Pâle lit le destin de la cible et le scelle. Peut rendre confus.',
    status: { kind: 'confusion', chance: 0.3 },
  },
} satisfies Record<string, MoveDef>;

export type MoveId = keyof typeof DEFS;

export interface Move extends MoveDef {
  id: MoveId;
}

export const MOVES: Record<MoveId, Move> = Object.fromEntries(
  Object.entries(DEFS).map(([id, def]) => [id, { id, ...def }]),
) as Record<MoveId, Move>;

export const MOVE_IDS = Object.keys(MOVES) as MoveId[];

export function getMove(id: MoveId): Move {
  return MOVES[id];
}

export const STATUS_LABELS: Record<StatusKind, string> = {
  sommeil: 'SOM',
  poison: 'PSN',
  paralysie: 'PAR',
  confusion: 'CNF',
};

export const STAT_LABELS: Record<StatKey, string> = {
  attack: "l'Attaque",
  defense: 'la Défense',
  speed: 'la Vitesse',
};
