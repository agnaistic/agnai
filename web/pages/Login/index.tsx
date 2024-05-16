import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { A, useLocation, useNavigate, useSearchParams } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import { ACCOUNT_KEY, settingStore, toastStore, userStore } from '../../store'
import { getStrictForm, setComponentPageTitle, storage } from '../../shared/util'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { isLoggedIn } from '/web/store/api'
import { TitleCard } from '/web/shared/Card'
import FormContainer from '/web/shared/aifans/FormContainer'
import LoginFormModal from './LoginFormModal'

const LoginPage: Component = () => {
  setComponentPageTitle('Login')
  const store = userStore()
  const cfg = settingStore()

  const [register, setRegister] = createSignal(false)

  /** Friendly error message passed out of the mutation, if it exists. */
  const loginError = createMemo(() => {
    if (!store.error) return null
    if (store.error.includes('NetworkError')) {
      return "We couldn't reach our servers."
    }

    return 'Something went wrong.'
  })

  return (
    <div class="flex w-full flex-col items-center">
      <div class="my-4 border-b border-white/5" />
      <div class="w-full max-w-lg">
        <Show when={register()}>
          <RegisterForm isLoading={store.loading} />
        </Show>
        <Show when={!register()}>
          <LoginForm isLoading={store.loading} onClickRegister={() => setRegister(true)} />
        </Show>
        <Show when={loginError()}>
          <Divider />
          <Alert schema="error" title="Failed to log in.">
            {loginError()}
          </Alert>
        </Show>
      </div>

      <Show when={cfg.config.policies}>
        <div class="mt-2">
          By logging in or registering, you agree that you are 18 years or older and agree to the{' '}
          <A class="link" href="/terms-of-service">
            Terms
          </A>{' '}
          and{' '}
          <A class="link" href="/privacy-policy">
            Privacy Policy
          </A>
          .
        </div>
      </Show>
    </div>
  )
}

export default LoginPage

type FormProps = { isLoading: boolean; onClickRegister?: () => void }

const RegisterForm: Component<FormProps> = (props) => {
  const navigate = useNavigate()
  const register = (evt: Event) => {
    const { username, password, confirm, handle } = getStrictForm(evt, {
      handle: 'string',
      username: 'string',
      password: 'string',
      confirm: 'string',
    })

    if (!handle || !username || !password) return
    if (password !== confirm) {
      toastStore.warn('Passwords do not match', 2)
      return
    }

    userStore.register({ handle, username, password }, () => navigate('/profile'))
  }

  return (
    <form onSubmit={register} class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <TextInput label="Display Name" fieldName="handle" placeholder="Display name" required />
        <TextInput label="Username" fieldName="username" placeholder="Username" required />
        <TextInput
          label="Password"
          fieldName="password"
          placeholder="Password"
          type="password"
          required
        />
        <TextInput fieldName="confirm" placeholder="Confirm Password" type="password" required />
      </div>

      <Button type="submit" disabled={props.isLoading}>
        {props.isLoading ? 'Registering...' : 'Register'}
      </Button>
    </form>
  )
}

const LoginForm: Component<FormProps> = (props) => {
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const loc = useLocation()
  const state = settingStore()
  const [error, setError] = createSignal<string>()

  createEffect(() => {
    if (state.initLoading) return

    if (query.callback && isLoggedIn()) {
      for (const authUrl of state.config.authUrls) {
        if (query.callback.startsWith(authUrl)) return handleLogin()
      }
      setError('Invalid callback URL')
      return
    }
  })

  const handleLogin = () => {
    userStore.remoteLogin((token) => {
      location.href = `${query.callback}?access_token=${token}`
    })
  }

  const login = (evt: Event) => {
    const { username, password } = getStrictForm(evt, { username: 'string', password: 'string' })
    if (!username || !password) return

    userStore.login(username, password, () => {
      if (query.callback) {
        handleLogin()
        return
      }

      userStore.loginModal(false)

      // navigate('/dashboard')
      window.location.reload()
    })
  }

  return <LoginFormModal onClickLogin={login} />

  return (
    <FormContainer>
      <div>
        <h1 class="my-2 font-display text-xl">User Log In</h1>
        <h2 class="font-display text-xl text-cosplay-blue-200">Log In</h2>
      </div>
      <form onSubmit={login} class="my-2 flex flex-col gap-6">
        <div class="flex flex-col gap-2 font-display">
          <label class="font-displayMedium" for="username">
            Username or Email
          </label>
          <TextInput
            fieldName="username"
            placeholder="Enter Username or Email"
            required
            value={
              loc.pathname.includes('/remember') ? storage.localGetItem(ACCOUNT_KEY) || '' : ''
            }
          />
          <label for="password">Password</label>
          <TextInput fieldName="password" placeholder="Enter Password" type="password" required />
        </div>

        <Show when={error()}>
          <TitleCard type="rose">{error()}</TitleCard>
        </Show>

        <Button
          class="rounded bg-gradient-to-r from-cosplay-blue-200 to-cosplay-purple px-4 py-2 font-semibold text-white"
          type="submit"
          disabled={props.isLoading || !!error()}
        >
          {props.isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <div>
        Don't have an account?{' '}
        <Button size="pill" onClick={props.onClickRegister}>
          Sign Up
        </Button>
      </div>
    </FormContainer>
  )
}
