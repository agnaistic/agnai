import { Component, createEffect } from 'solid-js'
import { Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import Dropdown from '../../shared/Dropdown'
import { ADAPTERS, ChatAdapter } from '../../../common/adapters'
import { userStore } from '../../store'

type DefaultAdapter = Exclude<ChatAdapter, 'default'>

const adapterOptions = ADAPTERS.filter((adp) => adp !== 'default') as DefaultAdapter[]

const Settings: Component = () => {
  const state = userStore()

  createEffect(() => {
    // Always reload settings when entering this page
    userStore.getConfig()
  })

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string',
      novelApiKey: 'string',
      novelModel: 'string',
      defaultAdapter: adapterOptions,
    } as const)
    userStore.updateConfig(body)
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
            value={state.user?.defaultAdapter}
          />
          <TextInput
            fieldName="koboldUrl"
            label="Kobold URL"
            helperText="Fully qualified URL for Kobold"
            placeholder={'http://localhost:5000'}
            value={state.user?.koboldUrl}
          />
          <TextInput
            fieldName="novelApiKey"
            label="Novel API Key"
            helperText="NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization headers"
            placeholder="..."
            value={state.user?.novelApiKey}
          />
          <Dropdown
            fieldName="novelModel"
            label="NovelAI Model"
            items={[
              { label: 'Euterpe', value: 'euterpe-v2' },
              { label: 'Krake', value: 'krake-v2' },
            ]}
            value={state.user?.novelModel}
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
  { label: 'Chai', value: 'chai' },
] satisfies Array<{ label: string; value: ChatAdapter }>

export default Settings
