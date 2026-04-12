import { ForbiddenState } from '@/modules/shared/states/forbidden-state'

export default function ForbiddenPage() {
  return (
    <main className="shell">
      <ForbiddenState message="Your current credentials do not allow this workspace." />
    </main>
  )
}
