'use client'

import type { SemanticEditorImpactSummary, SemanticPublishGateBlockerDetail } from './api'

type ImpactGatePanelProps = {
  impact: SemanticEditorImpactSummary | null
  previewImpact: SemanticEditorImpactSummary | null
  gateBlockers: string[]
  gateBlockerDetails?: SemanticPublishGateBlockerDetail[]
  busy?: boolean
  publishBusy?: boolean
  onRefreshImpact: () => void
  onPublish: () => void
  onValidate: () => void
  onFocusRelationIssue: () => void
}

export function ImpactGatePanel(props: ImpactGatePanelProps) {
  const resolvedImpact = props.previewImpact ?? props.impact
  const resolvedDetails = props.gateBlockerDetails && props.gateBlockerDetails.length > 0
    ? props.gateBlockerDetails
    : resolvedImpact?.gateBlockerDetails ?? []

  const copyGuide = async (detail: SemanticPublishGateBlockerDetail) => {
    const text = `[${detail.code}] owner: ${detail.ownerHint}\n${detail.resolutionGuide}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // noop, user still sees guidance text
    }
  }

  return (
    <section className="card semantic-sync-card" data-testid="semantic-impact-gate-panel">
      <div className="semantic-detail-row-wrap semantic-sync-row-head">
        <strong>Impact & Publish Gate</strong>
        <span className="badge badge-warn">risk: {resolvedImpact?.riskLevel ?? '-'}</span>
        <span className="badge badge-ok">queries: {resolvedImpact?.affectedQueries ?? 0}</span>
        <span className="badge badge-ok">stories: {resolvedImpact?.affectedStories ?? 0}</span>
        <span className="badge badge-ok">indicators: {resolvedImpact?.affectedIndicators ?? 0}</span>
      </div>

      <div className="semantic-detail-row-wrap">
        <button
          data-testid="semantic-impact-refresh"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onRefreshImpact}
        >
          {props.busy ? 'Refreshing...' : 'Refresh impact'}
        </button>
        <button
          data-testid="semantic-impact-run-validate"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onValidate}
        >
          Run validate
        </button>
        <button
          data-testid="semantic-impact-publish"
          type="button"
          className="badge badge-danger semantic-detail-badge-btn"
          disabled={props.publishBusy}
          onClick={props.onPublish}
        >
          {props.publishBusy ? 'Publishing...' : 'Publish draft'}
        </button>
      </div>

      <div data-testid="semantic-impact-blockers" className="card semantic-sync-subcard">
        <strong className="semantic-detail-mini">Gate blockers</strong>
        {props.gateBlockers.length === 0 && (resolvedImpact?.blockers?.length ?? 0) === 0 ? (
          <span className="semantic-detail-muted semantic-detail-mini">No blockers.</span>
        ) : (
          <>
            {(props.gateBlockers.length > 0 ? props.gateBlockers : resolvedImpact?.blockers ?? []).map(blocker => {
              const detail = resolvedDetails.find(item => item.code === blocker)
              return (
                <div key={blocker} data-testid={`semantic-impact-blocker-${blocker}`} className="semantic-sync-detail-blocker">
                  <span className="semantic-detail-mini">{blocker}</span>
                  {detail ? (
                    <div className="card semantic-sync-detail-card">
                      <span className="semantic-detail-mini">owner: {detail.ownerHint}</span>
                      <span className="semantic-detail-mini">{detail.resolutionGuide}</span>
                      <button
                        type="button"
                        data-testid={`semantic-impact-blocker-copy-${detail.code}`}
                        className="badge badge-warn semantic-detail-badge-btn semantic-detail-fit"
                        onClick={() => copyGuide(detail)}
                      >
                        Copy guidance
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
            <button
              data-testid="semantic-impact-focus-relation"
              type="button"
              className="badge badge-warn semantic-detail-badge-btn semantic-detail-fit"
              onClick={props.onFocusRelationIssue}
            >
              Locate relation issue
            </button>
          </>
        )}
      </div>
    </section>
  )
}
