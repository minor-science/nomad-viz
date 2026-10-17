import type { ModelSources } from './types';

export const acousticSources: ModelSources = {
  summary:
    'Dust on a vibrating square plate. In capture mode it drifts toward the lines that stay still. In war-machine mode it moves across them. Zones labeled silence agitate it.',
  absent: {
    polarization: 'Not modeled yet, though Plateaus gives sound to the town too: its “melodic lines,” against the State’s harmonic cross sections (434), and frequency against resonance (433).',
    encompassment: 'Not modeled.',
  },
  atp: [
    { pages: '433', quote: 'Each State is a global (not local) integration, a redundancy of resonance (not of frequency), an operation of the stratification of the territory (not of the polarization of the milieu).' },
    { pages: '433', quote: 'if the State has a circuit of its own, it is an internal circuit dependent primarily upon resonance' },
    { pages: '434', quote: 'Both the melodic lines of the towns and the harmonic cross sections of the States are necessary to effect the striation of space.' },
    { pages: '477', quote: 'in a smooth space-time one occupies without counting, whereas in a striated space-time one counts in order to occupy.', note: 'The summary of Boulez in Plateaus, the acoustic model of “The Smooth and the Striated.”' },
  ],
  borrowed: [
    { bib: 'boulez', where: '362, 477-78', text: 'Smooth and striated come from Boulez’s distinction between pulsed time, counted in advance, and non-pulsed time.' },
    { bib: 'chladni', where: 'not in Plateaus', text: 'The vibrating plate and its figures are Chladni’s. Plateaus never mentions them, so this part of the model is the visualizer’s own.' },
  ],
  physics: [
    { name: 'Kirchhoff plate equation', tex: 'D\\,\\nabla^4 w + \\rho h\\, \\frac{\\partial^2 w}{\\partial t^2} = 0', text: 'The vibration of a thin plate. Each mode has nodal lines that stay still while the rest moves.', bib: ['kirchhoff'] },
    { name: 'The approximation in the code', tex: 'Z = \\cos\\frac{n\\pi x}{L}\\cos\\frac{m\\pi y}{L} - \\cos\\frac{m\\pi x}{L}\\cos\\frac{n\\pi y}{L}', text: 'A standard approximation to a square plate’s modes. It gives figures like Chladni’s, though the modes of a real plate with free edges differ in detail.' },
    { name: 'Where the dust goes', text: 'Sand gathers on the nodal lines because it is thrown off the parts that move. Very light powder does the opposite and collects where the motion is greatest, carried there by air currents.', bib: ['chladni', 'faraday'] },
    { name: 'Destructive interference', tex: 'A\\sin(\\omega t) + A\\sin(\\omega t + \\pi) = 0', text: 'Silence by interference needs a second wave of the same frequency in opposite phase. Random noise cannot cancel a tone.' },
  ],
  code:
    'In capture mode each grain slides down the gradient of the plate’s amplitude toward a nodal line. In war-machine mode it moves at right angles to that gradient, plus random kicks. In silence zones it gets random kicks and ignores the plate.',
  divergences: [
    { kind: 'science', text: 'A plate ringing in one mode is resonance in the sense Plateaus gives it, a closed body vibrating in itself (433). The old label “Resonant Frequency” merges two things Plateaus distinguishes, the State’s resonance and the town’s frequency.' },
    { kind: 'model', text: 'The silence zones are random agitation, not destructive interference. The “Great Refusal” they were named for comes from Herbert Marcuse, and the “despotic machine” of the old State card from Anti-Oedipus, not from Plateaus.', bib: ['marcuse', 'antiOedipus'] },
    { kind: 'model', text: 'The acoustic model in Plateaus is Boulez’s: pulsed time, which counts in order to occupy, against non-pulsed time, which occupies without counting (477). A Chladni plate does not stage time at all, so a rebuild would need to add it (work plan, Phase 5).', bib: ['boulez'] },
  ],
};
