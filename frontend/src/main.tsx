import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CodeIcon, PlayIcon, ReaderIcon, ReloadIcon, FileTextIcon } from '@radix-ui/react-icons';
import { BrowserRouter, Link, useLocation, useNavigate } from 'react-router-dom';
import { PHASE_NAMES, type PhaseEvent, type ScoreData, type Token, type LexicalOutput, type SyntaxOutput as SyntaxData, type SemanticOutput as SemanticData, type IntermediateOutput as IntermediateData, type TargetOutput as TargetData, type OptimizationOutput as OptimizationData, type Example } from './types';
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
import { OptimizationOutput } from './OptimizationOutput';
import { LanguageGuide } from './LanguageGuide';
import './styles.css';

const emptyPhases = (): PhaseEvent[] => PHASE_NAMES.map((name, phase) => ({ phase, name, status: 'pending' }));
export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { health, message, refresh } = useBackendConnection();
  const [source, setSource] = useState(() => { try { return sessionStorage.getItem('howzat.source') ?? ''; } catch { return ''; } });
  const [examples, setExamples] = useState<Example[]>([]);
  const [exampleError, setExampleError] = useState('');
  const [exampleRetry, setExampleRetry] = useState(0);
  const sourceTouched = useRef(Boolean(source));
  useEffect(() => { try { sessionStorage.setItem('howzat.source', source); } catch { /* Storage can be disabled. */ } }, [source]);
  const [phases, setPhases] = useState(emptyPhases);
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const stop = () => { active.current?.abort(); active.current = null; setBusy(false); };
  const connected = Boolean(health);
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    setExampleError('');
    void fetch('/api/examples', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load examples.');
      return response.json() as Promise<Example[]>;
    }).then(items => {
      setExamples(items);
      if (!sourceTouched.current && items.length) setSource(items[0].source);
    }).catch(error => { if (!controller.signal.aborted) setExampleError(error.message); });
    return () => controller.abort();
  }, [connected, exampleRetry]);
  const loadSource = (value: string) => {
    sourceTouched.current = true; stop(); setSource(value); setPhases(emptyPhases());
    setScore(null); setSelected(0); setRequestError(''); navigate('/');
  };
  const chosen = examples.find(example => example.source === source);
  const cancel = () => {
    stop(); setRequestError('Compilation cancelled.');
    setPhases(previous => previous.map(phase => phase.status === 'pending' || phase.status === 'running' ? {...phase, status: 'skipped'} : phase));
  };
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
        setScore(null);
        setRequestError(controller.signal.aborted ? 'Compilation timed out. Please retry.' : error instanceof Error ? error.message : 'Compilation failed.');
        setPhases(previous => previous.map(phase => phase.status === 'running' ? { ...phase, status: 'failed' } : phase.status === 'pending' ? { ...phase, status: 'skipped' } : phase));
      }
    } finally {
      window.clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  };
  const phase = phases[selected];
  const passed = phases.filter(item => item.status === 'completed').length;
  const phaseStatus = {pending: 'Not started', running: 'Running', completed: 'Passed', failed: 'Failed', skipped: 'Skipped', unavailable: 'Unavailable'}[phase.status];
  const locatePosition = (position: { line: number; column: number; end_column?: number }) => {
    if (!editor.current) return;
    const [start, end] = sourceRange(source, position.line, position.column, position.end_column);
    editor.current.focus(); editor.current.setSelectionRange(start, end);
    const lineHeight = parseFloat(getComputedStyle(editor.current).lineHeight) || 24;
    editor.current.scrollTop = Math.max(0, (position.line - 1) * lineHeight - editor.current.clientHeight / 2);
  };
  const locate = () => { if (phase.error) locatePosition(phase.error); };
  const locateToken = (token: Token) => locatePosition(token);
  return <>
    <header className="app-header"><Link className="brand" to="/" aria-label="Howzat playground"><img className="brand-mark" src="/assets/howzat-mark-128.png" width="32" height="32" alt=""/><strong>howzat</strong><span>Cricket Scoring Compiler</span></Link><nav className="app-navigation" aria-label="Main navigation"><Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined}><PlayIcon aria-hidden="true"/>Playground</Link><Link to="/language" aria-current={location.pathname === '/language' ? 'page' : undefined}><ReaderIcon aria-hidden="true"/>Language guide</Link></nav><button className={`connection ${connected ? 'connected' : ''}`} onClick={() => void refresh()} title={message} aria-label={`${message}. Retry connection`}><i aria-hidden="true"/><span>{connected ? 'Compiler ready' : message}</span></button></header>
    <div hidden={location.pathname !== '/'}>
    <section className="intro"><div className="intro-content"><h1>From cricket code to a <em>scorecard.</em></h1><ol className="workflow" aria-label="How to use Howzat"><li><span>1</span>Choose an example</li><li><span>2</span>Compile</li><li><span>3</span>View results</li></ol></div></section>
    <main>
      <aside>
        <section className="editor-panel"><div className="section-heading"><h2><FileTextIcon aria-hidden="true"/>Cricket code</h2><span className="language-label">HOWZAT</span></div>
          <div className="example-picker"><label htmlFor="example">Choose an example</label>
            <select id="example" value={chosen?.id ?? ''} onChange={event => { const example = examples.find(item => item.id === event.target.value); if (example) loadSource(example.source); }} disabled={!examples.length}>
              <option value="" disabled>{examples.length ? 'Custom code' : 'Loading examples…'}</option>
              {(['Correct examples', 'Errors'] as const).map(group => <optgroup key={group} label={group}>{examples.filter(example => example.group === group).map(example => <option key={example.id} value={example.id}>{example.name}</option>)}</optgroup>)}
            </select>
            {exampleError && <p role="alert">{exampleError} <button onClick={() => setExampleRetry(value => value + 1)}>Retry</button></p>}
            {chosen && <><p>{chosen.description}</p><p className="expected"><strong>Expected:</strong> {chosen.expected}</p></>}
          </div>
          <div className="editor-file"><span><i aria-hidden="true"/>match.howzat</span><span>UTF-8</span></div>
          <label className="sr-only" htmlFor="source">Howzat source code</label>
          <textarea className="source-textarea" id="source" ref={editor} value={source} spellCheck={false} maxLength={50000} placeholder="Enter Howzat code here…" onChange={event => {
            sourceTouched.current = true; stop(); setSource(event.target.value); setPhases(emptyPhases()); setScore(null); setRequestError('');
          }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void compile(); } }}/>
          <div className="compile-row"><span>Ctrl / ⌘ + Enter</span>{busy && <button onClick={cancel}>Cancel</button>}<button className="primary" disabled={busy || !health || !source.trim()} onClick={() => void compile()}>{busy ? <ReloadIcon className="spin" aria-hidden="true"/> : <PlayIcon aria-hidden="true"/>}{busy ? 'Compiling…' : 'Compile'}</button></div>
        </section>
        <Scorecard data={score}/>
      </aside>
      <section className="pipeline" aria-label="Compiler output">
<div className="pipeline-bar"><span className="pipeline-label">Phases</span><PhaseOverview phases={phases} selected={selected} onSelect={setSelected}/><span className="phase-total" aria-label={`${passed} of 6 phases passed`}>{passed}/6</span></div>
        {requestError && <p className="error" role="alert">{requestError}</p>}
        <section className="phase-detail" aria-live="polite"><div className="section-heading"><h2>{selected + 1}. {phase.name}</h2><div className="phase-metadata"><span className={`status-badge ${phase.status}`}>{phaseStatus}</span>{phase.duration_ms !== undefined && <span className="duration">{phase.duration_ms} ms</span>}</div></div>
          {phase.error ? <ErrorDetails error={phase.error} phaseName={phase.name} onLocate={selected === 5 ? undefined : locate} fix={chosen?.failure_phase === selected ? chosen.fix : undefined} onCorrect={chosen?.failure_phase === selected && chosen.fixed_source ? () => loadSource(chosen.fixed_source!) : undefined}/> : phase.output !== undefined ? selected === 0 ? <TokenOutput tokens={(phase.output as LexicalOutput).tokens} onLocate={locateToken}/> : selected === 1 ? <SyntaxOutput output={phase.output as SyntaxData}/> : selected === 2 ? <SemanticOutput output={phase.output as SemanticData} onLocate={locatePosition}/> : selected === 3 ? <IntermediateOutput output={phase.output as IntermediateData}/> : selected === 4 ? <OptimizationOutput output={phase.output as OptimizationData}/> : selected === 5 ? <TargetOutput output={phase.output as TargetData}/> : <pre>{JSON.stringify(phase.output, null, 2)}</pre> : <div className="phase-empty"><CodeIcon width={28} height={28} aria-hidden="true"/><h3>{phase.status === 'pending' ? 'See how your code becomes a score.' : phaseStatus}</h3><p>{phase.message || (phase.status === 'running' ? 'Processing your code…' : phase.status === 'skipped' ? 'An earlier phase did not finish.' : 'Choose an example, then compile to explore each phase.')}</p></div>}
          <div className="phase-navigation"><button disabled={selected === 0} onClick={() => setSelected(selected - 1)}>← Previous</button>{selected === 5 && score ? <button onClick={() => { const card = document.getElementById('scorecard'); card?.scrollIntoView({behavior: 'smooth', block: 'nearest'}); card?.focus(); }}>View scorecard →</button> : <button disabled={selected === 5} onClick={() => setSelected(selected + 1)}>Next phase →</button>}</div>
        </section>
      </section>
    </main>
    </div>
    {location.pathname === '/language' && <LanguageGuide ready={connected} onLoad={loadSource}/>}
    {location.pathname !== '/' && location.pathname !== '/language' && <article className="language-guide"><h1>Page not found</h1><p><Link to="/">Open the playground</Link></p></article>}
  </>;
}
const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>);
