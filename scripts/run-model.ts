// Run a model headless, with no browser, and summarize what it does over time: the mean and
// range of each line in the narrator's chart, and how often each caption appeared.
//
//   npm run sim -- <model> [mode] [frames] [settings as JSON]
//   npm run sim -- cosmic conflict 6000
//   npm run sim -- acoustic nomad 3000 '{"neighbor":2}'
//
// Models: metallurgic, hydraulic, acoustic, cosmic. Modes: conflict, state (capture), nomad (war
// machine), nonstate (warding off). Drawing calls go to a stand-in canvas that ignores them, so
// only the simulation and the narrator run. This is how the models' balance was measured.

const blank: any = new Proxy(
  {},
  {
    get: (_t, key) =>
      key === 'measureText' ? () => ({ width: 100 })
      : key === 'createImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
      : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} })
      : key === 'getTransform' ? () => ({})
      : key === 'canvas' ? { width: 1760, height: 1200 }
      : () => {},
    set: () => true,
  },
);
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => blank }) };

const [name = 'metallurgic', mode = 'conflict', framesArg = '6000', overrides = '{}'] = process.argv.slice(2);
const mod = await import(`../src/models/${name}.ts`);
const model = mod[name];
if (!model) throw new Error(`No model named ${name}`);
const params: Record<string, number> = {};
for (const c of model.controls) if ('default' in c) params[c.key] = c.default;
Object.assign(params, JSON.parse(overrides));

const width = 1760;
const height = 1200;
const sim = model.create();
sim.init(width, height, params);
const frames = Number(framesArg);
const series: Record<string, number[]> = {};
const captions: Record<string, number> = {};
let last = '';
for (let t = 0; t < frames; t++) {
  sim.frame(blank, { width, height, time: t / 60, mode, params, motionScale: 1, explain: false });
  const n = sim.narrate?.();
  if (!n) continue;
  if (t > frames * 0.1 && t % 10 === 0) for (const s of n.series ?? []) (series[s.label] ??= []).push(s.values[s.values.length - 1] ?? 0);
  if (n.head !== last) {
    const key = n.head.split(' · ').slice(0, 2).join(' · ');
    captions[key] = (captions[key] ?? 0) + 1;
    last = n.head;
  }
}
const pct = (v: number) => Math.round(100 * v);
console.log(`${name}, ${mode}, ${frames} frames`);
for (const [label, v] of Object.entries(series)) {
  console.log(`  ${label}: mean ${pct(v.reduce((a, b) => a + b, 0) / v.length)}%, range ${pct(Math.min(...v))}-${pct(Math.max(...v))}%`);
}
console.log('  captions:');
for (const [k, c] of Object.entries(captions).sort((a, b) => b[1] - a[1])) console.log(`    ${c} × ${k}`);
