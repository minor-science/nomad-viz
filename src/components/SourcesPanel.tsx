import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-white">{title}</h3>
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[88vh] bg-[#111827] border border-white/10 flex flex-col text-[#e5e7eb]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-baseline justify-between">
          <h2 id="sources-title" className="font-semibold">Sources: {model.name}</h2>
          <button onClick={onClose} className="text-sm text-white/60 hover:text-white">
            Close
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-8 ${body} leading-relaxed`}>
          <p><Book text={s.summary} /></p>

          <Section title="Processes in this model">
            <ul className="space-y-1.5">
              {FIVE.map((p) => {
                const on = present.has(p.id);
                return (
                  <li key={p.id} className="flex gap-3 items-baseline">
                    <span
                      className="inline-block w-2 h-2 shrink-0 translate-y-px border"
                      style={{ borderColor: p.color, background: on ? p.color : 'transparent' }}
                      aria-hidden="true"
                    />
                    <span className={on ? '' : 'text-white/60'}>
                      {p.name} <span className="text-white/50">({p.formation.toLowerCase()})</span>
                      {on ? ', staged here' : <>: <Book text={s.absent[p.id] ?? 'Not modeled.'} /></>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title={<>What <i>A Thousand Plateaus</i> says</>}>
            <ul className="space-y-4">
              {s.atp.map((p, i) => (
                <li key={i}>
                  <blockquote className="border-l-2 border-white/20 pl-3">
                    “{p.quote}” <span className="text-white/50">(<i>Plateaus</i>: {p.pages})</span>
                  </blockquote>
                  {p.note && <p className="pl-3.5 text-white/60 mt-1"><Book text={p.note} /></p>}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="What it borrows">
            <ul className="space-y-3">
              {s.borrowed.map((b) => (
                <li key={b.bib}>
                  <span className="text-white">{BIBLIOGRAPHY[b.bib].short ?? BIBLIOGRAPHY[b.bib].cite.split('.')[0]}</span>{' '}
                  <span className="text-white/50">({/^\d/.test(b.where) ? <><i>Plateaus</i>: {b.where}</> : <Book text={b.where} />})</span>
                  <br />
                  <Book text={b.text} />
                </li>
              ))}
            </ul>
          </Section>

          <Section title="The physics">
            <ul className="space-y-5">
              {s.physics.map((p) => (
                <li key={p.name}>
                  <span className="text-white">{p.name}</span>
                  {p.tex && <Tex tex={p.tex} />}
                  <p><Book text={p.text} /></p>
                </li>
              ))}
            </ul>
            <p className="text-white/80"><span className="text-white">What the simulation computes. </span><Book text={s.code} /></p>
          </Section>

          <Section title="Where they part ways">
            <ul className="space-y-3">
              {s.divergences.map((d, i) => (
                <li key={i}>
                  <span className="text-white/50">{d.kind === 'model' ? <>The model and <i>Plateaus</i>. </> : <><i>Plateaus</i> and physics. </>}</span>
                  <Book text={d.text} />
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Works cited">
            <ul className="space-y-1 text-[0.9em] text-white/80">
              {cited.map((k) => (
                <li key={k}>
                  {BIBLIOGRAPHY[k].cite}
                  {BIBLIOGRAPHY[k].atp && <span className="text-white/50"> Cited in <i>Plateaus</i>: {BIBLIOGRAPHY[k].atp}.</span>}
                </li>
              ))}
            </ul>
            <p className="text-[0.85em] text-white/50">
              Page numbers refer to the Minnesota translation of <i>A Thousand Plateaus</i> (1987), cited as <i>Plateaus</i>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default SourcesPanel;
