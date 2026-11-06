import { useEffect, useState } from 'react';
import type { LanguageReference } from './types';
import { SyntaxOutput } from './SyntaxOutput';
import { TokenGuide } from './TokenGuide';
import './LanguageGuide.css';

export function LanguageGuide({ ready, onLoad }: { ready: boolean; onLoad: (source: string) => void }) {
  const [reference, setReference] = useState<LanguageReference | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setError('');
    void fetch('/api/language', {signal: controller.signal}).then(async response => {
      if (!response.ok) throw new Error('Could not load the language guide.');
      return response.json() as Promise<LanguageReference>;
    }).then(setReference).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [ready, retry]);
  const sample = reference?.samples[selected];
  return <article className="language-guide">
    <div className="guide-heading"><h1>Howzat language guide</h1><p>Learn the code, check the rules, and explore how it is parsed.</p></div>
    <nav aria-label="Guide sections"><a href="#start">Start here</a><a href="#tokens">Tokens and regex</a><a href="#rules">Rules</a><a href="#grammar">Grammar</a><a href="#examples">Examples and trees</a></nav>
    {!ready && <p role="status">Connect the backend to load the guide.</p>}
    {error && <div className="error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {ready && !reference && !error && <p role="status">Loading language guide…</p>}
    {reference && <>
      <section id="start"><h2>Start with one over</h2><p>Declare two teams, record an innings, and put comma-separated deliveries inside an over. Choose an example in the playground, click Compile, then explore the phases.</p>
        <pre><code>{reference.samples[0].source}</code></pre><button onClick={() => onLoad(reference.samples[0].source)}>Try in playground →</button>
        <p><code>0</code> means no runs. <code>wicket</code> records a wicket. Use <code>partial</code> on an unfinished final over and <code>complete</code> to mark an innings finished.</p>
      </section>
      <section id="tokens"><h2>Predefined tokens and regex</h2><p>The lexer recognizes these patterns. Keywords are case-sensitive. Comments and whitespace do not become tokens.</p>
        <TokenGuide keywords={reference.keywords} tokens={reference.tokens}/>
        <p>Numbers have at most six digits. Strings use double quotes without escapes or line breaks. Identifiers use ASCII letters, digits, and underscores; they cannot start with a digit. Source positions are one-based.</p>
      </section>
      <section id="rules"><h2>Language and cricket rules</h2>{reference.rules.map(rule => <div key={rule.title} className="guide-rule"><h3>{rule.title}</h3><p>{rule.text}</p></div>)}</section>
      <section id="grammar"><h2>Context-free grammar (CFG)</h2><p>Each production describes a valid structure. The arrow means “can become,” | separates alternatives, and ε means empty.</p><pre>{reference.grammar}</pre></section>
      <section id="examples"><h2>Examples, derivations, and trees</h2><label htmlFor="guide-example">Choose an example </label><select id="guide-example" value={selected} onChange={event => setSelected(Number(event.target.value))}>{reference.samples.map((sample, index) => <option key={sample.id} value={index}>{sample.name}</option>)}</select>
        {sample && <><p>{sample.description}</p><pre><code>{sample.source}</code></pre><p>{sample.expected}</p><button onClick={() => onLoad(sample.source)}>Try in playground →</button><SyntaxOutput key={sample.id} output={{ast: sample.ast, parse_tree: sample.parse_tree}}/><details><summary>Leftmost derivation of the first over</summary><pre>{sample.derivation.join('\n⇒ ')}</pre></details></>}
      </section>
    </>}
  </article>;
}
