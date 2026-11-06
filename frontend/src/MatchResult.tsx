import type { MatchResult as Result } from './types';
export function MatchResult({ result }: { result: Result }) {
  return <div className="match-result" role="status"><strong>{result.message}</strong><p>{result.detail}</p></div>;
}
