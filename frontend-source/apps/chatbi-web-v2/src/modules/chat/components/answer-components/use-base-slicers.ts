'use client'

import type { ISlicer } from '@metad/ocap-core'

export function getDimensionName(input: Pick<ISlicer, 'dimension'> | Record<string, unknown>) {
  if (typeof input.dimension === 'string') {
    return input.dimension
  }

  const dimensionRecord =
    input.dimension && typeof input.dimension === 'object' && !Array.isArray(input.dimension)
      ? (input.dimension as Record<string, unknown>)
      : undefined

  return typeof dimensionRecord?.dimension === 'string' ? dimensionRecord.dimension : undefined
}

export function upsertSlicer(
  slicers: ISlicer[],
  slicer: ISlicer
) {
  const targetDimension = getDimensionName(slicer)
  if (!targetDimension) {
    return [...slicers, slicer]
  }

  const index = slicers.findIndex(item => getDimensionName(item) === targetDimension)
  if (index < 0) {
    return [...slicers, slicer]
  }

  const next = [...slicers]
  next[index] = slicer
  return next
}

export function removeSlicer(
  slicers: ISlicer[],
  index: number
) {
  const next = [...slicers]
  next.splice(index, 1)
  return next
}
