'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createToolsetPlugin,
  createToolsetPluginVersion,
  getToolsetPluginPolicy,
  listToolsetPlugins,
  publishToolsetPluginVersion,
  upsertToolsetPluginPolicy
} from '@/modules/governance/toolset/api'
import { ToolsetCompatNotice } from '@/modules/governance/toolset/compat-notice'
import { AccessGuard } from '@/modules/shared/rbac/access-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'

export default function ToolsetPluginsPage() {
  const [code, setCode] = useState('indicator-governance')
  const [name, setName] = useState('Indicator Governance Plugin')
  const [selectedPluginId, setSelectedPluginId] = useState<string | undefined>()
  const [version, setVersion] = useState('v1')
  const [signature, setSignature] = useState('dev-signature')
  const [timeoutMs, setTimeoutMs] = useState(5000)
  const [maxPayloadBytes, setMaxPayloadBytes] = useState(262144)
  const [maxActionsPerMinute, setMaxActionsPerMinute] = useState(120)
  const [allowedDomains, setAllowedDomains] = useState('indicator_governance')
  const [policyStatus, setPolicyStatus] = useState<'active' | 'disabled'>('active')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const pluginsQuery = useQuery({
    queryKey: ['toolset-plugins'],
    queryFn: listToolsetPlugins
  })

  const createPluginMutation = useMutation({
    mutationFn: async () => createToolsetPlugin({ code, name, status: 'active' }),
    onSuccess: async () => {
      setStatusMessage('Plugin created')
      await pluginsQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Plugin creation failed')
    }
  })

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPluginId) throw new Error('Select plugin')
      return createToolsetPluginVersion(selectedPluginId, {
        version,
        signature,
        manifest: {
          actions: [
            {
              action: 'list_webhook_failures',
              domain: 'indicator_governance',
              executor: 'indicator.webhook.failures',
              description: 'List webhook failures'
            }
          ]
        }
      })
    },
    onSuccess: () => {
      setStatusMessage('Plugin version created')
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Plugin version creation failed')
    }
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPluginId) throw new Error('Select plugin')
      return publishToolsetPluginVersion(selectedPluginId, version)
    },
    onSuccess: () => {
      setStatusMessage('Plugin version published')
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Plugin publish failed')
    }
  })

  const items = (pluginsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? []
  const policyQuery = useQuery({
    queryKey: ['toolset-plugin-policy', selectedPluginId],
    queryFn: () => getToolsetPluginPolicy(selectedPluginId as string),
    enabled: Boolean(selectedPluginId)
  })

  useEffect(() => {
    const policy = (policyQuery.data ?? null) as Record<string, unknown> | null
    if (!policy) return
    if (typeof policy.timeoutMs === 'number') setTimeoutMs(policy.timeoutMs)
    if (typeof policy.maxPayloadBytes === 'number') setMaxPayloadBytes(policy.maxPayloadBytes)
    if (typeof policy.maxActionsPerMinute === 'number') setMaxActionsPerMinute(policy.maxActionsPerMinute)
    if (Array.isArray(policy.allowedDomains)) {
      setAllowedDomains((policy.allowedDomains as unknown[]).map(item => String(item)).join(','))
    }
    if (policy.status === 'active' || policy.status === 'disabled') {
      setPolicyStatus(policy.status as 'active' | 'disabled')
    }
  }, [policyQuery.data])

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPluginId) throw new Error('Select plugin')
      return upsertToolsetPluginPolicy(selectedPluginId, {
        timeoutMs,
        maxPayloadBytes,
        maxActionsPerMinute,
        allowedDomains: allowedDomains
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        status: policyStatus
      })
    },
    onSuccess: async () => {
      setStatusMessage('Plugin policy saved')
      await policyQuery.refetch()
    },
    onError: error => {
      setStatusMessage(error instanceof Error ? error.message : 'Plugin policy save failed')
    }
  })

  return (
    <AccessGuard scopes={['allow:write:model:*']}>
      <section className="nexus-domain-stack">
        <header className="card nexus-domain-hero toolset-hero">
          <div className="nexus-domain-heading-row toolset-heading-row">
            <strong className="toolset-title">Toolset Plugins</strong>
            <Link href="/toolset/actions" className="badge badge-warn">
              Actions
            </Link>
          </div>
          <ToolsetCompatNotice canonicalHref="/settings/plugins" canonicalLabel="Canonical plugin catalog" />
          <form
            data-testid="toolset-plugin-create-form"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              await createPluginMutation.mutateAsync()
            }}
            className="nexus-domain-form-row toolset-form-row"
          >
            <input
              data-testid="toolset-plugin-code"
              value={code}
              onChange={event => setCode(event.target.value)}
              className="nexus-domain-input toolset-input"
            />
            <input
              data-testid="toolset-plugin-name"
              value={name}
              onChange={event => setName(event.target.value)}
              className="nexus-domain-input toolset-input toolset-input-xl"
            />
            <button data-testid="toolset-plugin-create-submit" type="submit" className="nexus-domain-btn toolset-btn">
              Create Plugin
            </button>
          </form>
          {statusMessage ? (
            <span data-testid="toolset-plugin-status" className="badge badge-warn toolset-fit">
              {statusMessage}
            </span>
          ) : null}
        </header>

        <LoadablePanel
          loading={pluginsQuery.isLoading}
          error={pluginsQuery.error}
          empty={items.length === 0}
          loadingLabel="Loading toolset plugins..."
        >
          <div className="nexus-domain-list toolset-list">
            {items.map(item => (
              <article key={String(item.id)} className="card nexus-domain-card toolset-item">
                <div className="toolset-item-main">
                  <strong>{String(item.name ?? item.code ?? item.id)}</strong>
                  <p className="toolset-item-meta">{String(item.status ?? 'active')}</p>
                </div>
                <button
                  data-testid={`toolset-plugin-select-${item.id}`}
                  type="button"
                  className="badge badge-ok"
                  onClick={() => setSelectedPluginId(String(item.id))}
                >
                  Select
                </button>
              </article>
            ))}
          </div>
        </LoadablePanel>

        {selectedPluginId ? (
          <section className="card nexus-domain-card toolset-card">
            <strong>Plugin Version Lifecycle ({selectedPluginId})</strong>
            <form
              data-testid="toolset-plugin-version-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await createVersionMutation.mutateAsync()
              }}
              className="nexus-domain-form-row toolset-form-row"
            >
              <input
                data-testid="toolset-plugin-version"
                value={version}
                onChange={event => setVersion(event.target.value)}
                className="nexus-domain-input toolset-input"
              />
              <input
                data-testid="toolset-plugin-signature"
                value={signature}
                onChange={event => setSignature(event.target.value)}
                className="nexus-domain-input toolset-input toolset-input-wide"
              />
              <button data-testid="toolset-plugin-version-submit" type="submit" className="nexus-domain-btn toolset-btn">
                Create Version
              </button>
              <button
                data-testid="toolset-plugin-publish-submit"
                type="button"
                onClick={() => publishMutation.mutate()}
                className="nexus-domain-btn toolset-btn"
              >
                Publish
              </button>
            </form>
            <form
              data-testid="toolset-plugin-policy-form"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault()
                await savePolicyMutation.mutateAsync()
              }}
              className="nexus-domain-form-row toolset-form-row"
            >
              <input
                data-testid="toolset-plugin-policy-timeout"
                type="number"
                value={timeoutMs}
                onChange={event => setTimeoutMs(Number(event.target.value))}
                className="nexus-domain-input toolset-input"
              />
              <input
                data-testid="toolset-plugin-policy-payload"
                type="number"
                value={maxPayloadBytes}
                onChange={event => setMaxPayloadBytes(Number(event.target.value))}
                className="nexus-domain-input toolset-input"
              />
              <input
                data-testid="toolset-plugin-policy-rate"
                type="number"
                value={maxActionsPerMinute}
                onChange={event => setMaxActionsPerMinute(Number(event.target.value))}
                className="nexus-domain-input toolset-input"
              />
              <input
                data-testid="toolset-plugin-policy-domains"
                value={allowedDomains}
                onChange={event => setAllowedDomains(event.target.value)}
                placeholder="allowed domains csv"
                className="nexus-domain-input toolset-input toolset-input-wide"
              />
              <select
                data-testid="toolset-plugin-policy-status"
                value={policyStatus}
                onChange={event => setPolicyStatus(event.target.value as 'active' | 'disabled')}
                className="nexus-domain-input toolset-input"
              >
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
              <button
                data-testid="toolset-plugin-policy-submit"
                type="submit"
                className="nexus-domain-btn toolset-btn"
              >
                Save Policy
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </AccessGuard>
  )
}
