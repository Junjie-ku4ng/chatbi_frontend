'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createScenarioProfile, listScenarioProfiles, patchScenarioProfile } from '@/modules/governance/toolset/api'
import { ToolsetCompatNotice } from '@/modules/governance/toolset/compat-notice'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function ToolsetScenariosPage() {
  const [name, setName] = useState('default-chatbi')
  const [description, setDescription] = useState('Default scenario')
  const scenariosQuery = useQuery({
    queryKey: ['toolset-scenarios'],
    queryFn: listScenarioProfiles
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      createScenarioProfile({
        name,
        description,
        status: 'active',
        actions: ['get_available_cubes', 'get_cube_context', 'answer_question']
      }),
    onSuccess: async () => {
      await scenariosQuery.refetch()
    }
  })

  const disableMutation = useMutation({
    mutationFn: async (scenarioName: string) => patchScenarioProfile(scenarioName, { status: 'disabled' }),
    onSuccess: async () => {
      await scenariosQuery.refetch()
    }
  })

  const items = (scenariosQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section className="nexus-domain-stack">
        <header className="card nexus-domain-hero toolset-hero">
          <div className="nexus-domain-heading-row toolset-heading-row">
            <strong className="toolset-title">Toolset Scenarios</strong>
            <Link href="/toolset/learning" className="badge badge-warn">
              Learning
            </Link>
          </div>
          <ToolsetCompatNotice />
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createMutation.mutateAsync()
            }}
            className="nexus-domain-form-row toolset-form-row"
          >
            <input value={name} onChange={event => setName(event.target.value)} className="nexus-domain-input toolset-input" />
            <input
              value={description}
              onChange={event => setDescription(event.target.value)}
              className="nexus-domain-input toolset-input toolset-input-xl"
            />
            <button type="submit" className="nexus-domain-btn toolset-btn">
              Upsert
            </button>
          </form>
        </header>

        <LoadablePanel
          loading={scenariosQuery.isLoading}
          error={scenariosQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading toolset scenarios..."
        >
          <div className="nexus-domain-list toolset-list">
            {items.map(item => (
              <article key={String(item.name)} className="card nexus-domain-card toolset-item">
                <div className="toolset-item-main">
                  <strong>{String(item.name)}</strong>
                  <p className="toolset-item-meta">{String(item.description ?? '')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => disableMutation.mutate(String(item.name))}
                  className="nexus-domain-btn toolset-btn"
                >
                  Disable
                </button>
              </article>
            ))}
          </div>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
