import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const chatTasksPagePath = path.resolve(__dirname, '../../../../app/(workspace)/chat/tasks/page.tsx')
const chatTaskDetailPagePath = path.resolve(__dirname, '../../../../app/(workspace)/chat/tasks/[id]/page.tsx')

function readSource(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

describe('chat task pages shared state labels', () => {
  it('uses specific loading copy for the chat task list', () => {
    const source = readSource(chatTasksPagePath)

    expect(source).toContain('loadingLabel="Loading chat tasks..."')
  })

  it('uses specific loading copy for the chat task detail', () => {
    const source = readSource(chatTaskDetailPagePath)

    expect(source).toContain('loadingLabel="Loading chat task detail..."')
  })
})
