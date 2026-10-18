// Newtonian gravity around a heavy center: the physics of the cosmic model.
//   The capital: a fixed central mass. Bodies bound to it (negative energy relative to it) circle
//     it on closed orbits.
//   Societies: small clusters, each bound by its own members' gravity, orbiting the capital. Near a
//     heavy center its pull differs enough across a cluster to strip members away (tides). The
//     tidal radius r_t = d (m / 3M)^(1/3) is the threshold. When a society's size nears its tidal
//     radius it can cool its internal motion and contract (the model's device for anticipation).
//   Companies: heavy single bodies on open paths that no orbit holds. Passing through the
//     capital's bodies they fling them out (a fly-by), and the crowd's pull slows them
//     (dynamical friction, Chandrasekhar's formula in local form), until one may be caught in orbit.
// Every body attracts every other (softened gravity); the integrator is leapfrog, which keeps
// orbits from drifting. Bodies that leave the field return as new societies from its edges.

export const HELD = 0; // bound to the capital
export const SOCIETY = 1; // attached to its own society
export const COMPANY = 2; // a free company
export const ARMY = 3; // a company caught in orbit around the capital
export const FREE = 4; // none of these
export const PETTY = 5; // a society that collapsed into a small State of its own

export interface OrbitParams {
  capital: number; // the central mass
  friction: number; // strength of dynamical friction on companies
  sink: number; // strength of dynamical friction on whole societies, from the capital's crowd
  cool: number; // how strongly societies cool when their tide alarm is raised
  alarm: number; // ratio of a society's size to its tidal radius that raises the alarm
}

export class Orbits {
  readonly w: number;
  readonly h: number;
  readonly cx: number;
  readonly cy: number;
  readonly cap: number;
  n = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly m: Float32Array;
  readonly soc: Int16Array; // society id, or -1
  readonly isCompany: Uint8Array;
  readonly bound: Uint16Array; // steps a company has spent caught in orbit
  readonly contacted: Uint8Array; // 1 once a company has passed through the capital city
  readonly isState: Uint8Array; // 1 for a society that collapsed into a small State
  readonly isBorn: Uint8Array; // 1 for a company born from a society
  readonly exSoc: Int16Array; // the society a body last belonged to, or -1
  readonly exAt: Int32Array; // the step it left
  readonly kind: Uint8Array;
  private ax: Float32Array;
  private ay: Float32Array;
  G = 0.01;
  soft = 0.8;
  societySize = 18;
  companyMass = 12;
  /** Per society: center of mass, mean velocity, size (rms radius), tidal radius, alarm. */
  socX: number[] = [];
  socY: number[] = [];
  socVX: number[] = [];
  socVY: number[] = [];
  socSize: number[] = [];
  socTide: number[] = [];
  socCount: number[] = [];
  socAlarm: boolean[] = [];
  private nextSoc = 0;
  /** Companies that sank to the center in orbit and were absorbed into the capital's army. */
  absorbed = 0;
  /** Raids: companies that passed through the capital city and rode off the field. */
  raids = 0;
  /** Distance from the center within which a company counts as having met the capital city. */
  contactRadius = 14;
  /** Lines of flight. A society smaller than `collapse` (its rms radius) collapses into a small
   *  State; a group of at least `breakaway` former members leaving together fast becomes a company. */
  collapse = 0.55;
  breakaway = 5;
  breakawaySpeed = 0.7;
  hardened = 0;
  born = 0;
  annexed = 0;
  private time = 0;
  /** Radius within which a caught company is absorbed. */
  armyRadius = 3;
  /** Steps in orbit after which a caught company is absorbed. */
  armyTime = 800;
  /** New societies form at these fractions of the field's height from the capital, up to a limit. */
  spawnNear = 0.26;
  spawnFar = 0.38;
  societyLimit = 14;
  /** Strength of the capital city's halo in the crowd that slows societies. */
  halo = 1;
  private pool = 0;
  private rand: () => number;

  constructor(w: number, h: number, cap = 700, rand: () => number = Math.random) {
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h / 2;
    this.cap = cap;
    this.rand = rand;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.m = new Float32Array(cap);
    this.soc = new Int16Array(cap);
    this.isCompany = new Uint8Array(cap);
    this.bound = new Uint16Array(cap);
    this.contacted = new Uint8Array(cap);
    this.isState = new Uint8Array(cap);
    this.isBorn = new Uint8Array(cap);
    this.exSoc = new Int16Array(cap).fill(-1);
    this.exAt = new Int32Array(cap);
    this.kind = new Uint8Array(cap);
    this.ax = new Float32Array(cap);
    this.ay = new Float32Array(cap);
  }

  /** Place a society of `societySize` bodies at distance d from the capital, on a circular orbit. */
  addSociety(d: number, angle: number, capital: number) {
    if (this.n + this.societySize > this.cap) return;
    const id = this.nextSoc++;
    const px = this.cx + d * Math.cos(angle);
    const py = this.cy + d * Math.sin(angle);
    const vorb = Math.sqrt((this.G * capital) / d);
    const vx0 = -Math.sin(angle) * vorb;
    const vy0 = Math.cos(angle) * vorb;
    const mass = this.societySize;
    const radius = 2.2;
    // Members on near-circular orbits about the society's own center (virial speeds).
    for (let k = 0; k < this.societySize; k++) {
      const i = this.n++;
      const r = radius * Math.sqrt(this.rand());
      const a = this.rand() * 2 * Math.PI;
      const vin = Math.sqrt((this.G * mass * Math.max(0.3, (r / radius) ** 2)) / Math.max(r, 0.5)) * 0.8;
      this.x[i] = px + r * Math.cos(a);
      this.y[i] = py + r * Math.sin(a);
      this.vx[i] = vx0 - Math.sin(a) * vin;
      this.vy[i] = vy0 + Math.cos(a) * vin;
      this.m[i] = 1;
      this.soc[i] = id;
      this.isCompany[i] = 0;
      this.isState[i] = 0;
      this.isBorn[i] = 0;
      this.exSoc[i] = -1;
    }
  }

  /** Send in a company from the left or right edge, heading for the capital city: a raider aims
   *  straight through its center, and any other company at a point beside it, passing within
   *  reach of its gates and its crowd. */
  addCompany(speed: number, raid = false, mass = this.companyMass) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    const fromLeft = this.rand() < 0.5;
    this.x[i] = fromLeft ? 1 : this.w - 1;
    this.y[i] = this.h * (0.1 + 0.8 * this.rand());
    const miss = raid ? (this.rand() - 0.5) * 8 : (this.rand() < 0.5 ? -1 : 1) * (6 + 12 * this.rand());
    const aim = Math.atan2(this.cy + miss - this.y[i], this.cx - this.x[i]);
    this.vx[i] = Math.cos(aim) * speed;
    this.vy[i] = Math.sin(aim) * speed;
    this.m[i] = mass;
    this.soc[i] = -1;
    this.isCompany[i] = 1;
    this.bound[i] = 0;
    this.contacted[i] = 0;
    this.isState[i] = 0;
    this.isBorn[i] = 0;
    this.exSoc[i] = -1;
  }

  /** Remove body i. Unless `pooled` is false, the people it carries return later as a new society. */
  private remove(i: number, pooled = true) {
    const j = --this.n;
    if (pooled && (!this.isCompany[i] || this.isBorn[i])) this.pool += Math.round(this.m[i]);
    for (const a of [this.x, this.y, this.vx, this.vy, this.m]) a[i] = a[j];
    this.soc[i] = this.soc[j];
    this.isCompany[i] = this.isCompany[j];
    this.bound[i] = this.bound[j];
    this.contacted[i] = this.contacted[j];
    this.isState[i] = this.isState[j];
    this.isBorn[i] = this.isBorn[j];
    this.exSoc[i] = this.exSoc[j];
    this.exAt[i] = this.exAt[j];
    this.kind[i] = this.kind[j];
  }

  private accel(p: OrbitParams) {
    const { n, x, y, m, ax, ay, cx, cy } = this;
    const s2 = this.soft * this.soft;
    const G = this.G;
    for (let i = 0; i < n; i++) {
      const dx = cx - x[i];
      const dy = cy - y[i];
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 4);
      ax[i] = G * p.capital * dx * inv * inv * inv;
      ay[i] = G * p.capital * dy * inv * inv * inv;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[j] - x[i];
        const dy = y[j] - y[i];
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + s2);
        const f = G * inv * inv * inv;
        ax[i] += f * m[j] * dx;
        ay[i] += f * m[j] * dy;
        ax[j] -= f * m[i] * dx;
        ay[j] -= f * m[i] * dy;
      }
    }
  }

  /** Measure each society: center, size, and tidal radius relative to the capital. */
  private measureSocieties(capital: number) {
    const k = this.nextSoc;
    const sx = new Float64Array(k), sy = new Float64Array(k), svx = new Float64Array(k), svy = new Float64Array(k), c = new Float64Array(k);
    for (let i = 0; i < this.n; i++) {
      const s = this.soc[i];
      if (s < 0) continue;
      sx[s] += this.x[i];
      sy[s] += this.y[i];
      svx[s] += this.vx[i];
      svy[s] += this.vy[i];
      c[s]++;
    }
    const size = new Float64Array(k);
    for (let i = 0; i < this.n; i++) {
      const s = this.soc[i];
      if (s < 0 || !c[s]) continue;
      size[s] += (this.x[i] - sx[s] / c[s]) ** 2 + (this.y[i] - sy[s] / c[s]) ** 2;
    }
    for (let s = 0; s < k; s++) {
      const cnt = c[s];
      this.socCount[s] = cnt;
      if (!cnt) continue;
      this.socX[s] = sx[s] / cnt;
      this.socY[s] = sy[s] / cnt;
      this.socVX[s] = svx[s] / cnt;
      this.socVY[s] = svy[s] / cnt;
      this.socSize[s] = Math.sqrt(size[s] / cnt);
      const d = Math.hypot(this.socX[s] - this.cx, this.socY[s] - this.cy);
      this.socTide[s] = d * Math.cbrt(cnt / (3 * capital));
    }
  }

  step(p: OrbitParams, dt = 0.25) {
    const { x, y, vx, vy, ax, ay } = this;
    // Leapfrog: half kick, drift, new forces, half kick.
    this.accel(p);
    for (let i = 0; i < this.n; i++) {
      vx[i] += ax[i] * dt * 0.5;
      vy[i] += ay[i] * dt * 0.5;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }
    this.accel(p);
    for (let i = 0; i < this.n; i++) {
      vx[i] += ax[i] * dt * 0.5;
      vy[i] += ay[i] * dt * 0.5;
    }
    this.measureSocieties(p.capital);
    // Membership: a body leaves its society once it is beyond the tidal radius or moving faster
    // than the society's own escape speed relative to it.
    for (let i = 0; i < this.n; i++) {
      const s = this.soc[i];
      if (s < 0) continue;
      const dx = x[i] - this.socX[s];
      const dy = y[i] - this.socY[s];
      const r = Math.hypot(dx, dy);
      const dv2 = (vx[i] - this.socVX[s]) ** 2 + (vy[i] - this.socVY[s]) ** 2;
      const vesc2 = (2 * this.G * this.socCount[s]) / Math.max(r, this.soft);
      if (r > Math.max(this.socTide[s], 1.5) || dv2 > vesc2) {
        this.soc[i] = -1;
        this.exSoc[i] = s;
        this.exAt[i] = this.time;
      }
    }
    // Societies under an alarming tide cool their internal motion and contract.
    for (let s = 0; s < this.nextSoc; s++) {
      this.socAlarm[s] = this.socCount[s] >= 4 && this.socSize[s] > p.alarm * this.socTide[s];
    }
    if (p.cool > 0) {
      for (let i = 0; i < this.n; i++) {
        const s = this.soc[i];
        if (s < 0 || !this.socAlarm[s]) continue;
        const keep = 1 - p.cool * dt;
        vx[i] = this.socVX[s] + (vx[i] - this.socVX[s]) * keep;
        vy[i] = this.socVY[s] + (vy[i] - this.socVY[s]) * keep;
      }
    }
    // Dynamical friction on companies: a drag set by the density of bodies around them
    // (Chandrasekhar's formula in local form: stronger in a dense crowd, weaker at high speed).
    if (p.friction > 0) {
      for (let i = 0; i < this.n; i++) {
        if (!this.isCompany[i] && !this.isState[i]) continue;
        let near = 0;
        for (let j = 0; j < this.n; j++) {
          if (j === i || this.isCompany[j] || this.isState[j]) continue;
          if ((x[j] - x[i]) ** 2 + (y[j] - y[i]) ** 2 < 36) near++;
        }
        const v = Math.hypot(vx[i], vy[i]) + 1e-6;
        const drag = (p.friction * this.G * this.m[i] * near) / (v * v * v + 0.02);
        const keep = Math.max(0, 1 - drag * dt * 0.01);
        vx[i] *= keep;
        vy[i] *= keep;
      }
    }
    // Dynamical friction on whole societies: the capital's crowd (bodies it holds, not the
    // society's own) slows each society, so it sinks toward the center and its tides.
    if (p.sink > 0) {
      for (let s = 0; s < this.nextSoc; s++) {
        if (this.socCount[s] < 4) continue;
        // The crowd: bodies near the society that are not its own, plus the capital city's own
        // halo, so that even an emptied capital city keeps drawing societies in, slowly.
        let crowd = 0;
        for (let j = 0; j < this.n; j++) {
          if (this.soc[j] === s || this.isCompany[j]) continue;
          if ((x[j] - this.socX[s]) ** 2 + (y[j] - this.socY[s]) ** 2 < 100) crowd++;
        }
        const rc = Math.hypot(this.socX[s] - this.cx, this.socY[s] - this.cy);
        crowd += (this.halo * (p.capital / 300) * 10) / (1 + (rc / 15) ** 2);
        const v = Math.hypot(this.socVX[s], this.socVY[s]) + 1e-6;
        const keep = Math.max(0, 1 - ((p.sink * this.G * this.socCount[s] * crowd) / (v * v * v + 0.02)) * dt * 0.001);
        for (let i = 0; i < this.n; i++) {
          if (this.soc[i] !== s) continue;
          vx[i] = this.socVX[s] * keep + (vx[i] - this.socVX[s]);
          vy[i] = this.socVY[s] * keep + (vy[i] - this.socVY[s]);
        }
      }
    }
    // A company caught in orbit long enough, or sunk to the center, is absorbed into the
    // capital's army and no longer moves as a unit of its own.
    for (let i = this.n - 1; i >= 0; i--) {
      if (!this.isCompany[i]) continue;
      if (this.kind[i] === ARMY) this.bound[i]++;
      if (this.kind[i] === ARMY && (this.bound[i] > this.armyTime || Math.hypot(x[i] - this.cx, y[i] - this.cy) < this.armyRadius)) {
        this.absorbed++;
        this.isCompany[i] = 0;
        this.remove(i);
      }
    }
    this.time++;
    this.linesOfFlight(p);
    // Bodies that leave the field are gone; they return later as new societies at its edges. A
    // company that met the capital city on the way out has made a raid.
    for (let i = this.n - 1; i >= 0; i--) {
      if (this.isCompany[i] && Math.hypot(x[i] - this.cx, y[i] - this.cy) < this.contactRadius) this.contacted[i] = 1;
      if (x[i] < -10 || x[i] > this.w + 10 || y[i] < -10 || y[i] > this.h + 10) {
        if (this.isCompany[i] && this.contacted[i]) this.raids++;
        this.remove(i);
      }
    }
    // Scattered people regroup into new societies, as long as there are fewer than `societyLimit`.
    let societies = this.societies();
    while (this.pool >= this.societySize && societies < this.societyLimit) {
      this.pool -= this.societySize;
      societies++;
      const a = this.rand() * 2 * Math.PI;
      this.addSociety(Math.min(this.w, this.h) * (this.spawnNear + (this.spawnFar - this.spawnNear) * this.rand()), a, p.capital);
    }
  }

  /** Merge bodies into body `keep`, conserving mass, center of mass, and momentum. Returns its index. */
  private merge(keep: number, others: number[]) {
    let M = 0, X = 0, Y = 0, PX = 0, PY = 0;
    for (const i of [keep, ...others]) {
      M += this.m[i];
      X += this.m[i] * this.x[i];
      Y += this.m[i] * this.y[i];
      PX += this.m[i] * this.vx[i];
      PY += this.m[i] * this.vy[i];
    }
    this.m[keep] = M;
    this.x[keep] = X / M;
    this.y[keep] = Y / M;
    this.vx[keep] = PX / M;
    this.vy[keep] = PY / M;
    // Remove from the highest index down; removing moves the last body into the freed slot.
    for (const i of [...others].sort((a, b) => b - a)) {
      const last = this.n - 1;
      this.remove(i, false);
      if (keep === last) keep = i;
    }
    return keep;
  }

  private linesOfFlight(p: OrbitParams) {
    // Hardening: a society that has tightened past its collapse size becomes a small State.
    for (let s = 0; s < this.nextSoc; s++) {
      if (this.socCount[s] < 8 || this.socSize[s] > this.collapse) continue;
      const members: number[] = [];
      for (let i = 0; i < this.n; i++) if (this.soc[i] === s) members.push(i);
      const keep = this.merge(members[0], members.slice(1));
      this.soc[keep] = -1;
      this.isState[keep] = 1;
      this.socCount[s] = 0;
      this.hardened++;
    }
    // A small State grows by drawing in bodies that pass close and slow (accretion).
    for (let i = 0; i < this.n; i++) {
      if (!this.isState[i]) continue;
      const take: number[] = [];
      for (let j = 0; j < this.n; j++) {
        if (j === i || this.isCompany[j] || this.isState[j] || this.soc[j] >= 0) continue;
        const r = Math.hypot(this.x[j] - this.x[i], this.y[j] - this.y[i]);
        const dv2 = (this.vx[j] - this.vx[i]) ** 2 + (this.vy[j] - this.vy[i]) ** 2;
        if (r < 1.2 && dv2 < (2 * this.G * this.m[i]) / Math.max(r, 0.5)) take.push(j);
      }
      if (take.length) i = this.merge(i, take);
    }
    // A small State that sinks near the center is annexed: its people become the capital city's,
    // on orbits around it.
    for (let i = this.n - 1; i >= 0; i--) {
      if (!this.isState[i] || Math.hypot(this.x[i] - this.cx, this.y[i] - this.cy) > this.armyRadius * 2) continue;
      const people = Math.round(this.m[i]);
      this.annexed++;
      this.remove(i, false);
      for (let k = 0; k < people && this.n < this.cap; k++) {
        const j = this.n++;
        const r = 3 + 8 * this.rand();
        const a = this.rand() * 2 * Math.PI;
        const v = Math.sqrt((this.G * p.capital) / Math.sqrt(r * r + 4));
        this.x[j] = this.cx + r * Math.cos(a);
        this.y[j] = this.cy + r * Math.sin(a);
        this.vx[j] = -Math.sin(a) * v;
        this.vy[j] = Math.cos(a) * v;
        this.m[j] = 1;
        this.soc[j] = -1;
        this.isCompany[j] = 0;
        this.isState[j] = 0;
        this.isBorn[j] = 0;
        this.exSoc[j] = -1;
        this.contacted[j] = 0;
      }
    }
    // Breakaway: former members of one society that left together, recently and fast, become a company.
    const groups = new Map<number, number[]>();
    for (let i = 0; i < this.n; i++) {
      const s = this.exSoc[i];
      if (s < 0 || this.soc[i] >= 0 || this.isCompany[i] || this.isState[i] || this.time - this.exAt[i] > 60) continue;
      const vx = this.vx[i], vy = this.vy[i];
      if (Math.hypot(vx, vy) < this.breakawaySpeed) continue;
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s)!.push(i);
    }
    for (const g of groups.values()) {
      if (g.length < this.breakaway) continue;
      // They must be leaving together: close to one another.
      const mx = g.reduce((a, i) => a + this.x[i], 0) / g.length;
      const my = g.reduce((a, i) => a + this.y[i], 0) / g.length;
      const close = g.filter((i) => Math.hypot(this.x[i] - mx, this.y[i] - my) < 5);
      if (close.length < this.breakaway) continue;
      const keep = this.merge(close[0], close.slice(1));
      this.isCompany[keep] = 1;
      this.isBorn[keep] = 1;
      this.bound[keep] = 0;
      this.contacted[keep] = 0;
      this.exSoc[keep] = -1;
      this.born++;
    }
  }

  /** Read each body: held by the capital, in its society, a company free or caught, or free. */
  classify(capital: number) {
    const { n, x, y, vx, vy, kind, cx, cy } = this;
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      const dx = x[i] - cx;
      const dy = y[i] - cy;
      const r = Math.hypot(dx, dy);
      const energy = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]) - (this.G * capital) / Math.sqrt(r * r + 4);
      let k = FREE;
      if (this.isState[i]) k = PETTY;
      else if (this.isCompany[i]) k = energy < 0 ? ARMY : COMPANY;
      else if (this.soc[i] >= 0 && this.socCount[this.soc[i]] >= 4) k = SOCIETY;
      else if (energy < 0) k = HELD;
      kind[i] = k;
      counts[k] += this.isCompany[i] ? 0 : 1;
    }
    const people = Math.max(1, n - this.companies().total);
    return { held: counts[HELD] / people, society: counts[SOCIETY] / people, free: counts[FREE] / people };
  }

  companies() {
    let total = 0;
    let caught = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.isCompany[i]) continue;
      total++;
      if (this.kind[i] === ARMY) caught++;
    }
    return { total, caught };
  }

  /** Societies still holding together (at least four members). */
  societies() {
    let k = 0;
    for (let s = 0; s < this.nextSoc; s++) if (this.socCount[s] >= 4) k++;
    return k;
  }
}
