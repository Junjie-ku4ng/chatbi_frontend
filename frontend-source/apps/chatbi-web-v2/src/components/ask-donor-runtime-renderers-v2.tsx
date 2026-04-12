'use client'

import type { AssistantThreadTimelineItem } from '@/modules/chat/runtime/chat-thread-timeline'
import { TimelineRoot } from '@/components/onyx-timeline/primitives/TimelineRoot'
import { TimelineHeaderRow } from '@/components/onyx-timeline/primitives/TimelineHeaderRow'
import { StreamingHeader } from '@/components/onyx-timeline/headers/StreamingHeader'
import { StepContainer } from '@/components/onyx-timeline/StepContainer'
import { DonorStatusRendererV2 } from './ask-donor-answer-renderers-v2'
import { OnyxDonorCardV2 } from './onyx-donor/onyx-donor-card-v2'

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

export function RuntimeStepRendererV2({
  item,
  index,
  isLastStep,
  testId
}: {
  item: Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }>
  index: number
  isLastStep: boolean
  testId?: string
}) {
  const step = item.step
  const detail = asRecord(step.detail)
  const detailMessage = typeof detail?.message === 'string' ? detail.message : undefined
  const header = (
    <span
      className="flex items-center justify-between gap-3"
      data-testid="onyx-donor-runtime-step-header"
    >
      <span
        className="font-secondary-mono text-[11px] uppercase tracking-[0.14em] text-[#6b7280]"
        data-testid="onyx-donor-runtime-step-label"
      >
        {item.kind === 'plan_step' ? '规划更新' : '运行时'}
      </span>
      <span
        className="font-main-ui-action text-[14px] leading-5 text-[#111827]"
        data-testid="onyx-donor-runtime-step-title"
      >
        {step.title ?? (item.kind === 'plan_step' ? '规划更新' : '执行步骤')}
      </span>
    </span>
  )

  const meta = [
    step.sourceEvent ?? (item.kind === 'plan_step' ? 'plan' : step.kind),
    step.status ?? 'running',
    typeof step.progressPercent === 'number' ? `${step.progressPercent}%` : undefined
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div data-testid={testId ?? 'onyx-donor-runtime-step-renderer'} className="flex flex-col">
      <StepContainer
        header={header}
        collapsible={false}
        supportsCollapsible={false}
        withRail={false}
        isFirstStep={index === 0}
        isLastStep={isLastStep}
      >
        <div
          data-testid="onyx-runtime-step-row"
          data-step-kind={step.kind}
          className="px-3 pb-3 space-y-2"
        >
          <p className="font-secondary-body break-words text-[12px] leading-5 text-[#6b7280]">{meta}</p>
          {detailMessage ? (
            <p className="font-secondary-body break-words text-[13px] leading-5 text-[#4b5563]">
              {detailMessage}
            </p>
          ) : null}
        </div>
      </StepContainer>
    </div>
  )
}

export function RuntimeTerminalRendererV2({
  item
}: {
  item: Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }>
}) {
  return (
    <div data-testid="onyx-donor-runtime-terminal-renderer">
      <DonorStatusRendererV2 status={item.status} label={item.label} />
    </div>
  )
}

export function RuntimeTimelineRendererV2({
  headerText,
  runtimeStepItems,
  runtimeTerminalItems
}: {
  headerText: string
  runtimeStepItems: Array<Extract<AssistantThreadTimelineItem, { kind: 'plan_step' | 'tool_step' }>>
  runtimeTerminalItems: Array<Extract<AssistantThreadTimelineItem, { kind: 'terminal_status' }>>
}) {
  if (runtimeStepItems.length === 0 && runtimeTerminalItems.length === 0) {
    return null
  }

  return (
    <section data-testid="onyx-agent-timeline">
      <OnyxDonorCardV2
        className="onyx-native-donor-runtime-card"
        data-testid="onyx-native-donor-runtime-card"
        padding="sm"
        variant="secondary"
      >
        <div className="onyx-native-donor-runtime-stack" data-testid="onyx-native-donor-runtime-stack">
          <div data-testid="onyx-donor-runtime-timeline-renderer">
            <TimelineRoot>
              <TimelineHeaderRow left={null}>
                <div data-testid="onyx-runtime-shell-header" className="sr-only">
                  {headerText}
                </div>
                <StreamingHeader
                  headerText={headerText}
                  collapsible={false}
                  isExpanded
                  onToggle={() => {}}
                />
              </TimelineHeaderRow>

              <div className="flex flex-col gap-2">
                {runtimeStepItems.map((item, index) => (
                  <RuntimeStepRendererV2
                    key={item.key}
                    item={item}
                    index={index}
                    isLastStep={index === runtimeStepItems.length - 1}
                  />
                ))}
              </div>

              {runtimeTerminalItems.length > 0 ? (
                <div className="mt-2 px-[var(--timeline-agent-message-padding-left)]">
                  {runtimeTerminalItems.map(item => (
                    <RuntimeTerminalRendererV2 key={item.key} item={item} />
                  ))}
                </div>
              ) : null}
            </TimelineRoot>
          </div>
        </div>
      </OnyxDonorCardV2>
    </section>
  )
}
