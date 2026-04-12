'use client'

import { OnyxDonorCardV2 } from '@/components/onyx-donor/onyx-donor-card-v2'

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
    <OnyxDonorCardV2
      className="chat-assistant-clarification-card onyx-donor-clarification-card onyx-donor-clarification-card-shell onyx-native-donor-clarification-card"
      data-testid="ask-clarification-card"
      padding="sm"
      variant="primary"
    >
      <div data-testid="onyx-native-donor-clarification-card">
        <div data-testid="clarification-header-block">
          <strong className="chat-assistant-clarification-title onyx-donor-clarification-title">需要补充信息</strong>
        </div>
        <div data-testid="clarification-body-block">
          <p className="chat-assistant-clarification-message onyx-donor-clarification-message">{clarification.message}</p>
        </div>
        {resolvedContext.length > 0 ? (
          <div
            className="chat-assistant-clarification-context onyx-donor-clarification-context-block"
            data-testid="clarification-context-block"
          >
            <strong className="chat-assistant-clarification-context-title onyx-donor-clarification-context-title">
              已识别信息
            </strong>
            <div className="chat-assistant-clarification-slots onyx-donor-clarification-slot-row">
              {resolvedContext.map(([key, value]) => (
                <span
                  key={key}
                  className="nx-badge chat-assistant-clarification-slot onyx-donor-clarification-slot-chip onyx-donor-clarification-slot-chip-resolved"
                >
                  {resolvedContextLabel[key] ?? key}：{value}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {clarification.missingSlots.length > 0 ? (
          <div
            className="chat-assistant-clarification-slots onyx-donor-clarification-slot-row"
            data-testid="clarification-missing-block"
          >
            {clarification.missingSlots.map(slot => (
              <span
                key={slot}
                className="nx-badge nx-badge-warn chat-assistant-clarification-slot onyx-donor-clarification-slot-chip onyx-donor-clarification-slot-chip-missing"
              >
                {slotLabel[slot] ?? slot}
              </span>
            ))}
          </div>
        ) : null}
        {hints.length > 0 ? (
          <div
            className="chat-assistant-clarification-hints onyx-donor-clarification-hint-row"
            data-testid="clarification-hint-block"
          >
            {hints.map(hint => (
              <button
                key={hint}
                type="button"
                onClick={() => onApplyHint?.(hint)}
                className="chat-assistant-clarification-hint onyx-donor-clarification-hint-chip onyx-donor-clarification-hint-chip-action"
              >
                {hint}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </OnyxDonorCardV2>
  )
}
