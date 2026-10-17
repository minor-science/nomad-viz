import type { LucideIcon } from 'lucide-react';
import type { ProcessId } from '../processes';

export type ModelId = 'hydraulic' | 'metallurgic' | 'acoustic' | 'cosmic';
export type Mode = 'state' | 'nomad' | 'nonstate' | 'conflict';
export const MODES: Mode[] = ['state', 'nomad', 'nonstate', 'conflict'];

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
}

export interface SimInstance {
  init(width: number, height: number, params: Params): void;
  frame(ctx: CanvasRenderingContext2D, f: Frame): void;
}

export type Tint = 'magenta' | 'cyan' | 'yellow' | 'ink';
export type Format = 'int' | 'pct' | 'px' | 'x1000';

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
  controls: ControlSpec[];
  status: (p: Params) => [string, string][];
  cards: Card[];
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
  return String(v);
}
