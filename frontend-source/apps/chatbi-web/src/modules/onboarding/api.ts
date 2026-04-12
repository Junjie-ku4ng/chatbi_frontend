import {
  getDataSourcePACubeMetadata,
  listDataSourcePACubes,
  onboardSemanticModelFromPA,
  type PaCubeMetadataProfile
} from '@/modules/semantic-studio/api'

function ensureOnboardingEnabled() {
  const enabled = process.env.NEXT_PUBLIC_ONBOARDING_ENABLED !== 'false'
  if (!enabled) {
    throw new Error('Onboarding is disabled by feature flag')
  }
}

export async function listOnboardingPACubes(input: { dataSourceId: string; query?: string; limit?: number }) {
  ensureOnboardingEnabled()
  return listDataSourcePACubes(input.dataSourceId, {
    query: input.query,
    limit: input.limit
  })
}

export async function getOnboardingPACubeMetadata(input: { dataSourceId: string; cube: string; metricDimension?: string }) {
  ensureOnboardingEnabled()
  return getDataSourcePACubeMetadata(input.dataSourceId, input.cube, {
    metricDimension: input.metricDimension
  })
}

export async function onboardReadonlySemanticModel(input: {
  dataSourceId: string
  cube: string
  name?: string
  description?: string
  metricDimension?: string
}) {
  ensureOnboardingEnabled()
  return onboardSemanticModelFromPA(input)
}

export type OnboardingCubeMetadata = PaCubeMetadataProfile

export function isOnboardingEnabled() {
  return process.env.NEXT_PUBLIC_ONBOARDING_ENABLED !== 'false'
}
