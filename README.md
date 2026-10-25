# Ginémon — Légendes du Sahel et d’ailleurs

RPG de collection, d’exploration et de combat au tour par tour, jouable dans le navigateur.
Le joueur incarne un **Initié** qui capture, entraîne et fait évoluer des **Jinémon**, créatures nées des forces de la
nature et des légendes : d’abord celles d’Afrique de l’Ouest (traditions dogon, bambara, peule, soninké, wolof,
mandingue, akan…), puis celles venues d’ailleurs avec les caravanes : dragons d’Europe et de Chine, esprits du Japon,
spectres du Nord, serpent à plumes de Mésoamérique, sphinx d’Égypte, feux follets, mandragores…

MVP conforme au GDD v1.0 : TypeScript + Vite, rendu Canvas 2D sans moteur externe, sauvegarde dans le LocalStorage,
déploiement sur GitHub Pages. Aucune image externe : sprites, décors et sons sont générés par le code.

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

## Contenu

- **73 Jinémon** répartis en 44 lignées, dont les 12 du GDD (starters Poussilope / Têtuanom / Étincel, Termiton,
  Termitox, Rochard) et deux Légendes du Panthéon (Yurugal, le Renard Pâle ; Bidawa, le Serpent d’Or du Wagadou).
  Fiche complète : [`docs/GINEDEX.md`](docs/GINEDEX.md).
- **100 attaques** réparties sur les 14 types, en quatre paliers (base, élémentaire, statut, divin), avec altérations,
  modificateurs de statistiques, soins, drain, contrecoup et priorité.
- **Bassins d’attaques** d’environ 15 attaques par lignée, apprises du niveau 1 au niveau 70 ; au-delà de 4 attaques,
  le jeu propose d’en oublier une. Depuis l’équipe, on peut à tout moment remplacer une attaque par une autre déjà
  apprise.
- **7 zones** : Village des Greniers, Savane des Termitières, Terres Rouges, Marigot des Ancêtres, Forêt Sacrée,
  Piste des Chasseurs Donzos et Falaise des Ancêtres (Panthéon des Légendes).
- **3 Arènes** du GDD et leurs insignes (Forge des Terres Rouges, Marigot des Ancêtres, Piste des Chasseurs Donzos),
  une rivale, 15 dresseurs et la Gardienne du Panthéon en fin de partie.
- **Techniques hors combat** : l’Insigne de l’Enclume permet à un Jinémon Métal de briser les rochers fissurés,
  l’Insigne de la Pluie permet à un Jinémon Eau de franchir le gué ; les trois insignes ouvrent la Falaise.
- Calebasses de capture (Sacrée, Ornée, des Ancêtres), remèdes (karité, bissap, pain de singe, moringa, noix de
  kola), marché en cauris, Grenier pour les Jinémon en surplus, Ginédex, évolutions animées (annulables avec B),
  générique de fin.

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
    items.ts            Calebasses et remèdes
    trainers.ts         Dresseurs, rivale, Maîtres de Piste, insignes
    zones.ts            Cartes ASCII, PNJ, rencontres, téléporteurs
  engine/               Logique pure, testée sans navigateur
    combat.ts           Machine à états du combat (statuts, priorités, IA, capture, expérience)
    creature.ts         Statistiques, expérience, apprentissage, évolution, objets
    gameState.ts        État de partie
    saveManager.ts      Sauvegarde automatique dans le LocalStorage (avec validation)
    rng.ts              Aléatoire injectable (déterministe dans les tests)
  ui/                   Rendu Canvas et scènes (titre, exploration, combat, menus…)
    sculpt.ts           Sculpteur de volumes et conversion en pixel art
    creatures.ts        Modelage des 73 Jinémon (un plan corporel par famille, réglé par espèce)
    props.ts            Objets du décor sculptés
    tiles.ts            Sols, ombres portées et assemblage des cartes en deux couches
    backdrops.ts        Fonds de combat, titre, case de l’Ancien, halo d’évolution
    effects.ts          Effets d’attaque par type
tests/                  Tests Vitest : données, cartes, moteur de combat, simulations, sauvegarde, sprites
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
**Settings → Pages → Build and deployment → Source : GitHub Actions**. Le build utilise des chemins relatifs et
fonctionne quel que soit le nom du dépôt.

## Choix d’adaptation par rapport au GDD

- Le type « Sol » de Termitox est le type **Terre** ; le type « Bête » de la Piste des Chasseurs est représenté par le
  type **Normal** associé à la Terre (lions, buffles, hyènes, zébus), pour garder les 14 types du GDD.
- La lignée de la mandragore a été ajoutée pour offrir un Jinémon Plante commun dès la savane : sans elle, les
  joueurs Feu n’avaient aucune réponse au Marigot des Ancêtres.
- Au premier combat, la rivale ne connaît que des attaques de base (son starter a l’avantage de type).
- Le « spécimen de niveau supérieur » du Maître du Feu Sacré est un Forgeron-Feu de niveau 16.
