import { apiRequest } from '@/lib/api-client'

export type TenantSettings = Record<string, unknown> & {
  tenantName?: string
  timezone?: string
  defaultLanguage?: string
}

export type AccountProfile = {
  id?: string
  email?: string
  firstName?: string
  lastName?: string
  username?: string
  preferredLanguage?: string
  timeZone?: string
  imageUrl?: string
  tags?: string[]
}

export type UserOrganizationRecord = {
  id: string
  isActive?: boolean
  user?: {
    id?: string
    name?: string
    email?: string
  }
  role?: {
    name?: string
  }
  organization?: {
    id?: string
    name?: string
  }
}

export type OrganizationRecord = {
  id: string
  name?: string
  tenantId?: string
}

export type RoleRecord = {
  id: string
  name?: string
}

export type KnowledgebaseRecord = {
  id: string
  name?: string
  description?: string
}

export type IntegrationRecord = {
  id: string
  name?: string
  provider?: string
}

export type FeatureToggleRecord = {
  id: string
  featureId?: string
  organizationId?: string
  isEnabled?: boolean
  feature?: {
    code?: string
    name?: string
  }
}

export type PluginRecord = {
  name: string
  meta?: {
    title?: string
  }
  isGlobal?: boolean
}

export type DataSourceRecord = {
  id: string
  name?: string
  type?: string
  typeCode?: string
  host?: string
  authType?: 'basic' | 'cam' | 'token'
  hasAuthRef?: boolean
  options?: Record<string, unknown>
  status?: string
  updatedAt?: string
}

export type DataSourceCreateInput = {
  typeCode: string
  name: string
  host: string
  authType: 'basic' | 'cam' | 'token'
  authRef: string
  options?: Record<string, unknown>
}

export type DataSourceUpdateInput = {
  name?: string
  host?: string
  authType?: 'basic' | 'cam' | 'token'
  authRef?: string
  options?: Record<string, unknown>
}

export type DataSourcePingInput = {
  host?: string
  authType?: 'basic' | 'cam' | 'token'
  authRef?: string
}

export async function getTenantSettings() {
  return apiRequest<TenantSettings>('/tenant-setting', {
    track: 'xpert'
  })
}

export async function saveTenantSettings(payload: TenantSettings) {
  return apiRequest<TenantSettings>('/tenant-setting', {
    method: 'POST',
    body: payload,
    track: 'xpert'
  })
}

export async function getMyProfile() {
  return apiRequest<AccountProfile>('/user/me', {
    track: 'xpert'
  })
}

export async function updateMyProfile(payload: AccountProfile) {
  return apiRequest<AccountProfile>('/user/me', {
    method: 'PUT',
    body: payload,
    track: 'xpert'
  })
}

export async function changeMyPassword(userId: string, input: { hash: string; password: string }) {
  return apiRequest<Record<string, unknown>>(`/user/${encodeURIComponent(userId)}/password`, {
    method: 'POST',
    body: input,
    track: 'xpert'
  })
}

type UserOrganizationListPayload = {
  items?: UserOrganizationRecord[]
  total?: number
}

function asUserOrganizationListPayload(value: unknown): UserOrganizationListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as UserOrganizationListPayload
}

export async function listUserOrganizations() {
  const data = JSON.stringify({
    relations: ['user', 'role', 'organization']
  })
  const query = new URLSearchParams({ data })
  const payload = await apiRequest<UserOrganizationListPayload>(`/user-organization?${query.toString()}`, {
    track: 'xpert'
  })
  const normalized = asUserOrganizationListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function deactivateUserOrganization(id: string) {
  return apiRequest<UserOrganizationRecord>(`/user-organization/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { isActive: false },
    track: 'xpert'
  })
}

type OrganizationListPayload = {
  items?: OrganizationRecord[]
  total?: number
}

function asOrganizationListPayload(value: unknown): OrganizationListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as OrganizationListPayload
}

export async function listOrganizations() {
  const data = JSON.stringify({
    relations: []
  })
  const query = new URLSearchParams({ data })
  const payload = await apiRequest<OrganizationListPayload>(`/organization?${query.toString()}`, {
    track: 'xpert'
  })
  const normalized = asOrganizationListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function generateOrganizationDemo(id: string) {
  return apiRequest<Record<string, unknown>>(`/organization/${encodeURIComponent(id)}/demo`, {
    method: 'POST',
    body: {},
    track: 'xpert'
  })
}

type RoleListPayload = {
  items?: RoleRecord[]
  total?: number
}

function asRoleListPayload(value: unknown): RoleListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as RoleListPayload
}

export async function listRoles() {
  const payload = await apiRequest<RoleListPayload>('/roles', {
    track: 'xpert'
  })
  const normalized = asRoleListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function deleteRole(id: string) {
  return apiRequest<RoleRecord>(`/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    track: 'xpert'
  })
}

type KnowledgebaseListPayload = {
  items?: KnowledgebaseRecord[]
  total?: number
}

function asKnowledgebaseListPayload(value: unknown): KnowledgebaseListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as KnowledgebaseListPayload
}

export async function listKnowledgebases() {
  const data = JSON.stringify({
    order: {
      updatedAt: 'DESC'
    }
  })
  const query = new URLSearchParams({ data })
  const payload = await apiRequest<KnowledgebaseListPayload>(`/knowledgebase?${query.toString()}`, {
    track: 'xpert'
  })
  const normalized = asKnowledgebaseListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function deleteKnowledgebase(id: string) {
  return apiRequest<KnowledgebaseRecord>(`/knowledgebase/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    track: 'xpert'
  })
}

type IntegrationListPayload = {
  items?: IntegrationRecord[]
  total?: number
}

function asIntegrationListPayload(value: unknown): IntegrationListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as IntegrationListPayload
}

export async function listIntegrations() {
  const data = JSON.stringify({
    order: {
      updatedAt: 'DESC'
    }
  })
  const query = new URLSearchParams({ data })
  const payload = await apiRequest<IntegrationListPayload>(`/integration?${query.toString()}`, {
    track: 'xpert'
  })
  const normalized = asIntegrationListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function deleteIntegration(id: string) {
  return apiRequest<IntegrationRecord>(`/integration/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    track: 'xpert'
  })
}

type FeatureToggleListPayload = {
  items?: FeatureToggleRecord[]
  total?: number
}

function asFeatureToggleListPayload(value: unknown): FeatureToggleListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as FeatureToggleListPayload
}

export async function listFeatureToggles() {
  const payload = await apiRequest<FeatureToggleListPayload>('/feature/toggle/organizations', {
    track: 'xpert'
  })
  const normalized = asFeatureToggleListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function updateFeatureToggle(toggle: FeatureToggleRecord) {
  return apiRequest<boolean[]>('/feature/toggle', {
    method: 'POST',
    track: 'xpert',
    body: [
      {
        id: toggle.id,
        featureId: toggle.featureId,
        organizationId: toggle.organizationId,
        isEnabled: toggle.isEnabled
      }
    ]
  })
}

function asPluginList(value: unknown): PluginRecord[] {
  if (Array.isArray(value)) {
    return value as PluginRecord[]
  }
  if (!value || typeof value !== 'object') {
    return []
  }
  const record = value as { items?: unknown }
  if (Array.isArray(record.items)) {
    return record.items as PluginRecord[]
  }
  return []
}

export async function listPlugins() {
  const payload = await apiRequest<PluginRecord[] | { items?: PluginRecord[] }>('/plugin', {
    track: 'xpert'
  })
  const items = asPluginList(payload)
  return {
    items,
    total: items.length
  }
}

export async function uninstallPlugin(name: string) {
  return apiRequest<void>('/plugin/uninstall', {
    method: 'DELETE',
    track: 'xpert',
    body: {
      names: [name]
    }
  })
}

type DataSourceListPayload = {
  items?: DataSourceRecord[]
  total?: number
}

function asDataSourceListPayload(value: unknown): DataSourceListPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as DataSourceListPayload
}

export async function listDataSources() {
  const data = JSON.stringify({
    order: {
      updatedAt: 'DESC'
    }
  })
  const query = new URLSearchParams({ data })
  const payload = await apiRequest<DataSourceListPayload>(`/data-source?${query.toString()}`, {
    track: 'xpert'
  })
  const normalized = asDataSourceListPayload(payload)
  const items = Array.isArray(normalized.items) ? normalized.items : []
  return {
    items,
    total: typeof normalized.total === 'number' ? normalized.total : items.length
  }
}

export async function getDataSource(id: string) {
  return apiRequest<DataSourceRecord>(`/data-source/${encodeURIComponent(id)}`, {
    track: 'xpert'
  })
}

export async function createDataSource(payload: DataSourceCreateInput) {
  return apiRequest<DataSourceRecord>('/data-source', {
    method: 'POST',
    body: payload,
    track: 'xpert'
  })
}

export async function updateDataSource(id: string, payload: DataSourceUpdateInput) {
  return apiRequest<DataSourceRecord>(`/data-source/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
    track: 'xpert'
  })
}

export async function pingDataSource(payload: DataSourcePingInput) {
  return apiRequest<Record<string, unknown>>('/data-source/ping', {
    method: 'POST',
    body: payload,
    track: 'xpert'
  })
}

export async function pingDataSourceById(id: string, payload: DataSourcePingInput = {}) {
  return apiRequest<Record<string, unknown>>(`/data-source/${encodeURIComponent(id)}/ping`, {
    method: 'POST',
    body: payload,
    track: 'xpert'
  })
}

export async function deleteDataSource(id: string) {
  return apiRequest<DataSourceRecord>(`/data-source/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    track: 'xpert'
  })
}
