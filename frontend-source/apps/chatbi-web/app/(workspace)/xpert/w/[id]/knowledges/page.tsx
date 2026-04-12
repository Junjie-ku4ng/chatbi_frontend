'use client'

import { useParams } from 'next/navigation'
import { XpertWorkspacePageShell } from '@/modules/xpert/workspace'
import { XpertWorkspaceKnowledgesPanel } from '@/modules/xpert/workspace-tab-content'

export default function XpertWorkspaceKnowledgesPage() {
  const params = useParams<{ id: string }>()

  return (
    <XpertWorkspacePageShell
      workspaceId={params.id}
      title="Workspace Knowledges"
      summary="Browse and attach knowledge resources for this workspace."
      activeTab="knowledges"
    >
      <XpertWorkspaceKnowledgesPanel workspaceId={params.id} />
    </XpertWorkspacePageShell>
  )
}
