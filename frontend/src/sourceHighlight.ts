export interface CodePart { text: string; kind: string }
const keywords = new Set(['team', 'innings', 'complete', 'over', 'partial', 'wide', 'noball', 'wicket', 'bye', 'legbye', 'run']);
// Presentation only: the backend lexer remains authoritative for compilation.
export function highlightSource(source: string): CodePart[] {
  const pattern = /\/\/[^\r\n]*|"[^"\r\n]*"|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[{}(),;+*]|[^A-Za-z_0-9{}(),;+*"/]+|./g;
  return [...source.matchAll(pattern)].map(([text]) => ({text, kind:
    text.startsWith('//') ? 'comment' : text.startsWith('"') ? 'string' : keywords.has(text) ? 'keyword' : /^[0-9]+$/.test(text) ? 'number' : /^[{}(),;+*]$/.test(text) ? 'punctuation' : 'plain'}));
}
