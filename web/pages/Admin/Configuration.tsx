import { Component, Match, Switch, createEffect, createSignal, on, onMount } from 'solid-js'
import { adminStore, userStore } from '/web/store'
import { useNavigate } from '@solidjs/router'
import PageHeader from '/web/shared/PageHeader'
import { getStrictForm } from '/web/shared/util'
import { SaveIcon } from 'lucide-solid'
import Button from '/web/shared/Button'
import { Page } from '/web/Layout'
import Loading from '/web/shared/Loading'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { CharLibrary } from './Config/Characters'
import { General } from './Config/General'
import { Voice } from './Config/Voice'
import { Images } from './Config/Images'

export { ServerConfiguration as default }

const ServerConfiguration: Component = () => {
  let form: HTMLFormElement
  const user = userStore()
  const nav = useNavigate()

  const state = adminStore()
  const tab = useTabs(['General', 'Images', 'Voice', 'Characters'])

  const [slots, setSlots] = createSignal(state.config?.slots || '{}')
  const [modschema, setModschema] = createSignal(state.config?.modSchema || {})

  if (!user.user?.admin) {
    nav('/')
    return null
  }

  const models = createSignal(
    Array.isArray(state.config?.imagesModels) ? state.config.imagesModels : []
  )

  createEffect(
    on(
      () => state.config,
      () => {
        if (!state.config?.imagesModels) return
        models[1](state.config?.imagesModels)
        setModschema(state.config.modSchema || {})
      }
    )
  )

  onMount(async () => {
    await adminStore.getConfiguration()
  })

  const submit = () => {
    const body = getStrictForm(form, {
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      ttsAccess: ['off', 'users', 'subscribers', 'admins'],
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      termsOfService: 'string',
      privacyStatement: 'string',
      policiesEnabled: 'boolean',
      imagesHost: 'string',
      imagesEnabled: 'boolean',
      supportEmail: 'string',
      ttsEnabled: 'boolean',
      ttsApiKey: 'string',
      ttsHost: 'string',
      maxGuidanceTokens: 'number',
      maxGuidanceVariables: 'number',
      googleClientId: 'string',
      googleEnabled: 'boolean',
      modPresetId: 'string',
      modPrompt: 'string',
      modFieldPrompt: 'string',
      charlibGuidelines: 'string',
      charlibPublish: ['off', 'users', 'subscribers', 'moderators', 'admins'],
    })

    adminStore.updateServerConfig({
      ...body,
      slots: slots(),
      imagesModels: models[0](),
      enabledAdapters: [],
      modSchema: modschema(),
    })
  }

  return (
    <Page>
      <PageHeader title="Server Configuration" />

      <Switch>
        <Match when={!state.config}>
          <div class="mt-24 flex justify-center">
            <Loading />
          </div>
        </Match>

        <Match when>
          <Tabs tabs={tab.tabs} select={tab.select} selected={tab.selected} />

          <form ref={form!} class="flex flex-col gap-2" onSubmit={(ev) => ev.preventDefault()}>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'General' }}>
              <General slots={slots} setSlots={setSlots} />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Voice' }}>
              <Voice />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Images' }}>
              <Images models={models} />
            </div>
            <div class="flex flex-col gap-2" classList={{ hidden: tab.current() !== 'Characters' }}>
              <CharLibrary setSchema={setModschema} />
            </div>

            <div class="flex justify-end">
              <Button onClick={submit} class="w-fit">
                <SaveIcon /> Save
              </Button>
            </div>
          </form>
        </Match>
      </Switch>
    </Page>
  )
}
