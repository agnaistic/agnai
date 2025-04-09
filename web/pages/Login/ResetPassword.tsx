import { Component, onMount } from 'solid-js'
import { Page } from '/web/Layout'
import PageHeader from '/web/shared/PageHeader'
import { useNavigate, useSearchParams } from '@solidjs/router'
import TextInput from '/web/shared/TextInput'
import { createStore } from 'solid-js/store'
import Button from '/web/shared/Button'
import { toastStore, userStore } from '/web/store'
import { Card } from '/web/shared/Card'

export const ResetPasswordPage: Component = () => {
  const [params] = useSearchParams()
  const nav = useNavigate()

  const [state, setState] = createStore({ username: '', password: '', confirm: '' })

  const resetPassword = () => {
    if (!params.code) return
    if (!state.username) return
    if (!state.password || !state.confirm) return

    if (state.password !== state.confirm) {
      toastStore.warn(`Your passwords do not match`)
      return
    }

    userStore.resetPassword(params.code!, state.username, state.password, state.confirm, () => {
      nav('/login')
    })
  }

  onMount(() => {
    if (params.code) return
    nav('/')
  })

  return (
    <Page>
      <PageHeader title="Reset Password" />

      <div class="flex w-full justify-center">
        <Card bg="hl-300" class="w-full max-w-96">
          <div class="flex w-full flex-col items-center gap-2">
            <TextInput
              parentClass="w-full"
              placeholder="Username..."
              value={state.username}
              onChange={(ev) => setState({ username: ev.currentTarget.value })}
            />

            <TextInput
              parentClass="w-full"
              placeholder="Password"
              value={state.password}
              onChange={(ev) => setState({ password: ev.currentTarget.value })}
            />

            <TextInput
              parentClass="w-full"
              placeholder="Confirm Password"
              value={state.confirm}
              onChange={(ev) => setState({ confirm: ev.currentTarget.value })}
            />

            <Button onClick={resetPassword}>Reset Password</Button>
          </div>
        </Card>
      </div>
    </Page>
  )
}
