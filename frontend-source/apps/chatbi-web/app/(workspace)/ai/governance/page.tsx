'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  type CredentialCryptoAdapterDescriptor,
  getAiCryptoPolicy,
  getAiGovernanceOverview,
  listAiCryptoProviders,
  listAiCryptoValidations,
  listAiPolicyTemplates,
  listAiProviderRotationEvents,
  listAiProviderRotationRuns,
  listAiProviders,
  listAiQuotaPolicies,
  listAiQuotaUsage,
  upsertAiCryptoPolicy,
  upsertAiProviderRotationPolicy,
  upsertAiQuotaPolicy,
  validateAiCryptoProvider
} from '@/modules/governance/ai/api'
import { OperationalTable } from '@/modules/shared/data-grid/operational-table'
import { AdvancedJsonPanel } from '@/modules/shared/panels/advanced-json'
import { DetailDrawer } from '@/modules/shared/panels/detail-drawer'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { MetricStrip } from '@/modules/shared/summary/metric-strip'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

function asArrayRows(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [] as Array<Record<string, unknown>>
  }
  const items = (value as { items?: unknown[] }).items
  if (!Array.isArray(items)) return [] as Array<Record<string, unknown>>
  return items.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Array<Record<string, unknown>>
}

export default function AiGovernancePage() {
  const [providerId, setProviderId] = useState<string>('')
  const [cryptoProvider, setCryptoProvider] = useState<'local-aes' | 'aws-kms' | 'azure-keyvault'>('aws-kms')
  const [cryptoValidationMode, setCryptoValidationMode] = useState<'dry_run' | 'live'>('dry_run')
  const [cryptoPolicyMode, setCryptoPolicyMode] = useState<'strict' | 'compat'>('compat')
  const [cryptoAllowMock, setCryptoAllowMock] = useState(true)
  const [cryptoRequireValidation, setCryptoRequireValidation] = useState(false)
  const [cryptoValidationTtlHours, setCryptoValidationTtlHours] = useState(24)
  const [quotaTask, setQuotaTask] = useState('nl2plan_llm')
  const [quotaLimit, setQuotaLimit] = useState(1000)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<Record<string, unknown> | null>(null)

  const providersQuery = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => listAiProviders({ view: 'operational' })
  })

  const providerItems = (providersQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const activeProviderId = providerId || String(providerItems[0]?.id ?? '')

  const runsQuery = useQuery({
    queryKey: ['ai-rotation-runs', activeProviderId],
    queryFn: () => listAiProviderRotationRuns(activeProviderId),
    enabled: Boolean(activeProviderId)
  })

  const eventsQuery = useQuery({
    queryKey: ['ai-rotation-events', activeProviderId],
    queryFn: () => listAiProviderRotationEvents(activeProviderId),
    enabled: Boolean(activeProviderId)
  })

  const quotaQuery = useQuery({
    queryKey: ['ai-quotas'],
    queryFn: listAiQuotaPolicies
  })

  const usageQuery = useQuery({
    queryKey: ['ai-quota-usage'],
    queryFn: listAiQuotaUsage
  })

  const policyTemplatesQuery = useQuery({
    queryKey: ['ai-policy-templates'],
    queryFn: listAiPolicyTemplates
  })

  const overviewQuery = useQuery({
    queryKey: ['ai-governance-overview'],
    queryFn: () => getAiGovernanceOverview({ windowHours: 24 })
  })

  const overview = overviewQuery.data

  const cryptoProvidersQuery = useQuery({
    queryKey: ['ai-crypto-providers'],
    queryFn: listAiCryptoProviders
  })

  const cryptoValidationsQuery = useQuery({
    queryKey: ['ai-crypto-validations'],
    queryFn: () =>
      listAiCryptoValidations({
        limit: 20,
        offset: 0
      })
  })

  const cryptoPolicyQuery = useQuery({
    queryKey: ['ai-crypto-policy'],
    queryFn: getAiCryptoPolicy
  })

  const cryptoPolicy = cryptoPolicyQuery.data

  useEffect(() => {
    if (!cryptoPolicy) return
    if (cryptoPolicy.policyMode === 'strict' || cryptoPolicy.policyMode === 'compat') {
      setCryptoPolicyMode(cryptoPolicy.policyMode)
    }
    setCryptoAllowMock(Boolean(cryptoPolicy.allowMock))
    setCryptoRequireValidation(Boolean(cryptoPolicy.requireProviderValidation))
    setCryptoValidationTtlHours(Number(cryptoPolicy.validationTtlHours ?? 24))
  }, [cryptoPolicy])

  const quotaMutation = useMutation({
    mutationFn: async () =>
      upsertAiQuotaPolicy({
        task: quotaTask,
        dailyLimit: quotaLimit,
        status: 'active'
      }),
    onSuccess: async () => {
      setStatusMessage('Quota policy saved')
      await quotaQuery.refetch()
      await usageQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Quota update failed')
    }
  })

  const rotationPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!activeProviderId) throw new Error('Select provider')
      return upsertAiProviderRotationPolicy(activeProviderId, {
        mode: 'manual',
        status: 'active',
        rotateEveryHours: 24
      })
    },
    onSuccess: () => {
      setStatusMessage('Rotation policy updated')
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Rotation policy update failed')
    }
  })

  const validateCryptoMutation = useMutation({
    mutationFn: async () =>
      validateAiCryptoProvider({
        provider: cryptoProvider,
        mode: cryptoValidationMode
      }),
    onSuccess: payload => {
      const suffix = payload.validationId ? ` (validation #${payload.validationId})` : ''
      const failureMessage =
        payload.errorCode === 'kms_validation_stale'
          ? 'provider validation stale, run live validation to refresh'
          : payload.message ?? 'provider validation failed'
      setStatusMessage(payload.valid ? `${cryptoProvider} ${payload.mode} validation passed${suffix}` : `${failureMessage}${suffix}`)
      void cryptoProvidersQuery.refetch()
      void cryptoValidationsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'provider validation failed')
    }
  })

  const saveCryptoPolicyMutation = useMutation({
    mutationFn: async () =>
      upsertAiCryptoPolicy({
        policyMode: cryptoPolicyMode,
        allowMock: cryptoAllowMock,
        requireProviderValidation: cryptoRequireValidation,
        validationTtlHours: cryptoValidationTtlHours
      }),
    onSuccess: async () => {
      setStatusMessage('Crypto policy saved')
      await cryptoPolicyQuery.refetch()
      await cryptoProvidersQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'crypto policy update failed')
    }
  })

  const cryptoProviderItems = (cryptoProvidersQuery.data ?? []) as CredentialCryptoAdapterDescriptor[]
  const cryptoValidationRows = asArrayRows(cryptoValidationsQuery.data)
  const rotationRuns = asArrayRows(runsQuery.data)
  const rotationEvents = asArrayRows(eventsQuery.data)
  const quotaRows = asArrayRows(quotaQuery.data)
  const usageRows = asArrayRows(usageQuery.data)
  const templateRows = asArrayRows(policyTemplatesQuery.data)

  const overviewRows: Array<Record<string, unknown>> = [
    {
      section: 'providers',
      total: overview?.providers?.total ?? 0,
      active: overview?.providers?.active ?? 0,
      disabled: overview?.providers?.disabled ?? 0
    },
    {
      section: 'models',
      total: overview?.models?.total ?? 0,
      active: overview?.models?.active ?? 0,
      disabled: overview?.models?.disabled ?? 0
    },
    {
      section: 'bindings',
      total: overview?.bindings?.total ?? 0,
      healthy: overview?.bindings?.healthyCount ?? 0,
      unhealthy: overview?.bindings?.unhealthyCount ?? 0
    },
    {
      section: 'rotation',
      total: overview?.rotation?.totalRuns ?? 0,
      failed: overview?.rotation?.failedRuns ?? 0,
      failureRate: overview?.rotation?.failureRate ?? 0
    },
    {
      section: 'quota',
      total: overview?.quota?.requestCount ?? 0,
      success: overview?.quota?.successCount ?? 0,
      errors: overview?.quota?.errorCount ?? 0
    }
  ]

  const cryptoProviderRows = cryptoProviderItems.map(item => ({
    adapterId: item.adapterId,
    provider: item.provider,
    configured: item.configured,
    liveReady: item.liveReady,
    lastValidationAt: item.lastValidationAt ?? '-',
    lastErrorCode: item.lastErrorCode ?? '-'
  }))

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section style={{ display: 'grid', gap: 12 }}>
        <header className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--font-title), sans-serif', fontSize: 22 }}>AI Governance</strong>
            <Link href="/ai/providers" className="badge badge-warn">
              Providers
            </Link>
            <Link href="/ai/bindings" className="badge badge-warn">
              Bindings
            </Link>
          </div>
          <select
            data-testid="ai-governance-provider-select"
            aria-label="AI governance provider"
            value={activeProviderId}
            onChange={event => setProviderId(event.target.value)}
            style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px', maxWidth: 320 }}
          >
            {providerItems.map(provider => (
              <option key={String(provider.id)} value={String(provider.id)}>
                {String(provider.name ?? provider.code ?? provider.id)}
              </option>
            ))}
          </select>
          <button
            data-testid="ai-governance-upsert-rotation-policy"
            type="button"
            onClick={() => rotationPolicyMutation.mutate()}
            style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '8px 10px', width: 'fit-content' }}
          >
            Upsert Rotation Policy
          </button>
          {statusMessage ? (
            <span data-testid="ai-governance-status" className="badge badge-warn" style={{ width: 'fit-content' }}>
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={overviewQuery.isLoading}
          error={overviewQuery.error}
          empty={!overview}
          loadingLabel="Loading AI governance overview..."
          emptyLabel="No governance overview available."
          retry={() => {
            void overviewQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Overview</strong>
            <MetricStrip
              testId="ai-governance-overview-strip"
              items={[
                {
                  label: 'bindings healthy',
                  value: `${overview?.bindings?.healthyCount ?? 0}/${overview?.bindings?.total ?? 0}`,
                  tone: 'ok'
                },
                {
                  label: 'rotation failure rate',
                  value: String(overview?.rotation?.failureRate ?? 0),
                  tone: (overview?.rotation?.failureRate ?? 0) > 0 ? 'warn' : 'ok'
                },
                {
                  label: 'quota error rate',
                  value: String(overview?.quota?.errorRate ?? 0),
                  tone: (overview?.quota?.errorRate ?? 0) > 0 ? 'warn' : 'ok'
                },
                {
                  label: 'open alerts',
                  value: String(overview?.alerts?.open ?? 0),
                  tone: (overview?.alerts?.open ?? 0) > 0 ? 'warn' : 'ok'
                }
              ]}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span data-testid="ai-overview-binding-health" className="badge badge-ok">
                bindings healthy: {overview?.bindings?.healthyCount ?? 0}/{overview?.bindings?.total ?? 0}
              </span>
              <span data-testid="ai-overview-rotation-failure-rate" className="badge badge-warn">
                rotation failure rate: {overview?.rotation?.failureRate ?? 0}
              </span>
              <span data-testid="ai-overview-quota-error-rate" className="badge badge-warn">
                quota error rate: {overview?.quota?.errorRate ?? 0}
              </span>
            </div>
            <OperationalTable
              testId="ai-governance-overview-table"
              columns={[
                { key: 'section', label: 'Section', render: row => String(row.section ?? '-') },
                { key: 'total', label: 'Total', render: row => String(row.total ?? '-') },
                {
                  key: 'statusA',
                  label: 'Status A',
                  render: row =>
                    String(
                      row.active ?? row.healthy ?? row.success ?? row.failed ?? '-'
                    )
                },
                {
                  key: 'statusB',
                  label: 'Status B',
                  render: row =>
                    String(
                      row.disabled ?? row.unhealthy ?? row.errors ?? row.failureRate ?? '-'
                    )
                }
              ]}
              rows={overviewRows}
              rowKey={(row, index) => `${String(row.section ?? 'section')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No overview rows"
            />
            <AdvancedJsonPanel testId="ai-governance-overview" value={overview ?? {}} />
          </article>
        </LoadablePanel>

        <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <strong>Crypto providers</strong>
          <form
            data-testid="ai-governance-crypto-policy-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await saveCryptoPolicyMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <select
              data-testid="ai-governance-crypto-policy-mode"
              aria-label="Crypto policy mode"
              value={cryptoPolicyMode}
              onChange={event => setCryptoPolicyMode(event.target.value as 'strict' | 'compat')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="compat">compat</option>
              <option value="strict">strict</option>
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                data-testid="ai-governance-crypto-allow-mock"
                type="checkbox"
                checked={cryptoAllowMock}
                onChange={event => setCryptoAllowMock(event.target.checked)}
              />
              allow mock
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                data-testid="ai-governance-crypto-require-validation"
                type="checkbox"
                checked={cryptoRequireValidation}
                onChange={event => setCryptoRequireValidation(event.target.checked)}
              />
              require provider validation
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              validation ttl (hours)
              <input
                data-testid="ai-governance-crypto-validation-ttl"
                type="number"
                min={1}
                max={720}
                value={cryptoValidationTtlHours}
                onChange={event => setCryptoValidationTtlHours(Number(event.target.value || 24))}
                style={{ borderRadius: 8, border: '1px solid var(--line)', padding: '4px 8px', width: 92 }}
              />
            </label>
            <button
              data-testid="ai-governance-crypto-policy-save"
              type="submit"
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
            >
              Save Crypto Policy
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              data-testid="ai-governance-crypto-provider-select"
              aria-label="Crypto validation provider"
              value={cryptoProvider}
              onChange={event => setCryptoProvider(event.target.value as 'local-aes' | 'aws-kms' | 'azure-keyvault')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="local-aes">local-aes</option>
              <option value="aws-kms">aws-kms</option>
              <option value="azure-keyvault">azure-keyvault</option>
            </select>
            <select
              data-testid="ai-governance-crypto-validate-mode"
              aria-label="Crypto validation mode"
              value={cryptoValidationMode}
              onChange={event => setCryptoValidationMode(event.target.value as 'dry_run' | 'live')}
              style={{ borderRadius: 10, border: '1px solid var(--line)', padding: '8px 10px' }}
            >
              <option value="dry_run">dry_run</option>
              <option value="live">live</option>
            </select>
            <button
              data-testid="ai-governance-crypto-provider-validate"
              type="button"
              onClick={() => validateCryptoMutation.mutate()}
              style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}
            >
              Validate Provider
            </button>
          </div>

          <MetricStrip
            testId="ai-governance-crypto-strip"
            items={[
              { label: 'providers', value: cryptoProviderRows.length, tone: 'ok' },
              {
                label: 'live ready',
                value: cryptoProviderRows.filter(item => item.liveReady === true).length,
                tone: 'ok'
              },
              { label: 'validations', value: cryptoValidationRows.length, tone: 'warn' }
            ]}
          />

          <LoadablePanel
            loading={cryptoProvidersQuery.isLoading}
            error={cryptoProvidersQuery.error}
            empty={cryptoProviderRows.length === 0}
            loadingLabel="Loading crypto providers..."
            emptyLabel="No crypto providers configured."
            retry={() => {
              void cryptoProvidersQuery.refetch()
            }}
          >
            <OperationalTable
              testId="ai-governance-crypto-provider-table"
              columns={[
                { key: 'provider', label: 'provider', render: row => String(row.provider ?? '-') },
                { key: 'configured', label: 'configured', render: row => String(Boolean(row.configured)) },
                { key: 'liveReady', label: 'liveReady', render: row => String(Boolean(row.liveReady)) },
                { key: 'lastValidationAt', label: 'last validation', render: row => String(row.lastValidationAt ?? '-') },
                { key: 'lastErrorCode', label: 'last error', render: row => String(row.lastErrorCode ?? '-') }
              ]}
              rows={cryptoProviderRows as Array<Record<string, unknown>>}
              rowKey={(row, index) => `${String(row.adapterId ?? 'provider')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No providers"
            />
            <AdvancedJsonPanel title="Raw provider payload" testId="ai-governance-crypto-providers" value={cryptoProviderItems} />
          </LoadablePanel>

          <strong>Validation history</strong>
          <LoadablePanel
            loading={cryptoValidationsQuery.isLoading}
            error={cryptoValidationsQuery.error}
            empty={cryptoValidationRows.length === 0}
            loadingLabel="Loading crypto validation history..."
            emptyLabel="No validation records"
            retry={() => {
              void cryptoValidationsQuery.refetch()
            }}
          >
            <OperationalTable
              testId="ai-crypto-validation-history"
              columns={[
                { key: 'provider', label: 'provider', render: row => String(row.provider ?? '-') },
                { key: 'mode', label: 'mode', render: row => String(row.mode ?? '-') },
                {
                  key: 'result',
                  label: 'result',
                  render: row => (
                    <span className={row.success === true ? 'badge badge-ok' : 'badge badge-danger'}>
                      {row.success === true ? 'success' : 'failed'}
                    </span>
                  )
                },
                { key: 'requestId', label: 'requestId', render: row => String(row.requestId ?? '-') },
                { key: 'createdAt', label: 'createdAt', render: row => String(row.createdAt ?? '-') }
              ]}
              rows={cryptoValidationRows}
              rowKey={(row, index) => `${String(row.id ?? 'validation')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No validation records"
            />
          </LoadablePanel>
        </section>

        <LoadablePanel
          loading={runsQuery.isLoading}
          error={runsQuery.error}
          empty={rotationRuns.length === 0}
          loadingLabel="Loading rotation runs..."
          emptyLabel="No rotation runs"
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Rotation runs</strong>
            <OperationalTable
              testId="ai-governance-rotation-runs-table"
              columns={[
                { key: 'id', label: 'id', render: row => String(row.id ?? '-') },
                { key: 'status', label: 'status', render: row => String(row.status ?? '-') },
                { key: 'createdAt', label: 'createdAt', render: row => String(row.createdAt ?? row.startedAt ?? '-') }
              ]}
              rows={rotationRuns.slice(0, 20)}
              rowKey={(row, index) => `${String(row.id ?? 'run')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No rotation runs"
            />
          </article>
        </LoadablePanel>

        <LoadablePanel
          loading={eventsQuery.isLoading}
          error={eventsQuery.error}
          empty={rotationEvents.length === 0}
          loadingLabel="Loading rotation events..."
          emptyLabel="No rotation events"
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Rotation events</strong>
            <OperationalTable
              testId="ai-governance-rotation-events-table"
              columns={[
                { key: 'id', label: 'id', render: row => String(row.id ?? '-') },
                { key: 'eventType', label: 'event', render: row => String(row.eventType ?? row.type ?? '-') },
                { key: 'createdAt', label: 'createdAt', render: row => String(row.createdAt ?? '-') }
              ]}
              rows={rotationEvents.slice(0, 20)}
              rowKey={(row, index) => `${String(row.id ?? 'event')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No rotation events"
            />
          </article>
        </LoadablePanel>

        <section className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <strong>Quota policy</strong>
          <form
            data-testid="ai-governance-quota-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await quotaMutation.mutateAsync()
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input
              data-testid="ai-governance-quota-task"
              aria-label="Quota task"
              value={quotaTask}
              onChange={event => setQuotaTask(event.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <input
              data-testid="ai-governance-quota-limit"
              aria-label="Daily quota limit"
              value={quotaLimit}
              onChange={event => setQuotaLimit(Number(event.target.value))}
              type="number"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px' }}
            />
            <button data-testid="ai-governance-quota-submit" type="submit" style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', padding: '0 12px' }}>
              Save
            </button>
          </form>

          <LoadablePanel
            loading={quotaQuery.isLoading}
            error={quotaQuery.error}
            empty={quotaRows.length === 0}
            loadingLabel="Loading quota policies..."
            emptyLabel="No quota policies"
            retry={() => {
              void quotaQuery.refetch()
            }}
          >
            <OperationalTable
              testId="ai-governance-quota-table"
              columns={[
                { key: 'task', label: 'task', render: row => String(row.task ?? '-') },
                { key: 'dailyLimit', label: 'limit', render: row => String(row.dailyLimit ?? row.limit ?? 0) },
                { key: 'status', label: 'status', render: row => String(row.status ?? '-') }
              ]}
              rows={quotaRows}
              rowKey={(row, index) => `${String(row.id ?? row.task ?? 'quota')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No quota policies"
            />
          </LoadablePanel>

          <LoadablePanel
            loading={usageQuery.isLoading}
            error={usageQuery.error}
            empty={usageRows.length === 0}
            loadingLabel="Loading quota usage..."
            emptyLabel="No quota usage"
          >
            <OperationalTable
              testId="ai-governance-usage-table"
              columns={[
                { key: 'task', label: 'task', render: row => String(row.task ?? '-') },
                { key: 'windowHour', label: 'window', render: row => String(row.windowHour ?? row.window ?? '-') },
                { key: 'used', label: 'used', render: row => String(row.used ?? row.total ?? 0) }
              ]}
              rows={usageRows}
              rowKey={(row, index) => `${String(row.id ?? row.task ?? 'usage')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No quota usage"
            />
          </LoadablePanel>

          <AdvancedJsonPanel testId="ai-governance-quota-json" value={{ policies: quotaQuery.data, usage: usageQuery.data }} />
        </section>

        <LoadablePanel
          loading={policyTemplatesQuery.isLoading}
          error={policyTemplatesQuery.error}
          empty={templateRows.length === 0}
          loadingLabel="Loading AI policy templates..."
          emptyLabel="No policy templates"
          retry={() => {
            void policyTemplatesQuery.refetch()
          }}
        >
          <article className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <strong>Policy templates</strong>
            <OperationalTable
              testId="ai-governance-policy-template-table"
              columns={[
                { key: 'name', label: 'name', render: row => String(row.name ?? row.code ?? row.id ?? '-') },
                { key: 'code', label: 'code', render: row => String(row.code ?? '-') }
              ]}
              rows={templateRows}
              rowKey={(row, index) => `${String(row.id ?? row.code ?? 'template')}-${index}`}
              onRowClick={row => setSelectedDetail(row)}
              emptyLabel="No policy templates"
            />
            <AdvancedJsonPanel testId="ai-governance-policy-template-json" value={policyTemplatesQuery.data} />
          </article>
        </LoadablePanel>

        <DetailDrawer
          testId="ai-governance-detail-drawer"
          title="AI governance detail"
          open={selectedDetail !== null}
          onClose={() => setSelectedDetail(null)}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(selectedDetail ?? {}, null, 2)}</pre>
        </DetailDrawer>
      </section>
    </AccessGuard>
  )
}
