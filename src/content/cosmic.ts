import type { ModelSources } from './types';

export const cosmicSources: ModelSources = {
  summary:
    'Bodies around one to three centers. In capture mode they are pulled into rings at fixed distances. In war-machine mode they are kicked in random directions. Warding zones push them outward.',
  absent: {
    polarization: 'Not modeled.',
    encompassment: 'Not modeled.',
  },
  atp: [
    { pages: '370', quote: 'It is striated by the fall of bodies, the verticals of gravity, the distribution of matter into parallel layers, the lamellar and laminar movement of flows.' },
    { pages: '370', quote: 'Universal attraction became the law of all laws, in that it set the rule for the biunivocal correspondence between two bodies', note: 'Gravity on the side of royal science.' },
    { pages: '361', quote: 'One no longer goes from the straight line to its parallels, in a lamellar or laminar flow, but from a curvilinear declination to the formation of spirals and vortices on an inclined plane' },
    { pages: '489', quote: 'Smooth space is constituted by the minimum angle, which deviates from the vertical, and by the vortex, which overspills striation.' },
    { pages: '381', quote: 'Movement is extensive; speed is intensive.' },
  ],
  borrowed: [
    { bib: 'serres', where: '361, 489, 553 n. 17', text: 'The clinamen, as Plateaus’ translator glosses Serres, is the “minimal angle leading to the formation of a vortex, and appears by chance in a laminar flow.”' },
    { bib: 'lucretius', where: 'via Serres', text: 'Atoms fall in parallel and swerve by the smallest amount, which is how anything collides and forms.' },
    { bib: 'newton', where: '370', text: 'Universal gravitation, which Plateaus calls royal science’s “law of all laws.”' },
  ],
  physics: [
    { name: 'Newtonian gravity and circular orbits', tex: 'F = \\frac{G M m}{r^2}, \\qquad v_{\\text{circ}} = \\sqrt{\\frac{G M}{r}}', text: 'Orbits come in every size. Nothing in gravity sets rings at fixed spacings.', bib: ['newton'] },
    { name: 'Why two bodies cannot capture each other', tex: 'E = \\tfrac{1}{2} m v^2 - \\frac{G M m}{r}', text: 'This energy stays constant for two bodies alone. A body that arrives from far away with E ≥ 0 leaves again. Capture needs energy carried off by something else: a third body, drag, or tides.' },
    { name: 'Rings at fixed spacings', tex: 'L = n\\hbar', text: 'Rings at fixed spacings belong to Bohr’s 1913 atom, where they come from quantization, not to gravity.', bib: ['bohr'] },
  ],
  code:
    'Bodies near a center feel an inverse-square pull, are steered toward circular speed, and are pushed toward the nearest ring at a multiple of 50 units. Every body loses 4 percent of its speed each frame, and this drag is what lets capture happen at all. War-machine bodies get random kicks. Warding zones push outward.',
  divergences: [
    { kind: 'model', text: 'Rings at fixed spacings are not Newtonian. Capture works here only because the code removes energy every frame, which hides the point that capture needs a third party.' },
    { kind: 'model', text: 'The war machine appears as a random “takeover.” Plateaus’ figure from this domain is the clinamen, the smallest deviation from parallel fall, which produces vortices (361, 489). That is a minimal angle, not a random kick.' },
    { kind: 'science', text: 'Plateaus puts gravity on the side of royal science (370), as the parallel fall that striates space, and the swerve on the side of nomad science. A rebuild might start from fall and swerve (work plan, Phase 6). The old label “centripetal machine” is not Plateaus’.' },
  ],
};
