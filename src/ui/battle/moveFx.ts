// Chorégraphies des attaques : chaque attaque a sa mise en scène (le lanceur s'élance,
// un projectile file, un souffle jaillit, des rochers tombent…), dans les couleurs de son type.
// L'animation annonce le moment de l'impact : c'est là que la scène applique les dégâts.
import { MOVES, type MoveId } from '../../data/moves';
import type { ElementType } from '../../data/types';
import type { Side } from '../../engine/combat';
import type { FxSound } from '../audio';
import { Particles, rnd } from './particles';

type Ctx = CanvasRenderingContext2D;

export interface Point {
  x: number;
  y: number;
}

/** Repères d'un Jinémon à l'écran. */
export interface Anchor {
  center: Point;
  foot: Point;
  head: Point;
  /** Taille du sprite (px). */
  size: number;
}

/** Ce que l'animation demande à la scène de combat. */
export interface FxHost {
  readonly particles: Particles;
  anchor(side: Side): Anchor;
  shake(amplitude: number, duration: number): void;
  flash(color: string, alpha: number, duration: number): void;
  /** Voile coloré sur le décor (l'écran s'assombrit, rougeoie…). */
  veil(color: string, alpha: number, duration: number): void;
  /** Ondulation du décor (attaques Psy). */
  warp(amount: number, duration: number): void;
  /** La scène est-elle sombre (nuit, grotte, voile) ? */
  dark(): boolean;
  sound(kind: FxSound): void;
}

/** Déplacement et apparence d'un Jinémon pendant l'animation. */
export interface Pose {
  dx: number;
  dy: number;
  sx?: number;
  sy?: number;
  white?: number;
  alpha?: number;
  /** Traînée d'images rémanentes (élan rapide). */
  trail?: boolean;
  /** Halo coloré autour du sprite. */
  glow?: string;
}

export interface Palette {
  main: string;
  light: string;
  dark: string;
  glow: string;
  spark: string;
}

export const PALETTES: Record<ElementType, Palette> = {
  Normal: { main: '#f0e8d8', light: '#ffffff', dark: '#a89880', glow: '#fff4d0', spark: '#f8d848' },
  Feu: { main: '#ff8a20', light: '#fff0a0', dark: '#c8301a', glow: '#ffa040', spark: '#ffe060' },
  Eau: { main: '#3a9ae8', light: '#c8ecff', dark: '#1a4a9a', glow: '#58b8ff', spark: '#ffffff' },
  Plante: { main: '#5ac838', light: '#c8f080', dark: '#2a7a20', glow: '#80e050', spark: '#f0f8a0' },
  Terre: { main: '#c8884a', light: '#e8c890', dark: '#6a3a1a', glow: '#e8a860', spark: '#f0d8a0' },
  Roche: { main: '#a89c88', light: '#d8d0c0', dark: '#5a5246', glow: '#c8b8a0', spark: '#f0e8d8' },
  Métal: { main: '#b8c4d0', light: '#ffffff', dark: '#5a6470', glow: '#c8d8f0', spark: '#ffffff' },
  Vol: { main: '#c8e4f8', light: '#ffffff', dark: '#6a9ac8', glow: '#d8ecff', spark: '#ffffff' },
  Esprit: { main: '#f8d860', light: '#fffbe0', dark: '#c89020', glow: '#ffd870', spark: '#ffffff' },
  Spectre: { main: '#8a6ac8', light: '#d8c8ff', dark: '#3a2458', glow: '#9a70e0', spark: '#e8e0ff' },
  Ténèbres: { main: '#5a3480', light: '#a878d8', dark: '#140a1e', glow: '#7a3aa8', spark: '#d8a8ff' },
  Psy: { main: '#f070c0', light: '#ffd0f0', dark: '#9a2a7a', glow: '#ff80d0', spark: '#ffffff' },
  Dragon: { main: '#7a5ae8', light: '#e0d0ff', dark: '#2a1a7a', glow: '#8a70ff', spark: '#80e0ff' },
  Insecte: { main: '#9ab828', light: '#e0f080', dark: '#4a5a14', glow: '#b8d838', spark: '#f8f8c0' },
};

// ── Motifs pixel art ─────────────────────────────────────────────────────

const FLAME = ['...y...', '..yy...', '..yoy..', '.yooy..', '.yoroy.', 'yorrroy', 'orrrrro', '.orrro.', '..ooo..'];
const FLAME_S = ['..y..', '.yoy.', 'yoroy', 'orrro', '.ooo.'];
const LEAF_A = ['...gGG', '..gGGG', '.gGGG.', 'gGGG..', 'GG....'];
const LEAF_B = ['GG....', 'gGGG..', '.gGGG.', '..gGGG', '...gGG'];
const ROCK = ['.rRRr..', 'rRRRRr.', 'rRRRRRd', 'rRRRRdd', '.rRddd.', '..ddd..'];
const ROCK_S = ['.rR.', 'rRRd', '.dd.'];
const ORB = ['.pPPp.', 'pPwPPp', 'PwPPPP', 'PPPPPP', 'pPPPPp', '.pPPp.'];
const FEATHER = ['....w', '...ww', '..wW.', '.wW..', 'wW...'];
const SHARD = ['.w.', 'wWw', 'wWd', '.d.'];
const GEM = ['..g..', '.gGg.', 'gGwGg', '.gGg.', '..g..'];
const BUG = ['w.w', '.b.', '.B.'];
const GHOST = ['..ppp..', '.pPPPp.', 'pPwPwPp', 'pPPPPPp', 'pPPPPPp', 'pPpPpPp', 'p.p.p.p'];
const ANVIL = [
  'ddddddddddddd.',
  'dmmmmmmmmmmmmd',
  '.dmmmmmmmmmmd.',
  '..dddmmmmddd..',
  '....dmmmmd....',
  '...dmmmmmmd...',
  '..dmmmmmmmmd..',
  '..dddddddddd..',
];
const WEB = [
  'w...w...w',
  '.w..w..w.',
  '..wwwww..',
  'wwwdwdwww',
  '..wwwww..',
  '.w..w..w.',
  'w...w...w',
];
const MASK = ['.mmmmm.', 'mmmmmmm', 'mkmmmkm', 'mmmmmmm', '.mmrmm.', '..mmm..'];
const HAND = ['p.p.p.', 'p.p.p.', 'pppppp', 'pppppp', '.pppp.', '.pppp.'];

function stamp(ctx: Ctx, rows: string[], x: number, y: number, pal: Record<string, string>, scale = 1): void {
  const x0 = Math.round(x - (rows[0].length * scale) / 2);
  const y0 = Math.round(y - (rows.length * scale) / 2);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x0 + i * scale, y0 + j * scale, scale, scale);
    }
  });
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, color: string): void {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  ctx.fillStyle = color;
  const w = Math.max(1, Math.round(width));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w);
  }
}

function ellipseRing(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, thickness = 1): void {
  ctx.fillStyle = color;
  const n = Math.max(16, Math.round((rx + ry) * 3));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), thickness, thickness);
  }
}

function disc(ctx: Ctx, x: number, y: number, r: number, color: string, squash = 1): void {
  ctx.fillStyle = color;
  const ry = Math.max(0.5, r * squash);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const half = Math.round(r * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    ctx.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
  }
}

/**
 * Dessin lumineux : par mélange additif quand la scène est sombre (nuit, voile), pour que
 * l'énergie éclaire ; en couleurs franches sur un ciel clair, où l'addition virerait au blanc.
 */
let darkScene = false;
function glowing(ctx: Ctx, draw: () => void): void {
  if (darkScene) ctx.globalCompositeOperation = 'lighter';
  draw();
  ctx.globalCompositeOperation = 'source-over';
}

// ── Description des attaques ─────────────────────────────────────────────

type Spec =
  | { style: 'contact'; motif: 'coup' | 'charge' | 'bond' | 'corne' | 'ruade' | 'griffe' | 'morsure' | 'bec' | 'pique' | 'queue' | 'lame' | 'marteau' | 'embuscade' | 'ailes' | 'courroux' }
  | { style: 'projectile'; motif: 'boule' | 'graine' | 'feuille' | 'seve' | 'boue' | 'caillou' | 'limaille' | 'etincelle' | 'follet' | 'braise' | 'orbe' | 'ame' | 'dard' | 'toile' | 'luciole' | 'miroir' | 'glyphe' | 'voile'; count?: number }
  | { style: 'souffle'; motif: 'flammes' | 'eau' | 'vent' | 'dragon' }
  | { style: 'rayon'; motif: 'lueur' | 'psy' | 'soleil' }
  | { style: 'regard'; motif: 'percant' | 'malefique' | 'petrifiant' | 'hypnotique' }
  | { style: 'chute'; motif: 'rochers' | 'tombeau' | 'dalle' | 'meteores' | 'enclume' | 'lumiere' }
  | { style: 'sol'; motif: 'fissure' | 'racines' | 'termitiere' | 'seisme' | 'ombre' | 'etreinte' }
  | { style: 'vague'; motif: 'vague' | 'crue' }
  | { style: 'zone'; motif: 'tourbillon' | 'fournaise' | 'cyclone' | 'eclipse' | 'mictlan' | 'moisson' }
  | { style: 'nuee'; motif: 'criquets' | 'essaim' | 'plumes' | 'ames' | 'renards' }
  | { style: 'onde'; motif: 'cri' | 'chant' | 'murmure' | 'psy' | 'lamentation' | 'rire' }
  | { style: 'malefice'; motif: 'spores' | 'feuilles' | 'brume' | 'notes' | 'malediction' | 'ruse' }
  | { style: 'aura'; motif: 'danse' | 'armure' | 'soin' | 'pluie' | 'masques' | 'ecailles' | 'vent' | 'sable' | 'forge' };

const FX: Record<MoveId, Spec> = {
  coupDePatte: { style: 'contact', motif: 'coup' },
  chargeBrousse: { style: 'contact', motif: 'charge' },
  criDeGuerre: { style: 'onde', motif: 'cri' },
  regardPenetrant: { style: 'regard', motif: 'percant' },
  ruseLievre: { style: 'malefice', motif: 'ruse' },
  bondLievre: { style: 'contact', motif: 'bond' },
  coupDeCorne: { style: 'contact', motif: 'corne' },
  ruadeZebu: { style: 'contact', motif: 'ruade' },
  danseChasseurs: { style: 'aura', motif: 'danse' },
  palabre: { style: 'aura', motif: 'soin' },
  rueeSauvage: { style: 'contact', motif: 'charge' },
  pousseMil: { style: 'projectile', motif: 'graine', count: 3 },
  racineEpineuse: { style: 'sol', motif: 'racines' },
  etreinteBaobab: { style: 'sol', motif: 'etreinte' },
  berceuseFeuilles: { style: 'malefice', motif: 'feuilles' },
  sporesToxiques: { style: 'malefice', motif: 'spores' },
  seveCollante: { style: 'projectile', motif: 'seve' },
  seveNourriciere: { style: 'projectile', motif: 'seve', count: 2 },
  lameRonier: { style: 'projectile', motif: 'feuille', count: 4 },
  moissonSacree: { style: 'zone', motif: 'moisson' },
  griffeArgile: { style: 'contact', motif: 'griffe' },
  piegeBoue: { style: 'projectile', motif: 'boue', count: 2 },
  armureBanco: { style: 'aura', motif: 'armure' },
  fissureLaterite: { style: 'sol', motif: 'fissure' },
  assautTermitiere: { style: 'sol', motif: 'termitiere' },
  grondementFalaise: { style: 'sol', motif: 'seisme' },
  gicleeSource: { style: 'souffle', motif: 'eau' },
  vagueFleuve: { style: 'vague', motif: 'vague' },
  chantAbysses: { style: 'onde', motif: 'chant' },
  brumeSoporifique: { style: 'malefice', motif: 'brume' },
  pluieHivernage: { style: 'aura', motif: 'pluie' },
  tourbillonMarigot: { style: 'zone', motif: 'tourbillon' },
  crueGrandFleuve: { style: 'vague', motif: 'crue' },
  murmureAncetres: { style: 'onde', motif: 'murmure' },
  miroirEmeraude: { style: 'projectile', motif: 'miroir', count: 3 },
  danseMasques: { style: 'aura', motif: 'masques' },
  paroleGriot: { style: 'malefice', motif: 'notes' },
  souffleVital: { style: 'aura', motif: 'soin' },
  voileGenies: { style: 'projectile', motif: 'voile', count: 3 },
  lueurSacree: { style: 'rayon', motif: 'lueur' },
  colereAncetres: { style: 'chute', motif: 'lumiere' },
  etincelleForge: { style: 'projectile', motif: 'etincelle', count: 3 },
  feuBrousse: { style: 'souffle', motif: 'flammes' },
  flammeFollette: { style: 'projectile', motif: 'follet', count: 3 },
  souffletForge: { style: 'aura', motif: 'forge' },
  brulureSahel: { style: 'rayon', motif: 'soleil' },
  braiseAncestrale: { style: 'projectile', motif: 'braise', count: 4 },
  fournaiseSacree: { style: 'zone', motif: 'fournaise' },
  limaille: { style: 'projectile', motif: 'limaille', count: 6 },
  vifArgent: { style: 'contact', motif: 'bond' },
  griffeLaiton: { style: 'contact', motif: 'griffe' },
  lameFerForge: { style: 'contact', motif: 'lame' },
  marteauForgeron: { style: 'contact', motif: 'marteau' },
  chuteEnclume: { style: 'chute', motif: 'enclume' },
  coupDeBec: { style: 'contact', motif: 'bec' },
  ventHarmattan: { style: 'souffle', motif: 'vent' },
  piqueCalao: { style: 'contact', motif: 'pique' },
  ailesTonnerre: { style: 'contact', motif: 'ailes' },
  plumesVirevoltantes: { style: 'nuee', motif: 'plumes' },
  ventArriere: { style: 'aura', motif: 'vent' },
  cycloneCeleste: { style: 'zone', motif: 'cyclone' },
  queueFouettante: { style: 'contact', motif: 'queue' },
  souffleDragon: { style: 'souffle', motif: 'dragon' },
  griffeDraconique: { style: 'contact', motif: 'griffe' },
  danseEcailles: { style: 'aura', motif: 'ecailles' },
  courrouxDraconique: { style: 'contact', motif: 'courroux' },
  souffleNinkiNanka: { style: 'souffle', motif: 'dragon' },
  larcin: { style: 'contact', motif: 'coup' },
  morsureHyene: { style: 'contact', motif: 'morsure' },
  ricanement: { style: 'onde', motif: 'rire' },
  embuscadeNocturne: { style: 'contact', motif: 'embuscade' },
  regardMalefique: { style: 'regard', motif: 'malefique' },
  crocsNuit: { style: 'contact', motif: 'morsure' },
  eclipseDevorante: { style: 'zone', motif: 'eclipse' },
  jetCaillou: { style: 'projectile', motif: 'caillou' },
  tombeauPierre: { style: 'chute', motif: 'tombeau' },
  regardPetrifiant: { style: 'regard', motif: 'petrifiant' },
  eboulement: { style: 'chute', motif: 'rochers' },
  dalleLaterite: { style: 'chute', motif: 'dalle' },
  pluieMeteores: { style: 'chute', motif: 'meteores' },
  piqureTermite: { style: 'contact', motif: 'bec' },
  dardVenimeux: { style: 'projectile', motif: 'dard', count: 2 },
  toileAnansi: { style: 'projectile', motif: 'toile' },
  lumiereAdze: { style: 'projectile', motif: 'luciole', count: 5 },
  nueeCriquets: { style: 'nuee', motif: 'criquets' },
  mandibules: { style: 'contact', motif: 'morsure' },
  essaimDevastateur: { style: 'nuee', motif: 'essaim' },
  frissonTombe: { style: 'projectile', motif: 'ame', count: 2 },
  ombreRampante: { style: 'sol', motif: 'ombre' },
  maledictionTertre: { style: 'malefice', motif: 'malediction' },
  lamentation: { style: 'onde', motif: 'lamentation' },
  rondeAmes: { style: 'nuee', motif: 'ames' },
  appelMictlan: { style: 'zone', motif: 'mictlan' },
  ondeMentale: { style: 'onde', motif: 'psy' },
  regardHypnotique: { style: 'regard', motif: 'hypnotique' },
  illusionKitsune: { style: 'nuee', motif: 'renards' },
  lectureSable: { style: 'aura', motif: 'sable' },
  enigmeSphinx: { style: 'projectile', motif: 'glyphe', count: 3 },
  chocPsychique: { style: 'rayon', motif: 'psy' },
  jugementRenardPale: { style: 'rayon', motif: 'psy' },
};

/** Mise en scène d'une attaque (exposée pour les tests). */
export function specOf(moveId: MoveId | null): Spec {
  return moveId ? FX[moveId] : { style: 'contact', motif: 'coup' };
}

// ── Animation ────────────────────────────────────────────────────────────

interface Choreo {
  duration: number;
  impact: number;
  update(a: MoveAnim): void;
  back?(a: MoveAnim, ctx: Ctx): void;
  front?(a: MoveAnim, ctx: Ctx): void;
  pose?(a: MoveAnim, side: Side): Pose | null;
}

/** Durée de la charge des attaques divines, avant la chorégraphie. */
const CHARGE = 0.75;

export class MoveAnim {
  /** Temps écoulé (s). */
  t = 0;
  /** Temps écoulé depuis la dernière image (s). */
  dt = 0;
  /** L'attaque a raté : pas d'impact sur la cible, elle esquive. */
  missed = false;
  readonly type: ElementType;
  readonly pal: Palette;
  readonly power: number;
  readonly divine: boolean;
  readonly spec: Spec;
  private readonly choreo: Choreo;
  private readonly lead: number;
  private readonly fired = new Set<string>();

  constructor(
    readonly host: FxHost,
    readonly moveId: MoveId | null,
    readonly attacker: Side,
    readonly target: Side,
  ) {
    const move = moveId ? MOVES[moveId] : null;
    this.type = move?.type ?? 'Normal';
    this.pal = PALETTES[this.type];
    this.power = move?.power ?? 50;
    this.divine = move?.tier === 'divin';
    this.spec = specOf(moveId);
    this.choreo = CHOREOS[this.spec.style](this.spec as never);
    this.lead = this.divine ? CHARGE : 0;
  }

  /** Temps local de la chorégraphie (après la charge divine). */
  get ct(): number {
    return this.t - this.lead;
  }

  get impact(): number {
    return this.lead + this.choreo.impact;
  }

  get duration(): number {
    return this.lead + this.choreo.duration;
  }

  get finished(): boolean {
    return this.t >= this.duration;
  }

  /** Force de l'attaque (0,5 pour les petites, jusqu'à 1,5 pour les divines). */
  get strength(): number {
    return Math.min(1.5, 0.5 + this.power / 100);
  }

  get from(): Anchor {
    return this.host.anchor(this.attacker);
  }

  get to(): Anchor {
    return this.host.anchor(this.target);
  }

  /** Point visé : à côté de la cible si l'attaque rate. */
  get aim(): Point {
    const c = this.to.center;
    return this.missed ? { x: c.x + (this.target === 'adversaire' ? 18 : -18), y: c.y - 4 } : c;
  }

  get p(): Particles {
    return this.host.particles;
  }

  /** Exécute `fn` une seule fois, quand le temps local atteint `at`. */
  once(key: string, at: number, fn: () => void): void {
    if (this.ct >= at && !this.fired.has(key)) {
      this.fired.add(key);
      fn();
    }
  }

  update(dt: number): void {
    this.dt = dt;
    this.t += dt;
    if (this.t < this.lead) this.charge();
    else this.choreo.update(this);
  }

  pose(side: Side): Pose | null {
    if (this.t < this.lead) {
      if (side !== this.attacker) return null;
      const u = this.t / this.lead;
      return { dx: 0, dy: Math.round(-Math.sin(u * Math.PI) * 3), white: u > 0.85 ? (u - 0.85) * 5 : 0, glow: this.pal.glow };
    }
    return this.choreo.pose?.(this, side) ?? null;
  }

  renderBack(ctx: Ctx): void {
    darkScene = this.host.dark();
    if (this.t >= this.lead) this.choreo.back?.(this, ctx);
  }

  renderFront(ctx: Ctx): void {
    darkScene = this.host.dark();
    if (this.t < this.lead) {
      // Cercle runique sous le lanceur pendant la charge.
      const u = this.t / this.lead;
      const f = this.from.foot;
      glowing(ctx, () => {
        ellipseRing(ctx, f.x, f.y - 2, 10 + u * 22, 4 + u * 7, this.pal.glow, 2);
        ellipseRing(ctx, f.x, f.y - 2, 6 + u * 14, 2 + u * 5, this.pal.light);
      });
      return;
    }
    this.choreo.front?.(this, ctx);
  }

  /** Charge des attaques divines : l'écran s'assombrit, l'énergie converge vers le lanceur. */
  private charge(): void {
    const c = this.from.center;
    if (!this.fired.has('charge')) {
      this.fired.add('charge');
      this.host.veil('#06040c', 0.55, this.lead + 0.9);
      this.host.sound('charge');
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 30;
      this.p.add({
        x: c.x + Math.cos(a) * r,
        y: c.y + Math.sin(a) * r * 0.7,
        vx: -Math.cos(a) * r * 2.6,
        vy: -Math.sin(a) * r * 0.7 * 2.6,
        life: 0.38,
        size: 2,
        sizeEnd: 1,
        colors: [this.pal.light, this.pal.glow, this.pal.main],
        shape: i % 2 ? 'etoile' : 'point',
        glow: true,
      });
    }
    if (this.t + this.dt >= this.lead && !this.fired.has('chargeFlash')) {
      this.fired.add('chargeFlash');
      this.host.flash('#ffffff', 0.7, 0.25);
    }
  }

  // ── Effets partagés ───────────────────────────────────────────────────

  /** Gerbe d'impact aux couleurs du type, à l'endroit visé. */
  burst(scale = 1, at?: Point): void {
    const c = at ?? this.aim;
    if (this.missed && !at) {
      // Le coup fend l'air : une simple bouffée de poussière.
      for (let i = 0; i < 6; i++) this.p.add({ x: c.x, y: c.y + 14, vx: (rnd(i, 3) - 0.5) * 50, vy: -10 - rnd(i, 4) * 20, life: 0.4, size: 2, colors: ['#e8dcc0', '#c8b898'], drag: 3 });
      return;
    }
    const n = Math.round(10 * scale);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(i, 1);
      const v = (60 + rnd(i, 2) * 70) * scale;
      this.p.add({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v * 0.8,
        drag: 5,
        life: 0.35 + rnd(i, 5) * 0.2,
        size: 2,
        sizeEnd: 1,
        colors: [this.pal.light, this.pal.main, this.pal.dark],
        shape: i % 3 === 0 ? 'trait' : 'point',
        glow: true,
      });
    }
    this.typeDebris(c, scale);
  }

  /** Débris propres au type : braises, gouttes, feuilles, cailloux… */
  typeDebris(c: Point, scale = 1): void {
    const pal = this.pal;
    const n = Math.round(6 * scale);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (rnd(i, 7) - 0.5) * 2.6;
      const v = 40 + rnd(i, 8) * 50;
      const base = { x: c.x + (rnd(i, 9) - 0.5) * 12, y: c.y + (rnd(i, 10) - 0.5) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
      switch (this.type) {
        case 'Feu':
          this.p.add({ ...base, ay: -30, drag: 2, life: 0.7, size: 2, sizeEnd: 1, colors: ['#fff0a0', '#ffb030', '#e84a1a', '#5a4a48'], glow: true, wobble: 2 });
          break;
        case 'Eau':
          this.p.add({ ...base, ay: 260, life: 0.6, size: 2, colors: ['#ffffff', '#a8dcf8', '#3a86c8'] });
          break;
        case 'Plante':
          this.p.add({ ...base, ay: 60, drag: 2, life: 0.9, shape: 'motif', rows: i % 2 ? LEAF_A : LEAF_B, palette: { g: '#90e058', G: '#3a8a28' }, colors: ['#fff'], wobble: 3 });
          break;
        case 'Terre':
        case 'Roche':
          this.p.add({ ...base, ay: 280, life: 0.7, shape: 'motif', rows: ROCK_S, palette: { r: pal.main, R: pal.light, d: pal.dark }, colors: ['#fff'] });
          break;
        case 'Métal':
          this.p.add({ ...base, vx: base.vx * 1.6, vy: base.vy * 1.6, ay: 200, life: 0.45, size: 1, shape: 'trait', colors: ['#ffffff', '#fff0a0', '#c8c8c8'], glow: true });
          break;
        case 'Vol':
          this.p.add({ ...base, ay: 20, drag: 2, life: 1, shape: 'motif', rows: FEATHER, palette: { w: '#ffffff', W: '#a8c8e8' }, colors: ['#fff'], wobble: 4 });
          break;
        case 'Insecte':
          this.p.add({ ...base, drag: 1, life: 0.8, shape: 'motif', rows: BUG, palette: { w: '#e0f0c0', b: pal.main, B: pal.dark }, colors: ['#fff'], wobble: 3, wobbleFreq: 6 });
          break;
        case 'Spectre':
        case 'Ténèbres':
          this.p.add({ ...base, ay: -40, drag: 2, life: 0.9, size: 3, sizeEnd: 0, shape: 'disque', colors: [pal.light, pal.main, pal.dark], wobble: 3, glow: this.type === 'Spectre' });
          break;
        case 'Psy':
        case 'Esprit':
          this.p.add({ ...base, drag: 3, life: 0.8, size: 1, shape: 'etoile', colors: ['#ffffff', pal.light, pal.main], glow: true, flicker: true });
          break;
        case 'Dragon':
          this.p.add({ ...base, ay: -40, drag: 2, life: 0.7, shape: 'motif', rows: FLAME_S, palette: { y: '#e8d0ff', o: pal.main, r: pal.dark }, colors: ['#fff'], wobble: 2 });
          break;
        default:
          this.p.add({ ...base, drag: 4, life: 0.5, size: 1, shape: 'etoile', colors: ['#ffffff', pal.spark], glow: true });
      }
    }
  }

  /** Bouffée de poussière au sol, sous la cible. */
  dust(at: Point, n = 8, spread = 30): void {
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      this.p.add({ x: at.x + dir * rnd(i, 21) * 8, y: at.y - 2, vx: dir * (20 + rnd(i, 22) * spread), vy: -8 - rnd(i, 23) * 14, drag: 3, life: 0.6, size: 3, sizeEnd: 5, shape: 'disque', colors: ['#f0e4c8', '#d8c8a8', '#b8a888'] });
    }
  }

  /** Orbes qui reviennent de la cible vers le lanceur (drain). */
  drainBack(n = 6): void {
    const a = this.to.center;
    const b = this.from.center;
    for (let i = 0; i < n; i++) {
      this.p.add({
        x: a.x + (rnd(i, 31) - 0.5) * 20,
        y: a.y + (rnd(i, 32) - 0.5) * 16,
        vx: (b.x - a.x) * 1.4,
        vy: (b.y - a.y) * 1.4 - 30,
        ay: 60,
        delay: i * 0.05,
        life: 0.7,
        size: 2,
        shape: 'disque',
        colors: ['#ffffff', '#b8f080', '#58c838'],
        glow: true,
      });
    }
  }
}

// ── Chorégraphies ────────────────────────────────────────────────────────

type ContactSpec = Extract<Spec, { style: 'contact' }>;

/** Corps à corps : le lanceur prend son élan, fonce sur la cible, frappe et revient. */
function contact(spec: ContactSpec): Choreo {
  const m = spec.motif;
  const heavy = m === 'charge' || m === 'ruade' || m === 'courroux' || m === 'marteau';
  const windup = m === 'pique' ? 0.3 : m === 'marteau' ? 0.3 : m === 'embuscade' ? 0.25 : 0.18;
  const dash = m === 'bond' ? 0.1 : 0.14;
  const impact = windup + dash;
  return {
    duration: impact + 0.5,
    impact,
    update(a) {
      a.once('elan', windup * 0.6, () => a.host.sound('elan'));
      a.once('impact', impact, () => {
        const scale = heavy ? 1.4 : 1;
        a.burst(scale);
        if (!a.missed) {
          if (heavy) a.dust(a.to.foot, 10, 40);
          if (m === 'marteau') a.host.shake(5, 0.35);
          if (m === 'ailes') a.host.sound('eclair');
          a.host.sound(heavy || a.power >= 80 ? 'impactFort' : 'impact');
        }
      });
      if (m === 'bec') a.once('impact2', impact + 0.12, () => a.burst(0.6));
      if (m === 'courroux' && a.ct < impact) {
        // Aura de fureur draconique pendant l'élan.
        const c = a.from.center;
        a.p.add({ x: c.x + (Math.random() - 0.5) * 30, y: c.y + 10, vy: -60, life: 0.4, shape: 'motif', rows: FLAME_S, palette: { y: '#e8d0ff', o: a.pal.main, r: a.pal.dark }, colors: ['#fff'] });
      }
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      const t = a.ct;
      const from = a.from.center;
      const to = a.to.center;
      const vx = to.x - from.x;
      const vy = to.y - from.y;
      const dist = Math.hypot(vx, vy);
      const reach = Math.min(0.5, 70 / dist);
      const back = -8 / dist;
      if (m === 'embuscade') {
        // Disparaît dans l'ombre, frappe, puis réapparaît.
        const alpha = t < windup ? 1 - t / windup : t < impact + 0.2 ? 0 : clamp01((t - impact - 0.2) / 0.25);
        return { dx: 0, dy: 0, alpha };
      }
      if (m === 'pique' && t < windup) {
        const u = t / windup;
        return { dx: 0, dy: -ease(u) * 90, alpha: 1 - u * 0.3, trail: true };
      }
      if (m === 'marteau' && t < windup) {
        const u = t / windup;
        return { dx: vx * back * u, dy: -Math.sin(u * Math.PI * 0.5) * 26, sx: 1 - u * 0.06, sy: 1 + u * 0.08 };
      }
      let k: number;
      let lift = 0;
      if (t < windup) {
        const u = t / windup;
        k = back * ease(u);
        return { dx: vx * k, dy: vy * k, sx: 1 + u * 0.06, sy: 1 - u * 0.08 };
      }
      if (t < impact) {
        const u = (t - windup) / dash;
        k = lerp(back, reach, u * u);
        if (m === 'bond' || m === 'pique' || m === 'marteau') lift = -Math.sin(u * Math.PI) * (m === 'bond' ? 14 : 0);
        if (m === 'pique' || m === 'marteau') lift += (1 - u) * (m === 'pique' ? -90 : -26);
        return { dx: vx * k, dy: vy * k + lift, sx: 0.94, sy: 1.08, trail: true };
      }
      const after = t - impact;
      if (after < 0.12) return { dx: vx * reach, dy: vy * reach, sx: 1.06, sy: 0.92 };
      const u = clamp01((after - 0.12) / 0.3);
      k = reach * (1 - ease(u));
      return { dx: vx * k, dy: vy * k };
    },
    front(a, ctx) {
      const t = a.ct - impact;
      if (a.missed || t < -0.12 || t > 0.4) return;
      const c = a.aim;
      const pal = a.pal;
      const toward = a.attacker === 'joueur' ? 1 : -1;
      switch (m) {
        case 'griffe':
        case 'lame': {
          // Entailles qui se tracent l'une après l'autre.
          const n = m === 'lame' ? 1 : 3;
          for (let k = 0; k < n; k++) {
            const u = clamp01((t + 0.1 - k * 0.05) / 0.12);
            if (u <= 0 || t > 0.3) continue;
            const len = m === 'lame' ? 44 : 30;
            const ox = (k - (n - 1) / 2) * 9;
            const x0 = c.x - (len / 2) * toward + ox;
            const y0 = c.y - len / 2;
            const x1 = lerp(x0, x0 + len * toward, u);
            const y1 = lerp(y0, y0 + len, u);
            line(ctx, x0, y0, x1, y1, m === 'lame' ? 3 : 2, pal.dark);
            glowing(ctx, () => line(ctx, x0, y0 - 1, x1, y1 - 1, m === 'lame' ? 2 : 1, a.type === 'Normal' || a.type === 'Terre' ? '#ffffff' : pal.light));
          }
          break;
        }
        case 'morsure': {
          // Deux mâchoires qui se referment.
          const u = clamp01((t + 0.12) / 0.12);
          const gap = (1 - u) * 16;
          for (const dir of [-1, 1]) {
            const y = c.y + dir * (gap + 3);
            for (let i = -3; i <= 3; i++) {
              const x = c.x + i * 5;
              ctx.fillStyle = '#ffffff';
              for (let h = 0; h < 6; h++) {
                const w = Math.max(1, 4 - Math.floor(h * 0.7));
                ctx.fillRect(Math.round(x - w / 2), Math.round(y + (dir < 0 ? h : -h)), w, 1);
              }
            }
            ctx.fillStyle = a.type === 'Ténèbres' ? '#3a1a48' : '#5a3a2a';
            ctx.fillRect(Math.round(c.x - 18), Math.round(y + (dir < 0 ? -2 : 1)), 36, 2);
          }
          break;
        }
        case 'queue': {
          const u = clamp01((t + 0.1) / 0.2);
          for (let s = 0; s < 24 * u; s++) {
            const ang = Math.PI * 0.9 + (s / 24) * Math.PI * 1.2;
            glowing(ctx, () => disc(ctx, c.x + Math.cos(ang) * 22 * toward, c.y + 6 + Math.sin(ang) * 12, 1.5, pal.light));
          }
          break;
        }
        case 'ailes': {
          if (t < 0 || t > 0.3) break;
          // Éclairs zigzagants autour de la cible.
          for (let k = 0; k < 3; k++) {
            let x = c.x - 20 + k * 20 + Math.sin(a.t * 50 + k) * 3;
            let y = c.y - 34;
            glowing(ctx, () => {
              for (let s = 0; s < 6; s++) {
                const nx = x + (rnd(k * 7 + s, Math.floor(a.t * 20)) - 0.5) * 14;
                const ny = y + 10;
                line(ctx, x, y, nx, ny, 2, '#fff070');
                line(ctx, x, y, nx, ny, 1, '#ffffff');
                x = nx;
                y = ny;
              }
            });
          }
          break;
        }
        default: {
          if (t < 0 || t > 0.22) break;
          // Étoile d'impact blanche puis lignes de choc.
          const u = t / 0.22;
          const r = 6 + u * (m === 'charge' || m === 'courroux' || m === 'ruade' ? 22 : 14);
          glowing(ctx, () => {
            disc(ctx, c.x, c.y, Math.max(1, (1 - u) * 9), '#ffffff');
            for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2 + 0.3;
              line(ctx, c.x + Math.cos(ang) * r * 0.6, c.y + Math.sin(ang) * r * 0.6, c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, 1, i % 2 ? pal.spark : '#ffffff');
            }
          });
        }
      }
    },
  };
}

type ProjectileSpec = Extract<Spec, { style: 'projectile' }>;

/** Projectiles : le lanceur se ramasse, puis tire un ou plusieurs projectiles en arc. */
function projectile(spec: ProjectileSpec): Choreo {
  const m = spec.motif;
  const count = spec.count ?? 1;
  const gap = m === 'luciole' || m === 'limaille' ? 0.05 : 0.08;
  const travel = m === 'boue' || m === 'caillou' ? 0.38 : m === 'follet' || m === 'ame' || m === 'luciole' ? 0.42 : 0.3;
  const launch = 0.16;
  const impact = launch + (count - 1) * gap + travel;
  const arc = m === 'boue' || m === 'caillou' || m === 'braise' ? 36 : m === 'graine' || m === 'seve' ? 20 : 8;
  const drain = m === 'luciole' || m === 'voile' || (m === 'seve' && count === 2);
  const position = (a: MoveAnim, i: number): { x: number; y: number; u: number } | null => {
    const u = (a.ct - launch - i * gap) / travel;
    if (u < 0 || u > 1) return null;
    const s = a.from.head;
    const e = a.aim;
    const wobble = m === 'follet' || m === 'ame' || m === 'luciole' ? Math.sin(u * Math.PI * 3 + i) * 10 : 0;
    const spread = count > 1 ? (i - (count - 1) / 2) * 6 * Math.sin(u * Math.PI) : 0;
    return { x: lerp(s.x, e.x, u) + spread, y: lerp(s.y, e.y, u) - Math.sin(u * Math.PI) * arc + wobble, u };
  };
  return {
    duration: impact + (drain ? 0.9 : 0.45),
    impact,
    update(a) {
      for (let i = 0; i < count; i++) {
        a.once(`tir${i}`, launch + i * gap, () => a.host.sound(m === 'etincelle' || m === 'braise' || m === 'follet' ? 'feu' : 'lancer'));
        const p = position(a, i);
        if (p && m !== 'limaille') {
          // Traînée derrière chaque projectile.
          a.p.add({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0.25, size: 2, sizeEnd: 0, colors: [a.pal.light, a.pal.main], glow: a.type !== 'Terre' && a.type !== 'Roche' });
        }
        a.once(`arrivee${i}`, launch + i * gap + travel, () => {
          a.burst(i === count - 1 ? 1 : 0.5);
          if (m === 'boue' && !a.missed) a.dust(a.to.foot, 6, 20);
          if (!a.missed && i === count - 1) a.host.sound(a.power >= 80 ? 'impactFort' : 'impact');
        });
      }
      if (drain) a.once('drain', impact + 0.2, () => !a.missed && a.drainBack());
    },
    back(a, ctx) {
      // Flaque de boue ou toile restées sur la cible.
      const t = a.ct - impact;
      if (a.missed || t < 0) return;
      const f = a.to.foot;
      if (m === 'boue') disc(ctx, f.x, f.y - 1, 22 * clamp01(t * 5), '#6a4a2a', 0.3);
    },
    front(a, ctx) {
      const pal = a.pal;
      for (let i = 0; i < count; i++) {
        const p = position(a, i);
        if (!p) continue;
        const spin = Math.floor(a.t * 16 + i) % 2;
        switch (m) {
          case 'boule':
          case 'etincelle':
          case 'braise':
            glowing(ctx, () => disc(ctx, p.x, p.y, m === 'boule' ? 5 : 3, '#ff8a20'));
            stamp(ctx, m === 'boule' ? FLAME : FLAME_S, p.x, p.y, { y: '#fff0a0', o: '#ffb030', r: '#e84a1a' });
            break;
          case 'graine':
            stamp(ctx, ['.y.', 'yYy', '.y.'], p.x, p.y, { y: '#e8c050', Y: '#fff0a0' });
            break;
          case 'feuille':
            stamp(ctx, spin ? LEAF_A : LEAF_B, p.x, p.y, { g: '#90e058', G: '#2a7a20' });
            break;
          case 'seve':
            disc(ctx, p.x, p.y, 3, '#c8d848');
            disc(ctx, p.x - 1, p.y - 1, 1, '#f8f8c0');
            break;
          case 'boue':
            disc(ctx, p.x, p.y, 4, '#7a5030');
            disc(ctx, p.x - 1, p.y - 2, 1.5, '#a87a50');
            break;
          case 'caillou':
            stamp(ctx, ROCK, p.x, p.y, { r: pal.main, R: pal.light, d: pal.dark }, 2);
            break;
          case 'limaille':
            glowing(ctx, () => line(ctx, p.x - 5, p.y + 2, p.x + 3, p.y - 1, 1, '#ffffff'));
            stamp(ctx, SHARD, p.x, p.y, { w: '#e8f0f8', W: '#ffffff', d: '#7a8494' });
            break;
          case 'follet':
          case 'luciole':
            glowing(ctx, () => {
              disc(ctx, p.x, p.y, 4 + spin, m === 'follet' ? '#3a6ae8' : '#a8e040');
              disc(ctx, p.x, p.y, 2, '#ffffff');
            });
            break;
          case 'ame':
            glowing(ctx, () => stamp(ctx, GHOST, p.x, p.y, { p: '#6a4aa8', P: '#c8b0f8', w: '#2a1838' }));
            break;
          case 'dard':
            line(ctx, p.x - 7, p.y + 1, p.x + 2, p.y - 1, 2, '#5a2a68');
            glowing(ctx, () => line(ctx, p.x - 3, p.y, p.x + 3, p.y - 1, 1, '#d080f8'));
            break;
          case 'toile':
            stamp(ctx, WEB, p.x, p.y, { w: '#f0f0f0', d: '#c8c8c8' });
            break;
          case 'miroir':
            glowing(ctx, () => stamp(ctx, GEM, p.x, p.y, { g: '#3ab868', G: '#7af0a8', w: '#ffffff' }));
            break;
          case 'glyphe':
            glowing(ctx, () => {
              disc(ctx, p.x, p.y, 5, '#9a2a7a');
              stamp(ctx, ['.##.', '#..#', '..#.', '.#..', '....', '.#..'], p.x, p.y, { '#': '#ffe080' });
            });
            break;
          case 'voile':
            glowing(ctx, () => {
              for (let k = 0; k < 10; k++) disc(ctx, p.x - k * 2, p.y + Math.sin(a.t * 12 + k * 0.7) * 3, 1.5 - k * 0.1, pal.glow);
            });
            break;
          default:
            glowing(ctx, () => stamp(ctx, ORB, p.x, p.y, { p: pal.dark, P: pal.main, w: pal.light }));
        }
      }
      // Toile collée sur la cible.
      if (m === 'toile' && !a.missed && a.ct > impact) stamp(ctx, ['w...w...w...w', '.w..w..w..w..', '..wwwwwwwww..', 'wwwdwdwdwdwww', '..wwwwwwwww..', '.w..w..w..w..', 'w...w...w...w'], a.to.center.x, a.to.center.y, { w: '#f0f0f0', d: '#b8b8b8' });
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      const t = a.ct;
      if (t < launch) {
        const u = t / launch;
        return { dx: 0, dy: u * 2, sx: 1 + u * 0.05, sy: 1 - u * 0.07, glow: a.pal.glow };
      }
      const u = clamp01((t - launch) / 0.12);
      const toward = a.attacker === 'joueur' ? 1 : -1;
      return { dx: Math.sin(u * Math.PI) * 4 * toward, dy: 0 };
    },
  };
}

type SouffleSpec = Extract<Spec, { style: 'souffle' }>;

/** Souffle : un jet continu de flammes, d'eau ou de vent vers la cible. */
function souffle(spec: SouffleSpec): Choreo {
  const m = spec.motif;
  const start = 0.15;
  const end = 0.85;
  const impact = 0.5;
  return {
    duration: 1.15,
    impact,
    update(a) {
      a.once('son', start, () => a.host.sound(m === 'flammes' || m === 'dragon' ? 'feu' : m === 'eau' ? 'eau' : 'vent'));
      a.once('teinte', start, () => {
        if (m === 'flammes') a.host.veil('#ff5010', 0.18, 0.9);
        if (m === 'dragon') a.host.veil('#3010a0', 0.22, 0.9);
      });
      const t = a.ct;
      if (t >= start && t <= end) {
        const s = a.from.head;
        const e = a.aim;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const n = m === 'vent' ? 4 : 5;
        for (let i = 0; i < n; i++) {
          const spread = (Math.random() - 0.5) * 0.35;
          const speed = 2.6 + Math.random() * 0.8;
          const vx = (dx * Math.cos(spread) - dy * Math.sin(spread)) * speed;
          const vy = (dx * Math.sin(spread) + dy * Math.cos(spread)) * speed;
          switch (m) {
            case 'flammes':
              a.p.add({ x: s.x, y: s.y, vx, vy, drag: 0.8, life: 0.42, size: 2, sizeEnd: 6, shape: 'disque', colors: ['#fff8c0', '#ffd040', '#ff8a20', '#e84a1a', '#6a4040'], glow: true });
              break;
            case 'dragon':
              a.p.add({ x: s.x, y: s.y, vx, vy, drag: 0.8, life: 0.45, size: 2, sizeEnd: 6, shape: 'disque', colors: ['#ffffff', '#c0e8ff', '#8a70ff', '#4a2ab8', '#1a1048'], glow: true });
              break;
            case 'eau':
              a.p.add({ x: s.x, y: s.y, vx: vx * 1.1, vy: vy * 1.1, ay: 40, life: 0.38, size: 2, sizeEnd: 3, shape: i % 2 ? 'disque' : 'point', colors: ['#ffffff', '#a8dcf8', '#3a86c8'] });
              break;
            case 'vent':
              a.p.add({ x: s.x, y: s.y + (Math.random() - 0.5) * 20, vx: vx * 1.3, vy: vy * 1.3, life: 0.35, size: 2, shape: 'trait', colors: ['#ffffff', '#e8e0c8', '#c8b080'] });
              break;
          }
        }
      }
      a.once('impact', impact, () => {
        a.burst(m === 'vent' ? 0.7 : 1);
        if (!a.missed) a.host.sound('impact');
      });
      a.once('fin', end, () => a.burst(0.6));
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      const t = a.ct;
      const toward = a.attacker === 'joueur' ? 1 : -1;
      if (t < start) return { dx: -toward * 3 * (t / start), dy: 0, sy: 1 + 0.05 * (t / start) };
      if (t < end) return { dx: Math.sin(a.t * 40) * 0.8, dy: 0, glow: a.pal.glow };
      return null;
    },
  };
}

type RayonSpec = Extract<Spec, { style: 'rayon' }>;

/** Rayon : l'énergie se concentre, puis un faisceau frappe la cible. */
function rayon(spec: RayonSpec): Choreo {
  const m = spec.motif;
  const charge = 0.25;
  const fire = charge;
  const stop = 0.85;
  const impact = 0.45;
  const source = (a: MoveAnim): Point => (m === 'soleil' ? { x: a.aim.x + 10, y: -8 } : a.from.head);
  return {
    duration: 1.1,
    impact,
    update(a) {
      a.once('son', 0, () => a.host.sound('magie'));
      a.once('tir', fire, () => {
        a.host.sound(m === 'soleil' ? 'feu' : 'magie');
        if (m === 'psy') a.host.warp(3, 0.8);
        if (m === 'soleil') a.host.veil('#ffd060', 0.25, 0.8);
        if (m === 'lueur') a.host.flash('#fff8d0', 0.35, 0.2);
      });
      a.once('impact', impact, () => {
        a.burst(1.2);
        if (!a.missed) a.host.sound('impactFort');
      });
      const t = a.ct;
      if (t < charge) {
        const s = source(a);
        for (let i = 0; i < 2; i++) {
          const ang = Math.random() * Math.PI * 2;
          a.p.add({ x: s.x + Math.cos(ang) * 16, y: s.y + Math.sin(ang) * 12, vx: -Math.cos(ang) * 60, vy: -Math.sin(ang) * 45, life: 0.25, size: 1, colors: ['#ffffff', a.pal.light], glow: true });
        }
      } else if (t < stop && !a.missed) {
        const e = a.aim;
        a.p.add({ x: e.x + (Math.random() - 0.5) * 16, y: e.y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, drag: 4, life: 0.3, size: 1, shape: 'etoile', colors: ['#ffffff', a.pal.light], glow: true });
      }
    },
    front(a, ctx) {
      const t = a.ct;
      const s = source(a);
      const e = a.aim;
      if (t < charge && m !== 'soleil') {
        const r = 1 + (t / charge) * 6;
        glowing(ctx, () => {
          disc(ctx, s.x, s.y, r + 2, a.pal.glow);
          disc(ctx, s.x, s.y, r, '#ffffff');
        });
        return;
      }
      if (t < fire || t > stop) return;
      const u = (t - fire) / (stop - fire);
      const grow = clamp01(u * 6);
      const ex = lerp(s.x, e.x, grow);
      const ey = lerp(s.y, e.y, grow);
      const width = (m === 'soleil' ? 10 : 6) * Math.sin(u * Math.PI) + 2 + Math.sin(a.t * 60) * 1;
      ctx.globalAlpha = 0.55;
      line(ctx, s.x, s.y, ex, ey, width + 5, a.pal.main);
      ctx.globalAlpha = 1;
      line(ctx, s.x, s.y, ex, ey, width + 1, a.pal.glow);
      line(ctx, s.x, s.y, ex, ey, Math.max(1, width - 2), a.pal.light);
      glowing(ctx, () => line(ctx, s.x, s.y, ex, ey, Math.max(1, width - 5), '#ffffff'));
      if (m === 'psy') {
        // Anneaux qui glissent le long du faisceau.
        for (let k = 0; k < 3; k++) {
          const v = (u * 3 + k / 3) % 1;
          glowing(ctx, () => ellipseRing(ctx, lerp(s.x, ex, v), lerp(s.y, ey, v), 6, 9, a.pal.main));
        }
      }
    },
  };
}

type RegardSpec = Extract<Spec, { style: 'regard' }>;

/** Regard : les yeux du lanceur s'illuminent, une onde file vers la cible. */
function regard(spec: RegardSpec): Choreo {
  const m = spec.motif;
  const color = m === 'malefique' ? '#ff3030' : m === 'petrifiant' ? '#d8d0c0' : m === 'hypnotique' ? '#f070c0' : '#ffffff';
  const impact = 0.55;
  return {
    duration: 1.0,
    impact,
    update(a) {
      a.once('yeux', 0.05, () => a.host.sound(m === 'malefique' ? 'sombre' : 'magie'));
      a.once('impact', impact, () => {
        if (a.missed) return;
        if (m === 'malefique') a.host.veil('#300008', 0.3, 0.5);
        for (let i = 0; i < 10; i++) {
          const c = a.to.center;
          a.p.add({ x: c.x + (rnd(i, 41) - 0.5) * 30, y: c.y + (rnd(i, 42) - 0.5) * 30, vy: -20, life: 0.6, size: 1, shape: 'etoile', colors: ['#ffffff', color], glow: true, flicker: true });
        }
      });
    },
    front(a, ctx) {
      const t = a.ct;
      const h = a.from.head;
      if (t < 0.35) {
        // Deux éclats aux yeux.
        const on = Math.floor(t * 20) % 2 === 0;
        glowing(ctx, () => {
          for (const dx of [-4, 4]) {
            disc(ctx, h.x + dx, h.y, on ? 2 : 1, color);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(Math.round(h.x + dx), Math.round(h.y), 1, 1);
          }
        });
      }
      const e = a.aim;
      if (t > 0.25 && t < 0.75) {
        const u = (t - 0.25) / 0.5;
        for (let k = 0; k < 4; k++) {
          const v = clamp01(u * 1.4 - k * 0.12);
          if (v <= 0 || v >= 1) continue;
          const x = lerp(h.x, e.x, v);
          const y = lerp(h.y, e.y, v);
          glowing(ctx, () => ellipseRing(ctx, x, y, 3 + v * 6, 5 + v * 9, color));
        }
      }
      if (m === 'hypnotique' && t > impact && !a.missed) {
        // Spirale qui tourne devant la cible.
        const u = clamp01((t - impact) / 0.45);
        glowing(ctx, () => {
          for (let s = 0; s < 40; s++) {
            const ang = s * 0.45 + a.t * 9;
            const r = s * 0.5 * (1 - u * 0.5);
            ctx.fillStyle = s % 2 ? '#f070c0' : '#ffffff';
            ctx.fillRect(Math.round(e.x + Math.cos(ang) * r), Math.round(e.y + Math.sin(ang) * r * 0.8), 1, 1);
          }
        });
      }
    },
    pose(a, side) {
      if (side === a.target && !a.missed && m === 'petrifiant' && a.ct > impact) return { dx: 0, dy: 0, white: 0.35 * clamp01(1 - (a.ct - impact) / 0.4) };
      if (side !== a.attacker) return null;
      return a.ct < 0.35 ? { dx: 0, dy: -1, glow: color } : null;
    },
  };
}

type ChuteSpec = Extract<Spec, { style: 'chute' }>;

/** Chute : rochers, météores, enclume ou piliers de lumière tombent du ciel sur la cible. */
function chute(spec: ChuteSpec): Choreo {
  const m = spec.motif;
  const items =
    m === 'rochers' ? [-16, 10, -4, 18, -22, 4]
      : m === 'meteores' ? [-20, 6, 20, -8]
        : m === 'tombeau' ? [-22, 22, -12, 12]
          : m === 'lumiere' ? [-18, 0, 18]
            : [0];
  const gap = m === 'rochers' ? 0.07 : m === 'lumiere' ? 0.12 : 0.1;
  const fall = m === 'enclume' || m === 'dalle' ? 0.42 : 0.3;
  const start = 0.2;
  const impact = start + fall;
  const landing = (i: number) => start + i * gap + fall;
  return {
    duration: landing(items.length - 1) + 0.55,
    impact,
    update(a) {
      a.once('alerte', 0.05, () => {
        if (m === 'meteores') a.host.veil('#200810', 0.35, 1.4);
        if (m === 'lumiere') a.host.veil('#2a1a00', 0.3, 1.2);
      });
      items.forEach((off, i) => {
        a.once(`tombe${i}`, landing(i), () => {
          const f = a.to.foot;
          const at = { x: (a.missed ? a.aim.x : f.x) + off * (m === 'tombeau' ? 1 : 0.6), y: m === 'lumiere' ? a.aim.y : f.y - 10 };
          a.burst(m === 'enclume' || m === 'dalle' ? 1.5 : 0.7, at);
          a.dust({ x: at.x, y: f.y }, m === 'enclume' || m === 'dalle' ? 12 : 5, 30);
          a.host.shake(m === 'enclume' || m === 'dalle' ? 6 : 2.5, 0.25);
          a.host.sound(m === 'lumiere' ? 'magie' : m === 'enclume' ? 'metal' : 'seisme');
          if (m === 'lumiere') a.host.flash('#fff8d0', 0.4, 0.15);
        });
      });
    },
    back(a, ctx) {
      if (m === 'lumiere') return;
      const f = a.to.foot;
      items.forEach((off, i) => {
        const u = (a.ct - start - i * gap) / fall;
        if (u < 0 || u > 1) return;
        // L'ombre de ce qui tombe grandit sur le sol.
        const x = (a.missed ? a.aim.x : f.x) + off * (m === 'tombeau' ? 1 : 0.6);
        ctx.globalAlpha = 0.35 * u;
        disc(ctx, x, f.y - 2, (m === 'enclume' || m === 'dalle' ? 16 : 8) * (0.4 + u * 0.6), '#140c04', 0.35);
        ctx.globalAlpha = 1;
      });
    },
    front(a, ctx) {
      const f = a.to.foot;
      items.forEach((off, i) => {
        const t0 = start + i * gap;
        const u = (a.ct - t0) / fall;
        const x = (a.missed ? a.aim.x : f.x) + off * (m === 'tombeau' ? 1 : 0.6);
        const groundY = m === 'lumiere' ? a.aim.y : f.y - 10;
        if (m === 'lumiere') {
          if (u < 0 || u > 1.6) return;
          const w = (u < 1 ? 3 + u * 6 : 9 * (1.6 - u) / 0.6) + Math.sin(a.t * 50) * 1;
          ctx.globalAlpha = 0.6;
          line(ctx, x, -4, x, groundY, w + 5, '#c89020');
          ctx.globalAlpha = 1;
          line(ctx, x, -4, x, groundY, w, '#ffd860');
          glowing(ctx, () => line(ctx, x, -4, x, groundY, Math.max(1, w - 5), '#ffffff'));
          return;
        }
        if (u < 0) return;
        if (u > 1) {
          // Les pierres du tombeau restent posées un instant.
          if (m === 'tombeau' && u < 2.6) stamp(ctx, ROCK, x, groundY + 4, { r: '#8a8070', R: '#b8ac98', d: '#5a5246' }, 2);
          return;
        }
        const y = lerp(-20, groundY, u * u);
        switch (m) {
          case 'meteores': {
            const sx = x + (1 - u) * 40;
            glowing(ctx, () => {
              for (let k = 1; k < 9; k++) disc(ctx, sx + k * 5, y - k * 7, 5 - k * 0.5, k < 3 ? '#fff0a0' : '#ff6020');
            });
            stamp(ctx, ROCK, sx, y, { r: '#8a4a32', R: '#e87040', d: '#4a2418' }, 2);
            break;
          }
          case 'enclume':
            stamp(ctx, ANVIL, x, y, { d: '#2a2a30', m: '#7a8494' }, 2);
            break;
          case 'dalle':
            ctx.fillStyle = '#5a2a18';
            ctx.fillRect(Math.round(x - 22), Math.round(y - 7), 44, 14);
            ctx.fillStyle = '#c8704a';
            ctx.fillRect(Math.round(x - 21), Math.round(y - 6), 42, 12);
            ctx.fillStyle = '#e8986a';
            ctx.fillRect(Math.round(x - 21), Math.round(y - 6), 42, 2);
            break;
          default:
            stamp(ctx, ROCK, x, y, { r: '#8a8070', R: '#b8ac98', d: '#5a5246' }, 2);
        }
      });
    },
  };
}

type SolSpec = Extract<Spec, { style: 'sol' }>;

/** Sol : le terrain se fend, des racines, des termitières ou des ombres surgissent sous la cible. */
function sol(spec: SolSpec): Choreo {
  const m = spec.motif;
  const crawl = m === 'fissure' || m === 'ombre' ? 0.35 : 0.15;
  const impact = crawl + 0.2;
  return {
    duration: impact + 0.7,
    impact,
    update(a) {
      a.once('debut', 0.02, () => {
        if (m === 'seisme') {
          a.host.shake(6, 1.0);
          a.host.sound('seisme');
        } else if (m === 'fissure' || m === 'termitiere') {
          a.host.shake(2, impact + 0.3);
          a.host.sound('seisme');
        } else if (m === 'ombre') {
          a.host.veil('#100818', 0.35, 1.0);
          a.host.sound('sombre');
        } else a.host.sound('elan');
      });
      a.once('impact', impact, () => {
        a.burst(m === 'seisme' ? 1.4 : 1);
        if (!a.missed && m !== 'ombre' && m !== 'etreinte' && m !== 'racines') a.dust(a.to.foot, 12, 40);
        if (!a.missed) a.host.sound('impactFort');
      });
      if (m === 'seisme' && a.ct < impact + 0.4 && Math.random() < 0.5) {
        // Pierres qui tombent des falaises.
        a.p.add({ x: Math.random() * 256, y: -6, vy: 40, ay: 400, life: 0.7, shape: 'motif', rows: ROCK_S, palette: { r: '#a87048', R: '#d8a070', d: '#5a3420' }, colors: ['#fff'] });
      }
    },
    back(a, ctx) {
      const t = a.ct;
      const s = a.from.foot;
      const f = a.missed ? { x: a.aim.x, y: a.to.foot.y } : a.to.foot;
      if (m === 'fissure' || m === 'ombre') {
        const u = clamp01(t / crawl);
        const fade = clamp01(1 - (t - impact - 0.4) / 0.3);
        if (fade <= 0) return;
        const steps = 22;
        for (let k = 0; k < steps * u; k++) {
          const v = k / steps;
          const x = lerp(s.x, f.x, v) + (rnd(k, 51) - 0.5) * 8;
          const y = lerp(s.y, f.y, v) + (rnd(k, 52) - 0.5) * 3;
          ctx.globalAlpha = fade;
          if (m === 'fissure') {
            ctx.fillStyle = '#2a140a';
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 7, 4);
            ctx.fillStyle = k % 2 ? '#ff7020' : '#ffb040';
            ctx.fillRect(Math.round(x), Math.round(y), 5, 2);
          } else {
            disc(ctx, x, y, 4, '#140a1e', 0.4);
          }
          ctx.globalAlpha = 1;
        }
      }
      if ((m === 'racines' || m === 'etreinte' || m === 'termitiere') && t > crawl - 0.1) {
        disc(ctx, f.x, f.y - 1, 18, m === 'termitiere' ? '#5a2a18' : '#3a2a14', 0.3);
      }
    },
    front(a, ctx) {
      const t = a.ct;
      const f = a.missed ? { x: a.aim.x, y: a.to.foot.y } : a.to.foot;
      const rise = clamp01((t - crawl) / 0.2);
      const sink = clamp01((t - impact - 0.35) / 0.3);
      const h = rise * (1 - sink);
      if (h <= 0) return;
      if (m === 'racines' || m === 'etreinte') {
        for (let k = 0; k < 5; k++) {
          const bx = f.x - 22 + k * 11;
          const top = f.y - h * (20 + rnd(k, 61) * 22);
          for (let y = f.y; y > top; y -= 1) {
            const sway = m === 'etreinte' ? Math.sin((f.y - y) * 0.25 + k + a.t * 4) * 6 : Math.sin((f.y - y) * 0.15 + k) * 2;
            ctx.fillStyle = (f.y - y) % 5 === 0 ? '#2a5a18' : '#5a8a28';
            ctx.fillRect(Math.round(bx + sway), Math.round(y), 2, 1);
            if ((f.y - y) % 7 === 3) {
              ctx.fillStyle = '#e8e0b0';
              ctx.fillRect(Math.round(bx + sway + 2), Math.round(y), 1, 1);
            }
          }
        }
      } else if (m === 'termitiere') {
        for (let k = 0; k < 3; k++) {
          const bx = f.x - 18 + k * 18;
          const hh = h * (18 + k * 6);
          for (let y = 0; y < hh; y++) {
            const w = Math.max(1, Math.round((1 - y / hh) * 7));
            ctx.fillStyle = y % 4 === 0 ? '#8a4a28' : '#b8683a';
            ctx.fillRect(Math.round(bx - w), Math.round(f.y - y), w * 2, 1);
          }
        }
      } else if (m === 'ombre') {
        // Griffes d'ombre qui jaillissent du sol.
        for (let k = 0; k < 4; k++) {
          const bx = f.x - 16 + k * 11;
          const hh = h * (26 + rnd(k, 71) * 14);
          for (let y = 0; y < hh; y++) {
            const bend = (y / hh) * (y / hh) * (k % 2 ? 6 : -6);
            ctx.fillStyle = y > hh - 3 ? '#b080e8' : '#2a1438';
            ctx.fillRect(Math.round(bx + bend), Math.round(f.y - y), 2, 1);
          }
        }
      } else if (m === 'fissure' || m === 'seisme') {
        // Éclats de roche projetés hors de la fissure.
        if (t > impact && t < impact + 0.06) {
          for (let k = 0; k < 10; k++) a.p.add({ x: f.x + (rnd(k, 81) - 0.5) * 30, y: f.y - 4, vx: (rnd(k, 82) - 0.5) * 80, vy: -120 - rnd(k, 83) * 80, ay: 420, life: 0.8, shape: 'motif', rows: ROCK, palette: { r: '#b5733a', R: '#d89858', d: '#6a3a1a' }, colors: ['#fff'] });
        }
      }
    },
  };
}

type VagueSpec = Extract<Spec, { style: 'vague' }>;

/** Vague : un flot déferle vers la cible ; la Crue balaie tout l'écran. */
function vague(spec: VagueSpec): Choreo {
  const big = spec.motif === 'crue';
  const impact = big ? 0.6 : 0.5;
  return {
    duration: impact + 0.6,
    impact,
    update(a) {
      a.once('son', 0.05, () => a.host.sound('eau'));
      if (big) a.once('teinte', 0.2, () => a.host.veil('#103870', 0.3, 0.9));
      a.once('impact', impact, () => {
        a.burst(big ? 1.5 : 1);
        if (!a.missed) {
          a.host.shake(big ? 5 : 2, 0.3);
          a.host.sound('impactFort');
        }
        const c = a.aim;
        for (let i = 0; i < 16; i++) a.p.add({ x: c.x + (rnd(i, 91) - 0.5) * 30, y: c.y + 10, vx: (rnd(i, 92) - 0.5) * 90, vy: -80 - rnd(i, 93) * 90, ay: 320, life: 0.8, size: 2, colors: ['#ffffff', '#a8dcf8', '#3a86c8'] });
      });
    },
    front(a, ctx) {
      const t = a.ct;
      const u = clamp01(t / impact);
      const fade = clamp01(1 - (t - impact) / 0.4);
      if (fade <= 0) return;
      const s = a.from.foot;
      const e = a.to.foot;
      const dir = Math.sign(e.x - s.x);
      const front = big ? lerp(dir > 0 ? -40 : 296, dir > 0 ? 296 : -40, u) : lerp(s.x, e.x + dir * 20, u);
      const height = (big ? 110 : 34) * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.85 + 0.2);
      const baseY = big ? 146 : lerp(s.y, e.y, u) + 6;
      const width = big ? 300 : 70;
      ctx.globalAlpha = fade;
      for (let k = 0; k < width; k++) {
        const x = front - dir * k;
        const v = k / width;
        const hgt = height * (1 - v * 0.7) * (0.85 + Math.sin(k * 0.3 + a.t * 10) * 0.15);
        ctx.fillStyle = '#2a6ab8';
        ctx.fillRect(Math.round(x), Math.round(baseY - hgt), 1, Math.round(hgt));
        ctx.fillStyle = '#5aaae8';
        ctx.fillRect(Math.round(x), Math.round(baseY - hgt), 1, Math.round(hgt * 0.4));
        if (k < 8 || Math.sin(k * 0.9 + a.t * 14) > 0.7) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(x), Math.round(baseY - hgt - 1), 1, 2);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

type ZoneSpec = Extract<Spec, { style: 'zone' }>;

/** Zone : un phénomène s'abat sur la cible (tourbillon, colonne de feu, cyclone, éclipse…). */
function zone(spec: ZoneSpec): Choreo {
  const m = spec.motif;
  const impact = m === 'eclipse' ? 0.75 : 0.55;
  return {
    duration: impact + 0.75,
    impact,
    update(a) {
      a.once('debut', 0.02, () => {
        a.host.sound(m === 'fournaise' ? 'feu' : m === 'tourbillon' ? 'eau' : m === 'cyclone' ? 'vent' : m === 'moisson' ? 'magie' : 'sombre');
        if (m === 'eclipse') a.host.veil('#000000', 0.8, impact + 0.6);
        if (m === 'mictlan') a.host.veil('#10041c', 0.5, impact + 0.6);
        if (m === 'fournaise') a.host.veil('#ff4010', 0.25, impact + 0.5);
      });
      a.once('impact', impact, () => {
        a.burst(1.5);
        if (!a.missed) {
          a.host.shake(4, 0.35);
          a.host.sound('impactFort');
          if (m === 'eclipse') a.host.flash('#c080ff', 0.6, 0.3);
          if (m === 'moisson') a.drainBack(8);
        }
      });
      if (a.missed) return;
      const c = a.to.center;
      const f = a.to.foot;
      const t = a.ct;
      if (t > impact + 0.5) return;
      for (let k = 0; k < 3; k++) {
        const ang = Math.random() * Math.PI * 2;
        switch (m) {
          case 'fournaise':
            a.p.add({ x: f.x + (Math.random() - 0.5) * 34, y: f.y, vy: -120 - Math.random() * 90, wobble: 3, life: 0.6, size: 3, sizeEnd: 7, shape: 'disque', colors: ['#fff8c0', '#ffd040', '#ff8a20', '#e84a1a', '#4a3030'], glow: true });
            break;
          case 'tourbillon':
            a.p.add({ x: c.x + Math.cos(ang) * 26, y: f.y - 4 - Math.random() * 40, vx: -Math.sin(ang) * 120, vy: -20, drag: 2, life: 0.4, size: 2, colors: ['#ffffff', '#a8dcf8', '#3a86c8'] });
            break;
          case 'cyclone':
            a.p.add({ x: c.x + Math.cos(ang) * (8 + Math.random() * 18), y: f.y - Math.random() * 60, vx: -Math.sin(ang) * 160, vy: -40, life: 0.3, size: 2, shape: 'trait', colors: ['#ffffff', '#c8e4f8'] });
            break;
          case 'mictlan':
            if (k === 0) a.p.add({ x: f.x + (Math.random() - 0.5) * 40, y: f.y, vy: -50, life: 0.8, shape: 'motif', rows: HAND, palette: { p: '#8a6ac8' }, colors: ['#fff'], wobble: 2 });
            break;
          case 'moisson':
            a.p.add({ x: c.x + Math.cos(ang) * 30, y: c.y + Math.sin(ang) * 20, vx: -Math.sin(ang) * 120, vy: Math.cos(ang) * 80, drag: 1, life: 0.5, shape: 'motif', rows: k % 2 ? LEAF_A : ['.y.', 'yYy', '.y.'], palette: { g: '#c8e050', G: '#7a9a20', y: '#f0c040', Y: '#fff0a0' }, colors: ['#fff'] });
            break;
          case 'eclipse':
            break;
        }
      }
    },
    back(a, ctx) {
      const f = a.missed ? { x: a.aim.x, y: a.to.foot.y } : a.to.foot;
      const t = a.ct;
      if (m === 'mictlan' || m === 'tourbillon') {
        const r = 26 * clamp01(t / 0.3) * clamp01(1 - (t - impact - 0.4) / 0.3);
        if (r <= 0) return;
        disc(ctx, f.x, f.y - 2, r, m === 'mictlan' ? '#140820' : '#1a4a9a', 0.32);
        ellipseRing(ctx, f.x, f.y - 2, r, r * 0.32, m === 'mictlan' ? '#8a4ad8' : '#a8dcf8');
      }
    },
    front(a, ctx) {
      if (a.missed) return;
      const c = a.to.center;
      const t = a.ct;
      if (m === 'eclipse') {
        // Un disque noir à couronne violette recouvre la cible, puis se referme.
        const u = clamp01(t / impact);
        const close = clamp01((t - impact) / 0.25);
        const r = (6 + u * 22) * (1 - close * 0.8);
        glowing(ctx, () => disc(ctx, c.x, c.y - 4, r + 4, '#7a3aa8'));
        disc(ctx, c.x, c.y - 4, r, '#05020a');
        if (close > 0 && close < 1) glowing(ctx, () => ellipseRing(ctx, c.x, c.y - 4, 30 * close + 6, 22 * close + 4, '#d8a8ff', 2));
      }
      if (m === 'cyclone') {
        const fade = clamp01(1 - (t - impact - 0.4) / 0.3);
        if (fade <= 0) return;
        ctx.globalAlpha = 0.6 * fade;
        for (let y = 0; y < 70; y += 3) {
          const r = 6 + y * 0.35;
          const off = Math.sin(a.t * 18 + y * 0.3) * r;
          ctx.fillStyle = y % 6 ? '#ffffff' : '#a8c8e8';
          ctx.fillRect(Math.round(c.x + off), Math.round(a.to.foot.y - y), 3, 2);
        }
        ctx.globalAlpha = 1;
      }
    },
    pose(a, side) {
      if (side === a.target && !a.missed && m === 'cyclone' && a.ct > 0.2 && a.ct < impact + 0.3) return { dx: Math.sin(a.t * 30) * 3, dy: -Math.sin(clamp01((a.ct - 0.2) / 0.6) * Math.PI) * 10 };
      if (side !== a.attacker) return null;
      return a.ct < impact ? { dx: 0, dy: 0, glow: a.pal.glow } : null;
    },
  };
}

type NueeSpec = Extract<Spec, { style: 'nuee' }>;

/** Nuée : criquets, plumes, âmes ou feux de renard volent en essaim vers la cible. */
function nuee(spec: NueeSpec): Choreo {
  const m = spec.motif;
  const n = m === 'essaim' ? 44 : m === 'renards' ? 6 : m === 'ames' ? 5 : 26;
  const fly = 0.45;
  const swirl = m === 'ames' || m === 'renards' ? 0.35 : 0.15;
  const impact = 0.1 + fly + swirl;
  const pos = (a: MoveAnim, i: number): Point | null => {
    const t = a.ct - 0.1 - (i / n) * 0.15;
    if (t < 0) return null;
    const s = a.from.center;
    const e = a.aim;
    if (t < fly) {
      const u = t / fly;
      return { x: lerp(s.x, e.x, ease(u)) + Math.sin(u * 9 + i) * 10, y: lerp(s.y, e.y, ease(u)) + Math.cos(u * 7 + i * 1.3) * 12 - Math.sin(u * Math.PI) * 14 };
    }
    const v = t - fly;
    if (v > swirl + 0.1) return null;
    const ang = (i / n) * Math.PI * 2 + v * 14;
    const r = 22 * (1 - clamp01(v / (swirl + 0.1)) * 0.8);
    return { x: e.x + Math.cos(ang) * r, y: e.y + Math.sin(ang) * r * 0.6 };
  };
  return {
    duration: impact + 0.5,
    impact,
    update(a) {
      a.once('son', 0.1, () => a.host.sound(m === 'criquets' || m === 'essaim' ? 'nuee' : m === 'plumes' ? 'vent' : 'magie'));
      if (m === 'essaim') a.once('ombre', 0.15, () => a.host.veil('#1a1a08', 0.35, 1.0));
      a.once('impact', impact, () => {
        a.burst(m === 'essaim' ? 1.4 : 1);
        if (!a.missed && a.power > 0) a.host.sound('impact');
      });
    },
    front(a, ctx) {
      for (let i = 0; i < n; i++) {
        const p = pos(a, i);
        if (!p) continue;
        switch (m) {
          case 'criquets':
          case 'essaim':
            stamp(ctx, Math.floor(a.t * 30 + i) % 2 ? ['w.w', '.b.', '.B.'] : ['...', 'wbw', '.B.'], p.x, p.y, { w: '#e0f0c0', b: '#8aa020', B: '#4a5a14' }, 2);
            break;
          case 'plumes':
            stamp(ctx, FEATHER, p.x, p.y, { w: '#ffffff', W: '#a8c8e8' }, 2);
            break;
          case 'ames':
            glowing(ctx, () => stamp(ctx, GHOST, p.x, p.y, { p: '#6a4aa8', P: '#c8b0f8', w: '#2a1838' }));
            break;
          case 'renards':
            glowing(ctx, () => {
              disc(ctx, p.x, p.y, 4, '#ff70c0');
              stamp(ctx, FLAME_S, p.x, p.y - 2, { y: '#ffffff', o: '#ffb0e0', r: '#f070c0' });
            });
            break;
        }
      }
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      return a.ct < 0.2 ? { dx: 0, dy: -Math.sin((a.ct / 0.2) * Math.PI) * 3, glow: a.pal.glow } : null;
    },
  };
}

type OndeSpec = Extract<Spec, { style: 'onde' }>;

/** Onde : cri, chant, murmure ou rire se propagent en anneaux vers la cible. */
function onde(spec: OndeSpec): Choreo {
  const m = spec.motif;
  const impact = 0.6;
  const color = m === 'cri' ? '#ffffff' : m === 'chant' ? '#68c8ff' : m === 'murmure' ? '#ffe080' : m === 'psy' ? '#f070c0' : m === 'lamentation' ? '#a888e8' : '#f0d070';
  return {
    duration: 1.05,
    impact,
    update(a) {
      a.once('son', 0.05, () => a.host.sound(m === 'cri' || m === 'rire' ? 'debuff' : 'magie'));
      if (m === 'psy') a.once('warp', 0.15, () => a.host.warp(2.5, 0.8));
      if (m === 'lamentation') a.once('voile', 0.1, () => a.host.veil('#140a28', 0.3, 0.9));
      a.once('impact', impact, () => {
        if (a.power > 0) a.burst(0.9);
        if (!a.missed && a.power > 0) a.host.sound('impact');
      });
      const s = a.from.head;
      const t = a.ct;
      if (t < 0.6 && Math.random() < 0.35) {
        const e = a.aim;
        const glyph = m === 'chant' ? 'note' : m === 'rire' ? 'ha' : undefined;
        if (glyph) a.p.add({ x: s.x, y: s.y, vx: (e.x - s.x) * 1.4, vy: (e.y - s.y) * 1.4 - 20, life: 0.75, shape: 'glyphe', glyph, colors: [color, '#ffffff'], wobble: 3 });
        if (m === 'chant') a.p.add({ x: s.x, y: s.y, vx: (e.x - s.x) * 1.2, vy: (e.y - s.y) * 1.2, life: 0.8, shape: 'glyphe', glyph: 'bulle', colors: ['#c8ecff'], wobble: 4 });
      }
    },
    front(a, ctx) {
      const t = a.ct;
      const s = a.from.head;
      const e = a.aim;
      for (let k = 0; k < 4; k++) {
        const v = (t - k * 0.1) / 0.55;
        if (v < 0 || v > 1) continue;
        const x = lerp(s.x, e.x, v);
        const y = lerp(s.y, e.y, v);
        const r = 6 + v * 16;
        glowing(ctx, () => {
          if (m === 'cri' || m === 'rire') {
            // Arcs sonores « ) » tournés vers la cible.
            const dir = Math.sign(e.x - s.x);
            for (let i = -6; i <= 6; i++) {
              const ang = (i / 6) * 0.9;
              ctx.fillStyle = color;
              ctx.fillRect(Math.round(x + Math.cos(ang) * r * dir), Math.round(y + Math.sin(ang) * r), 2, 1);
            }
          } else if (m === 'lamentation') {
            for (let i = 0; i < 24; i++) {
              const ang = (i / 24) * Math.PI * 2;
              const wob = Math.sin(ang * 5 + a.t * 12) * 2;
              ctx.fillStyle = color;
              ctx.fillRect(Math.round(x + Math.cos(ang) * (r + wob)), Math.round(y + Math.sin(ang) * (r + wob) * 0.8), 1, 1);
            }
          } else {
            ellipseRing(ctx, x, y, r, r * 0.8, color, m === 'psy' ? 2 : 1);
          }
        });
      }
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      const t = a.ct;
      return t < 0.55 ? { dx: 0, dy: 0, sx: 1 + Math.sin(t * 40) * 0.03, sy: 1 - Math.sin(t * 40) * 0.03 } : null;
    },
  };
}

type MaleficeSpec = Extract<Spec, { style: 'malefice' }>;

/** Maléfice : spores, brume, notes ou malédiction enveloppent la cible. */
function malefice(spec: MaleficeSpec): Choreo {
  const m = spec.motif;
  const impact = 0.7;
  return {
    duration: 1.2,
    impact,
    update(a) {
      a.once('son', 0.05, () => a.host.sound(m === 'malediction' ? 'sombre' : m === 'notes' ? 'magie' : 'debuff'));
      if (m === 'malediction') a.once('voile', 0.05, () => a.host.veil('#1a0820', 0.35, 1.1));
      const t = a.ct;
      const s = a.from.head;
      const e = a.aim;
      if (t < 0.6) {
        const spawn = m === 'brume' ? 3 : 2;
        for (let i = 0; i < spawn; i++) {
          const base = { x: s.x, y: s.y, vx: (e.x - s.x) * (1.2 + Math.random() * 0.5) + (Math.random() - 0.5) * 30, vy: (e.y - s.y) * (1.2 + Math.random() * 0.5) + (Math.random() - 0.5) * 30, life: 0.75 };
          switch (m) {
            case 'spores':
              a.p.add({ ...base, drag: 0.5, size: 2, shape: 'disque', colors: ['#e8b0f8', '#b060c8', '#7a8a28'], wobble: 3 });
              break;
            case 'feuilles':
              a.p.add({ ...base, drag: 0.5, shape: 'motif', rows: i % 2 ? LEAF_A : LEAF_B, palette: { g: '#90e058', G: '#3a8a28' }, colors: ['#fff'], wobble: 5, wobbleFreq: 2 });
              break;
            case 'brume':
              a.p.add({ ...base, drag: 0.6, size: 4, sizeEnd: 9, shape: 'disque', colors: ['#e8f0ff', '#c8d8f0', '#a8b8d8'] });
              break;
            case 'notes':
              a.p.add({ ...base, drag: 0.3, shape: 'glyphe', glyph: 'note', colors: ['#ffe080', '#f8c040'], wobble: 4, glow: true });
              break;
            case 'ruse':
              a.p.add({ ...base, drag: 0.6, shape: 'etoile', size: 2, colors: ['#ffffff', '#f8d848'], glow: true, flicker: true });
              break;
            case 'malediction':
              break;
          }
        }
      }
      a.once('impact', impact, () => {
        if (a.missed) return;
        const c = a.to.center;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          a.p.add({ x: c.x + Math.cos(ang) * 20, y: c.y + Math.sin(ang) * 14, vx: -Math.sin(ang) * 40, vy: Math.cos(ang) * 30 - 10, drag: 2, life: 0.6, size: 1, shape: 'etoile', colors: ['#ffffff', a.pal.light], glow: true });
        }
      });
    },
    back(a, ctx) {
      if (m !== 'malediction' || a.missed) return;
      const f = a.to.foot;
      const u = clamp01(a.ct / 0.5);
      const fade = clamp01(1 - (a.ct - impact - 0.2) / 0.3);
      if (fade <= 0) return;
      glowing(ctx, () => {
        ctx.globalAlpha = fade;
        ellipseRing(ctx, f.x, f.y - 2, 26 * u, 9 * u, '#b060e8', 2);
        ellipseRing(ctx, f.x, f.y - 2, 18 * u, 6 * u, '#7a3aa8');
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + a.t * 2;
          stamp(ctx, ['#.#', '.#.', '#.#'], f.x + Math.cos(ang) * 22 * u, f.y - 2 + Math.sin(ang) * 7 * u, { '#': '#e8b0ff' });
        }
        ctx.globalAlpha = 1;
      });
    },
    front(a, ctx) {
      if (m !== 'ruse' || a.ct > 0.6) return;
      // Le lièvre rusé : des doubles fantomatiques qui dansent autour du lanceur.
      const c = a.from.center;
      glowing(ctx, () => {
        for (let k = 0; k < 3; k++) {
          const ang = a.t * 9 + (k * Math.PI * 2) / 3;
          ellipseRing(ctx, c.x + Math.cos(ang) * 18, c.y + Math.sin(ang) * 8, 4, 6, '#f8d848');
        }
      });
    },
  };
}

type AuraSpec = Extract<Spec, { style: 'aura' }>;

/** Aura : le lanceur se renforce ou se soigne, entouré d'énergie. */
function aura(spec: AuraSpec): Choreo {
  const m = spec.motif;
  const heal = m === 'soin' || m === 'pluie';
  const impact = 0.65;
  const color =
    m === 'danse' ? '#ff6a30' : m === 'armure' ? '#c8884a' : heal ? '#80f080' : m === 'masques' ? '#f8d860' : m === 'ecailles' ? '#8a70ff' : m === 'vent' ? '#e8f4ff' : m === 'sable' ? '#f0d090' : '#ff8a20';
  return {
    duration: 1.1,
    impact,
    update(a) {
      a.once('son', 0.05, () => a.host.sound(heal ? 'soin' : m === 'forge' ? 'feu' : 'buff'));
      const c = a.from.center;
      const f = a.from.foot;
      const t = a.ct;
      if (t > 0.9) return;
      if (m === 'pluie') {
        for (let i = 0; i < 3; i++) a.p.add({ x: c.x + (Math.random() - 0.5) * 50, y: c.y - 50, vx: -20, vy: 220, life: 0.3, size: 2, shape: 'trait', colors: ['#c8ecff', '#68b0e8'] });
      }
      const ang = Math.random() * Math.PI * 2;
      switch (m) {
        case 'soin':
        case 'pluie':
          a.p.add({ x: c.x + Math.cos(ang) * 18, y: f.y - 4, vy: -50 - Math.random() * 30, life: 0.8, shape: 'glyphe', glyph: Math.random() < 0.3 ? 'plus' : 'etoile', colors: ['#ffffff', '#b8f8a0', '#58c838'], glow: true, wobble: 2 });
          break;
        case 'forge':
          a.p.add({ x: c.x + Math.cos(ang) * 16, y: f.y - 2, vy: -90, wobble: 2, life: 0.5, size: 2, sizeEnd: 4, shape: 'disque', colors: ['#fff0a0', '#ffb030', '#e84a1a'], glow: true });
          break;
        case 'armure':
          a.p.add({ x: c.x + Math.cos(ang) * 40, y: c.y + Math.sin(ang) * 30, vx: -Math.cos(ang) * 90, vy: -Math.sin(ang) * 70, life: 0.42, shape: 'motif', rows: ['.dd.', 'dRRd', 'dRRd', '.dd.'], palette: { d: '#6a3a1a', R: '#c8884a' }, colors: ['#fff'] });
          break;
        case 'masques':
          if (Math.random() < 0.3) a.p.add({ x: c.x + Math.cos(ang) * 28, y: c.y + Math.sin(ang) * 16, vx: -Math.sin(ang) * 60, vy: Math.cos(ang) * 30, life: 0.6, shape: 'motif', rows: MASK, palette: { m: '#f0e8d0', k: '#140c08', r: '#c8401a' }, colors: ['#fff'] });
          break;
        case 'vent':
          a.p.add({ x: c.x + Math.cos(ang) * 26, y: c.y + Math.sin(ang) * 18, vx: -Math.sin(ang) * 140, vy: Math.cos(ang) * 90, life: 0.3, size: 2, shape: 'trait', colors: ['#ffffff', '#c8e4f8'] });
          break;
        case 'sable':
          a.p.add({ x: c.x + Math.cos(ang) * 24, y: c.y + Math.sin(ang) * 18, vx: -Math.sin(ang) * 80, vy: Math.cos(ang) * 50 - 20, life: 0.6, size: 1, colors: ['#fff0c0', '#e8c070', '#c89040'], glow: true });
          break;
        default:
          a.p.add({ x: c.x + Math.cos(ang) * 20, y: f.y - 2, vy: -70 - Math.random() * 40, life: 0.6, size: 2, sizeEnd: 0, colors: ['#ffffff', color], glow: true });
      }
    },
    back(a, ctx) {
      const f = a.from.foot;
      const t = a.ct;
      if (t > 0.95) return;
      glowing(ctx, () => {
        for (let k = 0; k < 3; k++) {
          const v = (t * 1.6 + k / 3) % 1;
          ctx.globalAlpha = 1 - v;
          ellipseRing(ctx, f.x, f.y - 2 - v * 40, 18 - v * 4, 6 - v * 1.5, color, 2);
        }
        ctx.globalAlpha = 1;
      });
    },
    pose(a, side) {
      if (side !== a.attacker) return null;
      const t = a.ct;
      if (m === 'danse' && t < 0.8) return { dx: 0, dy: -Math.abs(Math.sin(t * Math.PI * 3)) * 8, glow: color };
      return t < 0.95 ? { dx: 0, dy: 0, glow: color, white: heal ? 0.25 * Math.sin(t * Math.PI) : 0 } : null;
    },
  };
}

const CHOREOS: { [K in Spec['style']]: (spec: Extract<Spec, { style: K }>) => Choreo } = {
  contact,
  projectile,
  souffle,
  rayon,
  regard,
  chute,
  sol,
  vague,
  zone,
  nuee,
  onde,
  malefice,
  aura,
};
