import { Component, createEffect, createMemo, createSignal, on, Show } from 'solid-js'
import { A, useLocation, useNavigate, useSearchParams } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import PageHeader from '../../shared/PageHeader'
import { ACCOUNT_KEY, settingStore, toastStore, userStore } from '../../store'
import { setComponentPageTitle, storage } from '../../shared/util'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { isLoggedIn } from '/web/store/api'
import { TitleCard } from '/web/shared/Card'
import { Page } from '/web/Layout'
import { useGoogleReady } from '/web/shared/hooks'
import { createStore } from 'solid-js/store'
import { wait } from '/common/util'

const LoginPage: Component = () => {
  setComponentPageTitle('Login')
  const store = userStore()
  const cfg = settingStore()
  const [query] = useSearchParams()

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
    <Page class="flex w-full flex-col items-center">
      <div class="my-4 border-b border-white/5" />
      <PageHeader
        title={
          <div class="flex w-full justify-center">
            <Show when={query.callback} fallback="Welcome">
              Authorizing
            </Show>
          </div>
        }
        subtitle={
          <div class="flex flex-wrap items-center justify-center">
            <Show when={store.loggedIn}>You are already logged in.</Show>
            <Show when={!store.loggedIn}>
              <Button size="pill" onClick={() => setRegister(false)}>
                Login
              </Button>
              &nbsp; to your account or&nbsp;
              <Button size="pill" onClick={() => setRegister(true)}>
                Register
              </Button>
              &nbsp;or continue as a guest.
            </Show>
          </div>
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
    </Page>
  )
}

export default LoginPage

type FormProps = { isLoading: boolean }

const RegisterForm: Component<FormProps> = (props) => {
  const [store, setStore] = createStore({ handle: '', username: '', password: '', confirm: '' })
  const navigate = useNavigate()
  const register = () => {
    const { username, password, confirm, handle } = store

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
        <TextInput
          label="Display Name"
          placeholder="Display name"
          required
          onChange={(ev) => setStore('handle', ev.currentTarget.value)}
        />
        <TextInput
          label="Username"
          fieldName="username"
          placeholder="Username"
          required
          onChange={(ev) => setStore('username', ev.currentTarget.value)}
        />
        <TextInput
          label="Password"
          placeholder="Password"
          type="password"
          onChange={(ev) => setStore('password', ev.currentTarget.value)}
          required
        />
        <TextInput
          placeholder="Confirm Password"
          type="password"
          required
          onChange={(ev) => setStore('confirm', ev.currentTarget.value)}
          onKeyDown={(ev) => (ev.key === 'Enter' ? register() : null)}
        />
      </div>

      <Button disabled={props.isLoading} onClick={register}>
        {props.isLoading ? 'Registering...' : 'Register'}
      </Button>
    </form>
  )
}

const LoginForm: Component<FormProps> = (props) => {
  let refGoogle: any
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const loc = useLocation()
  const state = settingStore()
  const user = userStore()

  const [error, setError] = createSignal<string>()
  const google = useGoogleReady()

  const [store, setStore] = createStore({
    username: loc.pathname.includes('/remember') ? storage.localGetItem(ACCOUNT_KEY) || '' : '',
    password: '',
  })

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

  createEffect(
    on(
      () => google(),
      () => {
        const win: any = window
        const api = win.google?.accounts?.id

        if (!api) return

        if (state.config.serverConfig?.googleClientId) {
          api.initialize({
            client_id: state.config.serverConfig?.googleClientId,
            callback: (result: any) => {
              userStore.handleGoogleCallback('login', result, () => navigate('/dashboard'))
            },
          })

          api.renderButton(refGoogle, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
          })
        }
      }
    )
  )

  const handleLogin = () => {
    userStore.thirdPartyLogin((token) => {
      location.href = `${query.callback}?access_token=${token}`
    })
  }

  const login = () => {
    const { username, password } = store
    if (!username || !password) return

    userStore.login(username, password, async () => {
      if (query.callback) {
        for (const authUrl of state.config.authUrls) {
          if (!query.callback.startsWith(authUrl)) continue
          await wait(0.1)
          return handleLogin()
        }
      }

      if (query.callback) return
      navigate('/dashboard')
    })
  }

  return (
    <form class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <TextInput
          placeholder="Username"
          disabled={user.loggedIn}
          required
          value={store.username}
          onChange={(ev) => setStore('username', ev.currentTarget.value)}
        />
        <TextInput
          placeholder="Password"
          type="password"
          required
          disabled={user.loggedIn}
          onChange={(ev) => setStore('password', ev.currentTarget.value)}
          onKeyDown={(ev) => (ev.key === 'Enter' ? login() : null)}
        />
      </div>

      <Show when={error()}>
        <TitleCard type="rose">{error()}</TitleCard>
      </Show>

      <Button onClick={login} disabled={user.loggedIn || props.isLoading || !!error()}>
        {props.isLoading ? 'Logging in...' : 'Login'}
      </Button>

      <div
        class="flex justify-center"
        classList={{ hidden: user.loggedIn }}
        ref={(ref) => {
          refGoogle = ref
        }}
        id="g_id_onload"
        data-context="signin"
        data-ux_mode="popup"
        data-login_uri={`${location.origin}/oauth/google`}
        data-itp_support="true"
      ></div>
    </form>
  )
}
