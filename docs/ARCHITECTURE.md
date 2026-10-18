# Architecture

The visualizer is a static single-page site built with React, TypeScript, Vite, and Tailwind. Every simulation runs in the browser on an HTML canvas, so there is no server and no data to fetch.

## Layout

```
src/
  App.tsx              top bar (model tabs, Sources, About) and the About panel
  main.tsx             entry point
  index.css            base styles
  processes.ts         the book's five processes: names, formations, colors
  components/
    ModelShell.tsx     everything around a model: mode tabs, switches, the narrator and its chart,
                       the canvas and its sizing, the legend, the controls, full screen
    SourcesPanel.tsx   the four-part Sources panel for the current model
    Book.tsx           sets the book's title in italics wherever text names it
    plain.ts           turns a model's "LABEL · text" captions into plain prose
  models/              one file per model: its definition, captions, controls, legend, and drawing
    index.ts           the list of models
  sim/                 the physics and shared machinery, with no React and no DOM
    latticeGas.ts      metallurgic: Metropolis lattice gas with grain orientations
    bands.ts           metallurgic: clans that block and wear the stock
    smiths.ts          metallurgic: smiths that follow grain boundaries and carve
    fluid.ts           hydraulic: Stam's stable fluids, MacCormack advection, Boussinesq buoyancy
    heating.ts         hydraulic and others: drifting, surging heat patches; slow wobbles
    regimes.ts         hydraulic: reads layers, convection cells, and eddies from the flow
    dye.ts             hydraulic: dye from fixed sources, and crossings between regimes
    oscillators.ts     acoustic: metronomes as phase oscillators, villages, pacemakers
    metronomeDrive.ts  acoustic: what drives the field in conflict mode
    orbits.ts          cosmic: Newtonian gravity, tides, dynamical friction, collapse, breakaway
    tags.ts            labels drawn on the canvas, with smoothing and placement
    types.ts           the model interface, controls, and formats
    url.ts             settings in the address bar
  content/             the Sources panels as data, one file per model, plus the bibliography
scripts/
  check-atp.ts         checks every quotation from the book against its text
  run-model.ts         runs a model headless and summarizes its behavior
  resolve.mjs          lets Node run the app's TypeScript modules for the two scripts above
  calibrate-nucleation.ts   the measurement behind the metallurgic threshold
docs/                  documentation, and images for the README
```

## How a model plugs in

A model is a `ModelDef` (in `src/sim/types.ts`). The parts that matter most:

- `create()` returns a simulation instance with three methods. `init(width, height, params)` builds the world for a canvas of that size. `frame(ctx, frame)` advances the simulation and draws one frame. `narrate()` returns the narrator’s current caption and chart.
- `controls` lists the sliders, with their defaults, ranges, and formats. Their values reach the model as `params`.
- `legend` lists what each color and mark means.
- `cards` names the processes the model stages, which the Sources panel uses to mark them.
- `frameEvery` and `stillFrames` set the pace and the reduced-motion still. `aspect`, `maxStretch`, and `turns` keep a model with a natural shape from being distorted on a tall screen.

The shell (`ModelShell.tsx`) owns the canvas. It sizes it, keeps world units at two per CSS pixel, runs the animation loop, letterboxes or turns a model that has a natural shape, restarts a model when the screen changes shape a lot, reads the narrator a few times a second, and tells the model where the legend sits so that labels keep clear of it.

Each model draws in world units within `frame.width` by `frame.height`. Labels on the canvas go through `beginTags` and `StickyTag` in `sim/tags.ts`: a label’s text starts with its process in capitals (`'CAPTURE · the stock'`), which sets its color, and only the words after the separator are drawn.

## Adding a model

1. Put the physics in `src/sim/`, free of React and the DOM, and run it headless until it behaves (see [METHOD.md](METHOD.md)).
2. Write `src/models/<name>.ts`, exporting a `ModelDef`, and add it to `src/models/index.ts` and the `ModelId` type.
3. Write its Sources in `src/content/<name>.ts`, add it to `src/content/index.ts`, and add any new works to `bibliography.ts`.
4. Add it to the quotation checker’s list in `scripts/check-atp.ts`.
5. Run `npm run lint`, `npm run build`, `npm run sim -- <name>`, and `npm run check:atp`.

## Checks

- `npm run lint` type-checks the project, and the GitHub workflow runs it with the build on every push.
- `npm run sim -- <model> [mode] [frames] [settings]` runs a model through its own narrator without a browser.
- `npm run check:atp` checks every quotation in the code and the documentation against the text of *A Thousand Plateaus*. The text is under copyright and not in this repository. Point the script at a plain-text copy of the Minnesota edition with `ATP_TEXT=/path/to/atp.txt`, with pages separated by form feeds. The page offset is set at the top of the script.
