import { Component, createEffect } from 'solid-js'
import { Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { settingStore } from '../../store/settings'
import { getStrictForm } from '../../shared/util'
import Dropdown from '../../shared/Dropdown'
import { AppSchema } from '../../../srv/db/schema'

const Settings: Component = () => {
  const state = settingStore()

  createEffect(() => {
    // Always reload settings when entering this page
    settingStore.load()
  })

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string',
      novelApiKey: 'string',
      novelModel: 'string',
      chaiUrl: 'string',
      defaultAdapter: ['kobold', 'chai', 'novel'],
    } as const)
    settingStore.save(body)
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" />
      <form onSubmit={onSubmit}>
        <div class="flex flex-col gap-8">
          <Dropdown
            fieldName="defaultAdapter"
            label="Default AI Adapter"
            items={adapters}
            helperText="The default adapter conversations will use unless otherwise configured"
            value={state.settings.defaultAdapter}
          />
          <TextInput
            fieldName="koboldUrl"
            label="Kobold URL"
            helperText="Fully qualified URL for Kobold"
            placeholder={'http://localhost:5000'}
            value={state.settings.koboldUrl}
          />
          <TextInput
            fieldName="novelApiKey"
            label="Novel API Key"
            helperText="The token from the NovelAI request authorization headers"
            placeholder="..."
            value={state.settings.novelApiKey}
          />
          <Dropdown
            fieldName="novelModel"
            label="NovelAI Model"
            items={[
              { label: 'Euterpe', value: 'euterpe-v2' },
              { label: 'Krake', value: 'krake-v2' },
            ]}
            value={state.settings.novelModel}
          />
          <TextInput
            fieldName="chaiUrl"
            label="Chai URL"
            helperText="The ChaiAI GPTJ Url"
            placeholder="..."
            value={state.settings.chaiUrl}
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

const adapters = [
  { label: 'KoboldAI', value: 'kobold' },
  { label: 'NovelAI', value: 'novel' },
] satisfies Array<{ label: string; value: AppSchema.ChatAdapter }>

export default Settings
