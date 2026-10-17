import type { ModelSources } from './types';

export const hydraulicSources: ModelSources = {
  summary:
    'Water enters from the left, a faster stream over a slower one, and is solved as an incompressible fluid on a grid. Embankments split it into channels, open water lets it roll up into vortices, and the town makes it enter by one gate and leave by another. In conflict mode a seasonal flood erodes the embankments, calm water repairs them, and the town’s gates wait downstream.',
  absent: {
    wardingOff: 'Not modeled. ATP gives no hydraulic version of warding off, so this model leaves it out rather than invent one.',
    encompassment: 'Not modeled. Encompassment passes between formations (435), so it needs more than one body of water.',
  },
  atp: [
    { pages: '361', quote: 'it uses a hydraulic model, rather than being a theory of solids treating fluids as a special case; ancient atomism is inseparable from flows, and flux is reality itself, or consistency.', note: 'The first trait of nomad science, cf. Serres on Lucretius.' },
    { pages: '361', quote: 'The model is a vortical one; it operates in an open space throughout which things-flows are distributed, rather than plotting out a closed space for linear and solid things.' },
    { pages: '363', quote: 'the State needs to subordinate hydraulic force to conduits, pipes, embankments, which prevent turbulence, which constrain movement to go from one point to another', note: 'Capture in this model: channels between embankments.' },
    { pages: '363', quote: 'The hydraulic model of nomad science and the war machine, on the other hand, consists in being distributed by turbulence across a smooth space, in producing a movement that holds space and simultaneously affects all of its points', note: 'The war machine in this model: turbulence in open water.' },
    { pages: '432', quote: 'It is defined by entries and exits; something must enter it and exit from it.', note: 'Of the town. Polarization in this model: a basin between an entry gate and an exit gate.' },
    { pages: '474', quote: 'the two spaces in fact exist only in mixture: smooth space is constantly being translated, transversed into a striated space; striated space is constantly being reversed, returned to a smooth space.', note: 'Conflict mode: floods breach the banks and repair rebuilds them.' },
  ],
  borrowed: [
    { bib: 'serres', where: '361-63, 489-90, 553 n. 17', text: 'The hydraulic model, the vortex, and laminar flow come from Serres’s reading of Lucretius. The swerve at the inlet follows his clinamen, which “appears by chance in a laminar flow.”' },
    { bib: 'wittfogel', where: '363', text: 'ATP grants “Wittfogel’s theses on the importance of large-scale waterworks for an empire,” then turns them: the State needs hydraulics, but channeled. Wittfogel’s empires rest on irrigation and flood control, which is why conflict mode has floods and repair.' },
  ],
  physics: [
    { name: 'Navier-Stokes equations (incompressible)', tex: '\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u}, \\qquad \\nabla\\cdot\\mathbf{u} = 0', text: 'The equations of motion for a viscous fluid such as water, which the model solves on a grid by Stam’s method, with MacCormack’s less diffusive advection.', bib: ['stam', 'selle'] },
    { name: 'Reynolds number', tex: '\\mathrm{Re} = \\frac{U\\, h}{\\nu}', text: 'Speed times width, over viscosity. Flow in a pipe stays laminar while this number is small and turns turbulent above a critical value, about 2,000 in Reynolds’s experiments. A narrow channel lowers it, which is how embankments “prevent turbulence.”', bib: ['reynolds'] },
    { name: 'Shear-layer instability', text: 'Where a fast stream runs beside a slow one, small waves on the boundary grow and roll up into a row of vortices (the Kelvin-Helmholtz instability). This is the turbulence of open water in the model, set off by the swerve at the inlet.', bib: ['helmholtz', 'kelvin'] },
    { name: 'Erosion past a critical stress', tex: '\\theta = \\frac{\\tau_b}{(\\rho_s - \\rho)\\, g\\, D} > \\theta_c', text: 'Sediment moves when the stress of the flow on the bed, scaled by the grain’s weight, passes a critical value. The model uses a simpler stand-in: a bank erodes where the flow beside it is faster than a critical speed.', bib: ['shields'] },
  ],
  code:
    'An incompressible fluid on a grid about 72 cells deep: each step diffuses, projects to zero divergence, advects by MacCormack’s method, and projects again. Water enters at the left with a smooth shear profile plus a small random cross-flow (the clinamen) and leaves at the right. In conflict mode each embankment cell has an integrity that falls in proportion to how far the flow beside it exceeds a critical speed and rises in calm water; at zero it becomes water, and once restored it becomes bank again. The upper stream rises and falls once per season. Tracers ride the flow and are colored by the local vorticity, so their color reports the state of the water, not an assigned role.',
  divergences: [
    { kind: 'science', text: 'ATP sets laminar against turbulent as State against nomad. In physics the same water does both, depending on the Reynolds number, and fast flow in a pipe is turbulent. The State’s hydraulics amount to keeping that number low, with flows held slow and narrow, which ATP 363 comes close to saying.', bib: ['reynolds'] },
    { kind: 'model', text: 'The flood and the repair are this model’s additions, so that the processes take turns, as conflict mode requires. ATP mentions neither, though Wittfogel’s empires were built on controlling floods.', bib: ['wittfogel'] },
    { kind: 'model', text: 'The fluid is two-dimensional, and the grid adds numerical viscosity, so the eddies are large and smooth. Real turbulence is three-dimensional, with eddies within eddies down to small scales.', bib: ['fedkiw'] },
    { kind: 'model', text: 'The bank’s stress is the speed of the flow beside it, a stand-in for the shear stress of the Shields criterion, not a measurement of it.', bib: ['shields'] },
  ],
};
