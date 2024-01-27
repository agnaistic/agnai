import { Component, createEffect, createMemo, createSignal } from 'solid-js'
import Select from '../../shared/Select'
import { SoundpackLevel, audioStore } from '/web/store'
import { useTransContext } from '@mbarzda/solid-i18next'

const __none_soundpack__ = '__none_soundpack__'

export const SoundpackPicker: Component<{
  fieldName: string
  label?: string
  helperText?: string
  level: SoundpackLevel
}> = (props) => {
  const [t] = useTransContext()

  const audio = audioStore()
  const [selectedId, setSelectedId] = createSignal<string>(__none_soundpack__)

  const getSoundpackOptions = createMemo(() => {
    return [
      { value: __none_soundpack__, label: t('none') },
      ...audio.soundpacks.map((sp) => {
        return { value: sp.id, label: sp.name }
      }),
    ]
  })

  const selectSoundpack = ({ value: id }: { value: string }) => {
    setSelectedId(id)
    audioStore.selectSoundpack(props.level, id === __none_soundpack__ ? undefined : id)
  }

  createEffect(() => setSelectedId(audio.selectedSoundpacks[props.level] || __none_soundpack__))

  return (
    <Select
      fieldName={props.fieldName}
      label={props.label}
      helperText={props.helperText}
      items={getSoundpackOptions()}
      value={selectedId()}
      onChange={selectSoundpack}
    />
  )
}
