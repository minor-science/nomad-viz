// The State's works: crews that build embankments into open water and repair them.
//
// Banks run along fixed rows (the routes). Each row is built from the inlet downstream, one cell at a
// time, by the crews assigned to it: a crew first repairs any breach behind the front of its row,
// and only then extends the front. Bank cells erode where the flow presses on them (mostly cross-flow
// through the bank and the vorticity of eddies against it) beyond a critical value.
// A breach widens fast, because water rushing through a gap presses hardest on the cells beside it.
// So building is slow and collapse is fast, and the front of capture advances and falls back.
//
// The crews are this model's stand-in for the State's works (ATP 363: "conduits, pipes,
// embankments, which prevent turbulence"); ATP gives the waterworks, not the crews.
import type { Fluid } from './fluid';

export interface Crew {
  row: number;
  x: number;
  progress: number;
  repairing: boolean;
}

export interface WorksParams {
  /** Cells a crew adds per step when extending (fractional). */
  build: number;
  /** Integrity a crew restores per step when repairing. */
  repair: number;
  /** Erosion per step per unit of excess stress. */
  erode: number;
  /** Stress below which banks do not erode. */
  critical: number;
  /** Weight of eddy vorticity in the stress. */
  eddy: number;
}

export class Works {
  readonly rows: number[];
  /** Integrity of each cell on a bank row: 1 standing, below 1 worn, 0 or less breached, -1 not built. */
  readonly integrity: Float32Array;
  readonly front: number[];
  crews: Crew[] = [];
  breaches = 0;
  private fluid: Fluid;
  private maxX: number;

  constructor(fluid: Fluid, rows: number[], maxX: number) {
    this.fluid = fluid;
    this.rows = rows;
    this.maxX = maxX;
    this.integrity = new Float32Array(fluid.n).fill(-1);
    this.front = rows.map(() => 0);
  }

  placeCrews(count: number) {
    while (this.crews.length < count) {
      const row = this.crews.length % this.rows.length;
      this.crews.push({ row, x: 0, progress: 0, repairing: false });
    }
    this.crews.length = count;
  }

  private idx(x: number, r: number) {
    return x + this.rows[r] * this.fluid.nx;
  }

  // Stress on a bank cell: cross-flow at the cell and in the two cells either side, which is how
  // eddies and surges show up. Flow running along a bank counts for little, and the shear of the
  // wall's own boundary layer is left out on purpose, since every bank has it.
  stress(i: number, eddy: number): number {
    const { u, v, nx } = this.fluid;
    const a = i - nx;
    const b = i + nx;
    const a2 = i - 2 * nx;
    const b2 = i + 2 * nx;
    return (
      0.1 * Math.max(Math.abs(u[a]), Math.abs(u[b])) +
      2 * Math.abs(v[i]) +
      eddy * (Math.abs(v[a]) + Math.abs(v[b]) + 0.5 * (Math.abs(v[a2]) + Math.abs(v[b2])))
    );
  }

  private sinceAssign = 0;

  // Every so often each crew moves to the route that most needs it: the least of it standing.
  private reassign() {
    const f = this.fluid;
    const standing = this.rows.map((_, r) => {
      let s = 0;
      for (let x = 0; x < this.front[r]; x++) if (this.integrity[this.idx(x, r)] >= 1) s++;
      return s;
    });
    const load = this.rows.map(() => 0);
    for (const c of this.crews) {
      // Fewest standing cells per crew already there.
      let best = 0;
      let bestScore = Infinity;
      for (let r = 0; r < this.rows.length; r++) {
        const score = (standing[r] + 1) * (load[r] + 1);
        if (score < bestScore) {
          bestScore = score;
          best = r;
        }
      }
      if (c.row !== best) {
        c.row = best;
        c.x = 0;
        c.progress = 0;
      }
      load[best]++;
    }
    void f;
  }

  /** One step: erosion, then the crews. Returns the fraction of the planned length standing. */
  step(p: WorksParams): number {
    if (++this.sinceAssign >= 300) {
      this.sinceAssign = 0;
      this.reassign();
    }
    const f = this.fluid;
    // Erosion and breaches
    for (let r = 0; r < this.rows.length; r++) {
      for (let x = 0; x < this.front[r]; x++) {
        const i = this.idx(x, r);
        const g = this.integrity[i];
        if (g <= 0) continue;
        const excess = this.stress(i, p.eddy) - p.critical;
        if (excess > 0) {
          const next = g - p.erode * excess;
          this.integrity[i] = next;
          if (next <= 0) {
            this.integrity[i] = 0;
            f.setCell(i, false);
            this.breaches++;
          }
        }
      }
    }
    // Crews: repair the nearest breach behind the front, else extend the front.
    for (const c of this.crews) {
      const r = c.row;
      let target = -1;
      for (let x = 0; x < this.front[r]; x++) {
        const i = this.idx(x, r);
        const g = this.integrity[i];
        // Breaches and badly worn cells call for repair; light wear can wait.
        if (g >= 0 && (!f.solid[i] || g < 0.5)) {
          if (target < 0 || Math.abs(x - c.x) < Math.abs(target - c.x)) target = x;
        }
      }
      c.repairing = target >= 0;
      const goal = target >= 0 ? target : this.front[r];
      if (Math.abs(goal - c.x) > 0.5) {
        c.x += Math.sign(goal - c.x) * Math.min(1, Math.abs(goal - c.x));
        continue;
      }
      if (target >= 0) {
        const i = this.idx(target, r);
        this.integrity[i] = Math.min(1, this.integrity[i] + p.repair);
        if (this.integrity[i] >= 1 && !f.solid[i]) f.setCell(i, true);
      } else if (this.front[r] < this.maxX) {
        c.progress += p.build;
        if (c.progress >= 1) {
          c.progress = 0;
          const i = this.idx(this.front[r], r);
          this.integrity[i] = 1;
          f.setCell(i, true);
          this.front[r]++;
        }
      }
    }
    // Standing length over the planned length.
    let standing = 0;
    for (let r = 0; r < this.rows.length; r++) {
      for (let x = 0; x < this.front[r]; x++) if (this.integrity[this.idx(x, r)] >= 1) standing++;
    }
    return standing / (this.rows.length * this.maxX);
  }
}
