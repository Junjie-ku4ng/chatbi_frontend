'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceDatabasePanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceDatabasePage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace Database"
      summary="Connect semantic models and storage endpoints for this workspace."
      activeTab="database"
    >
      <XpertWorkspaceDatabasePanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
