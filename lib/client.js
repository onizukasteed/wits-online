'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export async function post(url, data) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
  return j;
}

// ดึงสถานะห้องเป็นระยะ (ประหยัดคำสั่ง Redis: หยุดเมื่อแท็บถูกซ่อน)
export function usePoll(url, interval = 2000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const hash = useRef('');
  const timer = useRef(null);
  const stopped = useRef(false);
  const urlRef = useRef(url);
  urlRef.current = url;

  const tick = useCallback(async () => {
    clearTimeout(timer.current);
    if (stopped.current) return;
    if (!document.hidden && urlRef.current) {
      try {
        const u = urlRef.current + (urlRef.current.includes('?') ? '&' : '?') + 'h=' + hash.current;
        const r = await fetch(u, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) setError(j.error || 'error');
        else {
          setError(null);
          if (!j.same) {
            hash.current = j.h;
            setData(j);
          }
        }
      } catch {
        setError('เชื่อมต่อไม่ได้');
      }
    }
    if (!stopped.current) timer.current = setTimeout(tick, interval);
  }, [interval]);

  useEffect(() => {
    stopped.current = false;
    hash.current = '';
    tick();
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped.current = true;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [url, tick]);

  const refresh = useCallback(() => { hash.current = ''; return tick(); }, [tick]);
  return { data, error, refresh };
}
