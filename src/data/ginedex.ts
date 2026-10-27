// Ginédex : base de données des Jinémon et de leurs attaques attitrées.
//
// Chaque lignée d'évolution partage un bassin d'environ 15 attaques (tirées
// du répertoire global de 100 attaques, voir moves.ts) apprises entre le
// niveau 1 et le niveau maximum (70).
//
// Le cœur du bestiaire puise dans les contes et cosmogonies d'Afrique de
// l'Ouest (dogon, bambara, peule, soninké, wolof, akan…), complété par des
// créatures venues d'autres folklores du monde : dragons d'Europe et d'Asie,
// esprits du Japon, spectres du Nord, serpents à plumes de Mésoamérique…

import type { MoveId } from './moves';
import type { TalentId } from './talents';
import type { ElementType } from './types';

export const MAX_LEVEL = 70;

export type BodyPlan =
  | 'quadrupede'
  | 'lezard'
  | 'oiseau'
  | 'serpent'
  | 'insecte'
  | 'araignee'
  | 'esprit'
  | 'bipede'
  | 'amphibien'
  | 'golem'
  | 'dragon'
  | 'arbre'
  | 'lanterne';

export type Feature =
  | 'cornes'
  | 'grandesCornes'
  | 'feuilles'
  | 'criniere'
  | 'nageoires'
  | 'queue'
  | 'aura'
  | 'flamme'
  | 'armure'
  | 'antennes'
  | 'carapace'
  | 'crete'
  | 'epines'
  | 'points'
  | 'oreilles'
  | 'casque'
  | 'bec'
  | 'yeux'
  | 'ailes'
  | 'lueur'
  | 'bosse'
  | 'cheveux'
  | 'eclairs'
  | 'queues3'
  | 'queues9'
  | 'assiette'
  | 'moustaches'
  | 'couronne'
  | 'gemme'
  | 'coiffe'
  | 'chaines'
  | 'defenses'
  | 'pinces'
  | 'clous'
  | 'sansVisage'
  | 'deuxVisages'
  | 'tourbillon';

export interface SpeciesLook {
  plan: BodyPlan;
  /** Couleur principale, secondaire et accent. */
  colors: [string, string, string];
  features: Feature[];
  /** Taille relative (0.4 = petit, 1 = imposant). */
  size: number;
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export type LearnsetEntry = readonly [level: number, move: MoveId];

export interface Species {
  id: number;
  name: string;
  category: string;
  types: readonly [ElementType] | readonly [ElementType, ElementType];
  baseStats: BaseStats;
  /** 3 (quasi impossible) à 255 (très facile). */
  catchRate: number;
  baseXp: number;
  evolution?: { to: number; level: number };
  learnset: readonly LearnsetEntry[];
  talent?: TalentId;
  /** Origine folklorique de la créature. */
  folklore: string;
  description: string;
  look: SpeciesLook;
  legendary?: boolean;
  /** Ne se montre qu'à la nuit tombée. */
  nocturne?: boolean;
  /** Hantise : monstre nocturne qui rôde, visible, sur la carte. */
  hantise?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Bassins d'attaques par lignée (≈ 15 attaques, niveaux 1 → 70)
// ─────────────────────────────────────────────────────────────────────────

const LS = {
  antilope: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [5, 'pousseMil'], [6, 'chargeBrousse'], [9, 'sporesToxiques'], [13, 'griffeArgile'],
    [17, 'racineEpineuse'], [21, 'berceuseFeuilles'], [25, 'seveNourriciere'], [29, 'piegeBoue'], [34, 'lameRonier'],
    [39, 'armureBanco'], [44, 'etreinteBaobab'], [50, 'fissureLaterite'], [58, 'grondementFalaise'], [65, 'moissonSacree'],
  ],
  nommo: [
    [1, 'coupDePatte'], [1, 'regardPenetrant'], [5, 'gicleeSource'], [9, 'murmureAncetres'], [13, 'tourbillonMarigot'],
    [17, 'brumeSoporifique'], [21, 'vagueFleuve'], [25, 'miroirEmeraude'], [29, 'pluieHivernage'], [34, 'voileGenies'],
    [39, 'chantAbysses'], [44, 'lueurSacree'], [50, 'danseMasques'], [58, 'crueGrandFleuve'], [65, 'colereAncetres'],
  ],
  forge: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [5, 'etincelleForge'], [9, 'limaille'], [13, 'flammeFollette'],
    [17, 'griffeLaiton'], [21, 'feuBrousse'], [25, 'souffletForge'], [29, 'braiseAncestrale'], [34, 'lameFerForge'],
    [39, 'brulureSahel'], [44, 'marteauForgeron'], [50, 'vifArgent'], [58, 'chuteEnclume'], [65, 'fournaiseSacree'],
  ],
  termite: [
    [1, 'piqureTermite'], [1, 'regardPenetrant'], [4, 'griffeArgile'], [8, 'armureBanco'], [12, 'dardVenimeux'],
    [16, 'piegeBoue'], [21, 'assautTermitiere'], [26, 'mandibules'], [31, 'fissureLaterite'], [36, 'tombeauPierre'],
    [41, 'nueeCriquets'], [47, 'grondementFalaise'], [53, 'eboulement'], [60, 'essaimDevastateur'], [66, 'dalleLaterite'],
  ],
  laterite: [
    [1, 'jetCaillou'], [1, 'criDeGuerre'], [5, 'etincelleForge'], [9, 'queueFouettante'], [13, 'tombeauPierre'],
    [17, 'feuBrousse'], [21, 'regardPetrifiant'], [25, 'armureBanco'], [30, 'souffleDragon'], [35, 'eboulement'],
    [40, 'griffeDraconique'], [45, 'brulureSahel'], [50, 'dalleLaterite'], [57, 'danseEcailles'], [64, 'pluieMeteores'],
  ],
  pintade: [
    [1, 'coupDeBec'], [1, 'criDeGuerre'], [4, 'coupDePatte'], [7, 'bondLievre'], [11, 'ventHarmattan'],
    [15, 'plumesVirevoltantes'], [19, 'chargeBrousse'], [24, 'piqueCalao'], [29, 'regardPenetrant'], [34, 'ventArriere'],
    [39, 'ailesTonnerre'], [44, 'palabre'], [50, 'rueeSauvage'], [56, 'danseChasseurs'], [63, 'cycloneCeleste'],
  ],
  criquet: [
    [1, 'piqureTermite'], [1, 'bondLievre'], [5, 'dardVenimeux'], [9, 'coupDeBec'], [13, 'ventHarmattan'],
    [17, 'regardPenetrant'], [21, 'nueeCriquets'], [26, 'ventArriere'], [31, 'piqueCalao'], [36, 'mandibules'],
    [41, 'lumiereAdze'], [46, 'ailesTonnerre'], [52, 'essaimDevastateur'], [58, 'danseChasseurs'], [64, 'cycloneCeleste'],
  ],
  lievre: [
    [1, 'coupDePatte'], [1, 'bondLievre'], [5, 'ruseLievre'], [9, 'ondeMentale'], [13, 'chargeBrousse'],
    [17, 'regardHypnotique'], [21, 'lectureSable'], [25, 'larcin'], [30, 'ruadeZebu'], [35, 'illusionKitsune'],
    [40, 'palabre'], [45, 'chocPsychique'], [50, 'ventArriere'], [56, 'rueeSauvage'], [62, 'danseChasseurs'],
  ],
  hyene: [
    [1, 'larcin'], [1, 'criDeGuerre'], [5, 'coupDePatte'], [9, 'morsureHyene'], [13, 'ricanement'],
    [17, 'griffeArgile'], [21, 'embuscadeNocturne'], [26, 'piegeBoue'], [31, 'crocsNuit'], [36, 'regardMalefique'],
    [41, 'fissureLaterite'], [46, 'danseChasseurs'], [52, 'grondementFalaise'], [58, 'rueeSauvage'], [64, 'eclipseDevorante'],
  ],
  calao: [
    [1, 'coupDeBec'], [1, 'regardPenetrant'], [5, 'ondeMentale'], [9, 'ventHarmattan'], [13, 'regardHypnotique'],
    [17, 'piqueCalao'], [22, 'lectureSable'], [27, 'ventArriere'], [32, 'chocPsychique'], [37, 'ailesTonnerre'],
    [42, 'plumesVirevoltantes'], [47, 'souffleVital'], [53, 'enigmeSphinx'], [59, 'cycloneCeleste'], [66, 'colereAncetres'],
  ],
  araignee: [
    [1, 'piqureTermite'], [1, 'toileAnansi'], [5, 'larcin'], [9, 'dardVenimeux'], [13, 'ondeMentale'],
    [17, 'ruseLievre'], [21, 'regardHypnotique'], [26, 'lumiereAdze'], [31, 'illusionKitsune'], [36, 'mandibules'],
    [41, 'lectureSable'], [46, 'chocPsychique'], [52, 'enigmeSphinx'], [58, 'essaimDevastateur'], [64, 'paroleGriot'],
  ],
  luciole: [
    [1, 'piqureTermite'], [1, 'frissonTombe'], [5, 'dardVenimeux'], [10, 'toileAnansi'], [15, 'maledictionTertre'],
    [20, 'lumiereAdze'], [25, 'ombreRampante'], [30, 'regardHypnotique'], [35, 'ventArriere'], [40, 'nueeCriquets'],
    [45, 'lamentation'], [50, 'rondeAmes'], [55, 'voileGenies'], [60, 'essaimDevastateur'], [66, 'appelMictlan'],
  ],
  genie: [
    [1, 'murmureAncetres'], [1, 'pousseMil'], [5, 'regardPenetrant'], [9, 'berceuseFeuilles'], [13, 'racineEpineuse'],
    [17, 'miroirEmeraude'], [21, 'paroleGriot'], [26, 'seveNourriciere'], [31, 'danseMasques'], [36, 'voileGenies'],
    [41, 'etreinteBaobab'], [46, 'souffleVital'], [52, 'lueurSacree'], [58, 'lameRonier'], [64, 'colereAncetres'],
  ],
  sasabonsam: [
    [1, 'larcin'], [1, 'pousseMil'], [6, 'regardPenetrant'], [11, 'sporesToxiques'], [16, 'morsureHyene'],
    [21, 'racineEpineuse'], [26, 'seveCollante'], [31, 'embuscadeNocturne'], [36, 'seveNourriciere'], [41, 'regardMalefique'],
    [46, 'crocsNuit'], [51, 'etreinteBaobab'], [56, 'lameRonier'], [62, 'ricanement'], [68, 'eclipseDevorante'],
  ],
  lion: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [5, 'griffeArgile'], [9, 'bondLievre'], [13, 'chargeBrousse'],
    [17, 'morsureHyene'], [21, 'regardPenetrant'], [26, 'piegeBoue'], [31, 'danseChasseurs'], [36, 'embuscadeNocturne'],
    [41, 'fissureLaterite'], [46, 'crocsNuit'], [52, 'grondementFalaise'], [58, 'palabre'], [64, 'rueeSauvage'],
  ],
  buffle: [
    [1, 'chargeBrousse'], [1, 'criDeGuerre'], [5, 'coupDeCorne'], [10, 'regardPenetrant'], [15, 'griffeArgile'],
    [20, 'armureBanco'], [25, 'ruadeZebu'], [30, 'piegeBoue'], [35, 'danseChasseurs'], [40, 'fissureLaterite'],
    [45, 'rueeSauvage'], [50, 'grondementFalaise'], [55, 'palabre'], [60, 'dalleLaterite'], [66, 'colereAncetres'],
  ],
  zebu: [
    [1, 'chargeBrousse'], [1, 'criDeGuerre'], [5, 'murmureAncetres'], [9, 'regardPenetrant'], [13, 'coupDeCorne'],
    [17, 'palabre'], [21, 'ruadeZebu'], [26, 'miroirEmeraude'], [31, 'armureBanco'], [36, 'danseMasques'],
    [41, 'lueurSacree'], [46, 'souffleVital'], [52, 'rueeSauvage'], [58, 'grondementFalaise'], [64, 'colereAncetres'],
  ],
  banco: [
    [1, 'griffeArgile'], [1, 'armureBanco'], [5, 'jetCaillou'], [9, 'chargeBrousse'], [13, 'piegeBoue'],
    [17, 'tombeauPierre'], [21, 'regardPenetrant'], [26, 'fissureLaterite'], [31, 'eboulement'], [36, 'danseChasseurs'],
    [41, 'grondementFalaise'], [46, 'marteauForgeron'], [52, 'dalleLaterite'], [58, 'rueeSauvage'], [64, 'pluieMeteores'],
  ],
  mamiwata: [
    [1, 'gicleeSource'], [1, 'ondeMentale'], [6, 'regardHypnotique'], [11, 'tourbillonMarigot'], [16, 'brumeSoporifique'],
    [21, 'vagueFleuve'], [26, 'illusionKitsune'], [31, 'pluieHivernage'], [36, 'lectureSable'], [41, 'chantAbysses'],
    [46, 'miroirEmeraude'], [51, 'chocPsychique'], [56, 'voileGenies'], [62, 'enigmeSphinx'], [68, 'crueGrandFleuve'],
  ],
  ninkinanka: [
    [1, 'gicleeSource'], [1, 'queueFouettante'], [5, 'regardPenetrant'], [9, 'tourbillonMarigot'], [14, 'souffleDragon'],
    [19, 'vagueFleuve'], [24, 'regardMalefique'], [29, 'griffeDraconique'], [34, 'brumeSoporifique'], [40, 'chantAbysses'],
    [45, 'danseEcailles'], [50, 'courrouxDraconique'], [55, 'crueGrandFleuve'], [61, 'eclipseDevorante'], [67, 'souffleNinkiNanka'],
  ],
  impundulu: [
    [1, 'coupDeBec'], [1, 'etincelleForge'], [6, 'ventHarmattan'], [11, 'regardPenetrant'], [16, 'flammeFollette'],
    [21, 'piqueCalao'], [26, 'feuBrousse'], [31, 'ailesTonnerre'], [36, 'souffletForge'], [41, 'braiseAncestrale'],
    [46, 'brulureSahel'], [51, 'plumesVirevoltantes'], [56, 'ventArriere'], [62, 'cycloneCeleste'], [68, 'fournaiseSacree'],
  ],
  kitsune: [
    [1, 'murmureAncetres'], [1, 'bondLievre'], [5, 'ondeMentale'], [9, 'flammeFollette'], [13, 'ruseLievre'],
    [17, 'illusionKitsune'], [21, 'miroirEmeraude'], [26, 'regardHypnotique'], [31, 'danseMasques'], [36, 'voileGenies'],
    [41, 'chocPsychique'], [46, 'lueurSacree'], [52, 'lectureSable'], [58, 'souffleVital'], [64, 'colereAncetres'],
  ],
  kappa: [
    [1, 'gicleeSource'], [1, 'coupDePatte'], [5, 'jetCaillou'], [9, 'armureBanco'], [13, 'tourbillonMarigot'],
    [17, 'tombeauPierre'], [21, 'vagueFleuve'], [27, 'regardPenetrant'], [32, 'eboulement'], [37, 'pluieHivernage'],
    [42, 'danseChasseurs'], [47, 'dalleLaterite'], [52, 'grondementFalaise'], [58, 'crueGrandFleuve'], [64, 'pluieMeteores'],
  ],
  tengu: [
    [1, 'coupDeBec'], [1, 'larcin'], [6, 'ventHarmattan'], [11, 'regardPenetrant'], [16, 'plumesVirevoltantes'],
    [21, 'embuscadeNocturne'], [26, 'piqueCalao'], [31, 'lameFerForge'], [36, 'ventArriere'], [41, 'crocsNuit'],
    [46, 'ailesTonnerre'], [51, 'danseChasseurs'], [56, 'regardMalefique'], [62, 'cycloneCeleste'], [68, 'eclipseDevorante'],
  ],
  tsukumogami: [
    [1, 'limaille'], [1, 'frissonTombe'], [6, 'vifArgent'], [11, 'maledictionTertre'], [16, 'griffeLaiton'],
    [21, 'ombreRampante'], [26, 'lamentation'], [31, 'lameFerForge'], [36, 'regardMalefique'], [41, 'rondeAmes'],
    [46, 'marteauForgeron'], [51, 'souffletForge'], [56, 'danseMasques'], [62, 'chuteEnclume'], [68, 'appelMictlan'],
  ],
  follet: [
    [1, 'etincelleForge'], [1, 'frissonTombe'], [5, 'regardHypnotique'], [9, 'flammeFollette'], [13, 'maledictionTertre'],
    [17, 'feuBrousse'], [22, 'ombreRampante'], [27, 'souffletForge'], [32, 'braiseAncestrale'], [37, 'lamentation'],
    [42, 'brulureSahel'], [47, 'rondeAmes'], [53, 'voileGenies'], [59, 'fournaiseSacree'], [65, 'appelMictlan'],
  ],
  kelpie: [
    [1, 'gicleeSource'], [1, 'chargeBrousse'], [5, 'regardPenetrant'], [9, 'bondLievre'], [13, 'tourbillonMarigot'],
    [17, 'morsureHyene'], [22, 'vagueFleuve'], [27, 'ruadeZebu'], [32, 'embuscadeNocturne'], [37, 'brumeSoporifique'],
    [42, 'crocsNuit'], [47, 'chantAbysses'], [53, 'rueeSauvage'], [59, 'crueGrandFleuve'], [65, 'eclipseDevorante'],
  ],
  banshee: [
    [1, 'frissonTombe'], [1, 'ondeMentale'], [6, 'regardPenetrant'], [11, 'maledictionTertre'], [16, 'regardHypnotique'],
    [21, 'ombreRampante'], [26, 'illusionKitsune'], [31, 'lamentation'], [36, 'lectureSable'], [41, 'chocPsychique'],
    [46, 'rondeAmes'], [51, 'voileGenies'], [56, 'enigmeSphinx'], [62, 'appelMictlan'], [68, 'colereAncetres'],
  ],
  draugr: [
    [1, 'frissonTombe'], [1, 'griffeArgile'], [6, 'criDeGuerre'], [11, 'maledictionTertre'], [16, 'piegeBoue'],
    [21, 'ombreRampante'], [26, 'armureBanco'], [31, 'fissureLaterite'], [36, 'lamentation'], [41, 'lameFerForge'],
    [46, 'rondeAmes'], [51, 'grondementFalaise'], [56, 'danseChasseurs'], [62, 'eclipseDevorante'], [68, 'appelMictlan'],
  ],
  fenrir: [
    [1, 'larcin'], [1, 'criDeGuerre'], [5, 'coupDePatte'], [9, 'bondLievre'], [13, 'morsureHyene'],
    [17, 'regardPenetrant'], [21, 'ricanement'], [26, 'embuscadeNocturne'], [31, 'regardMalefique'], [36, 'crocsNuit'],
    [41, 'danseChasseurs'], [45, 'lamentation'], [50, 'ventArriere'], [56, 'rueeSauvage'], [63, 'eclipseDevorante'],
  ],
  salamandre: [
    [1, 'etincelleForge'], [1, 'queueFouettante'], [5, 'jetCaillou'], [9, 'criDeGuerre'], [13, 'feuBrousse'],
    [17, 'tombeauPierre'], [21, 'regardPenetrant'], [26, 'braiseAncestrale'], [31, 'armureBanco'], [36, 'eboulement'],
    [41, 'brulureSahel'], [46, 'souffletForge'], [52, 'dalleLaterite'], [58, 'fournaiseSacree'], [64, 'pluieMeteores'],
  ],
  basilic: [
    [1, 'jetCaillou'], [1, 'regardPenetrant'], [6, 'larcin'], [11, 'regardMalefique'], [16, 'tombeauPierre'],
    [21, 'morsureHyene'], [26, 'regardPetrifiant'], [31, 'embuscadeNocturne'], [36, 'eboulement'], [41, 'crocsNuit'],
    [46, 'ricanement'], [51, 'dalleLaterite'], [56, 'armureBanco'], [62, 'pluieMeteores'], [68, 'eclipseDevorante'],
  ],
  dahu: [
    [1, 'chargeBrousse'], [1, 'regardPenetrant'], [5, 'jetCaillou'], [9, 'bondLievre'], [13, 'ruseLievre'],
    [17, 'coupDeCorne'], [21, 'tombeauPierre'], [26, 'ventArriere'], [31, 'ruadeZebu'], [36, 'eboulement'],
    [41, 'armureBanco'], [46, 'palabre'], [51, 'dalleLaterite'], [57, 'rueeSauvage'], [63, 'pluieMeteores'],
  ],
  tarasque: [
    [1, 'limaille'], [1, 'queueFouettante'], [5, 'criDeGuerre'], [9, 'armureBanco'], [13, 'griffeLaiton'],
    [17, 'morsureHyene'], [22, 'souffleDragon'], [27, 'lameFerForge'], [32, 'vifArgent'], [38, 'griffeDraconique'],
    [44, 'marteauForgeron'], [50, 'danseEcailles'], [56, 'chuteEnclume'], [62, 'crueGrandFleuve'], [68, 'courrouxDraconique'],
  ],
  vouivre: [
    [1, 'queueFouettante'], [1, 'etincelleForge'], [6, 'regardPenetrant'], [11, 'souffleDragon'], [16, 'flammeFollette'],
    [21, 'ventHarmattan'], [26, 'feuBrousse'], [31, 'griffeDraconique'], [36, 'regardMalefique'], [41, 'brulureSahel'],
    [46, 'danseEcailles'], [51, 'ailesTonnerre'], [56, 'courrouxDraconique'], [62, 'fournaiseSacree'], [68, 'cycloneCeleste'],
  ],
  long: [
    [1, 'queueFouettante'], [1, 'criDeGuerre'], [5, 'gicleeSource'], [9, 'souffleDragon'], [14, 'regardPenetrant'],
    [19, 'tourbillonMarigot'], [24, 'griffeDraconique'], [29, 'ventArriere'], [34, 'vagueFleuve'], [39, 'danseEcailles'],
    [44, 'lueurSacree'], [49, 'pluieHivernage'], [55, 'courrouxDraconique'], [61, 'cycloneCeleste'], [67, 'colereAncetres'],
  ],
  scarabee: [
    [1, 'piqureTermite'], [1, 'limaille'], [6, 'armureBanco'], [11, 'vifArgent'], [16, 'griffeLaiton'],
    [21, 'dardVenimeux'], [26, 'lameFerForge'], [31, 'mandibules'], [36, 'lueurSacree'], [41, 'marteauForgeron'],
    [46, 'lumiereAdze'], [51, 'souffletForge'], [56, 'essaimDevastateur'], [62, 'chuteEnclume'], [68, 'fournaiseSacree'],
  ],
  sphinx: [
    [1, 'jetCaillou'], [1, 'ondeMentale'], [6, 'regardPenetrant'], [11, 'regardHypnotique'], [16, 'tombeauPierre'],
    [21, 'enigmeSphinx'], [26, 'lectureSable'], [31, 'regardPetrifiant'], [36, 'armureBanco'], [41, 'chocPsychique'],
    [46, 'eboulement'], [51, 'danseChasseurs'], [56, 'dalleLaterite'], [62, 'pluieMeteores'], [68, 'lueurSacree'],
  ],
  xolo: [
    [1, 'frissonTombe'], [1, 'coupDePatte'], [6, 'bondLievre'], [11, 'maledictionTertre'], [16, 'morsureHyene'],
    [21, 'ombreRampante'], [26, 'regardPenetrant'], [31, 'lamentation'], [36, 'crocsNuit'], [41, 'palabre'],
    [46, 'rondeAmes'], [51, 'danseChasseurs'], [56, 'rueeSauvage'], [62, 'souffleVital'], [68, 'appelMictlan'],
  ],
  coatl: [
    [1, 'coupDeBec'], [1, 'queueFouettante'], [6, 'ventHarmattan'], [11, 'souffleDragon'], [16, 'regardPenetrant'],
    [21, 'piqueCalao'], [26, 'griffeDraconique'], [31, 'ventArriere'], [36, 'lueurSacree'], [41, 'ailesTonnerre'],
    [46, 'danseEcailles'], [51, 'pluieHivernage'], [56, 'courrouxDraconique'], [62, 'cycloneCeleste'], [68, 'colereAncetres'],
  ],
  leshy: [
    [1, 'pousseMil'], [1, 'ondeMentale'], [6, 'regardPenetrant'], [11, 'berceuseFeuilles'], [16, 'racineEpineuse'],
    [21, 'illusionKitsune'], [26, 'seveCollante'], [31, 'lectureSable'], [36, 'seveNourriciere'], [41, 'chocPsychique'],
    [46, 'etreinteBaobab'], [51, 'regardHypnotique'], [56, 'lameRonier'], [62, 'enigmeSphinx'], [68, 'moissonSacree'],
  ],
  mandragore: [
    [1, 'pousseMil'], [1, 'criDeGuerre'], [5, 'frissonTombe'], [9, 'sporesToxiques'], [13, 'racineEpineuse'],
    [17, 'berceuseFeuilles'], [21, 'ombreRampante'], [26, 'seveNourriciere'], [31, 'lamentation'], [36, 'seveCollante'],
    [41, 'etreinteBaobab'], [46, 'rondeAmes'], [52, 'lameRonier'], [58, 'voileGenies'], [64, 'moissonSacree'],
  ],
  renardPale: [
    [1, 'ondeMentale'], [1, 'larcin'], [8, 'ruseLievre'], [15, 'regardHypnotique'], [22, 'lectureSable'],
    [29, 'illusionKitsune'], [36, 'embuscadeNocturne'], [43, 'chocPsychique'], [47, 'ricanement'], [50, 'regardMalefique'],
    [54, 'crocsNuit'], [58, 'enigmeSphinx'], [62, 'danseMasques'], [66, 'eclipseDevorante'], [70, 'jugementRenardPale'],
  ],
  bida: [
    [1, 'queueFouettante'], [1, 'griffeArgile'], [8, 'regardPenetrant'], [15, 'piegeBoue'], [22, 'souffleDragon'],
    [29, 'fissureLaterite'], [36, 'regardMalefique'], [43, 'griffeDraconique'], [47, 'armureBanco'], [50, 'grondementFalaise'],
    [54, 'danseEcailles'], [58, 'pluieHivernage'], [62, 'courrouxDraconique'], [66, 'pluieMeteores'], [70, 'colereAncetres'],
  ],
  // ── Nouvelles lignées ──
  pangolin: [
    [1, 'griffeArgile'], [1, 'armureBanco'], [5, 'jetCaillou'], [9, 'limaille'], [13, 'piegeBoue'],
    [17, 'griffeLaiton'], [21, 'tombeauPierre'], [25, 'regardPenetrant'], [30, 'fissureLaterite'], [35, 'lameFerForge'],
    [40, 'eboulement'], [45, 'marteauForgeron'], [51, 'grondementFalaise'], [57, 'dalleLaterite'], [64, 'chuteEnclume'],
  ],
  cameleon: [
    [1, 'pousseMil'], [1, 'ruseLievre'], [5, 'ondeMentale'], [9, 'seveCollante'], [13, 'racineEpineuse'],
    [17, 'regardHypnotique'], [21, 'illusionKitsune'], [26, 'berceuseFeuilles'], [31, 'lameRonier'], [36, 'lectureSable'],
    [41, 'chocPsychique'], [46, 'seveNourriciere'], [52, 'etreinteBaobab'], [58, 'enigmeSphinx'], [64, 'moissonSacree'],
  ],
  hippo: [
    [1, 'chargeBrousse'], [1, 'gicleeSource'], [5, 'criDeGuerre'], [9, 'piegeBoue'], [13, 'tourbillonMarigot'],
    [17, 'armureBanco'], [21, 'vagueFleuve'], [26, 'ruadeZebu'], [31, 'fissureLaterite'], [36, 'pluieHivernage'],
    [41, 'chantAbysses'], [46, 'grondementFalaise'], [52, 'rueeSauvage'], [58, 'crueGrandFleuve'], [64, 'dalleLaterite'],
  ],
  dromadaire: [
    [1, 'chargeBrousse'], [1, 'regardPenetrant'], [5, 'jetCaillou'], [9, 'griffeArgile'], [13, 'ventHarmattan'],
    [17, 'piegeBoue'], [21, 'ruadeZebu'], [26, 'palabre'], [31, 'fissureLaterite'], [36, 'brulureSahel'],
    [41, 'danseChasseurs'], [46, 'tombeauPierre'], [52, 'rueeSauvage'], [58, 'grondementFalaise'], [64, 'dalleLaterite'],
  ],
  scorpion: [
    [1, 'piqureTermite'], [1, 'criDeGuerre'], [5, 'dardVenimeux'], [9, 'griffeArgile'], [13, 'jetCaillou'],
    [17, 'sporesToxiques'], [21, 'mandibules'], [26, 'tombeauPierre'], [31, 'regardHypnotique'], [36, 'fissureLaterite'],
    [41, 'enigmeSphinx'], [46, 'nueeCriquets'], [52, 'chocPsychique'], [58, 'essaimDevastateur'], [64, 'dalleLaterite'],
  ],
  djinnSable: [
    [1, 'jetCaillou'], [1, 'ondeMentale'], [5, 'ventHarmattan'], [9, 'piegeBoue'], [13, 'regardHypnotique'],
    [17, 'illusionKitsune'], [21, 'fissureLaterite'], [26, 'lectureSable'], [31, 'brulureSahel'], [36, 'chocPsychique'],
    [41, 'voileGenies'], [46, 'enigmeSphinx'], [52, 'grondementFalaise'], [58, 'cycloneCeleste'], [64, 'pluieMeteores'],
  ],
  kponyungo: [
    [1, 'etincelleForge'], [1, 'criDeGuerre'], [5, 'morsureHyene'], [9, 'coupDeCorne'], [13, 'flammeFollette'],
    [17, 'regardMalefique'], [21, 'feuBrousse'], [26, 'embuscadeNocturne'], [31, 'braiseAncestrale'], [36, 'danseMasques'],
    [41, 'crocsNuit'], [46, 'brulureSahel'], [52, 'souffletForge'], [58, 'eclipseDevorante'], [64, 'fournaiseSacree'],
  ],
  okapi: [
    [1, 'coupDePatte'], [1, 'murmureAncetres'], [5, 'bondLievre'], [9, 'regardPenetrant'], [13, 'chargeBrousse'],
    [17, 'miroirEmeraude'], [21, 'coupDeCorne'], [26, 'paroleGriot'], [31, 'voileGenies'], [36, 'ruadeZebu'],
    [41, 'souffleVital'], [46, 'lueurSacree'], [52, 'rueeSauvage'], [58, 'danseMasques'], [64, 'colereAncetres'],
  ],
  mandrill: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [5, 'ondeMentale'], [9, 'larcin'], [13, 'regardHypnotique'],
    [17, 'chargeBrousse'], [21, 'illusionKitsune'], [26, 'palabre'], [31, 'lectureSable'], [36, 'chocPsychique'],
    [41, 'ruadeZebu'], [46, 'enigmeSphinx'], [52, 'danseChasseurs'], [58, 'rueeSauvage'], [64, 'paroleGriot'],
  ],
  crocodile: [
    [1, 'queueFouettante'], [1, 'gicleeSource'], [5, 'regardPenetrant'], [9, 'morsureHyene'], [13, 'tourbillonMarigot'],
    [17, 'embuscadeNocturne'], [21, 'vagueFleuve'], [26, 'souffleDragon'], [31, 'crocsNuit'], [36, 'danseEcailles'],
    [41, 'griffeDraconique'], [46, 'chantAbysses'], [52, 'courrouxDraconique'], [58, 'crueGrandFleuve'], [64, 'pluieHivernage'],
  ],
  lamantin: [
    [1, 'gicleeSource'], [1, 'murmureAncetres'], [5, 'ondeMentale'], [9, 'berceuseFeuilles'], [13, 'tourbillonMarigot'],
    [17, 'brumeSoporifique'], [21, 'vagueFleuve'], [26, 'regardHypnotique'], [31, 'souffleVital'], [36, 'chantAbysses'],
    [41, 'chocPsychique'], [46, 'pluieHivernage'], [52, 'miroirEmeraude'], [58, 'crueGrandFleuve'], [64, 'enigmeSphinx'],
  ],
  hibou: [
    [1, 'coupDeBec'], [1, 'regardPenetrant'], [5, 'frissonTombe'], [9, 'regardHypnotique'], [13, 'ventHarmattan'],
    [17, 'maledictionTertre'], [21, 'piqueCalao'], [26, 'ombreRampante'], [31, 'embuscadeNocturne'], [36, 'plumesVirevoltantes'],
    [41, 'lamentation'], [46, 'ailesTonnerre'], [52, 'rondeAmes'], [58, 'cycloneCeleste'], [64, 'eclipseDevorante'],
  ],
  chauveSouris: [
    [1, 'larcin'], [1, 'coupDeBec'], [5, 'ondeMentale'], [9, 'morsureHyene'], [13, 'ventHarmattan'],
    [17, 'regardMalefique'], [21, 'embuscadeNocturne'], [26, 'piqueCalao'], [31, 'crocsNuit'], [36, 'ventArriere'],
    [41, 'ricanement'], [46, 'ailesTonnerre'], [52, 'lamentation'], [58, 'cycloneCeleste'], [64, 'eclipseDevorante'],
  ],
  chat: [
    [1, 'coupDePatte'], [1, 'frissonTombe'], [5, 'bondLievre'], [9, 'larcin'], [13, 'maledictionTertre'],
    [17, 'flammeFollette'], [21, 'ombreRampante'], [26, 'illusionKitsune'], [31, 'embuscadeNocturne'], [36, 'lamentation'],
    [41, 'chocPsychique'], [46, 'regardHypnotique'], [52, 'rondeAmes'], [58, 'danseChasseurs'], [64, 'appelMictlan'],
  ],
  tanuki: [
    [1, 'coupDePatte'], [1, 'ruseLievre'], [5, 'bondLievre'], [9, 'ondeMentale'], [13, 'larcin'],
    [17, 'illusionKitsune'], [21, 'chargeBrousse'], [26, 'palabre'], [31, 'regardHypnotique'], [36, 'ruadeZebu'],
    [41, 'chocPsychique'], [46, 'danseMasques'], [52, 'lectureSable'], [58, 'rueeSauvage'], [64, 'enigmeSphinx'],
  ],
  kodama: [
    [1, 'pousseMil'], [1, 'frissonTombe'], [5, 'murmureAncetres'], [9, 'berceuseFeuilles'], [13, 'racineEpineuse'],
    [17, 'ombreRampante'], [21, 'seveNourriciere'], [26, 'maledictionTertre'], [31, 'lameRonier'], [36, 'lamentation'],
    [41, 'voileGenies'], [46, 'etreinteBaobab'], [52, 'rondeAmes'], [58, 'moissonSacree'], [64, 'appelMictlan'],
  ],
  oni: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [5, 'etincelleForge'], [9, 'morsureHyene'], [13, 'chargeBrousse'],
    [17, 'feuBrousse'], [21, 'regardMalefique'], [26, 'marteauForgeron'], [31, 'crocsNuit'], [36, 'braiseAncestrale'],
    [41, 'ricanement'], [46, 'brulureSahel'], [52, 'rueeSauvage'], [58, 'eclipseDevorante'], [64, 'fournaiseSacree'],
  ],
  qilin: [
    [1, 'murmureAncetres'], [1, 'coupDeCorne'], [5, 'etincelleForge'], [9, 'regardPenetrant'], [13, 'flammeFollette'],
    [17, 'miroirEmeraude'], [21, 'feuBrousse'], [26, 'voileGenies'], [31, 'braiseAncestrale'], [36, 'souffleVital'],
    [41, 'lueurSacree'], [46, 'danseMasques'], [52, 'brulureSahel'], [58, 'colereAncetres'], [64, 'fournaiseSacree'],
  ],
  phenix: [
    [1, 'coupDeBec'], [1, 'etincelleForge'], [5, 'ventHarmattan'], [9, 'flammeFollette'], [13, 'regardPenetrant'],
    [17, 'feuBrousse'], [21, 'piqueCalao'], [26, 'souffletForge'], [31, 'braiseAncestrale'], [36, 'plumesVirevoltantes'],
    [41, 'ailesTonnerre'], [46, 'souffleVital'], [52, 'brulureSahel'], [58, 'cycloneCeleste'], [64, 'fournaiseSacree'],
  ],
  pixiu: [
    [1, 'limaille'], [1, 'coupDeBec'], [5, 'larcin'], [9, 'vifArgent'], [13, 'ventHarmattan'],
    [17, 'griffeLaiton'], [21, 'coupDeCorne'], [26, 'piqueCalao'], [31, 'lameFerForge'], [36, 'ventArriere'],
    [41, 'ailesTonnerre'], [46, 'marteauForgeron'], [52, 'danseChasseurs'], [58, 'chuteEnclume'], [64, 'cycloneCeleste'],
  ],
  gargouille: [
    [1, 'jetCaillou'], [1, 'regardPenetrant'], [5, 'coupDeBec'], [9, 'armureBanco'], [13, 'ventHarmattan'],
    [17, 'tombeauPierre'], [21, 'regardPetrifiant'], [26, 'piqueCalao'], [31, 'embuscadeNocturne'], [36, 'eboulement'],
    [41, 'ailesTonnerre'], [46, 'regardMalefique'], [52, 'dalleLaterite'], [58, 'cycloneCeleste'], [64, 'pluieMeteores'],
  ],
  kobold: [
    [1, 'limaille'], [1, 'larcin'], [5, 'jetCaillou'], [9, 'vifArgent'], [13, 'ruseLievre'],
    [17, 'griffeLaiton'], [21, 'tombeauPierre'], [26, 'lameFerForge'], [31, 'eboulement'], [36, 'souffletForge'],
    [41, 'marteauForgeron'], [46, 'regardPetrifiant'], [52, 'dalleLaterite'], [58, 'chuteEnclume'], [64, 'pluieMeteores'],
  ],
  selkie: [
    [1, 'gicleeSource'], [1, 'ondeMentale'], [5, 'bondLievre'], [9, 'regardHypnotique'], [13, 'tourbillonMarigot'],
    [17, 'illusionKitsune'], [21, 'vagueFleuve'], [26, 'brumeSoporifique'], [31, 'chocPsychique'], [36, 'chantAbysses'],
    [41, 'miroirEmeraude'], [46, 'lectureSable'], [52, 'enigmeSphinx'], [58, 'crueGrandFleuve'], [64, 'voileGenies'],
  ],
  lindworm: [
    [1, 'queueFouettante'], [1, 'criDeGuerre'], [5, 'griffeArgile'], [9, 'souffleDragon'], [13, 'piegeBoue'],
    [17, 'morsureHyene'], [21, 'griffeDraconique'], [26, 'fissureLaterite'], [31, 'danseEcailles'], [36, 'tombeauPierre'],
    [41, 'courrouxDraconique'], [46, 'grondementFalaise'], [52, 'regardMalefique'], [58, 'dalleLaterite'], [64, 'pluieMeteores'],
  ],
  griffon: [
    [1, 'coupDeBec'], [1, 'criDeGuerre'], [5, 'coupDePatte'], [9, 'ventHarmattan'], [13, 'bondLievre'],
    [17, 'piqueCalao'], [21, 'chargeBrousse'], [26, 'plumesVirevoltantes'], [31, 'ruadeZebu'], [36, 'ventArriere'],
    [41, 'ailesTonnerre'], [46, 'danseChasseurs'], [52, 'rueeSauvage'], [58, 'palabre'], [64, 'cycloneCeleste'],
  ],
  bunyip: [
    [1, 'gicleeSource'], [1, 'larcin'], [5, 'regardPenetrant'], [9, 'morsureHyene'], [13, 'tourbillonMarigot'],
    [17, 'brumeSoporifique'], [21, 'embuscadeNocturne'], [26, 'vagueFleuve'], [31, 'ricanement'], [36, 'crocsNuit'],
    [41, 'chantAbysses'], [46, 'regardMalefique'], [52, 'lamentation'], [58, 'crueGrandFleuve'], [64, 'eclipseDevorante'],
  ],
  ahuizotl: [
    [1, 'larcin'], [1, 'gicleeSource'], [5, 'coupDePatte'], [9, 'tourbillonMarigot'], [13, 'embuscadeNocturne'],
    [17, 'piegeBoue'], [21, 'morsureHyene'], [26, 'vagueFleuve'], [31, 'regardMalefique'], [36, 'crocsNuit'],
    [41, 'brumeSoporifique'], [46, 'chantAbysses'], [52, 'appelMictlan'], [58, 'crueGrandFleuve'], [64, 'eclipseDevorante'],
  ],
  chupacabra: [
    [1, 'larcin'], [1, 'piqureTermite'], [5, 'morsureHyene'], [9, 'dardVenimeux'], [13, 'bondLievre'],
    [17, 'embuscadeNocturne'], [21, 'sporesToxiques'], [26, 'crocsNuit'], [31, 'mandibules'], [36, 'regardMalefique'],
    [41, 'nueeCriquets'], [46, 'ricanement'], [52, 'essaimDevastateur'], [58, 'rueeSauvage'], [64, 'eclipseDevorante'],
  ],
  simurgh: [
    [1, 'coupDeBec'], [1, 'murmureAncetres'], [6, 'ventHarmattan'], [11, 'souffleVital'], [16, 'piqueCalao'],
    [21, 'voileGenies'], [26, 'plumesVirevoltantes'], [31, 'lueurSacree'], [36, 'ailesTonnerre'], [41, 'paroleGriot'],
    [46, 'ventArriere'], [52, 'danseMasques'], [58, 'cycloneCeleste'], [64, 'colereAncetres'], [68, 'chocPsychique'],
  ],
  mokele: [
    [1, 'queueFouettante'], [1, 'gicleeSource'], [5, 'jetCaillou'], [9, 'chargeBrousse'], [13, 'tourbillonMarigot'],
    [17, 'tombeauPierre'], [21, 'vagueFleuve'], [26, 'armureBanco'], [31, 'eboulement'], [36, 'chantAbysses'],
    [41, 'ruadeZebu'], [46, 'dalleLaterite'], [52, 'crueGrandFleuve'], [58, 'grondementFalaise'], [64, 'pluieMeteores'],
  ],
  grootslang: [
    [1, 'queueFouettante'], [1, 'jetCaillou'], [6, 'regardPenetrant'], [11, 'tombeauPierre'], [16, 'souffleDragon'],
    [21, 'coupDeCorne'], [26, 'regardPetrifiant'], [31, 'griffeDraconique'], [36, 'eboulement'], [41, 'danseEcailles'],
    [46, 'dalleLaterite'], [52, 'courrouxDraconique'], [58, 'grondementFalaise'], [64, 'pluieMeteores'], [68, 'rueeSauvage'],
  ],
  shango: [
    [1, 'coupDeCorne'], [1, 'criDeGuerre'], [5, 'etincelleForge'], [9, 'chargeBrousse'], [13, 'ventHarmattan'],
    [17, 'feuBrousse'], [21, 'ruadeZebu'], [26, 'piqueCalao'], [31, 'braiseAncestrale'], [36, 'ailesTonnerre'],
    [41, 'danseChasseurs'], [46, 'brulureSahel'], [52, 'rueeSauvage'], [58, 'cycloneCeleste'], [64, 'fournaiseSacree'],
  ],
  vautour: [
    [1, 'coupDeBec'], [1, 'larcin'], [5, 'regardPenetrant'], [9, 'ventHarmattan'], [13, 'morsureHyene'],
    [17, 'piqueCalao'], [21, 'ricanement'], [26, 'embuscadeNocturne'], [31, 'plumesVirevoltantes'], [36, 'crocsNuit'],
    [41, 'ailesTonnerre'], [46, 'regardMalefique'], [52, 'ventArriere'], [58, 'cycloneCeleste'], [64, 'eclipseDevorante'],
  ],
  taniwha: [
    [1, 'gicleeSource'], [1, 'queueFouettante'], [6, 'regardPenetrant'], [11, 'tourbillonMarigot'], [16, 'souffleDragon'],
    [21, 'vagueFleuve'], [26, 'griffeDraconique'], [31, 'murmureAncetres'], [36, 'danseEcailles'], [41, 'chantAbysses'],
    [46, 'lueurSacree'], [52, 'courrouxDraconique'], [58, 'crueGrandFleuve'], [64, 'pluieHivernage'], [68, 'colereAncetres'],
  ],
  // ── Hantises ──
  tikoloshe: [
    [1, 'larcin'], [1, 'ricanement'], [6, 'gicleeSource'], [11, 'embuscadeNocturne'], [16, 'morsureHyene'],
    [21, 'brumeSoporifique'], [26, 'regardMalefique'], [31, 'tourbillonMarigot'], [36, 'crocsNuit'], [41, 'vagueFleuve'],
    [46, 'lamentation'], [52, 'chantAbysses'], [58, 'eclipseDevorante'], [64, 'crueGrandFleuve'], [68, 'appelMictlan'],
  ],
  bouda: [
    [1, 'morsureHyene'], [1, 'limaille'], [6, 'criDeGuerre'], [11, 'griffeLaiton'], [16, 'embuscadeNocturne'],
    [21, 'vifArgent'], [26, 'crocsNuit'], [31, 'lameFerForge'], [36, 'ricanement'], [41, 'marteauForgeron'],
    [46, 'danseChasseurs'], [52, 'regardMalefique'], [58, 'chuteEnclume'], [64, 'eclipseDevorante'], [68, 'rueeSauvage'],
  ],
  kishi: [
    [1, 'ondeMentale'], [1, 'larcin'], [6, 'regardHypnotique'], [11, 'morsureHyene'], [16, 'illusionKitsune'],
    [21, 'embuscadeNocturne'], [26, 'miroirEmeraude'], [31, 'crocsNuit'], [36, 'chocPsychique'], [41, 'regardMalefique'],
    [46, 'enigmeSphinx'], [52, 'ricanement'], [58, 'eclipseDevorante'], [64, 'lectureSable'], [68, 'danseMasques'],
  ],
  nkondi: [
    [1, 'frissonTombe'], [1, 'limaille'], [6, 'regardPenetrant'], [11, 'maledictionTertre'], [16, 'griffeLaiton'],
    [21, 'ombreRampante'], [26, 'armureBanco'], [31, 'lameFerForge'], [36, 'lamentation'], [41, 'regardPetrifiant'],
    [46, 'marteauForgeron'], [52, 'rondeAmes'], [58, 'chuteEnclume'], [64, 'colereAncetres'], [68, 'appelMictlan'],
  ],
  noppera: [
    [1, 'frissonTombe'], [1, 'ondeMentale'], [6, 'regardHypnotique'], [11, 'maledictionTertre'], [16, 'illusionKitsune'],
    [21, 'ombreRampante'], [26, 'lectureSable'], [31, 'lamentation'], [36, 'chocPsychique'], [41, 'voileGenies'],
    [46, 'rondeAmes'], [52, 'enigmeSphinx'], [58, 'danseMasques'], [64, 'appelMictlan'], [68, 'regardMalefique'],
  ],
  obayifo: [
    [1, 'etincelleForge'], [1, 'frissonTombe'], [6, 'flammeFollette'], [11, 'regardHypnotique'], [16, 'maledictionTertre'],
    [21, 'feuBrousse'], [26, 'ombreRampante'], [31, 'braiseAncestrale'], [36, 'chocPsychique'], [41, 'lamentation'],
    [46, 'brulureSahel'], [52, 'rondeAmes'], [58, 'enigmeSphinx'], [64, 'fournaiseSacree'], [68, 'appelMictlan'],
  ],
  // ── Acte II ──
  fennec: [
    [1, 'coupDePatte'], [1, 'regardPenetrant'], [5, 'bondLievre'], [9, 'ondeMentale'], [13, 'ruseLievre'],
    [17, 'morsureHyene'], [21, 'illusionKitsune'], [26, 'lectureSable'], [31, 'ventHarmattan'], [36, 'chocPsychique'],
    [41, 'regardHypnotique'], [46, 'enigmeSphinx'], [52, 'danseChasseurs'], [58, 'rueeSauvage'], [64, 'voileGenies'],
  ],
  addax: [
    [1, 'coupDePatte'], [1, 'criDeGuerre'], [6, 'griffeArgile'], [11, 'coupDeCorne'], [16, 'piegeBoue'],
    [21, 'ruadeZebu'], [26, 'armureBanco'], [31, 'fissureLaterite'], [36, 'danseChasseurs'], [41, 'assautTermitiere'],
    [46, 'ventHarmattan'], [51, 'rueeSauvage'], [56, 'grondementFalaise'], [62, 'brulureSahel'], [68, 'palabre'],
  ],
  kelEssuf: [
    [1, 'frissonTombe'], [1, 'ricanement'], [5, 'larcin'], [9, 'murmureAncetres'], [13, 'regardMalefique'],
    [17, 'morsureHyene'], [21, 'ombreRampante'], [26, 'paroleGriot'], [31, 'embuscadeNocturne'], [36, 'voileGenies'],
    [41, 'crocsNuit'], [46, 'lamentation'], [52, 'lueurSacree'], [58, 'rondeAmes'], [64, 'eclipseDevorante'],
  ],
  tellem: [
    [1, 'jetCaillou'], [1, 'murmureAncetres'], [5, 'armureBanco'], [9, 'griffeArgile'], [13, 'tombeauPierre'],
    [17, 'miroirEmeraude'], [21, 'regardPetrifiant'], [26, 'danseMasques'], [31, 'eboulement'], [36, 'voileGenies'],
    [41, 'souffleVital'], [46, 'dalleLaterite'], [52, 'lueurSacree'], [58, 'pluieMeteores'], [64, 'colereAncetres'],
  ],
  kanaga: [
    [1, 'coupDeBec'], [1, 'murmureAncetres'], [5, 'danseMasques'], [9, 'ventHarmattan'], [13, 'miroirEmeraude'],
    [17, 'plumesVirevoltantes'], [21, 'piqueCalao'], [26, 'voileGenies'], [31, 'paroleGriot'], [36, 'ventArriere'],
    [41, 'ailesTonnerre'], [46, 'lueurSacree'], [52, 'souffleVital'], [58, 'cycloneCeleste'], [64, 'colereAncetres'],
  ],
  faro: [
    [1, 'gicleeSource'], [1, 'murmureAncetres'], [6, 'brumeSoporifique'], [12, 'vagueFleuve'], [18, 'miroirEmeraude'],
    [24, 'tourbillonMarigot'], [30, 'pluieHivernage'], [36, 'paroleGriot'], [40, 'chantAbysses'], [45, 'voileGenies'],
    [50, 'lueurSacree'], [55, 'crueGrandFleuve'], [60, 'souffleVital'], [65, 'colereAncetres'], [70, 'danseMasques'],
  ],
  aidoHwedo: [
    [1, 'queueFouettante'], [1, 'murmureAncetres'], [6, 'piegeBoue'], [12, 'souffleDragon'], [18, 'danseEcailles'],
    [24, 'miroirEmeraude'], [30, 'voileGenies'], [36, 'fissureLaterite'], [40, 'griffeDraconique'], [45, 'lueurSacree'],
    [50, 'grondementFalaise'], [55, 'courrouxDraconique'], [60, 'colereAncetres'], [65, 'souffleNinkiNanka'], [70, 'souffleVital'],
  ],
} satisfies Record<string, readonly LearnsetEntry[]>;

const stats = (hp: number, attack: number, defense: number, speed: number): BaseStats => ({ hp, attack, defense, speed });

// ─────────────────────────────────────────────────────────────────────────
// Bestiaire
// ─────────────────────────────────────────────────────────────────────────

export const SPECIES: readonly Species[] = [
  // 🌿 Ligne 1 : l'Antilope Cultivatrice (starters Plante)
  {
    id: 1, name: 'Poussilope', category: 'Jinémon Pousse', types: ['Plante'],
    baseStats: stats(45, 49, 52, 45), catchRate: 45, baseXp: 64,
    evolution: { to: 2, level: 16 }, learnset: LS.antilope,
    folklore: 'Bambara (Mali) — Ci Wara, l’antilope qui enseigna l’agriculture aux hommes.',
    description: 'Ses petites cornes portent des pousses de mil. On dit qu’un champ où il gambade donne une récolte double.',
    look: { plan: 'quadrupede', colors: ['#9bc35a', '#6b4a2a', '#f2d16b'], features: ['cornes', 'feuilles'], size: 0.55 },
  },
  {
    id: 2, name: 'Cultivare', category: 'Jinémon Laboureur', types: ['Plante', 'Terre'],
    baseStats: stats(62, 64, 72, 58), catchRate: 45, baseXp: 142,
    evolution: { to: 3, level: 36 }, learnset: LS.antilope,
    folklore: 'Bambara (Mali) — Ci Wara, l’antilope qui enseigna l’agriculture aux hommes.',
    description: 'Il creuse les sillons de ses sabots et y sème les graines tombées de sa crinière.',
    look: { plan: 'quadrupede', colors: ['#7aa83e', '#8a5a32', '#e8c25a'], features: ['cornes', 'feuilles', 'criniere'], size: 0.8 },
  },
  {
    id: 3, name: 'Chiwate', category: 'Jinémon Moisson', types: ['Plante', 'Terre'],
    baseStats: stats(85, 92, 98, 78), catchRate: 45, baseXp: 236,
    learnset: LS.antilope, talent: 'auraMoissons',
    folklore: 'Bambara (Mali) — Ci Wara, l’antilope qui enseigna l’agriculture aux hommes.',
    description: 'Créature majeure. Ses cornes immenses dessinent les sillons du ciel. Les cultivateurs dansent en son honneur à chaque semailles.',
    look: { plan: 'quadrupede', colors: ['#4d8a2c', '#7a4a22', '#f0c040'], features: ['grandesCornes', 'feuilles', 'criniere'], size: 1 },
  },

  // 💧 Ligne 2 : l'Esprit Amphibie (starters Eau)
  {
    id: 4, name: 'Têtuanom', category: 'Jinémon Têtard', types: ['Eau'],
    baseStats: stats(46, 48, 50, 50), catchRate: 45, baseXp: 64,
    evolution: { to: 5, level: 16 }, learnset: LS.nommo,
    folklore: 'Dogon (Mali) — les Nommo, esprits amphibiens nés de l’eau primordiale.',
    description: 'Il naît dans les mares laissées par les premières pluies. Sa peau reste fraîche même en plein harmattan.',
    look: { plan: 'amphibien', colors: ['#5ab0d8', '#2a6a98', '#f0f0a0'], features: ['nageoires'], size: 0.5 },
  },
  {
    id: 5, name: 'Amphinommo', category: 'Jinémon Gardien', types: ['Eau', 'Esprit'],
    baseStats: stats(63, 66, 66, 66), catchRate: 45, baseXp: 142,
    evolution: { to: 6, level: 36 }, learnset: LS.nommo,
    folklore: 'Dogon (Mali) — les Nommo, esprits amphibiens nés de l’eau primordiale.',
    description: 'Il veille sur les puits des villages. Les anciens disent qu’il entend les prières murmurées au-dessus de l’eau.',
    look: { plan: 'amphibien', colors: ['#3a96c8', '#1f5a88', '#c8f0ff'], features: ['nageoires', 'queue'], size: 0.8 },
  },
  {
    id: 6, name: 'Nommoth', category: 'Jinémon Primordial', types: ['Eau', 'Esprit'],
    baseStats: stats(88, 90, 92, 88), catchRate: 45, baseXp: 236,
    learnset: LS.nommo, talent: 'benedictionPluvieuse',
    folklore: 'Dogon (Mali) — les Nommo, esprits amphibiens nés de l’eau primordiale.',
    description: 'Créature majeure. Quand il chante, les nuages se rassemblent et la saison des pluies commence.',
    look: { plan: 'amphibien', colors: ['#2a7ab8', '#7a4ab8', '#c8e8ff'], features: ['nageoires', 'queue', 'aura'], size: 1 },
  },

  // 🔥 Ligne 3 : le Gardien de Forge (starters Feu)
  {
    id: 7, name: 'Étincel', category: 'Jinémon Braise', types: ['Feu'],
    baseStats: stats(42, 56, 44, 58), catchRate: 45, baseXp: 64,
    evolution: { to: 8, level: 16 }, learnset: LS.forge,
    folklore: 'Mandingue — les forgerons, maîtres du feu et des secrets de la terre.',
    description: 'Il naît d’une étincelle tombée de l’enclume. Il adore se blottir dans les braises encore chaudes.',
    look: { plan: 'bipede', colors: ['#f08a3a', '#7a3a1a', '#ffe066'], features: ['flamme'], size: 0.5 },
  },
  {
    id: 8, name: 'Forgeron-Feu', category: 'Jinémon Artisan', types: ['Feu', 'Métal'],
    baseStats: stats(60, 78, 62, 70), catchRate: 45, baseXp: 142,
    evolution: { to: 9, level: 36 }, learnset: LS.forge,
    folklore: 'Mandingue — les forgerons, maîtres du feu et des secrets de la terre.',
    description: 'Ses bras se sont recouverts de fer à force de marteler. Il forge des outils pour les villageois qu’il respecte.',
    look: { plan: 'bipede', colors: ['#d0602a', '#6a6f78', '#ffd04a'], features: ['flamme', 'armure'], size: 0.8 },
  },
  {
    id: 9, name: 'Vulcanis-Djinn', category: 'Jinémon Fournaise', types: ['Feu', 'Métal'],
    baseStats: stats(80, 108, 82, 92), catchRate: 45, baseXp: 240,
    learnset: LS.forge, talent: 'coeurForge',
    folklore: 'Mandingue et trans-saharien — les forgerons et les djinns du feu sans fumée.',
    description: 'Créature majeure. Un djinn de flammes vêtu d’une armure de bronze. Son cœur est une forge qui ne s’éteint jamais.',
    look: { plan: 'bipede', colors: ['#c8401a', '#8a8f98', '#ffcf3a'], features: ['flamme', 'armure', 'cornes'], size: 1 },
  },

  // 🐜 Ligne 4 : les Architectes de la Brousse
  {
    id: 10, name: 'Termiton', category: 'Jinémon Termite', types: ['Insecte'],
    baseStats: stats(40, 45, 55, 35), catchRate: 190, baseXp: 50,
    evolution: { to: 11, level: 22 }, learnset: LS.termite,
    folklore: 'Sahel — les termitières, cathédrales d’argile de la brousse.',
    description: 'Petit bâtisseur des termitières. Il mâche l’argile et la salive pour construire des tours plus hautes qu’un homme.',
    look: { plan: 'insecte', colors: ['#c8905a', '#7a4a2a', '#f0e0c0'], features: ['antennes'], size: 0.45 },
  },
  {
    id: 11, name: 'Termitox', category: 'Jinémon Bâtisseur', types: ['Insecte', 'Terre'],
    baseStats: stats(65, 80, 100, 40), catchRate: 75, baseXp: 150,
    learnset: LS.termite, talent: 'carapace',
    folklore: 'Sahel — les termitières, cathédrales d’argile de la brousse.',
    description: 'Son blindage d’argile cuite au soleil arrête les lances. Il garde l’entrée des grandes termitières.',
    look: { plan: 'insecte', colors: ['#a8643a', '#5a3a22', '#e0b080'], features: ['antennes', 'carapace'], size: 0.8 },
  },
  {
    id: 12, name: 'Rochard', category: 'Jinémon Lézard', types: ['Roche', 'Feu'],
    baseStats: stats(50, 60, 70, 40), catchRate: 120, baseXp: 72,
    evolution: { to: 13, level: 32 }, learnset: LS.laterite,
    folklore: 'Sahel — les lézards qui se chauffent sur les dalles de latérite.',
    description: 'Lézard des dalles latéritiques. Il absorbe la chaleur du jour et la relâche la nuit en lueurs rougeoyantes.',
    look: { plan: 'lezard', colors: ['#8a7462', '#5a4a40', '#ff7a2a'], features: ['crete'], size: 0.55 },
  },
  {
    id: 13, name: 'Latérosaure', category: 'Jinémon Dalle', types: ['Roche', 'Dragon'],
    baseStats: stats(80, 98, 100, 62), catchRate: 45, baseXp: 190,
    learnset: LS.laterite, talent: 'ecaillesAntiques',
    folklore: 'Sahel — les lézards de latérite, devenus dragons au fil des âges.',
    description: 'Les vieux Rochard deviennent des dragons de pierre rouge. On les confond parfois avec les collines.',
    look: { plan: 'lezard', colors: ['#9a5a32', '#5a4a3a', '#ff8a3a'], features: ['crete', 'cornes', 'epines'], size: 1 },
  },

  // 🐦 Savane
  {
    id: 14, name: 'Pintadou', category: 'Jinémon Pintade', types: ['Normal', 'Vol'],
    baseStats: stats(40, 42, 38, 56), catchRate: 255, baseXp: 50,
    evolution: { to: 15, level: 18 }, learnset: LS.pintade,
    folklore: 'Afrique de l’Ouest — la pintade, oiseau des contes et des cours de village.',
    description: 'Il pousse des cris perçants à la moindre alerte. Les villageois le considèrent comme le meilleur des gardiens.',
    look: { plan: 'oiseau', colors: ['#4a4a5a', '#d8e0f0', '#3a7ab8'], features: ['points'], size: 0.45 },
  },
  {
    id: 15, name: 'Pintadorée', category: 'Jinémon Pintade', types: ['Normal', 'Vol'],
    baseStats: stats(66, 72, 62, 90), catchRate: 120, baseXp: 140,
    learnset: LS.pintade,
    folklore: 'Afrique de l’Ouest — la pintade, oiseau des contes et des cours de village.',
    description: 'Son plumage perlé brille comme une parure de mariage. Elle court plus vite qu’un cheval.',
    look: { plan: 'oiseau', colors: ['#3a3a4a', '#e8eaf8', '#e8b84a'], features: ['points', 'crete'], size: 0.75 },
  },
  {
    id: 16, name: 'Criquelin', category: 'Jinémon Criquet', types: ['Insecte'],
    baseStats: stats(38, 40, 36, 52), catchRate: 255, baseXp: 45,
    evolution: { to: 17, level: 20 }, learnset: LS.criquet,
    folklore: 'Sahel — les nuées de criquets pèlerins.',
    description: 'Il saute d’herbe en herbe sans jamais se poser longtemps. Seul, il est inoffensif.',
    look: { plan: 'insecte', colors: ['#a8b83a', '#6a7a2a', '#e8e080'], features: ['antennes'], size: 0.4 },
  },
  {
    id: 17, name: 'Criquéant', category: 'Jinémon Nuée', types: ['Insecte', 'Vol'],
    baseStats: stats(60, 80, 55, 95), catchRate: 120, baseXp: 140,
    learnset: LS.criquet,
    folklore: 'Sahel — les nuées de criquets pèlerins.',
    description: 'Quand des milliers de Criquéant s’envolent ensemble, le ciel s’assombrit et les récoltes tremblent.',
    look: { plan: 'insecte', colors: ['#8a9a2a', '#c8a83a', '#f0e080'], features: ['antennes', 'ailes'], size: 0.75 },
  },
  {
    id: 18, name: 'Leukin', category: 'Jinémon Lièvre', types: ['Normal'],
    baseStats: stats(40, 42, 38, 70), catchRate: 190, baseXp: 52,
    evolution: { to: 19, level: 20 }, learnset: LS.lievre, talent: 'ruse',
    folklore: 'Wolof (Sénégal) — Leuk le Lièvre, héros rusé des contes de la veillée.',
    description: 'Malin comme pas deux, il se moque des plus gros que lui et s’échappe toujours au dernier moment.',
    look: { plan: 'quadrupede', colors: ['#d8c8a8', '#a8906a', '#ffffff'], features: ['oreilles'], size: 0.45 },
  },
  {
    id: 19, name: 'Leukmalin', category: 'Jinémon Conteur', types: ['Normal', 'Psy'],
    baseStats: stats(62, 68, 58, 105), catchRate: 75, baseXp: 150,
    learnset: LS.lievre, talent: 'ruse',
    folklore: 'Wolof (Sénégal) — Leuk le Lièvre, héros rusé des contes de la veillée.',
    description: 'Le roi l’a nommé conseiller pour sa sagesse. Ses ruses sont racontées de village en village.',
    look: { plan: 'bipede', colors: ['#c8b896', '#8a7a5a', '#b84ae8'], features: ['oreilles', 'aura'], size: 0.75 },
  },
  {
    id: 20, name: 'Boukyène', category: 'Jinémon Hyène', types: ['Ténèbres'],
    baseStats: stats(52, 62, 45, 56), catchRate: 150, baseXp: 60,
    evolution: { to: 21, level: 28 }, learnset: LS.hyene, talent: 'prestance',
    folklore: 'Wolof (Sénégal) — Bouki l’Hyène, gourmande et éternelle dupe de Leuk.',
    description: 'Toujours affamé, il suit les chasseurs en ricanant. Il se fait souvent duper par les Leukin.',
    look: { plan: 'quadrupede', colors: ['#a8905a', '#5a4a3a', '#e8d84a'], features: ['points', 'criniere'], size: 0.6 },
  },
  {
    id: 21, name: 'Boukarnasse', category: 'Jinémon Charognard', types: ['Ténèbres', 'Terre'],
    baseStats: stats(78, 95, 70, 75), catchRate: 60, baseXp: 170,
    learnset: LS.hyene, talent: 'prestance',
    folklore: 'Wolof (Sénégal) — Bouki l’Hyène, gourmande et éternelle dupe de Leuk.',
    description: 'Ses mâchoires broient les os les plus durs. Son rire résonne dans la nuit à des lieues à la ronde.',
    look: { plan: 'quadrupede', colors: ['#8a7448', '#3a2e28', '#ff4a4a'], features: ['points', 'criniere', 'epines'], size: 0.95 },
  },
  {
    id: 22, name: 'Calaobé', category: 'Jinémon Calao', types: ['Vol'],
    baseStats: stats(42, 45, 40, 55), catchRate: 190, baseXp: 52,
    evolution: { to: 23, level: 18 }, learnset: LS.calao, talent: 'oeilVigilant',
    folklore: 'Afrique de l’Ouest — le calao, messager sacré et oiseau de sagesse.',
    description: 'Son bec énorme est étonnamment léger. Il annonce l’arrivée des visiteurs par des claquements secs.',
    look: { plan: 'oiseau', colors: ['#3a3a3a', '#f0f0f0', '#f0c03a'], features: ['casque'], size: 0.45 },
  },
  {
    id: 23, name: 'Calaoracle', category: 'Jinémon Messager', types: ['Vol', 'Psy'],
    baseStats: stats(68, 80, 66, 88), catchRate: 75, baseXp: 158,
    learnset: LS.calao, talent: 'oeilVigilant',
    folklore: 'Afrique de l’Ouest — le calao, messager sacré et oiseau de sagesse.',
    description: 'On raconte qu’il porte les messages entre le monde des vivants et celui des ancêtres.',
    look: { plan: 'oiseau', colors: ['#2a2a3a', '#f0e0f0', '#e85a8f'], features: ['casque', 'aura'], size: 0.85 },
  },
  {
    id: 24, name: 'Anansou', category: 'Jinémon Araignée', types: ['Insecte'],
    baseStats: stats(40, 50, 40, 60), catchRate: 190, baseXp: 54,
    evolution: { to: 25, level: 22 }, learnset: LS.araignee, talent: 'ruse',
    folklore: 'Akan (Ghana) — Anansi, l’araignée qui posséda toutes les histoires du monde.',
    description: 'Il tisse des toiles en forme de récits. Qui sait les lire y découvre des contes oubliés.',
    look: { plan: 'araignee', colors: ['#6a4a3a', '#c8a87a', '#f0e040'], features: [], size: 0.45 },
  },
  {
    id: 25, name: 'Anansage', category: 'Jinémon Conteur', types: ['Insecte', 'Psy'],
    baseStats: stats(66, 84, 64, 92), catchRate: 75, baseXp: 155,
    learnset: LS.araignee, talent: 'ruse',
    folklore: 'Akan (Ghana) — Anansi, l’araignée qui posséda toutes les histoires du monde.',
    description: 'Il a acheté toutes les histoires au dieu du ciel. Il les raconte à qui sait l’écouter… ou le duper.',
    look: { plan: 'araignee', colors: ['#5a3a5a', '#e8b84a', '#e85a8f'], features: ['yeux'], size: 0.85 },
  },
  {
    id: 26, name: 'Adzélule', category: 'Jinémon Luciole', types: ['Insecte', 'Spectre'],
    baseStats: stats(55, 70, 55, 85), catchRate: 90, baseXp: 130,
    learnset: LS.luciole, talent: 'levitation',
    folklore: 'Ewe (Togo, Ghana) — l’Adzé, esprit qui voyage sous la forme d’une luciole.',
    description: 'Une lueur verte dans la nuit de la forêt. Celui qui la suit se réveille épuisé, sans savoir pourquoi.',
    look: { plan: 'insecte', colors: ['#3a3a5a', '#d8ff7a', '#a8ff4a'], features: ['ailes', 'lueur'], size: 0.5 },
  },
  {
    id: 27, name: 'Kontomblin', category: 'Jinémon Génie', types: ['Esprit'],
    baseStats: stats(45, 48, 50, 55), catchRate: 150, baseXp: 58,
    evolution: { to: 28, level: 25 }, learnset: LS.genie,
    folklore: 'Burkina Faso, Ghana — les Kontomblé, petits génies de la brousse.',
    description: 'Un petit génie farceur qui vit au pied des grands arbres. Il enseigne les plantes médicinales à ceux qu’il apprécie.',
    look: { plan: 'esprit', colors: ['#a8784a', '#5a3a22', '#ffffff'], features: ['feuilles'], size: 0.4 },
  },
  {
    id: 28, name: 'Kontombaobab', category: 'Jinémon Arbre-Génie', types: ['Esprit', 'Plante'],
    baseStats: stats(80, 82, 92, 50), catchRate: 60, baseXp: 168,
    learnset: LS.genie, talent: 'carapace',
    folklore: 'Burkina Faso, Ghana — les Kontomblé, petits génies de la brousse.',
    description: 'Le Kontomblin a élu domicile dans un baobab et ne fait plus qu’un avec lui. Son écorce garde la mémoire du village.',
    look: { plan: 'arbre', colors: ['#7a5a3a', '#5aa83a', '#e4b6e8'], features: ['feuilles'], size: 0.95 },
  },
  {
    id: 29, name: 'Sasabois', category: 'Jinémon Forêt Noire', types: ['Ténèbres', 'Plante'],
    baseStats: stats(70, 92, 72, 68), catchRate: 60, baseXp: 160,
    learnset: LS.sasabonsam, talent: 'prestance',
    folklore: 'Akan (Ghana) — le Sasabonsam, gardien redouté des forêts profondes.',
    description: 'Il se suspend aux plus hautes branches et attrape les imprudents par les pieds. Il protège farouchement la forêt.',
    look: { plan: 'bipede', colors: ['#4a3a2a', '#3a5a2a', '#e83a3a'], features: ['ailes', 'yeux'], size: 0.9 },
  },
  {
    id: 30, name: 'Warabé', category: 'Jinémon Lionceau', types: ['Normal'],
    baseStats: stats(48, 60, 42, 60), catchRate: 120, baseXp: 62,
    evolution: { to: 31, level: 30 }, learnset: LS.lion, talent: 'prestance',
    folklore: 'Mandingue — « Waraba », le lion, totem des chasseurs et des rois.',
    description: 'Un lionceau joueur qui imite les rugissements de ses aînés. Il rêve de devenir le roi de la savane.',
    look: { plan: 'quadrupede', colors: ['#e0b060', '#b07a30', '#ffffff'], features: [], size: 0.55 },
  },
  {
    id: 31, name: 'Warabane', category: 'Jinémon Roi', types: ['Normal', 'Terre'],
    baseStats: stats(80, 102, 70, 88), catchRate: 45, baseXp: 185,
    learnset: LS.lion, talent: 'prestance',
    folklore: 'Mandingue — « Waraba », le lion, totem des chasseurs et des rois.',
    description: 'Son rugissement fait trembler la terre rouge. Les chasseurs Donzos le saluent avant d’entrer dans la brousse.',
    look: { plan: 'quadrupede', colors: ['#d0a050', '#7a4a20', '#ffe0a0'], features: ['criniere'], size: 1 },
  },
  {
    id: 32, name: 'Buffadô', category: 'Jinémon Buffle', types: ['Normal', 'Terre'],
    baseStats: stats(100, 105, 95, 60), catchRate: 25, baseXp: 210,
    learnset: LS.buffle, talent: 'carapace',
    folklore: 'Mandingue — le Buffle de Dô, dans l’épopée de Soundiata Keïta.',
    description: 'Le légendaire buffle qui ravageait le pays de Dô. Seuls les chasseurs les plus sages ont pu le vaincre.',
    look: { plan: 'quadrupede', colors: ['#3e322c', '#1e1816', '#e8402a'], features: ['grandesCornes', 'bosse'], size: 1 },
  },
  {
    id: 33, name: 'Zébulle', category: 'Jinémon Zébu', types: ['Normal'],
    baseStats: stats(55, 50, 55, 40), catchRate: 190, baseXp: 58,
    evolution: { to: 34, level: 24 }, learnset: LS.zebu,
    folklore: 'Peul — les grands troupeaux de zébus et leur serpent protecteur, Tyamaba.',
    description: 'Il suit les transhumances sur des centaines de kilomètres. Sa bosse lui permet de jeûner longtemps.',
    look: { plan: 'quadrupede', colors: ['#e8e0d0', '#a89a8a', '#c8a060'], features: ['cornes', 'bosse'], size: 0.6 },
  },
  {
    id: 34, name: 'Zébourou', category: 'Jinémon Troupeau', types: ['Normal', 'Esprit'],
    baseStats: stats(90, 80, 85, 55), catchRate: 75, baseXp: 165,
    learnset: LS.zebu,
    folklore: 'Peul — les grands troupeaux de zébus et leur serpent protecteur, Tyamaba.',
    description: 'Les bergers peuls disent qu’un esprit protecteur veille en lui. Aucun fauve n’ose approcher le troupeau qu’il mène.',
    look: { plan: 'quadrupede', colors: ['#f0ead8', '#c8b8a0', '#e4b6e8'], features: ['grandesCornes', 'bosse', 'aura'], size: 0.95 },
  },
  {
    id: 35, name: 'Bancolin', category: 'Jinémon Argile', types: ['Terre'],
    baseStats: stats(55, 60, 70, 25), catchRate: 190, baseXp: 60,
    evolution: { to: 36, level: 30 }, learnset: LS.banco,
    talent: 'carapace',
    folklore: 'Sahel et Europe centrale — le banco des mosquées de terre crue rencontre le golem des légendes juives.',
    description: 'Un petit bonhomme de terre crue qui s’éveille après les pluies. Il se répare lui-même avec la boue fraîche.',
    look: { plan: 'golem', colors: ['#c8905a', '#8a5a32', '#f0e0c0'], features: [], size: 0.5 },
  },
  {
    id: 36, name: 'Bancogolem', category: 'Jinémon Rempart', types: ['Terre', 'Roche'],
    baseStats: stats(90, 100, 120, 30), catchRate: 75, baseXp: 175,
    learnset: LS.banco, talent: 'carapace',
    folklore: 'Sahel et Europe centrale — le banco des mosquées de terre crue rencontre le golem des légendes juives.',
    description: 'Hérissé de pieux de bois comme les grandes mosquées de terre, il garde les villages depuis des siècles.',
    look: { plan: 'golem', colors: ['#b07a48', '#7a5a3a', '#e8d0a0'], features: ['epines'], size: 1 },
  },

  // 🌊 Eaux et marigots
  {
    id: 37, name: 'Mamiwa', category: 'Jinémon Sirène', types: ['Eau', 'Psy'],
    baseStats: stats(75, 82, 75, 85), catchRate: 45, baseXp: 175,
    learnset: LS.mamiwata, talent: 'benedictionPluvieuse',
    folklore: 'Afrique de l’Ouest et centrale — Mami Wata, esprit des eaux à la beauté envoûtante.',
    description: 'Elle se peigne au bord du fleuve avec un peigne d’or. Ceux qui la respectent repartent comblés de richesses.',
    look: { plan: 'esprit', colors: ['#2a9ab0', '#1a5a6a', '#f0d040'], features: ['nageoires', 'cheveux'], size: 0.9 },
  },
  {
    id: 38, name: 'Ninkinou', category: 'Jinémon Marais', types: ['Eau'],
    baseStats: stats(50, 55, 50, 50), catchRate: 45, baseXp: 70,
    evolution: { to: 39, level: 40 }, learnset: LS.ninkinanka,
    folklore: 'Gambie, Sénégal, Guinée — le Ninki Nanka, dragon des marais et des mangroves.',
    description: 'Un jeune serpent des mangroves aux yeux dorés. Les pêcheurs évitent de croiser son regard.',
    look: { plan: 'serpent', colors: ['#4a8a6a', '#2a5a4a', '#f0e040'], features: ['crete'], size: 0.55 },
  },
  {
    id: 39, name: 'Ninki-Nanka', category: 'Jinémon Dragon des Marais', types: ['Dragon', 'Eau'],
    baseStats: stats(95, 115, 90, 85), catchRate: 25, baseXp: 250,
    learnset: LS.ninkinanka, talent: 'ecaillesAntiques',
    folklore: 'Gambie, Sénégal, Guinée — le Ninki Nanka, dragon des marais et des mangroves.',
    description: 'Le grand dragon des marais. Sa crête brille comme un miroir et on dit que son regard peut pétrifier.',
    look: { plan: 'dragon', colors: ['#2a6a5a', '#1a3a3a', '#f0c040'], features: ['crete', 'cornes', 'ailes'], size: 1 },
  },
  {
    id: 40, name: 'Impoundou', category: 'Jinémon Oiseau-Foudre', types: ['Vol', 'Feu'],
    baseStats: stats(70, 90, 60, 100), catchRate: 45, baseXp: 170,
    learnset: LS.impundulu,
    folklore: 'Zoulou, Xhosa (Afrique australe) — l’Impundulu, l’oiseau-foudre.',
    description: 'Il bat des ailes et le tonnerre gronde. Là où il plonge, la foudre frappe et le feu prend.',
    look: { plan: 'oiseau', colors: ['#f0f0f0', '#3a3a5a', '#ffe040'], features: ['crete', 'eclairs'], size: 0.9 },
  },

  // 🗾 Japon
  {
    id: 41, name: 'Kitsunaï', category: 'Jinémon Renard', types: ['Esprit'],
    baseStats: stats(45, 52, 45, 70), catchRate: 120, baseXp: 62,
    evolution: { to: 42, level: 30 }, learnset: LS.kitsune, talent: 'ruse',
    folklore: 'Japon — le kitsune, renard magique dont les queues se multiplient avec l’âge.',
    description: 'Un renard espiègle aux trois queues. Il fait danser de petites flammes bleues pour égarer les promeneurs.',
    look: { plan: 'quadrupede', colors: ['#f0a050', '#ffffff', '#e85a5a'], features: ['oreilles', 'queues3'], size: 0.5 },
  },
  {
    id: 42, name: 'Kyûbirei', category: 'Jinémon Neuf-Queues', types: ['Esprit', 'Psy'],
    baseStats: stats(72, 90, 72, 105), catchRate: 45, baseXp: 180,
    learnset: LS.kitsune, talent: 'ruse',
    folklore: 'Japon — le kitsune, renard magique dont les queues se multiplient avec l’âge.',
    description: 'Après mille ans, il porte neuf queues et voit à travers toutes les illusions… sauf les siennes.',
    look: { plan: 'quadrupede', colors: ['#f8e0b0', '#ffffff', '#e85a8f'], features: ['oreilles', 'queues9', 'aura'], size: 0.95 },
  },
  {
    id: 43, name: 'Kappou', category: 'Jinémon Rivière', types: ['Eau'],
    baseStats: stats(50, 55, 60, 45), catchRate: 150, baseXp: 60,
    evolution: { to: 44, level: 26 }, learnset: LS.kappa, talent: 'carapace',
    folklore: 'Japon — le kappa, génie des rivières passionné de lutte.',
    description: 'Il garde de l’eau dans le creux de sa tête. S’il s’incline poliment, il la renverse et perd toute sa force.',
    look: { plan: 'amphibien', colors: ['#6ab06a', '#3a7a4a', '#c8e8ff'], features: ['carapace', 'assiette'], size: 0.5 },
  },
  {
    id: 44, name: 'Kapparoc', category: 'Jinémon Lutteur', types: ['Eau', 'Roche'],
    baseStats: stats(80, 88, 105, 55), catchRate: 60, baseXp: 168,
    learnset: LS.kappa, talent: 'carapace',
    folklore: 'Japon — le kappa, génie des rivières passionné de lutte.',
    description: 'Sa carapace s’est couverte de galets. Il défie les lutteurs du village et ne perd presque jamais.',
    look: { plan: 'amphibien', colors: ['#4a8a5a', '#7a6a5a', '#c8e8ff'], features: ['carapace', 'assiette', 'epines'], size: 0.9 },
  },
  {
    id: 45, name: 'Tengaru', category: 'Jinémon Corbeau', types: ['Vol', 'Ténèbres'],
    baseStats: stats(70, 92, 65, 95), catchRate: 60, baseXp: 168,
    learnset: LS.tengu, talent: 'oeilVigilant',
    folklore: 'Japon — le karasu-tengu, esprit-corbeau des montagnes et maître d’armes.',
    description: 'Un esprit-corbeau qui enseigne le sabre aux voyageurs méritants et punit les orgueilleux.',
    look: { plan: 'bipede', colors: ['#2a2a3a', '#c83a3a', '#f0f0f0'], features: ['ailes', 'bec'], size: 0.85 },
  },
  {
    id: 46, name: 'Tsukumoji', category: 'Jinémon Lanterne', types: ['Métal', 'Spectre'],
    baseStats: stats(60, 80, 95, 50), catchRate: 75, baseXp: 155,
    learnset: LS.tsukumogami, talent: 'levitation',
    folklore: 'Japon — les tsukumogami, objets centenaires qui prennent vie.',
    description: 'Une vieille lanterne de bronze qui s’est éveillée après cent ans d’oubli. Elle n’aime pas qu’on la jette.',
    look: { plan: 'lanterne', colors: ['#d8b05a', '#9aa7b0', '#ff6a3a'], features: [], size: 0.7 },
  },

  // 🏰 Europe
  {
    id: 47, name: 'Feufolet', category: 'Jinémon Lueur', types: ['Feu', 'Spectre'],
    baseStats: stats(40, 55, 40, 70), catchRate: 150, baseXp: 60,
    evolution: { to: 48, level: 30 }, learnset: LS.follet, talent: 'levitation',
    folklore: 'France, Europe — le feu follet qui égare les voyageurs dans les marais.',
    description: 'Une petite flamme bleue qui danse au-dessus des marais. Elle s’éloigne dès qu’on tente de la suivre.',
    look: { plan: 'esprit', colors: ['#7ad8ff', '#3a7ab8', '#ffffff'], features: ['flamme'], size: 0.4 },
  },
  {
    id: 48, name: 'Fol-Ardent', category: 'Jinémon Égareur', types: ['Feu', 'Spectre'],
    baseStats: stats(65, 92, 62, 98), catchRate: 60, baseXp: 168,
    learnset: LS.follet, talent: 'levitation',
    folklore: 'France, Europe — le feu follet qui égare les voyageurs dans les marais.',
    description: 'Son feu froid peut brûler les âmes. Il guide parfois les perdus… vers le chemin qu’il choisit.',
    look: { plan: 'esprit', colors: ['#5ab8ff', '#6d5a9c', '#ffffff'], features: ['flamme', 'aura'], size: 0.85 },
  },
  {
    id: 49, name: 'Kelpoulain', category: 'Jinémon Cheval d’Eau', types: ['Eau'],
    baseStats: stats(55, 60, 50, 65), catchRate: 150, baseXp: 62,
    evolution: { to: 50, level: 28 }, learnset: LS.kelpie,
    folklore: 'Écosse — le kelpie, cheval des lochs qui entraîne ses cavaliers sous l’eau.',
    description: 'Un poulain à la crinière d’algues. Il invite les enfants à monter sur son dos… mieux vaut refuser.',
    look: { plan: 'quadrupede', colors: ['#5a8ab0', '#2a4a6a', '#a8f0c8'], features: ['criniere'], size: 0.6 },
  },
  {
    id: 50, name: 'Kelpestre', category: 'Jinémon Loch', types: ['Eau', 'Ténèbres'],
    baseStats: stats(85, 95, 72, 92), catchRate: 60, baseXp: 175,
    learnset: LS.kelpie, talent: 'prestance',
    folklore: 'Écosse — le kelpie, cheval des lochs qui entraîne ses cavaliers sous l’eau.',
    description: 'Ses sabots ne laissent aucune trace. Sa peau devient collante comme de la glu dès qu’on le touche.',
    look: { plan: 'quadrupede', colors: ['#2a4a6a', '#1a2a3a', '#5ae8a0'], features: ['criniere', 'yeux'], size: 1 },
  },
  {
    id: 51, name: 'Banshéa', category: 'Jinémon Plainte', types: ['Spectre', 'Psy'],
    baseStats: stats(65, 88, 60, 90), catchRate: 60, baseXp: 165,
    learnset: LS.banshee, talent: 'levitation',
    folklore: 'Irlande — la bean sídhe, dont la plainte annonce les deuils.',
    description: 'Sa longue chevelure flotte sans vent. Elle pleure les familles qu’elle protège depuis des générations.',
    look: { plan: 'esprit', colors: ['#d8d8f0', '#8a8ab8', '#e85a8f'], features: ['cheveux'], size: 0.85 },
  },
  {
    id: 52, name: 'Draugmont', category: 'Jinémon Tertre', types: ['Spectre', 'Terre'],
    baseStats: stats(85, 95, 100, 40), catchRate: 60, baseXp: 172,
    learnset: LS.draugr, talent: 'carapace',
    folklore: 'Scandinavie — le draugr, guerrier mort-vivant qui garde son tertre funéraire.',
    description: 'Un guerrier d’un autre âge qui garde son trésor sous un tertre. Il grandit à mesure que sa colère monte.',
    look: { plan: 'bipede', colors: ['#7a8a7a', '#4a4a3a', '#5af0ff'], features: ['casque', 'armure'], size: 0.95 },
  },
  {
    id: 53, name: 'Fenrikin', category: 'Jinémon Louveteau', types: ['Ténèbres'],
    baseStats: stats(55, 68, 48, 65), catchRate: 90, baseXp: 70,
    evolution: { to: 54, level: 34 }, learnset: LS.fenrir, talent: 'prestance',
    folklore: 'Scandinavie — Fenrir, le loup géant enchaîné par les dieux.',
    description: 'Un louveteau qui grandit chaque jour un peu plus. Aucune chaîne ne le retient longtemps.',
    look: { plan: 'quadrupede', colors: ['#7a7a8a', '#4a4a5a', '#f0e040'], features: ['oreilles'], size: 0.55 },
  },
  {
    id: 54, name: 'Fenrisgrim', category: 'Jinémon Loup Géant', types: ['Ténèbres', 'Normal'],
    baseStats: stats(92, 112, 78, 95), catchRate: 30, baseXp: 210,
    learnset: LS.fenrir, talent: 'prestance',
    folklore: 'Scandinavie — Fenrir, le loup géant enchaîné par les dieux.',
    description: 'On dit qu’il poursuit le soleil et la lune depuis l’aube des temps. Il porte encore les restes de ses chaînes.',
    look: { plan: 'quadrupede', colors: ['#4a4a5a', '#2a2a3a', '#ff4a3a'], features: ['oreilles', 'criniere', 'chaines'], size: 1 },
  },
  {
    id: 55, name: 'Salambre', category: 'Jinémon Salamandre', types: ['Feu'],
    baseStats: stats(45, 55, 50, 55), catchRate: 150, baseXp: 62,
    evolution: { to: 56, level: 28 }, learnset: LS.salamandre, talent: 'ignifuge',
    folklore: 'Europe (alchimie) — la salamandre, qui vit au cœur des flammes sans s’y consumer.',
    description: 'Une petite salamandre qui se baigne dans les braises. Les forgerons l’accueillent comme un porte-bonheur.',
    look: { plan: 'lezard', colors: ['#f0602a', '#2a2a2a', '#ffe040'], features: ['points'], size: 0.45 },
  },
  {
    id: 56, name: 'Salamagma', category: 'Jinémon Magma', types: ['Feu', 'Roche'],
    baseStats: stats(78, 92, 95, 60), catchRate: 75, baseXp: 172,
    learnset: LS.salamandre, talent: 'ignifuge',
    folklore: 'Europe (alchimie) — la salamandre, qui vit au cœur des flammes sans s’y consumer.',
    description: 'Sa peau de roche en fusion durcit au contact de l’air. Il nage dans la lave comme dans un marigot.',
    look: { plan: 'lezard', colors: ['#d0401a', '#5a4a3a', '#ffd040'], features: ['points', 'epines', 'flamme'], size: 0.9 },
  },
  {
    id: 57, name: 'Basiliroc', category: 'Jinémon Roi-Serpent', types: ['Roche', 'Ténèbres'],
    baseStats: stats(72, 95, 95, 60), catchRate: 45, baseXp: 180,
    learnset: LS.basilic, talent: 'toucherToxique',
    folklore: 'Europe médiévale — le basilic, roi des serpents au regard pétrifiant.',
    description: 'Il porte une couronne de pierre. Les herbes se dessèchent sur son passage et les rochers fuient son regard.',
    look: { plan: 'serpent', colors: ['#7a8a4a', '#4a4a3a', '#e8303a'], features: ['couronne', 'yeux'], size: 0.9 },
  },
  {
    id: 58, name: 'Dahuon', category: 'Jinémon Montagne', types: ['Normal', 'Roche'],
    baseStats: stats(70, 75, 85, 70), catchRate: 120, baseXp: 145,
    learnset: LS.dahu,
    folklore: 'Alpes et Jura (France, Suisse) — le dahu, aux pattes plus courtes d’un côté.',
    description: 'Ses pattes gauches sont plus courtes que les droites : il ne fait que tourner autour des montagnes, toujours dans le même sens.',
    look: { plan: 'quadrupede', colors: ['#c8b090', '#7a6a5a', '#ffffff'], features: ['cornes'], size: 0.7 },
  },
  {
    id: 59, name: 'Tarasquet', category: 'Jinémon Carapace', types: ['Métal'],
    baseStats: stats(55, 65, 75, 35), catchRate: 75, baseXp: 75,
    evolution: { to: 60, level: 38 }, learnset: LS.tarasque, talent: 'carapace',
    folklore: 'Provence (France) — la Tarasque, dragon à carapace qui terrorisait les bords du Rhône.',
    description: 'Un bébé dragon à six pattes et à la carapace hérissée de pointes de fer. Il se roule en boule quand il a peur.',
    look: { plan: 'lezard', colors: ['#7a8a6a', '#9aa7b0', '#e8c040'], features: ['carapace'], size: 0.5 },
  },
  {
    id: 60, name: 'Tarasquor', category: 'Jinémon Rempart Draconique', types: ['Métal', 'Dragon'],
    baseStats: stats(95, 108, 115, 50), catchRate: 30, baseXp: 220,
    learnset: LS.tarasque, talent: 'carapace',
    folklore: 'Provence (France) — la Tarasque, dragon à carapace qui terrorisait les bords du Rhône.',
    description: 'Sa carapace d’acier est plus solide que les remparts d’une ville. Il ne se calme qu’au son des chants.',
    look: { plan: 'dragon', colors: ['#5a6a4a', '#8a8f98', '#e8c040'], features: ['carapace', 'epines', 'criniere'], size: 1 },
  },
  {
    id: 61, name: 'Vouivrelle', category: 'Jinémon Escarboucle', types: ['Dragon', 'Feu'],
    baseStats: stats(80, 105, 80, 95), catchRate: 30, baseXp: 215,
    learnset: LS.vouivre, talent: 'ecaillesAntiques',
    folklore: 'Franche-Comté, Bourgogne (France) — la vouivre, serpent ailé portant une escarboucle.',
    description: 'Une gemme rouge brille sur son front. Elle la dépose pour boire… mais malheur à qui tente de la voler.',
    look: { plan: 'serpent', colors: ['#3a7a3a', '#c8401a', '#ff3a5a'], features: ['ailes', 'gemme'], size: 0.95 },
  },

  // 🐉 Dragons d'Asie
  {
    id: 62, name: 'Lonchiot', category: 'Jinémon Nuage', types: ['Dragon'],
    baseStats: stats(45, 60, 45, 50), catchRate: 45, baseXp: 70,
    evolution: { to: 63, level: 30 }, learnset: LS.long,
    folklore: 'Chine — le long, dragon céleste qui apporte la pluie bienfaisante.',
    description: 'Un petit dragon qui se cache dans les nuages bas. Quand il éternue, il tombe une averse.',
    look: { plan: 'serpent', colors: ['#5ab0a0', '#f0e0a0', '#ffffff'], features: ['moustaches'], size: 0.5 },
  },
  {
    id: 63, name: 'Lonvapeur', category: 'Jinémon Brume', types: ['Dragon'],
    baseStats: stats(65, 82, 65, 72), catchRate: 45, baseXp: 150,
    evolution: { to: 64, level: 50 }, learnset: LS.long,
    folklore: 'Chine — le long, dragon céleste qui apporte la pluie bienfaisante.',
    description: 'Il ondule dans la brume des montagnes. Les paysans lui offrent du riz pour que les pluies viennent à temps.',
    look: { plan: 'serpent', colors: ['#3a90a0', '#e8d080', '#ffffff'], features: ['moustaches', 'cornes'], size: 0.8 },
  },
  {
    id: 64, name: 'Célestilong', category: 'Jinémon Céleste', types: ['Dragon', 'Esprit'],
    baseStats: stats(95, 120, 90, 95), catchRate: 25, baseXp: 270,
    learnset: LS.long, talent: 'ecaillesAntiques',
    folklore: 'Chine — le long, dragon céleste qui apporte la pluie bienfaisante.',
    description: 'Le seigneur des pluies et des fleuves célestes. Sa perle contient la sagesse de mille hivernages.',
    look: { plan: 'serpent', colors: ['#e8e8f8', '#c8a8f0', '#f0c040'], features: ['moustaches', 'cornes', 'aura', 'criniere'], size: 1 },
  },

  // 🏺 Égypte, Mésoamérique, monde slave
  {
    id: 65, name: 'Scarabronze', category: 'Jinémon Scarabée', types: ['Insecte', 'Métal'],
    baseStats: stats(60, 80, 100, 55), catchRate: 90, baseXp: 150,
    learnset: LS.scarabee, talent: 'carapace',
    folklore: 'Égypte antique — Khépri, le scarabée qui pousse le soleil à travers le ciel.',
    description: 'Il roule devant lui une boule de bronze brûlante. Les anciens y voyaient le soleil levant.',
    look: { plan: 'insecte', colors: ['#b08a3a', '#6a5a2a', '#ffd040'], features: ['carapace', 'aura'], size: 0.7 },
  },
  {
    id: 66, name: 'Sphynge', category: 'Jinémon Énigme', types: ['Psy', 'Roche'],
    baseStats: stats(85, 85, 100, 70), catchRate: 45, baseXp: 185,
    learnset: LS.sphinx, talent: 'ruse',
    folklore: 'Égypte et Grèce antiques — le sphinx et ses énigmes.',
    description: 'Elle garde les passages des falaises et ne laisse passer que ceux qui résolvent son énigme.',
    look: { plan: 'quadrupede', colors: ['#e0c080', '#4a7ab8', '#f0d040'], features: ['ailes', 'coiffe'], size: 0.95 },
  },
  {
    id: 67, name: 'Xolombre', category: 'Jinémon Guide des Âmes', types: ['Spectre', 'Normal'],
    baseStats: stats(70, 85, 70, 90), catchRate: 60, baseXp: 165,
    learnset: LS.xolo, talent: 'prestance',
    folklore: 'Aztèque (Mexique) — Xolotl et le xoloitzcuintle, chien qui guide les âmes vers le Mictlan.',
    description: 'Un chien sans poil aux yeux de braise. Il accompagne les âmes perdues jusqu’au monde des morts.',
    look: { plan: 'quadrupede', colors: ['#3a3a4a', '#6d5a9c', '#e8c040'], features: ['oreilles', 'lueur'], size: 0.75 },
  },
  {
    id: 68, name: 'Coatlplume', category: 'Jinémon Serpent à Plumes', types: ['Dragon', 'Vol'],
    baseStats: stats(90, 110, 85, 100), catchRate: 20, baseXp: 250,
    learnset: LS.coatl, talent: 'ecaillesAntiques',
    folklore: 'Mésoamérique — le serpent à plumes, maître des vents et des pluies.',
    description: 'Ses plumes vertes chatoient comme celles du quetzal. Les vents se lèvent à chaque battement de ses ailes.',
    look: { plan: 'serpent', colors: ['#3ab05a', '#e8403a', '#f0c040'], features: ['ailes', 'crete'], size: 1 },
  },
  {
    id: 69, name: 'Lechivert', category: 'Jinémon Seigneur des Bois', types: ['Plante', 'Psy'],
    baseStats: stats(75, 85, 80, 75), catchRate: 60, baseXp: 170,
    learnset: LS.leshy,
    folklore: 'Slave (Russie, Ukraine, Pologne) — le leshy, seigneur changeant de la forêt.',
    description: 'Il prend la taille d’un brin d’herbe ou d’un grand arbre selon son humeur. Il aime égarer les chasseurs.',
    look: { plan: 'bipede', colors: ['#5a7a3a', '#7a5a3a', '#e8f040'], features: ['cornes', 'feuilles'], size: 0.95 },
  },

  // ✨ Légendes du Panthéon
  {
    id: 70, name: 'Yurugal', category: 'Jinémon Renard Pâle', types: ['Psy', 'Ténèbres'],
    baseStats: stats(100, 120, 95, 115), catchRate: 10, baseXp: 300,
    learnset: LS.renardPale, talent: 'ruse', legendary: true,
    folklore: 'Dogon (Mali) — Yurugu, le Renard Pâle, maître du désordre et de la divination.',
    description: 'Légende du Panthéon. Chaque nuit, il laisse ses traces sur les tables de divination tracées dans le sable.',
    look: { plan: 'quadrupede', colors: ['#ecd2a2', '#c89050', '#e85a8f'], features: ['oreilles', 'aura', 'queue', 'lueur'], size: 1 },
  },
  {
    id: 71, name: 'Bidawa', category: 'Jinémon Serpent d’Or', types: ['Dragon', 'Terre'],
    baseStats: stats(115, 120, 110, 80), catchRate: 10, baseXp: 300,
    learnset: LS.bida, talent: 'ecaillesAntiques', legendary: true,
    folklore: 'Soninké (Empire du Ghana, Wagadou) — Bida, le serpent qui faisait pleuvoir l’or.',
    description: 'Légende du Panthéon. Tant qu’il fut honoré, il fit pleuvoir l’or sur le Wagadou. Sa colère apporta la sécheresse.',
    look: { plan: 'serpent', colors: ['#d8a83a', '#7a5a2a', '#f0f0a0'], features: ['couronne', 'aura'], size: 1 },
  },

  // 🌱 Racines hurlantes
  {
    id: 72, name: 'Mandragorin', category: 'Jinémon Racine', types: ['Plante'],
    baseStats: stats(45, 50, 50, 45), catchRate: 190, baseXp: 56,
    evolution: { to: 73, level: 24 }, learnset: LS.mandragore,
    folklore: 'Europe (Méditerranée, Moyen Âge) — la mandragore, racine à forme humaine dont le cri est redouté.',
    description: 'Une racine qui ressemble à un petit homme coiffé de feuilles. Elle se plante dans les sols humides et fait la sieste tout le jour.',
    look: { plan: 'bipede', colors: ['#c8a070', '#8a6a40', '#5fa83a'], features: ['feuilles'], size: 0.45 },
  },
  {
    id: 73, name: 'Mandracri', category: 'Jinémon Hurleur', types: ['Plante', 'Spectre'],
    baseStats: stats(70, 85, 75, 70), catchRate: 75, baseXp: 160,
    learnset: LS.mandragore,
    folklore: 'Europe (Méditerranée, Moyen Âge) — la mandragore, racine à forme humaine dont le cri est redouté.',
    description: 'Arrachée du sol, elle pousse un cri à glacer le sang. Les guérisseurs ne la cueillent qu’avec d’infinies précautions.',
    look: { plan: 'bipede', colors: ['#a8805a', '#6d5a9c', '#7ac84a'], features: ['feuilles', 'yeux', 'aura'], size: 0.8 },
  },

  // 🛡️ Pangolins, porte-bonheur de la brousse
  {
    id: 74, name: 'Pangolou', category: 'Jinémon Écailleux', types: ['Terre'],
    baseStats: stats(50, 55, 70, 35), catchRate: 120, baseXp: 66,
    evolution: { to: 75, level: 28 }, learnset: LS.pangolin, talent: 'carapace',
    folklore: 'Afrique de l’Ouest et centrale — le pangolin, porte-bonheur que l’on dit capable de chasser les mauvais esprits.',
    description: 'Il se roule en boule au moindre bruit. Ses écailles tintent comme des cauris quand il marche.',
    look: { plan: 'quadrupede', colors: ['#a0785a', '#6a4a32', '#e8c8a0'], features: [], size: 0.45 },
  },
  {
    id: 75, name: 'Pangolarmure', category: 'Jinémon Armure', types: ['Terre', 'Métal'],
    baseStats: stats(75, 85, 110, 50), catchRate: 60, baseXp: 160,
    learnset: LS.pangolin, talent: 'carapace',
    folklore: 'Afrique de l’Ouest et centrale — le pangolin, porte-bonheur que l’on dit capable de chasser les mauvais esprits.',
    description: 'Ses écailles ont la dureté du fer forgé. Roulé en boule, il dévale les pentes comme un boulet de canon.',
    look: { plan: 'quadrupede', colors: ['#8a7a6a', '#5a4a3a', '#d8c0a0'], features: ['epines'], size: 0.85 },
  },

  // 🦎 Caméléons, messagers trop lents
  {
    id: 76, name: 'Kaméléo', category: 'Jinémon Messager', types: ['Plante'],
    baseStats: stats(45, 45, 50, 40), catchRate: 150, baseXp: 60,
    evolution: { to: 77, level: 26 }, learnset: LS.cameleon,
    folklore: 'Zoulou et Afrique de l’Ouest — le caméléon, messager trop lent qui porta aux hommes la nouvelle de l’immortalité.',
    description: 'Il change de couleur selon son humeur. Il avance si lentement qu’on oublie qu’il est là.',
    look: { plan: 'lezard', colors: ['#7ac848', '#e8a030', '#f0e070'], features: ['crete'], size: 0.45 },
  },
  {
    id: 77, name: 'Kaméléomage', category: 'Jinémon Présage', types: ['Plante', 'Psy'],
    baseStats: stats(70, 80, 75, 72), catchRate: 60, baseXp: 158,
    learnset: LS.cameleon, talent: 'ruse',
    folklore: 'Zoulou et Afrique de l’Ouest — le caméléon, messager trop lent qui porta aux hommes la nouvelle de l’immortalité.',
    description: 'Ses yeux pivotent chacun de leur côté : l’un regarde le présent, l’autre l’avenir.',
    look: { plan: 'lezard', colors: ['#4aa848', '#c83a8a', '#f0d040'], features: ['crete', 'cornes'], size: 0.8 },
  },

  // 🦛 Hippopotames du fleuve
  {
    id: 78, name: 'Hippobul', category: 'Jinémon Fleuve', types: ['Eau'],
    baseStats: stats(70, 55, 60, 30), catchRate: 120, baseXp: 66,
    evolution: { to: 79, level: 30 }, learnset: LS.hippo,
    folklore: 'Égypte et bassin du Niger — l’hippopotame, maître redouté des fleuves.',
    description: 'Il passe ses journées immergé, seules ses oreilles dépassent. Il bâille pour impressionner ses rivaux.',
    look: { plan: 'quadrupede', colors: ['#8a7a9a', '#e8a0a8', '#f0e0e0'], features: [], size: 0.55 },
  },
  {
    id: 79, name: 'Tawerise', category: 'Jinémon Protectrice', types: ['Eau', 'Terre'],
    baseStats: stats(105, 90, 85, 45), catchRate: 50, baseXp: 172,
    learnset: LS.hippo, talent: 'carapace',
    folklore: 'Égypte antique — Taouret, la déesse hippopotame qui protège les mères et les enfants.',
    description: 'Elle veille sur les berges où jouent les petits Jinémon. Gare à qui ose les menacer.',
    look: { plan: 'quadrupede', colors: ['#6a7a8a', '#c88a90', '#f0c040'], features: ['couronne'], size: 1 },
  },

  // 🐪 Dromadaires des caravanes
  {
    id: 80, name: 'Chamelon', category: 'Jinémon Caravane', types: ['Normal'],
    baseStats: stats(55, 50, 55, 40), catchRate: 150, baseXp: 62,
    evolution: { to: 81, level: 28 }, learnset: LS.dromadaire,
    folklore: 'Touareg (Sahara) — le dromadaire, compagnon des caravanes du sel.',
    description: 'Il peut marcher des jours sans boire. Il garde dans sa bosse les chansons des caravaniers.',
    look: { plan: 'quadrupede', colors: ['#d8b07a', '#8a5a32', '#3a6ab8'], features: ['bosse'], size: 0.55 },
  },
  {
    id: 81, name: 'Méharoi', category: 'Jinémon Méhariste', types: ['Normal', 'Terre'],
    baseStats: stats(85, 85, 75, 70), catchRate: 60, baseXp: 165,
    learnset: LS.dromadaire,
    folklore: 'Touareg (Sahara) — le dromadaire, compagnon des caravanes du sel.',
    description: 'Paré de tissus indigo, il guide les caravanes à travers les tempêtes de sable sans jamais se perdre.',
    look: { plan: 'quadrupede', colors: ['#c89a60', '#2a4a8a', '#f0c040'], features: ['bosse'], size: 0.95 },
  },

  // 🦂 Scorpions des dunes
  {
    id: 82, name: 'Scorpidune', category: 'Jinémon Scorpion', types: ['Insecte', 'Terre'],
    baseStats: stats(45, 60, 60, 45), catchRate: 130, baseXp: 64,
    evolution: { to: 83, level: 32 }, learnset: LS.scorpion, talent: 'toucherToxique',
    folklore: 'Sahara et Égypte — le scorpion des dunes, que l’on croise sous les pierres chaudes.',
    description: 'Il s’enfouit sous le sable aux heures chaudes. La nuit, sa carapace luit faiblement sous la lune.',
    look: { plan: 'insecte', colors: ['#c8a060', '#7a5a32', '#e85a3a'], features: ['pinces', 'carapace'], size: 0.45 },
  },
  {
    id: 83, name: 'Serqétide', category: 'Jinémon Guérisseuse', types: ['Insecte', 'Psy'],
    baseStats: stats(70, 90, 85, 70), catchRate: 55, baseXp: 170,
    learnset: LS.scorpion, talent: 'toucherToxique',
    folklore: 'Égypte antique — Serket, la déesse scorpion qui protège des venins.',
    description: 'Son dard peut tuer ou guérir. On dit qu’elle choisit selon la pureté du cœur de sa cible.',
    look: { plan: 'insecte', colors: ['#d8b040', '#4a3a6a', '#7ad8ff'], features: ['pinces', 'carapace', 'aura'], size: 0.85 },
  },

  // 🌪️ Djinns des sables
  {
    id: 84, name: 'Tourbisable', category: 'Jinémon Tourbillon', types: ['Terre', 'Psy'],
    baseStats: stats(45, 55, 45, 65), catchRate: 140, baseXp: 64,
    evolution: { to: 85, level: 34 }, learnset: LS.djinnSable, talent: 'levitation',
    folklore: 'Sahara et Arabie — les djinns des sables, qui voyagent dans les tourbillons de poussière.',
    description: 'Ce petit tourbillon de sable rit en soulevant les pagnes des passants. Il ne reste jamais en place.',
    look: { plan: 'esprit', colors: ['#e8c890', '#b08850', '#7a4ab8'], features: ['tourbillon'], size: 0.45 },
  },
  {
    id: 85, name: 'Djinnoum', category: 'Jinémon Djinn', types: ['Terre', 'Psy'],
    baseStats: stats(75, 95, 70, 95), catchRate: 45, baseXp: 175,
    learnset: LS.djinnSable, talent: 'levitation',
    folklore: 'Sahara et Arabie — les djinns des sables, qui voyagent dans les tourbillons de poussière.',
    description: 'Un djinn des dunes au regard de braise. Il exauce les vœux… en les détournant toujours un peu.',
    look: { plan: 'esprit', colors: ['#d8a860', '#6a3a8a', '#f0c040'], features: ['tourbillon', 'couronne'], size: 0.9 },
  },

  // 🔥 Masques cracheurs de feu (nocturnes)
  {
    id: 86, name: 'Kponyon', category: 'Jinémon Masque', types: ['Feu'],
    baseStats: stats(50, 60, 45, 50), catchRate: 120, baseXp: 66,
    evolution: { to: 87, level: 30 }, learnset: LS.kponyungo, nocturne: true,
    folklore: 'Sénoufo (Côte d’Ivoire, Mali, Burkina Faso) — le Kponyungo, masque « cracheur de feu » qui chasse les âmes errantes.',
    description: 'Ce jeune masque n’apparaît qu’à la nuit tombée. Il s’entraîne à cracher des étincelles en grognant.',
    look: { plan: 'quadrupede', colors: ['#3a2a22', '#c8401a', '#f0c040'], features: ['cornes', 'defenses', 'flamme'], size: 0.5 },
  },
  {
    id: 87, name: 'Kponyungo', category: 'Jinémon Cracheur de Feu', types: ['Feu', 'Ténèbres'],
    baseStats: stats(85, 105, 75, 80), catchRate: 45, baseXp: 180,
    learnset: LS.kponyungo, talent: 'ignifuge', nocturne: true,
    folklore: 'Sénoufo (Côte d’Ivoire, Mali, Burkina Faso) — le Kponyungo, masque « cracheur de feu » qui chasse les âmes errantes.',
    description: 'Gueule de crocodile, cornes d’antilope et défenses de phacochère : il crache des flammes pour chasser les mauvais esprits.',
    look: { plan: 'quadrupede', colors: ['#2a2420', '#d8501a', '#f0d040'], features: ['grandesCornes', 'defenses', 'flamme'], size: 1 },
  },

  // 🦓 Forêt profonde
  {
    id: 88, name: 'Okapuri', category: 'Jinémon Licorne Sylvestre', types: ['Normal', 'Esprit'],
    baseStats: stats(70, 75, 70, 85), catchRate: 60, baseXp: 150,
    learnset: LS.okapi,
    folklore: 'Mbuti (forêt de l’Ituri, Congo) — l’okapi, l’animal que la forêt cache aux étrangers.',
    description: 'Si discret que les chasseurs le croyaient imaginaire. Les rayures de ses pattes imitent les rais de lumière dans le sous-bois.',
    look: { plan: 'quadrupede', colors: ['#5a2a2a', '#f0e8e0', '#3a2020'], features: ['oreilles'], size: 0.8 },
  },
  {
    id: 89, name: 'Mandrillon', category: 'Jinémon Masque Vivant', types: ['Psy', 'Normal'],
    baseStats: stats(55, 60, 50, 60), catchRate: 120, baseXp: 64,
    evolution: { to: 90, level: 34 }, learnset: LS.mandrill, talent: 'ruse',
    folklore: 'Gabon et Cameroun — le mandrill au visage de masque, malicieux et imitateur.',
    description: 'Son visage bleu et rouge ressemble à un masque de cérémonie. Il imite les gestes des humains pour se moquer d’eux.',
    look: { plan: 'bipede', colors: ['#6a5a4a', '#3a7ac8', '#e83a3a'], features: [], size: 0.5 },
  },
  {
    id: 90, name: 'Babouthot', category: 'Jinémon Scribe', types: ['Psy', 'Normal'],
    baseStats: stats(85, 95, 80, 85), catchRate: 45, baseXp: 178,
    learnset: LS.mandrill, talent: 'ruse',
    folklore: 'Égypte antique — Thot, dieu du savoir et de l’écriture, souvent représenté en babouin.',
    description: 'Il trace dans la poussière des signes que personne ne sait lire. On dit qu’il note les secrets de chaque dresseur.',
    look: { plan: 'bipede', colors: ['#c8c0b0', '#3a7ac8', '#e83a3a'], features: ['aura'], size: 0.85 },
  },

  // 🐊 Crocodiles sacrés
  {
    id: 91, name: 'Bazoulé', category: 'Jinémon Crocodile Sacré', types: ['Eau'],
    baseStats: stats(55, 60, 60, 40), catchRate: 120, baseXp: 66,
    evolution: { to: 92, level: 34 }, learnset: LS.crocodile,
    folklore: 'Mossi (Burkina Faso) — les crocodiles sacrés de Bazoulé, qui laissent les enfants s’asseoir sur leur dos.',
    description: 'Il somnole au bord de la mare sacrée. Les villageois l’appellent par son nom et lui apportent des poulets.',
    look: { plan: 'lezard', colors: ['#6a8a4a', '#d8c890', '#f0d040'], features: [], size: 0.55 },
  },
  {
    id: 92, name: 'Sobekroc', category: 'Jinémon Seigneur du Nil', types: ['Eau', 'Dragon'],
    baseStats: stats(95, 105, 95, 60), catchRate: 45, baseXp: 185,
    learnset: LS.crocodile, talent: 'ecaillesAntiques',
    folklore: 'Égypte antique — Sobek, le dieu crocodile du Nil.',
    description: 'Coiffé d’un disque solaire, il règne sur les crues. Sa morsure peut fendre une pirogue en deux.',
    look: { plan: 'lezard', colors: ['#4a6a3a', '#d8c890', '#f0c040'], features: ['couronne', 'epines'], size: 1 },
  },
  {
    id: 93, name: 'Lamantine', category: 'Jinémon Sirène du Fleuve', types: ['Eau', 'Psy'],
    baseStats: stats(95, 60, 75, 55), catchRate: 75, baseXp: 150,
    learnset: LS.lamantin,
    folklore: 'Afrique de l’Ouest — le lamantin, que les pêcheurs du Niger et de la Casamance associent à Mami Wata.',
    description: 'Elle chante sous l’eau des berceuses que seuls les pêcheurs endormis entendent.',
    look: { plan: 'amphibien', colors: ['#9aa8b0', '#6a7880', '#f0d0e0'], features: ['nageoires'], size: 0.75 },
  },

  // 🦉 Créatures de la nuit
  {
    id: 94, name: 'Hiboulet', category: 'Jinémon Chouette', types: ['Vol', 'Spectre'],
    baseStats: stats(45, 50, 45, 60), catchRate: 140, baseXp: 62,
    evolution: { to: 95, level: 30 }, learnset: LS.hibou, talent: 'oeilVigilant', nocturne: true,
    folklore: 'Afrique de l’Ouest — la chouette, oiseau de nuit que l’on dit messager des sorciers.',
    description: 'Il ne sort qu’à la nuit tombée. Ses grands yeux voient les esprits que les humains ignorent.',
    look: { plan: 'oiseau', colors: ['#8a7a6a', '#e8e0d0', '#f0c040'], features: [], size: 0.45 },
  },
  {
    id: 95, name: 'Hiboumbre', category: 'Jinémon Grand-Duc', types: ['Vol', 'Ténèbres'],
    baseStats: stats(80, 95, 75, 90), catchRate: 45, baseXp: 176,
    learnset: LS.hibou, talent: 'oeilVigilant', nocturne: true,
    folklore: 'Afrique de l’Ouest — la chouette, oiseau de nuit que l’on dit messager des sorciers.',
    description: 'Son hululement fait taire toute la forêt. Ceux qui croisent son regard oublient le chemin du retour.',
    look: { plan: 'oiseau', colors: ['#4a3a4a', '#c8b8a0', '#f08a20'], features: ['oreilles'], size: 0.85 },
  },
  {
    id: 96, name: 'Roussetin', category: 'Jinémon Roussette', types: ['Vol', 'Ténèbres'],
    baseStats: stats(45, 55, 40, 65), catchRate: 150, baseXp: 60,
    evolution: { to: 97, level: 32 }, learnset: LS.chauveSouris, talent: 'levitation', nocturne: true,
    folklore: 'Afrique de l’Ouest et centrale — les roussettes, chauves-souris frugivores qui envahissent les manguiers au crépuscule.',
    description: 'Il dort tête en bas tout le jour et se goinfre de mangues la nuit. Il pousse de petits cris aigus.',
    look: { plan: 'oiseau', colors: ['#6a4a3a', '#c87a4a', '#f0d040'], features: ['ailes'], size: 0.45 },
  },
  {
    id: 97, name: 'Popobawa', category: 'Jinémon Ombre Ailée', types: ['Ténèbres', 'Vol'],
    baseStats: stats(80, 105, 70, 95), catchRate: 40, baseXp: 182,
    learnset: LS.chauveSouris, talent: 'levitation', nocturne: true,
    folklore: 'Swahili (Zanzibar) — le Popobawa, esprit ailé qui hante les nuits et dont on n’ose prononcer le nom.',
    description: 'Une ombre à ailes de chauve-souris et à l’œil unique. Les nuits où il rôde, les villages veillent autour du feu.',
    look: { plan: 'bipede', colors: ['#2a2030', '#6a3a4a', '#e83a3a'], features: ['ailes', 'yeux'], size: 0.9 },
  },
  {
    id: 98, name: 'Bakeneko', category: 'Jinémon Chat-Fantôme', types: ['Spectre', 'Normal'],
    baseStats: stats(50, 55, 45, 65), catchRate: 130, baseXp: 64,
    evolution: { to: 99, level: 32 }, learnset: LS.chat, nocturne: true,
    folklore: 'Japon — le bakeneko, chat domestique devenu esprit après une longue vie.',
    description: 'Il marche sur ses pattes arrière quand personne ne regarde. Il lèche l’huile des lampes à minuit.',
    look: { plan: 'quadrupede', colors: ['#e8e0d0', '#3a3030', '#f0c040'], features: ['oreilles', 'queue'], size: 0.45 },
  },
  {
    id: 99, name: 'Nekomata', category: 'Jinémon Deux-Queues', types: ['Spectre', 'Psy'],
    baseStats: stats(75, 95, 70, 100), catchRate: 40, baseXp: 180,
    learnset: LS.chat, nocturne: true,
    folklore: 'Japon — le nekomata, chat dont la queue s’est fendue en deux avec l’âge.',
    description: 'Sa queue s’est fendue en deux à sa centième année. D’un geste, il fait danser les morts comme des marionnettes.',
    look: { plan: 'quadrupede', colors: ['#f0e8d8', '#3a3030', '#b84ae8'], features: ['oreilles', 'aura'], size: 0.85 },
  },

  // 🍃 Esprits farceurs du Japon
  {
    id: 100, name: 'Tanukoko', category: 'Jinémon Farceur', types: ['Normal', 'Psy'],
    baseStats: stats(70, 65, 65, 60), catchRate: 90, baseXp: 140,
    learnset: LS.tanuki, talent: 'ruse',
    folklore: 'Japon — le tanuki, chien viverrin farceur qui se déguise grâce à une feuille posée sur la tête.',
    description: 'Une feuille sur la tête, et le voilà théière, statue ou marchand ambulant. Il adore duper les voyageurs.',
    look: { plan: 'quadrupede', colors: ['#8a6a4a', '#3a2a22', '#5fa83a'], features: ['feuilles'], size: 0.6 },
  },
  {
    id: 101, name: 'Kodamo', category: 'Jinémon Écho des Arbres', types: ['Plante', 'Spectre'],
    baseStats: stats(55, 55, 60, 70), catchRate: 100, baseXp: 120,
    learnset: LS.kodama, talent: 'levitation',
    folklore: 'Japon — les kodama, esprits qui habitent les vieux arbres et renvoient l’écho des voix.',
    description: 'Si tu cries dans la forêt et que l’écho tarde à revenir, c’est un Kodamo qui t’a répondu.',
    look: { plan: 'esprit', colors: ['#f0f0e8', '#9ad87a', '#3a3a3a'], features: [], size: 0.4 },
  },
  {
    id: 102, name: 'Onimaru', category: 'Jinémon Ogre', types: ['Ténèbres', 'Feu'],
    baseStats: stats(95, 110, 85, 60), catchRate: 45, baseXp: 182,
    learnset: LS.oni, talent: 'prestance', nocturne: true,
    folklore: 'Japon — les oni, ogres cornus qui brandissent un gourdin de fer.',
    description: 'Il descend des montagnes les nuits sans lune, son gourdin hérissé sur l’épaule. Il déteste les haricots grillés.',
    look: { plan: 'bipede', colors: ['#c83a2a', '#3a3a4a', '#f0d040'], features: ['cornes'], size: 0.95 },
  },

  // 🐉 Créatures de bon augure d'Orient
  {
    id: 103, name: 'Qilindor', category: 'Jinémon Bienveillant', types: ['Esprit', 'Feu'],
    baseStats: stats(85, 90, 85, 95), catchRate: 30, baseXp: 190,
    learnset: LS.qilin, talent: 'ignifuge',
    folklore: 'Chine — le qilin, créature de bon augure qui ne foule jamais l’herbe vivante.',
    description: 'Il n’apparaît qu’aux époques de paix. Ses sabots ne touchent jamais une fleur, même au galop.',
    look: { plan: 'quadrupede', colors: ['#5ab8a0', '#f0c040', '#ff7a3a'], features: ['cornes', 'criniere', 'flamme'], size: 0.95 },
  },
  {
    id: 104, name: 'Fenghuan', category: 'Jinémon Phénix', types: ['Feu', 'Vol'],
    baseStats: stats(80, 100, 75, 100), catchRate: 30, baseXp: 190,
    learnset: LS.phenix, talent: 'ignifuge',
    folklore: 'Chine — le fenghuang, oiseau des cinq vertus qui ne se pose que sur les sterculiers.',
    description: 'Ses cinq couleurs symbolisent les cinq vertus. Son chant annonce la venue d’un souverain juste.',
    look: { plan: 'oiseau', colors: ['#e83a3a', '#f0c040', '#3a8ac8'], features: ['crete'], size: 0.9 },
  },
  {
    id: 105, name: 'Pixor', category: 'Jinémon Gardien du Trésor', types: ['Métal', 'Vol'],
    baseStats: stats(85, 100, 95, 70), catchRate: 40, baseXp: 182,
    learnset: LS.pixiu, talent: 'carapace',
    folklore: 'Chine — le pixiu, lion ailé qui dévore l’or et l’argent pour protéger les richesses.',
    description: 'Il avale l’or et ne le rend jamais. Les marchands gardent sa statuette tournée vers la porte.',
    look: { plan: 'quadrupede', colors: ['#d8b040', '#8a6a2a', '#3a8a6a'], features: ['ailes', 'cornes', 'criniere'], size: 0.9 },
  },

  // 🗿 Pierres et mines d'Europe
  {
    id: 106, name: 'Gargouillon', category: 'Jinémon Gouttière', types: ['Roche', 'Vol'],
    baseStats: stats(55, 60, 75, 35), catchRate: 120, baseXp: 66,
    evolution: { to: 107, level: 42 }, learnset: LS.gargouille, nocturne: true,
    folklore: 'France (Moyen Âge) — les gargouilles, monstres de pierre qui veillent sur les toits des cathédrales.',
    description: 'Le jour, c’est une statue. La nuit venue, il secoue la poussière de ses ailes et part chasser.',
    look: { plan: 'bipede', colors: ['#8a8a88', '#5a5a58', '#e85a3a'], features: ['ailes', 'cornes'], size: 0.5 },
  },
  {
    id: 107, name: 'Gargouillard', category: 'Jinémon Cathédrale', types: ['Roche', 'Vol'],
    baseStats: stats(85, 100, 115, 55), catchRate: 45, baseXp: 184,
    learnset: LS.gargouille, talent: 'carapace', nocturne: true,
    folklore: 'France (Moyen Âge) — les gargouilles, monstres de pierre qui veillent sur les toits des cathédrales.',
    description: 'Il crache la pluie d’orage par sa gueule ouverte. Ses griffes ont gardé l’empreinte des siècles.',
    look: { plan: 'bipede', colors: ['#7a7a78', '#4a4a48', '#f04a2a'], features: ['ailes', 'cornes', 'yeux'], size: 0.95 },
  },
  {
    id: 108, name: 'Koboldine', category: 'Jinémon Mineur', types: ['Métal', 'Roche'],
    baseStats: stats(70, 85, 90, 60), catchRate: 70, baseXp: 150,
    learnset: LS.kobold,
    folklore: 'Allemagne — les kobolds, lutins des mines qui aident ou égarent les mineurs.',
    description: 'Sa lanterne ne s’éteint jamais. Il frappe trois coups sur la roche pour signaler un filon.',
    look: { plan: 'bipede', colors: ['#7a6a5a', '#8a8f98', '#ffd04a'], features: ['casque'], size: 0.5 },
  },

  // 🦭 Peuples des eaux froides
  {
    id: 109, name: 'Selkine', category: 'Jinémon Phoque', types: ['Eau'],
    baseStats: stats(55, 45, 55, 55), catchRate: 140, baseXp: 62,
    evolution: { to: 110, level: 30 }, learnset: LS.selkie,
    folklore: 'Écosse et îles du Nord — les selkies, phoques qui ôtent leur peau pour danser sur la grève.',
    description: 'Ses grands yeux noirs semblent toujours au bord des larmes. Il imite les chants des pêcheurs.',
    look: { plan: 'amphibien', colors: ['#8a9aa8', '#5a6a78', '#e8e8f0'], features: ['nageoires'], size: 0.45 },
  },
  {
    id: 110, name: 'Selkirie', category: 'Jinémon Peau-de-Phoque', types: ['Eau', 'Psy'],
    baseStats: stats(85, 80, 80, 85), catchRate: 45, baseXp: 175,
    learnset: LS.selkie,
    folklore: 'Écosse et îles du Nord — les selkies, phoques qui ôtent leur peau pour danser sur la grève.',
    description: 'Les nuits de pleine lune, elle laisse sa peau sur un rocher et prend forme humaine. Malheur à qui la cache.',
    look: { plan: 'amphibien', colors: ['#6a7a90', '#e8d8c8', '#b8d8f8'], features: ['nageoires', 'aura'], size: 0.85 },
  },
  {
    id: 111, name: 'Lindvorm', category: 'Jinémon Ver-Dragon', types: ['Dragon', 'Terre'],
    baseStats: stats(90, 105, 90, 65), catchRate: 40, baseXp: 184,
    learnset: LS.lindworm, talent: 'ecaillesAntiques',
    folklore: 'Scandinavie — le lindworm, dragon serpent à deux pattes des légendes nordiques.',
    description: 'Il rampe sur ses deux pattes griffues et s’enroule autour des églises abandonnées.',
    look: { plan: 'serpent', colors: ['#6a8a5a', '#c8b870', '#e8c040'], features: ['crete'], size: 0.95 },
  },

  // 🦅 Gardiens des cimes
  {
    id: 112, name: 'Griffonnet', category: 'Jinémon Aiglon-Lion', types: ['Vol', 'Normal'],
    baseStats: stats(55, 60, 50, 60), catchRate: 110, baseXp: 66,
    evolution: { to: 113, level: 38 }, learnset: LS.griffon,
    folklore: 'Grèce et Perse antiques — le griffon, mi-aigle mi-lion, gardien des trésors.',
    description: 'Il a le bec et les ailes d’un aigle sur un corps de lionceau. Il garde jalousement tout ce qui brille.',
    look: { plan: 'quadrupede', colors: ['#d8b878', '#f0f0e8', '#f0c040'], features: ['ailes', 'bec'], size: 0.5 },
  },
  {
    id: 113, name: 'Griffonroi', category: 'Jinémon Gardien des Cimes', types: ['Vol', 'Normal'],
    baseStats: stats(90, 110, 85, 95), catchRate: 45, baseXp: 190,
    learnset: LS.griffon, talent: 'prestance',
    folklore: 'Grèce et Perse antiques — le griffon, mi-aigle mi-lion, gardien des trésors.',
    description: 'Il plane au-dessus des falaises et fond sur sa proie dans un cri qui fait trembler les rochers.',
    look: { plan: 'quadrupede', colors: ['#c8a060', '#f8f0e0', '#e8a020'], features: ['ailes', 'bec', 'criniere'], size: 1 },
  },

  // 🌊 Gardiens et rôdeurs des eaux du monde
  {
    id: 114, name: 'Bunyip', category: 'Jinémon Marais Hurlant', types: ['Eau', 'Ténèbres'],
    baseStats: stats(85, 90, 80, 55), catchRate: 50, baseXp: 176,
    learnset: LS.bunyip, nocturne: true,
    folklore: 'Australie (peuples aborigènes) — le bunyip, créature des points d’eau dont le cri résonne la nuit.',
    description: 'On ne le voit presque jamais, on l’entend mugir au fond des marais. Les enfants n’approchent pas de l’eau après le coucher du soleil.',
    look: { plan: 'quadrupede', colors: ['#3a4a3a', '#6a5a3a', '#c8e040'], features: ['yeux'], size: 0.85 },
  },
  {
    id: 115, name: 'Taniwha', category: 'Jinémon Gardien des Rivières', types: ['Eau', 'Dragon'],
    baseStats: stats(95, 95, 90, 75), catchRate: 35, baseXp: 188,
    learnset: LS.taniwha, talent: 'ecaillesAntiques',
    folklore: 'Māori (Aotearoa / Nouvelle-Zélande) — les taniwha, gardiens des rivières, protecteurs ou redoutables selon les tribus.',
    description: 'Il veille sur un tronçon de rivière comme sur sa propre famille. Les motifs lumineux de sa peau racontent l’histoire de son peuple.',
    look: { plan: 'serpent', colors: ['#2a6a7a', '#c8e0d0', '#f0e080'], features: ['crete', 'cornes'], size: 0.95 },
  },
  {
    id: 116, name: 'Ahuizotl', category: 'Jinémon Chien d’Eau', types: ['Eau', 'Ténèbres'],
    baseStats: stats(70, 95, 65, 85), catchRate: 55, baseXp: 168,
    learnset: LS.ahuizotl, nocturne: true,
    folklore: 'Aztèque (Mexique) — l’ahuizotl, chien d’eau à la main au bout de la queue, qui attire les pêcheurs au fond des lacs.',
    description: 'Il pleure comme un enfant perdu pour attirer les curieux près de l’eau. La main au bout de sa queue ne lâche jamais prise.',
    look: { plan: 'quadrupede', colors: ['#2a3a4a', '#4a6a8a', '#e8e040'], features: [], size: 0.6 },
  },
  {
    id: 117, name: 'Chupacabra', category: 'Jinémon Suceur de Chèvres', types: ['Ténèbres', 'Insecte'],
    baseStats: stats(70, 100, 60, 95), catchRate: 50, baseXp: 170,
    learnset: LS.chupacabra, talent: 'toucherToxique', nocturne: true,
    folklore: 'Amérique latine (Porto Rico, Mexique) — le chupacabra, rôdeur nocturne aux piquants dorsaux qui s’attaque aux troupeaux.',
    description: 'Ses yeux rouges brillent entre les enclos. Au matin, les chèvres sont pâles et tremblantes, sans une égratignure.',
    look: { plan: 'quadrupede', colors: ['#5a6a4a', '#2a2a22', '#ff3a3a'], features: ['epines', 'yeux'], size: 0.75 },
  },
  {
    id: 118, name: 'Simorgh', category: 'Jinémon Oiseau-Sage', types: ['Vol', 'Esprit'],
    baseStats: stats(95, 95, 90, 100), catchRate: 15, baseXp: 220,
    learnset: LS.simurgh, talent: 'oeilVigilant',
    folklore: 'Perse — le Simorgh, oiseau immense et bienveillant qui connaît tous les remèdes.',
    description: 'Il a vu trois fois la fin du monde. Une seule de ses plumes, jetée au feu, l’appelle au secours de son porteur.',
    look: { plan: 'oiseau', colors: ['#3a8a8a', '#e8a040', '#e83a8a'], features: ['crete', 'aura'], size: 1 },
  },
  {
    id: 119, name: 'Mokelembé', category: 'Jinémon Arrête-Rivière', types: ['Eau', 'Roche'],
    baseStats: stats(110, 95, 100, 50), catchRate: 20, baseXp: 210,
    learnset: LS.mokele, talent: 'carapace',
    folklore: 'Bassin du Congo (lingala) — le Mokèlé-mbèmbé, « celui qui arrête le cours des rivières ».',
    description: 'Il broute les lianes au bord des fleuves. Quand il se couche dans le lit d’une rivière, l’eau cesse de couler.',
    look: { plan: 'lezard', colors: ['#5a6a5a', '#8a8a6a', '#d8d8b0'], features: [], size: 1 },
  },
  {
    id: 120, name: 'Grootslang', category: 'Jinémon Serpent-Éléphant', types: ['Roche', 'Dragon'],
    baseStats: stats(105, 110, 100, 55), catchRate: 20, baseXp: 212,
    learnset: LS.grootslang, talent: 'ecaillesAntiques',
    folklore: 'Afrique du Sud (Richtersveld) — le Grootslang, serpent-éléphant qui garde une caverne de diamants.',
    description: 'Les dieux l’ont jugé trop puissant et l’ont partagé en éléphants et en serpents. Lui seul a échappé au partage.',
    look: { plan: 'serpent', colors: ['#6a6a6a', '#4a4a4a', '#e8f0ff'], features: ['defenses', 'gemme'], size: 1 },
  },
  {
    id: 121, name: 'Shangoélier', category: 'Jinémon Bélier-Tonnerre', types: ['Vol', 'Feu'],
    baseStats: stats(85, 105, 75, 90), catchRate: 40, baseXp: 182,
    learnset: LS.shango, talent: 'prestance',
    folklore: 'Yoruba (Nigeria, Bénin) — le bélier, animal de Shango, l’orisha du tonnerre et du feu.',
    description: 'Ses cornes enroulées attirent la foudre. Quand il charge, le ciel gronde avec lui.',
    look: { plan: 'quadrupede', colors: ['#8e94a6', '#c83a2a', '#ffe040'], features: ['cornes', 'eclairs'], size: 0.9 },
  },
  {
    id: 122, name: 'Vautouré', category: 'Jinémon Charognard Ailé', types: ['Vol', 'Ténèbres'],
    baseStats: stats(80, 85, 70, 80), catchRate: 70, baseXp: 160,
    learnset: LS.vautour,
    folklore: 'Sahel — le vautour, nettoyeur de la savane, que l’on dit capable de sentir la mort de loin.',
    description: 'Il tourne en silence au-dessus des troupeaux affaiblis. Son crâne chauve rougit quand il est en colère.',
    look: { plan: 'oiseau', colors: ['#4a3a32', '#e8d8c0', '#e85a5a'], features: [], size: 0.85 },
  },

  // 🌑 Les Hantises : elles rôdent la nuit, visibles, et attaquent
  {
    id: 123, name: 'Tikoloshe', category: 'Jinémon Rôdeur des Herbes', types: ['Ténèbres', 'Eau'],
    baseStats: stats(80, 110, 75, 115), catchRate: 25, baseXp: 230,
    learnset: LS.tikoloshe, talent: 'ruse', nocturne: true, hantise: true,
    folklore: 'Zoulou et Xhosa (Afrique australe) — le tikoloshe, petit être velu qui se rend invisible et rôde la nuit près des cours d’eau.',
    description: 'Hantise. Il se tapit dans les hautes herbes et ne se montre qu’au dernier moment. Seul le froissement des tiges trahit sa présence.',
    look: { plan: 'bipede', colors: ['#3a3028', '#6a5a4a', '#e8f040'], features: ['yeux'], size: 0.55 },
  },
  {
    id: 124, name: 'Boudarou', category: 'Jinémon Garou', types: ['Ténèbres', 'Métal'],
    baseStats: stats(105, 125, 90, 95), catchRate: 25, baseXp: 235,
    learnset: LS.bouda, talent: 'prestance', nocturne: true, hantise: true,
    folklore: 'Éthiopie et Maghreb — le bouda, forgeron qui se change en hyène à la nuit tombée.',
    description: 'Hantise. Il suit tes traces pas à pas, sans jamais se presser. Si tu t’arrêtes, lui ne s’arrête pas.',
    look: { plan: 'quadrupede', colors: ['#7a6446', '#8a8f98', '#ff5a2a'], features: ['criniere', 'chaines', 'yeux'], size: 1 },
  },
  {
    id: 125, name: 'Kishimiroir', category: 'Jinémon Deux-Visages', types: ['Ténèbres', 'Psy'],
    baseStats: stats(90, 105, 95, 105), catchRate: 25, baseXp: 232,
    learnset: LS.kishi, talent: 'ruse', nocturne: true, hantise: true,
    folklore: 'Angola — le kishi, démon à deux visages : un homme charmant devant, une hyène derrière.',
    description: 'Hantise. Il imite chacun de tes gestes comme un reflet dans l’eau noire. Quand vos chemins se croisent, il montre son autre visage.',
    look: { plan: 'bipede', colors: ['#2a2a3a', '#e8d8c0', '#b8a0ff'], features: ['deuxVisages'], size: 0.9 },
  },
  {
    id: 126, name: 'Nkondiclou', category: 'Jinémon Fétiche', types: ['Spectre', 'Métal'],
    baseStats: stats(100, 115, 130, 40), catchRate: 25, baseXp: 235,
    learnset: LS.nkondi, talent: 'carapace', nocturne: true, hantise: true,
    folklore: 'Kongo (RDC, Angola) — le nkisi nkondi, statue de bois hérissée de clous qui traque les parjures.',
    description: 'Hantise. Une statue hérissée de clous. Tant que tu la regardes, elle ne bouge pas. Détourne les yeux une seconde…',
    look: { plan: 'bipede', colors: ['#6a4a32', '#8a8f98', '#f0f0f0'], features: ['clous'], size: 0.95 },
  },
  {
    id: 127, name: 'Nopperabô', category: 'Jinémon Sans-Visage', types: ['Spectre', 'Psy'],
    baseStats: stats(85, 110, 90, 110), catchRate: 25, baseXp: 232,
    learnset: LS.noppera, nocturne: true, hantise: true,
    folklore: 'Japon — le nopperabō, fantôme qui prend l’apparence d’un passant avant de révéler un visage lisse comme un œuf.',
    description: 'Hantise. De dos, on croirait un simple villageois. Ne lui demande surtout pas ton chemin.',
    look: { plan: 'bipede', colors: ['#e8e0d0', '#2a2a3a', '#f0e8e0'], features: ['sansVisage', 'cheveux'], size: 0.9 },
  },
  {
    id: 128, name: 'Obayifeu', category: 'Jinémon Sorcière', types: ['Feu', 'Spectre'],
    baseStats: stats(75, 120, 75, 125), catchRate: 25, baseXp: 232,
    learnset: LS.obayifo, talent: 'levitation', nocturne: true, hantise: true,
    folklore: 'Akan (Ghana) — l’obayifo, sorcière qui quitte son corps la nuit sous la forme d’une boule de lumière.',
    description: 'Hantise. Une lueur vacillante qui disparaît et reparaît toujours plus près. Quand tu la vois briller juste derrière toi, il est trop tard.',
    look: { plan: 'esprit', colors: ['#7aff8a', '#3a8a4a', '#ff6a3a'], features: ['flamme', 'aura'], size: 0.7 },
  },
  // ── Acte II : le désert, les monts de Hombori, le Delta et les Masques ──
  {
    id: 129, name: 'Fennécho', category: 'Jinémon Écoute-Dunes', types: ['Normal'],
    baseStats: stats(45, 50, 40, 75), catchRate: 120, baseXp: 66,
    evolution: { to: 130, level: 32 }, learnset: LS.fennec,
    folklore: 'Sahara — le fennec, petit renard des sables aux oreilles immenses, que les nomades disent capable d’entendre les djinns.',
    description: 'Ses oreilles captent le pas d’un scarabée à cent mètres. Il creuse son terrier sous les dunes pour fuir la chaleur.',
    look: { plan: 'quadrupede', colors: ['#f0d8a0', '#c89860', '#3a2a20'], features: ['oreilles'], size: 0.4 },
  },
  {
    id: 130, name: 'Fennemirage', category: 'Jinémon Mirage', types: ['Psy', 'Normal'],
    baseStats: stats(70, 85, 65, 115), catchRate: 45, baseXp: 172,
    learnset: LS.fennec, talent: 'oeilVigilant',
    folklore: 'Sahara — le fennec et les mirages, que les caravaniers attribuent aux djinns facétieux.',
    description: 'Il fait danser des mirages au ras des dunes. Les voyageurs égarés suivent une oasis qui recule toujours.',
    look: { plan: 'quadrupede', colors: ['#f0d090', '#b88850', '#7a4ab8'], features: ['oreilles', 'aura'], size: 0.65 },
  },
  {
    id: 131, name: 'Addaxile', category: 'Jinémon Fantôme Blanc', types: ['Terre', 'Normal'],
    baseStats: stats(80, 90, 80, 85), catchRate: 60, baseXp: 170,
    learnset: LS.addax, talent: 'prestance',
    folklore: 'Sahara (Touareg) — l’addax, antilope aux cornes spiralées qui peut vivre sans boire, surnommée « le fantôme blanc des dunes ».',
    description: 'Il ne boit jamais : l’eau des plantes qu’il broute lui suffit. Ses cornes torsadées tracent des spirales dans le sable.',
    look: { plan: 'quadrupede', colors: ['#f0ecd8', '#a89070', '#5a3a28'], features: ['grandesCornes'], size: 0.9 },
  },
  {
    id: 132, name: 'Kelessouf', category: 'Jinémon Solitude', types: ['Ténèbres', 'Esprit'],
    baseStats: stats(70, 85, 70, 105), catchRate: 45, baseXp: 175,
    learnset: LS.kelEssuf, talent: 'ruse', nocturne: true,
    folklore: 'Touareg (Sahara) — les Kel Essuf, esprits de la solitude et du vide, qui visitent les voyageurs restés seuls la nuit.',
    description: 'Il ne s’approche que de ceux qui voyagent seuls. Les Touareg chantent et jouent de l’imzad pour l’éloigner.',
    look: { plan: 'esprit', colors: ['#2a2440', '#4a4ac8', '#e8e0ff'], features: ['aura', 'yeux'], size: 0.75 },
  },
  {
    id: 133, name: 'Tellemite', category: 'Jinémon Figurine', types: ['Roche', 'Esprit'],
    baseStats: stats(55, 60, 75, 40), catchRate: 120, baseXp: 68,
    evolution: { to: 134, level: 40 }, learnset: LS.tellem,
    folklore: 'Pays dogon (Mali) — les Tellem, peuple des falaises d’avant les Dogon, dont on dit qu’ils savaient voler jusqu’à leurs greniers.',
    description: 'Une petite figurine d’argile aux bras levés vers le ciel. On la trouve dans les grottes, où elle prie pour la pluie.',
    look: { plan: 'bipede', colors: ['#a87048', '#5a3a28', '#f0c040'], features: [], size: 0.4 },
  },
  {
    id: 134, name: 'Tellemancien', category: 'Jinémon Ancêtre', types: ['Roche', 'Esprit'],
    baseStats: stats(85, 95, 115, 60), catchRate: 45, baseXp: 178,
    learnset: LS.tellem, talent: 'carapace',
    folklore: 'Pays dogon (Mali) — les statues tellem aux bras levés, couvertes d’une patine de libations millénaires.',
    description: 'Couvert d’une croûte de libations séchées, il garde les tombeaux creusés dans la paroi. Ses bras levés appellent l’orage.',
    look: { plan: 'bipede', colors: ['#7a5034', '#3a2418', '#f0c040'], features: ['aura'], size: 0.9 },
  },
  {
    id: 135, name: 'Kanagou', category: 'Jinémon Masque', types: ['Esprit', 'Vol'],
    baseStats: stats(65, 80, 70, 110), catchRate: 60, baseXp: 172,
    learnset: LS.kanaga, talent: 'levitation',
    folklore: 'Pays dogon (Mali) — le masque kanaga, en forme d’oiseau aux ailes déployées ou de main du dieu créateur, danse aux funérailles.',
    description: 'Il danse en tournoyant pour guider l’âme des défunts vers le pays des ancêtres. Son masque ne tombe jamais.',
    look: { plan: 'oiseau', colors: ['#e8e0d0', '#2a2a2a', '#c8401a'], features: ['ailes'], size: 0.7 },
  },
  {
    id: 136, name: 'Faro', category: 'Jinémon Esprit du Fleuve', types: ['Eau', 'Esprit'],
    baseStats: stats(100, 105, 110, 115), catchRate: 3, baseXp: 290,
    learnset: LS.faro, talent: 'benedictionPluvieuse', legendary: true,
    folklore: 'Bambara et Bozo (Mali) — Faro, génie du Niger, qui mit de l’ordre dans le monde, apporta la pluie et enseigna la parole aux hommes.',
    description: 'Mi-humain mi-poisson, paré de cuivre, ce génie règle les crues du fleuve. On lui offre du lait et des cauris avant la pêche.',
    look: { plan: 'amphibien', colors: ['#3a9ac8', '#c87a3a', '#f0f8ff'], features: ['nageoires', 'cheveux', 'aura'], size: 1.1 },
  },
  {
    id: 137, name: 'Aïdohwedo', category: 'Jinémon Serpent Arc-en-ciel', types: ['Dragon', 'Esprit'],
    baseStats: stats(105, 120, 100, 110), catchRate: 3, baseXp: 300,
    learnset: LS.aidoHwedo, talent: 'ecaillesAntiques', legendary: true,
    folklore: 'Fon (Bénin) — Aïdo-Hwédo, le serpent arc-en-ciel qui porta la créatrice Mawu et s’enroule sous la terre pour la soutenir.',
    description: 'Lové sous le monde, il le porte depuis l’aube des temps. Quand il remue, la terre tremble ; quand il boit, l’arc-en-ciel apparaît.',
    look: { plan: 'serpent', colors: ['#c83a3a', '#3a8ac8', '#f0d040'], features: ['aura'], size: 1.25 },
  },

];

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: number): Species {
  const species = BY_ID.get(id);
  if (!species) throw new Error(`Espèce inconnue : ${id}`);
  return species;
}

export function dexNumber(id: number): string {
  return String(id).padStart(3, '0');
}

/** Espèce dont `id` est l'évolution (ou undefined pour une forme de base). */
export function preEvolution(id: number): Species | undefined {
  return SPECIES.find((s) => s.evolution?.to === id);
}
