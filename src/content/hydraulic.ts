import type { ModelSources } from './types';

export const hydraulicSources: ModelSources = {
  summary:
    'Particles move under three hand-written forces: a steady push along parallel layers, eddies that carry them across the layers, and moving zones that agitate them. No fluid equations are solved.',
  absent: {
    polarization: 'Not modeled yet. ATP’s town is a circuit of entries and exits (432), which a later version could stage as sources and sinks in the flow.',
    encompassment: 'Not modeled. Encompassment passes between formations (435), so it needs more than one body of water.',
  },
  atp: [
    { pages: '361', quote: 'it uses a hydraulic model, rather than being a theory of solids treating fluids as a special case; ancient atomism is inseparable from flows, and flux is reality itself, or consistency.', note: 'The first trait of nomad science, cf. Serres on Lucretius.' },
    { pages: '361', quote: 'The model is a vortical one; it operates in an open space throughout which things-flows are distributed, rather than plotting out a closed space for linear and solid things.' },
    { pages: '363', quote: 'the State needs to subordinate hydraulic force to conduits, pipes, embankments, which prevent turbulence, which constrain movement to go from one point to another', note: 'Capture in this model: laminar flow held in channels.' },
    { pages: '363', quote: 'The hydraulic model of nomad science and the war machine, on the other hand, consists in being distributed by turbulence across a smooth space, in producing a movement that holds space and simultaneously affects all of its points', note: 'The war machine in this model: turbulence.' },
  ],
  borrowed: [
    { bib: 'serres', where: '361-63, 489-90', text: 'The hydraulic model, the vortex, and laminar flow come from Michel Serres’s reading of Lucretius, which ATP credits with the first three traits of nomad science.' },
    { bib: 'wittfogel', where: '363', text: 'ATP grants “Wittfogel’s theses on the importance of large-scale waterworks for an empire,” then turns them: the State needs hydraulics, but channeled.' },
  ],
  physics: [
    { name: 'Navier-Stokes equations (incompressible)', tex: '\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u}, \\qquad \\nabla\\cdot\\mathbf{u} = 0', text: 'The equations of motion for a viscous fluid such as water. The current model does not solve them.' },
    { name: 'Reynolds number', tex: '\\mathrm{Re} = \\frac{\\rho\\, u\\, L}{\\mu}', text: 'Density times speed times width, over viscosity. Osborne Reynolds found that flow in a pipe stays laminar while this number is small and turns turbulent above a critical value, about 2,000 in his experiments (2,300 is the usual textbook figure). Whether water runs in layers or in eddies depends on speed, width, and viscosity, not on the shape of the channel alone.', bib: ['reynolds'] },
    { name: 'Vortex shedding', tex: '\\mathrm{St} = \\frac{f\\, D}{U} \\approx 0.2', text: 'A body in a stream sheds vortices from alternate sides in a regular street, at a frequency set by the stream’s speed and the body’s width (the Strouhal number, about 0.2 for a cylinder over a wide range of speeds).', bib: ['karman'] },
  ],
  code:
    'Each particle is pushed to the right at a speed that falls off near the top and bottom edges, a rough stand-in for a boundary layer. Vortices are discs that drift and fade, spinning any particle inside them. Obstacles give particles random kicks. Nothing conserves mass or momentum.',
  divergences: [
    { kind: 'science', text: 'ATP sets laminar against turbulent as State against nomad. In physics the same water does both, depending on the Reynolds number, and fast flow in a pipe is turbulent. So the State’s hydraulics amount to keeping that number low, with flows held slow and narrow. ATP 363 comes close to this when it says conduits “prevent turbulence.”', bib: ['reynolds'] },
    { kind: 'model', text: 'In conflict mode the obstacles labeled warding off shed vortices, which is to say they produce turbulence and so feed the war machine. ATP does not confuse the two, and has no hydraulic version of warding off.' },
    { kind: 'model', text: 'The war machine is drawn as random jitter. Yet ATP’s nomad “holds space” (363), and “speed is intensive” while movement is extensive (381). Real turbulence is not noise either, since it is organized as eddies within eddies.' },
    { kind: 'model', text: 'No fluid is simulated. A rebuild with a real fluid solver is planned (work plan, Phase 4).' },
  ],
};
