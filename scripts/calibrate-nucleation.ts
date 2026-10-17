// Measure the lattice gas against the CNT estimate of the critical size n*.
//
//   node --experimental-strip-types --no-warnings scripts/calibrate-nucleation.ts
//
// For each setting and seed, the largest cluster is recorded every 5 sweeps until some cluster
// grows past ten times n* ("growth"). "Largest dissolved" is the biggest cluster size that was
// later followed by the largest cluster falling below half that size, which is to say a cluster
// that size was seen to break up. The ratio to n* shows how far the estimate undershoots.
import { LatticeGas, criticalSize } from '../src/sim/latticeGas.ts';

const cols = 288, rows = 180;
const settings: [number, number][] = [[0.36, 0.12], [0.36, 0.13], [0.38, 0.12], [0.38, 0.13], [0.40, 0.12]];
console.log('T     dmu   n*(CNT)  seed  largest-dissolved  ratio  growth@sweep  half-solid@sweep');
for (const [T, dmu] of settings) {
  const p = { T, dmu, Q: 6, jCross: 0.5 };
  const ns = criticalSize(T, dmu);
  for (const seed of [3, 11, 23]) {
    const g = new LatticeGas(cols, rows, seed);
    const series: number[] = [];
    let grow = -1, half = -1;
    for (let s = 1; s <= 3000; s++) {
      g.sweep(p, 1);
      if (s % 5 === 0) {
        g.label();
        if (grow < 0) series.push(g.largest);
        if (grow < 0 && g.largest >= 10 * ns) grow = s;
        if (g.density() > 0.5) { half = s; break; }
      }
    }
    let dissolved = 0;
    for (let a = 0; a < series.length; a++) {
      for (let b = a + 1; b < series.length; b++) {
        if (series[b] < series[a] / 2) { dissolved = Math.max(dissolved, series[a]); break; }
      }
    }
    console.log(`${T.toFixed(2)}  ${dmu.toFixed(2)}  ${ns.toFixed(1).padStart(7)}  ${String(seed).padStart(4)}  ${String(dissolved).padStart(17)}  ${(dissolved / ns).toFixed(1).padStart(5)}  ${String(grow).padStart(12)}  ${String(half).padStart(16)}`);
  }
}
