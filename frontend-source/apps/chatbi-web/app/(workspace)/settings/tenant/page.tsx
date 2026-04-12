'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getTenantSettings, saveTenantSettings, type TenantSettings } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusInput } from '@/modules/shared/ui/primitives'

type TenantFormState = {
  tenantName: string
  timezone: string
  defaultLanguage: string
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function pickTenantForm(settings: TenantSettings | undefined): TenantFormState {
  if (!settings) {
    return {
      tenantName: '',
      timezone: '',
      defaultLanguage: ''
    }
  }
  return {
    tenantName: asString(settings.tenantName || settings.name || settings.companyName || settings.brandName),
    timezone: asString(settings.timezone || settings.defaultTimezone),
    defaultLanguage: asString(settings.defaultLanguage || settings.language || settings.locale)
  }
}

export default function SettingsTenantPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [form, setForm] = useState<TenantFormState>({
    tenantName: '',
    timezone: '',
    defaultLanguage: ''
  })

  const settingsQuery = useQuery({
    queryKey: ['settings-tenant-settings'],
    queryFn: () => getTenantSettings()
  })

  const baseSettings = useMemo(() => settingsQuery.data ?? {}, [settingsQuery.data])

  useEffect(() => {
    setForm(pickTenantForm(settingsQuery.data))
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () =>
      saveTenantSettings({
        ...(baseSettings as TenantSettings),
        tenantName: form.tenantName,
        timezone: form.timezone,
        defaultLanguage: form.defaultLanguage
      }),
    onSuccess: () => {
      setStatus('saved')
      void settingsQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  return (
    <SettingsPanel
      testId="settings-page-tenant"
      title="Tenant"
      description="Tenant-level policy, branding, and billing metadata."
    >
      <LoadablePanel
        loading={settingsQuery.isLoading}
        error={settingsQuery.error}
        retry={() => {
          void settingsQuery.refetch()
        }}
      >
        <section className="settings-tenant-form">
          <label className="settings-form-field">
            <span>Tenant Name</span>
            <NexusInput
              data-testid="settings-tenant-name"
              value={form.tenantName}
              onChange={event => setForm(current => ({ ...current, tenantName: event.target.value }))}
              placeholder="PA Nexus"
            />
          </label>
          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>Timezone</span>
              <NexusInput
                data-testid="settings-tenant-timezone"
                value={form.timezone}
                onChange={event => setForm(current => ({ ...current, timezone: event.target.value }))}
                placeholder="Asia/Shanghai"
              />
            </label>
            <label className="settings-form-field">
              <span>Default Language</span>
              <NexusInput
                data-testid="settings-tenant-language"
                value={form.defaultLanguage}
                onChange={event => setForm(current => ({ ...current, defaultLanguage: event.target.value }))}
                placeholder="zh-CN"
              />
            </label>
          </div>

          <ActionGuard scopes={['allow:write:model:*']}>
            {permission => {
              const canWrite = permission.state === 'enabled'
              return (
                <div className="settings-inline-actions">
                  <NexusButton
                    data-testid="settings-tenant-save"
                    type="button"
                    variant="primary"
                    disabled={!canWrite || saveMutation.isPending}
                    title={permission.reason}
                    onClick={() => {
                      setStatus(null)
                      saveMutation.mutate()
                    }}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </NexusButton>
                  {!canWrite ? (
                    <NexusBadge tone="neutral" data-testid="settings-tenant-write-warning">
                      Read-only mode: write actions are disabled
                    </NexusBadge>
                  ) : null}
                </div>
              )
            }}
          </ActionGuard>
          {status ? (
            <NexusBadge data-testid="settings-tenant-status" tone={status === 'saved' ? 'ok' : 'warn'}>
              {status}
            </NexusBadge>
          ) : null}
        </section>
      </LoadablePanel>
    </SettingsPanel>
  )
}
