import React, { useEffect, useRef, useState } from 'react';
import { Magnet, Zap, Wind, ShieldAlert, Play, Pause, RotateCcw, X } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCaptured: boolean;
  intensity: number;
  trail: { x: number; y: number }[];
  sizeMult: number;
  speedMult: number;
}

export const CosmicModel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'state' | 'nomad' | 'nonstate' | 'conflict'>('state');
  const [intensity, setIntensity] = useState(0.2);
  const [particleCount, setParticleCount] = useState(150);
  const [wardingCount, setWardingCount] = useState(8);
  const [wardingSize, setWardingSize] = useState(60);
  const [stateCount, setStateCount] = useState(1);
  const [orbitalRadius, setOrbitalRadius] = useState(200);
  const [gravitationalConstant, setGravitationalConstant] = useState(0.4);
  const [antiGravityStrength, setAntiGravityStrength] = useState(0.5);
  const [nomadIntensity, setNomadIntensity] = useState(0.1);
  const [nomadSize, setNomadSize] = useState(2);
  const [showControls, setShowControls] = useState(true);
  
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  const paramsRef = useRef({
    intensity,
    wardingCount,
    wardingSize,
    stateCount,
    orbitalRadius,
    gravitationalConstant,
    antiGravityStrength,
    nomadIntensity,
    nomadSize,
    mode
  });

  useEffect(() => {
    paramsRef.current = {
      intensity,
      wardingCount,
      wardingSize,
      stateCount,
      orbitalRadius,
      gravitationalConstant,
      antiGravityStrength,
      nomadIntensity,
      nomadSize,
      mode
    };
  }, [intensity, wardingCount, wardingSize, stateCount, orbitalRadius, gravitationalConstant, antiGravityStrength, nomadIntensity, nomadSize, mode]);

  const initParticles = (width: number, height: number, count: number) => {
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      isCaptured: false,
      intensity: Math.random(),
      trail: [],
      sizeMult: 0.4 + Math.random() * 2.5,
      speedMult: 0.5 + Math.random() * 2.0,
    }));
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
        wardingCount: currentWCount,
        wardingSize: currentWSize,
        stateCount: currentStateCount,
        orbitalRadius: currentOrbitalRadius,
        gravitationalConstant: currentG,
        antiGravityStrength: currentAntiG,
        nomadIntensity: currentNomadIntensity,
        nomadSize: currentNomadSize,
        mode: currentMode
      } = paramsRef.current;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const minDim = Math.min(width, height);
      const time = Date.now() * 0.001;

      // Responsive adjustments
      const effectiveOrbitalRadius = Math.min(currentOrbitalRadius, minDim * 0.45);
      const effectiveWardingSize = Math.min(currentWSize, minDim * 0.15);

      // Calculate State Centers
      const stateCenters: {x: number, y: number}[] = [];
      const orbitDist = effectiveOrbitalRadius * 0.4;
      for (let i = 0; i < currentStateCount; i++) {
        const angle = (i / currentStateCount) * Math.PI * 2 + time * 0.2;
        stateCenters.push({
          x: width / 2 + Math.cos(angle) * orbitDist * (currentStateCount > 1 ? 1 : 0),
          y: height / 2 + Math.sin(angle) * orbitDist * (currentStateCount > 1 ? 1 : 0)
        });
      }

      // Draw the Orbital Paths (Striated Space)
      const showOrbits = currentMode === 'state' || currentMode === 'conflict';
      
      if (showOrbits) {
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)';
        ctx.lineWidth = 1;
        
        stateCenters.forEach(center => {
          for (let r = 50; r <= effectiveOrbitalRadius; r += 50) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }

      // The State (Central Gravity / Sun)
      if (currentMode === 'state' || currentMode === 'conflict') {
        stateCenters.forEach((center, i) => {
          const pulse = Math.sin(time * 2 + i) * 5;
          const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 30 + pulse);
          gradient.addColorStop(0, 'rgba(0, 174, 239, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 174, 239, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(center.x, center.y, 30 + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00aeef';
          ctx.beginPath();
          ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Non-State Warding Zones
      const wardingZones: {x: number, y: number, r: number}[] = [];
      if (currentMode === 'nonstate' || currentMode === 'conflict') {
        const nsCount = currentMode === 'conflict' ? Math.ceil(currentWCount / 2) : currentWCount;
        for (let i = 0; i < nsCount; i++) {
          // Move relative to screen size, touching corners
          const wx = (Math.cos(time * 0.5 + i * 1.5) * 0.4 + 0.5) * width;
          const wy = (Math.sin(time * 0.4 + i * 2.2) * 0.4 + 0.5) * height;
          const currentWardingSize = effectiveWardingSize * (0.8 + Math.sin(time + i) * 0.2);
          wardingZones.push({ x: wx, y: wy, r: currentWardingSize });
          
          ctx.strokeStyle = 'rgba(184, 134, 11, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(wx, wy, currentWardingSize + Math.sin(time * 5 + i) * 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      particles.current.forEach((p, i) => {
        let forceX = 0;
        let forceY = 0;

        // 1. Non-State Anti-Gravity (Warding Voids)
        let isWarded = false;
        wardingZones.forEach(z => {
          const dzwx = p.x - z.x;
          const dzwy = p.y - z.y;
          const dzw = Math.sqrt(dzwx * dzwx + dzwy * dzwy);
          if (dzw < z.r) {
            isWarded = true;
            // Explosive Anti-Gravity: Stronger force that can break orbits
            const rdx = p.x - z.x;
            const rdy = p.y - z.y;
            const rd = Math.sqrt(rdx * rdx + rdy * rdy);
            
            // Inverse relationship for explosive push-out
            const antiGForce = (1 - rd / z.r) * currentAntiG * currentIntensity * 12;
            forceX += (rdx / rd) * antiGForce;
            forceY += (rdy / rd) * antiGForce;
            
            // Deterritorializing Jitter (High intensity)
            forceX += (Math.random() - 0.5) * 3;
            forceY += (Math.random() - 0.5) * 3;
          }
        });

        // 2. State Capture (Orbital Striation)
        let isCapturedByState = false;
        if (!isWarded && (currentMode === 'state' || currentMode === 'conflict')) {
          stateCenters.forEach(center => {
            const dx_c = center.x - p.x;
            const dy_c = center.y - p.y;
            const dist_c = Math.sqrt(dx_c * dx_c + dy_c * dy_c);

            if (dist_c < effectiveOrbitalRadius + 150) {
              // Inverse-Square Gravity Attenuation
              const gravityPull = (currentG * 5000) / (dist_c * dist_c + 1000);
              forceX += (dx_c / dist_c) * gravityPull * currentIntensity;
              forceY += (dy_c / dist_c) * gravityPull * currentIntensity;

              // Circular Orbit Physics (Striation)
              const angleToCenter = Math.atan2(dy_c, dx_c);
              const orbitalVel = Math.sqrt((currentG * 2000) / dist_c) * currentIntensity;
              
              const targetVx = Math.sin(angleToCenter) * orbitalVel;
              const targetVy = -Math.cos(angleToCenter) * orbitalVel;

              const shellSpacing = 50;
              const targetRadius = Math.round(dist_c / shellSpacing) * shellSpacing;
              const radialForce = (targetRadius - dist_c) * 0.1 * currentIntensity;

              forceX += (targetVx - p.vx) * 0.08 + (dx_c / dist_c) * radialForce;
              forceY += (targetVy - p.vy) * 0.08 + (dy_c / dist_c) * radialForce;
              
              if (Math.abs(dist_c - targetRadius) < 15) isCapturedByState = true;
            }
          });
        }
        p.isCaptured = isCapturedByState;

        // 3. Nomad War Machine (Chaotic Transversal Takeover)
        // Probabilistic takeover: any particle can become a nomad at any moment
        const isNomadTakeover = Math.random() < (currentMode === 'nomad' ? 1 : (currentMode === 'conflict' ? 0.15 : 0.01));
        
        if (isNomadTakeover || (currentMode === 'conflict' && i % 3 === 0)) {
          // Chaotic Transversal force: Random but persistent directions
          const chaoticAngle = (Math.sin(time * 0.5 + i) * Math.PI * 2) + (p.intensity * Math.PI);
          const tx = Math.cos(chaoticAngle);
          const ty = Math.sin(chaoticAngle);
          
          const transversalForce = currentNomadIntensity * currentIntensity * 4 * p.speedMult;
          forceX += tx * transversalForce;
          forceY += ty * transversalForce;
          
          // High-intensity jitter to break capture
          forceX += (Math.random() - 0.5) * currentNomadIntensity * 5;
          forceY += (Math.random() - 0.5) * currentNomadIntensity * 5;
          
          // If it's a nomad takeover, it overrides capture
          if (isNomadTakeover) p.isCaptured = false;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;

        // Boundary Spawning (Matter-Flow)
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          const side = Math.floor(Math.random() * 4);
          if (side === 0) { p.x = 0; p.y = Math.random() * height; p.vx = Math.random() * 2; p.vy = (Math.random() - 0.5) * 2; }
          else if (side === 1) { p.x = width; p.y = Math.random() * height; p.vx = -Math.random() * 2; p.vy = (Math.random() - 0.5) * 2; }
          else if (side === 2) { p.x = Math.random() * width; p.y = 0; p.vx = (Math.random() - 0.5) * 2; p.vy = Math.random() * 2; }
          else { p.x = Math.random() * width; p.y = height; p.vx = (Math.random() - 0.5) * 2; p.vy = -Math.random() * 2; }
          p.trail = [];
        }

        // Trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        // Draw
        let pColor = '#94a3b8';
        if (p.isCaptured) pColor = '#00aeef'; // Xerox Cyan
        else if (isWarded) pColor = '#b8860b'; // Xerox Yellow (Darker)
        else if (currentMode === 'nomad' || (currentMode === 'conflict' && i % 3 === 0)) pColor = '#ec008c'; // Xerox Magenta

        ctx.fillStyle = pColor;
        ctx.beginPath();
        const baseSize = p.isCaptured ? 3 : (isWarded ? 2.5 : (currentMode === 'nomad' || (currentMode === 'conflict' && i % 3 === 0) ? currentNomadSize : 2));
        const pSize = baseSize * p.sizeMult;
        ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2);
        ctx.fill();
        
        if (!p.isCaptured) {
          ctx.strokeStyle = pColor + '44';
          ctx.beginPath();
          p.trail.forEach((pos, idx) => {
            if (idx === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
          });
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
            <Magnet className="w-5 h-5" />
            Cosmic Metaphysics
            <span className="text-[8px] bg-xerox-ink text-xerox-bg px-1 py-0.5 not-italic tracking-widest">ORBITAL</span>
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Orbital Capture // Chaotic Takeover</p>
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
          <aside className="absolute md:relative right-0 top-0 bottom-0 z-50 w-72 md:w-80 bg-xerox-bg border-l-4 border-xerox-ink flex flex-col pointer-events-auto shrink-0 h-full shadow-[-10px_0_0_rgba(0,0,0,0.1)] md:shadow-none overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between md:hidden mb-6 border-b-2 border-xerox-ink pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest">Control Panel</span>
                <button onClick={() => setShowControls(false)} className="p-1 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-xerox-ink pb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Mode</span>
                    <span className="text-[8px] font-bold opacity-40">SELECT_ONE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setMode('state')}
                      className={`px-2 py-2 border-2 border-xerox-ink text-[10px] font-black uppercase transition-all ${mode === 'state' ? 'bg-xerox-cyan text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-cyan'}`}
                    >
                      STATE
                    </button>
                    <button 
                      onClick={() => setMode('nomad')}
                      className={`px-2 py-2 border-2 border-xerox-ink text-[10px] font-black uppercase transition-all ${mode === 'nomad' ? 'bg-xerox-magenta text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-magenta hover:text-xerox-bg'}`}
                    >
                      NOMAD
                    </button>
                    <button 
                      onClick={() => setMode('nonstate')}
                      className={`px-2 py-2 border-2 border-xerox-ink text-[10px] font-black uppercase transition-all ${mode === 'nonstate' ? 'bg-xerox-yellow text-xerox-ink brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-yellow'}`}
                    >
                      NON-STATE
                    </button>
                    <button 
                      onClick={() => setMode('conflict')}
                      className={`px-2 py-2 border-2 border-xerox-ink text-[10px] font-black uppercase transition-all ${mode === 'conflict' ? 'bg-xerox-accent text-xerox-bg brutal-shadow-sm' : 'bg-white text-xerox-ink hover:bg-xerox-accent hover:text-xerox-bg'}`}
                    >
                      CONFLICT
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-xerox-ink pb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Parameters</span>
                    <span className="text-[8px] font-bold opacity-40">ADJUST_VECTORS</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-magenta">Nomad Density</span>
                        <span className="text-[9px] font-mono font-bold">{particleCount}</span>
                      </div>
                      <input 
                        type="range" min="50" max="500" step="10" 
                        value={particleCount} 
                        onChange={(e) => setParticleCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-magenta">Nomad Intensity</span>
                        <span className="text-[9px] font-mono font-bold">{(nomadIntensity * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="2" step="0.1" 
                        value={nomadIntensity} 
                        onChange={(e) => setNomadIntensity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-magenta">Nomad Size</span>
                        <span className="text-[9px] font-mono font-bold">{nomadSize}px</span>
                      </div>
                      <input 
                        type="range" min="0" max="20" step="0.5" 
                        value={nomadSize} 
                        onChange={(e) => setNomadSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-magenta border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-cyan">State Count</span>
                        <span className="text-[9px] font-mono font-bold">{stateCount}</span>
                      </div>
                      <input 
                        type="range" min="1" max="3" step="1" 
                        value={stateCount} 
                        onChange={(e) => setStateCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-cyan">Orbital Radius</span>
                        <span className="text-[9px] font-mono font-bold">{orbitalRadius}px</span>
                      </div>
                      <input 
                        type="range" min="50" max="800" step="10" 
                        value={orbitalRadius} 
                        onChange={(e) => setOrbitalRadius(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-cyan">Gravity Constant</span>
                        <span className="text-[9px] font-mono font-bold">{(gravitationalConstant * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="2" step="0.1" 
                        value={gravitationalConstant} 
                        onChange={(e) => setGravitationalConstant(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-cyan border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-yellow">Anti-Gravity Strength</span>
                        <span className="text-[9px] font-mono font-bold">{(antiGravityStrength * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={antiGravityStrength} 
                        onChange={(e) => setAntiGravityStrength(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-yellow">Warding Count</span>
                        <span className="text-[9px] font-mono font-bold">{wardingCount}</span>
                      </div>
                      <input 
                        type="range" min="1" max="40" step="1" 
                        value={wardingCount} 
                        onChange={(e) => setWardingCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-xerox-yellow">Warding Size</span>
                        <span className="text-[9px] font-mono font-bold">{wardingSize}px</span>
                      </div>
                      <input 
                        type="range" min="0" max="400" step="5" 
                        value={wardingSize} 
                        onChange={(e) => setWardingSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-yellow border border-xerox-ink"
                      />
                    </div>

                    <div className="pt-2 border-t border-xerox-ink/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest">Global Intensity</span>
                        <span className="text-[9px] font-mono font-bold">{(intensity * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="1" step="0.05" 
                        value={intensity} 
                        onChange={(e) => setIntensity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-xerox-ink appearance-none cursor-pointer accent-xerox-ink border border-xerox-ink"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => initParticles(canvasRef.current?.width || 0, canvasRef.current?.height || 0, particleCount)}
                    className="w-full py-3 border-2 border-xerox-ink hover:bg-xerox-ink hover:text-xerox-bg transition-all brutal-shadow-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
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
              Orbital Capture: The State as a centripetal gravity. It captures celestial bodies into predictable, metric orbits—striating space into concentric circular shells.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-magenta">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-magenta">02 / Nomad</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Chaotic Takeover: The Nomad as a stochastic vector. It deterritorializes orbits through sudden, transversal shifts that can seize any body at any moment.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xerox-yellow">
              <span className="text-xs font-black uppercase tracking-widest border-b-2 border-xerox-yellow">03 / Non-State</span>
            </div>
            <p className="text-[10px] font-bold leading-tight uppercase">
              Explosive Voids: Social mechanisms of warding that create violent centrifugal repulsion, capable of shattering stable orbits and ejecting captured matter.
            </p>
          </div>
        </div>
        <div className="md:hidden flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-60">
          <span>Mode: {mode}</span>
          <span>Intensity: {(intensity * 100).toFixed(0)}%</span>
          <span>Particles: {particleCount}</span>
        </div>
      </div>
    </div>
  );
};

export default CosmicModel;
