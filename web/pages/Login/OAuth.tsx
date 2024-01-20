import { useSearchParams } from '@solidjs/router'
import { Component, Match, Switch, createSignal } from 'solid-js'
import Button from '/web/shared/Button'
import { userStore } from '/web/store'
import { TitleCard } from '/web/shared/Card'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const OAuthLogin: Component = (props) => {
  const [t] = useTransContext()

  const user = userStore()
  const [query] = useSearchParams()
  const [error, setError] = createSignal<string>()
  const [state, setState] = createSignal<'init' | 'creating' | 'done'>('init')

  const createCode = async () => {
    setState('creating')
    userStore.createApiKey((err, code) => {
      setState('done')

      if (err) {
        setError(err)
        return
      }

      if (code) {
        location.href = `${query.callback}?code=${code}`
      }
    })
  }

  return (
    <div class="mx-auto flex w-[320px] flex-col items-center gap-4 text-sm">
      <Switch>
        <Match when={!user.user}>
          <TitleCard type="rose" class="w-full">
            {t('you_are_not_currently_logged_in')}
          </TitleCard>
        </Match>
        <Match when={!query.callback}>
          <TitleCard type="rose" class="w-full">
            <Trans key="missing_callback_from_query_parameters">
              Missing <code>callback</code> from query parameters.
            </Trans>
          </TitleCard>
        </Match>

        <Match when={error()}>{t('failed_x', { error: error() })}</Match>

        <Match when>
          <TitleCard type="orange" class="w-full">
            {t('an_application_is_requesting_to_access_app', { app_name: t('app_name') })}
          </TitleCard>

          <TitleCard class="markdown w-full">
            <p>{t('the_application_will_be_able_to_access_your')}</p>
            <p>{t('profile_name_avatar_characters_and_presets')}</p>

            <p></p>
          </TitleCard>
        </Match>
      </Switch>

      <Switch>
        <Match when={state() === 'init'}>
          <Button onClick={createCode}>{t('authorize')}</Button>
        </Match>

        <Match when={state() === 'creating'}>
          <Button disabled>{t('authorizing')}</Button>
        </Match>

        <Match when>
          <Button disabled>{t('authorize')}</Button>
        </Match>
      </Switch>
    </div>
  )
}

export default OAuthLogin
