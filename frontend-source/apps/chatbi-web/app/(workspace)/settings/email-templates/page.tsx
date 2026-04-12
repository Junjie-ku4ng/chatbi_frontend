import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsEmailTemplatesPage() {
  return (
    <SettingsPanel
      testId="settings-page-email-templates"
      title="Email Templates"
      description="Manage notification templates and locale variants for xpert workflows."
    >
      <SettingsPreviewNotice scope="email template parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">notification templates</NexusBadge>
        <NexusBadge tone="neutral">route parity surface</NexusBadge>
      </div>
    </SettingsPanel>
  )
}
