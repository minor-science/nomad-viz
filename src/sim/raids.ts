// Flows turning against the routes that striate them (ATP 386: "when a State does not succeed in
// striating its interior or neighboring space, the flows traversing that State necessarily adopt
// the stance of a war machine directed against it").
//
// Each route keeps its own mobilization: it rises while that route reaches far into the river and
// relaxes once the route is broken back, so routes advance and break out of step with each other.
// A raid stirs an eddy beside the route's built length, and its strength comes from the speed of
// the water there: the war machine is the flow itself turning, not something added from outside.
import type { Fluid } from './fluid';
import type { Works } from './works';

export interface RaidParams {
  alarm: number;
  calm: number;
  mobilizeRate: number;
  raidRate: number;
  raidStrength: number;
}

export interface RaidEvent {
  x: number;
  y: number;
  row: number;
}

export class RouteRaids {
  mob: number[];
  mobilized: boolean[];

  constructor(routes: number) {
    this.mob = new Array(routes).fill(0);
    this.mobilized = new Array(routes).fill(false);
  }

  /** One step: update each route's mobilization, and maybe raid. Returns the raids made. */
  step(fluid: Fluid, works: Works, maxX: number, p: RaidParams): RaidEvent[] {
    const out: RaidEvent[] = [];
    for (let r = 0; r < works.rows.length; r++) {
      let standing = 0;
      for (let x = 0; x < works.front[r]; x++) if (works.integrity[x + works.rows[r] * fluid.nx] >= 1) standing++;
      const reach = standing / maxX;
      if (reach > p.alarm) this.mobilized[r] = true;
      else if (reach < p.calm) this.mobilized[r] = false;
      this.mob[r] = Math.max(0, Math.min(1, this.mob[r] + (this.mobilized[r] ? p.mobilizeRate : -p.mobilizeRate / 2)));
      if (works.front[r] > 4 && Math.random() < p.raidRate * this.mob[r] / works.rows.length) {
        const x = 2 + Math.random() * (works.front[r] - 2);
        const y = works.rows[r] + (Math.random() < 0.5 ? -3 : 3);
        const [u] = fluid.velocityAt(x, y);
        // Stronger where the water runs faster.
        const strength = p.raidStrength * Math.min(2, Math.abs(u) / 0.5);
        fluid.addVortex(x, y, 4, (Math.random() < 0.5 ? -1 : 1) * strength);
        out.push({ x, y, row: r });
      }
    }
    return out;
  }

  mean(): number {
    return this.mob.reduce((a, b) => a + b, 0) / Math.max(1, this.mob.length);
  }
}
