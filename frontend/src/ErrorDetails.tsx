import type { CompilerError } from './types';
import './ErrorDetails.css';

export function ErrorDetails({ error, onLocate, phaseName, fix, onCorrect }: {
  error: CompilerError; onLocate?: () => void; phaseName?: string; fix?: string; onCorrect?: () => void;
}) {
  return <div className="error diagnostic" role="alert">
    <div className="diagnostic-heading"><strong><span aria-hidden="true">×</span> {phaseName ? `${phaseName} failed` : 'Compilation failed'}</strong>
      {onLocate && <span className="diagnostic-location">Line {error.line}:{error.column}</span>}
    </div>
    <p className="diagnostic-message">{error.message}</p>
    {fix && <div className="diagnostic-fix"><strong>Try this:</strong><p>{fix}</p></div>}
    {(onLocate || onCorrect) && <div className="diagnostic-actions">{onLocate && <button onClick={onLocate}>Show in editor</button>}{onCorrect && <button onClick={onCorrect}>Load corrected code</button>}</div>}
  </div>;
}
