import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { createId, nowTime, todayKey } from "@/lib/utils"
import {
  normaliseMoment,
  readStoredMoments,
  seedMoments,
  withFoods,
  writeStoredMoments,
} from "@/context/diaryStore"

/**
 * DiaryContext — the single source of truth for the whole archive.
 *
 * This module exports exactly one component (`DiaryProvider`) plus the `useDiary` hook,
 * which `eslint.config.js` whitelists by name for this directory. Everything non-React
 * (storage keys, normalisation, seed) lives in `./diaryStore.js` so the fast-refresh rule
 * does not have to be disabled here.
 *
 * Persistence: one effect mirrors state → localStorage on every change. The provider is the
 * only place that touches storage, so swapping in a real backend later means editing
 * `diaryStore.js` alone.
 */
const DiaryContext = createContext(null)

export function DiaryProvider({ children }) {
  const [moments, setMoments] = useState(readStoredMoments)

  useEffect(() => {
    writeStoredMoments(moments)
  }, [moments])

  const addMoment = useCallback((draft) => {
    const next = normaliseMoment(
      {
        ...draft,
        id: createId("mom"),
        date: draft?.date || todayKey(),
        time: draft?.time || nowTime(),
      },
      0
    )
    setMoments((prev) => [next, ...prev])
    return next
  }, [])

  const updateMoment = useCallback((id, patch) => {
    setMoments((prev) =>
      prev.map((m) => (m.id === id ? normaliseMoment({ ...m, ...patch }, 0) : m))
    )
  }, [])

  /**
   * Archives a captured table: one moment for the visit, with every dish folded into
   * `foods[]` and derived onto the moment's own rating / price / tags / category. Returns the
   * stored moment so the caller can navigate to it.
   */
  const addTable = useCallback((draft) => {
    const base = normaliseMoment(
      {
        ...draft,
        id: createId("tbl"),
        date: draft?.date || todayKey(),
        time: draft?.time || nowTime(),
      },
      0
    )
    const next = withFoods(base, draft?.foods ?? [])
    setMoments((prev) => [next, ...prev])
    return next
  }, [])

  const removeMoment = useCallback((id) => {
    setMoments((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const toggleSaved = useCallback((id) => {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, saved: !m.saved } : m)))
  }, [])

  const resetToSeed = useCallback(() => {
    setMoments(seedMoments())
  }, [])

  const value = useMemo(
    () => ({
      moments,
      addMoment,
      addTable,
      updateMoment,
      removeMoment,
      toggleSaved,
      resetToSeed,
    }),
    [moments, addMoment, addTable, updateMoment, removeMoment, toggleSaved, resetToSeed]
  )

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
}

export function useDiary() {
  const ctx = useContext(DiaryContext)
  if (!ctx) throw new Error("useDiary() harus dipakai di dalam <DiaryProvider>")
  return ctx
}
