import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../../..')

const conversationCompatFiles = [
  'e2e/ask-analysis-perf.spec.ts',
  'e2e/chat-interaction-consistency.spec.ts',
  'e2e/chat-runtime-lifecycle-events.spec.ts',
  'e2e/chat-stream-echarts-render.spec.ts',
  'e2e/chat-tasks-lifecycle.spec.ts',
  'e2e/visual-regression.spec.ts',
  'e2e/xpert-workflow-runtime-control.spec.ts',
  'e2e/trace-timeline-operational.spec.ts'
]

const toolsetCompatFiles = [
  'e2e/helpers/api-fixture.ts',
  'e2e/cloud-compat-route-parity.spec.ts',
  'e2e/xpert-workspace-routing.spec.ts'
]

const legacyConversationRoute = ['/api/xpert', 'chat-conversation'].join('/')
const legacyConversationListRoute = ['chat-conversation', 'my'].join('/')
const legacyToolsetApiRoute = ['/api/xpert', 'xpert-toolset'].join('/')
const legacyToolsetCreateCall = ["apiPost('/", 'xpert-toolset'].join('')
const legacyToolsetListCall = ['`/', ['xpert-toolset', 'my?'].join('/')].join('')

describe('chat compat route cutover', () => {
  it('removes legacy chat-conversation route mocks from remaining e2e owners', () => {
    for (const relativePath of conversationCompatFiles) {
      const source = readFileSync(path.resolve(repoRoot, relativePath), 'utf8')
      expect(source).not.toContain(legacyConversationRoute)
      expect(source).not.toContain(legacyConversationListRoute)
    }
  })

  it('removes legacy toolset compat routes from remaining helper and e2e owners', () => {
    for (const relativePath of toolsetCompatFiles) {
      const source = readFileSync(path.resolve(repoRoot, relativePath), 'utf8')
      expect(source).not.toContain(legacyToolsetApiRoute)
      if (relativePath === 'e2e/helpers/api-fixture.ts') {
        expect(source).not.toContain(legacyToolsetCreateCall)
        expect(source).not.toContain(legacyToolsetListCall)
      }
    }
  })
})
