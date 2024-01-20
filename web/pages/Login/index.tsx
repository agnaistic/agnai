import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { A, useLocation, useNavigate, useSearchParams } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import PageHeader from '../../shared/PageHeader'
import { ACCOUNT_KEY, settingStore, toastStore, userStore } from '../../store'
import { getStrictForm, setComponentPageTitle, storage } from '../../shared/util'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { isLoggedIn } from '/web/store/api'
import { TitleCard } from '/web/shared/Card'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const LoginPage: Component = () => {
  const [t] = useTransContext()

  setComponentPageTitle(t('login_title'))
  const store = userStore()
  const cfg = settingStore()

  const [register, setRegister] = createSignal(false)

  /** Friendly error message passed out of the mutation, if it exists. */
  const loginError = createMemo(() => {
    if (!store.error) return null
    if (store.error.includes('NetworkError')) {
      return t('we_could_not_reach_our_servers')
    }

    return t('something_went_wrong')
  })

  return (
    <div class="flex w-full flex-col items-center">
      <div class="my-4 border-b border-white/5" />
      <PageHeader
        title={<div class="flex w-full justify-center">{t('welcome')}</div>}
        subtitle={
          <div class="flex flex-wrap items-center justify-center">
            <Trans key="login_or_register_or_continue_as_guest">
              <Button size="pill" class="mr-2" onClick={() => setRegister(false)}>
                Login
              </Button>
              to your account
              <Button size="pill" class="ml-2 mr-2" onClick={() => setRegister(true)}>
                Register
              </Button>
              or continue as guest.
            </Trans>
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
          <Alert schema="error" title={t('failed_to_login')}>
            {loginError()}
          </Alert>
        </Show>
      </div>

      <Show when={cfg.config.policies}>
        <div class="mt-2">
          {t('agree_to_tnc')}{' '}
          <A class="link" href="/terms-of-service">
            {t('terms')}
          </A>{' '}
          {t('and')}{' '}
          <A class="link" href="/privacy-policy">
            {t('privacy_policy')}
          </A>
          .
        </div>
      </Show>

      <div class="mt-8 w-full gap-4">
        <p class="flex justify-center text-xl text-[var(--hl-400)]">{t('why_register_?')}</p>
        <div class="flex flex-col items-center">
          <p>{t('you_dont_need_to_register_option', { app_name: t('app_name') })}</p>
          <p>{t('register_benefit')}</p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

type FormProps = { isLoading: boolean }

const RegisterForm: Component<FormProps> = (props) => {
  const [t] = useTransContext()

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
      toastStore.warn(t('passwords_do_not_match'), 2)
      return
    }

    userStore.register({ handle, username, password }, () => navigate('/profile'))
  }

  return (
    <form onSubmit={register} class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <TextInput
          label={t('display_name')}
          fieldName="handle"
          placeholder={t('display_name')}
          required
        />
        <TextInput
          label={t('username')}
          fieldName="username"
          placeholder={t('username')}
          required
        />
        <TextInput
          label={t('password')}
          fieldName="password"
          placeholder={t('password')}
          type="password"
          required
        />
        <TextInput
          fieldName="confirm"
          placeholder={t('confirm_password')}
          type="password"
          required
        />
      </div>

      <Button type="submit" disabled={props.isLoading}>
        {props.isLoading ? t('registering') : t('register')}
      </Button>
    </form>
  )
}

const LoginForm: Component<FormProps> = (props) => {
  const [t] = useTransContext()

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
      setError(t('invalid_callback_url'))
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
        <TextInput
          fieldName="username"
          placeholder={t('username')}
          required
          value={loc.pathname.includes('/remember') ? storage.localGetItem(ACCOUNT_KEY) || '' : ''}
        />
        <TextInput fieldName="password" placeholder={t('password')} type="password" required />
      </div>

      <Show when={error()}>
        <TitleCard type="rose">{error()}</TitleCard>
      </Show>

      <Button type="submit" disabled={props.isLoading || !!error()}>
        {props.isLoading ? t('logging_in') : t('login')}
      </Button>
    </form>
  )
}
