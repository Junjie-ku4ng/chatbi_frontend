import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsCustomSmtpPage() {
  return (
    <SettingsPanel
      testId="settings-page-custom-smtp"
      title="Custom SMTP"
      description="Manage SMTP relay profile, sender policy and delivery diagnostics."
    >
      <SettingsPreviewNotice scope="smtp parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">smtp relay</NexusBadge>
        <NexusBadge tone="neutral">config surface</NexusBadge>
      </div>
    </SettingsPanel>
  )
}
