'use client'

import type { SemanticEditorFieldSpec, SemanticValidationIssue } from './api'

export type RelationDraftInput = {
  id: string
  sourceDimension: string
  sourceKey: string
  targetDimension: string
  targetKey: string
  joinType: 'inner' | 'left' | 'right'
  cardinality: '1:1' | '1:n' | 'n:1' | 'n:n'
  active: boolean
  label: string
  optionsText: string
}

type RelationPanelProps = {
  draft: RelationDraftInput
  existing: boolean
  dimensions: string[]
  fieldSpecs: SemanticEditorFieldSpec[]
  issues: SemanticValidationIssue[]
  busy?: boolean
  onChange: (patch: Partial<RelationDraftInput>) => void
  onApply: () => void
  onRemove: () => void
  onValidate: () => void
}

export function RelationPanel(props: RelationPanelProps) {
  return (
    <section className="card semantic-sync-card" data-testid="semantic-relation-panel">
      <div className="semantic-detail-row-wrap semantic-sync-row-head">
        <strong>Relation properties</strong>
        <span className={props.existing ? 'badge badge-ok' : 'badge badge-warn'}>
          {props.existing ? 'existing relation' : 'new relation'}
        </span>
      </div>

      <input
        data-testid="semantic-relation-id"
        value={props.draft.id}
        onChange={event => props.onChange({ id: event.target.value })}
        placeholder="Relation id"
        className="semantic-detail-input"
      />

      <div className="semantic-detail-form-grid">
        <select
          data-testid="semantic-relation-source-dimension"
          aria-label="Relation source dimension"
          value={props.draft.sourceDimension}
          onChange={event => props.onChange({ sourceDimension: event.target.value })}
          className="semantic-detail-input semantic-detail-select"
        >
          <option value="">Source dimension</option>
          {props.dimensions.map(item => (
            <option key={`source-${item}`} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          data-testid="semantic-relation-source-key"
          value={props.draft.sourceKey}
          onChange={event => props.onChange({ sourceKey: event.target.value })}
          placeholder="Source key"
          className="semantic-detail-input"
        />
        <select
          data-testid="semantic-relation-target-dimension"
          aria-label="Relation target dimension"
          value={props.draft.targetDimension}
          onChange={event => props.onChange({ targetDimension: event.target.value })}
          className="semantic-detail-input semantic-detail-select"
        >
          <option value="">Target dimension</option>
          {props.dimensions.map(item => (
            <option key={`target-${item}`} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          data-testid="semantic-relation-target-key"
          value={props.draft.targetKey}
          onChange={event => props.onChange({ targetKey: event.target.value })}
          placeholder="Target key"
          className="semantic-detail-input"
        />
      </div>

      <div className="semantic-detail-form-grid">
        <select
          data-testid="semantic-relation-join-type"
          aria-label="Relation join type"
          value={props.draft.joinType}
          onChange={event => props.onChange({ joinType: event.target.value as RelationDraftInput['joinType'] })}
          className="semantic-detail-input semantic-detail-select"
        >
          {['inner', 'left', 'right'].map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          data-testid="semantic-relation-cardinality"
          aria-label="Relation cardinality"
          value={props.draft.cardinality}
          onChange={event => props.onChange({ cardinality: event.target.value as RelationDraftInput['cardinality'] })}
          className="semantic-detail-input semantic-detail-select"
        >
          {['1:1', '1:n', 'n:1', 'n:n'].map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          data-testid="semantic-relation-label"
          value={props.draft.label}
          onChange={event => props.onChange({ label: event.target.value })}
          placeholder="Label (optional)"
          className="semantic-detail-input"
        />
        <label className="semantic-detail-check semantic-detail-mini">
          <input
            data-testid="semantic-relation-active"
            type="checkbox"
            checked={props.draft.active}
            onChange={event => props.onChange({ active: event.target.checked })}
          />
          active
        </label>
      </div>

      <textarea
        data-testid="semantic-relation-options"
        value={props.draft.optionsText}
        onChange={event => props.onChange({ optionsText: event.target.value })}
        rows={3}
        placeholder="Options JSON"
        className="semantic-detail-input semantic-detail-textarea semantic-detail-mono"
      />

      <div className="semantic-detail-row-wrap">
        <button
          data-testid="semantic-relation-apply"
          type="button"
          className="badge badge-ok semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onApply}
        >
          {props.busy ? 'Applying...' : props.existing ? 'Update relation' : 'Add relation'}
        </button>
        <button
          data-testid="semantic-relation-validate"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onValidate}
        >
          Run validate
        </button>
        <button
          data-testid="semantic-relation-remove"
          type="button"
          className="badge badge-danger semantic-detail-badge-btn"
          disabled={props.busy || !props.existing}
          onClick={props.onRemove}
        >
          Remove relation
        </button>
      </div>

      <details>
        <summary className="semantic-detail-summary semantic-detail-mini semantic-detail-muted">Relation field specs</summary>
        <div className="semantic-detail-table-wrap semantic-sync-table-wrap-gap">
          <table className="semantic-detail-table semantic-sync-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Required</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              {props.fieldSpecs.map(spec => (
                <tr key={spec.field}>
                  <td>{spec.field}</td>
                  <td>{spec.type}</td>
                  <td>{spec.required ? 'yes' : 'no'}</td>
                  <td>{spec.example ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {props.issues.length > 0 ? (
        <div data-testid="semantic-relation-issues" className="card semantic-sync-subcard">
          <strong className="semantic-detail-mini">Relation issues</strong>
          {props.issues.map((issue, index) => (
            <span key={`${issue.code}-${issue.fieldPath}-${index}`} className="semantic-detail-mini">
              [{issue.severity}] {issue.code} · {issue.fieldPath}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
