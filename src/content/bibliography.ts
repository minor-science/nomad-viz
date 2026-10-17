// Works cited in the visualizer. Where A Thousand Plateaus cites a work, `atp` gives the page of its note.

export interface Work {
  cite: string;
  short?: string;
  atp?: string;
}

export const BIBLIOGRAPHY: Record<string, Work> = {
  atp: { cite: 'Deleuze, Gilles, and Félix Guattari. A Thousand Plateaus: Capitalism and Schizophrenia. Trans. Brian Massumi. Minneapolis: University of Minnesota Press, 1987 [1980].' },
  anderson: { cite: 'Anderson, M. P., D. J. Srolovitz, G. S. Grest, and P. S. Sahni. “Computer Simulation of Grain Growth. I. Kinetics.” Acta Metallurgica 32 (1984): 783-91.' },
  antiOedipus: { cite: 'Deleuze, Gilles, and Félix Guattari. Anti-Oedipus: Capitalism and Schizophrenia. Trans. Robert Hurley, Mark Seem, and Helen R. Lane. New York: Viking, 1977 [1972].' },
  beckerDoring: { cite: 'Becker, R., and W. Döring. “Kinetische Behandlung der Keimbildung in übersättigten Dämpfen.” Annalen der Physik 416, no. 8 (1935): 719-52.' },
  bohr: { cite: 'Bohr, Niels. “On the Constitution of Atoms and Molecules.” Philosophical Magazine 26 (1913): 1-25.' },
  boulez: { short: 'Boulez 1963', cite: 'Boulez, Pierre. Boulez on Music Today. Trans. Susan Bradshaw and Richard Rodney Bennett. Cambridge, Mass.: Harvard University Press, 1971 [1963].', atp: '572 n. 4' },
  childe: { short: 'Childe', cite: 'Childe, V. Gordon. The Prehistory of European Civilization. London: Cassell, 1962. (As cited in ATP.)', atp: '562 n. 96' },
  chladni: { short: 'Chladni 1787', cite: 'Chladni, Ernst Florens Friedrich. Entdeckungen über die Theorie des Klanges. Leipzig: Weidmanns Erben und Reich, 1787.' },
  clastres: { short: 'Clastres 1974', cite: 'Clastres, Pierre. Society against the State. Trans. Robert Hurley. New York: Urizen, 1977 [1974].', atp: '553 n. 12' },
  faraday: { cite: 'Faraday, Michael. “On a Peculiar Class of Acoustical Figures.” Philosophical Transactions of the Royal Society 121 (1831): 299-340.' },
  karman: { cite: 'Kármán, Theodore von. “Über den Mechanismus des Widerstandes, den ein bewegter Körper in einer Flüssigkeit erfährt.” Nachrichten der Gesellschaft der Wissenschaften zu Göttingen (1911): 509-17.' },
  kirchhoff: { cite: 'Kirchhoff, Gustav. “Über das Gleichgewicht und die Bewegung einer elastischen Scheibe.” Journal für die reine und angewandte Mathematik 40 (1850): 51-88.' },
  leeYang: { cite: 'Lee, T. D., and C. N. Yang. “Statistical Theory of Equations of State and Phase Transitions. II. Lattice Gas and Ising Model.” Physical Review 87 (1952): 410-19.' },
  lucretius: { short: 'Lucretius', cite: 'Lucretius. De rerum natura, book 2, lines 216-93 (the swerve).' },
  marcuse: { cite: 'Marcuse, Herbert. Eros and Civilization. Boston: Beacon, 1955.' },
  metropolis: { cite: 'Metropolis, N., A. W. Rosenbluth, M. N. Rosenbluth, A. H. Teller, and E. Teller. “Equation of State Calculations by Fast Computing Machines.” Journal of Chemical Physics 21 (1953): 1087-92.' },
  newton: { short: 'Newton 1687', cite: 'Newton, Isaac. Philosophiæ Naturalis Principia Mathematica. London, 1687.' },
  onsager: { cite: 'Onsager, Lars. “Crystal Statistics. I. A Two-Dimensional Model with an Order-Disorder Transition.” Physical Review 65 (1944): 117-49.' },
  reynolds: { cite: 'Reynolds, Osborne. “An Experimental Investigation of the Circumstances Which Determine Whether the Motion of Water Shall Be Direct or Sinuous.” Philosophical Transactions of the Royal Society 174 (1883): 935-82.' },
  serres: { short: 'Serres 1977', cite: 'Serres, Michel. La naissance de la physique dans le texte de Lucrèce: Fleuves et turbulences. Paris: Minuit, 1977. Trans. Jack Hawkes as The Birth of Physics (Manchester: Clinamen, 2000).', atp: '553 nn. 16-19' },
  simondon1958: { short: 'Simondon 1958', cite: 'Simondon, Gilbert. Du mode d’existence des objets techniques. Paris: Aubier, 1958.', atp: '562 n. 92' },
  simondon1964: { short: 'Simondon 1964', cite: 'Simondon, Gilbert. L’individu et sa genèse physico-biologique. Paris: PUF, 1964.', atp: '555 n. 33, 562 n. 93' },
  volmerWeber: { cite: 'Volmer, M., and A. Weber. “Keimbildung in übersättigten Gebilden.” Zeitschrift für physikalische Chemie 119 (1926): 277-301.' },
  wittfogel: { short: 'Wittfogel 1957', cite: 'Wittfogel, Karl. Oriental Despotism: A Comparative Study of Total Power. New Haven: Yale University Press, 1957.', atp: '565 n. 9' },
  carney: { cite: 'Carney, Judith A., and Richard Nicholas Rosomoff. In the Shadow of Slavery: Africa’s Botanical Legacy in the Atlantic World. Berkeley: University of California Press, 2009.' },
  fedkiw: { cite: 'Fedkiw, Ronald, Jos Stam, and Henrik Wann Jensen. “Visual Simulation of Smoke.” Proceedings of SIGGRAPH 2001: 15-22.' },
  helmholtz: { cite: 'Helmholtz, Hermann von. “Über discontinuirliche Flüssigkeits-Bewegungen.” Monatsberichte der Königlichen Preussischen Akademie der Wissenschaften zu Berlin (1868): 215-28.' },
  kelvin: { cite: 'Thomson, William (Lord Kelvin). “Hydrokinetic Solutions and Observations.” Philosophical Magazine 42 (1871): 362-77.' },
  raymond: { cite: 'Raymond, James A., and Arthur L. DeVries. “Adsorption Inhibition as a Mechanism of Freezing Resistance in Polar Fishes.” Proceedings of the National Academy of Sciences 74 (1977): 2589-93.' },
  selle: { cite: 'Selle, Andrew, Ronald Fedkiw, ByungMoon Kim, Yingjie Liu, and Jarek Rossignac. “An Unconditionally Stable MacCormack Method.” Journal of Scientific Computing 35 (2008): 350-71.' },
  shields: { cite: 'Shields, Albert. Anwendung der Ähnlichkeitsmechanik und der Turbulenzforschung auf die Geschiebebewegung. Berlin: Preussische Versuchsanstalt für Wasserbau und Schiffbau, 1936.' },
  stam: { cite: 'Stam, Jos. “Stable Fluids.” Proceedings of SIGGRAPH 1999: 121-28.' },
};
