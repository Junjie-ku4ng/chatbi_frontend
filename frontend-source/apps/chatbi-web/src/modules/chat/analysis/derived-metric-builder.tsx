'use client'

export type DerivedMetricInput = {
  code: string
  formula: string
  label?: string
}

export function DerivedMetricBuilder(props: {
  value: DerivedMetricInput[]
  onChange: (next: DerivedMetricInput[]) => void
}) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 12 }}>Derived Metrics</strong>
        <button
          data-testid="ask-analysis-derived-add"
          type="button"
          className="badge badge-ok"
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={() =>
            props.onChange([
              ...props.value,
              {
                code: '',
                formula: ''
              }
            ])
          }
        >
          add
        </button>
      </div>
      {props.value.length === 0 ? <span className="badge badge-warn">No derived metrics</span> : null}
      {props.value.map((item, index) => (
        <article key={`derived-${index}`} className="card" style={{ borderRadius: 10, padding: 8, display: 'grid', gap: 6 }}>
          <input
            data-testid={`ask-analysis-derived-code-${index}`}
            value={item.code}
            onChange={event => {
              const next = [...props.value]
              next[index] = { ...next[index], code: event.target.value }
              props.onChange(next)
            }}
            placeholder="code (e.g. MarginRate)"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 8px' }}
          />
          <input
            data-testid={`ask-analysis-derived-formula-${index}`}
            value={item.formula}
            onChange={event => {
              const next = [...props.value]
              next[index] = { ...next[index], formula: event.target.value }
              props.onChange(next)
            }}
            placeholder="formula (e.g. ([Revenue]-[Cost])/[Revenue])"
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              data-testid={`ask-analysis-derived-label-${index}`}
              value={item.label ?? ''}
              onChange={event => {
                const next = [...props.value]
                next[index] = { ...next[index], label: event.target.value }
                props.onChange(next)
              }}
              placeholder="label (optional)"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 8px', flex: 1 }}
            />
            <button
              data-testid={`ask-analysis-derived-remove-${index}`}
              type="button"
              className="badge badge-danger"
              style={{ border: 'none', cursor: 'pointer', marginLeft: 8 }}
              onClick={() => props.onChange(props.value.filter((_, itemIndex) => itemIndex !== index))}
            >
              remove
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
