// Works cited in the visualizer. Where A Thousand Plateaus cites a work, `atp` gives the page of its note.

export interface Work {
  cite: string;
  short?: string;
  atp?: string;
}

export const BIBLIOGRAPHY: Record<string, Work> = {
  atp: { cite: 'Deleuze, Gilles, and Félix Guattari. A Thousand Plateaus: Capitalism and Schizophrenia. Trans. Brian Massumi. Minneapolis: University of Minnesota Press, 1987 [1980].' },
  anderson: { cite: 'Anderson, M. P., D. J. Srolovitz, G. S. Grest, and P. S. Sahni. “Computer Simulation of Grain Growth. I. Kinetics.” Acta Metallurgica 32 (1984): 783-91.' },
  beckerDoring: { cite: 'Becker, R., and W. Döring. “Kinetische Behandlung der Keimbildung in übersättigten Dämpfen.” Annalen der Physik 416, no. 8 (1935): 719-52.' },
  bohr: { cite: 'Bohr, Niels. “On the Constitution of Atoms and Molecules.” Philosophical Magazine 26 (1913): 1-25.' },
  boulez: { short: 'Boulez 1963', cite: 'Boulez, Pierre. Boulez on Music Today. Trans. Susan Bradshaw and Richard Rodney Bennett. Cambridge, Mass.: Harvard University Press, 1971 [1963].', atp: '572 n. 4' },
  childe: { short: 'Childe', cite: 'Childe, V. Gordon. The Prehistory of European Civilization. London: Cassell, 1962. (As cited in Plateaus.)', atp: '562 n. 96' },
  clastres: { short: 'Clastres 1974', cite: 'Clastres, Pierre. Society against the State. Trans. Robert Hurley. New York: Urizen, 1977 [1974].', atp: '553 n. 12' },
  leeYang: { cite: 'Lee, T. D., and C. N. Yang. “Statistical Theory of Equations of State and Phase Transitions. II. Lattice Gas and Ising Model.” Physical Review 87 (1952): 410-19.' },
  lucretius: { short: 'Lucretius', cite: 'Lucretius. De rerum natura, book 2, lines 216-93 (the swerve).' },
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
  raymond: { cite: 'Raymond, James A., and Arthur L. DeVries. “Adsorption Inhibition as a Mechanism of Freezing Resistance in Polar Fishes.” Proceedings of the National Academy of Sciences 74 (1977): 2589-93.' },
  selle: { cite: 'Selle, Andrew, Ronald Fedkiw, ByungMoon Kim, Yingjie Liu, and Jarek Rossignac. “An Unconditionally Stable MacCormack Method.” Journal of Scientific Computing 35 (2008): 350-71.' },
  stam: { cite: 'Stam, Jos. “Stable Fluids.” Proceedings of SIGGRAPH 1999: 121-28.' },
  benard: { cite: 'Bénard, Henri. “Les tourbillons cellulaires dans une nappe liquide.” Revue générale des sciences pures et appliquées 11 (1900): 1261-71, 1309-28.' },
  rayleigh: { cite: 'Rayleigh, Lord (John William Strutt). “On Convection Currents in a Horizontal Layer of Fluid, When the Higher Temperature Is on the Under Side.” Philosophical Magazine, 6th ser., 32 (1916): 529-46.' },
  uhlenbeck: { cite: 'Uhlenbeck, G. E., and L. S. Ornstein. “On the Theory of the Brownian Motion.” Physical Review 36 (1930): 823-41.' },
  meunier: { short: 'Meunier 1977', cite: 'Meunier, Jacques. Les gamins de Bogota. Paris: Lattès, 1977. (As cited in Plateaus.)', atp: '553 n. 13' },
  querrien: { short: 'Querrien', cite: 'Querrien, Anne. Devenir fonctionnaire ou le travail de l’État. Paris: Cerfi, n.d. (As cited in Plateaus.)', atp: '554 n. 26' },
  pantaleone: { cite: 'Pantaleone, James. “Synchronization of Metronomes.” American Journal of Physics 70 (2002): 992-1000.' },
  bennett: { cite: 'Bennett, Matthew, Michael F. Schatz, Heidi Rockwood, and Kurt Wiesenfeld. “Huygens’s Clocks.” Proceedings of the Royal Society of London A 458 (2002): 563-79.' },
  kuramoto: { cite: 'Kuramoto, Yoshiki. Chemical Oscillations, Waves, and Turbulence. Berlin: Springer, 1984.' },
  strogatz: { cite: 'Strogatz, Steven H. “From Kuramoto to Crawford: Exploring the Onset of Synchronization in Populations of Coupled Oscillators.” Physica D 143 (2000): 1-20.' },
  canetti: { short: 'Canetti 1960', cite: 'Canetti, Elias. Crowds and Power. Trans. Carol Stewart. New York: Viking, 1963 [1960].', atp: '521 n. 5' },
};
