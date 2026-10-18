// Smiths on the lattice gas: itinerants who follow the matter-flow (ATP 409-15).
//
// A smith walks along grain boundaries first, then along the solid's edge, and heads for the
// nearest boundary when it loses one. Where it walks on a boundary it may carve: the atom there
// melts back into solution (returned to the reservoir), as at a forge. Carving leaves channels
// through the solid, ATP's holey space (413-15). Carving is this model's addition; ATP's smiths
// bore holes, but ATP gives no physics for it.
import type { LatticeGas } from './latticeGas';

export interface Smith {
  i: number;
  dir: number;
  trail: number[];
  /** Walled in by the stock, with no open solution in reach: it stops carving. */
  walled?: boolean;
  /** Steps in a row with no boundary or edge in reach to follow. */
  idle?: number;
  /** Came from a clan (a line of flight). */
  fromClan?: boolean;
  /** Steps since it last carved anything. */
  sinceCarve?: number;
}

const TRAIL = 40;

export class Smiths {
  list: Smith[] = [];
  carved = 0;
  private lg: LatticeGas;
  private sense: number;
  constructor(lg: LatticeGas, sense = 8) {
    this.lg = lg;
    this.sense = sense;
  }

  place(count: number) {
    while (this.list.length < count) {
      this.list.push({ i: (Math.random() * this.lg.n) | 0, dir: (Math.random() * 4) | 0, trail: [] });
    }
    this.list.length = count;
  }

  private seekBy(i: number, test: (j: number) => boolean): number | null {
    const lg = this.lg;
    const { cols, rows } = lg;
    const x0 = i % cols;
    const y0 = Math.floor(i / cols);
    const R = this.sense;
    let best = Infinity;
    let bdx = 0;
    let bdy = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d >= best) continue;
        const j = ((y0 + dy + rows) % rows) * cols + ((x0 + dx + cols) % cols);
        if (test(j)) {
          best = d;
          bdx = dx;
          bdy = dy;
        }
      }
    }
    if (best === Infinity) return null;
    // Directions as in the neighbor table: 0 = +x, 1 = -x, 2 = +y, 3 = -y.
    if (Math.abs(bdx) >= Math.abs(bdy)) return bdx > 0 ? 0 : 1;
    return bdy > 0 ? 2 : 3;
  }

  /** Move every smith `steps` cells; on a boundary, carve with probability `carve`. */
  step(steps: number, carve: number) {
    const lg = this.lg;
    const grain = (j: number) => lg.isGrainBoundary(j);
    const edge = (j: number) => lg.isBoundary(j);
    for (const s of this.list) {
      for (let k = 0; k < steps; k++) {
        const nb = lg.neighbors(s.i);
        const order = [s.dir, (s.dir + 1) % 4, (s.dir + 3) % 4, (s.dir + 2) % 4];
        const turns = Math.random() < 0.5 ? order : [order[0], order[2], order[1], order[3]];
        let next = -1;
        for (const test of [grain, edge]) {
          for (const d of turns) {
            if (test(nb[d])) {
              next = d;
              break;
            }
          }
          if (next >= 0) break;
        }
        if (next < 0) {
          const sought = this.seekBy(s.i, grain) ?? this.seekBy(s.i, edge);
          if (sought === null) {
            s.idle = (s.idle ?? 0) + 1;
            next = Math.random() < 0.8 ? s.dir : (Math.random() * 4) | 0;
          } else {
            s.idle = 0;
            next = sought;
          }
        } else s.idle = 0;
        s.dir = next;
        s.i = nb[next];
        s.sinceCarve = (s.sinceCarve ?? 0) + 1;
        if (!s.walled && carve > 0 && lg.occ[s.i] && edge(s.i) && Math.random() < carve) {
          s.sinceCarve = 0;
          lg.occ[s.i] = 0;
          if (lg.reservoir) lg.reservoir.dissolved += 1;
          this.carved++;
        }
        s.trail.push(s.i);
        if (s.trail.length > TRAIL) s.trail.shift();
      }
    }
  }
}
