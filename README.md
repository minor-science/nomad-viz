# Nomadology Visualizer

Interactive physical models of the machinic processes in Gilles Deleuze and Félix Guattari's *A Thousand Plateaus* (1980). In the "Treatise on Nomadology" and "Apparatus of Capture" plateaus, they describe capture, the war machine, and warding off the State in physical terms (laminar and turbulent flow, crystallization, resonance, the fall of bodies under gravity). The visualizer takes those terms at their word and runs them as simulations, so that each process can be watched, varied, and compared.

Deleuze and Guattari were not scientists, so their physics is sometimes loose or borrowed secondhand (from Michel Serres on Lucretius, Gilbert Simondon on molding, Pierre Boulez on musical time). Each model therefore distinguishes three things: what *A Thousand Plateaus* says (quoted with page numbers from the Minnesota translation), the sources on which it draws, as well as what the physics actually says, including where the two part ways.

For now there are four models (hydraulic, metallurgic, acoustic, cosmic). A rebuild is under way, as described in [docs/WORKPLAN.md](docs/WORKPLAN.md).

## Run it

Requires Node.js 20 or later.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in dist/
```

Since the build is a static site, any host that serves files can run it.

## Cite it

See [CITATION.cff](CITATION.cff). GitHub's "Cite this repository" button gives the same information in APA and BibTeX.

## License

Code is licensed under the [Apache License 2.0](LICENSE), while text and explanatory content are licensed under [CC BY 4.0](LICENSE-content). Quotations from *A Thousand Plateaus* and other works remain under their publishers' copyright.
