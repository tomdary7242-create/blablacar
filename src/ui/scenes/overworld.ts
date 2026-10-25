// Exploration des zones : déplacements case par case, PNJ, panneaux,
// rencontres dans les hautes herbes et techniques hors combat des insignes.
import { SPECIES } from '../../data/ginedex';
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
  type Zone,
  type ZoneId,
} from '../../data/zones';
import { createJinemon, displayName } from '../../engine/creature';
import { addItem, giveStarter, hasBadge, healParty } from '../../engine/gameState';
import { randInt, weightedPick } from '../../engine/rng';
import { startTrainerBattle, startWildBattle } from '../battleFlow';
import { box, PAL, text } from '../draw';
import { textWidth } from '../font';
import type { Game, World } from '../game';
import type { Button } from '../input';
import type { Scene } from '../scene';
import { H, W } from '../screen';
import { PLAYER_LOOK, characterSprite, drawCreature, prewarmCreatures } from '../sprites';
import { TILE, animateTile, grassOverlay, itemBall, renderZoneLayers, type ZoneLayers } from '../tiles';
import { MenuScene } from './menu';
import { ShopScene } from './shop';
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
  private banner = 0;
  private stepsSinceBattle = 0;
  private bumpCooldown = 0;

  constructor(private readonly game: Game) {
    game.world = this;
    const p = game.s.position;
    this.loadZone(p.zone, p.x, p.y, p.dir);
    this.prewarmParty();
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
    this.npcDirs = new Map(this.zone.npcs.map((n) => [n.id, n.dir]));
    this.redrawMap();
    this.savePosition();
  }

  private redrawMap(): void {
    this.layers = renderZoneLayers(this.zone, (x, y) => this.tile(x, y));
  }

  teleport(zone: ZoneId, x: number, y: number, dir: Dir): void {
    this.loadZone(zone, x, y, dir);
  }

  private savePosition(): void {
    this.game.s.position = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
  }

  private rockBroken(x: number, y: number): boolean {
    return !!this.game.s.flags[`rocher:${this.zone.id}:${x}:${y}`];
  }

  private tile(x: number, y: number): string {
    const map = this.zone.map;
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return '#';
    if (map[y][x] === 'X' && this.rockBroken(x, y)) return '.';
    return map[y][x];
  }

  private npcVisible(npc: Npc): boolean {
    const flags = this.game.s.flags;
    if (npc.hideFlag && flags[npc.hideFlag]) return false;
    if (npc.showFlag && !flags[npc.showFlag]) return false;
    return true;
  }

  private npcAt(x: number, y: number): Npc | undefined {
    return this.zone.npcs.find((n) => n.x === x && n.y === y && this.npcVisible(n));
  }

  /** Un Jinémon de l'équipe connaît-il une attaque du type donné ? */
  private fieldUser(type: 'Eau' | 'Métal'): { name: string; move: string } | null {
    for (const j of this.game.s.party) {
      const slot = j.moves.find((m) => MOVES[m.id].type === type);
      if (slot) return { name: displayName(j), move: MOVES[slot.id].name };
    }
    return null;
  }

  private canEnter(x: number, y: number): boolean {
    const t = this.tile(x, y);
    if (this.npcAt(x, y)) return false;
    if (t === 'w') return hasBadge(this.game.s, 'pluie') && !!this.fieldUser('Eau');
    return !SOLID_TILES.has(t);
  }

  // ── Mise à jour ────────────────────────────────────────────────────────

  update(dt: number): void {
    this.banner = Math.max(0, this.banner - dt);
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
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
    if (this.tile(this.x, this.y) === GRASS_TILE && this.stepsSinceBattle > 2 && this.zone.encounters.length) {
      if (this.game.rng.next() < this.zone.encounterRate) this.wildEncounter();
    }
  }

  private wildEncounter(): void {
    const entry = weightedPick(this.game.rng, this.zone.encounters);
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
    const npc = this.npcAt(tx, ty);
    if (npc) {
      if (npc.look.kind === 'personne') this.npcDirs.set(npc.id, OPPOSITE[this.dir]);
      this.runNpc(npc);
      return;
    }
    const sign = this.zone.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      this.game.say(sign.text);
      return;
    }
    const t = this.tile(tx, ty);
    if (t === 'X') {
      this.crackedRock(tx, ty);
    } else if (t === 'w') {
      this.ford();
    } else if (DECOR_TEXT[t]) {
      this.game.say([DECOR_TEXT[t]]);
    }
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
        game.say(s.lines);
        break;
      case 'soin':
        game.ask([...s.lines, 'Veux-tu que je soigne tes Jinémon ?'], ['Oui', 'Non'], (i) => {
          if (i !== 0) {
            game.say(['Reviens quand tu veux.']);
            return;
          }
          healParty(state);
          state.lastHeal = { zone: this.zone.id, x: this.x, y: this.y, dir: this.dir };
          game.sfx('soin');
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
        this.ancien();
        break;
      case 'gardien': {
        const ok = s.condition === 'starter' ? !!state.flags.starter : state.badges.length >= 3;
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
      case 'objet': {
        addItem(state, s.item, s.quantity);
        state.flags[s.flag] = true;
        game.sfx('valider');
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

  private ancien(): void {
    const game = this.game;
    const state = game.s;
    if (!state.flags.starter) {
      game.say(
        [
          `Ancien : Ah, ${state.playerName}. Approche, mon enfant.`,
          'Ancien : Depuis toujours, notre peuple vit aux côtés des Jinémon, ces créatures nées des forces de la nature et des légendes.',
          "Ancien : Aujourd'hui commence ton initiation. Comme le veut la tradition, je vais te confier ton premier compagnon.",
          'Ancien : Trois Calebasses Sacrées t’attendent. Choisis avec ton cœur.',
        ],
        () =>
          game.scenes.push(
            new StarterScene(game, (speciesId) => {
              const j = giveStarter(state, speciesId, game.rng);
              addItem(state, 'calebasse', 5);
              addItem(state, 'karite', 3);
              game.sfx('capture');
              game.say(
                [
                  `Vous recevez ${displayName(j)} !`,
                  `Ancien : ${displayName(j)} t’a choisi autant que tu l’as choisi.`,
                  'Ancien : Prends aussi ces cinq Calebasses Sacrées et trois pots de Beurre de Karité.',
                  "Ancien : Affaiblis un Jinémon sauvage, puis lance-lui une calebasse : s'il l'accepte, il se joindra à toi.",
                  'Ancien : Ma petite-fille Kady est partie devant avec son propre Jinémon. Elle t’attend sûrement dans la savane.',
                  'Ancien : Plus loin, les Maîtres de Piste gardent les Arènes. Gagne leurs insignes, et peut-être atteindras-tu un jour le Panthéon des Légendes.',
                ],
                () => game.save(),
              );
            }),
          ),
      );
      return;
    }
    const caught = state.dex.caught.length;
    const hints = [
      'La Forge des Terres Rouges se trouve à l’est de la savane. Le Maître Sirafa y attend les Initiés.',
      'Le Marigot des Ancêtres est au nord des Terres Rouges, derrière les rochers fissurés.',
      'Au-delà du gué du marigot s’étend la Forêt Sacrée, puis la piste des chasseurs.',
      'Avec trois insignes, la Falaise des Ancêtres t’est ouverte. La Gardienne du Panthéon t’y attend.',
    ];
    const hint = state.flags['dresseur:assa']
      ? 'Les griots chantent déjà ton nom. Les Légendes du Panthéon se sont éveillées sur la falaise.'
      : hints[Math.min(state.badges.length, 3)];
    game.say([`Ancien : Ton Ginédex compte ${caught} espèce${caught > 1 ? 's' : ''} capturée${caught > 1 ? 's' : ''} sur ${SPECIES.length}.`, `Ancien : ${hint}`]);
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
    const ox = Math.round(-camX);
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
        if (ch === '~' || ch === 'w' || ch === 'K') animateTile(ctx, ch, tx * TILE + ox, ty * TILE + oy, time);
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
      const nx = npc.x * TILE + ox;
      const ny = npc.y * TILE + oy;
      drawables.push({
        y: npc.y * TILE,
        draw: () => {
          if (npc.look.kind === 'personne') {
            shadow(nx, ny);
            ctx.drawImage(characterSprite(npc.look.look, this.npcDirs.get(npc.id) ?? npc.dir, 0), nx, ny - 8);
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

    // Nom de la zone
    if (this.banner > 0) {
      const w = textWidth(this.zone.name) + 24;
      // Glisse depuis le haut, reste affiché, puis remonte.
      const t = Math.min(2.5 - this.banner, this.banner);
      const slide = t < 0.3 ? -24 + (t / 0.3) * 24 : 0;
      box(ctx, 4, 4 + Math.round(slide), w, 20);
      text(ctx, this.zone.name, 4 + w / 2, 8 + Math.round(slide), { align: 'center', shadow: PAL.shadow });
    }
  }
}
