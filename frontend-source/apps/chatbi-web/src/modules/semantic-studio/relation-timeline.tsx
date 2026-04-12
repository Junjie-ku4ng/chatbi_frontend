'use client'

import { useState } from 'react'
import type { SemanticRelationTimelineItem } from './api'

type RelationTimelineProps = {
  items: SemanticRelationTimelineItem[]
  total: number
  limit: number
  offset: number
  busy?: boolean
  onFilter: (input: { relationId?: string; actor?: string }) => void
  onRefresh: () => void
}

export function RelationTimeline(props: RelationTimelineProps) {
  const [relationId, setRelationId] = useState('')
  const [actor, setActor] = useState('')

  return (
    <section className="card semantic-sync-card" data-testid="semantic-relation-timeline">
      <div className="semantic-detail-row-wrap semantic-sync-row-head">
        <strong>Relation Timeline</strong>
        <span className="badge badge-warn">total: {props.total}</span>
        <span className="badge badge-ok">
          page: {props.offset + 1}-{Math.min(props.offset + props.limit, props.total)}
        </span>
      </div>

      <div className="semantic-detail-row-wrap">
        <input
          data-testid="semantic-relation-timeline-relation-filter"
          value={relationId}
          onChange={event => setRelationId(event.target.value)}
          placeholder="relationId"
          className="semantic-detail-input semantic-detail-wide"
        />
        <input
          data-testid="semantic-relation-timeline-actor-filter"
          value={actor}
          onChange={event => setActor(event.target.value)}
          placeholder="actor"
          className="semantic-detail-input semantic-detail-min"
        />
        <button
          data-testid="semantic-relation-timeline-apply"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={() =>
            props.onFilter({
              relationId: relationId.trim() || undefined,
              actor: actor.trim() || undefined
            })
          }
        >
          Apply filter
        </button>
        <button
          data-testid="semantic-relation-timeline-refresh"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="semantic-detail-table-wrap">
        <table data-testid="semantic-relation-timeline-table" className="semantic-detail-table semantic-sync-table">
          <thead>
            <tr>
              <th>Relation</th>
              <th>Operation</th>
              <th>Status</th>
              <th>Actor</th>
              <th>Time</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {props.items.map(item => (
              <tr key={item.id} data-testid={`semantic-relation-timeline-item-${item.id}`}>
                <td>{item.relationId}</td>
                <td>{item.operationType}</td>
                <td>{item.status}</td>
                <td>{item.actor ?? '-'}</td>
                <td>{item.createdAt}</td>
                <td>
                  {item.summary?.code ?? '-'}
                  {Array.isArray(item.summary?.changedFields) && item.summary.changedFields.length > 0
                    ? ` (${item.summary.changedFields.join(', ')})`
                    : ''}
                </td>
              </tr>
            ))}
            {props.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="semantic-graph-empty">
                  No relation operations.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
