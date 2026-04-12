'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceOverviewPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceHomePage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Xpert Workspace"
      summary="Route hub for xpert workspace tabs."
    >
      <XpertWorkspaceOverviewPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
