import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const Row = z.object({ id: z.string(), label: z.string(), at: z.number() });

const DEBOUNCE_MS = 180;

export function useLiveQuery(term, { pageSize = 25 } = {}) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    if (term.trim().length < 2) {
      setRows([]);
      return;
    }

    const mine = ++seq.current;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&n=${pageSize}`, {
          signal: ctrl.signal,
        });
        const raw = await res.json();
        if (mine !== seq.current) return;
        setRows(z.array(Row).parse(raw).sort((a, b) => b.at - a.at));
      } catch (e) {
        if (e.name !== 'AbortError') setError(e);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, pageSize]);

  return { rows, error };
}
