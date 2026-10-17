// The machinic processes of A Thousand Plateaus (ATP 435-37), in the charts' column order:
// from the outside, through the inside, to what crosses all of them (Axiom I, 351).
// Page numbers are to the Minnesota translation (1987). RoV is Protevi, Regimes of Violence (2025).

export type ProcessId =
  | 'wardingOff'
  | 'warMachine'
  | 'marronage'
  | 'capture'
  | 'polarization'
  | 'encompassment';

export interface Process {
  id: ProcessId;
  name: string;
  formation: string;
  color: string;
  pages: string;
  tentative?: boolean;
  source?: string;
}

export const PROCESSES: Process[] = [
  { id: 'wardingOff', name: 'Warding off', formation: 'primitive societies', color: '#b8860b', pages: '431-33, 437-40' },
  { id: 'warMachine', name: 'War machine', formation: 'nomads', color: '#ec008c', pages: '351-423' },
  { id: 'marronage', name: 'Marronage', formation: 'maroon societies', color: '#8a5a1f', pages: 'RoV 96-121', tentative: true, source: 'Protevi' },
  { id: 'capture', name: 'Capture', formation: 'States', color: '#00aeef', pages: '424-73' },
  { id: 'polarization', name: 'Polarization', formation: 'towns', color: '#2f8f4e', pages: '432-34' },
  { id: 'encompassment', name: 'Encompassment', formation: 'ecumenical organizations', color: '#5b4bb7', pages: '435-36' },
];

export const PROCESS: Record<ProcessId, Process> = Object.fromEntries(
  PROCESSES.map((p) => [p.id, p]),
) as Record<ProcessId, Process>;
