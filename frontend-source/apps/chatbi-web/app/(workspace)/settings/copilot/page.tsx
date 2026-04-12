import Link from 'next/link'
import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsCopilotPage() {
  return (
    <SettingsPanel
      testId="settings-page-copilot"
      title="Copilot Settings"
      description="Manage copilot publish policy, evaluation gates and rollout defaults."
    >
      <SettingsPreviewNotice scope="copilot policy parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">copilot governance</NexusBadge>
        <NexusBadge tone="neutral">model guardrail surface</NexusBadge>
      </div>
      <div className="settings-overview-card-links">
        <Link data-testid="settings-copilot-workbench-link" href="/xpert/w" className="settings-x-head-link">
          Choose expert in Workbench
        </Link>
      </div>
    </SettingsPanel>
  )
}
