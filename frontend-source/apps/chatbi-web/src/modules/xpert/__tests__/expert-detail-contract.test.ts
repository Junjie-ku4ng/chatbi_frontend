import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const expertDetailPath = path.resolve(__dirname, '../expert-detail.tsx')
const authPagePath = path.resolve(
  __dirname,
  '../../../../app/(workspace)/xpert/x/[id]/auth/page.tsx'
)

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('xpert expert detail contract', () => {
  it('declares auth tab entry in expert detail nav', () => {
    const source = readSource(expertDetailPath)
    expect(source).toContain("'auth'")
    expect(source).toContain("label: 'Auth'")
    expect(source).toContain('/xpert/x/${encodeURIComponent(expertId)}/auth')
  })

  it('declares auth page shell entry', () => {
    const source = readSource(authPagePath)
    expect(source).toContain('activeTab="auth"')
    expect(source).toContain('XpertExpertAuthCard')
  })

  it('does not fabricate workspace routes from the expert id in the hero links', () => {
    const source = readSource(expertDetailPath)

    expect(source).not.toContain('/xpert/w/${encodeURIComponent(expertId)}/xperts')
    expect(source).not.toContain('Workspace route unresolved')
    expect(source).toContain('data-testid="xpert-expert-workspace-note"')
    expect(source).toContain('xpert-expert-link-row nx-shell-meta-row')
    expect(source).toContain('data-testid="xpert-expert-route-mode" tone="warn" className="nx-shell-readonly-note"')
    expect(source).toContain('data-testid="xpert-expert-route-truth-detail"')
    expect(source).toContain('Workspace selected from /xpert/w')
    expect(source).toContain('This route stays preview-only until a canonical workspace flow is chosen.')
  })

  it('keeps copilot create route in preview mode instead of implying durable publish support', () => {
    const source = readSource(expertDetailPath)

    expect(source).not.toContain('Draft a copilot and publish to this expert domain.')
    expect(source).toContain('Preview draft surface for copilot authoring.')
    expect(source).toContain('Preview-only action')
    expect(source).toContain('data-testid="xpert-expert-copilot-preview-note" tone="warn" className="nx-shell-readonly-note"')
    expect(source).toContain('data-testid="xpert-expert-copilot-hidden-write" tone="neutral" className="nx-shell-readonly-note"')
  })

  it('freezes readonly auth affordances before workspace-owned cleanup begins', () => {
    const source = readSource(expertDetailPath)

    expect(source).toContain('data-testid="xpert-expert-auth-policy"')
    expect(source).toContain('data-testid="xpert-expert-auth-readonly" tone="warn" className="nx-shell-readonly-note"')
    expect(source).toContain('write policy is read-only in current session')
  })
})
