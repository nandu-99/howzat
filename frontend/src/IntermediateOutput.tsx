import type { IntermediateOutput as IntermediateData } from './types';
import './CodeOutput.css';

export function IntermediateOutput({ output }: { output: IntermediateData }) {
  return <div className="code-output">
    <p>{output.instructions.length} {output.instructions.length === 1 ? 'instruction' : 'instructions'} · Expressions use temporary values; deliveries stay in source order.</p>
    <h3>Intermediate instructions<span>Scoring steps</span></h3>
    <pre tabIndex={0} aria-label="Intermediate instructions"><code>{output.code}</code></pre>
  </div>;
}
