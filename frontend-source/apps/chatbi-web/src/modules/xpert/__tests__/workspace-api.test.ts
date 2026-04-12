import { afterEach, describe, expect, it, vi } from 'vitest'
import { listWorkspaceToolsets } from '../workspace-api'

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  } as Response
}

describe('workspace api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests canonical pa-track toolset workspace endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({
        data: {
          items: [{ id: 'tool-1', name: 'Search', category: 'mcp' }],
          total: 1
        }
      })
    )

    await listWorkspaceToolsets('ws-alpha', { category: 'mcp' })

    const [url] = fetchMock.mock.calls[0] ?? []
    const parsed = new URL(String(url), 'http://localhost')
    expect(parsed.pathname).toContain('/api/pa/api/xpert-toolset/by-workspace/ws-alpha')
    expect(parsed.searchParams.get('category')).toBe('mcp')
  })
})
