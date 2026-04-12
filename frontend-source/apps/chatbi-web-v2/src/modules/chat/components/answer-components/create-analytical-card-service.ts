'use client'

export type ObservableLike<T = unknown> = {
  subscribe?: (next?: (value: T) => void) => { unsubscribe?: () => void } | void
}

export interface AnalyticalCardServiceLike {
  loading$?: ObservableLike<boolean>
  dataSettings?: Record<string, unknown>
  onAfterServiceInit?(): ObservableLike<void>
  selectResult?(): ObservableLike<Record<string, unknown>>
  getEntityType?(): Promise<Record<string, unknown>>
  refresh(force?: boolean): void
  onDestroy?(): void
}

export type AnalyticalCardServiceFactory = (
  payload: Record<string, unknown>
) => AnalyticalCardServiceLike | undefined

export type AnalyticalCardRuntimeFactoryOptions = {
  agents?: Record<string, unknown>[]
  cacheService?: unknown
  createSmartFilterBar?: () => unknown
  factories?: Array<{ type: string; factory: unknown }>
  resolveDataSourceOptions?: (payload: Record<string, unknown>) => Record<string, unknown> | null | undefined
}

let defaultAnalyticalCardServiceFactory: AnalyticalCardServiceFactory | undefined
let analyticalCardServiceFactoryVersion = 0
const analyticalCardServiceFactoryListeners = new Set<() => void>()

function emitAnalyticalCardServiceFactoryChange() {
  analyticalCardServiceFactoryVersion += 1
  analyticalCardServiceFactoryListeners.forEach(listener => listener())
}

export function registerDefaultAnalyticalCardServiceFactory(factory: AnalyticalCardServiceFactory) {
  defaultAnalyticalCardServiceFactory = factory
  emitAnalyticalCardServiceFactoryChange()
}

export function clearDefaultAnalyticalCardServiceFactory() {
  defaultAnalyticalCardServiceFactory = undefined
  emitAnalyticalCardServiceFactoryChange()
}

export function resolveDefaultAnalyticalCardService(payload: Record<string, unknown>) {
  return defaultAnalyticalCardServiceFactory?.(payload)
}

export function subscribeAnalyticalCardServiceFactory(listener: () => void) {
  analyticalCardServiceFactoryListeners.add(listener)
  return () => {
    analyticalCardServiceFactoryListeners.delete(listener)
  }
}

export function getAnalyticalCardServiceFactoryVersion() {
  return analyticalCardServiceFactoryVersion
}

export function createAnalyticalCardService() {
  return undefined
}

export function createRuntimeAnalyticalCardServiceFactory(
  options: AnalyticalCardRuntimeFactoryOptions
): AnalyticalCardServiceFactory {
  void options
  return () => undefined
}

export function registerAnalyticalCardRuntimeFactory(options: AnalyticalCardRuntimeFactoryOptions) {
  registerDefaultAnalyticalCardServiceFactory(createRuntimeAnalyticalCardServiceFactory(options))
}
