// Check every quotation from A Thousand Plateaus in src/content against the text of the book.
//
//   ATP_TEXT=/path/to/atp.txt node --experimental-strip-types scripts/check-atp.ts
//
// The text is not in this repository (it is under copyright). The default path is the copy in the
// sibling protevi-response project: a pdftotext file of the Minnesota edition, pages separated by
// form feeds, with printed page N at index N + 20. Comparison ignores everything but letters, so
// OCR spacing, hyphens, and note numbers do not matter. A quote passes if it is on its page or the next.
import { readFileSync, readdirSync } from 'node:fs';
import { hydraulicSources } from '../src/content/hydraulic.ts';
import { metallurgicSources } from '../src/content/metallurgic.ts';
import { acousticSources } from '../src/content/acoustic.ts';
import { cosmicSources } from '../src/content/cosmic.ts';

const path = process.env.ATP_TEXT ?? new URL('../../protevi-response/sources_text/core/deleuze_guattari_atp.txt', import.meta.url).pathname;
const OFFSET = 20;
const pages = readFileSync(path, 'utf8').split('\f');
const letters = (s: string) => s.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();
const pageText = (n: number) => letters(pages[n + OFFSET] ?? '');

const models = { hydraulic: hydraulicSources, metallurgic: metallurgicSources, acoustic: acousticSources, cosmic: cosmicSources };

let checked = 0;
let failed = 0;

function check(model: string, page: number | number[], quote: string, where: string) {
  const parts = quote.split(/\.\.\.|…/).map(letters).filter((p) => p.length > 3);
  const list = Array.isArray(page) ? page : [page];
  const hay = list.map((n) => pageText(n) + pageText(n + 1)).join('|');
  const ok = parts.every((p) => hay.includes(p));
  checked++;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${model} ${where} p.${list.join('/')}: “${quote.slice(0, 90)}${quote.length > 90 ? '…' : ''}”`);
}

for (const [model, s] of Object.entries(models)) {
  for (const p of s.atp) check(model, parseInt(p.pages, 10), p.quote, 'passage');
  // Short quotations inside prose, written as “...” followed by an ATP page in parentheses.
  // Quotations in the borrowed entries are checked against every ATP page their `where` names.
  for (const b of s.borrowed) {
    const where = [...b.where.matchAll(/\b(\d{3})\b/g)].map((m) => parseInt(m[1], 10));
    if (!where.length) continue;
    for (const m of b.text.matchAll(/“([^”]+)”/g)) check(model, where, m[1], 'borrow ');
  }
  const prose = [s.summary, s.code, ...s.divergences.map((d) => d.text)];
  for (const text of prose) {
    for (const m of text.matchAll(/“([^”]+)”[^“(]{0,60}\((?:Plateaus: )?(\d{3})(?:[-,][^)]*)?\)/g)) {
      check(model, parseInt(m[2], 10), m[1], 'inline ');
    }
  }
}

// Inline quotations in the model cards and the app's sidebar and info text.
const root = new URL('../src/', import.meta.url).pathname;
const files = [...readdirSync(root + 'models').map((f) => 'models/' + f), 'App.tsx'];
for (const f of files) {
  const text = readFileSync(root + f, 'utf8');
  for (const m of text.matchAll(/“([^”]+)”[^“(]{0,60}\((?:Plateaus: )?(\d{3})(?:[-,][^)]*)?\)/g)) {
    check(f, parseInt(m[2], 10), m[1], 'inline ');
  }
}

console.log(`\n${checked} quotations checked, ${failed} failed.`);
process.exit(failed ? 1 : 0);
