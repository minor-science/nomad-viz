// Uneven heating from below, as in a convection experiment with several heaters under the floor.
// Each patch drifts slowly along the floor and surges on its own: its strength is a log-normal
// Ornstein-Uhlenbeck process, uneven in size and timing, so no two surges are alike.

export class HeatPatches {
  readonly floor: Float32Array;
  private cx: number[];
  private vx: number[];
  private z: number[];
  private nx: number;
  private width: number;

  /** Where each heater sits along the floor, in cells. */
  get centers(): readonly number[] {
    return this.cx;
  }

  constructor(nx: number, count: number, rand: () => number = Math.random) {
    this.nx = nx;
    this.floor = new Float32Array(nx);
    this.width = nx / (count * 1.6);
    this.cx = Array.from({ length: count }, (_, k) => ((k + 0.5) / count) * nx);
    this.vx = Array.from({ length: count }, () => (rand() - 0.5) * 0.02);
    this.z = Array.from({ length: count }, () => (rand() - 0.5) * 0.5);
  }

  /**
   * Advance one step. `surge` is the spread of the log strength, `pace` its rate of change, and
   * `wander` how fast the patches drift. Returns the floor profile, averaging 1 over time.
   */
  step(surge: number, pace: number, wander: number, rand: () => number = Math.random) {
    const { nx, floor, cx, vx, z, width } = this;
    for (let k = 0; k < cx.length; k++) {
      z[k] += -pace * z[k] + surge * Math.sqrt(2 * pace) * (rand() * 2 - 1) * 1.73;
      vx[k] += (rand() - 0.5) * 0.002 * wander - 0.01 * vx[k];
      cx[k] = (cx[k] + vx[k] * wander + nx) % nx;
    }
    // A low base everywhere, so cold stretches still conduct, plus the patches.
    const norm = (nx / (cx.length * width * Math.sqrt(Math.PI))) * Math.exp(-(surge * surge) / 2);
    for (let x = 0; x < nx; x++) {
      let h = 0.25;
      for (let k = 0; k < cx.length; k++) {
        let d = Math.abs(x - cx[k]);
        d = Math.min(d, nx - d);
        h += 0.75 * norm * Math.exp(z[k]) * Math.exp(-(d * d) / (width * width));
      }
      floor[x] = h;
    }
    return floor;
  }
}

/** A slow log-normal fluctuation around 1, for the through-flow. */
export class Wobble {
  private z = 0;
  value = 1;
  step(spread: number, pace: number, rand: () => number = Math.random) {
    this.z += -pace * this.z + spread * Math.sqrt(2 * pace) * (rand() * 2 - 1) * 1.73;
    this.value = Math.exp(this.z - (spread * spread) / 2);
    return this.value;
  }
}
