'use client'

export function AnswerSortTopPanel(props: {
  metrics: string[]
  sortBy?: string
  sortDir: 'ASC' | 'DESC'
  topN?: number
  presets: number[]
  onChange: (next: { sort?: { by: string; dir: 'ASC' | 'DESC' }; topN?: number }) => void
}) {
  const resolvedSortBy = props.sortBy ?? props.metrics[0] ?? ''
  const resolvedTopN = typeof props.topN === 'number' && Number.isFinite(props.topN) ? String(props.topN) : ''
  const applyTopNChange = (rawValue: string) => {
    const nextValue = Number(rawValue)
    props.onChange({
      sort: resolvedSortBy
        ? {
            by: resolvedSortBy,
            dir: props.sortDir
          }
        : undefined,
      topN: Number.isFinite(nextValue) && nextValue > 0 ? Math.floor(nextValue) : undefined
    })
  }

  return (
    <section className="chat-assistant-component-panel onyx-donor-answer-panel" data-testid="answer-sort-top-panel">
      <strong>排序与前 N</strong>
      <div className="ask-analysis-row">
        <select
          data-testid="answer-sort-top-metric"
          value={resolvedSortBy}
          onChange={event =>
            props.onChange({
              sort: event.target.value
                ? {
                    by: event.target.value,
                    dir: props.sortDir
                  }
                : undefined,
              topN: props.topN
            })
          }
          className="ask-analysis-control ask-analysis-control-grow onyx-donor-answer-panel-control"
        >
          <option value="">不排序</option>
          {props.metrics.map(metric => (
            <option key={metric} value={metric}>
              {metric}
            </option>
          ))}
        </select>
        <select
          data-testid="answer-sort-top-dir"
          value={props.sortDir}
          onChange={event =>
            props.onChange({
              sort: resolvedSortBy
                ? {
                    by: resolvedSortBy,
                    dir: event.target.value === 'ASC' ? 'ASC' : 'DESC'
                  }
                : undefined,
              topN: props.topN
            })
          }
          className="ask-analysis-control onyx-donor-answer-panel-control"
        >
          <option value="DESC">降序</option>
          <option value="ASC">升序</option>
        </select>
        <input
          data-testid="answer-sort-top-limit"
          type="number"
          min={1}
          value={resolvedTopN}
          onInput={event => applyTopNChange((event.target as HTMLInputElement).value)}
          onChange={event => applyTopNChange(event.target.value)}
          className="ask-analysis-control ask-analysis-control-number onyx-donor-answer-panel-control"
        />
      </div>
      {props.presets.length > 0 ? (
        <div className="ask-analysis-chip-row">
          {props.presets.map(preset => (
            <button
              key={preset}
              type="button"
              className="badge badge-ok ask-analysis-chip"
              onClick={() => {
                props.onChange({
                  sort: resolvedSortBy
                    ? {
                        by: resolvedSortBy,
                        dir: props.sortDir
                      }
                    : undefined,
                  topN: preset
                })
              }}
            >
              前 {preset}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
