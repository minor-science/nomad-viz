import { Anvil, Zap } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { LatticeGas, criticalSize, type LatticeParams } from '../sim/latticeGas';
import { Smiths } from '../sim/smiths';
import { Bands } from '../sim/bands';
import { beginTags, StickyTag } from '../sim/tags';

// Lattice cell, in world units (two per CSS pixel).
const CELL = 10;
// Measured, not derived: on this lattice, clusters up to about three times the CNT estimate were
// seen to dissolve (scripts/calibrate-nucleation.ts, docs/notes/nucleation-calibration.md).
// Past this many times the estimate, a cluster is treated as having crossed the threshold.
const THRESHOLD_FACTOR = 3;
// Reservoir size at saturation, as a fraction of lattice sites.
const EQUILIBRIUM = 0.05;
// Frames of history in the readout's chart.
const HISTORY = 360;
// Mobilization falls at half the rate it rises.
const RELAX_RATIO = 0.5;
// Feed, bands, and smiths are given for a lattice of this many sites and scaled to the actual one,
// so the cycles run at the same rate on any screen.
const REFERENCE_SITES = 36800;
// Share of each frame's color taken from the new state (the rest carries over), to calm flicker.
const BLEND = 0.35;
// Smiths take one step every few sweeps, so they can be followed by eye; their carving chance is
// raised to match, keeping the carving rate per sweep the same.
const SMITH_PACE = 1 / 3;
// Sweeps between the bands' moves to new territories (the operation period).
const TERRITORY_PERIOD = 400;

const SOLUTION = [15, 23, 42];
const EMBRYO = [100, 116, 139];

// Crystal grains: cyan family, one shade per orientation.
function grainColor(o: number, Q: number): [number, number, number] {
  const t = Q > 1 ? (o - 1) / (Q - 1) : 0.5;
  const l = 0.42 + 0.3 * t;
  const c = 1 - Math.abs(2 * l - 1);
  const x = c * (1 - Math.abs(((195 / 60) % 2) - 1));
  const m = l - c / 2;
  return [Math.round(m * 255), Math.round((x + m) * 255), Math.round((c + m) * 255)];
}

// The narrator. In conflict mode the caption follows the phase of the cycle, held a few seconds at
// a time; in the other modes it describes the one process staged. Quotations are checked.
type Phase = 'dispersed' | 'crystallizing' | 'warding';
const PHASES: Record<Phase, { head: string; sub: string; color: string }> = {
  dispersed: {
    head: 'DISPERSED · Formations of power appear and dissolve before any of them can hold as a stock.',
    sub: 'Mechanisms keep central points “from crystallizing, from taking on consistency” (Plateaus: 433).',
    color: '#cbd5e1',
  },
  crystallizing: {
    head: 'CRYSTALLIZING · A stock passes the threshold and grows, drawing down what feeds it.',
    sub: '“The threshold is in fact already there, but outside the limit” (Plateaus: 440).',
    color: '#00aeef',
  },
  warding: {
    head: 'WARDING OFF · The bands mobilize and wear down the stock, destroying what a State would keep.',
    sub: '“depletion is the means by which primitive groups ward off the stock” (Plateaus: 440).',
    color: '#e0a800',
  },
};
const MODE_CAPTION: Partial<Record<Mode, { head: string; sub: string; color: string }>> = {
  state: {
    head: 'CAPTURE ALONE · With no bands to hold the threshold at a distance, the first stock to form keeps growing.',
    sub: 'An apparatus distinct from the social body “crystallizing” (Plateaus: 357).',
    color: '#00aeef',
  },
  nomad: {
    head: 'WAR MACHINE ALONE · Smiths follow the matter-flow and carve holey space through the stock.',
    sub: '“Artisans-metallurgists are itinerants because they follow the matter-flow of the subsoil” (Plateaus: 412).',
    color: '#ec008c',
  },
  nonstate: {
    head: 'WARDING OFF ALONE · Bands keep every formation from crystallizing, so no stock ever forms.',
    sub: '“counter-State societies organizing mechanisms that ward off the State-form” (Plateaus: 429).',
    color: '#e0a800',
  },
};
// Frames (snapshots) a phase caption stays up before it may change.
const PHASE_HOLD = 150;

function create(): SimInstance {
  let lg: LatticeGas | null = null;
  let smiths: Smiths | null = null;
  let bands: Bands | null = null;
  let off: HTMLCanvasElement | null = null;
  let img: ImageData | null = null;
  let mobilization = 0;
  let mobilized = false;
  let sinceCount = 0;
  let solid = 0;
  let solidHistory: number[] = [];
  let dmuHistory: number[] = [];
  let mobHistory: number[] = [];
  let phase: Phase = 'dispersed';
  let phaseAge = 0;
  let narration: Narration | null = null;
  let smooth: Float32Array | null = null;
  let acc = 0;
  let smithAcc = 0;
  let sinceShift = 0;
  const tags = {
    capture: new StickyTag<number>(),
    // The embryo tag reports its outcome, whether it grew or dissolved, however briefly it was shown.
    embryo: new StickyTag<number>(240, 60, 0),
    band: new StickyTag<number>(),
    smith: new StickyTag<number>(),
  };

  return {
    init(width, height, params) {
      const cols = Math.max(20, Math.floor(width / CELL));
      const rows = Math.max(20, Math.floor(height / CELL));
      lg = new LatticeGas(cols, rows, (Math.random() * 2 ** 31) | 0);
      const eq = EQUILIBRIUM * lg.n;
      lg.reservoir = { equilibrium: eq, dissolved: eq * Math.exp(params.supersaturation / params.temperature) };
      smiths = new Smiths(lg);
      bands = new Bands(lg);
      off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      img = off.getContext('2d')!.createImageData(cols, rows);
      mobilization = 0;
      mobilized = false;
      sinceCount = 0;
      solid = 0;
      solidHistory = [];
      dmuHistory = [];
      mobHistory = [];
      smooth = null;
      acc = 0;
    },

    frame(ctx, f: Frame) {
      if (!lg || !off || !img || !smiths || !bands) return;
      const { mode, motionScale, params } = f;
      const p: LatticeParams = { T: params.temperature, dmu: params.supersaturation, Q: params.orientations, jCross: 0.5 };
      const nStar = criticalSize(p.T, p.dmu);
      const threshold = THRESHOLD_FACTOR * nStar;
      const warding = mode === 'nonstate' || mode === 'conflict';
      const smithing = mode === 'nomad' || mode === 'conflict';

      // Fractional speeds run a sweep every few frames.
      acc += params.speed * motionScale;
      const sweeps = Math.floor(acc);
      acc -= sweeps;
      const scale = lg.n / REFERENCE_SITES;
      smiths.place(smithing ? Math.round(params.smiths * scale) : 0);
      bands.place(warding ? Math.round(params.bands * scale) : 0);
      if (!warding) lg.blocked.fill(0);
      for (let k = 0; k < sweeps; k++) {
        lg.sweep(p, 1);
        // The matter-flow: dissolved atoms supplied each sweep.
        lg.reservoir!.dissolved += params.feed * scale;
        if (smithing) {
          smithAcc += SMITH_PACE;
          while (smithAcc >= 1) {
            smithAcc -= 1;
            smiths.step(1, Math.min(1, params.carve / SMITH_PACE));
          }
        }
        if (warding) {
          bands.step(mobilization);
          if (++sinceShift >= TERRITORY_PERIOD) {
            sinceShift = 0;
            bands.shiftTerritories();
          }
          // Mobilization rises while the stock is past the alarm level and relaxes once it falls
          // below the calm level. The lag between the two is what makes the cycles.
          sinceCount++;
          if (sinceCount >= 10) {
            sinceCount = 0;
            lg.label();
            solid = lg.clusters.reduce((a, c) => a + (c.size >= threshold ? c.size : 0), 0) / lg.n;
            if (solid > params.alarm) mobilized = true;
            else if (solid < params.calm) mobilized = false;
          }
          const rate = params.mobilizeRate;
          mobilization = Math.max(0, Math.min(params.wearMax, mobilization + (mobilized ? rate : -rate * RELAX_RATIO)));
        }
      }
      const clusters = lg.label();
      const sizeOf = clusters.map((c) => c.size);
      solid = clusters.reduce((a, c) => a + (c.size >= threshold ? c.size : 0), 0) / lg.n;
      const dmuNow = lg.supersaturation(p);
      solidHistory.push(solid);
      dmuHistory.push(dmuNow);
      mobHistory.push(warding ? mobilization : 0);
      if (solidHistory.length > HISTORY) {
        solidHistory.shift();
        dmuHistory.shift();
        mobHistory.shift();
      }

      // Lattice, one pixel per cell, stretched to the canvas. Colors blend over a few frames, and
      // lone atoms (clusters under three) are drawn dim, so the solution does not strobe.
      const data = img.data;
      if (!smooth) {
        smooth = new Float32Array(lg.n * 3);
        for (let i = 0; i < lg.n; i++) smooth.set(SOLUTION, i * 3);
      }
      for (let i = 0; i < lg.n; i++) {
        const o = lg.occ[i];
        const size = o ? sizeOf[lg.cid[i]] : 0;
        let rgb: number[];
        if (!o) rgb = SOLUTION;
        else if (size >= threshold) rgb = grainColor(o, p.Q);
        else if (size < 3) rgb = [SOLUTION[0] * 0.6 + EMBRYO[0] * 0.4, SOLUTION[1] * 0.6 + EMBRYO[1] * 0.4, SOLUTION[2] * 0.6 + EMBRYO[2] * 0.4];
        else rgb = EMBRYO;
        for (let c = 0; c < 3; c++) {
          const v = smooth[i * 3 + c] + (rgb[c] - smooth[i * 3 + c]) * BLEND;
          smooth[i * 3 + c] = v;
          data[i * 4 + c] = v;
        }
        data[i * 4 + 3] = 255;
      }
      off.getContext('2d')!.putImageData(img, 0, 0);
      const sx = f.width / lg.cols;
      const sy = f.height / lg.rows;
      const at = (i: number) => [((i % lg!.cols) + 0.5) * sx, (Math.floor(i / lg!.cols) + 0.5) * sy];
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, f.width, f.height);

      // Smith trails
      if (smithing) {
        for (const s of smiths.list) {
          ctx.strokeStyle = 'rgba(236, 0, 140, 0.9)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          let prev = -1;
          for (const i of s.trail) {
            const [x, y] = at(i);
            const jump = prev >= 0 && Math.abs((prev % lg.cols) - (i % lg.cols)) + Math.abs(Math.floor(prev / lg.cols) - Math.floor(i / lg.cols)) > 2;
            if (prev < 0 || jump) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            prev = i;
          }
          ctx.stroke();
          const [x, y] = at(s.i);
          ctx.fillStyle = '#ec008c';
          ctx.beginPath();
          ctx.arc(x, y, sx * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bands: small, many. Brighter as they mobilize.
      if (warding) {
        ctx.fillStyle = `rgba(184, 134, 11, ${0.55 + 0.45 * Math.min(1, mobilization / Math.max(0.01, params.wearMax))})`;
        for (const b of bands.list) {
          const [x, y] = at(b.i);
          ctx.beginPath();
          ctx.arc(x, y, sx * (0.35 + 0.35 * b.size), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Explain layer: each tag holds on to one feature for a few seconds and follows it.
      if (f.explain) {
        beginTags();
        const bounds = { width: f.width, height: f.height };
        const centroid = (site: number) => {
          const id = lg!.cid[site];
          if (id < 0 || !lg!.occ[site]) return null;
          const c = clusters[id];
          return { c, x: (c.cx + 0.5) * sx, y: (c.cy + 0.5) * sy };
        };
        const siteOf = (id: number) => {
          for (let i = 0; i < lg!.n; i++) if (lg!.cid[i] === id) return i;
          return -1;
        };
        tags.capture.update(
          (site) => {
            const r = centroid(site);
            return r && r.c.size >= threshold ? r : null;
          },
          () => {
            const big = clusters.reduce((a, c) => (c.size > (a?.size ?? 0) ? c : a), null as (typeof clusters)[0] | null);
            if (!big || big.size < threshold) return null;
            return { anchor: siteOf(big.id), x: (big.cx + 0.5) * sx, y: (big.cy + 0.5) * sy };
          },
        );
        tags.capture.draw(ctx, 'CAPTURE · a stock, crystallized past the threshold', '#00aeef', bounds, 'CAPTURE · this stock is gone, worn down by bands or carved through by smiths');
        tags.embryo.update(
          (site) => {
            const r = centroid(site);
            return r && r.c.size >= 3 && r.c.size < threshold ? r : null;
          },
          () => {
            // Only clusters big enough to see, so the tag never points at empty solution.
            const e = clusters.filter((c) => c.size >= Math.max(10, 0.2 * threshold) && c.size < threshold).sort((a, b) => b.size - a.size)[0];
            return e ? { anchor: siteOf(e.id), x: (e.cx + 0.5) * sx, y: (e.cy + 0.5) * sy } : null;
          },
        );
        {
          const site = tags.embryo.current;
          const grew = site !== null && lg.occ[site] && lg.cid[site] >= 0 && clusters[lg.cid[site]].size >= threshold;
          tags.embryo.draw(ctx, 'embryo · a formation of power that may dissolve', '#cbd5e1', bounds,
            grew ? 'embryo · passed the threshold for growth and is becoming a stock' : 'embryo · dissolved before reaching the threshold for growth', grew ? '#00aeef' : undefined);
        }
        if (warding && bands.list.length) {
          tags.band.update(
            (k) => (bands!.list[k] ? { x: at(bands!.list[k].i)[0], y: at(bands!.list[k].i)[1] } : null),
            () => {
              const k = bands!.list.findIndex((q) => lg!.neighbors(q.i).some((j) => lg!.occ[j]));
              const kk = k >= 0 ? k : 0;
              return { anchor: kk, x: at(bands!.list[kk].i)[0], y: at(bands!.list[kk].i)[1] };
            },
          );
          tags.band.draw(ctx, mobilization > 0.05 ? 'WARDING OFF · band, mobilized, wearing down the stock' : 'WARDING OFF · band, blocking growth', '#e0a800', bounds);
        }
        if (smithing && smiths.list.length) {
          tags.smith.update(
            (k) => (smiths!.list[k] ? { x: at(smiths!.list[k].i)[0], y: at(smiths!.list[k].i)[1] } : null),
            () => ({ anchor: 0, x: at(smiths!.list[0].i)[0], y: at(smiths!.list[0].i)[1] }),
          );
          tags.smith.draw(ctx, 'WAR MACHINE · smith, carving holey space', '#ec008c', bounds);
        }
      }

      // Narration, read by the shell for the strip above the canvas.
      let cap = MODE_CAPTION[mode] ?? null;
      if (mode === 'conflict') {
        const want: Phase = mobilized ? 'warding' : solid >= params.calm ? 'crystallizing' : 'dispersed';
        phaseAge++;
        if (want !== phase && phaseAge > PHASE_HOLD) {
          phase = want;
          phaseAge = 0;
        }
        cap = PHASES[phase];
      }
      const series: Narration['series'] = [];
      if (mode !== 'nonstate' || solidHistory.some((v) => v > 0)) series.push({ values: solidHistory.map((v) => v / 0.4), color: '#00aeef', label: 'stock' });
      if (warding) series.push({ values: mobHistory.map((v) => v / Math.max(0.01, params.wearMax)), color: '#e0a800', label: 'bands mobilized' });
      series.push({ values: dmuHistory.map((v) => v / 0.3), color: '#f2f2f2', label: 'surplus pressing' });
      narration = cap ? { ...cap, series, span: HISTORY } : null;
    },

    narrate() {
      return narration;
    },
  };
}

export const metallurgic: ModelDef = {
  id: 'metallurgic',
  name: 'Metallurgic',
  tagline: 'Crystallization',
  sidebarIcon: Anvil,
  headerIcon: Zap,
  title: 'Metallurgic Metaphysics',
  subtitle: 'Nucleation // Matter-Flow',
  stillFrames: 450,
  frameEvery: 2,
  describe: (mode) =>
    `Metallurgic simulation: a solution fed with matter on a square lattice, in ${mode} mode. Gray clusters form and dissolve, cyan grains are crystal past the threshold, small yellow dots are bands that ward off the stock, and magenta trails are smiths.`,
  controls: [
    { kind: 'slider', key: 'supersaturation', label: 'Starting Supersaturation Δμ', min: 0.04, max: 0.3, step: 0.01, default: 0.12, tint: 'cyan', format: 'dec2', reinit: true },
    { kind: 'slider', key: 'temperature', label: 'Temperature T', min: 0.3, max: 0.5, step: 0.01, default: 0.38, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'feed', label: 'Matter-Flow (atoms per sweep)', min: 0, max: 30, step: 1, default: 10, tint: 'ink', format: 'int' },
    { kind: 'slider', key: 'orientations', label: 'Grain Orientations', min: 1, max: 12, step: 1, default: 6, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'bands', label: 'Bands', min: 0, max: 300, step: 10, default: 120, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'wearMax', label: 'Depletion Strength (max)', min: 0, max: 1, step: 0.05, default: 1, tint: 'yellow', format: 'pct' },
    { kind: 'slider', key: 'alarm', label: 'Mobilize Above (solid)', min: 0.02, max: 0.4, step: 0.01, default: 0.15, tint: 'yellow', format: 'pct' },
    { kind: 'slider', key: 'calm', label: 'Relax Below (solid)', min: 0, max: 0.2, step: 0.01, default: 0.03, tint: 'yellow', format: 'pct' },
    { kind: 'slider', key: 'mobilizeRate', label: 'Mobilization Speed', min: 0.0002, max: 0.005, step: 0.0002, default: 0.002, tint: 'yellow', format: 'x1000' },
    { kind: 'slider', key: 'smiths', label: 'Smiths', min: 0, max: 32, step: 1, default: 16, tint: 'magenta', format: 'int' },
    { kind: 'slider', key: 'carve', label: 'Carving (holey space)', min: 0, max: 0.3, step: 0.01, default: 0.05, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'speed', label: 'Sweeps per Frame', min: 0.25, max: 8, step: 0.25, default: 3, tint: 'ink', format: 'dec2', divider: true },
  ],
  status: (p) => [
    ['Flow', String(p.feed)],
    ['Bands', String(p.bands)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Nucleation: clusters form and dissolve until one crosses the threshold and grows into cyan grains, drawing down the solution that feeds it. Plateaus speaks of an apparatus “crystallizing” (357).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Smiths: magenta trails follow the grain boundaries and carve holes through the solid, returning matter to the flow. Smiths are itinerants who “follow the matter-flow” (Plateaus: 412) and make holey space (413-15).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Bands: many small agents settle on clusters and block their growth, then mobilize as the stock grows and wear down the stock, since “depletion is the means by which primitive groups ward off the stock” (Plateaus: 440).' },
  ],
  legend: [
    { swatch: '#64748b', see: 'Gray clusters', social: 'a nascent hierarchy, prestige that might harden into power', physics: 'nuclei below the critical size, which mostly dissolve', atp: 'formations of power kept from “taking on consistency” (Plateaus: 433)', example: 'Clastres’s chiefs, who speak but cannot command' },
    { swatch: '#00aeef', see: 'Cyan grains', social: 'a State’s stock: the granary, the treasury, the land register', physics: 'crystal past the threshold, growing from the solution', atp: 'capture: the stock, an apparatus crystallizing (Plateaus: 357, 440)', example: 'the granary or the land register' },
    { swatch: '#b8860b', see: 'Yellow dots of varied sizes', social: 'primitive groups warding off the stock: dispersal, sharing, using up the surplus', physics: 'inhibitors that bind to surfaces and block growth (as antifreeze proteins do in ice)', atp: 'warding off by depletion, objects “destroyed or depleted rather than stockpiled” (Plateaus: 440)', example: 'the exchange of seeds for axes in Plateaus, an exchange that stops at “the last” before a stock forms (437-40)' },
    { swatch: '#ec008c', see: 'Magenta trails', social: 'itinerant smiths and artisans, carrying know-how across societies', physics: 'walkers on grain boundaries that melt atoms back into solution', atp: 'the smith, who follows the matter-flow and makes holey space (Plateaus: 412-15)', example: 'a 1769 militia map of a Brazilian runaway settlement, with smithies and “holes for escape” (Carney and Rosomoff)' },
    { swatch: '#f2f2f2', see: 'White line (chart)', social: 'surplus pressing to be stocked', physics: 'supersaturation Δμ, raised by the feed and lowered by growth', atp: 'the matter-flow that feeds capture' },
  ],
  create,
};
