import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { apiKeyApi } from './data/apiKeys'
import { toastStore } from './toasts'

type ApiKeyState = {
  keys: AppSchema.ApiKey[]
  loading: boolean
}

const initState: ApiKeyState = {
  keys: [],
  loading: true,
}

export const apiKeyStore = createStore<ApiKeyState>(
  'apiKey',
  initState
)((_) => {
  events.on(EVENTS.loggedOut, () => {
    apiKeyStore.setState(initState)
  })

  return {
    async *getApiKeys() {
      yield { loading: true }
      const res = await apiKeyApi.listKeys()
      if (res.error) {
        toastStore.error('Failed to retrieve API keys')
        return { loading: false }
      }
      if (res.result) {
        return {
          loading: false,
          keys: res.result.keys,
        }
      }
    },
    async createApiKey(
      { keys: prev },
      name: string,
      scopes: string[],
      onSuccess: (key: AppSchema.ApiKey) => void
    ) {
      const res = await apiKeyApi.createKey({ name, scopes })
      if (res.error) return toastStore.error(`Failed to create API key: ${res.error}`)
      if (res.result) {
        toastStore.success('API keys created')
        onSuccess(res.result)
        const keyWithoutSecret: AppSchema.ApiKey = { ...res.result, key: '' }
        return { keys: [...prev, keyWithoutSecret] }
      }
    },
    async deleteApiKey({ keys }, id: string) {
      const res = await apiKeyApi.deleteKey(id)
      if (res.error) return toastStore.error(`Failed to delete API key: ${res.error}`)
      if (res.result) {
        toastStore.success(`API key deleted`)
        return { keys: keys.filter((k) => k._id !== id) }
      }
    },
  }
})
