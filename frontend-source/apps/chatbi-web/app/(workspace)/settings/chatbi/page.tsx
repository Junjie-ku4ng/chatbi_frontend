import Link from 'next/link'
import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsChatbiPage() {
  return (
    <SettingsPanel
      testId="settings-page-chatbi"
      title="ChatBI Settings"
      description="Manage ChatBI runtime defaults, fallback policy and execution posture."
    >
      <SettingsPreviewNotice scope="chat runtime parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">runtime policy</NexusBadge>
        <NexusBadge tone="neutral">xpert facade surface</NexusBadge>
      </div>
      <div className="settings-overview-card-links">
        <Link href="/chat" className="settings-x-head-link">
          Open Chat
        </Link>
        <Link href="/xpert/w" className="settings-x-head-link">
          Open Workbench
        </Link>
      </div>
    </SettingsPanel>
  )
}
