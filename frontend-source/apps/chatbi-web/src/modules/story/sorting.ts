export type SortableById = {
  id: string
}

export type SortableBySortOrder = SortableById & {
  sortOrder: number
}

export type SortableByRecency = SortableById & {
  updatedAt?: string
  createdAt?: string
}

function toTimestamp(value?: string) {
  if (!value) return Number.NaN
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function compareIdAsc(leftId: string, rightId: string) {
  return leftId.localeCompare(rightId)
}

export function compareIdDesc(leftId: string, rightId: string) {
  return rightId.localeCompare(leftId)
}

export function compareSortOrderThenId(left: SortableBySortOrder, right: SortableBySortOrder) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }
  return compareIdAsc(left.id, right.id)
}

export function compareRecencyDescThenId(left: SortableByRecency, right: SortableByRecency) {
  const leftTimestamp = toTimestamp(left.updatedAt ?? left.createdAt)
  const rightTimestamp = toTimestamp(right.updatedAt ?? right.createdAt)

  if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp) && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp
  }

  if (Number.isFinite(leftTimestamp) !== Number.isFinite(rightTimestamp)) {
    return Number.isFinite(rightTimestamp) ? 1 : -1
  }

  return compareIdDesc(left.id, right.id)
}
