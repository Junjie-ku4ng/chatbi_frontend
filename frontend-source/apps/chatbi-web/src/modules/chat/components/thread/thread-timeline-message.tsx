'use client'

import { useAui } from '@assistant-ui/react'
import { useState } from 'react'
import { AnswerSurfaceShell } from '../answer-components/answer-surface-shell'
import { ChartAnswerComponent } from '../answer-components/chart-component'
import { splitAssistantTextWithEcharts } from '../answer-components/echarts-markdown'
import { KpiAnswerComponent } from '../answer-components/kpi-component'
import { StorySaveDialog } from '../answer-components/story-save-dialog'
import { TableAnswerComponent } from '../answer-components/table-component'
import { ClarificationCard } from '../clarification-card'
import type { AssistantThreadTimelineItem } from '@/modules/chat/runtime/chat-thread-timeline'
import { ThreadPlanStepCard } from './thread-plan-step-card'
import { ThreadTerminalChip } from './thread-terminal-chip'
import { ThreadToolStepCard } from './thread-tool-step-card'

function AnalysisComponentCard(input: {
  type: 'table' | 'kpi' | 'chart'
  payload: Record<string, unknown>
}) {
  const aui = useAui()
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false)

  return (
    <>
      <AnswerSurfaceShell
        type={input.type}
        payload={input.payload}
        onApplyPrompt={prompt => {
          aui.composer().setText(prompt)
          aui.composer().send()
        }}
        onAddToStory={() => {
          setIsStoryDialogOpen(true)
        }}
        renderBody={viewMode => {
          if (viewMode === 'kpi') {
            return <KpiAnswerComponent payload={input.payload} />
          }
          if (viewMode === 'table') {
            return <TableAnswerComponent payload={input.payload} />
          }
          return <ChartAnswerComponent payload={input.payload} />
        }}
      />
      <StorySaveDialog
        isOpen={isStoryDialogOpen}
        type={input.type}
        payload={input.payload}
        onClose={() => {
          setIsStoryDialogOpen(false)
        }}
      />
    </>
  )
}

function AssistantTextBlock({ text }: { text: string }) {
  const segments = splitAssistantTextWithEcharts(text)
  if (segments.length === 0) {
    return null
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'echarts') {
          return (
            <section key={`echarts-${index}`} className="chat-assistant-component-panel chat-assistant-component-panel-chart">
              <ChartAnswerComponent payload={{ option: segment.option }} />
            </section>
          )
        }

        return (
          <p key={`text-${index}`} className="chat-assistant-message-text">
            {segment.text}
          </p>
        )
      })}
    </>
  )
}

export function ThreadTimelineMessage({
  items,
  onApplyHint
}: {
  items: AssistantThreadTimelineItem[]
  onApplyHint?: (hint: string) => void
}) {
  const aui = useAui()

  return (
    <div className="chat-assistant-thread-timeline">
      {items.map(item => (
        <section
          key={item.key}
          data-thread-item-kind={item.kind}
          className={`chat-assistant-thread-item chat-assistant-thread-item-${item.kind}`}
        >
          {item.kind === 'assistant_text' ? <AssistantTextBlock text={item.text} /> : null}
          {item.kind === 'plan_step' ? <ThreadPlanStepCard step={item.step} /> : null}
          {item.kind === 'tool_step' ? <ThreadToolStepCard step={item.step} /> : null}
          {item.kind === 'analysis_component' ? (
            <AnalysisComponentCard type={item.component.type} payload={item.component.payload} />
          ) : null}
          {item.kind === 'clarification' ? (
            <ClarificationCard
              clarification={item.clarification}
              onApplyHint={hint => {
                if (onApplyHint) {
                  onApplyHint(hint)
                  return
                }
                aui.composer().setText(hint)
                aui.composer().send()
              }}
            />
          ) : null}
          {item.kind === 'terminal_status' ? <ThreadTerminalChip status={item.status} label={item.label} /> : null}
        </section>
      ))}
    </div>
  )
}
