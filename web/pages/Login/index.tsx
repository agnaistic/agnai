import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { A, useNavigate, useSearchParams } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import PageHeader from '../../shared/PageHeader'
import { settingStore, toastStore, userStore } from '../../store'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { isLoggedIn } from '/web/store/api'
import { TitleCard } from '/web/shared/Card'

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
      <PageHeader
        title={<div class="flex w-full justify-center">Welcome</div>}
        subtitle={
          <span>
            <a class="link" onClick={() => setRegister(false)}>
              Login
            </a>{' '}
            to your account or&nbsp;
            <a class="link" onClick={() => setRegister(true)}>
              register
            </a>
            &nbsp;or continue as a guest.
          </span>
        }
      />
      <div class="w-full max-w-sm">
        <Show when={register()}>
          <RegisterForm isLoading={store.loading} />
        </Show>
        <Show when={!register()}>
          <LoginForm isLoading={store.loading} />
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
          By logging in or registering, you agree that are 18 years or older and agree to the{' '}
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

      <div class="mt-8 w-full gap-4">
        <p class="flex justify-center text-xl text-[var(--hl-400)]">Why register?</p>
        <div class="flex flex-col items-center">
          <p>
            You don't need to register to use Agnaistic. You can use it anonymously and no data will
            be stored on any servers.
          </p>
          <p>
            If you choose to register your data will be stored and accessible on any devices you
            login with.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

type FormProps = { isLoading: boolean }

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

      navigate('/dashboard')
    })
  }

  return (
    <form onSubmit={login} class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <TextInput fieldName="username" placeholder="Username" required />
        <TextInput fieldName="password" placeholder="Password" type="password" required />
      </div>

      <Show when={error()}>
        <TitleCard type="rose">{error()}</TitleCard>
      </Show>

      <Button type="submit" disabled={props.isLoading || !!error()}>
        {props.isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}
