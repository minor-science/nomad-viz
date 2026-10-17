import { Magnet, Orbit } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { Orbits, HELD, SOCIETY, COMPANY, ARMY, PETTY, type OrbitParams } from '../sim/orbits';
import { Wobble } from '../sim/heating';
import { beginTags, StickyTag } from '../sim/tags';

// Nomadology in a world where everything is gravity. Underneath is Newtonian gravity around a
// heavy center. The capital is there from the start, a central mass whose closed orbits are its
// order. Societies are small clusters held together by their own gravity, each with its own
// orbits, its own code. A heavy center's tides strip a society that comes too close, and its
// members end up circling the capital (overcoding); the tidal radius is the threshold, and a
// society warned by its tide cools and tightens to keep that threshold outside it (warding off).
// The capital's own crowd slows societies so that they sink toward it (dynamical friction), and
// the more it holds the faster they sink. Companies are heavy units on open paths: one that tears
// through the capital flings its bodies out (war on the State), but the crowd's pull slows it, and
// it may be caught in orbit as the capital's army (appropriation). The three are not rivals for
// one prize: each has its own movement, its own purpose, and a one-way relation to the others.

const W = 160;
const H = 100;
const SPAN = 600;
const PHASE_HOLD = 180;

const CYAN = '#00aeef';
const MAGENTA = '#ec008c';
const YELLOW = '#e0a800';
const GRAY = '#64748b';
const INK = '#f2f2f2';

type Caption = { head: string; sub: string; color: string };
type Event = 'stripped' | 'raid' | 'hardened' | 'born' | 'annexed' | 'scatter' | 'caught' | 'absorbed' | 'formed' | 'tighten';

// The narrator reports events, since the three relate to one another in different ways.
const EVENTS: Record<Event, Caption> = {
  stripped: {
    head: 'CAPTURE · OVERCODING · The capital city’s crowd slows a society until it sinks within reach of the tides, which strip its members into the capital city’s orbits. The society no longer runs on its own code (tidal stripping).',
    sub: 'Capture “contributes to the creation of that which it captures” (Plateaus: 448).',
    color: CYAN,
  },
  raid: {
    head: 'WAR MACHINE · THE RAID · A company falls through the capital city at full speed, flings its bodies out, carries some off as followers, and rides on (a fly-by through the center).',
    sub: '“the raid can be seen as another object, rather than as a particular form of war” (Plateaus: 417).',
    color: MAGENTA,
  },
  hardened: {
    head: 'LINE OF FLIGHT · WARDING OFF HARDENS INTO A STATE · A society tightened its orbits until it collapsed into a center of its own, a small State that draws in what passes close (a cluster collapsing as it cools).',
    sub: '“Special institutions are thus necessary to enable a chief to become a man of State, but diffuse, collective mechanisms are just as necessary to prevent a chief from becoming one” (Plateaus: 357).',
    color: CYAN,
  },
  born: {
    head: 'LINE OF FLIGHT · WARDING OFF GIVES BIRTH TO A WAR MACHINE · A society struck hard flings a group of its members out together, and they ride off as a company of their own (an ejection).',
    sub: 'In the band, a member who leaves “will not leave alone but will take along his allies” (Plateaus: 358).',
    color: MAGENTA,
  },
  annexed: {
    head: 'CAPTURE · ANNEXATION · A small State sinks into the capital city, and its people become the capital city’s, circling it (absorbed into the center’s orbits).',
    sub: 'Each State is “a global (not local) integration” (Plateaus: 433).',
    color: CYAN,
  },
  scatter: {
    head: 'WAR MACHINE · WAR ON THE STATE · A company tears through the capital city, and the bodies held in its orbits are flung out across the field (a gravitational fly-by).',
    sub: 'The war machine finds war as its object “in opposition to the State-form, the destruction of which is at issue” (Plateaus: 420).',
    color: MAGENTA,
  },
  caught: {
    head: 'CAPTURE · APPROPRIATION · The capital city’s crowd drags on a company until it is caught in orbit: still fast, but now circling the capital city as its army (dynamical friction).',
    sub: '“What we call a military institution, or army, is not at all the war machine in itself, but the form under which it is appropriated by the State” (Plateaus: 418).',
    color: CYAN,
  },
  absorbed: {
    head: 'CAPTURE · THE ARMY · A caught company sinks into the capital city and no longer moves as a unit of its own (absorbed into the center).',
    sub: '“Mercenary or territorial? A professional army or a conscripted army?” (Plateaus: 419).',
    color: CYAN,
  },
  formed: {
    head: 'WARDING OFF · A NEW SOCIETY · People scattered from the capital city regroup at a distance into a society of their own, with its own orbits (a bound cluster forms).',
    sub: 'Centers “do not converge in the same black hole” (Plateaus: 211).',
    color: YELLOW,
  },
  tighten: {
    head: 'WARDING OFF · ANTICIPATION · As the capital city’s reach grows, threatened societies tighten their own orbits, so that the threshold stays outside them (cooling inside the tidal radius).',
    sub: '“The threshold is in fact already there, but outside the limit, which is satisfied to place the threshold at a distance, keep it at a distance” (Plateaus: 440).',
    color: YELLOW,
  },
};
const HOLDING = {
  capital: {
    head: 'CAPTURE HOLDS · The capital city holds most of the field in its orbits, every movement made relative to it, from point to point (bound orbits).',
    sub: 'The State is “a State that comes into the world fully formed and rises up in a single stroke, the unconditioned Urstaat” (Plateaus: 427).',
    color: CYAN,
  },
  societies: {
    head: 'WARDING OFF HOLDS · Societies circle at a distance, each running on its own code, none drawn into the capital city (bound clusters beyond their tidal radii).',
    sub: 'Before it appears, the State acts as “the convergent or centripetal wave of the hunter-gatherers, a wave that cancels itself out precisely at the point of convergence” (Plateaus: 431).',
    color: YELLOW,
  },
  companies: {
    head: 'WAR MACHINE HOLDS · Companies cross the open field on their own courses, outside every orbit (unbound paths).',
    sub: '“Make the desert, the steppe, grow; do not depopulate it, quite the contrary” (Plateaus: 417).',
    color: MAGENTA,
  },
} satisfies Record<string, Caption>;
const MIXTURE: Caption = {
  head: 'IN MIXTURE · The capital city holds its orbits, societies circle at a distance, companies cross the field.',
  sub: 'Smooth and striated “exist only in mixture” (Plateaus: 474).',
  color: '#cbd5e1',
};
const MODE_CAPTION: Partial<Record<Mode, Caption>> = {
  state: {
    head: 'CAPTURE ALONE · No companies and no societies tightening their ties: the capital city’s crowd draws society after society within reach of its tides and strips them into its orbits.',
    sub: '“Gravity, gravitas, such is the essence of the State” (Plateaus: 386).',
    color: CYAN,
  },
  nonstate: {
    head: 'WARDING OFF ALONE · Societies tighten their own orbits whenever the capital city’s tide grows, so they circle near it without being stripped.',
    sub: '“The threshold is in fact already there, but outside the limit, which is satisfied to place the threshold at a distance, keep it at a distance” (Plateaus: 440).',
    color: YELLOW,
  },
  nomad: {
    head: 'WAR MACHINE ALONE · Companies cross the field on open paths and tear through the capital city, while the crowd’s drag is too weak to catch them.',
    sub: 'The war machine’s “sole and veritable positive object” is smooth space, “the occupation of this space, displacement within this space” (Plateaus: 417).',
    color: MAGENTA,
  },
};

function create(): SimInstance {
  let orbits: Orbits | null = null;
  let trail: HTMLCanvasElement | null = null;
  let narration: Narration | null = null;
  let caption: Caption = MIXTURE;
  let captionAge = PHASE_HOLD;
  let acc = 0;
  let due = 0;
  const wobble = new Wobble();
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let last = { societies: 0, absorbed: 0, caught: 0, held: 0, frame: 0, raids: 0, hardened: 0, born: 0, annexed: 0 };
  let heldTrend: number[] = [];
  const history = { held: [] as number[], societies: [] as number[], companies: [] as number[], army: [] as number[] };
  let societyFate: string | null = null;
  const tags = {
    capital: new StickyTag<number>(900),
    society: new StickyTag<number>(400),
    company: new StickyTag<number>(400),
    petty: new StickyTag<number>(400),
  };
  let companyWas = COMPANY;
  let companyRaided = false;
  let companyBorn = false;

  return {
    init(_w, _h, params) {
      orbits = new Orbits(W, H);
      orbits.companyMass = params.companyMass;
      orbits.spawnNear = 0.26;
      orbits.spawnFar = 0.38;
      orbits.halo = 2;
      orbits.collapse = 0.2;
      orbits.breakaway = 7;
      orbits.breakawaySpeed = 0.9;
      for (let k = 0; k < 14; k++) orbits.addSociety(22 + 22 * Math.random(), Math.random() * 2 * Math.PI, params.capital);
      for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].length = 0;
      heldTrend = [];
      last = { societies: orbits.societies(), absorbed: 0, caught: 0, held: 0, frame: 0, raids: 0, hardened: 0, born: 0, annexed: 0 };
    },

    frame(ctx, f: Frame) {
      if (!orbits) return;
      const { mode, params, width, height, motionScale } = f;
      const capital = params.capital;
      let p: OrbitParams;
      let rate = params.rate;
      if (mode === 'state') {
        p = { capital, friction: 0.05, sink: Math.max(params.sink, 20) * 1.5, cool: 0, alarm: 9 };
        rate = 0;
      } else if (mode === 'nonstate') {
        p = { capital, friction: 0.05, sink: params.sink, cool: Math.max(params.cool, 0.6) * 1.5, alarm: Math.min(params.alarm, 0.4) };
        rate = 0;
      } else if (mode === 'nomad') {
        p = { capital, friction: 0.01, sink: params.sink * 0.3, cool: params.cool, alarm: params.alarm };
        rate = params.rate * 3;
      } else p = { capital, friction: 0.05, sink: params.sink, cool: params.cool, alarm: params.alarm };

      if (px.length !== orbits.cap) {
        px = new Float32Array(orbits.cap);
        py = new Float32Array(orbits.cap);
      }
      acc += params.speed * motionScale;
      const steps = Math.floor(acc);
      acc -= steps;
      px.set(orbits.x);
      py.set(orbits.y);
      for (let k = 0; k < steps; k++) {
        // Companies arrive in uneven surges, as the other models' forcings come.
        due += rate * (mode === 'conflict' ? wobble.step(params.surge, 0.002) : 1);
        if (due >= 1) {
          due -= 1;
          // A share of the companies ride straight at the capital city: raiders, heavier than the rest.
          const raid = Math.random() < params.raids;
          orbits.addCompany(1, raid, raid ? params.raidMass : params.companyMass);
        }
        orbits.step(p);
      }
      const shares = orbits.classify(capital);
      const co = orbits.companies();
      const societies = orbits.societies();
      history.held.push(shares.held);
      history.societies.push(societies / 14);
      history.companies.push(Math.min(1, (co.total - co.caught) / 4));
      history.army.push(Math.min(1, orbits.absorbed / 30));
      if (history.held.length > SPAN) for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].shift();
      heldTrend.push(shares.held);
      if (heldTrend.length > 90) heldTrend.shift();

      // Drawing: trails fade on their own layer, so orbits, knots, and courses show as paths.
      const sx = width / W;
      const sy = height / H;
      const main = ctx;
      if (!trail || trail.width !== main.canvas.width || trail.height !== main.canvas.height) {
        trail = document.createElement('canvas');
        trail.width = main.canvas.width;
        trail.height = main.canvas.height;
      }
      const tctx = trail.getContext('2d')!;
      tctx.setTransform(main.getTransform());
      tctx.fillStyle = 'rgba(11, 18, 32, 0.08)';
      tctx.fillRect(0, 0, width, height);
      tctx.lineCap = 'round';
      const colorOf = (i: number) => {
        const k = orbits!.kind[i];
        return k === HELD || k === ARMY || k === PETTY ? CYAN : k === SOCIETY ? YELLOW : k === COMPANY ? MAGENTA : GRAY;
      };
      // Heavy bodies are drawn by mass; a body that crossed over keeps a ring in the color it came from.
      const heavy = (i: number) => orbits!.isCompany[i] === 1 || orbits!.isState[i] === 1;
      // Companies and small States are drawn only a little larger than a body, so that size on
      // screen never suggests they outweigh the capital city.
      const radius = (i: number) => (heavy(i) ? 5 + 0.6 * Math.sqrt(orbits!.m[i]) : 6);
      for (let i = 0; i < orbits.n; i++) {
        if (Math.abs(orbits.x[i] - px[i]) > 15 || Math.abs(orbits.y[i] - py[i]) > 15) continue;
        tctx.strokeStyle = colorOf(i);
        tctx.lineWidth = heavy(i) ? 5 : 3;
        tctx.beginPath();
        tctx.moveTo(px[i] * sx, py[i] * sy);
        tctx.lineTo(orbits.x[i] * sx, orbits.y[i] * sy);
        tctx.stroke();
      }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.drawImage(trail, 0, 0);
      main.restore();
      // The capital: a glow whose size follows how much it holds.
      const glow = ctx.createRadialGradient(orbits.cx * sx, orbits.cy * sy, 0, orbits.cx * sx, orbits.cy * sy, (6 + 14 * shares.held) * sx);
      glow.addColorStop(0, 'rgba(0, 174, 239, 0.55)');
      glow.addColorStop(1, 'rgba(0, 174, 239, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      // Each society's tidal radius, its threshold, brighter when the alarm is raised.
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      for (let s = 0; s < orbits.socCount.length; s++) {
        if (orbits.socCount[s] < 4) continue;
        ctx.strokeStyle = orbits.socAlarm[s] ? 'rgba(224, 168, 0, 0.9)' : 'rgba(224, 168, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(orbits.socX[s] * sx, orbits.socY[s] * sy, orbits.socTide[s] * sx, orbits.socTide[s] * sy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // The bodies.
      for (let i = 0; i < orbits.n; i++) {
        ctx.fillStyle = colorOf(i);
        ctx.beginPath();
        ctx.arc(orbits.x[i] * sx, orbits.y[i] * sy, radius(i), 0, Math.PI * 2);
        ctx.fill();
        const origin = orbits.kind[i] === ARMY ? MAGENTA : orbits.isState[i] || orbits.isBorn[i] ? YELLOW : null;
        if (origin) {
          ctx.strokeStyle = origin;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Narration: events first, then what holds.
      last.frame++;
      let event: Event | null = null;
      if (orbits.hardened > last.hardened) event = 'hardened';
      else if (orbits.born > last.born) event = 'born';
      else if (orbits.raids > last.raids) event = 'raid';
      else if (orbits.annexed > last.annexed) event = 'annexed';
      else if (societies < last.societies) event = 'stripped';
      else if (orbits.absorbed > last.absorbed) event = 'absorbed';
      else if (co.caught > last.caught) event = 'caught';
      else if (heldTrend.length === 90 && heldTrend[0] - shares.held > 0.08 && co.total - co.caught > 0) event = 'scatter';
      else if (societies > last.societies) event = 'formed';
      else if (orbits.socAlarm.some((a, s) => a && orbits!.socCount[s] >= 4) && p.cool > 0) event = 'tighten';
      last.societies = societies;
      last.raids = orbits.raids;
      last.hardened = orbits.hardened;
      last.born = orbits.born;
      last.annexed = orbits.annexed;
      last.absorbed = orbits.absorbed;
      last.caught = co.caught;
      if (mode === 'conflict') {
        captionAge++;
        const next = event
          ? EVENTS[event]
          : shares.held > 0.5
            ? HOLDING.capital
            : societies >= 11
              ? HOLDING.societies
              : co.total - co.caught > 1
                ? HOLDING.companies
                : MIXTURE;
        // Events may cut in after a shorter hold, so that they are reported while they happen.
        if (next !== caption && (captionAge > PHASE_HOLD || (event && captionAge > 90))) {
          caption = next;
          captionAge = 0;
        }
      }
      const cap = mode === 'conflict' ? caption : (MODE_CAPTION[mode] ?? null);
      narration = cap
        ? {
            ...cap,
            series: [
              { values: history.held, color: CYAN, label: 'held by the capital city' },
              { values: history.societies, color: YELLOW, label: 'societies on their own' },
              { values: history.companies, color: MAGENTA, label: 'companies free' },
              { values: history.army, color: '#cbd5e1', label: 'companies absorbed' },
            ],
            span: SPAN,
          }
        : null;

      // Explain layer: the capital, a society with its tidal radius, and a company.
      if (f.explain) {
        // Tags keep clear of the legend and of the capital, where most of the action is.
        const zone = (8 + 14 * shares.held) * sx;
        // Long tails: the boxes sit well away from the bodies they point at.
        beginTags([...(f.keepClear ?? []), { x: orbits.cx * sx - zone, y: orbits.cy * sy - zone, w: zone * 2, h: zone * 2 }], 5);
        const bounds = { width, height };
        tags.capital.update(
          () => ({ x: orbits!.cx * sx, y: orbits!.cy * sy - zone }),
          () => ({ anchor: 0, x: orbits!.cx * sx, y: orbits!.cy * sy - zone }),
        );
        tags.capital.draw(ctx, 'CAPTURE · the capital city: its orbits are its order, every movement made relative to it', CYAN, bounds);
        if (mode !== 'nomad') {
          // A society in the upper part of the field, followed by its center.
          tags.society.update(
            (s) => (orbits!.socCount[s] >= 4 ? { x: orbits!.socX[s] * sx, y: orbits!.socY[s] * sy } : null),
            () => {
              for (let tries = 0; tries < 50; tries++) {
                const s = (Math.random() * orbits!.socCount.length) | 0;
                if (orbits!.socCount[s] >= 8 && orbits!.socY[s] < H * 0.55) return { anchor: s, x: orbits!.socX[s] * sx, y: orbits!.socY[s] * sy };
              }
              return null;
            },
          );
          if (!tags.society.lost) societyFate = null;
          else if (!societyFate) societyFate = 'WARDING OFF · this society was stripped by the capital city’s tides, its members now circling the capital city';
          const s = tags.society.current;
          const alarmed = s !== null && orbits.socAlarm[s];
          tags.society.draw(
            ctx,
            alarmed ? 'WARDING OFF · a society tightening its own orbits to keep the capital city’s threshold (the dashed ring) outside it' : 'WARDING OFF · a society running on its own code, its own orbits',
            YELLOW,
            bounds,
            societyFate ?? 'WARDING OFF · this society has come apart',
          );
        }
        if (mode !== 'nonstate' && mode !== 'state') {
          tags.company.update(
            (i) => (i < orbits!.n && orbits!.isCompany[i] ? { x: orbits!.x[i] * sx, y: orbits!.y[i] * sy } : null),
            () => {
              // A free company in the upper part of the field, clear of the legend.
              for (let i = 0; i < orbits!.n; i++) if (orbits!.isCompany[i] && orbits!.kind[i] === COMPANY && orbits!.y[i] < H * 0.55) return { anchor: i, x: orbits!.x[i] * sx, y: orbits!.y[i] * sy };
              return null;
            },
          );
          const i = tags.company.current;
          if (i !== null && i < orbits.n && orbits.isCompany[i]) {
            companyWas = orbits.kind[i];
            companyRaided = orbits.contacted[i] === 1;
            companyBorn = orbits.isBorn[i] === 1;
          }
          tags.company.draw(
            ctx,
            companyWas === ARMY
              ? 'CAPTURE · a company caught in orbit: the capital city’s army now'
              : companyBorn
                ? 'WAR MACHINE · a company born from a society, its members riding off together'
                : 'WAR MACHINE · a company on its own course, outside every orbit',
            companyWas === ARMY ? CYAN : MAGENTA,
            bounds,
            companyWas === ARMY
              ? 'CAPTURE · this company was absorbed into the capital city’s army'
              : companyRaided
                ? 'WAR MACHINE · this company tore through the capital city and rode on'
                : 'WAR MACHINE · this company rode off the field',
          );
        }
        if (mode === 'conflict' || mode === 'nonstate') {
          tags.petty.update(
            (i) => (i < orbits!.n && orbits!.isState[i] ? { x: orbits!.x[i] * sx, y: orbits!.y[i] * sy } : null),
            () => {
              for (let i = 0; i < orbits!.n; i++) if (orbits!.isState[i] && orbits!.y[i] < H * 0.6) return { anchor: i, x: orbits!.x[i] * sx, y: orbits!.y[i] * sy };
              return null;
            },
          );
          tags.petty.draw(ctx, 'LINE OF FLIGHT · a society that hardened into a small State, drawing in what passes close', CYAN, bounds, 'CAPTURE · this small State was annexed by the capital city');
        }
      }
    },

    narrate() {
      return narration;
    },
  };
}

export const cosmic: ModelDef = {
  id: 'cosmic',
  name: 'Cosmic',
  tagline: 'Gravity',
  sidebarIcon: Orbit,
  headerIcon: Magnet,
  title: 'Cosmic Metaphysics',
  subtitle: 'A World of Weight and Speed // Capital City, Societies, Companies',
  frameEvery: 2,
  stillFrames: 1200,
  describe: (mode) =>
    `Cosmic simulation in ${mode} mode: Newtonian gravity around a heavy center. Cyan bodies are held in the capital city’s orbits. Yellow clusters are societies on their own orbits, each with its tidal radius dashed around it. Large magenta bodies are companies on open paths, ringed in magenta and colored cyan once the capital city catches them in orbit. Gray bodies are free.`,
  controls: [
    { kind: 'slider', key: 'capital', label: 'Capital City’s Mass (capture)', min: 100, max: 500, step: 10, default: 300, tint: 'cyan', format: 'int', reinit: true },
    { kind: 'slider', key: 'sink', label: 'Capital City’s Drag on Societies', min: 0, max: 40, step: 1, default: 20, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'alarm', label: 'Societies’ Alarm (size to tidal radius)', min: 0.2, max: 1, step: 0.05, default: 0.5, tint: 'yellow', format: 'dec2' },
    { kind: 'slider', key: 'cool', label: 'Societies’ Tightening', min: 0, max: 1, step: 0.05, default: 0.5, tint: 'yellow', format: 'dec2' },
    { kind: 'slider', key: 'rate', label: 'Companies Arriving', min: 0, max: 0.04, step: 0.001, default: 0.02, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'companyMass', label: 'Company Mass', min: 20, max: 300, step: 10, default: 70, tint: 'magenta', format: 'int' },
    { kind: 'slider', key: 'raids', label: 'Share That Raid the Capital City', min: 0, max: 1, step: 0.05, default: 0.15, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'raidMass', label: 'Raider Mass', min: 20, max: 300, step: 10, default: 150, tint: 'magenta', format: 'int' },
    { kind: 'slider', key: 'surge', label: 'Surges (unevenness)', min: 0, max: 2.5, step: 0.1, default: 1, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'speed', label: 'Steps per Snapshot', min: 1, max: 12, step: 1, default: 4, tint: 'ink', format: 'int', divider: true },
  ],
  status: (p) => [
    ['Capital city', String(p.capital)],
    ['Companies', (p.rate * 1000).toFixed(1)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'The capital city: a heavy center there from the start, whose orbits are its order. Its crowd slows societies until its tides strip them (overcoding), and it catches passing companies in orbit as its army (appropriation). Capture “contributes to the creation of that which it captures” (Plateaus: 448).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Companies: heavy units on open paths, outside every orbit. On contact a company tears through the capital city and flings its bodies out, but the crowd’s drag may catch it in orbit. Its object is smooth space (Plateaus: 417), and war comes “in opposition to the State-form, the destruction of which is at issue” (420).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Societies: clusters running on their own code, their own orbits. Each has a tidal radius, the threshold inside which the capital city would strip it, and when the capital city’s reach grows it tightens its orbits to keep that threshold outside it. “The threshold is in fact already there, but outside the limit” (Plateaus: 440).' },
  ],
  legend: [
    { swatch: CYAN, see: 'Cyan bodies and the glow at the center', social: 'the capital city and everyone held in its orbits, every movement made relative to it', physics: 'bodies bound to the central mass on closed orbits', atp: 'a State “that comes into the world fully formed and rises up in a single stroke” (Plateaus: 427)', example: 'the levies and duties at the city gates, “filters against the fluidity of the masses” (386, citing Virilio)' },
    { swatch: YELLOW, see: 'Yellow clusters, with dashed rings', social: 'societies running on their own code, keeping the capital city’s threshold at a distance', physics: 'clusters bound by their own gravity, each ring its tidal radius, inside which the capital city’s tides would strip it', atp: '“The threshold is in fact already there, but outside the limit” (Plateaus: 440)', example: 'a band whose members “disperse to eat or sleep separately,” so no leader gains stable power (358)' },
    { swatch: MAGENTA, see: 'Large magenta bodies', social: 'companies on their own course, outside every orbit, at war with the State when they meet it', physics: 'heavy bodies on unbound paths, scattering what they pass and slowed by dynamical friction', atp: 'war against “the State-form, the destruction of which is at issue” (Plateaus: 420)', example: '“Mercenary or territorial? A professional army or a conscripted army?” (419), the forms of appropriation' },
    { swatch: CYAN, see: 'Cyan bodies ringed in magenta', social: 'a company appropriated as the capital city’s army', physics: 'a heavy body caught in a bound orbit', atp: 'the army as “the form under which it is appropriated by the State” (Plateaus: 418)' },
    { swatch: CYAN, see: 'Large cyan bodies ringed in yellow', social: 'a society that hardened into a small State, a line of flight from warding off into capture', physics: 'a cluster that cooled until it collapsed into one body, growing by drawing in what passes close', atp: '“Special institutions are thus necessary to enable a chief to become a man of State, but diffuse, collective mechanisms are just as necessary to prevent a chief from becoming one” (Plateaus: 357)' },
    { swatch: MAGENTA, see: 'Magenta bodies ringed in yellow', social: 'a company born from a society, a line of flight from warding off into the war machine', physics: 'members flung out of a cluster together and leaving as one body', atp: 'a member who leaves “will not leave alone but will take along his allies” (Plateaus: 358)' },
    { swatch: GRAY, see: 'Gray bodies', social: 'people scattered from the capital city or a society, not yet regrouped', physics: 'bodies bound to nothing', atp: 'the State’s capture of “flows of all kinds, populations, commodities or commerce, money or capital” (Plateaus: 386)' },
  ],
  create,
};
