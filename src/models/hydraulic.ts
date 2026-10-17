import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration, Params } from '../sim/types';
import { Fluid, type FluidParams } from '../sim/fluid';
import { Embankments } from '../sim/embankments';
import { beginTags, drawPlace, drawTag, StickyTag } from '../sim/tags';

// Grid height in cells. The width follows the canvas's aspect ratio.
const NY = 72;
// |curl| at which a tracer is drawn fully magenta.
const CURL_REF = 0.12;
// A channel counts as turbulent when its mean cross-flow passes this (cells per step).
const TURBULENT = 0.012;
// Where the embankments end in conflict mode, and where the town sits in each mode.
const BANKS_END = 0.6;
const TOWN = {
  town: { entry: 0.42, exit: 0.6 },
  conflict: { entry: 0.7, exit: 0.86 },
};
// Gate heights, as fractions of the depth: the entry is higher than the exit, so water crosses
// the town on its way through.
const ENTRY_Y = 0.4;
const EXIT_Y = 0.62;

// The narrator's captions. In conflict mode the caption follows the phase of the cycle; in the other
// modes it describes the one process staged. Quotations are checked by scripts/check-atp.ts.
type Phase = 'regulated' | 'surge' | 'breakdown' | 'recapture';
const PHASES: Record<Phase, { head: string; sub: string; color: string }> = {
  regulated: {
    head: 'REGULATED · Labor, goods, and people keep to the routes the State assigns them.',
    sub: 'ATP: fixed paths that “restrict speed, regulate circulation, relativize movement” (386).',
    color: '#00aeef',
  },
  surge: {
    head: 'SURGE · Migrations press on the routes faster than they can be channeled.',
    sub: 'ATP: States meet nomads “through the intermediary of the migrations the nomads trigger” (385).',
    color: '#ec008c',
  },
  breakdown: {
    head: 'BREAKDOWN · Routes give way. Flows go their own way, and vagabondage spreads.',
    sub: 'ATP: the State “undertook to conquer both a band vagabondage and a body nomadism” (368).',
    color: '#ec008c',
  },
  recapture: {
    head: 'RE-CAPTURE · The State re-routes and re-registers the flows, and crews rebuild the works.',
    sub: 'ATP: the State relies on “forced manpower recruited on the spot (corvee)” (368).',
    color: '#00aeef',
  },
};
const MODE_CAPTION: Partial<Record<Mode, { head: string; sub: string; color: string }>> = {
  state: {
    head: 'CAPTURE ALONE · Every flow is kept to an assigned route. Nothing turns or leaves its channel.',
    sub: 'ATP: “regulating the movement of the flow of labor, assigning it channels and conduits” (368).',
    color: '#00aeef',
  },
  nomad: {
    head: 'WAR MACHINE ALONE · Open country. Flows turn and hold their own ground, as itinerant builders once moved from site to site.',
    sub: 'ATP: “the nomadic or itinerant bodies of the type formed by masons, carpenters, smiths” (368).',
    color: '#ec008c',
  },
  town: {
    head: 'POLARIZATION ALONE · The market town. Every flow enters by one gate, circulates, and leaves by another.',
    sub: 'ATP: “maritime and commercial towns to separate off from the backcountry” (432), such as Athens, Carthage, Venice.',
    color: '#2f8f4e',
  },
};
// Frames a phase caption stays up before it may change.
const PHASE_HOLD = 300;

interface Tracer {
  x: number;
  y: number;
  px: number;
  py: number;
  age: number;
  life: number;
}

const bankRows = (K: number, ny: number) => Array.from({ length: K - 1 }, (_, k) => Math.round(((k + 1) * ny) / K));

// The fixed solid layout for each mode. Embankments in capture mode are fixed; in conflict they
// are managed by Embankments, which erodes and rebuilds them. The town is a basin between two
// walls, with an entry gate in the first and an exit gate in the second.
function layout(mode: Mode, p: Params, nx: number, ny: number): (x: number, y: number) => boolean {
  if (mode === 'state') {
    const rows = bankRows(Math.round(p.channels), ny);
    return (_x, y) => rows.includes(y);
  }
  if (mode === 'town' || mode === 'conflict') {
    const t = TOWN[mode];
    const a = Math.round(nx * t.entry);
    const b = Math.round(nx * t.exit);
    const half = p.gate / 2;
    return (x, y) =>
      ((x === a || x === a + 1) && Math.abs(y - ny * ENTRY_Y) > half) ||
      ((x === b || x === b + 1) && Math.abs(y - ny * EXIT_Y) > half);
  }
  return () => false;
}

function lerpColor(t: number): string {
  // cyan #00aeef to magenta #ec008c
  const r = Math.round(236 * t);
  const g = Math.round(174 - 174 * t);
  const b = Math.round(239 - 99 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function create(): SimInstance {
  let fluid: Fluid | null = null;
  let tracers: Tracer[] = [];
  let layoutKey = '';
  let banks: Embankments | null = null;
  let standing = 1;
  let time = 0;
  let flowMeter = 0;
  let channelSpeed: number[] = [];
  let channelCross: number[] = [];
  let lastParams: FluidParams = { nu: 0, uTop: 1, uBottom: 0, clinamen: 0, confinement: 0 };
  const vortexTag = new StickyTag<{ x: number; y: number }>(300);
  let phase: Phase = 'regulated';
  let narration: Narration | null = null;
  const history = { held: [] as number[], off: [] as number[], surge: [] as number[] };
  const SPAN = 600;
  let phaseAge = 0;
  const breachTag = new StickyTag<number>(300);
  const bankTag = new StickyTag<number>(300);
  // Streak trails fade on their own layer, so tags and the readout stay crisp on top.
  let trail: HTMLCanvasElement | null = null;

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
      layoutKey = '';
      banks = null;
      time = 0;
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
      const K = Math.round(params.channels);
      const key = `${mode}|${K}|${params.gate}`;
      if (key !== layoutKey) {
        fluid.setSolid(layout(mode, params, nx, ny));
        const rows = bankRows(K, ny);
        banks = mode === 'conflict' ? new Embankments(fluid, (x, y) => x < nx * BANKS_END && rows.includes(y)) : null;
        channelSpeed = new Array(K).fill(0);
        channelCross = new Array(K).fill(0);
        layoutKey = key;
      }
      // The flood: the upper stream rises and falls once per season.
      const season = params.season > 0 ? Math.sin((2 * Math.PI * time) / params.season) : 0;
      const fp: FluidParams = {
        nu: params.viscosity,
        uTop: params.uTop * (1 + params.flood * season),
        uBottom: params.uBottom,
        clinamen: params.clinamen,
        confinement: params.confinement,
      };
      lastParams = fp;
      const steps = Math.max(1, Math.round(params.speed * motionScale));
      for (let k = 0; k < steps; k++) {
        fluid.step(fp);
        time++;
        if (banks) standing = banks.update(params.erosion, params.repair, params.critical);
      }
      flowMeter = 0.95 * flowMeter + 0.05 * fluid.crossflow();
      // The panel's chart: routes held, flows off-route, and the seasonal surge, each 0 to 1.
      history.held.push(mode === 'conflict' ? standing : mode === 'state' ? 1 : 0);
      history.off.push(Math.min(1, flowMeter / 0.08));
      history.surge.push(mode === 'conflict' ? 0.5 + 0.5 * season : 0);
      if (history.held.length > SPAN) {
        history.held.shift();
        history.off.shift();
        history.surge.shift();
      }

      // Per-channel speed and cross-flow, over the stretch where embankments run.
      const channeled = mode === 'state' || mode === 'conflict';
      if (channeled) {
        const rows = [0, ...bankRows(K, ny), ny - 1];
        const xEnd = Math.round(nx * (mode === 'state' ? 0.95 : BANKS_END));
        for (let c = 0; c < K; c++) {
          let su = 0;
          let sv = 0;
          let n = 0;
          for (let y = rows[c] + 1; y < rows[c + 1]; y++) {
            for (let x = Math.round(xEnd * 0.4); x < xEnd; x++) {
              const i = x + y * nx;
              if (fluid.solid[i]) continue;
              su += fluid.u[i];
              sv += Math.abs(fluid.v[i]);
              n++;
            }
          }
          if (n) {
            channelSpeed[c] = 0.9 * channelSpeed[c] + 0.1 * (su / n);
            channelCross[c] = 0.9 * channelCross[c] + 0.1 * (sv / n);
          }
        }
      }

      const sx = width / nx;
      const sy = height / ny;

      const main = ctx;
      if (!trail || trail.width !== main.canvas.width || trail.height !== main.canvas.height) {
        trail = document.createElement('canvas');
        trail.width = main.canvas.width;
        trail.height = main.canvas.height;
      }
      const tctx = trail.getContext('2d')!;
      tctx.setTransform(main.getTransform());
      {
        const ctx = tctx;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.fillRect(0, 0, width, height);

      // Walls and embankments; standing banks lighten as they wear, and breaches show faintly.
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = x + y * nx;
          const g = banks ? banks.integrity[i] : -1;
          if (fluid.solid[i]) {
            ctx.fillStyle = g >= 0 ? `rgba(148, 163, 184, ${0.35 + 0.65 * g})` : '#475569';
            ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
          } else if (g >= 0) {
            ctx.fillStyle = `rgba(148, 163, 184, ${0.15 * g})`;
            ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
          }
        }
      }

      // Inflow: arrows along the left edge, as long as the water is fast.
      ctx.strokeStyle = 'rgba(242, 242, 242, 0.75)';
      ctx.fillStyle = 'rgba(242, 242, 242, 0.75)';
      ctx.lineWidth = 2;
      for (let y = 4; y < ny - 2; y += 6) {
        const u = fluid.inflow(y, fp);
        const len = Math.max(0, u) * 4 * sx;
        if (len < 2) continue;
        const yy = (y + 0.5) * sy;
        ctx.beginPath();
        ctx.moveTo(2, yy);
        ctx.lineTo(2 + len, yy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2 + len, yy);
        ctx.lineTo(2 + len - 8, yy - 5);
        ctx.lineTo(2 + len - 8, yy + 5);
        ctx.fill();
      }

      // Tracers ride the flow (midpoint rule) and are colored by the local vorticity,
      // cyan where the flow runs in layers and magenta where it turns.
      ctx.lineWidth = 2.5;
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
        ctx.strokeStyle = lerpColor(w);
        ctx.beginPath();
        ctx.moveTo(t.px * sx, t.py * sy);
        ctx.lineTo(t.x * sx + (t.x - t.px) * sx * 1.5, t.y * sy + (t.y - t.py) * sy * 1.5);
        ctx.stroke();
      }

      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();

      // Narration, read by the shell for the strip above the canvas.
      {
        // Narration: in conflict, the phase of the cycle, held for a few seconds at a time.
        let cap = MODE_CAPTION[mode] ?? null;
        if (mode === 'conflict') {
          const want: Phase =
            standing > 0.85 && season > 0.25 ? 'surge'
            : standing <= 0.85 && season > -0.2 ? 'breakdown'
            : standing < 0.97 ? 'recapture'
            : 'regulated';
          phaseAge++;
          if (want !== phase && phaseAge > (phase === 'breakdown' && standing > 0.95 ? PHASE_HOLD / 3 : PHASE_HOLD)) {
            phase = want;
            phaseAge = 0;
          }
          cap = PHASES[phase];
        }
        if (cap) {
          const series: Narration['series'] = [];
          if (mode === 'conflict' || mode === 'state') series.push({ values: history.held, color: '#00aeef', label: 'routes held' });
          series.push({ values: history.off, color: '#ec008c', label: 'flows off-route' });
          if (mode === 'conflict') series.push({ values: history.surge, color: '#f2f2f2', label: 'surge' });
          narration = { ...cap, series, span: SPAN };
        } else narration = null;
      }

      // Explain layer: map labels on the ground, a narrator's caption, and tags that say what each
      // feature stands for.
      if (f.explain) {
        beginTags();
        const bounds = { width, height };
        const place = (fx: number, fy: number, text: string) => drawPlace(ctx, fx * width, fy * height, text);
        if (mode === 'state') place(0.5, 0.58, 'THE STATE’S CHANNELS');
        if (mode === 'nomad') place(0.6, 0.58, 'OPEN COUNTRY');
        if (mode === 'town') {
          place(0.2, 0.58, 'COUNTRYSIDE');
          place((TOWN.town.entry + TOWN.town.exit) / 2, 0.22, 'THE TOWN');
          place(0.82, 0.58, 'TO OTHER TOWNS');
        }
        if (mode === 'conflict') {
          place(BANKS_END / 2, 0.58, 'THE STATE’S CHANNELS');
          place((TOWN.conflict.entry + TOWN.conflict.exit) / 2, 0.22, 'THE TOWN');
        }
        drawTag(ctx, 6, (ny * 0.25) * sy, 'INFLOW · flows of people, goods, and labor', '#f2f2f2', bounds);
        if (banks && season > 0.5) drawTag(ctx, nx * 0.3 * sx, 3 * sy, 'SURGE · migration and flight beyond what the routes can hold', '#ec008c', bounds);
        if (banks) {
          const bk = banks;
          breachTag.update(
            (i) => (!fluid!.solid[i] && bk.integrity[i] >= 0 ? { x: ((i % nx) + 0.5) * sx, y: (Math.floor(i / nx) + 0.5) * sy } : null),
            () => {
              for (let i = 0; i < fluid!.n; i++) if (bk.integrity[i] >= 0 && !fluid!.solid[i]) return { anchor: i, x: ((i % nx) + 0.5) * sx, y: (Math.floor(i / nx) + 0.5) * sy };
              return null;
            },
          );
          breachTag.draw(ctx, 'WAR MACHINE · a route breaks down; flows go their own way', '#ec008c', bounds, 'CAPTURE · the State re-routes and re-registers them', '#00aeef');
          bankTag.update(
            (i) => (fluid!.solid[i] && bk.integrity[i] >= 0 ? { x: ((i % nx) + 0.5) * sx, y: (Math.floor(i / nx) + 0.5) * sy } : null),
            () => {
              for (let i = Math.round(nx * 0.3); i < fluid!.n; i++) if (bk.integrity[i] >= 0 && fluid!.solid[i]) return { anchor: i, x: ((i % nx) + 0.5) * sx, y: (Math.floor(i / nx) + 0.5) * sy };
              return null;
            },
          );
          bankTag.draw(ctx, 'CAPTURE · a fixed path that regulates circulation', '#00aeef', bounds, 'WAR MACHINE · the path gives way', '#ec008c');
        }
        // A vortex, followed as it drifts with the water (only where the war machine is staged).
        if (mode === 'nomad' || mode === 'conflict') vortexTag.update(
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
        if (mode === 'nomad' || mode === 'conflict') vortexTag.draw(ctx, 'WAR MACHINE · a band holds its own ground, off the assigned routes', '#ec008c', bounds, 'the band disperses');
        if (channeled) {
          const rows = [0, ...bankRows(K, ny), ny - 1];
          const xEnd = mode === 'state' ? 0.9 : BANKS_END - 0.05;
          const shown = new Set<boolean>();
          for (let c = 0; c < K; c++) {
            const turbulent = channelCross[c] > TURBULENT;
            // One example of each state is enough.
            if (shown.has(turbulent)) continue;
            shown.add(turbulent);
            const label = turbulent
              ? `WAR MACHINE · vagabondage: flows leave their assigned routes`
              : `CAPTURE · labor and goods kept to assigned routes`;
            drawTag(ctx, nx * xEnd * sx, ((rows[c] + rows[c + 1]) / 2) * sy, label, turbulent ? '#ec008c' : '#00aeef', bounds);
          }
        }
        if (mode === 'town' || mode === 'conflict') {
          const t = TOWN[mode];
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
  subtitle: 'Laminar Flow // Turbulence',
  modes: ['state', 'nomad', 'town', 'conflict'],
  stillFrames: 450,
  describe: (mode) =>
    `Hydraulic simulation: water entering from the left, a faster stream over a slower one, in ${mode} mode. Tracers are cyan where the flow runs in layers and magenta where it turns.`,
  controls: [
    { kind: 'slider', key: 'uTop', label: 'Upper Stream Speed', min: 0.2, max: 1.5, step: 0.05, default: 0.7, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'uBottom', label: 'Lower Stream Speed', min: 0, max: 1.2, step: 0.05, default: 0.15, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'viscosity', label: 'Viscosity ν', min: 0, max: 0.05, step: 0.001, default: 0.002, tint: 'ink', format: 'dec3' },
    { kind: 'slider', key: 'clinamen', label: 'Clinamen (inlet swerve)', min: 0, max: 0.3, step: 0.01, default: 0.1, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'channels', label: 'Channels', min: 2, max: 8, step: 1, default: 4, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'flood', label: 'Flood (seasonal rise)', min: 0, max: 1, step: 0.05, default: 0.6, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'season', label: 'Season (steps)', min: 0, max: 2000, step: 50, default: 600, tint: 'ink', format: 'int' },
    { kind: 'slider', key: 'critical', label: 'Critical Stress (banks)', min: 0.2, max: 1.5, step: 0.05, default: 0.6, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'erosion', label: 'Erosion Rate', min: 0, max: 0.5, step: 0.01, default: 0.05, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'repair', label: 'Repair Rate', min: 0, max: 0.05, step: 0.001, default: 0.01, tint: 'cyan', format: 'dec3' },
    { kind: 'slider', key: 'gate', label: 'Gate Width (cells)', min: 2, max: 40, step: 1, default: 8, tint: 'green', format: 'int' },
    { kind: 'slider', key: 'confinement', label: 'Vorticity Confinement', min: 0, max: 0.1, step: 0.005, default: 0, tint: 'ink', format: 'dec3' },
    { kind: 'slider', key: 'tracers', label: 'Tracers', min: 500, max: 4000, step: 250, default: 2000, tint: 'ink', format: 'int', reinit: true },
    { kind: 'slider', key: 'speed', label: 'Steps per Frame', min: 1, max: 3, step: 1, default: 2, tint: 'ink', format: 'int', divider: true },
  ],
  status: (p) => [
    ['ν', p.viscosity.toFixed(3)],
    ['Flood', `${Math.round(p.flood * 100)}%`],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Channels. Embankments split the flow into fixed paths where it runs in layers: labor, goods, and people moved along assigned routes. ATP: the State regulates “the movement of the flow of labor, assigning it channels and conduits” (368).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Turbulence. In open water the flow rolls into eddies that hold their own ground, and surges break the channels: vagabondage, migration, flight. ATP: a movement “distributed by turbulence across a smooth space” (363).' },
    { process: 'polarization', heading: '03 / Polarization', text: 'The town. Every flow must enter by one gate and leave by another, as goods pass through a market or a port. ATP: the town “is defined by entries and exits; something must enter it and exit from it” (432).' },
  ],
  legend: [
    { swatch: '#f2f2f2', see: 'Arrows at the left', social: 'flows of people, goods, and labor', physics: 'the inflow, longer where it is faster', atp: 'the State captures “flows of all kinds, populations, commodities or commerce, money or capital” (386)' },
    { swatch: '#00aeef', see: 'Cyan streaks', social: 'regulated circulation along assigned routes', physics: 'flow running in parallel layers (laminar)', atp: 'fixed paths that “restrict speed, regulate circulation, relativize movement” (386)', example: 'labor drafted for public works on the spot, the corvée (368)' },
    { swatch: '#ec008c', see: 'Magenta streaks', social: 'flows off the assigned routes, holding their own ground: vagabondage, nomadism', physics: 'water turning in eddies (high vorticity)', atp: 'a movement “distributed by turbulence” (363), which the State sets out to conquer as “a band vagabondage” (368)', example: 'the itinerant masons, carpenters, and smiths of ATP 368' },
    { swatch: '#94a3b8', see: 'Gray banks', social: 'the State’s fixed paths: roads, registers, assigned work', physics: 'walls that narrow the flow and lower its Reynolds number; they fade as they erode', atp: 'the flow of labor assigned “channels and conduits” (368)' },
    { swatch: '#cbd5e1', see: 'Breaches', social: 'routes breaking under a surge of migration or flight, then re-established', physics: 'erosion where the flow passes a critical speed, repair in calm water', atp: 'smooth and striated “exist only in mixture” (474)' },
    { swatch: '#2f8f4e', see: 'Two walls with gates', social: 'a market town or port that every flow must pass through', physics: 'water forced in at one gate and out at another, circling the basin between', atp: 'the town “is defined by entries and exits” (432)', example: 'Athens, Carthage, Venice, ATP’s maritime and commercial towns (432)' },
  ],
  create,
};
