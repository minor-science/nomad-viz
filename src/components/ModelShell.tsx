import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Info, List, Pause, Play, RotateCcw, Tags, X } from 'lucide-react';
import { PROCESS } from '../processes';
import {
  WORLD_SCALE, DEFAULT_MODES, defaults, formatValue,
  type ControlSpec, type Mode, type ModelDef, type Narration, type Params, type Tint,
} from '../sim/types';
import { readMode, readPanel, readParams, setPanel, writeState } from '../sim/url';
import { Book, capFirst } from './Book';

const SourcesPanel = lazy(() => import('./SourcesPanel'));

// Under reduced motion the shell shows a still: this many frames are computed off screen.
const STILL_FRAMES = 150;

// Conflict comes first: every model opens with its processes together, and the others isolate one.
const MODE_BUTTONS: { mode: Mode; label: string; on: string; hover: string }[] = [
  { mode: 'conflict', label: 'Conflict', on: 'bg-xerox-accent text-xerox-bg', hover: 'hover:bg-xerox-accent hover:text-xerox-bg' },
  { mode: 'state', label: 'Capture', on: 'bg-xerox-cyan text-xerox-ink', hover: 'hover:bg-xerox-cyan' },
  { mode: 'nomad', label: 'War machine', on: 'bg-xerox-magenta text-xerox-bg', hover: 'hover:bg-xerox-magenta hover:text-xerox-bg' },
  { mode: 'nonstate', label: 'Warding off', on: 'bg-xerox-yellow text-xerox-ink', hover: 'hover:bg-xerox-yellow' },
  { mode: 'town', label: 'Polarization', on: 'bg-[#2f8f4e] text-xerox-bg', hover: 'hover:bg-[#2f8f4e] hover:text-xerox-bg' },
];

const TINT: Record<Tint, { text: string; accent: string }> = {
  magenta: { text: 'text-xerox-magenta', accent: 'accent-xerox-magenta' },
  cyan: { text: 'text-xerox-cyan', accent: 'accent-xerox-cyan' },
  yellow: { text: 'text-xerox-yellow', accent: 'accent-xerox-yellow' },
  green: { text: 'text-[#2f8f4e]', accent: 'accent-[#2f8f4e]' },
  ink: { text: '', accent: 'accent-xerox-ink' },
};

interface Props {
  model: ModelDef;
  isReducedMotion?: boolean;
  isHighVis?: boolean;
  onAnnounce?: (msg: string) => void;
}

export function ModelShell({ model, isReducedMotion = false, isHighVis = false, onAnnounce }: Props) {
  const base = useMemo(() => defaults(model.controls), [model]);
  const modes = model.modes ?? DEFAULT_MODES;
  const [mode, setMode] = useState<Mode>(() => {
    const m = readMode();
    if (m && modes.includes(m)) return m;
    return modes.includes('conflict') ? 'conflict' : modes[0];
  });
  const [params, setParams] = useState<Params>(() => readParams(model.controls, base));
  const [isPlaying, setIsPlaying] = useState(!isReducedMotion);
  const [showControls, setShowControls] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [explain, setExplain] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [showTheory, setShowTheory] = useState(() => readPanel() === 'sources');
  const [theoryLoaded, setTheoryLoaded] = useState(() => readPanel() === 'sources');
  const uid = useId();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef(model.create()).current;
  const live = useRef({ mode, params, motionScale: isReducedMotion ? 0.2 : 1, explain: true });
  const world = useRef({ width: 0, height: 0, time: 0, ready: false });

  live.current = { mode, params, motionScale: isReducedMotion ? 0.2 : 1, explain };
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const step = (motionScale = live.current.motionScale) => {
    const ctx = canvasRef.current?.getContext('2d');
    const w = world.current;
    if (!ctx || !w.ready) return;
    w.time += 1 / 60;
    sim.frame(ctx, { width: w.width, height: w.height, time: w.time, mode: live.current.mode, params: live.current.params, motionScale, explain: live.current.explain });
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
  }, [mode, params, explain]);

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

  const set = (key: string, value: number) => setParams((p) => ({ ...p, [key]: value }));
  const small = isHighVis ? 'text-[10px]' : 'text-[8px]';
  const label = isHighVis ? 'text-xs' : 'text-[9px]';
  const Icon = model.headerIcon;

  const slider = (c: ControlSpec) => {
    const tint = TINT[c.tint];
    if (c.kind === 'pair') {
      const [a, b] = c.keys;
      return (
        <div key={c.label} className="space-y-0.5" role="group" aria-labelledby={`${uid}-${a}`}>
          <div className="flex items-center justify-between">
            <span id={`${uid}-${a}`} className={`${small} font-black uppercase tracking-widest ${tint.text}`}>{c.label}</span>
            <span className={`${small} font-black`}>{params[a]} : {params[b]}</span>
          </div>
          <div className="flex gap-2">
            {c.keys.map((k, i) => (
              <input
                key={k}
                type="range" min={c.min} max={c.max} step={c.step}
                value={params[k]}
                onChange={(e) => set(k, parseFloat(e.target.value))}
                className={`w-1/2 h-1 bg-xerox-ink appearance-none cursor-pointer ${tint.accent} border border-xerox-ink`}
                aria-label={`${c.label} ${i === 0 ? 'n' : 'm'}`}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={c.key} className={`space-y-0.5 ${c.divider ? 'pt-1 border-t border-xerox-ink/20' : ''}`}>
        <div className="flex items-center justify-between">
          <span id={`${uid}-${c.key}`} className={`${small} font-black uppercase tracking-widest ${tint.text}`}>{c.label}</span>
          <span className={`${small} font-black`}>{formatValue(params[c.key], c.format)}</span>
        </div>
        <input
          type="range" min={c.min} max={c.max} step={c.step}
          value={params[c.key]}
          onChange={(e) => set(c.key, parseFloat(e.target.value))}
          className={`w-full h-1 bg-xerox-ink appearance-none cursor-pointer ${tint.accent} border border-xerox-ink`}
          aria-labelledby={`${uid}-${c.key}`}
        />
      </div>
    );
  };

  const cards = (
    <>
      {model.cards.map((card) => {
        const color = PROCESS[card.process].color;
        return (
          <div key={card.heading} className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest border-b-2" style={{ color, borderColor: color }}>
              {card.heading}
            </span>
            <p className="text-[10px] font-bold leading-tight uppercase"><Book text={card.text} /></p>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-xerox-bg border-4 border-xerox-ink overflow-hidden brutal-shadow">
      <div className="p-3 border-b-4 border-xerox-ink flex items-center justify-between gap-2 bg-xerox-bg">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-black uppercase tracking-tighter flex items-center gap-2 italic">
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            {model.title}
            {model.badge && (
              <span className="text-[8px] bg-xerox-ink text-xerox-bg px-1 py-0.5 not-italic tracking-widest">{model.badge.toUpperCase()}</span>
            )}
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 truncate">{model.subtitle}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              const next = !isPlaying;
              setIsPlaying(next);
              onAnnounce?.(`Simulation ${next ? 'resumed' : 'paused'}`);
            }}
            className={`p-2 border-2 border-xerox-ink transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center ${isPlaying ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
            aria-label={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              setExplain(!explain);
              onAnnounce?.(`Tags ${!explain ? 'shown' : 'hidden'}`);
            }}
            aria-pressed={explain}
            className={`p-2 border-2 border-xerox-ink transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center ${explain ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
            aria-label={explain ? 'Hide tags' : 'Show tags'}
            title="Tags"
          >
            <Tags className="w-5 h-5" />
          </button>
          {model.legend && (
            <button
              onClick={() => {
                setShowLegend(!showLegend);
                onAnnounce?.(`Legend ${!showLegend ? 'shown' : 'hidden'}`);
              }}
              aria-pressed={showLegend}
              className={`p-2 border-2 border-xerox-ink transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center ${showLegend ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
              aria-label={showLegend ? 'Hide legend' : 'Show legend'}
              title="Legend"
            >
              <List className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => {
              setTheoryLoaded(true);
              setShowTheory(true);
              setPanel('sources');
              onAnnounce?.('Opened sources');
            }}
            className="p-2 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center bg-xerox-bg text-xerox-ink"
            aria-label="View sources" title="Sources"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setShowControls(!showControls);
              onAnnounce?.(`${!showControls ? 'Opened' : 'Closed'} simulation controls`);
            }}
            className={`px-3 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-sm' : 'text-[10px]'} font-black uppercase transition-all brutal-shadow-sm min-h-[44px] ${showControls ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
            aria-label={showControls ? 'Hide Controls' : 'Show Controls'}
            aria-expanded={showControls}
          >
            {showControls ? 'Hide' : 'Controls'}
          </button>
        </div>
      </div>

      {explain && narration && (
        <div className="flex items-center gap-4 px-3 py-2 border-b-4 border-xerox-ink bg-black text-xerox-bg" style={{ boxShadow: `inset 6px 0 0 ${narration.color}` }} aria-live="polite">
          <div className="flex-1 min-w-0 pl-2">
            <p className="text-[11px] md:text-xs font-mono font-black uppercase leading-snug" style={{ color: narration.color }}>{narration.head}</p>
            <p className="text-[11px] font-sans leading-snug mt-0.5 text-[#d1d5db]"><Book text={narration.sub} /></p>
          </div>
          {narration.series.length > 0 && (
            <div className="hidden sm:block w-[260px] shrink-0">
              <svg viewBox="0 0 260 48" preserveAspectRatio="none" className="w-full h-12 border border-[#334155]" aria-hidden="true">
                {narration.series.map((x) => {
                  const step = Math.max(1, Math.floor(narration.span / 130));
                  const pts: string[] = [];
                  for (let k = 0; k < x.values.length; k += step) {
                    pts.push(`${((k / Math.max(1, narration.span - 1)) * 260).toFixed(1)},${(46 - Math.max(0, Math.min(1, x.values[k])) * 44).toFixed(1)}`);
                  }
                  return <polyline key={x.label} points={pts.join(' ')} fill="none" stroke={x.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div className="flex flex-wrap gap-x-3 mt-1 text-[9px] font-mono uppercase tracking-wider">
                {narration.series.map((x) => (
                  <span key={x.label} className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5" style={{ background: x.color }} aria-hidden="true" />
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1 bg-black flex overflow-hidden min-h-0">
        <div ref={wrapRef} className="flex-1 relative overflow-hidden" role="img" aria-label={model.describe(mode)}>
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${isHighVis ? '' : 'xerox-effect'}`} />
          {showLegend && model.legend && (
            <div className="hidden md:block absolute left-2 bottom-2 max-w-[580px] bg-black/80 text-xerox-bg border-2 border-xerox-bg/40 p-2 space-y-1" aria-label="Legend">
              {model.legend.map((r) => (
                <div key={r.see} className="flex gap-2 items-baseline text-[10px] leading-snug font-sans">
                  <span className="inline-block w-2.5 h-2.5 shrink-0 translate-y-0.5" style={{ background: r.swatch }} aria-hidden="true" />
                  <span>
                    <b className="font-mono uppercase tracking-wider">{r.see}</b>
                    {r.social && <b className="text-[#fde68a]"> = {r.social}</b>}. <span className="opacity-80">Physics: {r.physics}.</span> <span className="opacity-90"><Book text={capFirst(r.atp)} />.</span>
                    {r.example && <span className="opacity-70"> e.g. <Book text={r.example} />.</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {isReducedMotion && !isPlaying && (
            <span className="absolute right-2 bottom-2 bg-xerox-bg text-xerox-ink border-2 border-xerox-ink px-2 py-1 text-[9px] font-black uppercase tracking-widest">
              Still frame (reduced motion). Press play to animate.
            </span>
          )}
        </div>

        {showControls && (
          <aside className="absolute md:relative right-0 top-0 bottom-0 z-50 w-64 bg-xerox-bg border-l-4 border-xerox-ink flex flex-col pointer-events-auto shrink-0 h-full shadow-[-10px_0_0_rgba(0,0,0,0.1)] md:shadow-none overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between md:hidden mb-4 border-b-2 border-xerox-ink pb-2">
                <span className="text-[10px] font-black uppercase">Controls</span>
                <button onClick={() => setShowControls(false)} className="p-1 border-2 border-xerox-ink" aria-label="Close controls">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5" role="group" aria-labelledby={`${uid}-mode`}>
                  <span id={`${uid}-mode`} className={`${label} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Operational Mode</span>
                  <div className="grid grid-cols-2 gap-1">
                    {MODE_BUTTONS.filter((b) => modes.includes(b.mode)).map((b) => (
                      <button
                        key={b.mode}
                        onClick={() => setMode(b.mode)}
                        aria-pressed={mode === b.mode}
                        className={`px-2 py-2 border-2 border-xerox-ink ${label} font-black uppercase transition-all min-h-[44px] ${mode === b.mode ? `${b.on} brutal-shadow-sm` : `bg-white text-xerox-ink ${b.hover}`}`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={`${label} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Parameters</span>
                  {model.controls.map(slider)}
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      reinit();
                      onAnnounce?.('Simulation reset');
                    }}
                    className={`w-full py-2 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm flex items-center justify-center gap-2 ${label} font-black uppercase min-h-[44px]`}
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    Reset Simulation
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div className="p-3 bg-xerox-bg border-t-4 border-xerox-ink">
        <div className="hidden md:grid grid-cols-3 gap-4">{cards}</div>
        <div className="md:hidden space-y-2">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 items-center text-[8px] font-black uppercase tracking-widest opacity-60">
            <span>Mode: {MODE_BUTTONS.find((b) => b.mode === mode)?.label}</span>
            {model.status(params).map(([k, v]) => (
              <span key={k}>{k}: {v}</span>
            ))}
          </div>
          <details>
            <summary className="text-[10px] font-black uppercase tracking-widest cursor-pointer min-h-[32px] flex items-center">What am I seeing?</summary>
            <div className="grid grid-cols-1 gap-3 pt-2 max-h-[40vh] overflow-y-auto">
              {cards}
              {model.legend?.map((r) => (
                <p key={r.see} className="text-[10px] leading-snug">
                  <span className="inline-block w-2.5 h-2.5 mr-1" style={{ background: r.swatch }} aria-hidden="true" />
                  <b className="uppercase">{r.see}</b>{r.social ? ` = ${r.social}` : ''}. Physics: {r.physics}. <Book text={capFirst(r.atp)} />.{r.example ? <> e.g. <Book text={r.example} />.</> : ''}
                </p>
              ))}
            </div>
          </details>
        </div>
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
