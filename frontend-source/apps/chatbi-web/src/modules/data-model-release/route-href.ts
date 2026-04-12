export type DataModelReleaseRouteState = {
  dataSourceId?: string | null
  draftId?: string | null
  modelId?: string | null
  deploymentId?: string | null
}

export function buildDataModelReleaseHref(
  patch: DataModelReleaseRouteState,
  options?: {
    baseSearch?: string
  }
) {
  const query = new URLSearchParams(options?.baseSearch ?? '')
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      query.set(key, value)
      continue
    }
    query.delete(key)
  }
  const next = query.toString()
  return next ? `/data-model-release?${next}` : '/data-model-release'
}
