'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getMyProfile, type AccountProfile, updateMyProfile } from '@/modules/settings/api'
import { SettingsPanel } from '@/modules/settings/shell'
import { normalizeUiError } from '@/modules/shared/errors/ui-error'
import { ActionGuard } from '@/modules/shared/rbac/action-guard'
import { LoadablePanel } from '@/modules/shared/states/loadable-state'
import { NexusBadge, NexusButton, NexusInput } from '@/modules/shared/ui/primitives'

type ProfileFormState = {
  firstName: string
  lastName: string
  email: string
  username: string
  preferredLanguage: string
  timeZone: string
  imageUrl: string
  tags: string
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function pickProfileForm(profile: AccountProfile | undefined): ProfileFormState {
  if (!profile) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      preferredLanguage: '',
      timeZone: '',
      imageUrl: '',
      tags: ''
    }
  }

  return {
    firstName: asString(profile.firstName),
    lastName: asString(profile.lastName),
    email: asString(profile.email),
    username: asString(profile.username),
    preferredLanguage: asString(profile.preferredLanguage),
    timeZone: asString(profile.timeZone),
    imageUrl: asString(profile.imageUrl),
    tags: Array.isArray(profile.tags) ? profile.tags.join(', ') : ''
  }
}

function splitTags(tags: string) {
  return tags
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export default function SettingsAccountProfilePage() {
  const [status, setStatus] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    preferredLanguage: '',
    timeZone: '',
    imageUrl: '',
    tags: ''
  })

  const profileQuery = useQuery({
    queryKey: ['settings-account-profile'],
    queryFn: () => getMyProfile()
  })

  useEffect(() => {
    setForm(pickProfileForm(profileQuery.data))
  }, [profileQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () =>
      updateMyProfile({
        ...(profileQuery.data ?? {}),
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        username: form.username,
        preferredLanguage: form.preferredLanguage,
        timeZone: form.timeZone,
        imageUrl: form.imageUrl,
        tags: splitTags(form.tags)
      }),
    onSuccess: () => {
      setStatus('saved')
      void profileQuery.refetch()
    },
    onError: error => {
      setStatus(normalizeUiError(error).message)
    }
  })

  return (
    <SettingsPanel
      testId="settings-page-account-profile"
      title="Account Profile"
      description="Manage profile metadata, locale, and identity tags."
    >
      <LoadablePanel
        loading={profileQuery.isLoading}
        error={profileQuery.error}
        retry={() => {
          void profileQuery.refetch()
        }}
      >
        <section className="settings-account-form">
          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>First Name</span>
              <NexusInput
                data-testid="settings-profile-first-name"
                value={form.firstName}
                onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))}
                placeholder="Fengdong"
              />
            </label>
            <label className="settings-form-field">
              <span>Last Name</span>
              <NexusInput
                data-testid="settings-profile-last-name"
                value={form.lastName}
                onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))}
                placeholder="Gu"
              />
            </label>
          </div>

          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>Email</span>
              <NexusInput
                data-testid="settings-profile-email"
                value={form.email}
                onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                placeholder="name@pa.ai"
              />
            </label>
            <label className="settings-form-field">
              <span>Username</span>
              <NexusInput
                data-testid="settings-profile-username"
                value={form.username}
                onChange={event => setForm(current => ({ ...current, username: event.target.value }))}
                placeholder="pa-user"
              />
            </label>
          </div>

          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>Preferred Language</span>
              <NexusInput
                data-testid="settings-profile-language"
                value={form.preferredLanguage}
                onChange={event => setForm(current => ({ ...current, preferredLanguage: event.target.value }))}
                placeholder="zh-CN"
              />
            </label>
            <label className="settings-form-field">
              <span>Time Zone</span>
              <NexusInput
                data-testid="settings-profile-timezone"
                value={form.timeZone}
                onChange={event => setForm(current => ({ ...current, timeZone: event.target.value }))}
                placeholder="Asia/Shanghai"
              />
            </label>
          </div>

          <div className="settings-form-grid">
            <label className="settings-form-field">
              <span>Image URL</span>
              <NexusInput
                data-testid="settings-profile-image-url"
                value={form.imageUrl}
                onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="settings-form-field">
              <span>Tags</span>
              <NexusInput
                data-testid="settings-profile-tags"
                value={form.tags}
                onChange={event => setForm(current => ({ ...current, tags: event.target.value }))}
                placeholder="owner, admin"
              />
            </label>
          </div>

          <ActionGuard scopes={['allow:write:model:*']}>
            {permission => {
              const canWrite = permission.state === 'enabled'
              return (
                <div className="settings-inline-actions">
                  <NexusButton
                    data-testid="settings-profile-save"
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
                    <NexusBadge tone="neutral" data-testid="settings-profile-write-warning">
                      Read-only mode: write actions are disabled
                    </NexusBadge>
                  ) : null}
                </div>
              )
            }}
          </ActionGuard>
          {status ? (
            <NexusBadge data-testid="settings-profile-status" tone={status === 'saved' ? 'ok' : 'warn'}>
              {status}
            </NexusBadge>
          ) : null}
        </section>
      </LoadablePanel>
    </SettingsPanel>
  )
}
