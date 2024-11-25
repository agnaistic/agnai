import { Component, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import { adminStore, settingStore, userStore } from '/web/store'
import Button from '/web/shared/Button'
import { useNavigate } from '@solidjs/router'
import { Pill, SolidCard } from '/web/shared/Card'

const PatreonOauth: Component = () => {
  const nav = useNavigate()

  const [state, setState] = createSignal<'success' | 'error' | undefined>()
  const [message, setMessage] = createSignal('')

  onMount(() => {
    const result = location.search
      .slice(1)
      .split('&')
      .reduce<any>(
        (prev, curr) => {
          const [key, value] = curr.split('=')
          return Object.assign(prev, { [key]: value })
        },
        { url: `${location.origin}/oauth/patreon` }
      )

    userStore.verifyPatreon(result, (error) => {
      if (error) {
        setMessage(error)
        setState('error')
        return
      }

      setState('success')

      userStore.getConfig()

      setTimeout(() => {
        nav('/settings')
      }, 2500)
    })
  })

  return (
    <SolidCard>
      <div class="flex flex-col items-center gap-2">
        <Switch>
          <Match when={!state()}>Verifying Patreon account...</Match>

          <Match when={state() === 'error'}>
            <div class="text-red-500">Unable to verify Patreon account</div>
            <div>{message()}</div>
            <div>
              <Button onClick={() => nav('/settings')}>Return to Settings</Button>
            </div>
          </Match>

          <Match when={state() === 'success'}>
            <div class="text-green-500">Patreon account verified</div>
            <div>Redirecting to Settings page...</div>
          </Match>
        </Switch>
      </div>
    </SolidCard>
  )
}

export const PatreonControls: Component = () => {
  const config = settingStore((s) => s.config)
  const state = userStore()
  const admin = adminStore()

  return (
    <Show when={config.patreonAuth}>
      <div class="flex w-full justify-center">
        <Show when={!state.user?.patreon}>
          <div class="flex flex-col items-center gap-1">
            <Pill type="green">Link your Patreon account to receive subscriber benefits</Pill>
            <Button class="w-fit" onClick={authorizePatreon}>
              Link Patreon Account
            </Button>
          </div>
        </Show>
        <Show when={state.user?.patreon}>
          <div class="flex gap-2">
            <Button class="w-fit" onClick={userStore.unverifyPatreon}>
              Unlink Patreon Account
            </Button>
          </div>
        </Show>
        <Show when={state.user?.admin || admin.impersonating}>
          <Button class="ml-2" onClick={() => userStore.validateSubscription()}>
            Re-validate
          </Button>
        </Show>
      </div>
    </Show>
  )
}

export default PatreonOauth

function authorizePatreon() {
  const { config } = settingStore.getState()
  const scopes = ['identity', 'identity.memberships', 'identity[email]']
  const redir = `${location.origin}/oauth/patreon`
  const params = [
    `response_type=code`,
    `client_id=${config.patreonAuth?.clientId}`,
    `scope=${scopes.join(' ')}`,
    `redirect_uri=${redir}`,
  ]
  const url = `https://www.patreon.com/oauth2/authorize?${encodeURI(params.join('&'))}`
  window.open(url, '_self')
}
