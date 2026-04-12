import { describe, expect, it } from 'vitest'
import {
  defaultRouteParityReleaseMode,
  resolveCanonicalPath,
  resolveRouteParityReleaseMode,
  resolveAliasPath
} from '../route-parity'
import { resolveActiveGroup, workspaceNavGroups } from '../../layout/workspace-nav'

describe('route-parity', () => {
  it('keeps canonical path unchanged', () => {
    expect(resolveAliasPath('/chat')).toBe('/chat')
    expect(resolveAliasPath('/dashboard')).toBe('/dashboard')
    expect(resolveAliasPath('/models')).toBe('/models')
    expect(resolveAliasPath('/project')).toBe('/project')
    expect(resolveAliasPath('/indicator-app')).toBe('/indicator-app')
    expect(resolveAliasPath('/organization')).toBe('/organization')
  })

  it('does not resolve legacy aliases', () => {
    expect(resolveCanonicalPath('/ask')).toBe('/ask')
    expect(resolveCanonicalPath('/chatbi')).toBe('/chatbi')
    expect(resolveCanonicalPath('/insights')).toBe('/insights')
    expect(resolveCanonicalPath('/semantic-model')).toBe('/semantic-model')
    expect(resolveCanonicalPath('/stories')).toBe('/stories')
    expect(resolveCanonicalPath('/indicator-ops')).toBe('/indicator-ops')
    expect(resolveCanonicalPath('/settings/organizations')).toBe('/settings/organizations')
  })

  it('defaults release mode to canonical', () => {
    expect(defaultRouteParityReleaseMode).toBe('canonical')
    expect(resolveRouteParityReleaseMode()).toBe('canonical')
    expect(resolveRouteParityReleaseMode('unknown')).toBe('canonical')
  })

  it('routes governance toolset navigation through xpert-owned surfaces', () => {
    const governanceGroup = workspaceNavGroups.find(group => group.id === 'governance')
    const toolsetItems =
      governanceGroup?.items.filter(item => item.id === 'toolset-actions' || item.id === 'toolset-learning') ?? []

    expect(toolsetItems).toHaveLength(2)
    expect(toolsetItems.map(item => item.href)).not.toContain('/toolset/actions')
    expect(toolsetItems.map(item => item.href)).not.toContain('/toolset/learning')
    expect(toolsetItems.every(item => item.href.startsWith('/xpert/'))).toBe(true)
  })

  it('assigns explicit owner groups for duplicate governance entrypoints', () => {
    const governanceGroup = workspaceNavGroups.find(group => group.id === 'governance')
    const duplicateOwnerMap = Object.fromEntries(
      (governanceGroup?.items ?? [])
        .filter(item =>
          item.id === 'semantic-models' ||
          item.id === 'indicator-ops' ||
          item.id === 'toolset-actions' ||
          item.id === 'toolset-learning'
        )
        .map(item => [item.id, (item as typeof item & { activeGroupId?: string }).activeGroupId])
    )

    expect(duplicateOwnerMap).toEqual({
      'semantic-models': 'bi',
      'indicator-ops': 'bi',
      'toolset-actions': 'xpert',
      'toolset-learning': 'xpert'
    })
    expect(resolveActiveGroup('/models')?.id).toBe('bi')
    expect(resolveActiveGroup('/xpert/w/demo-workspace/builtin')?.id).toBe('xpert')
  })
})
