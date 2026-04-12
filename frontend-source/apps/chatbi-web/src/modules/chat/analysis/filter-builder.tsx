'use client'

import { useQuery } from '@tanstack/react-query'
import { listAnalysisSuggestions } from './api'

export type AnalysisFilterState = {
  dimension?: string
  member?: string
  memberKey?: string
  hierarchy?: string
  level?: string
}

export function AnalysisFilterBuilder(props: {
  queryLogId: string
  dimensions: string[]
  value: AnalysisFilterState
  onChange: (next: AnalysisFilterState) => void
}) {
  const dimension = props.value.dimension ?? props.dimensions[0] ?? ''
  const member = props.value.member ?? ''
  const suggestionsQuery = useQuery({
    queryKey: ['ask-analysis-member-suggestions', props.queryLogId, dimension, member],
    enabled: Boolean(props.queryLogId && dimension),
    queryFn: () =>
      listAnalysisSuggestions(props.queryLogId, {
        kind: 'member',
        dimension,
        q: member,
        topK: 8
      })
  })
  const suggestionItems = Array.isArray(suggestionsQuery.data?.items) ? suggestionsQuery.data.items : []

  return (
    <section className="ask-analysis-fieldset">
      <strong className="ask-analysis-field-label">Filter</strong>
      <select
        data-testid="ask-analysis-filter-dimension"
        value={dimension}
        onChange={event =>
          props.onChange({
            dimension: event.target.value,
            member,
            memberKey: undefined,
            hierarchy: undefined,
            level: undefined
          })
        }
        className="ask-analysis-control"
      >
        {props.dimensions.length === 0 ? <option value="">No dimension</option> : null}
        {props.dimensions.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <input
        data-testid="ask-analysis-filter-member"
        value={member}
        onChange={event =>
          props.onChange({
            dimension,
            member: event.target.value,
            memberKey: undefined,
            hierarchy: undefined,
            level: undefined
          })
        }
        placeholder="Member value"
        className="ask-analysis-control"
      />
      {suggestionItems.length > 0 ? (
        <div className="ask-analysis-chip-row">
          {suggestionItems.map((item, index) => {
            const key = typeof item.key === 'string' ? item.key : typeof item.name === 'string' ? item.name : `${index}`
            const label = typeof item.name === 'string' ? item.name : key
            return (
              <button
                data-testid={`ask-analysis-member-suggestion-${index}`}
                key={`${key}-${index}`}
                type="button"
                className="badge badge-warn ask-analysis-chip"
                onClick={() =>
                  props.onChange({
                    dimension,
                    member: label,
                    memberKey: key,
                    hierarchy: typeof item.hierarchy === 'string' ? item.hierarchy : dimension,
                    level: typeof item.level === 'string' ? item.level : undefined
                  })
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
