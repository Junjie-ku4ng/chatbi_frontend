'use client'

import type { AssistantThreadTimelineItem } from '@/modules/chat/runtime/chat-thread-timeline'
import type { DonorAnswerSectionV2 } from './ask-donor-message-adapter-v2'
import {
  DonorAnalysisRendererV2,
  DonorClarificationRendererV2,
  DonorMarkdownRendererV2
} from './ask-donor-answer-renderers-v2'
import {
  RuntimeStepRendererV2,
  RuntimeTerminalRendererV2
} from './ask-donor-runtime-renderers-v2'

export function DonorDisplayGroupRendererV2({
  section,
  index,
  onApplyPrompt,
  onApplyHint
}: {
  section: DonorAnswerSectionV2
  index: number
  onApplyPrompt: (prompt: string) => void
  onApplyHint: (hint: string) => void
}) {
  const item = section.item

  function renderItemContent(item: AssistantThreadTimelineItem) {
    if (item.kind === 'assistant_text') {
      return <DonorMarkdownRendererV2 text={item.text} />
    }

    if (item.kind === 'plan_step' || item.kind === 'tool_step') {
      return (
        <RuntimeStepRendererV2
          item={item}
          index={index}
          isLastStep
          testId="onyx-donor-inline-runtime-step"
        />
      )
    }

    if (item.kind === 'analysis_component') {
      return <DonorAnalysisRendererV2 component={item.component} onApplyPrompt={onApplyPrompt} />
    }

    if (item.kind === 'clarification') {
      return <DonorClarificationRendererV2 clarification={item.clarification} onApplyHint={onApplyHint} />
    }

    if (item.kind === 'terminal_status') {
      return <RuntimeTerminalRendererV2 item={item} />
    }

    return null
  }

  const content = renderItemContent(item)
  if (!content) {
    return null
  }

  if (!section.sectionKind) {
    return (
      <div
        data-testid="onyx-donor-display-group-renderer"
      className="onyx-donor-display-group onyx-donor-display-group-untyped flex w-full flex-col gap-3"
    >
        <div
          data-testid="onyx-donor-display-group-result"
          className="onyx-donor-display-group-result onyx-donor-display-group-result-surface w-full"
        >
          <div
            data-testid="onyx-donor-display-group-body"
            className="onyx-donor-display-group-body onyx-donor-display-group-body-stack flex w-full flex-col gap-3"
          >
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="onyx-donor-display-group-renderer"
      className={`onyx-donor-display-group onyx-donor-display-group-${section.sectionKind} flex w-full flex-col gap-3`}
    >
      <div
        data-testid="onyx-donor-display-group-result"
        className="onyx-donor-display-group-result onyx-donor-display-group-result-surface w-full"
      >
        <div
          data-testid="onyx-donor-display-group-body"
          className="onyx-donor-display-group-body onyx-donor-display-group-body-stack flex w-full flex-col gap-3"
        >
          <div
            data-testid="onyx-donor-answer-section"
            data-section-kind={section.sectionKind}
            className={`onyx-donor-answer-section onyx-donor-answer-section-${section.sectionKind} onyx-donor-answer-section-surface flex w-full flex-col gap-3`}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}
