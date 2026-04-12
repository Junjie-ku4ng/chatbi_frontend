import { SettingsPanel, SettingsPreviewNotice } from '@/modules/settings/shell'
import { NexusBadge } from '@/modules/shared/ui/primitives'

export default function SettingsBusinessAreaPage() {
  return (
    <SettingsPanel
      testId="settings-page-business-area"
      title="Business Area"
      description="Manage business-area ownership boundaries and domain mappings."
    >
      <SettingsPreviewNotice scope="business-area parity surface" />
      <div className="settings-inline-actions">
        <NexusBadge tone="brand">xpert aligned route</NexusBadge>
        <NexusBadge tone="neutral">domain mapping preview surface</NexusBadge>
      </div>
    </SettingsPanel>
  )
}
