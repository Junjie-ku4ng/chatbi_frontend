'use client'

import { useEffect, useState } from 'react'
import type { ConversationTurn } from '@/lib/ask-data'
import { listConversationTurns } from '@/lib/ask-data'

export function AskConversationReplayV2({ conversationId }: { conversationId?: string }) {
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!conversationId) {
      setTurns([])
      setLoading(false)
      return
    }

    setLoading(true)
    void listConversationTurns(conversationId, 12, 0)
      .then(result => {
        if (cancelled) return
        setTurns(result.items)
      })
      .catch(() => {
        if (cancelled) return
        setTurns([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  if (!conversationId) {
    return null
  }

  return (
    <section className="v2-replay-panel">
      <div className="v2-analysis-head">
        <div>
          <div className="v2-section-title">会话回放</div>
          <div className="v2-muted">{loading ? '正在加载历史轮次...' : `会话 ${conversationId}`}</div>
        </div>
      </div>
      {turns.length > 0 ? (
        <div className="v2-replay-list">
          {turns.map(turn => (
            <article className={`v2-replay-item is-${turn.role}`} key={turn.turnId}>
              <div className="v2-replay-role">{turn.role}</div>
              <div className="v2-replay-text">{turn.userQuestion}</div>
            </article>
          ))}
        </div>
      ) : !loading ? (
        <div className="v2-muted">当前会话暂无历史轮次。</div>
      ) : null}
    </section>
  )
}
