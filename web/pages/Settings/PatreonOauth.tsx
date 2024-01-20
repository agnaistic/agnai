import { Component, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import { settingStore, userStore } from '/web/store'
import Button from '/web/shared/Button'
import { useNavigate } from '@solidjs/router'
import { Pill, SolidCard } from '/web/shared/Card'
import { useTransContext } from '@mbarzda/solid-i18next'

const PatreonOauth: Component = () => {
  const [t] = useTransContext()

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
          <Match when={!state()}>{t('verifying_patreon_account')}</Match>

          <Match when={state() === 'error'}>
            <div class="text-red-500">{t('unable_to_verify_patreon_account')}</div>
            <div>{message()}</div>
            <div>
              <Button onClick={() => nav('/settings')}>{t('return_to_settings')}</Button>
            </div>
          </Match>

          <Match when={state() === 'success'}>
            <div class="text-green-500">{t('patreon_account_verified')}</div>
            <div>{t('redirecting_to_setting_page')}</div>
          </Match>
        </Switch>
      </div>
    </SolidCard>
  )
}

export const PatreonControls: Component = () => {
  const [t] = useTransContext()

  const config = settingStore((s) => s.config)
  const state = userStore()

  return (
    <Show when={config.patreonAuth}>
      <div class="flex w-full justify-center">
        <Show when={!state.user?.patreon}>
          <div class="flex flex-col items-center gap-1">
            <Pill type="green">{t('link_your_patreon_account')}</Pill>
            <Button class="w-fit" onClick={authorizePatreon}>
              {t('link_patreon_account')}
            </Button>
          </div>
        </Show>
        <Show when={state.user?.patreon}>
          <div class="flex gap-2">
            <Button class="w-fit" onClick={userStore.unverifyPatreon}>
              {t('unlink_patreon_account')}
            </Button>
          </div>
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
