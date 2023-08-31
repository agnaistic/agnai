import { Component, Match, Switch, createMemo } from 'solid-js'
import { AIAdapter } from '/common/adapters'
import { userStore } from '../store/user'
import { A } from '@solidjs/router'
import { TitleCard } from './Card'
import { settingStore } from '../store'

const ServiceWarning: Component<{ service: AIAdapter | undefined }> = (props) => {
  const user = userStore((s) => ({ ...s.user }))
  const cfg = settingStore((s) => s.config)

  const noSub = createMemo(() => {
    if (props.service !== 'agnaistic') return false
    const userLevel = user.sub?.level ?? -1
    const usable = cfg.subs.some((sub) => userLevel >= sub.level)
    return !usable
  })

  const isKeySet = createMemo(() => {
    const svc = props.service
    if (!svc) return true

    if (svc === 'openai' && !user.oaiKeySet && !user.oaiKey) return false
    if (svc === 'novel' && !user.novelVerified && !user.novelApiKey) return false
    if (svc === 'claude' && !user.claudeApiKeySet && !user.claudeApiKey) return false
    if (svc === 'scale' && !user.scaleApiKeySet && !user.scaleApiKey) return false
    if (
      svc === 'goose' &&
      !user.adapterConfig?.goose?.apiKeySet &&
      !user.adapterConfig?.goose?.apiKey
    )
      return false

    return true
  })

  return (
    <Switch>
      <Match when={props.service === 'agnaistic' && noSub()}>
        <TitleCard type="rose">Your account not meet the requirements for this service.</TitleCard>
      </Match>

      <Match when={!isKeySet()}>
        <span class="text-orange-500">
          This service requires an API key to be set. Go to your{' '}
          <A class="link" href="/settings">
            Settings
          </A>{' '}
          to set the API key.
        </span>
      </Match>

      <Match when={props.service === 'horde' && !user?.hordeName}>
        <TitleCard type="orange">
          Register at{' '}
          <a class="link" href="https://aihorde.net/register" target="_blank">
            AIHorde
          </a>{' '}
          for a better Horde experience.
        </TitleCard>
      </Match>
    </Switch>
  )
}

export default ServiceWarning
