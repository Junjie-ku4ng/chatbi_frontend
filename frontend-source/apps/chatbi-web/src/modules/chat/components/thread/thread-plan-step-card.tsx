'use client'

import type { RuntimeMessageStep } from '@/modules/chat/runtime/chat-runtime-projection'

export function ThreadPlanStepCard({ step }: { step: RuntimeMessageStep }) {
  return (
    <article
      data-testid="thread-plan-step-card"
      className="chat-assistant-thread-step-card chat-assistant-thread-step-card-plan"
    >
      <div className="chat-assistant-thread-step-head">
        <div className="chat-assistant-thread-step-copy">
          <strong>{step.title ?? '规划更新'}</strong>
          <span className="chat-assistant-thread-step-meta">
            {step.sourceEvent ?? 'plan'} · {step.status ?? 'running'}
          </span>
        </div>
      </div>
    </article>
  )
}
