// A field of metronomes on one board, as a phase-oscillator model (cf. Kuramoto; Pantaleone 2002).
// Each metronome has a phase and a natural tempo. Three couplings act on it:
//   the board: every metronome pushes the board and is pushed by it, so the board's swing is the
//     field's mean beat (the order parameter R), which pulls each one toward the common phase;
//   its segment: metronomes in the same territory are tied together, so a segment beats as one;
//   its neighbors: each hears the ones next to it, with a small delay (a phase lag), which in a
//     field of oscillators makes waves of beats travel and rotate.
// Segments differ in tempo, and the spread of those tempi sets how hard the board must pull
// before the whole field falls into step.

export const CAUGHT = 0; // in step with the board
export const SEGMENT = 1; // in step with its own segment, not the board
export const WAVE = 2; // neither: carried along by traveling waves

export interface OscParams {
  board: number; // the board's pull
  segment: number; // the pull inside a segment
  neighbor: number; // the pull between neighbors
  lag: number; // the neighbors' phase lag, in radians
  spread: number; // how far the segments' tempi differ
  noise: number; // random jitter in each beat
  /** Optional: the neighbors' pull column by column, in place of `neighbor`. */
  neighborField?: Float32Array;
}

export class Metronomes {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  readonly theta: Float32Array;
  readonly jitter: Float32Array; // each metronome's own small offset from its segment's tempo
  readonly seg: Uint16Array;
  readonly kind: Uint8Array;
  readonly segTempo: Float32Array; // each segment's tempo offset, from -1 to 1
  readonly segR: Float32Array; // how much in step each segment is, 0 to 1
  readonly segPsi: Float32Array;
  segments: number;
  /** The board's swing, 0 (still) to 1 (every metronome in step), and its phase. */
  R = 0;
  psi = 0;
  readonly base: number;
  private rand: () => number;

  constructor(w: number, h: number, segments: number, base = (2 * Math.PI) / 50, rand: () => number = Math.random) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    this.base = base;
    this.rand = rand;
    this.segments = segments;
    this.theta = new Float32Array(this.n);
    this.jitter = new Float32Array(this.n);
    this.seg = new Uint16Array(this.n);
    this.kind = new Uint8Array(this.n);
    this.segTempo = new Float32Array(segments);
    this.segR = new Float32Array(segments);
    this.segPsi = new Float32Array(segments);
    // Territories: the cells nearest to each of a few scattered centers.
    const cx = Array.from({ length: segments }, () => rand() * w);
    const cy = Array.from({ length: segments }, () => rand() * h);
    for (let i = 0; i < this.n; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < segments; k++) {
        const d = (x - cx[k]) ** 2 + (y - cy[k]) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      this.seg[i] = best;
      this.theta[i] = rand() * 2 * Math.PI;
      this.jitter[i] = (rand() - 0.5) * 0.1;
    }
    for (let k = 0; k < segments; k++) this.segTempo[k] = (k / Math.max(1, segments - 1)) * 2 - 1;
  }

  /** Advance one step, in `sub` substeps so that strong couplings stay numerically smooth. */
  step(p: OscParams, sub = 4) {
    for (let k = 0; k < sub; k++) this.substep(p, 1 / sub);
  }

  private substep(p: OscParams, dt: number) {
    const { w, h, n, theta, seg, segR, segPsi, base, jitter } = this;
    // The board moves with the field's mean beat. Its swing builds and decays with some inertia,
    // while its phase follows the beat directly (averaging a rotating beat would make it lag).
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < n; i++) {
      sx += Math.cos(theta[i]);
      sy += Math.sin(theta[i]);
    }
    this.R += (Math.hypot(sx, sy) / n - this.R) * 0.05 * dt;
    this.psi = Math.atan2(sy, sx);
    // Each segment's own mean beat.
    const ax = new Float32Array(this.segments);
    const ay = new Float32Array(this.segments);
    const cnt = new Float32Array(this.segments);
    for (let i = 0; i < n; i++) {
      ax[seg[i]] += Math.cos(theta[i]);
      ay[seg[i]] += Math.sin(theta[i]);
      cnt[seg[i]]++;
    }
    for (let k = 0; k < this.segments; k++) {
      segR[k] = cnt[k] ? Math.hypot(ax[k], ay[k]) / cnt[k] : 0;
      segPsi[k] = Math.atan2(ay[k], ax[k]);
    }
    const next = new Float32Array(n);
    const { R, psi } = this;
    const amp = p.noise * Math.sqrt(3 * dt);
    for (let i = 0; i < n; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      const t = theta[i];
      const k = seg[i];
      let d = base * (1 + p.spread * this.segTempo[k] + jitter[i]);
      d += p.board * R * Math.sin(psi - t);
      d += p.segment * segR[k] * Math.sin(segPsi[k] - t);
      let local = 0;
      if (x > 0) local += Math.sin(theta[i - 1] - t - p.lag);
      if (x < w - 1) local += Math.sin(theta[i + 1] - t - p.lag);
      if (y > 0) local += Math.sin(theta[i - w] - t - p.lag);
      if (y < h - 1) local += Math.sin(theta[i + w] - t - p.lag);
      d += (p.neighborField ? p.neighborField[x] : p.neighbor) * local * 0.25;
      next[i] = t + d * dt + amp * (this.rand() * 2 - 1);
    }
    for (let i = 0; i < n; i++) theta[i] = ((next[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }

  /** Read each metronome: in step with the board, with its segment, or carried by waves. */
  classify() {
    const { n, theta, seg, segR, segPsi, kind, R, psi } = this;
    const counts = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const toBoard = Math.cos(theta[i] - psi);
      const toSeg = Math.cos(theta[i] - segPsi[seg[i]]);
      let k = WAVE;
      if (R > 0.5 && toBoard > 0.85) k = CAUGHT;
      else if (segR[seg[i]] > 0.75 && toSeg > 0.85) k = SEGMENT;
      kind[i] = k;
      counts[k]++;
    }
    return counts.map((c) => c / n) as [number, number, number];
  }
}
