import type { LucideIcon } from 'lucide-react';
import type { ProcessId } from '../processes';

export type ModelId = 'hydraulic' | 'metallurgic' | 'acoustic' | 'cosmic';
// Modes are named by formation for URL stability: state = capture, nomad = war machine,
// nonstate = warding off, town = polarization.
export type Mode = 'state' | 'nomad' | 'nonstate' | 'town' | 'conflict';
export const MODES: Mode[] = ['state', 'nomad', 'nonstate', 'town', 'conflict'];
export const DEFAULT_MODES: Mode[] = ['state', 'nomad', 'nonstate', 'conflict'];

export type Params = Record<string, number>;

// Simulations work in world units of half a CSS pixel, the scale the models were tuned at
// on a 2x display. The shell maps world units to the screen for any device pixel ratio.
export const WORLD_SCALE = 2;

export interface Frame {
  width: number;
  height: number;
  time: number;
  mode: Mode;
  params: Params;
  motionScale: number;
  /** Draw on-canvas tags for the Explain layer. */
  explain: boolean;
  /** Areas on top of the canvas that tags should keep clear of (the legend), in world units. */
  keepClear?: { x: number; y: number; w: number; h: number }[];
}

// What the narrator strip shows: a headline, an ATP line, and a chart of series scaled 0 to 1.
export interface Narration {
  head: string;
  sub: string;
  color: string;
  series: { values: number[]; color: string; label: string }[];
  span: number;
}

export interface SimInstance {
  init(width: number, height: number, params: Params): void;
  frame(ctx: CanvasRenderingContext2D, f: Frame): void;
  /** The narrator's current text and chart, read by the shell a few times a second. */
  narrate?(): Narration | null;
}

export type Tint = 'magenta' | 'cyan' | 'yellow' | 'green' | 'ink';
export type Format = 'int' | 'pct' | 'px' | 'x1000' | 'dec2' | 'dec3' | 'times';

export interface SliderSpec {
  kind: 'slider';
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  tint: Tint;
  format: Format;
  reinit?: boolean;
  divider?: boolean;
}

export interface PairSpec {
  kind: 'pair';
  keys: [string, string];
  label: string;
  min: number;
  max: number;
  step: number;
  defaults: [number, number];
  tint: Tint;
}

export type ControlSpec = SliderSpec | PairSpec;

// One row of a model's legend: what you see, what it is physically, what it stands for in ATP,
// and an example from ATP or from the charts' sources.
export interface LegendRow {
  swatch: string;
  see: string;
  /** What it stands for socially and politically. */
  social?: string;
  physics: string;
  atp: string;
  example?: string;
}

export interface Card {
  process: ProcessId;
  heading: string;
  text: string;
}

export interface ModelDef {
  id: ModelId;
  name: string;
  tagline: string;
  sidebarIcon: LucideIcon;
  headerIcon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
  describe: (mode: Mode) => string;
  /** Modes this model stages, in button order. Defaults to DEFAULT_MODES. */
  modes?: Mode[];
  /** Update every this many display frames (2 = 30 snapshots a second). Defaults to 1. */
  frameEvery?: number;
  /** Frames computed for the reduced-motion still. Defaults to 150. */
  stillFrames?: number;
  controls: ControlSpec[];
  status: (p: Params) => [string, string][];
  cards: Card[];
  legend?: LegendRow[];
  create: () => SimInstance;
}

export function defaults(controls: ControlSpec[]): Params {
  const out: Params = {};
  for (const c of controls) {
    if (c.kind === 'slider') out[c.key] = c.default;
    else c.keys.forEach((k, i) => (out[k] = c.defaults[i]));
  }
  return out;
}

export function formatValue(v: number, f: Format): string {
  if (f === 'pct') return `${(v * 100).toFixed(0)}%`;
  if (f === 'px') return `${v}px`;
  if (f === 'x1000') return (v * 1000).toFixed(0);
  if (f === 'dec2') return v.toFixed(2);
  if (f === 'dec3') return v.toFixed(3);
  if (f === 'times') return `${v.toFixed(2)}×`;
  return String(v);
}
