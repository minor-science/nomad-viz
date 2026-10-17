// Settings live in the query string, so any configuration can be linked or cited:
// ?model=acoustic&mode=conflict&harmonicN=7. Only values that differ from the defaults are written.
import { MODES, type ControlSpec, type Mode, type Params } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function readModel(): string | null {
  return new URLSearchParams(window.location.search).get('model');
}

export function readPanel(): string | null {
  return new URLSearchParams(window.location.search).get('panel');
}

export function setPanel(panel: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (panel) q.set('panel', panel);
  else q.delete('panel');
  window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`);
}

export function readMode(): Mode | null {
  const m = new URLSearchParams(window.location.search).get('mode');
  return MODES.includes(m as Mode) ? (m as Mode) : null;
}

export function readParams(controls: ControlSpec[], base: Params): Params {
  const q = new URLSearchParams(window.location.search);
  const out = { ...base };
  for (const c of controls) {
    const keys = c.kind === 'slider' ? [c.key] : c.keys;
    for (const k of keys) {
      const raw = q.get(k);
      if (raw === null) continue;
      const v = Number(raw);
      if (Number.isFinite(v)) out[k] = clamp(v, c.min, c.max);
    }
  }
  return out;
}

export function writeState(model: string, mode: Mode, params: Params, base: Params) {
  const q = new URLSearchParams();
  q.set('model', model);
  if (mode !== 'state') q.set('mode', mode);
  const panel = readPanel();
  for (const [k, v] of Object.entries(params)) {
    if (base[k] !== v) q.set(k, String(v));
  }
  if (panel) q.set('panel', panel);
  const url = `${window.location.pathname}?${q.toString()}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}
