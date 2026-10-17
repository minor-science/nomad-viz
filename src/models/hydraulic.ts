import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration, Params } from '../sim/types';
import { Fluid, type FluidParams } from '../sim/fluid';
import { Works } from '../sim/works';
import { RouteRaids } from '../sim/raids';
import { beginTags, drawPlace, drawTag, StickyTag } from '../sim/tags';

// Grid height in cells. The width follows the canvas's aspect ratio.
const NY = 72;
// |curl| at which a tracer is drawn fully magenta.
const CURL_REF = 0.12;
// Bank rows divide the river into this many routes.
const ROUTES = 4;
// The town (Polarization mode, and conflict when switched on): a basin between two walls, with an
// entry gate in the first and an exit gate in the second, at different heights.
const TOWN = { town: { entry: 0.42, exit: 0.6 }, conflict: { entry: 0.72, exit: 0.86 } };
const ENTRY_Y = 0.4;
const EXIT_Y = 0.62;
// Frames of history in the narrator's chart.
const SPAN = 600;
// Frames a phase caption stays up before it may change.
const PHASE_HOLD = 300;

// The narrator. In conflict the caption follows ATP 386's sequence: striation, insubordination,
// smooth space reconstituted, re-capture. Quotations are checked by scripts/check-atp.ts.
type Phase = 'striation' | 'insubordination' | 'smooth' | 'recapture';
const PHASES: Record<Phase, { head: string; sub: string; color: string }> = {
  striation: {
    head: 'STRIATION · State crews extend fixed paths into open water, and the flows keep to them.',
    sub: 'ATP: fixed paths that “restrict speed, regulate circulation, relativize movement” (386).',
    color: '#00aeef',
  },
  insubordination: {
    head: 'INSUBORDINATION · The flows turn against the routes that hold them, and break them.',
    sub: 'ATP: “insubordination, rioting, guerrilla warfare, or revolution as act” revive the war machine (386).',
    color: '#ec008c',
  },
  smooth: {
    head: 'SMOOTH SPACE · The routes are down. Flows hold their own ground in open water.',
    sub: 'ATP: a war machine revives, “accompanied by the reconstitution of a smooth space” (386).',
    color: '#ec008c',
  },
  recapture: {
    head: 'RE-CAPTURE · The flows settle, and the State’s crews rebuild the routes.',
    sub: 'ATP: the State relies on “forced manpower recruited on the spot (corvee)” (368).',
    color: '#00aeef',
  },
};
const MODE_CAPTION: Partial<Record<Mode, { head: string; sub: string; color: string }>> = {
  state: {
    head: 'CAPTURE ALONE · Crews extend fixed paths until the river runs in layers.',
    sub: 'ATP: “regulating the movement of the flow of labor, assigning it channels and conduits” (368).',
    color: '#00aeef',
  },
  nomad: {
    head: 'WAR MACHINE ALONE · No works. The flows turn on themselves and hold their own ground.',
    sub: 'ATP: a movement “distributed by turbulence across a smooth space” (363).',
    color: '#ec008c',
  },
  town: {
    head: 'POLARIZATION ALONE · The market town. Every flow enters by one gate, circulates, and leaves by another.',
    sub: 'ATP: “maritime and commercial towns to separate off from the backcountry” (432), such as Athens, Carthage, Venice.',
    color: '#2f8f4e',
  },
};

interface Tracer {
  x: number;
  y: number;
  px: number;
  py: number;
  age: number;
  life: number;
}

interface Raid {
  x: number;
  y: number;
  life: number;
}

const bankRows = (ny: number) => Array.from({ length: ROUTES - 1 }, (_, k) => Math.round(((k + 1) * ny) / ROUTES));

function townWalls(which: 'town' | 'conflict', p: Params, nx: number, ny: number) {
  const t = TOWN[which];
  const a = Math.round(nx * t.entry);
  const b = Math.round(nx * t.exit);
  const half = p.gate / 2;
  return (x: number, y: number) =>
    ((x === a || x === a + 1) && Math.abs(y - ny * ENTRY_Y) > half) ||
    ((x === b || x === b + 1) && Math.abs(y - ny * EXIT_Y) > half);
}

function lerpColor(t: number): string {
  // cyan #00aeef to magenta #ec008c
  return `rgb(${Math.round(236 * t)}, ${Math.round(174 - 174 * t)}, ${Math.round(239 - 99 * t)})`;
}

function create(): SimInstance {
  let fluid: Fluid | null = null;
  let works: Works | null = null;
  let routeRaids: RouteRaids | null = null;
  let maxX = 0;
  let tracers: Tracer[] = [];
  let raids: Raid[] = [];
  let layoutKey = '';
  let striated = 0;
  let flowMeter = 0;
  let phase: Phase = 'striation';
  let phaseAge = 0;
  let narration: Narration | null = null;
  let lastParams: FluidParams = { nu: 0, uTop: 1, uBottom: 0, clinamen: 0, confinement: 0 };
  const history = { held: [] as number[], mob: [] as number[], off: [] as number[] };
  let trail: HTMLCanvasElement | null = null;
  const tags = {
    crew: new StickyTag<number>(300),
    raid: new StickyTag<number>(240, 90),
    breach: new StickyTag<number>(300),
    open: new StickyTag<{ x: number; y: number }>(300),
  };

  const respawn = (t: Tracer) => {
    if (!fluid) return;
    // Enter where the water enters: rows are chosen in proportion to the inflow speed.
    const umax = Math.max(Math.abs(lastParams.uTop), Math.abs(lastParams.uBottom)) + 0.05;
    for (let k = 0; k < 40; k++) {
      const y = 1 + Math.random() * (fluid.ny - 3);
      const x = 1 + Math.random() * 2;
      if (Math.random() > (Math.abs(fluid.inflow(y, lastParams)) + 0.05) / umax) continue;
      if (!fluid.solid[Math.floor(x) + Math.floor(y) * fluid.nx]) {
        t.x = t.px = x;
        t.y = t.py = y;
        break;
      }
    }
    t.age = 0;
    t.life = 300 + Math.random() * 500;
  };

  const spawnAnywhere = (t: Tracer) => {
    if (!fluid) return;
    t.x = t.px = 1 + Math.random() * (fluid.nx - 3);
    t.y = t.py = 1 + Math.random() * (fluid.ny - 3);
    t.age = (Math.random() * 300) | 0;
    t.life = 300 + Math.random() * 500;
  };

  return {
    init(width, height, params) {
      const nx = Math.max(64, Math.min(200, Math.round((NY * width) / height)));
      fluid = new Fluid(nx, NY);
      works = null;
      routeRaids = null;
      layoutKey = '';
      raids = [];
      tracers = Array.from({ length: params.tracers }, () => {
        const t = { x: 0, y: 0, px: 0, py: 0, age: 0, life: 0 };
        spawnAnywhere(t);
        return t;
      });
    },

    frame(ctx, f: Frame) {
      if (!fluid) return;
      const { mode, params, width, height, motionScale } = f;
      const { nx, ny } = fluid;
      const withTown = mode === 'town' || (mode === 'conflict' && params.townInConflict >= 1);
      const key = `${mode}|${params.gate}|${withTown}`;
      if (key !== layoutKey) {
        fluid.setSolid(withTown ? townWalls(mode === 'town' ? 'town' : 'conflict', params, nx, ny) : () => false);
        maxX = withTown ? Math.round(nx * TOWN.conflict.entry) - 4 : nx - 6;
        works = mode === 'state' || mode === 'conflict' ? new Works(fluid, bankRows(ny), maxX) : null;
        routeRaids = mode === 'conflict' ? new RouteRaids(ROUTES - 1) : null;
        layoutKey = key;
      }
      const fp: FluidParams = {
        nu: params.viscosity,
        uTop: params.uTop,
        uBottom: params.uBottom,
        clinamen: params.clinamen,
        confinement: 0,
      };
      lastParams = fp;
      const steps = Math.max(1, Math.round(params.speed * motionScale));
      if (works) works.placeCrews(Math.round(params.crews));
      for (let k = 0; k < steps; k++) {
        fluid.step(fp);
        if (works) {
          striated = works.step({ build: params.build, repair: params.repair, erode: params.erosion, critical: params.critical, eddy: 1 });
        }
        if (works && routeRaids) {
          // Each route's flows turn against it as it reaches into the river (ATP 386).
          for (const r of routeRaids.step(fluid, works, maxX, params as never)) raids.push({ x: r.x, y: r.y, life: 1 });
        } else if (mode === 'nomad' && Math.random() < params.raidRate * 0.3) {
          // Alone, the flows turn on themselves wherever they run fast.
          const x = nx * (0.15 + Math.random() * 0.75);
          const y = 4 + Math.random() * (ny - 8);
          const [u] = fluid.velocityAt(x, y);
          fluid.addVortex(x, y, 4, (Math.random() < 0.5 ? -1 : 1) * params.raidStrength * Math.min(2, Math.abs(u) / 0.5));
          raids.push({ x, y, life: 1 });
        }
      }
      const mobilization = routeRaids ? routeRaids.mean() : mode === 'nomad' ? 0.3 : 0;
      flowMeter = 0.95 * flowMeter + 0.05 * fluid.crossflow();
      history.held.push(works ? striated / 0.35 : 0);
      history.mob.push(mobilization);
      history.off.push(Math.min(1, flowMeter / 0.08));
      if (history.held.length > SPAN) {
        history.held.shift();
        history.mob.shift();
        history.off.shift();
      }

      const sx = width / nx;
      const sy = height / ny;

      // Streak trails fade on their own layer, so tags stay crisp on top.
      const main = ctx;
      if (!trail || trail.width !== main.canvas.width || trail.height !== main.canvas.height) {
        trail = document.createElement('canvas');
        trail.width = main.canvas.width;
        trail.height = main.canvas.height;
      }
      const tctx = trail.getContext('2d')!;
      tctx.setTransform(main.getTransform());
      tctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      tctx.fillRect(0, 0, width, height);

      // Tracers ride the flow and are colored by local vorticity: cyan in layers, magenta turning.
      tctx.lineWidth = 2.5;
      for (const t of tracers) {
        t.px = t.x;
        t.py = t.y;
        for (let k = 0; k < steps; k++) {
          const [u1, v1] = fluid.velocityAt(t.x, t.y);
          const [u2, v2] = fluid.velocityAt(t.x + 0.5 * u1, t.y + 0.5 * v1);
          t.x += u2;
          t.y += v2;
        }
        t.age++;
        const cell = Math.floor(t.x) + Math.floor(t.y) * nx;
        if (t.x >= nx - 1.5 || t.x < 0.5 || t.y < 1 || t.y > ny - 2 || fluid.solid[cell] || t.age > t.life) {
          respawn(t);
          continue;
        }
        const w = Math.min(1, Math.abs(fluid.curlAt(t.x, t.y)) / CURL_REF);
        tctx.strokeStyle = lerpColor(w);
        tctx.beginPath();
        tctx.moveTo(t.px * sx, t.py * sy);
        tctx.lineTo(t.x * sx + (t.x - t.px) * sx * 1.5, t.y * sy + (t.y - t.py) * sy * 1.5);
        tctx.stroke();
      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();

      // Walls and banks: town walls dark; banks light, fading as they wear; breaches magenta.
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = x + y * nx;
          const g = works ? works.integrity[i] : -1;
          if (fluid.solid[i]) {
            ctx.fillStyle = g >= 0 ? `rgba(148, 163, 184, ${0.35 + 0.65 * g})` : '#475569';
            ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
          } else if (g >= 0) {
            ctx.fillStyle = `rgba(236, 0, 140, ${0.25 + 0.2 * g})`;
            ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
          }
        }
      }

      // Raids: magenta rings where the flow turns, drifting with the water as they fade.
      raids = raids.filter((r) => r.life > 0);
      for (const r of raids) {
        const [u, v] = fluid.velocityAt(r.x, r.y);
        r.x += u * steps;
        r.y += v * steps;
        ctx.strokeStyle = `rgba(236, 0, 140, ${r.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x * sx, r.y * sy, (2 + 3 * (1 - r.life)) * sx, 0, Math.PI * 2);
        ctx.stroke();
        r.life -= 0.012;
      }

      // Crews: small blue figures on the banks; outlined when repairing.
      if (works) {
        for (const c of works.crews) {
          const x = (c.x + 0.5) * sx;
          const y = (works.rows[c.row] + 0.5) * sy;
          ctx.fillStyle = '#00aeef';
          ctx.fillRect(x - sx * 0.7, y - sy * 1.4, sx * 1.4, sy * 1.4);
          if (c.repairing) {
            ctx.strokeStyle = '#f2f2f2';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - sx * 0.9, y - sy * 1.6, sx * 1.8, sy * 1.8);
          }
        }
      }

      // Narration, read by the shell for the strip above the canvas.
      {
        let cap = MODE_CAPTION[mode] ?? null;
        if (mode === 'conflict') {
          const anyMobilized = routeRaids?.mobilized.some(Boolean) ?? false;
          const want: Phase =
            anyMobilized && striated > params.calm ? 'insubordination'
            : striated <= params.calm * 1.5 && mobilization > 0.05 ? 'smooth'
            : !anyMobilized && mobilization > 0.05 ? 'recapture'
            : 'striation';
          phaseAge++;
          if (want !== phase && phaseAge > PHASE_HOLD) {
            phase = want;
            phaseAge = 0;
          }
          cap = PHASES[phase];
        }
        if (cap) {
          const series: Narration['series'] = [];
          if (works) series.push({ values: history.held, color: '#00aeef', label: 'routes held' });
          if (mode === 'conflict' || mode === 'nomad') series.push({ values: history.mob, color: '#ec008c', label: 'flows turned' });
          series.push({ values: history.off, color: '#f2f2f2', label: 'flows off-route' });
          narration = { ...cap, series, span: SPAN };
        } else narration = null;
      }

      // Explain layer: map labels on the ground, and tags that say what each figure stands for.
      if (f.explain) {
        beginTags();
        const bounds = { width, height };
        const place = (fx: number, fy: number, text: string) => drawPlace(ctx, fx * width, fy * height, text);
        if (mode === 'state') place(0.5, 0.58, 'THE STATE’S ROUTES');
        if (mode === 'nomad') place(0.55, 0.58, 'OPEN COUNTRY');
        if (mode === 'conflict') place(withTown ? 0.35 : 0.5, 0.58, striated > params.calm * 2 ? 'THE STATE’S ROUTES' : 'OPEN COUNTRY');
        if (withTown) {
          const t = TOWN[mode === 'town' ? 'town' : 'conflict'];
          place((t.entry + t.exit) / 2, 0.22, 'THE TOWN');
          if (mode === 'town') place(0.2, 0.58, 'COUNTRYSIDE');
        }
        const cellXY = (i: number) => ({ x: ((i % nx) + 0.5) * sx, y: (Math.floor(i / nx) + 0.5) * sy });
        if (works && works.crews.length) {
          const w = works;
          tags.crew.update(
            (k) => (w.crews[k] ? { x: (w.crews[k].x + 0.5) * sx, y: (w.rows[w.crews[k].row] - 1) * sy } : null),
            () => ({ anchor: 0, x: (w.crews[0].x + 0.5) * sx, y: (w.rows[w.crews[0].row] - 1) * sy }),
          );
          tags.crew.draw(ctx, w.crews[0]?.repairing ? 'CAPTURE · a State crew repairs a broken route' : 'CAPTURE · a State crew extends a fixed path', '#00aeef', bounds);
          tags.breach.update(
            (i) => (w.integrity[i] >= 0 && !fluid!.solid[i] ? cellXY(i) : null),
            () => {
              for (let r = 0; r < w.rows.length; r++) {
                for (let x = 0; x < w.front[r]; x++) {
                  const i = x + w.rows[r] * nx;
                  if (w.integrity[i] >= 0 && !fluid!.solid[i]) return { anchor: i, ...cellXY(i) };
                }
              }
              return null;
            },
          );
          tags.breach.draw(ctx, 'WAR MACHINE · a route breaks; flows go their own way', '#ec008c', bounds, 'CAPTURE · the route is rebuilt and the flows re-registered', '#00aeef');
        }
        if ((mode === 'conflict' || mode === 'nomad') && raids.length) {
          tags.raid.update(
            (k) => (raids[k] && raids[k].life > 0.2 ? { x: raids[k].x * sx, y: raids[k].y * sy } : null),
            () => {
              const k = raids.length - 1;
              return { anchor: k, x: raids[k].x * sx, y: raids[k].y * sy };
            },
          );
          tags.raid.draw(ctx, works ? 'WAR MACHINE · the flow turns against the route that holds it' : 'WAR MACHINE · the flow turns on itself', '#ec008c', bounds, 'the eddy is carried off');
        }
        if (mode === 'conflict' || mode === 'nomad') {
          tags.open.update(
            (a) => {
              const [u, v] = fluid!.velocityAt(a.x, a.y);
              a.x += u * steps;
              a.y += v * steps;
              if (a.x > nx - 3 || a.y < 2 || a.y > ny - 3) return null;
              return Math.abs(fluid!.curlAt(a.x, a.y)) > CURL_REF * 0.4 ? { x: a.x * sx, y: a.y * sy } : null;
            },
            () => {
              let best = -1;
              let vmax = CURL_REF * 0.8;
              for (let y = 3; y < ny - 3; y += 2) {
                for (let x = Math.round(nx * 0.25); x < nx - 4; x += 2) {
                  const i = x + y * nx;
                  const c = Math.abs(fluid!.curl[i]);
                  if (!fluid!.solid[i] && c > vmax) {
                    vmax = c;
                    best = i;
                  }
                }
              }
              if (best < 0) return null;
              const a = { x: best % nx, y: Math.floor(best / nx) };
              return { anchor: a, x: a.x * sx, y: a.y * sy };
            },
          );
          tags.open.draw(ctx, 'WAR MACHINE · flows hold their own ground, off the routes', '#ec008c', bounds, 'the eddy spins down');
        }
        if (withTown) {
          const t = TOWN[mode === 'town' ? 'town' : 'conflict'];
          drawTag(ctx, nx * t.entry * sx, ny * ENTRY_Y * sy, 'POLARIZATION · the market town: everything enters by one gate and leaves by another, as at Venice', '#2f8f4e', bounds);
        }
      }
    },

    narrate() {
      return narration;
    },
  };
}

export const hydraulic: ModelDef = {
  id: 'hydraulic',
  name: 'Hydraulic',
  tagline: 'Fluid Dynamics',
  sidebarIcon: Droplets,
  headerIcon: Droplets,
  title: 'Hydraulic Metaphysics',
  subtitle: 'Striation // Turbulence',
  modes: ['state', 'nomad', 'town', 'conflict'],
  stillFrames: 500,
  describe: (mode) =>
    `Hydraulic simulation in ${mode} mode: a river of flows entering from the left. Blue State crews build banks that keep the flow in layers; where a route reaches far, the flow turns against it in magenta eddies and breaks it.`,
  controls: [
    { kind: 'slider', key: 'crews', label: 'State Crews', min: 0, max: 18, step: 1, default: 6, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'build', label: 'Building Speed', min: 0.01, max: 0.2, step: 0.01, default: 0.05, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'repair', label: 'Repair Speed', min: 0.01, max: 0.2, step: 0.01, default: 0.05, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'critical', label: 'Bank Strength (critical stress)', min: 0.05, max: 0.5, step: 0.01, default: 0.12, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'raidStrength', label: 'Turning Strength', min: 0.2, max: 2, step: 0.05, default: 1.2, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'raidRate', label: 'Turning Frequency', min: 0, max: 3, step: 0.1, default: 1.5, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'alarm', label: 'Flows Turn Above (route reach)', min: 0.05, max: 0.6, step: 0.01, default: 0.3, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'calm', label: 'Flows Settle Below (route reach)', min: 0, max: 0.3, step: 0.01, default: 0.08, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'mobilizeRate', label: 'Turning Speed', min: 0.0005, max: 0.01, step: 0.0005, default: 0.002, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'erosion', label: 'Erosion of Banks', min: 0, max: 1, step: 0.05, default: 0.4, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'townInConflict', label: 'Town in Conflict (0 off, 1 on)', min: 0, max: 1, step: 1, default: 0, tint: 'green', format: 'int' },
    { kind: 'slider', key: 'gate', label: 'Gate Width (cells)', min: 2, max: 40, step: 1, default: 8, tint: 'green', format: 'int' },
    { kind: 'slider', key: 'uTop', label: 'Upper Stream Speed', min: 0.2, max: 1.5, step: 0.05, default: 0.7, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'uBottom', label: 'Lower Stream Speed', min: 0, max: 1.2, step: 0.05, default: 0.15, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'viscosity', label: 'Viscosity ν', min: 0, max: 0.05, step: 0.001, default: 0.002, tint: 'ink', format: 'dec3' },
    { kind: 'slider', key: 'clinamen', label: 'Clinamen (inlet swerve)', min: 0, max: 0.3, step: 0.01, default: 0.1, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'tracers', label: 'Tracers', min: 500, max: 4000, step: 250, default: 2000, tint: 'ink', format: 'int', reinit: true },
    { kind: 'slider', key: 'speed', label: 'Steps per Frame', min: 1, max: 3, step: 1, default: 2, tint: 'ink', format: 'int', divider: true },
  ],
  status: (p) => [
    ['Crews', String(p.crews)],
    ['Turning', p.raidStrength.toFixed(2)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'State crews. Small blue figures build banks out into the river, and the flow between them runs in layers: labor and goods kept to assigned routes. ATP: the State regulates “the movement of the flow of labor, assigning it channels and conduits” (368).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'The flows turn. Where a route reaches far into the river, the water against it turns into eddies that break it, route by route. ATP: flows a State cannot striate “adopt the stance of a war machine directed against it” (386).' },
    { process: 'polarization', heading: '03 / Polarization', text: 'The town (its own mode, or switched into conflict). Every flow must enter by one gate and leave by another, as goods pass through a market or a port. ATP: the town “is defined by entries and exits” (432).' },
  ],
  legend: [
    { swatch: '#00aeef', see: 'Blue figures', social: 'the State’s crews: corvée labor building and repairing the works', physics: 'agents that add bank cells at the front of a route and restore breached ones', atp: 'the State relies on “forced manpower recruited on the spot (corvee)” (368)' },
    { swatch: '#94a3b8', see: 'Gray banks', social: 'the State’s fixed paths: roads, registers, assigned work', physics: 'walls that narrow the flow, so it runs in layers; they fade as they wear', atp: 'fixed paths that “restrict speed, regulate circulation, relativize movement” (386)' },
    { swatch: '#00aeef', see: 'Cyan streaks', social: 'regulated circulation along assigned routes', physics: 'flow running in parallel layers (laminar)', atp: 'flows that “proceed by parallel, laminar layers” (363)' },
    { swatch: '#ec008c', see: 'Magenta rings and breaches', social: 'flows turning against the routes: insubordination, rioting, guerrilla warfare', physics: 'eddies drawn from the local current, stronger where it runs faster, that break bank cells', atp: 'flows a State cannot striate “adopt the stance of a war machine directed against it” (386)' },
    { swatch: '#ec008c', see: 'Magenta streaks', social: 'flows off the routes, holding their own ground', physics: 'water turning in eddies (high vorticity)', atp: 'a war machine revives, “accompanied by the reconstitution of a smooth space” (386)', example: 'the itinerant masons, carpenters, and smiths of ATP 368' },
    { swatch: '#2f8f4e', see: 'Two walls with gates', social: 'a market town or port that every flow must pass through', physics: 'water forced in at one gate and out at another', atp: 'the town “is defined by entries and exits” (432)', example: 'Athens, Carthage, Venice, ATP’s maritime and commercial towns (432)' },
  ],
  create,
};
