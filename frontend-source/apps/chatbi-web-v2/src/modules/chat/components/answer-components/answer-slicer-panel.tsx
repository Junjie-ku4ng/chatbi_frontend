'use client'

export function AnswerSlicerPanel(props: {
  dimensions: string[]
  dimension?: string
  member?: string
  onChange: (next: { focusDimension?: string; filters?: Array<Record<string, unknown>> }) => void
}) {
  const dimension = props.dimension ?? props.dimensions[0] ?? ''
  const member = props.member ?? ''
  const applyMemberChange = (rawValue: string) => {
    props.onChange({
      focusDimension: dimension || undefined,
      filters:
        rawValue.trim() !== ''
          ? [
              {
                dimension,
                op: 'IN',
                members: [rawValue.trim()]
              }
            ]
          : []
    })
  }

  return (
    <section className="chat-assistant-component-panel onyx-donor-answer-panel" data-testid="answer-slicer-panel">
      <strong>Slicers</strong>
      <select
        data-testid="answer-slicer-dimension"
        value={dimension}
        onChange={event =>
          props.onChange({
            focusDimension: event.target.value || undefined,
            filters:
              member.trim() !== ''
                ? [
                    {
                      dimension: event.target.value,
                      op: 'IN',
                      members: [member.trim()]
                    }
                  ]
                : []
          })
        }
        className="ask-analysis-control onyx-donor-answer-panel-control"
      >
        {props.dimensions.length === 0 ? <option value="">No dimension</option> : null}
        {props.dimensions.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <input
        data-testid="answer-slicer-member"
        value={member}
        onInput={event => applyMemberChange((event.target as HTMLInputElement).value)}
        onChange={event => applyMemberChange(event.target.value)}
        placeholder="Member value"
        className="ask-analysis-control onyx-donor-answer-panel-control"
      />
    </section>
  )
}
