import type { CompilerError } from './types';
export function ErrorDetails({ error, onLocate }: { error: CompilerError; onLocate: () => void }) {
  return <div className="error" role="alert"><strong>Line {error.line}:{error.column}</strong><p>{error.message}</p><button onClick={onLocate}>Show in editor</button></div>;
}
