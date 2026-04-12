'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function SemanticStudioPage() {
  const modelsQuery = useQuery({
    queryKey: ['semantic-studio-models'],
    queryFn: listSemanticModels
  })

  const models = modelsQuery.data ?? []

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section className="nexus-domain-stack">
        <header className="card nexus-domain-hero semantic-landing-hero">
          <strong className="semantic-landing-title">Semantic Studio</strong>
          <span className="semantic-landing-subtitle">
            Select a semantic model to run editor operations, validation and preview.
          </span>
        </header>

        <LoadablePanel
          loading={modelsQuery.isLoading}
          error={modelsQuery.error}
          empty={models.length === 0}
          loadingLabel="Loading semantic models..."
          emptyLabel="No semantic models available for Semantic Studio."
          retry={() => {
            void modelsQuery.refetch()
          }}
        >
          <section className="nexus-domain-list semantic-landing-list">
            {models.map(model => (
              <article key={model.id} className="card nexus-domain-card semantic-landing-item">
                <div className="semantic-landing-item-main">
                  <strong>{model.name}</strong>
                  <span className="semantic-landing-item-meta">
                    id: {model.id} · cube: {model.cube ?? '-'}
                  </span>
                </div>
                <div className="nexus-domain-row-actions semantic-landing-item-actions">
                  <Link className="badge badge-warn" href={`/models/${model.id}`}>
                    Governance
                  </Link>
                  <Link className="badge badge-ok" href={`/semantic-studio/${model.id}`}>
                    Open Studio
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
