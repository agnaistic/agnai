import { Component, createEffect } from 'solid-js'
import { Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { settingStore } from '../../store/settings'
import { getForm } from '../../shared/util'

const Settings: Component = () => {
  const state = settingStore()

  createEffect(() => {
    if (!state.init) {
      settingStore.load()
    }
  })

  const onSubmit = (evt: Event) => {
    const body = getForm(evt, { koboldUrl: 'string' })
    settingStore.save(body)
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" />
      <form onSubmit={onSubmit}>
        <div class="flex flex-col gap-8">
          <TextInput
            fieldName="koboldUrl"
            label="Kobold URL"
            helperText="Fully qualified URL for Kobold"
            placeholder={'http://localhost:5000'}
            value={state.settings.koboldUrl}
          />
        </div>
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
