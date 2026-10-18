/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Andrew Culp
 */

import { useState } from 'react';

import ModelShell from './components/ModelShell';
import { MODELS, MODEL, isModelId } from './models';
import { readModel, readPanel } from './sim/url';
import type { ModelId } from './sim/types';
import { BIBLIOGRAPHY } from './content/bibliography';

// Tabs in the order the models were built and approved: metallurgic first.
const ORDER: ModelId[] = ['metallurgic', 'hydraulic', 'acoustic', 'cosmic'];

export default function App() {
  const [activeModel, setActiveModel] = useState<ModelId>(() => {
    const m = readModel();
    return isModelId(m) ? m : 'metallurgic';
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showSources, setShowSources] = useState(() => readPanel() === 'sources');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [announcement, setAnnouncement] = useState('');
  const models = ORDER.map((id) => MODELS.find((m) => m.id === id)!).filter(Boolean);

  return (
    <div className={`flex flex-col h-screen bg-[#0b1220] text-[#e5e7eb] font-sans overflow-hidden ${highContrast ? 'high-contrast' : ''}`}>
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      <header className="shrink-0 flex items-center gap-4 sm:gap-6 px-4 h-12 border-b border-white/10 min-w-0">
        <h1 className="hidden sm:block text-sm font-semibold tracking-tight whitespace-nowrap">Nomadology Visualizer</h1>
        <nav className="flex gap-4 overflow-x-auto min-w-0 text-sm" aria-label="Models">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                // A new model starts from its own defaults, so drop the old model's settings from the URL.
                window.history.replaceState(null, '', `${window.location.pathname}?model=${m.id}`);
                setActiveModel(m.id);
                setAnnouncement(`${m.name} model`);
              }}
              aria-current={activeModel === m.id ? 'page' : undefined}
              className={`py-3 whitespace-nowrap border-b-2 ${activeModel === m.id ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              {m.name}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex gap-4 shrink-0">
          <button onClick={() => setShowSources(true)} className="text-sm text-white/60 hover:text-white">
            Sources
          </button>
          <button onClick={() => setShowAbout(true)} className="text-sm text-white/60 hover:text-white">
            About
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 min-w-0" aria-label={`${MODEL[activeModel].name} model`}>
        <ModelShell
          key={activeModel}
          model={MODEL[activeModel]}
          isReducedMotion={reducedMotion}
          isHighVis={highContrast}
          onAnnounce={setAnnouncement}
          onReducedMotion={setReducedMotion}
          onHighVis={setHighContrast}
          sourcesOpen={showSources}
          onSources={setShowSources}
        />
      </main>

      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="about-title">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAbout(false)} />
          <div className="relative w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#111827] border border-white/10 p-8 text-sm leading-relaxed space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 id="about-title" className="text-base font-semibold">About</h2>
              <button onClick={() => setShowAbout(false)} className="text-white/60 hover:text-white">
                Close
              </button>
            </div>
            <p>
              In <i>A Thousand Plateaus</i> (1980), Deleuze and Guattari “define social formations by machinic processes and not by modes of production” (435). Each model here stages three of those processes, capture, the war machine, and warding off, as the behavior of one material: crystals, a liquid, sound, and gravity.
            </p>
            <p>The Sources button in each model separates what <i>A Thousand Plateaus</i> says, what it borrows, what the physics says, and where they part ways.</p>
            <h3 className="font-semibold pt-2">Works cited</h3>
            <ul className="space-y-1.5 text-xs text-white/80">
              {Object.values(BIBLIOGRAPHY)
                .sort((x, y) => x.cite.localeCompare(y.cite))
                .map((w) => (
                  <li key={w.cite}>
                    {w.cite}
                    {w.atp && <span className="text-white/50"> Cited in <i>Plateaus</i>: {w.atp}.</span>}
                  </li>
                ))}
            </ul>
            <p className="text-xs text-white/50">
              Page numbers refer to the Minnesota translation of <i>A Thousand Plateaus</i> (1987), cited as <i>Plateaus</i>. Code: Apache License 2.0. Text: CC BY 4.0.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
