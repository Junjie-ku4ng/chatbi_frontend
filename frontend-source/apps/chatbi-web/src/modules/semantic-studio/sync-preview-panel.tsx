import Link from 'next/link'
import { SemanticSyncPreview, SemanticSyncProfile } from './api'

type Props = {
  profile?: SemanticSyncProfile | null
  preview?: SemanticSyncPreview | null
  busy?: boolean
  canonicalReleaseHref: string
  onRefresh?: () => void
  onRunSync?: () => void
  onRequestDeleteConfirmation?: () => void
}

export function SyncPreviewPanel({
  profile,
  preview,
  busy = false,
  canonicalReleaseHref,
  onRefresh,
  onRunSync,
  onRequestDeleteConfirmation
}: Props) {
  const needsDeleteConfirmation = (preview?.summary.delete ?? 0) > 0

  return (
    <section className="card semantic-sync-card">
      <strong>PA Sync Preview</strong>
      <div className="semantic-sync-blockers" data-testid="semantic-sync-bridge-warning">
        <span className="badge badge-warn semantic-detail-fit">transition-only bridge</span>
        <span className="semantic-detail-muted semantic-detail-mini">
          Use{' '}
          <Link href={canonicalReleaseHref} data-testid="semantic-sync-bridge-link">
            Data Model Release
          </Link>{' '}
          for canonical deploy, load, refresh, and release operations.
        </span>
      </div>
      <div className="semantic-detail-row-wrap">
        <span className="badge badge-ok">mode: {profile?.mode ?? '-'}</span>
        <span className="badge badge-warn">target cube: {profile?.targetCube ?? '-'}</span>
        <span className={profile?.enabled === false ? 'badge badge-danger' : 'badge badge-ok'}>
          profile: {profile?.enabled === false ? 'disabled' : 'enabled'}
        </span>
      </div>
      {!preview ? (
        <span className="semantic-detail-muted">Run sync preview to inspect PA metadata operations.</span>
      ) : (
        <>
          <div className="semantic-detail-row-wrap">
            <span className="badge badge-ok" data-testid="semantic-sync-preview-hierarchy-writes">
              hierarchy writes: {preview.summary.hierarchyWrites}
            </span>
            <span className="badge badge-ok" data-testid="semantic-sync-preview-level-writes">
              level writes: {preview.summary.namedLevelWrites}
            </span>
            <span className="badge badge-ok" data-testid="semantic-sync-preview-relation-metadata-writes">
              relation metadata writes: {preview.summary.relationMetadataWrites}
            </span>
          </div>
          <div className="semantic-detail-row-wrap">
            <span className="badge badge-ok">create: {preview.summary.create}</span>
            <span className="badge badge-warn">update: {preview.summary.update}</span>
            <span className="badge badge-danger">delete: {preview.summary.delete}</span>
            <span className="badge badge-warn">relation-meta: {preview.summary.relationMeta}</span>
            <span className={preview.riskLevel === 'high' ? 'badge badge-danger' : 'badge badge-warn'}>
              risk: {preview.riskLevel}
            </span>
          </div>
          {preview.blockers.length > 0 ? (
            <div className="semantic-sync-blockers">
              {preview.blockers.map(blocker => (
                <span key={blocker} className="badge badge-danger semantic-detail-fit">
                  blocker: {blocker}
                </span>
              ))}
            </div>
          ) : null}
          {needsDeleteConfirmation ? (
            <span className="semantic-detail-muted semantic-detail-mini">
              Hard-delete bridge runs stay blocked until an operator generates a matching delete confirmation token.
            </span>
          ) : null}
          <div className="semantic-detail-table-wrap">
            <table data-testid="semantic-sync-preview-table" className="semantic-detail-table semantic-sync-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Object</th>
                  <th>Key</th>
                </tr>
              </thead>
              <tbody>
                {preview.operations.slice(0, 20).map((operation, index) => (
                  <tr key={`${operation.objectType}-${operation.objectKey}-${index}`}>
                    <td>{operation.opType}</td>
                    <td>{operation.objectType}</td>
                    <td>{operation.objectKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.operations.length > 20 ? (
            <span className="semantic-detail-muted semantic-detail-mini">
              Showing first 20 operations of {preview.operations.length}.
            </span>
          ) : null}
        </>
      )}
      <div className="semantic-detail-row-wrap">
        <button
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          data-testid="semantic-sync-preview-refresh"
          disabled={busy}
          onClick={onRefresh}
        >
          {busy ? 'Refreshing...' : 'Refresh preview'}
        </button>
        <button
          type="button"
          className="badge badge-ok semantic-detail-badge-btn"
          data-testid="semantic-sync-run-manual"
          disabled={busy || !preview}
          onClick={onRunSync}
        >
          Run sync now
        </button>
        {needsDeleteConfirmation ? (
          <button
            type="button"
            className="badge badge-danger semantic-detail-badge-btn"
            data-testid="semantic-sync-delete-confirm-open"
            disabled={busy}
            onClick={onRequestDeleteConfirmation}
          >
            Generate delete confirmation
          </button>
        ) : null}
      </div>
    </section>
  )
}
