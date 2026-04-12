'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceCustomPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceCustomPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace Custom"
      summary="Configure custom plugins and adapters for this workspace."
      activeTab="custom"
    >
      <XpertWorkspaceCustomPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
