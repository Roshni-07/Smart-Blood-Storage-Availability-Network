import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../services/api'

// Calls `fetcher` now and then every `intervalMs`, so screens stay in sync
// with the simulator (which writes new readings every 5 seconds).
// Returns { data, error, loading, refresh }.
export function usePolling(fetcher, intervalMs = 5000, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refresh()
    if (!intervalMs) return
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, ...deps])

  return { data, error, loading, refresh }
}
