# Ginémon — Légendes du Sahel et d’ailleurs

RPG de collection, d’exploration et de combat au tour par tour, jouable dans le navigateur.
Le joueur incarne un **Initié** qui capture, entraîne et fait évoluer des **Jinémon**, créatures nées des forces de la
nature et des légendes : d’abord celles d’Afrique de l’Ouest (traditions dogon, bambara, peule, soninké, wolof,
mandingue, akan…), puis celles venues d’ailleurs avec les caravanes : dragons d’Europe et de Chine, esprits du Japon,
spectres du Nord, serpent à plumes de Mésoamérique, sphinx d’Égypte, feux follets, mandragores…

Construit à partir du GDD v1.0 puis étendu : TypeScript + Vite, rendu Canvas 2D sans moteur externe, sauvegarde dans
le LocalStorage, déploiement sur GitHub Pages. Aucune image ni aucun son externe : sprites, décors, musique et bruitages
sont générés par le code.

**Cette branche est la version courte et facile** : une aventure d’une heure environ, deux Arènes, quatre zones, et
une héroïne qui ne tombe jamais. La version complète (deux actes, huit Arènes, Conseil des Griots, 13 zones) est
gardée telle quelle sur la branche [`sauvegarde/ginemon-complet`](../../tree/sauvegarde/ginemon-complet).

## L’aventure (version courte)

- **L’héroïne s’appelle Lisa** par défaut : le prénom est déjà écrit à l’écran de départ, il suffit de valider, ou
  de taper un autre prénom (la première lettre tapée remplace « Lisa »). Sur téléphone, toucher l’écran ouvre le
  clavier du téléphone.
- **Surnoms** : chaque Jinémon qui rejoint l’équipe (le premier, ceux qu’on capture, qu’on arrache à un bandit ou
  qu’on reçoit) peut recevoir un surnom, sur le même écran que le prénom.
- **Au réveil, Maman** parle des Jinémon, envoie au sanctuaire du Hogon chercher un premier compagnon… et finit par
  l’essentiel : **Thomas a des ennuis, il faut aller le retrouver.**
- **Les Sandales Noires**, une bande de brigands, ont pris **les deux Arènes de la région** : la Forge des Terres
  Rouges (Sirafa, leur lieutenant, Feu / Métal) et le Sanctuaire du Marigot (Aminata, le bras droit du Chef, Eau /
  Esprit). Leurs insignes s’obtiennent comme avant ; l’Insigne de l’Enclume suffit à briser les rochers fissurés.
- **De l’aide avant chaque Arène** : le vieux forgeron chassé de sa Forge confie un Kappou (Eau), et une herboriste du
  Marigot un Kaméléo (Plante). Avec eux, chaque starter gagne les deux Arènes.
- **Djenna, la petite sœur de Lisa**, qui parle un anglais approximatif, accourt quand on sort de la Forge après avoir battu
  Sirafa : elle offre **5 Calebasses Master** (la capture réussit à tous les coups) et un **Gâteau à la Fraise** (un
  Jinémon retrouve tous ses PV et se remet de ses altérations). On la retrouve à l’entrée du Marigot pour un **duel
  amical** : perdu, elle soigne l’équipe et l’on recommence quand on veut ; gagné, elle confie **Wouloupi**, un chiot
  noir aux grandes oreilles, qu’on peut surnommer.
- **Thomas** attend derrière l’autel du Sanctuaire, une fois Aminata battue. La fin réserve une surprise ; puis le
  générique, et l’on peut continuer à explorer et à remplir le Ginédex. On peut lui reparler pour réentendre son
  message.
- **La région** : Village des Greniers, Savane des Termitières, Terres Rouges et Marigot des Ancêtres (le gué vers la
  Forêt Sacrée a été emporté). Le Ginédex, la carte, le menu et les insignes ne montrent que ce qu’elle contient :
  **84 Jinémon** à rencontrer (faune, pêche, trois Hantises, les sept Terreurs nocturnes et les Jinémon offerts) et
  **2 insignes**.

## Graphismes

Le jeu est dessiné en pixel art dans un écran natif de 256×192 pixels, agrandi d’un facteur entier à l’affichage.

- **Jinémon et objets du décor sculptés en volume.** Chaque créature est modelée en 3D avec des primitives à champ
  de distance (sphères, ellipsoïdes, cônes arrondis ou tronqués) fondues entre elles, puis rendue par lancer de
  rayons et convertie en pixel art : tons quantifiés et décalés en teinte, occlusion ambiante, motifs posés sur le
  volume (taches, rayures, écailles, plumes), traits intérieurs aux ruptures de profondeur et contour teinté.
  Les Jinémon sont vus de trois quarts face, et de dos côté joueur en combat. Les arbres, baobabs, cases, greniers et
  termitières de la carte passent par le même sculpteur, en vue plongeante.
- **Décors peints.** Sols texturés par un bruit en coordonnées du monde (plaques d’herbe tramées, gravillons, eau
  ondulée), fonds de combat propres à chaque décor (savane, terres rouges, marigot, forêt, falaise de Bandiagara…),
  écran titre en contre-jour.
- **Effets d’attaque** en particules, un par type élémentaire.
- **Musique chiptune** composée pour le jeu et synthétisée en direct (kora, balafon, flûte peule, djembé, ondes
  pulsées) : un thème par région, combats sauvages, de dresseur, de Maître de Piste, de Hantise et de Légende, jingles
  de soin, de capture, d’insigne et d’évolution. Chaque Jinémon a son propre cri.
- Les personnages (16×24) et la police bitmap accentuée sont dessinés à la main.

## Jouer

```bash
npm install
npm run dev        # http://localhost:5173
```

| Action | Clavier | Tactile |
|---|---|---|
| Se déplacer | Flèches, ZQSD ou WASD | Croix directionnelle |
| Parler / valider | Entrée, Espace ou J | A |
| Annuler / retour | Échap, Retour arrière, K ou X | B |
| Menu | Échap, M ou Tab | ☰ |
| Courir | Maj (maintenue) | B maintenu |

La partie est sauvegardée automatiquement (changement de zone, après chaque combat, capture, soin, achat, et toutes les
30 secondes) ; le menu permet aussi de sauvegarder à la main.

## Ne jamais être perdu

- **Un vrai départ** : on se réveille dans sa chambre (on a trop dormi !), on descend l’escalier, Maman attend au
  salon, donne le **sac de couchage** et envoie au **sanctuaire du Hogon**, le chef spirituel du village, qui confie le
  premier Jinémon (et des menottes). Maman soigne aussi l’équipe à chaque visite.
- **Des bâtiments qu’on reconnaît de loin**, identiques dans chaque ville : l’**Auberge** blanche au toit vert et aux
  lanternes (soins gratuits, lits, **Grande Jarre**), le **Marché** au toit de chaume et à l’auvent rayé orange. On y
  entre ; on parle à l’aubergiste et à la marchande par-dessus leur comptoir. Dans les lieux sauvages (Forêt Sacrée,
  camp de la Piste, sommet de la Falaise, oasis du désert, grotte de Hombori, Bois des Masques), ils sont remplacés par
  un **campement**, une Grande Jarre en plein air et l’étal d’un marchand.
- **La Grande Jarre**, comme le PC de Pokémon : un canari géant au tourbillon magique vert et violet, où l’on peut
  déposer, retirer ou **échanger** directement un Jinémon de l’équipe contre un Jinémon en réserve. Toutes les jarres
  communiquent entre elles.
- **L’objectif du moment** est toujours affiché dans le menu (et rappelé par le Hogon et par Maman).
- **CARTE** (menu) : la carte du Mandé avec « vous êtes ici », les lieux visités, les routes et une étoile sur
  l’objectif. Sur chaque lieu visité, A ouvre son **plan** (bâtiments, stands, sorties). Le Village des Greniers a aussi
  son plan affiché sur la place.

## Bandits, lits et nuits (sans danger pour l’héroïne)

- **Les dresseurs de route sont des bandits** : racketteurs, braconniers, pilleurs de tombes, pirates, sbires des
  Masques Brisés… Ils veulent votre bourse. La rivale, les Maîtres de Piste et le Conseil des Griots se battent
  loyalement (sauf Kouma, le chef des Masques Brisés).
- **Quand leur dernier Jinémon tombe, le bandit vient en personne**, machette au poing : un **duel** au corps à corps
  (FRAPPER, ASSOMMER — puissant mais peut manquer —, PARER — encaisse à peine puis riposte). Le héros a ses propres
  PV, qui grandissent avec son équipe (affichés dans le menu).
- **À genoux, il implore** : l’**achever** (on récupère sa bourse), ou l’**épargner**. Les trois quarts ont la tête mise
  à prix : avec des **Menottes de Fer** (5 offertes par le Hogon, puis au marché), la garde l’emmène et la **prime** est
  pour vous ; menotté, il avoue ce qu’il sait. Sans menottes, ou sans prime, il détale. Mort, arrêté ou en fuite, il
  ne revient plus sur la carte. **L’héroïne, elle, ne tombe jamais** : un coup qui l’aurait mise à terre la laisse
  chancelante à 1 PV (« vous tenez bon ! »), et le duel continue jusqu’à ce que le bandit cède.
- **Les Jinémon des bandits peuvent leur être arrachés** d’un coup de calebasse quand ils sont affaiblis : moins de 30 %
  de leurs PV, endormis, paralysés ou confus (une calebasse clignote alors à côté de leurs PV).
- **Facile** : les coups de votre camp portent 35 % de plus, l’expérience est multipliée par 1,5, et après
  chaque victoire le héros récupère 25 % de ses PV et chaque Jinémon debout 10 %. Les Jinémon restés en réserve
  gagnent aussi un petit tiers de l’expérience (la moitié avec l’Amulette du Partage). Les calebasses sont plus
  généreuses (×1,5), surtout avec les jeunes Jinémon (jusqu’au niveau 20) : en début de partie, un Jinémon commun
  presque K.O. ne leur échappe plus. Les chefs des deux Arènes jouent plus simplement et alignent des équipes légères,
  les bandits du Marigot, les Hantises et les Terreurs nocturnes ont été rabaissés de quelques niveaux, et le starter
  Plante apprend Charge de Brousse dès le niveau 6.
- **Lits et point de réveil** : dormir à l’auberge (lits ou aubergiste), dans sa chambre, chez Maman ou sous la tente
  d’un campement soigne tout le monde et fixe l’endroit où l’on revient quand l’équipe est à terre. Le **sac de couchage**
  (SAC) permet de bivouaquer n’importe où dehors : moins réparateur, et la nuit, une Hantise vient parfois renifler le
  dormeur.
- **Si toute l’équipe tombe**, de jour comme de nuit, on prend ses Jinémon dans ses bras et on rentre au dernier lit,
  sans rien perdre (ni cauris, ni rien d’autre). Les monstres de la nuit ne s’en prennent jamais à l’héroïne.

## Contenu

- **145 Jinémon** dans les données (dont 84 dans la région jouable de la version courte), répartis en 98 lignées, dont les 12 du GDD (starters Poussilope / Têtuanom / Étincel, Termiton,
  Termitox, Rochard) et quatre Légendes : Yurugal, le Renard Pâle ; Bidawa, le Serpent d’Or du Wagadou ; Faro, génie
  du Niger ; Aïdohwedo, le serpent arc-en-ciel des Fon. Environ un Jinémon sauvage sur 512 est **chatoyant**
  (couleurs rares).
  Le bestiaire puise surtout dans les contes d’Afrique de l’Ouest, mais aussi d’Afrique centrale et australe, d’Égypte,
  d’Europe, d’Asie, d’Océanie et des Amériques. Fiche complète : [`docs/GINEDEX.md`](docs/GINEDEX.md).
- **100 attaques** réparties sur les 14 types, en quatre paliers (base, élémentaire, statut, divin), avec altérations,
  modificateurs de statistiques, soins, drain, contrecoup et priorité.
- **Bassins d’attaques** d’environ 15 attaques par lignée, apprises du niveau 1 au niveau 70 ; au-delà de 4 attaques,
  le jeu propose d’en oublier une. Depuis l’équipe, on peut à tout moment remplacer une attaque par une autre déjà
  apprise.
- *(Version complète)* **13 zones** et une trentaine d’intérieurs : Village des Greniers (maison, sanctuaire, auberge, Marché), Savane des Termitières, Terres Rouges, Marigot des Ancêtres, Forêt Sacrée,
  Piste des Chasseurs Donzos, Falaise des Ancêtres (Panthéon des Légendes), puis Désert des Djinns, Monts de Hombori
  (grottes obscures), Djenné et le Delta, Côte des Alizés, Bois des Masques et Tombouctou.
- *(Version complète)* **8 Arènes et leurs insignes** : Forge des Terres Rouges, Marigot des Ancêtres, Piste des Chasseurs Donzos, Oasis
  de Tin-Hinan, Main de Fatma, Fleuve de Djenné, Phare des Alizés, Bois des Masques ; puis le **Conseil des Griots**
  (quatre griots à affronter d’affilée) et la Championne. Plus de 50 adversaires, dont une quarantaine de bandits, une
  rivale qui grandit avec vous, une organisation de pillards et son chef.
- **Les bandits vous repèrent** : un « ! » apparaît, ils marchent jusqu’à vous et réclament votre bourse.
- **Techniques hors combat** : briser les rochers fissurés (Insigne de l’Enclume + Jinémon Métal), franchir les gués
  (Insigne de la Pluie + Jinémon Eau), dissiper les mirages (Insigne du Mirage + Jinémon Psy), éclairer les grottes
  (un Jinémon Feu dans l’équipe), **voler** vers les auberges et campements visités (Insigne du Vent + Jinémon Vol, menu
  « Voler »), **pêcher** face à l’eau avec la Nasse du Pêcheur.
- Calebasses de capture (Sacrée, Ornée, des Ancêtres, Royale), remèdes (karité, bissap, pain de singe, miel sauvage,
  baume des Anciens, moringa, noix de kola), Amulette du Partage (l’expérience profite à toute l’équipe), marché en
  cauris, Grande Jarre (dépôt, retrait, échange), Ginédex avec habitats, évolutions animées (annulables avec B), Panthéon
  des vainqueurs et générique.

## Jour, nuit et Hantises

- **Horloge** : une seconde réelle vaut une minute de jeu, une journée dure donc 24 minutes. Aube de 5 h à 7 h, jour
  jusqu’à 18 h, crépuscule jusqu’à 20 h, puis nuit. L’heure s’affiche dans le menu ; à l’auberge, on peut
  dormir jusqu’au matin ou jusqu’à la nuit. Les intérieurs restent éclairés à toute heure.
- **La nuit**, la carte s’assombrit (tramage en pixel art) : seuls la lanterne du joueur, les forges, les portes des
  cases et les autels éclairent. Les combats se déroulent sous un ciel étoilé.
- **14 Jinémon nocturnes** ne sortent des hautes herbes qu’entre 20 h et 5 h (Hiboulet, Roussetin, Bakeneko,
  Kponyon, Onimaru, Gargouillon, Bunyip, Chupacabra…).
- **6 Hantises**, une par zone sauvage, plus fortes que la faune locale, rôdent sur la carte la nuit. On les voit se
  déplacer, et elles attaquent au contact :

  | Zone | Hantise | Comportement |
  |---|---|---|
  | Savane des Termitières | Tikoloshe (niv. 11) | Tapie dans les hautes herbes, seul le froissement des tiges la trahit. |
  | Terres Rouges | Boudarou (niv. 17) | Suit vos traces pas à pas ; quand vous vous arrêtez, elle continue d’avancer. |
  | Marigot des Ancêtres | Kishimiroir (niv. 23) | Votre reflet de l’autre côté de l’eau, qui reproduit vos gestes. |
  | Forêt Sacrée | Nkondiclou (niv. 29) | Une statue qui ne bouge que lorsque vous ne la regardez pas. |
  | Piste des Chasseurs | Nopperabô (niv. 35) | Un passant, dos tourné, qui se retourne sans visage. |
  | Falaise des Ancêtres | Obayifeu (niv. 48) | Une lueur qui s’éteint et se rallume plus près, souvent dans votre dos. |

- **Les Terreurs nocturnes viennent vous chercher** : sept Jinémon à part, qu'on ne croise jamais dans les herbes,
  sortent à la tombée de la nuit (trois par zone sauvage) et disparaissent à l'aube. Chacune surprend à sa façon, et
  son corps va avec :
  - **Tissombre**, l'araignée des toits, guette sur le chaume des cases et dans les arbres : ses huit yeux rouges vous
    suivent où que vous alliez, elle saute de toit en toit pour se rapprocher, et quand vous passez trop près, elle se
    ramasse… et vous saute dessus (en filant dès qu'elle se tapit, on esquive son bond) ;
  - **Yaramaya**, petit homme rouge à grosse tête, pend tête en bas dans les arbres au-dessus des passages : on ne
    voit que ses yeux jaunes et ses longs bras ; il descend quand on approche et se laisse tomber sur qui passe dessous ;
  - **Olgoïkhor**, le ver de la mort aveugle, nage sous la terre vers le bruit de vos pas (une bosse de sable qui
    avance, la terre qui gronde, l'écran qui tremble). Restez immobile : il ne vous trouve plus. Marchez sur lui : il
    jaillit ;
  - **Kongamato**, le briseur de barques aux ailes de cuir, tournoie dans le ciel (on ne voit que son ombre) puis
    tombe en piqué : écartez-vous à temps ;
  - **Dodombre**, le faux villageois, attend avec sa lanterne et un visage volé, appelle à l'aide (« Tu peux
    m'aider ? »)… et le masque tombe quand on s'approche ;
  - **Elokloche** : une clochette qui tinte, une petite lueur qui danse et s'approche… tout près, sa bouche s'ouvre
    jusqu'aux oreilles et elle se rue sur vous (en courant, on la sème) ;
  - **Mngwa**, le fauve gris, rôde, vous flaire, se rapproche peu à peu, et charge quand il vous voit.
  Dans les villes, Tissombre guette sur les toits, et Dodombre se glisse parmi les habitants une nuit sur deux. Le
  Ginédex indique pour chacune sa façon de chasser et les zones où elle rôde.
- **Couvre-feu** : la nuit, les habitants rentrent chez eux et les rues se vident (seuls restent ceux qui gardent un
  passage). Frappez à une porte : « On n’ouvre plus à personne après la tombée de la nuit ! »
- **Des villageois poursuivis** traversent la carte en hurlant (« Au secours ! »), torche à la main, Mngwa sur les
  talons. Ils courent s’abriter dans une case ou fuient par une sortie ; la bête se tourne alors vers vous. Si vous
  vous trouvez sur son chemin, c’est vous qu’elle prend en chasse.
- **Des bruits terrifiants**, synthétisés et placés dans l’espace (plus forts quand c’est près, à gauche ou à droite) :
  grognements, hurlements, cris stridents, battements d’ailes, ricanements, appels au secours, sifflement du piqué.
  La musique se tait et le cœur bat quand une créature fond sur vous.

  Un murmure annonce la Hantise à l’entrée de la zone, un battement de cœur s’accélère quand elle approche. Quand elle
  attaque, elle surgit immense, en silhouette rouge sang, avant de reculer à sa place. Vaincue ou fuie, elle disparaît
  jusqu’à la nuit suivante ; capturée, elle ne revient plus. Si elle terrasse toute l’équipe, elle s’en prend au héros.

## Combats animés

- **Des Jinémon vivants** : au repos, chacun bouge selon son corps — le quadrupède respire et balance la tête, le
  serpent ondule, l’oiseau bat des ailes en sautillant, l’esprit et la lanterne flottent, l’insecte frémit, l’arbre
  ploie au vent — et cligne des yeux de temps en temps. Endormi, il garde les yeux fermés.

- **Chaque attaque a sa chorégraphie**, dans les couleurs de son type : le lanceur prend son élan et fonce (images
  rémanentes), tire des projectiles en arc (boules de feu, feuilles tranchantes, rochers, dards, feux follets…),
  crache un souffle continu, lance un rayon, fait tomber rochers, météores ou enclume du ciel, fend le sol, déferle
  en vague, déchaîne un cyclone, une éclipse ou une colonne de feu, envoie une nuée de criquets, des ondes, un regard,
  des spores… Les attaques **divines** commencent par une charge : l'écran s'assombrit, l'énergie converge.
- **Des coups qui portent** : arrêt sur image à l'impact, tremblement de l'écran à la mesure des dégâts, éclair
  blanc, recul, onde de choc, dégâts qui jaillissent (« -42 »), étiquettes CRITIQUE ! / SUPER EFFICACE ! / Peu
  efficace…, esquive quand l'attaque rate. La part de PV perdue reste un instant en clair sur la barre.
- **Des altérations visibles** : Z du sommeil, bulles de poison et teinte violette, étincelles de paralysie, étoiles
  de la confusion ; flèches et anneaux pour les renforcements et affaiblissements ; étincelles vertes des soins.
- **Entrées et sorties** : les dresseurs lancent leur calebasse, qui s'ouvre dans un éclat de lumière ; un Jinémon
  sauvage surgit en silhouette puis se révèle ; le K.O. s'enfonce dans le sol dans un nuage de poussière ; la capture
  aspire le Jinémon dans la calebasse, qui tremble avant de se sceller (ou de se rompre).
- Bruitages synthétisés pour chaque type de coup (impact, feu, eau, vent, séisme, magie, éclair, métal, essaim…).

## Règles de combat

- Combat 1 contre 1 au tour par tour ; 4 attaques par Jinémon.
- Ordre d’action : priorité de l’attaque, puis **Vitesse**.
- Dégâts : `((2·niveau/5 + 2) × Puissance × Attaque / Défense) / 50 + 2`, multipliés par le bonus de type identique
  (×1,5), l’efficacité des types (table dans `src/data/types.ts`), le coup critique (×1,5) et un aléa de 85 à 100 %.
- Altérations :
  - **Sommeil** : la cible ne peut pas agir pendant 1 à 3 tours.
  - **Poison** : dégâts en fin de tour qui augmentent tant qu’il n’est pas soigné (1/16, 2/16, 3/16… des PV max).
  - **Paralysie** : Vitesse ×0,25 et une chance sur deux de ne pas agir.
  - **Confusion** (2 à 5 tours) : une chance sur trois de s’infliger des dégâts.
  - Sommeil, poison et paralysie persistent après le combat jusqu’à un soin ; la confusion s’arrête avec le combat.
- Buffs / debuffs : paliers de −6 à +6 sur l’Attaque, la Défense et la Vitesse.
- Talents passifs : Aura des Moissons (Chiwate), Bénédiction Pluvieuse (Nommoth), Cœur de Forge (Vulcanis-Djinn),
  et 8 autres (Lévitation, Carapace, Prestance du Chasseur, Ruse du Conteur…).
- Capture : plus le Jinémon sauvage est affaibli (et endormi, empoisonné ou paralysé), plus la calebasse a de chances
  de le garder.

## Architecture

```
src/
  data/                 Données de design, sans logique d’affichage
    types.ts            14 types et table d’efficacité
    moves.ts            Répertoire central des 100 attaques
    ginedex.ts          Bestiaire, bassins d’attaques, apparence des sprites
    talents.ts          Talents passifs
    items.ts            Calebasses, remèdes, menottes, sac de couchage
    trainers.ts         Bandits (primes), rivale, Maîtres de Piste, insignes
    zones.ts            Cartes ASCII de l’Acte I, PNJ, bâtiments, rencontres de jour, de nuit et de pêche, téléporteurs
    zonesActe2.ts       Les six zones de l’Acte II
    interiors.ts        Intérieurs (chambre, salon, sanctuaire, auberge et Marché de chaque ville), portes reliées
    zoneKit.ts          Fabriques de PNJ et de bâtiments (soigneurs, marchands, dresseurs, objets…)
    trainersActe2.ts    Maîtres de Piste, bandits du désert, Masques Brisés et Conseil des Griots de l’Acte II
    hantises.ts         Les six Hantises nocturnes et leurs comportements
    nightMobs.ts        Les sept Terreurs nocturnes : qui chasse où, et le fauve qui poursuit les villageois
    region.ts           La région jouable (zones reliées au village), son Ginédex et ses insignes
  engine/               Logique pure, testée sans navigateur
    combat.ts           Machine à états du combat (statuts, priorités, IA, capture, expérience, avantage du joueur)
    hero.ts             Le héros : ses PV, et les duels contre les bandits et les monstres de la nuit
    creature.ts         Statistiques, expérience, apprentissage, évolution, objets
    gameState.ts        État de partie
    clock.ts            Horloge du jeu : phases du jour, obscurité, nuits
    saveManager.ts      Sauvegarde automatique dans le LocalStorage (avec validation et remise en lieu sûr)
    objective.ts        Objectif du moment, déduit de la progression
    rng.ts              Aléatoire injectable (déterministe dans les tests)
  ui/                   Rendu Canvas et scènes (titre, exploration, combat, menus…)
    sculpt.ts           Sculpteur de volumes et conversion en pixel art
    sculptKit.ts        Pièces de modelage partagées (squelettes, ailes, cornes, flammes…)
    creatures.ts        Modelage des Jinémon 001 à 073 (un plan corporel par famille, réglé par espèce)
    creaturesNouveaux.ts Modelage des Jinémon 074 à 128, dont les six Hantises
    creaturesActe2.ts   Modelage des Jinémon 129 à 137
    creaturesNuit.ts    Modelage des Terreurs nocturnes (138 à 144)
    musicScore.ts       Partitions (notation compacte, grilles d’accords) des musiques et jingles
    music.ts            Séquenceur WebAudio : instruments synthétisés, écho, boucles et jingles
    night.ts            Éclairage : teinte du crépuscule, obscurité tramée et lumières
    haunts.ts           Déplacement des Hantises sur la carte (traque, téléportation, statue…)
    nightMobs.ts        Terreurs nocturnes sur la carte (araignée, pendu, ver, clochette, oiseau, faux villageois, fauve) et villageois poursuivis
    nickname.ts         Surnoms proposés aux Jinémon qui rejoignent l’équipe
    scenes/textEntry.ts Saisie d’un nom (héroïne, surnoms), au clavier ou au clavier du téléphone
    props.ts            Objets du décor sculptés
    buildings.ts        Bâtiments (maison, auberge, Marché, sanctuaire), stands et meubles sculptés
    fighters.ts         Combattants humains sculptés pour les duels (bandit de face, héros de dos)
    tiles.ts            Sols, ombres portées et assemblage des cartes en deux couches
    interiors.ts        Rendu des intérieurs : murs enduits, sols, nattes, escaliers, comptoirs
    backdrops.ts        Fonds de combat, titre, sanctuaire du Hogon, halo d’évolution
    battle/particles.ts Particules du combat (braises, gouttes, feuilles, étincelles, poussière…)
    battle/moveFx.ts    Chorégraphie de chacune des 100 attaques (corps à corps, projectiles, souffles, rayons…)
tests/                  Tests Vitest : données, cartes, progression complète, moteur de combat, simulations,
                        sauvegarde, sprites, musique
```

Le moteur de combat est synchrone : `start()`, `submit(action)` et `submitReplacement(index)` résolvent un tour
complet et renvoient une liste d’événements (`message`, `pv`, `statut`, `ko`, `xp`, `capture`…) que l’interface
anime ensuite. Ajouter une créature, une attaque ou un dresseur revient à éditer `src/data/` ; les tests vérifient
la cohérence (100 attaques, bassins valides, cartes accessibles, toutes les espèces obtenables…).

## Commandes

```bash
npm test           # tests unitaires et simulations de combat
npm run typecheck  # vérification TypeScript
npm run build      # build de production dans dist/
npm run preview    # sert le build localement
```

## Déploiement sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` lance les tests et le build à chaque push et pull request, puis publie
`dist/` sur GitHub Pages pour les pushes sur la branche par défaut. À faire une seule fois dans le dépôt :
**Settings → Pages → Build and deployment → Source : GitHub Actions**, puis relancer le dernier workflow (onglet
Actions → « Re-run all jobs »). Sur un compte GitHub gratuit, Pages n’est disponible que pour les dépôts **publics**.
Le jeu est alors servi à l’adresse `https://<utilisateur>.github.io/<dépôt>/`. Le build utilise des chemins relatifs
et fonctionne quel que soit le nom du dépôt.

## Choix d’adaptation par rapport au GDD

- Le type « Sol » de Termitox est le type **Terre** ; le type « Bête » de la Piste des Chasseurs est représenté par le
  type **Normal** associé à la Terre (lions, buffles, hyènes, zébus), pour garder les 14 types du GDD.
- La lignée de la mandragore a été ajoutée pour offrir un Jinémon Plante commun dès la savane : sans elle, les
  joueurs Feu n’avaient aucune réponse au Marigot des Ancêtres.
- Au premier combat, la rivale ne connaît que des attaques de base (son starter a l’avantage de type).
- Le « spécimen de niveau supérieur » du Maître du Feu Sacré est un Forgeron-Feu de niveau 16.
