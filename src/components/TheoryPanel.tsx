import React from 'react';
import Markdown from 'react-markdown';
import { X, BookOpen, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { ModelId } from '../sim/types';

interface TheoryPanelProps {
  modelType: ModelId;
  isOpen: boolean;
  onClose: () => void;
  isHighVis?: boolean;
}

const THEORY_DATA: Record<ModelId, { title: string; subtitle: string; equations: string }> = {
  hydraulic: {
    title: 'Hydraulic Model // Fluid Dynamics',
    subtitle: 'Laminar Flow vs. Vortical Turbulence',
    equations: `
### Mathematical Core
1. **Eulerian Flux**: $v_{n+1} = v_n + F \cdot \Delta t$
2. **Vortex Shedding (modified Rankine)**: $S = \frac{\Gamma}{d + \epsilon}$
3. **Boundary Layer Friction**: $V_{drag}(y) = \min(1, y / h_{ref})$

### Operational Context
In *A Thousand Plateaus*, Deleuze & Guattari distinguish between "Royal Science" (metric, static) and "Nomad Science" (hydraulic, fluid). The State "striates" space into predictable, laminar flows. 

### How it works
- **Laminar Flow (State)**: Represents the metric ordering of space where particles move in parallel.
- **Vortices (Nomad)**: Small singularities that emerge from boundary friction or obstacles. They deterritorialize the State flow, creating "Smooth Space" through turbulence.
- **Non-State (Warding)**: Obstacles that break the flow, actively shedding vortices to prevent the State from achieving a stable, striated equilibrium.
`,
  },
  metallurgic: {
    title: 'Metallurgic Model // Superfluidity',
    subtitle: 'Crystallization vs. The Matter-Flow',
    equations: `
### Mathematical Core
1. **Lattice Stability (Hooke's Law)**: $F = -k \cdot \Delta x$
2. **Superfluid Vector Field**: $\theta(x, y, t) = \sin(kx + t) \cdot \cos(ky) \cdot 2\pi$
3. **Inhibitor Repulsion**: $F_{inh} = (1 - d/r) \cdot \text{power}$

### Operational Context
Metallurgy is the "ambulatory science" par excellence. It follows the "matter-flow," operating in the threshold between the solid (State crystal) and the liquid (Nomad flow).

### How it works
- **Crystallization (State)**: Particles are "captured" into a rigid grid, losing their kinetic independence to become part of a larger, stratified identity.
- **Superfluidity (Nomad)**: A state of zero-viscosity flow where matter moves transversally through the system without being captured by the lattice.
- **Inhibitors (Non-State)**: "Anti-freeze" mechanisms. They represent tribal or social gestures that inject noise into the system to prevent the "cooling" into a State-form.
`,
  },
  acoustic: {
    title: 'Acoustic Model // Cymatics',
    subtitle: 'Resonance vs. White Noise',
    equations: `
### Mathematical Core
1. **Chladni Plate Mode**: $Z = \cos(\frac{n\pi x}{L})\cos(\frac{m\pi y}{L}) - \cos(\frac{m\pi x}{L})\cos(\frac{n\pi y}{L})$
2. **Nodal Gradient Capture**: $\vec{F} = -\nabla |Z|$
3. **Phase Destructive Interference**: $A_{final} = A_1 - A_2$

### Operational Context
The State is a "Despotic Machine" that resonates a single frequency (the Law) to organize the social body. Particles that settle into "nodes" represent the segments of society captured by the State's overcoding.

### How it works
- **Resonant Nodes (State)**: Points of zero vibration where matter is captured into a "striated" geometric pattern.
- **Transversal Rhythms (Nomad)**: Particles that vibrate *between* the nodes, operating in the zones of absolute movement.
- **Silence Zones (Non-State)**: Warding mechanisms that use destructive interference to cancel the State's frequency, creating a "Great Refusal" through silence or white noise.
`,
  },
  cosmic: {
    title: 'Cosmic Model // Orbital Mechanics',
    subtitle: 'Capture vs. Transversal Takeover',
    equations: `
### Mathematical Core
1. **Newtonian Capture**: $F = G \frac{M \cdot m}{r^2 + \epsilon}$
2. **Orbital Velocity**: $V_{orbit} = \sqrt{\frac{G \cdot M}{r}}$
3. **Centrifugal Repulsion**: $F_c = \frac{v^2}{r}$

### Operational Context
The State is a "Centripetal Machine." It organizes celestial bodies into concentric, metric orbits. The Nomad operates through "absolute speed"—a movement that is so fast it cannot be captured by the gravity of the State.

### How it works
- **Orbital Capture (State)**: Striating the void into circular shells. Matter is forced into a repetitive, "circular" history.
- **Chaotic Takeover (Nomad)**: Sudden, transversal shifts that take over a particle's trajectory, allowing it to "leak" out of stable orbits into Smooth Space.
- **Warding Voids (Non-State)**: Explosive centrifugal zones that ward off capture by ejecting matter from the system entirely.
`,
  }
};

export const TheoryPanel: React.FC<TheoryPanelProps> = ({ modelType, isOpen, onClose, isHighVis }) => {
  const data = THEORY_DATA[modelType];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-xerox-bg border-4 border-xerox-ink brutal-shadow-lg flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b-4 border-xerox-ink bg-xerox-ink text-xerox-bg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg font-black uppercase tracking-tighter">Technical Manual</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 border-2 border-xerox-bg hover:bg-xerox-bg hover:text-xerox-ink transition-colors"
                aria-label="Close Manual"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="mb-6 border-l-8 border-xerox-ink pl-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{data.title}</h3>
                <p className="text-sm font-bold uppercase opacity-60 tracking-widest mt-1">{data.subtitle}</p>
              </div>

              <div className={`prose prose-slate max-w-none ${isHighVis ? 'text-lg' : 'text-sm'} font-bold`}>
                <div className="markdown-body">
                  <Markdown>{data.equations}</Markdown>
                </div>
              </div>

              {/* Technical Note footer */}
              <div className="mt-8 p-4 bg-xerox-ink/5 border-2 border-xerox-ink border-dashed">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-xerox-ink" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Research Note: {modelType.toUpperCase()}_01</span>
                </div>
                <p className="text-[10px] uppercase font-bold leading-tight opacity-70">
                  This simulation uses native TypeScript/Canvas discrete time-step integration. 
                  No external physics engines or pre-rendered assets were deployed. 
                  Calculations are performed at the frame rate (60fps nominal).
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t-4 border-xerox-ink bg-xerox-bg flex justify-between items-center">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">NOMADOLOGY_VISUALIZER // {new Date().getFullYear()}</span>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-xerox-ink text-xerox-bg font-black uppercase text-xs brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Close File
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TheoryPanel;
