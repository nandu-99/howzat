import type { Token } from './types';
import './TokenOutput.css';

export function TokenOutput({ tokens, onLocate }: { tokens: Token[]; onLocate: (token: Token) => void }) {
  const count = tokens.filter(token => token.type !== 'EOF').length;
  return <div className="token-output">
    <p>{count} {count === 1 ? 'token' : 'tokens'} · Comments and whitespace are skipped. Select a value to find it in the editor.</p>
    <div className="token-scroll"><table>
      <caption className="sr-only">Tokens produced by lexical analysis</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Type</th><th scope="col">Value</th><th scope="col">Line</th><th scope="col">Column</th></tr></thead>
      <tbody>{tokens.map((token, index) => <tr key={index} className={token.type === 'EOF' ? 'token-eof' : ''}>
        <td>{index + 1}</td><td><span className={`token-kind token-${token.type.toLowerCase()}`}>{token.type}</span></td>
        <td>{token.type === 'EOF' ? <code>End of input</code> : <button className="token-value" onClick={() => onLocate(token)} aria-label={`Find ${token.lexeme} at line ${token.line}, column ${token.column}`}><code>{token.lexeme}</code></button>}</td>
        <td>{token.line}</td><td>{token.column}</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
