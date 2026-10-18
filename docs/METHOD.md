# Method

How a model in the Nomadology Visualizer is designed, tested, and written. These are the rules each of the four models now follows, learned in rebuilding them, and the rules a new model would follow too.

## What every model does

- **One material.** Each model asks what nomadology would look like in a world made of one material: crystals, a liquid, sound, gravity. All three processes are behaviors of that one material, under one physics.
- **The same three processes.** Capture, the war machine, and warding off, in the same colors (cyan, magenta, yellow). Polarization and encompassment, the book’s other two processes, enter only as separately labeled additions.
- **Conflict comes first, and it cycles.** Every model opens with the processes together. Over time each takes the lead and expresses its phenomenon, and none wins for good. The other modes isolate one process, which should then clearly dominate.
- **Interplay, not a switch.** The processes contest the field at the same time, two or three visible at once, rather than the whole field flipping from one state to another.
- **Unequal relations.** The processes are not three teams fighting over one prize. In *A Thousand Plateaus* the State appropriates, the war machine included (418-20). The war machine’s object is smooth space and the raid, so it meets the State in war only on contact (417). Warding off keeps a threshold at a distance (440). Each process therefore has its own movement, its own purpose, and its own stake on screen.
- **Lines of flight.** Any element can pass into another. A captured war machine deserts, a society that wards off the State hardens into one or throws off a war machine of its own. Each crossing needs a physical mechanism and a visible mark of its origin.
- **A calm pace and an abstract look.** Nothing frenetic, nothing that arrives all at once, and no drawn apparatus or landscape that invites a literal reading. Each model should look and move like its own physics, not like the others.

## Step 1. From concept to physics

1. **Start from what each process does in the book, not from the words it uses.** Warding off acts before a threshold and keeps it at a distance, through dispersal and segmentarity (357, 433, 440). Capture striates and stocks, carrying movement from one point to another (363, 370, 385-86). The war machine holds smooth space by turbulence, vortex, speed, and the swerve (361, 363, 371).
2. **Find the basic physics of the material that performs each function,** the way it would be set up in a physics class: one experiment, with no agents unless they clarify.
3. **Check the book for clashes of vocabulary, but do not require it to name the physics.** Diffusion was rejected for warding off in the liquid world because the book uses “diffusion” for encompassment (435). Convection cells were accepted, though the book never mentions them, because they perform the function.
4. **Name the stake,** what each process visibly wants. Without a stake, colors only compete for screen area and nobody can tell what is at issue.
5. **Name the concrete social content,** with institutions, drawn from the book: the granary and the land register, the corvée and the guilds, the church bell, the capital city’s gates. General phrases like “flows of people and goods” say too little.
6. **Give each model its own actors.** Clans (metallurgic), households (hydraulic), villages (acoustic), and societies (cosmic) all ward off the State, but one word across all four would blur them. Quotations keep the book’s own words.
7. **Read beyond the nomadology plateau.** “Micropolitics and Segmentarity” is where resonance and centers of power are worked out (208-31). It also ruled out a design: opposing segments “two by two” is the State’s overcoding (223), so pairs locked in opposite phase could not stand for warding off.
8. **Name things so they cannot be misread.** In a book about capitalism, “the capital” reads as money, so the cosmic model says “the capital city.”

## Step 2. A prototype, measured

- **The physics lives in `src/sim/`,** so that it can run without a browser.
- **Measure, do not eyeball.** Which process leads and for what share of the time, how often the lead changes, the mean and spread of each process’s share, and how many processes are present at once. Run long, and run again, since a single run can mislead. `npm run sim` runs any model headless through its own narrator for this purpose.
- **Drive the experiment as a physicist would for that material.** Forcing should be uneven in timing and strength, as with surges drawn from a log-normal Ornstein-Uhlenbeck process. The book’s nomad rhythm is “a rhythm without measure” (364), so a steady pulse belongs to the State.
- **Uneven forcing in space makes interplay.** A uniform forcing makes the whole field switch at once.
- **Read each process from the physics.** Each spot of the field is classified from its own state (how it moves, what holds it), not colored by a rule.

## Step 3. The picture

- **The stake gets a visible object:** a stock that grows, a front that advances and retreats, a center that swells.
- **Color means process,** and a color never means two things in one model.
- **Every mode is screenshotted** at desktop and phone sizes and looked at before a model is called done.

## Step 4. The words

- **The narrator** reports what is happening in social terms, with the physics in parentheses and a passage from the book on its second line. Captions change no faster than every few seconds.
- **Labels on the canvas** are short and concrete. When a feature disappears, its label says what became of it, read from the physics (a band’s labor drafted onto the works, or its members gone off as journeymen), never a bare verdict.
- **The legend** gives what you see and its social reading. The physics and the passages are in Sources.
- **Citations** read “(*Plateaus*: 363)” at the first citation in a paragraph and bare page numbers after it, with the title in italics.
- **Every quotation is checked** against the text of the book by `npm run check:atp`.
- **Plain prose.** No sentence-final prepositions, no semicolons or dashes outside quotations, no aphoristic closing lines, and “cf. X” or “citing X” for a source.

## Step 5. Sources

Each model’s Sources panel (`src/content/<model>.ts`) has four parts: what the book says, with pages, then what it borrows and from whom, then the physics, with the equations the code runs and a plain account of what the code computes, and last, where they part ways, both where the model departs from the book and where the book departs from physics. Every work cited goes in `src/content/bibliography.ts`.
