// Embankments that erode under the flow and are rebuilt in calm water.
//
// Each planned embankment cell has an integrity between 0 and 1. The stress on it is taken as the
// fastest flow in the cells beside it, plus their cross-flow: a stand-in for the shear stress a
// current exerts on a bank. Above a critical stress the bank erodes in proportion to the excess,
// which is the form of the Shields criterion for sediment transport (Shields 1936). At zero
// integrity the cell becomes water: a breach. Where the stress is below critical, the bank is
// repaired, and a breach is closed again once its integrity is restored. The repair is this
// model's stand-in for the State's upkeep of its waterworks (ATP 363, cf. Wittfogel).
import type { Fluid } from './fluid';

export class Embankments {
  /** Integrity per cell, or -1 where no embankment is planned. */
  readonly integrity: Float32Array;
  breaches = 0;
  private fluid: Fluid;

  constructor(fluid: Fluid, planned: (x: number, y: number) => boolean) {
    this.fluid = fluid;
    this.integrity = new Float32Array(fluid.n).fill(-1);
    for (let y = 1; y < fluid.ny - 1; y++) {
      for (let x = 0; x < fluid.nx; x++) {
        if (planned(x, y)) {
          const i = x + y * fluid.nx;
          this.integrity[i] = 1;
          fluid.setCell(i, true);
        }
      }
    }
  }

  stress(i: number): number {
    const { u, v, nx } = this.fluid;
    const a = i - nx;
    const b = i + nx;
    return Math.max(Math.abs(u[a]), Math.abs(u[b])) + 0.5 * (Math.abs(v[a]) + Math.abs(v[b]));
  }

  /** One step of erosion and repair. Returns the fraction of planned cells standing. */
  update(erode: number, repair: number, critical: number): number {
    const f = this.fluid;
    let planned = 0;
    let standing = 0;
    for (let i = 0; i < f.n; i++) {
      const g = this.integrity[i];
      if (g < 0) continue;
      planned++;
      const excess = this.stress(i) - critical;
      if (f.solid[i]) {
        const next = excess > 0 ? g - erode * excess : Math.min(1, g + repair);
        this.integrity[i] = next;
        if (next <= 0) {
          this.integrity[i] = 0;
          f.setCell(i, false);
          this.breaches++;
        } else standing++;
      } else if (excess < 0) {
        const next = g + repair;
        this.integrity[i] = Math.min(1, next);
        if (next >= 1) {
          f.setCell(i, true);
          standing++;
        }
      }
    }
    return planned ? standing / planned : 1;
  }
}
