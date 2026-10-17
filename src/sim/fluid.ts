// An incompressible fluid on a grid, after Jos Stam, "Stable Fluids" (SIGGRAPH 1999).
//
// Velocity (u, v) lives at cell centers. Each step: add vorticity confinement, diffuse
// (implicit, Jacobi iterations), project to zero divergence, advect (semi-Lagrangian), project
// again. Advection is MacCormack's (Selle et al. 2008). Units are grid cells and steps, so dx = dt = 1.
//
// Boundaries: solid cells (walls, embankments) hold zero velocity (no slip). Fluid enters at the
// left edge with a prescribed profile and leaves at the right edge, where pressure is held at zero.
//
// Known limits, stated in the Sources panel: the scheme is two-dimensional, and the grid adds
// numerical viscosity, which damps the smallest eddies (less with MacCormack advection). Vorticity
// confinement (Fedkiw, Stam, and Jensen 2001) puts back some of the lost rotation; it is a
// numerical device, not physics.

export interface FluidParams {
  /** Kinematic viscosity, in cells^2 per step. */
  nu: number;
  /** Inflow speed of the upper and lower streams, in cells per step. */
  uTop: number;
  uBottom: number;
  /** Amplitude of random cross-flow at the inlet: the clinamen. */
  clinamen: number;
  /** Vorticity confinement strength. */
  confinement: number;
}

export class Fluid {
  readonly nx: number;
  readonly ny: number;
  readonly n: number;
  u: Float32Array;
  v: Float32Array;
  private u0: Float32Array;
  private v0: Float32Array;
  readonly p: Float32Array;
  private div: Float32Array;
  readonly curl: Float32Array;
  readonly solid: Uint8Array;
  /** Temperature, 0 (cold) to 1 (hot), for convection; see stepThermal. */
  readonly temp: Float32Array;
  private temp0: Float32Array;
  private rand: () => number;
  private ut: Float32Array | null = null;
  private vt: Float32Array | null = null;
  pressureIters = 20;
  shearWidth = 2;
  diffuseIters = 8;

  constructor(nx: number, ny: number, rand: () => number = Math.random) {
    this.nx = nx;
    this.ny = ny;
    this.n = nx * ny;
    this.u = new Float32Array(this.n);
    this.v = new Float32Array(this.n);
    this.u0 = new Float32Array(this.n);
    this.v0 = new Float32Array(this.n);
    this.p = new Float32Array(this.n);
    this.div = new Float32Array(this.n);
    this.curl = new Float32Array(this.n);
    this.solid = new Uint8Array(this.n);
    this.temp = new Float32Array(this.n);
    this.temp0 = new Float32Array(this.n);
    this.rand = rand;
    this.setSolid(() => false);
  }

  /** Mark solid cells. The top and bottom rows are always walls. */
  setSolid(isSolid: (x: number, y: number) => boolean) {
    const { nx, ny } = this;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = x + y * nx;
        this.solid[i] = y === 0 || y === ny - 1 || isSolid(x, y) ? 1 : 0;
        if (this.solid[i]) {
          this.u[i] = 0;
          this.v[i] = 0;
        }
      }
    }
  }

  /** Make one cell solid or fluid (used by embankments that erode and are rebuilt). */
  setCell(i: number, isSolid: boolean) {
    this.solid[i] = isSolid ? 1 : 0;
    if (isSolid) {
      this.u[i] = 0;
      this.v[i] = 0;
    }
  }

  inflow(y: number, p: FluidParams): number {
    // A tanh shear layer between the two streams, two cells thick (the standard setup for the
    // Kelvin-Helmholtz instability).
    const mid = this.ny / 2;
    // Rows count downward, so the upper stream is at small y.
    const t = Math.tanh((mid - y) / this.shearWidth);
    return 0.5 * (p.uTop + p.uBottom) + 0.5 * (p.uTop - p.uBottom) * t;
  }

  private boundaries(u: Float32Array, v: Float32Array, p: FluidParams | null) {
    const { nx, ny, solid } = this;
    for (let y = 0; y < ny; y++) {
      const l = y * nx;
      const r = nx - 1 + y * nx;
      if (p && !solid[l]) {
        u[l] = this.inflow(y, p);
        v[l] = p.clinamen * (this.rand() - 0.5);
      }
      // Outflow: zero gradient.
      u[r] = u[r - 1];
      v[r] = v[r - 1];
    }
    for (let i = 0; i < this.n; i++) {
      if (solid[i]) {
        u[i] = 0;
        v[i] = 0;
      }
    }
  }

  private sample(f: Float32Array, x: number, y: number): number {
    const { nx, ny } = this;
    x = Math.min(nx - 1.001, Math.max(0, x));
    y = Math.min(ny - 1.001, Math.max(0, y));
    const x0 = x | 0;
    const y0 = y | 0;
    const sx = x - x0;
    const sy = y - y0;
    const i = x0 + y0 * nx;
    return (1 - sy) * ((1 - sx) * f[i] + sx * f[i + 1]) + sy * ((1 - sx) * f[i + nx] + sx * f[i + nx + 1]);
  }

  velocityAt(x: number, y: number): [number, number] {
    return [this.sample(this.u, x, y), this.sample(this.v, x, y)];
  }

  curlAt(x: number, y: number): number {
    return this.sample(this.curl, x, y);
  }

  computeCurl() {
    const { nx, ny, u, v, curl } = this;
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        curl[i] = 0.5 * (v[i + 1] - v[i - 1] - (u[i + nx] - u[i - nx]));
      }
    }
  }

  private confine(eps: number) {
    if (eps <= 0) return;
    const { nx, ny, u, v, curl, solid } = this;
    this.computeCurl();
    for (let y = 2; y < ny - 2; y++) {
      for (let x = 2; x < nx - 2; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        const gx = 0.5 * (Math.abs(curl[i + 1]) - Math.abs(curl[i - 1]));
        const gy = 0.5 * (Math.abs(curl[i + nx]) - Math.abs(curl[i - nx]));
        const len = Math.hypot(gx, gy) + 1e-6;
        u[i] += eps * (gy / len) * curl[i];
        v[i] -= eps * (gx / len) * curl[i];
      }
    }
  }

  private diffuse(nu: number) {
    if (nu <= 0) return;
    const { nx, ny, u, v, u0, v0, solid } = this;
    u0.set(u);
    v0.set(v);
    const a = nu;
    for (let k = 0; k < this.diffuseIters; k++) {
      for (let y = 1; y < ny - 1; y++) {
        for (let x = 1; x < nx - 1; x++) {
          const i = x + y * nx;
          if (solid[i]) continue;
          u[i] = (u0[i] + a * (u[i - 1] + u[i + 1] + u[i - nx] + u[i + nx])) / (1 + 4 * a);
          v[i] = (v0[i] + a * (v[i - 1] + v[i + 1] + v[i - nx] + v[i + nx])) / (1 + 4 * a);
        }
      }
    }
  }

  private project() {
    const { nx, ny, u, v, p, div, solid } = this;
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        div[i] = solid[i] ? 0 : -0.5 * (u[i + 1] - u[i - 1] + v[i + nx] - v[i - nx]);
        p[i] = 0;
      }
    }
    for (let k = 0; k < this.pressureIters; k++) {
      for (let y = 1; y < ny - 1; y++) {
        for (let x = 1; x < nx - 1; x++) {
          const i = x + y * nx;
          if (solid[i]) continue;
          // Neumann at walls and at the inlet, where velocity is given: the neighbor contributes
          // this cell's own pressure. Dirichlet (zero) at the outlet.
          const pl = x === 1 || solid[i - 1] ? p[i] : p[i - 1];
          const pr = x === nx - 2 ? 0 : solid[i + 1] ? p[i] : p[i + 1];
          const pd = solid[i - nx] ? p[i] : p[i - nx];
          const pu = solid[i + nx] ? p[i] : p[i + nx];
          p[i] = (div[i] + pl + pr + pd + pu) / 4;
        }
      }
    }
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        const pl = x === 1 || solid[i - 1] ? p[i] : p[i - 1];
        const pr = x === nx - 2 ? 0 : solid[i + 1] ? p[i] : p[i + 1];
        const pd = solid[i - nx] ? p[i] : p[i - nx];
        const pu = solid[i + nx] ? p[i] : p[i + nx];
        u[i] -= 0.5 * (pr - pl);
        v[i] -= 0.5 * (pu - pd);
      }
    }
  }

  // MacCormack advection (Selle et al. 2008): a semi-Lagrangian step back, one forward to
  // estimate its error, half the error added back, then clamped to the values it was
  // interpolated from so it cannot overshoot. Much less numerical viscosity than plain
  // semi-Lagrangian advection, which matters here because that viscosity damps the eddies.
  private advect() {
    const { nx, ny, u, v, u0, v0, solid } = this;
    u0.set(u);
    v0.set(v);
    const uh = this.ut ?? (this.ut = new Float32Array(this.n));
    const vh = this.vt ?? (this.vt = new Float32Array(this.n));
    // Backward step.
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) { uh[i] = 0; vh[i] = 0; continue; }
        uh[i] = this.sample(u0, x - u0[i], y - v0[i]);
        vh[i] = this.sample(v0, x - u0[i], y - v0[i]);
      }
    }
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        // Forward step from the backward result, to estimate the error.
        const ur = this.sample(uh, x + u0[i], y + v0[i]);
        const vr = this.sample(vh, x + u0[i], y + v0[i]);
        let un = uh[i] + 0.5 * (u0[i] - ur);
        let vn = vh[i] + 0.5 * (v0[i] - vr);
        // Clamp to the four values around the departure point.
        const bx = Math.min(nx - 1.001, Math.max(0, x - u0[i]));
        const by = Math.min(ny - 1.001, Math.max(0, y - v0[i]));
        const j = (bx | 0) + (by | 0) * nx;
        const ulo = Math.min(u0[j], u0[j + 1], u0[j + nx], u0[j + nx + 1]);
        const uhi = Math.max(u0[j], u0[j + 1], u0[j + nx], u0[j + nx + 1]);
        const vlo = Math.min(v0[j], v0[j + 1], v0[j + nx], v0[j + nx + 1]);
        const vhi = Math.max(v0[j], v0[j + 1], v0[j + nx], v0[j + nx + 1]);
        if (un < ulo || un > uhi) un = uh[i];
        if (vn < vlo || vn > vhi) vn = vh[i];
        u[i] = un;
        v[i] = vn;
      }
    }
  }

  step(p: FluidParams) {
    this.boundaries(this.u, this.v, p);
    this.confine(p.confinement);
    this.diffuse(p.nu);
    this.boundaries(this.u, this.v, p);
    this.project();
    this.boundaries(this.u, this.v, p);
    this.advect();
    this.boundaries(this.u, this.v, p);
    this.project();
    this.boundaries(this.u, this.v, p);
    this.computeCurl();
  }

  /**
   * Heat and buoyancy (the Boussinesq approximation): temperature is carried by the flow and
   * conducts (diffusivity kappa); warm liquid rises with a force proportional to how much warmer it
   * is than `ref`. The floor is held at `hot` (one value, or one per column for uneven heating), the
   * ceiling at 0, and liquid enters at the left with the conduction profile between them. Call
   * before step().
   */
  stepThermal(hot: number | Float32Array, kappa: number, buoyancy: number, ref?: number) {
    const { nx, ny, u, v, temp, temp0, solid } = this;
    const floor = (x: number) => (typeof hot === 'number' ? hot : hot[x]);
    temp0.set(temp);
    // Carry heat with the flow (semi-Lagrangian), then conduct it (explicit).
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        temp[i] = this.sample(temp0, x - u[i], y - v[i]);
      }
    }
    temp0.set(temp);
    for (let y = 1; y < ny - 1; y++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        temp[i] = temp0[i] + kappa * (temp0[i - 1] + temp0[i + 1] + temp0[i - nx] + temp0[i + nx] - 4 * temp0[i]);
      }
    }
    // Boundaries: hot floor, cold ceiling, conduction profile at the inlet, zero gradient at the outlet.
    for (let x = 0; x < nx; x++) {
      temp[x] = 0;
      temp[x + (ny - 1) * nx] = floor(x);
    }
    for (let y = 0; y < ny; y++) {
      temp[y * nx] = (floor(0) * y) / (ny - 1);
      temp[nx - 1 + y * nx] = temp[nx - 2 + y * nx];
    }
    // Buoyancy: rows count downward, so warmer liquid gets a negative (upward) push.
    const mid = ref ?? (typeof hot === 'number' ? hot : hot.reduce((a, b) => a + b, 0) / nx) / 2;
    for (let i = 0; i < this.n; i++) {
      if (!solid[i]) v[i] -= buoyancy * (temp[i] - mid);
    }
  }

  /** Mean absolute cross-stream velocity over the right half: a rough measure of turbulence. */
  crossflow(): number {
    const { nx, ny, v, solid } = this;
    let s = 0;
    let c = 0;
    for (let y = 1; y < ny - 1; y++) {
      for (let x = (nx / 2) | 0; x < nx - 1; x++) {
        const i = x + y * nx;
        if (solid[i]) continue;
        s += Math.abs(v[i]);
        c++;
      }
    }
    return c ? s / c : 0;
  }
}
