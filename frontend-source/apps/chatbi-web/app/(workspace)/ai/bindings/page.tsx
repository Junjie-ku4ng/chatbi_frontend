'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listSemanticModels } from '@/lib/api-client'
import {
  getAiBindingResolutionMatrix,
  listAiBindingAudits,
  listAiBindings,
  resolveAiBinding,
  upsertAiBinding
} from '@/modules/governance/ai/api'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { EntityDetailSections } from '@/modules/shared/panels/entity-detail-sections'
import { StatusChip } from '@/modules/shared/chips/status-chip'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function AiBindingsPage() {
  const [task, setTask] = useState('nl2plan_llm')
  const [modelRefId, setModelRefId] = useState('')
  const [status, setStatus] = useState<'active' | 'disabled'>('active')
  const [resolvedTask, setResolvedTask] = useState('nl2plan_llm')
  const [bindingModelId, setBindingModelId] = useState<string | undefined>()
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const modelsQuery = useQuery({
    queryKey: ['semantic-models'],
    queryFn: listSemanticModels
  })
  const activeModelId = bindingModelId ?? modelsQuery.data?.[0]?.id

  const bindingsQuery = useQuery({
    queryKey: ['ai-bindings', activeModelId],
    queryFn: () => listAiBindings(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const auditsQuery = useQuery({
    queryKey: ['ai-binding-audits', activeModelId],
    queryFn: () => listAiBindingAudits(activeModelId as string),
    enabled: Boolean(activeModelId)
  })

  const resolveQuery = useQuery({
    queryKey: ['ai-binding-resolve', activeModelId, resolvedTask],
    queryFn: () => resolveAiBinding(activeModelId as string, resolvedTask),
    enabled: Boolean(activeModelId && resolvedTask)
  })
  const matrixQuery = useQuery({
    queryKey: ['ai-binding-resolution-matrix', activeModelId],
    queryFn: () => getAiBindingResolutionMatrix({ modelId: activeModelId as string }),
    enabled: Boolean(activeModelId)
  })

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!activeModelId) throw new Error('请先选择语义模型')
      return upsertAiBinding({
        modelId: activeModelId,
        task,
        modelRefId,
        status
      })
    },
    onSuccess: async () => {
      await bindingsQuery.refetch()
      await auditsQuery.refetch()
    }
  })

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>AI 绑定治理</strong>
            <Link href="/ai/providers" className="badge badge-warn">
              Provider 列表
            </Link>
            <Link href="/ai/models" className="badge badge-warn">
              模型列表
            </Link>
          </div>
          <select
            value={activeModelId ?? ''}
            onChange={event => setBindingModelId(event.target.value)}
            style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', maxWidth: 360 }}
          >
            {(modelsQuery.data ?? []).map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await upsertMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input value={task} onChange={event => setTask(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <input value={modelRefId} onChange={event => setModelRefId(event.target.value)} placeholder="模型引用 ID" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <select value={status} onChange={event => setStatus(event.target.value as 'active' | 'disabled')} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
            <button type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
              保存绑定
            </button>
          </form>
        </header>

        <LoadablePanel
          loading={matrixQuery.isLoading}
          error={matrixQuery.error}
          empty={!matrixQuery.data}
          loadingLabel="Loading AI binding matrix..."
          emptyLabel="No AI binding matrix available for the selected semantic model."
          retry={() => {
            void matrixQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>绑定解析矩阵</strong>
            <MetricStrip
              testId="ai-bindings-matrix-strip"
              items={[
                { label: '总数', value: String(matrixQuery.data?.summary?.total ?? 0), tone: 'ok' },
                { label: '健康', value: String(matrixQuery.data?.summary?.healthy ?? 0), tone: 'ok' },
                { label: '降级', value: String(matrixQuery.data?.summary?.degraded ?? 0), tone: 'warn' },
                { label: '失败', value: String(matrixQuery.data?.summary?.failed ?? 0), tone: 'danger' }
              ]}
            />
            <OperationalTable
              testId="ai-bindings-matrix-table"
              columns={[
                { key: 'task', label: '任务', render: row => String(row.task ?? '-') },
                { key: 'status', label: '状态', render: row => String(row.status ?? '-') },
                { key: 'model', label: 'AI 模型', render: row => String((row.profile as any)?.model?.code ?? '-') },
                { key: 'provider', label: 'Provider', render: row => String((row.profile as any)?.provider?.code ?? '-') },
                { key: 'reason', label: '原因', render: row => String(row.reason ?? '-') }
              ]}
              rows={(matrixQuery.data?.items as Array<Record<string, unknown>>) ?? []}
              rowKey={(row, index) => `${String(row.bindingId ?? 'binding')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="当前模型暂无绑定"
            />
            <AdvancedJsonPanel testId="ai-bindings-matrix-json" value={matrixQuery.data} />
          </article>
        </LoadablePanel>

        <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <strong>绑定解析结果</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={resolvedTask} onChange={event => setResolvedTask(event.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }} />
            <span className="badge badge-ok">模型ID: {activeModelId ?? '-'}</span>
          </div>
          <OperationalTable
            testId="ai-bindings-resolve-table"
            columns={[
              { key: 'task', label: '任务', render: row => String(row.task ?? '-') },
              { key: 'strict', label: '严格模式', render: row => String(row.strict ?? true) },
              { key: 'modelStatus', label: '模型状态', render: row => String((row.profile as any)?.model?.status ?? '-') },
              { key: 'providerStatus', label: 'Provider 状态', render: row => String((row.profile as any)?.provider?.status ?? '-') }
            ]}
            rows={resolveQuery.data ? [resolveQuery.data as Record<string, unknown>] : []}
            rowKey={() => 'resolved-binding'}
            onRowClick={row => setSelectedRow(row)}
            emptyLabel="暂无解析结果"
          />
          <AdvancedJsonPanel testId="ai-bindings-resolve-json" value={resolveQuery.data} />
        </section>

        <LoadablePanel
          loading={auditsQuery.isLoading}
          error={auditsQuery.error}
          empty={!auditsQuery.data}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>绑定审计记录</strong>
            <OperationalTable
              testId="ai-bindings-audits-table"
              columns={[
                { key: 'task', label: '任务', render: row => String(row.task ?? '-') },
                { key: 'action', label: '动作', render: row => String(row.action ?? '-') },
                { key: 'source', label: '来源', render: row => String(row.source ?? '-') },
                { key: 'changedAt', label: '变更时间', render: row => String(row.changedAt ?? '-') }
              ]}
              rows={((auditsQuery.data as any)?.items ?? []) as Array<Record<string, unknown>>}
              rowKey={(row, index) => `${String(row.id ?? 'audit')}-${index}`}
              onRowClick={row => setSelectedRow(row)}
              emptyLabel="暂无审计记录"
            />
            <AdvancedJsonPanel testId="ai-bindings-audits-json" value={auditsQuery.data} />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={bindingsQuery.isLoading}
          error={bindingsQuery.error}
          empty={!bindingsQuery.data}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <strong>绑定载荷诊断</strong>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              主流程请使用矩阵 / 解析 / 审计视图；原始载荷仅用于调试。
            </span>
            <details>
              <summary style={{ fontSize: 12, cursor: 'pointer' }}>高级 JSON（调试）</summary>
              <AdvancedJsonPanel testId="ai-bindings-legacy-json" value={bindingsQuery.data} />
            </details>
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="ai-bindings-detail-drawer"
          title="绑定明细"
          open={selectedRow !== null}
          onClose={() => setSelectedRow(null)}
        >
          <EntityDetailSections
            testIdPrefix="ai-bindings-detail"
            overview={[
              { label: '任务', value: String(selectedRow?.task ?? '-') },
              { label: '模型', value: String((selectedRow?.profile as any)?.model?.code ?? selectedRow?.modelId ?? '-') },
              {
                label: '状态',
                value: <StatusChip value={String(selectedRow?.status ?? '-')} />
              }
            ]}
            operationalFields={[
              {
                label: '绑定健康度',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.bindingHealth ?? selectedRow?.status ?? '-')} />
              },
              {
                label: 'Provider 健康度',
                value: <StatusChip value={String((selectedRow?.presentation as any)?.providerHealth ?? (selectedRow?.profile as any)?.provider?.status ?? '-')} />
              },
              {
                label: '严格模式',
                value: String((selectedRow?.presentation as any)?.strictModeHint ?? selectedRow?.strict ?? '-')
              },
              {
                label: '最近解析时间',
                value: String((selectedRow?.presentation as any)?.lastResolvedAt ?? selectedRow?.updatedAt ?? '-')
              }
            ]}
            diagnostics={[
              { label: '动作摘要', value: String((selectedRow?.presentation as any)?.actionSummary ?? selectedRow?.action ?? '-') },
              { label: '操作者', value: String((selectedRow?.presentation as any)?.actorDisplay ?? selectedRow?.changedBy ?? '-') },
              { label: '风险提示', value: String((selectedRow?.presentation as any)?.riskHint ?? '-') }
            ]}
            rawValue={selectedRow}
            advancedTestId="ai-bindings-detail-json"
          />
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
