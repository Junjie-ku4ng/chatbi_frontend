'use client'

import { useEffect, useState } from 'react'
import type { AnswerComponentPayload, AnswerSurfaceView } from './types'

export type AnswerSurfacePanelKey = 'sort' | 'top' | 'slicer' | 'explain'

function isAnswerSurfaceView(value: unknown): value is AnswerSurfaceView {
  return value === 'table' || value === 'chart' || value === 'kpi'
}

function resolveAvailableViews(type: AnswerSurfaceView, payload: AnswerComponentPayload) {
  const interactionViews = Array.isArray(payload.interaction?.availableViews)
    ? payload.interaction.availableViews.filter(isAnswerSurfaceView)
    : []
  const views = interactionViews.length > 0 ? interactionViews : [type]

  if (!views.includes(type)) {
    views.unshift(type)
  }

  return Array.from(new Set(views))
}

function resolveDefaultView(type: AnswerSurfaceView, payload: AnswerComponentPayload, availableViews: AnswerSurfaceView[]) {
  const configuredDefault = payload.interaction?.defaultView
  if (isAnswerSurfaceView(configuredDefault) && availableViews.includes(configuredDefault)) {
    return configuredDefault
  }
  if (availableViews.includes(type)) {
    return type
  }
  return availableViews[0] ?? type
}

export function useAnswerSurfaceState(input: {
  type: AnswerSurfaceView
  payload: AnswerComponentPayload
  draftPatch?: Record<string, unknown>
  onDraftPatchChange?: (nextPatch: Record<string, unknown>) => void
}) {
  const availableViews = resolveAvailableViews(input.type, input.payload)
  const defaultView = resolveDefaultView(input.type, input.payload, availableViews)
  const [viewMode, setViewMode] = useState<AnswerSurfaceView>(defaultView)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activePanel, setActivePanel] = useState<AnswerSurfacePanelKey | null>(null)
  const [uncontrolledDraftPatch, setUncontrolledDraftPatch] = useState<Record<string, unknown>>({})
  const isDraftControlled = typeof input.onDraftPatchChange === 'function' && input.draftPatch !== undefined
  const draftPatch = (isDraftControlled ? input.draftPatch : uncontrolledDraftPatch) ?? {}

  useEffect(() => {
    if (!availableViews.includes(viewMode)) {
      setViewMode(defaultView)
    }
  }, [availableViews, defaultView, viewMode])

  useEffect(() => {
    setActivePanel(null)
    setIsFullscreen(false)
    if (!isDraftControlled) {
      setUncontrolledDraftPatch({})
    }
  }, [input.payload.queryLogId, input.payload.traceKey, input.type, isDraftControlled])

  return {
    availableViews,
    viewMode,
    setViewMode(nextView: AnswerSurfaceView) {
      if (availableViews.includes(nextView)) {
        setViewMode(nextView)
      }
    },
    isFullscreen,
    openFullscreen() {
      setIsFullscreen(true)
    },
    closeFullscreen() {
      setIsFullscreen(false)
    },
    activePanel,
    togglePanel(panel: AnswerSurfacePanelKey) {
      setActivePanel(current => (current === panel ? null : panel))
    },
    draftPatch,
    updateDraftPatch(nextPatch: Record<string, unknown>) {
      if (isDraftControlled) {
        input.onDraftPatchChange?.({
          ...draftPatch,
          ...nextPatch
        })
        return
      }
      setUncontrolledDraftPatch(current => ({
        ...current,
        ...nextPatch
      }))
    },
    replaceDraftPatch(nextPatch: Record<string, unknown>) {
      if (isDraftControlled) {
        input.onDraftPatchChange?.(nextPatch)
        return
      }
      setUncontrolledDraftPatch(nextPatch)
    }
  }
}
