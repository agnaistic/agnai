import Cookies from 'js-cookie'
import { createStore } from './create'

type State = {
  loading: boolean
  error?: string
  jwt: string
  user?: {
    id: string
    email: string
    displayName: string
  }
}

export const userStore = createStore<State>(
  'user',
  init()
)((get, set) => {
  return {
    async *login(_, username: string, password: string) {
      yield { loading: true }
      yield {
        loading: false,
        user: { displayName: username, email: username, id: username },
        jwt: 'token',
      }
    },
    clearAuth() {
      Cookies.remove('auth')
      return { jwt: '', user: undefined }
    },
    setAuth(_, jwt) {
      Cookies.set('auth', jwt, { sameSite: 'strict', expires: 7 })
      const user = parseJWT(jwt)
      return { jwt, user }
    },
  }
})

function parseJWT<T = any>(jwt: string): T {
  const base64Url = jwt.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  )

  return JSON.parse(jsonPayload)
}

function init(): State {
  const existing = Cookies.get('auth')

  if (!existing) {
    return { loading: false, jwt: '' }
  }

  const user = parseJWT(existing)
  return {
    loading: false,
    jwt: existing,
    user,
  }
}
