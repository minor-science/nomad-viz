import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { Fluid } from '../sim/fluid';
import { Regimes, LAYERS, CELLS, EDDIES } from '../sim/regimes';
import { beginTags, StickyTag } from '../sim/tags';

// Nomadology in a world where everything is liquid. Underneath is a physics-class experiment: a
// shallow layer of liquid with a through-flow, heated from below. Depending on the flow and the
// heat, it runs in layers (laminar, capture), turns in a row of small equal convection cells
// (warding off), or breaks into eddies (turbulence, the war machine). In conflict mode the heat
// fluctuates, as a physicist would drive a convection experiment, so the regimes take turns.
// It is drawn abstractly, as a field of streaks over the whole canvas, with no apparatus.

// The liquid layer, NX by NY cells, stretched over the canvas.
const NX = 180;
const NY = 30;
const NU = 0.005;
const KAPPA = 0.005;
// Frames of history in the narrator's chart.
const SPAN = 600;
// Frames a phase caption stays up before it may change.
const PHASE_HOLD = 150;

const CYAN = '#00aeef';
const MAGENTA = '#ec008c';
const YELLOW = '#e0a800';
const KIND_COLOR = [CYAN, YELLOW, MAGENTA];

type Phase = 'layers' | 'cells' | 'eddies' | 'mixture';
const PHASES: Record<Phase, { head: string; sub: string; color: string }> = {
  layers: {
    head: 'CAPTURE · The flow runs in parallel layers, carried point to point along a fixed path (laminar).',
    sub: 'ATP: the State subordinates flow to “conduits, pipes, embankments, which prevent turbulence” (363).',
    color: CYAN,
  },
  cells: {
    head: 'WARDING OFF · Heat from below breaks the layers into small circuits, each turning in place, none at the center (convection cells).',
    sub: 'ATP: the mechanism that “maintains the dispersal and segmentarity of groups” (357).',
    color: YELLOW,
  },
  eddies: {
    head: 'WAR MACHINE · The heat surges and the circuits break into eddies that hold the whole space (turbulence).',
    sub: 'ATP: a movement “distributed by turbulence across a smooth space” (363).',
    color: MAGENTA,
  },
  mixture: {
    head: 'IN MIXTURE · Layers, circuits, and eddies side by side.',
    sub: 'ATP: smooth and striated “exist only in mixture” (474).',
    color: '#cbd5e1',
  },
};
const MODE_CAPTION: Partial<Record<Mode, { head: string; sub: string; color: string }>> = {
  state: {
    head: 'CAPTURE ALONE · A strong through-flow and little heat: everything runs in layers, point to point (laminar).',
    sub: 'ATP: “regulating the movement of the flow of labor, assigning it channels and conduits” (368).',
    color: CYAN,
  },
  nonstate: {
    head: 'WARDING OFF ALONE · Gentle heat and no through-flow: a row of small equal circuits, none at the center (convection cells).',
    sub: 'ATP: the mechanism that “maintains the dispersal and segmentarity of groups” (357).',
    color: YELLOW,
  },
  nomad: {
    head: 'WAR MACHINE ALONE · Strong heat under the flow: eddies that hold the whole space (turbulence).',
    sub: 'ATP: from the smallest swerve “to the great vortical organizations” (361).',
    color: MAGENTA,
  },
};

interface Tracer {
  x: number;
  y: number;
  px: number;
  py: number;
  age: number;
}

function create(): SimInstance {
  let fluid: Fluid | null = null;
  let regimes: Regimes | null = null;
  let tracers: Tracer[] = [];
  let trail: HTMLCanvasElement | null = null;
  let z = 0; // log of the heat's fluctuation
  let heat = 0;
  let phase: Phase = 'mixture';
  let phaseAge = 0;
  let narration: Narration | null = null;
  let acc = 0;
  const history = { layers: [] as number[], cells: [] as number[], eddies: [] as number[], heat: [] as number[] };
  const tags = {
    layers: new StickyTag<{ x: number; y: number }>(300),
    cells: new StickyTag<{ x: number; y: number }>(300),
    eddies: new StickyTag<{ x: number; y: number }>(300),
  };

  const spawn = (t: Tracer) => {
    t.x = t.px = 1 + Math.random() * (NX - 3);
    t.y = t.py = 1 + Math.random() * (NY - 3);
    t.age = 0;
  };

  return {
    init(_w, _h, params) {
      fluid = new Fluid(NX, NY);
      for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) fluid.temp[x + y * NX] = y / (NY - 1);
      regimes = new Regimes(fluid.n);
      z = 0;
      tracers = Array.from({ length: params.tracers }, () => {
        const t = { x: 0, y: 0, px: 0, py: 0, age: 0 };
        spawn(t);
        t.age = (Math.random() * 300) | 0;
        return t;
      });
    },

    frame(ctx, f: Frame) {
      if (!fluid || !regimes) return;
      const { mode, params, width, height, motionScale } = f;

      // Each mode sets the experiment's two dials: the through-flow and the heat.
      let flow = params.flow;
      let heatMean = params.heat;
      if (mode === 'state') {
        flow = Math.max(params.flow, 0.3);
        heatMean = params.heat * 0.15;
      } else if (mode === 'nonstate') {
        flow = 0;
        heatMean = params.heat * 0.8;
      } else if (mode === 'nomad') {
        heatMean = params.heat * 6;
      }

      acc += params.speed * motionScale;
      const steps = Math.floor(acc);
      acc -= steps;
      for (let k = 0; k < steps; k++) {
        // In conflict the heat fluctuates: a log-normal Ornstein-Uhlenbeck process, uneven in
        // strength and timing. In the other modes it holds steady.
        if (mode === 'conflict') {
          const theta = params.drift;
          z += -theta * z + params.surge * Math.sqrt(2 * theta) * (Math.random() * 2 - 1) * 1.73;
        } else z *= 0.99;
        heat = heatMean * Math.exp(z);
        fluid.stepThermal(1, KAPPA, heat);
        fluid.step({ nu: NU, uTop: flow, uBottom: flow, clinamen: 0.01, confinement: 0 });
        regimes.update(fluid);
      }
      const [fl, fc, fe] = regimes.fractions;
      history.layers.push(fl);
      history.cells.push(fc);
      history.eddies.push(fe);
      history.heat.push(Math.min(1, heat / (params.heat * 4)));
      if (history.layers.length > SPAN) {
        history.layers.shift();
        history.cells.shift();
        history.eddies.shift();
        history.heat.shift();
      }

      // The liquid fills the canvas. Streaks fade on their own layer; warmth is a faint tint.
      const sx = width / NX;
      const sy = height / NY;
      const main = ctx;
      if (!trail || trail.width !== main.canvas.width || trail.height !== main.canvas.height) {
        trail = document.createElement('canvas');
        trail.width = main.canvas.width;
        trail.height = main.canvas.height;
      }
      const tctx = trail.getContext('2d')!;
      tctx.setTransform(main.getTransform());
      tctx.fillStyle = 'rgba(11, 18, 32, 0.18)';
      tctx.fillRect(0, 0, width, height);
      tctx.lineWidth = 2.5;
      for (const t of tracers) {
        t.px = t.x;
        t.py = t.y;
        for (let k = 0; k < Math.max(1, steps); k++) {
          const [u, v] = fluid.velocityAt(t.x, t.y);
          t.x += u;
          t.y += v;
        }
        t.age++;
        if (t.x > NX - 2 || t.x < 1 || t.y < 1 || t.y > NY - 2 || t.age > 500) {
          spawn(t);
          if (flow > 0.05 && Math.random() < 0.6) t.x = t.px = 1 + Math.random() * 3;
          continue;
        }
        const kind = regimes.kind[Math.floor(t.x) + Math.floor(t.y) * NX];
        tctx.strokeStyle = KIND_COLOR[kind];
        tctx.beginPath();
        tctx.moveTo(t.px * sx, t.py * sy);
        tctx.lineTo(t.x * sx + (t.x - t.px) * sx * 2, t.y * sy + (t.y - t.py) * sy * 2);
        tctx.stroke();
      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();
      // Warmth, faint, so the heat's rising and falling can be sensed without an apparatus.
      for (let y = 1; y < NY - 1; y += 1) {
        for (let x = 0; x < NX; x += 3) {
          const tt = fluid.temp[x + y * NX];
          if (tt < 0.55) continue;
          ctx.fillStyle = `rgba(255, 110, 70, ${0.06 * (tt - 0.55) / 0.45})`;
          ctx.fillRect(x * sx, y * sy, sx * 3 + 0.5, sy + 0.5);
        }
      }

      // Narration
      {
        let cap = MODE_CAPTION[mode] ?? null;
        if (mode === 'conflict') {
          const top = Math.max(fl, fc, fe);
          const want: Phase = top < 0.45 ? 'mixture' : top === fl ? 'layers' : top === fc ? 'cells' : 'eddies';
          phaseAge++;
          if (want !== phase && phaseAge > PHASE_HOLD) {
            phase = want;
            phaseAge = 0;
          }
          cap = PHASES[phase];
        }
        narration = cap
          ? {
              ...cap,
              series: [
                { values: history.layers, color: CYAN, label: 'layers' },
                { values: history.cells, color: YELLOW, label: 'circuits' },
                { values: history.eddies, color: MAGENTA, label: 'eddies' },
                { values: history.heat, color: '#ff6e46', label: 'heat' },
              ],
              span: SPAN,
            }
          : null;
      }

      // Explain layer: one tag on a live example of each regime, followed as it drifts.
      if (f.explain) {
        beginTags();
        const bounds = { width, height };
        const kindAt = (a: { x: number; y: number }) => regimes!.kind[Math.floor(a.x) + Math.floor(a.y) * NX];
        const pick = (kind: number) => () => {
          for (let tries = 0; tries < 200; tries++) {
            const a = { x: 6 + Math.random() * (NX - 12), y: 4 + Math.random() * (NY - 8) };
            if (kindAt(a) === kind) return { anchor: a, x: a.x * sx, y: a.y * sy };
          }
          return null;
        };
        const follow = (kind: number) => (a: { x: number; y: number }) => {
          const [u, v] = fluid!.velocityAt(a.x, a.y);
          a.x += u * Math.max(1, steps) * 0.5;
          a.y += v * Math.max(1, steps) * 0.5;
          if (a.x < 3 || a.x > NX - 3 || a.y < 2 || a.y > NY - 2) return null;
          return kindAt(a) === kind ? { x: a.x * sx, y: a.y * sy } : null;
        };
        // Each mode tags only the regimes it stages.
        if (mode === 'conflict' || mode === 'state') {
          tags.layers.update(follow(LAYERS), pick(LAYERS));
          tags.layers.draw(ctx, 'CAPTURE · flows carried point to point in layers', CYAN, bounds, 'the layers break up');
        }
        if (mode === 'conflict' || mode === 'nonstate') {
          tags.cells.update(follow(CELLS), pick(CELLS));
          tags.cells.draw(ctx, 'WARDING OFF · a small circuit turning in place, none at the center', YELLOW, bounds, 'the circuit dissolves');
        }
        if (mode === 'conflict' || mode === 'nomad') {
          tags.eddies.update(follow(EDDIES), pick(EDDIES));
          tags.eddies.draw(ctx, 'WAR MACHINE · eddies holding the whole space', MAGENTA, bounds, 'the eddies calm');
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
  tagline: 'Liquid',
  sidebarIcon: Droplets,
  headerIcon: Droplets,
  title: 'Hydraulic Metaphysics',
  subtitle: 'A Liquid World // Layers, Circuits, Eddies',
  frameEvery: 2,
  stillFrames: 700,
  describe: (mode) =>
    `Hydraulic simulation in ${mode} mode: liquid with a through-flow, warmed from below. Cyan streaks run in layers, yellow streaks turn in small circuits (convection cells), magenta streaks are turbulent eddies.`,
  controls: [
    { kind: 'slider', key: 'flow', label: 'Through-Flow (capture)', min: 0, max: 0.6, step: 0.02, default: 0.3, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'heat', label: 'Heat from Below (mean)', min: 0.001, max: 0.02, step: 0.0005, default: 0.005, tint: 'yellow', format: 'x1000' },
    { kind: 'slider', key: 'surge', label: 'Heat Surges (unevenness)', min: 0, max: 2, step: 0.1, default: 1.4, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'drift', label: 'Surge Pace', min: 0.0002, max: 0.005, step: 0.0002, default: 0.001, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'tracers', label: 'Streaks', min: 500, max: 4000, step: 250, default: 2400, tint: 'ink', format: 'int', reinit: true },
    { kind: 'slider', key: 'speed', label: 'Steps per Snapshot', min: 0.5, max: 4, step: 0.5, default: 2, tint: 'ink', format: 'dec2', divider: true },
  ],
  status: (p) => [
    ['Flow', p.flow.toFixed(2)],
    ['Heat', (p.heat * 1000).toFixed(1)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Layers. A through-flow strong enough sweeps the liquid into parallel layers, flows carried point to point along a fixed path (laminar). ATP: “conduits, pipes, embankments, which prevent turbulence” (363).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Eddies. When the heat surges, the liquid breaks into eddies that hold the whole space (turbulence). ATP: a movement “distributed by turbulence across a smooth space” (363).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Circuits. Gentle heat from below breaks the layers into a row of small, equal circuits, each turning in place, none at the center (convection cells). ATP: the mechanism that “maintains the dispersal and segmentarity of groups” (357).' },
  ],
  legend: [
    { swatch: CYAN, see: 'Cyan streaks', social: 'flows carried point to point along fixed paths', physics: 'laminar flow: little vertical motion, the through-flow in parallel layers', atp: '“conduits, pipes, embankments, which prevent turbulence” (363)' },
    { swatch: YELLOW, see: 'Yellow streaks', social: 'many small local circuits, none at the center', physics: 'steady convection cells (Rayleigh-Bénard), each roll turning in place', atp: 'warding off “maintains the dispersal and segmentarity of groups” (357)' },
    { swatch: MAGENTA, see: 'Magenta streaks', social: 'flows holding the whole space, off any fixed path', physics: 'turbulence: vertical motion that keeps changing', atp: 'a movement “distributed by turbulence across a smooth space” (363)' },
    { swatch: '#ff6e46', see: 'Faint warmth', social: 'the upswell from below that sets a society in motion', physics: 'heat from below, fluctuating in conflict mode; the liquid enters from the left', atp: '“a rhythm without measure, which relates to the upswell of a flow” (364)' },
  ],
  create,
};
