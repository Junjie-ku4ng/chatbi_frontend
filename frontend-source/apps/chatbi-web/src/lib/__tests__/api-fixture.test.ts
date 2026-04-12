import { afterEach, describe, expect, it, vi } from 'vitest'
import { listSemanticModelsFixture } from '../../../e2e/helpers/api-fixture'

describe('listSemanticModelsFixture', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers semantic model ids over chatbi binding ids from chatbi-model/my', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                id: 'binding-420',
                modelId: 'semantic-420',
                entity: 'Sales'
              }
            ]
          }
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(listSemanticModelsFixture()).resolves.toEqual([
      {
        id: 'semantic-420',
        name: 'Sales',
        cube: undefined
      }
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/xpert/semantic-model?includeTestModels=true')
  })
})
