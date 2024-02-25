import { Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, JSX, Show } from 'solid-js'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../Button'
import GenerationSettings, { getPresetFormData } from '../GenerationSettings'
import { toastStore, userStore } from '../../store'
import { presetStore } from '../../store'
import { adapterSettings } from '../../../common/adapters'
import { AutoPreset, getPresetOptions } from '../adapter'
import ServiceWarning from '/web/shared/ServiceWarning'
import { PresetSelect } from '/web/shared/PresetSelect'
import { Card, TitleCard } from '/web/shared/Card'
import { usePane } from '/web/shared/hooks'
import TextInput from '/web/shared/TextInput'

export const ModeGenSettings: Component<{
  // chat: AppSchema.Chat
  onPresetChanged: (presetId: string) => void
  presetId: string | undefined
  close?: () => void
  footer?: (children: JSX.Element) => void
}> = (props) => {
  let ref: any
  const user = userStore()
  const pane = usePane()
  const state = presetStore(({ presets }) => ({
    presets,
    options: presets.map((pre) => ({ label: pre.name, value: pre._id })),
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

  const [selected, setSelected] = createSignal(
    props.presetId || user.user?.defaultPreset || AutoPreset.service
  )

  createEffect(() => {
    if (!props.presetId) return
    if (selected() !== props.presetId) {
      setSelected(props.presetId)
    }
  })

  const onSave = () => {
    const presetId = selected()
    const update = getPresetFormData(ref)

    if (isDefaultPreset(presetId)) {
      const original = defaultPresets[presetId] as AppSchema.GenSettings

      /**
       * The user has selected a default preset and it is unchanged
       * Assign it to the chat without creating a new preset
       */
      if (!isPresetDirty(original, update as any)) {
        props.onPresetChanged(presetId)
        // toastStore.success('Switched preset')
        // chatStore.editChatGenPreset(props.chat._id, presetId, () => {
        // })
        return
      }

      /**
       * The user has modified a default preset
       * We will create a new preset and assign it to the chat
       */
      presetStore.createPreset(
        {
          ...update,
          name: update.name || original.name,
          service: original.service,
        } as any,
        (created) => {
          props.onPresetChanged(created._id)
          setSelected(created._id)
        }
      )

      return
    }

    if (!isDefaultPreset(presetId)) {
      if (!update.service) {
        toastStore.error(`You must select an AI service before saving`)
        return
      }

      presetStore.updatePreset(presetId, update as any, () => {
        if (pane() === 'popup') {
          props.close?.()
        }
      })
    }
  }

  const getPresetName = (presetId: string) => {
    if (isDefaultPreset(presetId)) return `My ${defaultPresets[presetId].name} Preset`
    return presets().find((pre) => pre._id === presetId)?.name || ''
  }

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

  const activePreset = createMemo(() => presets().find((pre) => pre._id === selected()))

  return (
    <div class="text-sm">
      <form ref={ref} class="flex flex-col gap-4">
        <Card class="flex flex-col gap-2">
          <PresetSelect
            options={presetOptions()}
            selected={selected()}
            setPresetId={(val) => {
              setSelected(val)
              props.onPresetChanged(val)
            }}
          />

          <ServiceWarning preset={activePreset()} />
          <Show when={isDefaultPreset(selected())}>
            <TitleCard type="orange">
              You are using a built-in preset which cannot be modified. Modifying this will create a
              new preset and assign it to your chat.
            </TitleCard>
          </Show>

          <TextInput fieldName="name" value={getPresetName(selected())} label="Preset Name" />
        </Card>

        <For each={presets()}>
          {(preset) => (
            <Show when={selected() === preset._id!}>
              <GenerationSettings inherit={preset} onSave={onSave} />
            </Show>
          )}
        </For>
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
