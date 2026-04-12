import { describe, expect, it } from 'vitest'
import { e2eAuthHeaders } from '../../../e2e/helpers/auth'

describe('e2e auth header contract', () => {
  it('includes canonical tenant and organization aliases used by browser api requests', () => {
    const headers = e2eAuthHeaders()

    expect(headers).toMatchObject({
      'x-user-id': expect.any(String),
      'x-roles': expect.any(String),
      'Tenant-Id': expect.any(String),
      'Organization-Id': expect.any(String),
      'x-tenant-id': expect.any(String),
      'x-org-id': expect.any(String),
      Language: expect.any(String),
      'Time-Zone': expect.any(String)
    })
  })
})
