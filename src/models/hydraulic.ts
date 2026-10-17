import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { Fluid } from '../sim/fluid';
import { Regimes, LAYERS, CELLS, EDDIES } from '../sim/regimes';
import { HeatPatches, Wobble } from '../sim/heating';
import { Dye } from '../sim/dye';
import { beginTags, drawTag, StickyTag } from '../sim/tags';

// Nomadology in a world where everything is liquid. Underneath is a physics-class experiment: a
// shallow layer of liquid with a through-flow, heated unevenly from below, with dye released from
// fixed sources at the left, as in Reynolds' experiment. What is at stake is where the flow goes.
// Capture builds the conduit, carrying each lane of dye intact from its source to the far point
// (laminar flow). Warding off holds the flow in segments, small circles that stop the conduit's
// front (convection cells). The war machine scatters it through all of the space (turbulence). In
// conflict the heaters drift and surge on their own and the through-flow wavers, so the conduit's
// front advances and is driven back, and the dye changes hands.

// The liquid layer, NX by NY cells, stretched over the canvas.
const NX = 180;
const NY = 30;
const NU = 0.005;
const KAPPA = 0.005;
const HEATERS = 4;
const LANES = 8;
const DYE_CAP = 3200;
// Frames of history in the narrator's chart.
const SPAN = 600;
// Frames a caption stays up before it may change, and the window for judging who is gaining.
const PHASE_HOLD = 180;
const TREND = 120;

const CYAN = '#00aeef';
const MAGENTA = '#ec008c';
const YELLOW = '#e0a800';
const WARM = '#ff6e46';
const INK = '#f2f2f2';

type Caption = { head: string; sub: string; color: string };

// The narrator in conflict names who is gaining on whom: GAINS[gainer][loser], in the order
// capture, warding off, war machine.
const GAINS: Caption[][] = [
  [
    { head: '', sub: '', color: CYAN },
    {
      head: 'CAPTURE GAINS · The conduit pushes through the segments: households that kept their work to themselves are drafted onto the State’s works (convection cells give way to laminar flow).',
      sub: '“One of the fundamental tasks of the State is to striate the space over which it reigns” (Plateaus: 385).',
      color: CYAN,
    },
    {
      head: 'CAPTURE GAINS · As the surge passes, the conduit takes back the roaming journeymen and settles them into guilds and the corvée (turbulence settles into laminar flow).',
      sub: '“Settling, sedentarizing labor power, regulating the movement of the flow of labor, assigning it channels and conduits” (Plateaus: 368).',
      color: CYAN,
    },
  ],
  [
    {
      head: 'WARDING OFF GAINS · Segments form ahead of the conduit’s front: households keep their labor for themselves, so none of it reaches the State’s works (convection cells stop the laminar flow).',
      sub: 'War “maintains the dispersal and segmentarity of groups” (Plateaus: 357).',
      color: YELLOW,
    },
    { head: '', sub: '', color: YELLOW },
    {
      head: 'WARDING OFF GAINS · The packs settle into households that work for themselves and leave no surplus to levy (turbulence calms into convection cells).',
      sub: '“the circles are not concentric, and the two segments require a third segment through which to communicate” (Plateaus: 433).',
      color: YELLOW,
    },
  ],
  [
    {
      head: 'WAR MACHINE GAINS · A swerve in the conduit grows into a vortex: drafted labor slips its channel and takes to the open country (laminar flow breaks into turbulence).',
      sub: '“From turba to turbo: in other words, from bands or packs of atoms to the great vortical organizations” (Plateaus: 361).',
      color: MAGENTA,
    },
    {
      head: 'WAR MACHINE GAINS · The segments break open as their members take to the road in packs that cross the whole space (convection cells break into turbulence).',
      sub: 'The war machine is “distributed by turbulence across a smooth space” (Plateaus: 363).',
      color: MAGENTA,
    },
    { head: '', sub: '', color: MAGENTA },
  ],
];
const HOLDING: Caption[] = [
  {
    head: 'CAPTURE HOLDS · Labor runs in the State’s channels, from the villages to its works, by corvée and by guild (laminar flow).',
    sub: '“relying on forced manpower recruited on the spot (corvee) or among indigents (charity workshops)” (Plateaus: 368).',
    color: CYAN,
  },
  {
    head: 'WARDING OFF HOLDS · Households work for themselves and share what they make, out of the corvée’s reach (convection cells).',
    sub: 'The members of a band “disperse to eat or sleep separately,” so the leader cannot acquire stable power (Plateaus: 358).',
    color: YELLOW,
  },
  {
    head: 'WAR MACHINE HOLDS · Masons, carpenters, and smiths move from site to site, outside the corvée and the guilds (turbulence).',
    sub: '“journeymen’s associations, or compagnonnages, the nomadic or itinerant bodies of the type formed by masons, carpenters, smiths” (Plateaus: 368).',
    color: MAGENTA,
  },
];
const MIXTURE: Caption = {
  head: 'IN MIXTURE · Some labor runs in the State’s channels, some stays in the households’ circles, some roams in packs.',
  sub: 'Smooth and striated “exist only in mixture” (Plateaus: 474).',
  color: '#cbd5e1',
};
const MODE_CAPTION: Partial<Record<Mode, Caption>> = {
  state: {
    head: 'CAPTURE ALONE · A strong, steady draft and little upswell: all labor runs in the State’s channels, from the villages to its works (laminar flow).',
    sub: '“Settling, sedentarizing labor power, regulating the movement of the flow of labor, assigning it channels and conduits” (Plateaus: 368).',
    color: CYAN,
  },
  nonstate: {
    head: 'WARDING OFF ALONE · A weak draft and even heat: households work for themselves, out of the corvée’s reach (convection cells).',
    sub: 'War “maintains the dispersal and segmentarity of groups” (Plateaus: 357).',
    color: YELLOW,
  },
  nomad: {
    head: 'WAR MACHINE ALONE · Strong surges from below: labor escapes the corvée and roams in packs across the whole space (turbulence).',
    sub: '“The model is a vortical one; it operates in an open space throughout which things-flows are distributed” (Plateaus: 361).',
    color: MAGENTA,
  },
};

// Faint streaks through the whole liquid, colored by what it is doing where they are, so the
// circles and vortices show even where no dye has reached. The dye is drawn bright on top.
interface Mote {
  x: number;
  y: number;
  px: number;
  py: number;
  age: number;
}
const FIELD_COLOR = ['rgba(0, 174, 239, 0.4)', 'rgba(224, 168, 0, 0.45)', 'rgba(236, 0, 140, 0.42)'];

function create(): SimInstance {
  let fluid: Fluid | null = null;
  let regimes: Regimes | null = null;
  let heaters: HeatPatches | null = null;
  let dye: Dye | null = null;
  let motes: Mote[] = [];
  const wobble = new Wobble();
  let trail: HTMLCanvasElement | null = null;
  let floor: Float32Array = new Float32Array(NX).fill(1);
  let heat = 0;
  let caption: Caption = MIXTURE;
  let captionAge = PHASE_HOLD;
  let narration: Narration | null = null;
  let acc = 0;
  let fronts: number[] = [];
  const history = { reach: [] as number[], held: [] as number[], scattered: [] as number[], heat: [] as number[] };
  // What replaced a lost circle or pack, fixed when the loss is first reported.
  let segmentFate: string | null = null;
  let packFate: string | null = null;
  const tags = {
    conduit: new StickyTag<number>(400),
    segment: new StickyTag<{ x: number; y: number }>(300),
    pack: new StickyTag<{ x: number; y: number }>(300),
    upswell: new StickyTag<number>(400),
  };

  return {
    init() {
      fluid = new Fluid(NX, NY);
      for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) fluid.temp[x + y * NX] = y / (NY - 1);
      regimes = new Regimes(fluid.n);
      regimes.rel = 0.06;
      heaters = new HeatPatches(NX, HEATERS);
      dye = new Dye(DYE_CAP, NX, NY, LANES);
      motes = Array.from({ length: 1600 }, () => {
        const x = 1 + Math.random() * (NX - 3);
        const y = 1 + Math.random() * (NY - 3);
        return { x, y, px: x, py: y, age: (Math.random() * 400) | 0 };
      });
      for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].length = 0;
    },

    frame(ctx, f: Frame) {
      if (!fluid || !regimes || !heaters || !dye) return;
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
        flow = 0.04;
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
      dye.mark();
      for (let k = 0; k < steps; k++) {
        floor = even ? floor.fill(1) : heaters.step(surge, pace, wander);
        const along = mode === 'conflict' ? flow * wobble.step(0.6, 0.0015) : flow;
        fluid.stepThermal(floor, KAPPA, heat, 0.5);
        fluid.step({ nu: NU, uTop: along, uBottom: along, clinamen: 0.01, confinement: 0 });
        regimes.update(fluid);
        dye.step(fluid, params.dye);
      }
      const stakes = dye.stats(regimes);
      // The front as drawn follows the measured front smoothly, since the measured one jumps
      // whenever the leading particle of a lane strays from it.
      if (fronts.length !== stakes.fronts.length) fronts = [...stakes.fronts];
      for (let k = 0; k < fronts.length; k++) fronts[k] += (stakes.fronts[k] - fronts[k]) * 0.1;
      let floorMax = 0;
      let floorMean = 0;
      for (let x = 0; x < NX; x++) {
        floorMax = Math.max(floorMax, floor[x]);
        floorMean += floor[x] / NX;
      }
      history.reach.push(stakes.reach);
      history.held.push(stakes.held);
      history.scattered.push(stakes.scattered);
      history.heat.push(Math.min(1, (heat * floorMax) / (params.heat * 6)));
      if (history.reach.length > SPAN) for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].shift();

      // The liquid fills the canvas. Dye streaks fade on their own layer.
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
      tctx.fillStyle = 'rgba(11, 18, 32, 0.14)';
      tctx.fillRect(0, 0, width, height);
      tctx.lineWidth = 2;
      for (let kind = 0; kind < 3; kind++) {
        tctx.strokeStyle = FIELD_COLOR[kind];
        tctx.beginPath();
        for (const m of motes) {
          if (kind === 0) {
            m.px = m.x;
            m.py = m.y;
            for (let k = 0; k < Math.max(1, steps); k++) {
              const [u, v] = fluid.velocityAt(m.x, m.y);
              m.x += u;
              m.y += v;
            }
            if (++m.age > 400 || m.x < 1 || m.x > NX - 2 || m.y < 1 || m.y > NY - 2) {
              m.x = m.px = 1 + Math.random() * (NX - 3);
              m.y = m.py = 1 + Math.random() * (NY - 3);
              m.age = 0;
            }
          }
          if (regimes.kind[Math.floor(m.x) + Math.floor(m.y) * NX] !== kind) continue;
          tctx.moveTo(m.px * sx, m.py * sy);
          tctx.lineTo(m.x * sx + (m.x - m.px) * sx, m.y * sy + (m.y - m.py) * sy);
        }
        tctx.stroke();
      }
      tctx.lineWidth = 3;
      // Batch the streaks by color: intact dye in the conduit, held in segments, scattered by packs.
      const batches: [string, number][] = [
        [CYAN, -1],
        ['rgba(0, 174, 239, 0.45)', 0],
        [YELLOW, CELLS],
        [MAGENTA, EDDIES],
      ];
      for (const [color, kind] of batches) {
        tctx.strokeStyle = color;
        tctx.beginPath();
        for (let i = 0; i < dye.count; i++) {
          const intact = dye.intact[i] === 1;
          if (kind === -1 ? !intact : intact || regimes.kind[Math.floor(dye.x[i]) + Math.floor(dye.y[i]) * NX] !== kind) continue;
          const x0 = dye.px[i] * sx;
          const y0 = dye.py[i] * sy;
          const x1 = dye.x[i] * sx;
          const y1 = dye.y[i] * sy;
          if (Math.abs(x1 - x0) > width / 4) continue;
          tctx.moveTo(x0, y0);
          tctx.lineTo(x1 + (x1 - x0) * 0.5, y1 + (y1 - y0) * 0.5);
        }
        tctx.stroke();
      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();

      // The sources, and the conduit's front in each lane: how far the flow gets intact.
      ctx.fillStyle = INK;
      for (const s of dye.sources) {
        ctx.beginPath();
        ctx.arc(4, s * sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (mode !== 'nonstate' && mode !== 'nomad') {
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let k = 0; k < fronts.length; k++) {
          if (fronts[k] < 4) continue;
          const fx = fronts[k] * sx;
          ctx.moveTo(fx, (dye.sources[k] - 0.8) * sy);
          ctx.lineTo(fx, (dye.sources[k] + 0.8) * sy);
        }
        ctx.stroke();
      }

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
          const n = history.reach.length;
          // A caption whose process has nearly vanished may change sooner, so it never contradicts the field.
          const shown = caption === MIXTURE ? -1 : HOLDING.includes(caption) ? HOLDING.indexOf(caption) : GAINS.findIndex((row) => row.includes(caption));
          const stale = shown >= 0 && [stakes.reach, stakes.held, stakes.scattered][shown] < 0.25;
          if ((captionAge > PHASE_HOLD || (stale && captionAge > 60)) && n > TREND) {
            const series = [history.reach, history.held, history.scattered];
            const delta = series.map((s) => s[n - 1] - s[n - 1 - TREND]);
            const gainer = delta.indexOf(Math.max(...delta));
            const loser = delta.indexOf(Math.min(...delta));
            const next =
              delta[gainer] > 0.15 && gainer !== loser
                ? GAINS[gainer][loser]
                : stakes.reach > 0.7
                  ? HOLDING[0]
                  : stakes.held > 0.45
                    ? HOLDING[1]
                    : stakes.scattered > 0.5
                      ? HOLDING[2]
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
                { values: history.reach, color: CYAN, label: 'drafted to the works' },
                { values: history.held, color: YELLOW, label: 'kept by the households' },
                { values: history.scattered, color: MAGENTA, label: 'roaming in packs' },
                { values: history.heat, color: WARM, label: 'upswell' },
              ],
              span: SPAN,
            }
          : null;
      }

      // Explain layer: the conduit's front, a segment, and a pack, each followed as it moves.
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
        // New tags go on the upper part of the canvas, clear of the legend at the bottom left.
        const pick = (kind: number) => () => {
          for (let tries = 0; tries < 200; tries++) {
            const a = { x: 10 + Math.random() * (NX - 20), y: 3 + Math.random() * (NY * 0.55) };
            if (share(a, kind) > 0.7) return { anchor: a, x: a.x * sx, y: a.y * sy };
          }
          return null;
        };
        if (mode === 'conflict' || mode === 'state') {
          // The conduit's front in the lane that reaches farthest.
          tags.conduit.update(
            (k) => (fronts[k] > 12 ? { x: fronts[k] * sx, y: dye!.sources[k] * sy } : null),
            () => {
              // The upper lanes only, clear of the legend at the bottom left.
              let best = 0;
              for (let k = 1; k < Math.ceil(fronts.length * 0.6); k++) if (fronts[k] > fronts[best]) best = k;
              return fronts[best] > 12 ? { anchor: best, x: fronts[best] * sx, y: dye!.sources[best] * sy } : null;
            },
          );
          tags.conduit.draw(ctx, 'CAPTURE · the corvée’s reach: villagers marched toward the State’s works', CYAN, bounds, 'CAPTURE · the corvée falls short: no labor reaches the works');
        }
        if (mode === 'conflict' || mode === 'nonstate') {
          // A segment barely drifts, so its tag stays put while the circle lasts.
          tags.segment.update((a) => (share(a, CELLS) > 0.25 ? { x: a.x * sx, y: a.y * sy } : null), pick(CELLS));
          // When a circle is gone, what replaced it says what happened to the band.
          if (!tags.segment.lost) segmentFate = null;
          else if (!segmentFate && tags.segment.current) {
            segmentFate = share(tags.segment.current, LAYERS) >= share(tags.segment.current, EDDIES)
              ? 'WARDING OFF · this household’s circle is broken, its labor drafted onto the State’s works'
              : 'WARDING OFF · this household’s circle is broken, its members gone off as journeymen';
          }
          tags.segment.draw(ctx, 'WARDING OFF · a household working for itself, leaving no surplus to levy', YELLOW, bounds, segmentFate ?? 'WARDING OFF · this household’s circle is broken');
        }
        if (mode === 'conflict' || mode === 'nomad') {
          tags.pack.update((a) => {
            const [u, v] = fluid!.velocityAt(a.x, a.y);
            a.x += u * Math.max(1, steps) * 0.5;
            a.y += v * Math.max(1, steps) * 0.5;
            if (a.x < 3 || a.x > NX - 3 || a.y < 2 || a.y > NY - 2) return null;
            return share(a, EDDIES) > 0.25 ? { x: a.x * sx, y: a.y * sy } : null;
          }, pick(EDDIES));
          if (!tags.pack.lost) packFate = null;
          else if (!packFate && tags.pack.current) {
            packFate = share(tags.pack.current, LAYERS) >= share(tags.pack.current, CELLS)
              ? 'WAR MACHINE · these journeymen were drafted back into the corvée'
              : 'WAR MACHINE · these journeymen have settled into a household';
          }
          tags.pack.draw(ctx, 'WAR MACHINE · journeymen moving from site to site, outside the corvée and the guilds', MAGENTA, bounds, packFate ?? 'WAR MACHINE · these journeymen have stopped moving');
        }
        drawTag(ctx, 4, dye.sources[0] * sy, 'the sources: the villages where the corvée recruits', INK, bounds);
        if (mode !== 'state' && !even) {
          // The upswell tag follows one heater while it surges, rather than jumping to whichever
          // spot on the floor is hottest this frame, and fades when that heater cools.
          const centers = heaters.centers;
          // Only heaters on the right, clear of the legend at the bottom left.
          const hot = (k: number, from = 0.6) => {
            const c = centers[k];
            return c > NX * from && c < NX - 6 && floor[Math.round(c)] > floorMean * 1.4;
          };
          tags.upswell.update(
            (k) => (hot(k, 0.55) ? { x: centers[k] * sx, y: height - sy } : null),
            () => {
              let best = -1;
              for (let k = 0; k < centers.length; k++) if (hot(k) && (best < 0 || floor[Math.round(centers[k])] > floor[Math.round(centers[best])])) best = k;
              return best < 0 ? null : { anchor: best, x: centers[best] * sx, y: height - sy };
            },
          );
          tags.upswell.draw(ctx, 'the upswell: labor moving on its own, in “a rhythm without measure”', WARM, bounds);
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
  subtitle: 'A Liquid World // Conduit, Segments, Packs',
  frameEvery: 2,
  stillFrames: 700,
  describe: (mode) =>
    `Hydraulic simulation in ${mode} mode: dye released from sources at the left into a liquid with a through-flow, heated unevenly from below. The dye stands for labor: cyan dye runs intact in its lane toward the far edge (drafted to the State’s works, laminar flow), yellow dye is held in small circles (kept by the households, convection cells), magenta dye is scattered through the space (roaming in packs, turbulence).`,
  controls: [
    { kind: 'slider', key: 'flow', label: 'Through-Flow (the corvée)', min: 0, max: 0.8, step: 0.02, default: 0.4, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'heat', label: 'Heat from Below (upswell)', min: 0.001, max: 0.012, step: 0.0005, default: 0.0045, tint: 'yellow', format: 'x1000' },
    { kind: 'slider', key: 'surge', label: 'Surges (unevenness)', min: 0, max: 2, step: 0.1, default: 1.2, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'pace', label: 'Surge Pace', min: 0.0005, max: 0.006, step: 0.0005, default: 0.002, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'wander', label: 'Heaters Wander', min: 0, max: 3, step: 0.25, default: 1, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'dye', label: 'Dye per Source', min: 0.1, max: 1, step: 0.05, default: 0.4, tint: 'ink', format: 'dec2' },
    { kind: 'slider', key: 'speed', label: 'Steps per Snapshot', min: 0.5, max: 4, step: 0.5, default: 2, tint: 'ink', format: 'dec2', divider: true },
  ],
  status: (p) => [
    ['Flow', p.flow.toFixed(2)],
    ['Heat', (p.heat * 1000).toFixed(1)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'The conduit: the State’s corvée marches labor from the villages toward its works, with cyan ticks marking how far it reaches (laminar flow). The State is forever “regulating the movement of the flow of labor, assigning it channels and conduits” (Plateaus: 368).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Packs: when the upswell surges, labor slips its channels and roams in packs across the whole space, as the journeymen’s compagnonnages did (turbulence). “From turba to turbo” (Plateaus: 361), a movement “distributed by turbulence across a smooth space” (363).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Segments: households keep their work in small circles of their own ahead of the conduit’s front, where the draft cannot get through (convection cells). War “maintains the dispersal and segmentarity of groups” (Plateaus: 357), and “the circles are not concentric” (433).' },
  ],
  legend: [
    { swatch: CYAN, see: 'Cyan dye and cyan ticks', social: 'labor drafted along the State’s channels, from the villages to its works, by corvée and by guild, the ticks marking how far the draft reaches', physics: 'laminar flow, each source’s dye staying in its lane (Reynolds 1883)', atp: 'the State “regulating the movement of the flow of labor, assigning it channels and conduits” (Plateaus: 368)', example: 'the corvée gangs on an empire’s canals (cf. Wittfogel, 363)' },
    { swatch: YELLOW, see: 'Yellow dye', social: 'households that work for themselves and share what they make, leaving no surplus to levy', physics: 'dye held in steady convection cells (Rayleigh-Bénard)', atp: 'war “maintains the dispersal and segmentarity of groups” (Plateaus: 357)', example: 'the band in Plateaus whose members “disperse to eat or sleep separately,” so no leader gains stable power (358)' },
    { swatch: MAGENTA, see: 'Magenta dye', social: 'journeymen moving from site to site, outside the corvée and the guilds', physics: 'dye scattered by turbulence', atp: '“From turba to turbo” (Plateaus: 361)', example: 'the compagnonnages of masons, carpenters, and smiths, “the nomadic or itinerant bodies” States have always had trouble with (368)' },
    { swatch: INK, see: 'White dots at the left', social: 'the villages where the corvée recruits', physics: 'dye injected at fixed heights', atp: 'movement “from one specified point to another” (Plateaus: 363)' },
    { swatch: WARM, see: 'Glow along the bottom', social: 'the upswell: labor moving on its own account, uneven in place and time', physics: 'heaters under the floor that drift and surge on their own, while the through-flow wavers', atp: '“a rhythm without measure, which relates to the upswell of a flow” (Plateaus: 364)' },
  ],
  create,
};
