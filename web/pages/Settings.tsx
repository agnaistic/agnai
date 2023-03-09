import { Component, createEffect, createMemo, Show } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../shared/Button'
import PageHeader from '../shared/PageHeader'
import TextInput from '../shared/TextInput'
import { adaptersToOptions, getStrictForm } from '../shared/util'
import Dropdown from '../shared/Dropdown'
import { CHAT_ADAPTERS, ChatAdapter, HordeModel } from '../../common/adapters'
import { settingStore, themeColors, userStore } from '../store'
import Divider from '../shared/Divider'

type DefaultAdapter = Exclude<ChatAdapter, 'default'>

const adapterOptions = CHAT_ADAPTERS.filter((adp) => adp !== 'default') as DefaultAdapter[]
const themeOptions = themeColors.map((color) => ({ label: color, value: color }))

const Settings: Component = () => {
  const style = userStore((s) => ({ theme: s.theme }))
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    // Always reload settings when entering this page
    userStore.getConfig()
    settingStore.getHordeModels()
  })

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string?',
      novelApiKey: 'string?',
      novelModel: 'string?',
      hordeApiKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      defaultAdapter: adapterOptions,
    } as const)

    userStore.updateConfig(body)
  }

  const hordeName = createMemo(
    () => {
      if (state.user?.hordeName) return `Logged in as ${state.user.hordeName}.`
      return `Currently using anonymous access.`
    },
    { equals: false }
  )

  const novelVerified = createMemo(
    () => (state.user?.novelVerified ? 'API Key has been verified' : ''),
    { equals: false }
  )

  const HordeHelpText = (
    <>
      <span>{hordeName()}</span>
      <br />
      <span>
        Leave blank to use guest account. Visit{' '}
        <a class="link" href="https://aihorde.net" target="_blank">
          stablehorde.net
        </a>{' '}
        to register.
      </span>
    </>
  )

  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" />
      <form onSubmit={onSubmit}>
        <div class="flex flex-col gap-4">
          <Dropdown
            fieldName="theme"
            items={themeOptions}
            label="Theme Color"
            value={style.theme}
            onChange={(item) => userStore.setTheme(item.value as any)}
          />

          <Dropdown
            fieldName="defaultAdapter"
            label="Default AI Service"
            items={adaptersToOptions(cfg.config.adapters)}
            helperText="The default service conversations will use unless otherwise configured"
            value={state.user?.defaultAdapter}
          />

          <Show when={cfg.config.adapters.includes('horde')}>
            <Divider />
            <h3 class="text-xl">AI Horde settings</h3>
            <TextInput
              fieldName="hordeApiKey"
              label="AI Horde API Key"
              helperText={HordeHelpText}
              placeholder={state.user?.hordeName ? 'API key has been verified' : ''}
              type="password"
            />
            <Dropdown
              fieldName="hordeModel"
              helperText={<span>Currently set to: {state.user?.hordeModel || 'None'}</span>}
              label="Horde Model"
              value={state.user?.hordeModel}
              items={[{ label: 'None', value: '' }].concat(...cfg.models.map(toItem))}
            />
          </Show>

          <Show when={cfg.config.adapters.includes('kobold')}>
            <Divider />
            <TextInput
              fieldName="koboldUrl"
              label="Kobold URL"
              helperText="Fully qualified URL for Kobold. This URL must be publicly accessible."
              placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
              value={state.user?.koboldUrl}
            />
          </Show>

          <Show when={cfg.config.adapters.includes('luminai')}>
            <Divider />
            <TextInput
              fieldName="luminaiUrl"
              label="LuminAI URL"
              helperText="Fully qualified URL for Kobold. This URL must be publicly accessible."
              placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
              value={state.user?.luminaiUrl}
            />
          </Show>

          <Show when={cfg.config.adapters.includes('novel')}>
            <Divider />
            <h3 class="text-xl">NovelAI settings</h3>
            <Dropdown
              fieldName="novelModel"
              label="NovelAI Model"
              items={[
                { label: 'Euterpe', value: 'euterpe-v2' },
                { label: 'Krake', value: 'krake-v2' },
              ]}
              value={state.user?.novelModel}
            />
            <TextInput
              fieldName="novelApiKey"
              label="Novel API Key"
              type="password"
              helperText={
                <>
                  NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization.
                  Please note that this token expires periodically. You will occasionally need to
                  re-enter this token. headers.{' '}
                  <a
                    class="link"
                    target="_blank"
                    href="https://github.com/luminai-companion/agn-ai/blob/dev/instructions/novel.md"
                  >
                    Instructions
                  </a>
                  .
                </>
              }
              placeholder={novelVerified()}
            />
          </Show>
        </div>
        <Show when={!state.loggedIn}>
          <div class="mt-8 mb-4 flex w-full flex-col items-center justify-center">
            <div>This cannot be undone!</div>
            <Button class="bg-red-600" onClick={userStore.clearGuestState}>
              <AlertTriangle /> Delete Guest State <AlertTriangle />
            </Button>
          </div>
        </Show>
        <div class="flex justify-end gap-2 pt-4">
          <Button type="submit">
            <Save />
            Save
          </Button>
        </div>
      </form>
    </>
  )
}

export default Settings

function toItem(model: HordeModel) {
  return {
    label: `${model.name} - (queue: ${model.queued}, eta: ${model.eta}, count: ${model.count})`,
    value: model.name,
  }
}
