import type { ModelSources } from './types';

export const hydraulicSources: ModelSources = {
  summary:
    'A shallow layer of liquid flows from left to right, heated unevenly from below, with dye released from fixed points at the left as in Reynolds’s experiment. A strong through-flow keeps the dye in straight lanes (laminar flow), heat from below turns the liquid in small convection cells that hold the dye in place, and stronger heat breaks both into turbulence that scatters it through the whole layer. Read socially, the dye is labor (Plateaus: 368): marched toward the State’s works by the corvée, kept by households that work for themselves, or carried off by journeymen who move from site to site. In conflict mode the heaters drift and surge on their own and the through-flow wavers, so the three take the lead in turn.',
  absent: {
    polarization: 'Not modeled. The town is “defined by entries and exits” (Plateaus: 432), which would need sinks inside the liquid as well as sources, a lead for a later version.',
    encompassment: 'Not modeled. Encompassment passes between formations (Plateaus: 435), so it needs more than one body of liquid.',
  },
  atp: [
    { pages: '361', quote: 'it uses a hydraulic model, rather than being a theory of solids treating fluids as a special case; ancient atomism is inseparable from flows, and flux is reality itself, or consistency.', note: 'This is the first trait of nomad science (cf. Serres on Lucretius), which is why this world is liquid.' },
    { pages: '363', quote: 'the State needs to subordinate hydraulic force to conduits, pipes, embankments, which prevent turbulence, which constrain movement to go from one point to another, and space itself to be striated and measured, which makes the fluid depend on the solid, and flows proceed by parallel, laminar layers.', note: 'Capture in this model: the through-flow that keeps each lane of dye intact from its source toward the far edge.' },
    { pages: '368', quote: 'Settling, sedentarizing labor power, regulating the movement of the flow of labor, assigning it channels and conduits, forming corporations in the sense of organisms, and, for the rest, relying on forced manpower recruited on the spot (corvee) or among indigents (charity workshops)', note: 'Hence the reading of the dye as labor, in a sentence that goes on to call this “one of the principal affairs of the State, which undertook to conquer both a band vagabondage and a body nomadism.”' },
    { pages: '357', quote: 'war maintains the dispersal and segmentarity of groups', note: 'Warding off, cf. Clastres. In this model: small convection cells that hold the dye in place ahead of the conduit’s front.' },
    { pages: '358', quote: 'the members of the band meet and undertake their theft activity in common, with collective sharing of the loot, but they disperse to eat or sleep separately', note: 'One of the mechanisms that keep a leader from acquiring stable power, cf. Meunier on the street children of Bogotá.' },
    { pages: '433', quote: 'the circles are not concentric, and the two segments require a third segment through which to communicate.', note: 'In the model, convection cells sit side by side, each turning on its own, with no cell at the center.' },
    { pages: '361', quote: 'From turba to turbo: in other words, from bands or packs of atoms to the great vortical organizations.', note: 'In this model the war machine is the swerve that grows into turbulence.' },
    { pages: '363', quote: 'The hydraulic model of nomad science and the war machine, on the other hand, consists in being distributed by turbulence across a smooth space, in producing a movement that holds space and simultaneously affects all of its points' },
    { pages: '368', quote: 'We know of the problems States have always had with journeymen\'s associations, or compagnonnages, the nomadic or itinerant bodies of the type formed by masons, carpenters, smiths, etc.', note: 'Labor that leaves the corvée: the dye scattered by turbulence.' },
    { pages: '364', quote: 'There is indeed such a thing as measured, cadenced rhythm, relating to the coursing of a river between its banks or to the form of a striated space; but there is also a rhythm without measure, which relates to the upswell of a flow, in other words, to the manner in which a fluid occupies a smooth space.', note: 'Why the heat surges unevenly in time and place instead of on a beat.' },
    { pages: '474', quote: 'the two spaces in fact exist only in mixture: smooth space is constantly being translated, transversed into a striated space; striated space is constantly being reversed, returned to a smooth space.', note: 'Conflict mode, where the three processes press on one another and take the lead in turn.' },
  ],
  borrowed: [
    { bib: 'serres', where: '361-63, 489-90, 553 n. 17, 554 n. 24', text: 'Plateaus takes the hydraulic model, the vortex, and laminar flow from Serres’s reading of Lucretius, and quotes him on the waterworks of the ancient world: “the conduit is essential, and the clinamen seems like freedom because it is precisely a turbulence that rejects forced flow.”' },
    { bib: 'wittfogel', where: '363', text: 'Plateaus grants “Wittfogel’s theses on the importance of large-scale waterworks for an empire,” then turns them: the State needs a hydraulic science, but one of conduits. Wittfogel is also the source of the legend’s corvée gangs on an empire’s canals.' },
    { bib: 'querrien', where: '368, 554 n. 26', text: 'For the State’s hold on the flow of labor, through settlement, corporations, the corvée, and charity workshops, Plateaus draws on Querrien’s published and unpublished work.' },
    { bib: 'clastres', where: '357-59, 553 n. 12', text: 'Warding off as a mechanism against the State comes from Clastres, who argues that the societies he studied produce no surplus beyond their needs and keep their chiefs without power. Households in this model, which work for themselves and leave no surplus to levy, follow his argument.' },
    { bib: 'meunier', where: '358, 553 n. 13', text: 'In Meunier’s study of the street children of Bogotá, the band whose members “disperse to eat or sleep separately” is a gang, one of the examples Plateaus gives of a band that keeps its leader from acquiring stable power.' },
  ],
  physics: [
    {
      name: 'A traveling hot spot',
      text: 'Raids here are patches of strong heating that travel downstream with the flow. Where one passes, the layers break into turbulence, and once it has moved on the through-flow lays them down again. A puff of turbulence alone dies out at this flow’s low speed, as real puffs do below a critical Reynolds number, so the raid carries its own heat.',
    },

    {
      name: 'Navier-Stokes equations with buoyancy (Boussinesq)',
      tex: '\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u} + g\\beta (T - T_0)\\,\\hat{\\mathbf{z}}, \\qquad \\frac{\\partial T}{\\partial t} + \\mathbf{u}\\cdot\\nabla T = \\kappa \\nabla^2 T',
      text: 'These are the equations of motion for a viscous liquid whose warmer parts rise, carrying and conducting heat as they move, solved here on a grid by Stam’s method with MacCormack’s less diffusive advection.',
      bib: ['stam', 'selle'],
    },
    {
      name: 'Rayleigh number and convection cells',
      tex: '\\mathrm{Ra} = \\frac{g\\beta\\, \\Delta T\\, d^3}{\\nu\\, \\kappa} > \\mathrm{Ra}_c \\approx 1708',
      text: 'A layer of liquid heated from below stays still until this number passes a critical value, about 1,708 between rigid plates. Past it the liquid turns in a row of cells, each about as wide as the layer is deep, neighbors turning in opposite directions. Bénard saw them in 1900, and Rayleigh worked out the threshold in 1916. Far past it, the cells give way to rising plumes and turbulence.',
      bib: ['benard', 'rayleigh'],
    },
    {
      name: 'Through-flow against convection',
      tex: '\\mathrm{Re} = \\frac{U d}{\\nu}',
      text: 'If the layer also flows lengthwise, a strong enough flow sweeps the cells downstream and keeps the liquid in parallel layers, which delays convection. Reynolds’s number compares the flow to viscosity, and in his experiment a thread of dye stays a straight line while the flow is laminar and spreads through the pipe once it turns turbulent.',
      bib: ['reynolds'],
    },
    {
      name: 'Uneven forcing (Ornstein-Uhlenbeck)',
      tex: 'dz = -\\theta z\\, dt + \\sigma \\sqrt{2\\theta}\\, dW, \\qquad h = e^{z}',
      text: 'Each heater’s strength wanders as a random process pulled back toward its mean, taken as an exponent so that it stays positive and surges unevenly. In conflict mode the through-flow wavers the same way, only more slowly.',
      bib: ['uhlenbeck'],
    },
  ],
  code:
    'On a grid 180 cells long and 30 deep, each step carries the temperature with the flow and conducts it, adds buoyancy, then diffuses, projects to zero divergence, advects by MacCormack’s method, and projects again. Four heaters that drift along the floor set its temperature, each with its own log-normal Ornstein-Uhlenbeck strength, while the ceiling stays cold. In conflict mode the through-flow at the left wavers by the same kind of process. Each spot of liquid is read from running averages of its vertical motion: layers where that motion is small compared with the lengthwise flow, cells where it is steady, eddies where it keeps changing. Dye enters from eight sources at the left. A particle counts as intact while it stays within one and a half cells of its source’s height, so the conduit’s front in each lane is its farthest intact particle. Particles that stray count as held or scattered according to the reading where they are, while the narrator’s chart tracks the front’s average reach and those two shares. A dim field of tracers, colored by the same reading, shows the cells and eddies where no dye has reached.',
  divergences: [
    { kind: 'model', text: 'Crossings between layers, cells, and eddies are read from the dye: a particle that settles into a new regime keeps a ring in the color of the old one, and the narrator reports a crossing when it runs well above its usual level. Hardening, warding off turning into capture, is left out here, since the convection rolls that could align with the flow and become channels exist only in three dimensions.' },

    { kind: 'science', text: 'Plateaus sets laminar against turbulent as State against nomad. In physics the same liquid does both, depending on how fast it flows and how strongly it is heated, which the model keeps: one liquid, three regimes, with no separate substance for each process.', bib: ['reynolds', 'rayleigh'] },
    { kind: 'model', text: 'Plateaus never mentions convection cells. They stand for warding off here because they perform its function, small equal circles that turn side by side, none at the center, holding the flow in place ahead of the conduit’s front. Cells do not anticipate anything, though, and anticipation in Plateaus is a social mechanism (440), so the likeness is of function, not of cause.', bib: ['benard', 'clastres'] },
    { kind: 'model', text: 'Reading the dye as labor is this model’s interpretation, drawn from Plateaus (368), so the corvée, the households, and the journeymen in the labels illustrate that reading rather than anything in the physics.', bib: ['querrien', 'wittfogel'] },
    { kind: 'model', text: 'Heaters that drift and surge are there so that the three regimes take the lead in turn, as conflict mode requires, whereas a laboratory experiment would usually hold the heating steady and vary one setting at a time.', bib: ['uhlenbeck'] },
    { kind: 'science', text: 'Because the grid’s numerical viscosity is much larger than the nominal one, the model’s Rayleigh and Reynolds numbers do not predict where its regimes change. Its settings were found by measurement instead (simulations run headless, counting how often each regime leads).', bib: ['fedkiw'] },
    { kind: 'model', text: 'Thresholds that sort layers, cells, and eddies are this model’s choices, so the colors report a classification of the motion, not a sharp physical boundary. Vigorous but steady plumes sometimes count as cells.' },
    { kind: 'model', text: 'Since the liquid is two-dimensional and the grid is stretched to fill the canvas, the cells look taller than they are wide. Real cells are about as wide as the layer is deep, and real turbulence is three-dimensional.', bib: ['fedkiw'] },
  ],
};
