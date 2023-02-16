import { Component, createEffect, createMemo, Show } from 'solid-js'
import { useLocation, useNavigate } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import PageHeader from '../../shared/PageHeader'
import LoginForm from './LoginForm'
import { userStore } from '../../store'
import { getForm } from '../../shared/util'

const LoginPage: Component = () => {
  const store = userStore()
  const { state } = useLocation()
  const navigate = useNavigate()

  /** Friendly error message passed out of the mutation, if it exists. */
  const loginError = createMemo(() => {
    if (!store.error) return null
    if (store.error.includes('NetworkError')) {
      return "We couldn't reach our servers."
    }

    return 'Something went wrong.'
  })

  const onSubmit = (evt: Event) => {
    const { email, password } = getForm(evt, { email: 'string', password: 'string' })

    if (!email || !password) return
    userStore.login(email, password)
  }

  /** Side-effect to take care of a successful login. */
  createEffect(() => {
    if (!store.user) return

    let redirectTo = '/'
    if (state && 'redirectTo' in state) {
      redirectTo = state.redirectTo as string
    }
    navigate(redirectTo, { replace: true })
  }, store)

  return (
    <div class="flex w-full justify-center">
      <div class="my-4 border-b border-white/5" />
      <div class="w-full max-w-sm">
        <PageHeader
          title={`Welcome. ${store.user?.displayName}`}
          subtitle="Please log in to your account."
        />

        <LoginForm onSubmit={onSubmit} isLoading={store.loading} />

        <Show when={loginError()}>
          <Divider />
          <Alert schema="error" title="Failed to log in.">
            {loginError()}
          </Alert>
        </Show>
      </div>
    </div>
  )
}

export default LoginPage
