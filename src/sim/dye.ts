// Dye released into the flow from fixed sources at the left, as in Reynolds' experiment (1883).
// Each particle remembers its lane. It stays "intact" while it keeps to that lane, carried point to
// point. Once it strays it is either held in a convection cell or scattered by turbulence, read from
// the Regimes at its position.
import type { Fluid } from './fluid';
import type { Regimes } from './regimes';

// Regime codes, as in regimes.ts (repeated so this module has no runtime imports).
const CELLS = 1;
const EDDIES = 2;

export class Dye {
  readonly cap: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly lane: Uint8Array;
  readonly intact: Uint8Array;
  /** The regime now holding each particle, how long it has held it, and the regime it came from (a ring), or 255. */
  readonly cur: Uint8Array;
  readonly stay: Uint16Array;
  readonly ring: Uint8Array;
  /** Crossings since the last read: moves[from][to], in the order layers, cells, eddies. */
  moves = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  /** Steps a regime must hold a particle before a move out of it counts as a crossing. */
  settle = 40;
  private age: Uint16Array;
  count = 0;
  readonly sources: number[];
  /** How far a particle may drift from its lane, in cells, and still count as intact. */
  laneWidth = 1.5;
  maxAge = 1400;
  private due: number[];
  private nx: number;
  private ny: number;

  constructor(cap: number, nx: number, ny: number, lanes: number) {
    this.cap = cap;
    this.nx = nx;
    this.ny = ny;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.px = new Float32Array(cap);
    this.py = new Float32Array(cap);
    this.lane = new Uint8Array(cap);
    this.intact = new Uint8Array(cap);
    this.cur = new Uint8Array(cap);
    this.stay = new Uint16Array(cap);
    this.ring = new Uint8Array(cap).fill(255);
    this.age = new Uint16Array(cap);
    // Sources sit inside the slow layers along the walls, where the liquid barely moves.
    this.sources = Array.from({ length: lanes }, (_, k) => 7 + ((k + 0.5) / lanes) * (ny - 14));
    this.due = this.sources.map(() => Math.random());
  }

  /** Remember positions before a frame's steps, for drawing streaks. */
  mark() {
    this.px.set(this.x.subarray(0, this.count));
    this.py.set(this.y.subarray(0, this.count));
  }

  private remove(i: number) {
    const j = --this.count;
    this.x[i] = this.x[j];
    this.y[i] = this.y[j];
    this.px[i] = this.px[j];
    this.py[i] = this.py[j];
    this.lane[i] = this.lane[j];
    this.intact[i] = this.intact[j];
    this.cur[i] = this.cur[j];
    this.stay[i] = this.stay[j];
    this.ring[i] = this.ring[j];
    this.age[i] = this.age[j];
  }

  /** One step: release `rate` particles per source, then carry every particle with the flow. */
  step(f: Fluid, rate: number) {
    for (let k = 0; k < this.sources.length; k++) {
      this.due[k] += rate;
      while (this.due[k] >= 1) {
        this.due[k] -= 1;
        if (this.count >= this.cap) this.remove(0);
        const i = this.count++;
        this.x[i] = this.px[i] = 1.5;
        this.y[i] = this.py[i] = this.sources[k] + (Math.random() - 0.5) * 0.6;
        this.lane[i] = k;
        this.intact[i] = 1;
        this.age[i] = 0;
        this.cur[i] = 0;
        this.stay[i] = 0;
        this.ring[i] = 255;
      }
    }
    for (let i = this.count - 1; i >= 0; i--) {
      const [u, v] = f.velocityAt(this.x[i], this.y[i]);
      this.x[i] += u;
      this.y[i] = Math.max(1, Math.min(this.ny - 2, this.y[i] + v));
      this.age[i]++;
      if (Math.abs(this.y[i] - this.sources[this.lane[i]]) > this.laneWidth) this.intact[i] = 0;
      if (this.x[i] > this.nx - 2 || this.x[i] < 1 || this.age[i] > this.maxAge) this.remove(i);
    }
  }

  /** Follow each particle's regime; a particle that settles into a new one keeps a ring in the old one's color. */
  track(r: Regimes) {
    for (let i = 0; i < this.count; i++) {
      const now = this.intact[i] ? 0 : r.kind[Math.floor(this.x[i]) + Math.floor(this.y[i]) * this.nx];
      if (now === this.cur[i]) {
        if (this.stay[i] < 60000) this.stay[i]++;
        // A move counts once the new regime has held the particle for a while, so flicker does not.
        if (this.stay[i] === this.settle && this.ring[i] !== 255 && this.ring[i] !== now) this.moves[this.ring[i]][now]++;
        continue;
      }
      if (this.stay[i] >= this.settle) this.ring[i] = this.cur[i];
      this.cur[i] = now;
      this.stay[i] = 0;
    }
  }

  /** Read and reset the crossings counted since the last call. */
  takeMoves() {
    const m = this.moves;
    this.moves = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    return m;
  }

  /**
   * The stakes. `reach`: how far, as a share of the length, intact dye gets on average across the
   * lanes (the conduit's front). `held` and `scattered`: shares of the dye held in convection cells
   * or scattered by turbulence. `fronts`: each lane's front, in cells.
   */
  stats(r: Regimes) {
    const fronts = this.sources.map(() => 0);
    let held = 0;
    let scattered = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.intact[i]) {
        if (this.x[i] > fronts[this.lane[i]]) fronts[this.lane[i]] = this.x[i];
        continue;
      }
      const kind = r.kind[Math.floor(this.x[i]) + Math.floor(this.y[i]) * this.nx];
      if (kind === CELLS) held++;
      else if (kind === EDDIES) scattered++;
    }
    const n = this.count || 1;
    const reach = fronts.reduce((a, b) => a + b, 0) / fronts.length / (this.nx - 2);
    return { reach: Math.min(1, reach), held: held / n, scattered: scattered / n, fronts };
  }
}
