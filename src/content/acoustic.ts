import type { ModelSources } from './types';

export const acousticSources: ModelSources = {
  summary:
    'A field of metronomes stands on one board that can sway, the classroom version of what Huygens saw in 1665 when two pendulum clocks hung from one beam fell into time together. Since each metronome pushes the board and is pushed by it, the board’s swing is the field’s common beat, while each also hears its near neighbors with a small delay. Capture is strong coupling through the board, which pulls the whole field into one beat. Warding off is a set of villages whose tempi differ, which keeps that common beat from forming. The war machine is coupling between neighbors, which passes the beat along in traveling waves counted from no center. Read socially, the board is a bell at the center that sets everyone’s hours, while the villages keep their own hours and the waves pass as a contagion from neighbor to neighbor. In conflict mode the board’s pull surges, as does the neighbors’ coupling in patches that drift across the field, while the villages spread their tempi wider whenever the board starts to swing.',
  absent: {
    polarization: 'Not modeled. Plateaus gives sound to the town too, its “melodic lines” against the State’s harmonic cross sections (434), and frequency against resonance (433), a lead for a later version.',
    encompassment: 'Not modeled. Encompassment passes between formations (Plateaus: 435), so it would need more than one board.',
  },
  atp: [
    { pages: '433', quote: 'Each State is a global (not local) integration, a redundancy of resonance (not of frequency), an operation of the stratification of the territory (not of the polarization of the milieu).', note: 'Capture in this model: the board’s common beat. Frequency belongs to the town, so the model never calls its synchrony by that name.' },
    { pages: '433', quote: 'if the State has a circuit of its own, it is an internal circuit dependent primarily upon resonance' },
    { pages: '224', quote: 'the common central point is not where all the other points melt together, but instead acts as a point of resonance on the horizon, behind all the other points.', note: 'Such is the board: every metronome drives it, while it stands behind them all.' },
    { pages: '212', quote: 'begin to resonate in a center acting as their common denominator.', note: 'Of the Greek city-state, where distinct focal points begin to resonate together. In the model, the narrator cites it when the field falls into step.' },
    { pages: '211', quote: 'In a supple regime, centers already act as so many knots, eyes, or black holes; but they do not all resonate together, they do not fall on the same point, they do not converge in the same black hole.', note: 'Warding off in this model: villages at their own tempi, so that no beat resonates at the center.' },
    { pages: '357', quote: 'The chief is more like a leader or a star than a man of power and is always in danger of being disavowed, abandoned by his people.', note: 'Cf. Clastres. A village that keeps its own hours against the bell.' },
    { pages: '390', quote: 'The numbering number is rhythmic, not harmonic. It is not related to cadence or measure: it is only in State armies, and for reasons of discipline and show, that one marches in cadence', note: 'Both sides appear in one passage, the drill belonging to capture and the nomads’ numbering to the war machine.' },
    { pages: '313', quote: 'It is well known that rhythm is not meter or cadence, even irregular meter or cadence: there is nothing less rhythmic than a military march.', note: 'From “Of the Refrain,” on meter against rhythm.' },
    { pages: '241', quote: 'Bands, human or animal, proliferate by contagion, epidemics, battlefields, and catastrophes.', note: 'In this model, the war machine is a beat caught from neighbor to neighbor.' },
    { pages: '33', quote: 'He may be in the center, and then, immediately afterwards, at the edge', note: 'Plateaus quoting Canetti on the pack, where the lead keeps moving, as it does in a traveling wave.' },
    { pages: '262', quote: 'Boulez distinguishes tempo and nontempo in music: the "pulsed time" of a formal and functional music based on values versus the "nonpulsed time" of a floating music, both floating and machinic, which has nothing but speeds or differences in dynamic.' },
    { pages: '477', quote: 'in a smooth space-time one occupies without counting, whereas in a striated space-time one counts in order to occupy.', note: 'This is Plateaus summarizing Boulez, its musical model of the smooth and the striated.' },
  ],
  borrowed: [
    { bib: 'boulez', where: '262, 477-78', text: 'Pulsed and nonpulsed time, and the smooth and the striated themselves, come from Boulez’s writing on music, which Plateaus takes as its musical model: “in a smooth space-time one occupies without counting, whereas in a striated space-time one counts in order to occupy.”' },
    { bib: 'canetti', where: '33-34, 521 n. 5', text: 'The pack whose members are now at the center and now at the edge is Canetti’s, from Crowds and Power.' },
    { bib: 'clastres', where: '357, 553 n. 12', text: 'Plateaus takes the chief without power, one of the mechanisms that ward off the State, from Clastres. A village keeping its own hours against the bell follows that argument.' },
    { bib: 'pantaleone', where: 'not in Plateaus', text: 'Metronomes on a shared board are not in Plateaus. They are the physics this model borrows to stage resonance at a center, as Pantaleone set it out for the classroom, after Huygens’s clocks.' },
  ],
  physics: [
    {
      name: 'Pacemakers and target waves',
      text: 'In a field of oscillators, a region that beats faster than its surroundings leads them: its neighbors lock to its tempo, or its beat spreads outward as rings (target waves). This model reads a coherent village beating clearly faster than the field, with outside metronomes keeping its tempo, as a pacemaker, hardening into a second bell when most of them lock in step, and sending out waves when most pass its beat to others.',
      bib: ['kuramoto'],
    },

    {
      name: 'Kuramoto model',
      tex: '\\frac{d\\theta_i}{dt} = \\omega_i + K R \\sin(\\psi - \\theta_i), \\qquad R\\, e^{i\\psi} = \\frac{1}{N}\\sum_{j} e^{i\\theta_j}',
      text: 'Each oscillator runs at its own natural rate and is pulled toward the population’s mean phase in proportion to how coherent the population already is, so a little agreement breeds more. R measures that coherence, from 0 (no common beat) to 1 (all in step).',
      bib: ['kuramoto', 'strogatz'],
    },
    {
      name: 'The threshold for synchrony',
      tex: 'K_c = \\frac{2}{\\pi\\, g(0)}',
      text: 'For natural rates spread with density g(ω) around their mean, a common beat appears only once the coupling passes this value. Spreading the rates wider lowers g(0) and raises the threshold, which is how the villages keep a common beat from forming.',
      bib: ['kuramoto', 'strogatz'],
    },
    {
      name: 'Metronomes on a moving board',
      text: 'A board that can roll or sway couples the metronomes through its motion: each swing pushes the board, whose motion pushes back on every metronome. Pantaleone showed that this is a mechanical form of the Kuramoto model, in which the metronomes usually lock in phase and lock in opposite phase only in special cases. Huygens had reported two pendulum clocks on one beam keeping time together, which Bennett and colleagues rebuilt and explained.',
      bib: ['pantaleone', 'bennett'],
    },
    {
      name: 'Waves from neighbors with a delay',
      tex: '\\frac{d\\theta_i}{dt} = \\omega_i + \\frac{K_\\ell}{4} \\sum_{j \\in \\text{nbrs}(i)} \\sin(\\theta_j - \\theta_i - \\alpha)',
      text: 'When each oscillator is coupled only to its neighbors, with a phase lag α such as sound arriving late would give, the field does not settle into one phase. Waves of phase travel across it, and rotating waves form around defects, a phase turbulence of the kind Kuramoto described.',
      bib: ['kuramoto'],
    },
  ],
  code:
    'In code, the field is 60 by 36 metronomes, each with a phase and a natural tempo, divided into twelve territories (the villages). Each step, taken in four substeps, adds three pulls to a metronome’s own tempo: toward the board’s phase in proportion to the board’s swing, toward its village’s mean phase, and toward its four neighbors with a phase lag of 0.6 radians. The board’s swing is the field’s mean beat, smoothed so that it builds and decays, while its phase follows the beat directly. Villages differ in tempo by a spread that, in conflict mode, rises when the board swings above an alarm level and relaxes below a calm level. Both the board’s pull and the neighbors’ pull, which comes in patches that drift across the field, surge by log-normal Ornstein-Uhlenbeck processes. Each metronome is read as in step with the board, in step with its village, or neither, and colored accordingly, while the whole field shifts sideways with the board’s swing.',
  divergences: [
    { kind: 'model', text: 'Raids here are patches of strong neighbor coupling that travel across the field, a stand-in for a surge of contagion. Left alone, the neighbors’ phase lag would also shift every tempo by a constant, so that shift is taken out (adding the sine of the lag for each neighbor), leaving in-step neighbors at their natural tempo.', bib: ['kuramoto'] },

    { kind: 'science', text: 'Plateaus keeps frequency for the town and resonance for the State (433). In physics, synchrony is a locking of frequencies, so the model’s capture is literally one. It is called resonance here because a center on top, which every metronome drives and which drives them all, is what produces it.', bib: ['pantaleone'] },
    { kind: 'model', text: 'Spreading the villages’ tempi when the board starts to swing is this model’s device for anticipation, chosen so that the three take the lead in turn. Real metronomes do not retune themselves, and anticipation in Plateaus is a social mechanism (440).', bib: ['clastres'] },
    { kind: 'model', text: 'Huygens first saw opposite-phase locking, which this model omits. Plateaus gives the State the opposition of segments “two by two” (223), so opposed pairs would read as capture rather than warding off.', bib: ['bennett'] },
    { kind: 'model', text: 'Real metronomes on one board hear each other faintly, and their coupling through the board usually dominates. Here the neighbors’ pull is set stronger than a real board would give, so that the war machine can contest the board.', bib: ['pantaleone'] },
    { kind: 'model', text: 'This is a phase model. Its metronomes have no amplitude and its board is not solved as a mechanical body, a simplification whose limits Pantaleone’s fuller treatment shows.', bib: ['pantaleone'] },
    { kind: 'science', text: 'Boulez’s pulsed and nonpulsed time concern musical time, not the coupling of oscillators. This model stages his distinction through synchrony, a pulse imposed from the center against beats passed along without a count.', bib: ['boulez'] },
  ],
};
