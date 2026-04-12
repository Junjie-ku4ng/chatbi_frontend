'use client'

import { Drill, isAdvancedFilter, type ISlicer } from '@metad/ocap-core'
import { useEffect, useMemo, useState } from 'react'
import type { AnswerComponentPayload } from './types'

export interface DrillLevel {
  parent: Record<string, unknown>
  dimension: Record<string, unknown>
  slicer: ISlicer
  value?: unknown
  text?: string
  active?: boolean
}

export interface AnalyticalCardOptions {
  showSlicers?: boolean
  hideHeader?: boolean
  hideRefresh?: boolean
  hideLoading?: boolean
  hideScreenshot?: boolean
  hideDataDownload?: boolean
  disableContextMenu?: boolean
  realtimeLinked?: boolean
}

export interface AnalyticalCardState {
  dataSettings?: AnswerComponentPayload['dataSettings']
  slicers: ISlicer[]
  drilledDimensions: DrillLevel[]
  selectedDrilledDimensions: DrillLevel[]
  selectedSlicers: ISlicer[]
}

function cloneDrillLevels(levels: DrillLevel[] | undefined) {
  return (levels ?? []).map(level => ({
    ...level,
    slicer: {
      ...(level.slicer ?? {}),
      members: Array.isArray(level.slicer?.members) ? [...level.slicer.members] : []
    }
  }))
}

function resolveBreadcrumbLabel(level: DrillLevel) {
  const member = Array.isArray(level.slicer?.members) ? level.slicer.members[0] : undefined
  return level.text ?? member?.label ?? member?.caption ?? String(member?.value ?? '')
}

function asSlicers(value: unknown) {
  return Array.isArray(value) ? (value as ISlicer[]) : []
}

export function useAnalyticalCardState(input: {
  payload: AnswerComponentPayload
  initialState?: Partial<AnalyticalCardState>
}) {
  const payloadSlicers = asSlicers(input.payload.interaction?.slicers?.applied)

  const [state, setState] = useState<AnalyticalCardState>(() => ({
    dataSettings: input.payload.dataSettings,
    slicers: asSlicers(input.initialState?.slicers ?? payloadSlicers),
    drilledDimensions: cloneDrillLevels(input.initialState?.drilledDimensions),
    selectedDrilledDimensions:
      cloneDrillLevels(input.initialState?.selectedDrilledDimensions ?? input.initialState?.drilledDimensions),
    selectedSlicers: asSlicers(input.initialState?.selectedSlicers)
  }))

  useEffect(() => {
    setState(previous => ({
      ...previous,
      dataSettings: input.payload.dataSettings
    }))
  }, [input.payload.dataSettings])

  const breadcrumbs = useMemo(() => {
    return state.drilledDimensions.map(level => ({
      value: level,
      label: resolveBreadcrumbLabel(level),
      active: true
    }))
  }, [state.drilledDimensions])

  function reselectDrill(steps: Array<{ value: unknown }>) {
    setState(previous => ({
      ...previous,
      selectedDrilledDimensions: steps
        .map(step => step.value)
        .filter((value): value is DrillLevel => Boolean(value && typeof value === 'object'))
    }))
  }

  function clearDrill() {
    setState(previous => ({
      ...previous,
      drilledDimensions: [],
      selectedDrilledDimensions: []
    }))
  }

  function setSelectedSlicers(nextSlicers: ISlicer[]) {
    setState(previous => ({
      ...previous,
      selectedSlicers: nextSlicers
    }))
  }

  function drill(drillLevel: DrillLevel) {
    setState(previous => {
      const drilledDimensions = [...(previous.selectedDrilledDimensions ?? []), drillLevel]
      return {
        ...previous,
        drilledDimensions,
        selectedDrilledDimensions: drilledDimensions
      }
    })
  }

  function drillDown(slicer: ISlicer) {
    if (isAdvancedFilter(slicer)) {
      slicer.children.forEach(child => {
        drill({
          parent: child.dimension ?? {},
          slicer: {
            ...child,
            drill: Drill.Children
          },
          dimension: child.dimension ?? {}
        })
      })
      return
    }

    drill({
      parent: slicer.dimension ?? {},
      slicer: {
        ...slicer,
        drill: Drill.Children
      },
      dimension: slicer.dimension ?? {}
    })
  }

  function updateSlicers(nextSlicers: ISlicer[]) {
    setState(previous => ({
      ...previous,
      slicers: nextSlicers
    }))
  }

  return {
    state,
    breadcrumbs,
    drill,
    drillDown,
    clearDrill,
    reselectDrill,
    setSelectedSlicers,
    updateSlicers
  }
}
