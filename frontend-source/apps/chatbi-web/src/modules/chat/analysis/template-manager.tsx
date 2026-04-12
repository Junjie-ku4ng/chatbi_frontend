'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { applyAnalysisTemplate, createAnalysisTemplate, listAnalysisTemplates } from './api'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'

export function AnalysisTemplateManager(props: {
  modelId: string
  queryLogId: string
  currentPatch: Record<string, unknown>
  analysisAction?: string
  onTemplateApplied: (result: Record<string, unknown>) => Promise<void> | void
}) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const templatesQuery = useQuery({
    queryKey: ['ask-analysis-templates', props.modelId],
    enabled: Boolean(props.modelId),
    queryFn: () => listAnalysisTemplates({ modelId: props.modelId, limit: 20, offset: 0 })
  })

  const createMutation = useMutation({
    mutationFn: async () =>
      createAnalysisTemplate({
        modelId: props.modelId,
        name: name.trim() || `Template ${new Date().toLocaleTimeString()}`,
        config: {
          patch: props.currentPatch,
          analysisAction: props.analysisAction ?? 'template_apply'
        }
      }),
    onSuccess: async () => {
      setStatus('Template saved')
      setName('')
      await templatesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => applyAnalysisTemplate(props.queryLogId, templateId),
    onSuccess: async payload => {
      setStatus('Template applied')
      await props.onTemplateApplied(payload)
      await templatesQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  const templates = useMemo(() => templatesQuery.data?.items ?? [], [templatesQuery.data])

  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <strong style={{ fontSize: 12 }}>Templates</strong>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          data-testid="ask-analysis-template-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Template name"
          style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 8px', flex: 1 }}
        />
        <button
          data-testid="ask-analysis-template-save"
          type="button"
          className="badge badge-ok"
          style={{ border: 'none', cursor: 'pointer' }}
          disabled={createMutation.isPending || !props.modelId}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {status ? <span data-testid="ask-analysis-template-status" className="badge badge-warn">{status}</span> : null}
      <div data-testid="ask-analysis-template-list" style={{ display: 'grid', gap: 6, maxHeight: 180, overflow: 'auto' }}>
        {templates.length === 0 ? (
          <span className="badge badge-warn">No templates</span>
        ) : (
          templates.map(template => (
            <article key={template.id} className="card" style={{ borderRadius: 10, padding: 8, display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 12 }}>{template.name}</strong>
                <button
                  data-testid={`ask-analysis-template-apply-${template.id}`}
                  type="button"
                  className="badge badge-ok"
                  style={{ border: 'none', cursor: 'pointer' }}
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate(template.id)}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply'}
                </button>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {template.scope} / {template.status}
              </span>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
