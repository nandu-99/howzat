import type { CompilerError } from './types';
export function ErrorDetails({ error, onLocate, phaseName, fix, onCorrect }: {
  error: CompilerError; onLocate?: () => void; phaseName?: string; fix?: string; onCorrect?: () => void;
}) {
  return <div className="error" role="alert">
    {phaseName && <strong>{phaseName}</strong>}
    {onLocate && <p>Line {error.line}:{error.column}</p>}
    <p>{error.message}</p>
    {fix && <p><strong>Try this:</strong> {fix}</p>}
    <div className="diagnostic-actions">{onLocate && <button onClick={onLocate}>Show in editor</button>}{onCorrect && <button onClick={onCorrect}>Load corrected code</button>}</div>
  </div>;
}
