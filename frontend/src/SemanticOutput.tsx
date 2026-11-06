import type { SemanticOutput as SemanticData, SourcePosition } from './types';
import './SemanticOutput.css';

export function SemanticOutput({ output, onLocate }: {
  output: SemanticData; onLocate: (position: SourcePosition) => void;
}) {
  return <div className="semantic-output">
    <p>Team references are resolved and delivery values are valid. Expressions stay in the AST for later phases.</p>
    <h3>Symbol table</h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Declared team symbols</caption>
      <thead><tr><th scope="col">Identifier</th><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Declared at</th></tr></thead>
      <tbody>{Object.entries(output.symbol_table).map(([identifier, symbol]) => <tr key={identifier}>
        <td><code>{identifier}</code></td><td>{symbol.name}</td><td>{symbol.kind}</td>
        <td><button onClick={() => onLocate(symbol)} aria-label={`Find declaration of ${identifier}`}>{symbol.line}:{symbol.column}</button></td>
      </tr>)}</tbody>
    </table></div>
    <h3>Delivery checks <span>({output.checks.length})</span></h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Validated delivery values</caption>
      <thead><tr><th scope="col">Team</th><th scope="col">Over</th><th scope="col">Delivery</th><th scope="col">Kind</th><th scope="col">Value</th><th scope="col">Source</th><th scope="col">Status</th></tr></thead>
      <tbody>{output.checks.map((check, index) => <tr key={index}>
        <td><code>{check.team}</code></td><td>{check.over}</td><td>{check.delivery}</td><td><code>{check.kind}</code></td><td>{check.value}</td>
        <td><button onClick={() => onLocate(check)} aria-label={`Find ${check.team} over ${check.over} delivery ${check.delivery}`}>{check.line}:{check.column}</button></td><td className="completed">✓ Valid</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
