'use client'

export function AdvancedJsonPanel({
  title = 'Advanced JSON',
  value,
  testId
}: {
  title?: string
  value: unknown
  testId?: string
}) {
  return (
    <details style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>{title}</summary>
      <pre
        data-testid={testId}
        style={{
          margin: '6px 0 0',
          maxHeight: 220,
          overflow: 'auto',
          background: '#f8f6f0',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 10,
          fontSize: 12
        }}
      >
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </details>
  )
}
