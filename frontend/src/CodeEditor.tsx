import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { highlightSource } from './sourceHighlight';
import './CodeEditor.css';

export function CodeEditor({ source, inputRef, onChange, onCompile }: {
  source: string; inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (source: string) => void; onCompile: () => void;
}) {
  const highlight = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => highlightSource(source), [source]);
  const sync = () => {
    const input = inputRef.current;
    if (!input) return;
    if (highlight.current) highlight.current.style.transform = `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
    if (gutter.current) gutter.current.style.transform = `translateY(${-input.scrollTop}px)`;
  };
  useEffect(() => { sync(); }, [source]);
  return <div className="code-editor">
    <div className="editor-gutter" aria-hidden="true"><div ref={gutter}>{source.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div></div>
    <div className="editor-highlight" aria-hidden="true"><pre ref={highlight}>{parts.map((part, index) => <span key={index} className={`source-${part.kind}`}>{part.text}</span>)}{'\n'}</pre></div>
    <label className="sr-only" htmlFor="source">Howzat source code</label>
    <textarea id="source" ref={inputRef} value={source} spellCheck={false} maxLength={50000} wrap="off" autoCapitalize="off" autoCorrect="off" aria-label="Howzat source code" placeholder="Enter Howzat code here…" onScroll={sync} onChange={event => onChange(event.target.value)} onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); onCompile(); }
    }}/>
  </div>;
}
