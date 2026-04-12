'use client'

import { AnswerSurfaceShell } from '@/modules/chat/components/answer-components/answer-surface-shell'
import { ChartAnswerComponent } from '@/modules/chat/components/answer-components/chart-component'
import { KpiAnswerComponent } from '@/modules/chat/components/answer-components/kpi-component'
import { TableAnswerComponent } from '@/modules/chat/components/answer-components/table-component'
import type { AnswerComponentPayload } from '@/modules/chat/components/answer-components/types'
import { StoryWidget } from '@/modules/story/api'

export function StoryWidgetRenderer({ widget }: { widget: StoryWidget }) {
  const payload = (widget.payload ?? {}) as AnswerComponentPayload

  if (widget.widgetType === 'table' || widget.widgetType === 'kpi' || widget.widgetType === 'chart') {
    return (
      <AnswerSurfaceShell
        type={widget.widgetType}
        payload={payload}
        renderBody={viewMode => {
          if (viewMode === 'table') {
            return <TableAnswerComponent payload={payload} />
          }
          if (viewMode === 'kpi') {
            return <KpiAnswerComponent payload={payload} />
          }
          return <ChartAnswerComponent payload={payload} />
        }}
      />
    )
  }

  return (
    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
      {String(payload.content ?? payload.text ?? payload.value ?? 'No text content')}
    </p>
  )
}
