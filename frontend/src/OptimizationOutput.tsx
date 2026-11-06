import type { OptimizationOutput as OptimizationData } from './types';
import { optimizationRows } from './optimizationDiff';
import './OptimizationOutput.css';

export function OptimizationOutput({ output }: { output: OptimizationData }) {
  const saved = output.before_count - output.after_count;
  if (output.before === output.after) return <div className="optimization-output">
    <p>Nothing to simplify. This code already uses numeric delivery values.</p>
    <pre aria-label="Unchanged instructions"><code>{output.after}</code></pre>
  </div>;
  const rows = optimizationRows(output.before, output.after);
  return <div className="optimization-output">
    <p>{output.before_count} → {output.after_count} instructions · {saved} temporary {saved === 1 ? 'assignment removed' : 'assignments removed'}. Delivery order and scores stay the same.</p>
    <ul>{output.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>
    <div className="optimization-comparison">
      {(['before', 'after'] as const).map(side => <section key={side}>
        <h3>{side === 'before' ? 'Before optimization' : 'After optimization'}</h3>
        <pre aria-label={side === 'before' ? 'Original instructions' : 'Optimized instructions'}><code>{rows.map((row, index) => <span key={index} className={row.changed && row[side] !== undefined ? side === 'before' ? 'optimization-removed' : 'optimization-added' : ''}>{row.changed && row[side] !== undefined ? side === 'before' ? '− ' : '+ ' : '  '}{row[side] ?? ' '}</span>)}</code></pre>
      </section>)}
    </div>
  </div>;
}
