import type { ModelSources } from './types';

export const metallurgicSources: ModelSources = {
  summary:
    'Atoms are pulled toward the points of a fixed square grid, carried along a swirling field, or agitated inside moving zones. They do not bind to one another.',
  absent: {
    polarization: 'Not modeled. ATP names polarization as the second thing primitive mechanisms keep from crystallizing (433), a lead for a later version.',
    encompassment: 'Not modeled. ATP’s metallurgy does cross formations (435), but this model has only one body of matter.',
  },
  atp: [
    { pages: '357', quote: 'Mechanisms for warding off, preventive mechanisms, are a part of chieftainship and keep an apparatus distinct from the social body from crystallizing.', note: 'cf. Clastres.' },
    { pages: '429', quote: 'counter-State societies organizing mechanisms that ward off the State-form, which make its crystallization impossible' },
    { pages: '433', quote: 'what prevents the potential central points from crystallizing, from taking on consistency, are precisely those mechanisms that keep the formations of power both from resonating together in a higher point and from becoming polarized at a common point', note: 'Warding off holds off two thresholds, the State (resonance) and the town (polarization).' },
    { pages: '438', quote: 'It marks the exact point at which the assemblage must reproduce itself, begin a new operation period or a new cycle, lodge itself on another territory, and beyond which the assemblage could not continue as such.', note: 'The “last,” the limit before the threshold.' },
    { pages: '409', quote: 'We will therefore define the artisan as one who is determined in such a way as to follow a flow of matter, a machinic phylum.' },
    { pages: '406', quote: 'forged and not cast or molded, quenched and not air cooled, produced by the piece and not in number', note: 'Of the iron sword, against the cast steel saber.' },
    { pages: '411', quote: 'metallurgy is minor science in person' },
  ],
  borrowed: [
    { bib: 'clastres', where: '357-59', text: 'Warding off begins with Pierre Clastres’s Amazonian chiefs, who speak but cannot command.' },
    { bib: 'simondon1958', where: '408-10, 562 n. 92', text: 'Simondon’s critique of the hylomorphic schema, form imposed on passive matter, which he traces to “the social model of work” (as ATP summarizes him).' },
    { bib: 'simondon1964', where: '562 n. 93', text: 'Simondon on metallurgy, quoted in ATP: “Metallurgy does not entirely accommodate itself to an analysis using the hylomorphic schema.” His own model of individuation is a crystal growing in a metastable solution.' },
    { bib: 'childe', where: '412', text: 'The smith as the first specialized artisan, itinerant because metal must be followed.' },
  ],
  physics: [
    { name: 'Classical nucleation theory', tex: '\\Delta G(r) = -\\tfrac{4}{3}\\pi r^3\\,\\Delta g_v + 4\\pi r^2 \\gamma, \\qquad r^* = \\frac{2\\gamma}{\\Delta g_v}', text: 'A crystal starts as a cluster of atoms in a supercooled or supersaturated medium. Below the critical radius r* the cluster costs more in surface energy (γ) than it gains in bulk (Δg_v), and dissolves. Above it, the cluster grows. The medium can stay liquid well below its freezing point until a cluster crosses r*.', bib: ['volmerWeber', 'beckerDoring'] },
    { name: 'Hooke’s law', tex: 'F = -k\\,\\Delta x', text: 'What the code actually uses: each atom is pulled toward the nearest grid point by a spring.' },
    { name: 'Superfluidity', text: 'A real state of matter, found in helium-4 below 2.17 K, in which a liquid flows without viscosity. It has no bearing on metallurgy, and ATP does not use it.', bib: ['kapitza', 'allenMisener'] },
  ],
  code:
    'In capture mode each atom feels a spring toward the nearest point of a square grid with 40-unit spacing, and counts as fixed once it is close. War-machine atoms follow a swirling vector field plus random kicks. Inhibitor zones add random kicks. Atoms never interact with one another.',
  divergences: [
    { kind: 'model', text: 'The crystal here is a mold. The grid exists before any atom arrives and is imposed from outside, which is exactly the hylomorphic schema Simondon criticizes and ATP borrows (408-10). A real crystal grows from a seed, as atoms bind to one another.' },
    { kind: 'model', text: '“Superfluidity” is not ATP’s term. ATP’s metallurgy is the smith who follows the matter-flow (409), a figure missing from the model.' },
    { kind: 'model', text: 'Warding off appears as random heating. In ATP it works by anticipation: the “last” marks the point beyond which an assemblage “could not continue as such” (438), keeping the threshold “at a distance” (440). Nucleation has a real threshold of this kind, the critical radius, which a rebuild could use (work plan, Phase 3).' },
    { kind: 'science', text: 'When ATP speaks of an apparatus “crystallizing” (357), or of the State’s “crystallization” (429), it uses a figure for crossing a threshold. Reading it as nucleation takes the figure more literally than ATP does, and the visualizer should say so whenever it does.' },
  ],
};
