'use client'

import { NexusBadge, NexusButton, NexusCard, NexusInput, NexusSelect } from '@/modules/shared/ui/primitives'

export type DataSourceFormValues = {
  typeCode: string
  name: string
  host: string
  authType: 'basic' | 'cam' | 'token'
  authRef: string
  optionsText: string
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  values: DataSourceFormValues
  busy?: boolean
  pingBusy?: boolean
  status?: string | null
  onClose: () => void
  onChange: (patch: Partial<DataSourceFormValues>) => void
  onSubmit: () => void
  onTestConnection?: () => void
}

export function DataSourceFormDialog({
  open,
  mode,
  values,
  busy = false,
  pingBusy = false,
  status,
  onClose,
  onChange,
  onSubmit,
  onTestConnection
}: Props) {
  if (!open) {
    return null
  }

  const isCreate = mode === 'create'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'rgba(8, 13, 31, 0.45)'
      }}
    >
      <NexusCard
        data-testid="settings-data-source-form-dialog"
        style={{
          width: 'min(720px, 100%)',
          maxHeight: 'min(90vh, 920px)',
          overflow: 'auto',
          padding: 20,
          display: 'grid',
          gap: 14
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <strong style={{ fontSize: 18 }}>{isCreate ? 'Add data source' : 'Edit data source'}</strong>
            <span style={{ color: 'var(--muted)' }}>
              Register a database or semantic source endpoint for canonical authoring.
            </span>
          </div>
          <NexusBadge tone={isCreate ? 'brand' : 'ok'}>{isCreate ? 'create' : 'edit'}</NexusBadge>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Type code</span>
            <NexusInput
              data-testid="settings-data-source-form-type-code"
              value={values.typeCode}
              disabled={!isCreate}
              onChange={event => onChange({ typeCode: event.target.value })}
              placeholder="pa-tm1"
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Name</span>
            <NexusInput
              data-testid="settings-data-source-form-name"
              value={values.name}
              onChange={event => onChange({ name: event.target.value })}
              placeholder="Sales Warehouse"
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Host</span>
            <NexusInput
              data-testid="settings-data-source-form-host"
              value={values.host}
              onChange={event => onChange({ host: event.target.value })}
              placeholder="https://pa.example.com"
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Auth type</span>
            <NexusSelect
              data-testid="settings-data-source-form-auth-type"
              value={values.authType}
              onChange={event => onChange({ authType: event.target.value as DataSourceFormValues['authType'] })}
            >
              <option value="basic">basic</option>
              <option value="cam">cam</option>
              <option value="token">token</option>
            </NexusSelect>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Auth ref</span>
          <NexusInput
            data-testid="settings-data-source-form-auth-ref"
            value={values.authRef}
            onChange={event => onChange({ authRef: event.target.value })}
            placeholder="credential reference or token"
          />
          {!isCreate ? (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Leave blank to keep the existing credential reference.</span>
          ) : null}
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Options JSON</span>
          <textarea
            data-testid="settings-data-source-form-options"
            value={values.optionsText}
            onChange={event => onChange({ optionsText: event.target.value })}
            placeholder='{}'
            rows={6}
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid var(--line)',
              padding: '10px 12px',
              font: 'inherit',
              resize: 'vertical'
            }}
          />
        </label>

        {status ? (
          <NexusBadge data-testid="settings-data-source-form-status" tone={status.includes('failed') ? 'danger' : 'ok'} style={{ width: 'fit-content' }}>
            {status}
          </NexusBadge>
        ) : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
          {onTestConnection ? (
            <NexusButton
              data-testid="settings-data-source-form-test-connection"
              type="button"
              variant="secondary"
              disabled={busy || pingBusy}
              onClick={onTestConnection}
            >
              {pingBusy ? 'Testing...' : 'Test connection'}
            </NexusButton>
          ) : null}
          <NexusButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </NexusButton>
          <NexusButton data-testid="settings-data-source-form-submit" type="button" variant="primary" disabled={busy} onClick={onSubmit}>
            {busy ? 'Saving...' : isCreate ? 'Create data source' : 'Save data source'}
          </NexusButton>
        </div>
      </NexusCard>
    </div>
  )
}
