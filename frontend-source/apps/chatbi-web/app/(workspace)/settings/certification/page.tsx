import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsCertificationPage() {
  return (
    <SettingsPanel
      testId="settings-page-certification"
      title="Certification"
      description="Manage certification policies and compliance checklist templates."
    >
      <SettingsPreviewNotice scope="certification parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">xpert aligned route</NexusBadge>
        <NexusBadge tone="neutral">compliance profile surface</NexusBadge>
      </div>
    </SettingsPanel>
  )
}
