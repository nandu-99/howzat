import { useCallback, useEffect, useRef, useState } from 'react';
import type { Health } from './types';
export function useBackendConnection() {
  const [health, setHealth] = useState<Health | null>(null);
  const [message, setMessage] = useState('Connecting…');
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error();
      const value = await response.json() as Health;
      if (value.status !== 'ok' || value.api_version !== 1 || !Array.isArray(value.phases)) {
        throw new Error('Different backend detected. Start the server from this howzat folder.');
      }
      if (active.current === controller) { setHealth(value); setMessage('Backend connected'); }
    } catch (error) {
      if (active.current !== controller) return;
      setHealth(null);
      setMessage(error instanceof Error && error.message.startsWith('Different') ? error.message : 'Backend offline. Run python3 dev.py, then retry.');
    } finally { window.clearTimeout(timer); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); active.current?.abort(); active.current = null; };
  }, [refresh]);
  return { health, message, refresh };
}
