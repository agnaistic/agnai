import { Save, X } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  Show,
  Switch,
} from 'solid-js'
import {
  chatGenSettings,
  defaultPresets,
  getFallbackPreset,
  isDefaultPreset,
} from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import GenerationSettings from '../../shared/GenerationSettings'
import { getStrictForm } from '../../shared/util'
import { chatStore, toastStore, userStore } from '../../store'
import { presetStore } from '../../store'
import { getAdapter, getChatPreset } from '../../../common/prompt'
import { AIAdapter, AI_ADAPTERS, adapterSettings } from '../../../common/adapters'
import { AutoPreset, getClientPreset, getPresetOptions } from '../../shared/adapter'
import ServiceWarning from '/web/shared/ServiceWarning'
import { PresetSelect } from '/web/shared/PresetSelect'
import { Card, TitleCard } from '/web/shared/Card'
import { usePane } from '/web/shared/hooks'
import TextInput from '/web/shared/TextInput'

const chatGenValidator = {
  ...chatGenSettings,
  name: 'string',
  service: ['', ...AI_ADAPTERS],
} as const

export const ChatGenSettings: Component<{
  chat: AppSchema.Chat
  close?: () => void
  footer?: (children: JSX.Element) => void
}> = (props) => {
  let ref: any
  const user = userStore()
  const pane = usePane()
  const state = presetStore(({ presets, openRouterModels }) => ({
    presets,
    options: presets.map((pre) => ({ label: pre.name, value: pre._id })),
    openRouterModels,
  }))

  const presetOptions = createMemo(() =>
    getPresetOptions(state.presets, { builtin: true, base: true })
  )

  const presets = createMemo(() => {
    const all: Partial<AppSchema.UserGenPreset>[] = state.presets
    const defaults = Object.entries(defaultPresets).map<Partial<AppSchema.UserGenPreset>>(
      ([key, preset]) => ({
        ...preset,
        _id: key,
        name: `Default - ${preset.name}`,
      })
    )

    return all.concat(defaults)
  })

  const clientPreset = createMemo(() => getClientPreset(props.chat))

  const [selected, setSelected] = createSignal<string>(
    clientPreset()?.preset._id || AutoPreset.service
  )
  const [genAdapter, setAdapter] = createSignal<AIAdapter>()

  const servicePreset = createMemo(() => {
    if (!user.user) return

    const currId = selected()
    if (isDefaultPreset(currId)) {
      const preset = defaultPresets[currId]
      return { name: preset.name, preset, fallback: true }
    }

    const preset = getChatPreset(props.chat, user.user, state.presets)
    const adapter = genAdapter() || getAdapter(props.chat, user.user, preset).adapter

    if (!user.user.defaultPresets) {
      const preset = getFallbackPreset(adapter)
      const name = 'name' in preset ? `${preset.name} - Fallback Preset` : 'Fallback Preset'
      return { name, preset, fallback: true }
    }

    const presetId = user.user.defaultPresets[adapter]

    if (!preset) return
    const fallback = isDefaultPreset(presetId)
    const name =
      'name' in preset
        ? `${preset.name} - ${fallback ? 'Fallback' : 'Service'} Preset`
        : 'Fallback Preset'
    return { name, preset, fallback: isDefaultPreset(presetId) }
  })

  const onSave = () => {
    const preset = selected()

    if (isDefaultPreset(preset)) {
      const original = defaultPresets[preset] as AppSchema.GenSettings
      const update = getStrictForm(ref, { ...chatGenValidator, thirdPartyFormat: 'string?' })

      update.thirdPartyFormat = update.thirdPartyFormat || (null as any)

      /**
       * The user has selected a default preset and it is unchanged
       * Assign it to the chat without creating a new preset
       */
      if (!isPresetDirty(original, update as any)) {
        chatStore.editChatGenPreset(props.chat._id, preset, () => {
          toastStore.success('Switched preset')
        })
        return
      }

      if (update.openRouterModel) {
        const actual = state.openRouterModels?.find((or) => or.id === update.openRouterModel)
        update.openRouterModel = actual || undefined
      }

      /**
       * The user has modified a default preset
       * We will create a new preset and assign it to the chat
       */
      presetStore.createPreset(
        {
          ...update,
          chatId: props.chat._id,
          name: update.name || original.name,
          service: original.service,
        } as any,
        (created) => {
          chatStore.setChat(props.chat._id, { genPreset: created._id })
          setSelected(created._id)
        }
      )

      return
    }

    if (!isDefaultPreset(preset)) {
      chatStore.editChatGenPreset(props.chat._id, preset, () => {
        if (pane() === 'popup') {
          props.close?.()
        }
      })

      const update = getStrictForm(ref, { ...chatGenValidator, thirdPartyFormat: 'string?' })
      update.thirdPartyFormat = update.thirdPartyFormat || (null as any)
      if (update.service === '') {
        toastStore.error(`You must select an AI service before saving`)
        return
      }

      if (update.openRouterModel) {
        const actual = state.openRouterModels?.find((or) => or.id === update.openRouterModel)
        update.openRouterModel = actual || undefined
      }

      presetStore.updatePreset(preset, update as any)
    }
  }

  const getPresetName = (presetId: string) => {
    if (isDefaultPreset(presetId)) return `My ${defaultPresets[presetId].name} Preset`
    return presets().find((pre) => pre._id === presetId)?.name || ''
  }

  createEffect(() => {
    const footer = (
      <>
        <Button schema="secondary" onClick={() => props.close?.()}>
          <X /> {props.close ? 'Close' : 'Cancel'}
        </Button>

        <Button onClick={onSave}>
          <Save /> Save
        </Button>
      </>
    )

    props.footer?.(footer)
  })

  return (
    <div class="text-sm">
      <form ref={ref} class="flex flex-col gap-4">
        <Card class="flex flex-col gap-2">
          <PresetSelect
            options={presetOptions()}
            selected={selected()}
            setPresetId={(val) => {
              setSelected(val)
              chatStore.editChatGenPreset(props.chat._id, val, () => {
                toastStore.success('Chat preset changed')
              })
            }}
          />

          <ServiceWarning service={servicePreset()?.preset.service} />
          <Show when={isDefaultPreset(selected())}>
            <TitleCard type="orange">
              You are using a built-in preset which cannot be modified. Modifying this will create a
              new preset and assign it to your chat.
            </TitleCard>
          </Show>

          <TextInput fieldName="name" value={getPresetName(selected())} label="Preset Name" />
        </Card>

        <Switch>
          <Match when={selected() === AutoPreset.service && servicePreset()}>
            <GenerationSettings
              inherit={servicePreset()!.preset}
              saveToChatId={props.chat._id}
              onService={setAdapter}
              disableService
            />
          </Match>

          <Match when={selected() === AutoPreset.chat}>
            <div class="bold text-md">Using: Chat Settings</div>
            <GenerationSettings inherit={props.chat.genSettings} onService={setAdapter} />
          </Match>

          <Match when={true}>
            <For each={presets()}>
              {(preset) => (
                <Show when={selected() === preset._id!}>
                  <GenerationSettings inherit={preset} onService={setAdapter} />
                </Show>
              )}
            </For>
          </Match>
        </Switch>
      </form>
    </div>
  )
}

function isPresetDirty(
  original: AppSchema.GenSettings,
  compare: Omit<AppSchema.GenSettings, 'service'>
) {
  const svc = original.service
  for (const key in compare) {
    const prop = key as keyof AppSchema.GenSettings

    switch (prop) {
      case 'service':
        continue
    }

    if (compare[prop] === undefined || original[prop] === undefined) continue

    const usable: string[] | undefined = (adapterSettings as any)[prop]

    if (svc && usable && !usable.includes(svc)) continue

    if (original[prop] !== compare[prop]) {
      return true
    }
  }

  return false
}
