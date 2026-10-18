// Bands that ward off crystallization: many small agents, set against the large crystal.
//
// The physical analog is a crystallization inhibitor, such as the antifreeze proteins of polar
// fish, which bind to the surfaces of small ice crystals and stop them growing (adsorption
// inhibition, Raymond and DeVries 1977). A band settles on a cluster's surface: no atom can
// attach at its site or next to it. While the bands are mobilized, each one also wears away a
// surface atom now and then, and those atoms are destroyed, not returned (ATP 440: "destroyed or
// depleted rather than stockpiled"). Bands drift through the solution and head for the nearest
// surface within their range, so they find small clusters before those clusters grow.
//
// Each band keeps to a territory around a home site and, once per operation period, moves to a
// new territory nearby: ATP's primitive assemblage "perseveres only by switching territories at the
// conclusion of each operation period (itinerancy, itineration)" (440). This is what sets bands
// apart from the smiths, who follow the matter-flow anywhere.
import type { LatticeGas } from './latticeGas';

export interface Band {
  i: number;
  home: number;
  /** Reach of its blocking, in cells (1 to 3), and a multiplier on its wearing. */
  size: number;
  /** Steps in a row without mobilizing. */
  idle?: number;
  /** Came from a smith (a line of flight). */
  fromSmith?: boolean;
}

export class Bands {
  list: Band[] = [];
  worn = 0;
  private lg: LatticeGas;
  private sense: number;
  /** Territory radius, in cells. */
  territory = 14;
  constructor(lg: LatticeGas, sense = 10) {
    this.lg = lg;
    this.sense = sense;
  }

  private dist(a: number, b: number) {
    const { cols, rows } = this.lg;
    let dx = Math.abs((a % cols) - (b % cols));
    let dy = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
    dx = Math.min(dx, cols - dx);
    dy = Math.min(dy, rows - dy);
    return Math.max(dx, dy);
  }

  // One step from a toward b, on the torus.
  private toward(a: number, b: number) {
    const { cols, rows } = this.lg;
    let dx = (b % cols) - (a % cols);
    let dy = Math.floor(b / cols) - Math.floor(a / cols);
    if (Math.abs(dx) > cols / 2) dx -= Math.sign(dx) * cols;
    if (Math.abs(dy) > rows / 2) dy -= Math.sign(dy) * rows;
    const nb = this.lg.neighbors(a);
    if (Math.abs(dx) >= Math.abs(dy)) return nb[dx > 0 ? 0 : 1];
    return nb[dy > 0 ? 2 : 3];
  }

  /** Every band moves to a new territory nearby, settling near the closest forming cluster it can
   * find (anticipation: attending to where power is starting to gather). Requires a current label(). */
  shiftTerritories() {
    const lg = this.lg;
    const { cols, rows } = lg;
    const reach = 3 * this.territory;
    for (const b of this.list) {
      const x0 = b.home % cols;
      const y0 = Math.floor(b.home / cols);
      let best = -1;
      let bestD = Infinity;
      for (let k = 0; k < 60; k++) {
        const x = (((x0 + Math.round((Math.random() - 0.5) * 2 * reach)) % cols) + cols) % cols;
        const y = (((y0 + Math.round((Math.random() - 0.5) * 2 * reach)) % rows) + rows) % rows;
        const j = y * cols + x;
        if (lg.occ[j] && lg.cid[j] >= 0) {
          const d = this.dist(j, b.home);
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
      }
      if (best >= 0) b.home = best;
      else {
        const x = x0 + Math.round((Math.random() - 0.5) * 2 * reach);
        const y = y0 + Math.round((Math.random() - 0.5) * 2 * reach);
        b.home = (((y % rows) + rows) % rows) * cols + (((x % cols) + cols) % cols);
      }
    }
  }

  place(count: number) {
    while (this.list.length < count) {
      const i = (Math.random() * this.lg.n) | 0;
      // Mostly small bands, a few larger ones.
      const r = Math.random();
      const size = r < 0.55 ? 1 : r < 0.88 ? 2 : 3;
      this.list.push({ i, home: i, size });
    }
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
      b.idle = activity < 0.15 ? (b.idle ?? 0) + 1 : 0;
      if (this.dist(b.i, b.home) > this.territory) {
        // Outside its territory: head home.
        const next = this.toward(b.i, b.home);
        if (!lg.occ[next]) b.i = next;
      } else if (atom < 0) {
        // Off the surface: move toward one, within the territory.
        const next = this.seek(b.i);
        if (!lg.occ[next] && this.dist(next, b.home) <= this.territory) b.i = next;
      } else {
        // Larger bands wear more: up to `size` atoms per step.
        for (let k = 0; k < b.size; k++) {
          if (Math.random() >= activity) continue;
          const a2 = k === 0 ? atom : this.surfaceNeighbor(b.i);
          if (a2 < 0) break;
          lg.occ[a2] = 0;
          this.worn++;
        }
        if (Math.random() < 0.2) {
          // Drift along the surface.
          const nb = lg.neighbors(b.i);
          const next = nb[(Math.random() * 4) | 0];
          if (!lg.occ[next] && this.surfaceNeighbor(next) >= 0) b.i = next;
        }
      }
      // Block attachment over a patch as wide as the band.
      const { cols, rows } = lg;
      const x0 = b.i % cols;
      const y0 = Math.floor(b.i / cols);
      for (let dy = -b.size; dy <= b.size; dy++) {
        for (let dx = -b.size; dx <= b.size; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > b.size) continue;
          const j = (((y0 + dy) % rows + rows) % rows) * cols + (((x0 + dx) % cols + cols) % cols);
          if (!lg.occ[j]) lg.blocked[j] = 1;
        }
      }
    }
  }
}
