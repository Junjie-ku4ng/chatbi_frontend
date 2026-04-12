'use client'

import { SmartEChartEngine } from '@metad/ocap-echarts'
import { useEffect, useState } from 'react'

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

export function useSmartEChartEngine() {
  const [engine] = useState(() => new SmartEChartEngine())
  const [echartsOption, setEchartsOption] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const subscription = engine.selectChartOptions().subscribe(result => {
      const resolved = asRecord(result)
      const nextError = resolved?.error
      if (nextError) {
        setError(String(nextError))
        return
      }

      setError(null)
      setEchartsOption(asRecord(resolved?.options) ?? {})
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [engine])

  useEffect(() => {
    return () => {
      engine.onDestroy()
    }
  }, [engine])

  return {
    echartsOption,
    engine,
    error,
    setError
  }
}
