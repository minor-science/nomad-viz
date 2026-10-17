import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { Fluid } from '../sim/fluid';
import { Regimes, LAYERS, CELLS, EDDIES } from '../sim/regimes';
import { HeatPatches, Wobble } from '../sim/heating';
import { beginTags, drawTag, StickyTag } from '../sim/tags';

// Nomadology in a world where everything is liquid. Underneath is a physics-class experiment: a
// shallow layer of liquid with a through-flow, heated unevenly from below. Depending on the flow
// and the heat, the liquid runs in layers (laminar, capture), turns in small equal convection cells
// (warding off), or breaks into eddies (turbulence, the war machine). In conflict mode the heaters
// drift and surge on their own and the through-flow wavers, so the regimes press on one another
// across the space and take the lead in turn. It is drawn abstractly, as a field of streaks.

// The liquid layer, NX by NY cells, stretched over the canvas.
const NX = 180;
const NY = 30;
const NU = 0.005;
const KAPPA = 0.005;
const HEATERS = 4;
// Frames of history in the narrator's chart.
const SPAN = 600;
// Frames a caption stays up before it may change, and the window for judging who is gaining.
const PHASE_HOLD = 180;
const TREND = 120;

const CYAN = '#00aeef';
const MAGENTA = '#ec008c';
const YELLOW = '#e0a800';
const WARM = '#ff6e46';
const KIND_COLOR = [CYAN, YELLOW, MAGENTA];

type Caption = { head: string; sub: string; color: string };

// The narrator in conflict names who is gaining on whom: GAINS[gainer][loser].
const GAINS: Caption[][] = [
  [
    { head: '', sub: '', color: CYAN },
    {
      head: 'CAPTURE GAINS · Striation. The through-flow sweeps the segmentary circles into conduits, one route from point to point (convection cells give way to laminar layers).',
      sub: 'ATP: “One of the fundamental tasks of the State is to striate the space over which it reigns” (385).',
      color: CYAN,
    },
    {
      head: 'CAPTURE GAINS · The State’s hydraulics. The surge passes and the conduits take the vortices back (turbulence settles into laminar layers).',
      sub: 'ATP: the State “makes the fluid depend on the solid, and flows proceed by parallel, laminar layers” (363).',
      color: CYAN,
    },
  ],
  [
    {
      head: 'WARDING OFF GAINS · Segmentarity. Heat from below breaks the conduit into small circles, each on its own ground, and no route runs through (laminar layers give way to convection cells).',
      sub: 'ATP: war “maintains the dispersal and segmentarity of groups” (357).',
      color: YELLOW,
    },
    { head: '', sub: '', color: YELLOW },
    {
      head: 'WARDING OFF GAINS · The vortices settle into small, equal circles, so no central point takes on consistency (turbulence calms into convection cells).',
      sub: 'ATP: mechanisms keep central points “from crystallizing, from taking on consistency” (433).',
      color: YELLOW,
    },
  ],
  [
    {
      head: 'WAR MACHINE GAINS · The clinamen. A swerve in the laminar flow grows into vortices, and movement leaves the conduit (laminar layers break into turbulence).',
      sub: 'ATP: “From turba to turbo: in other words, from bands or packs of atoms to the great vortical organizations” (361).',
      color: MAGENTA,
    },
    {
      head: 'WAR MACHINE GAINS · Smooth space. The small circles join into vortices across the whole space, a movement that holds space instead of being held by it (convection cells break into turbulence).',
      sub: 'ATP: the war machine is “distributed by turbulence across a smooth space” (363).',
      color: MAGENTA,
    },
    { head: '', sub: '', color: MAGENTA },
  ],
];
const HOLDING: Caption[] = [
  {
    head: 'CAPTURE HOLDS · Striated space. Flows run in conduits from point to point, measured and channeled (laminar layers).',
    sub: 'ATP: conduits “constrain movement to go from one point to another” (363).',
    color: CYAN,
  },
  {
    head: 'WARDING OFF HOLDS · Segmentarity. Small circles, each on its own ground, with no point common to them (convection cells).',
    sub: 'ATP: “the circles are not concentric, and the two segments require a third segment through which to communicate” (433).',
    color: YELLOW,
  },
  {
    head: 'WAR MACHINE HOLDS · The vortical model. Movement occupies an open space with no conduits or channels (turbulence).',
    sub: 'ATP: “Smooth space is a field without conduits or channels” (371).',
    color: MAGENTA,
  },
];
const MIXTURE: Caption = {
  head: 'IN MIXTURE · Conduits, segmentary circles, and vortices side by side, each pressing on the others.',
  sub: 'ATP: smooth and striated “exist only in mixture” (474).',
  color: '#cbd5e1',
};
const MODE_CAPTION: Partial<Record<Mode, Caption>> = {
  state: {
    head: 'CAPTURE ALONE · The State’s hydraulics. A strong, steady through-flow and little heat: all movement in conduits, point to point (laminar layers).',
    sub: 'ATP: the State subordinates hydraulic force “to conduits, pipes, embankments, which prevent turbulence” (363).',
    color: CYAN,
  },
  nonstate: {
    head: 'WARDING OFF ALONE · Segmentarity. Even heat and no through-flow: a row of small equal circles, none concentric, none central (convection cells).',
    sub: 'ATP: war “maintains the dispersal and segmentarity of groups” (357).',
    color: YELLOW,
  },
  nomad: {
    head: 'WAR MACHINE ALONE · The vortical model. Strong surges from below: vortices hold the whole space (turbulence).',
    sub: 'ATP: “The model is a vortical one; it operates in an open space throughout which things-flows are distributed” (361).',
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
  let heaters: HeatPatches | null = null;
  const wobble = new Wobble();
  let tracers: Tracer[] = [];
  let trail: HTMLCanvasElement | null = null;
  let floor: Float32Array = new Float32Array(NX).fill(1);
  let heat = 0;
  let caption: Caption = MIXTURE;
  let captionAge = PHASE_HOLD;
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
      regimes.rel = 0.06;
      heaters = new HeatPatches(NX, HEATERS);
      tracers = Array.from({ length: params.tracers }, () => {
        const t = { x: 0, y: 0, px: 0, py: 0, age: 0 };
        spawn(t);
        t.age = (Math.random() * 300) | 0;
        return t;
      });
    },

    frame(ctx, f: Frame) {
      if (!fluid || !regimes || !heaters) return;
      const { mode, params, width, height, motionScale } = f;

      // Each mode sets the experiment's dials: the through-flow, the heat, and how unevenly it comes.
      let flow = params.flow;
      let surge = params.surge;
      let pace = params.pace;
      let wander = params.wander;
      heat = params.heat;
      let even = false;
      if (mode === 'state') {
        flow = Math.max(params.flow, 0.4) * 1.2;
        heat = params.heat * 0.2;
        surge = 0;
      } else if (mode === 'nonstate') {
        flow = 0;
        heat = params.heat * 0.8;
        even = true;
      } else if (mode === 'nomad') {
        // Turbulence is driven hard: stronger heat, surging faster and wandering more.
        heat = params.heat * 2;
        surge = Math.max(params.surge, 1.5);
        pace = params.pace * 5;
        wander = 3;
      }

      acc += params.speed * motionScale;
      const steps = Math.floor(acc);
      acc -= steps;
      let along = flow;
      for (let k = 0; k < steps; k++) {
        floor = even ? floor.fill(1) : heaters.step(surge, pace, wander);
        along = mode === 'conflict' ? flow * wobble.step(0.6, 0.0015) : flow;
        fluid.stepThermal(floor, KAPPA, heat, 0.5);
        fluid.step({ nu: NU, uTop: along, uBottom: along, clinamen: 0.01, confinement: 0 });
        regimes.update(fluid);
      }
      const fr = regimes.fractions;
      let floorMax = 0;
      let floorMean = 0;
      for (let x = 0; x < NX; x++) {
        floorMax = Math.max(floorMax, floor[x]);
        floorMean += floor[x] / NX;
      }
      history.layers.push(fr[0]);
      history.cells.push(fr[1]);
      history.eddies.push(fr[2]);
      history.heat.push(Math.min(1, (heat * floorMax) / (params.heat * 6)));
      if (history.layers.length > SPAN) {
        history.layers.shift();
        history.cells.shift();
        history.eddies.shift();
        history.heat.shift();
      }

      // The liquid fills the canvas. Streaks fade on their own layer.
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
          if (along > 0.05 && Math.random() < 0.6) t.x = t.px = 1 + Math.random() * 3;
          continue;
        }
        tctx.strokeStyle = KIND_COLOR[regimes.kind[Math.floor(t.x) + Math.floor(t.y) * NX]];
        tctx.beginPath();
        tctx.moveTo(t.px * sx, t.py * sy);
        tctx.lineTo(t.x * sx + (t.x - t.px) * sx * 2, t.y * sy + (t.y - t.py) * sy * 2);
        tctx.stroke();
      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();
      // The heat from below, as a soft glow along the bottom edge, brighter where a heater surges.
      const glowH = sy * 4;
      for (let x = 0; x < NX; x += 2) {
        const a = Math.min(0.5, 0.12 * floor[x] * (heat / params.heat));
        const g = ctx.createLinearGradient(0, height - glowH, 0, height);
        g.addColorStop(0, 'rgba(255, 110, 70, 0)');
        g.addColorStop(1, `rgba(255, 110, 70, ${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(x * sx, height - glowH, sx * 2 + 0.5, glowH);
      }

      // Narration. In conflict it names who is gaining on whom over the last few seconds.
      {
        let cap = MODE_CAPTION[mode] ?? null;
        if (mode === 'conflict') {
          captionAge++;
          const n = history.layers.length;
          if (captionAge > PHASE_HOLD && n > TREND) {
            const series = [history.layers, history.cells, history.eddies];
            const delta = series.map((s) => s[n - 1] - s[n - 1 - TREND]);
            const gainer = delta.indexOf(Math.max(...delta));
            const loser = delta.indexOf(Math.min(...delta));
            const leader = fr.indexOf(Math.max(...fr));
            const next =
              delta[gainer] > 0.08 && gainer !== loser
                ? GAINS[gainer][loser]
                : fr[leader] > 0.5
                  ? HOLDING[leader]
                  : MIXTURE;
            if (next !== caption) {
              caption = next;
              captionAge = 0;
            }
          }
          cap = caption;
        }
        narration = cap
          ? {
              ...cap,
              series: [
                { values: history.layers, color: CYAN, label: 'conduits' },
                { values: history.cells, color: YELLOW, label: 'circles' },
                { values: history.eddies, color: MAGENTA, label: 'vortices' },
                { values: history.heat, color: WARM, label: 'upswell' },
              ],
              span: SPAN,
            }
          : null;
      }

      // Explain layer: one tag on a live example of each regime, followed as it drifts.
      if (f.explain) {
        beginTags();
        const bounds = { width, height };
        // Share of a kind in the neighborhood around a point, so a tag reads a region, not one cell.
        const share = (a: { x: number; y: number }, kind: number) => {
          let n = 0;
          let c = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
              const x = Math.floor(a.x) + dx;
              const y = Math.floor(a.y) + dy;
              if (x < 1 || x >= NX - 1 || y < 1 || y >= NY - 1) continue;
              n++;
              if (regimes!.kind[x + y * NX] === kind) c++;
            }
          }
          return n ? c / n : 0;
        };
        const kindAt = (a: { x: number; y: number }) => regimes!.kind[Math.floor(a.x) + Math.floor(a.y) * NX];
        // New tags go on the upper part of the canvas, clear of the legend at the bottom left.
        const pick = (kind: number) => () => {
          for (let tries = 0; tries < 200; tries++) {
            const a = { x: 6 + Math.random() * (NX - 12), y: 3 + Math.random() * (NY * 0.55) };
            if (kindAt(a) === kind && share(a, kind) > 0.7) return { anchor: a, x: a.x * sx, y: a.y * sy };
          }
          return null;
        };
        const follow = (kind: number) => (a: { x: number; y: number }) => {
          const [u, v] = fluid!.velocityAt(a.x, a.y);
          a.x += u * Math.max(1, steps) * 0.5;
          a.y += v * Math.max(1, steps) * 0.5;
          if (a.x < 3 || a.x > NX - 3 || a.y < 2 || a.y > NY - 2) return null;
          return share(a, kind) > 0.35 ? { x: a.x * sx, y: a.y * sy } : null;
        };
        // Each mode tags only the processes it stages.
        if (mode === 'conflict' || mode === 'state') {
          tags.layers.update(follow(LAYERS), pick(LAYERS));
          tags.layers.draw(ctx, 'CAPTURE · striation: conduits “constrain movement to go from one point to another” (363)', CYAN, bounds, 'CAPTURE · this conduit broke, and turbulence escaped it');
        }
        if (mode === 'conflict' || mode === 'nonstate') {
          tags.cells.update(follow(CELLS), pick(CELLS));
          tags.cells.draw(ctx, 'WARDING OFF · segmentarity: “the circles are not concentric” (433)', YELLOW, bounds, 'WARDING OFF · this circle was swept into a conduit or a vortex');
        }
        if (mode === 'conflict' || mode === 'nomad') {
          tags.eddies.update(follow(EDDIES), pick(EDDIES));
          tags.eddies.draw(ctx, 'WAR MACHINE · the vortical model: a movement “that holds space” (363)', MAGENTA, bounds, 'WAR MACHINE · this vortex settled');
        }
        if (mode !== 'state' && !even && floorMax > floorMean * 1.4) {
          const hx = floor.indexOf(floorMax);
          drawTag(ctx, hx * sx, height - sy, 'the upswell: “a rhythm without measure” (364)', WARM, bounds);
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
  subtitle: 'A Liquid World // Conduits, Circles, Vortices',
  frameEvery: 2,
  stillFrames: 700,
  describe: (mode) =>
    `Hydraulic simulation in ${mode} mode: liquid with a through-flow, heated unevenly from below. Cyan streaks run in conduits (laminar layers, striated space), yellow streaks turn in small segmentary circles (convection cells), magenta streaks are vortices holding smooth space (turbulence).`,
  controls: [
    { kind: 'slider', key: 'flow', label: 'Through-Flow (capture)', min: 0, max: 0.8, step: 0.02, default: 0.4, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'heat', label: 'Heat from Below', min: 0.001, max: 0.012, step: 0.0005, default: 0.0045, tint: 'yellow', format: 'x1000' },
    { kind: 'slider', key: 'surge', label: 'Surges (unevenness)', min: 0, max: 2, step: 0.1, default: 1.2, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'pace', label: 'Surge Pace', min: 0.0005, max: 0.006, step: 0.0005, default: 0.002, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'wander', label: 'Heaters Wander', min: 0, max: 3, step: 0.25, default: 1, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'tracers', label: 'Streaks', min: 500, max: 4000, step: 250, default: 2400, tint: 'ink', format: 'int', reinit: true },
    { kind: 'slider', key: 'speed', label: 'Steps per Snapshot', min: 0.5, max: 4, step: 0.5, default: 2, tint: 'ink', format: 'dec2', divider: true },
  ],
  status: (p) => [
    ['Flow', p.flow.toFixed(2)],
    ['Heat', (p.heat * 1000).toFixed(1)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Conduits. The through-flow channels the liquid into parallel layers, movement from point to point in striated space (laminar flow). ATP: the State subordinates hydraulic force “to conduits, pipes, embankments, which prevent turbulence” (363).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Vortices. When the heat surges, a swerve grows into vortices that hold the whole space (turbulence). ATP: “From turba to turbo” (361), a movement “distributed by turbulence across a smooth space” (363).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Circles. Heat from below breaks the conduits into small, equal circles, each on its own ground, none central (convection cells). ATP: war “maintains the dispersal and segmentarity of groups” (357), and “the circles are not concentric” (433).' },
  ],
  legend: [
    { swatch: CYAN, see: 'Cyan streaks', social: 'striated space: flows of people, goods, and labor in conduits, point to point', physics: 'laminar flow, vertical motion small next to the flow along', atp: 'conduits “constrain movement to go from one point to another” (363)' },
    { swatch: YELLOW, see: 'Yellow streaks', social: 'segmentarity: small groups, each on its own ground, none central', physics: 'steady convection cells (Rayleigh-Bénard), each roll turning in place', atp: 'war “maintains the dispersal and segmentarity of groups” (357), and “the circles are not concentric” (433)' },
    { swatch: MAGENTA, see: 'Magenta streaks', social: 'smooth space: vortices, a movement that holds space instead of being held by it', physics: 'turbulence: vertical motion that keeps changing', atp: '“From turba to turbo” (361), “distributed by turbulence across a smooth space” (363)' },
    { swatch: WARM, see: 'Glow along the bottom', social: 'the upswell: unrest rising from below, uneven in place and time', physics: 'heaters under the floor that drift and surge on their own; the through-flow enters at the left and wavers', atp: '“a rhythm without measure, which relates to the upswell of a flow” (364)' },
  ],
  create,
};
