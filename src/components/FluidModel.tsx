import React, { useEffect, useRef, useState } from 'react';
import { Droplets, Waves, Shield, Play, Pause, RotateCcw, X } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isWarded: boolean;
  sizeMult: number;
  speedMult: number;
}

interface Vortex {
  x: number;
  y: number;
  vx: number;
  vy: number;
  strength: number;
  radius: number;
  life: number;
}

export const FluidModel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'state' | 'nomad' | 'nonstate' | 'conflict'>('state');
  const [intensity, setIntensity] = useState(0.5);
  const [particleCount, setParticleCount] = useState(1200);
  const [vortexStrength, setVortexStrength] = useState(1);
  const [obstacleCount, setObstacleCount] = useState(10);
  const [obstacleSize, setObstacleSize] = useState(45);
  const [nomadIntensity, setNomadIntensity] = useState(0.5);
  const [nomadSize, setNomadSize] = useState(1.5);
  const [showControls, setShowControls] = useState(true);
  
  const particles = useRef<Particle[]>([]);
  const vortices = useRef<Vortex[]>([]);
  const animationFrameId = useRef<number>(0);
  const paramsRef = useRef({
    intensity,
    vortexStrength,
    obstacleCount,
    obstacleSize,
    nomadIntensity,
    nomadSize,
    mode
  });

  useEffect(() => {
    paramsRef.current = {
      intensity,
      vortexStrength,
      obstacleCount,
      obstacleSize,
      nomadIntensity,
      nomadSize,
      mode
    };
  }, [intensity, vortexStrength, obstacleCount, obstacleSize, nomadIntensity, nomadSize, mode]);

  const initParticles = (width: number, height: number, count: number) => {
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() + 1) * 2,
      vy: (Math.random() - 0.5) * 0.5,
      isWarded: false,
      sizeMult: 0.5 + Math.random() * 2.0,
      speedMult: 0.5 + Math.random() * 2.0,
    }));
    vortices.current = [];
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
        vortexStrength: currentVortexStrength,
        obstacleCount: currentObstacleCount,
        obstacleSize: currentObstacleSize,
        nomadIntensity: currentNomadIntensity,
        nomadSize: currentNomadSize,
        mode: currentMode
      } = paramsRef.current;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const minDim = Math.min(width, height);
      const time = Date.now() * 0.001;

      // Responsive adjustments
      const effectiveObstacleSize = Math.min(currentObstacleSize, minDim * 0.15);

      // Draw Striated Lines (State Background)
      if (currentMode === 'state' || currentMode === 'conflict') {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Non-State Warding Obstacles
      const obstacles: {x: number, y: number, r: number}[] = [];
      if (currentMode === 'nonstate' || currentMode === 'conflict') {
        const count = currentMode === 'conflict' ? Math.ceil(currentObstacleCount / 2) : currentObstacleCount;
        for (let i = 0; i < count; i++) {
          const ox = (Math.sin(time * 0.3 + i * 1.8) * 0.4 + 0.5) * width;
          const oy = (Math.cos(time * 0.4 + i * 2.2) * 0.4 + 0.5) * height;
          obstacles.push({ x: ox, y: oy, r: effectiveObstacleSize });
          
          ctx.fillStyle = 'rgba(184, 134, 11, 0.1)';
          ctx.beginPath();
          ctx.arc(ox, oy, effectiveObstacleSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(184, 134, 11, 0.4)';
          ctx.stroke();

          // Vortex Shedding from Obstacles
          if ((currentMode === 'nomad' || currentMode === 'conflict') && Math.random() < 0.05 * currentIntensity) {
            vortices.current.push({
              x: ox + effectiveObstacleSize,
              y: oy + (Math.random() - 0.5) * effectiveObstacleSize,
              vx: (1 + Math.random()) * currentIntensity * 2,
              vy: (Math.random() - 0.5) * currentIntensity,
              strength: (Math.random() > 0.5 ? 1 : -1) * currentVortexStrength,
              radius: 40 + Math.random() * 60,
              life: 1.0
            });
          }
        }
      }

      // Boundary Layer Vortex Generation (Friction)
      if (currentMode === 'nomad' || currentMode === 'conflict') {
        if (Math.random() < 0.1 * currentIntensity) {
          const isTop = Math.random() > 0.5;
          vortices.current.push({
            x: 0,
            y: isTop ? Math.random() * 50 : height - Math.random() * 50,
            vx: (2 + Math.random()) * currentIntensity * 2,
            vy: (isTop ? 1 : -1) * Math.random() * currentIntensity,
            strength: (isTop ? 1 : -1) * currentVortexStrength,
            radius: 30 + Math.random() * 50,
            life: 1.0
          });
        }
      }

      // Update and Draw Vortices
      vortices.current = vortices.current.filter(v => v.life > 0);
      vortices.current.forEach(v => {
        v.x += v.vx;
        v.y += v.vy;
        v.life -= 0.005;
        
        // Visual indicator for vortex center (optional, very faint)
        ctx.fillStyle = `rgba(236, 0, 140, ${0.15 * v.life})`;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(236, 0, 140, ${0.1 * v.life})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      particles.current.forEach((p, i) => {
        let forceX = 0;
        let forceY = 0;
        let inVortex = false;

        // 1. Non-State (Warding off Laminar Flow)
        let isWarded = false;
        obstacles.forEach(o => {
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < o.r * o.r) {
            isWarded = true;
            forceX += (Math.random() - 0.5) * 4 * currentIntensity;
            forceY += (Math.random() - 0.5) * 4 * currentIntensity;
            p.vx *= 0.8;
            p.vy *= 0.8;
          }
        });
        p.isWarded = isWarded;

        // 2. Nomad Force (Dynamic Micro-Eddies / Smooth Space)
        // ALL particles interact with vortices if they are close enough
        vortices.current.forEach(v => {
          const dx = p.x - v.x;
          const dy = p.y - v.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < v.radius * v.radius) {
            inVortex = true;
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            const strength = (v.strength * 250 * currentNomadIntensity * p.speedMult * v.life) / (dist + 15);
            forceX += Math.cos(angle) * strength * 0.3 * currentIntensity;
            forceY += Math.sin(angle) * strength * 0.3 * currentIntensity;
          }
        });

        // 3. State (Laminar Flow / Striation)
        // Only apply if NOT in a vortex and NOT warded
        const isStateParticle = currentMode === 'state' || (currentMode === 'conflict' && i % 2 === 0);
        if (!isWarded && !inVortex && isStateParticle) {
          // Velocity gradient: slower near boundaries (friction)
          const distToEdge = Math.min(p.y, height - p.y);
          const friction = Math.max(0.2, Math.min(1, distToEdge / 100));
          forceX += 0.2 * currentIntensity * friction;
          forceY += Math.sin(p.x * 0.01 + time) * 0.05 * currentIntensity;
          p.vy *= 0.95;
        }

        // 4. Nomad Jitter (Smooth Space)
        const isNomadParticle = currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0);
        if (isNomadParticle || inVortex) {
          forceX += (Math.random() - 0.5) * 0.5 * currentNomadIntensity * p.speedMult;
          forceY += (Math.random() - 0.5) * 0.5 * currentNomadIntensity * p.speedMult;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Boundary & Respawn
        if (p.x > width) {
          p.x = 0;
          p.y = Math.random() * height;
          p.vx = 2;
        }
        if (p.x < 0) p.x = width;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw
        let pColor = '#00aeef'; // Xerox Cyan (State)
        if (isWarded) {
          pColor = '#b8860b'; // Xerox Yellow (Non-State)
        } else if (inVortex || currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0)) {
          pColor = '#ec008c'; // Xerox Magenta (Nomad/Deterritorialized)
        }

        ctx.strokeStyle = pColor;
        const isNomad = inVortex || currentMode === 'nomad' || (currentMode === 'conflict' && i % 2 !== 0);
        const currentSize = isNomad ? currentNomadSize : 1.5;
        ctx.lineWidth = (isWarded ? 2 : currentSize) * p.sizeMult;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.stroke();
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
            <Droplets className="w-5 h-5" />
            Hydraulic Metaphysics
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Fluid Dynamics // Flow</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowControls(!showControls)}
            className={`px-3 py-1 border-2 border-xerox-ink text-[9px] font-black uppercase transition-all brutal-shadow-sm ${showControls ? 'bg-xerox-ink text-xerox-bg' : 'bg-xerox-bg text-xerox-ink'}`}
          >
            {showControls ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-black flex overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full xerox-effect"
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
                  <span className="text-[9px] font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5">Operational Mode</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => setMode('state')}
                      className={`px-1 py-1 border-2 border-xerox-ink text-[9px] font-black uppercase transition-all ${mode === 'state' ? 'bg-xerox-cyan text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-cyan'}`}
                    >
                      STATE
                    </button>
                    <button 
                      onClick={() => setMode('nomad')}
                      className={`px-1 py-1 border-2 border-xerox-ink text-[9px] font-black uppercase transition-all ${mode === 'nomad' ? 'bg-xerox-magenta text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-magenta hover:text-xerox-bg'}`}
                    >
                      NOMAD
                    </button>
                    <button 
                      onClick={() => setMode('nonstate')}
                      className={`px-1 py-1 border-2 border-xerox-ink text-[9px] font-black uppercase transition-all ${mode === 'nonstate' ? 'bg-xerox-yellow text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-yellow'}`}
                    >
                      NON-STATE
                    </button>
                    <button 
                      onClick={() => setMode('conflict')}
                      className={`px-1 py-1 border-2 border-xerox-ink text-[9px] font-black uppercase transition-all ${mode === 'conflict' ? 'bg-xerox-accent text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-accent hover:text-xerox-bg'}`}
                    >
                      CONFLICT
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest block border-b border-xerox-ink pb-0.5">Parameters</span>
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-magenta">Flow Density</span>
                      <span className="text-[8px] font-black">{particleCount}</span>
                    </div>
                    <input 
                      type="range" min="200" max="2000" step="100" 
                      value={particleCount} 
                      onChange={(e) => setParticleCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-magenta">Nomad Intensity</span>
                      <span className="text-[8px] font-black">{(nomadIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="5" step="0.1" 
                      value={nomadIntensity} 
                      onChange={(e) => setNomadIntensity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-magenta">Nomad Size</span>
                      <span className="text-[8px] font-black">{nomadSize}px</span>
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
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-cyan">Vortex Strength</span>
                      <span className="text-[8px] font-black">{(vortexStrength * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="10" step="0.1" 
                      value={vortexStrength} 
                      onChange={(e) => setVortexStrength(parseFloat(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-yellow">Obstacle Count</span>
                      <span className="text-[8px] font-black">{obstacleCount}</span>
                    </div>
                    <input 
                      type="range" min="1" max="40" step="1" 
                      value={obstacleCount} 
                      onChange={(e) => setObstacleCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-xerox-yellow">Obstacle Size</span>
                      <span className="text-[8px] font-black">{obstacleSize}px</span>
                    </div>
                    <input 
                      type="range" min="0" max="300" step="5" 
                      value={obstacleSize} 
                      onChange={(e) => setObstacleSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                    />
                  </div>

                  <div className="pt-1 border-t border-xerox-ink/20">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest">Global Intensity</span>
                      <span className="text-[8px] font-black">{(intensity * 100).toFixed(0)}%</span>
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
                    className="w-full py-1 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm flex items-center justify-center gap-2 text-[8px] font-black uppercase"
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
              Laminar Flow: The State striates the current, forcing all particles into parallel lines. Friction at the boundaries creates the shear necessary for deterritorialization.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-magenta">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-magenta">02 / Nomad</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Dynamic Vortices: Singularities that emerge from boundary friction and obstacle wakes. They travel through the flow, actively disrupting the State's striation.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-yellow">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-yellow">03 / Non-State</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Warding Obstacles: Social mechanisms that break the flow and shed vortices. They act as "stones in the river" that generate the Nomad's turbulent smooth space.
            </p>
          </div>
        </div>
        <div className="md:hidden flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-60">
          <span>Mode: {mode}</span>
          <span>Flow: {(intensity * 100).toFixed(0)}%</span>
          <span>Particles: {particleCount}</span>
        </div>
      </div>
    </div>
  );
};

export default FluidModel;
