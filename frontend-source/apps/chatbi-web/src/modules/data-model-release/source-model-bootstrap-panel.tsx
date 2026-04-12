'use client'

import type { SourceCatalogColumn, SourceCatalogTable } from './api'
import { NexusButton, NexusCard } from '@/modules/shared/ui/primitives'

type Props = {
  dataSourceId: string
  catalogTables: SourceCatalogTable[]
  catalogColumns: SourceCatalogColumn[]
  loadingCatalog?: boolean
  creatingDraft?: boolean
  onLoadCatalog: () => void
  onCreateDraft: () => void
}

export function SourceModelBootstrapPanel({
  dataSourceId,
  catalogTables,
  catalogColumns,
  loadingCatalog = false,
  creatingDraft = false,
  onLoadCatalog,
  onCreateDraft
}: Props) {
  return (
    <NexusCard data-testid="data-model-release-bootstrap-panel" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 18 }}>Bootstrap source modeling</strong>
        <span style={{ color: 'var(--muted)' }}>
          Start from <code>{dataSourceId}</code>, inspect the source catalog, then create a source-model draft on the same route.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <NexusButton
          data-testid="data-model-release-load-source-catalog"
          type="button"
          onClick={onLoadCatalog}
          disabled={loadingCatalog}
        >
          {loadingCatalog ? 'Loading source catalog...' : 'Load source catalog'}
        </NexusButton>
        <NexusButton
          data-testid="data-model-release-create-source-model-draft"
          type="button"
          variant="primary"
          onClick={onCreateDraft}
          disabled={creatingDraft || catalogTables.length === 0}
        >
          {creatingDraft ? 'Creating source-model draft...' : 'Create source-model draft'}
        </NexusButton>
      </div>

      <NexusCard data-testid="data-model-release-source-catalog-panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong>Source catalog</strong>
        {catalogTables.length === 0 ? (
          <span style={{ color: 'var(--muted)' }}>
            Load source catalog to inspect tables and columns before creating the draft.
          </span>
        ) : (
          <>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {catalogTables.map(table => (
                <li key={table.sourcePath}>
                  {table.sourcePath}
                  {typeof table.rowCount === 'number' ? ` · ${table.rowCount} rows` : ''}
                </li>
              ))}
            </ul>
            <span style={{ color: 'var(--muted)' }}>
              {catalogColumns.length} columns discovered across {catalogTables.length} tables.
            </span>
          </>
        )}
      </NexusCard>
    </NexusCard>
  )
}
