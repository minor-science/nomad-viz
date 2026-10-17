import type { ModelSources } from './types';

export const metallurgicSources: ModelSources = {
  summary:
    'A supersaturated solution on a square lattice. Atoms attach and detach at random, weighted by the energy of their bonds, so small clusters keep forming and dissolving until one crosses the critical size and grows into crystal grains. Depletion can hold that threshold at a distance, and smiths follow the boundaries between grains.',
  absent: {
    polarization: 'Not modeled. ATP names polarization as the second thing primitive mechanisms keep from crystallizing (433), a lead for a later version.',
    encompassment: 'Not modeled. ATP’s metallurgy does cross formations (435), but this model has only one body of matter.',
  },
  atp: [
    { pages: '357', quote: 'Mechanisms for warding off, preventive mechanisms, are a part of chieftainship and keep an apparatus distinct from the social body from crystallizing.', note: 'cf. Clastres.' },
    { pages: '429', quote: 'counter-State societies organizing mechanisms that ward off the State-form, which make its crystallization impossible' },
    { pages: '433', quote: 'what prevents the potential central points from crystallizing, from taking on consistency, are precisely those mechanisms that keep the formations of power both from resonating together in a higher point and from becoming polarized at a common point', note: 'Warding off holds off two thresholds, the State (resonance) and the town (polarization).' },
    { pages: '440', quote: 'depletion is the means by which primitive groups ward off the stock and maintain their assemblage', note: 'Warding off in this model.' },
    { pages: '440', quote: 'The threshold is in fact already there, but outside the limit, which is satisfied to place the threshold at a distance, keep it at a distance.', note: 'The warding limit sits below the critical size, which stays in place the whole time.' },
    { pages: '412', quote: 'Artisans-metallurgists are itinerants because they follow the matter-flow of the subsoil.' },
    { pages: '413', quote: 'their space is neither the striated space of the sedentary nor the smooth space of the nomad', note: 'Of the smiths.' },
    { pages: '415', quote: 'The nomad war machine is the form of expression, of which itinerant metallurgy is the correlative form of content.', note: 'Axiom III.' },
    { pages: '406', quote: 'forged and not cast or molded, quenched and not air cooled, produced by the piece and not in number', note: 'Of the iron sword, against the cast steel saber.' },
  ],
  borrowed: [
    { bib: 'clastres', where: '357-59', text: 'Warding off begins with Pierre Clastres’s Amazonian chiefs, who speak but cannot command.' },
    { bib: 'simondon1964', where: '555 n. 33, 562 n. 93', text: 'Simondon’s model of individuation is a crystal growing from a seed in a metastable solution, which is what this model now simulates. ATP quotes him on metallurgy: “Metallurgy does not entirely accommodate itself to an analysis using the hylomorphic schema.”' },
    { bib: 'simondon1958', where: '408-10, 562 n. 92', text: 'The critique of the hylomorphic schema, form imposed on passive matter, which Simondon traces to “the social model of work” (as ATP summarizes him).' },
    { bib: 'childe', where: '412', text: 'The smith as the first specialized artisan, itinerant because metal must be followed.' },
  ],
  physics: [
    { name: 'Lattice gas', tex: 'E = -\\sum_{\\langle ij \\rangle} J_{ij}\\, n_i n_j - \\mu \\sum_i n_i, \\qquad \\Delta\\mu = \\mu - \\mu_c, \\quad \\mu_c = -2J', text: 'Each site holds an atom (n = 1) or not. Neighboring atoms bind with energy J, weaker across a grain boundary. On a square lattice, solid and solution coexist at μ_c = −2J, so Δμ > 0 is a supersaturated solution, one that would rather be solid.', bib: ['leeYang'] },
    { name: 'Metropolis Monte Carlo', tex: 'P(\\text{accept}) = \\min\\left(1,\\; e^{-\\Delta E / T}\\right)', text: 'At random sites, an atom attaches or detaches with this probability, so the lattice samples the states that thermal motion would visit.', bib: ['metropolis'] },
    { name: 'Critical size (classical nucleation theory, two dimensions)', tex: '\\Delta G(n) = -n\\,\\Delta\\mu + 2\\gamma\\sqrt{\\pi n}, \\qquad n^* = \\frac{\\pi \\gamma^2}{\\Delta\\mu^2}', text: 'A cluster of n atoms gains Δμ per atom and pays γ per unit of edge. Below n* it costs more than it gains and tends to dissolve, while above n* it tends to grow. So the solution can stay liquid for a long time, until some cluster gets past n*.', bib: ['volmerWeber', 'beckerDoring'] },
    { name: 'Line tension', tex: '\\gamma(T) = \\frac{J}{2} - T \\ln \\coth \\frac{J}{4T}', text: 'Onsager’s exact result for the square-lattice Ising model, written for the lattice gas. It falls to zero at the critical temperature, T_c ≈ 0.567 J.', bib: ['onsager'] },
    { name: 'Grain orientations', text: 'Atoms carry one of Q orientations, and an atom can switch to a neighbor’s orientation, as in the Potts-model simulations of grain growth. Where grains meet, a grain boundary forms.', bib: ['anderson'] },
  ],
  code:
    'Each frame runs a few Monte Carlo sweeps (one attempt per site on average) on a lattice with wrapped edges. An attaching atom takes the orientation most common among its neighbors, a simplification under which the moves only approximately satisfy detailed balance. Clusters are counted after every frame and colored gray until they pass the threshold, then cyan by grain. The threshold is set at three times the theory’s estimate of n*, because clusters that large were measured to dissolve on this lattice (docs/notes/nucleation-calibration.md). Warding off removes, once per operation period, the largest clusters between the warding limit and the threshold. Smiths walk along grain boundaries, then along the solid’s edge, and head for the nearest boundary when they lose it.',
  divergences: [
    { kind: 'science', text: 'Nucleation is real physics, and the critical size is a real threshold, there before anything crosses it. Yet when ATP speaks of an apparatus “crystallizing” (357), or of the State’s “crystallization” (429), it uses a figure. Reading it as nucleation takes the figure more literally than ATP does.', bib: ['volmerWeber'] },
    { kind: 'model', text: 'Depletion here acts from outside the physics, much as stirring or filtering a solution would. In ATP warding off is a society’s own mechanism (357). The model shows what such a mechanism has to do, which is to act below the threshold and before it, not how a society does it.' },
    { kind: 'model', text: 'The smiths follow the matter but do not yet work it. ATP’s smith forges and quenches (406), which changes the singularities of the metal. A later version could let them.' },
    { kind: 'model', text: 'The previous version of this model pulled atoms onto a fixed grid, which is a mold, the very hylomorphic schema Simondon criticizes (408-10). Here the crystal grows from its own seeds. Its earlier label, “superfluidity,” named a property of liquid helium near absolute zero, not anything in ATP or in metallurgy.' },
  ],
};
