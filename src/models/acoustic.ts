import { Waves } from 'lucide-react';
import type { ModelDef, SimInstance, Frame, Mode, Narration } from '../sim/types';
import { Metronomes, CAUGHT, SEGMENT, WAVE, type OscParams } from '../sim/oscillators';
import { Drive, type DriveSettings } from '../sim/metronomeDrive';
import { beginTags, drawTag, StickyTag } from '../sim/tags';

// Nomadology in a world where everything is acoustic. Underneath is a physics-class experiment:
// a field of metronomes standing on one board that can sway. The metronomes never touch; each is
// coupled to the others through the board, which moves with their mean beat, and to its near
// neighbors, which it hears with a small delay. What is at stake is the board's swing, the
// resonance at the center. Capture pulls every metronome into the board's one count (global
// synchrony). Warding off keeps bands at their own tempi, so nothing resonates at the center and
// the board stays nearly still. The war machine passes the beat from neighbor to neighbor in
// waves that cross the field with no count at all. In conflict the board's pull surges, the bands
// pull their tempi apart when the board starts to swing, and the neighbors' coupling surges in
// drifting patches, so the three take the lead in turn.

const W = 60;
const H = 36;
const SEGMENTS = 12;
// Frames of history in the narrator's chart.
const SPAN = 600;
// Frames a caption stays up before it may change, and the window for judging who is gaining.
const PHASE_HOLD = 180;
const TREND = 120;

const CYAN = '#00aeef';
const MAGENTA = '#ec008c';
const YELLOW = '#e0a800';
const INK = '#f2f2f2';
const KIND_COLOR = [CYAN, YELLOW, MAGENTA];

type Caption = { head: string; sub: string; color: string };

// GAINS[gainer][loser], in the order capture, warding off, war machine.
const GAINS: Caption[][] = [
  [
    { head: '', sub: '', color: CYAN },
    {
      head: 'CAPTURE GAINS · One bell starts to set the time: villages that kept their own hours fall into the center’s count, each one that joins making the pull on the rest stronger (the field falls into step).',
      sub: 'Segments “begin to resonate in a center acting as their common denominator” (Plateaus: 212).',
      color: CYAN,
    },
    {
      head: 'CAPTURE GAINS · The drill takes over the crowd: the beat that ran from neighbor to neighbor is beaten into one count, set from the center (traveling waves lock to the common beat).',
      sub: '“it is only in State armies, and for reasons of discipline and show, that one marches in cadence” (Plateaus: 390).',
      color: CYAN,
    },
  ],
  [
    {
      head: 'WARDING OFF GAINS · As the bell at the center grows louder, the villages spread their hours wider, so the common count falls away before it can hold (the spread of tempi rises past the threshold).',
      sub: 'Centers “do not all resonate together, they do not fall on the same point” (Plateaus: 211).',
      color: YELLOW,
    },
    { head: '', sub: '', color: YELLOW },
    {
      head: 'WARDING OFF GAINS · The waves settle into villages, each keeping its own hours on its own ground (traveling waves lock into segments).',
      sub: '“the circles are not concentric, and the two segments require a third segment through which to communicate” (Plateaus: 433).',
      color: YELLOW,
    },
  ],
  [
    {
      head: 'WAR MACHINE GAINS · The drill fails: the beat jumps from neighbor to neighbor instead of coming from the center (the common beat breaks into traveling waves).',
      sub: '“Bands, human or animal, proliferate by contagion” (Plateaus: 241).',
      color: MAGENTA,
    },
    {
      head: 'WAR MACHINE GAINS · A wave runs through the villages’ ground, carrying the beat across the field like a rumor, counted by no one (segments break into traveling waves).',
      sub: '“in a smooth space-time one occupies without counting” (Plateaus: 477).',
      color: MAGENTA,
    },
    { head: '', sub: '', color: MAGENTA },
  ],
];
const HOLDING: Caption[] = [
  {
    head: 'CAPTURE HOLDS · Everyone keeps the center’s count, as a parish keeps the hours its bell rings and a census counts every household, while the board swings with all of them (global synchrony).',
    sub: 'The State works through “the three conjoined operations of the census, taxation, and election” (Plateaus: 389).',
    color: CYAN,
  },
  {
    head: 'WARDING OFF HOLDS · Each village keeps its own hours, so no one can set a schedule for all and the board stays nearly still (segments at their own tempi).',
    sub: 'The chief “is more like a leader or a star than a man of power and is always in danger of being disavowed” (Plateaus: 357).',
    color: YELLOW,
  },
  {
    head: 'WAR MACHINE HOLDS · The beat passes like a wave through a crowd, each catching it from a neighbor, while the lead keeps moving (traveling waves).',
    sub: 'In the pack, each “may be in the center, and then, immediately afterwards, at the edge” (Plateaus: 33, citing Canetti).',
    color: MAGENTA,
  },
];
const MIXTURE: Caption = {
  head: 'IN MIXTURE · Some keep the center’s count, some villages keep their own hours, some catch the beat from their neighbors.',
  sub: 'Smooth and striated “exist only in mixture” (Plateaus: 474).',
  color: '#cbd5e1',
};
const MODE_CAPTION: Partial<Record<Mode, Caption>> = {
  state: {
    head: 'CAPTURE ALONE · A loud bell at the center and no villages to resist it: everyone falls into one count, with the field swaying in time (global synchrony).',
    sub: 'The central point “acts as a point of resonance on the horizon, behind all the other points” (Plateaus: 224).',
    color: CYAN,
  },
  nonstate: {
    head: 'WARDING OFF ALONE · The bell rings from the center, but each village keeps its own hours, so no common time forms and the board barely moves (segments at their own tempi).',
    sub: 'Centers “do not all resonate together, they do not fall on the same point” (Plateaus: 211).',
    color: YELLOW,
  },
  nomad: {
    head: 'WAR MACHINE ALONE · As neighbors hear each other, the beat runs across the field in waves, with no count from the center (traveling waves).',
    sub: '“in a smooth space-time one occupies without counting, whereas in a striated space-time one counts in order to occupy” (Plateaus: 477).',
    color: MAGENTA,
  },
};

function create(): SimInstance {
  let field: Metronomes | null = null;
  let drive: Drive | null = null;
  let caption: Caption = MIXTURE;
  let captionAge = PHASE_HOLD;
  let narration: Narration | null = null;
  let acc = 0;
  let fractions: [number, number, number] = [0, 0, 0];
  let boardSay: string | null = null;
  // What a lost feature turned into, fixed when its loss is first reported.
  const fate = { rank: null as string | null, band: null as string | null, wave: null as string | null };
  const history = { R: [] as number[], segment: [] as number[], wave: [] as number[], mobilized: [] as number[] };
  const tags = {
    rank: new StickyTag<{ x: number; y: number }>(300),
    band: new StickyTag<{ x: number; y: number }>(300),
    wave: new StickyTag<{ x: number; y: number }>(300),
  };

  return {
    init() {
      field = new Metronomes(W, H, SEGMENTS);
      drive = new Drive(W);
      for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].length = 0;
    },

    frame(ctx, f: Frame) {
      if (!field || !drive) return;
      const { mode, params, width, height, motionScale } = f;
      const base = { segment: 0.2, lag: 0.6, noise: 0.005 };

      acc += params.speed * motionScale;
      const steps = Math.floor(acc);
      acc -= steps;
      for (let k = 0; k < steps; k++) {
        let p: OscParams;
        if (mode === 'state') p = { ...base, board: Math.max(params.board, 0.2) * 1.5, spread: 0.3, neighbor: 0 };
        else if (mode === 'nonstate') p = { ...base, board: params.board * 0.7, spread: 1.2, neighbor: 0 };
        else if (mode === 'nomad') p = { ...base, board: params.board * 0.5, spread: 0.3, neighbor: Math.max(params.neighbor, 0.5) * 2, segment: 0.05 };
        else {
          const s: DriveSettings = {
            board: params.board,
            boardSurge: params.surge * 0.5,
            spreadRest: params.spread,
            spreadMax: 1.2,
            alarm: params.alarm,
            calm: 0.25,
            mobilize: 0.002,
            relax: 0.004,
            neighbor: params.neighbor,
            neighborSurge: params.surge,
            pace: params.pace,
            wander: 1,
          };
          p = drive.step(field.R, s, base);
        }
        field.step(p);
      }
      fractions = field.classify();
      const n = history.R.length;
      history.R.push(field.R);
      history.segment.push(fractions[SEGMENT]);
      history.wave.push(fractions[WAVE]);
      history.mobilized.push(mode === 'conflict' ? drive.mobilization : 0);
      if (n + 1 > SPAN) for (const k of Object.keys(history) as (keyof typeof history)[]) history[k].shift();

      // The field fills the canvas and sways with the board: the stake made visible.
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, width, height);
      const sx = width / W;
      const sy = height / H;
      const sway = field.R * Math.cos(field.psi) * sx * 0.9;
      const arm = Math.min(sx, sy) * 0.42;
      // Shade each metronome's cell by its phase, so traveling waves show as moving bands of light
      // and each band as a patch that brightens on its own beat.
      for (let i = 0; i < field.n; i++) {
        const glow = (1 + Math.cos(field.theta[i])) / 2;
        ctx.globalAlpha = 0.05 + 0.2 * glow * glow;
        ctx.fillStyle = KIND_COLOR[field.kind[i]];
        ctx.fillRect((i % W) * sx + sway, ((i / W) | 0) * sy, sx + 0.5, sy + 0.5);
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      for (let kind = 0; kind < 3; kind++) {
        ctx.strokeStyle = KIND_COLOR[kind];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < field.n; i++) {
          if (field.kind[i] !== kind) continue;
          const px = ((i % W) + 0.5) * sx + sway;
          const py = (((i / W) | 0) + 0.75) * sy;
          // Each metronome's arm swings with its phase, a third of a turn either way.
          const a = Math.sin(field.theta[i]) * 0.6;
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.sin(a) * arm, py - Math.cos(a) * arm);
        }
        ctx.stroke();
        // A flash at the tip of the arm on each beat.
        ctx.fillStyle = KIND_COLOR[kind];
        for (let i = 0; i < field.n; i++) {
          if (field.kind[i] !== kind) continue;
          const beat = Math.pow(Math.max(0, Math.cos(field.theta[i])), 12);
          if (beat < 0.05) continue;
          const px = ((i % W) + 0.5) * sx + sway;
          const py = (((i / W) | 0) + 0.75) * sy;
          const a = Math.sin(field.theta[i]) * 0.6;
          ctx.globalAlpha = beat;
          ctx.beginPath();
          ctx.arc(px + Math.sin(a) * arm, py - Math.cos(a) * arm, 2 + 3 * beat, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Narration. In conflict it names who is gaining on whom over the last few seconds.
      {
        let cap = MODE_CAPTION[mode] ?? null;
        if (mode === 'conflict') {
          captionAge++;
          const m = history.R.length;
          if (captionAge > PHASE_HOLD && m > TREND) {
            const series = [history.R, history.segment, history.wave];
            const delta = series.map((s) => s[m - 1] - s[m - 1 - TREND]);
            const gainer = delta.indexOf(Math.max(...delta));
            const loser = delta.indexOf(Math.min(...delta));
            const next =
              delta[gainer] > 0.15 && gainer !== loser
                ? GAINS[gainer][loser]
                : field.R > 0.7
                  ? HOLDING[0]
                  : fractions[SEGMENT] > 0.55
                    ? HOLDING[1]
                    : fractions[WAVE] > 0.55
                      ? HOLDING[2]
                      : MIXTURE;
            if (next !== caption) {
              caption = next;
              captionAge = 0;
            }
          }
          cap = caption;
        }
        narration = cap
          ? {
              ...cap,
              series: [
                { values: history.R, color: CYAN, label: 'the board’s swing' },
                { values: history.segment, color: YELLOW, label: 'villages in their own hours' },
                { values: history.wave, color: MAGENTA, label: 'beats caught from neighbors' },
                { values: history.mobilized, color: '#cbd5e1', label: 'villages mobilized' },
              ],
              span: SPAN,
            }
          : null;
      }

      // Explain layer: a rank in step, a band in its own time, a wave, and the board.
      if (f.explain) {
        beginTags();
        const bounds = { width, height };
        const share = (a: { x: number; y: number }, kind: number) => {
          let c = 0;
          let t = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const x = Math.round(a.x) + dx;
              const y = Math.round(a.y) + dy;
              if (x < 0 || x >= W || y < 0 || y >= H) continue;
              t++;
              if (field!.kind[x + y * W] === kind) c++;
            }
          }
          return t ? c / t : 0;
        };
        const at = (a: { x: number; y: number }) => ({ x: (a.x + 0.5) * sx + sway, y: (a.y + 0.75) * sy });
        // New tags go on the upper part of the field, clear of the legend at the bottom left.
        const pick = (kind: number) => () => {
          for (let tries = 0; tries < 200; tries++) {
            const a = { x: 4 + Math.random() * (W - 8), y: 2 + Math.random() * (H * 0.5) };
            if (share(a, kind) > 0.7) return { anchor: a, ...at(a) };
          }
          return null;
        };
        const follow = (kind: number) => (a: { x: number; y: number }) => (share(a, kind) > 0.3 ? at(a) : null);
        const turnedInto = (a: { x: number; y: number }, from: number) => {
          const s = [CAUGHT, SEGMENT, WAVE].filter((k) => k !== from).map((k) => [k, share(a, k)] as const);
          return s[0][1] >= s[1][1] ? s[0][0] : s[1][0];
        };
        if (mode === 'conflict' || mode === 'state') {
          tags.rank.update(follow(CAUGHT), pick(CAUGHT));
          if (!tags.rank.lost) fate.rank = null;
          else if (!fate.rank && tags.rank.current)
            fate.rank = turnedInto(tags.rank.current, CAUGHT) === SEGMENT
              ? 'CAPTURE · these ranks fell out of step and went back to their own village’s hours'
              : 'CAPTURE · these ranks broke step and caught their neighbors’ rhythm instead';
          tags.rank.draw(ctx, 'CAPTURE · one bell for all: these ranks keep the hours rung from the center', CYAN, bounds, fate.rank ?? 'CAPTURE · these ranks fell out of step');
        }
        if (mode === 'conflict' || mode === 'nonstate') {
          tags.band.update(follow(SEGMENT), pick(SEGMENT));
          if (!tags.band.lost) fate.band = null;
          else if (!fate.band && tags.band.current)
            fate.band = turnedInto(tags.band.current, SEGMENT) === CAUGHT
              ? 'WARDING OFF · this village lost its own hours and fell into the center’s count'
              : 'WARDING OFF · this village’s hours were swept away by a passing wave';
          tags.band.draw(ctx, 'WARDING OFF · a village keeping its own hours, so the bell at the center sets nothing here', YELLOW, bounds, fate.band ?? 'WARDING OFF · this village lost its own hours');
        }
        if (mode === 'conflict' || mode === 'nomad') {
          tags.wave.update(follow(WAVE), pick(WAVE));
          if (!tags.wave.lost) fate.wave = null;
          else if (!fate.wave && tags.wave.current)
            fate.wave = turnedInto(tags.wave.current, WAVE) === CAUGHT
              ? 'WAR MACHINE · this wave was drilled back into the center’s count'
              : 'WAR MACHINE · this wave settled into a village’s own hours';
          tags.wave.draw(ctx, 'WAR MACHINE · contagion: the beat jumps neighbor to neighbor, with no one counting from the center', MAGENTA, bounds, fate.wave ?? 'WAR MACHINE · this wave has faded, its neighbors no longer passing the beat');
        }
        // The board itself, named at the top while it clearly swings or clearly stands still.
        // Each message holds while it is true, and clears once the board is back in the middle.
        if (field.R > 0.65) boardSay = 'the board swings: one bell sets the time for everyone';
        else if (field.R < 0.3) boardSay = 'the board is still: no one sets the time for everyone';
        else if (boardSay && (boardSay.includes('swings') ? field.R < 0.5 : field.R > 0.45)) boardSay = null;
        if (boardSay) drawTag(ctx, width / 2 + sway, 6, boardSay, INK, bounds);
      }
    },

    narrate() {
      return narration;
    },
  };
}

export const acoustic: ModelDef = {
  id: 'acoustic',
  name: 'Acoustic',
  tagline: 'Resonance',
  sidebarIcon: Waves,
  headerIcon: Waves,
  title: 'Acoustic Metaphysics',
  subtitle: 'A World of Beats // Bell, Villages, Contagion',
  frameEvery: 2,
  stillFrames: 900,
  describe: (mode) =>
    `Acoustic simulation in ${mode} mode: a field of metronomes on one board that can sway. Cyan metronomes keep the board’s common beat, and the field sways with it (one bell for all, capture). Yellow ones keep their own village’s tempo (villages keeping their own hours, warding off). Magenta ones catch the beat from their neighbors in traveling waves (contagion, the war machine).`,
  controls: [
    { kind: 'slider', key: 'board', label: 'Board’s Pull (capture)', min: 0.02, max: 0.4, step: 0.01, default: 0.15, tint: 'cyan', format: 'dec2' },
    { kind: 'slider', key: 'spread', label: 'Villages’ Tempo Spread at Rest', min: 0, max: 1.2, step: 0.05, default: 0.3, tint: 'yellow', format: 'dec2' },
    { kind: 'slider', key: 'alarm', label: 'Villages’ Alarm (board swing)', min: 0.4, max: 0.95, step: 0.05, default: 0.8, tint: 'yellow', format: 'dec2' },
    { kind: 'slider', key: 'neighbor', label: 'Neighbors’ Pull (war machine)', min: 0, max: 1.5, step: 0.05, default: 0.8, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'surge', label: 'Surges (unevenness)', min: 0, max: 2, step: 0.1, default: 1, tint: 'magenta', format: 'dec2' },
    { kind: 'slider', key: 'pace', label: 'Surge Pace', min: 0.0005, max: 0.006, step: 0.0005, default: 0.002, tint: 'magenta', format: 'x1000' },
    { kind: 'slider', key: 'speed', label: 'Steps per Snapshot', min: 0.5, max: 4, step: 0.5, default: 1, tint: 'ink', format: 'dec2', divider: true },
  ],
  status: (p) => [
    ['Board', p.board.toFixed(2)],
    ['Neighbors', p.neighbor.toFixed(2)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'One bell for all: every metronome is pulled toward the beat the board carries, each one that joins making the pull on the rest stronger, until the whole field keeps one count and sways with it, as armies march in step and a census counts every household. The central point “acts as a point of resonance on the horizon, behind all the other points” (Plateaus: 224).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Contagion: neighbors hear each other with a small delay, so the beat jumps from one to the next in waves that cross the field like a wave through a crowd, counted by no one. “Bands, human or animal, proliferate by contagion” (Plateaus: 241), and “in a smooth space-time one occupies without counting” (477).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Villages keeping their own hours: each village keeps its own tempo, and as the bell at the center grows louder they spread their tempi wider, so the common count falls away before it can hold. Centers “do not all resonate together, they do not fall on the same point” (Plateaus: 211).' },
  ],
  legend: [
    { swatch: CYAN, see: 'Cyan metronomes, and the field swaying', social: 'one bell for all: everyone’s hours rung from the center, the way a church bell sets the hours of work and prayer and armies march in step', physics: 'metronomes in step with the board, which sways with their common beat (cf. Huygens 1665, Pantaleone 2002)', atp: 'the central point “acts as a point of resonance on the horizon, behind all the other points” (Plateaus: 224)', example: 'troops marching in cadence “for reasons of discipline and show” (390)' },
    { swatch: YELLOW, see: 'Yellow metronomes', social: 'villages keeping their own hours, so no single bell can set the hours for everyone', physics: 'segments, each locked together at its own tempo, the spread of tempi raising the threshold for synchrony (Kuramoto)', atp: 'centers “do not all resonate together, they do not fall on the same point” (Plateaus: 211)', example: 'a chief who can call but not command, “always in danger of being disavowed” (357, cf. Clastres)' },
    { swatch: MAGENTA, see: 'Magenta metronomes', social: 'contagion: the beat caught from neighbor to neighbor, like a wave through a crowd, counted by no one', physics: 'traveling waves of phase, from neighbors hearing each other with a delay', atp: '“Bands, human or animal, proliferate by contagion” (Plateaus: 241)', example: 'a pack in which each “may be in the center, and then, immediately afterwards, at the edge” (33, citing Canetti)' },
    { swatch: INK, see: 'The field’s sway', social: 'whose bell sets the time, the stake of the contest', physics: 'the board’s swing, which is the field’s mean beat (the order parameter R)', atp: 'each State is “a redundancy of resonance (not of frequency)” (Plateaus: 433)' },
  ],
  create,
};
