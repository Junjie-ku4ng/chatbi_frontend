'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { changeMyPassword, getMyProfile } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusInput } from '@/modules/shared/ui/primitives'

const PASSWORD_MIN_LENGTH = 8

export default function SettingsAccountPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['settings-account-password-profile'],
    queryFn: () => getMyProfile()
  })

  const userId = profileQuery.data?.id
  const hasMinLength = nextPassword.length >= PASSWORD_MIN_LENGTH
  const passwordMatched = nextPassword.length > 0 && nextPassword === confirmPassword
  const isFormValid = Boolean(userId && currentPassword && hasMinLength && passwordMatched)

  const warnings = useMemo(() => {
    const list: string[] = []
    if (nextPassword && !hasMinLength) {
      list.push(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    }
    if (confirmPassword && !passwordMatched) {
      list.push('Confirm password must match new password')
    }
    return list
  }, [confirmPassword, hasMinLength, nextPassword, passwordMatched])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('User context unavailable')
      }
      return changeMyPassword(userId, {
        hash: currentPassword,
        password: nextPassword
      })
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNextPassword('')
      setConfirmPassword('')
      setStatus('saved')
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  return (
    <SettingsPanel
      testId="settings-page-account-password"
      title="Account Password"
      description="Rotate credentials and enforce password policy updates."
    >
      <LoadablePanel
        loading={profileQuery.isLoading}
        error={profileQuery.error}
        retry={() => {
          void profileQuery.refetch()
        }}
      >
        <section className="settings-account-form">
          <label className="settings-form-field">
            <span>Current Password</span>
            <NexusInput
              data-testid="settings-password-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
          </label>
          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>New Password</span>
              <NexusInput
                data-testid="settings-password-next"
                type="password"
                autoComplete="new-password"
                value={nextPassword}
                onChange={event => setNextPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            <label className="settings-form-field">
              <span>Confirm Password</span>
              <NexusInput
                data-testid="settings-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
              />
            </label>
          </div>
          {warnings.length > 0 ? (
            <div className="settings-password-warnings">
              {warnings.map((warning, index) => (
                <NexusBadge key={warning} tone="warn" data-testid={`settings-password-warning-${index}`}>
                  {warning}
                </NexusBadge>
              ))}
            </div>
          ) : null}
          <ActionGuard scopes={['allow:write:model:*']}>
            {permission => {
              const canWrite = permission.state === 'enabled'
              return (
                <div className="settings-inline-actions">
                  <NexusButton
                    data-testid="settings-password-save"
                    type="button"
                    variant="primary"
                    disabled={!canWrite || !isFormValid || saveMutation.isPending}
                    title={permission.reason}
                    onClick={() => {
                      setStatus(null)
                      saveMutation.mutate()
                    }}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </NexusButton>
                  {!canWrite ? (
                    <NexusBadge tone="neutral" data-testid="settings-password-write-warning">
                      Read-only mode: write actions are disabled
                    </NexusBadge>
                  ) : null}
                </div>
              )
            }}
          </ActionGuard>
          {status ? (
            <NexusBadge data-testid="settings-password-status" tone={status === 'saved' ? 'ok' : 'warn'}>
              {status}
            </NexusBadge>
          ) : null}
        </section>
      </LoadablePanel>
    </SettingsPanel>
  )
}
