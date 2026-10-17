/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Andrew Culp
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X, Menu, Eye, ZapOff } from 'lucide-react';

import ModelShell from './components/ModelShell';
import { MODELS, MODEL, isModelId } from './models';
import { readModel } from './sim/url';
import type { ModelId } from './sim/types';
import { PROCESS, type ProcessId } from './processes';
import { BIBLIOGRAPHY } from './content/bibliography';
import { Book } from './components/Book';

// The processes staged so far, in the charts' order (Axiom I, 351). Quotations are checked by scripts/check-atp.ts.
const FRAMEWORK: { id: ProcessId; text: string }[] = [
  { id: 'wardingOff', text: 'Primitive societies: mechanisms that keep an apparatus “from crystallizing” (Plateaus: 357, cf. Clastres).' },
  { id: 'warMachine', text: 'Nomads: a movement “distributed by turbulence across a smooth space” (Plateaus: 363).' },
  { id: 'capture', text: 'States: striating space “so as to render it homogeneous” (Plateaus: 370).' },
  { id: 'polarization', text: 'Towns: a circuit “defined by entries and exits” (Plateaus: 432).' },
];

const ACTIVE_ICON: Record<ModelId, string> = {
  hydraulic: 'text-xerox-cyan',
  metallurgic: 'text-xerox-gray',
  acoustic: 'text-xerox-yellow',
  cosmic: 'text-xerox-magenta',
};

export default function App() {
  const [activeModel, setActiveModel] = useState<ModelId>(() => {
    const m = readModel();
    return isModelId(m) ? m : 'hydraulic';
  });
  const [showInfo, setShowInfo] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Accessibility States
  const [highVisibility, setHighVisibility] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [announcement, setAnnouncement] = useState('');

  return (
    <div className={`flex flex-col md:flex-row h-screen bg-xerox-bg text-xerox-ink selection:bg-xerox-ink selection:text-xerox-bg overflow-hidden relative ${highVisibility ? 'accessibility-high-vis' : ''}`}>
      {/* ARIA Live Region for Announcements */}
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      {/* Mobile Header */}
      <header className="md:hidden p-4 border-b-4 border-xerox-ink bg-xerox-ink text-xerox-bg flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Nomadology</h1>
          <span className="text-[8px] font-bold border border-xerox-bg px-1">V3.0</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-xerox-bg hover:text-xerox-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar - Zine Style */}
      <aside className={`
        fixed md:relative inset-0 md:inset-auto z-40 md:z-20
        w-full md:w-72 h-screen
        bg-xerox-bg
        border-r-0 md:border-r-4 border-xerox-ink
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* Fixed Header in Sidebar */}
        <div className="shrink-0 p-4 border-b-4 border-xerox-ink bg-xerox-ink text-xerox-bg flex items-center justify-between">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`font-black tracking-tighter leading-none uppercase italic ${highVisibility ? 'text-4xl' : 'text-3xl'}`}
          >
            Nomadology<br/>
            <span className="text-outline" style={{ WebkitTextStroke: '1px #f2f2f2' }}>Visualizer</span>
          </motion.h1>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-xerox-bg hover:text-xerox-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowInfo(true)}
              className="p-2 hover:bg-xerox-bg hover:text-xerox-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="View Project Information"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Middle Content */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Simulation Controls">
          <section className="space-y-2">
            <h2 className={`font-black uppercase tracking-[0.2em] border-b-2 border-xerox-ink pb-0.5 inline-block ${highVisibility ? 'text-xs' : 'text-[10px]'}`}>
              Select Metaphysics
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    // A new model starts from its own defaults, so drop the old model's settings from the URL.
                    window.history.replaceState(null, '', `${window.location.pathname}?model=${model.id}`);
                    setActiveModel(model.id);
                    setIsSidebarOpen(false);
                    setAnnouncement(`Switched to ${model.name} model`);
                  }}
                  aria-pressed={activeModel === model.id}
                  className={`group relative p-3 text-left border-2 border-xerox-ink transition-all duration-75 min-h-[50px] ${
                    activeModel === model.id 
                      ? 'bg-xerox-ink text-xerox-bg brutal-shadow' 
                      : 'bg-white hover:bg-xerox-bg hover:text-xerox-ink hover:brutal-shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-black uppercase tracking-tight ${highVisibility ? 'text-lg' : 'text-base'}`}>{model.name}</span>
                    <model.sidebarIcon aria-hidden="true" className={`w-5 h-5 ${
                      activeModel === model.id ? ACTIVE_ICON[model.id] : 'text-xerox-ink group-hover:text-xerox-ink'
                    }`} />
                  </div>
                  <p className={`mt-0.5 font-bold uppercase tracking-wider opacity-70 ${highVisibility ? 'text-[10px]' : 'text-[9px]'} ${activeModel === model.id ? 'text-xerox-bg' : 'text-xerox-ink'}`}>
                    {model.tagline}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 p-3 bg-xerox-ink text-xerox-bg border-2 border-xerox-ink brutal-shadow">
            <h2 className={`font-black uppercase tracking-[0.2em] border-b border-xerox-bg/30 pb-0.5 ${highVisibility ? 'text-xs' : 'text-[10px]'}`}>
              Processes
            </h2>
            <div className="space-y-2">
              {FRAMEWORK.map((f, i) => (
                <div key={f.id} className="space-y-0.5" role="article">
                  <span className={`font-black uppercase tracking-widest ${highVisibility ? 'text-sm' : 'text-xs'}`} style={{ color: PROCESS[f.id].color }}>
                    0{i + 1} / {PROCESS[f.id].name}
                  </span>
                  <p className={`${highVisibility ? 'text-sm' : 'text-[11px]'} leading-tight font-medium`}><Book text={f.text} /></p>
                </div>
              ))}
              <p className={`${highVisibility ? 'text-xs' : 'text-[10px]'} leading-tight opacity-70 pt-1 border-t border-xerox-bg/30`}>
                Encompassment (ecumenical organizations) is not modeled yet.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className={`font-black uppercase tracking-[0.2em] border-b-2 border-xerox-ink pb-0.5 inline-block ${highVisibility ? 'text-xs' : 'text-[10px]'}`}>
              Accessibility
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => {
                  setHighVisibility(!highVisibility);
                  setAnnouncement(`High visibility mode ${!highVisibility ? 'enabled' : 'disabled'}`);
                }}
                aria-pressed={highVisibility}
                className={`p-3 border-2 border-xerox-ink flex items-center justify-between transition-all min-h-[44px] ${highVisibility ? 'bg-xerox-cyan text-xerox-ink brutal-shadow-sm' : 'bg-white hover:bg-xerox-bg'}`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span className={`font-black uppercase ${highVisibility ? 'text-sm' : 'text-xs'}`}>High Visibility</span>
                </div>
                <div className={`w-8 h-4 border-2 border-xerox-ink relative transition-colors ${highVisibility ? 'bg-xerox-ink' : 'bg-white'}`}>
                  <div className={`absolute top-0 bottom-0 w-3 border-r-2 border-xerox-ink transition-all ${highVisibility ? 'right-0 bg-xerox-cyan' : 'left-0 bg-xerox-ink'}`} />
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setReducedMotion(!reducedMotion);
                  setAnnouncement(`Reduced motion mode ${!reducedMotion ? 'enabled' : 'disabled'}`);
                }}
                aria-pressed={reducedMotion}
                className={`p-3 border-2 border-xerox-ink flex items-center justify-between transition-all min-h-[44px] ${reducedMotion ? 'bg-xerox-magenta text-xerox-bg brutal-shadow-sm' : 'bg-white hover:bg-xerox-bg'}`}
              >
                <div className="flex items-center gap-2">
                  <ZapOff className="w-4 h-4" aria-hidden="true" />
                  <span className={`font-black uppercase ${highVisibility ? 'text-sm' : 'text-xs'}`}>Reduced Motion</span>
                </div>
                <div className={`w-8 h-4 border-2 border-xerox-ink relative transition-colors ${reducedMotion ? 'bg-xerox-ink' : 'bg-white'}`}>
                  <div className={`absolute top-0 bottom-0 w-3 border-r-2 border-xerox-ink transition-all ${reducedMotion ? 'right-0 bg-xerox-magenta' : 'left-0 bg-xerox-ink'}`} />
                </div>
              </button>
            </div>
          </section>
        </nav>

        {/* Fixed Footer in Sidebar */}
        <footer className="shrink-0 p-4 border-t-4 border-xerox-ink bg-xerox-bg text-[9px] font-bold uppercase tracking-tighter opacity-50">
          Deleuze & Guattari // <i>A Thousand Plateaus</i>, plateaus 12-13
        </footer>
      </aside>

      {/* Main Visualizer Area */}
      <main className="flex-1 relative bg-white overflow-hidden flex flex-col min-h-0" role="main" aria-label={`Visualizer: ${activeModel}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0, filter: highVisibility ? 'none' : 'contrast(2) brightness(0.5)' }}
            animate={{ opacity: 1, filter: highVisibility ? 'none' : 'contrast(1) brightness(1)' }}
            exit={{ opacity: 0, filter: highVisibility ? 'none' : 'contrast(2) brightness(0.5)' }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            className="flex-1 w-full relative min-h-0"
          >
            <ModelShell
              key={activeModel}
              model={MODEL[activeModel]}
              isReducedMotion={reducedMotion}
              isHighVis={highVisibility}
              onAnnounce={setAnnouncement}
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Global Overlay Texture */}
        <div className={`absolute inset-0 pointer-events-none halftone transition-opacity duration-300 ${highVisibility ? 'opacity-0' : 'opacity-[0.05]'}`} aria-hidden="true" />
      </main>

      {/* Info Modal - Xerox Flyer Style */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="absolute inset-0 bg-xerox-ink/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 1.1, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.1, rotate: 2 }}
              className="relative w-full max-w-xl bg-xerox-bg border-4 border-xerox-ink p-10 brutal-shadow xerox-effect"
              role="dialog"
              aria-labelledby="info-modal-title"
              aria-modal="true"
            >
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 p-2 hover:bg-xerox-ink hover:text-xerox-bg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close information modal"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 id="info-modal-title" className="text-3xl font-black text-xerox-ink mb-6 uppercase tracking-tighter italic">
                Nomadology_Visualizer.txt
              </h2>
              
              <div className="space-y-6 text-sm font-bold leading-tight uppercase overflow-y-auto max-h-[60vh] pr-2">
                <section className="space-y-4">
                  <p className="border-l-4 border-xerox-ink pl-4">
                    In <i>A Thousand Plateaus</i> (1980), Deleuze and Guattari “define social formations by machinic processes and not by modes of production” (435). They describe several of those processes in physical terms, as laminar and turbulent flow, crystallization, resonance, and the fall of bodies.
                  </p>
                  <p>
                    Each model here runs one of those descriptions as a simulation. The Sources button in every model separates what <i>A Thousand Plateaus</i> says, what it borrows, what the physics says, and where they part ways.
                  </p>
                  <p className="bg-xerox-ink text-xerox-bg p-4">
                    These are early versions. Their Sources panels say plainly where a model departs from the book or from physics. A rebuild is under way.
                  </p>
                </section>

                <section className="space-y-3 border-t-2 border-xerox-ink pt-6">
                  <h3 className="text-lg font-black tracking-tight">Works cited</h3>
                  <ul className="space-y-1.5 text-[11px] font-medium normal-case leading-snug">
                    {Object.values(BIBLIOGRAPHY)
                      .sort((x, y) => x.cite.localeCompare(y.cite))
                      .map((w) => (
                        <li key={w.cite}>
                          {w.cite}
                          {w.atp && <span className="opacity-70"> Cited in <i>Plateaus</i>: {w.atp}.</span>}
                        </li>
                      ))}
                  </ul>
                  <p className="text-[10px] normal-case font-medium opacity-70">
                    Page numbers refer to the Minnesota translation of <i>A Thousand Plateaus</i> (1987), cited as <i>Plateaus</i>. Code: Apache License 2.0. Text: CC BY 4.0. Built with React and HTML canvas.
                  </p>
                </section>

                <div className="pt-6 border-t-2 border-xerox-ink opacity-60 text-[10px] normal-case">
                  “Smooth space is constituted by the minimum angle, which deviates from the vertical, and by the vortex, which overspills striation” (489).
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}