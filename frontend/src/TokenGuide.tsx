import type { LanguageReference } from './types';

export function TokenGuide({ keywords, tokens }: Pick<LanguageReference, 'keywords' | 'tokens'>) {
  return <>
    <div className="keyword-list">{keywords.map(keyword => <code key={keyword}>{keyword}</code>)}</div>
    <div className="guide-table"><table><caption className="sr-only">Predefined language token patterns</caption><thead><tr><th scope="col">Token</th><th scope="col">Pattern</th><th scope="col">Action</th></tr></thead><tbody>{tokens.map(token => <tr key={token.type}><td><code>{token.type}</code></td><td><code>{token.pattern}</code></td><td>{token.ignored ? 'Skip' : 'Emit'}</td></tr>)}</tbody></table></div>
  </>;
}
