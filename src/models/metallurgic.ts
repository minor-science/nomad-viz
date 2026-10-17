import { Anvil, Zap } from 'lucide-react';
import type { ModelDef, SimInstance, Frame } from '../sim/types';

interface Atom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isFixed: boolean;
  intensity: number;
  sizeMult: number;
  speedMult: number;
}

function create(): SimInstance {
  let atoms: Atom[] = [];

  return {
    init(width, height, params) {
      atoms = Array.from({ length: params.particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        isFixed: false,
        intensity: Math.random(),
        sizeMult: 0.5 + Math.random() * 1.5,
        speedMult: 0.5 + Math.random() * 1.5,
      }));
    },

    frame(ctx, f: Frame) {
      const { width, height, time, mode, motionScale } = f;
      const { intensity, latticeStability, inhibitorCount, inhibitorSize, nomadIntensity, nomadSize } = f.params;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      const minDim = Math.min(width, height);
      const effectiveInhibitorSize = Math.min(inhibitorSize, minDim * 0.2);

      // Warding-off inhibitor zones (anticipation)
      const inhibitors: { x: number; y: number; r: number }[] = [];
      if (mode === 'nonstate' || mode === 'conflict') {
        const count = mode === 'conflict' ? Math.ceil(inhibitorCount / 2) : inhibitorCount;
        for (let i = 0; i < count; i++) {
          const ix = (Math.sin(time * 0.3 + i * 2.5) * 0.4 + 0.5) * width;
          const iy = (Math.cos(time * 0.4 + i * 1.8) * 0.4 + 0.5) * height;
          inhibitors.push({ x: ix, y: iy, r: effectiveInhibitorSize });

          ctx.strokeStyle = 'rgba(184, 134, 11, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ix, iy, effectiveInhibitorSize, 0, Math.PI * 2);
          ctx.stroke();
          // "Anti-freeze" pulses
          const pulse = (time * 2 + i) % 1;
          ctx.strokeStyle = `rgba(184, 134, 11, ${0.3 * (1 - pulse)})`;
          ctx.beginPath();
          ctx.arc(ix, iy, effectiveInhibitorSize * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      atoms.forEach((a, i) => {
        let forceX = 0;
        let forceY = 0;
        const isNomad = mode === 'nomad' || (mode === 'conflict' && i % 2 !== 0);

        // 1. Warding off (inhibitors add kinetic energy)
        let isInhibited = false;
        inhibitors.forEach((inh) => {
          const dx = a.x - inh.x;
          const dy = a.y - inh.y;
          if (Math.sqrt(dx * dx + dy * dy) < inh.r) {
            isInhibited = true;
            forceX += (Math.random() - 0.5) * 2 * intensity * motionScale;
            forceY += (Math.random() - 0.5) * 2 * intensity * motionScale;
          }
        });

        // 2. State (crystallization onto a grid)
        if (!isInhibited && (mode === 'state' || (mode === 'conflict' && i % 2 === 0))) {
          const gridSize = 40;
          const targetX = Math.round(a.x / gridSize) * gridSize;
          const targetY = Math.round(a.y / gridSize) * gridSize;

          let dxGrid = targetX - a.x;
          if (dxGrid > width / 2) dxGrid -= width;
          if (dxGrid < -width / 2) dxGrid += width;
          let dyGrid = targetY - a.y;
          if (dyGrid > height / 2) dyGrid -= height;
          if (dyGrid < -height / 2) dyGrid += height;

          const noiseX = Math.sin(a.y * 0.05 + time) * 2;
          const noiseY = Math.cos(a.x * 0.05 + time) * 2;

          forceX += (dxGrid + noiseX) * latticeStability * intensity * motionScale;
          forceY += (dyGrid + noiseY) * latticeStability * intensity * motionScale;

          a.vx *= 0.85;
          a.vy *= 0.85;
          a.isFixed = Math.abs(dxGrid) < 4 && Math.abs(dyGrid) < 4;
        } else {
          a.isFixed = false;
        }

        // 3. Nomad (flow along a vector field)
        if (isNomad) {
          const angle = Math.sin(a.x * 0.005 + time) * Math.cos(a.y * 0.005) * Math.PI * 2;
          forceX += Math.cos(angle) * nomadIntensity * intensity * 0.8 * a.speedMult * motionScale;
          forceY += Math.sin(angle) * nomadIntensity * intensity * 0.8 * a.speedMult * motionScale;
          forceX += (Math.random() - 0.5) * nomadIntensity * a.speedMult * motionScale;
          forceY += (Math.random() - 0.5) * nomadIntensity * a.speedMult * motionScale;
          a.vx *= 0.99;
        }

        a.vx += forceX;
        a.vy += forceY;
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0) a.x = width;
        if (a.x > width) a.x = 0;
        if (a.y < 0) a.y = height;
        if (a.y > height) a.y = 0;

        let color = '#94a3b8';
        if (a.isFixed) color = '#00aeef';
        else if (isInhibited) color = '#b8860b';
        else if (isNomad) color = '#ec008c';

        ctx.fillStyle = color;
        ctx.beginPath();
        const baseSize = a.isFixed ? 2.5 : isInhibited ? 2 : isNomad ? nomadSize : 1.5;
        ctx.arc(a.x, a.y, baseSize * a.sizeMult, 0, Math.PI * 2);
        ctx.fill();

        if (a.isFixed && mode === 'state') {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + 40, a.y);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x, a.y + 40);
          ctx.stroke();
        }
      });
    },
  };
}

export const metallurgic: ModelDef = {
  id: 'metallurgic',
  name: 'Metallurgic',
  tagline: 'Thermodynamic Flow',
  sidebarIcon: Anvil,
  headerIcon: Zap,
  title: 'Metallurgic Metaphysics',
  subtitle: 'Thermodynamic Flow // Superfluidity',
  describe: (mode) => `Metallurgic Metaphysics Simulation: An atomic visualization showing ${mode} crystallization and nomad fluidity.`,
  controls: [
    { kind: 'slider', key: 'particleCount', label: 'Atomic Density', min: 200, max: 2000, step: 100, default: 1200, tint: 'magenta', format: 'int', reinit: true },
    { kind: 'slider', key: 'nomadIntensity', label: 'Nomad Intensity', min: 0.1, max: 2, step: 0.1, default: 0.3, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'nomadSize', label: 'Nomad Size', min: 0, max: 15, step: 0.1, default: 1.5, tint: 'magenta', format: 'px' },
    { kind: 'slider', key: 'latticeStability', label: 'Lattice Stability', min: 0.01, max: 1, step: 0.01, default: 0.1, tint: 'cyan', format: 'x1000' },
    { kind: 'slider', key: 'inhibitorCount', label: 'Inhibitor Count', min: 1, max: 30, step: 1, default: 8, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'inhibitorSize', label: 'Inhibitor Size', min: 0, max: 400, step: 5, default: 70, tint: 'yellow', format: 'px' },
    { kind: 'slider', key: 'intensity', label: 'Thermal Power', min: 0.1, max: 1, step: 0.05, default: 0.4, tint: 'ink', format: 'pct', divider: true },
  ],
  status: (p) => [
    ['Power', `${(p.intensity * 100).toFixed(0)}%`],
    ['Atoms', String(p.particleCount)],
  ],
  cards: [
    { process: 'capture', heading: '01 / State', text: 'Crystallization: Striated space as a rigid lattice. Particles are frozen into fixed positions, becoming part of an extensive order.' },
    { process: 'warMachine', heading: '02 / Nomad', text: 'Superfluidity: The War Machine as a flow with zero viscosity. It deterritorializes the crystal, releasing matter back into smooth space.' },
    { process: 'wardingOff', heading: '03 / Non-State', text: 'Inhibitors: Social mechanisms of "anti-freeze" that actively prevent crystallization from starting, warding off the State.' },
  ],
  create,
};
