// Objets : calebasses rituelles de capture et remèdes traditionnels.

export type ItemId =
  | 'calebasse'
  | 'calebasseOrnee'
  | 'calebasseAncetres'
  | 'karite'
  | 'bissap'
  | 'painDeSinge'
  | 'moringa'
  | 'kola';

export type ItemEffect =
  | { kind: 'capture'; bonus: number }
  | { kind: 'soin'; amount: number }
  | { kind: 'guerison' }
  | { kind: 'reanimation'; fraction: number };

export interface Item {
  id: ItemId;
  name: string;
  price: number;
  description: string;
  effect: ItemEffect;
}

const DEFS: Record<ItemId, Omit<Item, 'id'>> = {
  calebasse: {
    name: 'Calebasse Sacrée', price: 200, effect: { kind: 'capture', bonus: 1 },
    description: "L'outil rituel de l'Initié. Lancée sur un Jinémon sauvage affaibli, elle peut l'accueillir.",
  },
  calebasseOrnee: {
    name: 'Calebasse Ornée', price: 600, effect: { kind: 'capture', bonus: 1.5 },
    description: 'Une calebasse gravée de motifs protecteurs. Meilleures chances de capture.',
  },
  calebasseAncetres: {
    name: 'Calebasse des Ancêtres', price: 1200, effect: { kind: 'capture', bonus: 2.5 },
    description: 'Transmise de génération en génération. Même les Jinémon les plus fiers peuvent y entrer.',
  },
  karite: {
    name: 'Beurre de Karité', price: 100, effect: { kind: 'soin', amount: 20 },
    description: 'Un baume nourrissant. Restaure 20 PV.',
  },
  bissap: {
    name: 'Jus de Bissap', price: 300, effect: { kind: 'soin', amount: 60 },
    description: "Une boisson d'hibiscus rafraîchissante. Restaure 60 PV.",
  },
  painDeSinge: {
    name: 'Pain de Singe', price: 700, effect: { kind: 'soin', amount: 150 },
    description: 'Le fruit du baobab, riche et énergisant. Restaure 150 PV.',
  },
  moringa: {
    name: 'Feuilles de Moringa', price: 150, effect: { kind: 'guerison' },
    description: "L'arbre aux mille vertus. Guérit le sommeil, le poison et la paralysie.",
  },
  kola: {
    name: 'Noix de Kola', price: 1000, effect: { kind: 'reanimation', fraction: 0.5 },
    description: "La noix du partage et de l'hospitalité. Ranime un Jinémon K.O. avec la moitié de ses PV.",
  },
};

export const ITEMS: Record<ItemId, Item> = Object.fromEntries(
  Object.entries(DEFS).map(([id, def]) => [id, { id, ...def }]),
) as Record<ItemId, Item>;

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export function getItem(id: ItemId): Item {
  return ITEMS[id];
}

export function isCaptureItem(id: ItemId): boolean {
  return ITEMS[id].effect.kind === 'capture';
}
