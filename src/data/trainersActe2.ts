// Acte II : la route de Tombouctou. Cinq nouveaux Maîtres de Piste, la Confrérie
// des Masques Brisés, la rivale Kady, et le Conseil des Griots.
import type { CharacterLook, Trainer } from './trainers';

const RIVAL_LOOK: CharacterLook = { skin: '#8a5a3a', outfit: '#e8a030', accent: '#3a6ab8', headwear: 'foulard' };
const SBIRE: CharacterLook = { skin: '#4a2a1a', outfit: '#2a2430', accent: '#c8401a', headwear: 'masque' };
const TOUAREG: CharacterLook = { skin: '#7a4a30', outfit: '#2a3a8a', accent: '#e8e0c8', headwear: 'turban' };

/** Sbire de la Confrérie des Masques Brisés. */
function sbire(id: string, team: Trainer['team'], intro: string, defeat: string, after: string): Trainer {
  return {
    id, name: 'Sbire', title: 'Masque Brisé', ai: 'malin', reward: 1500 + team[0].level * 20,
    team, intro: [intro], defeat: [defeat], after: [after], look: SBIRE,
  };
}

export const ACTE2_TRAINERS: Trainer[] = [
  // ── Désert des Djinns ──
  {
    id: 'akli', name: 'Akli', title: 'Caravanier Touareg', ai: 'malin', reward: 1900,
    team: [{ species: 81, level: 42 }, { species: 129, level: 41 }, { species: 122, level: 42 }],
    intro: ['Akli : Le sel de Taoudéni, l’or et les livres… les caravanes portent tout. Mais d’abord, elles se défendent !'],
    defeat: ['Akli : Tu mènerais une caravane jusqu’à la mer, toi.'],
    after: ['Akli : Les Masques Brisés ont attaqué notre caravane hier. Ils cherchaient des fétiches, pas du sel.'],
    look: TOUAREG,
  },
  {
    id: 'tazir', name: 'Tazir', title: 'Nomade des Dunes', ai: 'malin', reward: 1950,
    team: [{ species: 83, level: 42 }, { species: 85, level: 43 }],
    intro: ['Tazir : Le désert n’est pas vide, étranger. Il est plein de ceux qu’on ne voit pas.'],
    defeat: ['Tazir : Le vent a tourné en ta faveur.'],
    after: ['Tazir : La nuit, si tu voyages seul, chante. Les Kel Essuf n’aiment pas les chansons.'],
    look: { skin: '#6a4028', outfit: '#3a4a9a', accent: '#c8b080', headwear: 'turban' },
  },
  sbire('sbire1', [{ species: 21, level: 42 }, { species: 54, level: 43 }],
    'Sbire : La Confrérie des Masques Brisés prend ce qu’elle veut ! Et je veux tes Jinémon !',
    'Sbire : Mon masque… fendu en deux…',
    'Sbire : Notre maître dit que les vieux fétiches dorment trop. Nous, on les réveille.'),
  sbire('sbire2', [{ species: 97, level: 43 }, { species: 50, level: 43 }],
    'Sbire : Hé ! Personne ne doit savoir ce qu’on cherche dans les sables !',
    'Sbire : Bon, bon… je n’ai rien vu, tu n’as rien vu.',
    'Sbire : Les Légendes du fleuve et des falaises vaudront une fortune à Kouma… oups.'),
  {
    id: 'hamza', name: 'Hamza', title: 'Chasseur de Djinns', ai: 'malin', reward: 2200,
    team: [{ species: 66, level: 44 }, { species: 85, level: 44 }, { species: 131, level: 45 }],
    intro: ['Hamza : Je traque les djinns depuis vingt ans. Toi, tu me sembles plus coriace qu’un djinn.'],
    defeat: ['Hamza : Tu as l’âme d’un chasseur.'],
    after: ['Hamza : Les mirages, au nord, cachent la route de Hombori. Seul un Jinémon Psy peut les dissiper.'],
    look: { skin: '#5a3420', outfit: '#c8a060', accent: '#3a2a20', headwear: 'turban' },
  },
  {
    id: 'takama', name: 'Takama', title: 'Reine des Sables', ai: 'malin', reward: 5000, badge: 'mirage',
    team: [{ species: 85, level: 46 }, { species: 66, level: 46 }, { species: 83, level: 47 }, { species: 90, level: 47 }, { species: 130, level: 49 }],
    intro: [
      'Takama : Sois le bienvenu sous ma tente, voyageur du Sud.',
      'Takama : Mes ancêtres ont guidé les caravanes à travers la mer de sable, en lisant les étoiles et les dunes.',
      'Takama : Ici, ce que tu vois n’est pas toujours ce qui est. Saurais-tu distinguer le vrai du mirage ?',
    ],
    defeat: [
      'Takama : Ton regard est clair. Le sable ne t’a pas trompé.',
      'Takama : Reçois l’Insigne du Mirage. Avec lui, un Jinémon Psy pourra dissiper les mirages qui cachent la route du nord.',
      'Takama : Au-delà se dressent les monts de Hombori. Dogo, le Gardien de la Main de Fatma, t’y attend.',
    ],
    after: ['Takama : Le désert garde la mémoire de tous ceux qui l’ont traversé. Il se souviendra de toi.'],
    look: { skin: '#7a4a30', outfit: '#3a3a9a', accent: '#f0c040', headwear: 'turban' },
  },

  // ── Monts de Hombori ──
  {
    id: 'issa', name: 'Issa', title: 'Mineur de Hombori', ai: 'malin', reward: 2300,
    team: [{ species: 36, level: 46 }, { species: 108, level: 46 }],
    intro: ['Issa : Il fait noir comme dans un four ici. Mais j’ai l’habitude, et toi ?'],
    defeat: ['Issa : Tu y vois mieux que moi dans le noir, on dirait.'],
    after: ['Issa : Un Jinémon Feu dans ton équipe éclaire les galeries. Sans lui, tu marches à tâtons.'],
    look: { skin: '#5a3420', outfit: '#6a6f78', accent: '#f0c040', headwear: 'bonnet' },
  },
  {
    id: 'aicha', name: 'Aïcha', title: 'Grimpeuse des Monts', ai: 'malin', reward: 2400,
    team: [{ species: 107, level: 47 }, { species: 13, level: 47 }, { species: 106, level: 46 }],
    intro: ['Aïcha : J’ai escaladé la Main de Fatma par la face nord ! Toi, tu n’es qu’un petit caillou sur ma route.'],
    defeat: ['Aïcha : Ouf. J’ai perdu prise…'],
    after: ['Aïcha : Au sommet, les gargouilles nichent dans les fissures. Elles ne bougent que la nuit.'],
    look: { skin: '#6a4028', outfit: '#c83a3a', accent: '#f0f0f0', headwear: 'foulard' },
  },
  sbire('sbire3', [{ species: 57, level: 47 }, { species: 46, level: 47 }, { species: 54, level: 48 }],
    'Sbire : Ces vieilles tombes tellem regorgent de statuettes. On creuse, et tu ne nous déranges pas !',
    'Sbire : Aïe… le Lieutenant va me tuer.',
    'Sbire : Le Lieutenant Sogo est parti vers Djenné. Il a un plan pour attraper le génie du fleuve.'),
  {
    id: 'mounkaila', name: 'Mounkaïla', title: 'Archéologue', ai: 'malin', reward: 2500,
    team: [{ species: 134, level: 48 }, { species: 66, level: 47 }, { species: 133, level: 46 }],
    intro: ['Mounkaïla : Ces grottes abritent les tombeaux des Tellem. Les pillards masqués saccagent tout ! Es-tu des leurs ?'],
    defeat: ['Mounkaïla : Pardonne-moi. Tu combats avec respect, tu ne peux pas être un pillard.'],
    after: ['Mounkaïla : Les Tellem plaçaient de petites figurines aux bras levés pour demander la pluie. Certaines se sont éveillées.'],
    look: { skin: '#4a2a1a', outfit: '#c8b890', accent: '#6a4a2a', headwear: 'chapeau' },
  },
  {
    id: 'rival3', name: 'Kady', title: 'Rivale', rivalStage: 3, ai: 'malin', reward: 4000,
    team: [{ species: 15, level: 48 }, { species: 42, level: 49 }, { species: 54, level: 49 }, { species: 0, level: 51 }],
    intro: [
      'Kady : Te voilà ! Tu as battu la Gardienne du Panthéon ? Grand-père ne parle plus que de toi.',
      'Kady : Moi aussi je vais à Tombouctou. Le Conseil des Griots n’accepte que les meilleurs.',
      'Kady : Et la meilleure, ce sera moi. En garde !',
    ],
    defeat: ['Kady : Encore toi devant… Mais cette fois, je n’abandonne pas. On se retrouvera à Tombouctou !'],
    after: ['Kady : Les Masques Brisés ont saccagé les tombeaux. Si tu en croises, botte-leur les fesses pour moi.'],
    look: RIVAL_LOOK,
  },
  {
    id: 'dogo', name: 'Dogo', title: 'Gardien de la Main de Fatma', ai: 'malin', reward: 5600, badge: 'pierre',
    team: [{ species: 36, level: 50 }, { species: 57, level: 50 }, { species: 107, level: 51 }, { species: 134, level: 52 }, { species: 120, level: 53 }],
    intro: [
      'Dogo : … Les montagnes parlent lentement. Il faut savoir écouter.',
      'Dogo : Depuis mille ans, ma famille veille sur ces roches et sur les morts qui y reposent.',
      'Dogo : Montre-moi que ta volonté est plus dure que la pierre.',
    ],
    defeat: [
      'Dogo : La pierre s’est fendue. Ta volonté est la plus forte.',
      'Dogo : Voici l’Insigne de la Pierre. Les guides de Hombori te conduiront désormais vers le Delta, au sud.',
      'Dogo : À Djenné, Ténin garde le fleuve et son dragon. Prends garde aux Masques Brisés qui rôdent là-bas.',
    ],
    after: ['Dogo : Les morts ne craignent rien. Ce sont les vivants qu’il faut surveiller.'],
    look: { skin: '#3a2214', outfit: '#6a5a4a', accent: '#c8401a', headwear: 'bonnet' },
  },

  // ── Djenné et le Delta ──
  {
    id: 'sekou', name: 'Sékou', title: 'Pêcheur Bozo', ai: 'malin', reward: 2600,
    team: [{ species: 92, level: 49 }, { species: 79, level: 49 }, { species: 109, level: 48 }],
    intro: ['Sékou : Les Bozo sont les maîtres de l’eau. Le fleuve nous connaît par nos prénoms !'],
    defeat: ['Sékou : Le fleuve t’a adopté, on dirait.'],
    after: ['Sékou : Garde la nasse que je t’ai donnée. Les plus beaux Jinémon se cachent au fond de l’eau.'],
    look: { skin: '#6a4028', outfit: '#3a9ab0', accent: '#f0e0a0', headwear: 'chapeau' },
  },
  {
    id: 'kadiatou', name: 'Kadiatou', title: 'Marchande de Djenné', ai: 'malin', reward: 2700,
    team: [{ species: 90, level: 49 }, { species: 81, level: 50 }],
    intro: ['Kadiatou : Le lundi, tout le Delta vient au marché de Djenné. Et le lundi, je ne perds jamais !'],
    defeat: ['Kadiatou : Bon, pas de chance. On est mardi, peut-être ?'],
    after: ['Kadiatou : Chaque année, toute la ville remonte de l’argile sur les murs avant la saison des pluies. C’est la fête du crépissage !'],
    look: { skin: '#5a3420', outfit: '#e85a2a', accent: '#f0c040', headwear: 'foulard' },
  },
  sbire('sbire4', [{ species: 87, level: 50 }, { species: 99, level: 50 }],
    'Sbire : Le Lieutenant prépare un grand coup au fleuve. Dégage !',
    'Sbire : Je file prévenir le Lieutenant !',
    'Sbire : Le génie du fleuve… le Lieutenant veut l’enfermer dans une calebasse brisée.'),
  {
    id: 'sogo', name: 'Sogo', title: 'Lieutenant des Masques Brisés', ai: 'malin', reward: 4500,
    team: [{ species: 114, level: 51 }, { species: 116, level: 51 }, { species: 97, level: 52 }, { species: 50, level: 52 }],
    intro: [
      'Sogo : Encore toi ? Mes sbires m’ont parlé de toi.',
      'Sogo : Le génie Faro s’éveille dans ces eaux une fois par génération. Ce soir, il sera à la Confrérie !',
      'Sogo : Recule, ou je te noie dans le fleuve !',
    ],
    defeat: [
      'Sogo : Impossible… Mes Jinémon des marais, battus…',
      'Sogo : Le Maître Kouma saura te faire regretter ça. Les Masques Brisés n’oublient jamais !',
      'Le Lieutenant s’enfuit. Les eaux du fleuve se mettent à briller…',
    ],
    after: ['…'],
    look: { skin: '#3a2214', outfit: '#1a1a24', accent: '#e8c040', headwear: 'masque' },
    sight: 0,
  },
  {
    id: 'tenin', name: 'Ténin', title: 'Gardienne de Ninki Nanka', ai: 'malin', reward: 6200, badge: 'dragon',
    team: [{ species: 92, level: 53 }, { species: 63, level: 54 }, { species: 115, level: 54 }, { species: 111, level: 55 }, { species: 39, level: 56 }],
    intro: [
      'Ténin : Dans les marigots du fleuve vit Ninki Nanka, le dragon. Qui le voit ne s’en remet jamais, dit-on.',
      'Ténin : Moi, je l’ai vu. Et je lui parle.',
      'Ténin : Voyons si ton courage tient debout devant le souffle des dragons !',
    ],
    defeat: [
      'Ténin : Le dragon s’incline. Je n’avais jamais vu ça.',
      'Ténin : Prends l’Insigne du Dragon. Les passeurs du fleuve te mèneront jusqu’à la côte, à l’ouest.',
      'Ténin : Là-bas, Ndiaga règne sur les vents. Il est aussi rapide qu’une rafale d’alizé.',
    ],
    after: ['Ténin : Le fleuve donne la vie et la reprend. Le dragon, lui, se contente d’observer.'],
    look: { skin: '#4a2a1a', outfit: '#2a8a6a', accent: '#f0c040', headwear: 'turban' },
  },

  // ── Côte des Alizés ──
  {
    id: 'ndeye', name: 'Ndèye', title: 'Pêcheuse Lébou', ai: 'malin', reward: 2800,
    team: [{ species: 110, level: 52 }, { species: 44, level: 52 }, { species: 119, level: 53 }],
    intro: ['Ndèye : Les Lébou parlent à la mer, et la mer leur répond. Écoute bien !'],
    defeat: ['Ndèye : La marée t’est favorable aujourd’hui.'],
    after: ['Ndèye : Mame Coumba Bang protège les pêcheurs. On lui laisse toujours une part de la pêche.'],
    look: { skin: '#4a2a1a', outfit: '#e8c040', accent: '#3a86c8', headwear: 'foulard' },
  },
  {
    id: 'ousmane', name: 'Ousmane', title: 'Marin', ai: 'malin', reward: 2800,
    team: [{ species: 50, level: 53 }, { species: 93, level: 53 }],
    intro: ['Ousmane : J’ai navigué jusqu’aux îles lointaines. Les tempêtes ne me font pas peur, et toi non plus !'],
    defeat: ['Ousmane : Coulé ! Comme en pleine tempête.'],
    after: ['Ousmane : Les selkies viennent sécher leur peau de phoque sur ces plages, les nuits de pleine lune.'],
    look: { skin: '#5a3420', outfit: '#f0f0f0', accent: '#2a4a8a', headwear: 'bonnet' },
  },
  {
    id: 'fatou', name: 'Fatou', title: 'Observatrice d’Oiseaux', ai: 'malin', reward: 2900,
    team: [{ species: 23, level: 53 }, { species: 104, level: 53 }, { species: 122, level: 54 }],
    intro: ['Fatou : Chut ! Tu vas effrayer les oiseaux migrateurs… Bon, tant pis, combattons !'],
    defeat: ['Fatou : Ils se sont tous envolés…'],
    after: ['Fatou : Chaque hiver, des millions d’oiseaux d’Europe viennent ici. Ils sont plus voyageurs que les caravanes !'],
    look: { skin: '#6a4028', outfit: '#5fa83a', accent: '#f0e0a0', headwear: 'chapeau' },
  },
  sbire('sbire5', [{ species: 21, level: 54 }, { species: 117, level: 54 }],
    'Sbire : On braconne les Jinémon des plages pour la Confrérie. Ne t’en mêle pas !',
    'Sbire : Ouille ! Retraite vers le Bois des Masques !',
    'Sbire : Notre repaire est dans le Bois des Masques, au nord. Kouma t’y attend… enfin, j’imagine.'),
  {
    id: 'ndiaga', name: 'Ndiaga', title: 'Maître des Alizés', ai: 'malin', reward: 6800, badge: 'vent',
    team: [{ species: 121, level: 56 }, { species: 104, level: 57 }, { species: 95, level: 57 }, { species: 113, level: 58 }, { species: 68, level: 59 }],
    intro: [
      'Ndiaga : Sens-tu ce vent ? Il a traversé tout l’océan pour arriver jusqu’ici.',
      'Ndiaga : Du haut de ce phare, je guide les pirogues et je lis les tempêtes.',
      'Ndiaga : Mes Jinémon volent plus vite que l’orage. Tiens-toi bien !',
    ],
    defeat: [
      'Ndiaga : Le vent a tourné… et il souffle pour toi.',
      'Ndiaga : Reçois l’Insigne du Vent. Un Jinémon connaissant une attaque Vol pourra te porter vers tous les lieux de soin que tu as visités.',
      'Ndiaga : Le Bois des Masques est au nord. Les Masques Brisés s’y terrent. Sois prudent.',
    ],
    after: ['Ndiaga : Ouvre le menu et choisis « Voler ». Le ciel t’appartient.'],
    look: { skin: '#3a2214', outfit: '#6ac8e8', accent: '#f0f0f0', headwear: 'chapeau' },
  },

  // ── Bois des Masques ──
  sbire('sbire6', [{ species: 48, level: 55 }, { species: 52, level: 55 }],
    'Sbire : Personne n’entre dans le Bois des Masques sans la permission de Kouma !',
    'Sbire : Mes esprits me désobéissent…',
    'Sbire : Kouma dit que les masques ont perdu leur pouvoir parce que plus personne ne les craint.'),
  sbire('sbire7', [{ species: 99, level: 56 }, { species: 132, level: 56 }],
    'Sbire : Tu entends ces tambours ? C’est la cérémonie qui commence. Tu arrives trop tard !',
    'Sbire : La cérémonie… elle va mal tourner sans moi.',
    'Sbire : Moi, je voulais juste un masque qui fait peur. Pas devenir un brigand…'),
  sbire('sbire8', [{ species: 51, level: 56 }, { species: 73, level: 56 }, { species: 26, level: 57 }],
    'Sbire : Dernière ligne de défense de la Confrérie ! Tu ne passeras pas !',
    'Sbire : Je… je me rends.',
    'Sbire : Le Maître est dans la clairière aux masques. C’est lui, le Maître de Piste de ce bois.'),
  {
    id: 'ama', name: 'Ama', title: 'Sculptrice de Masques', ai: 'malin', reward: 2900,
    team: [{ species: 135, level: 56 }, { species: 28, level: 56 }],
    intro: ['Ama : Les Masques Brisés volent nos masques sacrés ! Montre-moi que tu n’es pas l’un d’eux.'],
    defeat: ['Ama : Tu as le cœur pur. Pardonne mon accueil.'],
    after: ['Ama : Un masque n’est pas un déguisement. Quand le danseur le porte, c’est l’esprit qui danse.'],
    look: { skin: '#3a2214', outfit: '#c8a060', accent: '#c8401a', headwear: 'foulard' },
  },
  {
    id: 'kouma', name: 'Kouma', title: 'Maître des Masques', ai: 'malin', reward: 7500, badge: 'masque',
    team: [{ species: 132, level: 58 }, { species: 99, level: 58 }, { species: 52, level: 59 }, { species: 97, level: 59 }, { species: 48, level: 60 }, { species: 51, level: 61 }],
    intro: [
      'Kouma : Ainsi, c’est toi qui défais mes Masques Brisés depuis le désert.',
      'Kouma : Oui, je suis Maître de Piste. Et oui, je dirige la Confrérie.',
      'Kouma : Les gens n’ont plus peur des masques, plus de respect pour les esprits. Je voulais leur rendre leur terreur !',
      'Kouma : Si tu veux mon insigne, arrache-le-moi !',
    ],
    defeat: [
      'Kouma : … Mes masques se taisent. Les esprits ont choisi ton camp.',
      'Kouma : Peut-être que la peur n’était pas le bon chemin. Le respect ne s’impose pas…',
      'Kouma : La Confrérie est dissoute. Prends l’Insigne du Masque : avec huit insignes, Tombouctou t’ouvre ses portes.',
    ],
    after: ['Kouma : Je vais rendre les masques volés aux villages. Ce sera long. C’est juste.'],
    look: { skin: '#2a1810', outfit: '#3a1a3a', accent: '#e8e0d0', headwear: 'masque' },
  },

  // ── Tombouctou et le Conseil des Griots ──
  {
    id: 'rival4', name: 'Kady', title: 'Rivale', rivalStage: 4, ai: 'malin', reward: 6000,
    team: [{ species: 15, level: 58 }, { species: 42, level: 59 }, { species: 54, level: 59 }, { species: 92, level: 60 }, { species: 0, level: 62 }],
    intro: [
      'Kady : Huit insignes, moi aussi. On arrive ensemble devant le Conseil.',
      'Kady : Mais une seule de nous deux franchira ces portes la première. Prépare-toi !',
    ],
    defeat: ['Kady : … Tu es vraiment redoutable. Mais le Conseil, c’est autre chose. On verra qui ira le plus loin.'],
    after: ['Kady : Je vais m’entraîner encore un peu… Ne m’attends pas.'],
    look: RIVAL_LOOK,
  },
  {
    id: 'mahmoud', name: 'Mahmoud', title: 'Lettré de Tombouctou', ai: 'malin', reward: 3000,
    team: [{ species: 66, level: 57 }, { species: 23, level: 57 }, { species: 85, level: 58 }],
    intro: ['Mahmoud : Les manuscrits de Tombouctou parlent d’astronomie, de médecine et de Jinémon. Voyons si tu as bien lu !'],
    defeat: ['Mahmoud : Ta science du combat dépasse la mienne.'],
    after: ['Mahmoud : Des familles ont caché des milliers de manuscrits pendant des siècles pour les sauver. Le savoir est un trésor.'],
    look: { skin: '#5a3420', outfit: '#f0ead8', accent: '#3a6ab8', headwear: 'turban' },
  },
  {
    id: 'gardeConseil', name: 'Garde', title: 'Garde du Conseil', ai: 'malin', reward: 3200,
    team: [{ species: 32, level: 58 }, { species: 31, level: 58 }, { species: 113, level: 59 }],
    intro: ['Garde : Avant le Conseil, une dernière épreuve. Si tu échoues ici, inutile d’aller plus loin.'],
    defeat: ['Garde : Tu es digne d’être entendu par les griots.'],
    after: ['Garde : Les griots t’attendent. On ne revient pas en arrière une fois devant eux.'],
    look: { skin: '#3a2214', outfit: '#9a7a4a', accent: '#f0f0f0', headwear: 'chapeau' },
  },
  {
    id: 'kandia', name: 'Kandia', title: 'Griotte de la Parole', ai: 'malin', reward: 8000, sight: 0,
    team: [{ species: 42, level: 60 }, { species: 34, level: 60 }, { species: 28, level: 61 }, { species: 103, level: 61 }, { species: 118, level: 62 }],
    intro: [
      'Kandia : Je suis Kandia, première du Conseil des Griots.',
      'Kandia : La parole est sacrée : elle peut guérir ou blesser, unir ou diviser.',
      'Kandia : Que ta parole, aujourd’hui, soit celle des esprits !',
    ],
    defeat: ['Kandia : Ta parole est forte et juste. Va : Bazoumana t’attend dans la salle suivante.'],
    after: ['Kandia : Va. Le Conseil t’écoute.'],
    look: { skin: '#4a2a1a', outfit: '#e85a8f', accent: '#f0c040', headwear: 'foulard' },
  },
  {
    id: 'bazoumana', name: 'Bazoumana', title: 'Griot de la Kora', ai: 'malin', reward: 8500, sight: 0,
    team: [{ species: 11, level: 61 }, { species: 25, level: 61 }, { species: 73, level: 62 }, { species: 65, level: 62 }, { species: 3, level: 63 }],
    intro: [
      'Bazoumana : Ma kora a vingt et une cordes. Chacune chante un ancêtre.',
      'Bazoumana : Mes Jinémon sont nés de la terre et des récoltes. Ils sont patients… comme une termitière.',
      'Bazoumana : Écoute leur chant !',
    ],
    defeat: ['Bazoumana : La dernière corde a vibré pour toi. Fanta t’attend.'],
    after: ['Bazoumana : Continue. Les ancêtres écoutent.'],
    look: { skin: '#3a2214', outfit: '#5fa83a', accent: '#f0e0a0', headwear: 'bonnet' },
  },
  {
    id: 'fanta', name: 'Fanta', title: 'Griotte des Ancêtres', ai: 'malin', reward: 9000, sight: 0,
    team: [{ species: 51, level: 62 }, { species: 67, level: 62 }, { species: 46, level: 63 }, { species: 48, level: 63 }, { species: 99, level: 64 }],
    intro: [
      'Fanta : Les griots se souviennent des morts. Moi, je les entends encore.',
      'Fanta : Ceux qui ont quitté ce monde combattent à mes côtés.',
      'Fanta : Auras-tu le courage d’affronter les ancêtres eux-mêmes ?',
    ],
    defeat: ['Fanta : Les ancêtres sont satisfaits. Balla Fasséké, le maître des griots, t’attend.'],
    after: ['Fanta : Les morts ne sont pas morts. Ils sont dans le vent, dans l’eau, dans le feu.'],
    look: { skin: '#2a1810', outfit: '#6d5a9c', accent: '#e8e0d0', headwear: 'turban' },
  },
  {
    id: 'balla', name: 'Balla Fasséké', title: 'Maître des Griots', ai: 'malin', reward: 9500, sight: 0,
    team: [{ species: 13, level: 63 }, { species: 60, level: 64 }, { species: 61, level: 64 }, { species: 39, level: 65 }, { species: 64, level: 66 }],
    intro: [
      'Balla Fasséké : Je porte le nom du griot de Soundiata, celui qui chanta l’épopée du Mandé.',
      'Balla Fasséké : Depuis huit siècles, ma lignée garde la mémoire des rois et des héros.',
      'Balla Fasséké : Mes dragons sont aussi anciens que les épopées. Fais-moi chanter une nouvelle légende !',
    ],
    defeat: [
      'Balla Fasséké : … Magnifique. Je composerai une chanson sur ce combat.',
      'Balla Fasséké : Une dernière personne t’attend derrière la grande porte. Elle est arrivée juste avant toi.',
    ],
    after: ['Balla Fasséké : Va. Ta légende commence.'],
    look: { skin: '#3a2214', outfit: '#f0e8d8', accent: '#c8401a', headwear: 'bonnet' },
  },
  {
    id: 'kadyChampion', name: 'Kady', title: 'Championne du Mandé', rivalStage: 5, ai: 'malin', reward: 12000, sight: 0,
    team: [{ species: 15, level: 64 }, { species: 42, level: 65 }, { species: 54, level: 65 }, { species: 92, level: 66 }, { species: 68, level: 66 }, { species: 0, level: 68 }],
    intro: [
      'Kady : Je t’attendais. J’ai battu les quatre griots juste avant toi.',
      'Kady : Tu sais ce que ça veut dire ? Je suis la Championne du Mandé.',
      'Kady : Depuis le premier jour dans la savane, je cours derrière toi. Aujourd’hui, c’est toi qui dois me rattraper.',
      'Kady : Grand-père nous regarde. Donnons-lui le plus beau combat de tous !',
    ],
    defeat: [
      'Kady : … C’est fini. J’ai perdu.',
      'Kady : Tu sais quoi ? Je suis contente que ce soit toi.',
      'Kady : Le Conseil des Griots t’appartient. Tu es le nouveau Champion du Mandé !',
    ],
    after: ['Kady : Champion… ça te va bien. Mais je reviendrai, compte sur moi !'],
    look: RIVAL_LOOK,
  },
];
