'use client'

import { NexusBadge, NexusCard } from '@/modules/shared/ui/primitives'

export function ThreadAnalysisFollowupCard(props: {
  queryLogId: string
  traceKey?: string
  messageId?: string
  children?: React.ReactNode
}) {
  return (
    <NexusCard
      data-testid="ask-answer-analysis-card"
      data-analysis-query-log-id={props.queryLogId}
      data-analysis-message-id={props.messageId ?? undefined}
      className="chat-answer-analysis-card nx-shell-panel"
    >
      <div className="chat-answer-analysis-card-head nx-shell-meta-row">
        <strong className="chat-answer-analysis-card-title">继续分析</strong>
        <div className="chat-answer-analysis-card-meta">
          <NexusBadge tone="neutral">queryLog: {props.queryLogId}</NexusBadge>
          {props.messageId ? <NexusBadge tone="brand">answer: {props.messageId}</NexusBadge> : null}
          {props.traceKey ? <NexusBadge tone="neutral">trace: {props.traceKey}</NexusBadge> : null}
        </div>
      </div>
      <div className="chat-answer-analysis-card-body">{props.children}</div>
    </NexusCard>
  )
}
