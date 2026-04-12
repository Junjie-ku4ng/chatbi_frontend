import Link from 'next/link'
import { SemanticSyncRun } from './api'

type Props = {
  runs: SemanticSyncRun[]
  total: number
  busy?: boolean
  canonicalReleaseHref: string
  onRefresh?: () => void
  onRetry?: (runId: string) => void
}

function summarizePreviewDigest(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '-'
  }
  return value.slice(0, 12)
}

export function SyncRunTimeline({ runs, total, busy = false, canonicalReleaseHref, onRefresh, onRetry }: Props) {
  return (
    <section className="card semantic-sync-card">
      <div className="semantic-sync-head">
        <strong>Sync run timeline</strong>
        <div className="semantic-detail-row">
          <span className="badge badge-warn">runs: {total}</span>
          <button
            type="button"
            className="badge badge-ok semantic-detail-badge-btn"
            data-testid="semantic-sync-runs-refresh"
            disabled={busy}
            onClick={onRefresh}
          >
            {busy ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="semantic-sync-blockers" data-testid="semantic-sync-run-timeline-warning">
        <span className="badge badge-warn semantic-detail-fit">bridge: transition_only</span>
        <span className="semantic-detail-muted semantic-detail-mini">
          Canonical deploy, load, refresh, and release work now lives in{' '}
          <Link href={canonicalReleaseHref}>Data Model Release</Link>.
        </span>
      </div>

      {runs.length === 0 ? (
        <span className="semantic-detail-muted">No sync runs yet.</span>
      ) : (
        <div className="semantic-detail-table-wrap">
          <table data-testid="semantic-sync-runs-table" className="semantic-detail-table semantic-sync-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Bridge</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Error</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>{run.trigger}</td>
                  <td>
                    <span className={run.status === 'succeeded' ? 'badge badge-ok' : run.status === 'failed' ? 'badge badge-danger' : 'badge badge-warn'}>
                      {run.status}
                    </span>
                  </td>
                  <td data-testid={`semantic-sync-run-bridge-${run.id}`}>
                    <div className="semantic-detail-row-wrap">
                      <span className="badge badge-warn semantic-detail-fit">
                        mode: {typeof run.metadata?.mode === 'string' ? run.metadata.mode : '-'}
                      </span>
                      <span className="badge badge-warn semantic-detail-fit">
                        state: {typeof run.metadata?.bridgeState === 'string' ? run.metadata.bridgeState : '-'}
                      </span>
                      <span className="badge badge-ok semantic-detail-fit">
                        digest: {summarizePreviewDigest(run.metadata?.previewDigest)}
                      </span>
                      {run.metadata?.skipped ? (
                        <span className="badge badge-danger semantic-detail-fit">
                          skip: {typeof run.metadata?.skipReason === 'string' ? run.metadata.skipReason : 'bridge_skip'}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{run.startedAt ?? '-'}</td>
                  <td>{run.finishedAt ?? '-'}</td>
                  <td>
                    {run.errorCode ?? '-'}
                    {run.errorCode === 'sync_delete_confirmation_required' ? (
                      <div className="semantic-detail-muted semantic-detail-mini">delete confirmation required</div>
                    ) : null}
                  </td>
                  <td>
                    {run.status === 'failed' ? (
                      <button
                        type="button"
                        data-testid={`semantic-sync-run-retry-${run.id}`}
                        className="badge badge-danger semantic-detail-badge-btn"
                        onClick={() => onRetry?.(run.id)}
                      >
                        Retry
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
