'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import {
  listSemanticApprovalQueue,
  listSemanticModelGovernance,
  voteSemanticApprovalQueueBatch
} from '@/modules/governance/semantic/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { VirtualizedList } from '@/modules/shared/lists/virtualized-list'

type BatchVoteItemInput = {
  modelId: string
  stage: 'review' | 'approve'
  decision: 'approve' | 'reject'
  comment?: string
}

const queuePageSize = 50
const maxRetainedQueueItems = 1000

export default function SemanticModelsPage() {
  const [domain, setDomain] = useState('')
  const [status, setStatus] = useState('')
  const [stage, setStage] = useState<'review' | 'approve'>('review')
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [retryCandidates, setRetryCandidates] = useState<BatchVoteItemInput[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const modelsQuery = useQuery({
    queryKey: ['semantic-governance-models'],
    queryFn: listSemanticModelGovernance
  })

  const queueQuery = useInfiniteQuery({
    queryKey: ['semantic-approval-queue', domain, status, stage],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: unknown }) =>
      listSemanticApprovalQueue({
        domain: domain.trim() === '' ? undefined : domain.trim(),
        status: status.trim() === '' ? undefined : status.trim(),
        stage,
        limit: queuePageSize,
        offset: Number(pageParam ?? 0)
      }),
    getNextPageParam: (lastPage, pages) => {
      const typedPages = pages as Array<{ items?: Array<Record<string, unknown>> }>
      const typedLastPage = lastPage as { total?: number }
      const loaded = typedPages.reduce((sum, page) => sum + (page.items?.length ?? 0), 0)
      if (loaded >= (typedLastPage.total ?? 0)) {
        return undefined
      }
      return loaded
    }
  })

  const items = (modelsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const queueItems = useMemo(() => {
    const pages = queueQuery.data?.pages ?? []
    const flattened = pages.flatMap(page => page.items ?? [])
    if (flattened.length <= maxRetainedQueueItems) {
      return flattened
    }
    return flattened.slice(flattened.length - maxRetainedQueueItems)
  }, [queueQuery.data?.pages])
  const queueTotal = queueQuery.data?.pages?.[queueQuery.data.pages.length - 1]?.total ?? queueItems.length
  const hasNextQueuePage = queueQuery.hasNextPage ?? false
  const queueIdSet = useMemo(() => new Set(queueItems.map(item => String(item.modelId))), [queueItems])

  const batchVoteMutation = useMutation({
    mutationFn: async (voteItems: BatchVoteItemInput[]) =>
      voteSemanticApprovalQueueBatch({
        items: voteItems
      }),
    onSuccess: async payload => {
      const failedRetryableItems = payload.items
        .filter(item => item.success === false && item.retryable !== false)
        .map(item => ({
          modelId: item.modelId,
          stage: item.stage,
          decision: item.decision
        }))
      setRetryCandidates(failedRetryableItems)
      const succeeded = payload.summary.succeeded
      const failed = payload.summary.failed
      const retryable = failedRetryableItems.length
      const missingRoleCount = payload.items.filter(item => (item.missingRoleRequirements ?? []).length > 0).length
      setStatusMessage(
        `Batch vote completed: succeeded=${succeeded}, failed=${failed}, retryable=${retryable}, roleGaps=${missingRoleCount}`
      )
      setSelectedIds([])
      await queueQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Batch vote failed')
    }
  })

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>Semantic Governance</strong>
          <form
            data-testid="semantic-queue-filter-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              setSelectedIds([])
              setRetryCandidates([])
              await queueQuery.refetch()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input
              data-testid="semantic-queue-domain"
              value={domain}
              onChange={event => setDomain(event.target.value)}
              placeholder="domain"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              data-testid="semantic-queue-status"
              value={status}
              onChange={event => setStatus(event.target.value)}
              placeholder="status (review/approved...)"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <select
              data-testid="semantic-queue-stage"
              value={stage}
              onChange={event => setStage(event.target.value as 'review' | 'approve')}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            >
              <option value="review">review</option>
              <option value="approve">approve</option>
            </select>
            <select
              data-testid="semantic-queue-decision"
              value={decision}
              onChange={event => setDecision(event.target.value as 'approve' | 'reject')}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            >
              <option value="approve">approve</option>
              <option value="reject">reject</option>
            </select>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="semantic-queue-batch-vote"
                  type="button"
                  disabled={permission.state !== 'enabled' || selectedIds.length === 0 || batchVoteMutation.isPending}
                  title={permission.reason}
                  onClick={() =>
                    batchVoteMutation.mutate(
                      selectedIds.map(modelId => ({
                        modelId,
                        stage,
                        decision
                      }))
                    )
                  }
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  {batchVoteMutation.isPending ? 'Voting...' : `Batch Vote (${selectedIds.length})`}
                </button>
              )}
            </ActionGuard>
            <ActionGuard scopes={['allow:write:model:*']}>
              {permission => (
                <button
                  data-testid="semantic-queue-retry-failed"
                  type="button"
                  disabled={permission.state !== 'enabled' || retryCandidates.length === 0 || batchVoteMutation.isPending}
                  title={permission.reason}
                  onClick={() => batchVoteMutation.mutate(retryCandidates)}
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
                >
                  Retry Failed ({retryCandidates.length})
                </button>
              )}
            </ActionGuard>
          </form>
          {statusMessage ? (
            <span data-testid="semantic-queue-status-message" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={queueQuery.isLoading}
          error={queueQuery.error}
          empty={queueItems.length === 0}
          emptyLabel="No approval queue items"
        >
          <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <strong>Approval queue</strong>
              <span className="badge badge-ok" data-testid="semantic-queue-total">
                total: {queueTotal}
              </span>
            </div>
            <VirtualizedList
              items={queueItems}
              estimateSize={92}
              hasMore={hasNextQueuePage}
              isLoadingMore={queueQuery.isFetchingNextPage}
              onLoadMore={() => {
                if (hasNextQueuePage) {
                  queueQuery.fetchNextPage()
                }
              }}
              getKey={item => String((item as Record<string, unknown>).modelId)}
              renderItem={item => {
                const modelId = String((item as Record<string, unknown>).modelId)
                const selected = selectedIds.includes(modelId)
                const quorum = ((item as Record<string, unknown>).quorum ?? {}) as Record<string, unknown>
                const blockers = Array.isArray((item as Record<string, unknown>).blockers)
                  ? ((item as Record<string, unknown>).blockers as string[])
                  : []
                const missingRoleRequirements = Array.isArray((quorum as Record<string, unknown>).missingRoleRequirements)
                  ? ((quorum as Record<string, unknown>).missingRoleRequirements as string[])
                  : []
                return (
                  <article
                    data-testid={`semantic-queue-row-${modelId}`}
                    className="card"
                    style={{ padding: 10, borderRadius: 10, marginBottom: 8, display: 'grid', gap: 6 }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        data-testid={`semantic-queue-select-${modelId}`}
                        type="checkbox"
                        checked={selected}
                        onChange={event => {
                          setSelectedIds(current => {
                            if (event.target.checked) {
                              return [...new Set([...current, modelId])]
                            }
                            return current.filter(id => id !== modelId)
                          })
                        }}
                      />
                      <strong>{String((item as Record<string, unknown>).name ?? modelId)}</strong>
                      <span className="badge badge-warn">{String((item as Record<string, unknown>).stage ?? '-')}</span>
                      <span className="badge badge-ok">{String((item as Record<string, unknown>).status ?? '-')}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      quorum: {String(quorum.reviewApprovals ?? 0)}/{String(quorum.minReviewers ?? 0)} ·{' '}
                      {String(quorum.approveApprovals ?? 0)}/{String(quorum.minApprovers ?? 0)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      blockers: {blockers.length > 0 ? blockers.join(', ') : 'none'}
                    </span>
                    {missingRoleRequirements.length > 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        role gaps: {missingRoleRequirements.join(', ')}
                      </span>
                    ) : null}
                  </article>
                )
              }}
            />
          </section>
        </LoadablePanel>

        <LoadablePanel
          loading={modelsQuery.isLoading}
          error={modelsQuery.error}
          empty={items.length === 0}
          emptyLabel="No semantic models"
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map(item => (
              <article data-testid={`semantic-model-row-${String(item.id)}`} key={String(item.id)} className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{String(item.name ?? item.id)}</strong>
                  <span className="badge badge-warn">{String(item.workflowStatus ?? 'draft')}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                  cube: {String(item.cube ?? '-')} · risk: {String(item.riskLevel ?? 'low')}
                </p>
                {queueIdSet.has(String(item.id)) ? (
                  <span className="badge badge-ok" style={{ width: 'fit-content' }}>
                    in approval queue
                  </span>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link data-testid={`semantic-model-open-${String(item.id)}`} href={`/models/${item.id}`} className="badge badge-ok">
                    Details
                  </Link>
                  <Link data-testid={`semantic-model-impact-${String(item.id)}`} href={`/models/${item.id}/impact`} className="badge badge-warn">
                    Impact
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </LoadablePanel>
      </section>
    </AccessGuard>
  )
}
