'use client'

import { useSyncExternalStore } from 'react'
import type { AuthSession } from './types'

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type SessionStoreData = {
  session: AuthSession | null
  status: SessionStatus
}

export type SessionState = SessionStoreData & {
  setLoading: () => void
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

type SessionSelector<Selected> = (state: SessionState) => Selected

const initialState: SessionStoreData = {
  session: null,
  status: 'idle'
}

let storeData: SessionStoreData = { ...initialState }
let storeSnapshot: SessionState
const listeners = new Set<() => void>()

function emitState() {
  listeners.forEach(listener => listener())
}

function buildSnapshot(data: SessionStoreData): SessionState {
  return {
    ...data,
    setLoading: sessionStoreActions.setLoading,
    setSession: sessionStoreActions.setSession,
    clearSession: sessionStoreActions.clearSession
  }
}

function commitStoreData(nextData: SessionStoreData) {
  storeData = nextData
  storeSnapshot = buildSnapshot(nextData)
  emitState()
}

export const sessionStoreActions = {
  setLoading() {
    commitStoreData({
      ...storeData,
      status: 'loading'
    })
  },
  setSession(session: AuthSession) {
    commitStoreData({
      session,
      status: session.authenticated ? 'authenticated' : 'unauthenticated'
    })
  },
  clearSession() {
    commitStoreData({
      session: null,
      status: 'unauthenticated'
    })
  }
}

function getSnapshot(): SessionState {
  return storeSnapshot
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readSessionStoreData() {
  return storeData
}

export function __getSessionSnapshotForTest() {
  return storeSnapshot
}

export function __resetSessionStoreForTest() {
  commitStoreData({ ...initialState })
}

export function useSessionStore<Selected>(selector: SessionSelector<Selected>): Selected {
  return selector(useSyncExternalStore(subscribe, getSnapshot, getSnapshot))
}

storeSnapshot = buildSnapshot(storeData)
