import { loadSettings } from '../config'
import type {
  AlertItem,
  Boiler,
  CleaningEntry,
  Container,
  Defect,
  DeleteResponse,
  DocumentEntry,
  EarningEntry,
  FuelBatch,
  FuelConsumption,
  FuelDelivery,
  FuelStore,
  FuelSupplier,
  HealthResponse,
  Hopper,
  HsInspection,
  ItemResponse,
  ListResponse,
  MaintenanceEntry,
  MaintenanceTask,
  MaintenanceTemplate,
  LoginResponse,
  ManagedUser,
  MeterReading,
  RhiUsage,
  RhiYear,
  Site,
  SolarReading,
  SolarSubmission,
  AuthUser,
} from './types'

// The signed-in user's session token. Held in memory; AuthContext persists it.
let authToken = ''

export function setAuthToken(token: string) {
  authToken = token
}

export class ApiError extends Error {
  status: number
  path: string

  constructor(message: string, status: number, path: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

export type ApiResult<T> = {
  data: T
  status: number
  ms: number
  path: string
  method: string
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}${path}`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const { apiUrl, apiKey } = loadSettings()
  if (!apiUrl) {
    throw new ApiError('No API URL configured in this build.', 0, path)
  }

  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof ArrayBuffer) && !(init.body instanceof Blob)) {
    headers.set('Content-Type', 'application/json')
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  } else if (apiKey && path !== '/api/health') {
    // Only used before sign-in exists on a server that still expects the key.
    headers.set('X-API-Key', apiKey)
  }

  const url = joinUrl(apiUrl, path)
  const started = performance.now()
  let response: Response
  try {
    response = await fetch(url, { ...init, method, headers })
  } catch {
    throw new ApiError(
      'Could not reach the office server. Check your connection and try again.',
      0,
      path,
    )
  }

  const ms = Math.round(performance.now() - started)
  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new ApiError(`Non-JSON response from ${path}`, response.status, path)
    }
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, path)
  }

  return { data: parsed as T, status: response.status, ms, path, method }
}

export function getHealth() {
  return request<HealthResponse>('/api/health')
}

export function getAlerts() {
  return request<ListResponse<AlertItem>>('/api/alerts')
}

export type Resource<TItem> = {
  list: () => Promise<ApiResult<ListResponse<TItem>>>
  create: (payload: Record<string, unknown>) => Promise<ApiResult<ItemResponse<TItem>>>
  update: (id: number, payload: Record<string, unknown>) => Promise<ApiResult<ItemResponse<TItem>>>
  remove: (id: number) => Promise<ApiResult<DeleteResponse>>
}

function resource<TItem>(base: string): Resource<TItem> {
  return {
    list: () => request<ListResponse<TItem>>(base),
    create: (payload) =>
      request<ItemResponse<TItem>>(base, { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) =>
      request<ItemResponse<TItem>>(`${base}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id) => request<DeleteResponse>(`${base}/${id}`, { method: 'DELETE' }),
  }
}

export const sitesApi = resource<Site>('/api/sites')
export const boilersApi = resource<Boiler>('/api/boilers')
export const hoppersApi = resource<Hopper>('/api/hoppers')
export const containersApi = resource<Container>('/api/containers')
export const fuelStoresApi = resource<FuelStore>('/api/fuel-stores')
export const fuelSuppliersApi = resource<FuelSupplier>('/api/fuel-suppliers')
export const fuelBatchesApi = resource<FuelBatch>('/api/fuel-batches')
export const fuelDeliveriesApi = resource<FuelDelivery>('/api/fuel-deliveries')
export const fuelConsumptionApi = resource<FuelConsumption>('/api/fuel-consumption')
export const cleaningApi = resource<CleaningEntry>('/api/cleaning')
export const maintenanceApi = resource<MaintenanceEntry>('/api/maintenance')
export const meterReadingsApi = resource<MeterReading>('/api/meter-readings')
export const earningsApi = resource<EarningEntry>('/api/earnings')
export const maintenanceTemplatesApi = resource<MaintenanceTemplate>('/api/maintenance-templates')
export const maintenanceTasksApi = resource<MaintenanceTask>('/api/maintenance-tasks')
export const defectsApi = resource<Defect>('/api/defects')
export const hsInspectionsApi = resource<HsInspection>('/api/hs-inspections')
export const documentsApi = resource<DocumentEntry>('/api/documents')
export const rhiYearsApi = resource<RhiYear>('/api/rhi-years')
export const rhiUsageApi = resource<RhiUsage>('/api/rhi-usage')
export const solarReadingsApi = resource<SolarReading>('/api/solar-readings')
export const solarSubmissionsApi = resource<SolarSubmission>('/api/solar-submissions')

export const usersApi = resource<ManagedUser>('/api/users')

export function login(username: string, password: string) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export function getCurrentUser() {
  return request<{ user: AuthUser }>('/api/auth/me')
}

export function changeOwnPassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean; token: string }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export function listResource(slug: string) {
  return request<ListResponse<Record<string, unknown>>>(`/api/${slug}`)
}

export async function uploadDocumentFile(id: number, file: File) {
  const buffer = await file.arrayBuffer()
  return request<ItemResponse<DocumentEntry>>(`/api/documents/${id}/file`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Filename': file.name,
    },
    body: buffer,
  })
}

export async function downloadDocumentFile(id: number, filename: string) {
  const { apiUrl, apiKey } = loadSettings()
  if (!apiUrl) {
    throw new ApiError('No API URL configured in this build.', 0, `/api/documents/${id}/file`)
  }
  const headers = new Headers()
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  else if (apiKey) headers.set('X-API-Key', apiKey)
  const path = `/api/documents/${id}/file`
  let response: Response
  try {
    response = await fetch(joinUrl(apiUrl, path), { headers })
  } catch {
    throw new ApiError('Could not reach the office server. Check your connection and try again.', 0, path)
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const parsed = (await response.json()) as { error?: string }
      if (parsed.error) message = parsed.error
    } catch {
      // keep status message
    }
    throw new ApiError(message, response.status, path)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** The file endpoint needs the API key, so an <img src> cannot fetch it directly. */
export async function documentObjectUrl(id: number) {
  const { apiUrl, apiKey } = loadSettings()
  const path = `/api/documents/${id}/file`
  if (!apiUrl) throw new ApiError('No API URL configured in this build.', 0, path)
  const headers = new Headers()
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  else if (apiKey) headers.set('X-API-Key', apiKey)
  let response: Response
  try {
    response = await fetch(joinUrl(apiUrl, path), { headers })
  } catch {
    throw new ApiError('Could not reach the office server.', 0, path)
  }
  if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status, path)
  return URL.createObjectURL(await response.blob())
}
