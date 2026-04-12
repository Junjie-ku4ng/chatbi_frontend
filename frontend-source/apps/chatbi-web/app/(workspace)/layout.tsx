import { WorkspaceShell } from '@/modules/shared/layout/workspace-shell'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}

