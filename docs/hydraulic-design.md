# Hydraulic model: design draft

For Jo to mark up before any code. Oct 17, 2026. Pages are to the Minnesota ATP.

## What ATP means by the hydraulic model

It is a contrast between two sciences of flow, held in one field.

- **Nomad science** "uses a hydraulic model" (361). It goes from the clinamen, "the smallest angle by which an atom deviates from a straight path," to vortices, "from turba to turbo" (361), and it is "distributed by turbulence across a smooth space, in producing a movement that holds space and simultaneously affects all of its points" (363).
- **State science** needs hydraulics too, but it subordinates "hydraulic force to conduits, pipes, embankments, which prevent turbulence, which constrain movement to go from one point to another" (363). "Gravity, gravitas, such is the essence of the State" (386).
- **The relation never settles.** Royal science "continually appropriates the contents of vague or nomad science while nomad science continually cuts the contents of royal science loose. At the limit, all that counts is the constantly shifting borderline" (367).

Its scene is the sea: "the hydraulic model par excellence," yet "the first one attempts were made to striate" (387). Navigation began as "a complex and empirical nomadic system ... based on the wind and noise, the colors and sounds of the seas" (479), and striation "progressively took hold" through bearings, latitude, longitude, and the map's grid (479). Striation then reimparted smooth space: "the multiplication of relative movements ... ended up reconstituting a smooth space," the fleet in being, which "holds space beginning from any point" (387, 480). And flows turn: China "saw its commercial flows turn against it and ally themselves with piracy" (386). ATP calls these "two nonsymmetrical movements, one of which striates the smooth, and one of which reimparts smooth space on the basis of the striated" (480).

ATP gives the model its tempo as well: "measured, cadenced rhythm, relating to the coursing of a river between its banks," and "a rhythm without measure, which relates to the upswell of a flow" (364).

Warding off is not part of ATP's hydraulic model, so in this model it is our extension, and the screen says so.

## Scene

An open sea seen as a navigation chart, with a coast along the bottom and left edges and small landings on the shore. Real currents and eddies come from the existing fluid solver. Nothing is drawn as a blob: each process is a kind of line.

## Three processes, three kinds of line

| Process | Line and figure | What it does | ATP |
|---|---|---|---|
| Capture | Straight lines: meridians and parallels drawn in region by region, lanes from port to port, convoys (small cyan hulls) | Grids the sea at a measured pace, opens lanes in gridded water, runs convoys on a fixed schedule that carry cargo to the main port, whose stock grows | 362, 363, 386, 387, 479 |
| War machine | Spirals: vessels (magenta) that ride eddies and hold space from any point | Arises from the lanes themselves: the more lanes and traffic, the more commercial flows turn into a fleet in being. Where it holds, convoys are taken and the grid fades | 361, 363, 386, 387, 480 |
| Warding off (our extension) | Short, overlapping segments: small hops (yellow) between coastal landings, never converging | As the main port's stock nears the threshold, the coastal circuits draw cargo off into many small landings and use it up there, so the port never becomes the center | 209, 357, 433, 440 |

ATP's own terms for warding off here: "an itinerant territoriality based on local, overlapping divisions" (209), the mechanisms that keep power formations "from resonating together in a higher point and from becoming polarized at a common point" (433), and depletion of the stock (440).

## The cycle, which should never settle

1. Smooth sea: vessels move with the swell and eddies.
2. Striation spreads: the grid extends, lanes open, convoys keep time, and the port's stock rises.
3. Warding off holds the threshold at a distance: as the stock nears it, the coastal circuits disperse and deplete the cargo.
4. The multiplied lanes breed the fleet in being. Convoys are taken, lanes fall out of use, and the grid fades where the fleet holds (smooth reimparted).
5. With the lanes gone the fleet has nothing to feed on and disperses, and the State grids again.

Each response lags behind its cause (lanes take time to breed a fleet, a fleet takes time to starve, the grid takes time to redraw), and lags are what keep it from settling. I would test in Node that conflict cycles with no permanent winner before showing you.

## Tempo

Two rhythms on screen at once, as in 364. Capture keeps measured time: convoys leave on a fixed beat, shown as a small metronome in the narrator strip. The war machine follows the swell: unmeasured, irregular, slow. Cycles of a minute or more, with no event faster than the swell.

## Physics, and what is ours

- Real: the currents and eddies (the fluid solver), and vessels that move by their own speed through the water plus the current's drift. Convoys must steer against the drift to hold a lane, while the fleet rides it.
- Ours: the rates at which grids, lanes, fleets, and circuits respond to each other, and warding off as a whole. The Sources panel would say so line by line.

## Decisions (Jo, Oct 17, 2026)

1. Warding off: the coastal circuits, kept as simple and as clear as possible. Nothing that muddies the image of thought.
2. The State taking over the fleet in being: not now.
3. Narrator: social terms first, with brief chart terms where they help (for example, "fixes routes (lanes)").
