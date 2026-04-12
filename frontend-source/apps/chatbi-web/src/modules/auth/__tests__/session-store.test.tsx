import { afterEach, describe, expect, it } from 'vitest'
import {
  __getSessionSnapshotForTest,
  __resetSessionStoreForTest,
  readSessionStoreData,
  sessionStoreActions
} from '@/modules/auth/session-store'

describe('session-store', () => {
  afterEach(() => {
    __resetSessionStoreForTest()
  })

  it('exposes idle state by default', () => {
    const state = readSessionStoreData()

    expect(state.status).toBe('idle')
    expect(state.session).toBeNull()
  })

  it('updates status to loading and then authenticated', () => {
    sessionStoreActions.setLoading()
    const loading = readSessionStoreData()

    expect(loading.status).toBe('loading')

    sessionStoreActions.setSession({
      mode: 'bearer',
      authenticated: true,
      authType: 'service_account'
    })
    const authenticated = readSessionStoreData()

    expect(authenticated.status).toBe('authenticated')
    expect(authenticated.session?.authenticated).toBe(true)
  })

  it('clears session to unauthenticated', () => {
    sessionStoreActions.setSession({
      mode: 'bearer',
      authenticated: true,
      authType: 'service_account'
    })
    const authenticated = readSessionStoreData()
    expect(authenticated.status).toBe('authenticated')

    sessionStoreActions.clearSession()
    const cleared = readSessionStoreData()

    expect(cleared.status).toBe('unauthenticated')
    expect(cleared.session).toBeNull()
  })

  it('keeps snapshot reference stable between reads when state does not change', () => {
    const first = __getSessionSnapshotForTest()
    const second = __getSessionSnapshotForTest()

    expect(second).toBe(first)

    sessionStoreActions.setLoading()
    const third = __getSessionSnapshotForTest()

    expect(third).not.toBe(first)
    expect(third.status).toBe('loading')
  })
})
