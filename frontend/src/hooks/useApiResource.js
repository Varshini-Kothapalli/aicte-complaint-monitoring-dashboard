import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data from an api.js function and track loading / error state.
 * Re-runs when `deps` change; stale responses are discarded via AbortController.
 *
 *   const { data, meta, loading, error, reload } = useApiResource((opts) => fetchCases(params, opts), [key]);
 */
export default function useApiResource(loader, deps) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null, code: null });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null, code: null }));
    loaderRef.current({ signal: controller.signal }).then((res) => {
      if (res.aborted) return;
      if (res.ok) setState({ data: res.data, meta: res.meta, loading: false, error: null, code: null });
      else setState({ data: null, meta: null, loading: false, error: res.error, code: res.code, details: res.details });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
