import type { Analysis } from '@shared/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createRepository } from '@/lib/repo'
import { useAppStore } from '@/store/app'

export function useRepository() {
  const { user, client } = useAuth()
  return useMemo(() => (user ? createRepository(user, client) : null), [user, client])
}

export function useHistory() {
  const repository = useRepository()
  const revision = useAppStore((state) => state.historyRevision)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!repository) return
    try {
      setError(null)
      const items = await repository.list()
      setAnalyses(items)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your places.')
    } finally {
      setLoading(false)
    }
  }, [repository])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh, revision])

  return { analyses, loading, error, refresh, repository }
}

export function useAnalysis(id: string | undefined) {
  const repository = useRepository()
  const revision = useAppStore((state) => state.historyRevision)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!repository || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    repository
      .get(id)
      .then((result) => {
        if (active) setAnalysis(result)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not open this place.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repository, id, revision])

  return { analysis, loading, error, repository, setAnalysis }
}
