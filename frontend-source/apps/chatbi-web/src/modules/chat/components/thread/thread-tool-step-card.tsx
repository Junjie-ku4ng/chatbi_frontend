'use client'

import { useState } from 'react'
import type { RuntimeMessageStep } from '@/modules/chat/runtime/chat-runtime-projection'

function toPrettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

export function ThreadToolStepCard({ step }: { step: RuntimeMessageStep }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      data-testid="thread-tool-step-card"
      className="chat-assistant-thread-step-card chat-assistant-thread-step-card-tool"
    >
      <div className="chat-assistant-thread-step-head">
        <div className="chat-assistant-thread-step-copy">
          <strong>{step.title ?? '执行步骤'}</strong>
          <span className="chat-assistant-thread-step-meta">
            {step.kind} · {step.status ?? 'running'}
            {step.progressPercent !== null ? ` · ${step.progressPercent}%` : ''}
          </span>
        </div>
        <button
          type="button"
          data-testid="thread-tool-step-toggle"
          className="chat-assistant-thread-step-toggle"
          onClick={() => setExpanded(current => !current)}
        >
          {expanded ? '收起' : '详情'}
        </button>
      </div>

      {expanded ? (
        <pre data-testid="thread-tool-step-detail" className="chat-assistant-thread-step-detail">
          {toPrettyJson({
            sourceEvent: step.sourceEvent,
            traceKey: step.traceKey,
            queryLogId: step.queryLogId,
            detail: step.detail
          })}
        </pre>
      ) : null}
    </article>
  )
}
