import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHabitUserState, upsertHabitUserState } from '../services/cloudState'
import { loadLocalSnapshot, rowToSnapshot, snapshotsEqualCloudRelevant } from '../utils/appStateSnapshot'
import { hasMeaningfulLocalData } from '../utils/persistedState'

/**
 * Load/merge cloud state on login; debounced upload; conflict modal when both sides have data.
 * @param {Object} opts
 * @param {import('../utils/appStateSnapshot').AppStateSnapshot} opts.snapshotForSync — memoized snapshot for debounced save
 */
export function useCloudPersistence({ user, authLoading, snapshotForSync, applySnapshot, bumpTimeOffset }) {
  const [cloudStatus, setCloudStatus] = useState('idle')
  const [conflict, setConflict] = useState(null)
  const [cloudSyncReady, setCloudSyncReady] = useState(false)
  const [lastError, setLastError] = useState(null)

  const saveTimer = useRef(null)
  const loadRunId = useRef(0)
  const snapshotRef = useRef(snapshotForSync)
  const applyRef = useRef(applySnapshot)
  const bumpRef = useRef(bumpTimeOffset)
  applyRef.current = applySnapshot
  bumpRef.current = bumpTimeOffset
  snapshotRef.current = snapshotForSync

  /** Flush only when a debounced save is waiting (avoids redundant upserts on every tab close). */
  const flushPendingCloudSave = useCallback(async () => {
    if (!user || !cloudSyncReady || cloudStatus === 'conflict') return
    if (!saveTimer.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = null
    const { error } = await upsertHabitUserState(user.id, snapshotRef.current)
    if (error) setLastError(error.message ?? String(error))
    else setLastError(null)
  }, [user, cloudSyncReady, cloudStatus])

  // Initial load + migration (deps: user id + auth only — avoids re-fetch when applySnapshot identity changes)
  useEffect(() => {
    if (authLoading) return undefined
    if (!user) {
      setCloudSyncReady(false)
      setCloudStatus('idle')
      setConflict(null)
      setLastError(null)
      return undefined
    }

    const runId = ++loadRunId.current
    let cancelled = false

    async function run() {
      setCloudStatus('loading')
      setCloudSyncReady(false)
      setConflict(null)
      setLastError(null)

      const local = loadLocalSnapshot()
      const { data, error } = await fetchHabitUserState(user.id)

      if (cancelled || runId !== loadRunId.current) return
      if (error) {
        setLastError(error.message ?? String(error))
        setCloudStatus('error')
        setCloudSyncReady(false)
        return
      }

      if (!data) {
        if (hasMeaningfulLocalData(local)) {
          const up = await upsertHabitUserState(user.id, local)
          if (up.error) {
            setLastError(up.error.message ?? String(up.error))
            setCloudStatus('error')
            setCloudSyncReady(false)
            return
          }
        }
        setCloudStatus('ready')
        setCloudSyncReady(true)
        return
      }

      const cloudSnap = rowToSnapshot(data)

      if (!hasMeaningfulLocalData(local)) {
        applyRef.current(cloudSnap)
        bumpRef.current?.()
        setCloudStatus('ready')
        setCloudSyncReady(true)
        return
      }

      if (snapshotsEqualCloudRelevant(local, cloudSnap)) {
        applyRef.current(cloudSnap)
        bumpRef.current?.()
        setCloudStatus('ready')
        setCloudSyncReady(true)
        return
      }

      setConflict({ cloud: cloudSnap, local })
      setCloudStatus('conflict')
      setCloudSyncReady(false)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading])

  // Tab background / close: flush debounced save (best-effort on unload)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flushPendingCloudSave()
    }
    const onLeave = () => {
      void flushPendingCloudSave()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [flushPendingCloudSave])

  const resolveUseCloud = useCallback(async () => {
    if (!user || !conflict) return
    const cloudSnap = conflict.cloud
    applyRef.current(cloudSnap)
    bumpRef.current?.()
    setConflict(null)
    setCloudStatus('ready')
    setCloudSyncReady(true)
    await upsertHabitUserState(user.id, cloudSnap)
  }, [user, conflict])

  const resolveUseDevice = useCallback(async () => {
    if (!user || !conflict) return
    const localSnap = conflict.local
    applyRef.current(localSnap)
    bumpRef.current?.()
    const up = await upsertHabitUserState(user.id, localSnap)
    if (up.error) {
      setLastError(up.error.message ?? String(up.error))
    }
    setConflict(null)
    setCloudStatus('ready')
    setCloudSyncReady(true)
  }, [user, conflict])

  const snapJson = JSON.stringify(snapshotForSync ?? {})

  useEffect(() => {
    if (!user || !cloudSyncReady || cloudStatus === 'conflict') return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const { error } = await upsertHabitUserState(user.id, snapshotRef.current)
        if (error) setLastError(error.message ?? String(error))
        else setLastError(null)
      } finally {
        saveTimer.current = null
      }
    }, 1600)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [user, cloudSyncReady, cloudStatus, snapJson])

  return {
    cloudStatus,
    cloudSyncReady,
    conflict,
    lastError,
    resolveUseCloud,
    resolveUseDevice,
  }
}
