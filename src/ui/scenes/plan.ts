// Plans et carte : le plan d'une ville (bâtiments, sorties, « vous êtes ici ») et
// la carte du monde, avec l'objectif du moment marqué d'une étoile.
import { BUILDING_LABEL, BUILDING_SIZE, doorOf } from '../../data/interiors';
import { REGION_TOWNS } from '../../data/region';
import { getTrainer } from '../../data/trainers';
import { ZONES, type BuildingKind, type TownId, type Zone } from '../../data/zones';
import { currentObjective } from '../../engine/objective';
import { PAL, box, fillEllipse, shade, stamp, text } from '../draw';
import { wrapText } from '../font';
import type { Game } from '../game';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { THEMES } from '../tiles';
import { menuBackground } from '../widgets';

const BUILDING_COLOR: Record<BuildingKind, string> = {
  soins: '#3d9a4c',
  marche: '#e8742a',
  maison: '#a85a32',
  sanctuaire: '#c8902a',
};

/** Couleur d'une case sur le plan. */
function tileColor(ch: string, zone: Zone): string {
  const c = THEMES[zone.theme];
  switch (ch) {
    case '"':
    case 'F':
      return c.grass;
    case ',':
      return shade(c.grass, -0.3);
    case '=':
    case 'd':
    case 'E':
    case 'S':
      return c.path;
    case '.':
    case 'L':
      return c.ground;
    case ':':
    case 'Y':
      return '#e8d098';
    case 'P':
      return '#9a6a3a';
    case '~':
      return '#3c88d0';
    case 'w':
      return '#78b8e0';
    case '#':
    case 'X':
      return c.rock;
    case 'T':
    case 'B':
    case 'V':
      return c.tree;
    case 'M':
      return '#b8784a';
    case 'R':
    case 'H':
    case 'D':
    case 'G':
    case 'N':
    case 'Q':
      return '#8a5a34';
    default:
      return c.ground;
  }
}

/** Zone extérieure correspondant à un lieu (un intérieur renvoie à sa ville). */
export function outdoorOf(zone: Zone): Zone {
  return zone.parent ? ZONES[zone.parent] : zone;
}

/** Étoile de l'objectif. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const glow = Math.floor(time * 4) % 2 === 0;
  stamp(ctx, ['...k...', '..kyk..', 'kkkyykk', 'kyyyyyk', '.kyyyk.', '.kykyk.', 'kk...kk'], x - 3, y - 3, { k: PAL.ink, y: glow ? '#fff070' : '#f0c040' });
}

/** Marqueur « vous êtes ici » qui clignote. */
function youAreHere(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  if (Math.floor(time * 3) % 3 === 2) return;
  fillEllipse(ctx, x, y, 3, 3, '#fff8e8');
  fillEllipse(ctx, x, y, 2, 2, '#d83020');
}

interface LegendEntry {
  color: string;
  label: string;
  star?: boolean;
}

/** Plan d'une zone : ses bâtiments, ses sorties et la position du joueur. */
export class PlanScene implements Scene {
  readonly opaque = true;
  private readonly zone: Zone;

  constructor(
    private readonly game: Game,
    zone: Zone,
    /** Position du joueur (dans la zone extérieure), ou null s'il est ailleurs. */
    private readonly here: { x: number; y: number } | null,
  ) {
    this.zone = outdoorOf(zone);
    // Depuis un intérieur, le joueur est sur le seuil de son bâtiment.
    if (zone.parent && here) {
      const exit = zone.warps.find((w) => w.to === this.zone.id);
      this.here = exit ? { x: exit.tx, y: exit.ty - 1 } : null;
    }
  }

  update(): void {
    const input = this.game.input;
    if (input.pressed('a') || input.pressed('b') || input.pressed('start')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const zone = this.zone;
    const time = this.game.time;
    menuBackground(ctx, W, H);
    box(ctx, 2, 2, W - 4, 16);
    text(ctx, `PLAN · ${zone.name}`, W / 2, 5, { align: 'center', color: PAL.rust });
    const mw = zone.map[0].length;
    const mh = zone.map.length;
    const k = Math.max(2, Math.floor(Math.min(160 / mw, 164 / mh)));
    const ox = 6 + Math.floor((164 - mw * k) / 2);
    const oy = 22 + Math.floor((166 - mh * k) / 2);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(ox - 2, oy - 2, mw * k + 4, mh * k + 4);
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        ctx.fillStyle = tileColor(zone.map[y][x], zone);
        ctx.fillRect(ox + x * k, oy + y * k, k, k);
      }
    }
    const objective = currentObjective(this.game.s);
    const legend: LegendEntry[] = [];
    for (const b of zone.buildings ?? []) {
      const size = BUILDING_SIZE[b.kind];
      const color = BUILDING_COLOR[b.kind];
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(ox + b.x * k - 1, oy + b.y * k - 1, size.w * k + 2, size.h * k + 2);
      ctx.fillStyle = color;
      ctx.fillRect(ox + b.x * k, oy + b.y * k, size.w * k, size.h * k);
      const door = doorOf(b);
      ctx.fillStyle = '#3a2214';
      ctx.fillRect(ox + door.x * k, oy + door.y * k + Math.floor(k / 2), k, Math.ceil(k / 2));
      const target = objective.zone === zone.id && objective.building === b.kind;
      if (target) star(ctx, ox + (b.x + size.w / 2) * k, oy + b.y * k - 2, time);
      legend.push({ color, label: b.label ?? BUILDING_LABEL[b.kind], star: target });
    }
    // Stands des lieux sauvages : soigneur, marchand et Grande Jarre en plein air.
    const marker = (x: number, y: number, color: string) => {
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(ox + x * k - 1, oy + y * k - 1, k + 2, k + 2);
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * k, oy + y * k, k, k);
    };
    const stands: Array<[string, string, string]> = [
      ['soin', BUILDING_COLOR.soins, 'Campement'],
      ['boutique', BUILDING_COLOR.marche, 'Marchand'],
    ];
    for (const [kind, color, label] of stands) {
      const npc = zone.npcs.find((n) => n.script.kind === kind);
      if (!npc) continue;
      marker(npc.x, npc.y + 1, color);
      legend.push({ color, label });
    }
    zone.map.forEach((row, y) => [...row].forEach((c, x) => c === 'g' && marker(x, y, '#9a5ae8')));
    if (zone.map.some((row) => row.includes('g'))) legend.push({ color: '#9a5ae8', label: 'Grande Jarre' });
    // Sorties vers les zones voisines.
    for (const w of zone.warps) {
      const to = ZONES[w.to];
      if (to.parent) continue;
      const arrow = w.y === 0 ? '↑' : w.y === mh - 1 ? '↓' : w.x === 0 ? '←' : '→';
      const px = ox + w.x * k + k / 2;
      const py = oy + w.y * k + k / 2;
      fillEllipse(ctx, px, py, 3, 3, PAL.ink);
      fillEllipse(ctx, px, py, 2, 2, '#f0c040');
      const target = objective.zone === to.id;
      legend.push({ color: '#f0c040', label: `${arrow} ${this.game.s.flags[`visite:${to.id}`] ? to.name : '???'}`, star: target });
    }
    if (this.here) youAreHere(ctx, ox + this.here.x * k + k / 2, oy + this.here.y * k + k / 2, time);

    // Légende.
    const lx = 176;
    box(ctx, lx - 4, 22, W - lx + 2, H - 26);
    let y = 28;
    if (this.here) {
      fillEllipse(ctx, lx + 3, y + 4, 3, 3, '#d83020');
      text(ctx, 'Vous êtes ici', lx + 10, y);
      y += 13;
    }
    for (const entry of legend) {
      const rows = wrapText(entry.label, W - lx - 16);
      if (y + rows.length * 9 > H - 10) break;
      // L'objectif remplace sa pastille de couleur par l'étoile.
      if (entry.star) star(ctx, lx + 3, y + 4, time);
      else {
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(lx, y + 1, 7, 7);
        ctx.fillStyle = entry.color;
        ctx.fillRect(lx + 1, y + 2, 5, 5);
      }
      rows.forEach((row, i) => text(ctx, row, lx + 10, y + i * 9));
      y += rows.length * 9 + 4;
    }
  }
}

/** Position des zones sur la carte du monde (seules celles de la région y figurent). */
const WORLD: Record<TownId, [number, number]> = {
  village: [84, 132],
  savane: [84, 90],
  terresRouges: [160, 90],
  marigot: [160, 46],
  foret: [112, 94],
  piste: [152, 94],
  falaise: [152, 68],
  desert: [152, 44],
  hombori: [152, 22],
  djenne: [192, 22],
  cote: [192, 48],
  masques: [228, 48],
  tombouctou: [228, 22],
};
const ORDER: readonly TownId[] = REGION_TOWNS;

/** Carte du monde : zones visitées, routes, position du joueur et objectif. */
export class WorldMapScene implements Scene {
  readonly opaque = true;
  private index: number;

  constructor(private readonly game: Game) {
    const here = outdoorOf(ZONES[game.s.position.zone]).id as TownId;
    this.index = Math.max(0, ORDER.indexOf(here));
  }

  update(): void {
    const input = this.game.input;
    if (input.pressed('b') || input.pressed('start')) {
      this.game.sfx('retour');
      this.game.scenes.pop(this);
      return;
    }
    const step = input.pressed('right') || input.pressed('up') ? 1 : input.pressed('left') || input.pressed('down') ? -1 : 0;
    if (step) {
      this.index = (this.index + step + ORDER.length) % ORDER.length;
      this.game.sfx('curseur');
    }
    if (input.pressed('a')) {
      const id = ORDER[this.index];
      if (!this.game.s.flags[`visite:${id}`]) {
        this.game.sfx('erreur');
        return;
      }
      this.game.sfx('valider');
      const current = outdoorOf(ZONES[this.game.s.position.zone]).id === id;
      const p = this.game.s.position;
      this.game.scenes.push(new PlanScene(this.game, ZONES[current ? p.zone : id], current ? { x: p.x, y: p.y } : null));
    }
  }

  resume(): void {
    this.game.input.consume();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const state = this.game.s;
    const time = this.game.time;
    // Parchemin.
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ecd8a8';
    ctx.fillRect(3, 3, W - 6, H - 6);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(160, 110, 50, 0.12)';
      ctx.fillRect((i * 97) % (W - 20) + 6, (i * 53) % (H - 20) + 6, 8 + (i % 5) * 3, 2);
    }
    text(ctx, 'CARTE DU MANDÉ', 8, 6, { color: PAL.rust });
    const visited = (id: TownId) => !!state.flags[`visite:${id}`];
    // Routes entre zones voisines.
    for (const id of ORDER) {
      for (const w of ZONES[id].warps) {
        const to = w.to as TownId;
        if (!ORDER.includes(to) || ORDER.indexOf(to) < ORDER.indexOf(id)) continue;
        const [x0, y0] = WORLD[id];
        const [x1, y1] = WORLD[to];
        const known = visited(id) && visited(to);
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s += 3) {
          const x = Math.round(x0 + ((x1 - x0) * s) / steps);
          const y = Math.round(y0 + ((y1 - y0) * s) / steps);
          ctx.fillStyle = known ? '#8a5a2a' : 'rgba(138, 90, 42, 0.35)';
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    }
    const objective = currentObjective(state);
    const here = outdoorOf(ZONES[state.position.zone]).id;
    for (const id of ORDER) {
      const [x, y] = WORLD[id];
      const zone = ZONES[id];
      const seen = visited(id);
      fillEllipse(ctx, x, y, 6, 6, PAL.ink);
      fillEllipse(ctx, x, y, 5, 5, seen ? shade(THEMES[zone.theme].grass, -0.15) : '#b8a888');
      if ((zone.buildings?.some((b) => b.kind === 'soins') || zone.npcs.some((n) => n.script.kind === 'soin')) && seen) {
        ctx.fillStyle = '#fff8e8';
        ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.fillStyle = '#3d9a4c';
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
      if (!seen) text(ctx, '?', x, y - 4, { align: 'center', color: PAL.cream });
      if (id === objective.zone) star(ctx, x + 7, y - 7, time);
      if (id === here) youAreHere(ctx, x - 7, y - 7, time);
      if (ORDER[this.index] === id) {
        const pulse = Math.floor(time * 4) % 2;
        ctx.strokeStyle = pulse ? PAL.rust : '#f0c040';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 9.5, y - 9.5, 19, 19);
      }
    }
    // Panneau d'information sur la zone sélectionnée.
    const id = ORDER[this.index];
    const zone = ZONES[id];
    box(ctx, 2, 158, W - 4, 32);
    if (!visited(id)) {
      text(ctx, '??? · Lieu encore inconnu', 10, 162, { color: PAL.grey });
    } else {
      text(ctx, zone.name, 10, 162, { shadow: PAL.shadow });
      const leader = zone.npcs.find((n) => n.script.kind === 'dresseur' && getTrainer(n.script.trainer).badge);
      const info: string[] = [];
      if (zone.buildings?.some((b) => b.kind === 'soins')) info.push('Auberge');
      else if (zone.npcs.some((n) => n.script.kind === 'soin')) info.push('Campement');
      if (zone.buildings?.some((b) => b.kind === 'marche')) info.push('Marché');
      else if (zone.npcs.some((n) => n.script.kind === 'boutique')) info.push('Marchand');
      if (leader && leader.script.kind === 'dresseur') {
        const t = getTrainer(leader.script.trainer);
        info.push(`Arène : ${t.name}${state.flags[`dresseur:${t.id}`] ? ' ✓' : ''}`);
      }
      text(ctx, info.join(' · ') || 'Lieu sauvage', 10, 174, { color: PAL.grey });
    }
    const tag = id === here ? 'Vous êtes ici' : id === objective.zone ? 'Objectif' : '';
    if (tag) text(ctx, tag, W - 10, 162, { align: 'right', color: id === here ? '#d83020' : PAL.rust });
  }
}
