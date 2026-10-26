// Exploration des zones : déplacements case par case, PNJ, panneaux,
// rencontres dans les hautes herbes et techniques hors combat des insignes.
import { SPECIES, getSpecies } from '../../data/ginedex';
import { hauntCapturedFlag, hauntOf } from '../../data/hantises';
import { getItem } from '../../data/items';
import { MOVES } from '../../data/moves';
import { getTrainer } from '../../data/trainers';
import {
  DIR_DELTA,
  GRASS_TILE,
  OPPOSITE,
  SOLID_TILES,
  ZONES,
  type Dir,
  type Npc,
  type TownId,
  type Zone,
  type ZoneId,
} from '../../data/zones';
import { MINUTES_PER_SECOND, advance, advanceTo, darknessOf, isNight, nightId, phaseOf, warmthOf } from '../../engine/clock';
import { createJinemon, displayName } from '../../engine/creature';
import { currentObjective } from '../../engine/objective';
import { addItem, giveStarter, hasBadge, healParty, itemCount } from '../../engine/gameState';
import { randInt, weightedPick } from '../../engine/rng';
import { startTrainerBattle, startWildBattle } from '../battleFlow';
import { box, PAL, text } from '../draw';
import { textWidth, wrapText } from '../font';
import type { Game, World } from '../game';
import type { Button } from '../input';
import type { TrackId } from '../musicScore';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { battleBackdrop } from '../backdrops';
import { HauntActor, type HauntHost } from '../haunts';
import { NightLayer, type Light } from '../night';
import { PLAYER_LOOK, characterSprite, drawCreature, prewarmCreatures } from '../sprites';
import { renderInteriorLayers } from '../interiors';
import { TILE, animateTile, grassOverlay, itemBall, renderZoneLayers, type ZoneLayers } from '../tiles';
import { MenuScene } from './menu';
import { ShopScene } from './shop';
import { PlanScene } from './plan';
import { StarterScene } from './starter';
import { StorageScene } from './storage';
import { CoverScene, RevealScene } from './transition';

const BUTTON_DIR: Partial<Record<Button, Dir>> = { up: 'haut', down: 'bas', left: 'gauche', right: 'droite' };

const DECOR_TEXT: Record<string, string> = {
  G: 'Un grenier en banco coiffé de paille. On y garde le mil de toute l’année.',
  O: "L'eau du puits est fraîche et claire.",
  B: 'Un baobab millénaire. Les anciens disent que les génies y tiennent conseil.',
  U: 'Une termitière géante, plus haute qu’un homme. On entend grouiller à l’intérieur.',
  K: 'Le foyer de la forge rougeoie. Une chaleur intense s’en dégage.',
  A: 'Un autel couvert d’offrandes : noix de kola, mil et calebasses de lait.',
  E: 'L’étal déborde de tissus, d’épices et de calebasses.',
  D: 'La porte est fermée. Une bonne odeur de tô s’échappe de la case.',
  '~': "L'eau est profonde ici. Mieux vaut ne pas s'y aventurer.",
  l: 'Un lit bien fait, couvert d’un pagne.',
  t: 'Une table basse. Quelques bols y attendent le repas.',
  j: 'Le canari garde l’eau bien fraîche.',
  b: 'Une étagère chargée de pots et de calebasses.',
  p: 'Une plante en pot.',
  k: 'Un coffre fermé. Mieux vaut ne pas fouiller chez les autres.',
  f: 'Une marmite mijote sur le foyer.',
  h: 'Un étal de marchandises.',
  u: 'Une statue d’ancêtre sculptée dans l’ébène.',
  v: 'Les flammes du brasero dansent doucement.',
  n: 'La lumière du jour entre par la fenêtre.',
  q: 'Une tenture colorée orne le mur.',
};

/** Meubles par-dessus lesquels on parle à la personne qui se tient derrière. */
const COUNTERS = new Set(['c', 'C', 'E']);

/** Portée du regard des dresseurs, en cases. */
const SIGHT = 4;

/** Bulle « ! » au-dessus d'un dresseur qui vous a repéré. */
function exclamation(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x, y, 9, 12);
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(x + 1, y + 1, 7, 10);
  ctx.fillStyle = '#d83020';
  ctx.fillRect(x + 3, y + 2, 3, 5);
  ctx.fillRect(x + 3, y + 8, 3, 2);
}

/** Thème musical de chaque zone extérieure (les intérieurs ont le leur, ou reprennent celui de leur ville). */
const ZONE_MUSIC: Record<TownId, TrackId> = {
  village: 'village',
  savane: 'route',
  terresRouges: 'ville',
  marigot: 'foret',
  foret: 'foret',
  piste: 'route',
  falaise: 'falaise',
  desert: 'desert',
  hombori: 'grotte',
  djenne: 'village',
  cote: 'cote',
  masques: 'masques',
  tombouctou: 'conseil',
};

export class OverworldScene implements Scene, World {
  readonly opaque = true;
  zone!: Zone;
  private layers!: ZoneLayers;
  private x = 0;
  private y = 0;
  private dir: Dir = 'bas';
  private moving: { fromX: number; fromY: number; t: number; duration: number } | null = null;
  private stepFrame = 0;
  private npcDirs = new Map<string, Dir>();
  /** Position des PNJ qui se sont déplacés (dresseurs venus à votre rencontre). */
  private npcPos = new Map<string, { x: number; y: number }>();
  /** Dresseur qui vous a repéré : « ! », puis il marche jusqu'à vous. */
  private approach: { npc: Npc; t: number; from: { x: number; y: number }; walk: number } | null = null;
  /** Dresseurs battus qui regagnent leur place, pas à pas (pour ne jamais boucher un passage). */
  private returning = new Map<string, { from: { x: number; y: number }; walk: number }>();
  private banner = 0;
  private bannerText = '';
  private stepsSinceBattle = 0;
  private bumpCooldown = 0;
  private readonly night = new NightLayer();
  /** Hantise qui rôde dans la zone (la nuit seulement). */
  private haunt: HauntActor | null = null;
  /** Traces de pas de la nuit dans cette zone (suivies par le traqueur). */
  private steps: Array<[number, number]> = [];
  private omen = '';
  private omenTimer = 0;
  private heartbeat = 0;
  /** Embuscade en cours : l'écran tremble avant le combat. */
  private ambush = -1;

  constructor(private readonly game: Game) {
    game.world = this;
    const p = game.s.position;
    this.loadZone(p.zone, p.x, p.y, p.dir);
    this.prewarmParty();
  }

  /** Musique de la zone ; la nuit, une berceuse inquiète, et le silence quand une Hantise approche. */
  get music(): TrackId | null {
    const zone = this.zone;
    if (zone.interior) return zone.music ?? ZONE_MUSIC[zone.parent ?? 'village'];
    const night = isNight(this.game.s.clock);
    if (night && this.haunt && this.haunt.distance() <= 7) return null;
    if (night && !zone.dark && zone.id !== 'tombouctou') return 'nuit';
    return zone.music ?? ZONE_MUSIC[zone.id as TownId];
  }

  /** Sculpte à l'avance les sprites de l'équipe (menus et combat). */
  private prewarmParty(): void {
    prewarmCreatures(this.game.s.party.flatMap((j): Array<[number, number, 'face' | 'dos']> => [
      [j.speciesId, 72, 'dos'],
      [j.speciesId, 32, 'face'],
      [j.speciesId, 64, 'face'],
    ]));
  }

  // ── Zone ───────────────────────────────────────────────────────────────

  private loadZone(id: ZoneId, x: number, y: number, dir: Dir): void {
    this.zone = ZONES[id];
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.moving = null;
    this.banner = 2.5;
    this.bannerText = this.zone.name;
    this.npcDirs = new Map(this.zone.npcs.map((n) => [n.id, n.dir]));
    this.npcPos = new Map();
    this.game.s.flags[`visite:${id}`] = true;
    this.approach = null;
    this.returning = new Map();
    this.redrawMap();
    this.savePosition();
    this.haunt = null;
    this.steps = [];
    this.ambush = -1;
    this.syncHaunt();
    // Fond de combat et Jinémon sauvages de la zone, préparés pendant la promenade.
    const zone = this.zone;
    setTimeout(() => {
      if (this.zone !== zone) return;
      battleBackdrop(zone.theme, isNight(this.game.s.clock));
      prewarmCreatures([...zone.encounters, ...(zone.nightEncounters ?? [])].map((e): [number, number] => [e.species, 64]));
      const haunt = hauntOf(zone.id);
      if (haunt) prewarmCreatures([[haunt.species, 32], [haunt.species, 64]]);
    }, 600);
  }

  private redrawMap(): void {
    const tile = (x: number, y: number) => this.tile(x, y);
    this.layers = this.zone.interior ? renderInteriorLayers(this.zone, tile) : renderZoneLayers(this.zone, tile);
  }

  teleport(zone: ZoneId, x: number, y: number, dir: Dir): void {
    this.loadZone(zone, x, y, dir);
  }

  private savePosition(): void {
    this.game.s.position = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
  }

  // ── Nuit et Hantises ───────────────────────────────────────────────────

  /** Fait apparaître (ou disparaître) la Hantise de la zone selon l'heure. */
  private syncHaunt(): void {
    const state = this.game.s;
    const def = hauntOf(this.zone.id);
    const allowed =
      !!def && isNight(state.clock) && !state.flags[hauntCapturedFlag(this.zone.id)] && state.repelled[this.zone.id] !== nightId(state.clock);
    if (!allowed) {
      if (this.haunt && this.ambush < 0) this.haunt = null;
      return;
    }
    if (this.haunt || !def) return;
    let start: [number, number];
    if (def.behavior === 'miroir') {
      const axis = def.axis ?? 0;
      start = [this.x, Math.max(0, Math.min(this.zone.map.length - 1, 2 * axis - this.y))];
    } else {
      start = [...def.spawns].sort((a, b) => Math.abs(b[0] - this.x) + Math.abs(b[1] - this.y) - (Math.abs(a[0] - this.x) + Math.abs(a[1] - this.y)))[0];
    }
    this.haunt = new HauntActor(def, this.hauntHost(), start[0], start[1]);
    this.steps = [[this.x, this.y]];
    this.omen = def.omen;
    this.omenTimer = 5;
  }

  private hauntHost(): HauntHost {
    const scene = this;
    return {
      rng: this.game.rng,
      get mapWidth() {
        return scene.zone.map[0].length;
      },
      get mapHeight() {
        return scene.zone.map.length;
      },
      player: () => ({ x: this.x, y: this.y, dir: this.dir }),
      // Les Hantises traversent les vivants comme des esprits : seuls le décor et le joueur les arrêtent.
      walkable: (x, y) => {
        if (x === this.x && y === this.y) return false;
        return !SOLID_TILES.has(this.tile(x, y));
      },
      tile: (x, y) => this.tile(x, y),
      trail: () => this.steps,
      sfx: (name) => this.game.sfx(name),
      caught: () => {
        this.ambush = 0;
        this.moving = null;
      },
    };
  }

  /** La Hantise a rattrapé le joueur : cri, écran qui tremble, puis combat. */
  private launchAmbush(): void {
    const haunt = this.haunt;
    if (!haunt) return;
    const def = haunt.haunt;
    const game = this.game;
    const zone = this.zone.id;
    const name = getSpecies(def.species).name;
    game.say(def.cry, () => {
      const foe = createJinemon(def.species, def.level, game.rng);
      startWildBattle(game, foe, {
        flag: hauntCapturedFlag(zone),
        intro: `La Hantise ${name} surgit des ténèbres !`,
        music: 'hantise',
        onOutcome: () => {
          // Quelle que soit l'issue, elle disparaît jusqu'à la nuit suivante.
          game.s.repelled[zone] = nightId(game.s.clock);
          this.haunt = null;
          this.ambush = -1;
        },
      });
    });
  }

  private rockBroken(x: number, y: number): boolean {
    return !!this.game.s.flags[`rocher:${this.zone.id}:${x}:${y}`];
  }

  private tile(x: number, y: number): string {
    const map = this.zone.map;
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return '#';
    if (map[y][x] === 'X' && this.rockBroken(x, y)) return '.';
    if (map[y][x] === 'Y' && this.game.s.flags[`mirage:${this.zone.id}`]) return ':';
    return map[y][x];
  }

  private npcVisible(npc: Npc): boolean {
    const flags = this.game.s.flags;
    if (npc.hideFlag && flags[npc.hideFlag]) return false;
    if (npc.showFlag && !flags[npc.showFlag]) return false;
    return true;
  }

  private npcAt(x: number, y: number): Npc | undefined {
    return this.zone.npcs.find((n) => {
      const p = this.posOf(n);
      return p.x === x && p.y === y && this.npcVisible(n);
    });
  }

  private posOf(npc: Npc): { x: number; y: number } {
    return this.npcPos.get(npc.id) ?? { x: npc.x, y: npc.y };
  }

  /** Dresseur pas encore battu dont le regard croise le joueur. */
  private spottedBy(): Npc | undefined {
    const flags = this.game.s.flags;
    for (const npc of this.zone.npcs) {
      if (npc.script.kind !== 'dresseur' || !this.npcVisible(npc)) continue;
      const trainer = getTrainer(npc.script.trainer);
      const sight = trainer.sight ?? (trainer.badge ? 0 : SIGHT);
      if (!sight || flags[`dresseur:${trainer.id}`]) continue;
      const p = this.posOf(npc);
      const { dx, dy } = DIR_DELTA[this.npcDirs.get(npc.id) ?? npc.dir];
      for (let k = 1; k <= sight; k++) {
        const x = p.x + dx * k;
        const y = p.y + dy * k;
        if (x === this.x && y === this.y) return npc;
        if (SOLID_TILES.has(this.tile(x, y)) || this.npcAt(x, y)) break;
      }
    }
    return undefined;
  }

  private updateApproach(dt: number): void {
    const a = this.approach!;
    a.t += dt;
    if (a.t < 0.75) return;
    const p = this.posOf(a.npc);
    if (a.walk < 1) {
      a.walk = Math.min(1, a.walk + dt / 0.22);
      return;
    }
    if (Math.abs(p.x - this.x) + Math.abs(p.y - this.y) > 1) {
      const { dx, dy } = DIR_DELTA[this.npcDirs.get(a.npc.id) ?? a.npc.dir];
      a.from = p;
      a.walk = 0;
      this.npcPos.set(a.npc.id, { x: p.x + dx, y: p.y + dy });
      return;
    }
    // Face à face, puis le défi.
    const toPlayer = this.npcDirs.get(a.npc.id) ?? a.npc.dir;
    this.dir = OPPOSITE[toPlayer];
    this.approach = null;
    this.runNpc(a.npc);
  }

  /** Les dresseurs battus qui s'étaient déplacés retournent à leur poste. */
  private updateReturns(dt: number): void {
    for (const npc of this.zone.npcs) {
      const pos = this.npcPos.get(npc.id);
      if (!pos || npc.script.kind !== 'dresseur' || !this.game.s.flags[`dresseur:${npc.script.trainer}`]) continue;
      const anim = this.returning.get(npc.id);
      if (anim && anim.walk < 1) {
        anim.walk = Math.min(1, anim.walk + dt / 0.26);
        continue;
      }
      if (pos.x === npc.x && pos.y === npc.y) {
        this.npcPos.delete(npc.id);
        this.returning.delete(npc.id);
        this.npcDirs.set(npc.id, npc.dir);
        continue;
      }
      const dx = Math.sign(npc.x - pos.x);
      const dy = dx !== 0 ? 0 : Math.sign(npc.y - pos.y);
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      // On attend que la voie soit libre (le joueur ou un autre PNJ peut gêner).
      if ((nx === this.x && ny === this.y) || this.npcAt(nx, ny)) continue;
      this.npcDirs.set(npc.id, dx > 0 ? 'droite' : dx < 0 ? 'gauche' : dy > 0 ? 'bas' : 'haut');
      this.returning.set(npc.id, { from: { ...pos }, walk: 0 });
      this.npcPos.set(npc.id, { x: nx, y: ny });
    }
  }

  /** Un Jinémon de l'équipe connaît-il une attaque du type donné ? */
  private fieldUser(type: 'Eau' | 'Métal' | 'Psy'): { name: string; move: string } | null {
    for (const j of this.game.s.party) {
      const slot = j.moves.find((m) => MOVES[m.id].type === type);
      if (slot) return { name: displayName(j), move: MOVES[slot.id].name };
    }
    return null;
  }

  private canEnter(x: number, y: number): boolean {
    const t = this.tile(x, y);
    if (this.npcAt(x, y)) return false;
    if (this.haunt && this.haunt.x === x && this.haunt.y === y && !(this.haunt.haunt.behavior === 'miroir' && this.haunt.submerged())) return false;
    if (t === 'w') return hasBadge(this.game.s, 'pluie') && !!this.fieldUser('Eau');
    return !SOLID_TILES.has(t);
  }

  // ── Mise à jour ────────────────────────────────────────────────────────

  update(dt: number): void {
    this.banner = Math.max(0, this.banner - dt);
    this.omenTimer = Math.max(0, this.omenTimer - dt);
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    if (this.ambush >= 0) {
      this.ambush += dt;
      if (this.ambush >= 0.75 && this.ambush - dt < 0.75) this.launchAmbush();
      return;
    }
    if (this.approach) {
      this.updateApproach(dt);
      return;
    }
    this.updateReturns(dt);
    this.tickClock(dt);
    if (this.haunt) {
      this.haunt.update(dt);
      if (this.ambush >= 0) return;
      // Le cœur s'emballe quand la Hantise approche.
      const d = this.haunt.distance();
      if (d <= 6) {
        this.heartbeat -= dt;
        if (this.heartbeat <= 0) {
          this.game.sfx('battement');
          this.heartbeat = 0.35 + d * 0.16;
        }
      }
    }
    if (this.moving) {
      this.moving.t += dt / this.moving.duration;
      if (this.moving.t >= 1) {
        this.moving = null;
        this.finishStep();
      }
      return;
    }
    const input = this.game.input;
    if (input.pressed('start')) {
      this.game.sfx('valider');
      this.game.scenes.push(new MenuScene(this.game));
      return;
    }
    if (input.pressed('a')) {
      this.interact();
      return;
    }
    // Maintenir une direction fait marcher ; une tape brève fait pivoter, ou avancer d'une case si l'on regarde déjà par là.
    const held = input.heldDirection();
    const button = held ?? input.tappedDirection();
    const dir = button ? BUTTON_DIR[button] : undefined;
    if (!button || !dir) return;
    if (dir !== this.dir && (!held || input.holdTime(held) < 0.07)) {
      this.dir = dir;
      return;
    }
    this.dir = dir;
    this.tryMove();
  }

  /** L'heure tourne pendant l'exploration ; la nuit tombe, l'aube se lève. */
  private tickClock(dt: number): void {
    const clock = this.game.s.clock;
    const wasNight = isNight(clock);
    if (!advance(clock, dt * MINUTES_PER_SECOND)) return;
    const phase = phaseOf(clock.minute);
    const labels = { aube: 'L’aube se lève…', jour: 'Le jour est levé', crepuscule: 'Le soleil se couche…', nuit: 'La nuit tombe…' };
    this.bannerText = labels[phase];
    this.banner = 2.5;
    if (phase === 'nuit' && !wasNight) {
      this.game.sfx('nuit');
      this.steps = [];
    }
    if (wasNight && phase !== 'nuit' && this.haunt) {
      this.omen = 'Aux premières lueurs du jour, la présence se dissipe.';
      this.omenTimer = 4;
    }
    this.syncHaunt();
    // Le fond de combat de la nuit est préparé à l'avance.
    setTimeout(() => battleBackdrop(this.zone.theme, isNight(clock)), 200);
  }

  private tryMove(): void {
    const { dx, dy } = DIR_DELTA[this.dir];
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!this.canEnter(nx, ny)) {
      if (this.bumpCooldown <= 0) {
        this.game.sfx('pas');
        this.bumpCooldown = 0.3;
      }
      return;
    }
    const running = this.game.input.isHeld('run') || this.game.input.isHeld('b');
    this.moving = { fromX: this.x, fromY: this.y, t: 0, duration: running ? 0.12 : 0.21 };
    this.x = nx;
    this.y = ny;
    this.stepFrame += 1;
  }

  private finishStep(): void {
    this.savePosition();
    this.stepsSinceBattle += 1;
    if (this.haunt) {
      this.steps.push([this.x, this.y]);
      if (this.steps.length > 300) this.steps.shift();
    }
    const warp = this.zone.warps.find((w) => w.x === this.x && w.y === this.y);
    if (warp) {
      this.game.scenes.push(
        new CoverScene(this.game, 'fondu', () => {
          this.loadZone(warp.to, warp.tx, warp.ty, warp.dir);
          this.game.save(true);
          this.game.scenes.push(new RevealScene(this.game));
        }),
      );
      return;
    }
    const spotter = this.spottedBy();
    if (spotter) {
      this.approach = { npc: spotter, t: 0, from: this.posOf(spotter), walk: 1 };
      this.game.sfx('surprise');
      return;
    }
    if (this.tile(this.x, this.y) === GRASS_TILE && this.stepsSinceBattle > 2 && this.zone.encounters.length) {
      if (this.game.rng.next() < this.zone.encounterRate) this.wildEncounter();
    }
  }

  private wildEncounter(): void {
    const table = isNight(this.game.s.clock) && this.zone.nightEncounters?.length ? this.zone.nightEncounters : this.zone.encounters;
    const entry = weightedPick(this.game.rng, table);
    const foe = createJinemon(entry.species, randInt(this.game.rng, entry.min, entry.max), this.game.rng);
    this.stepsSinceBattle = 0;
    startWildBattle(this.game, foe);
  }

  resume(): void {
    this.game.input.consume();
    this.prewarmParty();
  }

  // ── Interactions ───────────────────────────────────────────────────────

  private interact(): void {
    const { dx, dy } = DIR_DELTA[this.dir];
    const tx = this.x + dx;
    const ty = this.y + dy;
    if (this.haunt && this.haunt.x === tx && this.haunt.y === ty && this.haunt.disguised()) {
      this.haunt.talkedTo();
      this.game.say(['Excusez-moi… vous savez où mène cette piste ?', '…', '… … …']);
      return;
    }
    // Par-dessus un comptoir, un étal ou un stand, on parle à la personne qui se tient derrière.
    const npc = this.npcAt(tx, ty) ?? (COUNTERS.has(this.tile(tx, ty)) ? this.npcAt(tx + dx, ty + dy) : undefined);
    if (npc) {
      if (npc.look.kind === 'personne') this.npcDirs.set(npc.id, OPPOSITE[this.dir]);
      this.runNpc(npc);
      return;
    }
    const sign = this.zone.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      if (sign.plan) this.game.scenes.push(new PlanScene(this.game, this.zone, { x: this.x, y: this.y }));
      else this.game.say(this.personal(sign.text));
      return;
    }
    const t = this.tile(tx, ty);
    if (t === 'g') {
      this.game.sfx('valider');
      this.game.say(['Tu ouvres le grenier à Jinémon.'], () => this.game.scenes.push(new StorageScene(this.game)));
    } else if (t === 'X') {
      this.crackedRock(tx, ty);
    } else if (t === 'w') {
      this.ford();
    } else if (t === 'Y') {
      this.mirage();
    } else if (t === '~' && itemCount(this.game.s, 'nasse') > 0 && this.zone.fishing?.length) {
      this.fish();
    } else if (this.zone.decor?.[t] ?? DECOR_TEXT[t]) {
      this.game.say([this.zone.decor?.[t] ?? DECOR_TEXT[t]]);
    }
  }

  /** Remplace « {nom} » par le nom du joueur. */
  private personal(lines: string[]): string[] {
    return lines.map((l) => l.replaceAll('{nom}', this.game.s.playerName));
  }

  private crackedRock(x: number, y: number): void {
    const user = this.fieldUser('Métal');
    if (!hasBadge(this.game.s, 'enclume') || !user) {
      this.game.say([
        'Un rocher de latérite parcouru de fissures.',
        hasBadge(this.game.s, 'enclume')
          ? 'Il faudrait un Jinémon connaissant une attaque Métal pour le briser.'
          : "Il faudrait l'Insigne de l'Enclume et un Jinémon maîtrisant le Métal pour le briser.",
      ]);
      return;
    }
    this.game.ask(['Un rocher fissuré bloque le passage.', `Demander à ${user.name} de le briser ?`], ['Oui', 'Non'], (i) => {
      if (i !== 0) return;
      this.game.s.flags[`rocher:${this.zone.id}:${x}:${y}`] = true;
      this.redrawMap();
      this.game.sfx('superCoup');
      this.game.say([`${user.name} utilise ${user.move} ! Le rocher vole en éclats !`], () => this.game.save(true));
    });
  }

  /** Insigne du Mirage : un Jinémon Psy dissipe les mirages de la zone. */
  private mirage(): void {
    const user = this.fieldUser('Psy');
    if (!hasBadge(this.game.s, 'mirage') || !user) {
      this.game.say([
        'Un rocher tremble dans l’air brûlant… Il a l’air bien réel, pourtant.',
        hasBadge(this.game.s, 'mirage')
          ? 'Un Jinémon connaissant une attaque Psy pourrait percer cette illusion.'
          : "Avec l'Insigne du Mirage, un Jinémon connaissant une attaque Psy pourrait dissiper ce mirage.",
      ]);
      return;
    }
    this.game.ask(['L’air tremble au-dessus des rochers. Est-ce un mirage ?', `Demander à ${user.name} de le dissiper ?`], ['Oui', 'Non'], (i) => {
      if (i !== 0) return;
      this.game.s.flags[`mirage:${this.zone.id}`] = true;
      this.redrawMap();
      this.game.sfx('valider');
      this.game.say([`${user.name} utilise ${user.move} ! Le mirage se dissipe : la route du nord apparaît.`], () => this.game.save(true));
    });
  }

  /** La nasse : un Jinémon aquatique mord… ou pas. */
  private fish(): void {
    const game = this.game;
    const table = this.zone.fishing!;
    game.ask(['L’eau est profonde et calme.', 'Lancer la nasse ?'], ['Oui', 'Non'], (i) => {
      if (i !== 0) return;
      game.sfx('pas');
      const bite = game.rng.next() < 0.75;
      if (!bite) {
        game.say(['Vous lancez la nasse…', '… … …', 'Rien ne mord. Les Jinémon du fond se méfient.']);
        return;
      }
      game.say(['Vous lancez la nasse…', '… …', 'Quelque chose s’agite dans la nasse !'], () => {
        const entry = weightedPick(game.rng, table);
        const foe = createJinemon(entry.species, randInt(game.rng, entry.min, entry.max), game.rng);
        this.stepsSinceBattle = 0;
        startWildBattle(game, foe);
      });
    });
  }

  private ford(): void {
    const user = this.fieldUser('Eau');
    if (hasBadge(this.game.s, 'pluie') && user) {
      this.game.say([`${user.name} vous guide à travers le courant du gué.`]);
    } else {
      this.game.say([
        'Le courant du gué est trop fort pour traverser à pied.',
        "Avec l'Insigne de la Pluie, un Jinémon connaissant une attaque Eau pourrait vous faire traverser.",
      ]);
    }
  }

  private runNpc(npc: Npc): void {
    const game = this.game;
    const state = game.s;
    const s = npc.script;
    switch (s.kind) {
      case 'dialogue':
        game.say(this.personal(s.lines));
        break;
      case 'maman':
        this.maman();
        break;
      case 'soin':
        game.ask([...s.lines, 'Veux-tu que je soigne tes Jinémon ?'], ['Oui', 'Se reposer', 'Non'], (i) => {
          if (i === 1) {
            this.rest();
            return;
          }
          if (i !== 0) {
            game.say(['Reviens quand tu veux.']);
            return;
          }
          healParty(state);
          state.lastHeal = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
          game.jingle('soin');
          game.say(['… … …', 'Tes Jinémon sont en pleine forme ! Que les ancêtres veillent sur toi.'], () => game.save());
        });
        break;
      case 'boutique':
        game.say(s.lines, () => game.scenes.push(new ShopScene(game, s.items)));
        break;
      case 'grenier':
        game.say(s.lines, () => game.scenes.push(new StorageScene(game)));
        break;
      case 'dresseur': {
        const trainer = getTrainer(s.trainer);
        if (state.flags[`dresseur:${trainer.id}`]) game.say(trainer.after);
        else game.say(trainer.intro, () => startTrainerBattle(game, trainer.id));
        break;
      }
      case 'starter':
        this.hogon();
        break;
      case 'gardien': {
        const c = s.condition;
        const ok = c === 'starter' ? !!state.flags.starter : c === 'pantheon' ? !!state.flags['dresseur:assa'] : state.badges.length >= c.insignes;
        if (ok) {
          game.say(s.open, () => {
            state.flags[s.flag] = true;
            game.save(true);
          });
        } else {
          game.say(s.blocked);
        }
        break;
      }
      case 'don':
        if (state.flags[s.flag]) {
          game.say(s.after);
          break;
        }
        game.say(s.lines, () => {
          addItem(state, s.item, s.quantity);
          state.flags[s.flag] = true;
          game.jingle('objet');
          game.say([`Vous recevez : ${getItem(s.item).name} !`], () => game.save(true));
        });
        break;
      case 'objet': {
        addItem(state, s.item, s.quantity);
        state.flags[s.flag] = true;
        game.jingle('objet');
        const label = s.quantity > 1 ? `${s.quantity} × ${getItem(s.item).name}` : getItem(s.item).name;
        game.say([`Vous trouvez : ${label} !`], () => game.save(true));
        break;
      }
      case 'legendaire':
        game.say(s.lines, () => {
          const foe = createJinemon(s.species, s.level, game.rng, 0, s.moves);
          startWildBattle(game, foe, { flag: s.flag });
        });
        break;
    }
  }

  /** Se reposer chez un guérisseur : soigne l'équipe et fait passer le temps. */
  private rest(): void {
    const game = this.game;
    game.ask(['Jusqu’à quand veux-tu te reposer ?'], ['Jusqu’au matin', 'Jusqu’à la nuit', 'Annuler'], (i) => {
      if (i > 1) return;
      game.scenes.push(
        new CoverScene(game, 'fondu', () => {
          const state = game.s;
          advanceTo(state.clock, i === 0 ? 7 * 60 : 20 * 60 + 15);
          healParty(state);
          state.lastHeal = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
          this.haunt = null;
          this.steps = [];
          this.syncHaunt();
          this.bannerText = i === 0 ? 'Le jour est levé' : 'La nuit tombe…';
          this.banner = 2.5;
          game.scenes.push(
            new RevealScene(game, 0.6, () =>
              game.say([i === 0 ? 'Vous vous réveillez reposé. Le soleil se lève sur la brousse.' : 'Vous vous réveillez à la nuit tombée. Au loin, quelque chose a hurlé.'], () =>
                game.save(true),
              ),
            ),
          );
        }, 0.6),
      );
    });
  }

  /** Maman : au réveil, elle envoie le joueur au sanctuaire ; ensuite, elle soigne son équipe. */
  private maman(): void {
    const game = this.game;
    const state = game.s;
    const name = state.playerName;
    if (!state.flags.maman && !state.flags.starter) {
      game.say(
        [
          `Maman : Ah, ${name} ! Enfin debout ! Le soleil est levé depuis longtemps, tu sais.`,
          'Maman : Tu as oublié quel jour on est ? C’est aujourd’hui ton initiation !',
          'Maman : Le Hogon t’attend au sanctuaire depuis l’aube. Il va te confier ton premier Jinémon.',
          'Maman : Le sanctuaire est tout au nord de la place du village. Sors, remonte la rue, et suis le chemin.',
          'Maman : Si tu te perds, regarde le plan sur la place, ou ouvre ton menu : la CARTE te rappelle toujours où aller.',
          'Maman : Allez, file ! Et reviens me voir quand tu veux : un bon repas et une sieste, rien de tel pour tes Jinémon.',
        ],
        () => {
          state.flags.maman = true;
          game.save(true);
        },
      );
      return;
    }
    if (!state.party.length) {
      game.say(['Maman : Qu’est-ce que tu fais encore là ? Le Hogon t’attend au sanctuaire, au nord de la place !']);
      return;
    }
    game.say([`Maman : ${name} ! Tu as l’air à bout de forces. Assieds-toi, et laisse tes Jinémon se reposer un peu.`], () => {
      healParty(state);
      state.lastHeal = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
      game.jingle('soin');
      game.say(['… … …', 'Maman : Voilà, tout le monde est en pleine forme ! Fais attention à toi, mon enfant.'], () => game.save());
    });
  }

  /** Le Hogon, chef spirituel du village : il confie le premier Jinémon, puis guide le joueur. */
  private hogon(): void {
    const game = this.game;
    const state = game.s;
    if (!state.flags.starter) {
      game.say(
        [
          `Hogon : Ah, ${state.playerName}. Te voilà enfin. Approche, mon enfant.`,
          'Hogon : Depuis toujours, notre peuple vit aux côtés des Jinémon, ces créatures nées des forces de la nature et des légendes.',
          "Hogon : Aujourd'hui commence ton initiation. Comme le veut la tradition, je vais te confier ton premier compagnon.",
          'Hogon : Trois Calebasses Sacrées reposent sur l’autel. Choisis avec ton cœur.',
        ],
        () =>
          game.scenes.push(
            new StarterScene(game, (speciesId) => {
              const j = giveStarter(state, speciesId, game.rng);
              addItem(state, 'calebasse', 5);
              addItem(state, 'karite', 3);
              game.jingle('capture');
              game.say(
                [
                  `Vous recevez ${displayName(j)} !`,
                  `Hogon : ${displayName(j)} t’a choisi autant que tu l’as choisi.`,
                  'Hogon : Prends aussi ces cinq Calebasses Sacrées et trois pots de Beurre de Karité.',
                  "Hogon : Affaiblis un Jinémon sauvage, puis lance-lui une calebasse : s'il l'accepte, il se joindra à toi.",
                  'Hogon : Ma petite-fille Kady est partie devant avec son propre Jinémon. Elle t’attend dans la Savane des Termitières, au nord du village.',
                  'Hogon : Si tes Jinémon sont fatigués, va à la Case de Soins : le bâtiment blanc au toit vert. Il y en a une dans chaque ville.',
                  'Hogon : Plus loin, les Maîtres de Piste gardent les Arènes. Gagne leurs insignes, et peut-être atteindras-tu un jour le Panthéon des Légendes.',
                ],
                () => game.save(),
              );
            }),
          ),
      );
      return;
    }
    const caught = state.dex.caught.length;
    const hint = state.flags['dresseur:kadyChampion']
      ? 'Champion du Mandé… Mon enfant, les griots chanteront ton nom pendant des siècles.'
      : currentObjective(state).text;
    game.say([`Hogon : Ton Ginédex compte ${caught} espèce${caught > 1 ? 's' : ''} capturée${caught > 1 ? 's' : ''} sur ${SPECIES.length}.`, `Hogon : ${hint}`]);
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  private playerPixel(): { px: number; py: number } {
    if (!this.moving) return { px: this.x * TILE, py: this.y * TILE };
    const t = Math.min(1, this.moving.t);
    return {
      px: (this.moving.fromX + (this.x - this.moving.fromX) * t) * TILE,
      py: (this.moving.fromY + (this.y - this.moving.fromY) * t) * TILE,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const mapW = this.zone.map[0].length * TILE;
    const mapH = this.zone.map.length * TILE;
    const { px, py } = this.playerPixel();
    const camX = mapW <= W ? (mapW - W) / 2 : Math.max(0, Math.min(mapW - W, px + 8 - W / 2));
    const camY = mapH <= H ? (mapH - H) / 2 : Math.max(0, Math.min(mapH - H, py + 8 - H / 2));
    // L'écran tremble pendant une embuscade.
    const quake = this.ambush >= 0 ? Math.round(Math.sin(this.ambush * 70) * 3) : 0;
    const ox = Math.round(-camX) + quake;
    const oy = Math.round(-camY);

    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.layers.base, ox, oy);

    // Tuiles animées visibles
    const time = this.game.time;
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    for (let ty = y0; ty < Math.min(this.zone.map.length, y0 + H / TILE + 2); ty++) {
      for (let tx = x0; tx < Math.min(this.zone.map[0].length, x0 + W / TILE + 2); tx++) {
        const ch = this.zone.map[ty][tx];
        if (ch === '~' || ch === 'w' || ch === 'K' || ch === 'v' || ch === 'f') animateTile(ctx, ch, tx * TILE + ox, ty * TILE + oy, time);
      }
    }

    // Entités triées par profondeur ; les personnages (16×24) dépassent de 8 px au-dessus de leur case.
    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [];
    const shadow = (x: number, y: number) => {
      ctx.fillStyle = 'rgba(20,12,4,0.28)';
      ctx.fillRect(x + 4, y + 14, 8, 2);
      ctx.fillRect(x + 3, y + 15, 10, 1);
    };
    for (const npc of this.zone.npcs) {
      if (!this.npcVisible(npc)) continue;
      const p = this.posOf(npc);
      const a = this.approach?.npc === npc ? this.approach : null;
      const back = this.returning.get(npc.id);
      const anim = a ?? (back && back.walk < 1 ? back : null);
      const walking = !!anim && anim.walk < 1;
      const wx = walking ? anim.from.x + (p.x - anim.from.x) * anim.walk : p.x;
      const wy = walking ? anim.from.y + (p.y - anim.from.y) * anim.walk : p.y;
      const nx = Math.round(wx * TILE) + ox;
      const ny = Math.round(wy * TILE) + oy;
      drawables.push({
        y: wy * TILE,
        draw: () => {
          if (npc.look.kind === 'personne') {
            shadow(nx, ny);
            const frame = walking && anim.walk < 0.6 ? 1 + ((p.x + p.y) % 2) : 0;
            ctx.drawImage(characterSprite(npc.look.look, this.npcDirs.get(npc.id) ?? npc.dir, frame), nx, ny - 8);
            if (a && a.t < 0.75) exclamation(ctx, nx + 4, ny - 21 - Math.round(Math.max(0, 0.15 - a.t) * 40));
          } else if (npc.look.kind === 'creature') {
            const bob = Math.floor(time * 2) % 2;
            shadow(nx, ny);
            drawCreature(ctx, npc.look.species, nx + 8, ny + 15 - bob, 32);
          } else {
            itemBall(ctx, nx, ny, time);
          }
        },
      });
    }
    if (this.haunt) {
      const haunt = this.haunt;
      drawables.push({ y: haunt.pixel().py, draw: () => haunt.render(ctx, ox, oy, time) });
    }
    // Pas alterné gauche / droite pendant la première moitié de chaque déplacement.
    const frame = this.moving && this.moving.t < 0.6 ? 1 + (this.stepFrame % 2) : 0;
    drawables.push({
      y: py,
      draw: () => {
        const sx = Math.round(px + ox);
        const sy = Math.round(py + oy);
        shadow(sx, sy);
        ctx.drawImage(characterSprite(PLAYER_LOOK, this.dir, frame), sx, sy - 8);
        if (!this.moving && this.tile(this.x, this.y) === GRASS_TILE) grassOverlay(ctx, sx, sy, this.zone.theme);
      },
    });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    ctx.drawImage(this.layers.over, ox, oy);
    this.renderLighting(ctx, ox, oy, px, py, x0, y0);

    // Nom de la zone, ou changement de moment de la journée
    if (this.banner > 0) {
      const w = textWidth(this.bannerText) + 24;
      // Glisse depuis le haut, reste affiché, puis remonte.
      const t = Math.min(2.5 - this.banner, this.banner);
      const slide = t < 0.3 ? -24 + (t / 0.3) * 24 : 0;
      box(ctx, 4, 4 + Math.round(slide), w, 20);
      text(ctx, this.bannerText, 4 + w / 2, 8 + Math.round(slide), { align: 'center', shadow: PAL.shadow });
    }
    // Présage murmuré quand une Hantise rôde.
    if (this.omenTimer > 0) {
      const rows = wrapText(this.omen, W - 28).slice(0, 3);
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.omenTimer);
      box(ctx, 4, H - 10 - rows.length * 12, W - 8, rows.length * 12 + 6, 'sombre');
      rows.forEach((row, i) => text(ctx, row, 12, H - 7 - rows.length * 12 + i * 12, { color: '#c8b8e8' }));
      ctx.restore();
    }
    // Flash rouge au moment où la Hantise surgit.
    if (this.ambush >= 0 && this.ambush < 0.3 && Math.floor(this.ambush * 20) % 2 === 0) {
      ctx.fillStyle = 'rgba(160, 0, 0, 0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Teinte du crépuscule, obscurité et lumières, yeux des Hantises, vignette de danger. */
  private renderLighting(ctx: CanvasRenderingContext2D, ox: number, oy: number, px: number, py: number, x0: number, y0: number): void {
    const clock = this.game.s.clock;
    const time = this.game.time;
    // Dans les grottes, il fait toujours noir : seul un Jinémon Feu éclaire vraiment.
    // Les intérieurs restent éclairés à toute heure.
    if (this.zone.interior) return;
    const dark = !!this.zone.dark;
    const darkness = dark ? Math.max(0.9, darknessOf(clock.minute)) : darknessOf(clock.minute);
    const warmth = dark ? 0 : warmthOf(clock.minute);
    if (darkness < 0.02 && warmth < 0.02) return;
    const fire = dark && this.game.s.party.some((j) => getSpecies(j.speciesId).types.includes('Feu'));
    const radius = dark ? (fire ? 74 : 34) : 46;
    const lights: Light[] = [{ x: px + ox + 8, y: py + oy + 6, r: radius + Math.sin(time * 5) * 1.5 }];
    for (let ty = Math.max(0, y0 - 2); ty < Math.min(this.zone.map.length, y0 + H / TILE + 4); ty++) {
      for (let tx = Math.max(0, x0 - 2); tx < Math.min(this.zone.map[0].length, x0 + W / TILE + 4); tx++) {
        const ch = this.zone.map[ty][tx];
        const cx = tx * TILE + ox + 8;
        const cy = ty * TILE + oy + 8;
        if (ch === 'K') lights.push({ x: cx, y: cy, r: 34 + Math.sin(time * 11 + tx) * 2 });
        else if (ch === 'D' || ch === 'd') lights.push({ x: cx, y: cy + 4, r: ch === 'd' ? 28 : 22 });
        else if (ch === 'A') lights.push({ x: cx, y: cy, r: 16 });
      }
    }
    const glow = this.haunt?.light(ox, oy, time);
    if (glow) lights.push(glow);
    this.night.draw(ctx, darkness, warmth, lights);
    if (!this.haunt || darkness < 0.3) return;
    this.haunt.renderEyes(ctx, ox, oy, time);
    // Vignette rouge qui bat avec le cœur quand la Hantise est proche.
    const d = this.haunt.distance();
    if (d <= 6) {
      const pulse = (Math.sin(time * (4 + (6 - d) * 1.2)) + 1) / 2;
      const a = (0.1 + (6 - d) * 0.05) * (0.5 + pulse * 0.5);
      ctx.fillStyle = `rgba(120, 0, 10, ${a.toFixed(3)})`;
      for (let band = 0; band < 3; band++) {
        const m = band * 5;
        ctx.globalAlpha = 1 - band * 0.3;
        ctx.fillRect(m, m, W - 2 * m, 5);
        ctx.fillRect(m, H - m - 5, W - 2 * m, 5);
        ctx.fillRect(m, m + 5, 5, H - 2 * m - 10);
        ctx.fillRect(W - m - 5, m + 5, 5, H - 2 * m - 10);
      }
      ctx.globalAlpha = 1;
    }
  }
}
