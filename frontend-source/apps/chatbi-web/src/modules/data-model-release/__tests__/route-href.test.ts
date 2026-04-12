import { describe, expect, it } from 'vitest'
import { buildDataModelReleaseHref } from '../route-href'

describe('buildDataModelReleaseHref', () => {
  it('builds a canonical release href from explicit route state', () => {
    expect(
      buildDataModelReleaseHref({
        dataSourceId: 'source-1',
        modelId: 'model-1'
      })
    ).toBe('/data-model-release?dataSourceId=source-1&modelId=model-1')
  })

  it('merges with existing search params and removes cleared state', () => {
    expect(
      buildDataModelReleaseHref(
        {
          modelId: 'model-9',
          deploymentId: null
        },
        {
          baseSearch: '?dataSourceId=source-1&draftId=draft-1&deploymentId=old&foo=bar'
        }
      )
    ).toBe('/data-model-release?dataSourceId=source-1&draftId=draft-1&foo=bar&modelId=model-9')
  })
})
