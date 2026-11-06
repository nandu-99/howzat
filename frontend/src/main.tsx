import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PHASE_NAMES, type PhaseEvent, type ScoreData, type Token, type LexicalOutput, type SyntaxOutput as SyntaxData, type SemanticOutput as SemanticData, type IntermediateOutput as IntermediateData, type TargetOutput as TargetData } from './types';
import { readEvents, sourceRange } from './api';
import { useBackendConnection } from './BackendConnection';
import { PhaseOverview } from './PhaseOverview';
import { ErrorDetails } from './ErrorDetails';
import { Scorecard } from './Scorecard';
import { TokenOutput } from './TokenOutput';
import { SyntaxOutput } from './SyntaxOutput';
import { SemanticOutput } from './SemanticOutput';
import { IntermediateOutput } from './IntermediateOutput';
import { TargetOutput } from './TargetOutput';
import './styles.css';

const emptyPhases = (): PhaseEvent[] => PHASE_NAMES.map((name, phase) => ({ phase, name, status: 'pending' }));
function App() {
  const { health, message, refresh } = useBackendConnection();
  const [source, setSource] = useState('');
  const [phases, setPhases] = useState(emptyPhases);
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const stop = () => { active.current?.abort(); active.current = null; setBusy(false); };
  const compile = async () => {
    if (active.current || !health || !source.trim()) return;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setPhases(emptyPhases()); setScore(null); setRequestError(''); setSelected(0);
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }), signal: controller.signal });
      await readEvents(response, event => {
        if (active.current !== controller) return;
        setPhases(previous => previous.map((phase, index) => index === event.phase ? event : phase));
        if (event.status === 'failed') setSelected(event.phase);
        if (event.status === 'unavailable') setSelected(Math.max(0, event.phase - 1));
        if (event.phase === 5 && event.status === 'completed') {
          const output = event.output as { scorecard: ScoreData };
          setScore(output.scorecard);
        }
      });
    } catch (error) {
      if (active.current === controller) {
        setRequestError(controller.signal.aborted ? 'Compilation timed out. Please retry.' : error instanceof Error ? error.message : 'Compilation failed.');
        setPhases(previous => previous.map(phase => phase.status === 'running' ? { ...phase, status: 'failed' } : phase.status === 'pending' ? { ...phase, status: 'skipped' } : phase));
      }
    } finally {
      window.clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  };
  const phase = phases[selected];
  const locatePosition = (position: { line: number; column: number; end_column?: number }) => {
    if (!editor.current) return;
    const [start, end] = sourceRange(source, position.line, position.column, position.end_column);
    editor.current.focus(); editor.current.setSelectionRange(start, end);
  };
  const locate = () => { if (phase.error) locatePosition(phase.error); };
  const locateToken = (token: Token) => locatePosition(token);
  return <>
    <header><a className="brand" href="/">HOWZAT<span>Cricket scoring compiler</span></a><button className="connection" onClick={() => void refresh()}>{message} ↻</button></header>
    <div className="intro"><h1>From cricket code to a scorecard.</h1><p>Write code → Compile → Explore each phase</p></div>
    <main>
      <aside>
        <section className="editor-panel"><div className="section-heading"><h2>Source code</h2><span>{source.split('\n').length} lines</span></div>
          <label className="sr-only" htmlFor="source">Howzat source code</label>
          <textarea id="source" ref={editor} value={source} spellCheck={false} maxLength={50000} placeholder="Enter Howzat code here…" onChange={event => {
            stop(); setSource(event.target.value); setPhases(emptyPhases()); setScore(null); setRequestError('');
          }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void compile(); } }}/>
          <div className="compile-row"><span>Ctrl / ⌘ + Enter</span><button className="primary" disabled={busy || !health || !source.trim()} onClick={() => void compile()}>{busy ? 'Compiling…' : 'Compile →'}</button></div>
        </section>
        <Scorecard data={score}/>
      </aside>
      <section className="pipeline" aria-label="Compiler output">
        <PhaseOverview phases={phases} selected={selected} onSelect={setSelected}/>
        {requestError && <p className="error" role="alert">{requestError}</p>}
        <section className="phase-detail" aria-live="polite"><div className="section-heading"><h2>{selected + 1}. {phase.name}</h2><span>{phase.status}{phase.duration_ms !== undefined ? ` · ${phase.duration_ms} ms` : ''}</span></div>
          {phase.error ? <ErrorDetails error={phase.error} onLocate={locate}/> : phase.output !== undefined ? selected === 0 ? <TokenOutput tokens={(phase.output as LexicalOutput).tokens} onLocate={locateToken}/> : selected === 1 ? <SyntaxOutput output={phase.output as SyntaxData}/> : selected === 2 ? <SemanticOutput output={phase.output as SemanticData} onLocate={locatePosition}/> : selected === 3 ? <IntermediateOutput output={phase.output as IntermediateData}/> : selected === 5 ? <TargetOutput output={phase.output as TargetData}/> : <pre>{JSON.stringify(phase.output, null, 2)}</pre> : <p>{phase.message || (phase.status === 'running' ? 'Processing…' : phase.status === 'skipped' ? 'An earlier phase did not finish.' : 'Compile your code to inspect this phase.')}</p>}
          <div className="phase-navigation"><button disabled={selected === 0} onClick={() => setSelected(selected - 1)}>← Previous</button><button disabled={selected === 5} onClick={() => setSelected(selected + 1)}>Next phase →</button></div>
        </section>
      </section>
    </main>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
