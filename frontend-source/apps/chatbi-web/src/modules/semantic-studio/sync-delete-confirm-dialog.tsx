type Props = {
  open: boolean
  previewDigest?: string
  schemaVersion?: number
  token?: string
  expiresAt?: string
  busy?: boolean
  onGenerate?: () => void
  onClose?: () => void
}

export function SyncDeleteConfirmDialog({
  open,
  previewDigest,
  schemaVersion,
  token,
  expiresAt,
  busy = false,
  onGenerate,
  onClose
}: Props) {
  if (!open) {
    return null
  }
  return (
    <section className="card semantic-sync-card semantic-sync-delete-card">
      <strong>Delete confirmation required</strong>
      <span className="semantic-detail-muted semantic-detail-mini">
        This preview contains delete operations. Generate a confirmation token before sync or publish.
      </span>
      <div className="semantic-detail-row-wrap">
        <span className="badge badge-warn">schemaVersion: {schemaVersion ?? '-'}</span>
        <span className="badge badge-warn">previewDigest: {previewDigest ?? '-'}</span>
      </div>
      {token ? (
        <div className="semantic-sync-delete-token">
          <span className="badge badge-ok" data-testid="semantic-sync-delete-token">
            token ready
          </span>
          <code className="semantic-sync-code">{token}</code>
          <span className="semantic-detail-muted semantic-detail-mini">expires: {expiresAt ?? '-'}</span>
        </div>
      ) : null}
      <div className="semantic-detail-row">
        <button
          type="button"
          className="badge badge-danger semantic-detail-badge-btn"
          data-testid="semantic-sync-delete-generate"
          disabled={busy || !previewDigest || !schemaVersion}
          onClick={onGenerate}
        >
          {busy ? 'Generating...' : 'Generate token'}
        </button>
        <button
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </section>
  )
}
