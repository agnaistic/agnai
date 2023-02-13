import { Component, createEffect, createMemo, Show } from 'solid-js'
import { useLocation, useNavigate } from '@solidjs/router'
import Alert from '../../shared/Alert'
import Divider from '../../shared/Divider'
import PageHeader from '../../shared/PageHeader'
import LoginForm from './LoginForm'
import { userStore } from '../../store'

const LoginPage: Component = () => {
  const { user, loading, error } = userStore.getState()
  const { state } = useLocation()
  const navigate = useNavigate()

  /** Friendly error message passed out of the mutation, if it exists. */
  const loginError = createMemo(() => {
    if (!error) return null
    if (error.includes('NetworkError')) {
      return "We couldn't reach our servers."
    }

    return 'Something went wrong.'
  })

  /** Form submission callback to handle POSTing to the back-end. */
  const onSubmit = (evt: Event) => {
    evt.preventDefault()
    if (!evt.target) return

    const form = new FormData(evt.target as HTMLFormElement)
    const username = form.get('email')?.toString()
    const password = form.get('password')?.toString()
    if (!username || !password) return
    userStore.login(username, password)
  }

  /** Side-effect to take care of a successful login. */
  createEffect(() => {
    if (!user) return

    let redirectTo = '/'
    if (state && 'redirectTo' in state) {
      redirectTo = state.redirectTo as string
    }
    navigate(redirectTo, { replace: true })
  })

  return (
    <div class="flex w-full justify-center">
      <div class="my-4 border-b border-white/5" />
      <div class="w-full max-w-sm">
        <PageHeader title="Welcome." subtitle="Please log in to your account." />

        <LoginForm onSubmit={onSubmit} isLoading={loading} />

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
