import type { SyntaxOutput as SyntaxData } from './types';
import './SyntaxOutput.css';

export function SyntaxOutput({ output }: { output: SyntaxData }) {
  return <div className="syntax-output">
    <p>The parse tree keeps the grammar structure. The AST keeps the meaning needed by later phases.</p>
    <details open><summary>AST · Abstract syntax tree</summary><pre>{JSON.stringify(output.ast, null, 2)}</pre></details>
    <details><summary>Parse tree · Grammar structure</summary><pre>{JSON.stringify(output.parse_tree, null, 2)}</pre></details>
  </div>;
}
