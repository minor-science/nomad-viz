import { Anvil, Zap } from 'lucide-react';
import type { ModelDef, SimInstance, Frame } from '../sim/types';
import { LatticeGas, criticalSize, type LatticeParams } from '../sim/latticeGas';

// Lattice cell, in world units (two per CSS pixel).
const CELL = 10;
// Measured, not derived: on this lattice, clusters up to about three times the CNT estimate were
// seen to dissolve (scripts/calibrate-nucleation.ts, docs/notes/nucleation-calibration.md).
// Past this many times the estimate, a cluster is treated as having crossed the threshold.
const THRESHOLD_FACTOR = 3;
const SMITH_STEPS = 3;
const SENSE = 8;
const TRAIL = 40;

const COLORS = {
  solution: [15, 23, 42],
  embryo: [100, 116, 139],
};

// Crystal grains: cyan family, one shade per orientation.
function grainColor(o: number, Q: number): [number, number, number] {
  const t = Q > 1 ? (o - 1) / (Q - 1) : 0.5;
  const l = 0.42 + 0.3 * t;
  // hsl(195, 100%, l) to rgb
  const c = (1 - Math.abs(2 * l - 1)) * 1;
  const h = 195 / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 4 ? [0, x, c] : [x, 0, c];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

interface Smith {
  i: number;
  dir: number;
  trail: number[];
}

interface Flash {
  x: number;
  y: number;
  r: number;
  life: number;
}

function create(): SimInstance {
  let lg: LatticeGas | null = null;
  let off: HTMLCanvasElement | null = null;
  let img: ImageData | null = null;
  let smiths: Smith[] = [];
  let flashes: Flash[] = [];
  let sweepsSinceWard = 0;
  let depletions = 0;

  const placeSmiths = (count: number) => {
    if (!lg) return;
    while (smiths.length < count) smiths.push({ i: (Math.random() * lg.n) | 0, dir: (Math.random() * 4) | 0, trail: [] });
    smiths.length = count;
  };

  // When a smith has lost the boundary, it heads for the nearest one within SENSE cells.
  const seek = (i: number): number | null => seekBy(i, (j) => lg!.isGrainBoundary(j)) ?? seekBy(i, (j) => lg!.isBoundary(j));
  const seekBy = (i: number, test: (j: number) => boolean): number | null => {
    if (!lg) return null;
    const { cols, rows } = lg;
    const x0 = i % cols;
    const y0 = Math.floor(i / cols);
    let best = Infinity;
    let bdx = 0;
    let bdy = 0;
    for (let dy = -SENSE; dy <= SENSE; dy++) {
      for (let dx = -SENSE; dx <= SENSE; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d >= best) continue;
        const j = ((y0 + dy + rows) % rows) * cols + ((x0 + dx + cols) % cols);
        if (test(j)) {
          best = d;
          bdx = dx;
          bdy = dy;
        }
      }
    }
    if (best === Infinity) return null;
    // Directions as in the neighbor table: 0 = +x, 1 = -x, 2 = +y, 3 = -y.
    if (Math.abs(bdx) >= Math.abs(bdy)) return bdx > 0 ? 0 : 1;
    return bdy > 0 ? 2 : 3;
  };

  // A smith follows the boundaries of the solid (grain boundaries and the solid's edge). It keeps
  // its heading when it can, turns along the boundary when it must, and wanders when it has lost it.
  const stepSmith = (s: Smith) => {
    if (!lg) return;
    const nb = lg.neighbors(s.i);
    const order = [s.dir, (s.dir + 1) % 4, (s.dir + 3) % 4, (s.dir + 2) % 4];
    const turns = Math.random() < 0.5 ? order : [order[0], order[2], order[1], order[3]];
    // Grain boundaries first, the singularities inside the solid, then the solid's edge.
    let next = -1;
    for (const test of [(j: number) => lg!.isGrainBoundary(j), (j: number) => lg!.isBoundary(j)]) {
      for (const d of turns) {
        if (test(nb[d])) {
          next = d;
          break;
        }
      }
      if (next >= 0) break;
    }
    if (next < 0) next = seek(s.i) ?? (Math.random() < 0.8 ? s.dir : (Math.random() * 4) | 0);
    s.dir = next;
    s.i = nb[next];
    s.trail.push(s.i);
    if (s.trail.length > TRAIL) s.trail.shift();
  };

  return {
    init(width, height) {
      const cols = Math.max(20, Math.floor(width / CELL));
      const rows = Math.max(20, Math.floor(height / CELL));
      lg = new LatticeGas(cols, rows, (Math.random() * 2 ** 31) | 0);
      off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      img = off.getContext('2d')!.createImageData(cols, rows);
      smiths = [];
      flashes = [];
      sweepsSinceWard = 0;
      depletions = 0;
    },

    frame(ctx, f: Frame) {
      if (!lg || !off || !img) return;
      const { mode, motionScale, params } = f;
      const p: LatticeParams = { T: params.temperature, dmu: params.supersaturation, Q: params.orientations, jCross: 0.5 };
      const nStar = criticalSize(p.T, p.dmu);
      const threshold = THRESHOLD_FACTOR * nStar;
      const warding = mode === 'nonstate' || mode === 'conflict';
      const smithing = mode === 'nomad' || mode === 'conflict';

      // Matter
      const sweeps = Math.max(1, Math.round(params.speed * motionScale));
      for (let k = 0; k < sweeps; k++) {
        lg.sweep(p, 1);
        sweepsSinceWard++;
        // Warding off: once per operation period, deplete the largest clusters that have reached
        // the limit but not yet the threshold. Past the threshold, nothing can be undone.
        if (warding && sweepsSinceWard >= params.wardPeriod) {
          sweepsSinceWard = 0;
          const limit = Math.max(3, params.wardLimit * nStar);
          const targets = lg.label()
            .filter((c) => c.size >= limit && c.size < threshold)
            .sort((a, b) => b.size - a.size)
            .slice(0, params.wardCapacity);
          for (const c of targets) {
            lg.deplete(c.id);
            depletions++;
            flashes.push({ x: c.cx, y: c.cy, r: Math.sqrt(c.size / Math.PI) + 2, life: 1 });
          }
        }
      }
      const clusters = lg.label();

      // Smiths
      if (smithing) {
        placeSmiths(params.smiths);
        for (const s of smiths) for (let k = 0; k < SMITH_STEPS; k++) stepSmith(s);
      }

      // Draw the lattice at one pixel per cell, then scale it up.
      const data = img.data;
      const sizeOf = clusters.map((c) => c.size);
      for (let i = 0; i < lg.n; i++) {
        const o = lg.occ[i];
        let rgb: number[];
        if (!o) rgb = COLORS.solution;
        else if (sizeOf[lg.cid[i]] >= threshold) rgb = grainColor(o, p.Q);
        else rgb = COLORS.embryo;
        data[i * 4] = rgb[0];
        data[i * 4 + 1] = rgb[1];
        data[i * 4 + 2] = rgb[2];
        data[i * 4 + 3] = 255;
      }
      off.getContext('2d')!.putImageData(img, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, f.width, f.height);
      ctx.imageSmoothingEnabled = false;
      // Stretch to the canvas, which may have grown since the lattice was laid out.
      const sx = f.width / lg.cols;
      const sy = f.height / lg.rows;
      ctx.drawImage(off, 0, 0, f.width, f.height);

      // Depletion flashes
      flashes = flashes.filter((fl) => fl.life > 0);
      for (const fl of flashes) {
        ctx.strokeStyle = `rgba(184, 134, 11, ${fl.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc((fl.x + 0.5) * sx, (fl.y + 0.5) * sy, (fl.r + 2 * (1 - fl.life)) * sx, 0, Math.PI * 2);
        ctx.stroke();
        fl.life -= 0.04;
      }

      // Smith trails
      if (smithing) {
        for (const s of smiths) {
          ctx.strokeStyle = 'rgba(236, 0, 140, 0.9)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          let prev = -1;
          for (const i of s.trail) {
            const x = ((i % lg.cols) + 0.5) * sx;
            const y = (Math.floor(i / lg.cols) + 0.5) * sy;
            // Do not draw across the wrapped edge.
            const jump = prev >= 0 && Math.abs((prev % lg.cols) - (i % lg.cols)) + Math.abs(Math.floor(prev / lg.cols) - Math.floor(i / lg.cols)) > 2;
            if (prev < 0 || jump) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            prev = i;
          }
          ctx.stroke();
          ctx.fillStyle = '#ec008c';
          ctx.beginPath();
          ctx.arc(((s.i % lg.cols) + 0.5) * sx, (Math.floor(s.i / lg.cols) + 0.5) * sy, sx * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Readout: largest cluster against the limit, the CNT estimate, and the threshold.
      const pad = 16;
      const w = 520;
      const h = warding ? 124 : 100;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(pad, pad, w, h);
      ctx.font = 'bold 22px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f2f2f2';
      ctx.fillText(`LARGEST CLUSTER  ${lg.largest}`, pad + 14, pad + 32);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '18px "JetBrains Mono", monospace';
      ctx.fillText(`critical size, estimate ${nStar.toFixed(0)}  ·  threshold ~${threshold.toFixed(0)}`, pad + 14, pad + 58);
      if (warding) ctx.fillText(`depletions ${depletions}`, pad + 14, pad + 82);
      const barY = pad + h - 22;
      const barW = w - 28;
      const scale = (n: number) => pad + 14 + Math.min(1, n / (threshold * 1.2)) * barW;
      ctx.fillStyle = '#334155';
      ctx.fillRect(pad + 14, barY, barW, 8);
      ctx.fillStyle = lg.largest >= threshold ? '#00aeef' : '#94a3b8';
      ctx.fillRect(pad + 14, barY, scale(lg.largest) - pad - 14, 8);
      const tick = (n: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(scale(n) - 1, barY - 6, 3, 20);
      };
      if (warding) tick(Math.max(3, params.wardLimit * nStar), '#b8860b');
      tick(nStar, '#f2f2f2');
      tick(threshold, '#00aeef');
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
  describe: (mode) =>
    `Metallurgic simulation: a supersaturated solution on a square lattice, in ${mode} mode. Gray clusters form and dissolve; cyan grains are crystal past the threshold.`,
  controls: [
    { kind: 'slider', key: 'supersaturation', label: 'Supersaturation Δμ', min: 0.04, max: 0.3, step: 0.01, default: 0.12, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'temperature', label: 'Temperature T', min: 0.3, max: 0.5, step: 0.01, default: 0.38, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'orientations', label: 'Grain Orientations', min: 1, max: 12, step: 1, default: 6, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'wardLimit', label: 'Warding Limit (× critical)', min: 0.3, max: 2, step: 0.05, default: 1, tint: 'yellow', format: 'times' },
    { kind: 'slider', key: 'wardPeriod', label: 'Operation Period (sweeps)', min: 1, max: 60, step: 1, default: 30, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'wardCapacity', label: 'Depletions per Period', min: 1, max: 10, step: 1, default: 2, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'smiths', label: 'Smiths', min: 0, max: 24, step: 1, default: 8, tint: 'magenta', format: 'int' },
    { kind: 'slider', key: 'speed', label: 'Sweeps per Frame', min: 1, max: 6, step: 1, default: 3, tint: 'ink', format: 'int', divider: true },
  ],
  status: (p) => [
    ['Δμ', p.supersaturation.toFixed(2)],
    ['T', p.temperature.toFixed(2)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Nucleation. Gray clusters form and dissolve until one crosses the threshold and grows into cyan grains. ATP speaks of an apparatus “crystallizing” (357). Here the threshold is the critical size of nucleation theory.' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Smiths. Magenta trails follow the grain boundaries, the singularities of the matter. ATP: the artisan is one who follows “a flow of matter, a machinic phylum” (409).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Depletion. Once each operation period, clusters near the critical size are dispersed before they cross it. ATP: “depletion is the means by which primitive groups ward off the stock” (440).' },
  ],
  create,
};
