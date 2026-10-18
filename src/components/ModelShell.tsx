import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  WORLD_SCALE, DEFAULT_MODES, defaults, formatValue,
  type ControlSpec, type Mode, type ModelDef, type Narration, type Params, type Tint,
} from '../sim/types';
import { readMode, readPanel, readParams, setPanel, writeState } from '../sim/url';
import { Book } from './Book';
import { splitHead } from './plain';

const SourcesPanel = lazy(() => import('./SourcesPanel'));

// Under reduced motion the shell shows a still: this many frames are computed off screen.
const STILL_FRAMES = 150;

// Conflict comes first: every model opens with its processes together, and the others isolate one.
const MODE_BUTTONS: { mode: Mode; label: string; color: string }[] = [
  { mode: 'conflict', label: 'Conflict', color: '#f2f2f2' },
  { mode: 'state', label: 'Capture', color: '#00aeef' },
  { mode: 'nomad', label: 'War machine', color: '#ec008c' },
  { mode: 'nonstate', label: 'Warding off', color: '#e0a800' },
  { mode: 'town', label: 'Polarization', color: '#2f8f4e' },
];

const TINT: Record<Tint, { accent: string }> = {
  magenta: { accent: 'accent-[#ec008c]' },
  cyan: { accent: 'accent-[#00aeef]' },
  yellow: { accent: 'accent-[#e0a800]' },
  green: { accent: 'accent-[#2f8f4e]' },
  ink: { accent: 'accent-[#cbd5e1]' },
};

interface Props {
  model: ModelDef;
  isReducedMotion?: boolean;
  isHighVis?: boolean;
  onAnnounce?: (msg: string) => void;
  onReducedMotion?: (on: boolean) => void;
  onHighVis?: (on: boolean) => void;
}

export function ModelShell({ model, isReducedMotion = false, isHighVis = false, onAnnounce, onReducedMotion, onHighVis }: Props) {
  const base = useMemo(() => defaults(model.controls), [model]);
  const modes = model.modes ?? DEFAULT_MODES;
  const [mode, setMode] = useState<Mode>(() => {
    const m = readMode();
    if (m && modes.includes(m)) return m;
    return modes.includes('conflict') ? 'conflict' : modes[0];
  });
  const [params, setParams] = useState<Params>(() => readParams(model.controls, base));
  const [isPlaying, setIsPlaying] = useState(!isReducedMotion);
  const [showControls, setShowControls] = useState(false);
  const [explain, setExplain] = useState(true);
  // Full screen: the canvas alone, with no labels, legend, or narrator. It fills the window (and the
  // screen, where the browser allows it); Escape, or the exit link that shows when the pointer
  // moves, returns.
  const [immersive, setImmersive] = useState(false);
  const [pointerMoved, setPointerMoved] = useState(false);
  // The legend starts open on wide screens and closed on phones, where it would cover the canvas.
  const [showLegend, setShowLegend] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [showTheory, setShowTheory] = useState(() => readPanel() === 'sources');
  const [theoryLoaded, setTheoryLoaded] = useState(() => readPanel() === 'sources');
  const uid = useId();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const sim = useRef(model.create()).current;
  const live = useRef({ mode, params, motionScale: isReducedMotion ? 0.2 : 1, explain: true });
  const world = useRef({ width: 0, height: 0, time: 0, ready: false });

  live.current = { mode, params, motionScale: isReducedMotion ? 0.2 : 1, explain: explain && !immersive };
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const step = (motionScale = live.current.motionScale) => {
    const ctx = canvasRef.current?.getContext('2d');
    const w = world.current;
    if (!ctx || !w.ready) return;
    w.time += 1 / 60;
    // Tags keep clear of the legend, wherever it sits over the canvas.
    const keepClear: { x: number; y: number; w: number; h: number }[] = [];
    const lg = legendRef.current;
    const wrap = wrapRef.current;
    if (lg && wrap && lg.offsetParent) {
      const a = lg.getBoundingClientRect();
      const b = wrap.getBoundingClientRect();
      keepClear.push({ x: (a.left - b.left) * WORLD_SCALE, y: (a.top - b.top) * WORLD_SCALE, w: a.width * WORLD_SCALE, h: a.height * WORLD_SCALE });
    }
    sim.frame(ctx, { width: w.width, height: w.height, time: w.time, mode: live.current.mode, params: live.current.params, motionScale, explain: live.current.explain, keepClear });
  };

  const renderStill = () => {
    for (let i = 0; i < (model.stillFrames ?? STILL_FRAMES); i++) step(1);
  };

  const reinit = () => {
    const w = world.current;
    if (!w.ready) return;
    sim.init(w.width, w.height, live.current.params);
    if (!isPlaying && isReducedMotion) renderStill();
  };

  // Size the canvas to its box. The world keeps WORLD_SCALE units per CSS pixel on every device.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.getContext('2d')?.setTransform(dpr / WORLD_SCALE, 0, 0, dpr / WORLD_SCALE, 0, 0);
      const w = world.current;
      w.width = width * WORLD_SCALE;
      w.height = height * WORLD_SCALE;
      if (!w.ready) {
        w.ready = true;
        sim.init(w.width, w.height, live.current.params);
      }
      if (!isPlayingRef.current) renderStill();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    let id = 0;
    let n = 0;
    const every = model.frameEvery ?? 1;
    const tick = () => {
      if (n++ % every === 0) step();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Reduced motion pauses and shows a still. Turning it off resumes.
  useEffect(() => {
    if (isReducedMotion) {
      setIsPlaying(false);
      renderStill();
    } else {
      setIsPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReducedMotion]);

  // While paused under reduced motion, a change of mode or settings redraws the still.
  useEffect(() => {
    if (!isPlaying && isReducedMotion) renderStill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, params, explain, immersive]);

  // Settings that change the number of bodies restart the simulation.
  const reinitKey = model.controls
    .filter((c) => c.kind === 'slider' && c.reinit)
    .map((c) => (c.kind === 'slider' ? params[c.key] : ''))
    .join(',');
  const firstReinit = useRef(true);
  useEffect(() => {
    if (firstReinit.current) {
      firstReinit.current = false;
      return;
    }
    reinit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reinitKey]);

  // The narrator strip reads the simulation a few times a second, not every frame.
  useEffect(() => {
    if (!sim.narrate) return;
    const read = () => {
      const n = sim.narrate!();
      setNarration(n ? { ...n, series: n.series.map((x) => ({ ...x, values: x.values.slice() })) } : null);
    };
    read();
    const id = window.setInterval(read, 250);
    return () => window.clearInterval(id);
  }, [sim]);

  useEffect(() => {
    writeState(model.id, mode, params, base);
  }, [model.id, mode, params, base]);

  useEffect(() => {
    onAnnounce?.(`${model.name} model switched to ${MODE_BUTTONS.find((b) => b.mode === mode)?.label} mode`);
  }, [mode, model.name, onAnnounce]);

  const enterImmersive = () => {
    setImmersive(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const exitImmersive = () => {
    setImmersive(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    if (!immersive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitImmersive();
    };
    // Leaving the browser's full screen (its own Escape or gesture) also leaves this view.
    const onFs = () => {
      if (!document.fullscreenElement) setImmersive(false);
    };
    let hide = 0;
    const onMove = () => {
      setPointerMoved(true);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setPointerMoved(false), 2000);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersive]);

  const set = (key: string, value: number) => setParams((p) => ({ ...p, [key]: value }));
  const text = isHighVis ? 'text-sm' : 'text-xs';
  const toggle = (on: boolean) => `${text} ${on ? 'text-white' : 'text-white/45 hover:text-white/75'}`;

  const slider = (c: ControlSpec) => {
    const tint = TINT[c.tint];
    if (c.kind === 'pair') {
      const [a, b] = c.keys;
      return (
        <div key={c.label} className="space-y-1" role="group" aria-labelledby={`${uid}-${a}`}>
          <div className={`flex justify-between ${text}`}>
            <span id={`${uid}-${a}`}>{c.label}</span>
            <span className="text-white/60">{params[a]} and {params[b]}</span>
          </div>
          <div className="flex gap-2">
            {c.keys.map((k, i) => (
              <input
                key={k}
                type="range" min={c.min} max={c.max} step={c.step}
                value={params[k]}
                onChange={(e) => set(k, parseFloat(e.target.value))}
                className={`w-1/2 ${tint.accent}`}
                aria-label={`${c.label} ${i === 0 ? 'n' : 'm'}`}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={c.key} className={`space-y-1 ${c.divider ? 'pt-3 border-t border-white/10' : ''}`}>
        <div className={`flex justify-between ${text}`}>
          <span id={`${uid}-${c.key}`}>{c.label}</span>
          <span className="text-white/60">{formatValue(params[c.key], c.format)}</span>
        </div>
        <input
          type="range" min={c.min} max={c.max} step={c.step}
          value={params[c.key]}
          onChange={(e) => set(c.key, parseFloat(e.target.value))}
          className={`w-full ${tint.accent}`}
          aria-labelledby={`${uid}-${c.key}`}
        />
      </div>
    );
  };

  const head = narration ? splitHead(narration.head) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-b border-white/10">
        <div className="flex flex-wrap gap-x-4" role="group" aria-label="Mode">
          {MODE_BUTTONS.filter((b) => modes.includes(b.mode)).map((b) => (
            <button
              key={b.mode}
              onClick={() => setMode(b.mode)}
              aria-pressed={mode === b.mode}
              className={`${text} pb-0.5 border-b-2 ${mode === b.mode ? 'text-white' : 'border-transparent text-white/45 hover:text-white/75'}`}
              style={mode === b.mode ? { borderColor: b.color } : undefined}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 sm:ml-auto">
          <button
            onClick={() => {
              const next = !isPlaying;
              setIsPlaying(next);
              onAnnounce?.(`Simulation ${next ? 'resumed' : 'paused'}`);
            }}
            className={toggle(true)}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => setExplain(!explain)} aria-pressed={explain} className={toggle(explain)}>
            Labels
          </button>
          {model.legend && (
            <button onClick={() => setShowLegend(!showLegend)} aria-pressed={showLegend} className={toggle(showLegend)}>
              Legend
            </button>
          )}
          <button
            onClick={() => {
              setTheoryLoaded(true);
              setShowTheory(true);
              setPanel('sources');
            }}
            className={toggle(false)}
          >
            Sources
          </button>
          <button onClick={() => setShowControls(!showControls)} aria-expanded={showControls} className={toggle(showControls)}>
            Controls
          </button>
          <button onClick={enterImmersive} className={toggle(false)}>
            Full screen
          </button>
        </div>
      </div>

      {explain && narration && head && (
        <div className="shrink-0 flex items-start gap-6 px-4 py-2.5 border-b border-white/10" aria-live="polite">
          <div className="flex-1 min-w-0">
            <p className={`${isHighVis ? 'text-base' : 'text-sm'} leading-snug`}>
              {head.label && <span style={{ color: narration.color }}>{head.label}. </span>}
              {head.text}
            </p>
            <p className={`${text} leading-snug mt-1 text-white/55`}><Book text={narration.sub} /></p>
          </div>
          {narration.series.length > 0 && (
            <div className="hidden sm:block w-[240px] shrink-0">
              <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="w-full h-10" aria-hidden="true">
                {narration.series.map((x) => {
                  const step = Math.max(1, Math.floor(narration.span / 120));
                  const pts: string[] = [];
                  for (let k = 0; k < x.values.length; k += step) {
                    pts.push(`${((k / Math.max(1, narration.span - 1)) * 240).toFixed(1)},${(38 - Math.max(0, Math.min(1, x.values[k])) * 36).toFixed(1)}`);
                  }
                  return <polyline key={x.label} points={pts.join(' ')} fill="none" stroke={x.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div className="flex flex-wrap gap-x-3 mt-0.5 text-[10px] text-white/55">
                {narration.series.map((x) => (
                  <span key={x.label} style={{ color: x.color }}>{x.label}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1 bg-black flex overflow-hidden min-h-0">
        <div ref={wrapRef} className={immersive ? 'fixed inset-0 z-[200] bg-black overflow-hidden' : 'flex-1 relative overflow-hidden'} role="img" aria-label={model.describe(mode)}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {immersive && (
            <button
              onClick={exitImmersive}
              className={`absolute right-4 top-3 text-sm text-white/70 hover:text-white transition-opacity duration-500 ${pointerMoved ? 'opacity-100' : 'opacity-0'}`}
            >
              Exit full screen
            </button>
          )}
          {!immersive && showLegend && model.legend && (
            <div ref={legendRef} className="absolute left-3 bottom-3 max-w-[420px] bg-black/75 px-3 py-2 space-y-1" aria-label="Legend">
              {model.legend.map((r) => (
                <div key={r.see} className={`flex gap-2 items-baseline ${isHighVis ? 'text-xs' : 'text-[11px]'} leading-snug`}>
                  <span className="inline-block w-2 h-2 shrink-0 translate-y-px" style={{ background: r.swatch }} aria-hidden="true" />
                  <span>
                    <span className="text-white/90">{r.see}</span>
                    {r.social && <span className="text-white/60">: {r.social}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!immersive && isReducedMotion && !isPlaying && (
            <span className={`absolute right-3 bottom-3 ${text} text-white/60`}>Still frame. Press play to animate.</span>
          )}
        </div>

        {showControls && (
          <aside className="absolute md:relative right-0 top-0 bottom-0 z-50 w-64 bg-[#0b1220] border-l border-white/10 overflow-y-auto shrink-0 p-4 space-y-4">
            <div className="flex justify-between md:hidden">
              <span className={text}>Controls</span>
              <button onClick={() => setShowControls(false)} className={toggle(false)}>Close</button>
            </div>
            <div className="space-y-3">{model.controls.map(slider)}</div>
            <button
              onClick={() => {
                reinit();
                onAnnounce?.('Simulation reset');
              }}
              className={`w-full py-1.5 border border-white/20 hover:border-white/50 ${text}`}
            >
              Reset
            </button>
            <div className="pt-3 border-t border-white/10 space-y-2">
              <label className={`flex justify-between items-center ${text}`}>
                Reduce motion
                <input type="checkbox" checked={isReducedMotion} onChange={(e) => onReducedMotion?.(e.target.checked)} />
              </label>
              <label className={`flex justify-between items-center ${text}`}>
                Larger text
                <input type="checkbox" checked={isHighVis} onChange={(e) => onHighVis?.(e.target.checked)} />
              </label>
            </div>
          </aside>
        )}
      </div>

      {theoryLoaded && (
        <Suspense fallback={null}>
          <SourcesPanel modelType={model.id} isOpen={showTheory} onClose={() => {
            setShowTheory(false);
            setPanel(null);
          }} isHighVis={isHighVis} />
        </Suspense>
      )}
    </div>
  );
}

export default ModelShell;
