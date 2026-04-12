import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import SettingsUsersPage from '../../settings/users/page'

export default function ProjectMembersPage() {
  return (
    <BiCanonicalShell
      activeTab="project"
      title="Project Members"
      description="Canonical project members route aligned with xpert project IA."
    >
      <BiCanonicalPanel
        testId="bi-project-members"
        title="Members"
        description="Project member management now runs the live users directory module."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/settings/users" className="badge badge-ok">
            Open Settings Users
          </Link>
          <Link href="/project/files" className="badge badge-warn">
            Open Project Files
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-runtime-members">
        <SettingsUsersPage />
      </section>
    </BiCanonicalShell>
  )
}
