'use client'

import { useMemo } from 'react'

export type AnalysisTimeState = {
  mode: 'last_n' | 'between' | 'ytd'
  lastN: number
  compare?: 'yoy' | 'mom'
}

export function AnalysisTimeControls(props: {
  value: AnalysisTimeState
  onChange: (next: AnalysisTimeState) => void
  presets: Array<Record<string, unknown>>
  onApplyPreset: (preset: Record<string, unknown>) => void
}) {
  const normalizedLastN = useMemo(() => Math.max(1, Math.floor(props.value.lastN || 1)), [props.value.lastN])
  return (
    <section className="ask-analysis-fieldset">
      <strong className="ask-analysis-field-label">Time</strong>
      <div className="ask-analysis-row">
        <select
          data-testid="ask-analysis-time-mode"
          value={props.value.mode}
          onChange={event =>
            props.onChange({
              ...props.value,
              mode: event.target.value as AnalysisTimeState['mode']
            })
          }
          className="ask-analysis-control ask-analysis-control-grow"
        >
          <option value="last_n">last_n</option>
          <option value="between">between</option>
          <option value="ytd">ytd</option>
        </select>
        <input
          data-testid="ask-analysis-time-lastn"
          type="number"
          min={1}
          value={String(normalizedLastN)}
          onChange={event =>
            props.onChange({
              ...props.value,
              lastN: Math.max(1, Number(event.target.value || 1))
            })
          }
          className="ask-analysis-control ask-analysis-control-number"
        />
      </div>
      <select
        data-testid="ask-analysis-time-compare"
        value={props.value.compare ?? ''}
        onChange={event =>
          props.onChange({
            ...props.value,
            compare: event.target.value === '' ? undefined : (event.target.value as 'yoy' | 'mom')
          })
        }
        className="ask-analysis-control"
      >
        <option value="">no compare</option>
        <option value="yoy">yoy</option>
        <option value="mom">mom</option>
      </select>
      {props.presets.length > 0 ? (
        <div className="ask-analysis-chip-row">
          {props.presets.slice(0, 4).map((preset, index) => (
            <button
              data-testid={`ask-analysis-time-preset-${index}`}
              key={`${preset.id ?? index}`}
              type="button"
              className="badge badge-ok ask-analysis-chip"
              onClick={() => props.onApplyPreset(preset)}
            >
              {typeof preset.label === 'string' ? preset.label : `preset ${index + 1}`}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
