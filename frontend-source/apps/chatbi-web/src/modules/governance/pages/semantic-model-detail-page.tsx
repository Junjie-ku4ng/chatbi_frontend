'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  approveSemanticModel,
  applySemanticPolicyTemplate,
  getSemanticEffectiveTemplates,
  getSemanticModel,
  type SemanticEffectiveTemplatesView,
  type SemanticPolicyTemplate,
  getSemanticWorkflowApprovals,
  listSemanticApprovalQueue,
  listSemanticPolicyTemplates,
  publishSemanticModel,
  rejectSemanticModel,
  submitSemanticReview,
  voteSemanticWorkflow
} from '@/modules/governance/semantic/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { StatusChip } from '@/modules/shared/chips/status-chip'

export default function SemanticModelDetailPage() {
  const params = useParams<{ id: string }>()
  const modelId = params.id
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  const modelQuery = useQuery({
    queryKey: ['semantic-model', modelId],
    queryFn: () => getSemanticModel(modelId),
    enabled: Boolean(modelId)
  })
  const modelRecord = (modelQuery.data as Record<string, unknown> | undefined) ?? {}
  const modelDomain = resolveSemanticModelDomain(modelRecord)

  const approvalsQuery = useQuery({
    queryKey: ['semantic-approvals', modelId],
    queryFn: () => getSemanticWorkflowApprovals(modelId, { view: 'operational' }),
    enabled: Boolean(modelId)
  })

  const queueQuery = useQuery({
    queryKey: ['semantic-approval-queue-detail', modelId],
    queryFn: () =>
      listSemanticApprovalQueue({
        modelId,
        limit: 1,
        offset: 0
      }),
    enabled: Boolean(modelId)
  })

  const effectiveTemplatesQuery = useQuery({
    queryKey: ['semantic-effective-templates', modelId],
    queryFn: () => getSemanticEffectiveTemplates(modelId),
    enabled: Boolean(modelId)
  })

  const policyTemplatesQuery = useQuery({
    queryKey: ['semantic-policy-templates', modelId, modelDomain],
    queryFn: () =>
      listSemanticPolicyTemplates({
        domain: modelDomain ?? undefined,
        status: 'active'
      }),
    enabled: Boolean(modelId && modelQuery.data)
  })

  const mutateAction = useMutation({
    mutationFn: async (action: 'submit' | 'approve' | 'reject' | 'publish' | 'vote_review' | 'vote_approve') => {
      if (action === 'submit') return submitSemanticReview(modelId)
      if (action === 'approve') return approveSemanticModel(modelId)
      if (action === 'reject') return rejectSemanticModel(modelId)
      if (action === 'publish') {
        const modelRecord = modelQuery.data as Record<string, unknown> | undefined
        const schemaVersion = Number((modelRecord?.schemaVersion as number | undefined) ?? 1)
        return publishSemanticModel(modelId, schemaVersion)
      }
      if (action === 'vote_review') {
        return voteSemanticWorkflow(modelId, {
          stage: 'review',
          decision: 'approve'
        })
      }
      return voteSemanticWorkflow(modelId, {
        stage: 'approve',
        decision: 'approve'
      })
    },
    onSuccess: async () => {
      setActionStatus('Workflow action completed')
      await modelQuery.refetch()
      await approvalsQuery.refetch()
      await queueQuery.refetch()
    },
    onError: error => {
      setActionStatus(error instanceof Error ? error.message : 'Workflow action failed')
    }
  })

  const applyPolicyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) =>
      applySemanticPolicyTemplate(modelId, {
        templateId
      }),
    onSuccess: async () => {
      setActionStatus('Policy template applied')
      await modelQuery.refetch()
      await effectiveTemplatesQuery.refetch()
      await policyTemplatesQuery.refetch()
    },
    onError: error => {
      setActionStatus(error instanceof Error ? error.message : 'Policy template apply failed')
    }
  })

  const approvals = (approvalsQuery.data as { approvals?: unknown[] } | undefined)?.approvals ?? []
  const queueItem = (queueQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items?.[0]
  const queueBlockerCount = Array.isArray(queueItem?.blockers) ? queueItem.blockers.length : 0
  const queueQuorum = ((queueItem?.quorum as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>
  const queueMissingRoleRequirements = Array.isArray(queueQuorum.missingRoleRequirements)
    ? (queueQuorum.missingRoleRequirements as string[])
    : []
  const effectiveTemplates = effectiveTemplatesQuery.data as SemanticEffectiveTemplatesView | undefined
  const policyTemplates = (policyTemplatesQuery.data as SemanticPolicyTemplate[] | undefined) ?? []
  const effectivePolicyTemplate = effectiveTemplates?.policyTemplate?.template ?? null
  const effectivePolicySource = effectiveTemplates?.policyTemplate?.source ?? 'none'
  const effectiveApprovalTemplate = effectiveTemplates?.approvalTemplate?.template ?? null
  const effectiveApprovalSource = effectiveTemplates?.approvalTemplate?.source ?? 'none'
  const recommendedPolicyTemplate =
    (effectivePolicySource === 'inherited' ? effectivePolicyTemplate : null) ?? policyTemplates[0] ?? effectivePolicyTemplate
  const canApplyRecommendedPolicyTemplate =
    Boolean(recommendedPolicyTemplate?.id) && effectivePolicySource !== 'explicit'

  const approvalRows = approvals.map(entry => ({ ...((entry as Record<string, unknown>) ?? {}) }))

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Semantic Model Detail</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/models/${modelId}/impact`} className="badge badge-warn" style={{ width: 'fit-content' }}>
              View Impact
            </Link>
            <Link href={`/semantic-studio/${modelId}`} className="badge badge-ok" style={{ width: 'fit-content' }}>
              Open Studio
            </Link>
          </div>
        </header>

        <LoadablePanel
          loading={modelQuery.isLoading || queueQuery.isLoading}
          error={modelQuery.error ?? queueQuery.error}
          empty={!modelQuery.data}
          loadingLabel="Loading semantic model detail..."
          emptyLabel="Semantic model not found"
          retry={() => {
            if (modelQuery.error) {
              void modelQuery.refetch()
              return
            }
            void queueQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <MetricStrip
              testId="semantic-model-detail-strip"
              items={[
                { label: 'id', value: String(modelRecord.id ?? modelId), tone: 'ok' },
                { label: 'status', value: String(modelRecord.workflowStatus ?? modelRecord.status ?? '-'), tone: 'warn' },
                { label: 'schema', value: String(modelRecord.schemaVersion ?? '-'), tone: 'warn' },
                {
                  label: 'queue blockers',
                  value: queueBlockerCount,
                  tone: queueBlockerCount > 0 ? 'warn' : 'ok'
                }
              ]}
            />

            <OperationalTable
              testId="semantic-model-detail-table"
              columns={[
                { key: 'name', label: 'Name', render: row => String(row.name ?? '-') },
                { key: 'cube', label: 'Cube', render: row => String(row.cube ?? '-') },
                { key: 'domain', label: 'Domain', render: row => String(row.domain ?? '-') },
                { key: 'owner', label: 'Owner', render: row => String(row.owner ?? row.ownerId ?? '-') },
                { key: 'updatedAt', label: 'Updated', render: row => String(row.updatedAt ?? '-') }
              ]}
              rows={[modelRecord]}
              rowKey={() => String(modelRecord.id ?? modelId)}
              onRowClick={row => setSelectedRow(row)}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button data-testid="semantic-submit-review" type="button" onClick={() => mutateAction.mutate('submit')} className="badge badge-ok">
                Submit Review
              </button>
              <button data-testid="semantic-approve" type="button" onClick={() => mutateAction.mutate('approve')} className="badge badge-ok">
                Approve
              </button>
              <button data-testid="semantic-reject" type="button" onClick={() => mutateAction.mutate('reject')} className="badge badge-danger">
                Reject
              </button>
              <button data-testid="semantic-vote-review" type="button" onClick={() => mutateAction.mutate('vote_review')} className="badge badge-warn">
                Vote Review
              </button>
              <button data-testid="semantic-vote-approve" type="button" onClick={() => mutateAction.mutate('vote_approve')} className="badge badge-warn">
                Vote Approve
              </button>
              <button data-testid="semantic-publish" type="button" onClick={() => mutateAction.mutate('publish')} className="badge badge-ok">
                Publish
              </button>
            </div>

            {actionStatus ? (
              <div data-testid="semantic-action-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
                {actionStatus}
              </div>
            ) : null}

            {queueItem ? (
              <div data-testid="semantic-queue-meta" className="card" style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 13 }}>Queue status</strong>
                <span className="badge badge-ok" style={{ width: 'fit-content' }}>
                  {String(queueItem.status ?? 'unknown')} / {String(queueItem.stage ?? 'review')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  blockers:{' '}
                  {Array.isArray(queueItem.blockers) && queueItem.blockers.length > 0
                    ? queueItem.blockers.join(', ')
                    : 'none'}
                </span>
                {queueMissingRoleRequirements.length > 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    role gaps: {queueMissingRoleRequirements.join(', ')}
                  </span>
                ) : null}
              </div>
            ) : null}

            <article
              data-testid="semantic-policy-template-panel"
              className="card"
              style={{ borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}
            >
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Effective templates</strong>
                <span className="badge badge-ok" style={{ width: 'fit-content' }}>
                  domain: {modelDomain ?? '-'}
                </span>
              </div>

              {effectiveTemplatesQuery.isLoading || policyTemplatesQuery.isLoading ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Loading template guidance...</span>
              ) : null}

              {effectiveTemplatesQuery.error || policyTemplatesQuery.error ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Template guidance unavailable.</span>
              ) : null}

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-ok">{effectivePolicyTemplate?.name ?? 'No policy template'}</span>
                  <span className={resolveTemplateSourceBadgeClassName(effectivePolicySource)}>{effectivePolicySource}</span>
                  {effectivePolicyTemplate?.domain ? (
                    <span className="badge badge-warn">{effectivePolicyTemplate.domain}</span>
                  ) : null}
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  approval template: {effectiveApprovalTemplate?.name ?? 'none'} ({effectiveApprovalSource})
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  available templates: {policyTemplates.length > 0 ? policyTemplates.map(template => template.name).join(', ') : 'none'}
                </span>
                {recommendedPolicyTemplate ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    recommended template: {recommendedPolicyTemplate.name}
                  </span>
                ) : null}
              </div>

              <button
                data-testid="semantic-policy-template-apply"
                type="button"
                className="badge badge-ok"
                disabled={!canApplyRecommendedPolicyTemplate || applyPolicyTemplateMutation.isPending}
                onClick={() => {
                  if (recommendedPolicyTemplate?.id) {
                    applyPolicyTemplateMutation.mutate(recommendedPolicyTemplate.id)
                  }
                }}
                style={{
                  border: 'none',
                  cursor: canApplyRecommendedPolicyTemplate ? 'pointer' : 'not-allowed',
                  opacity: canApplyRecommendedPolicyTemplate ? 1 : 0.65,
                  width: 'fit-content'
                }}
              >
                {applyPolicyTemplateMutation.isPending
                  ? 'Applying policy template...'
                  : effectivePolicySource === 'explicit'
                    ? 'Policy template applied'
                    : 'Apply recommended policy template'}
              </button>
            </article>

            <AdvancedJsonPanel testId="semantic-model-detail-json" value={modelQuery.data} />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={approvalsQuery.isLoading}
          error={approvalsQuery.error}
          empty={approvalRows.length === 0}
          loadingLabel="Loading workflow approvals..."
          emptyLabel="No workflow approvals found."
          retry={() => {
            void approvalsQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Workflow approvals</strong>
            <OperationalTable
              testId="semantic-model-approvals-table"
              columns={[
                { key: 'stage', label: 'Stage', render: row => String(row.stage ?? '-') },
                { key: 'decision', label: 'Decision', render: row => String(row.decision ?? '-') },
                { key: 'actor', label: 'Actor', render: row => String(row.actor ?? row.userId ?? '-') },
                { key: 'at', label: 'At', render: row => String(row.createdAt ?? row.votedAt ?? '-') }
              ]}
              rows={approvalRows}
              rowKey={(row, index) => `${String(row.stage ?? 'stage')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="No approvals yet"
            />
            <AdvancedJsonPanel testId="semantic-model-approvals-json" value={approvalsQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="semantic-model-detail-drawer"
          title="Semantic model detail"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="semantic-model-detail"
            overview={[
              { label: 'model', value: String(selectedRow?.name ?? modelRecord.name ?? modelId) },
              { label: 'stage', value: String(selectedRow?.stage ?? queueItem?.stage ?? '-') },
              { label: 'status', value: <StatusChip value={String(selectedRow?.status ?? queueItem?.status ?? '-')} /> }
            ]}
            operationalFields={[
              { label: 'actor', value: String((selectedRow?.presentation as any)?.actorDisplay ?? selectedRow?.actor ?? selectedRow?.voter ?? '-') },
              { label: 'decision', value: String(selectedRow?.decision ?? '-') },
              { label: 'decision reason', value: String((selectedRow?.presentation as any)?.decisionReason ?? selectedRow?.comment ?? '-') },
              { label: 'blocker count', value: String((selectedRow?.presentation as any)?.blockerCount ?? queueBlockerCount) }
            ]}
            diagnostics={[
              { label: 'created', value: String(selectedRow?.createdAt ?? '-') },
              { label: 'updated', value: String(selectedRow?.updatedAt ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="semantic-model-detail-raw-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}

function resolveSemanticModelDomain(modelRecord: Record<string, unknown>) {
  if (typeof modelRecord.domain === 'string' && modelRecord.domain.trim().length > 0) {
    return modelRecord.domain.trim()
  }
  const options = modelRecord.options
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    const domain = (options as Record<string, unknown>).domain
    if (typeof domain === 'string' && domain.trim().length > 0) {
      return domain.trim()
    }
  }
  return undefined
}

function resolveTemplateSourceBadgeClassName(source: string) {
  if (source === 'explicit') {
    return 'badge badge-ok'
  }
  if (source === 'inherited') {
    return 'badge badge-warn'
  }
  return 'badge badge-danger'
}
