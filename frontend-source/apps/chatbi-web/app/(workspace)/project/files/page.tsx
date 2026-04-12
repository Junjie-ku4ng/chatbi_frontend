import Link from 'next/link'
import { BiCanonicalPanel, BiCanonicalShell } from '@/modules/bi/canonical-shell'
import { ProjectFilesWorkspace } from '@/modules/bi/project-files-workspace'

export default function ProjectFilesPage() {
  return (
    <BiCanonicalShell
      activeTab="project"
      title="Project Files"
      description="Canonical project files route for upload/version/list workflow."
    >
      <BiCanonicalPanel
        testId="bi-project-files"
        title="Files"
        description="Project file workspace supports upload, replacement versioning, and removal."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/project/members" className="badge badge-warn">
            Open Project Members
          </Link>
          <Link href="/project/indicators" className="badge badge-ok">
            Open Project Indicators
          </Link>
        </div>
      </BiCanonicalPanel>
      <section data-testid="bi-project-runtime-files">
        <ProjectFilesWorkspace />
      </section>
    </BiCanonicalShell>
  )
}
