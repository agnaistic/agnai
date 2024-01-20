import { ADAPTER_LABELS } from '../../../common/adapters'
import { presetStore, settingStore, userStore } from '../../store'
import Tabs from '../../shared/Tabs'
import HordeAISettings from './components/HordeAISettings'
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from 'solid-js'
import OpenAISettings from './components/OpenAISettings'
import ScaleSettings from './components/ScaleSettings'
import NovelAISettings from './components/NovelAISettings'
import KoboldAISettings from './components/KoboldAISettings'
import OobaAISettings from './components/OobaAISettings'
import ClaudeSettings from './components/ClaudeSettings'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import RegisteredSettings from './components/RegisteredSettings'
import { useSearchParams } from '@solidjs/router'
import OpenRouterOauth from './OpenRouterOauth'
import { SolidCard, TitleCard } from '/web/shared/Card'
import { PresetSelect } from '/web/shared/PresetSelect'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
  onHordeModelsChange: (models: string[]) => void
}> = (props) => {
  const [t] = useTransContext()

  const [query] = useSearchParams()
  const state = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets.filter((pre) => !!pre.service))

  let keyRef: any
  const [apiKey, setApiKey] = createSignal(state.user?.apiKey || '')

  const revealKey = () => {
    userStore.revealApiKey((key) => {
      setApiKey(key)
    })
  }

  const generateKey = () => {
    userStore.generateApiKey((key) => {
      setApiKey(key)
    })
  }

  createEffect(() => {
    const tabs = cfg.config.adapters
      .filter((adp) => {
        if (adp === 'ooba') return false
        const reg = cfg.config.registered.find((r) => r.name === adp)
        if (!reg) return true
        for (const opt of reg.settings) {
          if (!opt.preset) return true
        }
        return false
      })
      .map((a) => ADAPTER_LABELS(t)[a] || a)

    setTabs(tabs)

    if (!ready() && cfg.config.adapters?.length) {
      const queryTab = tabs.findIndex((label) => label.toLowerCase() === query.service)
      setTab(queryTab !== -1 ? queryTab : 0)
      setReady(true)
    }
  })

  const [tabs, setTabs] = createSignal<string[]>([])
  const [tab, setTab] = createSignal(-1)
  const [ready, setReady] = createSignal(false)

  const currentTab = createMemo(() => {
    const list = tabs()
    const next = list[tab()]
    return next
  })
  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(t, presets, { builtin: true }).filter(
      (pre) => pre.value !== AutoPreset.chat && pre.value !== AutoPreset.service
    )
    return [{ label: t('none'), value: '', custom: false }].concat(opts)
  })
  const [presetId, setPresetId] = createSignal(state.user?.defaultPreset || '')

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Show when={!ready()}>
        <div>{t('loading')}</div>
      </Show>

      <Show when={ready()}>
        <Show when={!cfg.config.apiAccess}>
          <PresetSelect
            fieldName="defaultPreset"
            label={t('default_preset')}
            helperText={t('the_initial_selected_preset')}
            options={presetOptions()}
            selected={presetId()}
            setPresetId={setPresetId}
          />
        </Show>

        <Show when={cfg.config.apiAccess}>
          <PresetSelect
            fieldName="defaultPreset"
            label={t('default_api_access_preset')}
            helperText={t('preset_used_when_using_api_access')}
            options={presetOptions()}
            selected={presetId()}
            setPresetId={setPresetId}
          />

          <TextInput
            fieldName="apiKeyPlaceholder"
            helperText={
              <div class="text-900 flex gap-1">
                <Show when={apiKey().includes('***')}>
                  <Button size="pill" onClick={revealKey}>
                    {t('reveal_key')}
                  </Button>
                </Show>
                <Show when={apiKey() === 'Not set'}>
                  <Button size="pill" onClick={generateKey}>
                    {t('generate_key')}
                  </Button>
                </Show>
                <Show when={apiKey() !== 'Not set'}>
                  <Button size="pill" onClick={generateKey}>
                    {t('regenerate_key')}
                  </Button>
                </Show>
              </div>
            }
            ref={keyRef}
            label={t('api_key')}
            readonly
            placeholder={t('api_key_hidden')}
            value={apiKey()}
          />
        </Show>

        <div class="my-2">
          <SolidCard bg="orange-500" class="mb-2">
            {t('are_you_using_an_external_ai_service')}
          </SolidCard>
          <Tabs tabs={tabs()} selected={tab} select={setTab} />
        </div>
      </Show>

      <div class={currentTab() === ADAPTER_LABELS(t).horde ? tabClass : 'hidden'}>
        <HordeAISettings
          onHordeWorkersChange={props.onHordeWorkersChange}
          onHordeModelsChange={props.onHordeModelsChange}
        />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).kobold ? tabClass : 'hidden'}>
        <KoboldAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).ooba ? tabClass : 'hidden'}>
        <OobaAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).openai ? tabClass : 'hidden'}>
        <OpenAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).scale ? tabClass : 'hidden'}>
        <ScaleSettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).novel ? tabClass : 'hidden'}>
        <NovelAISettings />
      </div>

      <div class={currentTab() === ADAPTER_LABELS(t).claude ? tabClass : 'hidden'}>
        <ClaudeSettings />
      </div>

      <For each={cfg.config.registered}>
        {(each) => (
          <div class={currentTab() === ADAPTER_LABELS(t)[each.name] ? tabClass : 'hidden'}>
            {/** Optionally show adapter specific information for registered adapters */}
            <Switch>
              <Match when={each.name === 'openrouter'}>
                <OpenRouterOauth />
              </Match>

              <Match when={each.name === 'replicate'}>
                <TitleCard>
                  <Trans key="head_to_replicate_com_to_get_started">
                    Head to
                    <a class="link" target="_blank" href="https://replicate.com/">
                      Replicate.com
                    </a>
                    to get started.
                  </Trans>
                </TitleCard>
              </Match>
            </Switch>

            <RegisteredSettings service={each} />
          </div>
        )}
      </For>
    </>
  )
}

export default AISettings
