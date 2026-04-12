'use client'

import { NexusBadge, NexusCard } from '@/modules/shared/ui/primitives'

export type ReleaseJourneyStep = {
  key: 'data-source' | 'source-model' | 'semantic-draft' | 'deployment' | 'load-refresh' | 'ask-readiness'
  label: string
  status: 'ready' | 'current' | 'blocked'
  detail: string
}

export function ReleaseJourneyStepper({ steps }: { steps: ReleaseJourneyStep[] }) {
  return (
    <NexusCard data-testid="data-model-release-journey" style={{ padding: 20, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Journey</strong>
        <span style={{ color: 'var(--muted)' }}>Follow the canonical path from source access to ask readiness without losing route context.</span>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {steps.map((step, index) => {
          const tone = step.status === 'ready' ? 'ok' : step.status === 'current' ? 'brand' : 'neutral'
          return (
            <div
              key={step.key}
              data-testid={`data-model-release-journey-step-${step.key}`}
              style={{
                display: 'grid',
                gap: 8,
                padding: 14,
                borderRadius: 12,
                border: '1px solid var(--nx-shell-surface-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <strong>
                  {index + 1}. {step.label}
                </strong>
                <NexusBadge tone={tone}>{step.status}</NexusBadge>
              </div>
              <span style={{ color: 'var(--muted)' }}>{step.detail}</span>
            </div>
          )
        })}
      </div>
    </NexusCard>
  )
}
