'use client'

import { useMemo, useState } from 'react'
import type { SemanticRelationEdge, SemanticRelationTemplate } from './api'

type RelationTemplateDrawerProps = {
  templates: SemanticRelationTemplate[]
  relationSource: SemanticRelationEdge[]
  busy?: boolean
  onRefresh: () => void
  onCreate: (input: {
    name: string
    description?: string
    relations: SemanticRelationEdge[]
  }) => Promise<void> | void
  onUpdate: (
    templateId: string,
    input: {
      name?: string
      description?: string
      status?: 'active' | 'disabled'
    }
  ) => Promise<void> | void
  onApply: (templateId: string, mode: 'append' | 'replace') => Promise<void> | void
}

export function RelationTemplateDrawer(props: RelationTemplateDrawerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'disabled'>('active')
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append')

  const selectedTemplate = useMemo(
    () => props.templates.find(template => String(template.id) === selectedTemplateId) ?? null,
    [props.templates, selectedTemplateId]
  )

  const createDisabled = props.busy || !name.trim() || props.relationSource.length === 0

  return (
    <section className="card semantic-sync-card" data-testid="semantic-relation-template-drawer">
      <div className="semantic-detail-row-wrap semantic-sync-row-head">
        <strong>Template Library</strong>
        <span className="badge badge-warn">templates: {props.templates.length}</span>
        <span className="badge badge-ok">relations: {props.relationSource.length}</span>
        <button
          data-testid="semantic-template-refresh"
          type="button"
          className="badge badge-warn semantic-detail-badge-btn"
          disabled={props.busy}
          onClick={props.onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="semantic-detail-panel">
        <input
          data-testid="semantic-template-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Template name"
          className="semantic-detail-input"
        />
        <input
          data-testid="semantic-template-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="semantic-detail-input"
        />
        <button
          data-testid="semantic-template-create"
          type="button"
          className="badge badge-ok semantic-detail-badge-btn semantic-detail-fit"
          disabled={createDisabled}
          onClick={() =>
            props.onCreate({
              name: name.trim(),
              description: description.trim() || undefined,
              relations: props.relationSource
            })
          }
        >
          {props.busy ? 'Working...' : 'Create from current relations'}
        </button>
      </div>

      <div className="semantic-detail-panel">
        <strong className="semantic-detail-mini">Templates</strong>
        {props.templates.length === 0 ? (
          <span className="semantic-detail-muted semantic-detail-mini">No templates yet.</span>
        ) : (
          <div className="semantic-sync-template-list">
            {props.templates.map(template => {
              const active = String(template.id) === selectedTemplateId
              return (
                <button
                  key={template.id}
                  data-testid={`semantic-template-item-${template.id}`}
                  type="button"
                  className={`semantic-detail-badge-btn semantic-detail-align-left ${active ? 'badge badge-ok' : 'badge badge-warn'}`}
                  onClick={() => {
                    setSelectedTemplateId(String(template.id))
                    setName(template.name)
                    setDescription(template.description ?? '')
                    setStatus(template.status)
                  }}
                >
                  {template.name} · {template.status} · {template.relations.length} relations
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedTemplate ? (
        <div data-testid="semantic-template-selected" className="card semantic-sync-subcard">
          <strong className="semantic-detail-mini">{selectedTemplate.name}</strong>
          <div className="semantic-detail-row-wrap">
            <select
              data-testid="semantic-template-status"
              aria-label="Relation template status"
              value={status}
              onChange={event => setStatus(event.target.value as 'active' | 'disabled')}
              className="semantic-detail-input semantic-detail-select"
            >
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
            <button
              data-testid="semantic-template-update"
              type="button"
              className="badge badge-warn semantic-detail-badge-btn"
              disabled={props.busy}
              onClick={() =>
                props.onUpdate(selectedTemplate.id, {
                  name: name.trim() || undefined,
                  description: description.trim() || undefined,
                  status
                })
              }
            >
              Update template
            </button>
          </div>

          <div className="semantic-detail-row-wrap">
            <select
              data-testid="semantic-template-apply-mode"
              aria-label="Relation template apply mode"
              value={applyMode}
              onChange={event => setApplyMode(event.target.value as 'append' | 'replace')}
              className="semantic-detail-input semantic-detail-select"
            >
              <option value="append">append</option>
              <option value="replace">replace</option>
            </select>
            <button
              data-testid="semantic-template-apply"
              type="button"
              className="badge badge-ok semantic-detail-badge-btn"
              disabled={props.busy}
              onClick={() => props.onApply(selectedTemplate.id, applyMode)}
            >
              Apply template
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
