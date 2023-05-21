import { AppSchema } from '../../../srv/db/schema'
import { api } from '../api'

export const apiKeyApi = {
  listKeys,
  createKey,
  deleteKey,
}

export async function listKeys() {
  const res = await api.get<{ keys: AppSchema.ApiKey[] }>(`/apiKeys`)
  return res
}

export async function createKey(req: { name: string; scopes: string[] }) {
  const res = await api.post<AppSchema.ApiKey>(`/apiKeys`, req)
  return res
}

export async function deleteKey(id: string) {
  const res = await api.method('delete', `/apiKeys/${id}`)
  return res
}
