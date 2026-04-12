'use client'

import { useEffect } from 'react'
import {
  clearDefaultAnalyticalCardServiceFactory,
  registerAnalyticalCardRuntimeFactory,
  type AnalyticalCardRuntimeFactoryOptions
} from './create-analytical-card-service'

export type AnalyticalCardRuntimeBootstrapInput = {
  activeXpertId?: string
  modelId?: string
}

export type AnalyticalCardRuntimeBootstrapProps = AnalyticalCardRuntimeBootstrapInput & {
  resolveRuntimeOptions?: (
    input: AnalyticalCardRuntimeBootstrapInput
  ) => Promise<AnalyticalCardRuntimeFactoryOptions | undefined>
}

export function AnalyticalCardRuntimeBootstrap({
  activeXpertId,
  modelId,
  resolveRuntimeOptions
}: AnalyticalCardRuntimeBootstrapProps) {
  useEffect(() => {
    let cancelled = false

    clearDefaultAnalyticalCardServiceFactory()

    const input = {
      activeXpertId,
      modelId
    } satisfies AnalyticalCardRuntimeBootstrapInput

    async function bootstrap() {
      if (!resolveRuntimeOptions) {
        return
      }
      const runtimeOptions = await resolveRuntimeOptions(input)
      if (cancelled || !runtimeOptions) {
        return
      }

      registerAnalyticalCardRuntimeFactory(runtimeOptions)
    }

    void bootstrap()

    return () => {
      cancelled = true
      clearDefaultAnalyticalCardServiceFactory()
    }
  }, [activeXpertId, modelId, resolveRuntimeOptions])

  return null
}
