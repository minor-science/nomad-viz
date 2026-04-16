import React, { useEffect, useRef, useState } from 'react';
import { Waves, Zap, Wind, ShieldAlert, Play, Pause, RotateCcw, X, Info } from 'lucide-react';
import TheoryPanel from './TheoryPanel';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  intensity: number;
  sizeMult: number;
  speedMult: number;
}

export const AcousticModel: React.FC<{ isReducedMotion?: boolean; isHighVis?: boolean; onAnnounce?: (msg: string) => void }> = ({ isReducedMotion, isHighVis, onAnnounce }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'state' | 'nomad' | 'nonstate' | 'conflict'>('state');

  // Trigger announcement on mode change
  useEffect(() => {
    onAnnounce?.(`Acoustic Model switched to ${mode} mode`);
  }, [mode, onAnnounce]);
  const [intensity, setIntensity] = useState(0.4);
  const [particleCount, setParticleCount] = useState(1800);
  const [harmonicN, setHarmonicN] = useState(4);
  const [harmonicM, setHarmonicM] = useState(6);
  const [interferenceCount, setInterferenceCount] = useState(1);
  const [interferenceSize, setInterferenceSize] = useState(150);
  const [nomadIntensity, setNomadIntensity] = useState(0.3);
  const [nomadSize, setNomadSize] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showTheory, setShowTheory] = useState(false);
  
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  const paramsRef = useRef({
    intensity,
    harmonicN,
    harmonicM,
    interferenceCount,
    interferenceSize,
    nomadIntensity,
    nomadSize,
    mode
  });

  useEffect(() => {
    paramsRef.current = {
      intensity,
      harmonicN,
      harmonicM,
      interferenceCount,
      interferenceSize,
      nomadIntensity,
      nomadSize,
      mode
    };
  }, [intensity, harmonicN, harmonicM, interferenceCount, interferenceSize, nomadIntensity, nomadSize, mode]);

  const initParticles = (width: number, height: number, count: number) => {
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      intensity: Math.random(),
      sizeMult: 0.5 + Math.random() * 2.0,
      speedMult: 0.5 + Math.random() * 2.0,
    }));
  };

  const chladni = (x: number, y: number, L: number, n: number, m: number) => {
    return Math.cos(n * Math.PI * x / L) * Math.cos(m * Math.PI * y / L) - 
           Math.cos(m * Math.PI * x / L) * Math.cos(n * Math.PI * y / L);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initParticles(canvas.width, canvas.height, particleCount);
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      initParticles(canvas.width, canvas.height, particleCount);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!isPlaying) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      const { 
        intensity: currentIntensity, 
        harmonicN: currentN, 
        harmonicM: currentM, 
        interferenceCount: currentICount, 
        interferenceSize: currentISize, 
        nomadIntensity: currentNomadIntensity, 
        nomadSize: currentNomadSize,
        mode: currentMode
      } = paramsRef.current;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const minDim = Math.min(width, height);
      const L = minDim;
      const n = currentN;
      const m = currentM;
      const step = 2;
      const time = Date.now() * 0.001;

      // Responsive adjustments
      const effectiveInterferenceSize = Math.min(currentISize, minDim * 0.2);

      // Interference Zones
      const interferenceZones: {x: number, y: number}[] = [];
      if (currentMode === 'nonstate' || currentMode === 'conflict') {
        for (let i = 0; i < currentICount; i++) {
          // Move relative to screen size, slightly more centered for portrait
          const ix = (Math.sin(time * 0.5 + i * 1.2) * 0.4 + 0.5) * width;
          const iy = (Math.cos(time * 0.7 + i * 2.5) * 0.4 + 0.5) * height;
          interferenceZones.push({ x: ix, y: iy });
        }
      }

      particles.current.forEach((p, i) => {
        const val = chladni(p.x, p.y, L, n, m);
        
        // Numerical gradient
        const dx = (chladni(p.x + step, p.y, L, n, m) - val) / step;
        const dy = (chladni(p.x, p.y + step, L, n, m) - val) / step;

        let forceX = 0;
        let forceY = 0;

        const motionScale = isReducedMotion ? 0.2 : 1.0;

        // 1. Non-State (Destructive Interference / Silence)
        let isInterfered = false;
        interferenceZones.forEach(z => {
          const dist = Math.sqrt((p.x - z.x)**2 + (p.y - z.y)**2);
          if (dist < effectiveInterferenceSize) isInterfered = true;
        });

        if (isInterfered) {
          // Warding off resonance: particles are pushed into a state of "silence"
          // In this model, silence is the Great Refusal of the State's frequency.
          // Particles in silence zones ignore the Chladni gradient and move in chaotic, non-metric ways.
          const noiseScale = 2 * currentIntensity * motionScale;
          forceX += (Math.random() - 0.5) * noiseScale;
          forceY += (Math.random() - 0.5) * noiseScale;
          
          // They also resist the "settling" into nodes
          p.vx *= 0.9;
          p.vy *= 0.9;
        } else if (currentMode === 'state' || (currentMode === 'conflict' && i % 2 === 0)) {
          // 2. State (Standing Waves / Nodes)
          const force = currentIntensity * motionScale;
          forceX -= dx * Math.abs(val) * force * 10;
          forceY -= dy * Math.abs(val) * force * 10;
          p.vx *= 0.95;
          p.vy *= 0.95;
        } else if (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0)) {
          // 3. Nomad (Transversal / Off-resonant)
          const angle = Math.atan2(dy, dx) + Math.PI / 2;
          forceX += Math.cos(angle) * currentNomadIntensity * currentIntensity * 1.2 * p.speedMult * motionScale;
          forceY += Math.sin(angle) * currentNomadIntensity * currentIntensity * 1.2 * p.speedMult * motionScale;
          forceX += (Math.random() - 0.5) * currentNomadIntensity * 0.8 * p.speedMult * motionScale;
          forceY += (Math.random() - 0.5) * currentNomadIntensity * 0.8 * p.speedMult * motionScale;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.x += p.vx;
        p.y += p.vy;

        // Boundary
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw
        const isNearNode = Math.abs(val) < 0.1;
        let pColor = '#00aeef'; // Xerox Cyan
        if (isInterfered) pColor = '#b8860b'; // Xerox Yellow (Darker)
        else if (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0)) pColor = '#ec008c'; // Xerox Magenta
        else if (isNearNode) pColor = '#ec008c';

        ctx.fillStyle = pColor;
        ctx.beginPath();
        const baseSize = isInterfered ? 1.5 : (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0) ? currentNomadSize : (isNearNode ? 1.5 : 1));
        const pSize = baseSize * p.sizeMult;
        ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // Visual indicator for Non-State Warding (Silence Zones)
      if (currentMode === 'nonstate' || currentMode === 'conflict') {
        interferenceZones.forEach(z => {
          // Draw a more "active" silence zone
          const pulse = Math.sin(time * 5) * 5;
          ctx.strokeStyle = 'rgba(184, 134, 11, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(z.x, z.y, currentISize + pulse, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner core of silence
          ctx.fillStyle = 'rgba(184, 134, 11, 0.05)';
          ctx.beginPath();
          ctx.arc(z.x, z.y, currentISize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Static/Noise effect in silence zone
          for (let j = 0; j < 5; j++) {
            const rx = z.x + (Math.random() - 0.5) * currentISize * 2;
            const ry = z.y + (Math.random() - 0.5) * currentISize * 2;
            if (Math.sqrt((rx - z.x)**2 + (ry - z.y)**2) < currentISize) {
              ctx.fillStyle = 'rgba(184, 134, 11, 0.3)';
              ctx.fillRect(rx, ry, 1, 1);
            }
          }
        });
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col h-full bg-xerox-bg border-4 border-xerox-ink overflow-hidden brutal-shadow">
      <div className="p-3 border-b-4 border-xerox-ink flex items-center justify-between bg-xerox-bg">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 italic">
            <Waves className="w-5 h-5" />
            Acoustic Metaphysics
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Resonant Frequency // Cymatics</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const newPlaying = !isPlaying;
              setIsPlaying(newPlaying);
              onAnnounce?.(`Simulation ${newPlaying ? 'resumed' : 'paused'}`);
            }}
            className={`p-2 border-2 border-xerox-ink transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center ${isPlaying ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
            aria-label={isPlaying ? "Pause Simulation" : "Play Simulation"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => {
              setShowTheory(true);
              onAnnounce?.("Opened technical manual");
            }}
            className={`p-2 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center bg-xerox-bg text-xerox-ink`}
            aria-label="View Technical Equations"
          >
            <Info className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setShowControls(!showControls);
              onAnnounce?.(`${!showControls ? 'Opened' : 'Closed'} simulation controls`);
            }}
            className={`px-3 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-sm' : 'text-[10px]'} font-black uppercase transition-all brutal-shadow-sm min-h-[44px] ${showControls ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
            aria-label={showControls ? "Hide Controls" : "Show Controls"}
            aria-expanded={showControls}
          >
            {showControls ? 'Hide' : 'Controls'}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-black flex overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden" role="img" aria-label={`Acoustic Metaphysics Simulation: A resonant visualization showing ${mode} sound waves.`}>
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full ${isHighVis ? '' : 'xerox-effect'}`}
          />
        </div>
        
        {/* Sidebar Controls */}
        {showControls && (
          <aside className="absolute md:relative right-0 top-0 bottom-0 z-50 w-64 bg-xerox-bg border-l-4 border-xerox-ink flex flex-col pointer-events-auto shrink-0 h-full shadow-[-10px_0_0_rgba(0,0,0,0.1)] md:shadow-none overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between md:hidden mb-4 border-b-2 border-xerox-ink pb-2">
                <span className="text-[10px] font-black uppercase">Controls</span>
                <button onClick={() => setShowControls(false)} className="p-1 border-2 border-xerox-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className={`${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Operational Mode</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => setMode('state')}
                      className={`px-1 py-1 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all ${mode === 'state' ? 'bg-xerox-cyan text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-cyan'}`}
                    >
                      STATE
                    </button>
                    <button 
                      onClick={() => setMode('nomad')}
                      className={`px-1 py-1 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all ${mode === 'nomad' ? 'bg-xerox-magenta text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-magenta hover:text-xerox-bg'}`}
                    >
                      NOMAD
                    </button>
                    <button 
                      onClick={() => setMode('nonstate')}
                      className={`px-1 py-1 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all ${mode === 'nonstate' ? 'bg-xerox-yellow text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-yellow'}`}
                    >
                      NON-STATE
                    </button>
                    <button 
                      onClick={() => setMode('conflict')}
                      className={`px-1 py-1 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all ${mode === 'conflict' ? 'bg-xerox-accent text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-accent hover:text-xerox-bg'}`}
                    >
                      CONFLICT
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={`${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Parameters</span>
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-magenta`}>Dust Density</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{particleCount}</span>
                    </div>
                    <input 
                      type="range" min="500" max="3000" step="100" 
                      value={particleCount} 
                      onChange={(e) => setParticleCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-magenta`}>Nomad Intensity</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{(nomadIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="2" step="0.1" 
                      value={nomadIntensity} 
                      onChange={(e) => setNomadIntensity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-magenta`}>Nomad Size</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{nomadSize}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" step="0.1" 
                      value={nomadSize} 
                      onChange={(e) => setNomadSize(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-cyan`}>Harmonic Mode</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{harmonicN} : {harmonicM}</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="range" min="1" max="24" step="1" 
                        value={harmonicN} 
                        onChange={(e) => setHarmonicN(parseInt(e.target.value))}
                        className="w-1/2 h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                      />
                      <input 
                        type="range" min="1" max="24" step="1" 
                        value={harmonicM} 
                        onChange={(e) => setHarmonicM(parseInt(e.target.value))}
                        className="w-1/2 h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-yellow`}>Silence Zones</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{interferenceCount}</span>
                    </div>
                    <input 
                      type="range" min="1" max="15" step="1" 
                      value={interferenceCount} 
                      onChange={(e) => setInterferenceCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-yellow`}>Silence Size</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{interferenceSize}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="600" step="10" 
                      value={interferenceSize} 
                      onChange={(e) => setInterferenceSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="pt-1 border-t border-xerox-ink/20">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest`}>Resonance</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{(intensity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" 
                      value={intensity} 
                      onChange={(e) => setIntensity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-ink border border-xerox-ink"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button 
                    onClick={() => initParticles(canvasRef.current?.width || 0, canvasRef.current?.height || 0, particleCount)}
                    className={`w-full py-1 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm flex items-center justify-center gap-2 ${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Simulation
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div className="p-3 bg-xerox-bg border-t-4 border-xerox-ink">
        <div className="hidden md:grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-cyan">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-cyan">01 / State</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Despotic Resonance: The State imposes a single frequency. Matter is forced into rigid nodes, creating a geometric striation.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-magenta">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-magenta">02 / Nomad</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Transversal Rhythms: The Nomad operates in the vibrating zones between nodes, refusing to settle into the State's geometric order.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-yellow">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-yellow">03 / Non-State</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              The Great Refusal: Mechanisms of "silence" that actively ward off the State's resonance through destructive interference and white noise.
            </p>
          </div>
        </div>
        <div className="md:hidden flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-60">
          <span>Mode: {mode}</span>
          <span>Resonance: {(intensity * 100).toFixed(0)}%</span>
          <span>Dust: {particleCount}</span>
        </div>
      </div>

      <TheoryPanel 
        modelType="acoustic" 
        isOpen={showTheory} 
        onClose={() => setShowTheory(false)}
        isHighVis={isHighVis}
      />
    </div>
  );
};

export default AcousticModel;
