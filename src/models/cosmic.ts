import { Magnet, Orbit } from 'lucide-react';
import type { ModelDef, SimInstance, Frame } from '../sim/types';

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

function create(): SimInstance {
  let particles: Particle[] = [];

  return {
    init(width, height, params) {
      particles = Array.from({ length: params.particleCount }, () => ({
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
    },

    frame(ctx, f: Frame) {
      const { width, height, time, mode, motionScale } = f;
      const {
        intensity, wardingCount, wardingSize, stateCount, orbitalRadius,
        gravitationalConstant: G, antiGravityStrength: antiG, nomadIntensity, nomadSize,
      } = f.params;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, width, height);

      const minDim = Math.min(width, height);
      const effectiveOrbitalRadius = Math.min(orbitalRadius, minDim * 0.45);
      const effectiveWardingSize = Math.min(wardingSize, minDim * 0.15);
      const showState = mode === 'state' || mode === 'conflict';

      // State centers
      const centers: { x: number; y: number }[] = [];
      const orbitDist = effectiveOrbitalRadius * 0.4;
      for (let i = 0; i < stateCount; i++) {
        const angle = (i / stateCount) * Math.PI * 2 + time * 0.2;
        const spread = stateCount > 1 ? 1 : 0;
        centers.push({
          x: width / 2 + Math.cos(angle) * orbitDist * spread,
          y: height / 2 + Math.sin(angle) * orbitDist * spread,
        });
      }

      if (showState) {
        // Orbital paths (striated space)
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)';
        ctx.lineWidth = 1;
        centers.forEach((c) => {
          for (let r = 50; r <= effectiveOrbitalRadius; r += 50) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        // Central gravity
        centers.forEach((c, i) => {
          const pulse = Math.sin(time * 2 + i) * 5;
          const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 30 + pulse);
          gradient.addColorStop(0, 'rgba(0, 174, 239, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 174, 239, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 30 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00aeef';
          ctx.beginPath();
          ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Warding zones
      const zones: { x: number; y: number; r: number }[] = [];
      if (mode === 'nonstate' || mode === 'conflict') {
        const count = mode === 'conflict' ? Math.ceil(wardingCount / 2) : wardingCount;
        for (let i = 0; i < count; i++) {
          const wx = (Math.cos(time * 0.5 + i * 1.5) * 0.4 + 0.5) * width;
          const wy = (Math.sin(time * 0.4 + i * 2.2) * 0.4 + 0.5) * height;
          const r = effectiveWardingSize * (0.8 + Math.sin(time + i) * 0.2);
          zones.push({ x: wx, y: wy, r });
          ctx.strokeStyle = 'rgba(184, 134, 11, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(wx, wy, r + Math.sin(time * 5 + i) * 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      particles.forEach((p, i) => {
        let forceX = 0;
        let forceY = 0;

        // 1. Warding off (anti-gravity voids)
        let isWarded = false;
        zones.forEach((z) => {
          const rdx = p.x - z.x;
          const rdy = p.y - z.y;
          const rd = Math.sqrt(rdx * rdx + rdy * rdy);
          if (rd < z.r) {
            isWarded = true;
            const push = (1 - rd / z.r) * antiG * intensity * 12 * motionScale;
            forceX += (rdx / rd) * push;
            forceY += (rdy / rd) * push;
            forceX += (Math.random() - 0.5) * 3 * motionScale;
            forceY += (Math.random() - 0.5) * 3 * motionScale;
          }
        });

        // 2. State capture (orbital shells)
        let captured = false;
        if (!isWarded && showState) {
          centers.forEach((c) => {
            const dxC = c.x - p.x;
            const dyC = c.y - p.y;
            const distC = Math.sqrt(dxC * dxC + dyC * dyC);
            if (distC < effectiveOrbitalRadius + 150) {
              const pull = (G * 5000) / (distC * distC + 1000);
              forceX += (dxC / distC) * pull * intensity * motionScale;
              forceY += (dyC / distC) * pull * intensity * motionScale;

              const angleToCenter = Math.atan2(dyC, dxC);
              const orbitalVel = Math.sqrt((G * 2000) / distC) * intensity;
              const targetVx = Math.sin(angleToCenter) * orbitalVel;
              const targetVy = -Math.cos(angleToCenter) * orbitalVel;

              const shellSpacing = 50;
              const targetRadius = Math.round(distC / shellSpacing) * shellSpacing;
              const radialForce = (targetRadius - distC) * 0.1 * intensity;

              forceX += ((targetVx - p.vx) * 0.08 + (dxC / distC) * radialForce) * motionScale;
              forceY += ((targetVy - p.vy) * 0.08 + (dyC / distC) * radialForce) * motionScale;

              if (Math.abs(distC - targetRadius) < 15) captured = true;
            }
          });
        }
        p.isCaptured = captured;

        // 3. Nomad (random transversal takeover)
        const takeover = Math.random() < (mode === 'nomad' ? 1 : mode === 'conflict' ? 0.15 : 0.01);
        const isNomad = mode === 'nomad' || (mode === 'conflict' && i % 3 === 0);
        if (takeover || (mode === 'conflict' && i % 3 === 0)) {
          const chaoticAngle = Math.sin(time * 0.5 + i) * Math.PI * 2 + p.intensity * Math.PI;
          const transversal = nomadIntensity * intensity * 4 * p.speedMult * motionScale;
          forceX += Math.cos(chaoticAngle) * transversal;
          forceY += Math.sin(chaoticAngle) * transversal;
          forceX += (Math.random() - 0.5) * nomadIntensity * 5 * motionScale;
          forceY += (Math.random() - 0.5) * nomadIntensity * 5 * motionScale;
          if (takeover) p.isCaptured = false;
        }

        p.vx += forceX;
        p.vy += forceY;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;

        // Respawn at a random edge
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          const side = Math.floor(Math.random() * 4);
          if (side === 0) { p.x = 0; p.y = Math.random() * height; p.vx = Math.random() * 2; p.vy = (Math.random() - 0.5) * 2; }
          else if (side === 1) { p.x = width; p.y = Math.random() * height; p.vx = -Math.random() * 2; p.vy = (Math.random() - 0.5) * 2; }
          else if (side === 2) { p.x = Math.random() * width; p.y = 0; p.vx = (Math.random() - 0.5) * 2; p.vy = Math.random() * 2; }
          else { p.x = Math.random() * width; p.y = height; p.vx = (Math.random() - 0.5) * 2; p.vy = -Math.random() * 2; }
          p.trail = [];
        }

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        let color = '#94a3b8';
        if (p.isCaptured) color = '#00aeef';
        else if (isWarded) color = '#b8860b';
        else if (isNomad) color = '#ec008c';

        ctx.fillStyle = color;
        ctx.beginPath();
        const baseSize = p.isCaptured ? 3 : isWarded ? 2.5 : isNomad ? nomadSize : 2;
        ctx.arc(p.x, p.y, baseSize * p.sizeMult, 0, Math.PI * 2);
        ctx.fill();

        if (!p.isCaptured) {
          ctx.strokeStyle = color + '44';
          ctx.beginPath();
          p.trail.forEach((pos, idx) => (idx === 0 ? ctx.moveTo(pos.x, pos.y) : ctx.lineTo(pos.x, pos.y)));
          ctx.stroke();
        }
      });
    },
  };
}

export const cosmic: ModelDef = {
  id: 'cosmic',
  name: 'Cosmic',
  tagline: 'Gravity',
  sidebarIcon: Orbit,
  headerIcon: Magnet,
  title: 'Cosmic Metaphysics',
  subtitle: 'Gravity // Orbits',
  badge: 'Orbital',
  describe: (mode) => `Cosmic Metaphysics Simulation: An orbital visualization showing ${mode} captures and chaotic transversal flows.`,
  controls: [
    { kind: 'slider', key: 'particleCount', label: 'Nomad Density', min: 50, max: 500, step: 10, default: 150, tint: 'magenta', format: 'int', reinit: true },
    { kind: 'slider', key: 'nomadIntensity', label: 'Nomad Intensity', min: 0.1, max: 2, step: 0.1, default: 0.1, tint: 'magenta', format: 'pct' },
    { kind: 'slider', key: 'nomadSize', label: 'Nomad Size', min: 0, max: 20, step: 0.5, default: 2, tint: 'magenta', format: 'px' },
    { kind: 'slider', key: 'stateCount', label: 'State Count', min: 1, max: 3, step: 1, default: 1, tint: 'cyan', format: 'int' },
    { kind: 'slider', key: 'orbitalRadius', label: 'Orbital Radius', min: 50, max: 800, step: 10, default: 200, tint: 'cyan', format: 'px' },
    { kind: 'slider', key: 'gravitationalConstant', label: 'Gravity Constant', min: 0.1, max: 2, step: 0.1, default: 0.4, tint: 'cyan', format: 'pct' },
    { kind: 'slider', key: 'antiGravityStrength', label: 'Anti-Gravity Strength', min: 0, max: 2, step: 0.1, default: 0.5, tint: 'yellow', format: 'pct' },
    { kind: 'slider', key: 'wardingCount', label: 'Warding Count', min: 1, max: 40, step: 1, default: 8, tint: 'yellow', format: 'int' },
    { kind: 'slider', key: 'wardingSize', label: 'Warding Size', min: 0, max: 400, step: 5, default: 60, tint: 'yellow', format: 'px' },
    { kind: 'slider', key: 'intensity', label: 'Global Intensity', min: 0.1, max: 1, step: 0.05, default: 0.2, tint: 'ink', format: 'pct', divider: true },
  ],
  status: (p) => [
    ['Intensity', `${(p.intensity * 100).toFixed(0)}%`],
    ['Particles', String(p.particleCount)],
  ],
  cards: [
    { process: 'capture', heading: '01 / Capture', text: 'Gravity. Bodies are pulled into rings around a center. Universal attraction became royal science’s “law of all laws” (Plateaus: 370).' },
    { process: 'warMachine', heading: '02 / War machine', text: 'Escape. Bodies are kicked off their rings. Plateaus’ figure here is the swerve, “the minimum angle, which deviates from the vertical” (489).' },
    { process: 'wardingOff', heading: '03 / Warding off', text: 'Voids. Zones push bodies outward so that no ring can form there.' },
  ],
  legend: [
    { swatch: '#00aeef', see: 'Cyan bodies in rings', physics: 'bodies pulled toward a center and steered into fixed rings (not Newtonian)', atp: 'capture by gravity, royal science’s “law of all laws” (Plateaus: 370)' },
    { swatch: '#ec008c', see: 'Magenta bodies', physics: 'random kicks off the rings', atp: 'the war machine; Plateaus’ figure is the swerve, “the minimum angle” (489)' },
    { swatch: '#b8860b', see: 'Yellow circles', physics: 'zones that push bodies outward', atp: 'warding off, in this early version only roughly modeled' },
    { swatch: '#94a3b8', see: 'Gray bodies', physics: 'bodies drifting', atp: 'no process acting on them at the moment' },
  ],
  create,
};
