import { Component, createMemo, onCleanup } from 'solid-js'
import Select from '/web/shared/Select'
import { FormLabel } from '/web/shared/FormLabel'
import { userStore } from '/web/store/user'
import { UI } from '/common/types'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import ColorPicker from '/web/shared/ColorPicker'
import Button from '/web/shared/Button'
import { X } from 'lucide-solid'
import { createDebounce } from '/web/shared/util'
import { InlineRangeInput } from '/web/shared/RangeInput'

const themeOptions = UI.UI_THEME.map((color) => ({ label: color, value: color }))

export const ThemeUISettings: Component = (props) => {
  const state = userStore((s) => ({ ui: s.ui, current: s.current, background: s.background }))

  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => unsubCustomUi())

  const themeBgOptions = createMemo(() => {
    const options = UI.BG_THEME.map((color) => ({ label: color as string, value: color as string }))
    const custom = state.current.bgCustom || ''
    if (custom !== '') return [{ label: 'Custom', value: '' }]
    return options
  })

  const onBackground = async (results: FileInputResult[]) => {
    if (!results.length) return
    const [result] = results

    userStore.setBackground(result)
  }

  return (
    <>
      {' '}
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="theme"
          items={themeOptions}
          label="Color"
          value={state.ui.theme}
          onChange={(item) => userStore.saveUI({ theme: item.value as any })}
        />

        <Select
          fieldName="mode"
          label="Mode"
          items={[
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
          ]}
          value={state.ui.mode}
          onChange={(item) => userStore.saveUI({ mode: item.value as any })}
        />
      </div>
      <div class="flex gap-2">
        <InlineRangeInput
          label="Site Font Size"
          parentClass="w-full"
          value={state.ui.fontSize ?? 16}
          min={4}
          max={32}
          onChange={(ev) => userStore.tryUI({ fontSize: ev })}
          step={1}
        />
        <Button
          size="sm"
          class="!py-2"
          onClick={() => userStore.saveUI({ fontSize: state.ui.fontSize })}
        >
          Save
        </Button>
      </div>
      <div class="flex flex-col">
        <FormLabel
          label="Backgrounds"
          helperText={
            <>
              <span class="link" onClick={() => userStore.saveCustomUI({ bgCustom: '' })}>
                Reset to Default
              </span>
            </>
          }
        />
        <div class="flex items-center gap-2">
          <Select
            fieldName="themeBg"
            inline
            label="Background Color"
            items={themeBgOptions()}
            value={state.ui.themeBg}
            onChange={(item) => userStore.saveUI({ themeBg: item.value })}
          />
          <ColorPicker
            fieldName="customBg"
            onChange={(color) => userStore.saveCustomUI({ bgCustom: color })}
            onInput={(color) => tryCustomUI({ bgCustom: color })}
            value={state.current.bgCustom ?? state.ui[state.ui.mode].bgCustom}
          />
        </div>
      </div>
      <div class="flex items-end gap-2">
        <FileInput
          fieldName="background"
          label="Background Image"
          onUpdate={onBackground}
          accept="image/png,image/jpeg,image/jpg"
        />
        <div class="w-full justify-center">
          <Button disabled={!state.background} onClick={() => userStore.setBackground(null)}>
            <X size={16} />
            Remove
          </Button>
        </div>
      </div>
      <Select
        fieldName="font"
        label="Font"
        items={[
          { label: 'Default', value: 'default' },
          { label: 'Lato (Roko)', value: 'lato' },
        ]}
        value={state.ui.font}
        onChange={(item) => userStore.saveUI({ font: item.value as any })}
      />
    </>
  )
}
