'use client'

import { buildOpsTraceHref } from '@/modules/chat/analysis/api'
import {
  buildAnswerSurfaceOpenAnalysisHref,
  resolveAnswerSurfaceQueryLogId,
  resolveAnswerSurfaceTraceKey
} from './interactive-actions'
import type { AnswerComponentPayload } from './types'

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : []
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function formatFieldValue(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    const flattened = value
      .map(item => formatFieldValue(item))
      .filter((item): item is string => Boolean(item))
    return flattened.length > 0 ? flattened.join(', ') : undefined
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

function renderRefFields(ref: Record<string, unknown>) {
  const fields = Object.entries(ref)
    .map(([key, value]) => [key, formatFieldValue(value)] as const)
    .filter(([, value]) => Boolean(value))

  if (fields.length === 0) {
    return null
  }

  return (
    <dl className="chat-assistant-answer-evidence-ref-fields">
      {fields.map(([key, value]) => (
        <div key={key} className="chat-assistant-answer-evidence-ref-field">
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function AnswerEvidenceDrawer(props: {
  payload: AnswerComponentPayload
  draftPatch?: Record<string, unknown>
}) {
  const explain = props.payload.interaction?.explain
  const queryLogId = resolveAnswerSurfaceQueryLogId(props.payload)
  const traceKey = resolveAnswerSurfaceTraceKey(props.payload)
  const warnings = Array.isArray(explain?.warnings)
    ? explain.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim() !== '')
    : []
  const refs = asRecordArray(explain?.refs)
  const openAnalysisHref = buildAnswerSurfaceOpenAnalysisHref(props.payload, {
    patch: props.draftPatch
  })
  const openTraceHref = buildOpsTraceHref(traceKey)

  return (
    <section className="chat-assistant-component-panel onyx-donor-answer-panel" data-testid="answer-evidence-drawer">
      <strong>证据</strong>
      {queryLogId ? <p data-testid="answer-evidence-query-log-id">查询日志：{queryLogId}</p> : null}
      {traceKey ? <p data-testid="answer-evidence-trace-key">追踪：{traceKey}</p> : null}

      {warnings.length > 0 ? (
        <div className="chat-assistant-answer-evidence-section">
          <strong>警告</strong>
          <ul className="chat-assistant-answer-evidence-list">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} data-testid={`answer-evidence-warning-${index}`}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {refs.length > 0 ? (
        <div className="chat-assistant-answer-evidence-section">
          <strong>来源</strong>
          <div className="chat-assistant-answer-evidence-refs">
            {refs.map((ref, index) => {
              const heading = asString(ref.label) ?? asString(ref.kind) ?? `ref-${index + 1}`
              return (
                <article key={`${heading}-${index}`} data-testid={`answer-evidence-ref-${index}`}>
                  <strong>{heading}</strong>
                  {renderRefFields(ref)}
                </article>
              )
            })}
          </div>
        </div>
      ) : null}

      {openAnalysisHref || openTraceHref ? (
        <div className="chat-assistant-answer-evidence-links">
          {openAnalysisHref ? (
            <a
              data-testid="answer-evidence-open-analysis"
              className="chat-assistant-answer-action onyx-donor-answer-surface-action"
              href={openAnalysisHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开分析
            </a>
          ) : null}
          {openTraceHref ? (
            <a
              data-testid="answer-evidence-open-trace"
              className="chat-assistant-answer-action onyx-donor-answer-surface-action"
              href={openTraceHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开追踪
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
