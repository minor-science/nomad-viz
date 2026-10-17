// What drives the metronome field in conflict mode, so that the three take the lead in turn.
//   The board's pull surges unevenly (a log-normal Ornstein-Uhlenbeck process): the State keeps
//     trying to impose one beat.
//   The segments mobilize: when the board starts to swing, they spread their tempi apart, and once
//     it is still they relax (hysteresis between an alarm level and a calm level). This is the
//     model's reading of anticipation, as with the metallurgic bands.
//   The neighbors' coupling surges in patches that drift across the field: the upswell that sets
//     waves of beats traveling.
import { HeatPatches, Wobble } from './heating.ts';
import type { OscParams } from './oscillators.ts';

export interface DriveSettings {
  board: number; // mean pull of the board
  boardSurge: number;
  spreadRest: number; // the segments' tempo spread at rest
  spreadMax: number; // and fully mobilized
  alarm: number; // board swing that mobilizes the segments
  calm: number; // board swing below which they relax
  mobilize: number; // rate of mobilizing, per step
  relax: number; // rate of relaxing, per step
  neighbor: number; // mean coupling between neighbors
  neighborSurge: number;
  pace: number; // how fast surges come and go
  wander: number; // how fast the patches drift
}

export class Drive {
  private boardWobble = new Wobble();
  private patches: HeatPatches;
  readonly neighborField: Float32Array;
  mobilization = 0; // 0 at rest, 1 fully mobilized
  private mobilizing = false;
  constructor(w: number, patches = 3) {
    this.patches = new HeatPatches(w, patches);
    this.neighborField = new Float32Array(w);
  }

  /** One step: read the board's swing, return the parameters for the field. */
  step(R: number, s: DriveSettings, base: Omit<OscParams, 'board' | 'spread' | 'neighbor'>): OscParams & { neighborField: Float32Array } {
    const board = s.board * this.boardWobble.step(s.boardSurge, s.pace);
    if (R > s.alarm) this.mobilizing = true;
    else if (R < s.calm) this.mobilizing = false;
    this.mobilization += ((this.mobilizing ? 1 : 0) - this.mobilization) * (this.mobilizing ? s.mobilize : s.relax);
    const spread = s.spreadRest + (s.spreadMax - s.spreadRest) * this.mobilization;
    const floor = this.patches.step(s.neighborSurge, s.pace, s.wander);
    for (let x = 0; x < floor.length; x++) this.neighborField[x] = s.neighbor * floor[x];
    return { ...base, board, spread, neighbor: s.neighbor, neighborField: this.neighborField };
  }
}
