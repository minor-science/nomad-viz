/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Waves, 
  Droplets, 
  Anvil, 
  Orbit,
  Info,
  X,
  Menu
} from 'lucide-react';

import AcousticModel from './components/AcousticModel';
import FluidModel from './components/FluidModel';
import CosmicModel from './components/CosmicModel';
import MetallurgicModel from './components/MetallurgicModel';

type ModelType = 'hydraulic' | 'metallurgic' | 'acoustic' | 'cosmic';

const models = [
  { id: 'hydraulic', name: 'Hydraulic', icon: Droplets },
  { id: 'metallurgic', name: 'Metallurgic', icon: Anvil },
  { id: 'acoustic', name: 'Acoustic', icon: Waves },
  { id: 'cosmic', name: 'Cosmic', icon: Orbit },
];

export default function App() {
  const [activeModel, setActiveModel] = useState<ModelType>('hydraulic');
  const [showInfo, setShowInfo] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-xerox-bg text-xerox-ink selection:bg-xerox-ink selection:text-xerox-bg overflow-hidden relative">
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b-4 border-xerox-ink bg-xerox-ink text-xerox-bg flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Nomadology</h1>
          <span className="text-[8px] font-bold border border-xerox-bg px-1">V3.0</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 hover:bg-xerox-bg hover:text-xerox-ink transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

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
            className="text-3xl font-black tracking-tighter leading-none uppercase italic"
          >
            Nomadology<br/>
            <span className="text-outline" style={{ WebkitTextStroke: '1px #f2f2f2' }}>Visualizer</span>
          </motion.h1>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-xerox-bg hover:text-xerox-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowInfo(true)}
              className="p-1 hover:bg-xerox-bg hover:text-xerox-ink transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Middle Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <section className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-xerox-ink pb-0.5 inline-block">
              Select Metaphysics
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setActiveModel(model.id as ModelType);
                    setIsSidebarOpen(false);
                  }}
                  className={`group relative p-3 text-left border-2 border-xerox-ink transition-all duration-75 ${
                    activeModel === model.id 
                      ? 'bg-xerox-ink text-xerox-bg brutal-shadow' 
                      : 'bg-white hover:bg-xerox-bg hover:text-xerox-ink hover:brutal-shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black uppercase tracking-tight">{model.name}</span>
                    <model.icon className={`w-4 h-4 ${
                      activeModel === model.id 
                        ? (model.id === 'cosmic' ? 'text-xerox-magenta' : 
                           model.id === 'metallurgic' ? 'text-xerox-gray' : 
                           model.id === 'acoustic' ? 'text-xerox-yellow' :
                           model.id === 'hydraulic' ? 'text-xerox-cyan' : 'text-xerox-accent')
                        : 'text-xerox-ink group-hover:text-xerox-ink'
                    }`} />
                  </div>
                  <p className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider opacity-70 ${activeModel === model.id ? 'text-xerox-bg' : 'text-xerox-ink'}`}>
                    {model.id === 'cosmic' && 'Orbital Capture'}
                    {model.id === 'metallurgic' && 'Thermodynamic Flow'}
                    {model.id === 'acoustic' && 'Resonant Frequency'}
                    {model.id === 'hydraulic' && 'Fluid Dynamics'}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 p-3 bg-xerox-ink text-xerox-bg border-2 border-xerox-ink brutal-shadow">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-xerox-bg/30 pb-0.5">
              Conceptual Framework
            </h2>
            <div className="space-y-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-xerox-cyan tracking-widest">01 / The State</span>
                <p className="text-[11px] leading-tight font-medium">
                  Apparatus of Capture. Striation of space. Imposition of metric, laminar, and resonant order.
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-xerox-magenta tracking-widest">02 / The Nomad</span>
                <p className="text-[11px] leading-tight font-medium">
                  The War Machine. Deterritorialization. Creation of smooth space through turbulence and transversal movement.
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-xerox-yellow tracking-widest">03 / Non-State</span>
                <p className="text-[11px] leading-tight font-medium">
                  Anticipation & Warding. Mechanisms that prevent State formation before it can crystallize.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Fixed Footer in Sidebar */}
        <footer className="shrink-0 p-4 border-t-4 border-xerox-ink bg-xerox-bg text-[9px] font-bold uppercase tracking-tighter opacity-50">
          Deleuze & Guattari // Nomadology: The War Machine
        </footer>
      </aside>

      {/* Main Visualizer Area */}
      <main className="flex-1 relative bg-white overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0, filter: 'contrast(2) brightness(0.5)' }}
            animate={{ opacity: 1, filter: 'contrast(1) brightness(1)' }}
            exit={{ opacity: 0, filter: 'contrast(2) brightness(0.5)' }}
            transition={{ duration: 0.15 }}
            className="flex-1 w-full relative min-h-0"
          >
            {activeModel === 'hydraulic' && <FluidModel />}
            {activeModel === 'metallurgic' && <MetallurgicModel />}
            {activeModel === 'acoustic' && <AcousticModel />}
            {activeModel === 'cosmic' && <CosmicModel />}
          </motion.div>
        </AnimatePresence>
        
        {/* Global Overlay Texture */}
        <div className="absolute inset-0 pointer-events-none halftone opacity-[0.05]" />
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
            >
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 p-2 hover:bg-xerox-ink hover:text-xerox-bg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-black text-xerox-ink mb-6 uppercase tracking-tighter italic">
                Nomadology_Visualizer.txt
              </h2>
              
              <div className="space-y-6 text-sm font-bold leading-tight uppercase">
                <p className="border-l-4 border-xerox-ink pl-4">
                  This project visualizes the philosophical concepts of Gilles Deleuze and Félix Guattari from their work "A Thousand Plateaus" (1980).
                </p>
                <p>
                  The models explore the tension between the State Apparatus (Capture/Striation) and the Nomad War Machine (Deterritorialization/Smooth Space).
                </p>
                <p className="bg-xerox-ink text-xerox-bg p-4">
                  We also include the Non-State perspective: social mechanisms that actively ward off the formation of a State through counter-rhythms.
                </p>
                <div className="pt-6 border-t-2 border-xerox-ink opacity-50 text-[10px]">
                  "The State is a process of capture... The Nomad is a vector of deterritorialization."
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}