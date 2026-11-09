import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRightIcon, CodeIcon, ReaderIcon, FileTextIcon } from '@radix-ui/react-icons';
import { PHASE_NAMES, type LanguageReference } from './types';
import { SyntaxOutput } from './SyntaxOutput';
import { TokenGuide } from './TokenGuide';
import { highlightSource } from './sourceHighlight';
import './LanguageGuide.css';

const sections = [
  ['introduction', 'Introduction'], ['syntax', 'The language'], ['tokens', 'Tokens and regex'],
  ['rules', 'Cricket & language rules'], ['grammar', 'Context-free grammar'],
  ['examples', 'Examples & parse trees'], ['pipeline', 'How compilation works'],
];
const vocabulary = [
  ['0 … 6', 'Bat runs; 0 is a dot ball', '0 to 6', 'Yes'],
  ['run(expr)', 'Bat runs from an expression', '0 to 6', 'Yes'],
  ['wide', 'Wide delivery', '1 extra', 'No'], ['noball', 'No-ball delivery', '1 extra', 'No'],
  ['wicket', 'One wicket', '0', 'Yes'], ['bye(expr)', 'Byes', '1 to 4 extras', 'Yes'],
  ['legbye(expr)', 'Leg-byes', '1 to 4 extras', 'Yes'],
];
const phaseDescriptions = [
  'Read characters and identify keywords, names, numbers, and symbols.',
  'Check the grammar and build the parse tree and abstract syntax tree.',
  'Resolve team names and check delivery values, overs, wickets, and innings rules.',
  'Translate the validated program into ordered scoring instructions.',
  'Fold constant calculations and substitute their values without changing deliveries.',
  'Generate and execute Python. Return the scorecard and match result.',
];

function ReferenceCode({ value, label, source = false }: { value: string; label: string; source?: boolean }) {
  return <figure className="guide-code"><figcaption><span><FileTextIcon aria-hidden="true"/>{label}</span><span>{source ? 'Howzat' : 'Reference'}</span></figcaption>
    <pre><code>{source ? highlightSource(value).map((part, index) => <span key={index} className={`source-${part.kind}`}>{part.text}</span>) : value}</code></pre>
  </figure>;
}
function SectionHeading({ number, title, children }: { number: string; title: string; children: string }) {
  return <div className="guide-section-heading"><span>{number}</span><h2>{title}</h2><p>{children}</p></div>;
}

export function LanguageGuide({ ready, onLoad }: { ready: boolean; onLoad: (source: string) => void }) {
  const location = useLocation();
  const [reference, setReference] = useState<LanguageReference | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(0);
  const [active, setActive] = useState('introduction');
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setError('');
    void fetch('/api/language', {signal: controller.signal, cache: 'no-store'}).then(async response => {
      if (!response.ok) throw new Error('Could not load the language guide.');
      return response.json() as Promise<LanguageReference>;
    }).then(value => { if (!controller.signal.aborted) setReference(value); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [ready, retry]);
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || !['start', ...sections.map(([id]) => id)].includes(id)) return;
    setActive(id === 'start' ? 'syntax' : id);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
  }, [location.hash, reference]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, {rootMargin: '-10% 0px -65% 0px', threshold: 0});
    for (const [id] of sections) { const element = document.getElementById(id); if (element) observer.observe(element); }
    return () => observer.disconnect();
  }, [reference]);
  const sample = reference?.samples[selected];
  return <main className="guide-layout">
    <aside className="guide-sidebar" aria-label="Language reference navigation">
      <div className="sidebar-title"><ReaderIcon aria-hidden="true"/>Language reference</div>
      <nav aria-label="Guide sections">{sections.map(([id, label], index) => <Link key={id} to={`/language#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}><span aria-hidden="true">{String(index).padStart(2, '0')}</span>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><span>From notation to execution.</span><p>Write a delivery. Follow it through the compiler.</p><Link to="/">Open playground <ArrowRightIcon aria-hidden="true"/></Link></div>
    </aside>
    <article className="guide-content">
      <section id="introduction" className="guide-intro">
        <span className="guide-eyebrow">The Howzat language</span>
        <h1>Cricket, written<br/>in a language of its own<span>.</span></h1>
        <p>Describe the deliveries. Let the compiler keep score. Here’s how to write, read, and understand a Howzat program.</p>
        <div className="guide-intro-meta"><span><CodeIcon aria-hidden="true"/>Cricket scoring language</span><span><ReaderIcon aria-hidden="true"/>Context-free syntax</span><span><FileTextIcon aria-hidden="true"/>Python target</span></div>
      </section>
      {!ready && <p className="guide-notice" role="status">Connect the backend to load the language specification.</p>}
      {error && <div className="error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {ready && !reference && !error && <p className="guide-notice" role="status">Loading language specification…</p>}
      <section id="syntax" className="guide-section"><span id="start" className="guide-anchor"/>
        <SectionHeading number="01 / Getting started" title="A match in a few lines.">Declare the teams, open an innings, and list each delivery inside a numbered over.</SectionHeading>
        {reference && <ReferenceCode value={reference.samples[0].source} label="match.howzat" source/>}
        <div className="syntax-notes">
          <div><code>team IND "India";</code><p>An identifier for the compiler. A name for the scorecard. End every team declaration with a semicolon.</p></div>
          <div><code>innings IND {'{ … }'}</code><p>An innings belongs to a declared team. Braces group its overs; commas separate deliveries.</p></div>
          <div><code>over 1 {'{ 0, 1, 4, 0, 2, 6 }'}</code><p>Six legal balls, 13 runs. Number overs starting at 1. Write 0 for a dot ball.</p></div>
          <div><code>innings IND complete {'{ … }'}</code><p>Mark a finished innings with complete. Ten wickets also finish it. Use partial for an unfinished final over.</p></div>
        </div>
        <h3>The delivery vocabulary</h3>
        <div className="guide-table"><table><caption className="sr-only">Delivery vocabulary</caption><thead><tr>{['Write', 'Meaning', 'Runs', 'Legal ball?'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{vocabulary.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody></table></div>
        <p className="guide-callout">A wide or no-ball is a standalone one-run event. Combined outcomes, such as a no-ball hit for four, are outside this scoring model.</p>
      </section>
      <section id="tokens" className="guide-section">
        <SectionHeading number="02 / Lexical reference" title="The words and symbols.">These are the predefined tokens and regex patterns used by the lexer. Keywords are case-sensitive.</SectionHeading>
        {reference && <TokenGuide keywords={reference.keywords} tokens={reference.tokens}/>}
        <div className="grammar-notes"><p><strong>Numbers</strong> contain at most six digits. <strong>Strings</strong> use double quotes without escapes or line breaks. <strong>Identifiers</strong> use ASCII letters, digits, and underscores, with a letter or underscore first.</p><p>Comments and whitespace are skipped. Source line and column positions start at 1.</p></div>
      </section>
      <section id="rules" className="guide-section">
        <SectionHeading number="03 / The rulebook" title="Good syntax. Valid cricket.">The parser checks structure. Semantic analysis checks the language and cricket rules below.</SectionHeading>
        <div className="rulebook">{reference?.rules.map((rule, index) => <div key={rule.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></div>)}</div>
      </section>
      <section id="grammar" className="guide-section">
        <SectionHeading number="04 / Formal definition" title="The context-free grammar.">Each production describes a valid structure. ε means empty; | separates alternatives.</SectionHeading>
        <div className="grammar-legend"><span><code>Program</code> start symbol</span><span><code>team, {'{'}, +</code> terminals</span><span><code>Expr, Over</code> nonterminals</span></div>
        {reference && <ReferenceCode value={reference.grammar} label="Howzat CFG · BNF notation"/>}
        <div className="grammar-notes"><p><strong>Grammar and meaning are separate.</strong> Team references, sequential overs, six legal balls, and wicket limits are checked after parsing.</p><p><strong>Expression precedence.</strong> Multiplication binds more tightly than addition. Parentheses override that order, and repeated operators associate to the left.</p></div>
      </section>
      <section id="examples" className="guide-section">
        <SectionHeading number="05 / Make it concrete" title="From productions to parse trees.">Choose an example to inspect the real parser output, grammar productions, and derivation.</SectionHeading>
        <div className="guide-example-tabs" role="tablist" aria-label="Grammar examples">{reference?.samples.map((item, index) => <button key={item.id} id={`guide-tab-${item.id}`} type="button" role="tab" aria-selected={selected === index} aria-controls="guide-example-panel" tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => {
          const count = reference.samples.length;
          const next = event.key === 'ArrowRight' ? (index+1)%count : event.key === 'ArrowLeft' ? (index+count-1)%count : event.key === 'Home' ? 0 : event.key === 'End' ? count-1 : null;
          if (next !== null) { event.preventDefault(); setSelected(next); document.getElementById(`guide-tab-${reference.samples[next].id}`)?.focus(); }
        }}>{item.name}</button>)}</div>
        {sample && <div id="guide-example-panel" role="tabpanel" aria-labelledby={`guide-tab-${sample.id}`}>
          <div className="example-description"><div><p>{sample.description}</p><p className="guide-expected">{sample.expected}</p></div><button className="guide-cta" onClick={() => onLoad(sample.source)}>Try in playground <ArrowRightIcon aria-hidden="true"/></button></div>
          <ReferenceCode value={sample.source} label="Source program" source/>
          <SyntaxOutput key={sample.id} output={{ast: sample.ast, parse_tree: sample.parse_tree}}/>
          <details className="guide-derivation"><summary>Leftmost derivation · First over</summary><ReferenceCode value={sample.derivation.map((line, index) => `${String(index).padStart(2, '0')}  ${index ? '⇒ ' : ''}${line}`).join('\n')} label="Start symbol: Over"/></details>
        </div>}
      </section>
      <section id="pipeline" className="guide-section">
        <SectionHeading number="06 / The big picture" title="Six phases. One connected compiler.">The scorecard appears only after the generated Python program executes successfully.</SectionHeading>
        <ol className="pipeline-explainer">{PHASE_NAMES.map((name, index) => <li key={name}><span>{index + 1}</span><div><h3>{name}</h3><p>{phaseDescriptions[index]}</p></div></li>)}</ol>
        <div className="guide-end"><div><h3>Your next over is waiting.</h3><p>Try a sample, change a delivery, and follow what happens.</p></div><Link className="guide-cta" to="/">Open playground <ArrowRightIcon aria-hidden="true"/></Link></div>
      </section>
      <footer className="guide-footer"><strong>howzat.</strong><span>A language for cricket. A window into compilers.</span></footer>
    </article>
  </main>;
}
