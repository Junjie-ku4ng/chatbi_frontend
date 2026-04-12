export type AuthMode = 'dev_headers' | 'bearer'

export type AuthSession = {
  mode: AuthMode
  authenticated: boolean
  authType?: 'dev' | 'jwt' | 'service_account'
  userId?: string
  serviceAccountId?: string
  tenant?: string
  scope?: string[]
  expiresAt?: string
  requestId?: string
}

export type AuthLoginResult = {
  session: AuthSession
}
