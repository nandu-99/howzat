import type { PhaseEvent } from './types';

// Fetch chunks may split a JSON line, or contain multiple events.
export async function readEvents(response: Response, receive: (event: PhaseEvent) => void) {
  if (!response.ok) throw new Error(`Compilation request failed (${response.status}).`);
  if (!response.body) throw new Error('The backend returned no event stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let terminal = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as PhaseEvent;
    if (!Number.isInteger(event.phase) || event.phase < 0 || event.phase > 5 ||
        !['running', 'completed', 'failed', 'skipped', 'unavailable'].includes(event.status)) {
      throw new Error('The backend returned an invalid phase event.');
    }
    if (event.status === 'failed' || event.status === 'unavailable' ||
        (event.phase === 5 && event.status === 'completed')) terminal = true;
    receive(event);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      lines.forEach(consume);
    }
    pending += decoder.decode();
    consume(pending);
    if (!terminal) throw new Error('Compilation stopped before a final result. Please retry.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function sourceRange(source: string, line: number, column: number, endColumn?: number) {
  const lines = source.split('\n');
  const row = Math.max(0, Math.min(line - 1, lines.length - 1));
  const start = lines.slice(0, row).reduce((sum, text) => sum + text.length + 1, 0)
    + Math.max(0, Math.min(column - 1, lines[row].length));
  return [start, Math.min(source.length, start + Math.max(1, (endColumn ?? column + 1) - column))] as const;
}
