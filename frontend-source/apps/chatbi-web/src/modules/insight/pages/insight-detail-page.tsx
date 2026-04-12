'use client'

import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import {
  addInsightComment,
  createInsightSubscription,
  getInsight,
  listInsightComments,
  listInsightSubscriptions,
  listInsightVersions,
  setInsightSubscriptionStatus,
  submitInsightFeedback
} from '@/modules/insight/api'
import { addStoryItem, createStory, listStories } from '@/modules/story/api'
import { getInsightTrace } from '@/modules/trace/api'
import { frontendPlatformAdapter } from '@/modules/shared/contracts/frontend-platform-adapter'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { VersionSummaryPanel } from '@/modules/shared/panels/version-summary'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function InsightDetailPage() {
  const params = useParams<{ id: string }>()
  const insightId = params.id

  const insightQuery = useQuery({
    queryKey: ['insight', insightId],
    queryFn: () => getInsight(insightId, { fallbackToDefault: false }),
    enabled: Boolean(insightId)
  })

  const commentsQuery = useQuery({
    queryKey: ['insight-comments', insightId],
    queryFn: () => listInsightComments(insightId),
    enabled: Boolean(insightId)
  })

  const versionsQuery = useQuery({
    queryKey: ['insight-versions', insightId],
    queryFn: () => listInsightVersions(insightId, { limit: 20, offset: 0 }),
    enabled: Boolean(insightId)
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['insight-subscriptions', insightId],
    queryFn: () => listInsightSubscriptions(insightId),
    enabled: Boolean(insightId)
  })

  const traceQuery = useQuery({
    queryKey: ['insight-trace', insightId],
    queryFn: () => getInsightTrace(insightId),
    enabled: Boolean(insightId)
  })

  const [commentText, setCommentText] = useState('')
  const [consumerSystem, setConsumerSystem] = useState('ops-bot')
  const [storyName, setStoryName] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const commentMutation = useMutation({
    mutationFn: async () => addInsightComment(insightId, commentText),
    onSuccess: async () => {
      setStatusMessage('评论已发布')
      setCommentText('')
      await commentsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '评论发布失败')
    }
  })

  const subscriptionMutation = useMutation({
    mutationFn: async () =>
      createInsightSubscription(insightId, {
        consumerSystem,
        channel: 'webhook',
        schedule: '0 9 * * *',
        targetUrl: 'https://example.com/webhook'
      }),
    onSuccess: async () => {
      setStatusMessage('订阅已创建')
      await subscriptionsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '订阅创建失败')
    }
  })

  const toggleSubscriptionMutation = useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'paused' }) =>
      setInsightSubscriptionStatus(insightId, input.id, input.status),
    onSuccess: async () => {
      setStatusMessage('订阅状态已更新')
      await subscriptionsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '订阅状态更新失败')
    }
  })

  const feedbackMutation = useMutation({
    mutationFn: async (rating: 'correct' | 'incorrect' | 'needs_clarification') => submitInsightFeedback(insightId, rating),
    onSuccess: () => {
      setStatusMessage('反馈已提交')
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '反馈提交失败')
    }
  })

  const relatedStoriesQuery = useQuery({
    queryKey: ['insight-related-stories', insightId, insightQuery.data?.modelId],
    enabled: Boolean(insightId && insightQuery.data?.modelId),
    queryFn: async () => {
      const page = await listStories(insightQuery.data?.modelId as string, {
        limit: 100,
        offset: 0
      })
      return page.items.filter(story => (story.items ?? []).some(item => item.itemType === 'insight' && item.refId === insightId))
    }
  })

  const addToStoryMutation = useMutation({
    mutationFn: async () => {
      const currentInsight = insightQuery.data
      if (!currentInsight?.modelId) throw new Error('洞察缺少语义模型信息')
      const storyResult = await createStory({
        modelId: currentInsight.modelId,
        title: storyName.trim() || `洞察故事 ${new Date().toLocaleString()}`,
        summary: '由洞察详情页创建'
      })
      await addStoryItem(storyResult.story.id, {
        itemType: 'insight',
        refId: insightId
      })
      return storyResult.story.id
    },
    onSuccess: async storyId => {
      setStoryName('')
      setStatusMessage(`已加入故事 ${storyId}`)
      await relatedStoriesQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : '加入故事失败')
    }
  })

  const insight = insightQuery.data ?? null

  return (
    <AccessGuard scopes={['allow:model:*']}>
      <LoadablePanel
        loading={insightQuery.isLoading}
        error={insightQuery.error}
        empty={!insight}
        loadingLabel="Loading insight detail..."
        emptyLabel="Insight not found."
        retry={() => {
          void insightQuery.refetch()
        }}
      >
        <section style={{ display: 'grid', gap: 16 }}>
          <article className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 24 }}>{insight?.title ?? '洞察详情'}</strong>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{insight?.summary ?? '暂无摘要'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(insight?.tags ?? []).map(tag => (
                <span key={tag} className="badge badge-ok">
                  {tag}
                </span>
              ))}
              {insight?.status ? <span className="badge badge-warn">{insight.status}</span> : null}
              {insight?.latestVersion ? <span className="badge badge-ok">v{insight.latestVersion}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {insight?.queryLogId ? (
                <Link href={frontendPlatformAdapter.ask.buildHref({ queryLogId: insight.queryLogId })} className="badge badge-warn">
                  查询日志 {insight.queryLogId}
                </Link>
              ) : null}
              {insight?.conversationId ? (
                <Link
                  href={frontendPlatformAdapter.ask.buildHref({ conversationId: insight.conversationId })}
                  className="badge badge-warn"
                >
                  会话 {insight.conversationId}
                </Link>
              ) : null}
              {traceQuery.data?.trace?.run?.traceKey ? (
                <Link
                  data-testid="insight-trace-link"
                  href={`/ops/traces/${encodeURIComponent(traceQuery.data.trace.run.traceKey)}`}
                  className="badge badge-ok"
                >
                  追踪 {traceQuery.data.trace.run.traceKey}
                </Link>
              ) : null}
              {insight?.modelId ? (
                <Link
                  data-testid="insight-feed-link"
                  href={`/feed?modelId=${encodeURIComponent(insight.modelId)}&resourceType=insight&q=${encodeURIComponent(insight.id)}`}
                  className="badge badge-warn"
                >
                  动态流
                </Link>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                data-testid="insight-feedback-correct"
                type="button"
                onClick={() => feedbackMutation.mutate('correct')}
                style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', background: '#fff' }}
              >
                标记正确
              </button>
              <button
                data-testid="insight-feedback-incorrect"
                type="button"
                onClick={() => feedbackMutation.mutate('incorrect')}
                style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', background: '#fff' }}
              >
                标记错误
              </button>
              <button
                data-testid="insight-feedback-needs-clarification"
                type="button"
                onClick={() => feedbackMutation.mutate('needs_clarification')}
                style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', background: '#fff' }}
              >
                需要澄清
              </button>
            </div>
            {statusMessage ? (
              <span data-testid="insight-status-message" className="badge badge-warn" style={{ width: 'fit-content' }}>
                {statusMessage}
              </span>
            ) : null}
          </article>

          <LoadablePanel
            loading={versionsQuery.isLoading}
            error={versionsQuery.error}
            empty={(versionsQuery.data?.items ?? []).length === 0}
            loadingLabel="Loading insight versions..."
            emptyLabel="暂无版本记录"
          >
            <section className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
              <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>Version Timeline</strong>
              {(versionsQuery.data?.items ?? []).map(version => (
                <article key={version.id} className="card" style={{ borderRadius: 10, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>v{version.version}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{version.createdAt ?? ''}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <VersionSummaryPanel
                      testIdPrefix={`insight-version-${version.id}`}
                      snapshotSummary={(version.presentation?.snapshotSummary ?? undefined) as Record<string, unknown> | undefined}
                      changeSummary={(version.presentation?.changeSummary ?? undefined) as Record<string, unknown> | undefined}
                      extra={{
                        relatedRefs: Array.isArray(version.presentation?.relatedRefs)
                          ? version.presentation?.relatedRefs.join(', ')
                          : '-'
                      }}
                    />
                  </div>
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 12, cursor: 'pointer' }}>Advanced JSON</summary>
                    <pre style={{ margin: '6px 0 0', maxHeight: 120, overflow: 'auto', fontSize: 12 }}>
                      {JSON.stringify(version.snapshot, null, 2)}
                    </pre>
                  </details>
                </article>
              ))}
            </section>
          </LoadablePanel>

          <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>关联故事</strong>
            <form
              data-testid="insight-add-story-form"
              onSubmit={async event => {
                event.preventDefault()
                await addToStoryMutation.mutateAsync()
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                data-testid="insight-add-story-name"
                value={storyName}
                onChange={event => setStoryName(event.target.value)}
                placeholder="故事标题（可选）"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', minWidth: 220 }}
              />
              <button
                data-testid="insight-add-story-submit"
                type="submit"
                style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
              >
                加入故事
              </button>
            </form>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(relatedStoriesQuery.data ?? []).map(story => (
                <Link
                  key={story.id}
                  data-testid={`insight-related-story-${story.id}`}
                  href={`/project/${encodeURIComponent(story.id)}`}
                  className="badge badge-ok"
                >
                  {story.title} ({story.status})
                </Link>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>评论</strong>
            <form
              data-testid="insight-comment-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                if (!commentText.trim()) return
                await commentMutation.mutateAsync()
              }}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}
            >
              <input
                data-testid="insight-comment-input"
                value={commentText}
                onChange={event => setCommentText(event.target.value)}
                placeholder="输入评论内容"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <button data-testid="insight-comment-submit" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
                发布
              </button>
            </form>
            {(commentsQuery.data?.items ?? []).map(comment => (
              <article key={comment.id} className="card" style={{ borderRadius: 10, padding: 10 }}>
                <strong style={{ fontSize: 13 }}>{comment.author}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>{comment.body}</p>
              </article>
            ))}
          </section>

          <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif' }}>订阅</strong>
            <form
              data-testid="insight-subscription-form"
              onSubmit={async event => {
                event.preventDefault()
                await subscriptionMutation.mutateAsync()
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                data-testid="insight-subscription-consumer"
                value={consumerSystem}
                onChange={event => setConsumerSystem(event.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
              />
              <button data-testid="insight-subscription-submit" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
                新增订阅
              </button>
            </form>
            {(subscriptionsQuery.data ?? []).map(subscription => (
              <article
                key={subscription.id}
                className="card"
                style={{ borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{subscription.consumerSystem}</strong>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    {subscription.channel} · {subscription.status}
                  </p>
                </div>
                <button
                  data-testid={`insight-subscription-toggle-${subscription.id}`}
                  type="button"
                  onClick={() =>
                    toggleSubscriptionMutation.mutate({
                      id: subscription.id,
                      status: subscription.status === 'active' ? 'paused' : 'active'
                    })
                  }
                  style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 10px' }}
                >
                  {subscription.status === 'active' ? '暂停' : '恢复'}
                </button>
              </article>
            ))}
          </section>
        </section>
      </LoadablePanel>
    </AccessGuard>
  )
}
