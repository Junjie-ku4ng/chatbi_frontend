'use client'

import type { AnswerComponentPayload } from './types'

export function KpiAnswerComponent({ payload }: { payload: AnswerComponentPayload }) {
  const label = typeof payload.label === 'string' ? payload.label : 'KPI'
  const value = payload.formatted ?? payload.value ?? '--'
  const delta = payload.delta ?? payload.change

  return (
    <div className="chat-assistant-answer-kpi">
      <span className="chat-assistant-answer-kpi-label">{label}</span>
      <strong className="chat-assistant-answer-kpi-value">{String(value)}</strong>
      {delta !== undefined ? <span className="chat-assistant-answer-kpi-delta">Delta: {String(delta)}</span> : null}
    </div>
  )
}
