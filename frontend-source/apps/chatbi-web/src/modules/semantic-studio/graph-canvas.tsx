'use client'

import { useMemo, useState } from 'react'
import type { SemanticEditorGraphState } from './api'

type GraphCanvasProps = {
  graph?: SemanticEditorGraphState
  selectedRelationId?: string
  onSelectRelation: (relationId: string) => void
  onCreateRelationDraft: (input: { sourceDimension: string; targetDimension: string }) => void
}

export function GraphCanvas(props: GraphCanvasProps) {
  const dimensions = useMemo(
    () => (props.graph?.nodes ?? []).filter(node => node.nodeType === 'dimension'),
    [props.graph?.nodes]
  )
  const [sourceDimension, setSourceDimension] = useState('')
  const [targetDimension, setTargetDimension] = useState('')

  const selected = props.graph?.edges.find(edge => edge.id === props.selectedRelationId)

  return (
    <section className="card semantic-graph-surface" data-testid="semantic-graph-canvas">
      <div className="semantic-graph-meta">
        <strong>Join Graph</strong>
        <span className="badge badge-warn">nodes: {dimensions.length}</span>
        <span className="badge badge-warn">edges: {(props.graph?.edges ?? []).length}</span>
      </div>

      <div className="semantic-graph-node-grid">
        {dimensions.length === 0 ? (
          <span data-testid="semantic-graph-empty" className="semantic-graph-node-empty">
            No dimensions available for relation graph.
          </span>
        ) : (
          dimensions.map(node => (
            <button
              key={node.id}
              data-testid={`semantic-graph-node-${node.key}`}
              type="button"
              className="badge badge-ok semantic-detail-badge-btn semantic-graph-node-button"
              onClick={() => {
                if (!sourceDimension) {
                  setSourceDimension(node.key)
                  return
                }
                setTargetDimension(node.key)
              }}
            >
              {node.label}
            </button>
          ))
        )}
      </div>

      <div className="semantic-graph-toolbar-row">
        <select
          data-testid="semantic-graph-source-dimension"
          value={sourceDimension}
          onChange={event => setSourceDimension(event.target.value)}
          className="semantic-graph-toolbar-select"
        >
          <option value="">Source dimension</option>
          {dimensions.map(node => (
            <option key={`source-${node.id}`} value={node.key}>
              {node.label}
            </option>
          ))}
        </select>
        <select
          data-testid="semantic-graph-target-dimension"
          value={targetDimension}
          onChange={event => setTargetDimension(event.target.value)}
          className="semantic-graph-toolbar-select"
        >
          <option value="">Target dimension</option>
          {dimensions.map(node => (
            <option key={`target-${node.id}`} value={node.key}>
              {node.label}
            </option>
          ))}
        </select>
        <button
          data-testid="semantic-graph-create-relation"
          type="button"
          className="badge badge-ok semantic-graph-toolbar-action"
          disabled={!sourceDimension || !targetDimension}
          onClick={() => {
            props.onCreateRelationDraft({
              sourceDimension,
              targetDimension
            })
          }}
        >
          Create relation draft
        </button>
      </div>

      <div className="semantic-graph-table-wrap">
        <table className="semantic-graph-table">
          <thead>
            <tr>
              <th>Relation</th>
              <th>Join</th>
              <th>Cardinality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(props.graph?.edges ?? []).map(edge => (
              <tr
                key={edge.id}
                data-testid={`semantic-graph-edge-${edge.id}`}
                className={`semantic-graph-table-row ${props.selectedRelationId === edge.id || selected?.id === edge.id ? 'is-selected' : ''}`}
                onClick={() => props.onSelectRelation(edge.id)}
              >
                <td>
                  {edge.sourceDimension}.{edge.sourceKey} {'->'} {edge.targetDimension}.{edge.targetKey}
                </td>
                <td>{edge.joinType}</td>
                <td>{edge.cardinality}</td>
                <td>{edge.status ?? 'active'}</td>
              </tr>
            ))}
            {(props.graph?.edges ?? []).length === 0 ? (
              <tr>
                <td className="semantic-graph-empty" colSpan={4}>
                  No relations yet. Pick source/target dimensions to start.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
