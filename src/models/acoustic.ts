import { Waves } from 'lucide-react';
import type { ModelDef, SimInstance, Frame } from '../sim/types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  intensity: number;
  sizeMult: number;
  speedMult: number;
}

// Standard approximation of a square plate's vibration modes (n, m).
const chladni = (x: number, y: number, L: number, n: number, m: number) =>
  Math.cos((n * Math.PI * x) / L) * Math.cos((m * Math.PI * y) / L) -
  Math.cos((m * Math.PI * x) / L) * Math.cos((n * Math.PI * y) / L);

function create(): SimInstance {
  let particles: Particle[] = [];

  return {
    init(width, height, params) {
      particles = Array.from({ length: params.particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        intensity: Math.random(),
        sizeMult: 0.5 + Math.random() * 2.0,
        speedMult: 0.5 + Math.random() * 2.0,
      }));
    },

    frame(ctx, f: Frame) {
      const { width, height, time, mode, motionScale } = f;
      const { intensity, harmonicN: n, harmonicM: m, interferenceCount, interferenceSize, nomadIntensity, nomadSize } = f.params;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const minDim = Math.min(width, height);
      const L = minDim;
      const step = 2;
      // The zones act and are drawn at the same capped size.
      const zoneSize = Math.min(interferenceSize, minDim * 0.2);

      const zones: { x: number; y: number }[] = [];
      if (mode === 'nonstate' || mode === 'conflict') {
        for (let i = 0; i < interferenceCount; i++) {
          zones.push({
            x: (Math.sin(time * 0.5 + i * 1.2) * 0.4 + 0.5) * width,
            y: (Math.cos(time * 0.7 + i * 2.5) * 0.4 + 0.5) * height,
          });
        }
      }

      particles.forEach((p, i) => {
        const val = chladni(p.x, p.y, L, n, m);
        const dx = (chladni(p.x + step, p.y, L, n, m) - val) / step;
        const dy = (chladni(p.x, p.y + step, L, n, m) - val) / step;
        const isNomad = mode === 'nomad' || (mode === 'conflict' && i % 2 !== 0);

        let forceX = 0;
        let forceY = 0;

        // 1. Warding off ("silence"): particles ignore the plate's gradient
        let isInterfered = false;
        zones.forEach((z) => {
          if (Math.sqrt((p.x - z.x) ** 2 + (p.y - z.y) ** 2) < zoneSize) isInterfered = true;
        });

        if (isInterfered) {
          const noiseScale = 2 * intensity * motionScale;
          forceX += (Math.random() - 0.5) * noiseScale;
          forceY += (Math.random() - 0.5) * noiseScale;
          p.vx *= 0.9;
          p.vy *= 0.9;
        } else if (mode === 'state' || (mode === 'conflict' && i % 2 === 0)) {
          // 2. State: drift toward the nodal lines
          const force = intensity * motionScale;
          forceX -= dx * Math.abs(val) * force * 10;
          forceY -= dy * Math.abs(val) * force * 10;
          p.vx *= 0.95;
          p.vy *= 0.95;
        } else if (isNomad) {
          // 3. Nomad: moves across the gradient, between nodes
          const angle = Math.atan2(dy, dx) + Math.PI / 2;
          forceX += Math.cos(angle) * nomadIntensity * intensity * 1.2 * p.speedMult * motionScale;
          forceY += Math.sin(angle) * nomadIntensity * intensity * 1.2 * p.speedMult * motionScale;
          forceX += (Math.random() - 0.5) * nomadIntensity * 0.8 * p.speedMult * motionScale;
          forceY += (Math.random() - 0.5) * nomadIntensity * 0.8 * p.speedMult * motionScale;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const isNearNode = Math.abs(val) < 0.1;
        let color = '#00aeef';
        if (isInterfered) color = '#b8860b';
        else if (isNomad || isNearNode) color = '#ec008c';

        ctx.fillStyle = color;
        ctx.beginPath();
        const baseSize = isInterfered ? 1.5 : isNomad ? nomadSize : isNearNode ? 1.5 : 1;
        ctx.arc(p.x, p.y, baseSize * p.sizeMult, 0, Math.PI * 2);
        ctx.fill();
      });

      // Silence zones
      zones.forEach((z) => {
        const pulse = Math.sin(time * 5) * 5;
        ctx.strokeStyle = 'rgba(184, 134, 11, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(z.x, z.y, zoneSize + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(184, 134, 11, 0.05)';
        ctx.beginPath();
        ctx.arc(z.x, z.y, zoneSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = 0; j < 5; j++) {
          const rx = z.x + (Math.random() - 0.5) * zoneSize * 2;
          const ry = z.y + (Math.random() - 0.5) * zoneSize * 2;
          if (Math.sqrt((rx - z.x) ** 2 + (ry - z.y) ** 2) < zoneSize) {
            ctx.fillStyle = 'rgba(184, 134, 11, 0.3)';
            ctx.fillRect(rx, ry, 1, 1);
          }
        }
      });
    },
  };
}

export const acoustic: ModelDef = {
  id: 'acoustic',
  name: 'Acoustic',
  tagline: 'Resonant Frequency',
  sidebarIcon: Waves,
  headerIcon: Waves,
  title: 'Acoustic Metaphysics',
  subtitle: 'Resonant Frequency // Cymatics',
  describe: (mode) => `Acoustic Metaphysics Simulation: A resonant visualization showing ${mode} sound waves.`,
  controls: [
    { kind: 'slider', key: 'particleCount', label: 'Dust Density', min: 500, max: 3000, step: 100, default: 1800, tint: 'magenta', format: 'int', reinit: true },
    { kind: 'slider', key: 'nomadIntensity', label: 'Nomad Intensity', min: 0.1, max: 2, step: 0.1, default: 0.3, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'nomadSize', label: 'Nomad Size', min: 0, max: 10, step: 0.1, default: 1, tint: 'magenta', format: 'px' },
    { kind: 'pair', keys: ['harmonicN', 'harmonicM'], label: 'Harmonic Mode', min: 1, max: 24, step: 1, defaults: [4, 6], tint: 'cyan' },
    { kind: 'slider', key: 'interferenceCount', label: 'Silence Zones', min: 1, max: 15, step: 1, default: 1, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'interferenceSize', label: 'Silence Size', min: 0, max: 600, step: 10, default: 150, tint: 'yellow', format: 'px' },
    { kind: 'slider', key: 'intensity', label: 'Resonance', min: 0.1, max: 1, step: 0.05, default: 0.4, tint: 'ink', format: 'pct', divider: true },
  ],
  status: (p) => [
    ['Resonance', `${(p.intensity * 100).toFixed(0)}%`],
    ['Dust', String(p.particleCount)],
  ],
  cards: [
    { process: 'capture', heading: '01 / State', text: 'Despotic Resonance: The State imposes a single frequency. Matter is forced into rigid nodes, creating a geometric striation.' },
    { process: 'warMachine', heading: '02 / Nomad', text: "Transversal Rhythms: The Nomad operates in the vibrating zones between nodes, refusing to settle into the State's geometric order." },
    { process: 'wardingOff', heading: '03 / Non-State', text: 'The Great Refusal: Mechanisms of "silence" that actively ward off the State\'s resonance through destructive interference and white noise.' },
  ],
  create,
};
