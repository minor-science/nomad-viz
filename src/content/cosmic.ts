import type { ModelSources } from './types';

export const cosmicSources: ModelSources = {
  summary:
    'Bodies move under Newtonian gravity around a heavy center, the capital city, which is there from the start. Societies are small clusters held together by their own gravity, each with its own orbits, and a heavy center’s tides strip any society that sinks too close, so that its members end up circling the capital city instead. Companies are heavy bodies on open paths: some cross open ground, some raid the capital city, scattering its bodies before they leave the field, and others are slowed by the crowd’s pull until they are caught in orbit as the capital city’s army. Read socially, the model stages three different purposes rather than one contest: the capital city overcodes and appropriates, the societies keep its threshold at a distance, while the companies hold open ground. Lines of flight cross between them, since a society that tightens too far hardens into a small State, and one struck hard can throw off a company of its own.',
  absent: {
    polarization: 'Not modeled. The town, a circuit “defined by entries and exits” (Plateaus: 432), would need centers that let flows pass through rather than hold them, a lead for a later version.',
    encompassment: 'Not modeled. Encompassment passes between formations (Plateaus: 435), and the small States here are annexed rather than federated.',
  },
  atp: [
    { pages: '386', quote: 'Gravity, gravitas, such is the essence of the State.', note: 'Why the State is the center of this world. On the same page come its gates, “barriers, filters against the fluidity of the masses” (citing Virilio).' },
    { pages: '370', quote: 'Universal attraction became the law of all laws, in that it set the rule for the biunivocal correspondence between two bodies', note: 'Gravity as the model of royal science.' },
    { pages: '427', quote: 'We are always brought back to the idea of a State that comes into the world fully formed and rises up in a single stroke, the unconditioned Urstaat.', note: 'Why the capital city is there from the start instead of forming.' },
    { pages: '448', quote: 'wherever capture contributes to the creation of that which it captures', note: 'In the model, each body the capital city holds adds to the crowd whose pull draws in societies.' },
    { pages: '440', quote: 'The threshold is in fact already there, but outside the limit, which is satisfied to place the threshold at a distance, keep it at a distance.', note: 'Warding off in this model: each society’s tidal radius, which it keeps outside itself by tightening its orbits.' },
    { pages: '357', quote: 'Special institutions are thus necessary to enable a chief to become a man of State, but diffuse, collective mechanisms are just as necessary to prevent a chief from becoming one.', note: 'Cf. Clastres. A society that tightens too far hardens into a small State, a line of flight from warding off into capture.' },
    { pages: '358', quote: 'each member of the band is paired off with one, two, or three other members, so if he has a disagreement with the leader, he will not leave alone but will take along his allies', note: 'Cf. Meunier. Members who leave a society together become a company of their own.' },
    { pages: '417', quote: 'the war machine does not necessarily have war as its object (for example, the raid can be seen as another object, rather than as a particular form of war)', note: 'Companies cross open ground or raid the capital city and keep riding.' },
    { pages: '418', quote: 'What we call a military institution, or army, is not at all the war machine in itself, but the form under which it is appropriated by the State.', note: 'A company caught in orbit becomes the capital city’s army.' },
    { pages: '420', quote: 'thus the integration of the nomad into the State is a vector traversing nomadism from the very beginning, from the first act of war against the State', note: 'One pass through the capital city can both scatter it and slow the company that makes it.' },
    { pages: '371', quote: 'speed is not merely an abstract characteristic of movement in general but is incarnated in a moving body that deviates, however slightly, from its line of descent or gravity.', note: 'Celeritas against Gravitas, citing Dumézil on their opposition.' },
  ],
  borrowed: [
    { bib: 'virilio', where: '386, 558 n. 63', text: 'Plateaus takes the State as “management of the public ways,” with its gates as filters against “the penetration power of migratory packs,” from Virilio’s Speed and Politics.' },
    { bib: 'clastres', where: '357-59, 553 n. 12', text: 'From Clastres, Plateaus takes the chief without power, with the collective mechanisms that keep a chief from becoming a man of State.' },
    { bib: 'meunier', where: '358, 553 n. 13', text: 'Such is the band in which a member “will not leave alone but will take along his allies” is a street gang in Meunier’s study of the street children of Bogotá.' },
    { bib: 'newton', where: '370, 489', text: 'Universal attraction, which Plateaus calls “the law of all laws” of royal science, is Newton’s. This model runs on it, though Plateaus treats it as the State’s science rather than a neutral ground.' },
  ],
  physics: [
    {
      name: 'Newtonian gravity, softened',
      tex: '\\ddot{\\mathbf{r}}_i = \\sum_{j \\neq i} \\frac{G\\, m_j\\, (\\mathbf{r}_j - \\mathbf{r}_i)}{\\left(|\\mathbf{r}_j - \\mathbf{r}_i|^2 + \\epsilon^2\\right)^{3/2}}',
      text: 'Every body attracts every other, with a small softening length so that close passes stay finite, and all feel the capital city’s central mass. A body whose energy is negative relative to the center is bound to it, circling on a closed orbit.',
      bib: ['newton', 'binney'],
    },
    {
      name: 'Tides and the tidal radius',
      tex: 'r_t \\approx d \\left(\\frac{m}{3M}\\right)^{1/3}',
      text: 'A cluster of mass m at distance d from a mass M holds its members only within roughly this radius. Beyond it, the difference in the center’s pull across the cluster outweighs the cluster’s own pull, so members are stripped, all the sooner as the cluster comes closer and the center grows heavier.',
      bib: ['binney'],
    },
    {
      name: 'Dynamical friction',
      tex: '\\frac{d\\mathbf{v}}{dt} \\propto -\\frac{G^2 M \\rho}{v^3}\\, \\mathbf{v}',
      text: 'A heavy body moving through a crowd of lighter ones pulls them into a wake that trails it and pulls back on it, so the heavy body slows. Its drag grows with its mass and with the density of the crowd, while falling steeply with its speed. It makes star clusters sink toward the centers of galaxies.',
      bib: ['chandrasekhar', 'binney'],
    },
    {
      name: 'Collapse and accretion',
      text: 'A bound cluster that loses the energy of its internal motion contracts, and one that contracts far enough collapses into a compact body, which then grows by drawing in what passes close and slow enough to stay. A heavy body passing close to a cluster can fling members out at high speed.',
      bib: ['binney'],
    },
  ],
  code:
    'In code, the field is 160 by 100 units, with the capital city as a fixed mass of 300 at its center. Societies start as clusters of 18 bodies of mass 1 on circular orbits, and bodies leaving the field return later as new societies at a distance. Each step uses a leapfrog integrator, which keeps orbits from drifting, with all pairs of bodies attracting one another. A body counts as a member of its society while it stays within the society’s tidal radius and below its escape speed. Dynamical friction is applied by its local formula, since a few hundred bodies are too few for the effect to emerge strongly by itself. The crowd that slows a society also includes a halo around the capital city, so that even an emptied capital city keeps drawing societies toward itself. Societies whose size passes an alarm fraction of their tidal radius cool their internal motion. Companies of mass 70, a share of them raiders of mass 150 aimed at the capital city, arrive in uneven surges. A caught company that stays in orbit long enough, or sinks to the center, is absorbed. A society that contracts past a collapse size merges into a small State, conserving mass and momentum, and a group of at least seven former members leaving together fast merges into a company.',
  divergences: [
    { kind: 'science', text: 'Plateaus makes gravity the State’s own science, “the law of all laws” (370), yet the model runs everything on it. So the war machine’s speed and the societies’ warding off are therefore staged inside gravity, as motions it allows, rather than as a different physics.', bib: ['newton'] },
    { kind: 'model', text: 'Dynamical friction is applied by Chandrasekhar’s formula in local form, set by measurement so that about a third of companies are caught, because a few hundred bodies are too few for the effect to emerge strongly. Likewise, the capital city’s halo is a stand-in for an extended mass.', bib: ['chandrasekhar'] },
    { kind: 'model', text: 'Societies tightening their orbits when their tide alarm rises is this model’s device for anticipation, as the clans’ mobilization is in the metallurgic model. Clusters do not cool themselves on purpose, and anticipation in Plateaus is a social mechanism (440).', bib: ['clastres'] },
    { kind: 'model', text: 'A collapsed society and a breakaway group are each merged into one body. Real collapse leaves a dense cluster rather than a point, and ejected stars leave separately, so the merges are simplifications that keep the lines of flight readable.', bib: ['binney'] },
    { kind: 'model', text: 'Bodies that leave the field return as new societies at a distance, a stand-in for people arriving from beyond it. Since the capital city’s mass is fixed, it never grows by absorbing its army or the small States it annexes.' },
    { kind: 'science', text: 'This model is two-dimensional, with forces still falling off as the inverse square of distance, as in three dimensions. A true two-dimensional gravity would fall off as the inverse of distance and bind everything more tightly.', bib: ['binney'] },
  ],
};
