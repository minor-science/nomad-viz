// Reads what each part of the liquid is doing, from its vertical velocity over time:
//   layers  (laminar): vertical motion small next to the flow along, so streaks run parallel;
//   cells   (steady convection): steady vertical motion, the same rolls turning in place;
//   eddies  (turbulence): vertical motion that keeps changing.
// Uses running averages, so a regime is judged over about a second, not a single frame.
import type { Fluid } from './fluid';

export const LAYERS = 0;
export const CELLS = 1;
export const EDDIES = 2;

export class Regimes {
  readonly mean: Float32Array; // running mean of v
  readonly fluct: Float32Array; // running mean of |v - mean|
  readonly along: Float32Array; // running mean of u
  readonly kind: Uint8Array;
  fractions: [number, number, number] = [1, 0, 0];
  private alpha: number;
  /** Below this vertical motion (cells per step), plus `rel` times the flow along, it counts as layered. */
  still = 0.008;
  rel = 0;
  /** Above this ratio of fluctuation to motion, it counts as eddies. */
  unsteady = 0.35;

  constructor(n: number, alpha = 0.03) {
    this.mean = new Float32Array(n);
    this.fluct = new Float32Array(n);
    this.along = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.alpha = alpha;
  }

  update(f: Fluid) {
    const { u, v, solid, nx, ny } = f;
    const a = this.alpha;
    const counts = [0, 0, 0];
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        this.mean[i] += a * (v[i] - this.mean[i]);
        this.along[i] += a * (u[i] - this.along[i]);
        this.fluct[i] += a * (Math.abs(v[i] - this.mean[i]) - this.fluct[i]);
        const motion = Math.abs(this.mean[i]) + this.fluct[i];
        let k = LAYERS;
        if (motion > this.still + this.rel * Math.abs(this.along[i])) k = this.fluct[i] / motion > this.unsteady ? EDDIES : CELLS;
        this.kind[i] = k;
        counts[k]++;
      }
    }
    const total = counts[0] + counts[1] + counts[2] || 1;
    this.fractions = [counts[0] / total, counts[1] / total, counts[2] / total];
  }
}
