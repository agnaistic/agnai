import { presetStore, settingStore, userStore } from '../../store'
import { Component, Show, createMemo, createSignal } from 'solid-js'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { A } from '@solidjs/router'
import { Card, SolidCard } from '/web/shared/Card'
import { PresetSelect } from '/web/shared/PresetSelect'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { neat } from '/common/util'
import { HelpModal } from '/web/shared/Modal'
import { SetStoreFunction } from 'solid-js/store'
import { UserSettings } from './util'
import { FormLabel } from '/web/shared/FormLabel'
import Select from '/web/shared/Select'
import { EMBED_MODELS_OPTS } from '/web/store/embeddings'
import { Copy } from '/web/shared/Copy'

const AISettings: Component<{
  state: UserSettings
  setter: SetStoreFunction<UserSettings>
}> = (props) => {
  const state = userStore((s) => ({ user: s.user, sub: s.sub, ui: s.ui }))
  const cfg = settingStore((s) => ({
    server: s.config.serverConfig,
  }))

  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))
  const [apiKey, setApiKey] = createSignal(state.user?.apiKey || '')

  const revealKey = async () => {
    const prev = apiKey()
    if (prev && !prev.includes('***')) return prev

    await userStore.revealApiKey((key) => {
      setApiKey(key)
    })

    return apiKey()
  }

  const generateKey = () => {
    userStore.generateApiKey((key) => {
      setApiKey(key)
    })
  }

  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter(
      (pre) => pre.value !== AutoPreset.chat && pre.value !== AutoPreset.service
    )
    return opts
  })

  const canUseApi = createMemo(() => {
    if (!cfg.server) return false
    if (!cfg.server.apiAccess || cfg.server?.apiAccess === 'off') return false
    if (!state.user?.admin) {
      if (cfg.server.apiAccess === 'users') return true
      return cfg.server.apiAccess === 'subscribers' && state.sub?.tier.apiAccess
    }

    return true
  })

  return (
    <>
      <FormLabel
        label={
          <div class="flex flex-wrap items-center gap-1">
            <div>Embeddings/Long-Term Memory</div>
            <Select
              parentClass="text-sm py-1 px-2"
              items={EMBED_MODELS_OPTS}
              value={state.ui.embeddingModel || ''}
              onChange={(ev) => userStore.updateEmbeddingModel(ev.value)}
            />
          </div>
        }
        helperMarkdown={`Improves site performance when disabled. Disable long-term memory if your chat is _laggy_ and unresponsive.`}
      />

      {/* <Show when={cfg.flags.caption}>
          <FormLabel
            label={
              <div class="flex flex-wrap items-center gap-1">
                <div>Enable Embeddings/Long-Term Memory</div>
                <Select
                  parentClass="text-sm py-1 px-2"
                  items={CAPTION_MODELS_OPTS}
                  value={state.ui.captionModel || ''}
                  onChange={(ev) => userStore.updateCaptionModel(ev.value)}
                />
              </div>
            }
            helperMarkdown={`Improves site performance when disabled. Disable long-term memory if your chat is _laggy_ and unresponsive.`}
          />
        </Show> */}

      <Card>
        <div class="font-bold">Presets</div>

        <div class="flex flex-col gap-2">
          <PresetSelect
            helperText="Character Field Generation"
            options={presetOptions()}
            selected={props.state.chargenPreset}
            setPresetId={(ev) => props.setter('chargenPreset', ev)}
            noneOption={{ label: 'Use Server Default', value: '' }}
          />
          <PresetSelect
            helperText="Chat Summary"
            options={presetOptions()}
            selected={props.state.summaryPreset || state.user?.images?.summaryPresetId}
            setPresetId={(ev) => props.setter('summaryPreset', ev)}
            noneOption={{ label: 'Use Active Chat Preset', value: '' }}
          />
          <PresetSelect
            helperText="JSON Schemas/Output"
            options={presetOptions()}
            selected={props.state.jsonPreset}
            setPresetId={(ev) => props.setter('jsonPreset', ev)}
            noneOption={{ label: 'Use Active Chat Preset', value: '' }}
          />
        </div>
      </Card>

      <Show when={!canUseApi()}>
        <PresetSelect
          label="Default Preset"
          helperText="The initially selected preset when creating a new chat. "
          options={presetOptions()}
          selected={props.state.defaultPreset}
          setPresetId={(ev) => props.setter('defaultPreset', ev)}
        />
      </Show>

      <Show when={canUseApi()}>
        <SolidCard class="flex flex-col gap-2">
          <HelpModal
            title="Agnaistic API Access"
            cta={
              <div>
                <a class="link">How to use API Access</a>
              </div>
            }
            markdown={ApiAccessHelp}
          />

          <PresetSelect
            fieldName="defaultPreset"
            label="Default/API Access Preset"
            helperText="Preset used when using API access. Also the initially selected preset when creating a new chat."
            options={presetOptions()}
            selected={props.state.defaultPreset}
            setPresetId={(ev) => props.setter('defaultPreset', ev)}
          >
            <Show when={props.state.defaultPreset}>
              <Copy text={props.state.defaultPreset!} size={24} />
            </Show>
          </PresetSelect>

          <div class="flex items-center gap-1">
            <FormLabel label="API Key" />
            <Show when={apiKey().includes('***')}>
              <Button size="pill" onClick={revealKey}>
                Reveal Key
              </Button>
            </Show>
            <Show when={apiKey() === 'Not set'}>
              <Button size="pill" onClick={generateKey}>
                Generate Key
              </Button>
            </Show>
            <Show when={apiKey() !== 'Not set'}>
              <Button size="pill" onClick={generateKey}>
                Regenerate Key
              </Button>
            </Show>
          </div>
          <div class="flex w-full items-center gap-1">
            <TextInput readonly placeholder="API Key Hidden" value={apiKey()} />
            <Show when={apiKey() !== ''}>
              <Copy text={apiKey()} onClick={revealKey} size={24} />
            </Show>
          </div>
        </SolidCard>
      </Show>

      <div class="my-2">
        <SolidCard bg="premium-700" class="mb-2">
          Looking for the Providers section? Head to the{' '}
          <A class="link font-bold" href="/presets?preset_tab=1">
            Presets
          </A>{' '}
          page
        </SolidCard>
      </div>
    </>
  )
}

export default AISettings

const ApiAccessHelp = neat`
  The subscriber API endpoint uses the *OpenAI Text Completion* or *OpenAI Chat Completion* format.

  The full URL for these endpoints are:
  - https://api.agnai.chat/v1/completions
  - https://api.agnai.chat/v1/chat/completions

  **Instructions**:
  1. Select your \`API Access Preset\`: This preset will be used for your API calls. Change this on your settings page.
  2. Generate your API Key.
  3. Use the API URL \`https://api.agnai.chat\` or \`https://api.agnai.chat/v1\` and your generated API key.
`
