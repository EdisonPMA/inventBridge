import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useApi — fetch data from any async function with loading, error, and refetch.
 *
 * @param {Function} fetchFn   - async function returning data
 * @param {Array}    deps      - re-fetch when these values change
 * @param {any}      fallback  - value returned while loading or on error
 *
 * @returns {{ data, loading, error, refetch }}
 */
export function useApi(fetchFn, deps = [], fallback = null) {
  const [data, setData]       = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const cancelRef             = useRef(false);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (!cancelRef.current) setData(result ?? fallback);
    } catch (err) {
      if (!cancelRef.current) {
        setError(err?.message ?? "Something went wrong.");
      }
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => { cancelRef.current = true; };
  }, [run]);

  return { data, loading, error, refetch: run };
}
