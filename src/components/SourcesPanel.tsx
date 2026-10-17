import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PROCESSES } from '../processes';
import { MODEL } from '../models';
import { SOURCES } from '../content';
import { BIBLIOGRAPHY } from '../content/bibliography';
import type { ModelId } from '../sim/types';
import { Book } from './Book';

interface Props {
  modelType: ModelId;
  isOpen: boolean;
  onClose: () => void;
  isHighVis?: boolean;
}

// The five processes of ATP 435-37. Marronage (Protevi) is left out of this key until the visualizer stages it.
const FIVE = PROCESSES.filter((p) => p.id !== 'marronage');

function Tex({ tex }: { tex: string }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: true, throwOnError: false }), [tex]);
  return <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Section({ n, title, children }: { n: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 border-xerox-ink pb-1">
        {n} / {title}
      </h4>
      {children}
    </section>
  );
}

export const SourcesPanel: React.FC<Props> = ({ modelType, isOpen, onClose, isHighVis }) => {
  const model = MODEL[modelType];
  const s = SOURCES[modelType];
  const present = new Set(model.cards.map((c) => c.process));
  const cited = useMemo(() => {
    const keys = new Set<string>(['atp']);
    s.borrowed.forEach((b) => keys.add(b.bib));
    s.physics.forEach((p) => p.bib?.forEach((k) => keys.add(k)));
    s.divergences.forEach((d) => d.bib?.forEach((k) => keys.add(k)));
    return [...keys].sort((a, b) => BIBLIOGRAPHY[a].cite.localeCompare(BIBLIOGRAPHY[b].cite));
  }, [s]);
  const body = isHighVis ? 'text-base' : 'text-[13px]';

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
            className="relative w-full max-w-3xl max-h-[88vh] bg-xerox-bg border-4 border-xerox-ink brutal-shadow-lg flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sources-title"
          >
            <div className="p-4 border-b-4 border-xerox-ink bg-xerox-ink text-xerox-bg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
                <h2 id="sources-title" className="text-lg font-black uppercase tracking-tighter">Sources: {model.name}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 border-2 border-xerox-bg hover:bg-xerox-bg hover:text-xerox-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close sources"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-6 md:p-8 space-y-8 ${body} leading-relaxed font-sans`}>
              <p className="border-l-8 border-xerox-ink pl-4 font-medium"><Book text={s.summary} /></p>

              <section className="space-y-2" aria-label="Processes in this model">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 border-xerox-ink pb-1 font-mono">Processes in this model</h4>
                <ul className="space-y-1.5">
                  {FIVE.map((p) => {
                    const on = present.has(p.id);
                    return (
                      <li key={p.id} className="flex gap-3 items-baseline">
                        <span
                          className="inline-block w-3 h-3 shrink-0 border-2 translate-y-0.5"
                          style={{ borderColor: p.color, background: on ? p.color : 'transparent' }}
                          aria-hidden="true"
                        />
                        <span className={on ? '' : 'opacity-70'}>
                          <b>{p.name}</b> <span className="text-[0.85em] uppercase tracking-wider opacity-70">{p.formation}</span>
                          {on ? ' (staged here)' : <>: <Book text={s.absent[p.id] ?? 'Not modeled.'} /></>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <Section n="01" title={<>What <i>A Thousand Plateaus</i> says</>}>
                <ul className="space-y-4">
                  {s.atp.map((p, i) => (
                    <li key={i}>
                      <blockquote className="border-l-4 pl-3 italic" style={{ borderColor: '#00aeef' }}>
                        “{p.quote}” <span className="not-italic font-mono text-[0.85em]">(<i>Plateaus</i>: {p.pages})</span>
                      </blockquote>
                      {p.note && <p className="pl-4 text-[0.9em] opacity-75 mt-1"><Book text={p.note} /></p>}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section n="02" title="What it borrows">
                <ul className="space-y-3">
                  {s.borrowed.map((b) => (
                    <li key={b.bib}>
                      <b>{BIBLIOGRAPHY[b.bib].short ?? BIBLIOGRAPHY[b.bib].cite.split('.')[0]}</b>{' '}
                      <span className="font-mono text-[0.85em] opacity-70">[{/^\d/.test(b.where) ? <><i>Plateaus</i>: {b.where}</> : <Book text={b.where} />}]</span>
                      <br />
                      <Book text={b.text} />
                    </li>
                  ))}
                </ul>
              </Section>

              <Section n="03" title="The physics">
                <ul className="space-y-5">
                  {s.physics.map((p) => (
                    <li key={p.name}>
                      <b>{p.name}</b>
                      {p.tex && <Tex tex={p.tex} />}
                      <p><Book text={p.text} /></p>
                    </li>
                  ))}
                </ul>
                <div className="p-4 bg-xerox-ink/5 border-2 border-xerox-ink border-dashed">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest mb-1">What this simulation computes</p>
                  <p><Book text={s.code} /></p>
                </div>
              </Section>

              <Section n="04" title="Where they part ways">
                <ul className="space-y-3">
                  {s.divergences.map((d, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 font-mono text-[10px] font-black uppercase tracking-wider border-2 border-xerox-ink px-1 h-fit mt-0.5">
                        {d.kind === 'model' ? <>Model vs <i>Plateaus</i></> : <><i>Plateaus</i> vs physics</>}
                      </span>
                      <span><Book text={d.text} /></span>
                    </li>
                  ))}
                </ul>
              </Section>

              <section className="space-y-2 border-t-2 border-xerox-ink pt-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] font-mono">Works cited</h4>
                <ul className="space-y-1 text-[0.9em]">
                  {cited.map((k) => (
                    <li key={k}>
                      {BIBLIOGRAPHY[k].cite}
                      {BIBLIOGRAPHY[k].atp && <span className="opacity-70"> Cited in <i>Plateaus</i>: {BIBLIOGRAPHY[k].atp}.</span>}
                    </li>
                  ))}
                </ul>
                <p className="text-[0.85em] opacity-70">
                  Page numbers refer to the Minnesota translation of <i>A Thousand Plateaus</i> (1987), cited as <i>Plateaus</i>.
                </p>
              </section>
            </div>

            <div className="p-3 border-t-4 border-xerox-ink bg-xerox-bg flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-xerox-ink text-xerox-bg font-black uppercase text-xs brutal-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all min-h-[44px]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SourcesPanel;
