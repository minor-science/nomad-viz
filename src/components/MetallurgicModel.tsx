import React, { useEffect, useRef, useState } from 'react';
import { Flame, Zap, Wind, Shield, Play, Pause, RotateCcw, X, Info } from 'lucide-react';
import TheoryPanel from './TheoryPanel';

interface Atom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isFixed: boolean;
  intensity: number;
}

export const MetallurgicModel: React.FC<{ isReducedMotion?: boolean; isHighVis?: boolean; onAnnounce?: (msg: string) => void }> = ({ isReducedMotion, isHighVis, onAnnounce }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'state' | 'nomad' | 'nonstate' | 'conflict'>('state');

  // Trigger announcement on mode change
  useEffect(() => {
    onAnnounce?.(`Metallurgic Model switched to ${mode} mode`);
  }, [mode, onAnnounce]);
  const [intensity, setIntensity] = useState(0.4);
  const [particleCount, setParticleCount] = useState(1200);
  const [latticeStability, setLatticeStability] = useState(0.1);
  const [inhibitorCount, setInhibitorCount] = useState(8);
  const [inhibitorSize, setInhibitorSize] = useState(70);
  const [nomadIntensity, setNomadIntensity] = useState(0.3);
  const [nomadSize, setNomadSize] = useState(1.5);
  const [showControls, setShowControls] = useState(true);
  const [showTheory, setShowTheory] = useState(false);
  
  const atoms = useRef<(Atom & { sizeMult: number; speedMult: number })[]>([]);
  const animationFrameId = useRef<number>(0);
  const paramsRef = useRef({
    intensity,
    latticeStability,
    inhibitorCount,
    inhibitorSize,
    nomadIntensity,
    nomadSize,
    mode
  });

  useEffect(() => {
    paramsRef.current = {
      intensity,
      latticeStability,
      inhibitorCount,
      inhibitorSize,
      nomadIntensity,
      nomadSize,
      mode
    };
  }, [intensity, latticeStability, inhibitorCount, inhibitorSize, nomadIntensity, nomadSize, mode]);

  const initAtoms = (width: number, height: number, count: number) => {
    atoms.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      isFixed: false,
      intensity: Math.random(),
      sizeMult: 0.5 + Math.random() * 1.5,
      speedMult: 0.5 + Math.random() * 1.5,
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initAtoms(canvas.width, canvas.height, particleCount);
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      initAtoms(canvas.width, canvas.height, particleCount);
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
        latticeStability: currentLStability,
        inhibitorCount: currentICount,
        inhibitorSize: currentISize,
        nomadIntensity: currentNomadIntensity,
        nomadSize: currentNomadSize,
        mode: currentMode
      } = paramsRef.current;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const minDim = Math.min(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const time = Date.now() * 0.001;

      // Responsive adjustments
      const effectiveInhibitorSize = Math.min(currentISize, minDim * 0.2);

      // Non-State Inhibitor Zones (Anticipation)
      const inhibitors: {x: number, y: number, r: number}[] = [];
      if (currentMode === 'nonstate' || currentMode === 'conflict') {
        const count = currentMode === 'conflict' ? Math.ceil(currentICount / 2) : currentICount;
        for (let i = 0; i < count; i++) {
          // Move relative to screen size, slightly more centered for portrait
          const ix = (Math.sin(time * 0.3 + i * 2.5) * 0.4 + 0.5) * width;
          const iy = (Math.cos(time * 0.4 + i * 1.8) * 0.4 + 0.5) * height;
          inhibitors.push({ x: ix, y: iy, r: effectiveInhibitorSize });
          
          ctx.strokeStyle = 'rgba(184, 134, 11, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ix, iy, effectiveInhibitorSize, 0, Math.PI * 2);
          ctx.stroke();
          // Draw "anti-freeze" pulses
          const pulse = (time * 2 + i) % 1;
          ctx.strokeStyle = `rgba(184, 134, 11, ${0.3 * (1 - pulse)})`;
          ctx.beginPath();
          ctx.arc(ix, iy, effectiveInhibitorSize * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      atoms.current.forEach((a, i) => {
        let forceX = 0;
        let forceY = 0;

        const motionScale = isReducedMotion ? 0.2 : 1.0;

        // 1. Non-State (Inhibitors / Anti-freeze)
        let isInhibited = false;
        inhibitors.forEach(inh => {
          const dx = a.x - inh.x;
          const dy = a.y - inh.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < inh.r) {
            isInhibited = true;
            // Prevent crystallization: add high kinetic energy
            forceX += (Math.random() - 0.5) * 2 * currentIntensity * motionScale;
            forceY += (Math.random() - 0.5) * 2 * currentIntensity * motionScale;
          }
        });

        // 2. State (Crystallization / Striation)
        if (!isInhibited && (currentMode === 'state' || (currentMode === 'conflict' && i % 2 === 0))) {
          const gridSize = 40;
          const targetX = Math.round(a.x / gridSize) * gridSize;
          const targetY = Math.round(a.y / gridSize) * gridSize;

          // Periodic boundary aware force
          let dx_grid = targetX - a.x;
          if (dx_grid > width / 2) dx_grid -= width;
          if (dx_grid < -width / 2) dx_grid += width;
          
          let dy_grid = targetY - a.y;
          if (dy_grid > height / 2) dy_grid -= height;
          if (dy_grid < -height / 2) dy_grid += height;

          // Add organic noise to prevent perfect clustering
          const noiseX = Math.sin(a.y * 0.05 + time) * 2;
          const noiseY = Math.cos(a.x * 0.05 + time) * 2;

          forceX += (dx_grid + noiseX) * currentLStability * currentIntensity * motionScale;
          forceY += (dy_grid + noiseY) * currentLStability * currentIntensity * motionScale;
          
          a.vx *= 0.85;
          a.vy *= 0.85;
          a.isFixed = Math.abs(dx_grid) < 4 && Math.abs(dy_grid) < 4;
        } else {
          a.isFixed = false;
        }

        // 3. Nomad (Superfluidity / War Machine)
        if (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0)) {
          // Flow along a vector field
          const angle = Math.sin(a.x * 0.005 + time) * Math.cos(a.y * 0.005) * Math.PI * 2;
          forceX += Math.cos(angle) * currentNomadIntensity * currentIntensity * 0.8 * a.speedMult * motionScale;
          forceY += Math.sin(angle) * currentNomadIntensity * currentIntensity * 0.8 * a.speedMult * motionScale;
          
          // Deterritorializing jitter
          forceX += (Math.random() - 0.5) * currentNomadIntensity * 1 * a.speedMult * motionScale;
          forceY += (Math.random() - 0.5) * currentNomadIntensity * 1 * a.speedMult * motionScale;
          a.vx *= 0.99;
        }

        a.vx += forceX;
        a.vy += forceY;
        a.x += a.vx;
        a.y += a.vy;

        // Boundary
        if (a.x < 0) a.x = width;
        if (a.x > width) a.x = 0;
        if (a.y < 0) a.y = height;
        if (a.y > height) a.y = 0;

        // Draw
        let aColor = '#94a3b8';
        if (a.isFixed) aColor = '#00aeef'; // Xerox Cyan
        else if (isInhibited) aColor = '#b8860b'; // Xerox Yellow (Darker)
        else if (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0)) aColor = '#ec008c'; // Xerox Magenta

        ctx.fillStyle = aColor;
        ctx.beginPath();
        const baseSize = a.isFixed ? 2.5 : (isInhibited ? 2 : (currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0) ? currentNomadSize : 1.5));
        const aSize = baseSize * a.sizeMult;
        ctx.arc(a.x, a.y, aSize, 0, Math.PI * 2);
        ctx.fill();
        
        if (a.isFixed && currentMode === 'state') {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
          ctx.lineWidth = 0.5;
          // Visual bonds
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + 40, a.y);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x, a.y + 40);
          ctx.stroke();
        }
      });

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
            <Zap className="w-5 h-5" />
            Metallurgic Metaphysics
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Thermodynamic Flow // Superfluidity</p>
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
        <div className="flex-1 relative overflow-hidden" role="img" aria-label={`Metallurgic Metaphysics Simulation: An atomic visualization showing ${mode} crystallization and nomad fluidity.`}>
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
                <div className="space-y-1.5" role="group" aria-labelledby="mode-label">
                  <span id="mode-label" className={`${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Operational Mode</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => setMode('state')}
                      aria-pressed={mode === 'state'}
                      className={`px-2 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all min-h-[44px] ${mode === 'state' ? 'bg-xerox-cyan text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-cyan'}`}
                    >
                      STATE
                    </button>
                    <button 
                      onClick={() => setMode('nomad')}
                      aria-pressed={mode === 'nomad'}
                      className={`px-2 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all min-h-[44px] ${mode === 'nomad' ? 'bg-xerox-magenta text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-magenta hover:text-xerox-bg'}`}
                    >
                      NOMAD
                    </button>
                    <button 
                      onClick={() => setMode('nonstate')}
                      aria-pressed={mode === 'nonstate'}
                      className={`px-2 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all min-h-[44px] ${mode === 'nonstate' ? 'bg-xerox-yellow text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-yellow'}`}
                    >
                      NON-STATE
                    </button>
                    <button 
                      onClick={() => setMode('conflict')}
                      aria-pressed={mode === 'conflict'}
                      className={`px-2 py-2 border-2 border-xerox-ink ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase transition-all min-h-[44px] ${mode === 'conflict' ? 'bg-xerox-accent text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-accent hover:text-xerox-bg'}`}
                    >
                      CONFLICT
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={`${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5`}>Parameters</span>
                  
                  <div className="space-y-0.5" role="group" aria-labelledby="density-label">
                    <div className="flex items-center justify-between">
                      <span id="density-label" className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-magenta`}>Atomic Density</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{particleCount}</span>
                    </div>
                    <input 
                      type="range" min="200" max="2000" step="100" 
                      value={particleCount} 
                      onChange={(e) => setParticleCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                      aria-label="Atomic Density"
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
                      type="range" min="0" max="15" step="0.1" 
                      value={nomadSize} 
                      onChange={(e) => setNomadSize(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-cyan`}>Lattice Stability</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{(latticeStability * 1000).toFixed(0)}</span>
                    </div>
                    <input 
                      type="range" min="0.01" max="1" step="0.01" 
                      value={latticeStability} 
                      onChange={(e) => setLatticeStability(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-yellow`}>Inhibitor Count</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{inhibitorCount}</span>
                    </div>
                    <input 
                      type="range" min="1" max="30" step="1" 
                      value={inhibitorCount} 
                      onChange={(e) => setInhibitorCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-xerox-yellow`}>Inhibitor Size</span>
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black`}>{inhibitorSize}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="400" step="5" 
                      value={inhibitorSize} 
                      onChange={(e) => setInhibitorSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="pt-1 border-t border-xerox-ink/20">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`${isHighVis ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest`}>Thermal Power</span>
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
                    onClick={() => {
                      initAtoms(canvasRef.current?.width || 0, canvasRef.current?.height || 0, particleCount);
                      onAnnounce?.("Simulation reset");
                    }}
                    className={`w-full py-2 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm flex items-center justify-center gap-2 ${isHighVis ? 'text-xs' : 'text-[9px]'} font-black uppercase min-h-[44px]`}
                    aria-label="Reset Simulation"
                  >
                    <RotateCcw className="w-4 h-4" />
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
              Crystallization: Striated space as a rigid lattice. Particles are frozen into fixed positions, becoming part of an extensive order.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-magenta">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-magenta">02 / Nomad</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Superfluidity: The War Machine as a flow with zero viscosity. It deterritorializes the crystal, releasing matter back into smooth space.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-yellow">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-yellow">03 / Non-State</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Inhibitors: Social mechanisms of "anti-freeze" that actively prevent crystallization from starting, warding off the State.
            </p>
          </div>
        </div>
        <div className="md:hidden flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-60">
          <span>Mode: {mode}</span>
          <span>Power: {(intensity * 100).toFixed(0)}%</span>
          <span>Atoms: {particleCount}</span>
        </div>
      </div>

      <TheoryPanel 
        modelType="metallurgic" 
        isOpen={showTheory} 
        onClose={() => setShowTheory(false)}
        isHighVis={isHighVis}
      />
    </div>
  );
};

export default MetallurgicModel;
