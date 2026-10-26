// Intérieurs : la maison du joueur, le sanctuaire du Hogon, et dans chaque
// ville la même Case de Soins et le même Marché, pour qu'on s'y retrouve.
//
// Les portes sont reliées automatiquement : la porte « d » d'un bâtiment mène
// juste au-dessus du seuil « x » de son intérieur, et le seuil ramène devant la porte.
import { ANCIEN, GARDIEN, MARCHANDE, VILLAGEOIS } from './zoneKit';
import type { Building, BuildingKind, Npc, TownId, Zone, ZoneId } from './zones';

/** Taille de l'emprise de chaque bâtiment et position de sa porte. */
export const BUILDING_SIZE: Record<BuildingKind, { w: number; h: number; door: [number, number] }> = {
  maison: { w: 4, h: 3, door: [1, 2] },
  soins: { w: 5, h: 3, door: [2, 2] },
  marche: { w: 4, h: 3, door: [1, 2] },
  sanctuaire: { w: 7, h: 4, door: [3, 3] },
};

export const BUILDING_LABEL: Record<BuildingKind, string> = {
  maison: 'Maison',
  soins: 'Case de Soins',
  marche: 'Marché',
  sanctuaire: 'Sanctuaire',
};

export function doorOf(b: Building): { x: number; y: number } {
  const size = BUILDING_SIZE[b.kind];
  return { x: b.x + size.door[0], y: b.y + size.door[1] };
}

const MAMAN = { skin: '#5a3420', outfit: '#b84ae8', accent: '#f0c040', headwear: 'foulard' } as const;

const interieur = (id: ZoneId, name: string, parent: TownId, style: Zone['interior'], map: string[], npcs: Npc[], extra: Partial<Zone> = {}): Zone => ({
  id,
  name,
  theme: 'village',
  parent,
  interior: style,
  map,
  warps: [],
  encounters: [],
  encounterRate: 0,
  npcs,
  signs: [],
  ...extra,
});

// ── Maison du joueur ─────────────────────────────────────────────────────

export const chambre: Zone = interieur(
  'chambre',
  'Ta chambre',
  'village',
  'maison',
  [
    'WWWWWWWWW',
    'WnWbWqWWW',
    'Wl_____yW',
    'Wl__r___W',
    'W___r_k_W',
    'Wp_____jW',
    'WWWWWWWWW',
  ],
  [],
  {
    music: 'maison',
    decor: {
      l: 'Ton lit. Les draps sont encore tout chauds… Pas le temps de se recoucher !',
      k: 'Ton coffre à trésors : des cauris, une fronde et une plume de calao.',
      b: 'Tes affaires : une flûte peule, des contes illustrés et un vieux Ginédex en papier.',
      n: 'Par la fenêtre, le soleil est déjà haut au-dessus des greniers du village.',
      q: 'Un pagne aux couleurs vives, tissé par ta grand-mère.',
      p: 'Une plante bien arrosée. Maman y tient beaucoup.',
      j: 'Le canari garde l’eau bien fraîche.',
    },
  },
);

export const maison: Zone = interieur(
  'maison',
  'Maison',
  'village',
  'maison',
  [
    'WWWWWWWWWWW',
    'WbWnWqWnWWW',
    'W________eW',
    'W_rrr_____W',
    'W_rtr__f__W',
    'W_rrr_____W',
    'Wj_______pW',
    'W____x____W',
    'WWWWWWWWWWW',
  ],
  [
    {
      id: 'maman', name: 'Maman', x: 6, y: 5, dir: 'haut',
      look: { kind: 'personne', look: MAMAN },
      script: { kind: 'maman' },
    },
  ],
  {
    music: 'maison',
    decor: {
      t: 'Une calebasse de bouillie de mil encore tiède. Maman t’a gardé ton petit-déjeuner.',
      f: 'Une sauce d’arachide mijote sur le feu. Ça sent drôlement bon !',
      b: 'Des pots d’épices, des calebasses et les beaux pagnes des jours de fête.',
      j: 'Le canari garde l’eau bien fraîche.',
      n: 'Dehors, le village s’affaire déjà.',
      q: 'Un pagne tissé par ta grand-mère, aux couleurs de la famille.',
      p: 'Une plante grasse en pot.',
    },
  },
);

// ── Sanctuaire du Hogon ──────────────────────────────────────────────────

export const sanctuaire: Zone = interieur(
  'sanctuaire',
  'Sanctuaire du Hogon',
  'village',
  'sanctuaire',
  [
    'WWWWWWWWWWWWW',
    'WqWqWqWqWqWqW',
    'Wu_v__A__v_uW',
    'W___________W',
    'W___rrrrr___W',
    'W___rrrrr___W',
    'Wv_________vW',
    'Wu_________uW',
    'W_____x_____W',
    'WWWWWWWWWWWWW',
  ],
  [
    {
      id: 'hogon', name: 'Hogon', x: 6, y: 3, dir: 'bas',
      look: { kind: 'personne', look: ANCIEN },
      script: { kind: 'starter' },
    },
  ],
  {
    music: 'conseil',
    decor: {
      A: 'L’autel du sanctuaire. Les offrandes de mil et de kola y sont déposées chaque matin.',
      u: 'La statue d’un ancêtre, sculptée dans l’ébène. Son regard semble te suivre.',
      v: 'Le feu du brasero ne s’éteint jamais, dit-on. Il veille sur le village.',
      q: 'Un masque sacré, porté lors des grandes fêtes.',
    },
  },
);

// ── Case de Soins et Marché, identiques dans chaque ville ────────────────

const SOINS_MAP = [
  'WWWWWWWWWWWWW',
  'WnWqWbWWnWqWW',
  'W_____b__g__W',
  'Wccccc______W',
  'W___________W',
  'W_rrr___rrr_W',
  'W_rrr___rrr_W',
  'Wj_________jW',
  'W_____x_____W',
  'WWWWWWWWWWWWW',
];

/** Soigneur par défaut (guérisseuse du village). */
const GUERISSEUSE_NPC: Npc = {
  id: 'guerisseuse', name: 'Guérisseuse', x: 0, y: 0, dir: 'bas',
  look: { kind: 'personne', look: { skin: '#5a3420', outfit: '#5fa83a', accent: '#f0f0f0', headwear: 'foulard' } },
  script: { kind: 'soin', lines: ['Bienvenue à la Case de Soins. Mes plantes remettent n’importe quel Jinémon sur pied.'] },
};

function soinsInterior(town: Zone, b: Building): Zone {
  const healer: Npc = { ...(b.healer ?? GUERISSEUSE_NPC), id: `${town.id}-soigneur`, x: 3, y: 2, dir: 'bas' };
  const keeper: Npc = {
    id: `${town.id}-jarre`, name: 'Gardien de la Jarre', x: 11, y: 2, dir: 'gauche',
    look: { kind: 'personne', look: GARDIEN },
    script: {
      kind: 'grenier',
      lines: [
        'Gardien : Voici la Grande Jarre. Au fond du tourbillon, les Jinémon qui ne voyagent pas avec toi se reposent dans le monde des esprits.',
        'Gardien : Tu peux y déposer un Jinémon, en reprendre un, ou les échanger directement. Toutes les Grandes Jarres communiquent : il y en a une dans chaque Case de Soins.',
      ],
    },
  };
  const visitor: Npc = {
    id: `${town.id}-visiteur`, name: 'Voyageur', x: 10, y: 6, dir: 'gauche',
    look: { kind: 'personne', look: VILLAGEOIS },
    script: {
      kind: 'dialogue',
      lines: [
        'Voyageur : Il y a une Case de Soins comme celle-ci dans chaque ville. Le toit vert se voit de loin !',
        'Voyageur : On y soigne ses Jinémon gratuitement. Et au fond, la Grande Jarre garde ceux qui ne voyagent pas avec toi.',
        'Voyageur : Ton équipe est pleine ? Confie un Jinémon à la jarre, ou échange-le contre un autre.',
      ],
    },
  };
  return interieur(`${town.id as TownId}:soins`, `Case de Soins · ${town.name}`, town.id as TownId, 'soins', SOINS_MAP, [healer, keeper, visitor], {
    music: 'soins',
    decor: {
      b: 'Des pots de beurre de karité, des feuilles de moringa séchées et des racines à infuser.',
      g: 'La Grande Jarre. Un tourbillon vert et violet tourne au fond…',
      q: 'Une tenture brodée de feuilles : l’emblème des Cases de Soins.',
      n: 'La lumière du jour entre à flots.',
      p: 'Une plante médicinale, soigneusement taillée.',
      j: 'Un canari d’eau fraîche pour les voyageurs.',
    },
  });
}

const MARCHE_MAP = [
  'WWWWWWWWWWW',
  'WbbbWnWbbbW',
  'W___j_____W',
  'Wccc______W',
  'W_____h_h_W',
  'W_____h_h_W',
  'Wj_______pW',
  'W____x____W',
  'WWWWWWWWWWW',
];

function marcheInterior(town: Zone, b: Building): Zone {
  const merchant: Npc = {
    id: `${town.id}-marchande`, name: 'Marchande', x: 2, y: 2, dir: 'bas',
    look: { kind: 'personne', look: MARCHANDE },
    script: { kind: 'boutique', items: b.items ?? ['calebasse', 'karite'], lines: b.lines ?? ['Bienvenue au Marché ! Que veux-tu acheter ?'] },
  };
  return interieur(`${town.id as TownId}:marche`, `Marché · ${town.name}`, town.id as TownId, 'marche', MARCHE_MAP, [merchant], {
    decor: {
      h: 'Des calebasses de toutes les tailles, des noix de kola et des pots de miel sauvage.',
      b: 'Les étagères débordent : pagnes, épices, beurre de karité, calebasses sculptées…',
      n: 'Par la fenêtre, on entend les marchands crier leurs prix.',
      j: 'Une jarre de bissap bien frais.',
      p: 'Une plante en pot, pour faire joli.',
    },
  });
}

function tileOf(zone: Zone, ch: string): { x: number; y: number } {
  for (let y = 0; y < zone.map.length; y++) {
    const x = zone.map[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  throw new Error(`${zone.id} : aucune case « ${ch} »`);
}

/**
 * Crée les intérieurs de service de chaque ville et relie toutes les portes.
 * La Case de Soins sert aussi de point d'arrivée en vol.
 */
export function linkBuildings(outdoor: Zone[], unique: Zone[]): Zone[] {
  const created: Zone[] = [];
  const byId = new Map<ZoneId, Zone>(unique.map((z) => [z.id, z]));
  // Escaliers de la maison : salon ⇄ chambre.
  const up = tileOf(maison, 'e');
  const down = tileOf(chambre, 'y');
  maison.warps.push({ x: up.x, y: up.y, to: 'chambre', tx: down.x, ty: down.y + 1, dir: 'bas' });
  chambre.warps.push({ x: down.x, y: down.y, to: 'maison', tx: up.x, ty: up.y + 1, dir: 'bas' });
  for (const zone of outdoor) {
    for (const b of zone.buildings ?? []) {
      const door = doorOf(b);
      let inside: Zone;
      if (b.to) inside = byId.get(b.to)!;
      else if (b.kind === 'soins') inside = soinsInterior(zone, b);
      else if (b.kind === 'marche') inside = marcheInterior(zone, b);
      else throw new Error(`${zone.id} : bâtiment ${b.kind} sans intérieur`);
      if (!b.to) created.push(inside);
      if (b.kind === 'soins') zone.flyPoint = { x: door.x, y: door.y + 1, dir: 'bas' };
      const exit = tileOf(inside, 'x');
      zone.warps.push({ x: door.x, y: door.y, to: inside.id, tx: exit.x, ty: exit.y - 1, dir: 'haut' });
      inside.warps.push({ x: exit.x, y: exit.y, to: zone.id, tx: door.x, ty: door.y + 1, dir: 'bas' });
    }
  }
  return created;
}
