'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceXpertsPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceXpertsPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace Xperts"
      summary="Manage xpert agents and bindings for this workspace."
      activeTab="xperts"
    >
      <XpertWorkspaceXpertsPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
