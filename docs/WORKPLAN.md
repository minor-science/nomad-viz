# Nomadology Visualizer: work plan

Repo: github.com/minor-science/nomad-viz (private until Phase 0 ends). Drafted Oct 17, 2026.

## Aim

Show nomadology as an approach: a few machinic processes, tested against how matter actually behaves. The main readers are researchers and readers of *A Thousand Plateaus* (ATP). Teaching use is secondary. It should also stand on its own as an art piece and as an instrument you can play with. Each model separates three things and labels each one:

1. What Deleuze and Guattari write, quoted with Minnesota page numbers.
2. What they borrow and from whom, marked "cf."
3. What the physics actually says, with real equations, and where it parts ways with them.

Deleuze and Guattari were not scientists. Where their physics is loose or backwards, the visualizer should say so and not hide it.

## Principles for the build

- Each model stages only the processes its physics can carry honestly. A shared five-process key (the charts' colors and order) shows which processes are present, and gives one line on why the others are absent.
- No particle belongs to a fixed team. A particle's behavior comes from the fields it is in.
- **Conflict mode cycles.** Over repeated cycles, each process expresses the phenomenon ATP describes, and none takes over for good: the model goes back and forth between states and mixtures. Every model opens in conflict mode, and the other modes isolate one process. A rebuild is not done until a test shows repeated episodes with no permanent winner (Jo, Oct 17, 2026).
- Every behavior on screen traces back to an ATP passage, a named source, or a physics model, and the sources panel says which.
- All prose follows the house rules used for the charts. It goes through `voice_lint.py`, and every ATP page is checked against the ATP text in `protevi-response/sources_text/core/`.

## Phases

Size: S is about a session, M two or three, L four or more. Each phase ends in a local commit. I push only when you say.

### Phase 0. Repo hygiene and going public (S)
- Remove the AI Studio leftovers: `@google/genai`, `express`, `dotenv`, `.env.example`, `metadata.json`, the AI Studio README banner, and the garbled comment in `vite.config.ts`.
- Add `LICENSE` (code) and `LICENSE-content` (text). Add `CITATION.cff` naming Andrew Culp, with ORCID if you have one.
- Rewrite the README: what this is, how to run it, how to cite it.
- Add a GitHub Action that runs `tsc` and `vite build` on each push.
- **Decide:** the licenses (I suggest MIT or Apache-2.0 for code and CC BY 4.0 for text), and when the repo goes public.

### Phase 1. Shared architecture (M)
The four model files repeat about 500 lines of identical UI each. Before any model is rebuilt:
- A `ModelShell` component for the header, play/pause, the sources button, the controls drawer, and the footer cards.
- A `Simulation` interface (`init`, `step`, `draw`, `params`), so each model holds physics only.
- `processes.ts`: one registry of the five processes (plus marronage, tentative), with chart colors, ATP labels, and page references.
- URL state (`?model=metallurgic&mode=coexist&...`), so a configuration can be cited or shared.
- Canvas scaled correctly on high-resolution screens, reduced motion that actually pauses, and explanation cards on phones.
- Fixes for the known bugs: the undefined `brutal-shadow-lg`, the acoustic zone drawn at a different size from where it acts, and the duplicate `mode-label` ids.

### Phase 2. Sources layer and text (M)
- Replace the "Technical Manual" with a **Sources** panel that has four tiers per model: ATP passage, borrowed source (cf.), physics with equations (rendered with KaTeX), and where they diverge.
- Content lives in `src/content/<model>.ts` as data, not markup, so it can be checked and reused.
- Remove the fabricated quotation in the info modal. Remove terms that aren't ATP's, or label their real source: "superfluidity," "Great Refusal" (Marcuse), "Despotic Machine" (*Anti-Oedipus*), "centripetal machine."
- Rename "Non-State" to "Warding off," to match the charts.
- Add a bibliography page.
- A script that pulls every ATP page cited in `src/content/` and prints the passage, for checking.
- **Decide:** whether "Select Metaphysics" and "Metaphysics" in the model titles stay.

### Phase 3. Metallurgic: nucleation and the smith (L)
This is the strongest model, so it goes first. ATP itself describes State formation as crystallization (357, 429, 433).
- **Physics:** a lattice-gas Monte Carlo (Metropolis), with supersaturation and temperature as controls. Clusters below the critical size r* = 2γ/|Δg_v| dissolve, and those above it grow (classical nucleation theory).
- **Warding off:** keeps every cluster below r*, by depletion and dispersal before the threshold. This is ATP's limit and threshold, "the last" (438-41).
- **Capture:** a cluster crosses r* and the lattice spreads.
- **The smith:** follows the material's own singularities (grain boundaries, cast vs. forged, quenched vs. annealed, 406), set against the mold's hylomorphism (cf. Simondon, 408-10). Holey space (413-15).
- **Readouts:** largest cluster size against r*, and number of nuclei.
- **Sources:** ATP 357, 404-15, 429, 433, 438-41. Simondon, *L'individuation* (the crystal as the paradigm of individuation). A textbook account of nucleation theory.
- **Divergence note:** ATP's "crystallization" of the State is a metaphor for a threshold. The model makes that threshold literal, which is a choice we make, not ATP.

### Phase 4. Hydraulic: a real fluid (L)
- **Physics:** Stam's "Stable Fluids" (1999) grid solver. Viscosity and inflow speed set the Reynolds number Re = ρvL/μ.
- **Capture:** channels and embankments keep Re low and the flow laminar, "conduits, pipes, embankments, which prevent turbulence" (363, cf. Wittfogel).
- **War machine:** turbulence and vortices that hold space (361-63, cf. Serres on Lucretius).
- **Town:** a circuit of sources and sinks, entry and exit (432).
- **Fix:** obstacles shedding vortices (a Kármán street) are real physics, but they produce turbulence. They are not warding off, and will be labeled as such.
- **Divergence note:** real turbulence is three-dimensional, and this 2D solver smooths it out. The transition point on screen is qualitative.

### Phase 5. Acoustic: from Chladni to Boulez (M-L)
- Keep the Chladni plate, labeled "cf. Chladni, not ATP." The physics: the formula is a standard approximation of plate modes, and sand gathers on the nodal lines.
- Add Boulez's pulsed vs. non-pulsed time and temperament as striation (477-78). This needs a time view, such as a scrolling score or sequencer. Sound is optional and plays only after a user gesture.
- **Capture:** resonance, a standing wave in a closed body.
- **Town:** frequency, repetition across a network of nodes, melodic lines against harmonic cross sections (433-34).
- Remove "silence zones" built from random noise. Destructive interference needs phase, so if it stays, it has to be modeled that way.
- **Sources:** ATP 362, 433-34, 477-78. Boulez, *Boulez on Music Today*.

### Phase 6. Gravity: fall and swerve (M)
Replaces "Cosmic."
- **Capture:** atoms in parallel fall, "the verticals of gravity... the lamellar and laminar movement of flows" (370).
- **War machine:** the clinamen, a minimal swerve that produces collisions and vortices (361, 489-90, cf. Serres, and Lucretius, *De rerum natura* 2.216-93).
- A second view gives correct Newtonian two-body orbits. It shows that capture needs a third body or some energy loss, a physics point the current fake orbital shells hide.
- Remove the 50px orbital shells and the random "takeover."

### Phase 7. Coexistence mode (M)
Replaces "Conflict."
- Every particle moves under all the fields at once.
- An event log and a small time chart show what passes between processes: capture appropriating the war machine (419, 437), warding off holding a threshold, escape.
- Text from ATP 435-37 ("extrinsically and intrinsically").

### Phase 8. The five-process view (M, decide after Phase 7)
- A non-physical network view of the five processes, with formations as nodes and encompassment as flows crossing between them (435-36). It links to the charts.
- Build it only if Phases 3-7 show that a physics model cannot stage encompassment clearly.

### Phase 9. Marronage (S-M, optional)
- A tentative overlay in the coexistence or network view: Protevi's "neither smooth nor striated" zone (RoV 104), marked as Protevi's and as tentative, as on the back of the handout.
- **Decide:** whether the visualizer takes this on at all, or leaves Protevi to the essay.

### Phase 10. Accessibility and mobile (S)
- Text alternatives that describe the current state of the simulation, not only its name.
- Colors checked for color-blind readers, and keyboard access for every control.
- When reduced motion is on, show a still frame plus the readouts.

### Phase 11. Publication and archiving (S)
- Make the repo public. Keep Vercel and add GitHub Pages as a mirror.
- Connect Zenodo and tag v1.0, which gives an archived DOI.
- Add a social preview image and a changelog.
- Link both ways between the visualizer, the charts, and the essay.

## Order and dependencies

Phase 0 → 1 → 2 (2 can start alongside 1) → 3 → 4 → 5 → 6 → 7 → decide on 8 and 9 → 10 → 11.

Phases 3-6 each need Phase 1's shell. Phase 2's sources panel gets filled in as each model is rebuilt.

## Checks at every phase

- `tsc` and `vite build` pass.
- Headless Chrome screenshots at desktop and phone widths.
- Each ATP page cited is checked against the ATP text.
- Prose passes `voice_lint.py`.
- Physics claims point to a named source. Where the model simplifies, the sources panel says so.

## Decisions waiting on Jo

1. Licenses, and when the repo goes public (Phase 0).
2. Whether to keep "Metaphysics" in the titles (Phase 2).
3. Whether to add the five-process network view (after Phase 7).
4. Whether to include marronage (Phase 9).
