'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceBuiltinPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceBuiltinPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace Builtin"
      summary="Use builtin actions and policy modules for this workspace."
      activeTab="builtin"
    >
      <XpertWorkspaceBuiltinPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
