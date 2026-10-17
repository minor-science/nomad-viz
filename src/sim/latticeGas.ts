// A two-dimensional lattice gas with crystal orientations, run by Metropolis Monte Carlo.
//
// Each site of a square lattice (periodic edges) is empty (solution) or holds an atom of the
// solid with one of Q orientations. Energy:
//
//   E = - sum over neighbor pairs of J(o_i, o_j) n_i n_j  -  mu * sum n_i
//
// with J = 1 for atoms of the same orientation and J = jCross < 1 across a grain boundary.
// Solid and solution coexist at mu_c = -2J (square lattice), so the supersaturation is
// dmu = mu - mu_c. Units: J = 1 and Boltzmann's constant = 1, so temperature is in units of J.
//
// Moves (Lee and Yang 1952; Metropolis et al. 1953): pick a site at random. With probability 1/2,
// try to toggle it (attach an atom, or detach one). Otherwise, if it holds an atom, try to give it
// the orientation of a random neighbor (the Potts dynamics used for grain growth, Anderson et al.
// 1984). An attaching atom takes the orientation most common among its neighbors, or a new one
// if it has none. That rule is a simplification: it keeps grains coherent without tracking
// orientation entropy, and it means the moves only approximately satisfy detailed balance.

export interface LatticeParams {
  T: number;
  /** Supersaturation, used directly when there is no reservoir. */
  dmu: number;
  Q: number;
  jCross: number;
}

// A finite reservoir of dissolved atoms. Attaching an atom draws one from it, detaching returns
// one, and the supersaturation follows the dilute-solution law dmu = T ln(D / D_eq). So a growing
// crystal lowers the supersaturation that feeds it, and a feed (atoms added per sweep) raises it.
// Depleted atoms are destroyed, not returned.
export interface Reservoir {
  dissolved: number;
  equilibrium: number;
}

// Interface tension of the square-lattice Ising model along a lattice axis (Onsager 1944),
// written for the lattice gas (Ising coupling J/4). Zero at and above the critical temperature,
// which is T_c = 0.567 J for the lattice gas.
export function lineTension(T: number): number {
  if (T <= 0) return 0.5;
  const g = 0.5 - T * Math.log(1 / Math.tanh(1 / (4 * T)));
  return Math.max(0, g);
}

// Classical nucleation theory in two dimensions: a circular cluster of n atoms has
// dG(n) = -n dmu + 2 gamma sqrt(pi n), largest at the critical size n* = pi gamma^2 / dmu^2.
// An estimate only: lattice clusters are not circles, and the theory is least reliable for small n*.
export function criticalSize(T: number, dmu: number): number {
  const g = lineTension(T);
  if (dmu <= 0) return Infinity;
  return (Math.PI * g * g) / (dmu * dmu);
}

// Small fast generator (xorshift32), seedable so tests are repeatable.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export interface Cluster {
  id: number;
  size: number;
  cx: number;
  cy: number;
}

export class LatticeGas {
  readonly cols: number;
  readonly rows: number;
  readonly n: number;
  /** 0 = empty, 1..Q = atom with that orientation */
  readonly occ: Uint8Array;
  /** cluster id per site after label(), -1 if empty */
  readonly cid: Int32Array;
  clusters: Cluster[] = [];
  largest = 0;
  reservoir: Reservoir | null = null;
  /** Sites where no atom may attach (set by bands of inhibitors). */
  readonly blocked: Uint8Array;
  private rand: () => number;
  private nb: Int32Array;

  constructor(cols: number, rows: number, seed = 1) {
    this.cols = cols;
    this.rows = rows;
    this.n = cols * rows;
    this.occ = new Uint8Array(this.n);
    this.cid = new Int32Array(this.n).fill(-1);
    this.blocked = new Uint8Array(this.n);
    this.rand = rng(seed);
    // Neighbor table, four per site, with periodic edges.
    this.nb = new Int32Array(this.n * 4);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        this.nb[i * 4] = y * cols + ((x + 1) % cols);
        this.nb[i * 4 + 1] = y * cols + ((x - 1 + cols) % cols);
        this.nb[i * 4 + 2] = ((y + 1) % rows) * cols + x;
        this.nb[i * 4 + 3] = ((y - 1 + rows) % rows) * cols + x;
      }
    }
  }

  clear() {
    this.occ.fill(0);
    this.cid.fill(-1);
    this.clusters = [];
    this.largest = 0;
  }

  neighbors(i: number): Int32Array {
    return this.nb.subarray(i * 4, i * 4 + 4);
  }

  private bond(a: number, b: number, jCross: number) {
    return a === b ? 1 : jCross;
  }

  // Bond energy of site i if it held orientation o (negative = bound).
  private bondEnergy(i: number, o: number, jCross: number) {
    let e = 0;
    for (let k = 0; k < 4; k++) {
      const v = this.occ[this.nb[i * 4 + k]];
      if (v) e -= this.bond(o, v, jCross);
    }
    return e;
  }

  private attachOrientation(i: number, Q: number): number {
    const counts = new Map<number, number>();
    let best = 0;
    let bestCount = 0;
    for (let k = 0; k < 4; k++) {
      const v = this.occ[this.nb[i * 4 + k]];
      if (!v) continue;
      const c = (counts.get(v) ?? 0) + 1;
      counts.set(v, c);
      if (c > bestCount) {
        best = v;
        bestCount = c;
      }
    }
    if (best) return best;
    return 1 + Math.floor(this.rand() * Q);
  }

  /** Current supersaturation: from the reservoir if there is one, else the parameter. */
  supersaturation(p: LatticeParams): number {
    const r = this.reservoir;
    if (!r) return p.dmu;
    return p.T * Math.log(Math.max(r.dissolved, 1e-9) / r.equilibrium);
  }

  /** Run `sweeps` Monte Carlo sweeps (one sweep = one attempt per site on average). */
  sweep(p: LatticeParams, sweeps = 1) {
    const { T, Q, jCross } = p;
    const res = this.reservoir;
    let mu = -2 + this.supersaturation(p);
    const beta = 1 / Math.max(T, 1e-3);
    const attempts = Math.round(this.n * sweeps);
    const r = this.rand;
    for (let a = 0; a < attempts; a++) {
      if (res && (a & 255) === 0) mu = -2 + this.supersaturation(p);
      const i = (r() * this.n) | 0;
      const o = this.occ[i];
      if (r() < 0.5) {
        if (!o) {
          if (this.blocked[i]) continue;
          const no = this.attachOrientation(i, Q);
          const dE = this.bondEnergy(i, no, jCross) - mu;
          if (dE <= 0 || r() < Math.exp(-beta * dE)) {
            this.occ[i] = no;
            if (res) res.dissolved -= 1;
          }
        } else {
          const dE = -this.bondEnergy(i, o, jCross) + mu;
          if (dE <= 0 || r() < Math.exp(-beta * dE)) {
            this.occ[i] = 0;
            if (res) res.dissolved += 1;
          }
        }
      } else if (o) {
        const j = this.nb[i * 4 + ((r() * 4) | 0)];
        const no = this.occ[j];
        if (!no || no === o) continue;
        const dE = this.bondEnergy(i, no, jCross) - this.bondEnergy(i, o, jCross);
        if (dE <= 0 || r() < Math.exp(-beta * dE)) this.occ[i] = no;
      }
    }
  }

  /** Label connected clusters of atoms (four-neighbor, any orientation). */
  label(): Cluster[] {
    const { occ, cid, nb, cols } = this;
    cid.fill(-1);
    const stack = new Int32Array(this.n);
    const out: Cluster[] = [];
    let largest = 0;
    for (let s = 0; s < this.n; s++) {
      if (!occ[s] || cid[s] >= 0) continue;
      const id = out.length;
      let top = 0;
      stack[top++] = s;
      cid[s] = id;
      let size = 0;
      // Centroid on a torus: average angles so clusters that wrap an edge land in the right place.
      let sx = 0, cxs = 0, sy = 0, cys = 0;
      while (top) {
        const i = stack[--top];
        size++;
        const x = i % cols;
        const y = (i / cols) | 0;
        const ax = (2 * Math.PI * x) / cols;
        const ay = (2 * Math.PI * y) / this.rows;
        sx += Math.sin(ax); cxs += Math.cos(ax);
        sy += Math.sin(ay); cys += Math.cos(ay);
        for (let k = 0; k < 4; k++) {
          const j = nb[i * 4 + k];
          if (occ[j] && cid[j] < 0) {
            cid[j] = id;
            stack[top++] = j;
          }
        }
      }
      const cx = ((Math.atan2(sx, cxs) / (2 * Math.PI) + 1) % 1) * cols;
      const cy = ((Math.atan2(sy, cys) / (2 * Math.PI) + 1) % 1) * this.rows;
      out.push({ id, size, cx, cy });
      if (size > largest) largest = size;
    }
    this.clusters = out;
    this.largest = largest;
    return out;
  }

  /** Remove every atom of a cluster (depletion). The atoms are destroyed, not returned to the
   * reservoir. Requires a current label(). */
  deplete(id: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.cid[i] === id) {
        this.occ[i] = 0;
        this.cid[i] = -1;
      }
    }
  }

  /** Remove up to `count` atoms of a cluster from its surface inward (graded depletion). The atoms
   * are destroyed, not returned. Requires a current label(); returns how many were removed. */
  wear(id: number, count: number): number {
    const { occ, cid, nb } = this;
    let removed = 0;
    while (removed < count) {
      const surface: number[] = [];
      for (let i = 0; i < this.n; i++) {
        if (cid[i] !== id || !occ[i]) continue;
        for (let k = 0; k < 4; k++) {
          if (!occ[nb[i * 4 + k]]) {
            surface.push(i);
            break;
          }
        }
      }
      if (!surface.length) break;
      for (let k = surface.length - 1; k > 0; k--) {
        const j = (this.rand() * (k + 1)) | 0;
        [surface[k], surface[j]] = [surface[j], surface[k]];
      }
      for (const i of surface) {
        if (removed >= count) break;
        occ[i] = 0;
        cid[i] = -1;
        removed++;
      }
    }
    return removed;
  }

  /** A site is on a boundary if it holds an atom next to an empty site or a different orientation. */
  isBoundary(i: number): boolean {
    const o = this.occ[i];
    if (!o) return false;
    for (let k = 0; k < 4; k++) {
      if (this.occ[this.nb[i * 4 + k]] !== o) return true;
    }
    return false;
  }

  /** A grain boundary: an atom next to an atom of a different orientation. */
  isGrainBoundary(i: number): boolean {
    const o = this.occ[i];
    if (!o) return false;
    for (let k = 0; k < 4; k++) {
      const v = this.occ[this.nb[i * 4 + k]];
      if (v && v !== o) return true;
    }
    return false;
  }

  /** Fraction of sites holding atoms. */
  density(): number {
    let c = 0;
    for (let i = 0; i < this.n; i++) if (this.occ[i]) c++;
    return c / this.n;
  }
}
