// Bands that ward off crystallization: many small agents, set against the large crystal.
//
// The physical analog is a crystallization inhibitor, such as the antifreeze proteins of polar
// fish, which bind to the surfaces of small ice crystals and stop them growing (adsorption
// inhibition, Raymond and DeVries 1977). A band settles on a cluster's surface: no atom can
// attach at its site or next to it. While the bands are mobilized, each one also wears away a
// surface atom now and then, and those atoms are destroyed, not returned (ATP 440: "destroyed or
// depleted rather than stockpiled"). Bands drift through the solution and head for the nearest
// surface within their range, so they find small clusters before those clusters grow.
import type { LatticeGas } from './latticeGas';

export interface Band {
  i: number;
}

export class Bands {
  list: Band[] = [];
  worn = 0;
  private lg: LatticeGas;
  private sense: number;
  constructor(lg: LatticeGas, sense = 10) {
    this.lg = lg;
    this.sense = sense;
  }

  place(count: number) {
    while (this.list.length < count) this.list.push({ i: (Math.random() * this.lg.n) | 0 });
    this.list.length = count;
  }

  private surfaceNeighbor(i: number): number {
    const nb = this.lg.neighbors(i);
    for (let k = 0; k < 4; k++) if (this.lg.occ[nb[k]]) return nb[k];
    return -1;
  }

  // Step toward the nearest atom within range, or wander.
  private seek(i: number): number {
    const lg = this.lg;
    const { cols, rows } = lg;
    const x0 = i % cols;
    const y0 = Math.floor(i / cols);
    const R = this.sense;
    let best = Infinity;
    let bdx = 0;
    let bdy = 0;
    for (let dy = -R; dy <= R; dy += 2) {
      for (let dx = -R; dx <= R; dx += 2) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d >= best) continue;
        if (lg.occ[((y0 + dy + rows) % rows) * cols + ((x0 + dx + cols) % cols)]) {
          best = d;
          bdx = dx;
          bdy = dy;
        }
      }
    }
    const nb = lg.neighbors(i);
    if (best === Infinity) return nb[(Math.random() * 4) | 0];
    if (Math.abs(bdx) >= Math.abs(bdy)) return nb[bdx > 0 ? 0 : 1];
    return nb[bdy > 0 ? 2 : 3];
  }

  /** Move, block, and (in proportion to `activity`) wear. */
  step(activity: number) {
    const lg = this.lg;
    lg.blocked.fill(0);
    for (const b of this.list) {
      const atom = this.surfaceNeighbor(b.i);
      if (atom < 0) {
        // Off the surface: move toward one.
        const next = this.seek(b.i);
        if (!lg.occ[next]) b.i = next;
      } else {
        if (Math.random() < activity) {
          lg.occ[atom] = 0;
          this.worn++;
        } else if (Math.random() < 0.2) {
          // Drift along the surface.
          const nb = lg.neighbors(b.i);
          const next = nb[(Math.random() * 4) | 0];
          if (!lg.occ[next] && this.surfaceNeighbor(next) >= 0) b.i = next;
        }
      }
      // Block attachment at the band and beside it.
      lg.blocked[b.i] = 1;
      const nb = lg.neighbors(b.i);
      for (let k = 0; k < 4; k++) if (!lg.occ[nb[k]]) lg.blocked[nb[k]] = 1;
    }
  }
}
