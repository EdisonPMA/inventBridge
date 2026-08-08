import { useState, useEffect, useCallback } from "react";

/**
 * Shared hook for admin sections.
 * @param {Function} fetcher  — async fn(params) → data
 * @param {object}   params   — filter params (search, page, etc.)
 */
export function useAdminSection(fetcher, params) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [confirm, setConfirm] = useState(null); // { msg, req, cb }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetcher(params));
    } catch (e) {
      setError(e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, confirm, setConfirm };
}
