import { afterEach, describe, expect, it } from 'vitest'
import { resolveApiBaseUrl, resolveApiTrack } from '@/lib/api-client'

const envBackup = {
  apiTrack: process.env.NEXT_PUBLIC_API_TRACK
}

describe('api-client track', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_TRACK = envBackup.apiTrack
  })

  it('defaults to xpert track', () => {
    process.env.NEXT_PUBLIC_API_TRACK = ''
    expect(resolveApiTrack()).toBe('xpert')
    expect(resolveApiBaseUrl()).toBe('/api/xpert')
  })

  it('resolves xpert track when configured', () => {
    process.env.NEXT_PUBLIC_API_TRACK = 'xpert'
    expect(resolveApiTrack()).toBe('xpert')
    expect(resolveApiBaseUrl()).toBe('/api/xpert')
  })
})
