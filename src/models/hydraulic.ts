import { Droplets } from 'lucide-react';
import type { ModelDef, SimInstance, Frame } from '../sim/types';

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

function create(): SimInstance {
  let particles: Particle[] = [];
  let vortices: Vortex[] = [];

  return {
    init(width, height, params) {
      particles = Array.from({ length: params.particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() + 1) * 2,
        vy: (Math.random() - 0.5) * 0.5,
        isWarded: false,
        sizeMult: 0.5 + Math.random() * 2.0,
        speedMult: 0.5 + Math.random() * 2.0,
      }));
      vortices = [];
    },

    frame(ctx, f: Frame) {
      const { width, height, time, mode, motionScale } = f;
      const { intensity, vortexStrength, obstacleCount, obstacleSize, nomadIntensity, nomadSize } = f.params;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, width, height);

      const minDim = Math.min(width, height);
      const effectiveObstacleSize = Math.min(obstacleSize, minDim * 0.15);

      // Striated lines (State background)
      if (mode === 'state' || mode === 'conflict') {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Warding obstacles
      const obstacles: { x: number; y: number; r: number }[] = [];
      if (mode === 'nonstate' || mode === 'conflict') {
        const count = mode === 'conflict' ? Math.ceil(obstacleCount / 2) : obstacleCount;
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

          // Vortex shedding from obstacles
          if (mode === 'conflict' && Math.random() < 0.05 * intensity) {
            vortices.push({
              x: ox + effectiveObstacleSize,
              y: oy + (Math.random() - 0.5) * effectiveObstacleSize,
              vx: (1 + Math.random()) * intensity * 2,
              vy: (Math.random() - 0.5) * intensity,
              strength: (Math.random() > 0.5 ? 1 : -1) * vortexStrength,
              radius: 40 + Math.random() * 60,
              life: 1.0,
            });
          }
        }
      }

      // Boundary-layer vortex generation (friction)
      if (mode === 'nomad' || mode === 'conflict') {
        if (Math.random() < 0.1 * intensity) {
          const isTop = Math.random() > 0.5;
          vortices.push({
            x: 0,
            y: isTop ? Math.random() * 50 : height - Math.random() * 50,
            vx: (2 + Math.random()) * intensity * 2,
            vy: (isTop ? 1 : -1) * Math.random() * intensity,
            strength: (isTop ? 1 : -1) * vortexStrength,
            radius: 30 + Math.random() * 50,
            life: 1.0,
          });
        }
      }

      // Update and draw vortices
      vortices = vortices.filter((v) => v.life > 0);
      vortices.forEach((v) => {
        v.x += v.vx;
        v.y += v.vy;
        v.life -= 0.005;

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

      particles.forEach((p, i) => {
        let forceX = 0;
        let forceY = 0;
        let inVortex = false;

        // 1. Warding off laminar flow
        let isWarded = false;
        obstacles.forEach((o) => {
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          if (dx * dx + dy * dy < o.r * o.r) {
            isWarded = true;
            forceX += (Math.random() - 0.5) * 4 * intensity * motionScale;
            forceY += (Math.random() - 0.5) * 4 * intensity * motionScale;
            p.vx *= 0.8;
            p.vy *= 0.8;
          }
        });
        p.isWarded = isWarded;

        // 2. Nomad force (micro-eddies): every particle near a vortex is affected
        vortices.forEach((v) => {
          const dx = p.x - v.x;
          const dy = p.y - v.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < v.radius * v.radius) {
            inVortex = true;
            const dist = Math.sqrt(distSq);
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            const strength = (v.strength * 250 * nomadIntensity * p.speedMult * v.life) / (dist + 15);
            forceX += Math.cos(angle) * strength * 0.3 * intensity * motionScale;
            forceY += Math.sin(angle) * strength * 0.3 * intensity * motionScale;
          }
        });

        // 3. State (laminar flow), only outside vortices and obstacles
        const isStateParticle = mode === 'state' || (mode === 'conflict' && i % 2 === 0);
        if (!isWarded && !inVortex && isStateParticle) {
          const distToEdge = Math.min(p.y, height - p.y);
          const friction = Math.max(0.2, Math.min(1, distToEdge / 100));
          forceX += 0.2 * intensity * friction * motionScale;
          forceY += Math.sin(p.x * 0.01 + time) * 0.05 * intensity * motionScale;
          p.vy *= 0.95;
        }

        // 4. Nomad jitter
        const isNomadParticle = mode === 'nomad' || (mode === 'conflict' && i % 2 !== 0);
        if (isNomadParticle || inVortex) {
          forceX += (Math.random() - 0.5) * 0.5 * nomadIntensity * p.speedMult * motionScale;
          forceY += (Math.random() - 0.5) * 0.5 * nomadIntensity * p.speedMult * motionScale;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Boundary and respawn
        if (p.x > width) {
          p.x = 0;
          p.y = Math.random() * height;
          p.vx = 2;
        }
        if (p.x < 0) p.x = width;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        let color = '#00aeef';
        if (isWarded) color = '#b8860b';
        else if (inVortex || isNomadParticle) color = '#ec008c';

        ctx.strokeStyle = color;
        const isNomad = inVortex || isNomadParticle;
        ctx.lineWidth = (isWarded ? 2 : isNomad ? nomadSize : 1.5) * p.sizeMult;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.stroke();
      });
    },
  };
}

export const hydraulic: ModelDef = {
  id: 'hydraulic',
  name: 'Hydraulic',
  tagline: 'Fluid Dynamics',
  sidebarIcon: Droplets,
  headerIcon: Droplets,
  title: 'Hydraulic Metaphysics',
  subtitle: 'Laminar Flow // Turbulence',
  describe: (mode) => `Hydraulic Metaphysics Simulation: A fluid dynamic visualization showing ${mode} interactions.`,
  controls: [
    { kind: 'slider', key: 'particleCount', label: 'Flow Density', min: 200, max: 2000, step: 100, default: 1200, tint: 'magenta', format: 'int', reinit: true },
    { kind: 'slider', key: 'nomadIntensity', label: 'Nomad Intensity', min: 0.1, max: 5, step: 0.1, default: 0.5, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'nomadSize', label: 'Nomad Size', min: 0, max: 15, step: 0.1, default: 1.5, tint: 'magenta', format: 'px' },
    { kind: 'slider', key: 'vortexStrength', label: 'Vortex Strength', min: 0.1, max: 10, step: 0.1, default: 1, tint: 'cyan', format: 'pct' },
    { kind: 'slider', key: 'obstacleCount', label: 'Obstacle Count', min: 1, max: 40, step: 1, default: 10, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'obstacleSize', label: 'Obstacle Size', min: 0, max: 300, step: 5, default: 45, tint: 'yellow', format: 'px' },
    { kind: 'slider', key: 'intensity', label: 'Global Intensity', min: 0.1, max: 1, step: 0.05, default: 0.5, tint: 'ink', format: 'pct', divider: true },
  ],
  status: (p) => [
    ['Flow', `${(p.intensity * 100).toFixed(0)}%`],
    ['Particles', String(p.particleCount)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Laminar flow. Particles run in parallel layers, slower near the edges, as in a channel. ATP: the State needs “conduits, pipes, embankments, which prevent turbulence” (363).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Vortices. Eddies carry particles across the layers. ATP: nomad science is “distributed by turbulence across a smooth space” (363).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Obstacles. Moving zones agitate the particles that enter them. In conflict mode they also shed vortices, which ATP would count as the war machine, not warding off (see Sources).' },
  ],
  create,
};
