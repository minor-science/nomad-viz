// Content for the Sources panel, kept as data so it can be checked (scripts/check-atp.ts) and reused.
// Pages are to the Minnesota translation of A Thousand Plateaus (1987) unless marked otherwise.
import type { ProcessId } from '../processes';

export interface Passage {
  pages: string; // the page to check, e.g. '363' (first page if a range)
  quote: string; // verbatim; '...' marks an ellipsis
  note?: string;
}

export interface Borrowed {
  bib: string; // key in BIBLIOGRAPHY
  where: string; // where ATP draws on it
  text: string;
}

export interface PhysicsItem {
  name: string;
  tex?: string;
  text: string;
  bib?: string[];
}

export interface Divergence {
  kind: 'model' | 'science';
  text: string;
  bib?: string[];
}

export interface ModelSources {
  summary: string;
  absent: Partial<Record<ProcessId, string>>;
  atp: Passage[];
  borrowed: Borrowed[];
  physics: PhysicsItem[];
  code: string;
  divergences: Divergence[];
}
