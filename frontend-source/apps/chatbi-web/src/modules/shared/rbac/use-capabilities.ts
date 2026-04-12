'use client'

import { useQuery } from '@tanstack/react-query'
import { fallbackCapabilitiesFromHeaders, fetchRbacCapabilities } from './access'
import { ApiRequestError } from '@/lib/api-client'
import { refreshSession } from '@/modules/auth/api'

async function fetchCapabilitiesWithRefresh() {
  try {
    return await fetchRbacCapabilities()
  } catch (error) {
    if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'bearer') {
      return fallbackCapabilitiesFromHeaders()
    }
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      throw error
    }
    await refreshSession()
    return fetchRbacCapabilities()
  }
}

export function useRbacCapabilities() {
  const fallback = fallbackCapabilitiesFromHeaders()
  const query = useQuery({
    queryKey: ['auth-capabilities'],
    queryFn: fetchCapabilitiesWithRefresh,
    staleTime: 60_000,
    retry: 1,
    placeholderData: fallback
  })

  return {
    capabilities: query.data ?? fallback,
    isLoading: query.isLoading && !query.data,
    isError: query.isError,
    error: query.error
  }
}
