# How to build a model

Distilled from the hydraulic rebuild (October 2026), which took about a dozen rounds of correction to reach a version Jo liked. Each rule below records a correction from those rounds, so that acoustic and cosmic can reach the same place in fewer.

To start a model, the prompt is: **"Rebuild the [acoustic | cosmic] model following docs/MODEL-PROCESS.md. Do step 1 and stop at the gate."**

## What every model must do (standing requirements)

- **A material world.** Each model is nomadology in a world where everything is one material: crystalline (metallurgic), liquid (hydraulic), acoustic, gravitational or celerity (cosmic). All three processes are behaviors of that one material.
- **The three terms, always:** capture, war machine, warding off. Polarization (the town) does not replace any of them. It enters only as a separate, labeled extra.
- **Conflict comes first and cycles.** Conflict is the opening mode. Over time each process takes the lead and expresses its phenomenon, and none wins for good. The other modes isolate one process each, and an isolated mode should show its process clearly dominant (around 80% or more).
- **Interplay, not a switch.** The processes contest the space at the same time, with two or three of them visible at once, rather than the whole field flipping from one state to another.
- **Pace.** Nothing frenetic, and nothing that arrives all at once. Bands are small, States are large.
- **Unique to the material.** Each model has to look and move like its own physics. Metallurgic already looks like a weather map of clouds, so no other model should.
- **Abstract.** A field of marks across the whole canvas, as in metallurgic. No drawn apparatus (trays, heaters, arrows), and no landscape or water management that invites a literal reading.

## Step 1. Concept to physics (stop at the gate)

1. **Start from what each term does in *Plateaus*, not from the words it uses.** Warding off acts before a threshold and keeps it at a distance, through dispersal and segmentarity (357, 433, 440). Capture striates and stocks, carrying movement from one point to another (363, 370, 385-86). The war machine holds smooth space through turbulence, vortex, speed, and the swerve (361, 363, 371).
2. **Find the basic-physics behavior of the material that performs each function**, the way it would be set up in a physics class: one experiment, with no agents unless they clarify. Hydraulic ended up as laminar flow, convection cells, and turbulence in one heated channel.
3. **Check *Plateaus* for vocabulary clashes, but do not require it to name the physics.** Diffusion was rejected for warding off because *Plateaus* uses "diffusion" for encompassment (435). Convection cells were accepted, though *Plateaus* never mentions them, because they perform the function. *Plateaus* is not a physics text.
4. **Name the stake: what each process wants, visibly.** Hydraulic found its stake last, though it should come first. In metallurgic, the State wants a stock that grows, which the others erode or carve. In hydraulic, the stake is where the flow goes: capture carries the dye to the far point, warding off holds it in circles, the war machine scatters it everywhere. Without a stake, colors only compete for screen area, and nobody can tell what is at issue.
5. **Name the concrete social content from *Plateaus*.** Every abstract term needs a who and a what, with institutions. Metallurgic has the granary, the land register, Clastres's chiefs, and itinerant smiths. Hydraulic has labor (368): the corvée, guilds, bands that work for themselves, journeymen's compagnonnages. "Flows of people and goods," "routes," and "unrest" were all too general.
6. **The gate.** Bring Jo a short proposal: the experiment, each term's physics and its stake, the social content, plus any clashes found. Give two or three options with a recommendation. Build nothing until Jo chooses.

## Step 2. Physics prototype, measured in Node

- **Put the physics in `src/sim/`, with type-only imports** so Node's strip-types mode can run it. Write a scratch test that drives it with no canvas.
- **Measure, don't eyeball.** Who leads, and what share of the time. The number of lead changes. The mean and spread of each process's share, where smaller swings mean more interplay. How many processes are present at once. Run long and repeat the run, since a single run can mislead (one hydraulic setting gave capture 63% in one run and 23% in another).
- **Drive the experiment the way a physicist would for that material.** The forcing should be uneven in timing and strength, as with log-normal Ornstein-Uhlenbeck surges and heaters that drift. *Plateaus*'s nomad rhythm is "a rhythm without measure" (364), so a metronome pulse belongs to the State.
- **Spatial unevenness creates interplay.** A uniform forcing makes the whole field switch at once.
- **Read each process from the physics itself.** Classify regimes from the state of the field (hydraulic's `Regimes`). Do not color by rule.
- **Check each isolated mode** for clear dominance, and check for side effects like a fixed left-right sorting that would read as territory.

## Step 3. Visual

- **The stake gets a visible object**, such as a stock that grows or a front that advances and retreats. A dim field of the processes runs underneath and bright stake marks go on top, as with hydraulic's dye over the field.
- **Color is process:** cyan for capture, magenta for the war machine, yellow for warding off. Same-color marks should never mean two things.
- **Screenshot every mode headlessly**, then look at each one before calling it done.

## Step 4. Language

- **Narrator:** in conflict, it says who is gaining on whom, a separate caption for each of the six pairings, plus "holds" captions and a mixture caption. Each caption has a concrete social sentence, the physics in parentheses, and a quoted passage on the second line. Captions change no faster than every few seconds.
- **Tags:** short and concrete, the *Plateaus* concept plus who or what, with no page numbers on the canvas. A lost-state tag says what happened and why, read from the physics (a band's labor drafted onto the works, or its members gone off as journeymen). Never a bare verdict like "this pack settled."
- **Legend:** what you see = the social reading. Then the physics. Then the passage with its page. Then a concrete example.
- **Citations:** "(*Plateaus*: 363)" for the first citation in a paragraph and bare page numbers after it. The book's title is always italic and "ATP" is never displayed.
- **Jo's voice:**
  - no sentence-final prepositions or particles ("wear it down" becomes "wear down the stock")
  - no semicolons or dashes outside quotations
  - no aphoristic kickers ("Once a stock forms, it grows.")
  - no clumsy possessives ("Plateaus’ figure")
  - "cf. X" or "citing X," never "after X"
  - no LLM-speak ("owing none to a center," "off every assigned channel")
  - vary clause joins instead of chaining ", and the"
  - card openers are colon definitions ("The conduit: ...")
- **Checks:** `npm run check:atp` (every quotation must match the text), then `python3 ~/Downloads/protevi-response/tools/voice_lint.py` on the extracted strings. The linter's rhythm measures are calibrated on essays, so for labels, act on the rule failures (prepositions, chaining, dashes).

## Step 5. Tags (shared machinery, now in `src/sim/tags.ts`)

- **Anything that moves gets a `StickyTag`:** two-stage smoothing, sticky placement, boxes that glide, loss reports no longer than half the label's time on screen, and a fade before picking a new feature. Do not call `drawTag` every frame on a target that jumps, such as "the hottest spot."
- **Follow a region, not a single cell.** Use a neighborhood share with some tolerance, so flicker does not end a tag.
- **Pick new features in the upper part of the canvas**, clear of the legend at the bottom left.
- **Tag only what each mode stages.** At most one tag of each kind, and different kinds of one process can show together.

## Step 6. Sources panel

Rewrite `src/content/<model>.ts` across the four tiers: the passage with pages, the borrowed sources (cf.), the real physics with KaTeX, and where they part ways. Add any new works to the bibliography. Hydraulic's panel is still pending.

## Step 7. Ship to Jo

Commit on a branch, push, and give Jo the localhost link, with a reminder to press play. Report the measurements and what is still unresolved. Do not merge to `main`.

## What went wrong on hydraulic, in order

- **Too abstract.** A fluid solver whose floods and eroding embankments meant nothing socially.
- **Then too literal.** Flood and dike read as water management.
- **Labels described the model, not the society.** Then they were stuck on metaphysics ("what is turbulence in a State's conduit meant to mean?").
- **Polarization swapped in for warding off.** These are the wrong terms. The pace was frenetic and the war machine arrived all at once.
- **A sea chart with rule-driven agents.** "This does not look like basic physics anymore."
- **A drawn apparatus (tray, heater, arrows).** Too literal again.
- **Whole-field switching.** It was fixed by heating unevenly in space.
- **No visible stake.** It was fixed by the dye.
- **Labels too general, then too abstract, then LLM-speak.** Fixed with the labor content from 368.
- **Lost tags with no context, and twitchy tags.** Fixed in the shared tag code.

Most of these could have been avoided by doing step 1 in full, the stake and the social content included, before building.

## Starting notes for the remaining models

These come from `docs/WORKPLAN.md`, Phases 5 and 6, which predate the rules above. Those phases stage the town and leave out warding off, so step 1 has to re-decide them.

- **Acoustic.** In *Plateaus*, the acoustic model is Boulez's pulsed and non-pulsed time: striated time counts in order to occupy, and smooth time occupies without counting (477-78). Resonance is the State's, "a redundancy of resonance" (433), and frequency belongs to the town (433-34). The current Chladni plate does not stage time, and its "silence zones" are random noise rather than interference. Open questions: what warding off is in a world of sound, and what the social content is (music, work rhythm, the drill, the march, the calendar).
- **Cosmic.** Gravity is royal science's "law of all laws" (370), the parallel fall that striates. The war machine is the clinamen, the minimal swerve that makes vortices (361, 489-90, cf. Serres, Lucretius), and celerity against gravitas (371). The current orbital shells and random "takeover" are not Newtonian. Open questions: what warding off is in a world of weight and speed, and what the social content is.
