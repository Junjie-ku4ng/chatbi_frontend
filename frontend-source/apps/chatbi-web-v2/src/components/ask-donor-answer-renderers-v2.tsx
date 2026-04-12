'use client'

import {
  ClarificationCard,
  splitAssistantTextWithEcharts,
  ChartAnswerComponent
} from '@/lib/chat-runtime-bridge'
import type { ThreadAnalysisComponent, ThreadClarification } from '@/modules/chat/runtime/chat-thread-timeline'
import { AnalysisComponentCardV2 } from './analysis-component-card-v2'
import { OnyxDonorCardV2 } from './onyx-donor/onyx-donor-card-v2'

export function DonorMarkdownRendererV2({ text }: { text: string }) {
  const segments = splitAssistantTextWithEcharts(text)
  if (segments.length === 0) {
    return null
  }

  return (
    <div
      className="onyx-donor-markdown-renderer-shell onyx-donor-markdown-renderer-surface w-full overflow-x-visible cursor-text focus:outline-none select-text"
      data-testid="onyx-donor-markdown-renderer"
    >
      <OnyxDonorCardV2 data-testid="onyx-native-donor-markdown-card" padding="sm" variant="primary">
        <div
          dir="auto"
          className="onyx-donor-markdown-prose onyx-donor-markdown-content-surface prose dark:prose-invert font-main-content-body max-w-full"
          data-testid="onyx-donor-markdown-content"
        >
          <div data-testid="ask-assistant-markdown">
          {segments.map((segment, index) => {
            if (segment.kind === 'echarts') {
              return (
                <section key={`echarts-${index}`} className="chat-assistant-component-panel chat-assistant-component-panel-chart">
                  <ChartAnswerComponent payload={{ option: segment.option }} />
                </section>
              )
            }

            return (
              <p key={`text-${index}`} className="chat-assistant-message-text onyx-donor-markdown-paragraph">
                {segment.text}
              </p>
            )
          })}
          </div>
        </div>
      </OnyxDonorCardV2>
    </div>
  )
}

export function DonorClarificationRendererV2({
  clarification,
  onApplyHint
}: {
  clarification: ThreadClarification
  onApplyHint: (hint: string) => void
}) {
  return (
    <div
      className="onyx-donor-clarification-shell onyx-donor-clarification-surface w-full"
      data-testid="onyx-donor-clarification-renderer"
    >
      <OnyxDonorCardV2 padding="sm" variant="primary">
        <div
          className="onyx-donor-clarification-slot onyx-donor-clarification-slot-surface flex w-full flex-col gap-3"
          data-testid="onyx-donor-clarification-slot"
        >
          <div data-testid="onyx-native-donor-clarification-card">
            <ClarificationCard clarification={clarification as never} onApplyHint={onApplyHint} />
          </div>
        </div>
      </OnyxDonorCardV2>
    </div>
  )
}

export function DonorAnalysisRendererV2({
  component,
  onApplyPrompt
}: {
  component: ThreadAnalysisComponent
  onApplyPrompt: (prompt: string) => void
}) {
  const analysisBody = (
    <div
      data-testid="onyx-donor-analysis-shell"
      className="onyx-donor-analysis-shell onyx-donor-analysis-shell-surface flex w-full flex-col gap-3"
    >
      <div
        className="onyx-donor-analysis-slot onyx-donor-analysis-slot-surface flex w-full flex-col gap-3"
        data-testid="onyx-donor-analysis-slot"
      >
        <AnalysisComponentCardV2 type={component.type} payload={component.payload} onApplyPrompt={onApplyPrompt} />
      </div>
    </div>
  )

  return (
    <div
      className="onyx-donor-analysis-renderer-shell onyx-donor-analysis-renderer-surface w-full"
      data-testid="onyx-donor-analysis-renderer"
    >
      {component.type === 'chart' ? (
        analysisBody
      ) : (
        <OnyxDonorCardV2 data-testid="onyx-native-donor-analysis-card" padding="sm" variant="primary">
          {analysisBody}
        </OnyxDonorCardV2>
      )}
    </div>
  )
}

export function DonorStatusRendererV2({
  status,
  label
}: {
  status: 'running' | 'done' | 'error'
  label: string
}) {
  const tone =
    status === 'error'
      ? 'border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]'
      : status === 'done'
        ? 'border-[rgba(16,185,129,0.16)] bg-[rgba(236,253,245,0.92)] text-[#047857]'
        : 'border-[rgba(37,99,235,0.14)] bg-[rgba(239,246,255,0.92)] text-[#2563eb]'

  return (
    <div className="onyx-donor-status-shell w-full" data-testid="onyx-donor-status-renderer">
      <div
        data-testid="onyx-timeline-status"
        className={`inline-flex w-fit items-center rounded-full border px-3 py-1 font-secondary-mono uppercase tracking-[0.14em] ${tone}`}
      >
        {label}
      </div>
    </div>
  )
}
