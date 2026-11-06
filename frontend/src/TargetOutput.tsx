import type { TargetOutput as TargetData } from './types';
import './CodeOutput.css';

export function TargetOutput({ output }: { output: TargetData }) {
  return <div className="code-output">
    <p>Generated Python executes the scoring instructions and returns the scorecard shown on the left.</p>
    <pre aria-label="Generated Python"><code>{output.code}</code></pre>
  </div>;
}
