import Link from 'next/link'
import { PaCubeDiscoveryItem, PaCubeMetadataProfile } from './api'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

type Props = {
  open: boolean
  dataSourceId: string
  query: string
  cubes: PaCubeDiscoveryItem[]
  cubeBusy?: boolean
  cubeError?: unknown
  selectedCube?: string
  metadata?: PaCubeMetadataProfile | null
  metadataBusy?: boolean
  metadataError?: unknown
  onboardingBusy?: boolean
  reviewHref?: string
  onClose?: () => void
  onChangeDataSourceId?: (value: string) => void
  onChangeQuery?: (value: string) => void
  onSearch?: () => void
  onSelectCube?: (cube: string) => void
  onLoadMetadata?: () => void
  onOnboard?: () => void
}

export function OnboardFromPADrawer({
  open,
  dataSourceId,
  query,
  cubes,
  cubeBusy = false,
  cubeError,
  selectedCube,
  metadata,
  metadataBusy = false,
  metadataError,
  onboardingBusy = false,
  reviewHref,
  onClose,
  onChangeDataSourceId,
  onChangeQuery,
  onSearch,
  onSelectCube,
  onLoadMetadata,
  onOnboard
}: Props) {
  if (!open) {
    return null
  }

  const lockedDataSource = !onChangeDataSourceId && dataSourceId.trim().length > 0

  return (
    <section className="card semantic-sync-card">
      <div className="semantic-sync-head">
        <strong>Onboard existing PA cube</strong>
        <button type="button" className="badge badge-warn semantic-detail-badge-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="semantic-sync-onboard-grid">
        {lockedDataSource ? (
          <div
            data-testid="semantic-sync-onboard-datasource-badge"
            className="semantic-detail-row"
            style={{ gridColumn: '1 / -1', gap: 8, flexWrap: 'wrap' }}
          >
            <span className="badge badge-ok semantic-detail-fit">Data source</span>
            <span className="badge badge-warn semantic-detail-fit">{dataSourceId}</span>
            <span className="semantic-detail-muted semantic-detail-mini">Using the source context already attached to this semantic model.</span>
          </div>
        ) : (
          <input
            data-testid="semantic-sync-onboard-datasource"
            value={dataSourceId}
            onChange={event => onChangeDataSourceId?.(event.target.value)}
            placeholder="Data source id"
            className="semantic-detail-input semantic-detail-wide"
          />
        )}
        <div className="semantic-detail-row">
          <input
            data-testid="semantic-sync-onboard-query"
            value={query}
            onChange={event => onChangeQuery?.(event.target.value)}
            placeholder="Search cube by name"
            className="semantic-detail-input semantic-detail-grow"
          />
          <button
            type="button"
            className="badge badge-ok semantic-detail-badge-btn"
            data-testid="semantic-sync-onboard-search"
            disabled={cubeBusy || !dataSourceId.trim()}
            onClick={onSearch}
          >
            {cubeBusy ? 'Loading...' : 'Load cubes'}
          </button>
        </div>
      </div>
      <div className="semantic-sync-onboard-cubes">
        <LoadablePanel
          loading={cubeBusy}
          error={cubeError}
          empty={cubes.length === 0}
          loadingLabel="Loading cubes..."
          emptyLabel="No cubes loaded."
          retry={onSearch}
        >
          {cubes.map(item => (
            <button
              key={item.name}
              type="button"
              data-testid={`semantic-sync-onboard-cube-${item.name}`}
              className={`semantic-detail-badge-btn semantic-detail-align-left ${selectedCube === item.name ? 'badge badge-ok' : 'badge badge-warn'}`}
              onClick={() => onSelectCube?.(item.name)}
            >
              {item.name} ({item.dimensions.length} dims)
            </button>
          ))}
        </LoadablePanel>
      </div>
      <div className="semantic-detail-row">
        <button
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          data-testid="semantic-sync-onboard-metadata"
          disabled={metadataBusy || !selectedCube}
          onClick={onLoadMetadata}
        >
          {metadataBusy ? 'Loading metadata...' : 'Load metadata'}
        </button>
        <button
          type="button"
          className="badge badge-ok semantic-detail-badge-btn"
          data-testid="semantic-sync-onboard-apply"
          disabled={onboardingBusy || !selectedCube || !metadata}
          onClick={onOnboard}
        >
          {onboardingBusy ? 'Onboarding...' : 'Create readonly binding model'}
        </button>
      </div>
      <LoadablePanel
        loading={metadataBusy}
        error={metadataError}
        empty={!metadata}
        loadingLabel="Loading metadata..."
        emptyLabel={selectedCube ? 'Load metadata for the selected cube.' : 'Select a cube to load metadata.'}
        retry={selectedCube ? onLoadMetadata : undefined}
      >
        {metadata?.synthesizedLevels && metadata.synthesizedLevels.length > 0 ? (
          <div
            data-testid="semantic-sync-onboard-synthesized-warning"
            className="semantic-detail-row"
            style={{ marginBottom: 8, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
          >
            <span className="badge badge-warn semantic-detail-fit">Synthesized semantic levels</span>
            <span className="semantic-detail-muted semantic-detail-mini">
              Review synthesized level semantics in{' '}
              {reviewHref ? (
                <Link href={reviewHref}>Data Model Release</Link>
              ) : (
                'Data Model Release'
              )}{' '}
              before publish.
            </span>
            {metadata.synthesizedLevels.slice(0, 2).map(item => (
              <span key={`${item.hierarchy}:${item.executionLevel}`} className="badge badge-ok semantic-detail-fit">
                {item.semanticLevelName}
              </span>
            ))}
          </div>
        ) : null}
        <div className="semantic-sync-metadata">
          <span className="badge badge-ok">metricDimension: {metadata?.metricDimension}</span>
          <span className="badge badge-warn">dimensions: {metadata?.dimensions.length}</span>
          <span className="badge badge-warn">measures: {metadata?.measures.length}</span>
        </div>
      </LoadablePanel>
    </section>
  )
}
