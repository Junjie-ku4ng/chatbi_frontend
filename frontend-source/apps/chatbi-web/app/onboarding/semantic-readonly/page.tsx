'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  getOnboardingPACubeMetadata,
  isOnboardingEnabled,
  listOnboardingPACubes,
  onboardReadonlySemanticModel,
  type OnboardingCubeMetadata
} from '@/modules/onboarding/api'
import { buildDataModelReleaseHref } from '@/modules/data-model-release/route-href'
import { listDataSources } from '@/modules/settings/api'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

type CubeItem = {
  name: string
  dimensions: string[]
}

export default function OnboardingSemanticReadonlyPage() {
  const enabled = isOnboardingEnabled()
  const [dataSourceId, setDataSourceId] = useState('')
  const [query, setQuery] = useState('')
  const [cubes, setCubes] = useState<CubeItem[]>([])
  const [selectedCube, setSelectedCube] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<OnboardingCubeMetadata | null>(null)
  const [resultModelId, setResultModelId] = useState<string | null>(null)
  const [cubeSearchRequested, setCubeSearchRequested] = useState(false)
  const dataSourcesQuery = useQuery({
    queryKey: ['onboarding-data-sources'],
    queryFn: () => listDataSources()
  })
  const dataSourceItems = dataSourcesQuery.data?.items ?? []

  useEffect(() => {
    if (dataSourceId.trim() || dataSourceItems.length !== 1) {
      return
    }
    setDataSourceId(dataSourceItems[0]?.id ?? '')
  }, [dataSourceId, dataSourceItems])

  const cubesMutation = useMutation({
    mutationFn: async () => listOnboardingPACubes({ dataSourceId: dataSourceId.trim(), query: query.trim(), limit: 20 }),
    onSuccess: payload => {
      setCubes(payload.items)
      if (payload.items.length === 0) {
        setSelectedCube(null)
      }
      setMetadata(null)
      setResultModelId(null)
    }
  })

  const metadataMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCube) throw new Error('No cube selected')
      return getOnboardingPACubeMetadata({ dataSourceId: dataSourceId.trim(), cube: selectedCube })
    },
    onSuccess: payload => {
      setMetadata(payload)
      setResultModelId(null)
    }
  })

  const onboardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCube) throw new Error('No cube selected')
      return onboardReadonlySemanticModel({
        dataSourceId: dataSourceId.trim(),
        cube: selectedCube,
        name: `readonly-${selectedCube}`
      })
    },
    onSuccess: payload => {
      setResultModelId(payload.model.id)
    }
  })

  const cubeButtonsDisabled = useMemo(() => !enabled || cubes.length === 0, [enabled, cubes.length])
  const canonicalReleaseHref = resultModelId
    ? buildDataModelReleaseHref({
        dataSourceId: dataSourceId.trim() || null,
        modelId: resultModelId
      })
    : null

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20, display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 26 }}>Semantic Readonly Onboarding</strong>
        <span style={{ color: 'var(--muted)' }}>Create readonly binding semantic models from existing PA cubes.</span>
        {!enabled ? (
          <span className="badge badge-danger" style={{ width: 'fit-content' }}>
            Onboarding feature is disabled
          </span>
        ) : null}
      </section>

      <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(180px,220px) minmax(220px,1fr)' }}>
          {dataSourceItems.length > 0 ? (
            <select
              data-testid="onboarding-datasource-select"
              value={dataSourceId}
              onChange={event => setDataSourceId(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
            >
              <option value="">Select data source</option>
              {dataSourceItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name || item.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              data-testid="onboarding-datasource"
              value={dataSourceId}
              onChange={event => setDataSourceId(event.target.value)}
              placeholder="Data source id"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              data-testid="onboarding-query"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search cube by name"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', flex: 1 }}
            />
            <button
              data-testid="onboarding-load-cubes"
              type="button"
              disabled={!enabled || cubesMutation.isPending || !dataSourceId.trim()}
              onClick={() => {
                setCubeSearchRequested(true)
                cubesMutation.mutate()
              }}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
            >
              {cubesMutation.isPending ? 'Loading...' : 'Load cubes'}
            </button>
          </div>
        </div>
        {dataSourceItems.length > 0 ? (
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            Canonical onboarding uses the registered data-source registry instead of manual id entry when available.
          </span>
        ) : null}

        <LoadablePanel
          loading={cubesMutation.isPending}
          error={cubesMutation.error}
          empty={cubeSearchRequested && !cubesMutation.isPending && !cubesMutation.error && cubes.length === 0}
          loadingLabel="Loading cubes..."
          emptyLabel="No cubes loaded."
          retry={dataSourceId.trim() ? () => cubesMutation.mutate() : undefined}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            {cubes.map(item => (
              <button
                key={item.name}
                data-testid={`onboarding-cube-${item.name}`}
                type="button"
                disabled={cubeButtonsDisabled}
                onClick={() => {
                  setSelectedCube(item.name)
                  setMetadata(null)
                }}
                className={selectedCube === item.name ? 'badge badge-ok' : 'badge badge-warn'}
                style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                {item.name} ({item.dimensions.length} dims)
              </button>
            ))}
          </div>
        </LoadablePanel>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            data-testid="onboarding-load-metadata"
            type="button"
            disabled={!enabled || metadataMutation.isPending || !selectedCube}
            onClick={() => metadataMutation.mutate()}
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
          >
            {metadataMutation.isPending ? 'Loading metadata...' : 'Load metadata'}
          </button>
          <button
            data-testid="onboarding-apply"
            type="button"
            disabled={!enabled || onboardMutation.isPending || !selectedCube || !metadata}
            onClick={() => onboardMutation.mutate()}
            style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: '#fff' }}
          >
            {onboardMutation.isPending ? 'Onboarding...' : 'Create readonly binding model'}
          </button>
        </div>

        <LoadablePanel
          loading={metadataMutation.isPending}
          error={metadataMutation.error}
          empty={!metadataMutation.isPending && !metadataMutation.error && !metadata}
          loadingLabel="Loading metadata..."
          emptyLabel={selectedCube ? 'Load metadata for the selected cube.' : 'Select a cube to load metadata.'}
          retry={selectedCube ? () => metadataMutation.mutate() : undefined}
        >
          {metadata ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <span data-testid="onboarding-metadata-metric" className="badge badge-ok" style={{ width: 'fit-content' }}>
                {metadata.metricDimension}
              </span>
              <span className="badge badge-warn" style={{ width: 'fit-content' }}>
                dimensions: {metadata.dimensions.length}
              </span>
              <span className="badge badge-warn" style={{ width: 'fit-content' }}>
                measures: {metadata.measures.length}
              </span>
            </div>
          ) : null}
        </LoadablePanel>

        {resultModelId ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span data-testid="onboarding-result-model" className="badge badge-ok" style={{ width: 'fit-content' }}>
              {resultModelId}
            </span>
            {canonicalReleaseHref ? (
              <Link
                data-testid="onboarding-open-canonical-release"
                href={canonicalReleaseHref}
                className="badge badge-warn"
                style={{ width: 'fit-content', textDecoration: 'none' }}
              >
                Open in Data Model Release
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}
