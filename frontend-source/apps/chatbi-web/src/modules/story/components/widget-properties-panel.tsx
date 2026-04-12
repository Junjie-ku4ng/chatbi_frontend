'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { StoryWidget, StoryWidgetValidationIssue, StoryWidgetType } from '@/modules/story/api'

type WidgetPropertiesPanelProps = {
  widget?: StoryWidget
  pending?: boolean
  validating?: boolean
  issues?: StoryWidgetValidationIssue[]
  onSave: (input: {
    widgetId: string
    title?: string
    payload: Record<string, unknown>
    layout: Record<string, unknown>
  }) => Promise<void> | void
  onValidate: (input: {
    widgetType: StoryWidgetType
    payload: Record<string, unknown>
    layout: Record<string, unknown>
  }) => Promise<void> | void
}

export function WidgetPropertiesPanel({
  widget,
  pending,
  validating,
  issues,
  onSave,
  onValidate
}: WidgetPropertiesPanelProps) {
  const [title, setTitle] = useState('')
  const [payloadText, setPayloadText] = useState('{}')
  const [layoutX, setLayoutX] = useState('0')
  const [layoutY, setLayoutY] = useState('0')
  const [layoutW, setLayoutW] = useState('6')
  const [layoutH, setLayoutH] = useState('4')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!widget) {
      setTitle('')
      setPayloadText('{}')
      setLayoutX('0')
      setLayoutY('0')
      setLayoutW('6')
      setLayoutH('4')
      setError(null)
      return
    }
    const layout = asRecord(widget.layout)
    setTitle(widget.title ?? '')
    setPayloadText(JSON.stringify(widget.payload ?? {}, null, 2))
    setLayoutX(String(asNumber(layout.x, 0)))
    setLayoutY(String(asNumber(layout.y, 0)))
    setLayoutW(String(asNumber(layout.w, 6)))
    setLayoutH(String(asNumber(layout.h, 4)))
    setError(null)
  }, [widget])

  const parsed = useMemo(() => {
    try {
      return {
        payload: JSON.parse(payloadText),
        error: null
      }
    } catch (parseError) {
      return {
        payload: {},
        error: parseError instanceof Error ? parseError.message : 'Invalid JSON'
      }
    }
  }, [payloadText])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!widget) return
    if (parsed.error) {
      setError(`Invalid payload JSON: ${parsed.error}`)
      return
    }
    setError(null)
    await onSave({
      widgetId: widget.id,
      title: title.trim() || undefined,
      payload: asRecord(parsed.payload),
      layout: {
        x: asNumber(layoutX, 0),
        y: asNumber(layoutY, 0),
        w: Math.max(1, asNumber(layoutW, 6)),
        h: Math.max(1, asNumber(layoutH, 4))
      }
    })
  }

  async function runValidate() {
    if (!widget) return
    if (parsed.error) {
      setError(`Invalid payload JSON: ${parsed.error}`)
      return
    }
    setError(null)
    await onValidate({
      widgetType: widget.widgetType,
      payload: asRecord(parsed.payload),
      layout: {
        x: asNumber(layoutX, 0),
        y: asNumber(layoutY, 0),
        w: Math.max(1, asNumber(layoutW, 6)),
        h: Math.max(1, asNumber(layoutH, 4))
      }
    })
  }

  return (
    <section className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
      <strong>Widget Properties</strong>
      {!widget ? <span style={{ color: 'var(--muted)' }}>Select a widget from the canvas.</span> : null}
      {widget ? (
        <form data-testid="story-designer-properties-form" onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
          <span className="badge badge-ok">{widget.widgetType}</span>
          <input
            data-testid="story-designer-properties-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Widget title"
            style={inputStyle}
          />
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
            <input
              data-testid="story-designer-properties-layout-x"
              value={layoutX}
              onChange={event => setLayoutX(event.target.value)}
              placeholder="x"
              style={inputStyle}
            />
            <input
              data-testid="story-designer-properties-layout-y"
              value={layoutY}
              onChange={event => setLayoutY(event.target.value)}
              placeholder="y"
              style={inputStyle}
            />
            <input
              data-testid="story-designer-properties-layout-w"
              value={layoutW}
              onChange={event => setLayoutW(event.target.value)}
              placeholder="w"
              style={inputStyle}
            />
            <input
              data-testid="story-designer-properties-layout-h"
              value={layoutH}
              onChange={event => setLayoutH(event.target.value)}
              placeholder="h"
              style={inputStyle}
            />
          </div>
          <textarea
            data-testid="story-designer-properties-payload"
            value={payloadText}
            onChange={event => setPayloadText(event.target.value)}
            rows={10}
            style={{
              ...inputStyle,
              fontFamily: 'var(--font-mono), monospace'
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="submit"
              data-testid="story-designer-properties-save"
              className="badge badge-ok"
              disabled={Boolean(pending)}
              style={buttonStyle}
            >
              {pending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              data-testid="story-designer-properties-validate"
              className="badge badge-warn"
              disabled={Boolean(validating)}
              onClick={() => void runValidate()}
              style={buttonStyle}
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
          </div>
          {error ? <span className="badge badge-warn">{error}</span> : null}
          {issues && issues.length > 0 ? (
            <div data-testid="story-designer-validation-issues" style={{ display: 'grid', gap: 6 }}>
              {issues.map((issue, index) => (
                <article key={`${issue.code}-${index}`} className="card" style={{ padding: 8, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 12 }}>{issue.code}</strong>
                    <span className={issue.severity === 'error' ? 'badge badge-warn' : 'badge badge-ok'}>
                      {issue.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 12 }}>{issue.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{issue.fieldPath}</div>
                </article>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}

const inputStyle = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 10px'
}

const buttonStyle = {
  border: 'none',
  cursor: 'pointer'
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed)
  }
  return fallback
}
