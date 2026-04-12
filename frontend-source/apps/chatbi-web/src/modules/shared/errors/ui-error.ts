import { ApiRequestError } from '@/lib/api-client'

export type UiErrorType = 'unauthorized' | 'forbidden' | 'validation' | 'timeout' | 'network' | 'server' | 'unknown'

export type UiErrorModel = {
  type: UiErrorType
  message: string
  code?: string
  retryable: boolean
  status?: number
  requestId?: string
}

export function normalizeUiError(error: unknown): UiErrorModel {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return {
        type: 'unauthorized',
        message: error.message || 'Authentication required',
        code: error.code,
        retryable: true,
        status: error.status,
        requestId: error.requestId
      }
    }
    if (error.status === 403) {
      return {
        type: 'forbidden',
        message: error.message || 'Permission denied',
        code: error.code,
        retryable: false,
        status: error.status,
        requestId: error.requestId
      }
    }
    if (error.status >= 400 && error.status < 500) {
      return {
        type: 'validation',
        message: error.message || 'Request validation failed',
        code: error.code,
        retryable: false,
        status: error.status,
        requestId: error.requestId
      }
    }
    return {
      type: 'server',
      message: error.message || 'Server error',
      code: error.code,
      retryable: true,
      status: error.status,
      requestId: error.requestId
    }
  }

  if (error instanceof Error) {
    const message = error.message || 'Unexpected error'
    if (/timeout/i.test(message)) {
      return {
        type: 'timeout',
        message,
        retryable: true
      }
    }
    if (/network|fetch/i.test(message)) {
      return {
        type: 'network',
        message,
        retryable: true
      }
    }
    return {
      type: 'unknown',
      message,
      retryable: true
    }
  }

  return {
    type: 'unknown',
    message: 'Unexpected error',
    retryable: true
  }
}
