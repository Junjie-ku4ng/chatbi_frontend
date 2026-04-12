'use client'

export type ClarificationPayload = {
  required: true
  message: string
  missingSlots: string[]
  candidateHints?: Record<string, string[]>
  resolvedContext?: Record<string, string>
  reasonCodes?: string[]
  exampleAnswers?: string[]
}

export function ClarificationCard({
  clarification,
  onApplyHint
}: {
  clarification: ClarificationPayload
  onApplyHint?: (hint: string) => void
}) {
  const hints = Object.values(clarification.candidateHints ?? {}).flat().slice(0, 5)
  const slotLabel: Record<string, string> = {
    metric: '指标',
    question: '问题',
    model: '模型',
    time: '时间',
    timeRange: '时间范围',
    dimension: '维度',
    filter: '筛选',
    comparison: '对比范围',
    model_group: '模型组合',
    comparison_view: '比较方式',
    baseline_scope: '基线范围',
    compare_scope: '对比范围',
    scenario_change: '调整方式',
    unknown: '其他信息'
  }
  const resolvedContext = Object.entries(clarification.resolvedContext ?? {})
  const resolvedContextLabel: Record<string, string> = {
    intent: '意图',
    models: '模型',
    available_models: '可选模型',
    scope: '范围',
    metric: '指标',
    driver: '驱动因子',
    time_window: '时间范围'
  }

  return (
    <section className="chat-assistant-clarification-card" data-testid="ask-clarification-card">
      <strong className="chat-assistant-clarification-title">需要补充信息</strong>
      <p className="chat-assistant-clarification-message">{clarification.message}</p>
      {resolvedContext.length > 0 ? (
        <div className="chat-assistant-clarification-context">
          <strong className="chat-assistant-clarification-context-title">已识别信息</strong>
          <div className="chat-assistant-clarification-slots">
            {resolvedContext.map(([key, value]) => (
              <span key={key} className="nx-badge chat-assistant-clarification-slot">
                {resolvedContextLabel[key] ?? key}：{value}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {clarification.missingSlots.length > 0 ? (
        <div className="chat-assistant-clarification-slots">
          {clarification.missingSlots.map(slot => (
            <span key={slot} className="nx-badge nx-badge-warn chat-assistant-clarification-slot">
              {slotLabel[slot] ?? slot}
            </span>
          ))}
        </div>
      ) : null}
      {hints.length > 0 ? (
        <div className="chat-assistant-clarification-hints">
          {hints.map(hint => (
            <button
              key={hint}
              type="button"
              onClick={() => onApplyHint?.(hint)}
              className="chat-assistant-clarification-hint"
            >
              {hint}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
