import type { IntermediateOutput as IntermediateData } from './types';
import './CodeOutput.css';

export function IntermediateOutput({ output }: { output: IntermediateData }) {
  return <div className="code-output">
    <p>{output.instructions.length} {output.instructions.length === 1 ? 'instruction' : 'instructions'} · Expressions use temporary values; deliveries stay in source order.</p>
    <pre aria-label="Intermediate instructions"><code>{output.code}</code></pre>
  </div>;
}
