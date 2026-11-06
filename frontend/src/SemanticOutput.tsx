import type { SemanticOutput as SemanticData, SourcePosition } from './types';
import './SemanticOutput.css';

export function SemanticOutput({ output, onLocate }: {
  output: SemanticData; onLocate: (position: SourcePosition) => void;
}) {
  return <div className="semantic-output">
    <p>Team references, delivery values, overs, and innings rules are valid.</p>
    <h3>Symbol table</h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Declared team symbols</caption>
      <thead><tr><th scope="col">Identifier</th><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Declared at</th></tr></thead>
      <tbody>{Object.entries(output.symbol_table).map(([identifier, symbol]) => <tr key={identifier}>
        <td><code>{identifier}</code></td><td>{symbol.name}</td><td>{symbol.kind}</td>
        <td><button onClick={() => onLocate(symbol)} aria-label={`Find declaration of ${identifier}`}>{symbol.line}:{symbol.column}</button></td>
      </tr>)}</tbody>
    </table></div>
    <h3>Over checks</h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Validated over rules</caption>
      <thead><tr><th scope="col">Team</th><th scope="col">Over</th><th scope="col">Legal balls</th><th scope="col">Deliveries</th><th scope="col">Type</th><th scope="col">Source</th></tr></thead>
      <tbody>{output.over_checks.map((check, index) => <tr key={index}>
        <td>{check.team}</td><td>{check.over}</td><td>{check.legal_balls}</td><td>{check.deliveries}</td><td>{check.partial ? 'Partial' : 'Full'}</td>
        <td><button onClick={() => onLocate(check)} aria-label={`Find ${check.team} over ${check.over}`}>{check.line}:{check.column}</button></td>
      </tr>)}</tbody>
    </table></div>
    <h3>Innings checks</h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Validated innings progression</caption>
      <thead><tr><th scope="col">Team</th><th scope="col">Score</th><th scope="col">Target</th><th scope="col">State</th><th scope="col">Source</th></tr></thead>
      <tbody>{output.innings_checks.map((check, index) => <tr key={index}>
        <td>{check.team}</td><td>{check.runs}/{check.wickets}</td><td>{check.target ?? '—'}</td>
        <td>{check.completion_reason === 'target_reached' ? 'Target reached' : check.completion_reason === 'all_out' ? 'All out' : check.complete ? 'Finished' : 'In progress'}</td>
        <td><button onClick={() => onLocate(check)} aria-label={`Find innings ${check.team}`}>{check.line}:{check.column}</button></td>
      </tr>)}</tbody>
    </table></div>
    <h3>Delivery checks <span>({output.checks.length})</span></h3>
    <div className="semantic-scroll"><table>
      <caption className="sr-only">Validated delivery values</caption>
      <thead><tr><th scope="col">Team</th><th scope="col">Over</th><th scope="col">Delivery</th><th scope="col">Kind</th><th scope="col">Value</th><th scope="col">Legal ball</th><th scope="col">Source</th><th scope="col">Status</th></tr></thead>
      <tbody>{output.checks.map((check, index) => <tr key={index}>
        <td><code>{check.team}</code></td><td>{check.over}</td><td>{check.delivery}</td><td><code>{check.kind}</code></td><td>{check.value}</td><td>{check.legal ? 'Yes' : 'No'}</td>
        <td><button onClick={() => onLocate(check)} aria-label={`Find ${check.team} over ${check.over} delivery ${check.delivery}`}>{check.line}:{check.column}</button></td><td className="completed">✓ Valid</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
